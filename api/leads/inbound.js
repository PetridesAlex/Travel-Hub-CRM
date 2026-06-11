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

    if (existing) {
      if (clientFields.phone && !existing.phone) {
        await supabase
          .from('clients')
          .update({ phone: clientFields.phone })
          .eq('id', existing.id)
        existing.phone = clientFields.phone
      }
      return { client: existing, created: false }
    }
  }

  if (clientFields.phone) {
    const { data: byPhone } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('user_id', userId)
      .eq('phone', clientFields.phone)
      .maybeSingle()

    if (byPhone) {
      if (clientFields.email && !byPhone.email) {
        await supabase
          .from('clients')
          .update({ email: clientFields.email })
          .eq('id', byPhone.id)
        byPhone.email = clientFields.email
      }
      return { client: byPhone, created: false }
    }
  }

  const { data: created, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      full_name: clientFields.full_name,
      email: clientFields.email,
      phone: clientFields.phone,
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
      email: client.email,
      phone: client.phone,
      destination: lead.destination,
      message: meta.message,
      budget: lead.budget,
      status: lead.status,
      currency: 'EUR',
      source: meta.source,
    })

    if (slackMessage) {
      await sendSlackNotification(slackMessage)
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
      ? ' Run supabase/migrations/002_client_types.sql in the CRM Supabase SQL Editor, or confirm VITE_SUPABASE_URL is https://nwdyywbtbgdbdwneovme.supabase.co'
      : ''
    return res.status(500).json({ error: `${message}${hint}` })
  }
}
