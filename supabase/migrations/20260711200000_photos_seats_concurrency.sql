-- ============================================
-- PHOTOS, SEAT ALLOCATION & CONCURRENCY
-- Safe, non-destructive migration
-- ============================================

-- ============================================
-- 1. FIX EVENT DATA — populate missing fields
-- ============================================
UPDATE public.events
SET
  event_date = '2026-08-15',
  start_time = '14:00:00',
  end_time = '19:00:00',
  venue = CASE slug
    WHEN 'telent-fest-ahmedabad' THEN 'Ahmedabad Convention Centre'
    WHEN 'telent-fest-surat' THEN 'Surat Exhibition Hall'
    WHEN 'telent-fest-vadodara' THEN 'Vadodara Cultural Centre'
    WHEN 'telent-fest-rajkot' THEN 'Rajkot Town Hall'
  END
WHERE event_date IS NULL;

-- Add end_time column if not exists
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- ============================================
-- 2. PARTICIPANT PHOTO FIELDS
-- ============================================
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS photo_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photo_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS photo_size_bytes INTEGER;

-- ============================================
-- 3. EVENT SNAPSHOT ON REGISTRATIONS
-- ============================================
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS event_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS event_city_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS event_date_snapshot DATE,
  ADD COLUMN IF NOT EXISTS event_start_time_snapshot TIME,
  ADD COLUMN IF NOT EXISTS event_end_time_snapshot TIME,
  ADD COLUMN IF NOT EXISTS event_venue_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_photo_storage
  ON public.registrations(photo_storage_path)
  WHERE photo_storage_path IS NOT NULL;

-- ============================================
-- 4. EVENT SEAT SECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_seat_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_code TEXT NOT NULL,
  seat_type TEXT NOT NULL CHECK (seat_type IN ('participant', 'guest', 'visitor')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, section_code)
);

-- ============================================
-- 5. EVENT SEATS
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.event_seat_sections(id) ON DELETE CASCADE,
  row_label TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_label TEXT NOT NULL,
  seat_type TEXT NOT NULL CHECK (seat_type IN ('participant', 'guest', 'visitor')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'held', 'booked', 'blocked')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_accessible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, seat_label)
);

