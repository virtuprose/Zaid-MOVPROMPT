
-- 1. Announcements: remove public select policy, expose safe view
DROP POLICY IF EXISTS "Anyone can view active announcements" ON public.announcements;

CREATE OR REPLACE VIEW public.announcements_public AS
SELECT id, type, is_active, starts_at, ends_at, link_url, link_text, link_text_ar,
       message, message_ar, title, title_ar, created_at
FROM public.announcements
WHERE is_active = true;

GRANT SELECT ON public.announcements_public TO anon, authenticated;

-- 2. Welcome popups: remove public select policy, expose safe view
DROP POLICY IF EXISTS "Anyone can view active welcome popups" ON public.welcome_popups;

CREATE OR REPLACE VIEW public.welcome_popups_public AS
SELECT id, title, title_ar, message, message_ar, image_url,
       link_url, link_text, link_text_ar, is_active, created_at
FROM public.welcome_popups
WHERE is_active = true;

GRANT SELECT ON public.welcome_popups_public TO anon, authenticated;

-- 3. Shared prompts: remove public select policy, expose safe view (no user_id)
DROP POLICY IF EXISTS "Anyone can view non-expired shared prompts" ON public.shared_prompts;

CREATE OR REPLACE VIEW public.shared_prompts_public AS
SELECT slug, title, workflow_type, target_model, agent_name, results,
       view_count, created_at, expires_at, featured, featured_at
FROM public.shared_prompts
WHERE expires_at IS NULL OR expires_at > now();

GRANT SELECT ON public.shared_prompts_public TO anon, authenticated;

-- 4. Storage: let users update/delete their own files in generation-images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'generation-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'generation-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'generation-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
