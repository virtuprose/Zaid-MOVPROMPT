DROP POLICY IF EXISTS "Public can read active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Public can read non-expired shared prompts" ON public.shared_prompts;
DROP POLICY IF EXISTS "Public can read active welcome popups" ON public.welcome_popups;