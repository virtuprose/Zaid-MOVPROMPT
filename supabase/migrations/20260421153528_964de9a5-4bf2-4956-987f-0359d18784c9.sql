-- Track which model generated each preset preview video.
CREATE TABLE IF NOT EXISTS public.preset_preview_meta (
  preset_id text PRIMARY KEY,
  preview_model text,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  generated_by uuid
);

ALTER TABLE public.preset_preview_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preset preview meta"
  ON public.preset_preview_meta
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage preset preview meta"
  ON public.preset_preview_meta
  FOR ALL
  TO authenticated
  USING (has_role('admin'::app_role))
  WITH CHECK (has_role('admin'::app_role));