-- ============================================
-- 6. SEAT HOLDS (temporary holds during checkout)
-- ============================================
CREATE TABLE IF NOT EXISTS public.seat_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES public.event_seats(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  hold_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_seat_active
  ON public.seat_holds(seat_id, status)
  WHERE status = 'active';

-- ============================================
-- 7. SEAT BOOKINGS (confirmed allocations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.seat_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES public.event_seats(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  pass_id UUID REFERENCES public.passes(id) ON DELETE SET NULL,
  holder_type TEXT NOT NULL CHECK (holder_type IN ('participant', 'guest_1', 'guest_2', 'visitor')),
  holder_name TEXT NOT NULL,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, seat_id)
);

CREATE INDEX IF NOT EXISTS idx_seat_bookings_registration
  ON public.seat_bookings(registration_id);

CREATE INDEX IF NOT EXISTS idx_seat_bookings_event
  ON public.seat_bookings(event_id);

CREATE INDEX IF NOT EXISTS idx_seat_bookings_pass
  ON public.seat_bookings(pass_id)
  WHERE pass_id IS NOT NULL;

-- ============================================
-- 8. SEAT ALLOCATION AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.seat_allocation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  pass_id UUID REFERENCES public.passes(id) ON DELETE SET NULL,
  old_seat_id UUID REFERENCES public.event_seats(id) ON DELETE SET NULL,
  new_seat_id UUID REFERENCES public.event_seats(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('allocated', 'reassigned', 'released', 'blocked', 'unblocked')),
  changed_by TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seat_audit_event
  ON public.seat_allocation_audit(event_id);

CREATE INDEX IF NOT EXISTS idx_seat_audit_registration
  ON public.seat_allocation_audit(registration_id);

-- ============================================
-- 9. ADDITIONAL CONCURRENCY INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_registrations_status_created
  ON public.registrations(registration_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_passes_event
  ON public.passes(pass_number);

CREATE INDEX IF NOT EXISTS idx_registrations_event_status_type
  ON public.registrations(event_id, registration_status, registration_type);

-- ============================================
-- 10. ATOMIC SEAT ALLOCATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.allocate_registration_seats(
  p_registration_id UUID
)
RETURNS TABLE(
  seat_id UUID,
  seat_label TEXT,
  section_name TEXT,
  row_label TEXT,
  seat_number INTEGER,
  holder_type TEXT,
  holder_name TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_reg RECORD;
  v_event RECORD;
  v_needed_participant INTEGER := 0;
  v_needed_guest INTEGER := 0;
  v_needed_visitor INTEGER := 0;
  v_guest_rec RECORD;
  v_seat RECORD;
  v_holder_name TEXT;
  v_holder_type TEXT;
  v_pass_id UUID;
BEGIN
  -- Lock the registration row
  SELECT r.*, e.name AS event_name, e.city AS event_city
  INTO v_reg
  FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.id = p_registration_id
  FOR UPDATE OF r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found: %', p_registration_id;
  END IF;

  -- Must be confirmed/paid
  IF v_reg.payment_status != 'paid' OR v_reg.registration_status != 'confirmed' THEN
    RAISE EXCEPTION 'Registration is not confirmed and paid';
  END IF;

  -- Determine how many seats needed
  IF v_reg.registration_type = 'participant' THEN
    v_needed_participant := 1;
    SELECT COUNT(*) INTO v_needed_guest
    FROM public.guests
    WHERE registration_id = p_registration_id;
  ELSIF v_reg.registration_type = 'visitor' THEN
    v_needed_visitor := 1;
  ELSE
    RAISE EXCEPTION 'Unknown registration type: %', v_reg.registration_type;
  END IF;

  -- Allocate participant seat
  IF v_needed_participant > 0 THEN
    SELECT es.id, es.seat_label, ess.section_name, es.row_label, es.seat_number
    INTO v_seat
    FROM public.event_seats es
    JOIN public.event_seat_sections ess ON ess.id = es.section_id
    WHERE es.event_id = v_reg.event_id
      AND es.seat_type = 'participant'
      AND es.status = 'available'
    ORDER BY ess.display_order, es.display_order, es.seat_number
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No participant seat available for event';
    END IF;

    -- Find the participant pass
    SELECT id INTO v_pass_id
    FROM public.passes
    WHERE registration_id = p_registration_id AND pass_type = 'participant'
    LIMIT 1;

    -- Update seat status
    UPDATE public.event_seats SET status = 'booked', updated_at = now()
    WHERE id = v_seat.id;

    -- Create booking
    INSERT INTO public.seat_bookings (event_id, seat_id, registration_id, pass_id, holder_type, holder_name)
    VALUES (v_reg.event_id, v_seat.id, p_registration_id, v_pass_id, 'participant', v_reg.full_name)
    ON CONFLICT (event_id, seat_id) DO NOTHING;

    -- Audit
    INSERT INTO public.seat_allocation_audit (event_id, registration_id, pass_id, new_seat_id, action, changed_by)
    VALUES (v_reg.event_id, p_registration_id, v_pass_id, v_seat.id, 'allocated', 'system');

    seat_id := v_seat.id;
    seat_label := v_seat.seat_label;
    section_name := v_seat.section_name;
    row_label := v_seat.row_label;
    seat_number := v_seat.seat_number;
    holder_type := 'participant';
    holder_name := v_reg.full_name;
    RETURN NEXT;
  END IF;

  -- Allocate guest seats
  IF v_needed_guest > 0 THEN
    FOR v_guest_rec IN
      SELECT g.id, g.full_name, g.guest_number
      FROM public.guests g
      WHERE g.registration_id = p_registration_id
      ORDER BY g.guest_number
    LOOP
      SELECT es.id, es.seat_label, ess.section_name, es.row_label, es.seat_number
      INTO v_seat
      FROM public.event_seats es
      JOIN public.event_seat_sections ess ON ess.id = es.section_id
      WHERE es.event_id = v_reg.event_id
        AND es.seat_type = 'guest'
        AND es.status = 'available'
      ORDER BY ess.display_order, es.display_order, es.seat_number
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No guest seat available for event';
      END IF;

      -- Find the guest pass
      SELECT id INTO v_pass_id
      FROM public.passes
      WHERE registration_id = p_registration_id
        AND ((v_guest_rec.guest_number = 1 AND pass_type = 'guest_1')
          OR (v_guest_rec.guest_number = 2 AND pass_type = 'guest_2'))
      LIMIT 1;

      UPDATE public.event_seats SET status = 'booked', updated_at = now()
      WHERE id = v_seat.id;

      v_holder_type := CASE v_guest_rec.guest_number WHEN 1 THEN 'guest_1' WHEN 2 THEN 'guest_2' END;

      INSERT INTO public.seat_bookings (event_id, seat_id, registration_id, pass_id, holder_type, holder_name)
      VALUES (v_reg.event_id, v_seat.id, p_registration_id, v_pass_id, v_holder_type, v_guest_rec.full_name)
      ON CONFLICT (event_id, seat_id) DO NOTHING;

      INSERT INTO public.seat_allocation_audit (event_id, registration_id, pass_id, new_seat_id, action, changed_by)
      VALUES (v_reg.event_id, p_registration_id, v_pass_id, v_seat.id, 'allocated', 'system');

      seat_id := v_seat.id;
      seat_label := v_seat.seat_label;
      section_name := v_seat.section_name;
      row_label := v_seat.row_label;
      seat_number := v_seat.seat_number;
      holder_type := v_holder_type;
      holder_name := v_guest_rec.full_name;
      RETURN NEXT;
    END LOOP;
  END IF;

  -- Allocate visitor seat
  IF v_needed_visitor > 0 THEN
    SELECT es.id, es.seat_label, ess.section_name, es.row_label, es.seat_number
    INTO v_seat
    FROM public.event_seats es
    JOIN public.event_seat_sections ess ON ess.id = es.section_id
    WHERE es.event_id = v_reg.event_id
      AND es.seat_type = 'visitor'
      AND es.status = 'available'
    ORDER BY ess.display_order, es.display_order, es.seat_number
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No visitor seat available for event';
    END IF;

    SELECT id INTO v_pass_id
    FROM public.passes
    WHERE registration_id = p_registration_id AND pass_type = 'visitor'
    LIMIT 1;

    UPDATE public.event_seats SET status = 'booked', updated_at = now()
    WHERE id = v_seat.id;

    INSERT INTO public.seat_bookings (event_id, seat_id, registration_id, pass_id, holder_type, holder_name)
    VALUES (v_reg.event_id, v_seat.id, p_registration_id, v_pass_id, 'visitor', v_reg.full_name)
    ON CONFLICT (event_id, seat_id) DO NOTHING;

    INSERT INTO public.seat_allocation_audit (event_id, registration_id, pass_id, new_seat_id, action, changed_by)
    VALUES (v_reg.event_id, p_registration_id, v_pass_id, v_seat.id, 'allocated', 'system');

    seat_id := v_seat.id;
    seat_label := v_seat.seat_label;
    section_name := v_seat.section_name;
    row_label := v_seat.row_label;
    seat_number := v_seat.seat_number;
    holder_type := 'visitor';
    holder_name := v_reg.full_name;
    RETURN NEXT;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- ============================================
-- 11. SEED DEFAULT SEAT SECTIONS FOR EXISTING EVENTS
-- ============================================
DO $$
DECLARE
  v_event RECORD;
  v_section_id UUID;
  v_row_letter TEXT;
  v_seat_num INTEGER;
  v_max_rows INTEGER;
  v_seats_per_row INTEGER;
  v_capacity INTEGER;
  v_total INTEGER;
  v_display_order INTEGER;
BEGIN
  FOR v_event IN SELECT id, participant_capacity, guest_capacity, visitor_capacity FROM public.events LOOP
    -- Participant section
    INSERT INTO public.event_seat_sections (event_id, section_name, section_code, seat_type, display_order)
    VALUES (v_event.id, 'Participant Section', 'P', 'participant', 1)
    ON CONFLICT (event_id, section_code) DO NOTHING;

    -- Guest section
    INSERT INTO public.event_seat_sections (event_id, section_name, section_code, seat_type, display_order)
    VALUES (v_event.id, 'Guest Section', 'G', 'guest', 2)
    ON CONFLICT (event_id, section_code) DO NOTHING;

    -- Visitor section
    INSERT INTO public.event_seat_sections (event_id, section_name, section_code, seat_type, display_order)
    VALUES (v_event.id, 'Visitor Section', 'V', 'visitor', 3)
    ON CONFLICT (event_id, section_code) DO NOTHING;
  END LOOP;

  -- Generate seats for participant section
  FOR v_event IN SELECT id, participant_capacity FROM public.events LOOP
    SELECT id INTO v_section_id FROM public.event_seat_sections
    WHERE event_id = v_event.id AND section_code = 'P';

    IF v_section_id IS NOT NULL THEN
      v_max_rows := CEIL(COALESCE(v_event.participant_capacity, 500) / 50.0);
      v_seats_per_row := 50;
      v_display_order := 0;

      FOR r IN 1..v_max_rows LOOP
        v_row_letter := chr(64 + r);
        FOR s IN 1..v_seats_per_row LOOP
          v_seat_num := s;
          INSERT INTO public.event_seats (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
          VALUES (v_event.id, v_section_id, v_row_letter, v_seat_num,
                  'P-' || v_row_letter || '-' || lpad(v_seat_num::text, 3, '0'),
                  'participant', v_display_order)
          ON CONFLICT (event_id, seat_label) DO NOTHING;
          v_display_order := v_display_order + 1;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;

  -- Generate seats for guest section
  FOR v_event IN SELECT id, guest_capacity FROM public.events LOOP
    SELECT id INTO v_section_id FROM public.event_seat_sections
    WHERE event_id = v_event.id AND section_code = 'G';

    IF v_section_id IS NOT NULL THEN
      v_max_rows := CEIL(COALESCE(v_event.guest_capacity, 200) / 50.0);
      v_seats_per_row := 50;
      v_display_order := 0;

      FOR r IN 1..v_max_rows LOOP
        v_row_letter := chr(64 + r);
        FOR s IN 1..v_seats_per_row LOOP
          v_seat_num := s;
          INSERT INTO public.event_seats (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
          VALUES (v_event.id, v_section_id, v_row_letter, v_seat_num,
                  'G-' || v_row_letter || '-' || lpad(v_seat_num::text, 3, '0'),
                  'guest', v_display_order)
          ON CONFLICT (event_id, seat_label) DO NOTHING;
          v_display_order := v_display_order + 1;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;

  -- Generate seats for visitor section
  FOR v_event IN SELECT id, visitor_capacity FROM public.events LOOP
    SELECT id INTO v_section_id FROM public.event_seat_sections
    WHERE event_id = v_event.id AND section_code = 'V';

    IF v_section_id IS NOT NULL THEN
      v_max_rows := CEIL(COALESCE(v_event.visitor_capacity, 200) / 50.0);
      v_seats_per_row := 50;
      v_display_order := 0;

      FOR r IN 1..v_max_rows LOOP
        v_row_letter := chr(64 + r);
        FOR s IN 1..v_seats_per_row LOOP
          v_seat_num := s;
          INSERT INTO public.event_seats (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
          VALUES (v_event.id, v_section_id, v_row_letter, v_seat_num,
                  'V-' || v_row_letter || '-' || lpad(v_seat_num::text, 3, '0'),
                  'visitor', v_display_order)
          ON CONFLICT (event_id, seat_label) DO NOTHING;
          v_display_order := v_display_order + 1;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 12. RLS POLICIES FOR NEW TABLES
-- ============================================
ALTER TABLE public.event_seat_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_allocation_audit ENABLE ROW LEVEL SECURITY;

-- Public can read seat sections and seats (only availability info)
CREATE POLICY "Public can read seat sections" ON public.event_seat_sections
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can read seats" ON public.event_seats
  FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role full access seat_sections" ON public.event_seat_sections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access seats" ON public.event_seats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access seat_holds" ON public.seat_holds
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access seat_bookings" ON public.seat_bookings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access seat_audit" ON public.seat_allocation_audit
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admins read seat_sections" ON public.event_seat_sections
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins insert seat_sections" ON public.event_seat_sections
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins update seat_sections" ON public.event_seat_sections
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete seat_sections" ON public.event_seat_sections
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Admins read seats" ON public.event_seats
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins insert seats" ON public.event_seats
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins update seats" ON public.event_seats
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete seats" ON public.event_seats
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Admins read seat_holds" ON public.seat_holds
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins read seat_bookings" ON public.seat_bookings
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins insert seat_bookings" ON public.seat_bookings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins read seat_audit" ON public.seat_allocation_audit
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins insert seat_audit" ON public.seat_allocation_audit
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ============================================
-- 13. CREATE STORAGE BUCKET FOR PARTICIPANT PHOTOS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'participant-photos',
  'participant-photos',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 14. GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_registration_seats(UUID) TO service_role;
