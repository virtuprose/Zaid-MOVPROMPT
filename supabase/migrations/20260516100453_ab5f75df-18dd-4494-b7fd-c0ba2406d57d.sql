CREATE TABLE public.character_kits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  role text,
  reference_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own character kit" ON public.character_kits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own character kit" ON public.character_kits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own character kit" ON public.character_kits
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own character kit" ON public.character_kits
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX character_kits_user_id_idx ON public.character_kits(user_id, updated_at DESC);

CREATE TABLE public.character_kit_selection (
  user_id uuid NOT NULL PRIMARY KEY,
  character_kit_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_kit_selection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own character selection" ON public.character_kit_selection
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own character selection" ON public.character_kit_selection
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own character selection" ON public.character_kit_selection
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own character selection" ON public.character_kit_selection
  FOR DELETE TO authenticated USING (auth.uid() = user_id);