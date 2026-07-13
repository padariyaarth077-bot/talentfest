-- TALENT FEST: Participant Photo, Seat Allocation, Concurrency Protection
-- Non-destructive: uses IF NOT EXISTS / IF NOT EXISTS / SAFE patterns

-- ============================================
-- 1. FIX SEEDED EVENT DATA (dates, times, venues)
-- ============================================
UPDATE public.events SET
  event_date = '2026-08-15',
  start_time = '10:00:00',
  end_time = '18:00:00',
  venue = 'Ahmedabad Convention Center, Science City Rd, Ahmedabad'
WHERE slug = 'telent-fest-ahmedabad' AND event_date IS NULL;

UPDATE public.events SET
  event_date = '2026-08-22',
  start_time = '10:00:00',
  end_time = '18:00:00',
  venue = 'Surat International Exhibition & Convention Centre, Sarsana'
WHERE slug = 'telent-fest-surat' AND event_date IS NULL;

UPDATE public.events SET
  event_date = '2026-09-05',
  start_time = '10:00:00',
  end_time = '18:00:00',
  venue = 'Vadodara Central Mall, Race Course Rd, Vadodara'
WHERE slug = 'telent-fest-vadodara' AND event_date IS NULL;

UPDATE public.events SET
  event_date = '2026-09-12',
  start_time = '10:00:00',
  end_time = '18:00:00',
  venue = 'Rajkot International Convention Center, Kalawad Rd, Rajkot'
WHERE slug = 'telent-fest-rajkot' AND event_date IS NULL;

-- Add end_time column if missing
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add event_image_url to events if missing
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_image_url TEXT;

-- ============================================
-- 2. PARTICIPANT PHOTO COLUMNS
-- ============================================
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS photo_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photo_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS photo_size_bytes INTEGER;

CREATE INDEX IF NOT EXISTS idx_registrations_photo_path
  ON public.registrations(photo_storage_path)
  WHERE photo_storage_path IS NOT NULL;

-- ============================================
-- 3. REGISTRATION EVENT SNAPSHOT COLUMNS
-- ============================================
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS event_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS event_city_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS event_date_snapshot DATE,
  ADD COLUMN IF NOT EXISTS event_start_time_snapshot TIME,
  ADD COLUMN IF NOT EXISTS event_end_time_snapshot TIME,
  ADD COLUMN IF NOT EXISTS event_venue_snapshot TEXT;

-- ============================================
-- 4. IDEMPOTENCY KEY FOR PAYMENTS
-- ============================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
  ON public.payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================
-- 5. SEAT SECTION TABLE
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
-- 6. INDIVIDUAL SEATS TABLE
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
  UNIQUE(event_id, section_id, seat_label)
);

