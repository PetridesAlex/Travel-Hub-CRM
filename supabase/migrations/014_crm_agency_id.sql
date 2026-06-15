-- Travel Agency CRM - Step 2: add agency_id to core CRM tables
-- Run in Supabase SQL Editor after 001–013
--
-- Scope: nullable agency_id + backfill + foreign keys
-- Out of scope: RLS changes, NOT NULL, frontend updates, indexes
--
-- Run phases in order. Review Phase 0 results before Phase 1.

-- ============================================================
-- PHASE 0 — Pre-flight checks (read-only; run first)
-- ============================================================

-- Users with CRM data but no agency row (will leave agency_id NULL after backfill)
-- SELECT DISTINCT c.user_id
-- FROM clients c
-- LEFT JOIN agencies a ON a.owner_user_id = c.user_id
-- WHERE a.id IS NULL;

-- Orphan rows per table (users with CRM data but no agencies row)
-- SELECT 'clients' AS tbl, user_id, COUNT(*) AS rows
-- FROM clients WHERE user_id NOT IN (SELECT owner_user_id FROM agencies)
-- GROUP BY user_id
-- UNION ALL
-- SELECT 'leads', user_id, COUNT(*) FROM leads
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id
-- UNION ALL
-- SELECT 'quotations', user_id, COUNT(*) FROM quotations
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id
-- UNION ALL
-- SELECT 'bookings', user_id, COUNT(*) FROM bookings
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id
-- UNION ALL
-- SELECT 'suppliers', user_id, COUNT(*) FROM suppliers
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id
-- UNION ALL
-- SELECT 'tasks', user_id, COUNT(*) FROM tasks
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id
-- UNION ALL
-- SELECT 'voice_notes', user_id, COUNT(*) FROM voice_notes
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id
-- UNION ALL
-- SELECT 'email_drafts', user_id, COUNT(*) FROM email_drafts
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id
-- UNION ALL
-- SELECT 'marketing_campaigns', user_id, COUNT(*) FROM marketing_campaigns
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id
-- UNION ALL
-- SELECT 'invoices', user_id, COUNT(*) FROM invoices
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id
-- UNION ALL
-- SELECT 'receipts', user_id, COUNT(*) FROM receipts
-- WHERE user_id NOT IN (SELECT owner_user_id FROM agencies) GROUP BY user_id;

-- Row counts per table (baseline)
-- SELECT 'clients' AS tbl, COUNT(*) FROM clients
-- UNION ALL SELECT 'leads', COUNT(*) FROM leads
-- UNION ALL SELECT 'quotations', COUNT(*) FROM quotations
-- UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
-- UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
-- UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
-- UNION ALL SELECT 'voice_notes', COUNT(*) FROM voice_notes
-- UNION ALL SELECT 'email_drafts', COUNT(*) FROM email_drafts
-- UNION ALL SELECT 'marketing_campaigns', COUNT(*) FROM marketing_campaigns
-- UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
-- UNION ALL SELECT 'receipts', COUNT(*) FROM receipts;

-- Fix orphans before Phase 3 if you want zero NULL agency_id rows, e.g.:
-- INSERT INTO agencies (name, owner_user_id)
-- SELECT 'My Travel Agency', u.user_id
-- FROM (SELECT DISTINCT user_id FROM clients WHERE user_id NOT IN (SELECT owner_user_id FROM agencies)) u;

-- ============================================================
-- PHASE 1 — Add nullable agency_id columns (no FK yet)
-- ============================================================

BEGIN;

ALTER TABLE clients             ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE leads               ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE quotations          ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE bookings            ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE suppliers           ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE tasks               ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE voice_notes         ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE email_drafts        ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE invoices            ADD COLUMN IF NOT EXISTS agency_id uuid;
ALTER TABLE receipts            ADD COLUMN IF NOT EXISTS agency_id uuid;

COMMIT;

-- ============================================================
-- PHASE 2 — Backfill agency_id from agencies.owner_user_id
-- ============================================================

BEGIN;

UPDATE clients c
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = c.user_id
  AND c.agency_id IS NULL;

UPDATE leads l
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = l.user_id
  AND l.agency_id IS NULL;

UPDATE quotations q
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = q.user_id
  AND q.agency_id IS NULL;

UPDATE bookings b
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = b.user_id
  AND b.agency_id IS NULL;

UPDATE suppliers s
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = s.user_id
  AND s.agency_id IS NULL;

UPDATE tasks t
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = t.user_id
  AND t.agency_id IS NULL;

