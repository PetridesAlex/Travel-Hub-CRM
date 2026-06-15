-- Travel Agency CRM - Calendar events
-- Run after 001–010

CREATE TYPE calendar_event_type AS ENUM (
  'meeting', 'call', 'follow_up', 'reminder', 'travel', 'payment', 'deadline', 'other'
);

CREATE TYPE calendar_event_source AS ENUM (
  'manual', 'ai', 'imported'
);

CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type calendar_event_type NOT NULL DEFAULT 'meeting',
  source calendar_event_source NOT NULL DEFAULT 'manual',
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  color text,
  reminder_minutes integer,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_calendar_events_agency ON calendar_events(agency_id);
CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start ON calendar_events(start_at);
CREATE INDEX idx_calendar_events_client ON calendar_events(client_id);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency owners select calendar events" ON calendar_events
  FOR SELECT USING (agency_id = get_user_agency_id());

CREATE POLICY "Agency owners insert calendar events" ON calendar_events
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "Agency owners update calendar events" ON calendar_events
  FOR UPDATE USING (agency_id = get_user_agency_id());

CREATE POLICY "Agency owners delete calendar events" ON calendar_events
  FOR DELETE USING (agency_id = get_user_agency_id());
