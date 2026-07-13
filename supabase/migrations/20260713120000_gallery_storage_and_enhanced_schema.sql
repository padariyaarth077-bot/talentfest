-- Gallery Storage Bucket and Enhanced Schema Migration
-- Run this in Supabase SQL Editor

-- ===============================================================
-- 1. CREATE STORAGE BUCKET FOR GALLERY IMAGES
-- ===============================================================
-- Note: Storage buckets are created via Supabase Dashboard or CLI
-- This migration documents the required configuration:
--
-- Bucket name: gallery-images
-- Public: true (for public read access)
-- File size limit: 8MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Run this in Supabase Dashboard > Storage > Create bucket:
--   Name: gallery-images
--   Public bucket: ✓
--   File size limit: 8MB
--   Allowed MIME types: image/jpeg, image/png, image/webp

-- ===============================================================
-- 2. ENHANCE GALLERY_MEDIA TABLE WITH NEW FIELDS
-- ===============================================================
ALTER TABLE public.gallery_media
ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fit_mode text NOT NULL DEFAULT 'contain'
  CHECK (fit_mode IN ('contain', 'cover')),
ADD COLUMN IF NOT EXISTS fit_position text NOT NULL DEFAULT 'center'
  CHECK (fit_position IN ('center', 'top', 'bottom', 'left', 'right')),
ADD COLUMN IF NOT EXISTS width integer,
ADD COLUMN IF NOT EXISTS height integer,
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS alt_text text;

-- ===============================================================
-- 3. ADD INDEXES FOR NEW FIELDS
-- ===============================================================
CREATE INDEX IF NOT EXISTS gallery_media_is_featured_idx
  ON public.gallery_media(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS gallery_media_storage_path_idx
  ON public.gallery_media(storage_path);

-- ===============================================================
-- 4. UPDATE EXISTING RECORDS WITH DEFAULTS
-- ===============================================================
UPDATE public.gallery_media
SET
  is_featured = COALESCE(is_featured, false),
  fit_mode = COALESCE(fit_mode, 'contain'),
  fit_position = COALESCE(fit_position, 'center')
WHERE is_featured IS NULL OR fit_mode IS NULL OR fit_position IS NULL;

-- ===============================================================
-- 5. STORAGE POLICIES FOR gallery-images BUCKET
-- ===============================================================
-- Run these in Supabase Dashboard > Storage > gallery-images > Policies

-- Policy 1: Public read access
-- CREATE POLICY "Public read access" ON storage.objects
--   FOR SELECT TO anon, authenticated
--   USING (bucket_id = 'gallery-images');

-- Policy 2: Admin upload
-- CREATE POLICY "Admin upload" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'gallery-images' AND
--     (storage.foldername(name))[1] = 'gallery-images' AND
--     public.is_admin()
--   );

-- Policy 3: Admin update
-- CREATE POLICY "Admin update" ON storage.objects
--   FOR UPDATE TO authenticated
--   USING (
--     bucket_id = 'gallery-images' AND
--     public.is_admin()
--   )
--   WITH CHECK (
--     bucket_id = 'gallery-images' AND
--     public.is_admin()
--   );

-- Policy 4: Admin delete
-- CREATE POLICY "Admin delete" ON storage.objects
--   FOR DELETE TO authenticated
--   USING (
--     bucket_id = 'gallery-images' AND
--     public.is_admin()
--   );

-- ===============================================================
-- 6. CREATE GALLERY_CITIES IF NOT EXISTS (from previous migration)
-- ===============================================================
-- This is idempotent - safe to re-run

CREATE TABLE IF NOT EXISTS public.gallery_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.gallery_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES public.gallery_cities(id) ON DELETE SET NULL,
  title text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  category text NOT NULL DEFAULT 'Photos',
  media_url text NOT NULL,
  thumbnail_url text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  fit_mode text NOT NULL DEFAULT 'contain' CHECK (fit_mode IN ('contain', 'cover')),
  fit_position text NOT NULL DEFAULT 'center' CHECK (fit_position IN ('center', 'top', 'bottom', 'left', 'right')),
  width integer,
  height integer,
  storage_path text,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS gallery_cities_active_order_idx
  ON public.gallery_cities(is_active, display_order, name);

CREATE INDEX IF NOT EXISTS gallery_media_city_active_order_idx
  ON public.gallery_media(city_id, is_active, display_order, created_at DESC);

CREATE INDEX IF NOT EXISTS gallery_media_type_category_idx
  ON public.gallery_media(media_type, category);

CREATE INDEX IF NOT EXISTS gallery_media_is_featured_idx
  ON public.gallery_media(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS gallery_media_storage_path_idx
  ON public.gallery_media(storage_path);

-- RLS
ALTER TABLE public.gallery_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active gallery cities" ON public.gallery_cities;
CREATE POLICY "Public can read active gallery cities"
  ON public.gallery_cities
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage gallery cities" ON public.gallery_cities;
CREATE POLICY "Admins can manage gallery cities"
  ON public.gallery_cities
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can read active gallery media" ON public.gallery_media;
CREATE POLICY "Public can read active gallery media"
  ON public.gallery_media
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.gallery_cities c
      WHERE c.id = gallery_media.city_id
        AND c.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage gallery media" ON public.gallery_media;
CREATE POLICY "Admins can manage gallery media"
  ON public.gallery_media
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed default cities
INSERT INTO public.gallery_cities (name, slug, display_order, is_active)
VALUES
  ('Vadodara', 'vadodara', 1, true),
  ('Surat', 'surat', 2, true),
  ('Rajkot', 'rajkot', 3, true),
  ('Ahmedabad', 'ahmedabad', 4, true),
  ('Somnath', 'somnath', 5, true),
  ('Kutch', 'kutch', 6, true),
  ('Bhavnagar', 'bhavnagar', 7, true),
  ('Junagadh', 'junagadh', 8, true)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();