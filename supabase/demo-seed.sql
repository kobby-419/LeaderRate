-- Demo content seed for LeaderRate
-- Run this after schema.sql. It seeds the institution, offices, sample feedback,
-- project updates, and leader-account placeholders.

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
    'Isaac Asante',
    'seven-core',
    'The Seven Core',
    'Coordinates the main student leadership body and communicates broad campus decisions.',
    'Communication, transparency, and issue escalation',
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
    'Handles notices, meeting records, and office coordination for student leadership.',
    'Records, notice clarity, and follow-through',
    4.5,
    89,
    90,
    2
  ),
  (
    'foso-college-of-education',
    'Financial Secretary',
    'financial-secretary',
    'Michael Nyarkoh',
    'seven-core',
    'The Seven Core',
    'Explains spending, tracks approved student funds, and reports on office financial obligations.',
    'Budget visibility, procurement clarity, and accountability',
    4.2,
    58,
    84,
    3
  ),
  (
    'foso-college-of-education',
    'Hall President',
    'hall-president',
    'Bismark & Peter',
    'hall-executives',
    'Hall Executives',
    'Represents hall welfare concerns and coordinates resident support with student leadership.',
    'Hall welfare, safety, and sanitation',
    4.8,
    121,
    96,
    4
  ),
  (
    'foso-college-of-education',
    'Academic Affairs Officer',
    'academic-affairs-officer',
    'Sadick & Hannah',
    'coordinators',
    'Coordinators',
    'Supports academic communication, revision clinics, and student study concerns.',
    'Academic support, study resources, and lecturer communication',
    4.1,
    52,
    82,
    5
  ),
  (
    'foso-college-of-education',
    'Principal',
    'principal',
    'Dr. Anthony Barberyer',
    'administration',
    'Administration',
    'Leads the institution, sets broad direction, and oversees the academic and administrative agenda of the college.',
    'Institutional direction, governance, and leadership accountability',
    4.8,
    124,
    96,
    6
  ),
  (
    'foso-college-of-education',
    'Vice Principal',
    'vice-principal',
    'Dr. Sally Maison',
    'administration',
    'Administration',
    'Supports the principal, helps coordinate key decisions, and supervises day-to-day academic administration.',
    'Academic supervision, continuity, and internal coordination',
    4.6,
    98,
    92,
    7
  ),
  (
    'foso-college-of-education',
    'Dean of Students',
    'dean-of-students',
    'Md. Rebecca',
    'administration',
    'Administration',
    'Handles student welfare, conduct support, and student-facing administrative concerns.',
    'Student welfare, discipline support, and campus guidance',
    4.4,
    76,
    88,
    8
  ),
  (
    'foso-college-of-education',
    'College Vice President',
    'college-vice-president',
    'Deborah Yeaboah',
    'seven-core',
    'The Seven Core',
    'Supports the president and helps coordinate major student leadership programmes and representation duties.',
    'Leadership support, continuity, and student representation',
    4.7,
    112,
    94,
    9
  ),
  (
    'foso-college-of-education',
    'Women Commissioner',
    'women-commissioner',
    'Bervelyn Gorman',
    'seven-core',
    'The Seven Core',
    'Champions the welfare, safety, and representation of women students across campus.',
    'Welfare, inclusion, and student advocacy',
    4.3,
    67,
    86,
    10
  ),
  (
    'foso-college-of-education',
    'Treasurer',
    'treasurer',
    'Nancy Boahemaa',
    'seven-core',
    'The Seven Core',
    'Tracks approved funds, maintains records, and supports transparent student finance communication.',
    'Financial records, transparency, and fund tracking',
    4.6,
    94,
    92,
    11
  ),
  (
    'foso-college-of-education',
    'Public Relations Officer',
    'public-relations-officer',
    'Emmanuel Foli Sena',
    'seven-core',
    'The Seven Core',
    'Shares student leadership messages and helps shape how official updates reach the wider campus.',
    'Public communication, notices, and visibility',
    4.7,
    103,
    94,
    12
  ),
  (
    'foso-college-of-education',
    'STS Coordinator',
    'sts-coordinator',
    'Ms. Ruby Jecty',
    'coordinators',
    'Coordinators',
    'Coordinates STS-related planning, follow-up, and communication for students and faculty.',
    'Programme coordination, timelines, and communication',
    4.8,
    118,
    96,
    13
  ),
  (
    'foso-college-of-education',
    'Academics Coordinator',
    'academics-coordinator',
    'Mr. John Mensah',
    'coordinators',
    'Coordinators',
    'Supports academic planning, revision support, and issue follow-up around student learning.',
    'Academic guidance, planning, and class support',
    4.5,
    87,
    90,
    14
  ),
  (
    'foso-college-of-education',
    'College FO',
    'college-fo',
    'Mr. Kwabena Ampaben',
    'management',
    'Management',
    'Oversees finance-office responsibilities linked to institutional operations and accountability.',
    'Financial administration, process clarity, and reporting',
    4.4,
    73,
    88,
    15
  ),
  (
    'foso-college-of-education',
    'Cafeteria Prefect',
    'cafeteria-prefect',
    'Aryi & Zigah',
    'coordinators',
    'Coordinators',
    'Handles cafeteria coordination, student food-service concerns, and daily operating feedback.',
    'Food service coordination, queue flow, and student concerns',
    4.6,
    96,
    92,
    16
  ),
  (
    'foso-college-of-education',
    'General Coordinators',
    'general-coordinators',
    'Justice & Elijah',
    'coordinators',
    'Coordinators',
    'Support broad student activity coordination and assist with general executive follow-through.',
    'Cross-team coordination, logistics, and support work',
    4.3,
    64,
    86,
    17
  ),
  (
    'foso-college-of-education',
    'Entertainment Coordinators',
    'entertainment-coordinators',
    'Dampson & Priiscilla',
    'coordinators',
    'Coordinators',
    'Lead student entertainment planning and coordinate event visibility and participation.',
    'Event planning, student engagement, and publicity',
    4.7,
    107,
    94,
    18
  ),
  (
    'foso-college-of-education',
    'Infirmary Coordinators',
    'infirmary-coordinators',
    'Sakina & Daniel',
    'coordinators',
    'Coordinators',
    'Coordinate student-facing health support concerns and infirmary communication needs.',
    'Health support, access, and service communication',
    4.1,
    52,
    82,
    19
  ),
  (
    'foso-college-of-education',
    'Obri Hall Presidents',
    'obri-hall-presidents',
    'Bismark & Peter',
    'hall-executives',
    'Hall Executives',
    'Lead hall-level welfare, representation, and support issues for students living in Obri Hall.',
    'Hall welfare, sanitation, and resident representation',
    4.8,
    121,
    96,
    20
  ),
  (
    'foso-college-of-education',
    'Essah Hall Presidents',
    'essah-hall-presidents',
    'Isaac & Prince',
    'hall-executives',
    'Hall Executives',
    'Represent student concerns in Essah Hall and coordinate resident welfare support.',
    'Hall welfare, support follow-up, and student communication',
    4.5,
    83,
    90,
    21
  ),
  (
    'foso-college-of-education',
    'Quayson Hall Presidents',
    'quayson-hall-presidents',
    'Enock',
    'hall-executives',
    'Hall Executives',
    'Support hall representation and help surface resident concerns in Quayson Hall.',
    'Resident support, facilities, and hall communication',
    4.5,
    83,
    90,
    22
  ),
  (
    'foso-college-of-education',
    'Electoral Commissioner',
    'electoral-commissioner',
    'Unknown',
    'other-executives',
    'Other Executives',
    'Handles student election processes and supports trust in electoral coordination.',
    'Election process clarity, neutrality, and communication',
    4.1,
    52,
    82,
    23
  ),
  (
    'foso-college-of-education',
    'General Affairs',
    'general-affairs',
    'Alfred & Ellen',
    'other-executives',
    'Other Executives',
    'Supports practical student welfare matters, supplies coordination, and office assistance.',
    'Welfare logistics, supplies, and support coordination',
    4.1,
    52,
    82,
    24
  ),
  (
    'foso-college-of-education',
    'Chief Justice',
    'chief-justice',
    'Francis Obeng',
    'other-executives',
    'Other Executives',
    'Supports student judicial oversight and fair hearing processes where needed.',
    'Fair process, discipline handling, and judicial credibility',
    4.1,
    52,
    82,
    25
  ),
  (
    'foso-college-of-education',
    'Aboabo Hall Presidents',
    'aboabo-hall-presidents',
    'Labic & Adomakoh',
    'hall-executives',
    'Hall Executives',
    'Represent resident concerns in Aboabo Hall and coordinate welfare follow-up.',
    'Resident welfare, sanitation, and representation',
    4.5,
    83,
    90,
    26
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
    ('financial-secretary', 'civic_oak'),
    ('hall-president', 'hall_echo'),
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
      'financial-secretary',
      'calm_owl',
      'Project Delivery',
      2,
      'Students still do not understand the timeline for the printer replacement after earlier promises.',
      'pending',
      null,
      timezone('utc', now()) - interval '1 day'
    ),
    (
      'hall-president',
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
      'financial-secretary',
      'Printer Replacement Budget Brief',
      'Prepare a short budget explanation showing the procurement stage, approved funds, and expected delivery date for the student printing point.',
      'planned',
      timezone('utc', now()) - interval '3 days'
    ),
    (
      'hall-president',
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

