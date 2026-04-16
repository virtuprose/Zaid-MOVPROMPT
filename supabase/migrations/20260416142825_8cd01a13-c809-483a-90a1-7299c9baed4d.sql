-- Create private storage bucket for generation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generation-images', 'generation-images', false);

-- Users can upload to their own folder
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generation-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read their own files
CREATE POLICY "Users can read own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'generation-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can read all files
CREATE POLICY "Admins can read all generation images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'generation-images'
  AND public.has_role('admin'::app_role)
);

-- Add image_paths column to prompt_history
ALTER TABLE public.prompt_history
ADD COLUMN image_paths text[] DEFAULT NULL;