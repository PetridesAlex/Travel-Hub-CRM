-- Travel Hub CRM - Forms & Feedback module
-- Run after 021

CREATE TYPE form_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE form_category AS ENUM (
  'feedback', 'satisfaction', 'corporate', 'cruise', 'school', 'lead_gen', 'custom'
);
CREATE TYPE form_security_mode AS ENUM ('link_only', 'gate', 'link_single_use');
CREATE TYPE form_question_type AS ENUM (
  'short_text', 'long_text', 'email', 'phone', 'dropdown', 'radio', 'checkbox',
  'date', 'rating', 'nps', 'file', 'yes_no'
);
CREATE TYPE form_recipient_status AS ENUM ('pending', 'opened', 'completed', 'expired');

CREATE TABLE forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status form_status NOT NULL DEFAULT 'draft',
  category form_category NOT NULL DEFAULT 'custom',
  security_mode form_security_mode NOT NULL DEFAULT 'link_only',
  gate_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_template boolean NOT NULL DEFAULT false,
  template_source_id uuid REFERENCES forms(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE form_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Section',
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  section_id uuid REFERENCES form_sections(id) ON DELETE SET NULL,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  question_type form_question_type NOT NULL DEFAULT 'short_text',
  question_text text NOT NULL,
  help_text text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE form_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(form_id, version_number)
);

CREATE TABLE form_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  email text,
  name text,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  access_token text NOT NULL UNIQUE,
  access_code_hash text,
  status form_recipient_status NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  opened_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  form_version_id uuid NOT NULL REFERENCES form_versions(id) ON DELETE RESTRICT,
  recipient_id uuid REFERENCES form_recipients(id) ON DELETE SET NULL,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  respondent_name text,
  respondent_email text,
  submitted_at timestamptz DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE form_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  answer_text text,
  answer_json jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE form_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_forms_agency ON forms(agency_id);
CREATE INDEX idx_form_sections_form ON form_sections(form_id);
CREATE INDEX idx_form_questions_form ON form_questions(form_id, sort_order);
CREATE INDEX idx_form_versions_form ON form_versions(form_id);
CREATE INDEX idx_form_recipients_form ON form_recipients(form_id);
CREATE INDEX idx_form_recipients_token ON form_recipients(access_token);
CREATE INDEX idx_form_responses_form ON form_responses(form_id, submitted_at DESC);
CREATE INDEX idx_form_answers_response ON form_answers(response_id);
CREATE INDEX idx_form_files_response ON form_files(response_id);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency select forms" ON forms FOR SELECT USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency insert forms" ON forms FOR INSERT WITH CHECK (user_id = auth.uid() AND user_has_agency_access(agency_id));
CREATE POLICY "Agency update forms" ON forms FOR UPDATE USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency delete forms" ON forms FOR DELETE USING (user_has_agency_access(agency_id));

CREATE POLICY "Agency select form_sections" ON form_sections FOR SELECT USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency insert form_sections" ON form_sections FOR INSERT WITH CHECK (user_has_agency_access(agency_id));
CREATE POLICY "Agency update form_sections" ON form_sections FOR UPDATE USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency delete form_sections" ON form_sections FOR DELETE USING (user_has_agency_access(agency_id));

CREATE POLICY "Agency select form_questions" ON form_questions FOR SELECT USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency insert form_questions" ON form_questions FOR INSERT WITH CHECK (user_has_agency_access(agency_id));
CREATE POLICY "Agency update form_questions" ON form_questions FOR UPDATE USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency delete form_questions" ON form_questions FOR DELETE USING (user_has_agency_access(agency_id));

CREATE POLICY "Agency select form_versions" ON form_versions FOR SELECT USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency insert form_versions" ON form_versions FOR INSERT WITH CHECK (user_has_agency_access(agency_id));

CREATE POLICY "Agency select form_recipients" ON form_recipients FOR SELECT USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency insert form_recipients" ON form_recipients FOR INSERT WITH CHECK (user_has_agency_access(agency_id));
CREATE POLICY "Agency update form_recipients" ON form_recipients FOR UPDATE USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency delete form_recipients" ON form_recipients FOR DELETE USING (user_has_agency_access(agency_id));

CREATE POLICY "Agency select form_responses" ON form_responses FOR SELECT USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency select form_answers" ON form_answers FOR SELECT USING (user_has_agency_access(agency_id));
CREATE POLICY "Agency select form_files" ON form_files FOR SELECT USING (user_has_agency_access(agency_id));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-uploads',
  'form-uploads',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;
