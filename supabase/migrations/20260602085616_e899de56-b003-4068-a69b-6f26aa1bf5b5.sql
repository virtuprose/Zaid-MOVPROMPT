ALTER TABLE public.director_sessions
ADD COLUMN IF NOT EXISTS plan jsonb NOT NULL DEFAULT '{"shots":[],"globals":{}}'::jsonb;