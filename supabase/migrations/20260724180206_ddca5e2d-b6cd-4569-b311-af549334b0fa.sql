
CREATE POLICY "Users read own ad-concepts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ad-concepts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users insert own ad-concepts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-concepts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own ad-concepts"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ad-concepts' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'ad-concepts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own ad-concepts"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ad-concepts' AND (storage.foldername(name))[1] = auth.uid()::text);
