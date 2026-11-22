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
|   |-- admin-seed.sql
|   |-- demo-seed.sql
|   |-- leader-seed.sql
|   |-- anon-account-seed.sql
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
|-- dashboard.html          # students
|-- src-dashboard.html      # leaders
|-- src-feedback.html       # leaders
|-- src-updates.html        # leaders
|-- admin-dashboard.html
|-- moderation.html
|-- settings.html
|-- updates.html
|-- student-dashboard.html  # redirect to dashboard.html
`-- leader-dashboard.html   # redirect to src-dashboard.html
```

## Dashboards

Each role gets its own workspace, and login routes to the right one automatically:

- **Students** use `dashboard.html`: their own feedback history, the community stream, and recent office updates.
- **Leaders** use the three SRC pages: `src-dashboard.html` for the overview, `src-feedback.html` to answer feedback, and `src-updates.html` to publish updates.
- **Admins** use `admin-dashboard.html` and `moderation.html`.

Leaders can switch between their real name and their codename with the identity toggle
on each SRC page. The choice is stored per browser and stamped onto each record as it is
saved, so changing it later never rewrites anything already published.

"Core Seven" is not a separate flag. It means a leader whose office sits in the
`seven-core` department, which the offices table already records. Core Seven members
additionally see general feedback — feedback students address to the SRC as a whole
rather than to one office — and are the only ones who can badge an update as official.

## Setup

1. Create a Supabase project.
2. Disable email confirmation in Supabase Auth for this demo.
3. Copy [assets/js/config.example.js](d:\Projects\leaderrate\assets\js\config.example.js) into `assets/js/config.js`.
4. Add your Supabase URL and anon key.
5. Run [supabase/schema.sql](d:\Projects\leaderrate\supabase\schema.sql) in the Supabase SQL editor.
6. Run [supabase/admin-seed.sql](d:\Projects\leaderrate\supabase\admin-seed.sql) to create the admin login.
7. Run [supabase/demo-seed.sql](d:\Projects\leaderrate\supabase\demo-seed.sql) if you want the demo offices and sample feedback.
8. Run [supabase/leader-seed.sql](d:\Projects\leaderrate\supabase\leader-seed.sql) to create the nine leader logins.
9. Run [supabase/anon-account-seed.sql](d:\Projects\leaderrate\supabase\anon-account-seed.sql) to create the pool of anonymous accounts leaders switch to.
10. Deploy the `log-abuse` and `create-leader-account` edge functions if you want the full admin flow.

Steps 5 to 9 are safe to re-run, in that order.

`demo-seed.sql` only records which codename owns which office; it cannot create Auth
users. Without step 8 no leader can sign in, and the SRC pages have nothing to show.

If a seed fails with `relation "public.leaders" does not exist`, the schema did not finish
creating its tables. Re-run [supabase/schema.sql](d:\Projects\leaderrate\supabase\schema.sql)
before the seeds.

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

Admin, from [supabase/admin-seed.sql](d:\Projects\leaderrate\supabase\admin-seed.sql):

- codename: `campus_admin`
- password: `AdminDemo!2026`

Leaders, from [supabase/leader-seed.sql](d:\Projects\leaderrate\supabase\leader-seed.sql).
Nine offices get an account — the Seven Core, plus the STS Coordinator and the Academic
Affairs Officer. Every other office stays a public record with no login.

| codename | password | office | Core Seven |
| --- | --- | --- | --- |
| `srcp` | `Jf9j-cx7a-jbYU` | SRC President | yes |
| `srcvp` | `THCA-TJgW-FG2E` | SRC Vice President | yes |
| `srcgs` | `GbwV-rhhb-8yTA` | SRC Secretary | yes |
| `srcfs` | `3mFQ-tyxy-2HpR` | SRC Financial Secretary | yes |
| `srct` | `9JVd-Fmku-Cbnb` | SRC Treasurer | yes |
| `srcwc` | `UjNY-sEBM-dbvM` | SRC Women's Commissioner | yes |
| `srcpr` | `mv7J-pSbF-b7hp` | Public Relations Officer | yes |
| `stsco` | `SuzR-UEqg-V2zK` | STS Coordinator | no |
| `aao` | `sbu4-Fd6C-uZFe` | Academic Affairs Officer | no |

The codename names the office on purpose — this account speaks publicly for that office,
so there is nothing to hide. The password is random for the opposite reason: an earlier
draft used `COEP26`, `COEVP26`, `COET26` and so on, which anyone could derive from the
office abbreviation after seeing a single card.

