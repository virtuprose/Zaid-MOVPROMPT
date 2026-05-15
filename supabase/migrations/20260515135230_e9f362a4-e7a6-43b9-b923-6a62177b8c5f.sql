alter table public.video_jobs
  add column if not exists fal_status_url text,
  add column if not exists fal_response_url text;