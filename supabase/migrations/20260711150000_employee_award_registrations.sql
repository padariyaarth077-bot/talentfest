create sequence if not exists public.employee_award_application_seq;

create table if not exists public.employee_award_registrations (
  id uuid primary key default gen_random_uuid(),
  application_number text not null unique default (
    'EAC26-' || lpad(nextval('public.employee_award_application_seq')::text, 6, '0')
  ),
  company_name text not null,
  company_address text not null,
  coordinator_name text not null,
  contact_number text not null,
  company_email text not null,
  employee_full_name text not null,
  designation text not null,
  department text not null,
  gender text not null check (gender in ('male', 'female', 'other')),
  mobile_number text not null,
  employee_email text not null,
  award_categories text[] not null default '{}',
  other_award_category text,
  working_since date,
  total_experience text not null,
  major_achievements text not null,
  event_participation text not null check (
    event_participation in ('employee_only', 'employee_family', 'company_team')
  ),
  number_of_participants integer not null default 1 check (number_of_participants > 0),
  declaration_accepted boolean not null default false,
  employee_signature_name text not null,
  authorized_company_signature_name text not null,
  declaration_date date not null,
  status text not null default 'submitted' check (
    status in ('submitted', 'reviewing', 'approved', 'rejected')
  ),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_award_registrations_application_number_idx
  on public.employee_award_registrations (application_number);

create index if not exists employee_award_registrations_created_at_idx
  on public.employee_award_registrations (created_at desc);

create index if not exists employee_award_registrations_status_idx
  on public.employee_award_registrations (status);

create or replace function public.set_employee_award_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employee_award_registrations_updated_at
  on public.employee_award_registrations;

create trigger employee_award_registrations_updated_at
before update on public.employee_award_registrations
for each row
execute function public.set_employee_award_updated_at();

alter table public.employee_award_registrations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'employee_award_registrations'
      and policyname = 'Admins can read employee awards'
  ) then
    create policy "Admins can read employee awards"
      on public.employee_award_registrations
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.user_roles
          where user_id = auth.uid()
            and role::text = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'employee_award_registrations'
      and policyname = 'Admins can update employee awards'
  ) then
    create policy "Admins can update employee awards"
      on public.employee_award_registrations
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.user_roles
          where user_id = auth.uid()
            and role::text = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.user_roles
          where user_id = auth.uid()
            and role::text = 'admin'
        )
      );
  end if;
end $$;
