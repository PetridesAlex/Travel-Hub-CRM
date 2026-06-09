import { verifyAgencyApiKey } from '../lib/verifyAgencyApiKey.js'
import { parseWebsiteInquiry } from '../lib/parseWebsiteInquiry.js'
import { sendSlackNotification } from '../lib/sendSlackNotification.js'
import { buildSlackMessage } from '../lib/slackMessages.js'

async function findOrCreateClient(supabase, userId, clientFields) {
  if (clientFields.email) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('user_id', userId)
      .ilike('email', clientFields.email)
      .maybeSingle()

    if (existing) return { client: existing, created: false }
  }

  const { data: created, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      client_type: 'individual',
      full_name: clientFields.full_name,
      email: clientFields.email,
      phone: clientFields.phone,
      notes: 'Auto-created from website inquiry',
    })
    .select('id, full_name, email, phone')
    .single()

  if (error) throw new Error(error.message)
  return { client: created, created: true }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = await verifyAgencyApiKey(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const inquiry = parseWebsiteInquiry(req.body || {})
  const { client: clientFields, lead: leadFields, meta } = inquiry

  if (!clientFields.email && !clientFields.full_name) {
    return res.status(400).json({
      error: 'Could not extract client details. Send full_name + email, or raw_email with form content.',
    })
  }

  try {
    const { client, created: clientCreated } = await findOrCreateClient(
      auth.supabase,
      auth.userId,
      clientFields,
    )

    const { data: lead, error: leadError } = await auth.supabase
      .from('leads')
      .insert({
        ...leadFields,
        user_id: auth.userId,
        client_id: client.id,
        automation_processed: false,
      })
      .select('id, destination, travel_type, budget, status')
      .single()

    if (leadError) throw new Error(leadError.message)

    const slackMessage = buildSlackMessage('lead_created', {
      client_name: client.full_name,
      destination: lead.destination,
      budget: lead.budget,
      status: lead.status,
      currency: 'EUR',
    })

    if (slackMessage) {
      const suffix = meta.source ? `\nSource: ${meta.source}` : ''
      await sendSlackNotification(`${slackMessage}${suffix}`)
    }

    return res.status(201).json({
      success: true,
      lead_id: lead.id,
      client_id: client.id,
      client_created: clientCreated,
      parsed: {
        destination: lead.destination,
        travel_type: lead.travel_type,
        budget: lead.budget,
        source: meta.source,
        package_name: meta.package_name,
      },
    })
  } catch (err) {
    const message = err.message || 'Failed to create lead.'
    const hint = /client_type|schema cache/i.test(message)
      ? ' Check SUPABASE_SERVICE_ROLE_KEY on Travel Hub CRM Vercel — it must be the service_role key from the CRM Supabase project (nwdyywbtbgdbdwneovme), not the Honeywell website project.'
      : ''
    return res.status(500).json({ error: `${message}${hint}` })
  }
}
