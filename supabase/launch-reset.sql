begin;

-- Launch reset for a real go-live:
-- - keep the institution and office roster
-- - clear all public/demo activity
-- - clear demo rating snapshots
-- - keep only admin accounts

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where role = 'admin'
  ) then
    raise exception 'Launch reset stopped: no admin profile exists to preserve.';
  end if;
end
$$;

truncate table
  public.feedback_votes,
  public.feedback_reports,
  public.leader_responses,
  public.projects,
  public.feedback,
  public.abuse_logs
restart identity cascade;

update public.leaders
set
  demo_rating = null,
  demo_review_count = 0,
  demo_performance = null;

delete from public.leader_accounts;

delete from public.profiles
where role <> 'admin';

delete from auth.users
where id not in (
  select id
  from public.profiles
  where role = 'admin'
);

commit;

-- Optional verification
-- select count(*) as office_count from public.leaders;
-- select count(*) as admin_profiles from public.profiles where role = 'admin';
-- select count(*) as feedback_count from public.feedback;
-- select count(*) as project_count from public.projects;
-- select count(*) as vote_count from public.feedback_votes;
-- select count(*) as report_count from public.feedback_reports;
-- select count(*) as response_count from public.leader_responses;
-- select count(*) as log_count from public.abuse_logs;
