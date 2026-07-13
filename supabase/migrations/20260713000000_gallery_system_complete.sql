-- ============================================================
-- TELENTFEST: Complete Gallery System Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. is_admin helper function
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

-- 2. Gallery Cities table
create table if not exists public.gallery_cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- 3. Gallery Media table
create table if not exists public.gallery_media (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.gallery_cities(id) on delete set null,
  title text not null,
  description text,
  media_type text not null default 'photo' check (media_type in ('photo', 'video')),
  category text not null default 'Photos',
  storage_path text not null,
  media_url text not null,
  thumbnail_url text,
  alt_text text,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  width integer,
  height integer,
  fit_mode text not null default 'contain' check (fit_mode in ('contain', 'cover')),
  fit_position text not null default 'center' check (fit_position in ('center', 'top', 'bottom', 'left', 'right')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- 4. Indexes
create index if not exists gallery_cities_active_order_idx
  on public.gallery_cities(is_active, display_order, name);

create index if not exists gallery_media_city_active_order_idx
  on public.gallery_media(city_id, is_active, display_order, created_at desc);

create index if not exists gallery_media_type_category_idx
  on public.gallery_media(media_type, category);

create index if not exists gallery_media_is_featured_idx
  on public.gallery_media(is_featured, display_order) where is_featured = true;

-- 5. Seed gallery cities
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

-- 6. Enable RLS
alter table public.gallery_cities enable row level security;
alter table public.gallery_media enable row level security;

-- 7. RLS Policies - Gallery Cities
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

-- 8. RLS Policies - Gallery Media
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

-- 9. Trigger function for updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 10. Trigger for updated_at
drop trigger if exists update_gallery_cities_updated_at on public.gallery_cities;
create trigger update_gallery_cities_updated_at
  before update on public.gallery_cities
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_gallery_media_updated_at on public.gallery_media;
create trigger update_gallery_media_updated_at
  before update on public.gallery_media
  for each row execute function public.update_updated_at_column();

-- 11. Storage bucket and policies
-- Note: Create bucket "gallery-images" in Supabase Dashboard > Storage
-- Then run these policies:
/*
-- Public read access
create policy "Public read gallery-images"
  on storage.objects for select
  using (bucket_id = 'gallery-images');

-- Admin upload
create policy "Admin upload gallery-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery-images' and public.is_admin());

-- Admin update
create policy "Admin update gallery-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gallery-images' and public.is_admin());

-- Admin delete
create policy "Admin delete gallery-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery-images' and public.is_admin());
*/

-- 11. Seed gallery media (run after uploading images to storage)
-- Example format:
/*
insert into public.gallery_media (city_id, title, description, category, storage_path, media_url, thumbnail_url, display_order, is_featured, is_active, width, height, fit_mode)
select
  c.id,
  'Vadodara Dance Performance',
  'A live Telent Fest dance performance captured on the city stage.',
  'Dance',
  'vadodara/2026/vadodara-dance-01.webp',
  'https://gksepcsghmebnobxhxno.supabase.co/storage/v1/object/public/gallery-images/vadodara/2026/vadodara-dance-01.webp',
  'https://gksepcsghmebnobxhxno.supabase.co/storage/v1/object/public/gallery-images/vadodara/2026/vadodara-dance-01.webp',
  1,
  true,
  true,
  900,
  1200,
  'contain'
from public.gallery_cities c
where c.slug = 'vadodara';
*/