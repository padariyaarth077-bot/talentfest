import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const generateSchema = z.object({
  participantName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .transform((s) => s.trim()),
});

export const generateEntryPass = createServerFn({ method: "POST" })
  .validator((data: unknown) => generateSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: record, error } = await supabaseAdmin
      .from("public_entry_passes")
      .insert({ participant_name: data.participantName })
      .select("id, entry_number, participant_name, event_name, status, created_at")
      .single();

    if (error) {
      if (error.code === "42P01") {
        return {
          success: false as const,
          error:
            "Entry pass system is being set up. Please run the database migration to create the public_entry_passes table.",
        };
      }
      if (error.code === "23505") {
        return {
          success: false as const,
          error: "A duplicate entry was detected. Please try again.",
        };
      }
      return {
        success: false as const,
        error: "Failed to generate entry pass. Please try again later.",
      };
    }

    return {
      success: true as const,
      pass: {
        id: record.id,
        entryNumber: record.entry_number,
        participantName: record.participant_name,
        eventName: record.event_name,
        status: record.status,
        createdAt: record.created_at,
      },
    };
  });
