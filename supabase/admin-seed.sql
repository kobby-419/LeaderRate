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
    instance_id,
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
    '00000000-0000-0000-0000-000000000000'::uuid,
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

/*
 * Every password login needs a matching auth.identities row.
 *
 * GoTrue resolves an email sign-in through identities, not through auth.users,
 * so an account created only by the insert above exists but can never sign in:
 * it returns "Invalid login credentials" even though the row, the password
 * hash, and the profile are all correct. An admin created in the Supabase
 * dashboard first will already have one and never hit this, which is exactly
 * what makes the gap easy to miss.
 */
do $$
declare
  admin_email constant text := 'campus_admin@admin.foso-college-of-education.leaderrate.local';
  admin_id uuid;
  token_column text;
begin
  select id into admin_id from auth.users where email = admin_email;
  if admin_id is null then
    return;
  end if;

  /*
   * GoTrue filters its user lookup on instance_id, so a null one is never
   * found, and it scans the token columns into plain Go strings, so a null one
   * aborts the query before any password check. Either way the sign-in fails
   * with "Invalid login credentials" and nothing about the row looks wrong.
   */
  update auth.users
  set instance_id = coalesce(instance_id, '00000000-0000-0000-0000-000000000000'::uuid)
  where id = admin_id;

  foreach token_column in array array[
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ]
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = token_column
    ) then
      execute format(
        'update auth.users set %I = %L where id = %L and %I is null',
        token_column, '', admin_id, token_column
      );
    end if;
  end loop;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
  ) then
    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    values (
      gen_random_uuid(),
      admin_id::text,
      admin_id,
      jsonb_build_object(
        'sub', admin_id::text,
        'email', admin_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    )
    on conflict do nothing;
  else
    /* Older GoTrue: identities.id is the provider id and is a text column. */
    insert into auth.identities (
      id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    values (
      admin_id::text,
      admin_id,
      jsonb_build_object(
        'sub', admin_id::text,
        'email', admin_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    )
    on conflict do nothing;
  end if;
end $$;