UPDATE voice_notes v
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = v.user_id
  AND v.agency_id IS NULL;

UPDATE email_drafts e
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = e.user_id
  AND e.agency_id IS NULL;

UPDATE marketing_campaigns m
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = m.user_id
  AND m.agency_id IS NULL;

UPDATE invoices i
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = i.user_id
  AND i.agency_id IS NULL;

UPDATE receipts r
SET agency_id = a.id
FROM agencies a
WHERE a.owner_user_id = r.user_id
  AND r.agency_id IS NULL;

COMMIT;

-- ============================================================
-- Post-backfill verification (read-only; run before Phase 3)
-- ============================================================

-- Should return 0 for every table if every user_id has an agency
-- SELECT 'clients' AS tbl, COUNT(*) AS null_agency_rows FROM clients WHERE agency_id IS NULL
-- UNION ALL SELECT 'leads', COUNT(*) FROM leads WHERE agency_id IS NULL
-- UNION ALL SELECT 'quotations', COUNT(*) FROM quotations WHERE agency_id IS NULL
-- UNION ALL SELECT 'bookings', COUNT(*) FROM bookings WHERE agency_id IS NULL
-- UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers WHERE agency_id IS NULL
-- UNION ALL SELECT 'tasks', COUNT(*) FROM tasks WHERE agency_id IS NULL
-- UNION ALL SELECT 'voice_notes', COUNT(*) FROM voice_notes WHERE agency_id IS NULL
-- UNION ALL SELECT 'email_drafts', COUNT(*) FROM email_drafts WHERE agency_id IS NULL
-- UNION ALL SELECT 'marketing_campaigns', COUNT(*) FROM marketing_campaigns WHERE agency_id IS NULL
-- UNION ALL SELECT 'invoices', COUNT(*) FROM invoices WHERE agency_id IS NULL
-- UNION ALL SELECT 'receipts', COUNT(*) FROM receipts WHERE agency_id IS NULL;

-- Cross-table consistency (optional)
-- SELECT l.id, l.user_id AS lead_user, c.user_id AS client_user
-- FROM leads l
-- JOIN clients c ON c.id = l.client_id
-- WHERE l.user_id IS DISTINCT FROM c.user_id
-- LIMIT 20;

-- ============================================================
-- PHASE 3 — Foreign keys to agencies(id)
-- ============================================================

BEGIN;

ALTER TABLE clients
  ADD CONSTRAINT clients_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE leads
  ADD CONSTRAINT leads_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE quotations
  ADD CONSTRAINT quotations_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE voice_notes
  ADD CONSTRAINT voice_notes_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE email_drafts
  ADD CONSTRAINT email_drafts_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

ALTER TABLE receipts
  ADD CONSTRAINT receipts_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;

COMMIT;

-- ============================================================
-- ROLLBACK — run only to undo Step 2 entirely
-- Drops agency_id and all backfilled values; other columns unchanged
-- ============================================================

-- BEGIN;
--
-- ALTER TABLE receipts            DROP CONSTRAINT IF EXISTS receipts_agency_id_fkey;
-- ALTER TABLE invoices            DROP CONSTRAINT IF EXISTS invoices_agency_id_fkey;
-- ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_agency_id_fkey;
-- ALTER TABLE email_drafts        DROP CONSTRAINT IF EXISTS email_drafts_agency_id_fkey;
-- ALTER TABLE voice_notes         DROP CONSTRAINT IF EXISTS voice_notes_agency_id_fkey;
-- ALTER TABLE tasks               DROP CONSTRAINT IF EXISTS tasks_agency_id_fkey;
-- ALTER TABLE suppliers           DROP CONSTRAINT IF EXISTS suppliers_agency_id_fkey;
-- ALTER TABLE bookings            DROP CONSTRAINT IF EXISTS bookings_agency_id_fkey;
-- ALTER TABLE quotations          DROP CONSTRAINT IF EXISTS quotations_agency_id_fkey;
-- ALTER TABLE leads               DROP CONSTRAINT IF EXISTS leads_agency_id_fkey;
-- ALTER TABLE clients             DROP CONSTRAINT IF EXISTS clients_agency_id_fkey;
--
-- ALTER TABLE receipts            DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE invoices            DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE marketing_campaigns DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE email_drafts        DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE voice_notes         DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE tasks               DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE suppliers           DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE bookings            DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE quotations          DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE leads               DROP COLUMN IF EXISTS agency_id;
-- ALTER TABLE clients             DROP COLUMN IF EXISTS agency_id;
--
-- COMMIT;
