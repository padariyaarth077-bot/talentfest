-- ============================================
-- STORAGE POLICIES FOR PARTICIPANT PHOTOS
-- Run this separately after bucket creation
-- ============================================

-- Allow public read (needed for PDF rendering)
CREATE POLICY "Public read participant-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'participant-photos');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload participant photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'participant-photos'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- Allow service role full access
CREATE POLICY "Service role full access participant-photos"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'participant-photos')
WITH CHECK (bucket_id = 'participant-photos');

-- Allow admins to manage
CREATE POLICY "Admins manage participant-photos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'participant-photos'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'participant-photos'
  AND public.is_admin()
);
