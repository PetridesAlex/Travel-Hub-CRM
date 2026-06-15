# Team Members Setup

Honeywell Travel employees share **one agency** — they do not get a separate "My Travel Agency" workspace.

## Run migrations (in order)

1. `019_agency_members.sql` — team table, moves Mary to Honeywell, updates agency access helpers
2. `020_rls_agency_scope.sql` — shared CRM data for all agency members
3. `021_invite_agency_employee_trigger.sql` — new invites join existing agency (no auto-agency)

## What changes

| Before | After |
|--------|-------|
| Every new user → own agency | Invited employees → join Honeywell |
| Mary → "My Travel Agency" owner | Mary → Honeywell agent |
| CRM data isolated by `user_id` | Team sees same clients, leads, bookings |

## Invite employees (Honeywell owner/admin)

1. Sign in as Honeywell owner
2. **Settings → Team**
3. Enter email, choose **Agent** or **Admin**, click **Invite**

New employees receive a Supabase invite email. When they accept, they join Honeywell — no new agency row.

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
