-- Agent profiles table: stores editable prompt content for each specialist agent
CREATE TABLE public.agent_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  doc_summary TEXT NOT NULL DEFAULT '',
  system_addendum TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage agent profiles"
ON public.agent_profiles
FOR ALL
TO authenticated
USING (has_role('admin'::app_role))
WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Service role can read agent profiles"
ON public.agent_profiles
FOR SELECT
TO public
USING (auth.role() = 'service_role'::text);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_agent_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agent_profiles_updated_at
BEFORE UPDATE ON public.agent_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_agent_profiles_updated_at();

-- Seed the 4 agents (content is intentionally empty placeholder; edge function falls back to in-code defaults until admin edits)
INSERT INTO public.agent_profiles (agent_id, display_name, doc_summary, system_addendum, examples) VALUES
  ('kling',    'Kling Specialist',    '', '', ''),
  ('seedance', 'Seedance Specialist', '', '', ''),
  ('veo',      'Veo Specialist',      '', '', ''),
  ('generic',  'Generic Director',    '', '', '');