const TRAVEL_TYPES = [
  'cruise', 'honeymoon', 'business', 'school_trip', 'group', 'flight', 'hotel', 'package', 'other',
]

export function buildCrmCapturePrompt(payload = {}) {
  const text = payload.text || payload.message || ''
  const mode = payload.mode === 'client' ? 'client' : 'lead'

  if (!text.trim()) {
    throw new Error('text is required.')
  }

  const modeHint =
    mode === 'client'
      ? 'Focus on client/contact details. Set intent to "create_client" unless trip details are clearly included.'
      : 'Extract client details AND any travel inquiry (destination, dates, budget, travellers). Prefer intent "create_client_and_lead" when trip info is present.'

  return {
    instructions: `You are a travel agency CRM assistant. Extract structured client and lead data from the agent's message.

Return ONLY valid JSON — no markdown fences, no commentary — matching this schema:
{
  "intent": "create_client" | "create_client_and_lead" | "create_lead_only",
  "summary": "One short professional sentence summarising what will be saved",
  "client": {
    "client_type": "individual" | "business",
    "full_name": "string or null",
    "company_name": "string or null (required when business)",
    "email": "string or null",
    "phone": "string or null",
    "nationality": "string or null",
    "notes": "string or null"
  },
  "lead": {
    "destination": "string or null",
    "travel_type": "${TRAVEL_TYPES.join(' | ')}",
    "budget": number or null,
    "number_of_adults": number,
    "number_of_children": number,
    "travel_dates": "string or null",
    "status": "new",
    "notes": "string or null",
    "follow_up_date": "YYYY-MM-DD or null"
  } | null
}

Rules:
- ${modeHint}
- Do NOT invent email, phone, budget, or dates that are not stated or strongly implied.
- Use null for unknown fields — never use placeholder text like "N/A".
- For business/corporate contacts: client_type "business", company_name = organisation, full_name = contact person.
- Infer travel_type from context (honeymoon, cruise, business trip, etc.) or use "other".
- Put extra context in notes fields.
- follow_up_date only when a specific follow-up day is mentioned; otherwise null.
- If only trip details with no client name, still extract what you can and use intent "create_lead_only" with client fields null.`,
    input: `Extract CRM data from this message:\n\n${text}`,
    temperature: 0.15,
  }
}
