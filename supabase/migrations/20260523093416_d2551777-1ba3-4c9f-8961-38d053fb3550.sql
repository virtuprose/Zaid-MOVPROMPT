ALTER TABLE public.video_jobs ADD COLUMN IF NOT EXISTS metadata jsonb;
CREATE INDEX IF NOT EXISTS video_jobs_user_liked_idx ON public.video_jobs (user_id, liked) WHERE liked = true;