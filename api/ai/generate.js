import { createClient } from '@supabase/supabase-js'
import { buildOpenAiUserMessage, extractOpenAiText } from '../lib/buildAiPrompt.js'
import { sendSlackNotification } from '../lib/sendSlackNotification.js'
import { buildSlackMessage } from '../lib/slackMessages.js'

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
  const { agent_id, template_id, client_id, lead_id, input_data = {}, extra_notes = '' } = body

  if (!agent_id || !template_id) {
    return res.status(400).json({ error: 'agent_id and template_id are required.' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }

  const userId = userData.user.id

  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('owner_user_id', userId)
    .single()

  if (agencyError || !agency) {
    return res.status(403).json({ error: 'Agency not found for this user.' })
  }

  const [agentRes, templateRes] = await Promise.all([
    supabase.from('ai_agents').select('*').eq('id', agent_id).eq('agency_id', agency.id).single(),
    supabase.from('ai_templates').select('*').eq('id', template_id).eq('agency_id', agency.id).single(),
  ])

  if (agentRes.error || !agentRes.data) {
    return res.status(404).json({ error: 'Agent not found.' })
  }
  if (templateRes.error || !templateRes.data) {
    return res.status(404).json({ error: 'Template not found.' })
  }

  const agent = agentRes.data
  const template = templateRes.data

  if (!agent.is_active || !template.is_active) {
    return res.status(400).json({ error: 'Selected agent or template is inactive.' })
  }

  const enrichedInput = { ...input_data, agency_name: agency.name }

  if (client_id) {
    const { data: client } = await supabase.from('clients').select('*').eq('id', client_id).single()
    if (client) {
      enrichedInput.client_name = enrichedInput.client_name
        || (client.client_type === 'business' && client.company_name ? client.company_name : client.full_name)
    }
  }

  if (lead_id) {
    const { data: lead } = await supabase.from('leads').select('destination, travel_dates, notes').eq('id', lead_id).single()
    if (lead) {
      enrichedInput.destination = enrichedInput.destination || lead.destination || ''
      enrichedInput.travel_dates = enrichedInput.travel_dates || lead.travel_dates || ''
      enrichedInput.notes = [enrichedInput.notes, lead.notes].filter(Boolean).join('\n')
    }
  }

  const userMessage = buildOpenAiUserMessage({
    templateBody: template.template_body,
    inputData: enrichedInput,
    agencyName: agency.name,
    extraNotes: extra_notes,
  })

  let openAiResponse
  try {
    openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        instructions: agent.system_prompt,
        input: userMessage,
        temperature: 0.3,
      }),
    })
  } catch (err) {
    return res.status(502).json({ error: `OpenAI request failed: ${err.message}` })
  }

  if (!openAiResponse.ok) {
    const errBody = await openAiResponse.json().catch(() => ({}))
    return res.status(502).json({
      error: errBody?.error?.message || `OpenAI request failed (${openAiResponse.status})`,
    })
  }

  const openAiData = await openAiResponse.json()
  const output = extractOpenAiText(openAiData)

  if (!output) {
    return res.status(502).json({ error: 'OpenAI returned an empty response.' })
  }

  const { data: generation, error: insertError } = await supabase
    .from('ai_generations')
    .insert({
      agency_id: agency.id,
      user_id: userId,
      agent_id: agent.id,
      template_id: template.id,
      client_id: client_id || null,
      lead_id: lead_id || null,
      input_data: enrichedInput,
      generated_output: output,
      generation_type: template.category,
    })
    .select('id')
    .single()

  if (insertError) {
    return res.status(500).json({ error: insertError.message })
  }

  const clientName = enrichedInput.client_name || '—'
  const slackMessage = buildSlackMessage('ai_generation_created', {
    agent_name: agent.name,
    category: template.category,
    client_name: clientName,
  })
  if (slackMessage) {
    await sendSlackNotification(slackMessage).catch(() => {})
  }

  return res.status(200).json({
    output,
    generation_id: generation.id,
  })
}
