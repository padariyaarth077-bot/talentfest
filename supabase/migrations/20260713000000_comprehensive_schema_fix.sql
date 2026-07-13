-- ===============================================================
-- TALENT FEST: Comprehensive Schema Fix
-- Safe, idempotent migration ensuring ALL columns exist for v2026
-- Run this in Supabase SQL Editor for your project
-- ===============================================================

-- ===============================================================
-- 1. EVENTS — ensure ALL columns exist
-- ===============================================================
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_image_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS map_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visitor_registration_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city_code TEXT NOT NULL DEFAULT '';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS participant_price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visitor_price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS guest_price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS participant_capacity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visitor_capacity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS guest_capacity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS maximum_guests_per_participant INTEGER NOT NULL DEFAULT 2;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_opens_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===============================================================
-- 2. REGISTRATIONS — ensure ALL columns exist
-- ===============================================================
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS encrypted_aadhaar TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS aadhaar_last_four TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS aadhaar_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS activity_category_id UUID REFERENCES public.activity_categories(id);
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS registration_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS event_name_snapshot TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS event_city_snapshot TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS event_date_snapshot DATE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS event_start_time_snapshot TIME;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS event_end_time_snapshot TIME;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS event_venue_snapshot TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS photo_storage_path TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS photo_mime_type TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS photo_size_bytes INTEGER;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS seat_allocation_status TEXT NOT NULL DEFAULT 'none';

-- Remove check constraint if it exists and re-add (to avoid conflict with existing data)
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_registration_type_check;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_registration_type_check
  CHECK (registration_type IN ('participant', 'visitor')) NOT VALID;

-- ===============================================================
-- 3. PASSES — ensure ALL columns exist
-- ===============================================================
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS pass_type TEXT NOT NULL DEFAULT 'participant';
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS secure_qr_token TEXT;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS seat_section_name TEXT;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS seat_row_label TEXT;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS seat_number INTEGER;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS seat_label TEXT;
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

-- Ensure pass_number is unique if it's nullable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_passes_pass_number') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_passes_pass_number ON public.passes(pass_number);
  END IF;
END $$;

-- ===============================================================
-- 4. PAYMENTS — ensure ALL columns exist
-- ===============================================================
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'dummy';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_mode TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
  ON public.payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ===============================================================
-- 5. GUESTS — ensure ALL columns exist
-- ===============================================================
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS guest_number INTEGER;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===============================================================
-- 6. ACTIVITY CATEGORIES — ensure all columns
-- ===============================================================
ALTER TABLE public.activity_categories ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.activity_categories ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL DEFAULT '';
ALTER TABLE public.activity_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.activity_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.activity_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.activity_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===============================================================
-- 7. EVENT ACTIVITY CATEGORIES — ensure all columns
-- ===============================================================
ALTER TABLE public.event_activity_categories ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE public.event_activity_categories ADD COLUMN IF NOT EXISTS registration_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.event_activity_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.event_activity_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===============================================================
-- 8. CONCERT SETTINGS — ensure all columns
-- ===============================================================
ALTER TABLE public.concert_settings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.concert_settings ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.concert_settings ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE public.concert_settings ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE public.concert_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.concert_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===============================================================
-- 9. CONCERT ARTISTS — ensure all columns
-- ===============================================================
ALTER TABLE public.concert_artists ADD COLUMN IF NOT EXISTS concert_info_id UUID REFERENCES public.concert_settings(id) ON DELETE CASCADE;
ALTER TABLE public.concert_artists ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.concert_artists ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.concert_artists ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.concert_artists ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.concert_artists ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.concert_artists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===============================================================
-- 10. EMPLOYEE AWARD REGISTRATIONS — ensure all columns
-- ===============================================================
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS coordinator_name TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS employee_full_name TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS employee_email TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS award_categories TEXT[] DEFAULT '{}';
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS other_award_category TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS working_since TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS total_experience TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS major_achievements TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS event_participation TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS number_of_participants INTEGER DEFAULT 1;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS declaration_accepted BOOLEAN DEFAULT false;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS employee_signature_name TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS authorized_company_signature_name TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS declaration_date TEXT;
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted';
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.employee_award_registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_employee_award_status ON public.employee_award_registrations(status);
CREATE INDEX IF NOT EXISTS idx_employee_award_application ON public.employee_award_registrations(application_number);

