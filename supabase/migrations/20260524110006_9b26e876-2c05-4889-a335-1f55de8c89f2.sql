-- Restrict direct SELECT on preset_preview_meta to admins; expose a public view that omits the admin UUID.
DROP POLICY IF EXISTS "Anyone can view preset preview meta" ON public.preset_preview_meta;

CREATE POLICY "Admins can read preset preview meta"
  ON public.preset_preview_meta
  FOR SELECT
  TO authenticated
  USING (has_role('admin'::app_role));

CREATE OR REPLACE VIEW public.preset_preview_meta_public
WITH (security_invoker = on) AS
  SELECT preset_id, generated_at, preview_model
  FROM public.preset_preview_meta;

GRANT SELECT ON public.preset_preview_meta_public TO anon, authenticated;