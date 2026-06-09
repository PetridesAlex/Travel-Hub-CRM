-- Travel Agency CRM - AI Workspace (agents, templates, generations)
-- Run after 001–006

-- ---------------------------------------------------------------------------
-- Helper: resolve current user's agency
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM agencies WHERE owner_user_id = auth.uid() LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'flight', 'cruise', 'hotel', 'itinerary', 'email', 'costing', 'supplier', 'payment'
  )),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (agency_id, slug)
);

CREATE TABLE ai_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'flight_offer', 'cruise_offer', 'hotel_request', 'honeymoon_offer',
    'supplier_request', 'payment_reminder', 'follow_up', 'itinerary', 'costing', 'general_email'
  )),
  description text,
  template_body text NOT NULL,
  tone text DEFAULT 'professional',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  template_id uuid REFERENCES ai_templates(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  input_data jsonb NOT NULL DEFAULT '{}',
  generated_output text,
  generation_type text,
  created_at timestamptz DEFAULT now()
);

CREATE TRIGGER trg_ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ai_templates_updated_at
  BEFORE UPDATE ON ai_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_ai_agents_agency ON ai_agents(agency_id);
CREATE INDEX idx_ai_agents_agency_category ON ai_agents(agency_id, category);
CREATE INDEX idx_ai_agents_agency_slug ON ai_agents(agency_id, slug);
CREATE INDEX idx_ai_templates_agency ON ai_templates(agency_id);
CREATE INDEX idx_ai_templates_agency_category ON ai_templates(agency_id, category);
CREATE INDEX idx_ai_generations_agency_created ON ai_generations(agency_id, created_at DESC);
CREATE INDEX idx_ai_generations_agent ON ai_generations(agent_id);
CREATE INDEX idx_ai_generations_client ON ai_generations(client_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency select ai_agents" ON ai_agents
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "Agency insert ai_agents" ON ai_agents
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND user_id = auth.uid());
CREATE POLICY "Agency update ai_agents" ON ai_agents
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "Agency delete ai_agents" ON ai_agents
  FOR DELETE USING (agency_id = get_user_agency_id());

CREATE POLICY "Agency select ai_templates" ON ai_templates
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "Agency insert ai_templates" ON ai_templates
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND user_id = auth.uid());
CREATE POLICY "Agency update ai_templates" ON ai_templates
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "Agency delete ai_templates" ON ai_templates
  FOR DELETE USING (agency_id = get_user_agency_id());

CREATE POLICY "Agency select ai_generations" ON ai_generations
  FOR SELECT USING (agency_id = get_user_agency_id());
CREATE POLICY "Agency insert ai_generations" ON ai_generations
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND user_id = auth.uid());
CREATE POLICY "Agency update ai_generations" ON ai_generations
  FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "Agency delete ai_generations" ON ai_generations
  FOR DELETE USING (agency_id = get_user_agency_id());

