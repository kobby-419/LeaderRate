-- Demo content seed for LeaderRate
-- Run this after schema.sql. It seeds the institution, offices, sample feedback,
-- project updates, and leader-account placeholders.
--
-- The admin login lives in admin-seed.sql, so a real deployment can create an
-- admin without seeding this demo content.

insert into public.institutions (slug, name)
values ('foso-college-of-education', 'Foso College of Education (FOSCO)')
on conflict (slug) do update
set name = excluded.name;

insert into public.leaders (
  institution_slug,
  office_title,
  office_slug,
  display_name,
  department_slug,
  department_label,
  office_summary,
  office_focus,
  demo_rating,
  demo_review_count,
  demo_performance,
  office_order
)
values
  (
    'foso-college-of-education',
    'SRC President',
    'src-president',
    'Isaac Asumah Asante',
    'seven-core',
    'The Seven Core',
    'Leads the Students Representative Council, speaks for the student body in college-level decisions, and sets the direction of the SRC agenda for the year.',
    'Student representation, decision communication, and issue escalation',
    4.9,
    156,
    98,
    1
  ),
  (
    'foso-college-of-education',
    'SRC Secretary',
    'src-secretary',
    'Robert Gyamfi',
    'seven-core',
    'The Seven Core',
    'Keeps SRC records, drafts and circulates official notices, and documents council meetings and correspondence.',
    'Record accuracy, notice clarity, and meeting follow-up',
    4.5,
    89,
    90,
    2
  ),
  (
    'foso-college-of-education',
    'SRC Financial Secretary',
    'src-financial-secretary',
    'Michael Nyarko',
    'seven-core',
    'The Seven Core',
    'Prepares the SRC budget, records income and expenditure, and explains how student dues and levies are spent.',
    'Budget preparation, spending records, and financial accountability',
    4.2,
    58,
    84,
    3
  ),
  (
    'foso-college-of-education',
    'SRC Vice President',
    'src-vice-president',
    'Deborah Yeboah',
    'seven-core',
    'The Seven Core',
    'Deputises for the president, oversees SRC committees, and takes on representation and programme duties when the president is unavailable.',
    'Committee oversight, leadership continuity, and student representation',
    4.7,
    112,
    94,
    6
  ),
  (
    'foso-college-of-education',
    'SRC Women''s Commissioner',
    'src-women-commissioner',
    'Bervelyn Ghorman',
    'seven-core',
    'The Seven Core',
    'Represents the interests of female students, leads women-focused programmes, and handles welfare and safety concerns raised by women on campus.',
    'Welfare, safety, inclusion, and advocacy for women students',
    4.3,
    67,
    86,
    7
  ),
  (
    'foso-college-of-education',
    'SRC Treasurer',
    'src-treasurer',
    'Nancy Quaning Boahemaa',
    'seven-core',
    'The Seven Core',
    'Holds and tracks SRC funds, keeps payment records, and works with the financial secretary to report on student money.',
    'Fund custody, record keeping, and transparent reporting',
    4.6,
    94,
    92,
    8
  ),
  (
    'foso-college-of-education',
    'Public Relations Officer',
    'public-relations-officer',
    'Emmanuel Sena Forley',
    'seven-core',
    'The Seven Core',
    'Manages SRC communication, publicises council decisions and events, and represents the image of student leadership on notice boards and online.',
    'Announcement timeliness, message clarity, and campus visibility',
    4.7,
    103,
    94,
    9
  ),
  (
    'foso-college-of-education',
    'STS Coordinator',
    'sts-coordinator',
    'Ms. Ruby Jecty',
    'coordinators',
    'Coordinators',
    'Coordinates Supported Teaching in School placements, links student-teachers with partner schools and mentors, and follows up on lesson observation and reporting requirements.',
    'Placement arrangements, school liaison, and STS reporting support',
    4.8,
    118,
    96,
    10
  ),
  (
    'foso-college-of-education',
    'Academic Affairs Officer',
    'academic-affairs-officer',
    'Mr. Emmanuel Boateng',
    'coordinators',
    'Coordinators',
    'Handles academic concerns raised by students, liaises with departments on timetables and assessments, and follows up on grading and results queries.',
    'Assessment queries, department liaison, and academic issue follow-up',
    4.5,
    87,
    90,
    11
  ),
  (
    'foso-college-of-education',
    'Academic Coordinators',
    'academic-coordinators',
    'Sadick & Hannah',
    'coordinators',
    'Coordinators',
    'Organise study support for students, including revision clinics, tutorials, and past-question sessions, and pass academic information on to class groups.',
    'Study support, revision planning, and academic information sharing',
    4.1,
    52,
    82,
    5
  ),
  (
    'foso-college-of-education',
    'Cafeteria Coordinators',
    'cafeteria-coordinators',
    'Richmond & Emmanuella',
    'coordinators',
    'Coordinators',
    'Oversee student dining concerns, monitor food quality, portions, and serving times, and carry complaints between students and the cafeteria service.',
    'Food quality, serving times, and complaint follow-up',
    4.6,
    96,
    92,
    12
  ),
  (
    'foso-college-of-education',
    'Properties and Sanitation Commissioners',
    'properties-and-sanitation-commissioners',
    'Justice & Emelia',
    'coordinators',
    'Coordinators',
    'Take custody of School property and equipment and coordinate campus sanitation duties, clean-up exercises, and waste management.',
    'Property custody, sanitation exercises, and campus cleanliness',
    4.3,
    64,
    86,
    13
  ),
  (
    'foso-college-of-education',
    'Entertainment Commissioners',
    'entertainment-commissioners',
    'Dampson & Priscilla',
    'coordinators',
    'Coordinators',
    'Plan and run student entertainment, from src jams and games nights to the major social events on the college calendar.',
    'Event planning, student turnout, and entertainment publicity',
    4.7,
    107,
    94,
    14
  ),
  (
    'foso-college-of-education',
    'Infirmary Coordinators',
    'infirmary-coordinators',
    'Sakina & Daniel',
    'coordinators',
    'Coordinators',
    'Link students with the college infirmary, follow up on sick and admitted students, and raise concerns about medicine supplies and clinic access.',
    'Clinic access, sick-student follow-up, and health communication',
    4.1,
    52,
    82,
    15
  ),
  (
    'foso-college-of-education',
    'Sports Coordinators',
    'sports-coordinators',
    'Williams & Grace',
    'coordinators',
    'Coordinators',
    'Organise inter-hall and inter-college sports, manage team selection and training schedules, and look after sports equipment and fixtures.',
    'Fixtures and training, team support, and sports equipment',
    4.4,
    76,
    88,
    22
  ),
  (
    'foso-college-of-education',
    'Obiri Hall Presidents',
    'obiri-hall-presidents',
    'Bismark & Sophia',
    'hall-executives',
    'Hall Executives',
    'Lead Obiri Hall, represent residents in student leadership, and run hall meetings, welfare support, and day-to-day resident concerns.',
    'Hall welfare, resident safety, and sanitation',
    4.8,
    121,
    96,
    4
  ),
  (
    'foso-college-of-education',
    'Essah Hall Presidents',
    'essah-hall-presidents',
    'Prince & Esther',
    'hall-executives',
    'Hall Executives',
    'Lead Essah Hall, speak for residents on welfare and facility issues, and follow up on repairs, water, and power concerns in the hall.',
    'Hall welfare, maintenance follow-up, and resident communication',
    4.5,
    83,
    90,
    16
  ),
  (
    'foso-college-of-education',
    'Quayson Hall Presidents',
    'quayson-hall-presidents',
    'Gabriel & Eunice',
    'hall-executives',
    'Hall Executives',
    'Lead Quayson Hall, surface resident concerns to student leadership, and coordinate hall duties, room allocation issues, and welfare support.',
    'Resident support, facilities upkeep, and hall communication',
    4.5,
    83,
    90,
    17
  ),
  (
    'foso-college-of-education',
    'Aboabo Hall Presidents',
    'aboabo-hall-presidents',
    'Labic & Juliana',
    'hall-executives',
    'Hall Executives',
    'Lead Aboabo Hall, represent residents on welfare and discipline matters, and coordinate sanitation duties and hall clean-up exercises.',
    'Resident welfare, sanitation, and representation',
    4.5,
    83,
    90,
    21
  ),
  (
    'foso-college-of-education',
    'Electoral Commissioners',
    'electoral-commissioners',
    'Samuel, Theophilus & Sarah',
    'other-executives',
    'Other Executives',
    'Run SRC elections from vetting and campaigns through voting and results, and keep the process neutral, orderly, and credible.',
    'Vetting fairness, voting process, and results credibility',
    4.1,
    52,
    82,
    18
  ),
  (
    'foso-college-of-education',
    'General Assembly',
    'general-assembly',
    'Alfred, Ellen, & Portia',
    'other-executives',
    'Other Executives',
    'Serves as the student legislative body, debates SRC policies and budgets, and holds the executive to account on behalf of students.',
    'Policy debate, executive oversight, and student representation',
    4.1,
    52,
    82,
    19
  ),
  (
    'foso-college-of-education',
    'Chief Justice',
    'chief-justice',
    'Francis Obeng',
    'other-executives',
    'Other Executives',
    'Heads the SRC judicial board, interprets the student constitution, and presides over disciplinary hearings and disputes between students and executives.',
    'Constitutional interpretation, fair hearings, and dispute resolution',
    4.1,
    52,
    82,
    20
  )
