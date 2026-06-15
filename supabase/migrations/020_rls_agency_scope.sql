-- Travel Hub CRM - Agency-scoped RLS for shared CRM data
-- Run after 019. Team members see the same clients, leads, bookings, etc.

-- clients
DROP POLICY IF EXISTS "Users select own clients" ON clients;
DROP POLICY IF EXISTS "Users insert own clients" ON clients;
DROP POLICY IF EXISTS "Users update own clients" ON clients;
DROP POLICY IF EXISTS "Users delete own clients" ON clients;

CREATE POLICY "Agency select clients" ON clients
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert clients" ON clients
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update clients" ON clients
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete clients" ON clients
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- leads
DROP POLICY IF EXISTS "Users select own leads" ON leads;
DROP POLICY IF EXISTS "Users insert own leads" ON leads;
DROP POLICY IF EXISTS "Users update own leads" ON leads;
DROP POLICY IF EXISTS "Users delete own leads" ON leads;

CREATE POLICY "Agency select leads" ON leads
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert leads" ON leads
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update leads" ON leads
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete leads" ON leads
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- quotations
DROP POLICY IF EXISTS "Users select own quotations" ON quotations;
DROP POLICY IF EXISTS "Users insert own quotations" ON quotations;
DROP POLICY IF EXISTS "Users update own quotations" ON quotations;
DROP POLICY IF EXISTS "Users delete own quotations" ON quotations;

CREATE POLICY "Agency select quotations" ON quotations
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert quotations" ON quotations
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update quotations" ON quotations
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete quotations" ON quotations
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- bookings
DROP POLICY IF EXISTS "Users select own bookings" ON bookings;
DROP POLICY IF EXISTS "Users insert own bookings" ON bookings;
DROP POLICY IF EXISTS "Users update own bookings" ON bookings;
DROP POLICY IF EXISTS "Users delete own bookings" ON bookings;

CREATE POLICY "Agency select bookings" ON bookings
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert bookings" ON bookings
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update bookings" ON bookings
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete bookings" ON bookings
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- suppliers
DROP POLICY IF EXISTS "Users select own suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users insert own suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users update own suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users delete own suppliers" ON suppliers;

CREATE POLICY "Agency select suppliers" ON suppliers
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert suppliers" ON suppliers
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update suppliers" ON suppliers
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete suppliers" ON suppliers
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- tasks
DROP POLICY IF EXISTS "Users select own tasks" ON tasks;
DROP POLICY IF EXISTS "Users insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users delete own tasks" ON tasks;

CREATE POLICY "Agency select tasks" ON tasks
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert tasks" ON tasks
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update tasks" ON tasks
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete tasks" ON tasks
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- voice_notes
DROP POLICY IF EXISTS "Users select own voice_notes" ON voice_notes;
DROP POLICY IF EXISTS "Users insert own voice_notes" ON voice_notes;
DROP POLICY IF EXISTS "Users update own voice_notes" ON voice_notes;
DROP POLICY IF EXISTS "Users delete own voice_notes" ON voice_notes;

CREATE POLICY "Agency select voice_notes" ON voice_notes
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert voice_notes" ON voice_notes
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update voice_notes" ON voice_notes
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete voice_notes" ON voice_notes
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- email_drafts
DROP POLICY IF EXISTS "Users select own email_drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users insert own email_drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users update own email_drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users delete own email_drafts" ON email_drafts;

CREATE POLICY "Agency select email_drafts" ON email_drafts
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert email_drafts" ON email_drafts
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update email_drafts" ON email_drafts
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete email_drafts" ON email_drafts
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- marketing_campaigns
DROP POLICY IF EXISTS "Users select own marketing_campaigns" ON marketing_campaigns;
DROP POLICY IF EXISTS "Users insert own marketing_campaigns" ON marketing_campaigns;
DROP POLICY IF EXISTS "Users update own marketing_campaigns" ON marketing_campaigns;
DROP POLICY IF EXISTS "Users delete own marketing_campaigns" ON marketing_campaigns;

CREATE POLICY "Agency select marketing_campaigns" ON marketing_campaigns
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert marketing_campaigns" ON marketing_campaigns
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update marketing_campaigns" ON marketing_campaigns
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete marketing_campaigns" ON marketing_campaigns
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- invoices
DROP POLICY IF EXISTS "Users select own invoices" ON invoices;
DROP POLICY IF EXISTS "Users insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users delete own invoices" ON invoices;

CREATE POLICY "Agency select invoices" ON invoices
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert invoices" ON invoices
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update invoices" ON invoices
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete invoices" ON invoices
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));

-- receipts
DROP POLICY IF EXISTS "Users select own receipts" ON receipts;
DROP POLICY IF EXISTS "Users insert own receipts" ON receipts;
DROP POLICY IF EXISTS "Users update own receipts" ON receipts;
DROP POLICY IF EXISTS "Users delete own receipts" ON receipts;

CREATE POLICY "Agency select receipts" ON receipts
  FOR SELECT USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency insert receipts" ON receipts
  FOR INSERT WITH CHECK (user_id = auth.uid() AND (agency_id IS NULL OR user_has_agency_access(agency_id)));
CREATE POLICY "Agency update receipts" ON receipts
  FOR UPDATE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
CREATE POLICY "Agency delete receipts" ON receipts
  FOR DELETE USING (user_has_agency_access(agency_id) OR (agency_id IS NULL AND user_id = auth.uid()));
