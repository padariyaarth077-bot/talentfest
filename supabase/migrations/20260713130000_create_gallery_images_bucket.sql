-- ============================================================
-- TELENTFEST: Create gallery-images storage bucket and policies
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ============================================================
-- 1. CREATE OR UPDATE THE STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'gallery-images',
  'gallery-images',
  true,
  8388608,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  name              = EXCLUDED.name,
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 2. STORAGE POLICIES
-- ============================================================

-- 2a. Public read — anyone can view gallery images
DROP POLICY IF EXISTS "Gallery images public read" ON storage.objects;
CREATE POLICY "Gallery images public read"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'gallery-images'
);

-- 2b. Admin insert — only authenticated admins can upload
DROP POLICY IF EXISTS "Gallery images admin insert" ON storage.objects;
CREATE POLICY "Gallery images admin insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gallery-images'
  AND public.is_admin()
);

-- 2c. Admin update — only authenticated admins can update
DROP POLICY IF EXISTS "Gallery images admin update" ON storage.objects;
CREATE POLICY "Gallery images admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gallery-images'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'gallery-images'
  AND public.is_admin()
);

-- 2d. Admin delete — only authenticated admins can delete
DROP POLICY IF EXISTS "Gallery images admin delete" ON storage.objects;
CREATE POLICY "Gallery images admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'gallery-images'
  AND public.is_admin()
);
