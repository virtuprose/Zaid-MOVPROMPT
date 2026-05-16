ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS liked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE POLICY "Users delete own video jobs"
ON public.video_jobs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_jobs_user_deleted
  ON public.video_jobs (user_id, deleted_at);