/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OWNER_FEE = 1500;
const EMPLOYEE_AWARD_FEE = 1500;
const MAX_EMPLOYEES = 20;
const statuses = ["pending", "confirmed", "reviewing", "approved", "rejected", "failed", "cancelled"] as const;
const imageSchema = z.object({
  name: z.string().min(1),
  mime: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  base64: z.string().min(20),
  size: z.number().int().positive().max(3 * 1024 * 1024),
});

const employeeSchema = z.object({
  name: z.string().trim().min(2),
  designation: z.string().trim().min(2),
  department: z.string().trim().optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")).default(""),
  mobile: z.string().trim().optional().default(""),
  photo: imageSchema.optional().nullable(),
});

const companySchema = z.object({
  idempotencyKey: z.string().trim().min(12).max(128),
  companyName: z.string().trim().min(2),
  companyLogo: imageSchema,
  companyEmail: z.string().trim().email(),
  companyMobile: z.string().trim().regex(/^\d{10}$/),
  companyAddress: z.string().trim().min(5),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pincode: z.string().trim().regex(/^\d{6}$/),
  gstNumber: z.string().trim().optional().default(""),
  companyWebsite: z.string().trim().optional().default(""),
  ownerName: z.string().trim().min(2),
  ownerDesignation: z.string().trim().min(2),
  ownerEmail: z.string().trim().email(),
  ownerMobile: z.string().trim().regex(/^\d{10}$/),
  ownerPhoto: imageSchema.optional().nullable(),
  employees: z.array(employeeSchema).min(1).max(MAX_EMPLOYEES).default([]),
});

const companyRefSchema = z.object({ company: z.string().trim().min(1) });
const verifySchema = companyRefSchema.extend({
  razorpayOrderId: z.string().min(6),
  razorpayPaymentId: z.string().min(6),
  razorpaySignature: z.string().min(20),
});
const failSchema = companyRefSchema.extend({ paymentId: z.string().uuid() });
const adminSchema = z.object({ adminUserId: z.string().uuid() });
const adminStatusSchema = adminSchema.extend({
  id: z.string().uuid(),
  status: z.enum(statuses),
});
const recoverySchema = z.object({ query: z.string().trim().min(5).max(120) });

export type EmployeeAwardRecipient = {
  id: string;
  award_registration_number: string;
  recipient_type: "owner" | "employee";
  display_order: number;
  name: string;
  designation: string;
  department: string | null;
  email: string | null;
  mobile: string | null;
  photo_url: string | null;
  fee_amount: number;
  status: string;
};

export type EmployeeAwardRecord = {
  id: string;
  company_registration_number: string;
  company_name: string;
  company_logo_path?: string | null;
  company_logo_url: string;
  company_email: string;
  company_mobile: string;
  company_address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string | null;
  company_website: string | null;
  owner_name: string;
  owner_designation: string;
  owner_email: string;
  owner_mobile: string;
  owner_photo_url: string | null;
  employee_count: number;
  total_recipients: number;
  price_per_recipient: number;
  total_amount: number;
  status: (typeof statuses)[number];
  payment_status: string;
  invoice_number: string;
  payment_order_id: string | null;
  transaction_id: string | null;
  payment_method: string | null;
  paid_at: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  recipients: EmployeeAwardRecipient[];
  payment?: {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    transaction_id: string | null;
    verified_at: string | null;
  } | null;
};

async function assertAdmin(adminUserId: string) {
  const rows = await runQuery("SELECT user_id FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1", [adminUserId]);
  if (!rows.length) throw new Error("Admin access required.");
}

async function runQuery<T = any>(sql: string, params?: any[]) {
  const { closePool, query } = await import("@/db/index");
  try {
    return await query<T>(sql, params);
  } catch (error: any) {
    if (["ECONNRESET", "PROTOCOL_CONNECTION_LOST"].includes(error?.code)) {
      await closePool();
      return query<T>(sql, params);
    }
    throw error;
  }
}

async function getDbPool() {
  const { getPool } = await import("@/db/index");
  return getPool();
}

function phone(value: string) {
  return `+91${value.replace(/\D/g, "").slice(-10)}`;
}

function money(value: unknown) {
  return Number(value || 0);
}

