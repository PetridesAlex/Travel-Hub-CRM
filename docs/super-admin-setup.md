# Super Admin Setup

## 1. Run migrations (in order)

1. `015_agency_profile.sql`
2. `016_agency_integrations.sql`
3. `017_agency_invitations.sql`
4. `018_platform_admin_helpers.sql`

## 2. Grant super admin

Supabase Dashboard → Authentication → Users → App Metadata:

```json
{ "is_super_admin": true }
```

## 3. Environment variables

- `SUPABASE_SERVICE_ROLE_KEY` (required)
- `INTEGRATION_ENCRYPTION_KEY` (32+ chars, for Resend key encryption)
- `SLACK_WEBHOOK_URL` (global fallback for Honeywell)

## 4. Access

Sign in as super admin → `/admin/agencies`
