-- ============================================
-- TALENT FEST: Final Photos, Seats & Concurrency
-- Safe, non-destructive, idempotent migration
-- ============================================

-- ============================================
-- 1. EVENT DATA BACKFILL (only where NULL)
-- ============================================
UPDATE public.events SET
  event_date = COALESCE(event_date, '2026-08-15'),
  start_time = COALESCE(start_time, '14:00:00'::TIME),
  end_time = COALESCE(end_time, '19:00:00'::TIME),
  venue = COALESCE(venue, CASE slug
    WHEN 'telent-fest-ahmedabad' THEN 'Ahmedabad Convention Centre'
    WHEN 'telent-fest-surat' THEN 'Surat Exhibition Hall'
    WHEN 'telent-fest-vadodara' THEN 'Vadodara Cultural Centre'
    WHEN 'telent-fest-rajkot' THEN 'Rajkot Town Hall'
    ELSE venue
  END)
WHERE event_date IS NULL OR start_time IS NULL OR venue IS NULL;

-- ============================================
-- 2. ENSURE EVENTS TABLE HAS ALL REQUIRED FIELDS
-- ============================================
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_image_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS map_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visitor_registration_enabled BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 3. PARTICIPANT PHOTO COLUMNS
-- ============================================
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS photo_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photo_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS photo_size_bytes INTEGER;

-- ============================================
-- 4. EVENT SNAPSHOT COLUMNS ON REGISTRATIONS
-- ============================================
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS event_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS event_city_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS event_date_snapshot DATE,
  ADD COLUMN IF NOT EXISTS event_start_time_snapshot TIME,
  ADD COLUMN IF NOT EXISTS event_end_time_snapshot TIME,
  ADD COLUMN IF NOT EXISTS event_venue_snapshot TEXT;

-- ============================================
-- 5. SEAT ALLOCATION STATUS ON REGISTRATIONS
-- ============================================
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS seat_allocation_status TEXT NOT NULL DEFAULT 'none'
    CHECK (seat_allocation_status IN ('none', 'pending', 'allocated', 'capacity_exceeded'));

-- ============================================
-- 6. PAYMENT IDEMPOTENCY KEY
-- ============================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
  ON public.payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================
