
CREATE TABLE public.director_user_memory (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.director_user_memory TO authenticated;
GRANT ALL ON public.director_user_memory TO service_role;

ALTER TABLE public.director_user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own director memory"
  ON public.director_user_memory FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own director memory"
  ON public.director_user_memory FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own director memory"
  ON public.director_user_memory FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own director memory"
  ON public.director_user_memory FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
