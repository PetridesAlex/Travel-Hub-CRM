import { verifySession } from '../../server/lib/verifySession.js'
import { isOpenAiConfigured, createOpenAiResponse } from '../../server/lib/openaiService.js'
import { AI_ASSIST_TASKS, buildAssistPrompt } from '../../server/lib/aiAssistPrompts.js'
import { buildCalendarAssistPrompt } from '../../server/lib/calendarAssistPrompt.js'
import { buildTaskAssistPrompt } from '../../server/lib/taskAssistPrompt.js'
import { parseAiFormJson } from '../../server/lib/formImportParse.js'
import { parseAiCrmCaptureJson } from '../../server/lib/crmCaptureParse.js'

function getAssistRoute(req) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const route = url.searchParams.get('route')
  if (route) return route
  if (url.pathname.includes('calendar-assist')) return 'calendar-assist'
  if (url.pathname.includes('task-assist')) return 'task-assist'
  return null
}

async function handleRoutedAssist(req, res, buildPrompt, taskName) {
  const body = req.body || {}
  if (!body.message?.trim()) {
    return res.status(400).json({ error: 'message is required.' })
  }

  let promptConfig
  try {
    promptConfig = buildPrompt(body)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  const { text, raw } = await createOpenAiResponse({
    instructions: promptConfig.instructions,
    input: promptConfig.input,
    temperature: promptConfig.temperature,
  })

  return res.status(200).json({
    output: text,
    task: taskName,
    model: raw?.model || undefined,
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isOpenAiConfigured()) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' })
  }

  const auth = await verifySession(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const assistRoute = getAssistRoute(req)
  if (assistRoute === 'calendar-assist') {
    try {
      return await handleRoutedAssist(req, res, buildCalendarAssistPrompt, 'calendar_assist')
    } catch (err) {
      return res.status(502).json({ error: err.message })
    }
  }
  if (assistRoute === 'task-assist') {
    try {
      return await handleRoutedAssist(req, res, buildTaskAssistPrompt, 'task_assist')
    } catch (err) {
      return res.status(502).json({ error: err.message })
    }
  }

  const body = req.body || {}
  const task = body.task

  if (!task || !AI_ASSIST_TASKS.has(task)) {
    return res.status(400).json({
      error: `Invalid task. Allowed: ${[...AI_ASSIST_TASKS].join(', ')}`,
    })
  }

  let promptConfig
  try {
    promptConfig = buildAssistPrompt(task, body)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  const images = Array.isArray(body.images)
    ? body.images.filter((url) => typeof url === 'string' && url.startsWith('data:image/'))
    : []

  try {
    let input = promptConfig.input

    if (images.length > 0 && task === 'chat') {
      input = [{
        role: 'user',
        content: [
          { type: 'input_text', text: typeof input === 'string' ? input : 'Analyse the attached images.' },
          ...images.map((url) => ({ type: 'input_image', image_url: url })),
        ],
      }]
    }

    const { text, raw } = await createOpenAiResponse({
      instructions: promptConfig.instructions,
      input,
      temperature: promptConfig.temperature,
    })

    if (task === 'form_import') {
      try {
        const form = parseAiFormJson(text)
        return res.status(200).json({ form, task, model: raw?.model || undefined })
      } catch (parseErr) {
        return res.status(422).json({ error: parseErr.message || 'Could not parse AI form output.' })
      }
    }

    if (task === 'crm_capture') {
      try {
        const clientType = body.client_type === 'business' ? 'business' : body.client_type === 'individual' ? 'individual' : null
        const capture = parseAiCrmCaptureJson(text, body.mode === 'client' ? 'client' : 'lead', {
          clientTypeHint: body.mode === 'client' ? clientType : null,
        })
        return res.status(200).json({ capture, task, model: raw?.model || undefined })
      } catch (parseErr) {
        return res.status(422).json({ error: parseErr.message || 'Could not parse AI capture output.' })
      }
    }

    return res.status(200).json({
      output: text,
      task,
      model: raw?.model || undefined,
    })
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
}
