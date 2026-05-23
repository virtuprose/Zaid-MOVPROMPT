ALTER TABLE public.brand_identities
  ADD COLUMN IF NOT EXISTS lighting_style text,
  ADD COLUMN IF NOT EXISTS finish_vibe text,
  ADD COLUMN IF NOT EXISTS pacing text,
  ADD COLUMN IF NOT EXISTS logo_treatment text,
  ADD COLUMN IF NOT EXISTS brand_voice text,
  ADD COLUMN IF NOT EXISTS industry text;