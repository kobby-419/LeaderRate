-- Spare anonymous student accounts for LeaderRate
-- Run this after schema.sql. It does not depend on demo-seed.sql.
--
-- Leaders are students too. They need a way to browse, rate offices, and post
-- feedback as an ordinary anonymous student without doing it from the account
-- that answers on behalf of their office. This file creates a pool of plain
-- student accounts an admin can hand out for that purpose, one per person.
--
-- Nothing here records who receives which account, and nothing in the database
-- links these to any office. That is the point: the whole value of the pool is
-- that a leader's student activity cannot be traced back to their office, and
-- a stored mapping anywhere -- including in this file -- would destroy it. Hand
-- each codename over privately and keep no list.
--
-- The codenames deliberately follow the same word+digits shape the register
-- page generates, so these accounts are indistinguishable from any other
-- student account in the feedback stream.
--
-- Change the passwords before using this on anything public.

create extension if not exists pgcrypto;

do $$
declare
  seed record;
  seed_email text;
  seed_user_id uuid;
  token_column text;
  seed_institution constant text := 'foso-college-of-education';
  created_count integer := 0;
  /*
   * Whether an existing account has its password forced back to the value in
   * the list below. Leave it true to hand out or restore the documented
   * passwords; set it to false when re-running for any other reason, so a
   * password the holder has since chosen in Settings is left alone.
   */
  reset_passwords constant boolean := true;
begin
  for seed in
    select *
    from (values
      ('quarry824',    'GGeD-USES-Pjdr'),
      ('marble537',    'FcnH-nhAb-vr7b'),
      ('hollow992',    'TnQ3-AM3A-WBRD'),
      ('drift248',     'Zh6Z-WpHC-PKsm'),
      ('lantern404',   'b793-JnqJ-NAtw'),
      ('copper357',    'MyRs-SVz8-C2qj'),
      ('canyon548',    'hrhC-F7hd-RhvU'),
      ('indigo341',    'AebJ-Jhaz-pqnc'),
      ('bramble819',   'mDf4-sA8x-A3Hq')
    ) as t(codename, password)
  loop
    seed_email := seed.codename || '@student.' || seed_institution || '.leaderrate.local';

    select id into seed_user_id from auth.users where email = seed_email;

    /*
     * profiles is unique on (institution_slug, codename). A student who
     * registered and happened to generate this codename already owns it, and
     * taking it would abort the whole run, so step over it instead.
     */
    if exists (
      select 1 from public.profiles
      where institution_slug = seed_institution
        and codename = seed.codename
        and (seed_user_id is null or id <> seed_user_id)
    ) then
      raise notice 'Skipping %: codename already belongs to another account.', seed.codename;
      continue;
    end if;

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
          'role', 'student',
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
          'role', 'student',
          'institution_slug', seed_institution
        ),
        updated_at = timezone('utc', now())
      where id = seed_user_id;
    end if;

    /*
     * GoTrue scans these columns into plain Go strings, so a null one aborts
     * the sign-in query before any password check. They vary by version, so
     * ask the catalog which exist rather than naming them blindly.
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
     * Every password login needs a matching auth.identities row. GoTrue
     * resolves an email sign-in through identities rather than auth.users, so
     * without this the account exists but returns "Invalid login credentials".
     * Kept outside the branch above so it repairs previously seeded users too.
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

    insert into public.profiles (id, institution_slug, codename, role)
    values (seed_user_id, seed_institution, seed.codename, 'student')
    on conflict (id) do update
    set
      institution_slug = excluded.institution_slug,
      codename = excluded.codename,
      role = excluded.role,
      updated_at = timezone('utc', now());

    created_count := created_count + 1;
  end loop;

  raise notice 'Prepared % anonymous student account(s).', created_count;
end $$;

-- Confirm the pool exists. Expect nine rows; a missing one was skipped because
-- a real student already holds that codename.
--
-- These are ordinary student profiles. Nothing marks them as belonging to a
-- leader, which is exactly what makes them usable as one.
select codename, role
from public.profiles
where role = 'student'
  and codename in (
    'quarry824', 'marble537', 'hollow992', 'drift248', 'lantern404', 'copper357', 'canyon548', 'indigo341', 'bramble819'
  )
order by codename;
