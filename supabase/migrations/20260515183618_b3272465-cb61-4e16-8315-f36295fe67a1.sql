
-- Convert brand_kits to many-per-user
ALTER TABLE public.brand_kits DROP CONSTRAINT brand_kits_pkey;
ALTER TABLE public.brand_kits ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.brand_kits ADD CONSTRAINT brand_kits_pkey PRIMARY KEY (id);
CREATE INDEX IF NOT EXISTS brand_kits_user_id_idx ON public.brand_kits(user_id);

-- Selection table
CREATE TABLE public.brand_kit_selection (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_kit_id uuid REFERENCES public.brand_kits(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_kit_selection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own brand selection"
  ON public.brand_kit_selection FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own brand selection"
  ON public.brand_kit_selection FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own brand selection"
  ON public.brand_kit_selection FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own brand selection"
  ON public.brand_kit_selection FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