async function serverEnv(name: string) {
  const { getServerEnv } = await import("@/db/env");
  return getServerEnv(name);
}

async function razorpayKey() {
  const key = await serverEnv("RAZORPAY_KEY");
  if (!key) throw new Error("Razorpay key is not configured.");
  return key;
}

async function razorpaySecret() {
  const secret = await serverEnv("RAZORPAY_SECRET");
  if (!secret) throw new Error("Razorpay secret is not configured.");
  return secret;
}

function basicAuth(key: string, secret: string) {
  return btoa(`${key}:${secret}`);
}

async function createRazorpayOrder(input: {
  amount: number;
  receipt: string;
  companyRegistrationNumber: string;
}) {
  const key = await razorpayKey();
  const secret = await razorpaySecret();
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(key, secret)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(input.amount * 100),
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: {
        company_registration_number: input.companyRegistrationNumber,
        product: "employee_award_ceremony_2026",
      },
    }),
  });
  const body = await response.json().catch(() => null) as any;
  if (!response.ok) {
    throw new Error(body?.error?.description || "Unable to create Razorpay order.");
  }
  return body as { id: string; amount: number; currency: string; status: string };
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function razorpaySignature(orderId: string, paymentId: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(await razorpaySecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${orderId}|${paymentId}`));
  return bytesToHex(new Uint8Array(signature));
}

export function employeeAwardAssetUrl(value?: string | null, baseUrl = "") {
  if (!value) return "";
  const clean = value.replace(/\\/g, "/").replace(/^public\//, "");
  if (/^(https?:)/i.test(clean)) {
    try {
      const url = new URL(clean);
      if (url.pathname.startsWith("/uploads/")) {
        return baseUrl ? `${baseUrl.replace(/\/$/, "")}${url.pathname}` : url.pathname;
      }
    } catch {
      return clean;
    }
    return clean;
  }
  if (/^(data:|blob:)/i.test(clean)) return clean;
  const path = clean.startsWith("/") ? clean : `/${clean}`;
  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
}

export function employeeAwardCompanyLogoUrl(award: EmployeeAwardRecord, baseUrl = "") {
  return (
    employeeAwardAssetUrl(award.company_logo_url, baseUrl) ||
    employeeAwardAssetUrl(award.company_logo_path ? `/uploads/employee-awards/${award.company_logo_path}` : "", baseUrl)
  );
}

function parseDbTimestamp(value: string) {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)
    ? new Date(value.replace(" ", "T") + "Z")
    : new Date(value);
}

export function formatEmployeeAwardDateTime(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(parseDbTimestamp(value));
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

function imageBuffer(file: z.infer<typeof imageSchema>) {
  const clean = file.base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const buffer = Buffer.from(clean, "base64");
  const png = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const jpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const webp = buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP";
  if ((file.mime.includes("png") && !png) || (file.mime.includes("jpeg") && !jpg) || (file.mime.includes("jpg") && !jpg) || (file.mime.includes("webp") && !webp)) {
    throw new Error("Invalid image upload.");
  }
  return buffer;
}

function ext(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

async function saveImage(file: z.infer<typeof imageSchema>, path: string) {
  const { uploadObject } = await import("@/db/storage");
  const saved = await uploadObject("employee-awards", `${path}.${ext(file.mime)}`, imageBuffer(file));
  return saved;
}

async function nextSeq(conn: any, name: string, count = 1) {
  const [rows] = await conn.execute("SELECT `value` FROM employee_award_sequences WHERE `name` = ? FOR UPDATE", [name]);
  const current = Number(rows[0]?.value ?? 0);
  await conn.execute("UPDATE employee_award_sequences SET `value` = ? WHERE `name` = ?", [current + count, name]);
  return current + 1;
}

function seq(prefix: string, n: number) {
  return `${prefix}-2026-${String(n).padStart(6, "0")}`;
}

async function findCompany(ref: string) {
  const rows = await runQuery<any>(
    "SELECT * FROM employee_award_company_registrations WHERE id = ? OR company_registration_number = ? LIMIT 1",
    [ref, ref],
  );
  return rows[0] ?? null;
}

export async function getCompanyAward(ref: string): Promise<EmployeeAwardRecord> {
  const company = await findCompany(ref);
  if (!company) throw new Error("Company registration not found.");
  const recipients = await runQuery<any>(
    "SELECT * FROM employee_award_recipients WHERE company_registration_id = ? ORDER BY display_order ASC",
    [company.id],
  );
  const payments = await runQuery<any>(
    "SELECT * FROM employee_award_payments WHERE company_registration_id = ? ORDER BY created_at DESC LIMIT 1",
    [company.id],
  );
  const employeeRecipients = recipients.filter((row) => row.recipient_type === "employee");
  return {
    ...company,
    employee_count: Number(company.employee_count),
    price_per_recipient: money(company.price_per_recipient),
    total_amount: money(company.total_amount),
    total_recipients: employeeRecipients.length,
    recipients: employeeRecipients.map((row) => ({ ...row, fee_amount: money(row.fee_amount) })),
    payment: payments[0]
      ? {
          ...payments[0],
          amount: money(payments[0].amount),
        }
      : null,
  };
}

export async function listCompanyAwardsForAdmin() {
  const companies = await runQuery<any>(
    "SELECT * FROM employee_award_company_registrations ORDER BY created_at DESC",
  );
  return Promise.all(companies.map((row) => getCompanyAward(row.id)));
}

export const submitEmployeeAwardRegistration = createServerFn({ method: "POST" })
  .validator((data: unknown) => companySchema.parse(data))
  .handler(async ({ data }) => {
    const duplicate = await runQuery<any>(
      "SELECT id FROM employee_award_company_registrations WHERE idempotency_key = ? LIMIT 1",
      [data.idempotencyKey],
    );
    if (duplicate[0]) {
      const existing = await getCompanyAward(duplicate[0].id);
      return { id: existing.id, companyRegistrationNumber: existing.company_registration_number };
    }

    const employeeCount = data.employees.length;
    const totalAmount = OWNER_FEE + employeeCount * EMPLOYEE_AWARD_FEE;
    const conn = await (await getDbPool()).getConnection();
    try {
      await conn.beginTransaction();
      const companyNo = seq("COMP", await nextSeq(conn, "company"));
      const invoiceNo = seq("INV", await nextSeq(conn, "invoice"));
      const firstAward = await nextSeq(conn, "award", employeeCount);
      const companyId = crypto.randomUUID();
      const orderId = `EAC-${companyNo}`;
      const logo = await saveImage(data.companyLogo, `company/${companyNo}/logo`);
      const ownerPhoto = data.ownerPhoto ? await saveImage(data.ownerPhoto, `company/${companyNo}/owner/photo`) : null;

      await conn.execute(
        `INSERT INTO employee_award_company_registrations
        (id, company_registration_number, company_name, company_logo_path, company_logo_url, company_email, company_mobile,
         company_address, city, state, pincode, gst_number, company_website, owner_name, owner_designation, owner_email,
         owner_mobile, owner_photo_path, owner_photo_url, employee_count, total_recipients, price_per_recipient,
         total_amount, status, payment_status, invoice_number, payment_order_id, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?)`,
        [
          companyId, companyNo, data.companyName, logo.path, logo.publicUrl, data.companyEmail.toLowerCase(), phone(data.companyMobile),
          data.companyAddress, data.city, data.state, data.pincode, data.gstNumber || null, data.companyWebsite || null,
          data.ownerName, data.ownerDesignation, data.ownerEmail.toLowerCase(), phone(data.ownerMobile),
          ownerPhoto?.path ?? null, ownerPhoto?.publicUrl ?? null, employeeCount, employeeCount, EMPLOYEE_AWARD_FEE,
          totalAmount, invoiceNo, orderId, data.idempotencyKey,
        ],
      );

      const rows = data.employees.map((employee, index) => ({
          type: "employee",
          order: index + 1,
          awardNo: seq("AWD", firstAward + index),
          name: employee.name,
          designation: employee.designation,
          department: employee.department || null,
          email: employee.email ? employee.email.toLowerCase() : null,
          mobile: employee.mobile ? phone(employee.mobile) : null,
          photo: null as Awaited<ReturnType<typeof saveImage>> | null,
          originalPhoto: employee.photo,
        }));

      for (const row of rows) {
        if ((row as any).originalPhoto) {
          row.photo = await saveImage((row as any).originalPhoto, `company/${companyNo}/employees/${row.order}/photo`);
        }
        await conn.execute(
          `INSERT INTO employee_award_recipients
          (id, company_registration_id, award_registration_number, recipient_type, display_order, name, designation,
           department, email, mobile, photo_path, photo_url, fee_amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            crypto.randomUUID(), companyId, row.awardNo, row.type, row.order, row.name, row.designation,
            row.department, row.email, row.mobile, row.photo?.path ?? null, row.photo?.publicUrl ?? null, EMPLOYEE_AWARD_FEE,
          ],
        );
      }

      await conn.execute(
        `INSERT INTO employee_award_payments
        (id, company_registration_id, order_id, amount, currency, provider, payment_mode, status, idempotency_key)
        VALUES (?, ?, ?, ?, 'INR', 'dummy', 'test', 'pending', ?)`,
        [crypto.randomUUID(), companyId, orderId, totalAmount, `${data.idempotencyKey}:payment`],
      );
      await conn.commit();
      return { id: companyId, companyRegistrationNumber: companyNo };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  });

