CREATE TABLE public.custom_presets (
  id text PRIMARY KEY,
  label text NOT NULL,
  group_id text NOT NULL,
  icon_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  best_for text NOT NULL DEFAULT '',
  anim_class text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.custom_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view custom presets"
  ON public.custom_presets FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage custom presets"
  ON public.custom_presets FOR ALL
  TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));