-- ===============================================================
-- 11. SEED EVENTS (only if empty)
-- ===============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events LIMIT 1) THEN
    INSERT INTO public.events (name, slug, city, city_code, participant_price, visitor_price, guest_price, participant_capacity, visitor_capacity, guest_capacity, maximum_guests_per_participant, registration_status, visitor_registration_enabled, is_active, event_date, start_time, end_time, venue)
    VALUES
      ('Telent Fest Ahmedabad', 'telent-fest-ahmedabad', 'Ahmedabad', 'AMD', 299, 199, 149, 500, 200, 200, 2, 'active', true, true, '2026-08-15', '14:00', '19:00', 'Ahmedabad Convention Centre'),
      ('Telent Fest Surat', 'telent-fest-surat', 'Surat', 'SUR', 299, 199, 149, 500, 200, 200, 2, 'active', true, true, '2026-08-22', '14:00', '19:00', 'Surat Exhibition Hall'),
      ('Telent Fest Vadodara', 'telent-fest-vadodara', 'Vadodara', 'VAD', 299, 199, 149, 500, 200, 200, 2, 'active', true, true, '2026-09-05', '14:00', '19:00', 'Vadodara Cultural Centre'),
      ('Telent Fest Rajkot', 'telent-fest-rajkot', 'Rajkot', 'RAJ', 299, 199, 149, 500, 200, 200, 2, 'active', true, true, '2026-09-12', '14:00', '19:00', 'Rajkot Town Hall')
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ===============================================================
-- 12. SEED ACTIVITY CATEGORIES (only if empty)
-- ===============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.activity_categories LIMIT 1) THEN
    INSERT INTO public.activity_categories (name, slug, description) VALUES
      ('Singing', 'singing', 'Vocal performance across all genres'),
      ('Dancing', 'dancing', 'Solo and group dance performances'),
      ('Music', 'music', 'Musical instrument performances'),
      ('Instrumental Music', 'instrumental-music', 'Instrumental music performances'),
      ('Acting', 'acting', 'Dramatic acting performances'),
      ('Drama and Theatre', 'drama-theatre', 'Theatre and stage performances'),
      ('Painting', 'painting', 'Visual art and painting'),
      ('Drawing and Sketching', 'drawing-sketching', 'Drawing and sketching art'),
      ('Arts and Craft', 'arts-craft', 'Creative arts and crafts'),
      ('Creative Writing', 'creative-writing', 'Original writing and poetry'),
      ('Photography', 'photography', 'Photography competition'),
      ('Solo Performance', 'solo-performance', 'Individual performance category'),
      ('Group Performance', 'group-performance', 'Group performance category'),
      ('Other', 'other', 'Other approved creative categories')
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ===============================================================
-- 13. LINK EVENTS TO CATEGORIES (only if missing)
-- ===============================================================
DO $$
DECLARE
  event_rec RECORD;
  cat_rec RECORD;
  link_exists BOOLEAN;
BEGIN
  FOR event_rec IN SELECT id FROM public.events LOOP
    FOR cat_rec IN SELECT id FROM public.activity_categories LOOP
      SELECT EXISTS(
        SELECT 1 FROM public.event_activity_categories
        WHERE event_id = event_rec.id AND activity_category_id = cat_rec.id
      ) INTO link_exists;
      IF NOT link_exists THEN
        INSERT INTO public.event_activity_categories (event_id, activity_category_id, registration_status)
        VALUES (event_rec.id, cat_rec.id, 'active');
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ===============================================================
-- 14. INDEXES
-- ===============================================================
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_event_status_type ON public.registrations(event_id, registration_status, registration_type);
CREATE INDEX IF NOT EXISTS idx_registrations_photo_storage ON public.registrations(photo_storage_path) WHERE photo_storage_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registrations_seat_allocation ON public.registrations(seat_allocation_status) WHERE seat_allocation_status IN ('pending', 'capacity_exceeded');
CREATE INDEX IF NOT EXISTS idx_passes_registration_id ON public.passes(registration_id);
CREATE INDEX IF NOT EXISTS idx_passes_event_id ON public.passes(event_id);
CREATE INDEX IF NOT EXISTS idx_passes_secure_qr_token ON public.passes(secure_qr_token);
CREATE INDEX IF NOT EXISTS idx_passes_checked_in ON public.passes(checked_in);
CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON public.payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_guests_registration_id ON public.guests(registration_id);

-- ===============================================================
-- 15. AUTO-GENERATE SEQUENCES (if not exists)
-- ===============================================================
CREATE SEQUENCE IF NOT EXISTS public.registration_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.pass_number_seq START 1;

-- ===============================================================
-- 16. REGISTRATION NUMBER GENERATION FUNCTION & TRIGGER
-- ===============================================================
CREATE OR REPLACE FUNCTION public.generate_registration_number()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  event_city_code TEXT;
  year_code TEXT;
  seq_num INTEGER;
