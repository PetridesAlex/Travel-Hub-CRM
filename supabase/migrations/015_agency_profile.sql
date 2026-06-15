-- Travel Hub CRM - Agency profile, billing, integrations (public fields)
-- Run in Supabase SQL Editor after 014. Do not modify RLS in this migration.

ALTER TABLE agencies
  ALTER COLUMN owner_user_id DROP NOT NULL;

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS invoice_footer text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS email_signature text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS monthly_price numeric(10, 2);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS is_protected boolean NOT NULL DEFAULT false;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS slack_webhook_url text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS slack_channel_name text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS slack_notifications_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS resend_domain text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS resend_from_email text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS resend_reply_to text;

UPDATE agencies
SET is_protected = true
WHERE name ILIKE '%honeywell%'
  AND is_protected = false;
