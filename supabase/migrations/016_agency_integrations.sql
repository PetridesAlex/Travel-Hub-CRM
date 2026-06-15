-- Travel Hub CRM - Encrypted integration secrets (service-role access only)
-- Run after 015

CREATE TABLE IF NOT EXISTS agency_integrations (
  agency_id uuid PRIMARY KEY REFERENCES agencies(id) ON DELETE CASCADE,
  resend_api_key_encrypted text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_agency_integrations_updated_at
  BEFORE UPDATE ON agency_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE agency_integrations ENABLE ROW LEVEL SECURITY;
