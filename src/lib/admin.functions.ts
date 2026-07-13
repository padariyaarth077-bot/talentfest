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
        "id, full_name, email, phone, event_id, registration_number, payment_status, registration_status, activity_category_id, registration_type, aadhaar_last_four, created_at, photo_storage_path, photo_url",
      )
      .eq("id", pass.registration_id)
      .maybeSingle(),
  );

  const event = registration?.event_id
    ? await safeMaybeSingle<any>(
        db
          .from("events")
          .select("id, name, city, city_code, event_date, start_time, end_time, venue, event_image_url")
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

  let payment = registration?.id
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
  // Fallback: payment_mode column may not exist
  if (!payment && registration?.id) {
    payment = await safeMaybeSingle<any>(
      (db as any)
        .from("payments")
        .select("provider, status, transaction_id, order_id, verified_at")
        .eq("registration_id", registration.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
  }

  const guest = pass.guest_id
    ? await safeMaybeSingle<any>(
        db.from("guests").select("full_name, phone").eq("id", pass.guest_id).maybeSingle(),
      )
    : null;

  let photoUrl = null;
  if (registration?.photo_storage_path) {
    try {
      const { data: pubUrl } = db.storage
        .from("participant-photos")
        .getPublicUrl(registration.photo_storage_path);
      photoUrl = pubUrl?.publicUrl ?? null;
    } catch { /* storage not configured */ }
  }

  let seatInfo = null;
  if (registration?.id) {
    try {
      const { data: seatBooking } = await (db as any)
        .from("seat_bookings")
        .select("id, holder_type, holder_name, event_seats!inner(id, seat_label, row_label, seat_number, event_seat_sections!inner(section_name, section_code))")
        .eq("registration_id", registration.id)
        .eq("holder_type", pass.pass_type || registration.registration_type)
        .maybeSingle();

      if (seatBooking) {
        seatInfo = {
          sectionName: seatBooking.event_seats?.event_seat_sections?.section_name ?? "",
          sectionCode: seatBooking.event_seats?.event_seat_sections?.section_code ?? "",
          rowLabel: seatBooking.event_seats?.row_label ?? "",
          seatNumber: seatBooking.event_seats?.seat_number ?? 0,
          seatLabel: seatBooking.event_seats?.seat_label ?? "",
        };
      }
    } catch { /* seats not configured */ }
  }

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
    event_end_time: event?.end_time || null,
    venue: event?.venue || null,
    event_image_url: event?.event_image_url || null,
    linked_participant_name: guest ? registration?.full_name || null : null,
    aadhaar_last_four: registration?.aadhaar_last_four || null,
    activity_category: activity?.name || null,
    photo_url: photoUrl,
    seat_info: seatInfo,
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

    const [
      activities,
      events,
      galleryCities,
      galleryMedia,
      concertSettingsRows,
      concertArtists,
      blogPosts,
      employeeAwards,
    ] =
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
              "id, city_id, title, media_type, category, media_url, thumbnail_url, description, display_order, is_active, is_featured, fit_mode, fit_position, storage_path, alt_text, width, height, created_at, updated_at",
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
        safeList<any>(
          (supabaseAdmin as any)
            .from("employee_award_registrations")
            .select("*")
            .order("created_at", { ascending: false }),
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
      employeeAwards,
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

// ─── Concert Settings CRUD ──────────────────────────────────

const concertSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  eyebrow: z.string().optional().default(""),
  title: z.string().optional().default(""),
  subtitle: z.string().optional().default(""),
  event_label: z.string().optional().default(""),
  event_title: z.string().optional().default(""),
  venue: z.string().optional().default(""),
  city: z.string().optional().default(""),
  event_date: z.string().optional().default(""),
  start_time: z.string().optional().default(""),
  end_time: z.string().optional().default(""),
  price_text: z.string().optional().default(""),
  button_text: z.string().optional().default(""),
  button_url: z.string().optional().default(""),
  map_url: z.string().optional().default(""),
  map_embed_url: z.string().optional().default(""),
  latitude: z.number().nullable().optional().default(null),
  longitude: z.number().nullable().optional().default(null),
  is_published: z.boolean().optional().default(true),
});

export const saveConcertSettings = createServerFn({ method: "POST" })
  .validator((data: unknown) => concertSettingsSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const now = new Date().toISOString();

    if (data.id) {
      const { error } = await db
        .from("concert_settings")
        .update({ ...data, updated_at: now })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await db
        .from("concert_settings")
        .insert({ ...data, updated_at: now, created_at: now })
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      data.id = inserted?.id;
    }
    return { success: true, id: data.id };
  });

const concertArtistSchema = z.object({
  id: z.string().uuid().optional(),
  concert_info_id: z.string().uuid(),
  artist_name: z.string().min(1, "Artist name is required"),
  performance_type: z.string().optional().default(""),
  description: z.string().optional().default(""),
  image_url: z.string().optional().default(""),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().optional().default(true),
});

export const saveConcertArtist = createServerFn({ method: "POST" })
  .validator((data: unknown) => concertArtistSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const now = new Date().toISOString();

    if (data.id) {
      const { error } = await db
        .from("concert_artists")
        .update({
          artist_name: data.artist_name,
          performance_type: data.performance_type,
          description: data.description,
          image_url: data.image_url,
          display_order: data.display_order,
          is_active: data.is_active,
          updated_at: now,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db
        .from("concert_artists")
        .insert({
          concert_info_id: data.concert_info_id,
          artist_name: data.artist_name,
          performance_type: data.performance_type,
          description: data.description,
          image_url: data.image_url,
          display_order: data.display_order,
          is_active: data.is_active,
          created_at: now,
          updated_at: now,
        });
      if (error) throw new Error(error.message);
    }
    return { success: true };
  });

export const deleteConcertArtist = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error } = await db.from("concert_artists").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const reorderConcertArtist = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid(), display_order: z.number().int().min(0) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error } = await db
      .from("concert_artists")
      .update({ display_order: data.display_order, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const toggleConcertArtistStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error } = await db
      .from("concert_artists")
      .update({ is_active: data.is_active, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ─── Google Maps URL Resolver ────────────────────────────────

const GOOGLE_DOMAINS = ["maps.app.goo.gl", "goo.gl", "google.com", "www.google.com", "maps.google.com"];

export const resolveGoogleMapsUrl = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ url: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    let url = data.url.trim();

    // Extract src from iframe HTML
    const iframeMatch = url.match(/src=["']([^"']+)["']/i);
    if (iframeMatch) url = iframeMatch[1];

    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace(/^www\./, "");
      if (!GOOGLE_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d))) {
        return { resolved: false, error: "Only Google Maps URLs are supported." };
      }
    } catch {
      return { resolved: false, error: "Invalid URL format." };
    }

    // Follow redirect for short links
    let finalUrl = url;
    if (url.includes("goo.gl") || url.includes("maps.app.goo.gl")) {
      try {
        const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
        finalUrl = resp.url || url;
      } catch {
        // ignore redirect failure, use original url
      }
    }

    // Extract coordinates from @lat,lng pattern
    let lat: number | null = null;
    let lng: number | null = null;
    const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      lat = parseFloat(coordMatch[1]);
      lng = parseFloat(coordMatch[2]);
    }

    // Extract query param
    let query = "";
    try {
      const finalParsed = new URL(finalUrl);
      query = finalParsed.searchParams.get("q") || finalParsed.searchParams.get("query") || "";
    } catch {
      // ignore
    }

    const embedUrl = lat != null && lng != null
      ? `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`
      : query
        ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`
        : `https://www.google.com/maps?q=${encodeURIComponent(finalUrl)}&z=14&output=embed`;

    return {
      resolved: true,
      map_url: finalUrl,
      map_embed_url: embedUrl,
      latitude: lat,
      longitude: lng,
      query: query || null,
    };
  });
