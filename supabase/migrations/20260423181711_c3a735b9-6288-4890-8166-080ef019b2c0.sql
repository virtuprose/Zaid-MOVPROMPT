CREATE TABLE public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_count integer,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (has_role('admin'::app_role));

CREATE POLICY "Service role can insert audit log"
ON public.admin_audit_log
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role'::text);

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log (action);