export const fetchEmployeeAwardRegistration = createServerFn({ method: "GET" })
  .validator((data: unknown) => companyRefSchema.parse(data))
  .handler(async ({ data }) => getCompanyAward(data.company));

export const createEmployeeAwardPaymentOrder = createServerFn({ method: "POST" })
  .validator((data: unknown) => companyRefSchema.parse(data))
  .handler(async ({ data }) => {
    const key = await razorpayKey();
    const company = await getCompanyAward(data.company);
    if (company.payment_status === "paid") throw new Error("This registration is already paid.");

    const payment = company.payment;
    if (!payment) throw new Error("Payment record not found.");
    if (payment.order_id?.startsWith("order_") && payment.status !== "failed") {
      return { key, order: { id: payment.order_id, amount: Math.round(company.total_amount * 100), currency: "INR" }, company };
    }

    const order = await createRazorpayOrder({
      amount: company.total_amount,
      receipt: company.invoice_number,
      companyRegistrationNumber: company.company_registration_number,
    });
    await runQuery(
      "UPDATE employee_award_payments SET order_id = ?, provider = 'razorpay', payment_mode = 'live', status = 'created' WHERE id = ?",
      [order.id, payment.id],
    );
    await runQuery("UPDATE employee_award_company_registrations SET payment_order_id = ?, payment_method = 'razorpay' WHERE id = ?", [
      order.id,
      company.id,
    ]);
    return { key, order, company: await getCompanyAward(company.id) };
  });

