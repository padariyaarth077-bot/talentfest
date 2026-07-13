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
        .select("full_name, event_id, activity_category_id, registration_type, photo_storage_path, phone, email")
        .eq("id", p.registration_id)
        .single();

      if (!reg) return { valid: false as const };
      const r = reg as any;

      const { data: event } = await supabaseAdmin
        .from("events")
        .select("name, city, event_date, start_time, end_time, venue")
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

      let photoUrl = null;
      if (r.photo_storage_path) {
        const { data: pubUrl } = supabaseAdmin.storage
          .from("participant-photos")
          .getPublicUrl(r.photo_storage_path);
        photoUrl = pubUrl?.publicUrl ?? null;
      }

      let seatInfo = null;
      const { data: seatBooking } = await supabaseAdmin
        .from("seat_bookings")
        .select("id, holder_type, holder_name, event_seats!inner(id, seat_label, row_label, seat_number, event_seat_sections!inner(section_name, section_code))")
        .eq("registration_id", p.registration_id)
        .eq("holder_type", p.pass_type)
        .maybeSingle();

      if (seatBooking) {
        const sb = seatBooking as any;
        seatInfo = {
          sectionName: sb.event_seats?.event_seat_sections?.section_name ?? "",
          sectionCode: sb.event_seats?.event_seat_sections?.section_code ?? "",
          rowLabel: sb.event_seats?.row_label ?? "",
          seatNumber: sb.event_seats?.seat_number ?? 0,
          seatLabel: sb.event_seats?.seat_label ?? "",
        };
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
          start_time: (event as any)?.start_time ?? null,
          end_time: (event as any)?.end_time ?? null,
          event_city: (event as any)?.city ?? null,
          status: p.status,
          checked_in: p.checked_in,
          checked_in_at: p.checked_in_at,
          photo_url: photoUrl,
          phone: r.phone,
          email: r.email,
          pass_type: p.pass_type,
          registration_type: r.registration_type,
          seat_info: seatInfo,
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
