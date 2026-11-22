-- Leader login bootstrap for LeaderRate
-- Run this after schema.sql and demo-seed.sql.
--
-- demo-seed.sql only records which codename owns which office. It cannot create
-- the matching Auth users, so on its own no leader can actually sign in. This
-- file closes that gap: for every office listed below it creates (or refreshes)
-- an auth.users row, its auth.identities row, the public.profiles row, and the
-- leader_accounts link.
--
-- The login is codename-only in the UI. auth.js maps the codename to a
-- synthetic email of the form <codename>@<role>.<institution_slug>.leaderrate.local,
-- so the email shape below must stay exactly as it is for sign-in to resolve.
--
-- Nine offices get an account: the Seven Core, plus the STS Coordinator and the
-- Academic Affairs Officer. Every other office in demo-seed.sql stays a public
-- record with no login attached.
--
-- Safe to re-run, and re-running repairs an account seeded by an earlier
-- version of this file. It also resets every password back to the value below,
-- which is the intended way to recover a forgotten one.
--
--
-- WHY THIS FILE IS FUSSY ABOUT auth.users
--
-- Creating a user with plain inserts is easy to get subtly wrong. The row looks
-- perfect in the table editor, the profile and office link resolve, and the
-- password hash verifies by hand -- yet signing in still returns "Invalid login
-- credentials", because GoTrue never gets as far as checking the password.
-- Three separate things cause that, and all three look identical from outside:
--
--   1. instance_id is null. GoTrue filters its user lookup on this column, so a
--      null one is simply never found.
--   2. The token columns (confirmation_token, recovery_token, email_change and
--      friends) are null. GoTrue scans them into plain Go strings, so a null
--      aborts the query with a scan error before any password check happens.
--   3. There is no auth.identities row. An email sign-in is resolved through
--      identities rather than auth.users.
--
-- An account created in the Supabase dashboard has all three, which is why one
-- of those works while a SQL-seeded one does not, and why this is easy to
-- mistake for a wrong password.

create extension if not exists pgcrypto;

do $$
declare
  seed record;
  seed_email text;
  seed_user_id uuid;
  seed_leader_id uuid;
  token_column text;
  seed_institution constant text := 'foso-college-of-education';
  linked_count integer := 0;
  /*
   * Whether an existing account has its password forced back to the value in
   * the list below.
   *
   * Leave it true to hand out or restore the documented passwords, which is
   * also the only way to recover an account whose holder has forgotten theirs,
   * since these logins have no email address to send a reset to.
   *
   * Set it to false before re-running this file for any other reason -- adding
   * a new office, or repairing the auth plumbing described above. Those runs
   * would otherwise silently undo a password a leader has since chosen in
   * Settings, and they would not find out until their next sign-in.
   */
  reset_passwords constant boolean := true;
begin
  for seed in
    select *
    from (values
      -- office_slug                  codename   password
      ('src-president',                'srcp',      'Jf9j-cx7a-jbYU'),
      ('src-vice-president',           'srcvp',     'THCA-TJgW-FG2E'),
      ('src-secretary',                'srcgs',     'GbwV-rhhb-8yTA'),
      ('src-financial-secretary',      'srcfs',     '3mFQ-tyxy-2HpR'),
      ('src-treasurer',                'srct',      '9JVd-Fmku-Cbnb'),
      ('src-women-commissioner',       'srcwc',     'UjNY-sEBM-dbvM'),
      ('public-relations-officer',     'srcpr',     'mv7J-pSbF-b7hp'),
      ('sts-coordinator',              'stsco',     'SuzR-UEqg-V2zK'),
      ('academic-affairs-officer',     'aao',       'sbu4-Fd6C-uZFe')
    ) as t(office_slug, codename, password)
  loop
    select id into seed_leader_id
    from public.leaders
    where office_slug = seed.office_slug;

    if seed_leader_id is null then
      raise notice 'Skipping %: no office with that slug. Run demo-seed.sql first.', seed.office_slug;
      continue;
    end if;

    seed_email := seed.codename || '@leader.' || seed_institution || '.leaderrate.local';

    select id into seed_user_id from auth.users where email = seed_email;

    if seed_user_id is null then
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
      values (
        '00000000-0000-0000-0000-000000000000'::uuid,
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        seed_email,
        crypt(seed.password, gen_salt('bf')),
        timezone('utc', now()),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object(
          'codename', seed.codename,
          'role', 'leader',
          'institution_slug', seed_institution
        ),
        timezone('utc', now()),
        timezone('utc', now())
      )
      returning id into seed_user_id;
    else
      update auth.users
      set
        instance_id = coalesce(instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
        aud = 'authenticated',
        role = 'authenticated',
        encrypted_password = case
          when reset_passwords then crypt(seed.password, gen_salt('bf'))
          else encrypted_password
        end,
        email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
        raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        raw_user_meta_data = jsonb_build_object(
          'codename', seed.codename,
          'role', 'leader',
          'institution_slug', seed_institution
        ),
        updated_at = timezone('utc', now())
      where id = seed_user_id;
    end if;

    /*
     * Reason 2 from the header. These columns differ between GoTrue versions,
     * so ask the catalog which ones exist rather than naming them blindly, and
     * only touch the ones sitting null.
     */
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
          token_column, '', seed_user_id, token_column
        );
      end if;
    end loop;

    /*
     * Reason 3 from the header. Outside the branch above so it also repairs a
     * user seeded before this file created identities.
     */
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
        seed_user_id::text,
        seed_user_id,
        jsonb_build_object(
          'sub', seed_user_id::text,
          'email', seed_email,
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
        seed_user_id::text,
        seed_user_id,
        jsonb_build_object(
          'sub', seed_user_id::text,
          'email', seed_email,
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

    /*
     * handle_new_auth_user() already mirrors the row into profiles, but writing
     * it here too keeps the seed correct if that trigger is ever missing.
     */
    insert into public.profiles (id, institution_slug, codename, role)
    values (seed_user_id, seed_institution, seed.codename, 'leader')
    on conflict (id) do update
    set
      institution_slug = excluded.institution_slug,
      codename = excluded.codename,
      role = excluded.role,
      updated_at = timezone('utc', now());

    /*
     * login_codename is globally unique, so an office that previously carried a
     * different codename has to release it before this one can take it.
     */
    delete from public.leader_accounts
    where login_codename = seed.codename
      and leader_id <> seed_leader_id;

    insert into public.leader_accounts (leader_id, profile_id, login_codename)
    values (seed_leader_id, seed_user_id, seed.codename)
    on conflict (leader_id) do update
    set
      profile_id = excluded.profile_id,
      login_codename = excluded.login_codename;

    linked_count := linked_count + 1;
  end loop;

  raise notice 'Linked % leader account(s).', linked_count;
end $$;

/*
 * Verify the three things that actually decide whether a sign-in works. Expect
 * nine rows with true in every column; anything false is the reason that
 * account cannot log in.
 */
select
  leaders.office_title,
  leader_accounts.login_codename,
  users.instance_id is not null                as has_instance_id,
  users.confirmation_token is not null         as tokens_not_null,
  identities.id is not null                    as has_identity,
  users.email_confirmed_at is not null         as email_confirmed,
  leader_accounts.profile_id is not null       as office_linked
from public.leader_accounts
join public.leaders on leaders.id = leader_accounts.leader_id
left join auth.users on users.id = leader_accounts.profile_id
left join auth.identities on identities.user_id = users.id and identities.provider = 'email'
order by leaders.office_order;
