
-- 1) shared_prompts: add owner SELECT policy; keep public access through the view
CREATE POLICY "Owners can read their shared prompts"
ON public.shared_prompts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Make the public view bypass RLS (it already excludes user_id and filters expired rows)
ALTER VIEW public.shared_prompts_public SET (security_invoker = false);
GRANT SELECT ON public.shared_prompts_public TO anon, authenticated;

-- 2) director-uploads: replace INSERT policy with a stricter path check
DROP POLICY IF EXISTS "Users upload own director uploads" ON storage.objects;
CREATE POLICY "Users upload own director uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'director-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND name LIKE (auth.uid()::text || '/%')
  AND position('..' in name) = 0
);

-- Apply same hardening to read/delete for consistency
DROP POLICY IF EXISTS "Users read own director uploads" ON storage.objects;
CREATE POLICY "Users read own director uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'director-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND name LIKE (auth.uid()::text || '/%')
  AND position('..' in name) = 0
);

DROP POLICY IF EXISTS "Users delete own director uploads" ON storage.objects;
CREATE POLICY "Users delete own director uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'director-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND name LIKE (auth.uid()::text || '/%')
  AND position('..' in name) = 0
);
