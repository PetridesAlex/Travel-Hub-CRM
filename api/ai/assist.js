import { verifySession } from '../../server/lib/verifySession.js'
import { isOpenAiConfigured, createOpenAiResponse } from '../../server/lib/openaiService.js'
import { AI_ASSIST_TASKS, buildAssistPrompt } from '../../server/lib/aiAssistPrompts.js'

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

    return res.status(200).json({
      output: text,
      task,
      model: raw?.model || undefined,
    })
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
}
