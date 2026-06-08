-- Add individual vs business client classification

CREATE TYPE client_type AS ENUM ('individual', 'business');

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type client_type NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS company_name text;

-- Optional: index for filtering by type
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients (client_type);
