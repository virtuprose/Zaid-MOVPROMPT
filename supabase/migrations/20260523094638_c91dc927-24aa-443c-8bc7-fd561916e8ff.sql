CREATE TABLE public.director_message_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  message_index integer,
  content_kind text NOT NULL CHECK (content_kind IN ('question','prompt','recommendation','chip')),
  content text NOT NULL,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  chip_label text,
  question_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.director_message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own director feedback"
  ON public.director_message_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own director feedback"
  ON public.director_message_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own director feedback"
  ON public.director_message_feedback FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own director feedback"
  ON public.director_message_feedback FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX director_message_feedback_user_created_idx
  ON public.director_message_feedback (user_id, created_at DESC);