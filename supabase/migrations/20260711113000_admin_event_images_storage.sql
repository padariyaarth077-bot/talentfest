-- Public event poster storage for Admin Events.
-- Safe to run repeatedly.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Event images are publicly readable'
  ) then
    create policy "Event images are publicly readable"
    on storage.objects
    for select
    to public
    using (bucket_id = 'event-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can upload event images'
  ) then
    create policy "Admins can upload event images"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'::public.app_role));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can update event images'
  ) then
    create policy "Admins can update event images"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'::public.app_role))
    with check (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'::public.app_role));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can delete event images'
  ) then
    create policy "Admins can delete event images"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'::public.app_role));
  end if;
end $$;
