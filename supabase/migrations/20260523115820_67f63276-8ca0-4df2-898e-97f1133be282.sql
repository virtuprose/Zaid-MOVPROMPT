-- 1) generation_events: prevent anon users from spoofing arbitrary user_id values.
-- Anonymous inserts may only post events with user_id IS NULL; authenticated
-- inserts must match auth.uid().
DROP POLICY IF EXISTS "Anyone can insert generation events" ON public.generation_events;

CREATE POLICY "Anon can insert anonymous generation events"
  ON public.generation_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated can insert own generation events"
  ON public.generation_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2) preset_preview_meta: stop leaking the admin UUID (generated_by) to the public.
-- Revoke column-level SELECT on generated_by from anon + authenticated so the
-- existing public-read policy can no longer expose it. Admins keep full access
-- via the existing "Admins can manage preset preview meta" ALL policy.
REVOKE SELECT (generated_by) ON public.preset_preview_meta FROM anon;
REVOKE SELECT (generated_by) ON public.preset_preview_meta FROM authenticated;

-- 3) referral_codes: drop the public read policy that exposed every user's
-- referral code + user_id mapping. Lookups must now go through the existing
-- SECURITY DEFINER RPC `attribute_referral(_code text)`, which resolves a
-- single code without leaking the full table.
DROP POLICY IF EXISTS "Anyone can resolve a code" ON public.referral_codes;