on conflict (office_slug) do update
set
  display_name = excluded.display_name,
  department_slug = excluded.department_slug,
  department_label = excluded.department_label,
  office_title = excluded.office_title,
  office_summary = excluded.office_summary,
  office_focus = excluded.office_focus,
  demo_rating = excluded.demo_rating,
  demo_review_count = excluded.demo_review_count,
  demo_performance = excluded.demo_performance,
  office_order = excluded.office_order;

insert into public.leader_accounts (leader_id, login_codename)
select leaders.id, seeded.login_codename
from (
  values
    ('src-president', 'steady_lantern'),
    ('src-secretary', 'quiet_bridge'),
    ('src-financial-secretary', 'civic_oak'),
    ('obiri-hall-presidents', 'hall_echo'),
    ('academic-affairs-officer', 'bright_compass')
) as seeded(office_slug, login_codename)
join public.leaders on leaders.office_slug = seeded.office_slug
on conflict (leader_id) do update
set login_codename = excluded.login_codename;

insert into public.feedback (
  institution_slug,
  leader_id,
  student_codename_snapshot,
  category,
  rating,
  message,
  moderation_status,
  moderation_note,
  created_at
)
select
  'foso-college-of-education',
  leaders.id,
  seeded.student_codename,
  seeded.category,
  seeded.rating,
  seeded.message,
  seeded.status,
  seeded.note,
  seeded.created_at
