-- Agency branding: logo URL for sidebar and future white-label surfaces

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN agencies.logo_url IS 'Public URL or site-relative path to the agency logo (e.g. /logos/honeywell-travel.png)';

-- Honeywell Travel tenants: default bundled logo
UPDATE agencies
SET logo_url = '/logos/honeywell-travel.png'
WHERE logo_url IS NULL
  AND name ILIKE '%honeywell%';
