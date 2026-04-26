CREATE POLICY "Users can update own history"
ON public.prompt_history
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

UPDATE public.prompt_history ph
SET image_paths = sub.paths
FROM (
  SELECT
    split_part(name, '/', 2)::uuid AS history_id,
    array_agg(name ORDER BY name) AS paths
  FROM storage.objects
  WHERE bucket_id = 'generation-images'
  GROUP BY split_part(name, '/', 2)
) sub
WHERE ph.id = sub.history_id
  AND ph.image_paths IS NULL;