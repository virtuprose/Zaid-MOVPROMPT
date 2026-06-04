CREATE TABLE public.media_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  media_key text NOT NULL,
  kind text NOT NULL,
  url text NOT NULL,
  label text,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX media_labels_user_id_idx ON public.media_labels (user_id);
CREATE INDEX media_labels_user_media_idx ON public.media_labels (user_id, media_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_labels TO authenticated;
GRANT ALL ON public.media_labels TO service_role;

ALTER TABLE public.media_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own media labels"
  ON public.media_labels FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own media labels"
  ON public.media_labels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own media labels"
  ON public.media_labels FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own media labels"
  ON public.media_labels FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_media_labels_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER media_labels_touch_updated_at
  BEFORE UPDATE ON public.media_labels
  FOR EACH ROW EXECUTE FUNCTION public.touch_media_labels_updated_at();