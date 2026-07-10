-- ============================================
-- SAFE INCREMENTAL MIGRATION: Add visitor columns + missing tables
-- Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout
-- ============================================

-- ============================================
-- 1. Add visitor columns to events table (safe)
-- ============================================
DO $$
BEGIN
  -- visitor_registration_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'visitor_registration_enabled'
  ) THEN
    ALTER TABLE public.events ADD COLUMN visitor_registration_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- visitor_capacity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'visitor_capacity'
  ) THEN
    ALTER TABLE public.events ADD COLUMN visitor_capacity INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- visitor_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'visitor_price'
  ) THEN
    ALTER TABLE public.events ADD COLUMN visitor_price NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- registration_opens_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'registration_opens_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN registration_opens_at TIMESTAMPTZ;
  END IF;

  -- registration_closes_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'registration_closes_at'
  ) THEN
    ALTER TABLE public.events ADD COLUMN registration_closes_at TIMESTAMPTZ;
  END IF;

  -- is_active
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.events ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- event_image_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_image_url'
  ) THEN
    ALTER TABLE public.events ADD COLUMN event_image_url TEXT;
  END IF;

  -- start_time
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE public.events ADD COLUMN start_time TIME;
  END IF;

  -- venue
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'venue'
  ) THEN
    ALTER TABLE public.events ADD COLUMN venue TEXT;
  END IF;

  -- city_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'city_code'
  ) THEN
    ALTER TABLE public.events ADD COLUMN city_code TEXT NOT NULL DEFAULT '';
  END IF;

  -- maximum_guests_per_participant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'maximum_guests_per_participant'
  ) THEN
    ALTER TABLE public.events ADD COLUMN maximum_guests_per_participant INTEGER NOT NULL DEFAULT 2;
  END IF;

  -- guest_price
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'guest_price'
  ) THEN
    ALTER TABLE public.events ADD COLUMN guest_price NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- guest_capacity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'guest_capacity'
  ) THEN
    ALTER TABLE public.events ADD COLUMN guest_capacity INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- slug
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.events ADD COLUMN slug TEXT UNIQUE;
  END IF;
END $$;

-- ============================================
-- 2. Enable RLS on events if not already
-- ===========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'events' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- 3. Safe RLS policy for public event reads
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Public can read active events'
  ) THEN
    CREATE POLICY "Public can read active events" ON public.events
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- ============================================
-- 4. Seed events if table is empty
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events LIMIT 1) THEN
    INSERT INTO public.events (name, slug, city, city_code, event_date, venue, participant_price, visitor_price, guest_price, participant_capacity, visitor_capacity, guest_capacity, maximum_guests_per_participant, registration_status, visitor_registration_enabled, is_active)
    VALUES
      ('Talent Fest Ahmedabad', 'talent-fest-ahmedabad', 'Ahmedabad', 'AMD', '2026-12-12', 'Ahmedabad Convention Center', 299, 199, 149, 500, 200, 200, 2, 'active', true, true),
      ('Talent Fest Surat', 'talent-fest-surat', 'Surat', 'SUR', '2026-12-18', 'Surat Exhibition Hall', 299, 199, 149, 500, 200, 200, 2, 'active', true, true),
      ('Talent Fest Vadodara', 'talent-fest-vadodara', 'Vadodara', 'VAD', '2026-12-22', 'Vadodara Cultural Center', 299, 199, 149, 500, 200, 200, 2, 'active', true, true),
      ('Talent Fest Rajkot', 'talent-fest-rajkot', 'Rajkot', 'RAJ', '2026-12-28', 'Rajkot Sports Complex', 299, 199, 149, 500, 200, 200, 2, 'active', true, true);
  ELSE
    -- Update existing events to enable visitor registration
    UPDATE public.events SET
      visitor_registration_enabled = true,
      visitor_capacity = COALESCE(NULLIF(visitor_capacity, 0), 200),
      visitor_price = COALESCE(NULLIF(visitor_price, 0), 199),
      registration_status = 'active'
    WHERE visitor_registration_enabled IS DISTINCT FROM true
       OR visitor_capacity IS NULL OR visitor_capacity = 0
       OR visitor_price IS NULL OR visitor_price = 0
       OR registration_status IS DISTINCT FROM 'active';
  END IF;
END $$;

