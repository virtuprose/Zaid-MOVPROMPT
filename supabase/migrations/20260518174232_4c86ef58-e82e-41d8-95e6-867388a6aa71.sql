
-- Multi-select selections for brand kits and character kits
CREATE TABLE IF NOT EXISTS public.brand_kit_selections (
  user_id uuid NOT NULL,
  brand_kit_id uuid NOT NULL REFERENCES public.brand_kits(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, brand_kit_id)
);

CREATE TABLE IF NOT EXISTS public.character_kit_selections (
  user_id uuid NOT NULL,
  character_kit_id uuid NOT NULL REFERENCES public.character_kits(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, character_kit_id)
);

ALTER TABLE public.brand_kit_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_kit_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own brand selections" ON public.brand_kit_selections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own brand selections" ON public.brand_kit_selections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own brand selections" ON public.brand_kit_selections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own brand selections" ON public.brand_kit_selections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users read own character selections" ON public.character_kit_selections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own character selections" ON public.character_kit_selections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own character selections" ON public.character_kit_selections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own character selections" ON public.character_kit_selections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Migrate prior single-row selections (best-effort)
INSERT INTO public.brand_kit_selections (user_id, brand_kit_id, position)
SELECT user_id, brand_kit_id, 0
FROM public.brand_kit_selection
WHERE brand_kit_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.character_kit_selections (user_id, character_kit_id, position)
SELECT user_id, character_kit_id, 0
FROM public.character_kit_selection
WHERE character_kit_id IS NOT NULL
ON CONFLICT DO NOTHING;
