-- Phase 6: Link invited owners to existing agencies (run after 017)
-- Skips auto-agency creation when app_metadata.invited_agency_id is set

CREATE OR REPLACE FUNCTION handle_new_user_agency()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id uuid;
  v_invited_agency_id uuid;
BEGIN
  v_invited_agency_id := NULLIF(TRIM(NEW.raw_app_meta_data->>'invited_agency_id'), '')::uuid;

  IF v_invited_agency_id IS NOT NULL THEN
    UPDATE public.agencies
    SET owner_user_id = NEW.id
    WHERE id = v_invited_agency_id
      AND owner_user_id IS NULL;

    UPDATE public.agency_invitations
    SET status = 'accepted'
    WHERE agency_id = v_invited_agency_id
      AND lower(email) = lower(NEW.email)
      AND status = 'pending';

    RETURN NEW;
  END IF;

  INSERT INTO public.agencies (name, owner_user_id)
  VALUES (
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'agency_name'), ''), 'My Travel Agency'),
    NEW.id
  )
  RETURNING id INTO v_agency_id;

  PERFORM seed_agency_ai_defaults(v_agency_id, NEW.id);
  PERFORM seed_hotel_client_quote_template(v_agency_id, NEW.id);
  PERFORM seed_package_costing_template(v_agency_id, NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_agency_id FROM agencies WHERE owner_user_id = NEW.id LIMIT 1;
    IF v_agency_id IS NOT NULL THEN
      PERFORM seed_agency_ai_defaults(v_agency_id, NEW.id);
      PERFORM seed_hotel_client_quote_template(v_agency_id, NEW.id);
      PERFORM seed_package_costing_template(v_agency_id, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