-- ============================================
-- 5. Create registrations table if missing
-- ============================================
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT UNIQUE,
  registration_type TEXT NOT NULL DEFAULT 'participant' CHECK (registration_type IN ('participant', 'visitor')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL DEFAULT '',
  middle_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  aadhaar_last_four TEXT,
  encrypted_aadhaar TEXT,
  aadhaar_consent BOOLEAN NOT NULL DEFAULT false,
  activity_category_id UUID,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  registration_status TEXT NOT NULL DEFAULT 'pending' CHECK (registration_status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  reservation_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- registration number sequence
CREATE SEQUENCE IF NOT EXISTS public.registration_number_seq START 1;

-- ============================================
-- 6. Registration number trigger (safe)
-- ============================================
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_generate_registration_number'
  ) THEN
    CREATE OR REPLACE FUNCTION public.generate_registration_number()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
    DECLARE
      ev_city_code TEXT;
      ev_year TEXT;
    BEGIN
      SELECT COALESCE(city_code, 'XX'), to_char(COALESCE(event_date, CURRENT_DATE), 'YYYY') INTO ev_city_code, ev_year
      FROM public.events WHERE id = NEW.event_id;
      NEW.registration_number := 'TF' || right(ev_year, 2) || '-' || ev_city_code || '-REG-' || lpad(nextval('public.registration_number_seq')::text, 6, '0');
      RETURN NEW;
    END; $func$;
    CREATE TRIGGER trigger_generate_registration_number
      BEFORE INSERT ON public.registrations
      FOR EACH ROW EXECUTE FUNCTION public.generate_registration_number();
  END IF;
END $do$;

-- ============================================
-- 7. Create passes table if missing
-- ============================================
CREATE TABLE IF NOT EXISTS public.passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  guest_id UUID,
  pass_number TEXT UNIQUE,
  pass_type TEXT NOT NULL CHECK (pass_type IN ('participant', 'visitor', 'guest_1', 'guest_2')),
  secure_qr_token TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired', 'cancelled')),
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pass number sequence
CREATE SEQUENCE IF NOT EXISTS public.pass_number_seq START 1;

-- ============================================
-- 8. Pass number + QR token trigger (safe)
-- ============================================
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_generate_pass_number'
  ) THEN
    CREATE OR REPLACE FUNCTION public.generate_pass_number_and_qr()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
    DECLARE
      ev_city_code TEXT;
      ev_year TEXT;
      type_code TEXT;
    BEGIN
      SELECT COALESCE(e.city_code, 'XX'), to_char(COALESCE(e.event_date, CURRENT_DATE), 'YYYY')
      INTO ev_city_code, ev_year
      FROM public.registrations r JOIN public.events e ON e.id = r.event_id
      WHERE r.id = NEW.registration_id;
      type_code := CASE NEW.pass_type
        WHEN 'visitor' THEN 'V'
        WHEN 'participant' THEN 'P'
        WHEN 'guest_1' THEN 'G1'
        WHEN 'guest_2' THEN 'G2'
        ELSE 'XX'
      END;
      NEW.pass_number := 'TF' || right(ev_year, 2) || '-' || ev_city_code || '-' || type_code || '-' || lpad(nextval('public.pass_number_seq')::text, 6, '0');
      NEW.secure_qr_token := encode(gen_random_bytes(32), 'hex');
      RETURN NEW;
    END; $func$;
    CREATE TRIGGER trigger_generate_pass_number
      BEFORE INSERT ON public.passes
      FOR EACH ROW EXECUTE FUNCTION public.generate_pass_number_and_qr();
  END IF;
END $do$;

-- ============================================
-- 9. Create payments table if missing
-- ============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  order_id TEXT,
  transaction_id TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 10. Create check_in_logs table if missing
-- ============================================
CREATE TABLE IF NOT EXISTS public.check_in_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id UUID NOT NULL REFERENCES public.passes(id) ON DELETE CASCADE,
  admin_user_id UUID,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'check_in',
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 11. Create guests table if missing
-- ============================================
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  guest_number INTEGER NOT NULL CHECK (guest_number IN (1, 2)),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 12. Create activity_categories table if missing
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 13. Create event_activity_categories table if missing
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  activity_category_id UUID NOT NULL REFERENCES public.activity_categories(id) ON DELETE CASCADE,
  capacity INTEGER,
  registration_status TEXT NOT NULL DEFAULT 'active' CHECK (registration_status IN ('active', 'inactive', 'full')),
  UNIQUE(event_id, activity_category_id)
);

-- ============================================
-- 14. Seed activity categories if empty
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.activity_categories LIMIT 1) THEN
    INSERT INTO public.activity_categories (name, slug, description) VALUES
      ('Singing', 'singing', 'Vocal performance and singing'),
      ('Dancing', 'dancing', 'Dance performances'),
      ('Instrumental Music', 'instrumental-music', 'Musical instrument performance'),
      ('Stand-up Comedy', 'stand-up-comedy', 'Comedy and humour performance'),
      ('Mimicry', 'mimicry', 'Mimicry and impressions'),
      ('Poetry', 'poetry', 'Poetry recitation'),
      ('Mono Acting', 'mono-acting', 'Solo acting performance'),
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

-- ============================================
-- 15. Link events to categories if not already linked
-- ============================================
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

-- ============================================
-- 16. RLS policies for new tables
-- ============================================
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_activity_categories ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'registrations' AND policyname = 'Service role full access registrations') THEN
    CREATE POLICY "Service role full access registrations" ON public.registrations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'passes' AND policyname = 'Service role full access passes') THEN
    CREATE POLICY "Service role full access passes" ON public.passes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Service role full access payments') THEN
    CREATE POLICY "Service role full access payments" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'check_in_logs' AND policyname = 'Service role full access check_in_logs') THEN
    CREATE POLICY "Service role full access check_in_logs" ON public.check_in_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'guests' AND policyname = 'Service role full access guests') THEN
    CREATE POLICY "Service role full access guests" ON public.guests FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_categories' AND policyname = 'Public can read activity categories') THEN
    CREATE POLICY "Public can read activity categories" ON public.activity_categories FOR SELECT TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_activity_categories' AND policyname = 'Service role full access event_activity_categories') THEN
    CREATE POLICY "Service role full access event_activity_categories" ON public.event_activity_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 17. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_registration_type ON public.registrations(registration_type);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON public.registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_registration_status ON public.registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_passes_registration_id ON public.passes(registration_id);
CREATE INDEX IF NOT EXISTS idx_passes_pass_type ON public.passes(pass_type);
CREATE INDEX IF NOT EXISTS idx_passes_secure_qr_token ON public.passes(secure_qr_token);
CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON public.payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_pass_id ON public.check_in_logs(pass_id);
CREATE INDEX IF NOT EXISTS idx_guests_registration_id ON public.guests(registration_id);
