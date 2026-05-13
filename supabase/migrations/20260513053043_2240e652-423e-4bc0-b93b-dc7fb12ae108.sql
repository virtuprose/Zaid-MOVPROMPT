ALTER TABLE public.shared_prompts
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_shared_prompts_featured
  ON public.shared_prompts (featured, featured_at DESC NULLS LAST)
  WHERE featured = true;

CREATE INDEX IF NOT EXISTS idx_shared_prompts_featured_model
  ON public.shared_prompts (target_model, featured_at DESC NULLS LAST)
  WHERE featured = true;