CREATE INDEX IF NOT EXISTS idx_event_seats_event_id ON public.event_seats(event_id);
CREATE INDEX IF NOT EXISTS idx_event_seats_section_id ON public.event_seats(section_id);
CREATE INDEX IF NOT EXISTS idx_event_seats_status ON public.event_seats(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_seats_type_status ON public.event_seats(event_id, seat_type, status);
CREATE INDEX IF NOT EXISTS idx_event_seats_display ON public.event_seats(event_id, section_id, display_order);

-- ============================================
-- 7. SEAT HOLDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.seat_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES public.event_seats(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  hold_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seat_id, status)
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_event ON public.seat_holds(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_registration ON public.seat_holds(registration_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires ON public.seat_holds(expires_at) WHERE status = 'active';

-- ============================================
-- 8. SEAT BOOKINGS TABLE
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

CREATE INDEX IF NOT EXISTS idx_seat_bookings_event ON public.seat_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_registration ON public.seat_bookings(registration_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_pass ON public.seat_bookings(pass_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_holder ON public.seat_bookings(event_id, holder_type);

-- ============================================
-- 9. SEAT ALLOCATION AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.seat_allocation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  pass_id UUID REFERENCES public.passes(id) ON DELETE SET NULL,
  old_seat_id UUID REFERENCES public.event_seats(id) ON DELETE SET NULL,
  new_seat_id UUID REFERENCES public.event_seats(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('allocated', 'reassigned', 'released', 'blocked', 'unblocked', 'failed')),
  changed_by TEXT NOT NULL DEFAULT 'system',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seat_audit_event ON public.seat_allocation_audit(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_audit_registration ON public.seat_allocation_audit(registration_id);

-- ============================================
-- 10. ADD SEAT FIELDS TO PASSES
-- ============================================
ALTER TABLE public.passes
  ADD COLUMN IF NOT EXISTS seat_section_name TEXT,
  ADD COLUMN IF NOT EXISTS seat_row_label TEXT,
  ADD COLUMN IF NOT EXISTS seat_number INTEGER,
  ADD COLUMN IF NOT EXISTS seat_label TEXT;

-- ============================================
-- 11. ADD EVENT SNAPSHOT FIELDS TO PASSES
-- ============================================
ALTER TABLE public.passes
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS event_date_snapshot DATE,
  ADD COLUMN IF NOT EXISTS event_time_snapshot TIME,
  ADD COLUMN IF NOT EXISTS event_venue_snapshot TEXT;

-- ============================================
-- 12. REGISTRATION SEAT ALLOCATION STATUS
-- ============================================
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS seat_allocation_status TEXT NOT NULL DEFAULT 'none'
    CHECK (seat_allocation_status IN ('none', 'pending', 'allocated', 'capacity_exceeded'));

-- ============================================
-- 13. RATE LIMITING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL,
  identifier TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(action_key, identifier, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(action_key, identifier, window_start);

-- ============================================
-- 14. ATOMIC SEAT ALLOCATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.allocate_registration_seats(
  p_registration_id UUID,
  p_admin_user_id TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg RECORD;
  v_event RECORD;
  v_seat RECORD;
  v_guests RECORD[];
  v_guest_index INTEGER;
  v_participant_pass_id UUID;
  v_guest1_pass_id UUID;
  v_guest2_pass_id UUID;
  v_guest_pass_id UUID;
  v_result JSONB := '[]'::JSONB;
  v_seats_needed INTEGER := 0;
  v_seats_allocated INTEGER := 0;
  v_seat_type TEXT;
  v_section RECORD;
BEGIN
  -- Lock registration with payment verification
  SELECT r.*, e.participant_capacity, e.guest_capacity, e.visitor_capacity
  INTO v_reg
  FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.id = p_registration_id
  FOR UPDATE OF r;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;

  IF v_reg.payment_status != 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not confirmed');
  END IF;

  IF v_reg.seat_allocation_status = 'allocated' THEN
    -- Idempotent: return existing allocation
    SELECT jsonb_agg(
      jsonb_build_object(
        'seat_id', sb.seat_id,
        'seat_label', es.seat_label,
        'row_label', es.row_label,
        'seat_number', es.seat_number,
        'section_name', ess.section_name,
        'holder_type', sb.holder_type,
        'holder_name', sb.holder_name
      )
    ) INTO v_result
    FROM public.seat_bookings sb
    JOIN public.event_seats es ON es.id = sb.seat_id
    JOIN public.event_seat_sections ess ON ess.id = es.section_id
    WHERE sb.registration_id = p_registration_id;

    RETURN jsonb_build_object('success', true, 'allocated', true, 'seats', COALESCE(v_result, '[]'::JSONB));
  END IF;

  -- Determine seats needed
  IF v_reg.registration_type = 'participant' THEN
    v_seats_needed := 1;
    -- Count guests
    SELECT COUNT(*) INTO v_seats_needed
    FROM public.guests
    WHERE registration_id = p_registration_id;
    v_seats_needed := v_seats_needed + 1;
  ELSE
    v_seats_needed := 1;
  END IF;

  -- Get participant pass
  SELECT id INTO v_participant_pass_id
  FROM public.passes
  WHERE registration_id = p_registration_id AND pass_type = 'participant'
  LIMIT 1;

  SELECT id INTO v_guest1_pass_id
  FROM public.passes
  WHERE registration_id = p_registration_id AND pass_type = 'guest_1'
  LIMIT 1;

  SELECT id INTO v_guest2_pass_id
  FROM public.passes
  WHERE registration_id = p_registration_id AND pass_type = 'guest_2'
  LIMIT 1;

  -- Allocate participant seat
  IF v_reg.registration_type = 'participant' THEN
    v_seat_type := 'participant';

    SELECT es.* INTO v_seat
    FROM public.event_seats es
    JOIN public.event_seat_sections ess ON ess.id = es.section_id
    WHERE es.event_id = v_reg.event_id
      AND es.seat_type = v_seat_type
      AND es.status = 'available'
    ORDER BY ess.display_order ASC, es.display_order ASC, es.seat_number ASC
    LIMIT 1
    FOR UPDATE OF es SKIP LOCKED;

    IF NOT FOUND THEN
      -- Try any participant seat without section ordering
      SELECT es.* INTO v_seat
      FROM public.event_seats es
      WHERE es.event_id = v_reg.event_id
        AND es.seat_type = v_seat_type
        AND es.status = 'available'
      ORDER BY es.display_order ASC, es.seat_number ASC
      LIMIT 1
      FOR UPDATE OF es SKIP LOCKED;
    END IF;

    IF v_seat.id IS NULL THEN
      UPDATE public.registrations SET seat_allocation_status = 'capacity_exceeded', updated_at = now()
      WHERE id = p_registration_id;
      INSERT INTO public.seat_allocation_audit (event_id, registration_id, action, changed_by, reason)
      VALUES (v_reg.event_id, p_registration_id, 'failed', p_admin_user_id, 'No participant seat available');
      RETURN jsonb_build_object('success', false, 'error', 'No participant seat available');
    END IF;

    -- Book participant seat
    INSERT INTO public.seat_bookings (event_id, seat_id, registration_id, pass_id, holder_type, holder_name)
    VALUES (v_reg.event_id, v_seat.id, p_registration_id, v_participant_pass_id, 'participant', v_reg.full_name);

    UPDATE public.event_seats SET status = 'booked', updated_at = now() WHERE id = v_seat.id;

    IF v_participant_pass_id IS NOT NULL THEN
      UPDATE public.passes SET
        seat_section_name = (SELECT section_name FROM public.event_seat_sections WHERE id = v_seat.section_id),
        seat_row_label = v_seat.row_label,
        seat_number = v_seat.seat_number,
        seat_label = v_seat.seat_label,
        updated_at = now()
      WHERE id = v_participant_pass_id;
    END IF;

    INSERT INTO public.seat_allocation_audit (event_id, registration_id, pass_id, new_seat_id, action, changed_by)
    VALUES (v_reg.event_id, p_registration_id, v_participant_pass_id, v_seat.id, 'allocated', p_admin_user_id);

    v_result := v_result || jsonb_build_object(
      'seat_id', v_seat.id,
      'seat_label', v_seat.seat_label,
      'row_label', v_seat.row_label,
      'seat_number', v_seat.seat_number,
      'section_name', (SELECT section_name FROM public.event_seat_sections WHERE id = v_seat.section_id),
      'holder_type', 'participant',
      'holder_name', v_reg.full_name
    );
    v_seats_allocated := v_seats_allocated + 1;

    -- Allocate guest seats
    FOR v_guests IN
      SELECT g.* FROM public.guests g
      WHERE g.registration_id = p_registration_id
      ORDER BY g.guest_number
    LOOP
      v_seat_type := 'guest';
      v_guest_pass_id := CASE v_guests.guest_number WHEN 1 THEN v_guest1_pass_id WHEN 2 THEN v_guest2_pass_id END;

      SELECT es.* INTO v_seat
      FROM public.event_seats es
      JOIN public.event_seat_sections ess ON ess.id = es.section_id
      WHERE es.event_id = v_reg.event_id
        AND es.seat_type = v_seat_type
        AND es.status = 'available'
      ORDER BY ess.display_order ASC, es.display_order ASC, es.seat_number ASC
      LIMIT 1
      FOR UPDATE OF es SKIP LOCKED;

      IF NOT FOUND THEN
        -- Try without section join
        SELECT es.* INTO v_seat
        FROM public.event_seats es
        WHERE es.event_id = v_reg.event_id
          AND es.seat_type = v_seat_type
          AND es.status = 'available'
        ORDER BY es.display_order ASC, es.seat_number ASC
        LIMIT 1
        FOR UPDATE OF es SKIP LOCKED;
      END IF;

      IF v_seat.id IS NULL THEN
        -- Roll back participant seat on failure
        UPDATE public.event_seats SET status = 'available', updated_at = now()
        WHERE id = (SELECT seat_id FROM public.seat_bookings WHERE registration_id = p_registration_id AND holder_type = 'participant');
        DELETE FROM public.seat_bookings WHERE registration_id = p_registration_id;
        UPDATE public.registrations SET seat_allocation_status = 'capacity_exceeded', updated_at = now()
        WHERE id = p_registration_id;
        INSERT INTO public.seat_allocation_audit (event_id, registration_id, action, changed_by, reason)
        VALUES (v_reg.event_id, p_registration_id, 'failed', p_admin_user_id, 'No guest seat available');
        RETURN jsonb_build_object('success', false, 'error', 'No guest seat available');
      END IF;

      INSERT INTO public.seat_bookings (event_id, seat_id, registration_id, pass_id, holder_type, holder_name)
      VALUES (v_reg.event_id, v_seat.id, p_registration_id, v_guest_pass_id, CASE v_guests.guest_number WHEN 1 THEN 'guest_1' ELSE 'guest_2' END, v_guests.full_name);

      UPDATE public.event_seats SET status = 'booked', updated_at = now() WHERE id = v_seat.id;

      IF v_guest_pass_id IS NOT NULL THEN
        UPDATE public.passes SET
          seat_section_name = (SELECT section_name FROM public.event_seat_sections WHERE id = v_seat.section_id),
          seat_row_label = v_seat.row_label,
          seat_number = v_seat.seat_number,
          seat_label = v_seat.seat_label,
          updated_at = now()
        WHERE id = v_guest_pass_id;
      END IF;

      INSERT INTO public.seat_allocation_audit (event_id, registration_id, pass_id, new_seat_id, action, changed_by)
      VALUES (v_reg.event_id, p_registration_id, v_guest_pass_id, v_seat.id, 'allocated', p_admin_user_id);

      v_result := v_result || jsonb_build_object(
        'seat_id', v_seat.id,
        'seat_label', v_seat.seat_label,
        'row_label', v_seat.row_label,
        'seat_number', v_seat.seat_number,
        'section_name', (SELECT section_name FROM public.event_seat_sections WHERE id = v_seat.section_id),
        'holder_type', CASE v_guests.guest_number WHEN 1 THEN 'guest_1' ELSE 'guest_2' END,
        'holder_name', v_guests.full_name
      );
      v_seats_allocated := v_seats_allocated + 1;
    END LOOP;
  ELSE
    -- Visitor registration
    v_seat_type := 'visitor';

    SELECT es.* INTO v_seat
    FROM public.event_seats es
    JOIN public.event_seat_sections ess ON ess.id = es.section_id
    WHERE es.event_id = v_reg.event_id
      AND es.seat_type = v_seat_type
      AND es.status = 'available'
    ORDER BY ess.display_order ASC, es.display_order ASC, es.seat_number ASC
    LIMIT 1
    FOR UPDATE OF es SKIP LOCKED;

    IF NOT FOUND THEN
      SELECT es.* INTO v_seat
      FROM public.event_seats es
      WHERE es.event_id = v_reg.event_id
        AND es.seat_type = v_seat_type
        AND es.status = 'available'
      ORDER BY es.display_order ASC, es.seat_number ASC
      LIMIT 1
      FOR UPDATE OF es SKIP LOCKED;
    END IF;

    IF v_seat.id IS NULL THEN
      UPDATE public.registrations SET seat_allocation_status = 'capacity_exceeded', updated_at = now()
      WHERE id = p_registration_id;
      INSERT INTO public.seat_allocation_audit (event_id, registration_id, action, changed_by, reason)
      VALUES (v_reg.event_id, p_registration_id, 'failed', p_admin_user_id, 'No visitor seat available');
      RETURN jsonb_build_object('success', false, 'error', 'No visitor seat available');
    END IF;

    INSERT INTO public.seat_bookings (event_id, seat_id, registration_id, holder_type, holder_name)
    VALUES (v_reg.event_id, v_seat.id, p_registration_id, 'visitor', v_reg.full_name);

    UPDATE public.event_seats SET status = 'booked', updated_at = now() WHERE id = v_seat.id;

    INSERT INTO public.seat_allocation_audit (event_id, registration_id, new_seat_id, action, changed_by)
    VALUES (v_reg.event_id, p_registration_id, v_seat.id, 'allocated', p_admin_user_id);

    v_result := v_result || jsonb_build_object(
      'seat_id', v_seat.id,
      'seat_label', v_seat.seat_label,
      'row_label', v_seat.row_label,
      'seat_number', v_seat.seat_number,
      'section_name', (SELECT section_name FROM public.event_seat_sections WHERE id = v_seat.section_id),
      'holder_type', 'visitor',
      'holder_name', v_reg.full_name
    );
    v_seats_allocated := v_seats_allocated + 1;
  END IF;

  -- Mark allocation complete
  UPDATE public.registrations SET seat_allocation_status = 'allocated', updated_at = now()
  WHERE id = p_registration_id;

  RETURN jsonb_build_object(
    'success', true,
    'allocated', true,
    'seats_allocated', v_seats_allocated,
    'seats', v_result
  );
END;
$$;

-- ============================================
-- 15. AUTO SEED SEAT SECTIONS FOR EVENTS (safe)
-- ============================================
DO $$
DECLARE
  v_event RECORD;
  v_participant_section_id UUID;
  v_guest_section_id UUID;
  v_visitor_section_id UUID;
  v_row_letter TEXT;
  v_seat_num INTEGER;
  v_row_counter INTEGER;
  v_row_label TEXT;
  v_display_order INTEGER;
  v_max_participant_seats INTEGER;
  v_max_guest_seats INTEGER;
  v_max_visitor_seats INTEGER;
BEGIN
  FOR v_event IN SELECT * FROM public.events WHERE is_active = true LOOP
    -- Create sections if they don't exist
    INSERT INTO public.event_seat_sections (event_id, section_name, section_code, seat_type, display_order)
    VALUES (v_event.id, 'Participant Section', 'P', 'participant', 1)
    ON CONFLICT (event_id, section_code) DO NOTHING
    RETURNING id INTO v_participant_section_id;

    IF v_participant_section_id IS NULL THEN
      SELECT id INTO v_participant_section_id FROM public.event_seat_sections
      WHERE event_id = v_event.id AND section_code = 'P';
    END IF;

    INSERT INTO public.event_seat_sections (event_id, section_name, section_code, seat_type, display_order)
    VALUES (v_event.id, 'Guest Section', 'G', 'guest', 2)
    ON CONFLICT (event_id, section_code) DO NOTHING
    RETURNING id INTO v_guest_section_id;

    IF v_guest_section_id IS NULL THEN
      SELECT id INTO v_guest_section_id FROM public.event_seat_sections
      WHERE event_id = v_event.id AND section_code = 'G';
    END IF;

    INSERT INTO public.event_seat_sections (event_id, section_name, section_code, seat_type, display_order)
    VALUES (v_event.id, 'Visitor Section', 'V', 'visitor', 3)
    ON CONFLICT (event_id, section_code) DO NOTHING
    RETURNING id INTO v_visitor_section_id;

    IF v_visitor_section_id IS NULL THEN
      SELECT id INTO v_visitor_section_id FROM public.event_seat_sections
      WHERE event_id = v_event.id AND section_code = 'V';
    END IF;

    -- Generate participant seats if none exist
    SELECT COUNT(*) INTO v_max_participant_seats
    FROM public.event_seats
    WHERE event_id = v_event.id AND section_id = v_participant_section_id;

    IF v_max_participant_seats = 0 AND v_participant_section_id IS NOT NULL THEN
      v_display_order := 1;
      FOR v_row_counter IN 0..9 LOOP
        v_row_label := chr(65 + v_row_counter);
        FOR v_seat_num IN 1..50 LOOP
          INSERT INTO public.event_seats (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
          VALUES (v_event.id, v_participant_section_id, v_row_label, v_seat_num,
                  'P-' || v_row_label || '-' || lpad(v_seat_num::text, 3, '0'),
                  'participant', v_display_order);
          v_display_order := v_display_order + 1;
        END LOOP;
      END LOOP;
    END IF;

    -- Generate guest seats if none exist
    SELECT COUNT(*) INTO v_max_guest_seats
    FROM public.event_seats
    WHERE event_id = v_event.id AND section_id = v_guest_section_id;

    IF v_max_guest_seats = 0 AND v_guest_section_id IS NOT NULL THEN
      v_display_order := 1;
      FOR v_row_counter IN 0..4 LOOP
        v_row_label := chr(65 + v_row_counter);
        FOR v_seat_num IN 1..40 LOOP
          INSERT INTO public.event_seats (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
          VALUES (v_event.id, v_guest_section_id, v_row_label, v_seat_num,
                  'G-' || v_row_label || '-' || lpad(v_seat_num::text, 3, '0'),
                  'guest', v_display_order);
          v_display_order := v_display_order + 1;
        END LOOP;
      END LOOP;
    END IF;

    -- Generate visitor seats if none exist
    SELECT COUNT(*) INTO v_max_visitor_seats
    FROM public.event_seats
    WHERE event_id = v_event.id AND section_id = v_visitor_section_id;

    IF v_max_visitor_seats = 0 AND v_visitor_section_id IS NOT NULL THEN
      v_display_order := 1;
      FOR v_row_counter IN 0..4 LOOP
        v_row_label := chr(65 + v_row_counter);
        FOR v_seat_num IN 1..40 LOOP
          INSERT INTO public.event_seats (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
          VALUES (v_event.id, v_visitor_section_id, v_row_label, v_seat_num,
                  'V-' || v_row_label || '-' || lpad(v_seat_num::text, 3, '0'),
                  'visitor', v_display_order);
          v_display_order := v_display_order + 1;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 16. ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_seat_allocation ON public.registrations(seat_allocation_status)
  WHERE seat_allocation_status IN ('pending', 'capacity_exceeded');
CREATE INDEX IF NOT EXISTS idx_passes_event_id ON public.passes(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_passes_pass_number ON public.passes(pass_number);

-- ============================================
-- 17. RLS POLICIES FOR NEW TABLES
-- ============================================
ALTER TABLE public.event_seat_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_allocation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Public can read available seat sections and seats
CREATE POLICY "Public can read seat sections" ON public.event_seat_sections
  FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Public can read available seats" ON public.event_seats
  FOR SELECT TO public USING (status = 'available');

-- Service role full access
CREATE POLICY "Service role seat sections" ON public.event_seat_sections
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role seats" ON public.event_seats
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role seat holds" ON public.seat_holds
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role seat bookings" ON public.seat_bookings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role seat audit" ON public.seat_allocation_audit
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role rate limits" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin policies
CREATE POLICY "Admins seat sections" ON public.event_seat_sections
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins seats" ON public.event_seats
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins seat holds" ON public.seat_holds
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins seat bookings" ON public.seat_bookings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins seat audit" ON public.seat_allocation_audit
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================
-- 18. SEAT REASSIGNMENT FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.reassign_seat(
  p_booking_id UUID,
  p_new_seat_id UUID,
  p_admin_user_id TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_new_seat RECORD;
  v_old_seat_id UUID;
BEGIN
  -- Lock booking and new seat
  SELECT * INTO v_booking FROM public.seat_bookings WHERE id = p_booking_id FOR UPDATE;
  SELECT * INTO v_new_seat FROM public.event_seats WHERE id = p_new_seat_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking or seat not found');
  END IF;

  IF v_new_seat.status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination seat is not available');
  END IF;

  v_old_seat_id := v_booking.seat_id;

  -- Update booking
  UPDATE public.seat_bookings SET seat_id = p_new_seat_id WHERE id = p_booking_id;

  -- Release old seat
  UPDATE public.event_seats SET status = 'available', updated_at = now() WHERE id = v_old_seat_id;

  -- Book new seat
  UPDATE public.event_seats SET status = 'booked', updated_at = now() WHERE id = p_new_seat_id;

  -- Update pass
  UPDATE public.passes SET
    seat_section_name = (SELECT section_name FROM public.event_seat_sections WHERE id = v_new_seat.section_id),
    seat_row_label = v_new_seat.row_label,
    seat_number = v_new_seat.seat_number,
    seat_label = v_new_seat.seat_label,
    updated_at = now()
  WHERE id = v_booking.pass_id;

  -- Audit
  INSERT INTO public.seat_allocation_audit
    (event_id, registration_id, pass_id, old_seat_id, new_seat_id, action, changed_by, reason)
  VALUES
    (v_booking.event_id, v_booking.registration_id, v_booking.pass_id, v_old_seat_id, p_new_seat_id, 'reassigned', p_admin_user_id, 'Admin reassignment');

  RETURN jsonb_build_object('success', true, 'old_seat_id', v_old_seat_id, 'new_seat_id', p_new_seat_id);
END;
$$;

-- ============================================
-- 19. AUTO UPDATE EVENT SNAPSHOT ON REGISTRATION
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_set_event_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT
    e.name, e.city, e.event_date, e.start_time, e.end_time, e.venue
  INTO
    NEW.event_name_snapshot, NEW.event_city_snapshot, NEW.event_date_snapshot,
    NEW.event_start_time_snapshot, NEW.event_end_time_snapshot, NEW.event_venue_snapshot
  FROM public.events e
  WHERE e.id = NEW.event_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_set_event_snapshot ON public.registrations;
CREATE TRIGGER trigger_auto_set_event_snapshot
  BEFORE INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_event_snapshot();

-- ============================================
-- 20. GRANTS
-- ============================================
GRANT ALL ON public.event_seat_sections TO service_role;
GRANT ALL ON public.event_seats TO service_role;
GRANT ALL ON public.seat_holds TO service_role;
GRANT ALL ON public.seat_bookings TO service_role;
GRANT ALL ON public.seat_allocation_audit TO service_role;
GRANT ALL ON public.rate_limits TO service_role;

-- Public read-only for seats
GRANT SELECT ON public.event_seat_sections TO anon;
GRANT SELECT ON public.event_seats TO anon;

-- Admin grants
GRANT ALL ON public.event_seat_sections TO authenticated;
GRANT ALL ON public.event_seats TO authenticated;
GRANT ALL ON public.seat_holds TO authenticated;
GRANT ALL ON public.seat_bookings TO authenticated;
GRANT ALL ON public.seat_allocation_audit TO authenticated;
