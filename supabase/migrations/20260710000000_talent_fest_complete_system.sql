  -- TALENT FEST COMPLETE REGISTRATION SYSTEM
  -- This migration adds all new tables for the full participant/visitor pass system
  -- Does not modify or break existing tables

  -- ============================================
  -- EVENTS TABLE
  -- ============================================
  CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    city_code TEXT NOT NULL,
    event_image_url TEXT,
    event_date DATE,
    start_time TIME,
    venue TEXT,
    participant_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    visitor_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    guest_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    participant_capacity INTEGER NOT NULL DEFAULT 0,
    visitor_capacity INTEGER NOT NULL DEFAULT 0,
    guest_capacity INTEGER NOT NULL DEFAULT 0,
    maximum_guests_per_participant INTEGER NOT NULL DEFAULT 2,
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,
    registration_status TEXT NOT NULL DEFAULT 'inactive' CHECK (registration_status IN ('inactive', 'active', 'closed', 'full')),
    visitor_registration_enabled BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================
  -- ACTIVITY CATEGORIES TABLE
  -- ============================================
  CREATE TABLE IF NOT EXISTS public.activity_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================
  -- EVENT ACTIVITY CATEGORIES (junction table)
  -- ============================================
  CREATE TABLE IF NOT EXISTS public.event_activity_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    activity_category_id UUID NOT NULL REFERENCES public.activity_categories(id) ON DELETE CASCADE,
    capacity INTEGER,
    registration_status TEXT NOT NULL DEFAULT 'active' CHECK (registration_status IN ('active', 'closed', 'full')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, activity_category_id)
  );

  -- ============================================
  -- REGISTRATIONS TABLE
  -- ============================================
  CREATE SEQUENCE IF NOT EXISTS public.registration_number_seq START 1;

  CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT UNIQUE,
    registration_type TEXT NOT NULL CHECK (registration_type IN ('participant', 'visitor')),
    event_id UUID NOT NULL REFERENCES public.events(id),
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    encrypted_aadhaar TEXT,
    aadhaar_last_four TEXT,
    aadhaar_consent BOOLEAN NOT NULL DEFAULT false,
    activity_category_id UUID REFERENCES public.activity_categories(id),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
    registration_status TEXT NOT NULL DEFAULT 'pending' CHECK (registration_status IN ('pending', 'confirmed', 'cancelled', 'expired')),
    reservation_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================
  -- GUESTS TABLE
  -- ============================================
  CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    guest_number INTEGER NOT NULL CHECK (guest_number IN (1, 2)),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(registration_id, guest_number)
  );

  -- ============================================
  -- PASSES TABLE
  -- ============================================
  CREATE SEQUENCE IF NOT EXISTS public.pass_number_seq START 1;

  CREATE TABLE IF NOT EXISTS public.passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
    pass_number TEXT UNIQUE NOT NULL,
    pass_type TEXT NOT NULL CHECK (pass_type IN ('participant', 'guest_1', 'guest_2', 'visitor')),
    secure_qr_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    secure_qr_token_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'checked_in', 'revoked', 'expired')),
    checked_in BOOLEAN NOT NULL DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================
  -- PAYMENTS TABLE
  -- ============================================
  CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'razorpay',
    order_id TEXT,
    transaction_id TEXT UNIQUE,
    payment_signature_reference TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================
  -- CHECK-IN LOGS TABLE
  -- ============================================
  CREATE TABLE IF NOT EXISTS public.check_in_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pass_id UUID NOT NULL REFERENCES public.passes(id) ON DELETE CASCADE,
    admin_user_id TEXT,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    action TEXT NOT NULL,
    checked_in_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================
  -- PASS DOWNLOAD LOGS TABLE
  -- ============================================
  CREATE TABLE IF NOT EXISTS public.pass_download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pass_id UUID NOT NULL REFERENCES public.passes(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    access_reference TEXT,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================
  -- PUBLIC CONCERT CONTENT TABLES
  -- ============================================
  CREATE TABLE IF NOT EXISTS public.concert_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eyebrow TEXT NOT NULL DEFAULT 'Live Concert',
    title TEXT NOT NULL DEFAULT 'Concert Information',
    subtitle TEXT NOT NULL DEFAULT '',
    event_label TEXT NOT NULL DEFAULT 'Grand Finale',
    event_title TEXT NOT NULL DEFAULT 'Telent Fest Grand Finale',
    venue TEXT NOT NULL DEFAULT '',
    event_date DATE,
    start_time TIME,
    price_text TEXT NOT NULL DEFAULT '',
    button_text TEXT NOT NULL DEFAULT 'Entry Pass',
    button_url TEXT NOT NULL DEFAULT '/entry-pass',
    map_url TEXT NOT NULL DEFAULT '',
    map_embed_url TEXT NOT NULL DEFAULT '',
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS public.concert_artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_name TEXT NOT NULL,
    performance_type TEXT NOT NULL DEFAULT '',
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================
  -- PUBLIC BLOG TABLE
  -- ============================================
  CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Updates',
    thumbnail_url TEXT,
    thumbnail_alt TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMPTZ,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================
  -- INDEXES
  -- ============================================
  CREATE INDEX IF NOT EXISTS registrations_event_id_idx ON public.registrations(event_id);
  CREATE INDEX IF NOT EXISTS registrations_payment_status_idx ON public.registrations(payment_status);
  CREATE INDEX IF NOT EXISTS registrations_registration_type_idx ON public.registrations(registration_type);
  CREATE INDEX IF NOT EXISTS registrations_email_idx ON public.registrations(email);
  CREATE INDEX IF NOT EXISTS registrations_phone_idx ON public.registrations(phone);
  CREATE INDEX IF NOT EXISTS passes_registration_id_idx ON public.passes(registration_id);
  CREATE INDEX IF NOT EXISTS passes_guest_id_idx ON public.passes(guest_id);
  CREATE INDEX IF NOT EXISTS passes_pass_type_idx ON public.passes(pass_type);
  CREATE INDEX IF NOT EXISTS passes_status_idx ON public.passes(status);
  CREATE INDEX IF NOT EXISTS passes_secure_qr_token_idx ON public.passes(secure_qr_token);
  CREATE INDEX IF NOT EXISTS passes_checked_in_idx ON public.passes(checked_in);
  CREATE INDEX IF NOT EXISTS payments_registration_id_idx ON public.payments(registration_id);
  CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments(order_id);
  CREATE INDEX IF NOT EXISTS check_in_logs_pass_id_idx ON public.check_in_logs(pass_id);
  CREATE INDEX IF NOT EXISTS event_activity_categories_event_id_idx ON public.event_activity_categories(event_id);
  CREATE INDEX IF NOT EXISTS concert_artists_display_order_idx ON public.concert_artists(display_order);
  CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts(slug);
  CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON public.blog_posts(status);

  -- ============================================
  -- AUTO-GENERATE REGISTRATION NUMBER FUNCTION
  -- ============================================
  CREATE OR REPLACE FUNCTION public.generate_registration_number()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
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

  CREATE TRIGGER trigger_generate_registration_number
    BEFORE INSERT ON public.registrations
    FOR EACH ROW
    WHEN (NEW.registration_number IS NULL)
    EXECUTE FUNCTION public.generate_registration_number();

  -- ============================================
  -- AUTO-GENERATE PASS NUMBER FUNCTION
  -- ============================================
  CREATE OR REPLACE FUNCTION public.generate_pass_number()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
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
    END;

    NEW.pass_number := 'TF' || year_code || '-' || event_city_code || '-' || prefix || '-' || lpad(seq_num::text, 6, '0');
    NEW.generated_at := now();
    NEW.status := 'active';
    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER trigger_generate_pass_number
    BEFORE INSERT ON public.passes
    FOR EACH ROW
    WHEN (NEW.pass_number IS NULL)
    EXECUTE FUNCTION public.generate_pass_number();

  -- ============================================
  -- SEED ACTIVITY CATEGORIES
  -- ============================================
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

  -- ============================================
  -- SEED EVENTS
  -- ============================================
  INSERT INTO public.events (name, slug, city, city_code, participant_price, visitor_price, guest_price, participant_capacity, visitor_capacity, guest_capacity, maximum_guests_per_participant, registration_status, visitor_registration_enabled, is_active)
  VALUES
    ('Telent Fest Ahmedabad', 'telent-fest-ahmedabad', 'Ahmedabad', 'AMD', 299, 199, 149, 500, 200, 200, 2, 'active', true, true),
    ('Telent Fest Surat', 'telent-fest-surat', 'Surat', 'SUR', 299, 199, 149, 500, 200, 200, 2, 'active', true, true),
    ('Telent Fest Vadodara', 'telent-fest-vadodara', 'Vadodara', 'VAD', 299, 199, 149, 500, 200, 200, 2, 'active', true, true),
    ('Telent Fest Rajkot', 'telent-fest-rajkot', 'Rajkot', 'RAJ', 299, 199, 149, 500, 200, 200, 2, 'active', true, true)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.concert_settings (eyebrow, title, subtitle, event_label, event_title, venue, event_date, start_time, price_text, button_text, button_url, map_url, map_embed_url, is_published)
  VALUES (
    'Live Concert',
    'Concert Information',
    'Experience live performances, celebrity acts, and cultural showcases from Telent Fest.',
    'Grand Finale',
    'Telent Fest Grand Finale',
    'Rajkot, Gujarat',
    '2026-07-26',
    '18:00',
    'Registration opens soon',
    'Entry Pass',
    '/entry-pass',
    'https://maps.google.com/?q=Rajkot%2C%20Gujarat',
    'https://maps.google.com/maps?q=Rajkot%2C%20Gujarat&z=12&output=embed',
    true
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.concert_artists (artist_name, performance_type, description, display_order, is_active) VALUES
    ('Aarav Mehta', 'Singer', 'Opening vocal performance', 1, true),
    ('Nritya Collective', 'Dance Crew', 'Cultural dance showcase', 2, true),
    ('Studio 47', 'Band', 'Live fusion set', 3, true),
    ('Neha Kapoor', 'Artist', 'Creative stage feature', 4, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.blog_posts (title, slug, excerpt, content, category, thumbnail_url, thumbnail_alt, status, published_at, is_featured, display_order) VALUES
    ('How to Prepare for Your Telent Fest Audition', 'prepare-for-telent-fest-audition', 'A practical checklist for polishing your act before audition day.', 'Prepare your performance, rehearse your timing, check your costume or instruments, and arrive early with your entry pass and ID.', 'Tips', '/gallery/vadodara/vadodara-real-03.jpg', 'Telent Fest stage performance', 'published', '2026-06-12', true, 1),
    ('Celebrating Winners Across Gujarat', 'celebrating-winners-across-gujarat', 'Stories from the artists and communities that make Telent Fest shine.', 'Telent Fest celebrates performers, mentors, and organizers who help local talent reach bigger stages.', 'Stories', '/gallery/surat/surat-real-01.jpg', 'Telent Fest award moment', 'published', '2026-05-28', false, 2),
    ('City Events Are Growing', 'city-events-are-growing', 'A look at how city-wise auditions are connecting more performers.', 'City-wise event galleries and local auditions help more artists participate close to home.', 'Updates', '/project-assets/registered-students-post.png', 'Telent Fest registered students poster', 'published', '2026-05-05', false, 3)
  ON CONFLICT (slug) DO UPDATE SET
    thumbnail_url = EXCLUDED.thumbnail_url,
    thumbnail_alt = EXCLUDED.thumbnail_alt,
    status = EXCLUDED.status,
    updated_at = now();

  -- ============================================
  -- LINK EVENTS TO ACTIVITY CATEGORIES
  -- ============================================
  DO $$
  DECLARE
    event_rec RECORD;
    cat_rec RECORD;
  BEGIN
    FOR event_rec IN SELECT id FROM public.events LOOP
      FOR cat_rec IN SELECT id FROM public.activity_categories LOOP
        INSERT INTO public.event_activity_categories (event_id, activity_category_id, registration_status)
        VALUES (event_rec.id, cat_rec.id, 'active')
        ON CONFLICT (event_id, activity_category_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END;
  $$;

  -- ============================================
  -- RLS POLICIES
  -- ============================================
  ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.event_activity_categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.check_in_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.pass_download_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.concert_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.concert_artists ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

  -- Public can read active events and categories
  CREATE POLICY "Public can read active events" ON public.events
    FOR SELECT USING (is_active = true);

  CREATE POLICY "Public can read active categories" ON public.activity_categories
    FOR SELECT USING (is_active = true);

  CREATE POLICY "Public can read event categories" ON public.event_activity_categories
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can read published concert settings" ON public.concert_settings;
  CREATE POLICY "Public can read published concert settings" ON public.concert_settings
    FOR SELECT USING (is_published = true);

  DROP POLICY IF EXISTS "Public can read active concert artists" ON public.concert_artists;
  CREATE POLICY "Public can read active concert artists" ON public.concert_artists
    FOR SELECT USING (is_active = true);

  DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;
  CREATE POLICY "Public can read published blog posts" ON public.blog_posts
    FOR SELECT USING (status = 'published');

  -- Service role and admin full access to all tables
  CREATE POLICY "Service role full access events" ON public.events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  CREATE POLICY "Service role full access categories" ON public.activity_categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  CREATE POLICY "Service role full access event_categories" ON public.event_activity_categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  CREATE POLICY "Service role full access registrations" ON public.registrations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  CREATE POLICY "Service role full access guests" ON public.guests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  CREATE POLICY "Service role full access passes" ON public.passes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  CREATE POLICY "Service role full access payments" ON public.payments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  CREATE POLICY "Service role full access check_in_logs" ON public.check_in_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  CREATE POLICY "Service role full access download_logs" ON public.pass_download_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Service role full access concert_settings" ON public.concert_settings;
  CREATE POLICY "Service role full access concert_settings" ON public.concert_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Service role full access concert_artists" ON public.concert_artists;
  CREATE POLICY "Service role full access concert_artists" ON public.concert_artists
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Service role full access blog_posts" ON public.blog_posts;
  CREATE POLICY "Service role full access blog_posts" ON public.blog_posts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

  -- Admin can read/edit via is_admin() function
  DROP POLICY IF EXISTS "Admins can read events" ON public.events;
  CREATE POLICY "Admins can read events" ON public.events
    FOR SELECT TO authenticated USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
  CREATE POLICY "Admins can insert events" ON public.events
    FOR INSERT TO authenticated WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can update events" ON public.events;
  CREATE POLICY "Admins can update events" ON public.events
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
  CREATE POLICY "Admins can delete events" ON public.events
    FOR DELETE TO authenticated USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can read registrations" ON public.registrations;
  CREATE POLICY "Admins can read registrations" ON public.registrations
    FOR SELECT TO authenticated USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can update registrations" ON public.registrations;
  CREATE POLICY "Admins can update registrations" ON public.registrations
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can read passes" ON public.passes;
  CREATE POLICY "Admins can read passes" ON public.passes
    FOR SELECT TO authenticated USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can update passes" ON public.passes;
  CREATE POLICY "Admins can update passes" ON public.passes
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can read payments" ON public.payments;
  CREATE POLICY "Admins can read payments" ON public.payments
    FOR SELECT TO authenticated USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can read guests" ON public.guests;
  CREATE POLICY "Admins can read guests" ON public.guests
    FOR SELECT TO authenticated USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can read check_in_logs" ON public.check_in_logs;
  CREATE POLICY "Admins can read check_in_logs" ON public.check_in_logs
    FOR SELECT TO authenticated USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can insert check_in_logs" ON public.check_in_logs;
  CREATE POLICY "Admins can insert check_in_logs" ON public.check_in_logs
    FOR INSERT TO authenticated WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can manage concert_settings" ON public.concert_settings;
  CREATE POLICY "Admins can manage concert_settings" ON public.concert_settings
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can manage concert_artists" ON public.concert_artists;
  CREATE POLICY "Admins can manage concert_artists" ON public.concert_artists
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can manage blog_posts" ON public.blog_posts;
  CREATE POLICY "Admins can manage blog_posts" ON public.blog_posts
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

  GRANT USAGE ON SEQUENCE public.registration_number_seq TO service_role;
  GRANT USAGE ON SEQUENCE public.pass_number_seq TO service_role;
