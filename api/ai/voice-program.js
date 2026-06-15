import { createClient } from '@supabase/supabase-js'
import { createOpenAiResponse } from '../../server/lib/openaiService.js'
import {
  buildOpenAiVoiceInput,
  buildVoiceProgramInstructions,
  buildVoiceProgramUserMessage,
} from '../../server/lib/voiceProgramPrompt.js'
import { resolveUserAgency } from '../../server/lib/resolveUserAgency.js'

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

  const authHeader = req.headers.authorization || req.headers.Authorization
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  const body = req.body || {}
  const {
    transcript = '',
    client_name: clientName = '',
    client_id: clientId = null,
    images = [],
  } = body

  const imageUrls = Array.isArray(images)
    ? images.filter((url) => typeof url === 'string' && url.startsWith('data:image/'))
    : []

  if (!transcript.trim() && imageUrls.length === 0) {
    return res.status(400).json({ error: 'Please provide a voice note or at least one image.' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }

  const resolved = await resolveUserAgency(supabase, userData.user.id)
  const agency = resolved?.agency

  if (!agency) {
    return res.status(403).json({ error: 'Agency not found for this user.' })
  }

  let resolvedClientName = clientName
  if (clientId && !resolvedClientName) {
    const { data: client } = await supabase.from('clients').select('full_name, company_name, client_type').eq('id', clientId).single()
    if (client) {
      resolvedClientName = client.client_type === 'business' && client.company_name
        ? client.company_name
        : client.full_name
    }
  }

  const agencyName = agency.name || 'Your Travel Agency'
  const userMessage = buildVoiceProgramUserMessage({
    transcript,
    clientName: resolvedClientName,
    imageCount: imageUrls.length,
  })
  const instructions = buildVoiceProgramInstructions(agencyName)
  const input = buildOpenAiVoiceInput({ userMessage, imageUrls })

  let output
  try {
    const result = await createOpenAiResponse({
      instructions,
      input,
      temperature: 0.25,
    })
    output = result.text
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }

  return res.status(200).json({ output })
}
