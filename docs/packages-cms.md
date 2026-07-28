# Packages CMS (Honeywell website catalog)

Manage Honeywell Travel packages from **Travel Hub CRM → Packages** (sidebar under Operations).

Edits write to the shared Supabase `cms_packages` table. The public site at [honeywelltravel.com.cy](https://www.honeywelltravel.com.cy) reads the same table.

## Setup

1. Ensure migration [`023_cms_packages.sql`](../supabase/migrations/023_cms_packages.sql) has been run on the Travel Hub Supabase project.
2. Sign in to Travel Hub with your normal agency login (no separate CMS password).
3. Open **Packages** in the sidebar.

## Use

- Search / filter packages, then **Edit**
- Update basics, status (Published / Draft / Hidden), departures, hotels & prices, media, program
- **Save** — live catalog updates within a few seconds
- **View site** opens the public package page

## Notes

- Honeywell `/admin/packages` still works against the same database (fallback). Prefer Travel Hub for day-to-day edits.
- Bulk import from static `packages.js` remains on the Honeywell admin / `npm run sync:cms-packages` script.
