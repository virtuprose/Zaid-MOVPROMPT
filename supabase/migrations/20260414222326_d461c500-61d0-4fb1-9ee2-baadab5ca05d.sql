
-- Page visits table
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_path TEXT NOT NULL,
  user_agent TEXT,
  session_id TEXT NOT NULL
);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page visits"
ON public.page_visits FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can read page visits"
ON public.page_visits FOR SELECT
TO anon, authenticated
USING (true);

-- Generation events table
CREATE TABLE public.generation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  workflow_type TEXT NOT NULL,
  target_model TEXT NOT NULL
);

ALTER TABLE public.generation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert generation events"
ON public.generation_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can read generation events"
ON public.generation_events FOR SELECT
TO anon, authenticated
USING (true);

-- Indexes for analytics queries
CREATE INDEX idx_page_visits_visited_at ON public.page_visits (visited_at);
CREATE INDEX idx_page_visits_session_id ON public.page_visits (session_id);
CREATE INDEX idx_generation_events_created_at ON public.generation_events (created_at);
CREATE INDEX idx_generation_events_workflow_type ON public.generation_events (workflow_type);
