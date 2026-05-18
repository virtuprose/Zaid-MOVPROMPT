ALTER TABLE public.video_jobs
  ADD COLUMN IF NOT EXISTS storyboard_session_id uuid,
  ADD COLUMN IF NOT EXISTS storyboard_shot_index integer;

CREATE INDEX IF NOT EXISTS video_jobs_storyboard_session_idx
  ON public.video_jobs (storyboard_session_id, storyboard_shot_index);