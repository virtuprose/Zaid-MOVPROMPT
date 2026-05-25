
-- Fix Security Definer Views by switching to security_invoker
-- and protecting sensitive columns via column-level privileges + RLS

-- ============ announcements ============
ALTER VIEW public.announcements_public SET (security_invoker = true);

CREATE POLICY "Public can read active announcements"
ON public.announcements
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now())
);

REVOKE SELECT ON public.announcements FROM anon, authenticated;
GRANT SELECT (id, title, title_ar, message, message_ar, link_url, link_text, link_text_ar, type, is_active, starts_at, ends_at, created_at)
  ON public.announcements TO anon, authenticated;

-- ============ welcome_popups ============
ALTER VIEW public.welcome_popups_public SET (security_invoker = true);

CREATE POLICY "Public can read active welcome popups"
ON public.welcome_popups
FOR SELECT
TO anon, authenticated
USING (is_active = true);

REVOKE SELECT ON public.welcome_popups FROM anon, authenticated;
GRANT SELECT (id, title, title_ar, message, message_ar, image_url, link_url, link_text, link_text_ar, is_active, created_at)
  ON public.welcome_popups TO anon, authenticated;

-- ============ shared_prompts ============
ALTER VIEW public.shared_prompts_public SET (security_invoker = true);

CREATE POLICY "Public can read non-expired shared prompts"
ON public.shared_prompts
FOR SELECT
TO anon, authenticated
USING (expires_at IS NULL OR expires_at > now());

REVOKE SELECT ON public.shared_prompts FROM anon, authenticated;
GRANT SELECT (id, slug, title, agent_name, workflow_type, target_model, results, view_count, expires_at, created_at, updated_at, featured, featured_at)
  ON public.shared_prompts TO anon, authenticated;
