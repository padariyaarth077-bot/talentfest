/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactFormSchema = z.object({
  full_name: z.string().min(1, "Full name is required").trim(),
  phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
  email: z.string().email("Invalid email address").trim(),
  subject: z.string().min(1, "Subject is required").trim(),
  message: z.string().min(1, "Message is required").trim(),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) => contactFormSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const now = new Date().toISOString();
    const { error } = await db.from("contact_messages").insert({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      subject: data.subject,
      message: data.message,
      status: "new",
      submitted_at: now,
      created_at: now,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export type ContactMessageRecord = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
};

export const fetchContactMessages = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data, error } = await db
      .from("contact_messages")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as ContactMessageRecord[];
  });

export const updateContactMessageStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "in_progress", "resolved"]) }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error } = await db
      .from("contact_messages")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteContactMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error } = await db.from("contact_messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