export const fetchEmployeeAwardsForAdmin = createServerFn({ method: "GET" })
  .validator((data: unknown) => adminSchema.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin(data.adminUserId);
    return listCompanyAwardsForAdmin();
  });

export const fetchMyEmployeeAwards = createServerFn({ method: "GET" }).handler(async () => {
  const { currentUser } = await import("@/db/auth");
  const user = await currentUser();
  if (!user?.email) return [];
  const email = user.email.toLowerCase();
  const companies = await runQuery<any>(
    "SELECT id FROM employee_award_company_registrations WHERE LOWER(company_email) = ? OR LOWER(owner_email) = ? ORDER BY created_at DESC",
    [email, email],
  );
  return Promise.all(companies.map((row) => getCompanyAward(row.id)));
});

export const recoverEmployeeAwardInvoices = createServerFn({ method: "GET" })
  .validator((data: unknown) => recoverySchema.parse(data))
  .handler(async ({ data }) => {
    const raw = data.query.trim().toLowerCase();
    const isEmail = raw.includes("@");
    const params = isEmail ? [raw, raw] : [phone(raw), phone(raw)];
    if (isEmail) z.string().email().parse(raw);
    if (!isEmail && raw.replace(/\D/g, "").length < 10) {
      throw new Error("Enter a valid registered mobile number or email address.");
    }

    const companies = await runQuery<any>(
      `SELECT id FROM employee_award_company_registrations
       WHERE payment_status = 'paid'
       AND ${isEmail ? "(LOWER(company_email) = ? OR LOWER(owner_email) = ?)" : "(company_mobile = ? OR owner_mobile = ?)"}
       ORDER BY created_at DESC`,
      params,
    );
    return Promise.all(companies.map((row) => getCompanyAward(row.id)));
  });

