
CREATE POLICY "Users manage own pass photos" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'pass-photos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'pass-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
