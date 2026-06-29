-- Demo content seed for LeaderRate
-- Run this after schema.sql. It seeds the institution, offices, sample feedback,
-- project updates, and leader-account placeholders.

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
    'Bismark & Sophia',
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
    'Academics/Assessment Officer',
    'academics-coordinator',
    'Mr. Emmanuel Boateng',
    'coordinators',
    'Coordinators',
    'Supports assessment planning, academic coordination, and follow-up on student learning concerns across campus.',
    'Assessment coordination, academic planning, and student support',
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
    'Aryi & Emmanuella',
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
    'Justice & Emilia',
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
    'Essah Hall Presidents',
    'essah-hall-presidents',
    'Prince & Ester',
    'hall-executives',
    'Hall Executives',
    'Represent student concerns in Essah Hall and coordinate resident welfare support.',
    'Hall welfare, support follow-up, and student communication',
    4.5,
    83,
    90,
    20
  ),
  (
    'foso-college-of-education',
    'Quayson Hall Presidents',
    'quayson-hall-presidents',
    'Enock &',
    'hall-executives',
    'Hall Executives',
    'Support hall representation and help surface resident concerns in Quayson Hall.',
    'Resident support, facilities, and hall communication',
    4.5,
    83,
    90,
    21
  ),
  (
    'foso-college-of-education',
    'Electoral Commissioner',
    'electoral-commissioner',
    'Samuel, Theophilus & Sarah',
    'other-executives',
    'Other Executives',
    'Handles student election processes and supports trust in electoral coordination.',
    'Election process clarity, neutrality, and communication',
    4.1,
    52,
    82,
    22
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
    23
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
    24
  ),
  (
    'foso-college-of-education',
    'Aboabo Hall Presidents',
    'aboabo-hall-presidents',
    'Labic & Juliana',
    'hall-executives',
    'Hall Executives',
    'Represent resident concerns in Aboabo Hall and coordinate welfare follow-up.',
    'Resident welfare, sanitation, and representation',
    4.5,
    83,
    90,
    25
  ),
  (
    'foso-college-of-education',
    'IT Officer',
    'it-officer-eddie-essel',
    'Mr. Eddie Essel',
    'officer',
    'Officers',
    'Supports campus technology operations and helps address ICT access and system issues that affect students and staff.',
    'System reliability, access support, and issue resolution',
    4.4,
    76,
    88,
    26
  ),
  (
    'foso-college-of-education',
    'Procurement Officer',
    'procurement-officer-michael-b-mensah',
    'Mr. Michael B. Mensah',
    'officer',
    'Officers',
    'Handles procurement processes and helps keep purchasing timelines and supply requests moving across the institution.',
    'Procurement timelines, process clarity, and accountability',
    4.4,
    76,
    88,
    27
  ),
  (
    'foso-college-of-education',
    'Stores Officer',
    'stores-officer-johnathan-lord-sam',
    'Mr. Johnathan Lord-Sam',
    'officer',
    'Officers',
    'Oversees stores operations and supports the tracking, availability, and release of institutional items and supplies.',
    'Stock availability, record keeping, and request follow-up',
    4.4,
    76,
    88,
    28
  ),
  (
    'foso-college-of-education',
    'Internal Auditor',
    'internal-auditor-ebenezer-takyi-danquah',
    'Mr. Ebenezer Takyi-Danquah',
    'officer',
    'Officers',
    'Independently evaluates an organizational operations, internal controls, and risk management processes to ensure efficiency and compliance.',
    'Objective insights and recommendations to help improve operations and mitigate risks',
    4.4,
    76,
    88,
    39
  ),
  (
    'foso-college-of-education',
    'Lecturer, Social Department',
    'lecturer-social-ampem-darko',
    'Mr. Ampem-Darko',
    'lecturers',
    'Lecturers',
    'Teaches in the Social Department and supports student-teachers through instruction, assessment guidance, and classroom follow-up.',
    'Teaching clarity, assessment feedback, and academic support',
    4.4,
    76,
    88,
    30
  ),
  (
    'foso-college-of-education',
    'Lecturer, Social Department',
    'lecturer-social-ivy-ekuban',
    'Md. Ivy Ekuban',
    'lecturers',
    'Lecturers',
    'Teaches in the Social Department and supports student-teachers through instruction, assessment guidance, and classroom follow-up.',
    'Teaching clarity, assessment feedback, and academic support',
    4.4,
    76,
    88,
    31
  ),
  (
    'foso-college-of-education',
    'Lecturer, Social Department',
    'lecturer-social-inusah-ibrahim',
    'Mr. Inusah Ibrahim',
    'lecturers',
    'Lecturers',
    'Teaches in the Social Department and supports student-teachers through instruction, assessment guidance, and classroom follow-up.',
    'Teaching clarity, assessment feedback, and academic support',
    4.4,
    76,
    88,
    32
  ),
  (
    'foso-college-of-education',
    'Lecturer, Social Department',
    'lecturer-social-john-paul',
    'Mr. John Paul',
    'lecturers',
    'Lecturers',
    'Teaches in the Social Department and supports student-teachers through instruction, assessment guidance, and classroom follow-up.',
    'Teaching clarity, assessment feedback, and academic support',
    4.4,
    76,
    88,
    33
  ),
  (
    'foso-college-of-education',
    'Lecturer, Social Department',
    'lecturer-social-robert-mensah',
    'Mr. Robert Mensah',
    'lecturers',
    'Lecturers',
    'Teaches in the Social Department and supports student-teachers through instruction, assessment guidance, and classroom follow-up.',
    'Teaching clarity, assessment feedback, and academic support',
    4.4,
    76,
    88,
    34
  ),
  (
    'foso-college-of-education',
    'Lecturer, Social Department',
    'lecturer-social-md-rebecca',
    'Md. Rebecca',
    'lecturers',
    'Lecturers',
    'Teaches in the Social Department and supports student-teachers through instruction, assessment guidance, and classroom follow-up.',
    'Teaching clarity, assessment feedback, and academic support',
    4.4,
    76,
    88,
    35
  ),
  (
    'foso-college-of-education',
    'Sports Coordinators',
    'sports-coordinators',
    'Williams & Grace',
    'coordinators',
    'Coordinators',
    'Coordinate student sports activities, fixtures, and participation logistics across campus.',
    'Sports organisation, student welfare, and communication',
    4.4,
    76,
    88,
    36
  ),
  (
    'foso-college-of-education',
    'Lecturer, Science Department',
    'lecturer-science-assafuah-drokow',
    'Dr. Assafuah-Drokow',
    'lecturers',
    'Lecturers',
    'Teaches in the Science Department and supports student-teachers through theory and practical learning activities.',
    'Concept clarity, practical support, and assessment guidance',
    4.4,
    76,
    88,
    37
  ),
  (
    'foso-college-of-education',
    'Lecturer, Science Department',
    'lecturer-science-francis-quansah',
    'Mr. Francis Quansah',
    'lecturers',
    'Lecturers',
    'Teaches in the Science Department and supports student-teachers through theory and practical learning activities.',
    'Concept clarity, practical support, and assessment guidance',
    4.4,
    76,
    88,
    38
  ),
  (
    'foso-college-of-education',
    'Lecturer, Science Department',
    'lecturer-science-judith-asabil',
    'Ms. Judith Asabil',
    'lecturers',
    'Lecturers',
    'Teaches in the Science Department and supports student-teachers through theory and practical learning activities.',
    'Concept clarity, practical support, and assessment guidance',
    4.4,
    76,
    88,
    39
  ),
  (
    'foso-college-of-education',
    'Lecturer, Science Department',
    'lecturer-science-solomon-essel',
    'Mr. Solomon Essel',
    'lecturers',
    'Lecturers',
    'Teaches in the Science Department and supports student-teachers through theory and practical learning activities.',
    'Concept clarity, practical support, and assessment guidance',
    4.4,
    76,
    88,
    40
  ),
  (
    'foso-college-of-education',
    'Lecturer, Science Department',
    'lecturer-science-victoria-adu',
    'Ms. Victoria Adu',
    'lecturers',
    'Lecturers',
    'Teaches in the Science Department and supports student-teachers through theory and practical learning activities.',
    'Concept clarity, practical support, and assessment guidance',
    4.4,
    76,
    88,
    41
  ),
  (
    'foso-college-of-education',
    'Lecturer, Science Department',
    'lecturer-science-charles-appiah',
    'Mr. Charles Appiah',
    'lecturers',
    'Lecturers',
    'Teaches in the Science Department and supports student-teachers through theory and practical learning activities.',
    'Concept clarity, practical support, and assessment guidance',
    4.4,
    76,
    88,
    42
  ),
  (
    'foso-college-of-education',
    'Lecturer, Science Department',
    'lecturer-science-isaac-asare',
    'Mr. Isaac Asare',
    'lecturers',
    'Lecturers',
    'Teaches in the Science Department and supports student-teachers through theory and practical learning activities.',
    'Concept clarity, practical support, and assessment guidance',
    4.4,
    76,
    88,
    43
  ),
  (
    'foso-college-of-education',
    'Lecturer, Maths and IT Department',
    'lecturer-maths-it-john-mensah',
    'Mr. John Mensah',
    'lecturers',
    'Lecturers',
    'Teaches in the Maths and IT Department and supports student-teachers through concept explanations, practice, and technical guidance.',
    'Concept clarity, practical support, and assessment feedback',
    4.4,
    76,
    88,
    44
  ),
  (
    'foso-college-of-education',
    'Lecturer, Maths and IT Department',
    'lecturer-maths-it-charles-yankson',
    'Mr. Charles Yankson',
    'lecturers',
    'Lecturers',
    'Teaches in the Maths and IT Department and supports student-teachers through concept explanations, practice, and technical guidance.',
    'Concept clarity, practical support, and assessment feedback',
    4.4,
    76,
    88,
    45
  ),
  (
    'foso-college-of-education',
    'Lecturer, Maths and IT Department',
    'lecturer-maths-it-doris-baah',
    'Ms. Doris Baah',
    'lecturers',
    'Lecturers',
    'Teaches in the Maths and IT Department and supports student-teachers through concept explanations, practice, and technical guidance.',
    'Concept clarity, practical support, and assessment feedback',
    4.4,
    76,
    88,
    46
  ),
  (
    'foso-college-of-education',
    'Lecturer, Maths and IT Department',
    'lecturer-maths-it-george-yeboah-mensah',
    'Mr. George Yeboah Mensah',
    'lecturers',
    'Lecturers',
    'Teaches in the Maths and IT Department and supports student-teachers through concept explanations, practice, and technical guidance.',
    'Concept clarity, practical support, and assessment feedback',
    4.4,
    76,
    88,
    47
  ),
  (
    'foso-college-of-education',
    'Lecturer, Maths and IT Department',
    'lecturer-maths-it-mary-acquah',
    'Ms. Mary Acquah',
    'lecturers',
    'Lecturers',
    'Teaches in the Maths and IT Department and supports student-teachers through concept explanations, practice, and technical guidance.',
    'Concept clarity, practical support, and assessment feedback',
    4.4,
    76,
    88,
    48
  ),
  (
    'foso-college-of-education',
    'Lecturer, Maths and IT Department',
    'lecturer-maths-it-michael-biney-quansah',
    'Mr. Michael Biney Quansah',
    'lecturers',
    'Lecturers',
    'Teaches in the Maths and IT Department and supports student-teachers through concept explanations, practice, and technical guidance.',
    'Concept clarity, practical support, and assessment feedback',
    4.4,
    76,
    88,
    49
  ),
  (
    'foso-college-of-education',
    'Lecturer, Maths and IT Department',
    'lecturer-maths-it-gabriel-ansah',
    'Mr. Gabriel Ansah',
    'lecturers',
    'Lecturers',
    'Teaches in the Maths and IT Department and supports student-teachers through concept explanations, practice, and technical guidance.',
    'Concept clarity, practical support, and assessment feedback',
    4.4,
    76,
    88,
    50
  ),
  (
    'foso-college-of-education',
    'Lecturer, Education Studies Department',
    'lecturer-education-studies-kennedy-boe-doe',
    'Mr. Kennedy Boe-Doe',
    'lecturers',
    'Lecturers',
    'Teaches in the Education Studies Department and guides student-teachers through pedagogy, theory, and professional practice.',
    'Pedagogy support, explanation clarity, and assessment guidance',
    4.4,
    76,
    88,
    51
  ),
  (
    'foso-college-of-education',
    'Lecturer, Education Studies Department',
    'lecturer-education-studies-mabel-anane',
    'Ms. Mabel Anane',
    'lecturers',
    'Lecturers',
    'Teaches in the Education Studies Department and guides student-teachers through pedagogy, theory, and professional practice.',
    'Pedagogy support, explanation clarity, and assessment guidance',
    4.4,
    76,
    88,
    52
  ),
  (
    'foso-college-of-education',
    'Lecturer, Education Studies Department',
    'lecturer-education-studies-sylvester-tenkorang',
    'Mr. Sylvester Tenkorang',
    'lecturers',
    'Lecturers',
    'Teaches in the Education Studies Department and guides student-teachers through pedagogy, theory, and professional practice.',
    'Pedagogy support, explanation clarity, and assessment guidance',
    4.4,
    76,
    88,
    53
  ),
  (
    'foso-college-of-education',
    'Lecturer, Language Department',
    'lecturer-language-jerome-nketsiah',
    'Dr. Jerome Nketsiah',
    'lecturers',
    'Lecturers',
    'Teaches in the Language Department and supports student-teachers in literacy, communication, and language learning.',
    'Explanation clarity, language support, and timely feedback',
    4.4,
    76,
    88,
    54
  ),
  (
    'foso-college-of-education',
    'Lecturer, Language Department',
    'lecturer-language-fiifi-kennedy',
    'Mr. Fiifi Kennedy',
    'lecturers',
    'Lecturers',
    'Teaches in the Language Department and supports student-teachers in literacy, communication, and language learning.',
    'Explanation clarity, language support, and timely feedback',
    4.4,
    76,
    88,
    55
  ),
  (
    'foso-college-of-education',
    'Lecturer, Language Department',
    'lecturer-language-ruby-jecty',
    'Ms. Ruby Jecty',
    'lecturers',
    'Lecturers',
    'Teaches in the Language Department and supports student-teachers in literacy, communication, and language learning.',
    'Explanation clarity, language support, and timely feedback',
    4.4,
    76,
    88,
    56
  ),
  (
    'foso-college-of-education',
    'Lecturer, Language Department',
    'lecturer-language-faustina-n-taylor',
    'Ms. Faustina N. Taylor',
    'lecturers',
    'Lecturers',
    'Teaches in the Language Department and supports student-teachers in literacy, communication, and language learning.',
    'Explanation clarity, language support, and timely feedback',
    4.4,
    76,
    88,
    57
  ),
  (
    'foso-college-of-education',
    'Lecturer, Language Department',
    'lecturer-language-leticia-asamoah',
    'Ms. Leticia Asamoah',
    'lecturers',
    'Lecturers',
    'Teaches in the Language Department and supports student-teachers in literacy, communication, and language learning.',
    'Explanation clarity, language support, and timely feedback',
    4.4,
    76,
    88,
    58
  ),
  (
    'foso-college-of-education',
    'Lecturer, Vocational Skills Department',
    'lecturer-vocational-skills-edger-stephen-boadi',
    'Mr. Edger Stephen Boadi',
    'lecturers',
    'Lecturers',
    'Teaches in the Vocational Skills Department and supports practical learning and skill development for student-teachers.',
    'Practical instruction, resource support, and feedback quality',
    4.4,
    76,
    88,
    59
  ),
  (
    'foso-college-of-education',
    'Lecturer, Vocational Skills Department',
    'lecturer-vocational-skills-comfort-arthur',
    'Ms. Comfort Arthur',
    'lecturers',
    'Lecturers',
    'Teaches in the Vocational Skills Department and supports practical learning and skill development for student-teachers.',
    'Practical instruction, resource support, and feedback quality',
    4.4,
    76,
    88,
    60
  ),
  (
    'foso-college-of-education',
    'Lecturer, Creative Arts Department',
    'lecturer-creative-arts-anthony-yawson',
    'Mr. Anthony Yawson',
    'lecturers',
    'Lecturers',
    'Teaches in the Creative Arts Department and supports studio-based learning, creativity, and practical assessment.',
    'Practical guidance, studio support, and assessment clarity',
    4.4,
    76,
    88,
    61
  ),
  (
    'foso-college-of-education',
    'Lecturer, Creative Arts Department',
    'lecturer-creative-arts-bismark-johns-ntsiful',
    'Mr. Bismark Johns Ntsiful',
    'lecturers',
    'Lecturers',
    'Teaches in the Creative Arts Department and supports studio-based learning, creativity, and practical assessment.',
    'Practical guidance, studio support, and assessment clarity',
    4.4,
    76,
    88,
    62
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

