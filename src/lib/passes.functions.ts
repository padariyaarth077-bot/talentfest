import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const verifySchema = z.object({
  entryId: z.string().uuid(),
  token: z.string().min(8).max(128),
});

export const verifyPassPublic = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => verifySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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