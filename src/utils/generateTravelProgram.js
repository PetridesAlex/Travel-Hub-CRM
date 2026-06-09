import { createChatCompletion } from '../services/openai'
import { hasOpenAiApiKey } from '../lib/openaiConfig'
import { generateVoiceProgramViaApi } from '../services/aiVoiceProgram'
import { extractTextFromImage } from './screenshotOcr'

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

function cleanSpokenText(text) {
  return text
    .replace(/\b(hello|hi|hey|so basically|basically|okay so|um+|uh+|like|you know|i want you to|please prepare|please include)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function dedupeSentences(sentences) {
  const seen = new Set()
  return sentences.filter((sentence) => {
    const key = sentence.toLowerCase().replace(/[^\w\s£€$]/g, '').replace(/\s+/g, ' ').trim()
    if (!key || key.length < 8 || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function splitIntoSentences(text) {
  return dedupeSentences(
    cleanSpokenText(text)
      .split(/(?<=[.!?])\s+|[\n\r]+|,\s*(?=[A-Z£€$])/)
      .map((s) => s.trim().replace(/^[,.\s]+|[,\s]+$/g, ''))
      .filter((s) => s.length > 10),
  )
}

function sentenceMatches(sentence, patterns) {
  const list = patterns instanceof RegExp ? [patterns] : patterns
  return list.some((pattern) => pattern.test(sentence))
}

function capitalizeSentence(sentence) {
  if (!sentence) return sentence
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

function buildFallbackProgram(transcript, clientName = '', agencyName = 'Your Travel Agency') {
  const sentences = splitIntoSentences(transcript)
  const allText = sentences.join(' ')

  const flightSentences = sentences.filter((s) => sentenceMatches(s, /flight|ryanair|airline|airways|depart|return|airport/i))
  const hotelSentences = sentences.filter((s) => sentenceMatches(s, /hotel|marriott|accommodation|resort|room|check-in|stay/i))
  const insuranceSentences = sentences.filter((s) => sentenceMatches(s, /insurance|cover|policy/i))
  const pricingSentences = sentences.filter((s) => sentenceMatches(s, /£|€|\$|EUR|GBP|USD|price|cost|budget|\d+\s*(pounds|euros)/i))

  const used = new Set([...flightSentences, ...hotelSentences, ...insuranceSentences, ...pricingSentences])
  const otherSentences = sentences.filter((s) => !used.has(s))

  const overviewParts = otherSentences.slice(0, 2)
  if (!overviewParts.length && sentences.length) {
    overviewParts.push(sentences[0])
  }

  const parts = [
    'TRAVEL PROGRAM PROPOSAL',
    '',
    'Program Overview',
    overviewParts.map(capitalizeSentence).join(' ') || 'A tailored travel program prepared according to your requirements.',
    '',
  ]

  if (clientName) {
    parts.push('Client & Purpose', `Prepared for ${clientName}.`, '')
  }

  if (flightSentences.length) {
    parts.push('Flights', ...flightSentences.map((s) => `• ${capitalizeSentence(s)}`), '')
  }

  if (hotelSentences.length) {
    parts.push('Accommodation', ...hotelSentences.map((s) => `• ${capitalizeSentence(s)}`), '')
  }

  if (insuranceSentences.length) {
    parts.push('Travel Insurance', ...insuranceSentences.map((s) => `• ${capitalizeSentence(s)}`), '')
  }

  const inclusionSentences = otherSentences.slice(overviewParts.length)
  if (inclusionSentences.length) {
    parts.push('Inclusions & Services', ...inclusionSentences.map((s) => `• ${capitalizeSentence(s)}`), '')
  }

  parts.push('Pricing Summary')
  if (pricingSentences.length) {
    parts.push(...pricingSentences.map((s) => `• ${capitalizeSentence(s)}`))
  } else {
    const prices = allText.match(/(?:£|€|\$)\s?\d[\d,]*(?:\.\d{2})?/g)
    if (prices?.length) {
      parts.push(...[...new Set(prices)].map((p) => `• ${p.trim()}`))
    } else {
      parts.push('• Final pricing to be confirmed upon availability.')
    }
  }
  parts.push('')

  parts.push(
    'Next Steps & Terms',
    '• All arrangements remain subject to availability at the time of booking.',
    '• Fares and rates may change until confirmed and ticketed in writing.',
    '• Please confirm if you wish to proceed so we can secure the program on your behalf.',
    '',
    `${agencyName}`,
  )

  return polishProgramOutput(parts.join('\n'))
}

function polishProgramOutput(text) {
  const lines = text.split('\n')
  const seenContent = new Set()
  const result = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      if (result.length && result[result.length - 1] !== '') result.push('')
      continue
    }

    const isHeading = /^[A-Z][A-Za-z &]+$/.test(trimmed) && trimmed.length < 40 && !trimmed.startsWith('•')
    if (isHeading) {
      result.push(trimmed)
      continue
    }

    const contentKey = trimmed
      .replace(/^•\s*/, '')
      .toLowerCase()
      .replace(/[^\w\s£€$]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (contentKey.length > 12 && seenContent.has(contentKey)) continue
    if (contentKey.length > 12) seenContent.add(contentKey)

    result.push(line)
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export async function generateTravelProgram({
  transcript = '',
  clientName = '',
  agencyName = 'Your Travel Agency',
  images = [],
  clientId = null,
  session = null,
}) {
  const imageFiles = images.filter((img) => img?.file)
  const imageUrls = images.map((img) => img.preview || img).filter(Boolean)

  if (session?.access_token) {
    const raw = await generateVoiceProgramViaApi({
      transcript,
      clientName,
      clientId,
      images,
    }, session)
    return polishProgramOutput(raw)
  }

  let imageContext = ''
  if (imageFiles.length && !hasOpenAiApiKey()) {
    const ocrChunks = await Promise.all(
      imageFiles.map((img) => extractTextFromImage(img.file).catch(() => '')),
    )
    imageContext = ocrChunks.filter(Boolean).join('\n\n')
  }

  const combinedText = [transcript.trim(), imageContext].filter(Boolean).join('\n\n')
  const cleaned = cleanSpokenText(combinedText)

  if (!cleaned && !imageUrls.length) {
    throw new Error('Please speak, type, or upload at least one image.')
  }

  if (!hasOpenAiApiKey()) {
    if (!cleaned) {
      throw new Error('Could not read text from images. Add your OpenAI key in Settings for vision analysis.')
    }
    return buildFallbackProgram(cleaned, clientName, agencyName)
  }

  const hasImages = imageUrls.length > 0
  const systemPrompt = `You are a senior travel consultant at ${agencyName}, writing a client-ready travel program proposal.

Transform rough spoken agent notes${hasImages ? ' and attached travel images (hotel brochures, flight screenshots, itineraries, rate sheets)' : ''} into polished professional copy — the same quality as ChatGPT business writing.

STRICT RULES:
1. Completely REWRITE the content. Never copy spoken phrasing, filler words, or rambling from the voice note.
2. NEVER repeat the same information twice. Each fact appears exactly once in the most relevant section.
3. Remove all speech fillers ("hello", "so basically", "I want you to", "please include", "um", etc.).
4. Write in clear, confident, professional business English — complete sentences, no awkward phrasing.
5. Be concise. Quality over length. Do not pad with generic filler text.
6. Use these section headings only when relevant (omit empty sections):
   ${SECTIONS.join(', ')}
7. Program Overview: 2–3 polished sentences summarising the trip — not a list of raw notes.
8. Use bullet points only where they improve readability (flights, inclusions, pricing).
9. Do NOT invent prices, dates, flight numbers, or hotel details not mentioned in the notes or images — write "To be confirmed" instead.
10. Preserve currencies exactly as mentioned (£, €, $).
11. Close with a brief professional sign-off from ${agencyName}.
12. Do not use markdown symbols (#, **, etc.). Plain text only.
${hasImages ? '13. Extract all useful details from the images: hotel names, room types, flight times, airlines, prices, dates, inclusions.' : ''}`

  const userPrompt = `Client: ${clientName || 'Not specified'}

${transcript.trim() ? `Raw agent voice note (do NOT copy this wording — rewrite professionally):
"""
${transcript.trim()}
"""` : 'No voice note provided — use the attached images as the primary source.'}

${hasImages ? `\n${imageUrls.length} travel image(s) attached — analyse them for hotels, flights, pricing, room types, and inclusions.` : ''}

Write the complete travel program proposal now.`

  const raw = await createChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    images: hasImages ? imageUrls : [],
    temperature: 0.3,
  })

  return polishProgramOutput(raw)
}

export function isUsingOpenAi(session = null) {
  return Boolean(session?.access_token) || hasOpenAiApiKey()
}