-- 7. EVENT SEAT SECTIONS TABLE
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
-- 8. EVENT SEATS TABLE
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
-- 9. SEAT HOLDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.seat_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES public.event_seats(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  hold_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seat_holds_seat_active
  ON public.seat_holds(seat_id, status)
  WHERE status = 'active';

-- ============================================
-- 10. SEAT BOOKINGS TABLE
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

-- ============================================
-- 11. SEAT ALLOCATION AUDIT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.seat_allocation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  pass_id UUID REFERENCES public.passes(id) ON DELETE SET NULL,
  old_seat_id UUID REFERENCES public.event_seats(id) ON DELETE SET NULL,
  new_seat_id UUID REFERENCES public.event_seats(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('allocated', 'reassigned', 'released', 'blocked', 'unblocked', 'failed')),
  changed_by TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 12. RATE LIMITING TABLE
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

-- ============================================
-- 13. SEAT FIELDS ON PASSES
-- ============================================
ALTER TABLE public.passes
  ADD COLUMN IF NOT EXISTS seat_section_name TEXT,
  ADD COLUMN IF NOT EXISTS seat_row_label TEXT,
  ADD COLUMN IF NOT EXISTS seat_number INTEGER,
  ADD COLUMN IF NOT EXISTS seat_label TEXT;

ALTER TABLE public.passes
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

-- ============================================
-- 14. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_seat_allocation ON public.registrations(seat_allocation_status) WHERE seat_allocation_status IN ('pending', 'capacity_exceeded');
CREATE INDEX IF NOT EXISTS idx_registrations_event_status_type ON public.registrations(event_id, registration_status, registration_type);
CREATE INDEX IF NOT EXISTS idx_registrations_photo_storage ON public.registrations(photo_storage_path) WHERE photo_storage_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_passes_registration_id ON public.passes(registration_id);
CREATE INDEX IF NOT EXISTS idx_passes_event_id ON public.passes(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_passes_pass_number ON public.passes(pass_number);

CREATE INDEX IF NOT EXISTS idx_event_seats_event_id ON public.event_seats(event_id);
CREATE INDEX IF NOT EXISTS idx_event_seats_section_id ON public.event_seats(section_id);
CREATE INDEX IF NOT EXISTS idx_event_seats_status ON public.event_seats(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_seats_type_status ON public.event_seats(event_id, seat_type, status);
CREATE INDEX IF NOT EXISTS idx_event_seats_display ON public.event_seats(event_id, section_id, display_order);

CREATE INDEX IF NOT EXISTS idx_seat_holds_event ON public.seat_holds(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_registration ON public.seat_holds(registration_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires ON public.seat_holds(expires_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_seat_bookings_event ON public.seat_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_registration ON public.seat_bookings(registration_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_pass ON public.seat_bookings(pass_id) WHERE pass_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seat_bookings_holder ON public.seat_bookings(event_id, holder_type);

CREATE INDEX IF NOT EXISTS idx_seat_audit_event ON public.seat_allocation_audit(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_audit_registration ON public.seat_allocation_audit(registration_id);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(action_key, identifier, window_start);

-- ============================================
-- 15. ATOMIC SEAT ALLOCATION FUNCTION (final version)
-- ============================================
CREATE OR REPLACE FUNCTION public.allocate_registration_seats(
  p_registration_id UUID,
  p_admin_user_id TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
  v_reg RECORD;
  v_seat RECORD;
  v_guest_rec RECORD;
  v_participant_pass_id UUID;
  v_guest1_pass_id UUID;
  v_guest2_pass_id UUID;
  v_result JSONB := '[]'::JSONB;
  v_seats_needed INTEGER := 0;
  v_seat_type TEXT;
  v_section_name TEXT;
  v_holder_type TEXT;
  v_guest_pass_id UUID;
BEGIN
  -- Lock registration with FOR UPDATE to prevent concurrent allocation
  SELECT r.* INTO v_reg
  FROM public.registrations r
  WHERE r.id = p_registration_id
  FOR UPDATE OF r;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;

  -- Must be paid
  IF v_reg.payment_status != 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not confirmed');
  END IF;

  -- Idempotency: if already allocated, return existing
  IF v_reg.seat_allocation_status = 'allocated' THEN
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

    RETURN jsonb_build_object('success', true, 'allocated', true,
      'seats', COALESCE(v_result, '[]'::JSONB));
  END IF;

  -- Get pass IDs
  SELECT id INTO v_participant_pass_id FROM public.passes
  WHERE registration_id = p_registration_id AND pass_type = 'participant' LIMIT 1;
  SELECT id INTO v_guest1_pass_id FROM public.passes
  WHERE registration_id = p_registration_id AND pass_type = 'guest_1' LIMIT 1;
  SELECT id INTO v_guest2_pass_id FROM public.passes
  WHERE registration_id = p_registration_id AND pass_type = 'guest_2' LIMIT 1;

  -- Determine seat type based on registration type
  IF v_reg.registration_type = 'participant' THEN
    v_seat_type := 'participant';
    v_holder_type := 'participant';
  ELSIF v_reg.registration_type = 'visitor' THEN
    v_seat_type := 'visitor';
    v_holder_type := 'visitor';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown registration type');
  END IF;

  -- Allocate primary seat (participant or visitor)
  SELECT es.*, ess.section_name INTO v_seat
  FROM public.event_seats es
  JOIN public.event_seat_sections ess ON ess.id = es.section_id
  WHERE es.event_id = v_reg.event_id
    AND es.seat_type = v_seat_type
    AND es.status = 'available'
  ORDER BY ess.display_order ASC, es.display_order ASC, es.seat_number ASC
  LIMIT 1
  FOR UPDATE OF es SKIP LOCKED;

  IF v_seat.id IS NULL THEN
    UPDATE public.registrations SET seat_allocation_status = 'capacity_exceeded', updated_at = now()
    WHERE id = p_registration_id;
    INSERT INTO public.seat_allocation_audit
      (event_id, registration_id, action, changed_by, reason)
    VALUES (v_reg.event_id, p_registration_id, 'failed', p_admin_user_id,
      'No ' || v_seat_type || ' seat available');
    RETURN jsonb_build_object('success', false, 'error',
      'No ' || v_seat_type || ' seat available');
  END IF;

  -- Book seat
  INSERT INTO public.seat_bookings
    (event_id, seat_id, registration_id, pass_id, holder_type, holder_name)
  VALUES (v_reg.event_id, v_seat.id, p_registration_id,
    CASE WHEN v_reg.registration_type = 'participant' THEN v_participant_pass_id ELSE NULL END,
    v_holder_type, v_reg.full_name)
  ON CONFLICT (event_id, seat_id) DO NOTHING;

  UPDATE public.event_seats SET status = 'booked', updated_at = now()
  WHERE id = v_seat.id;

  -- Update pass with seat info
  IF v_reg.registration_type = 'participant' AND v_participant_pass_id IS NOT NULL THEN
    UPDATE public.passes SET
      seat_section_name = v_seat.section_name,
      seat_row_label = v_seat.row_label,
      seat_number = v_seat.seat_number,
      seat_label = v_seat.seat_label,
      event_id = v_reg.event_id,
      updated_at = now()
    WHERE id = v_participant_pass_id;
  END IF;

  INSERT INTO public.seat_allocation_audit
    (event_id, registration_id, pass_id, new_seat_id, action, changed_by)
  VALUES (v_reg.event_id, p_registration_id,
    CASE WHEN v_reg.registration_type = 'participant' THEN v_participant_pass_id ELSE NULL END,
    v_seat.id, 'allocated', p_admin_user_id);

  v_result := v_result || jsonb_build_object(
    'seat_id', v_seat.id,
    'seat_label', v_seat.seat_label,
    'row_label', v_seat.row_label,
    'seat_number', v_seat.seat_number,
    'section_name', v_seat.section_name,
    'holder_type', v_holder_type,
    'holder_name', v_reg.full_name
  );

  -- Allocate guest seats if participant
  IF v_reg.registration_type = 'participant' THEN
    FOR v_guest_rec IN
      SELECT g.* FROM public.guests g
      WHERE g.registration_id = p_registration_id
      ORDER BY g.guest_number
    LOOP
      SELECT es.*, ess.section_name INTO v_seat
      FROM public.event_seats es
      JOIN public.event_seat_sections ess ON ess.id = es.section_id
      WHERE es.event_id = v_reg.event_id
        AND es.seat_type = 'guest'
        AND es.status = 'available'
      ORDER BY ess.display_order ASC, es.display_order ASC, es.seat_number ASC
      LIMIT 1
      FOR UPDATE OF es SKIP LOCKED;

      IF v_seat.id IS NULL THEN
        -- Rollback: release participant seat
        UPDATE public.event_seats SET status = 'available', updated_at = now()
        WHERE id = (SELECT seat_id FROM public.seat_bookings
          WHERE registration_id = p_registration_id AND holder_type = 'participant');
        DELETE FROM public.seat_bookings
        WHERE registration_id = p_registration_id;
        UPDATE public.registrations SET seat_allocation_status = 'capacity_exceeded', updated_at = now()
        WHERE id = p_registration_id;
        INSERT INTO public.seat_allocation_audit
          (event_id, registration_id, action, changed_by, reason)
        VALUES (v_reg.event_id, p_registration_id, 'failed', p_admin_user_id,
          'No guest seat for ' || v_guest_rec.full_name);
        RETURN jsonb_build_object('success', false, 'error', 'No guest seat available');
      END IF;

      v_guest_pass_id := CASE v_guest_rec.guest_number
        WHEN 1 THEN v_guest1_pass_id WHEN 2 THEN v_guest2_pass_id END;

      INSERT INTO public.seat_bookings
        (event_id, seat_id, registration_id, pass_id, holder_type, holder_name)
      VALUES (v_reg.event_id, v_seat.id, p_registration_id, v_guest_pass_id,
        CASE v_guest_rec.guest_number WHEN 1 THEN 'guest_1' ELSE 'guest_2' END,
        v_guest_rec.full_name)
      ON CONFLICT (event_id, seat_id) DO NOTHING;

      UPDATE public.event_seats SET status = 'booked', updated_at = now()
      WHERE id = v_seat.id;

      IF v_guest_pass_id IS NOT NULL THEN
        UPDATE public.passes SET
          seat_section_name = v_seat.section_name,
          seat_row_label = v_seat.row_label,
          seat_number = v_seat.seat_number,
          seat_label = v_seat.seat_label,
          event_id = v_reg.event_id,
          updated_at = now()
        WHERE id = v_guest_pass_id;
      END IF;

      INSERT INTO public.seat_allocation_audit
        (event_id, registration_id, pass_id, new_seat_id, action, changed_by)
      VALUES (v_reg.event_id, p_registration_id, v_guest_pass_id, v_seat.id,
        'allocated', p_admin_user_id);

      v_result := v_result || jsonb_build_object(
        'seat_id', v_seat.id,
        'seat_label', v_seat.seat_label,
        'row_label', v_seat.row_label,
        'seat_number', v_seat.seat_number,
        'section_name', v_seat.section_name,
        'holder_type', CASE v_guest_rec.guest_number WHEN 1 THEN 'guest_1' ELSE 'guest_2' END,
        'holder_name', v_guest_rec.full_name
      );
    END LOOP;
  END IF;

  -- Mark allocation complete
  UPDATE public.registrations SET seat_allocation_status = 'allocated', updated_at = now()
  WHERE id = p_registration_id;

  RETURN jsonb_build_object('success', true, 'allocated', true, 'seats', v_result);
END;
$$;

-- ============================================
-- 16. SEAT REASSIGNMENT FUNCTION
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
  SELECT * INTO v_booking FROM public.seat_bookings WHERE id = p_booking_id FOR UPDATE;
  SELECT * INTO v_new_seat FROM public.event_seats WHERE id = p_new_seat_id FOR UPDATE;

  IF v_booking.id IS NULL OR v_new_seat.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking or seat not found');
  END IF;

  IF v_new_seat.status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination seat is not available');
  END IF;

  v_old_seat_id := v_booking.seat_id;

  UPDATE public.seat_bookings SET seat_id = p_new_seat_id WHERE id = p_booking_id;
  UPDATE public.event_seats SET status = 'available', updated_at = now() WHERE id = v_old_seat_id;
  UPDATE public.event_seats SET status = 'booked', updated_at = now() WHERE id = p_new_seat_id;

  UPDATE public.passes SET
    seat_section_name = (SELECT section_name FROM public.event_seat_sections WHERE id = v_new_seat.section_id),
    seat_row_label = v_new_seat.row_label,
    seat_number = v_new_seat.seat_number,
    seat_label = v_new_seat.seat_label,
    updated_at = now()
  WHERE id = v_booking.pass_id;

  INSERT INTO public.seat_allocation_audit
    (event_id, registration_id, pass_id, old_seat_id, new_seat_id, action, changed_by, reason)
  VALUES (v_booking.event_id, v_booking.registration_id, v_booking.pass_id,
    v_old_seat_id, p_new_seat_id, 'reassigned', p_admin_user_id, 'Admin reassignment');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================
-- 17. AUTO SET EVENT SNAPSHOT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_set_event_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT e.name, e.city, e.event_date, e.start_time, e.end_time, e.venue
  INTO NEW.event_name_snapshot, NEW.event_city_snapshot, NEW.event_date_snapshot,
    NEW.event_start_time_snapshot, NEW.event_end_time_snapshot, NEW.event_venue_snapshot
  FROM public.events e WHERE e.id = NEW.event_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_set_event_snapshot ON public.registrations;
CREATE TRIGGER trigger_auto_set_event_snapshot
  BEFORE INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_event_snapshot();

-- ============================================
-- 18. SEAT GENERATION FUNCTION (for admin tool)
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_event_seats(
  p_event_id UUID,
  p_section_id UUID,
  p_seat_type TEXT,
  p_start_row TEXT DEFAULT 'A',
  p_num_rows INTEGER DEFAULT 10,
  p_seats_per_row INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing INTEGER;
  v_row_letter TEXT;
  v_base_ascii INTEGER;
  v_i INTEGER;
  v_j INTEGER;
  v_created INTEGER := 0;
  v_max_display INTEGER;
BEGIN
  -- Validate section
  IF NOT EXISTS (SELECT 1 FROM public.event_seat_sections
    WHERE id = p_section_id AND event_id = p_event_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Section not found for this event');
  END IF;

  -- Check no seats already exist for this section
  SELECT COUNT(*) INTO v_existing
  FROM public.event_seats WHERE section_id = p_section_id;
  IF v_existing > 0 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Section already has ' || v_existing || ' seats. Use a new section to avoid duplicates.');
  END IF;

  -- Get max display order for this event's section
  SELECT COALESCE(MAX(display_order), 0) INTO v_max_display
  FROM public.event_seats WHERE section_id = p_section_id;

  v_base_ascii := ASCII(upper(p_start_row));
  v_i := 0;

  WHILE v_i < p_num_rows LOOP
    v_row_letter := CHR(v_base_ascii + v_i);
    v_j := 1;
    WHILE v_j <= p_seats_per_row LOOP
      v_max_display := v_max_display + 1;
      INSERT INTO public.event_seats
        (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
      VALUES (p_event_id, p_section_id, v_row_letter, v_j,
        upper(p_seat_type) || '-' || v_row_letter || '-' || LPAD(v_j::TEXT, 3, '0'),
        p_seat_type, v_max_display);
      v_created := v_created + 1;
      v_j := v_j + 1;
    END LOOP;
    v_i := v_i + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'seats_created', v_created);
END;
$$;

-- ============================================
-- 19. SEED INITIAL SEAT SECTIONS AND SEATS
-- ============================================
DO $$
DECLARE
  v_event RECORD;
  v_participant_section_id UUID;
  v_guest_section_id UUID;
  v_visitor_section_id UUID;
  v_existing_p INTEGER;
  v_existing_g INTEGER;
  v_existing_v INTEGER;
  v_display_order INTEGER;
  v_row_letter TEXT;
  v_seat_num INTEGER;
  v_row_counter INTEGER;
BEGIN
  FOR v_event IN SELECT * FROM public.events WHERE is_active = true LOOP
    -- Create sections
    INSERT INTO public.event_seat_sections
      (event_id, section_name, section_code, seat_type, display_order)
    VALUES (v_event.id, 'Participant Section', 'P', 'participant', 1)
    ON CONFLICT (event_id, section_code) DO NOTHING;
    INSERT INTO public.event_seat_sections
      (event_id, section_name, section_code, seat_type, display_order)
    VALUES (v_event.id, 'Guest Section', 'G', 'guest', 2)
    ON CONFLICT (event_id, section_code) DO NOTHING;
    INSERT INTO public.event_seat_sections
      (event_id, section_name, section_code, seat_type, display_order)
    VALUES (v_event.id, 'Visitor Section', 'V', 'visitor', 3)
    ON CONFLICT (event_id, section_code) DO NOTHING;

    -- Get section IDs (now they exist)
    SELECT id INTO v_participant_section_id FROM public.event_seat_sections
      WHERE event_id = v_event.id AND section_code = 'P';
    SELECT id INTO v_guest_section_id FROM public.event_seat_sections
      WHERE event_id = v_event.id AND section_code = 'G';
    SELECT id INTO v_visitor_section_id FROM public.event_seat_sections
      WHERE event_id = v_event.id AND section_code = 'V';

    -- Seed participant seats if none
    SELECT COUNT(*) INTO v_existing_p FROM public.event_seats
      WHERE event_id = v_event.id AND section_id = v_participant_section_id;
    IF v_existing_p = 0 AND v_participant_section_id IS NOT NULL THEN
      v_display_order := 1;
      FOR v_row_counter IN 0..9 LOOP
        v_row_letter := CHR(65 + v_row_counter);
        FOR v_seat_num IN 1..50 LOOP
          INSERT INTO public.event_seats
            (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
          VALUES (v_event.id, v_participant_section_id, v_row_letter, v_seat_num,
            'P-' || v_row_letter || '-' || LPAD(v_seat_num::TEXT, 3, '0'),
            'participant', v_display_order);
          v_display_order := v_display_order + 1;
        END LOOP;
      END LOOP;
    END IF;

    -- Seed guest seats if none
    SELECT COUNT(*) INTO v_existing_g FROM public.event_seats
      WHERE event_id = v_event.id AND section_id = v_guest_section_id;
    IF v_existing_g = 0 AND v_guest_section_id IS NOT NULL THEN
      v_display_order := 1;
      FOR v_row_counter IN 0..4 LOOP
        v_row_letter := CHR(65 + v_row_counter);
        FOR v_seat_num IN 1..40 LOOP
          INSERT INTO public.event_seats
            (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
          VALUES (v_event.id, v_guest_section_id, v_row_letter, v_seat_num,
            'G-' || v_row_letter || '-' || LPAD(v_seat_num::TEXT, 3, '0'),
            'guest', v_display_order);
          v_display_order := v_display_order + 1;
        END LOOP;
      END LOOP;
    END IF;

    -- Seed visitor seats if none
    SELECT COUNT(*) INTO v_existing_v FROM public.event_seats
      WHERE event_id = v_event.id AND section_id = v_visitor_section_id;
    IF v_existing_v = 0 AND v_visitor_section_id IS NOT NULL THEN
      v_display_order := 1;
      FOR v_row_counter IN 0..4 LOOP
        v_row_letter := CHR(65 + v_row_counter);
        FOR v_seat_num IN 1..40 LOOP
          INSERT INTO public.event_seats
            (event_id, section_id, row_label, seat_number, seat_label, seat_type, display_order)
          VALUES (v_event.id, v_visitor_section_id, v_row_letter, v_seat_num,
            'V-' || v_row_letter || '-' || LPAD(v_seat_num::TEXT, 3, '0'),
            'visitor', v_display_order);
          v_display_order := v_display_order + 1;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 20. RLS POLICIES
-- ============================================
ALTER TABLE public.event_seat_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_allocation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public can read seat sections" ON public.event_seat_sections;
CREATE POLICY "Public can read seat sections" ON public.event_seat_sections
  FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "Public can read available seats" ON public.event_seats;
CREATE POLICY "Public can read available seats" ON public.event_seats
  FOR SELECT TO public USING (status = 'available');

-- Service role
DROP POLICY IF EXISTS "Service role seat sections" ON public.event_seat_sections;
CREATE POLICY "Service role seat sections" ON public.event_seat_sections
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role seats" ON public.event_seats;
CREATE POLICY "Service role seats" ON public.event_seats
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role seat holds" ON public.seat_holds;
CREATE POLICY "Service role seat holds" ON public.seat_holds
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role seat bookings" ON public.seat_bookings;
CREATE POLICY "Service role seat bookings" ON public.seat_bookings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role audit" ON public.seat_allocation_audit;
CREATE POLICY "Service role audit" ON public.seat_allocation_audit
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role rate limits" ON public.rate_limits;
CREATE POLICY "Service role rate limits" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin policies
DROP POLICY IF EXISTS "Admins seat sections" ON public.event_seat_sections;
CREATE POLICY "Admins seat sections" ON public.event_seat_sections
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins seats" ON public.event_seats;
CREATE POLICY "Admins seats" ON public.event_seats
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins seat holds" ON public.seat_holds;
CREATE POLICY "Admins seat holds" ON public.seat_holds
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins seat bookings" ON public.seat_bookings;
CREATE POLICY "Admins seat bookings" ON public.seat_bookings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins audit" ON public.seat_allocation_audit;
CREATE POLICY "Admins audit" ON public.seat_allocation_audit
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins rate limits" ON public.rate_limits;
CREATE POLICY "Admins rate limits" ON public.rate_limits
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================
-- 21. GRANTS
-- ============================================
GRANT ALL ON public.event_seat_sections TO service_role;
GRANT ALL ON public.event_seats TO service_role;
GRANT ALL ON public.seat_holds TO service_role;
GRANT ALL ON public.seat_bookings TO service_role;
GRANT ALL ON public.seat_allocation_audit TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
GRANT SELECT ON public.event_seat_sections TO anon;
GRANT SELECT ON public.event_seats TO anon;
GRANT EXECUTE ON FUNCTION public.allocate_registration_seats TO service_role;
GRANT EXECUTE ON FUNCTION public.reassign_seat TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_event_seats TO service_role;

-- ============================================
-- 22. RATE LIMIT INCREMENT FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_action_key TEXT,
  p_identifier TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMPTZ := date_trunc('minute', now());
BEGIN
  INSERT INTO public.rate_limits (action_key, identifier, window_start, attempt_count)
  VALUES (p_action_key, p_identifier, v_window_start, 1)
  ON CONFLICT (action_key, identifier, window_start)
  DO UPDATE SET attempt_count = public.rate_limits.attempt_count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_rate_limit TO service_role;
