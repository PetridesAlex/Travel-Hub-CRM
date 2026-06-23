const TRAVEL_TYPES = [
  'cruise', 'honeymoon', 'business', 'school_trip', 'group', 'flight', 'hotel', 'package', 'other',
]

export function buildCrmCapturePrompt(payload = {}) {
  const text = payload.text || payload.message || ''
  const mode = payload.mode === 'client' ? 'client' : 'lead'
  const clientType = payload.client_type === 'business' ? 'business' : payload.client_type === 'individual' ? 'individual' : null

  if (!text.trim()) {
    throw new Error('text is required.')
  }

  const typeInstruction = clientType
    ? `The agent selected "${clientType}" — set client.client_type to "${clientType}" unless the message clearly contradicts this.`
    : 'Infer client_type from context: "individual" for personal travellers, "business" for companies/corporate accounts.'

  const modeHint =
    mode === 'client'
      ? 'Focus on client/contact details. Set intent to "create_client" unless trip details are clearly included.'
      : 'Extract client details AND any travel inquiry (destination, dates, budget, travellers). Prefer intent "create_client_and_lead" when trip info is present.'

  return {
    instructions: `You are a helpful AI assistant inside a premium travel agency CRM.
Agents type natural instructions like "please save the client to individuals with the name Alex Petrides, contact number 97866884, email alex@..." — understand intent and extract structured data.

Return ONLY valid JSON — no markdown fences, no commentary — matching this schema:
{
  "intent": "create_client" | "create_client_and_lead" | "create_lead_only",
  "summary": "One friendly professional sentence confirming what you understood (e.g. 'I'll save Alex Petrides as an individual client with the contact details provided.')",
  "client": {
    "client_type": "individual" | "business",
    "full_name": "string or null — first and last name for individuals; contact person for corporate",
    "company_name": "string or null — organisation name when business",
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
- ${typeInstruction}
- Understand phrases: "save to individuals", "add corporate client", "contact number", "phone", "email", "name", "surname", "company".
- Combine first name + surname into full_name when given separately.
- Do NOT invent email, phone, budget, or dates that are not stated or strongly implied.
- Use null for unknown fields — never use placeholder text like "N/A".
- For business/corporate: company_name = organisation, full_name = contact person name.
- Put conversational context in notes only when useful.
- follow_up_date only when a specific follow-up day is mentioned; otherwise null.`,
    input: `Extract CRM data from this message:\n\n${text}`,
    temperature: 0.15,
  }
}
