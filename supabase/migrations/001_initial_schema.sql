-- Travel Agency CRM - Initial Schema
-- Run this in Supabase SQL Editor

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE travel_type AS ENUM (
  'cruise', 'honeymoon', 'business', 'school_trip', 'group',
  'flight', 'hotel', 'package', 'other'
);

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'quoted', 'follow_up', 'confirmed', 'lost'
);

CREATE TYPE quotation_status AS ENUM (
  'draft', 'sent', 'accepted', 'rejected'
);

CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'cancelled', 'completed'
);

CREATE TYPE supplier_type AS ENUM (
  'hotel', 'airline', 'cruise', 'dmc', 'transfer', 'insurance', 'other'
);

CREATE TYPE task_status AS ENUM (
  'pending', 'completed'
);

CREATE TYPE email_draft_status AS ENUM (
  'draft', 'sent'
);

CREATE TYPE campaign_type AS ENUM (
  'cruise', 'honeymoon', 'school_trip', 'corporate', 'general'
);

CREATE TYPE campaign_status AS ENUM (
  'draft', 'scheduled', 'sent'
);

CREATE TYPE client_type AS ENUM (
  'individual', 'business'
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_quotation_profit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profit = COALESCE(NEW.selling_price, 0) - COALESCE(NEW.supplier_cost, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_booking_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance_due = COALESCE(NEW.total_cost, 0) - COALESCE(NEW.amount_paid, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_type client_type NOT NULL DEFAULT 'individual',
  full_name text NOT NULL,
  company_name text,
  email text,
  phone text,
  nationality text,
  passport_number text,
  date_of_birth date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  destination text,
  travel_type travel_type DEFAULT 'other',
  budget numeric(12, 2),
  number_of_adults integer DEFAULT 1,
  number_of_children integer DEFAULT 0,
  travel_dates text,
  status lead_status DEFAULT 'new',
  notes text,
  follow_up_date date,
  automation_processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  title text NOT NULL,
  destination text,
  supplier_cost numeric(12, 2) DEFAULT 0,
  selling_price numeric(12, 2) DEFAULT 0,
  profit numeric(12, 2) DEFAULT 0,
  currency text DEFAULT 'EUR',
  inclusions text,
  exclusions text,
  terms text,
  status quotation_status DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  booking_reference text,
  supplier_name text,
  travel_start_date date,
  travel_end_date date,
  total_cost numeric(12, 2) DEFAULT 0,
  amount_paid numeric(12, 2) DEFAULT 0,
  balance_due numeric(12, 2) DEFAULT 0,
  due_date date,
  status booking_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  supplier_type supplier_type DEFAULT 'other',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date date,
  status task_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript text NOT NULL,
  linked_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  processing_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  email_type text,
  subject text,
  body text,
  status email_draft_status DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  campaign_type campaign_type DEFAULT 'general',
  audience text,
  subject text,
  body text,
  status campaign_status DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_quotations_profit
  BEFORE INSERT OR UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION set_quotation_profit();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_balance
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_booking_balance();

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_email_drafts_updated_at
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_marketing_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_clients_user_name ON clients(user_id, full_name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_passport ON clients(passport_number);

CREATE INDEX idx_leads_user_status ON leads(user_id, status);
CREATE INDEX idx_leads_travel_type ON leads(travel_type);
CREATE INDEX idx_leads_client ON leads(client_id);

CREATE INDEX idx_quotations_client ON quotations(client_id);
CREATE INDEX idx_quotations_status ON quotations(status);

CREATE INDEX idx_bookings_user_balance ON bookings(user_id, balance_due);
CREATE INDEX idx_bookings_due_date ON bookings(due_date);
CREATE INDEX idx_bookings_client ON bookings(client_id);

CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date, status);
CREATE INDEX idx_tasks_client ON tasks(client_id);

CREATE INDEX idx_voice_notes_user ON voice_notes(user_id);
CREATE INDEX idx_suppliers_user ON suppliers(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- clients
CREATE POLICY "Users select own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);

-- leads
CREATE POLICY "Users select own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own leads" ON leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own leads" ON leads FOR DELETE USING (auth.uid() = user_id);

-- quotations
CREATE POLICY "Users select own quotations" ON quotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own quotations" ON quotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own quotations" ON quotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own quotations" ON quotations FOR DELETE USING (auth.uid() = user_id);

-- bookings
CREATE POLICY "Users select own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bookings" ON bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own bookings" ON bookings FOR DELETE USING (auth.uid() = user_id);

-- suppliers
CREATE POLICY "Users select own suppliers" ON suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own suppliers" ON suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own suppliers" ON suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own suppliers" ON suppliers FOR DELETE USING (auth.uid() = user_id);

-- tasks
CREATE POLICY "Users select own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- voice_notes
CREATE POLICY "Users select own voice_notes" ON voice_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own voice_notes" ON voice_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own voice_notes" ON voice_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own voice_notes" ON voice_notes FOR DELETE USING (auth.uid() = user_id);

-- email_drafts
CREATE POLICY "Users select own email_drafts" ON email_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own email_drafts" ON email_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own email_drafts" ON email_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own email_drafts" ON email_drafts FOR DELETE USING (auth.uid() = user_id);

-- marketing_campaigns
CREATE POLICY "Users select own marketing_campaigns" ON marketing_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own marketing_campaigns" ON marketing_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own marketing_campaigns" ON marketing_campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own marketing_campaigns" ON marketing_campaigns FOR DELETE USING (auth.uid() = user_id);
