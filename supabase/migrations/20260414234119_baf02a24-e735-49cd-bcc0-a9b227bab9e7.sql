-- Fix has_role: remove _user_id parameter, use auth.uid() internally
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

-- Restrict page_visits reads to admins only
DROP POLICY IF EXISTS "Anyone can read page visits" ON public.page_visits;
CREATE POLICY "Admins can read page visits"
  ON public.page_visits FOR SELECT TO authenticated
  USING (public.has_role('admin'));

-- Restrict generation_events reads to admins only
DROP POLICY IF EXISTS "Anyone can read generation events" ON public.generation_events;
CREATE POLICY "Admins can read generation events"
  ON public.generation_events FOR SELECT TO authenticated
  USING (public.has_role('admin'));