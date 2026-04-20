ALTER TABLE public.generation_events ADD COLUMN user_id uuid;
CREATE INDEX IF NOT EXISTS idx_generation_events_user_id ON public.generation_events(user_id);