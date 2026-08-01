-- Admin bootstrap for LeaderRate
-- Run this after schema.sql. It creates (or refreshes) the campus admin login
-- and nothing else, so a real deployment can have an admin without pulling in
-- the demo offices and sample feedback from demo-seed.sql.
--
-- The login is codename-only in the UI. auth.js maps the codename to a
-- synthetic email of the form <codename>@<role>.<institution_slug>.leaderrate.local,
-- so the email below must keep that shape for the admin sign-in to resolve.
--
-- Change the password before using this on anything public.

create extension if not exists pgcrypto;

insert into public.institutions (slug, name)
values ('foso-college-of-education', 'Foso College of Education (FOSCO)')
on conflict (slug) do update
set name = excluded.name;

with existing_admin as (
  update auth.users
  set
    aud = 'authenticated',
    role = 'authenticated',
    encrypted_password = crypt('AdminDemo!2026', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
    raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    raw_user_meta_data = jsonb_build_object(
      'codename', 'campus_admin',
      'role', 'admin',
      'institution_slug', 'foso-college-of-education'
    ),
    updated_at = timezone('utc', now())
  where email = 'campus_admin@admin.foso-college-of-education.leaderrate.local'
  returning id
),
inserted_admin as (
  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  select
    'be05ff10-c87d-451e-bafb-8729ec53d091'::uuid,
    'authenticated',
    'authenticated',
    'campus_admin@admin.foso-college-of-education.leaderrate.local',
    crypt('AdminDemo!2026', gen_salt('bf')),
    timezone('utc', now()),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'codename', 'campus_admin',
      'role', 'admin',
      'institution_slug', 'foso-college-of-education'
    ),
    timezone('utc', now()),
    timezone('utc', now())
  where not exists (select 1 from existing_admin)
  returning id
),
admin_user as (
  select id from existing_admin
  union all
  select id from inserted_admin
)
insert into public.profiles (id, institution_slug, codename, role)
select
  id,
  'foso-college-of-education',
  'campus_admin',
  'admin'
from admin_user
on conflict (id) do update
set
  institution_slug = excluded.institution_slug,
  codename = excluded.codename,
  role = excluded.role,
  updated_at = timezone('utc', now());