export const verifyEmployeeAwardPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => verifySchema.parse(data))
  .handler(async ({ data }) => {
    const company = await findCompany(data.company);
    if (!company) throw new Error("Company registration not found.");
    if (company.payment_status === "paid") return { success: true, company: await getCompanyAward(company.id) };
    if (data.razorpayOrderId !== company.payment_order_id) throw new Error("Payment order mismatch.");
    const expected = await razorpaySignature(data.razorpayOrderId, data.razorpayPaymentId);
    if (expected !== data.razorpaySignature) throw new Error("Payment signature verification failed.");
    const payments = await runQuery<any>("SELECT * FROM employee_award_payments WHERE order_id = ? AND company_registration_id = ? LIMIT 1", [data.razorpayOrderId, company.id]);
    const payment = payments[0];
    if (!payment || money(payment.amount) !== money(company.total_amount)) throw new Error("Payment amount verification failed.");

    const conn = await (await getDbPool()).getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        "UPDATE employee_award_payments SET status = 'paid', transaction_id = ?, provider = 'razorpay', payment_mode = 'live', verified_at = CURRENT_TIMESTAMP WHERE id = ?",
        [data.razorpayPaymentId, payment.id],
      );
      await conn.execute(
        "UPDATE employee_award_company_registrations SET status = 'confirmed', payment_status = 'paid', transaction_id = ?, payment_method = 'razorpay', paid_at = CURRENT_TIMESTAMP WHERE id = ?",
        [data.razorpayPaymentId, company.id],
      );
      await conn.execute("UPDATE employee_award_recipients SET status = 'confirmed' WHERE company_registration_id = ?", [company.id]);
      await conn.commit();
      return { success: true, company: await getCompanyAward(company.id) };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  });

export const failEmployeeAwardPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => failSchema.parse(data))
  .handler(async ({ data }) => {
    const company = await findCompany(data.company);
    if (!company) throw new Error("Company registration not found.");
    await runQuery("UPDATE employee_award_payments SET status = 'failed' WHERE id = ? AND company_registration_id = ?", [data.paymentId, company.id]);
    await runQuery("UPDATE employee_award_company_registrations SET payment_status = 'failed', status = 'failed' WHERE id = ?", [company.id]);
    return { success: true };
  });

export const updateEmployeeAwardStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminStatusSchema.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin(data.adminUserId);
    await runQuery("UPDATE employee_award_company_registrations SET status = ? WHERE id = ?", [data.status, data.id]);
    return getCompanyAward(data.id);
  });

export const exportEmployeeAwardsExcel = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminSchema.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin(data.adminUserId);
    const awards = await listCompanyAwardsForAdmin();
    const headers = [
      "Company Registration ID", "Individual Award ID", "Company Name", "Company Logo URL", "Company Email", "Company Phone",
      "Company Address", "City", "State", "Pincode", "GST Number", "Owner Name", "Owner Designation", "Employee Type",
      "Recipient Name", "Recipient Designation", "Department", "Recipient Email", "Recipient Mobile", "Photo URL",
      "Employee Count", "Owner Fee", "Employee Fee", "Recipient Fee", "Total Order Amount", "Payment Status",
      "Payment Order ID", "Transaction ID", "Invoice Number", "Registration Date", "Payment Date",
    ];
    const rows = awards.flatMap((award) =>
      award.recipients.map((recipient) => [
        award.company_registration_number, recipient.award_registration_number, award.company_name, award.company_logo_url,
        award.company_email, award.company_mobile, award.company_address, award.city, award.state, award.pincode,
        award.gst_number ?? "", award.owner_name, award.owner_designation, recipient.recipient_type, recipient.name,
        recipient.designation, recipient.department ?? "", recipient.email ?? "", recipient.mobile ?? "", recipient.photo_url ?? "",
        award.employee_count, OWNER_FEE, EMPLOYEE_AWARD_FEE, recipient.fee_amount, award.total_amount,
        award.payment_status, award.payment_order_id ?? "", award.transaction_id ?? "", award.invoice_number,
        award.submitted_at, award.paid_at ?? "",
      ]),
    );
    return [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
  });

