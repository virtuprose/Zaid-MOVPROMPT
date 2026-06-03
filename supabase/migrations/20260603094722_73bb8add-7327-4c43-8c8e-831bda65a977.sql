
CREATE TABLE public.media_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  kind text NOT NULL,
  url text NOT NULL,
  label text,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_favorites TO authenticated;
GRANT ALL ON public.media_favorites TO service_role;
ALTER TABLE public.media_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own favorites" ON public.media_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favorites" ON public.media_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own favorites" ON public.media_favorites FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own favorites" ON public.media_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_folders TO authenticated;
GRANT ALL ON public.media_folders TO service_role;
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own folders" ON public.media_folders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own folders" ON public.media_folders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own folders" ON public.media_folders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own folders" ON public.media_folders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.media_folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.media_folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  kind text NOT NULL,
  url text NOT NULL,
  label text,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, media_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_folder_items TO authenticated;
GRANT ALL ON public.media_folder_items TO service_role;
ALTER TABLE public.media_folder_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own folder items" ON public.media_folder_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own folder items" ON public.media_folder_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own folder items" ON public.media_folder_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.media_hidden (
  user_id uuid NOT NULL,
  media_key text NOT NULL,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, media_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_hidden TO authenticated;
GRANT ALL ON public.media_hidden TO service_role;
ALTER TABLE public.media_hidden ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users select own hidden" ON public.media_hidden FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own hidden" ON public.media_hidden FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own hidden" ON public.media_hidden FOR DELETE TO authenticated USING (auth.uid() = user_id);
