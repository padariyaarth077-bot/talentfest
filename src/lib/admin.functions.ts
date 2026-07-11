/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type AdminDb = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

const adminUserSchema = z.object({ adminUserId: z.string().uuid() });
const verifyQrSchema = adminUserSchema.extend({ code: z.string().min(1) });
const checkInSchema = adminUserSchema.extend({ passId: z.string().min(1) });

async function assertAdmin(db: AdminDb, adminUserId: string) {
  const { data, error } = await db
    .from("user_roles")
    .select("user_id")
    .eq("user_id", adminUserId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Admin access required.");
}

async function safeList<T>(query: PromiseLike<{ data: T[] | null; error: any }>) {
  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

async function safeMaybeSingle<T>(query: PromiseLike<{ data: T | null; error: any }>) {
  const { data, error } = await query;
  if (error) return null;
  return data ?? null;
}

function parseQrValue(value: string) {
  const raw = value.trim();
  let id = "";
  let entryNumber = "";
  let token = "";

  try {
    const json = JSON.parse(raw);
    id = String(json.id || json.passId || "");
    entryNumber = String(json.entryNumber || json.entry_number || json.passNumber || "");
    token = String(json.token || json.secure_qr_token || "");
  } catch {
    try {
      const url = new URL(raw);
      id = url.searchParams.get("id") || "";
      entryNumber = url.searchParams.get("entry") || url.searchParams.get("pass") || "";
      token = url.searchParams.get("token") || "";
      if (!id && !entryNumber && !token) {
        const last = url.pathname.split("/").filter(Boolean).pop() || "";
        token = last;
      }
    } catch {
      if (/^[0-9a-f-]{32,36}$/i.test(raw)) id = raw;
      else if (/^TF/i.test(raw)) entryNumber = raw;
      else token = raw;
    }
  }

  return { raw, id, entryNumber, token };
}

function isUuid(value?: string | null) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function buildModernPass(db: AdminDb, pass: any) {
  const registration = await safeMaybeSingle<any>(
    db
      .from("registrations")
      .select(
        "id, full_name, email, phone, event_id, registration_number, payment_status, registration_status, activity_category_id, registration_type, aadhaar_last_four, created_at",
      )
      .eq("id", pass.registration_id)
      .maybeSingle(),
  );

  const event = registration?.event_id
    ? await safeMaybeSingle<any>(
        db
          .from("events")
          .select("id, name, city, city_code, event_date, start_time, venue, event_image_url")
          .eq("id", registration.event_id)
          .maybeSingle(),
      )
    : null;

  const activity = registration?.activity_category_id
    ? await safeMaybeSingle<any>(
        db
          .from("activity_categories")
          .select("name")
          .eq("id", registration.activity_category_id)
          .maybeSingle(),
      )
    : null;

  const payment = registration?.id
    ? await safeMaybeSingle<any>(
        (db as any)
          .from("payments")
          .select("provider, payment_mode, status, transaction_id, order_id, verified_at")
          .eq("registration_id", registration.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      )
    : null;

  const guest = pass.guest_id
    ? await safeMaybeSingle<any>(
        db.from("guests").select("full_name, phone").eq("id", pass.guest_id).maybeSingle(),
      )
    : null;

  const passHolder = guest?.full_name || registration?.full_name || "Unknown";
  const qrValue = JSON.stringify({
    id: pass.id,
    entryNumber: pass.pass_number,
    token: pass.secure_qr_token,
  });

  return {
    id: pass.id,
    participant_name: passHolder,
    event_name: event?.name || "New Registration",
    entry_number: pass.pass_number || "",
    qr_value: qrValue,
    email: registration?.email || null,
    phone: guest?.phone || registration?.phone || null,
    created_at: pass.created_at || pass.generated_at || registration?.created_at || new Date().toISOString(),
    checked_in: pass.checked_in ?? pass.status === "checked_in",
    checked_in_at: pass.checked_in_at || null,
    pass_status: pass.status || "active",
    status: pass.status || "active",
    updated_at: pass.updated_at || null,
    pass_type: pass.pass_type || registration?.registration_type || "participant",
    registration_type: registration?.registration_type || null,
    registration_number: registration?.registration_number || null,
    payment_status: payment?.status || registration?.payment_status || null,
    payment_mode: payment?.payment_mode || (payment?.provider === "dummy" ? "test" : null),
    payment_provider: payment?.provider || null,
    transaction_id: payment?.transaction_id || null,
    order_id: payment?.order_id || null,
    registration_status: registration?.registration_status || null,
    event_city: event?.city || null,
    event_date: event?.event_date || null,
    event_time: event?.start_time || null,
    venue: event?.venue || null,
    event_image_url: event?.event_image_url || null,
    linked_participant_name: guest ? registration?.full_name || null : null,
    aadhaar_last_four: registration?.aadhaar_last_four || null,
    activity_category: activity?.name || null,
  };
}

function normalizeLegacyPass(pass: any) {
  return {
    id: pass.id,
    participant_name: pass.participant_name || "Unknown",
    event_name: pass.event_name || "Telent Fest",
    entry_number: pass.entry_number || "",
    qr_value: pass.qr_value || null,
    email: pass.email || null,
    phone: pass.phone || null,
    created_at: pass.created_at || new Date().toISOString(),
    checked_in: pass.checked_in ?? pass.status === "checked_in",
    checked_in_at: pass.checked_in_at || null,
    pass_status: pass.pass_status || pass.status || "generated",
    status: pass.status || pass.pass_status || "generated",
    updated_at: pass.updated_at || null,
    pass_type: "legacy",
    registration_type: "legacy",
    registration_number: "Legacy",
    payment_status: pass.payment_status || "paid",
    payment_mode: "legacy",
    payment_provider: "legacy",
    transaction_id: null,
    order_id: null,
    registration_status: "legacy",
    event_city: null,
    event_date: null,
    event_time: null,
    venue: null,
    event_image_url: null,
    linked_participant_name: null,
    aadhaar_last_four: null,
    activity_category: null,
  };
}

export const fetchAdminData = createServerFn({ method: "GET" })
  .validator((data: unknown) => adminUserSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, data.adminUserId);

    const modernPassRows = await safeList<any>(
      (supabaseAdmin as any)
        .from("passes")
        .select(
          "id, pass_number, pass_type, status, checked_in, checked_in_at, registration_id, guest_id, secure_qr_token, generated_at, created_at, updated_at",
        )
        .order("created_at", { ascending: false }),
    );
    const modernPasses = await Promise.all(modernPassRows.map((pass) => buildModernPass(supabaseAdmin, pass)));
    const modernNumbers = new Set(modernPasses.map((pass) => pass.entry_number).filter(Boolean));

    const legacyRows = await safeList<any>(
      (supabaseAdmin as any)
        .from("public_entry_passes")
        .select(
          "id, participant_name, event_name, entry_number, qr_value, email, phone, created_at, checked_in, checked_in_at, pass_status, status, updated_at",
        )
        .order("created_at", { ascending: false }),
    );
    const legacyPasses = legacyRows
      .map(normalizeLegacyPass)
      .filter((pass) => !modernNumbers.has(pass.entry_number));

    const [activities, events, galleryCities, galleryMedia, concertSettingsRows, concertArtists, blogPosts] =
      await Promise.all([
        safeList<any>(
          (supabaseAdmin as any)
            .from("admin_activity")
            .select("id, action, entry_number, participant_name, created_at, admin_email")
            .order("created_at", { ascending: false })
            .limit(12),
        ),
        safeList<any>(
          (supabaseAdmin as any).from("events").select("*").order("name", { ascending: true }),
        ),
        safeList<any>(
          (supabaseAdmin as any)
            .from("gallery_cities")
            .select("id, name, slug, display_order, is_active, created_at, updated_at")
            .order("display_order", { ascending: true })
            .order("name", { ascending: true }),
        ),
        safeList<any>(
          (supabaseAdmin as any)
            .from("gallery_media")
            .select(
              "id, city_id, title, media_type, category, media_url, thumbnail_url, description, display_order, is_active, created_at, updated_at",
            )
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false }),
        ),
        safeList<any>(
          (supabaseAdmin as any)
            .from("concert_settings")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1),
        ),
        safeList<any>(
          (supabaseAdmin as any)
            .from("concert_artists")
            .select("*")
            .order("display_order", { ascending: true })
            .order("artist_name", { ascending: true }),
        ),
        safeList<any>(
          (supabaseAdmin as any)
            .from("blog_posts")
            .select("*")
            .order("display_order", { ascending: true })
            .order("published_at", { ascending: false }),
        ),
      ]);

    return {
      passes: [...modernPasses, ...legacyPasses],
      activities,
      events,
      galleryCities,
      galleryMedia,
      concertSettings: concertSettingsRows[0] ?? null,
      concertArtists,
      blogPosts,
    };
  });

