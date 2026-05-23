CREATE TABLE public.product_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'angle',
  image_path text NOT NULL,
  label text,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_references_kit ON public.product_references (brand_kit_id, position);
CREATE INDEX idx_product_references_user ON public.product_references (user_id);

ALTER TABLE public.product_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own product references"
  ON public.product_references FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own product references"
  ON public.product_references FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own product references"
  ON public.product_references FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own product references"
  ON public.product_references FOR DELETE TO authenticated
  USING (auth.uid() = user_id);