from (
  values
    (
      'src-president',
      'calm_owl',
      'Communication',
      4,
      'The office gave better updates during the water issue, but students still need earlier notice before service interruptions.',
      'approved',
      'Helpful and specific public feedback.',
      timezone('utc', now()) - interval '12 days'
    ),
    (
      'src-president',
      'kind_sparrow',
      'Transparency',
      5,
      'The recent town hall made the budget decisions clearer. Short summaries after meetings would help even more.',
      'approved',
      'Helpful and constructive.',
      timezone('utc', now()) - interval '7 days'
    ),
    (
      'src-secretary',
      'clear_river',
      'Responsiveness',
      3,
      'Meeting minutes are useful, but they are shared too late for class reps to act on them quickly.',
      'pending',
      null,
      timezone('utc', now()) - interval '2 days'
    ),
    (
      'src-financial-secretary',
      'calm_owl',
      'Project Delivery',
      2,
      'Students still do not understand the timeline for the printer replacement after earlier promises.',
      'pending',
      null,
      timezone('utc', now()) - interval '1 day'
    ),
    (
      'obiri-hall-presidents',
      'kind_sparrow',
      'Welfare',
      4,
      'The sanitation drive helped. A floor-by-floor checklist would make hall clean-up weekends more effective.',
      'approved',
      'Constructive welfare feedback.',
      timezone('utc', now()) - interval '5 days'
    ),
    (
      'academic-affairs-officer',
      'clear_river',
      'Academic Support',
      5,
      'The revision clinics before mid-semester exams were useful and should happen every month.',
      'approved',
      'Useful public feedback.',
      timezone('utc', now()) - interval '4 days'
    )
) as seeded(office_slug, student_codename, category, rating, message, status, note, created_at)
join public.leaders on leaders.office_slug = seeded.office_slug;

