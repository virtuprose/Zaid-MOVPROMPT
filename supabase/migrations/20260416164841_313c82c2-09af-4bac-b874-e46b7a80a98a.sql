
CREATE TABLE public.welcome_popups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  image_url TEXT,
  link_url TEXT,
  link_text TEXT,
  link_text_ar TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.welcome_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active welcome popups"
  ON public.welcome_popups FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage welcome popups"
  ON public.welcome_popups FOR ALL
  TO authenticated
  USING (has_role('admin'::app_role))
  WITH CHECK (has_role('admin'::app_role));
