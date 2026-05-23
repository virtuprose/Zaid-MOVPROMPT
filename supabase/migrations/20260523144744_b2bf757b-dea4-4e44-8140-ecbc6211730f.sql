create table if not exists public.model_availability (
  model_id text primary key,
  display_name text not null,
  available boolean not null default false,
  last_checked_at timestamptz,
  first_available_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.model_availability enable row level security;

create policy "Anyone authenticated can read model availability"
  on public.model_availability
  for select
  to authenticated
  using (true);

create policy "Anon can read model availability"
  on public.model_availability
  for select
  to anon
  using (true);

alter publication supabase_realtime add table public.model_availability;
alter table public.model_availability replica identity full;

insert into public.model_availability (model_id, display_name)
values ('google/gemini-omni-flash', 'Gemini Omni Flash')
on conflict (model_id) do nothing;