async function findModernPassByQr(db: AdminDb, parsed: ReturnType<typeof parseQrValue>) {
  let row: any = null;

  if (isUuid(parsed.id)) {
    row = await safeMaybeSingle<any>(
      (db as any)
        .from("passes")
        .select("*")
        .eq("id", parsed.id)
        .maybeSingle(),
    );
  }
  if (!row && parsed.token) {
    row = await safeMaybeSingle<any>(
      (db as any)
        .from("passes")
        .select("*")
        .eq("secure_qr_token", parsed.token)
        .maybeSingle(),
    );
  }
  if (!row && parsed.entryNumber) {
    row = await safeMaybeSingle<any>(
      (db as any)
        .from("passes")
        .select("*")
        .eq("pass_number", parsed.entryNumber)
        .maybeSingle(),
    );
  }

  if (!row) return null;
  if (parsed.token && row.secure_qr_token && row.secure_qr_token !== parsed.token) {
    throw new Error("Invalid QR Code. Token mismatch.");
  }
  return row;
}

export const verifyAdminQr = createServerFn({ method: "POST" })
  .validator((data: unknown) => verifyQrSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, data.adminUserId);
    const parsed = parseQrValue(data.code);

    try {
      const modern = await findModernPassByQr(supabaseAdmin, parsed);
      if (modern) {
        const pass = await buildModernPass(supabaseAdmin, modern);
        if (pass.status === "revoked" || pass.pass_status === "revoked") {
          return { state: "revoked", message: "Pass Revoked. This pass cannot be used for entry.", pass };
        }
        if (pass.checked_in) {
          return {
            state: "checked_in",
            message: `Already Checked In at ${pass.checked_in_at || "the gate"}`,
            pass,
          };
        }
        if (pass.payment_status !== "paid") {
          return { state: "invalid", message: "Payment is not paid for this pass.", pass };
        }
        return {
          state: "valid",
          message:
            pass.payment_mode === "test" || pass.payment_provider === "dummy"
              ? "Valid Test Payment Pass. This pass can be checked in."
              : "Valid Pass. This pass can be checked in.",
          pass,
        };
      }
    } catch (error) {
      return {
        state: "invalid",
        message: error instanceof Error ? error.message : "Invalid QR Code.",
      };
    }

    const legacyRow = await safeMaybeSingle<any>(
      (supabaseAdmin as any)
        .from("public_entry_passes")
        .select(
          "id, participant_name, event_name, entry_number, qr_value, email, phone, created_at, checked_in, checked_in_at, pass_status, status, updated_at",
        )
        .or(`id.eq.${parsed.id || "00000000-0000-0000-0000-000000000000"},entry_number.eq.${parsed.entryNumber || parsed.raw}`)
        .maybeSingle(),
    );

    if (!legacyRow) {
      return { state: "invalid", message: "Invalid Telent Fest Pass. This QR code could not be verified." };
    }
    const pass = normalizeLegacyPass(legacyRow);
    if (pass.status === "revoked" || pass.pass_status === "revoked") {
      return { state: "revoked", message: "Pass Revoked. This pass cannot be used for entry.", pass };
    }
    if (pass.checked_in) {
      return { state: "checked_in", message: `Already Checked In at ${pass.checked_in_at || "the gate"}`, pass };
    }
    return { state: "valid", message: "Valid Legacy Pass. This pass can be checked in.", pass };
  });

