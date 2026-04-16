
INSERT INTO storage.buckets (id, name, public) VALUES ('welcome-popup-media', 'welcome-popup-media', true);

CREATE POLICY "Anyone can view welcome popup media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'welcome-popup-media');

CREATE POLICY "Admins can upload welcome popup media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'welcome-popup-media' AND public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update welcome popup media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'welcome-popup-media' AND public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can delete welcome popup media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'welcome-popup-media' AND public.has_role('admin'::public.app_role));
