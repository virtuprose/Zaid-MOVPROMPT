
-- Track fal.ai video generation jobs
create table public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid references public.director_sessions(id) on delete set null,
  provider text not null,
  prompt text not null,
  fal_request_id text,
  status text not null default 'queued',
  video_url text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.video_jobs enable row level security;

create policy "Users read own video jobs"
  on public.video_jobs for select
  to authenticated using (auth.uid() = user_id);

create policy "Users insert own video jobs"
  on public.video_jobs for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users update own video jobs"
  on public.video_jobs for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index video_jobs_user_idx on public.video_jobs(user_id, created_at desc);
create index video_jobs_session_idx on public.video_jobs(session_id);