export const checkInAdminPass = createServerFn({ method: "POST" })
  .validator((data: unknown) => checkInSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, data.adminUserId);

    const modern = isUuid(data.passId)
      ? await safeMaybeSingle<any>(
          (supabaseAdmin as any)
            .from("passes")
            .select("*")
            .eq("id", data.passId)
            .maybeSingle(),
        )
      : null;

    if (modern) {
      const pass = await buildModernPass(supabaseAdmin, modern);
      if (pass.payment_status !== "paid") throw new Error("Payment is not paid. This pass cannot be checked in.");
      if (pass.pass_status === "revoked" || pass.status === "revoked") throw new Error("This pass is revoked.");
      if (pass.checked_in) throw new Error(`Already checked in at ${pass.checked_in_at || "the gate"}.`);

      const now = new Date().toISOString();
      const { error: updateError } = await (supabaseAdmin as any)
        .from("passes")
        .update({ checked_in: true, checked_in_at: now, status: "checked_in", updated_at: now })
        .eq("id", data.passId);
      if (updateError) throw updateError;

      await (supabaseAdmin as any).from("check_in_logs").insert({
        pass_id: data.passId,
        admin_user_id: data.adminUserId,
        previous_status: modern.status || "active",
        new_status: "checked_in",
        action: "Checked in",
        checked_in_at: now,
      });
      return { ok: true };
    }

    const legacy = await safeMaybeSingle<any>(
      (supabaseAdmin as any)
        .from("public_entry_passes")
        .select("*")
        .eq("id", data.passId)
        .maybeSingle(),
    );
    if (!legacy) throw new Error("Pass not found.");
    if (legacy.checked_in) throw new Error(`Already checked in at ${legacy.checked_in_at || "the gate"}.`);
    const now = new Date().toISOString();
    const { error } = await (supabaseAdmin as any)
      .from("public_entry_passes")
      .update({ checked_in: true, checked_in_at: now, status: "checked_in", updated_at: now })
      .eq("id", data.passId);
    if (error) throw error;
    return { ok: true };
  });
