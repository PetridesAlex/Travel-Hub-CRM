-- Travel Agency CRM - Multi-tenant agencies (subscriptions + API keys)
-- Run in Supabase SQL Editor after 001 and 002

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled');

CREATE TABLE agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Travel Agency',
  api_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  subscription_plan text NOT NULL DEFAULT 'starter',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_agencies_owner ON agencies(owner_user_id);
CREATE INDEX idx_agencies_api_key ON agencies(api_key);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select own agency" ON agencies
  FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners insert own agency" ON agencies
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners update own agency" ON agencies
  FOR UPDATE USING (auth.uid() = owner_user_id);

-- Auto-create agency when a new user registers
CREATE OR REPLACE FUNCTION handle_new_user_agency()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agencies (name, owner_user_id)
  VALUES (
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'agency_name'), ''), 'My Travel Agency'),
    NEW.id
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_agency
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_agency();
