
alter table public.video_jobs add column if not exists story_render_id uuid;
alter table public.video_jobs add column if not exists act_index int;
create index if not exists idx_video_jobs_story_render on public.video_jobs(story_render_id);

insert into public.credit_prices(key, kind, amount, description) values
  ('story_stitch', 'flat', 10, 'Stitch story acts into one video')
on conflict (key) do nothing;
