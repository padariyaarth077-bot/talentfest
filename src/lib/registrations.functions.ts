import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const phoneSchema = z.string().regex(/^\+91\d{10}$/, "Phone must be +91 followed by 10 digits");
const emailSchema = z.string().email("Invalid email").transform((s) => s.trim().toLowerCase());
const aadhaarSchema = z.string().regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits");

const participantSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  middleName: z.string().trim().max(50).optional().default(""),
  lastName: z.string().trim().min(1).max(50),
  phone: phoneSchema,
  email: emailSchema,
  aadhaar: aadhaarSchema,
  aadhaarConsent: z.literal(true, { errorMap: () => ({ message: "Aadhaar consent is required" }) }),
  eventId: z.string().uuid(),
  activityCategoryId: z.string().uuid(),
  guest1Name: z.string().trim().max(100).optional().default(""),
  guest1Phone: z.string().optional().default(""),
  guest2Name: z.string().trim().max(100).optional().default(""),
  guest2Phone: z.string().optional().default(""),
});

const visitorSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  email: emailSchema,
  aadhaar: aadhaarSchema,
  aadhaarConsent: z.literal(true, { errorMap: () => ({ message: "Aadhaar consent is required" }) }),
  eventId: z.string().uuid(),
});

type SupabaseAdminClient = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

function isRegistrationWindowOpen(event: any) {
  const now = Date.now();
  const opensAt = event.registration_opens_at ? new Date(event.registration_opens_at).getTime() : null;
  const closesAt = event.registration_closes_at ? new Date(event.registration_closes_at).getTime() : null;
  return (!opensAt || opensAt <= now) && (!closesAt || closesAt >= now);
}

async function countReservedSeats(supabaseAdmin: SupabaseAdminClient, eventId: string) {
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id, registration_type, registration_status")
    .eq("event_id", eventId)
    .in("registration_status", ["pending", "confirmed"]);

  const registrations = regs ?? [];
  const participantIds = registrations
    .filter((reg: any) => reg.registration_type === "participant")
    .map((reg: any) => reg.id);

  let guestCount = 0;
  if (participantIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("guests")
      .select("id", { count: "exact", head: true })
      .in("registration_id", participantIds);
    guestCount = count ?? 0;
  }

  return {
    participants: registrations.filter((reg: any) => reg.registration_type === "participant").length,
    visitors: registrations.filter((reg: any) => reg.registration_type === "visitor").length,
    guests: guestCount,
  };
}

function assertHumanName(value: string, label = "Name") {
  if (!/[A-Za-z\u0900-\u097F]/.test(value)) {
    throw new Error(`${label} must contain letters`);
  }
  if (/\d/.test(value)) {
    throw new Error(`${label} cannot contain numbers`);
  }
}

