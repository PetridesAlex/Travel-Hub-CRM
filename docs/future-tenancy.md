# Future Tenancy

Completed in team members phase:

- `019_agency_members.sql` — team roles per agency
- `020_rls_agency_scope.sql` — RLS policies on `agency_id`
- `021_invite_agency_employee_trigger.sql` — employee invites skip auto-agency

Still deferred:

- Subscription enforcement middleware (`checkAgencyActive.js` stub exists)
- `UNIQUE(agency_id, invoice_number)` constraint migration

See `docs/team-members-setup.md` for how to invite Honeywell employees.