-- ---------------------------------------------------------------------------
-- Seed default agents + templates per agency
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_agency_ai_defaults(p_agency_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flight_agent_id uuid;
  v_cruise_agent_id uuid;
  v_hotel_agent_id uuid;
  v_itinerary_agent_id uuid;
  v_email_agent_id uuid;
  v_costing_agent_id uuid;
  v_supplier_agent_id uuid;
  v_payment_agent_id uuid;
BEGIN
  INSERT INTO ai_agents (agency_id, user_id, name, slug, description, system_prompt, category)
  VALUES (
    p_agency_id, p_user_id,
    'Flight Assistant', 'flight-assistant',
    'Creates professional flight offers and flight-related client emails.',
    $prompt$You are a senior airline consultant working for a professional travel agency.

Your job is to create clear, professional, client-ready flight offer emails.

Rules:
- Always write in professional travel agency email format.
- Always start with 'Dear {{client_name}},' if client name is provided.
- Show outbound flight clearly.
- Show return flight clearly if provided.
- Show airline, route, dates, flight numbers, departure times, arrival times, and duration.
- Show fare inclusions clearly.
- Show total cost clearly.
- Mention that prices are subject to availability and may change until booking is confirmed.
- Do not invent hotels, accommodation, insurance, transfers, or extra services.
- Do not use headings such as 'Program Overview', 'Accommodation', 'Travel Insurance', or 'Next Steps' unless the template specifically includes them.
- Do not create unnecessary sections.
- Use only the information provided by the user.
- Output only the final email ready to send.$prompt$,
    'flight'
  )
  ON CONFLICT (agency_id, slug) DO NOTHING
  RETURNING id INTO v_flight_agent_id;

  IF v_flight_agent_id IS NULL THEN
    SELECT id INTO v_flight_agent_id FROM ai_agents WHERE agency_id = p_agency_id AND slug = 'flight-assistant';
  END IF;

  INSERT INTO ai_agents (agency_id, user_id, name, slug, description, system_prompt, category)
  VALUES (
    p_agency_id, p_user_id,
    'Cruise Assistant', 'cruise-assistant',
    'Creates professional cruise quotations and cruise offer emails.',
    $prompt$You are a professional cruise specialist working for a travel agency.

Your job is to create clear, attractive, and client-ready cruise offers.

Rules:
- Use professional travel agency style.
- Show cruise ship name.
- Show cruise dates.
- Show itinerary day by day if provided.
- Show cabin category clearly.
- Show number of passengers.
- Show inclusions.
- Show exclusions.
- Show total price clearly.
- Mention that prices are subject to availability until confirmation.
- Do not invent flights, drinks, Wi-Fi, excursions, tips, or insurance unless provided.
- Do not add unnecessary sections.
- Use only the information provided.
- Output only the final client-ready email or quotation.$prompt$,
    'cruise'
  )
  ON CONFLICT (agency_id, slug) DO NOTHING
  RETURNING id INTO v_cruise_agent_id;

  IF v_cruise_agent_id IS NULL THEN
    SELECT id INTO v_cruise_agent_id FROM ai_agents WHERE agency_id = p_agency_id AND slug = 'cruise-assistant';
  END IF;

  INSERT INTO ai_agents (agency_id, user_id, name, slug, description, system_prompt, category)
  VALUES (
    p_agency_id, p_user_id,
    'Hotel Assistant', 'hotel-assistant',
    'Creates hotel requests, hotel offers, and supplier messages.',
    $prompt$You are a professional hotel and accommodation consultant for a travel agency.

Your job is to prepare hotel requests and hotel offer emails.

Rules:
- Use professional travel agency language.
- For supplier requests, ask clearly for availability and best net rates.
- Include destination, hotel name if provided, dates, number of rooms, guests, room types, meal plan, and notes.
- For client offers, show hotel name, location, room type, meal plan, cancellation terms if provided, and price.
- Do not invent hotel names, rates, cancellation policies, or availability.
- If something is missing, write 'To be confirmed' only when necessary.
- Output only the final email ready to send.$prompt$,
    'hotel'
  )
  ON CONFLICT (agency_id, slug) DO NOTHING
  RETURNING id INTO v_hotel_agent_id;

  IF v_hotel_agent_id IS NULL THEN
    SELECT id INTO v_hotel_agent_id FROM ai_agents WHERE agency_id = p_agency_id AND slug = 'hotel-assistant';
  END IF;

  INSERT INTO ai_agents (agency_id, user_id, name, slug, description, system_prompt, category)
  VALUES (
    p_agency_id, p_user_id,
    'Itinerary Assistant', 'itinerary-assistant',
    'Creates customized day-by-day travel programs and itineraries.',
    $prompt$You are a professional travel planner creating client-ready travel itineraries.

Your job is to create customized travel programs for clients.

Rules:
- Create clear day-by-day itineraries.
- Use professional travel agency style.
- Include destination, travel dates, duration, travelers, and travel style if provided.
- Do not invent exact hotel names, flight times, tour prices, or supplier prices unless provided.
- If details are missing, use 'To be confirmed'.
- Keep the itinerary realistic and organized.
- Include optional suggestions only if helpful.
- Output should be ready for a travel agent to copy and send to a client.$prompt$,
    'itinerary'
  )
  ON CONFLICT (agency_id, slug) DO NOTHING
  RETURNING id INTO v_itinerary_agent_id;

  IF v_itinerary_agent_id IS NULL THEN
    SELECT id INTO v_itinerary_agent_id FROM ai_agents WHERE agency_id = p_agency_id AND slug = 'itinerary-assistant';
  END IF;

  INSERT INTO ai_agents (agency_id, user_id, name, slug, description, system_prompt, category)
  VALUES (
    p_agency_id, p_user_id,
    'Email Assistant', 'email-assistant',
    'Creates professional general travel agency emails.',
    $prompt$You are a professional travel agency email assistant.

Your job is to write polished, clear, and professional emails for travel agents.

Rules:
- Write in a professional but friendly tone.
- Use clear formatting.
- Keep the email concise unless more detail is requested.
- Do not invent missing information.
- Do not add irrelevant sections.
- Always make the email ready to send.
- Output only the email body.$prompt$,
    'email'
  )
  ON CONFLICT (agency_id, slug) DO NOTHING
  RETURNING id INTO v_email_agent_id;

  IF v_email_agent_id IS NULL THEN
    SELECT id INTO v_email_agent_id FROM ai_agents WHERE agency_id = p_agency_id AND slug = 'email-assistant';
  END IF;

  INSERT INTO ai_agents (agency_id, user_id, name, slug, description, system_prompt, category)
  VALUES (
    p_agency_id, p_user_id,
    'Costing Assistant', 'costing-assistant',
    'Helps calculate travel package costs, selling prices, markups, and profit.',
    $prompt$You are a travel agency costing and pricing assistant.

Your job is to help agents calculate package cost, selling price, markup, margin, and profit.

Rules:
- Clearly show supplier cost.
- Clearly show selling price.
- Clearly show profit.
- Clearly show profit margin when possible.
- If markup percentage is provided, apply it correctly.
- If selling price is provided, calculate profit.
- If supplier cost is missing, ask for it.
- Do not invent prices.
- Keep calculations clear and easy to understand.$prompt$,
    'costing'
  )
  ON CONFLICT (agency_id, slug) DO NOTHING
  RETURNING id INTO v_costing_agent_id;

  IF v_costing_agent_id IS NULL THEN
    SELECT id INTO v_costing_agent_id FROM ai_agents WHERE agency_id = p_agency_id AND slug = 'costing-assistant';
  END IF;

  INSERT INTO ai_agents (agency_id, user_id, name, slug, description, system_prompt, category)
  VALUES (
    p_agency_id, p_user_id,
    'Supplier Assistant', 'supplier-assistant',
    'Creates professional supplier emails for hotels, DMCs, cruise companies, transfer companies, and airlines.',
    $prompt$You are a professional travel agency supplier communication assistant.

Your job is to write clear supplier emails requesting availability, rates, confirmations, booking details, or amendments.

Rules:
- Use professional supplier-facing language.
- Clearly state what information is requested.
- Include all relevant travel details provided.
- Keep the message concise and polite.
- Do not invent missing passenger names, dates, prices, or booking references.
- Output only the supplier-ready email.$prompt$,
    'supplier'
  )
  ON CONFLICT (agency_id, slug) DO NOTHING
  RETURNING id INTO v_supplier_agent_id;

  IF v_supplier_agent_id IS NULL THEN
    SELECT id INTO v_supplier_agent_id FROM ai_agents WHERE agency_id = p_agency_id AND slug = 'supplier-assistant';
  END IF;

  INSERT INTO ai_agents (agency_id, user_id, name, slug, description, system_prompt, category)
  VALUES (
    p_agency_id, p_user_id,
    'Payment Reminder Assistant', 'payment-reminder-assistant',
    'Creates polite payment reminder emails for pending balances.',
    $prompt$You are a professional travel agency payment reminder assistant.

Your job is to prepare polite payment reminder emails for clients.

Rules:
- Be polite and professional.
- Include booking details if provided.
- Include total cost, amount received, balance due, and due date if provided.
- Do not sound aggressive.
- Do not invent payment amounts or due dates.
- Output only the final email ready to send.$prompt$,
    'payment'
  )
  ON CONFLICT (agency_id, slug) DO NOTHING
  RETURNING id INTO v_payment_agent_id;

  IF v_payment_agent_id IS NULL THEN
    SELECT id INTO v_payment_agent_id FROM ai_agents WHERE agency_id = p_agency_id AND slug = 'payment-reminder-assistant';
  END IF;

  -- Templates (skip if agency already has default flight template)
  IF NOT EXISTS (
    SELECT 1 FROM ai_templates
    WHERE agency_id = p_agency_id AND name = 'Professional Flight Offer'
  ) THEN
    INSERT INTO ai_templates (agency_id, user_id, agent_id, name, category, description, template_body, tone)
    VALUES (
      p_agency_id, p_user_id, v_flight_agent_id,
      'Professional Flight Offer', 'flight_offer',
      'Client-ready flight quotation email',
      $tpl$Dear {{client_name}},

Please find below the flight offer for your upcoming trip:

Route:
{{route}}

Travel Dates:
{{travel_dates}}

Outbound Flight:
{{outbound_details}}

Return Flight:
{{return_details}}

Fare Includes:
{{inclusions}}

Total Cost:
{{price}}

Please note that the above price is subject to availability and may change until the booking is confirmed.

Should you wish to proceed with the reservation, please let us know and we will be happy to assist further.

Kind regards,
{{agency_name}}$tpl$,
      'professional'
    );

    INSERT INTO ai_templates (agency_id, user_id, agent_id, name, category, description, template_body, tone)
    VALUES (
      p_agency_id, p_user_id, v_cruise_agent_id,
      'Professional Cruise Offer', 'cruise_offer',
      'Client-ready cruise quotation email',
      $tpl$Dear {{client_name}},

Please find below the cruise offer for your requested travel dates:

Cruise Ship:
{{ship_name}}

Travel Dates:
{{travel_dates}}

Itinerary:
{{itinerary}}

Cabin Option:
{{cabin_details}}

Price Includes:
{{inclusions}}

Price Excludes:
{{exclusions}}

Total Cost:
{{price}}

Please note that prices are subject to availability and may change until confirmation.

Kind regards,
{{agency_name}}$tpl$,
      'professional'
    );

    INSERT INTO ai_templates (agency_id, user_id, agent_id, name, category, description, template_body, tone)
    VALUES (
      p_agency_id, p_user_id, v_hotel_agent_id,
      'Hotel Supplier Request', 'hotel_request',
      'Request availability and rates from hotel supplier',
      $tpl$Dear {{supplier_name}},

I hope you are doing well.

Could you please provide us with availability and your best net rates for the below request:

Destination / Hotel:
{{destination_or_hotel}}

Travel Dates:
{{travel_dates}}

Guests:
{{guest_details}}

Room Requirements:
{{room_requirements}}

Meal Plan:
{{meal_plan}}

Additional Notes:
{{notes}}

We would appreciate your soonest reply.

Kind regards,
{{agency_name}}$tpl$,
      'professional'
    );

    INSERT INTO ai_templates (agency_id, user_id, agent_id, name, category, description, template_body, tone)
    VALUES (
      p_agency_id, p_user_id, v_hotel_agent_id,
      'Honeymoon Offer', 'honeymoon_offer',
      'Honeymoon package offer for clients',
      $tpl$Dear {{client_name}},

Thank you for your honeymoon request.

Please find below a suggested honeymoon package based on your preferences:

Destination:
{{destination}}

Travel Dates:
{{travel_dates}}

Hotel / Resort:
{{hotel_details}}

Package Includes:
{{inclusions}}

Package Excludes:
{{exclusions}}

Total Cost:
{{price}}

Please note that prices are subject to availability and may change until confirmation.

Kind regards,
{{agency_name}}$tpl$,
      'professional'
    );

    INSERT INTO ai_templates (agency_id, user_id, agent_id, name, category, description, template_body, tone)
    VALUES (
      p_agency_id, p_user_id, v_payment_agent_id,
      'Payment Reminder', 'payment_reminder',
      'Polite payment reminder for pending balance',
      $tpl$Dear {{client_name}},

I hope you are doing well.

This is a kind reminder regarding the pending balance for your upcoming booking.

Booking Details:
{{booking_details}}

Total Cost:
{{total_cost}}

Amount Received:
{{amount_received}}

Balance Due:
{{balance_due}}

Due Date:
{{due_date}}

Please let us know once the payment has been completed.

Kind regards,
{{agency_name}}$tpl$,
      'professional'
    );
  END IF;
END;
$$;

-- Seed AI defaults when new agency is created
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
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_agency_id FROM agencies WHERE owner_user_id = NEW.id LIMIT 1;
    IF v_agency_id IS NOT NULL THEN
      PERFORM seed_agency_ai_defaults(v_agency_id, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill existing agencies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, owner_user_id FROM agencies LOOP
    PERFORM seed_agency_ai_defaults(r.id, r.owner_user_id);
  END LOOP;
END;
$$;
