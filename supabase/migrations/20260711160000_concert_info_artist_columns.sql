  -- SAFE MIGRATION: Create concert tables if missing, then add new columns
  -- Safe to run whether tables exist or not

  -- ============================================================
  -- Create concert_settings table (if not already exists)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS public.concert_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eyebrow TEXT NOT NULL DEFAULT 'Live Concert',
    title TEXT NOT NULL DEFAULT 'Concert Information',
    subtitle TEXT NOT NULL DEFAULT '',
    event_label TEXT NOT NULL DEFAULT 'Grand Finale',
    event_title TEXT NOT NULL DEFAULT 'TelentFest Grand Finale',
    venue TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    event_date TEXT,
    start_time TEXT,
    end_time TEXT,
    price_text TEXT NOT NULL DEFAULT '',
    button_text TEXT NOT NULL DEFAULT 'Registration Form',
    button_url TEXT NOT NULL DEFAULT '/registration',
    map_url TEXT NOT NULL DEFAULT '',
    map_embed_url TEXT NOT NULL DEFAULT '',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================================
  -- Add any missing columns (safe if table already existed)
  -- ============================================================
  ALTER TABLE public.concert_settings
    ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS end_time TEXT,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

  CREATE INDEX IF NOT EXISTS concert_settings_updated_at_idx
    ON public.concert_settings(updated_at DESC);
  CREATE INDEX IF NOT EXISTS concert_settings_is_published_idx
    ON public.concert_settings(is_published);

  -- ============================================================
  -- Create concert_artists table (if not already exists)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS public.concert_artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concert_info_id UUID REFERENCES public.concert_settings(id) ON DELETE CASCADE,
    artist_name TEXT NOT NULL,
    performance_type TEXT NOT NULL DEFAULT '',
    description TEXT,
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- ============================================================
  -- Add any missing columns (safe if table already existed)
  -- ============================================================
  ALTER TABLE public.concert_artists
    ADD COLUMN IF NOT EXISTS concert_info_id UUID REFERENCES public.concert_settings(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

  CREATE INDEX IF NOT EXISTS concert_artists_concert_info_id_idx
    ON public.concert_artists(concert_info_id);
  CREATE INDEX IF NOT EXISTS concert_artists_display_order_idx
    ON public.concert_artists(display_order);

  -- ============================================================
  -- RLS: enable + policies
  -- ============================================================
  ALTER TABLE public.concert_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.concert_artists ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Public can read published concert settings" ON public.concert_settings;
  CREATE POLICY "Public can read published concert settings"
    ON public.concert_settings FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

  DROP POLICY IF EXISTS "Public can read active concert artists" ON public.concert_artists;
  CREATE POLICY "Public can read active concert artists"
    ON public.concert_artists FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

  DROP POLICY IF EXISTS "Admins can read all concert settings" ON public.concert_settings;
  CREATE POLICY "Admins can read all concert settings"
    ON public.concert_settings FOR SELECT
    TO authenticated
    USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can insert concert settings" ON public.concert_settings;
  CREATE POLICY "Admins can insert concert settings"
    ON public.concert_settings FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can update concert settings" ON public.concert_settings;
  CREATE POLICY "Admins can update concert settings"
    ON public.concert_settings FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can delete concert settings" ON public.concert_settings;
  CREATE POLICY "Admins can delete concert settings"
    ON public.concert_settings FOR DELETE
    TO authenticated
    USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can read all concert artists" ON public.concert_artists;
  CREATE POLICY "Admins can read all concert artists"
    ON public.concert_artists FOR SELECT
    TO authenticated
    USING (public.is_admin());

  DROP POLICY IF EXISTS "Admins can insert concert artists" ON public.concert_artists;
  CREATE POLICY "Admins can insert concert artists"
    ON public.concert_artists FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can update concert artists" ON public.concert_artists;
  CREATE POLICY "Admins can update concert artists"
    ON public.concert_artists FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

  DROP POLICY IF EXISTS "Admins can delete concert artists" ON public.concert_artists;
  CREATE POLICY "Admins can delete concert artists"
    ON public.concert_artists FOR DELETE
    TO authenticated
    USING (public.is_admin());
