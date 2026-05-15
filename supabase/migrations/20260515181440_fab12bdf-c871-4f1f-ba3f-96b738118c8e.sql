-- Brand kits per user (one row per user)
CREATE TABLE public.brand_kits (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'product' CHECK (subject IN ('product','app')),
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  url TEXT,
  tagline TEXT,
  audience TEXT,
  logo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own brand kit"
  ON public.brand_kits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own brand kit"
  ON public.brand_kits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own brand kit"
  ON public.brand_kits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own brand kit"
  ON public.brand_kits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_agent_profiles_updated_at();

-- Storage policies for director-uploads bucket, marketing/{uid}/ scope
CREATE POLICY "Users read own marketing uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'director-uploads'
    AND (storage.foldername(name))[1] = 'marketing'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users insert own marketing uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'director-uploads'
    AND (storage.foldername(name))[1] = 'marketing'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users update own marketing uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'director-uploads'
    AND (storage.foldername(name))[1] = 'marketing'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users delete own marketing uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'director-uploads'
    AND (storage.foldername(name))[1] = 'marketing'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
