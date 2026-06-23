/**
 * Server-side AI assistant — all requests go through /api/ai/assist.
 * OPENAI_API_KEY never leaves the server (Vercel env).
 */

async function callAiAssist(task, payload, session) {
  if (!session?.access_token) {
    throw new Error('You must be signed in to use AI features.')
  }

  let res
  try {
    res = await fetch('/api/ai/assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ task, ...payload }),
    })
  } catch {
    throw new Error(
      'AI API unreachable. On local dev, run "npm run dev:api" in a second terminal, then try again.',
    )
  }

  const raw = await res.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    if (res.status === 502 && !data.error) {
      throw new Error(
        'AI API unavailable (502). On local dev, run "npm run dev:api" in a second terminal.',
      )
    }
    throw new Error(data.error || raw?.slice(0, 200) || `AI request failed (${res.status})`)
  }

  return data
}

export function isAiAvailable(session) {
  return Boolean(session?.access_token)
}

export async function generateTravelEmail(taskOrType, payload, session) {
  const emailTasks = new Set([
    'travel_email', 'flight_offer', 'cruise_offer', 'hotel_offer', 'supplier_request', 'payment_reminder',
  ])
  const task = emailTasks.has(taskOrType) ? taskOrType : 'flight_offer'
  const data = await callAiAssist(task, {
    email_type: taskOrType,
    ...payload,
  }, session)
  return data.output
}

export async function summarizeClientNotes({ notes, clientName, context }, session) {
  const data = await callAiAssist('summarize_notes', { notes, client_name: clientName, context }, session)
  return data.output
}

export async function rewriteMessage({ text, tone }, session) {
  const data = await callAiAssist('rewrite_message', { text, tone }, session)
  return data.output
}

export async function askCrmAssistant({ prompt, message, question }, session) {
  const data = await callAiAssist('crm_assist', { prompt, message, question }, session)
  return data.output
}

export async function chatCompletion({ messages, instructions, temperature, images }, session) {
  const data = await callAiAssist('chat', { messages, instructions, temperature, images }, session)
  return data.output
}

export async function importFormFromAi(text, session) {
  const data = await callAiAssist('form_import', { text }, session)
  return data.form || null
}

export async function captureCrmFromAi(text, session, { mode = 'lead', client_type: clientType = null } = {}) {
  const data = await callAiAssist('crm_capture', { text, mode, client_type: clientType }, session)
  return data.capture || null
}

export async function askCalendarAssistant(payload, session) {
  if (!session?.access_token) {
    throw new Error('You must be signed in to use the AI assistant.')
  }

  const res = await fetch('/api/ai/calendar-assist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  })

  const raw = await res.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    if (res.status === 502 && !data.error) {
      throw new Error(
        'AI API unavailable (502). On local dev, run "npm run dev:api" in a second terminal.',
      )
    }
    throw new Error(data.error || raw?.slice(0, 200) || `Calendar assistant failed (${res.status})`)
  }

  return data.output
}
