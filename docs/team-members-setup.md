# Team Members Setup

Honeywell Travel employees share **one agency** — they do not get a separate "My Travel Agency" workspace. Clients, leads, and bookings are the same for every login on the team.

## Run migrations (in order)

1. `019_agency_members.sql` — team table, moves Mary to Honeywell, updates agency access helpers
2. `020_rls_agency_scope.sql` — shared CRM data for all agency members
3. `021_invite_agency_employee_trigger.sql` — new invites join existing agency (no auto-agency)
4. `024_agency_member_priority.sql` — prefer Honeywell over empty personal orphan agencies

## What changes

| Before | After |
|--------|-------|
| Every new user → own agency | Invited employees → join Honeywell |
| Mary → "My Travel Agency" owner | Mary → Honeywell agent |
| CRM data isolated by `user_id` | Team sees same clients, leads, bookings |

## Invite employees (Honeywell owner/admin)

**Do not** ask employees to self-register on the login page first — that creates an empty personal agency.

1. Sign in as Honeywell owner (e.g. `petridesalexeu@gmail.com`)
2. Open **Settings → Team**
3. Enter their email, optional **display name**, choose **Agent** or **Admin**, click **Send invite**
4. They accept the invite email and set a password
5. They (or you at invite time) can set their display name — it appears in the header and on the Team list

New employees receive a Supabase invite email. When they accept, they join Honeywell — no new agency row.

### If someone already self-registered

Inviting an existing user onto Honeywell now:

- Adds them as a team member on Honeywell
- Removes their empty default “My Travel Agency” orphan (no clients/leads)
- Agency resolution prefers Honeywell over leftover personal owner memberships

They should sign out and back in after being invited.

## Display names

Each login has its own name (`user_metadata.full_name`):

- **Settings → Account** — edit **Display name** (shown in the header)
- **Settings → Team** invite — optional name applied when inviting / adding an existing user
- **Team list** — shows display name and email

## Roles

| Role | CRM access | Invite team | Edit settings |
|------|------------|-------------|---------------|
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes |
| Agent | Yes | No | No |

## Mary (existing account)

Migration `019` automatically:

- Adds `mary.spyrou@asg.com.cy` as **agent** on Honeywell Travel
- Removes her orphan "My Travel Agency" row

Mary should sign out and back in after migrations run.
