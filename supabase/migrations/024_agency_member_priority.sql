-- Prefer shared / non-orphan agencies over empty personal "My Travel Agency".
-- Fixes teammates who self-registered first, then were invited onto Honeywell.

CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT am.agency_id
      FROM agency_members am
      JOIN agencies a ON a.id = am.agency_id
      WHERE am.user_id = auth.uid()
      ORDER BY
        CASE WHEN COALESCE(a.is_protected, false) THEN 0 ELSE 1 END,
        CASE
          WHEN lower(trim(COALESCE(a.name, ''))) IN ('my travel agency', 'my agency') THEN 1
          ELSE 0
        END,
        CASE am.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
      LIMIT 1
    ),
    (SELECT id FROM agencies WHERE owner_user_id = auth.uid() LIMIT 1)
  );
$$;
