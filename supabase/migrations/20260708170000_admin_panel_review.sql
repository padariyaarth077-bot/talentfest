-- REVIEW BEFORE RUNNING
-- Secure admin support for the public Entry Pass admin panel.
-- This script extends the existing public_entry_passes table and does not
-- change entry-number generation or create duplicate pass records.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.public_entry_passes
  add column if not exists qr_value text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists checked_in boolean not null default false,
  add column if not exists checked_in_at timestamptz,
  add column if not exists pass_status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

alter table public.public_entry_passes
  add constraint public_entry_passes_pass_status_check
  check (pass_status in ('active', 'revoked', 'cancelled'))
  not valid;

update public.public_entry_passes
set qr_value = coalesce(
  qr_value,
  jsonb_build_object(
    'id', id,
    'entryNumber', entry_number,
    'name', participant_name
  )::text
)
where qr_value is null;

create unique index if not exists public_entry_passes_entry_number_unique_idx
  on public.public_entry_passes(entry_number);

create index if not exists public_entry_passes_created_at_idx
  on public.public_entry_passes(created_at desc);

create index if not exists public_entry_passes_checked_in_idx
  on public.public_entry_passes(checked_in, checked_in_at desc);

create index if not exists public_entry_passes_pass_status_idx
  on public.public_entry_passes(pass_status);

create index if not exists public_entry_passes_search_idx
  on public.public_entry_passes(participant_name, entry_number, email, phone);

create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  admin_email text,
  pass_id uuid,
  entry_number text,
  participant_name text,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_created_at_idx
  on public.admin_activity(created_at desc);

alter table public.public_entry_passes enable row level security;
alter table public.admin_activity enable row level security;

drop policy if exists "Admins can read public entry passes" on public.public_entry_passes;
create policy "Admins can read public entry passes"
  on public.public_entry_passes
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update public entry passes" on public.public_entry_passes;
create policy "Admins can update public entry passes"
  on public.public_entry_passes
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete public entry passes" on public.public_entry_passes;
create policy "Admins can delete public entry passes"
  on public.public_entry_passes
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read admin activity" on public.admin_activity;
create policy "Admins can read admin activity"
  on public.admin_activity
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert admin activity" on public.admin_activity;
create policy "Admins can insert admin activity"
  on public.admin_activity
  for insert
  to authenticated
  with check (public.is_admin());

-- After reviewing existing data, run this separately to validate the check:
-- alter table public.public_entry_passes validate constraint public_entry_passes_pass_status_check;
