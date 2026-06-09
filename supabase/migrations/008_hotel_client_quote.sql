-- Hotel rate comparison template: supplier vs booking page → client quote

ALTER TABLE ai_templates DROP CONSTRAINT IF EXISTS ai_templates_category_check;

ALTER TABLE ai_templates ADD CONSTRAINT ai_templates_category_check CHECK (category IN (
  'flight_offer', 'cruise_offer', 'hotel_request', 'honeymoon_offer', 'hotel_client_quote',
  'supplier_request', 'payment_reminder', 'follow_up', 'itinerary', 'costing', 'general_email'
));

CREATE OR REPLACE FUNCTION seed_hotel_client_quote_template(p_agency_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_agent_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM ai_templates
    WHERE agency_id = p_agency_id AND category = 'hotel_client_quote'
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO v_hotel_agent_id
  FROM ai_agents
  WHERE agency_id = p_agency_id AND slug = 'hotel-assistant'
  LIMIT 1;

  IF v_hotel_agent_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO ai_templates (agency_id, user_id, agent_id, name, category, description, template_body, tone)
  VALUES (
    p_agency_id, p_user_id, v_hotel_agent_id,
    'Hotel Rate Quote', 'hotel_client_quote',
    'Compare supplier net rates vs booking sites, apply margin, and quote the client',
    $tpl$Dear {{client_name}},

Thank you for your enquiry. Please find below our quotation for your stay.

Hotel:
{{hotel_name}}
{{destination}}

Travel Dates:
{{travel_dates}}

Guests:
{{guest_details}}

Room & Board:
{{room_details}}
{{meal_plan}}

Our Quotation:
{{client_quote_price}}

Includes:
{{inclusions}}

{{comparison_summary}}

Please note that the above price is subject to availability and may change until the booking is confirmed.

Should you wish to proceed, please let us know and we will be happy to assist further.

Kind regards,
{{agency_name}}$tpl$,
    'professional'
  );
END;
$$;

-- Backfill for existing agencies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.id AS agency_id, a.owner_user_id AS user_id
    FROM agencies a
  LOOP
    PERFORM seed_hotel_client_quote_template(r.agency_id, r.user_id);
  END LOOP;
END $$;

-- New signups: add hotel quote template after default AI seed
CREATE OR REPLACE FUNCTION handle_new_user_agency()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  INSERT INTO public.agencies (name, owner_user_id)
  VALUES (
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'agency_name'), ''), 'My Travel Agency'),
    NEW.id
  )
  RETURNING id INTO v_agency_id;

  PERFORM seed_agency_ai_defaults(v_agency_id, NEW.id);
  PERFORM seed_hotel_client_quote_template(v_agency_id, NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_agency_id FROM agencies WHERE owner_user_id = NEW.id LIMIT 1;
    IF v_agency_id IS NOT NULL THEN
      PERFORM seed_agency_ai_defaults(v_agency_id, NEW.id);
      PERFORM seed_hotel_client_quote_template(v_agency_id, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
