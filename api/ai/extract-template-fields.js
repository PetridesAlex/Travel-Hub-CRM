import { createClient } from '@supabase/supabase-js'
import { createOpenAiResponse } from '../../server/lib/openaiService.js'
import {
  buildExtractTemplateInstructions,
  buildExtractTemplateUserMessage,
  CATEGORY_FIELD_SCHEMAS,
  parseTemplateFieldsJson,
} from '../../server/lib/extractTemplateFieldsPrompt.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const openAiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!openAiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' })
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase environment variables are not configured.' })
  }

  const token = (req.headers.authorization || req.headers.Authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  const category = req.body?.category || 'general_email'
  if (!CATEGORY_FIELD_SCHEMAS[category]) {
    return res.status(400).json({ error: `Unsupported template category: ${category}` })
  }

  const images = Array.isArray(req.body?.images)
    ? req.body.images.filter((url) => typeof url === 'string' && url.startsWith('data:image/'))
    : []

  if (!images.length) {
    return res.status(400).json({ error: 'At least one image is required.' })
  }
  if (images.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 images per request.' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }

  const userMessage = buildExtractTemplateUserMessage(category, images.length)
  const input = [{
    role: 'user',
    content: [
      { type: 'input_text', text: userMessage },
      ...images.map((url) => ({ type: 'input_image', image_url: url })),
    ],
  }]

  let raw
  try {
    const result = await createOpenAiResponse({
      instructions: buildExtractTemplateInstructions(category),
      input,
      temperature: 0.1,
    })
    raw = result.text
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }

  const fields = parseTemplateFieldsJson(raw, category)

  if (!Object.keys(fields).length) {
    return res.status(422).json({ error: 'Could not extract details from the image(s). Try a clearer crop.' })
  }

  return res.status(200).json({ fields })
}