BEGIN
  SELECT city_code INTO event_city_code FROM public.events WHERE id = NEW.event_id;
  year_code := to_char(CURRENT_DATE, 'YY');
  seq_num := nextval('public.registration_number_seq');
  NEW.registration_number := 'TF' || year_code || '-' || event_city_code || '-REG-' || lpad(seq_num::text, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_registration_number ON public.registrations;
CREATE TRIGGER trigger_generate_registration_number
  BEFORE INSERT ON public.registrations
  FOR EACH ROW
  WHEN (NEW.registration_number IS NULL)
  EXECUTE FUNCTION public.generate_registration_number();

-- ===============================================================
-- 17. PASS NUMBER GENERATION FUNCTION & TRIGGER
-- ===============================================================
CREATE OR REPLACE FUNCTION public.generate_pass_number()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  event_city_code TEXT;
  year_code TEXT;
  seq_num INTEGER;
  prefix TEXT;
BEGIN
  SELECT e.city_code INTO event_city_code
  FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.id = NEW.registration_id;

  year_code := to_char(CURRENT_DATE, 'YY');
  seq_num := nextval('public.pass_number_seq');
  prefix := CASE NEW.pass_type
    WHEN 'participant' THEN 'P'
    WHEN 'guest_1' THEN 'G1'
    WHEN 'guest_2' THEN 'G2'
    WHEN 'visitor' THEN 'V'
    ELSE 'P'
  END;
  NEW.pass_number := 'TF' || year_code || '-' || event_city_code || '-' || prefix || '-' || lpad(seq_num::text, 6, '0');
  NEW.generated_at := now();
  IF NEW.status IS NULL OR NEW.status = 'pending' THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_pass_number ON public.passes;
CREATE TRIGGER trigger_generate_pass_number
  BEFORE INSERT ON public.passes
  FOR EACH ROW
  WHEN (NEW.pass_number IS NULL)
  EXECUTE FUNCTION public.generate_pass_number();

-- ===============================================================
-- 18. EVENT SNAPSHOT TRIGGER (overwrites only if null)
-- ===============================================================
CREATE OR REPLACE FUNCTION public.auto_set_event_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
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

-- ===============================================================
-- 19. EMPLOYEE AWARD APPLICATION NUMBER FUNCTION & TRIGGER
-- ===============================================================
CREATE SEQUENCE IF NOT EXISTS public.employee_award_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_employee_award_number()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  seq_num := nextval('public.employee_award_seq');
  NEW.application_number := 'EMP-AWARD-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(seq_num::text, 5, '0');
  NEW.submitted_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_employee_award_number ON public.employee_award_registrations;
CREATE TRIGGER trigger_generate_employee_award_number
  BEFORE INSERT ON public.employee_award_registrations
  FOR EACH ROW
  WHEN (NEW.application_number IS NULL)
  EXECUTE FUNCTION public.generate_employee_award_number();

-- ===============================================================
-- 20. RLS — ensure base tables have RLS (safe IF NOT EXISTS style)
-- ===============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'events', 'activity_categories', 'event_activity_categories',
    'registrations', 'guests', 'passes', 'payments',
    'check_in_logs', 'concert_settings', 'concert_artists',
    'blog_posts', 'employee_award_registrations'
  ]) LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;

-- Service role full access (safe, idempotent)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'events', 'activity_categories', 'event_activity_categories',
    'registrations', 'guests', 'passes', 'payments',
    'check_in_logs', 'concert_settings', 'concert_artists',
    'blog_posts', 'employee_award_registrations'
  ]) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "service_role_full_access_%I" ON public.%I;', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "service_role_full_access_%I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Admin read policies (safe, idempotent)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'events', 'registrations', 'passes', 'payments',
    'guests', 'check_in_logs', 'concert_settings',
    'concert_artists', 'blog_posts', 'employee_award_registrations',
    'activity_categories', 'event_activity_categories'
  ]) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "admins_read_%I" ON public.%I;', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "admins_read_%I" ON public.%I FOR SELECT TO authenticated USING (public.is_admin());',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Admin insert/update/delete policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'events', 'registrations', 'passes', 'payments',
    'guests', 'check_in_logs', 'concert_settings',
    'concert_artists', 'blog_posts', 'employee_award_registrations',
    'activity_categories', 'event_activity_categories'
  ]) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "admins_insert_%I" ON public.%I;', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "admins_insert_%I" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin());',
      tbl, tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "admins_update_%I" ON public.%I;', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "admins_update_%I" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());',
      tbl, tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "admins_delete_%I" ON public.%I;', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "admins_delete_%I" ON public.%I FOR DELETE TO authenticated USING (public.is_admin());',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Public read policies
