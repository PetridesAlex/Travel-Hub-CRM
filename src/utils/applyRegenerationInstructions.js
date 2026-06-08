const CLOSING_MARKERS = [
  'Fares are subject to change',
  'Please confirm if you wish to proceed',
  'Best regards,',
  'Warm regards,',
  'Kind regards,',
]

function insertBeforeClosing(body, text) {
  if (!text?.trim()) return body
  const note = text.trim().endsWith('.') ? text.trim() : `${text.trim()}.`

  for (const marker of CLOSING_MARKERS) {
    const idx = body.indexOf(marker)
    if (idx >= 0) {
      return `${body.slice(0, idx).trimEnd()}\n\n${note}\n\n${body.slice(idx)}`
    }
  }

  return `${body.trimEnd()}\n\n${note}`
}

function removeAdditionalNotesBlock(body) {
  return body
    .replace(/\n---\nRequested changes:[\s\S]*?(?=\n\nFares are subject|\n\nBest regards|\n\nWarm regards|$)/gi, '')
    .replace(/\nAdditional Notes:\n[\s\S]*?(?=\n\nFares are subject|\n\nBest regards|\n\nWarm regards|$)/gi, '')
    .trimEnd()
}

function makeShorter(body) {
  let result = removeAdditionalNotesBlock(body)
  result = result.replace(/\nWHAT'S INCLUDED[\s\S]*?(?=\n\nFares are subject|\n\nBest regards|\n\n[A-Z]{2,}|$)/i, '')
  result = result.replace(/\n{3,}/g, '\n\n')
  return result.trimEnd()
}

function removeInboundSection(body) {
  return body
    .replace(/━+\nINBOUND[\s\S]*?(?=━+\nOUTBOUND|WHAT'S INCLUDED|Fares are subject|Best regards|$)/i, '')
    .replace(/━+\nRETURN[\s\S]*?(?=━+\nOUTBOUND|WHAT'S INCLUDED|Fares are subject|Best regards|$)/i, '')
    .replace(/\nINBOUND[\s\S]*?(?=\nOUTBOUND|WHAT'S INCLUDED|Fares are subject|Best regards|$)/i, '')
    .trimEnd()
}

function updatePriceInBody(body, price) {
  const normalized = String(price).replace(',', '.')
  let result = body.replace(/TOTAL PRICE:\s*[€$£]?\s*[\d.,]+/i, `TOTAL PRICE: €${normalized}`)
  result = result.replace(/Total Price:\s*[\d.,]+\s*[A-Z]{3}/i, `Total Price: ${normalized} EUR`)
  if (!/TOTAL PRICE:|Total Price:/i.test(result)) {
    result = insertBeforeClosing(result, `Updated total price: €${normalized}`)
  }
  return result
}

function removeMatchingContent(body, target) {
  if (!target) return body
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const lineRegex = new RegExp(`^.*${escaped}.*$\\n?`, 'gim')
  let result = body.replace(lineRegex, '')
  result = result.replace(new RegExp(`\\n•\\s*${escaped}.*$`, 'gim'), '')
  return result.replace(/\n{3,}/g, '\n\n').trimEnd()
}

function replaceSubject(subject, instruction) {
  const explicit = instruction.match(/(?:subject|title)\s*(?:to|:)\s*(.+)$/i)
  if (explicit) return explicit[1].trim()
  return subject
}

function applyGenericInstruction(body, instruction, freshBody) {
  const cleaned = instruction.trim()
  if (!cleaned) return body

  if (/^use (?:the )?(?:new|fresh|latest|updated)/i.test(cleaned)) {
    return freshBody
  }

  if (/^replace (?:the )?(?:whole )?email/i.test(cleaned)) {
    return freshBody
  }

  return insertBeforeClosing(removeAdditionalNotesBlock(body), cleaned)
}

export function applyRegenerationInstructions({
  subject = '',
  body = '',
  instruction = '',
  freshEmail = { subject: '', body: '' },
}) {
  const trimmed = instruction.trim()
  if (!trimmed) {
    return { subject: subject || freshEmail.subject, body: body || freshEmail.body }
  }

  let nextSubject = subject || freshEmail.subject
  let nextBody = body || freshEmail.body
  let matched = false

  if (/make it shorter|shorter|more concise|keep it brief|brief email/i.test(trimmed)) {
    nextBody = makeShorter(nextBody)
    matched = true
  }

  if (/remove inbound|remove return|without return|no return|one way only|one-way only/i.test(trimmed)) {
    nextBody = removeInboundSection(nextBody)
    if (/one way|one-way/i.test(trimmed)) {
      nextSubject = nextSubject.replace(/\s↔\s/g, ' → ')
    }
    matched = true
  }

  const priceMatch =
    trimmed.match(/(?:change|set|update)\s+(?:the\s+)?price\s*(?:to|:)\s*€?\s*(\d+[.,]?\d*)/i)
    || trimmed.match(/(?:price|total)\s*(?:to|:)\s*€?\s*(\d+[.,]?\d*)/i)
    || trimmed.match(/€\s*(\d+[.,]?\d*)/i)

  if (priceMatch) {
    nextBody = updatePriceInBody(nextBody, priceMatch[1])
    matched = true
  }

  const removeMatch = trimmed.match(/^remove\s+(?:the\s+)?(.+)$/i)
  if (removeMatch) {
    nextBody = removeMatchingContent(nextBody, removeMatch[1].trim())
    matched = true
  }

  const addMatch = trimmed.match(/^(?:add|include|mention)\s+(?:that\s+)?(.+)$/i)
  if (addMatch && !/^remove/i.test(trimmed)) {
    nextBody = insertBeforeClosing(nextBody, addMatch[1].trim())
    matched = true
  }

  const paymentMatch = trimmed.match(/payment(?:\s+is)?\s+due(?:\s+in)?\s+(\d+)\s+days?/i)
  if (paymentMatch) {
    nextBody = insertBeforeClosing(nextBody, `Payment is due within ${paymentMatch[1]} days to secure this fare`)
    matched = true
  }

  if (/subject|title/i.test(trimmed)) {
    nextSubject = replaceSubject(nextSubject, trimmed)
    matched = true
  }

  if (/refresh|regenerate|start over|from scratch/i.test(trimmed) && !matched) {
    return { subject: freshEmail.subject, body: freshEmail.body }
  }

  if (!matched) {
    nextBody = applyGenericInstruction(nextBody, trimmed, freshEmail.body)
  }

  return {
    subject: nextSubject,
    body: nextBody.trimEnd(),
  }
}
