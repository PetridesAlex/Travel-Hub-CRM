-- Travel Hub CRM - Agency team members (employees share one agency)
-- Run after 018. Apply before 020.

CREATE TYPE agency_role AS ENUM ('owner', 'admin', 'agent');

CREATE TABLE IF NOT EXISTS agency_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role agency_role NOT NULL DEFAULT 'agent',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_members_user ON agency_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_agency ON agency_members(agency_id);

CREATE TRIGGER trg_agency_members_updated_at
  BEFORE UPDATE ON agency_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Backfill: every agency owner is also a member
INSERT INTO agency_members (agency_id, user_id, role)
SELECT id, owner_user_id, 'owner'
FROM agencies
WHERE owner_user_id IS NOT NULL
ON CONFLICT (agency_id, user_id) DO NOTHING;

-- Resolve agency for AI/calendar helpers (members + legacy owners)
CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT agency_id
      FROM agency_members
      WHERE user_id = auth.uid()
      ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
      LIMIT 1
    ),
    (SELECT id FROM agencies WHERE owner_user_id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_agency_access(p_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agency_members
    WHERE user_id = auth.uid() AND agency_id = p_agency_id
  )
  OR EXISTS (
    SELECT 1 FROM agencies
    WHERE id = p_agency_id AND owner_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_agency(p_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agencies
    WHERE id = p_agency_id AND owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM agency_members
    WHERE agency_id = p_agency_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

-- Move Honeywell employee(s) off auto-created orphan agencies
DO $$
DECLARE
  v_honeywell_id uuid;
  v_member_user_id uuid;
  v_orphan_agency_id uuid;
  r RECORD;
BEGIN
  SELECT id INTO v_honeywell_id
  FROM agencies
  WHERE name ILIKE '%honeywell%' AND is_protected = true
  LIMIT 1;

  FOR r IN
    SELECT a.id AS orphan_id, a.owner_user_id AS member_id
    FROM agencies a
    JOIN auth.users u ON u.id = a.owner_user_id
    WHERE a.is_protected = false
      AND a.name = 'My Travel Agency'
      AND lower(u.email) IN (lower('mary.spyrou@asg.com.cy'))
      AND NOT EXISTS (
        SELECT 1 FROM agency_members m
        WHERE m.user_id = a.owner_user_id AND m.agency_id = v_honeywell_id
      )
  LOOP
    IF v_honeywell_id IS NULL THEN
      CONTINUE;
    END IF;

    v_orphan_agency_id := r.orphan_id;
    v_member_user_id := r.member_id;

    INSERT INTO agency_members (agency_id, user_id, role)
    VALUES (v_honeywell_id, v_member_user_id, 'agent')
    ON CONFLICT (agency_id, user_id) DO UPDATE SET role = 'agent';

    DELETE FROM agencies WHERE id = v_orphan_agency_id;
  END LOOP;
END $$;

ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view team" ON agency_members
  FOR SELECT USING (user_has_agency_access(agency_id));

CREATE POLICY "Managers insert team" ON agency_members
  FOR INSERT WITH CHECK (
    user_can_manage_agency(agency_id)
    AND role IN ('admin', 'agent')
  );

CREATE POLICY "Managers delete team" ON agency_members
  FOR DELETE USING (
    user_can_manage_agency(agency_id)
    AND role IN ('admin', 'agent')
  );

DROP POLICY IF EXISTS "Owners select own agency" ON agencies;
DROP POLICY IF EXISTS "Owners insert own agency" ON agencies;
DROP POLICY IF EXISTS "Owners update own agency" ON agencies;

CREATE POLICY "Members select agency" ON agencies
  FOR SELECT USING (user_has_agency_access(id));

CREATE POLICY "Owners insert own agency" ON agencies
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Managers update agency" ON agencies
  FOR UPDATE USING (user_can_manage_agency(id));