DROP POLICY IF EXISTS "public_read_active_events" ON public.events;
CREATE POLICY "public_read_active_events" ON public.events
  FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "public_read_active_categories" ON public.activity_categories;
CREATE POLICY "public_read_active_categories" ON public.activity_categories
  FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "public_read_event_categories" ON public.event_activity_categories;
CREATE POLICY "public_read_event_categories" ON public.event_activity_categories
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "public_read_published_concert" ON public.concert_settings;
CREATE POLICY "public_read_published_concert" ON public.concert_settings
  FOR SELECT TO public USING (is_published = true);

DROP POLICY IF EXISTS "public_read_active_artists" ON public.concert_artists;
CREATE POLICY "public_read_active_artists" ON public.concert_artists
  FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "public_read_published_blog" ON public.blog_posts;
CREATE POLICY "public_read_published_blog" ON public.blog_posts
  FOR SELECT TO public USING (status = 'published');

-- ===============================================================
-- 21. GRANTS
-- ===============================================================
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ===============================================================
-- 22. PUBLIC ENTRY PASSES (legacy) — ensure it exists
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.public_entry_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_name TEXT NOT NULL,
  event_name TEXT NOT NULL DEFAULT 'Telent Fest',
  entry_number TEXT UNIQUE NOT NULL,
  qr_value TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  pass_status TEXT DEFAULT 'generated',
  status TEXT DEFAULT 'generated',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===============================================================
-- 23. ADMIN ACTIVITY TABLE — ensure it exists
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.admin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entry_number TEXT,
  participant_name TEXT,
  admin_email TEXT,
  pass_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================================================
-- 24. GALLERY TABLES — ensure they exist
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.gallery_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gallery_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.gallery_cities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  category TEXT NOT NULL DEFAULT 'Photos',
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================================================
-- 25. STORAGE BUCKETS SETUP (run ONCE after creating buckets)
-- ===============================================================
-- IMPORTANT: Run this part AFTER creating the storage buckets in the dashboard:
--  1. Go to Storage → Create bucket "event-images" (public)
--  2. Create bucket "participant-photos" (public)
--  3. Then run the SQL below
--
-- ===============================================================
-- Storage bucket policies (runs safely even if bucket not yet created)
-- ===============================================================
DO $$
DECLARE
  bucket_id TEXT;
BEGIN
  -- event-images: public read, admin write
  FOR bucket_id IN SELECT id FROM storage.buckets WHERE id = 'event-images' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public_read_%I" ON storage.objects;', bucket_id);
    EXECUTE format('CREATE POLICY "public_read_%I" ON storage.objects FOR SELECT TO public USING (bucket_id = %L);', bucket_id, bucket_id);
    EXECUTE format('DROP POLICY IF EXISTS "admin_insert_%I" ON storage.objects;', bucket_id);
    EXECUTE format('CREATE POLICY "admin_insert_%I" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L AND public.is_admin());', bucket_id, bucket_id);
    EXECUTE format('DROP POLICY IF EXISTS "admin_update_%I" ON storage.objects;', bucket_id);
    EXECUTE format('CREATE POLICY "admin_update_%I" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L AND public.is_admin());', bucket_id, bucket_id);
  END LOOP;

  -- participant-photos: public read, service role write
  FOR bucket_id IN SELECT id FROM storage.buckets WHERE id = 'participant-photos' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public_read_%I" ON storage.objects;', bucket_id);
    EXECUTE format('CREATE POLICY "public_read_%I" ON storage.objects FOR SELECT TO public USING (bucket_id = %L);', bucket_id, bucket_id);
    EXECUTE format('DROP POLICY IF EXISTS "service_insert_%I" ON storage.objects;', bucket_id);
    EXECUTE format('CREATE POLICY "service_insert_%I" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = %L);', bucket_id, bucket_id);
    EXECUTE format('DROP POLICY IF EXISTS "service_update_%I" ON storage.objects;', bucket_id);
    EXECUTE format('CREATE POLICY "service_update_%I" ON storage.objects FOR UPDATE TO service_role USING (bucket_id = %L);', bucket_id, bucket_id);
  END LOOP;
END $$;

-- ===============================================================
-- 26. POSTGREST SCHEMA RELOAD
-- ===============================================================
NOTIFY pgrst, 'reload schema';
