/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type AdminDb = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

const awardStatuses = ["submitted", "reviewing", "approved", "rejected"] as const;
const awardCategories = [
  "Best Employee Award",
  "Best Team Leader Award",
  "Best Performer Award",
  "Innovation Award",
  "Best Attendance Award",
  "Rising Star Award",
  "Customer Service Excellence",
  "Leadership Excellence",
] as const;

const formSchema = z.object({
  companyName: z.string().trim().min(2),
  companyAddress: z.string().trim().min(5),
  coordinatorName: z.string().trim().min(2),
  contactNumber: z.string().trim().regex(/^\d{10}$/),
  companyEmail: z.string().trim().email(),
  employeeFullName: z.string().trim().min(2),
  designation: z.string().trim().min(2),
  department: z.string().trim().min(2),
  gender: z.enum(["male", "female", "other"]),
  mobileNumber: z.string().trim().regex(/^\d{10}$/),
  employeeEmail: z.string().trim().email(),
  awardCategories: z.array(z.enum(awardCategories)).default([]),
  otherAwardCategory: z.string().trim().optional().default(""),
  workingSince: z.string().trim().optional().default(""),
  totalExperience: z.string().trim().min(1),
  majorAchievements: z.string().trim().min(10),
  eventParticipation: z.enum(["employee_only", "employee_family", "company_team"]),
  numberOfParticipants: z.coerce.number().int().min(1).max(500),
  declarationAccepted: z.literal(true),
  employeeSignatureName: z.string().trim().min(2),
  authorizedCompanySignatureName: z.string().trim().min(2),
  declarationDate: z.string().trim().min(1),
});

const adminStatusSchema = z.object({
  adminUserId: z.string().uuid(),
  id: z.string().uuid(),
  status: z.enum(awardStatuses),
});

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

function normalizePhone(phone: string) {
  return `+91${phone.replace(/\D/g, "").slice(-10)}`;
}

function normalizeDate(value: string) {
  return value ? value : null;
}

export type EmployeeAwardRecord = {
  id: string;
  application_number: string;
  company_name: string;
  company_address: string;
  coordinator_name: string;
  contact_number: string;
  company_email: string;
  employee_full_name: string;
  designation: string;
  department: string;
  gender: "male" | "female" | "other";
  mobile_number: string;
  employee_email: string;
  award_categories: string[];
  other_award_category: string | null;
  working_since: string | null;
  total_experience: string;
  major_achievements: string;
  event_participation: "employee_only" | "employee_family" | "company_team";
  number_of_participants: number;
  declaration_accepted: boolean;
  employee_signature_name: string;
  authorized_company_signature_name: string;
  declaration_date: string;
  status: "submitted" | "reviewing" | "approved" | "rejected";
  submitted_at: string;
  created_at: string;
  updated_at: string;
};

export const submitEmployeeAwardRegistration = createServerFn({ method: "POST" })
  .validator((data: unknown) => formSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.awardCategories.length === 0 && !data.otherAwardCategory) {
      throw new Error("Please select at least one award category.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      company_name: data.companyName,
      company_address: data.companyAddress,
      coordinator_name: data.coordinatorName,
      contact_number: normalizePhone(data.contactNumber),
      company_email: data.companyEmail.toLowerCase(),
      employee_full_name: data.employeeFullName,
      designation: data.designation,
      department: data.department,
      gender: data.gender,
      mobile_number: normalizePhone(data.mobileNumber),
      employee_email: data.employeeEmail.toLowerCase(),
      award_categories: data.awardCategories,
      other_award_category: data.otherAwardCategory || null,
      working_since: normalizeDate(data.workingSince),
      total_experience: data.totalExperience,
      major_achievements: data.majorAchievements,
      event_participation: data.eventParticipation,
      number_of_participants: data.numberOfParticipants,
      declaration_accepted: data.declarationAccepted,
      employee_signature_name: data.employeeSignatureName,
      authorized_company_signature_name: data.authorizedCompanySignatureName,
      declaration_date: data.declarationDate,
      status: "submitted",
    };

    const { data: inserted, error } = await (supabaseAdmin as any)
      .from("employee_award_registrations")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error("Unable to submit this registration. Please try again.");

    return {
      id: inserted.id as string,
      applicationNumber: inserted.application_number as string,
      employeeFullName: inserted.employee_full_name as string,
      submittedAt: inserted.submitted_at as string,
    };
  });

export const fetchEmployeeAwardRegistration = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ applicationNumber: z.string().trim().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: record, error } = await (supabaseAdmin as any)
      .from("employee_award_registrations")
      .select("*")
      .eq("application_number", data.applicationNumber)
      .maybeSingle();
    if (error || !record) throw new Error("Registration not found.");
    return record as EmployeeAwardRecord;
  });

export const updateEmployeeAwardStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, data.adminUserId);
    const { data: updated, error } = await (supabaseAdmin as any)
      .from("employee_award_registrations")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error("Unable to update Employee Award status.");
    return updated as EmployeeAwardRecord;
  });