insert into public.leader_responses (
  feedback_id,
  leader_id,
  author_codename_snapshot,
  response_message,
  created_at
)
select
  feedback.id,
  feedback.leader_id,
  'steady_lantern',
  'We have started using class representatives and notice boards earlier during service disruptions, and we are working on a faster fallback alert process.',
  timezone('utc', now()) - interval '6 days'
from public.feedback
join public.leaders on leaders.id = feedback.leader_id
where leaders.office_slug = 'src-president'
  and feedback.moderation_status = 'approved'
limit 1
on conflict (feedback_id) do nothing;

insert into public.projects (
  leader_id,
  office_title_snapshot,
  title,
  description,
  status,
  created_at
)
select
  leaders.id,
  leaders.office_title,
  seeded.title,
  seeded.description,
  seeded.status,
  seeded.created_at
from (
  values
    (
      'src-president',
      'Student Water Notice System',
      'Pilot a clearer outage notice flow using class representatives, printed boards, and same-day student alerts.',
      'ongoing',
      timezone('utc', now()) - interval '8 days'
    ),
    (
      'src-financial-secretary',
      'Printer Replacement Budget Brief',
      'Prepare a short budget explanation showing the procurement stage, approved funds, and expected delivery date for the student printing point.',
      'planned',
      timezone('utc', now()) - interval '3 days'
    ),
    (
      'obiri-hall-presidents',
      'Monthly Hall Sanitation Rotation',
      'Introduce a floor-based support rota with resident representatives and a published checklist.',
      'ongoing',
      timezone('utc', now()) - interval '6 days'
    ),
    (
      'academic-affairs-officer',
      'Revision Clinic Series',
      'Run subject-based revision clinics before each assessment window and publish the timetable one week ahead.',
      'completed',
      timezone('utc', now()) - interval '10 days'
    )
) as seeded(office_slug, title, description, status, created_at)
join public.leaders on leaders.office_slug = seeded.office_slug;

insert into public.abuse_logs (
  institution_slug,
  event_type,
  severity,
  ip_address,
  user_agent,
  fingerprint_hash,
  metadata,
  created_at
)
values
  (
    'foso-college-of-education',
    'student_register_blocked',
    'warning',
    '203.0.113.16',
    'Seeded demo event',
    'demo-device-a',
    '{"reason":"too_many_recent_registrations"}'::jsonb,
    timezone('utc', now()) - interval '2 days'
  ),
  (
    'foso-college-of-education',
    'feedback_submitted',
    'info',
    '203.0.113.29',
    'Seeded demo event',
    'demo-device-b',
    '{"count":3,"window":"10m"}'::jsonb,
    timezone('utc', now()) - interval '1 day'
  );

