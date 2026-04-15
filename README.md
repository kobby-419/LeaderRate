# LeaderRate

LeaderRate is a small demo for Foso College of Education (FOSCO). Students use codenames to submit moderated feedback on offices, leaders respond publicly, and office updates stay visible in one place.

## Stack

- HTML
- CSS
- JavaScript
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
- unified student and leader dashboard
- admin dashboard

## Project Structure

```text
leaderrate/
|-- assets/
|   |-- css/
|   |-- images/
|   `-- js/
|-- supabase/
|   |-- schema.sql
|   |-- demo-seed.sql
|   |-- launch-reset.sql
|   |-- profile-rls-hotfix.sql
|   `-- functions/
|-- index.html
|-- leaders.html
|-- leader.html
|-- leaderboard.html
|-- feedback.html
|-- login.html
|-- register.html
|-- dashboard.html
|-- admin-dashboard.html
|-- moderation.html
|-- settings.html
|-- updates.html
|-- student-dashboard.html
`-- leader-dashboard.html
```

## Setup

1. Create a Supabase project.
2. Disable email confirmation in Supabase Auth for this demo.
3. Copy [assets/js/config.example.js](d:\Projects\leaderrate\assets\js\config.example.js) into `assets/js/config.js`.
4. Add your Supabase URL and anon key.
5. Run [supabase/schema.sql](d:\Projects\leaderrate\supabase\schema.sql) in the Supabase SQL editor.
6. Run [supabase/demo-seed.sql](d:\Projects\leaderrate\supabase\demo-seed.sql).
7. Deploy the `log-abuse` and `create-leader-account` edge functions if you want the full admin flow.

If an older database starts throwing profile-policy recursion errors, run [supabase/profile-rls-hotfix.sql](d:\Projects\leaderrate\supabase\profile-rls-hotfix.sql) as a targeted fix.

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

This is the only seeded login account.
Students register from the public UI. Office-linked accounts are not seeded.

## Notes

- Users log in publicly with codename and password only.
- Supabase Auth still uses internal synthetic emails behind the scenes.
- `dashboard.html` is role-aware for students and leaders. The legacy `student-dashboard.html` and `leader-dashboard.html` routes now redirect there.
- Feedback is public immediately in this demo and admins can censor harmful content afterward.
- Abuse logging is used to reduce spam, not to remove public anonymity.

## Recent Fixes

- Fixed the `stack depth limit exceeded` database error by changing the profile helper functions used by RLS to `security definer`, preventing recursive reads on `public.profiles`.
- Added [supabase/profile-rls-hotfix.sql](d:\Projects\leaderrate\supabase\profile-rls-hotfix.sql) for projects that already ran an older schema and only need the recursion fix applied.
- Fixed dark-mode regressions where some page-level cards and auth surfaces stayed white because the selectors targeted `.home-page`, `.auth-page`, `.leaders-page`, and `.updates-page` as descendants instead of body classes.
- Added autofill styling so saved browser credentials no longer turn login and register inputs pale in dark mode.
- Refined auth submit buttons so they now show a pressed state, switch to a loading label, and disable immediately after click to prevent double-submits.
- Simplified the office feedback form so it only keeps the office name, posting codename, rating, message, and submit action.

## Troubleshooting

- `Failed to fetch` usually means `assets/js/config.js` points to the wrong Supabase project or a project host that does not resolve. Check the URL and public key first.
- If the browser loads but profile-related reads fail with a recursion or stack-depth error, apply [supabase/profile-rls-hotfix.sql](d:\Projects\leaderrate\supabase\profile-rls-hotfix.sql).
- If dark mode still looks stale after CSS fixes, hard refresh the browser to clear cached styles.
