import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const verifySchema = z.object({
  entryId: z.string().uuid(),
  token: z.string().min(1),
});

export const verifyPassPublic = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => verifySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // First try new passes table
    const { data: newPass } = await supabaseAdmin
      .from("passes")
      .select("id, pass_number, pass_type, status, checked_in, checked_in_at, secure_qr_token, registration_id")
      .eq("id", data.entryId)
      .maybeSingle();

    if (newPass) {
      const p = newPass as any;
      if (p.secure_qr_token !== data.token) return { valid: false as const };

      const { data: reg } = await supabaseAdmin
        .from("registrations")
        .select("full_name, event_id, activity_category_id")
        .eq("id", p.registration_id)
        .single();

      if (!reg) return { valid: false as const };
      const r = reg as any;

      const { data: event } = await supabaseAdmin
        .from("events")
        .select("name, city, event_date, venue")
        .eq("id", r.event_id)
        .single();

      let activityName = "";
      if (r.activity_category_id) {
        const { data: cat } = await supabaseAdmin
          .from("activity_categories")
          .select("name")
          .eq("id", r.activity_category_id)
          .single();
        if (cat) activityName = (cat as any).name;
      }

      return {
        valid: true as const,
        pass: {
          id: p.id,
          entry_number: p.pass_number,
          participant_name: r.full_name,
          competition: (event as any)?.name ?? "",
          category: activityName,
          venue: (event as any)?.venue ?? null,
          event_date: (event as any)?.event_date ?? null,
          status: p.status,
          checked_in: p.checked_in,
          checked_in_at: p.checked_in_at,
        },
      };
    }

    // Fallback to old entry_passes table
    const { data: pass, error } = await supabaseAdmin
      .from("entry_passes")
      .select(
        "id, entry_number, participant_name, photo_url, competition, category, sub_category, venue, hall, stage, event_date, reporting_time, status, verification_token",
      )
      .eq("id", data.entryId)
      .maybeSingle();

    if (error || !pass) return { valid: false as const };
    if (pass.verification_token !== data.token) return { valid: false as const };

    let signedPhotoUrl: string | null = null;
    if (pass.photo_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("pass-photos")
        .createSignedUrl(pass.photo_url, 60 * 60);
      signedPhotoUrl = signed?.signedUrl ?? null;
    }

    return {
      valid: true as const,
      pass: {
        id: pass.id,
        entry_number: pass.entry_number,
        participant_name: pass.participant_name,
        photo_url: signedPhotoUrl,
        competition: pass.competition,
        category: pass.category,
        sub_category: pass.sub_category,
        venue: pass.venue,
        hall: pass.hall,
        stage: pass.stage,
        event_date: pass.event_date,
        reporting_time: pass.reporting_time,
        status: pass.status,
      },
    };
  });