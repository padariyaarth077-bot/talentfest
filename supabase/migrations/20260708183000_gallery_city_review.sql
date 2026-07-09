-- REVIEW BEFORE RUNNING IN SUPABASE.
-- Adds editable Event Gallery city and media management without deleting
-- existing files, storage objects, or unrelated records.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

create table if not exists public.gallery_cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.gallery_media (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.gallery_cities(id) on delete set null,
  title text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  category text not null default 'Photos',
  media_url text not null,
  thumbnail_url text,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists gallery_cities_active_order_idx
  on public.gallery_cities(is_active, display_order, name);

create index if not exists gallery_media_city_active_order_idx
  on public.gallery_media(city_id, is_active, display_order, created_at desc);

create index if not exists gallery_media_type_category_idx
  on public.gallery_media(media_type, category);

insert into public.gallery_cities (name, slug, display_order, is_active)
values
  ('Vadodara', 'vadodara', 1, true),
  ('Surat', 'surat', 2, true),
  ('Rajkot', 'rajkot', 3, true),
  ('Ahmedabad', 'ahmedabad', 4, true),
  ('Somnath', 'somnath', 5, true),
  ('Kutch', 'kutch', 6, true),
  ('Bhavnagar', 'bhavnagar', 7, true),
  ('Junagadh', 'junagadh', 8, true)
on conflict (slug) do update
set
  name = excluded.name,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.gallery_cities enable row level security;
alter table public.gallery_media enable row level security;

drop policy if exists "Public can read active gallery cities" on public.gallery_cities;
create policy "Public can read active gallery cities"
  on public.gallery_cities
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can manage gallery cities" on public.gallery_cities;
create policy "Admins can manage gallery cities"
  on public.gallery_cities
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public can read active gallery media" on public.gallery_media;
create policy "Public can read active gallery media"
  on public.gallery_media
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.gallery_cities c
      where c.id = gallery_media.city_id
        and c.is_active = true
    )
  );

drop policy if exists "Admins can manage gallery media" on public.gallery_media;
create policy "Admins can manage gallery media"
  on public.gallery_media
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
