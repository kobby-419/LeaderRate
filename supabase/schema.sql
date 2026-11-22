-- LeaderRate Supabase schema
-- This schema keeps the app focused on one institution for the demo, but it
-- still includes an institution table and role-aware relationships so the
-- design can grow later without a full rewrite.
--
-- Safe to re-run. Tables use "if not exists", functions use "create or
-- replace", and triggers and policies are dropped first. Postgres has no
-- "create policy if not exists", so each policy needs its own drop line:
-- without it a re-run aborts on the first existing policy, and because the
-- SQL editor runs the whole file in one transaction, the rollback takes the
-- not-yet-created tables with it.

create extension if not exists pgcrypto;

create table if not exists public.institutions (
  slug text primary key,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.institutions is 'One institution for now, with room for future multi-institution support.';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institution_slug text not null references public.institutions(slug) on delete restrict,
  codename text not null,
  role text not null check (role in ('student', 'leader', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (institution_slug, codename)
);

comment on table public.profiles is 'Public-safe account profile data linked to Supabase Auth users.';

create table if not exists public.leaders (
  id uuid primary key default gen_random_uuid(),
  institution_slug text not null references public.institutions(slug) on delete restrict,
  office_title text not null,
  office_slug text not null unique,
  display_name text,
  department_slug text,
  department_label text,
  office_summary text not null,
  office_focus text not null,
  demo_rating numeric(2,1),
  demo_review_count integer not null default 0,
  demo_performance integer,
  office_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.leaders add column if not exists display_name text;
alter table if exists public.leaders add column if not exists department_slug text;
alter table if exists public.leaders add column if not exists department_label text;
alter table if exists public.leaders add column if not exists demo_rating numeric(2,1);
alter table if exists public.leaders add column if not exists demo_review_count integer not null default 0;
alter table if exists public.leaders add column if not exists demo_performance integer;

create table if not exists public.leader_accounts (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null unique references public.leaders(id) on delete cascade,
  profile_id uuid unique references public.profiles(id) on delete set null,
  login_codename text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.leader_accounts is 'Links a private leader login codename to a public office record.';

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  institution_slug text not null references public.institutions(slug) on delete restrict,
  /*
   * leader_id is nullable on purpose. A null office means the feedback is
   * addressed to the SRC as a whole ("general feedback") rather than to one
   * office, which is what the Core Seven dashboard shows in its second column.
   */
  leader_id uuid references public.leaders(id) on delete cascade,
  student_profile_id uuid references public.profiles(id) on delete set null,
  student_codename_snapshot text not null,
  category text not null check (
    category in (
      'Communication',
      'Responsiveness',
      'Transparency',
      'Welfare',
      'Academic Support',
      'Project Delivery',
      'Conduct',
      'Administration',
      'Other'
    )
  ),
  rating integer not null check (rating between 1 and 5),
  message text not null,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  moderation_note text,
  moderated_by_profile_id uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  fingerprint_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leader_responses (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null unique references public.feedback(id) on delete cascade,
  leader_id uuid not null references public.leaders(id) on delete cascade,
  leader_profile_id uuid references public.profiles(id) on delete set null,
  author_codename_snapshot text not null,
  response_message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.leaders(id) on delete cascade,
  leader_profile_id uuid references public.profiles(id) on delete set null,
  office_title_snapshot text not null,
  title text not null,
  description text not null,
  status text not null check (status in ('planned', 'ongoing', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

/*
 * Columns added after the first release. "create table if not exists" above is
 * a no-op on an existing database, so every later change needs its own alter.
 */
alter table if exists public.feedback alter column leader_id drop not null;
alter table if exists public.leader_responses add column if not exists author_display_name text;
alter table if exists public.projects add column if not exists is_official boolean not null default false;
alter table if exists public.projects add column if not exists author_display_name text;

comment on column public.feedback.leader_id is 'Null means the feedback is addressed to the whole SRC rather than one office.';
comment on column public.leader_responses.author_display_name is 'Set when a leader answers under their real name instead of their codename.';
comment on column public.projects.is_official is 'True when the update is published as an official Core Seven announcement.';
comment on column public.projects.author_display_name is 'Set when a leader publishes an update under their real name rather than the office name alone.';

/*
 * Foreign keys back to public.leaders, repaired rather than assumed.
 *
 * PostgREST resolves embeds like feedback.select("*, leaders(office_title)")
 * from these constraints, not from the columns. "drop table public.leaders
 * cascade" removes the constraints while leaving feedback, projects,
 * leader_responses, and leader_accounts in place, and the "create table if not
 * exists" statements above are no-ops on those surviving tables, so nothing
 * puts the constraints back. The result is PGRST200, "could not find a
 * relationship between feedback and leaders in the schema cache", even though
 * both tables and the leader_id column are all present.
 *
 * Recreating a leaders row gives it a fresh id, so rows still pointing at a
 * deleted leader have to be resolved before the constraint can be trusted
 * again. Feedback keeps its message as general SRC feedback; the others carry
 * no meaning without an office, so they go. Both are no-ops on a healthy
 * database.
 */
update public.feedback
set leader_id = null
where leader_id is not null
  and not exists (select 1 from public.leaders where leaders.id = feedback.leader_id);

delete from public.leader_responses
where not exists (select 1 from public.leaders where leaders.id = leader_responses.leader_id);

delete from public.projects
where not exists (select 1 from public.leaders where leaders.id = projects.leader_id);

delete from public.leader_accounts
where not exists (select 1 from public.leaders where leaders.id = leader_accounts.leader_id);

/*
 * Dropped by name this would be fragile: a constraint created under some other
 * name would survive the drop, the add below would succeed anyway, and the
 * column would end up with two foreign keys to the same table. PostgREST then
 * fails the other way, refusing to guess which relationship the embed meant.
 * So clear whatever is on leader_id first, then add exactly one.
 */
do $$
declare
  child_table text;
  existing_constraint text;
begin
  foreach child_table in array array['feedback', 'leader_responses', 'projects', 'leader_accounts']
  loop
    for existing_constraint in
      select conname
      from pg_constraint
      where contype = 'f'
        and conrelid = format('public.%I', child_table)::regclass
        and confrelid = 'public.leaders'::regclass
    loop
      execute format('alter table public.%I drop constraint %I', child_table, existing_constraint);
    end loop;

    execute format(
      'alter table public.%I add constraint %I foreign key (leader_id) references public.leaders(id) on delete cascade',
      child_table,
      child_table || '_leader_id_fkey'
    );
  end loop;
end
$$;

create table if not exists public.feedback_votes (
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (feedback_id, profile_id)
);

create table if not exists public.feedback_reports (
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (feedback_id, profile_id)
);

create table if not exists public.abuse_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  institution_slug text references public.institutions(slug) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'high')),
  ip_address text,
  user_agent text,
  fingerprint_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.abuse_logs is 'Internal-only event log used for spam reduction and suspicious activity review.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, institution_slug, codename, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'institution_slug', 'foso-college-of-education'),
    lower(coalesce(new.raw_user_meta_data ->> 'codename', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data ->> 'role', 'student')
  )
  on conflict (id) do update
  set
    institution_slug = excluded.institution_slug,
    codename = excluded.codename,
    role = excluded.role,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute procedure public.handle_new_auth_user();

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

/*
 * The office the signed-in leader runs, or null for everyone else. Kept as its
 * own function so policies and the dashboard queries agree on one definition.
 */
create or replace function public.current_leader_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select leader_id
  from public.leader_accounts
  where profile_id = auth.uid()
$$;

/*
 * "Core Seven" is not a separate flag. It is simply a leader whose office sits
 * in the seven-core department, which the offices table already records.
 */
create or replace function public.is_seven_core_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leader_accounts
    join public.leaders on public.leaders.id = public.leader_accounts.leader_id
    where public.leader_accounts.profile_id = auth.uid()
      and public.leaders.department_slug = 'seven-core'
  )
$$;

create or replace function public.claim_seeded_leader_account()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_leader_id uuid;
begin
  if public.current_profile_role() <> 'leader' then
    return null;
  end if;

  update public.leader_accounts
  set profile_id = auth.uid()
  where login_codename = public.current_profile_codename()
    and profile_id is null
  returning leader_id into matched_leader_id;

  return matched_leader_id;
end;
$$;

create or replace function public.get_feedback_vote_totals()
returns table (
  feedback_id uuid,
  vote_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    public.feedback_votes.feedback_id,
    count(*)::bigint as vote_count
  from public.feedback_votes
  group by public.feedback_votes.feedback_id
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_leader_responses_updated_at on public.leader_responses;
create trigger set_leader_responses_updated_at
before update on public.leader_responses
for each row execute procedure public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.leaders enable row level security;
alter table public.leader_accounts enable row level security;
alter table public.feedback enable row level security;
alter table public.leader_responses enable row level security;
alter table public.projects enable row level security;
alter table public.feedback_votes enable row level security;
alter table public.feedback_reports enable row level security;
alter table public.abuse_logs enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "leaders_public_read" on public.leaders;
create policy "leaders_public_read"
on public.leaders
for select
using (is_active = true or public.is_admin() or public.is_leader_for_office(id));

drop policy if exists "leaders_admin_write" on public.leaders;
create policy "leaders_admin_write"
on public.leaders
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "leader_accounts_read" on public.leader_accounts;
create policy "leader_accounts_read"
on public.leader_accounts
for select
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "leader_accounts_admin_write" on public.leader_accounts;
create policy "leader_accounts_admin_write"
on public.leader_accounts
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "feedback_public_student_admin_leader_read" on public.feedback;
create policy "feedback_public_student_admin_leader_read"
on public.feedback
for select
using (
  moderation_status = 'approved'
  or student_profile_id = auth.uid()
  or public.is_admin()
  or public.is_leader_for_office(leader_id)
  /*
   * General feedback has no office to match on, so Core Seven members are the
   * ones who get to see it before it is approved.
   */
  or (leader_id is null and public.is_seven_core_leader())
);

drop policy if exists "feedback_student_insert" on public.feedback;
create policy "feedback_student_insert"
on public.feedback
for insert
with check (
  auth.uid() is not null
  and public.current_profile_role() = 'student'
  and student_profile_id = auth.uid()
  and student_codename_snapshot = public.current_profile_codename()
  and institution_slug = public.current_institution_slug()
  and moderation_status = 'approved'
);

drop policy if exists "feedback_admin_update" on public.feedback;
create policy "feedback_admin_update"
on public.feedback
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "leader_responses_public_and_admin_read" on public.leader_responses;
create policy "leader_responses_public_and_admin_read"
on public.leader_responses
for select
using (
  exists (
    select 1 from public.feedback
    where public.feedback.id = feedback_id
      and public.feedback.moderation_status = 'approved'
  )
  or public.is_admin()
  or leader_profile_id = auth.uid()
);

drop policy if exists "leader_responses_leader_write" on public.leader_responses;
create policy "leader_responses_leader_write"
on public.leader_responses
for all
using (public.is_leader_for_office(leader_id))
with check (
  public.is_leader_for_office(leader_id)
  and leader_profile_id = auth.uid()
  and author_codename_snapshot = public.current_profile_codename()
);

drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read"
on public.projects
for select
using (true);

drop policy if exists "projects_leader_or_admin_write" on public.projects;
create policy "projects_leader_or_admin_write"
on public.projects
for all
using (public.is_admin() or public.is_leader_for_office(leader_id))
with check (
  public.is_admin()
  or (
    public.is_leader_for_office(leader_id)
    and leader_profile_id = auth.uid()
    /*
     * Any leader can post an update for their own office, but only Core Seven
     * members can badge one as an official SRC announcement.
     */
    and (is_official = false or public.is_seven_core_leader())
  )
);

drop policy if exists "votes_student_insert_read_own" on public.feedback_votes;
create policy "votes_student_insert_read_own"
on public.feedback_votes
for select
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "votes_student_insert" on public.feedback_votes;
create policy "votes_student_insert"
on public.feedback_votes
for insert
with check (
  auth.uid() is not null
  and public.current_profile_role() = 'student'
  and profile_id = auth.uid()
);

drop policy if exists "reports_student_insert_read_own" on public.feedback_reports;
create policy "reports_student_insert_read_own"
on public.feedback_reports
for select
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "reports_student_insert" on public.feedback_reports;
create policy "reports_student_insert"
on public.feedback_reports
for insert
with check (
  auth.uid() is not null
  and public.current_profile_role() = 'student'
  and profile_id = auth.uid()
);

drop policy if exists "reports_student_update_own" on public.feedback_reports;
create policy "reports_student_update_own"
on public.feedback_reports
for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "abuse_logs_admin_read" on public.abuse_logs;
create policy "abuse_logs_admin_read"
on public.abuse_logs
for select
using (public.is_admin());

/*
 * PostgREST answers from a cached copy of the schema. Supabase usually reloads
 * it on its own after DDL, but the reload is what makes new foreign keys
 * embeddable, so ask for it explicitly rather than waiting on a race.
 */
notify pgrst, 'reload schema';