export function invoiceHtml(award: EmployeeAwardRecord, baseUrl = "") {
  const telentFestLogo = employeeAwardAssetUrl("/brand/telentfest-official-icon.png", baseUrl);
  const companyLogo = employeeAwardCompanyLogoUrl(award, baseUrl);
  const rows = award.recipients
    .map((recipient) => `<tr><td>${escapeHtml(recipient.award_registration_number)}</td><td>${escapeHtml(recipient.name)}</td><td>${escapeHtml(recipient.designation)}</td><td>${escapeHtml(recipient.department || "Not provided")}</td><td class="right">Rs. ${recipient.fee_amount.toFixed(2)}</td></tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(award.invoice_number)}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}.top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.brand-lockup{display:flex;align-items:center;gap:10px;margin-bottom:14px;color:#111}.brand-icon{height:44px;width:44px;object-fit:contain}.brand-name{font-size:22px;font-weight:800;letter-spacing:.18em;color:#111}.brand-sub{font-size:11px;font-weight:700;color:#111}.company-logo{height:72px;max-width:220px;object-fit:contain;border:1px solid #ddd;border-radius:10px;padding:8px}.muted{color:#666}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}.item{border:1px solid #ddd;border-radius:10px;padding:10px}.label{font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.12em}.value{margin-top:4px;font-weight:600;white-space:pre-wrap}.wide{grid-column:1/-1}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #ddd;padding:8px;text-align:left}.right{text-align:right}.total{font-size:20px;font-weight:700}.fees{margin-top:18px;max-width:420px;margin-left:auto}@media print{body{padding:18px}.no-print{display:none}}</style></head><body><div class="top"><div><div class="brand-lockup"><img class="brand-icon" src="${escapeHtml(telentFestLogo)}" alt="TelentFest logo"/><div><div class="brand-name">TELENTFEST</div><div class="brand-sub">Training Since 2015</div></div></div><h2>Employee Award Ceremony 2026 Invoice</h2><p class="muted">Invoice No: ${escapeHtml(award.invoice_number)}</p></div>${companyLogo ? `<img class="company-logo" src="${escapeHtml(companyLogo)}" alt="${escapeHtml(award.company_name)} logo"/>` : ""}</div><div class="grid">${invoiceItem("Company Registration ID", award.company_registration_number)}${invoiceItem("Company Name", award.company_name)}${invoiceItem("Company Address", `${award.company_address}, ${award.city}, ${award.state} - ${award.pincode}`, true)}${invoiceItem("GST Number", award.gst_number || "Not provided")}${invoiceItem("Company Website", award.company_website || "Not provided")}${invoiceItem("Company Contact", award.company_mobile)}${invoiceItem("Company Email", award.company_email)}${invoiceItem("Owner Name", award.owner_name)}${invoiceItem("Owner Designation", award.owner_designation)}${invoiceItem("Payment Status", award.payment_status.toUpperCase())}${invoiceItem("Transaction ID", award.transaction_id || "Not available")}${invoiceItem("Payment Date/Time", formatEmployeeAwardDateTime(award.paid_at))}</div><table><thead><tr><th>Award ID</th><th>Employee Name</th><th>Designation</th><th>Department</th><th class="right">Employee Fee</th></tr></thead><tbody>${rows || `<tr><td colspan="5">No employee award recipients found.</td></tr>`}</tbody></table><table class="fees"><tbody><tr><td>Owner Fee</td><td class="right">Rs. ${OWNER_FEE.toFixed(2)}</td></tr><tr><td>Employee Award Fees (${award.employee_count} x Rs. ${EMPLOYEE_AWARD_FEE.toFixed(2)})</td><td class="right">Rs. ${(award.employee_count * EMPLOYEE_AWARD_FEE).toFixed(2)}</td></tr><tr><td>Total Employees / Award Recipients</td><td class="right">${award.employee_count}</td></tr><tr><td class="total">Total Amount</td><td class="right total">Rs. ${award.total_amount.toFixed(2)}</td></tr></tbody></table></body></html>`;
}

function invoiceItem(label: string, value: unknown, wide = false) {
  return `<div class="item ${wide ? "wide" : ""}"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value || "Not provided")}</div></div>`;
}
