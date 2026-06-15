-- Travel Hub CRM - Agency owner/team invitations
-- Run after 016

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TABLE IF NOT EXISTS agency_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_invitations_agency ON agency_invitations(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_invitations_email ON agency_invitations(email);
CREATE INDEX IF NOT EXISTS idx_agency_invitations_status ON agency_invitations(status);

CREATE TRIGGER trg_agency_invitations_updated_at
  BEFORE UPDATE ON agency_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE agency_invitations ENABLE ROW LEVEL SECURITY;
