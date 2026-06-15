-- Package costing template + professional cruise offer template

CREATE OR REPLACE FUNCTION seed_package_costing_template(p_agency_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_costing_agent_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM ai_templates
    WHERE agency_id = p_agency_id AND category = 'costing'
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO v_costing_agent_id
  FROM ai_agents
  WHERE agency_id = p_agency_id AND slug = 'costing-assistant'
  LIMIT 1;

  IF v_costing_agent_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO ai_templates (agency_id, user_id, agent_id, name, category, description, template_body, tone)
  VALUES (
    p_agency_id, p_user_id, v_costing_agent_id,
    'Group Package Costing', 'costing',
    'Compare two hotel options like-for-like, calculate markup, selling price, and profit for group operations',
    $tpl$GROUP PACKAGE COSTING — {{package_name}}

Travel Dates: {{travel_dates}}
Group: {{passengers}} passengers · {{rooms}} rooms · {{nights}} nights

━━━━━━━━━━━━━━━━━━
HOTEL COMPARISON (like-for-like)

Option A — {{hotel_a_name}}
Room: {{hotel_a_room}} · Board: {{hotel_a_meal_plan}}
Total net: {{hotel_a_total}} ({{hotel_a_per_night}}/night · {{hotel_a_per_person}}/person)

Option B — {{hotel_b_name}}
Room: {{hotel_b_room}} · Board: {{hotel_b_meal_plan}}
Total net: {{hotel_b_total}} ({{hotel_b_per_night}}/night · {{hotel_b_per_person}}/person)

Recommendation: {{recommended_option}}
Saving vs other option: {{cost_saving}}

━━━━━━━━━━━━━━━━━━
SELLING PRICE ({{markup_percent}}% markup on {{selected_hotel}})

Net supplier cost: {{supplier_cost}}
Markup: {{markup_amount}}
Selling price: {{selling_price}} ({{selling_per_person}}/person)
Profit: {{profit}}
Margin: {{margin_percent}}

━━━━━━━━━━━━━━━━━━
SUMMARY

{{comparison_summary}}

{{notes}}

Prepared for group operations review.
{{agency_name}}$tpl$,
    'professional'
  );
END;
$$;

-- Update cruise offer to full professional template
UPDATE ai_templates SET
  name = 'Cruise Offer',
  description = 'Formal client-ready cruise proposal with itinerary, cabin, and pricing',
  template_body = $tpl$Dear {{client_name}},

Thank you for your enquiry.

We are pleased to present the following cruise proposal for your consideration.

━━━━━━━━━━━━━━━━━━

🚢 Cruise Details

Cruise Line: {{cruise_line}}
Ship: {{ship_name}}
Departure Date: {{departure_date}}
Duration: {{duration}}
Departure Port: {{departure_port}}
Passengers: {{passengers}}

━━━━━━━━━━━━━━━━━━

📍 Itinerary

{{itinerary}}

━━━━━━━━━━━━━━━━━━

🛏 Accommodation

Cabin Category: {{cabin_category}}
Cabin Type: {{cabin_type}}
Board Basis: Full Board

━━━━━━━━━━━━━━━━━━

✅ Price Includes

{{price_includes}}

━━━━━━━━━━━━━━━━━━

❌ Price Does Not Include

{{price_excludes}}

━━━━━━━━━━━━━━━━━━

💰 Pricing

Total Price: {{price}}
Price Per Person: {{price_per_person}}

━━━━━━━━━━━━━━━━━━

ℹ Important Information

Prices are subject to availability and may change until the booking is confirmed.
Cruise fares are based on the current promotional rates offered by the cruise line.
Terms and conditions of the cruise company apply.

━━━━━━━━━━━━━━━━━━

Should you wish to proceed with the reservation, please let us know and we will be happy to secure the cabin for you.

Should you require any further information or alternative cruise options, please do not hesitate to contact us.

We look forward to assisting you with your upcoming cruise holiday.

Kind regards,
{{agency_name}}$tpl$
WHERE category = 'cruise_offer';

UPDATE ai_agents SET
  description = 'Compare hotel options, calculate group package costs, markup, and selling prices for operations.',
  system_prompt = $prompt$You are a professional travel agency costing and pricing specialist for group operations.

Your job is to produce clear, accurate package costing reports that compare two hotel options (like-for-like room type and board basis) and calculate selling price, profit, and margin.

Rules:
- Write in fully formal, professional business English.
- Present both hotel options side by side with net rates, per-night, and per-person figures.
- Clearly state which option is recommended and the saving.
- Show markup, selling price, profit, and margin using only the provided calculated figures.
- Do not invent hotel names, rates, or passenger numbers.
- Use the comparison summary and calculated fields exactly as provided.
- Output only the final costing report ready for internal review or client quotation.$prompt$
WHERE slug = 'costing-assistant';

UPDATE ai_agents SET
  system_prompt = $prompt$You are a professional cruise specialist at a travel agency.

Your job is to create fully formal, client-ready cruise offer emails using the provided template structure.

Rules:
- Write in fully formal, professional business English.
- Follow the template sections exactly: Cruise Details, Itinerary, Accommodation, Price Includes, Price Excludes, Pricing, Important Information.
- Copy all provided data exactly — cruise line, ship, dates, itinerary, cabin, passengers, inclusions, exclusions, and prices.
- State total price and price per person clearly with currency.
- Mention that prices are subject to availability until confirmation.
- Do not invent flights, drinks, Wi-Fi, excursions, tips, or insurance unless provided.
- Output only the final client-ready email.$prompt$
WHERE slug = 'cruise-assistant';

-- Backfill costing template for existing agencies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.id AS agency_id, a.owner_user_id AS user_id
    FROM agencies a
  LOOP
    PERFORM seed_package_costing_template(r.agency_id, r.user_id);
  END LOOP;
END $$;

-- New signups: add costing template after defaults
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