export const fetchEvents = createServerFn({ method: "GET" })
  .handler(async () => {
    // Try Supabase JS client first (wrapped in try/catch for init failures)
    let events: any[] | null = null;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const colSets = [
        "id, name, slug, city, city_code, event_image_url, event_date, start_time, venue, participant_price, visitor_price, guest_price, participant_capacity, visitor_capacity, guest_capacity, maximum_guests_per_participant, registration_status, visitor_registration_enabled, registration_opens_at, registration_closes_at",
        "id, name, slug, city, city_code, event_image_url, event_date, start_time, venue, participant_price, visitor_price, guest_price, participant_capacity, visitor_capacity, guest_capacity, maximum_guests_per_participant, registration_status, registration_opens_at, registration_closes_at",
        "id, name, slug, city, city_code, event_date, venue, participant_price, participant_capacity, registration_status, is_active",
        "id, name, slug, city, city_code, event_date",
      ];

      for (const cols of colSets) {
        const { data, error } = await supabaseAdmin.from("events").select(cols).order("name").limit(100);
        if (!error && data) return data;
      }
    } catch (err) {
      console.error("fetchEvents: Supabase JS client failed —", err instanceof Error ? err.message : err);
    }

    // Fallback: raw REST API (bypasses Supabase JS client entirely)
    console.error("fetchEvents: trying raw REST API fallback");
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (supabaseUrl && serviceKey) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/events?select=id,name,slug,city,city_code,event_date&limit=100`, {
          headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
        });
        if (res.ok) {
          const raw = await res.json();
          if (Array.isArray(raw) && raw.length > 0) {
            console.error("fetchEvents: raw REST API succeeded, returning", raw.length, "events");
            return raw;
          }
          console.error("fetchEvents: raw REST API returned empty array");
          return [];
        }
        const text = await res.text();
        console.error("fetchEvents: raw REST API returned", res.status, text);
      } catch (rawErr) {
        console.error("fetchEvents: raw REST API failed —", rawErr instanceof Error ? rawErr.message : rawErr);
      }
    }

    console.error("fetchEvents: ALL methods failed");
    return [];
  });

export const fetchVisitorEvent = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // First try: query with visitor_registration_enabled column
    const { data, error } = await supabaseAdmin
      .from("events")
      .select("id, name, slug, city, city_code, event_image_url, event_date, start_time, venue, participant_price, visitor_price, guest_price, participant_capacity, visitor_capacity, guest_capacity, maximum_guests_per_participant, registration_status, visitor_registration_enabled, registration_opens_at, registration_closes_at, is_active")
      .eq("is_active", true)
      .eq("registration_status", "active")
      .order("name");

    if (!error && data && data.length > 0) {
      for (const event of data as any[]) {
        if (event.visitor_registration_enabled === false || !isRegistrationWindowOpen(event)) continue;
        const reserved = await countReservedSeats(supabaseAdmin, event.id);
        const remaining = Number(event.visitor_capacity) - reserved.visitors;
        if (remaining > 0) return { ...event, available_visitor_seats: remaining };
      }
    }

    // Fallback: column might not exist — try without visitor_registration_enabled filter
    // but still get any active event with visitor capacity
    const { data: fallback } = await supabaseAdmin
      .from("events")
      .select("id, name, slug, city, city_code, event_image_url, event_date, start_time, venue, participant_price, visitor_price, guest_price, participant_capacity, visitor_capacity, guest_capacity, maximum_guests_per_participant, registration_status, registration_opens_at, registration_closes_at, is_active")
      .eq("is_active", true)
      .eq("registration_status", "active")
      .order("name");

    if (fallback && fallback.length > 0) {
      for (const event of fallback as any[]) {
        if (!isRegistrationWindowOpen(event)) continue;
        const reserved = await countReservedSeats(supabaseAdmin, event.id);
        const remaining = Number(event.visitor_capacity) - reserved.visitors;
        if (remaining > 0) return { ...event, visitor_registration_enabled: null, available_visitor_seats: remaining };
      }
    }

    return null;
    } catch {
      return null;
    }
  });

export const fetchActivityCategories = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ eventId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin
      .from("event_activity_categories")
      .select("id, activity_category_id, capacity, registration_status, activity_categories!inner(id, name, slug)")
      .eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return (result ?? []).map((r: any) => ({
      id: r.activity_category_id,
      name: r.activity_categories?.name ?? "Unknown",
      slug: r.activity_categories?.slug ?? "unknown",
      capacity: r.capacity,
      registration_status: r.registration_status,
    }));
  });

export const checkSeatAvailability = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ eventId: z.string().uuid(), type: z.enum(["participant", "visitor", "guest"]) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select("participant_capacity, visitor_capacity, guest_capacity, registration_status")
      .eq("id", data.eventId)
      .single();
    if (error || !event) return { available: false, remaining: 0 };

    let capacityField: string;
    if (data.type === "participant") capacityField = "participant_capacity";
    else if (data.type === "visitor") capacityField = "visitor_capacity";
    else capacityField = "guest_capacity";

    const capacity = Number((event as any)[capacityField]) || 0;
    const status = (event as any).registration_status;
    return { available: capacity > 0 && status === "active", remaining: capacity };
  });

export const createPendingRegistration = createServerFn({ method: "POST" })
  .validator((data: unknown) => participantSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    assertHumanName(data.firstName, "First name");
    if (data.middleName) assertHumanName(data.middleName, "Middle name");
    assertHumanName(data.lastName, "Last name");
    if (data.guest1Name) assertHumanName(data.guest1Name, "Guest 1 name");
    if (data.guest2Name) assertHumanName(data.guest2Name, "Guest 2 name");

    const eventCheck = await supabaseAdmin
      .from("events")
      .select("participant_capacity, guest_capacity, registration_status, registration_opens_at, registration_closes_at, maximum_guests_per_participant")
      .eq("id", data.eventId)
      .single();
    if (eventCheck.error || !eventCheck.data) throw new Error("Event not found");
    const ev = eventCheck.data as any;
    if (ev.registration_status !== "active" || !isRegistrationWindowOpen(ev)) throw new Error("Event registration is not active");

    const reserved = await countReservedSeats(supabaseAdmin, data.eventId);
    const requestedGuests = [data.guest1Name, data.guest2Name].filter(Boolean).length;
    if (Number(ev.participant_capacity) - reserved.participants <= 0) throw new Error("No participant seats available");
    if (requestedGuests > Number(ev.maximum_guests_per_participant)) throw new Error("Too many guests selected for this event");
    if (requestedGuests > 0 && Number(ev.guest_capacity) - reserved.guests < requestedGuests) throw new Error("No guest seats available");

    const { data: categoryLink } = await supabaseAdmin
      .from("event_activity_categories")
      .select("id, registration_status, capacity")
      .eq("event_id", data.eventId)
      .eq("activity_category_id", data.activityCategoryId)
      .maybeSingle();
    if (!categoryLink || (categoryLink as any).registration_status !== "active") throw new Error("Selected activity category is unavailable");

    const fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ");

    const { data: reg, error: regError } = await supabaseAdmin
      .from("registrations")
      .insert({
        registration_type: "participant",
        event_id: data.eventId,
        first_name: data.firstName,
        middle_name: data.middleName,
        last_name: data.lastName,
        full_name: fullName,
        phone: data.phone,
        email: data.email,
        aadhaar_last_four: data.aadhaar.slice(-4),
        aadhaar_consent: true,
        activity_category_id: data.activityCategoryId,
        payment_status: "pending",
        registration_status: "pending",
      })
      .select("id, registration_number, full_name, phone, email, created_at")
      .single();
    if (regError) throw new Error(regError.message);

    let guest1Id: string | null = null;
    let guest2Id: string | null = null;

    if (data.guest1Name) {
      const { data: g1 } = await supabaseAdmin
        .from("guests")
        .insert({ registration_id: reg.id, guest_number: 1, full_name: data.guest1Name, phone: data.guest1Phone || data.phone })
        .select("id")
        .single();
      if (g1) guest1Id = g1.id;
    }

    if (data.guest2Name && guest1Id) {
      const { data: g2 } = await supabaseAdmin
        .from("guests")
        .insert({ registration_id: reg.id, guest_number: 2, full_name: data.guest2Name, phone: data.guest2Phone || data.phone })
        .select("id")
        .single();
      if (g2) guest2Id = g2.id;
    }

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("participant_price, guest_price, name, city, event_date, start_time, venue, city_code")
      .eq("id", data.eventId)
      .single();

    return {
      success: true,
      registration: {
        id: reg.id,
        registrationNumber: reg.registration_number,
        fullName: reg.full_name,
        phone: reg.phone,
        email: reg.email,
        aadhaarLastFour: data.aadhaar.slice(-4),
        eventName: (event as any)?.name ?? "",
        eventCity: (event as any)?.city ?? "",
        eventCityCode: (event as any)?.city_code ?? "",
        eventDate: (event as any)?.event_date ?? "",
        startTime: (event as any)?.start_time ?? "",
        venue: (event as any)?.venue ?? "",
        participantPrice: Number((event as any)?.participant_price) || 0,
        guestPrice: Number((event as any)?.guest_price) || 0,
        activityCategoryId: data.activityCategoryId,
        hasGuest1: !!data.guest1Name,
        hasGuest2: !!data.guest2Name,
        guest1Name: data.guest1Name || null,
        guest2Name: data.guest2Name || null,
        guest1Id,
        guest2Id,
        createdAt: reg.created_at,
      },
    };
  });

export const createVisitorPendingRegistration = createServerFn({ method: "POST" })
  .validator((data: unknown) => visitorSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    assertHumanName(data.fullName, "Full name");

    const eventCheck = await supabaseAdmin
      .from("events")
      .select("visitor_capacity, registration_status, visitor_registration_enabled, registration_opens_at, registration_closes_at")
      .eq("id", data.eventId)
      .single();
    if (eventCheck.error || !eventCheck.data) throw new Error("Event not found for visitor registration");
    const ev = eventCheck.data as any;
    if (ev.registration_status !== "active" || !isRegistrationWindowOpen(ev)) throw new Error("Event registration is not active");
    if (ev.visitor_registration_enabled === false) throw new Error("Visitor registration is not enabled for this event");
    const reserved = await countReservedSeats(supabaseAdmin, data.eventId);
    if (Number(ev.visitor_capacity) - reserved.visitors <= 0) throw new Error("No visitor seats available");

    const { data: reg, error: regError } = await supabaseAdmin
      .from("registrations")
      .insert({
        registration_type: "visitor",
        event_id: data.eventId,
        first_name: data.fullName,
        last_name: "",
        full_name: data.fullName,
        phone: data.phone,
        email: data.email,
        aadhaar_last_four: data.aadhaar.slice(-4),
        aadhaar_consent: true,
        payment_status: "pending",
        registration_status: "pending",
      })
      .select("id, registration_number, full_name, phone, email, created_at")
      .single();
    if (regError) throw new Error(regError.message);

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("visitor_price, name, city, event_date, start_time, venue, city_code")
      .eq("id", data.eventId)
      .single();

    return {
      success: true,
      registration: {
        id: reg.id,
        registrationNumber: reg.registration_number,
        fullName: reg.full_name,
        phone: reg.phone,
        email: reg.email,
        aadhaarLastFour: data.aadhaar.slice(-4),
        eventName: (event as any)?.name ?? "",
        eventCity: (event as any)?.city ?? "",
        eventCityCode: (event as any)?.city_code ?? "",
        eventDate: (event as any)?.event_date ?? "",
        startTime: (event as any)?.start_time ?? "",
        venue: (event as any)?.venue ?? "",
        visitorPrice: Number((event as any)?.visitor_price) || 0,
        createdAt: reg.created_at,
      },
    };
  });

export const createPaymentOrder = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    registrationId: z.string().uuid(),
    amount: z.number().positive(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: reg, error: regErr } = await supabaseAdmin
      .from("registrations")
      .select("id, payment_status")
      .eq("id", data.registrationId)
      .single();
    if (regErr || !reg) throw new Error("Registration not found");
    if ((reg as any).payment_status === "paid") throw new Error("Registration is already paid");

    const { data: payment, error: payError } = await supabaseAdmin
      .from("payments")
      .insert({
        registration_id: data.registrationId,
        amount: data.amount,
        status: "pending",
      })
      .select("id, amount, currency")
      .single();
    if (payError) throw new Error(payError.message);

    const orderId = `order_TF_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await supabaseAdmin
      .from("payments")
      .update({ order_id: orderId })
      .eq("id", (payment as any).id);

    return {
      success: true,
      order: {
        id: (payment as any).id,
        orderId,
        amount: Number((payment as any).amount),
        currency: (payment as any).currency,
      },
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    registrationId: z.string().uuid(),
    paymentId: z.string().uuid(),
    transactionId: z.string(),
    orderId: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment, error: payErr } = await supabaseAdmin
      .from("payments")
      .select("id, status, amount")
      .eq("id", data.paymentId)
      .eq("registration_id", data.registrationId)
      .single();
    if (payErr || !payment) throw new Error("Payment record not found");
    if ((payment as any).status === "paid") throw new Error("Payment already verified");

    await supabaseAdmin
      .from("payments")
      .update({
        transaction_id: data.transactionId,
        status: "paid",
        verified_at: new Date().toISOString(),
      })
      .eq("id", data.paymentId);

    await supabaseAdmin
      .from("registrations")
      .update({ payment_status: "paid", registration_status: "confirmed" })
      .eq("id", data.registrationId);

    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, registration_number, full_name, event_id, activity_category_id, registration_type")
      .eq("id", data.registrationId)
      .single();

    const regData = reg as any;
    const { count: existingPassCount } = await supabaseAdmin
      .from("passes")
      .select("id", { count: "exact", head: true })
      .eq("registration_id", data.registrationId);

    if (!existingPassCount) {
      if (regData.registration_type === "participant") {
        await supabaseAdmin
          .from("passes")
          .insert({ registration_id: data.registrationId, pass_type: "participant" });

        const { data: guests } = await supabaseAdmin
          .from("guests")
          .select("id, guest_number")
          .eq("registration_id", data.registrationId)
          .order("guest_number");

        for (const g of (guests ?? [])) {
          const type = (g as any).guest_number === 1 ? "guest_1" : "guest_2";
          await supabaseAdmin
            .from("passes")
            .insert({ registration_id: data.registrationId, guest_id: (g as any).id, pass_type: type });
        }
      } else {
        await supabaseAdmin
          .from("passes")
          .insert({ registration_id: data.registrationId, pass_type: "visitor" });
      }
    }

    const { data: passes } = await supabaseAdmin
      .from("passes")
      .select("id, pass_number, pass_type, secure_qr_token, status, guest_id")
      .eq("registration_id", data.registrationId);

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("name, city, city_code, event_date, start_time, venue, event_image_url")
      .eq("id", (reg as any).event_id)
      .single();

    let activityName = "";
    if (regData.activity_category_id) {
      const { data: cat } = await supabaseAdmin
        .from("activity_categories")
        .select("name")
        .eq("id", regData.activity_category_id)
        .single();
      if (cat) activityName = (cat as any).name;
    }

    return {
      success: true,
      registration: {
        id: regData.id,
        registrationNumber: regData.registration_number,
        fullName: regData.full_name,
        type: regData.registration_type,
        eventName: (event as any)?.name ?? "",
        eventCity: (event as any)?.city ?? "",
        eventImageUrl: (event as any)?.event_image_url ?? "",
        eventDate: (event as any)?.event_date ?? "",
        startTime: (event as any)?.start_time ?? "",
        venue: (event as any)?.venue ?? "",
        activityCategory: activityName,
      },
      passes: (passes ?? []).map((p: any) => ({
        id: p.id,
        passNumber: p.pass_number,
        passType: p.pass_type,
        secureQrToken: p.secure_qr_token,
        status: p.status,
        guestId: p.guest_id,
      })),
      transactionId: data.transactionId,
      amount: Number((payment as any).amount),
    };
  });

