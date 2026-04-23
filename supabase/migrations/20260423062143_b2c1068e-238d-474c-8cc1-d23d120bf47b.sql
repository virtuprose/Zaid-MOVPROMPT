ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS admin_notes_updated_by uuid,
  ADD COLUMN IF NOT EXISTS admin_notes_updated_at timestamptz;