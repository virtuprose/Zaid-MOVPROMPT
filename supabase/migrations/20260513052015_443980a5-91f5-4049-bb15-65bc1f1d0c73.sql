-- Shared prompts: public read-only landing pages for any generated result set.
CREATE TABLE public.shared_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  title text,
  workflow_type text NOT NULL,
  target_model text NOT NULL,
  agent_name text,
  results jsonb NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_prompts_slug ON public.shared_prompts(slug);
CREATE INDEX idx_shared_prompts_user_id ON public.shared_prompts(user_id);
CREATE INDEX idx_shared_prompts_created_at ON public.shared_prompts(created_at DESC);

ALTER TABLE public.shared_prompts ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can view a shared prompt that hasn't expired.
CREATE POLICY "Anyone can view non-expired shared prompts"
  ON public.shared_prompts
  FOR SELECT
  TO anon, authenticated
  USING (expires_at IS NULL OR expires_at > now());

-- Owner-only writes.
CREATE POLICY "Users can create their own shared prompts"
  ON public.shared_prompts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared prompts"
  ON public.shared_prompts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared prompts"
  ON public.shared_prompts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_shared_prompts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shared_prompts_updated_at
  BEFORE UPDATE ON public.shared_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shared_prompts_updated_at();

-- Safe public increment for view counts (avoids granting broad UPDATE to anon).
CREATE OR REPLACE FUNCTION public.increment_shared_prompt_views(_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shared_prompts
  SET view_count = view_count + 1
  WHERE slug = _slug
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_shared_prompt_views(text) TO anon, authenticated;
