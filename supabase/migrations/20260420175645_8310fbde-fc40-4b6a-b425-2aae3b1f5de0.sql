insert into storage.buckets (id, name, public)
values ('preset-previews', 'preset-previews', true)
on conflict (id) do nothing;

create policy "Public read preset previews"
on storage.objects for select
using (bucket_id = 'preset-previews');

create policy "Admins upload preset previews"
on storage.objects for insert to authenticated
with check (bucket_id = 'preset-previews' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update preset previews"
on storage.objects for update to authenticated
using (bucket_id = 'preset-previews' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete preset previews"
on storage.objects for delete to authenticated
using (bucket_id = 'preset-previews' and public.has_role(auth.uid(), 'admin'));