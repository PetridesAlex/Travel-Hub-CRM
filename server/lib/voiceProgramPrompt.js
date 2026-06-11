const SECTIONS = [
  'Program Overview',
  'Client & Purpose',
  'Flights',
  'Accommodation',
  'Travel Insurance',
  'Inclusions & Services',
  'Pricing Summary',
  'Next Steps & Terms',
]

export function buildVoiceProgramInstructions(agencyName) {
  return `You are a senior travel consultant at ${agencyName}, writing a formal, client-ready travel program proposal.

Transform rough spoken agent notes and attached travel images (hotel brochures, flight screenshots, itineraries, rate sheets) into polished, fully professional business copy.

STRICT RULES:
1. Completely REWRITE the content. Never copy spoken phrasing, filler words, or rambling from the voice note.
2. NEVER repeat the same information twice. Each fact appears exactly once in the most relevant section.
3. Remove all speech fillers ("hello", "so basically", "I want you to", "please include", "um", etc.).
4. Write in fully formal, professional business English — complete sentences, no casual language, slang, or contractions.
5. Be concise and authoritative. Quality over length. Do not pad with generic filler text.
6. Use these section headings only when relevant (omit empty sections):
   ${SECTIONS.join(', ')}
7. Program Overview: 2–3 polished sentences summarising the trip — not a list of raw notes.
8. Use bullet points only where they improve readability (flights, inclusions, pricing).
9. Do NOT invent prices, dates, flight numbers, or hotel details not mentioned in the notes or images — write "To be confirmed" instead.
10. Preserve currencies, flight numbers, times, and dates exactly as mentioned or shown in images (£, €, $).
11. Close with a brief professional sign-off from ${agencyName}.
12. Do not use markdown symbols (#, **, etc.). Plain text only.
13. Extract ALL useful details from images when provided: hotel names, room types, flight times, airlines, prices, dates, inclusions. Copy figures exactly — do not round or paraphrase.`
}

export function buildVoiceProgramUserMessage({ transcript, clientName, imageCount }) {
  const hasImages = imageCount > 0
  const parts = [`Client: ${clientName || 'Not specified'}`, '']

  if (transcript?.trim()) {
    parts.push(
      'Raw agent voice note (do NOT copy this wording — rewrite into fully formal professional English, preserving every fact):',
      '"""',
      transcript.trim(),
      '"""',
      '',
    )
  } else if (hasImages) {
    parts.push('No voice note provided — use the attached images as the primary source.', '')
  }

  if (hasImages) {
    parts.push(
      `${imageCount} travel image(s) attached — analyse them carefully and extract all hotels, flights, pricing, room types, dates, times, and inclusions. Copy all figures and details exactly as shown.`,
      '',
    )
  }

  parts.push('Write the complete, fully formal travel program proposal now.')
  return parts.join('\n')
}

export function buildOpenAiVoiceInput({ userMessage, imageUrls = [] }) {
  if (imageUrls.length > 0) {
    return [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: userMessage },
          ...imageUrls.map((url) => ({ type: 'input_image', image_url: url })),
        ],
      },
    ]
  }
  return userMessage
}
