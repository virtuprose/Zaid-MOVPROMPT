ALTER TABLE public.brand_kits
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS visual_parts text,
  ADD COLUMN IF NOT EXISTS materials text,
  ADD COLUMN IF NOT EXISTS hero_colors jsonb,
  ADD COLUMN IF NOT EXISTS packaging text;