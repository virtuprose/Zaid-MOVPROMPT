
CREATE TABLE public.ad_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  concept_source TEXT NOT NULL DEFAULT 'text' CHECK (concept_source IN ('text','video')),
  concept_input TEXT,
  concept_video_url TEXT,
  template_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  aspect_ratio TEXT DEFAULT '9:16',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_templates TO authenticated;
GRANT ALL ON public.ad_templates TO service_role;

ALTER TABLE public.ad_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ad templates"
  ON public.ad_templates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX ad_templates_user_id_idx ON public.ad_templates(user_id);
CREATE INDEX ad_templates_status_idx ON public.ad_templates(status);

CREATE TRIGGER ad_templates_updated_at
  BEFORE UPDATE ON public.ad_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_agent_profiles_updated_at();