export const fetchRegistration = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("id, registration_number, full_name, phone, email, aadhaar_last_four, event_id, activity_category_id, payment_status, registration_status, registration_type, created_at")
      .eq("id", data.id)
      .single();
    if (!reg) throw new Error("Registration not found");
    const r = reg as any;

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("name, city, city_code, event_date, start_time, venue, event_image_url, participant_price, visitor_price, guest_price")
      .eq("id", r.event_id)
      .single();

    const { data: guests } = await supabaseAdmin
      .from("guests")
      .select("id, guest_number, full_name, phone")
      .eq("registration_id", data.id)
      .order("guest_number");

    const { data: passes } = await supabaseAdmin
      .from("passes")
      .select("id, pass_number, pass_type, secure_qr_token, status, checked_in, checked_in_at, guest_id, generated_at")
      .eq("registration_id", data.id);

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("id, order_id, transaction_id, amount, currency, status, verified_at")
      .eq("registration_id", data.id)
      .order("created_at", { ascending: false })
      .limit(1);

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
      id: r.id,
      registrationNumber: r.registration_number,
      fullName: r.full_name,
      phone: r.phone,
      email: r.email,
      aadhaarLastFour: r.aadhaar_last_four,
      type: r.registration_type,
      paymentStatus: r.payment_status,
      registrationStatus: r.registration_status,
      eventName: (event as any)?.name ?? "",
      eventCity: (event as any)?.city ?? "",
      eventCityCode: (event as any)?.city_code ?? "",
      eventDate: (event as any)?.event_date ?? "",
      startTime: (event as any)?.start_time ?? "",
      venue: (event as any)?.venue ?? "",
      eventImageUrl: (event as any)?.event_image_url ?? "",
      activityCategory: activityName,
      participantPrice: Number((event as any)?.participant_price) || 0,
      visitorPrice: Number((event as any)?.visitor_price) || 0,
      guestPrice: Number((event as any)?.guest_price) || 0,
      guests: (guests ?? []).map((g: any) => ({ id: g.id, guestNumber: g.guest_number, fullName: g.full_name, phone: g.phone })),
      passes: (passes ?? []).map((p: any) => ({
        id: p.id,
        passNumber: p.pass_number,
        passType: p.pass_type,
        secureQrToken: p.secure_qr_token,
        status: p.status,
        checkedIn: p.checked_in,
        checkedInAt: p.checked_in_at,
        guestId: p.guest_id,
        generatedAt: p.generated_at,
      })),
      payments: (payments ?? []).map((p: any) => ({
        id: p.id,
        orderId: p.order_id,
        transactionId: p.transaction_id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        verifiedAt: p.verified_at,
      })),
      createdAt: r.created_at,
    };
  });

export const verifyPassByToken = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ token: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pass, error } = await supabaseAdmin
      .from("passes")
      .select("id, pass_number, pass_type, status, checked_in, checked_in_at, registration_id")
      .eq("secure_qr_token", data.token)
      .maybeSingle();
    if (error || !pass) return { valid: false };

    const p = pass as any;
    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("full_name, event_id, activity_category_id, registration_type")
      .eq("id", p.registration_id)
      .single();

    if (!reg) return { valid: false };

    const r = reg as any;
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("name, city")
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
      valid: true,
      pass: {
        id: p.id,
        passNumber: p.pass_number,
        passType: p.pass_type,
        status: p.status,
        checkedIn: p.checked_in,
        checkedInAt: p.checked_in_at,
        participantName: r.full_name,
        eventName: (event as any)?.name ?? "",
        eventCity: (event as any)?.city ?? "",
        activityCategory: activityName,
        registrationType: r.registration_type,
      },
    };
  });
