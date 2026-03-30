# LeaderRate v1.0

LeaderRate is a small demo for Foso College of Education (FOSCO). Students use codenames to submit moderated feedback on offices, leaders respond publicly, and office updates stay visible in one place.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Supabase

## What It Does

- student registration with generated codenames
- shared login for students and leaders
- hidden admin login entry from the footer brand
- public leader directory
- office profile pages
- moderated feedback
- leader responses
- office updates
- student, leader, and admin dashboards

## Project Structure

```text
leaderrate/
├── assets/
│   ├── css/
│   └── js/
├── supabase/
│   ├── schema.sql
│   ├── demo-seed.sql
│   └── functions/
├── index.html
├── leaders.html
├── leader.html
├── leaderboard.html
├── feedback.html
├── login.html
├── register.html
├── student-dashboard.html
├── leader-dashboard.html
├── admin-dashboard.html
├── moderation.html
├── settings.html
└── updates.html
```

## Setup

1. Create a Supabase project.
2. Disable email confirmation in Supabase Auth for this demo.
3. Copy [assets/js/config.example.js](d:\Projects\leaderrate\assets\js\config.example.js) into `assets/js/config.js`.
4. Add your Supabase URL and anon key.
5. Run [supabase/schema.sql](d:\Projects\leaderrate\supabase\schema.sql) in the Supabase SQL editor.
6. Run [supabase/demo-seed.sql](d:\Projects\leaderrate\supabase\demo-seed.sql).
7. Deploy the `log-abuse` and `create-leader-account` edge functions if you want the full admin flow.

## Run Locally

Serve the project root with any static server, for example:

```powershell
python -m http.server 5500
```

Then open:

```text
http://localhost:5500/index.html
```

## Demo Accounts

Admin:

- codename: `campus_admin`
- password: `AdminDemo!2026`

Seeded leader login codenames:

- `steady_lantern`
- `quiet_bridge`
- `civic_oak`
- `hall_echo`
- `bright_compass`

Students register from the public UI.

## Notes

- Users log in publicly with codename and password only.
- Supabase Auth still uses internal synthetic emails behind the scenes.
- Feedback is public only after admin moderation.
- Abuse logging is used to reduce spam, not to remove public anonymity.