Sign in as any of the first seven to see the general-feedback column and the official
update badge; sign in as `stsco` to see what a leader outside the core sees.

### Changing and resetting passwords

Both of a leader's accounts have their own password and can be changed independently.

**By the holder.** Settings → Change password acts on whichever account is signed in at
that moment, and names it in the prompt so there is no doubt which one is changing. To
change the other one, switch across first. The new password is asked for twice, because
there is no email on these accounts and a typo cannot be undone by the holder.

**By an admin.** Re-run `leader-seed.sql` or `anon-account-seed.sql`. Every password goes
back to the table above, which is the only recovery route for a forgotten one — there is
no "forgot password" link, because the accounts have no real email address to send it to.

Both seed files have a `reset_passwords` flag near the top, set to `true`. Set it to
`false` before re-running for any other reason — adding an office, or repairing the auth
plumbing — otherwise the run silently reverts every password a holder has chosen since,
and they will only find out at their next sign-in.

### The anonymous pool

From [supabase/anon-account-seed.sql](d:\Projects\leaderrate\supabase\anon-account-seed.sql).
Nine ordinary student accounts, deliberately **not assigned** to any office:

| codename | password |
| --- | --- |
| `quarry824` | `GGeD-USES-Pjdr` |
| `marble537` | `FcnH-nhAb-vr7b` |
| `hollow992` | `TnQ3-AM3A-WBRD` |
| `drift248` | `Zh6Z-WpHC-PKsm` |
| `lantern404` | `b793-JnqJ-NAtw` |
| `copper357` | `MyRs-SVz8-C2qj` |
| `canyon548` | `hrhC-F7hd-RhvU` |
| `indigo341` | `AebJ-Jhaz-pqnc` |
| `bramble819` | `mDf4-sA8x-A3Hq` |

Hand these out in any order and **write down nothing about who got which**. The list above
is a pool, not a mapping, and it has to stay that way: the moment a record exists tying
`quarry824` to the SRC President, every piece of feedback that account leaves on another
office becomes attributable, which is the one thing this pool exists to prevent.

Students register from the public UI and never need any of this.

## Switching accounts

A leader has two accounts: the office one that answers feedback publicly, and an ordinary
anonymous student one for browsing and rating offices like anyone else.

They are deliberately unrelated. No column, table, or seed file records which anonymous
account belongs to which office — because a stored mapping is exactly what would let
someone work out that a given piece of student feedback came from an executive. Hand each
anonymous codename over privately and keep no list.

The split is enforced by the database, not just by convention: a `leader` profile cannot
insert feedback at all, because `feedback_student_insert` requires the `student` role. So
rating another office is only possible from the anonymous account, which is the point.

Because nothing links them, the app cannot look up "the other account" either. Instead,
once a browser has signed into both, the switch becomes one click — from the **Your
accounts** panel at the top of `src-dashboard.html`, or from the account menu on any page.
It works by keeping each session in its own slot and restoring the other one; passwords
are never stored, only the session token the Supabase client already persists to keep you
signed in. Logging out clears both slots.

So the first time, sign in to each account normally. After that the switch is there.

### Not the same as the byline toggle

`src-feedback.html` and `src-updates.html` have a separate "Respond as" / "Post as"
switch. That one only chooses whether a reply is signed with the holder's real name or
their office codename — it is published by the office either way and is not anonymous.
Switching *accounts* is the dashboard panel described above.

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
- **A seeded account gets `Invalid login credentials` even though everything looks right.**
  Creating an Auth user with plain inserts leaves it unable to sign in for three separate
  reasons, and all three look identical from outside — the row, the profile, the office
  link, and the password hash are all correct, and GoTrue never gets as far as checking
  the password:
  1. `instance_id` is null. GoTrue filters its user lookup on it, so the row is never found.
  2. The token columns (`confirmation_token`, `recovery_token`, `email_change`, …) are
     null. GoTrue scans them into plain Go strings, so a null aborts the query.
  3. There is no `auth.identities` row. An email sign-in resolves through identities.

  All three seed files now handle all three, and re-running a seed repairs accounts
  created by an earlier version. `leader-seed.sql` ends with a query that reports each of
  these per account, so a `false` in any column tells you which one is at fault. Note
  that an account first created in the Supabase dashboard has all three already and
  never shows the problem — so test with a seeded account, not a dashboard one.
- If the browser loads but profile-related reads fail with a recursion or stack-depth error, apply [supabase/profile-rls-hotfix.sql](d:\Projects\leaderrate\supabase\profile-rls-hotfix.sql).
- If dark mode still looks stale after CSS fixes, hard refresh the browser to clear cached styles.
