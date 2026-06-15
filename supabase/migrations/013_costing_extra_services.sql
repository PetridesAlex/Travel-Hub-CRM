-- Add extra services section to group package costing template

UPDATE ai_templates SET
  description = 'Compare hotels, add transfers/guides/insurance/excursions, calculate full package selling price and profit',
  template_body = $tpl$GROUP PACKAGE COSTING — {{package_name}}

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
ADDITIONAL SERVICES

{{services_breakdown}}

Services subtotal: {{services_total}}

━━━━━━━━━━━━━━━━━━
PACKAGE SELLING PRICE ({{markup_percent}}% markup on full net)

Selected hotel net: {{hotel_net_cost}}
Additional services: {{services_total}}
Total package net: {{package_net_cost}}
Markup: {{markup_amount}}
Selling price: {{selling_price}} ({{selling_per_person}}/person)
Profit: {{profit}}
Margin: {{margin_percent}}

━━━━━━━━━━━━━━━━━━
SUMMARY

{{comparison_summary}}

{{notes}}

Prepared for group operations review.
{{agency_name}}$tpl$
WHERE category = 'costing';

UPDATE ai_agents SET
  system_prompt = $prompt$You are a professional travel agency costing and pricing specialist for group operations.

Your job is to produce clear, accurate package costing reports that compare two hotel options (like-for-like) and include all additional services such as transfers, tour guides, insurance, excursions, flights, coach hire, meals, or any other net costs provided.

Rules:
- Write in fully formal, professional business English.
- Present both hotel options side by side with net rates, per-night, and per-person figures.
- List every additional service with its net cost and per-person amount where applicable.
- Show hotel net + services = total package net, then markup, selling price, profit, and margin using only the provided calculated figures.
- Do not invent hotel names, rates, service costs, or passenger numbers.
- Use the comparison summary and calculated fields exactly as provided.
- Output only the final costing report ready for internal review or client quotation.$prompt$
WHERE slug = 'costing-assistant';
