const RATING_OPTIONS = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor']
const YES_NO_PATTERNS = /^(were|was|did|is|are|has|have|do|does|can|could|would)\b/i

function cleanLine(line) {
  return line
    .replace(/^[\s•\-*>\d.)、]+/, '')
    .replace(/\*\*/g, '')
    .trim()
}

function isOptionLine(line) {
  const t = line.trim()
  return /^[\s]*([•\-*]|\d+[.)]|[a-zA-Z][.)])\s+/.test(t) || /^[✅🚫☐☑]/.test(t)
}

function parseOption(line) {
  return cleanLine(line.replace(/^[✅🚫]\s*/, ''))
}

function detectQuestionType(text, options) {
  const lower = text.toLowerCase()
  if (/how would you rate|rate your|rate the|rate our/i.test(text) && options.length >= 3) {
    return 'radio'
  }
  if (YES_NO_PATTERNS.test(text) && options.length <= 2) {
    const opts = options.map((o) => o.toLowerCase())
    if (opts.some((o) => /yes|fully|mostly/i.test(o)) && opts.some((o) => /no|not/i.test(o))) {
      return 'yes_no'
    }
  }
  if (options.length > 1) return 'radio'
  if (/describe|comment|feedback|explain|tell us/i.test(lower)) return 'long_text'
  return 'short_text'
}

function defaultRatingOptions(text) {
  if (/rate|rating|experience|hotel|service/i.test(text)) return [...RATING_OPTIONS]
  return []
}

export function parseFormFromText(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^---+$/.test(l))

  let title = ''
  let description = ''
  const questions = []
  let i = 0

  while (i < lines.length && !lines[i].includes('?')) {
    if (!title) title = cleanLine(lines[i])
    else description += (description ? ' ' : '') + cleanLine(lines[i])
    i += 1
  }

  while (i < lines.length) {
    const line = lines[i]
    if (!line.includes('?') && !isOptionLine(line)) {
      i += 1
      continue
    }

    let questionText = line.includes('?') ? cleanLine(line) : cleanLine(line)
    if (!questionText.endsWith('?')) questionText += '?'

    const options = []
    i += 1
    while (i < lines.length) {
      const next = lines[i]
      if (next.includes('?') && !isOptionLine(next)) break
      if (isOptionLine(next) || (options.length && !next.includes('?'))) {
        const opt = parseOption(next)
        if (opt && !opt.endsWith('?')) options.push(opt)
        i += 1
        continue
      }
      if (!options.length && !next.includes('?')) {
        i += 1
        continue
      }
      break
    }

    const finalOptions = options.length ? options : defaultRatingOptions(questionText)
    const questionType = detectQuestionType(questionText, finalOptions)

    questions.push({
      question_text: questionText,
      question_type: questionType,
      options: questionType === 'yes_no' ? [] : finalOptions,
      required: true,
      help_text: '',
      config: {},
    })
  }

  return {
    title: title || 'Untitled survey',
    description: description.trim(),
    questions,
  }
}

export function normalizeAiFormPayload(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid form data')

  const questions = (data.questions || []).map((q, index) => ({
    question_text: q.question_text || q.label || q.question || `Question ${index + 1}`,
    question_type: q.question_type || (q.options?.length ? 'radio' : 'short_text'),
    options: Array.isArray(q.options) ? q.options : [],
    required: q.required !== false,
    help_text: q.help_text || '',
    config: {
      ...(q.config || {}),
      ...(q.image_url ? { image_url: q.image_url } : {}),
    },
  }))

  return {
    title: data.title || 'Untitled survey',
    description: data.description || '',
    settings: data.settings || {},
    questions,
  }
}

export function parseAiFormJson(output) {
  const text = String(output || '').trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON. Try pasting a clearer outline.')
  const parsed = JSON.parse(jsonMatch[0])
  return normalizeAiFormPayload(parsed)
}
