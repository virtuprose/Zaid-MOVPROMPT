
-- Director sessions
CREATE TABLE public.director_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  brief_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_prompt text,
  video_job_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_director_sessions_user ON public.director_sessions(user_id, updated_at DESC);

ALTER TABLE public.director_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own director sessions"
  ON public.director_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own director sessions"
  ON public.director_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own director sessions"
  ON public.director_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own director sessions"
  ON public.director_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_director_sessions_updated_at
  BEFORE UPDATE ON public.director_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_agent_profiles_updated_at();

-- Storage bucket for director attachments (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('director-uploads', 'director-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own director uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'director-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own director uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'director-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own director uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'director-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
