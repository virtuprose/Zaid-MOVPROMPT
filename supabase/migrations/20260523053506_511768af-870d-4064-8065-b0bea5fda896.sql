CREATE TABLE public.brand_identities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  logo_path TEXT,
  primary_color TEXT,
  supporting_colors JSONB,
  avoid_colors JSONB,
  typography_vibe TEXT,
  font_hint TEXT,
  mood_notes TEXT,
  tagline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own brand identity" ON public.brand_identities
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own brand identity" ON public.brand_identities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own brand identity" ON public.brand_identities
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own brand identity" ON public.brand_identities
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_brand_identities_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_brand_identities_updated_at
  BEFORE UPDATE ON public.brand_identities
  FOR EACH ROW EXECUTE FUNCTION public.touch_brand_identities_updated_at();