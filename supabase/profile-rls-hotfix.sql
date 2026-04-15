create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_codename()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select codename from public.profiles where id = auth.uid()
$$;

create or replace function public.current_institution_slug()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select institution_slug from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

create or replace function public.is_leader_for_office(target_leader_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leader_accounts
    where profile_id = auth.uid()
      and leader_id = target_leader_id
  )
$$;
