import { verifySession } from '../../server/lib/verifySession.js'
import { isOpenAiConfigured, createOpenAiResponse } from '../../server/lib/openaiService.js'
import { buildCalendarAssistPrompt } from '../../server/lib/calendarAssistPrompt.js'

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

  const body = req.body || {}
  if (!body.message?.trim()) {
    return res.status(400).json({ error: 'message is required.' })
  }

  let promptConfig
  try {
    promptConfig = buildCalendarAssistPrompt(body)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  try {
    const { text, raw } = await createOpenAiResponse({
      instructions: promptConfig.instructions,
      input: promptConfig.input,
      temperature: promptConfig.temperature,
    })

    return res.status(200).json({
      output: text,
      task: 'calendar_assist',
      model: raw?.model || undefined,
    })
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
}
