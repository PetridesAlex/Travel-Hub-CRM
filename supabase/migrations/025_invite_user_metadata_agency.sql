-- inviteUserByEmail only writes user_metadata (not app_metadata).
-- Read invite targeting from either so employees join the shared agency.

CREATE OR REPLACE FUNCTION handle_new_user_agency()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id uuid;
  v_invited_agency_id uuid;
  v_agency_role text;
BEGIN
  v_invited_agency_id := COALESCE(
    NULLIF(TRIM(NEW.raw_app_meta_data->>'invited_agency_id'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'invited_agency_id'), '')
  )::uuid;

  v_agency_role := lower(COALESCE(
    NULLIF(TRIM(NEW.raw_app_meta_data->>'agency_role'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'agency_role'), ''),
    'owner'
  ));

  -- Team member invite (agent / admin) — join existing agency only
  IF v_invited_agency_id IS NOT NULL AND v_agency_role IN ('agent', 'admin') THEN
    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (v_invited_agency_id, NEW.id, v_agency_role::agency_role)
    ON CONFLICT (agency_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    UPDATE public.agency_invitations
    SET status = 'accepted'
    WHERE agency_id = v_invited_agency_id
      AND lower(email) = lower(NEW.email)
      AND status = 'pending';

    RETURN NEW;
  END IF;

  -- Owner invite for a pre-created agency (Super Admin flow)
  IF v_invited_agency_id IS NOT NULL AND v_agency_role = 'owner' THEN
    UPDATE public.agencies
    SET owner_user_id = NEW.id
    WHERE id = v_invited_agency_id
      AND owner_user_id IS NULL;

    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (v_invited_agency_id, NEW.id, 'owner')
    ON CONFLICT (agency_id, user_id) DO UPDATE SET role = 'owner';

    UPDATE public.agency_invitations
    SET status = 'accepted'
    WHERE agency_id = v_invited_agency_id
      AND lower(email) = lower(NEW.email)
      AND status = 'pending';

    RETURN NEW;
  END IF;

  -- Standalone signup — new SaaS tenant
  INSERT INTO public.agencies (name, owner_user_id)
  VALUES (
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'agency_name'), ''), 'My Travel Agency'),
    NEW.id
  )
  RETURNING id INTO v_agency_id;

  INSERT INTO public.agency_members (agency_id, user_id, role)
  VALUES (v_agency_id, NEW.id, 'owner')
  ON CONFLICT (agency_id, user_id) DO NOTHING;

  PERFORM seed_agency_ai_defaults(v_agency_id, NEW.id);
  PERFORM seed_hotel_client_quote_template(v_agency_id, NEW.id);
  PERFORM seed_package_costing_template(v_agency_id, NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_agency_id FROM agencies WHERE owner_user_id = NEW.id LIMIT 1;
    IF v_agency_id IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id, user_id, role)
      VALUES (v_agency_id, NEW.id, 'owner')
      ON CONFLICT (agency_id, user_id) DO NOTHING;

      PERFORM seed_agency_ai_defaults(v_agency_id, NEW.id);
      PERFORM seed_hotel_client_quote_template(v_agency_id, NEW.id);
      PERFORM seed_package_costing_template(v_agency_id, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
