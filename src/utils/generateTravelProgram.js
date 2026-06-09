import { generateVoiceProgramViaApi } from '../services/aiVoiceProgram'
import { extractTextFromImage } from './screenshotOcr'

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
  if (imageFiles.length) {
    const ocrChunks = await Promise.all(
      imageFiles.map((img) => extractTextFromImage(img.file).catch(() => '')),
    )
    imageContext = ocrChunks.filter(Boolean).join('\n\n')
  }

  const combinedText = [transcript.trim(), imageContext].filter(Boolean).join('\n\n')
  const cleaned = cleanSpokenText(combinedText)

  if (!cleaned) {
    throw new Error('Please sign in to use AI, or speak/type notes the system can read.')
  }

  return buildFallbackProgram(cleaned, clientName, agencyName)
}

export function isUsingOpenAi(session = null) {
  return Boolean(session?.access_token)
}
