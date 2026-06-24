import { supabase } from '../lib/supabase'
import { createClient } from './clients'
import { createLead, updateLead } from './leads'
import { createTask } from './tasks'
import { captureCrmFromAi, isAiAvailable } from './aiAssist'
import { parseCrmCaptureFromText } from '../utils/parseCrmCaptureText'
import { enrichCaptureWithSourceNotes } from '../../shared/crmCapture.js'
import { notifySlack } from './slackNotify'
import { formatClientName } from '../utils/format'
import { defaultLeadFollowUpDate } from '../utils/exportPdf'

export async function extractCrmCapture(text, session, { mode = 'lead', useAi = true, clientType = null } = {}) {
  const trimmed = String(text || '').trim()
  if (!trimmed) throw new Error('Type a message with client or lead details first.')

  const options = { clientTypeHint: clientType }

  if (!useAi) {
    const local = parseCrmCaptureFromText(trimmed, mode, options)
    return enrichCaptureWithSourceNotes(local, trimmed)
  }

  if (!isAiAvailable(session)) {
    throw new Error('You must be signed in to use AI capture.')
  }

  try {
    const capture = await captureCrmFromAi(trimmed, session, { mode, client_type: clientType })
    if (!capture) throw new Error('AI returned empty data. Try again or use quick parse.')
    return enrichCaptureWithSourceNotes({ ...capture, _fallbackNote: null }, trimmed)
  } catch (err) {
    const msg = err.message || ''
    const canFallback =
      msg.includes('502') ||
      msg.includes('OPENAI') ||
      msg.includes('unavailable') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('422')

    if (canFallback) {
      const local = parseCrmCaptureFromText(trimmed, mode, options)
      return {
        ...enrichCaptureWithSourceNotes(local, trimmed),
        _fallbackNote: 'AI was unavailable — used quick parse. Check the preview before saving.',
      }
    }
    throw err
  }
}

export async function findMatchingClient({ email, phone }) {
  if (email) {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle()
    if (data) return data
  }

  if (phone) {
    const normalized = phone.replace(/\s/g, '')
    const { data: exact } = await supabase
      .from('clients')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()
    if (exact) return exact

    if (normalized !== phone) {
      const { data: compact } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', normalized)
        .maybeSingle()
      if (compact) return compact
    }
  }

  return null
}

export async function saveCrmCapture({
  capture,
  existingClientId = null,
  userId,
  agencyId,
  session,
  createLeadRecord = true,
}) {
  let client = null
  let clientId = existingClientId

  if (!clientId && capture.client) {
    const payload = {
      client_type: capture.client.client_type || 'individual',
      full_name: capture.client.full_name || capture.client.company_name || 'Unnamed client',
      company_name: capture.client.company_name || null,
      email: capture.client.email || null,
      phone: capture.client.phone || null,
      nationality: capture.client.nationality || null,
      notes: capture.client.notes || null,
    }

    if (payload.client_type === 'business' && !payload.company_name) {
      payload.company_name = payload.full_name
    }

    client = await createClient(payload, userId, agencyId)
    clientId = client.id

    notifySlack(session, 'client_created', {
      full_name: formatClientName(client),
      email: client.email || '—',
      phone: client.phone || '—',
    })
  }

  let lead = null
  const shouldCreateLead =
    createLeadRecord &&
    capture.lead &&
    ['create_client_and_lead', 'create_lead_only'].includes(capture.intent)

  if (shouldCreateLead) {
    const leadPayload = {
      ...capture.lead,
      client_id: clientId || null,
      budget: capture.lead.budget ?? null,
      follow_up_date: capture.lead.follow_up_date || null,
    }

    lead = await createLead(leadPayload, userId, agencyId)

    notifySlack(session, 'lead_created', {
      client_name: client ? formatClientName(client) : '—',
      email: client?.email,
      phone: client?.phone,
      destination: leadPayload.destination || '—',
      message: leadPayload.notes,
      budget: leadPayload.budget,
      status: leadPayload.status || 'new',
      currency: 'EUR',
    })

    if (leadPayload.follow_up_date) {
      await createTask({
        client_id: clientId,
        lead_id: lead.id,
        title: `Follow up: ${leadPayload.destination || 'Lead'}`,
        due_date: leadPayload.follow_up_date,
        status: 'pending',
      }, userId, agencyId)
    } else {
      const dueDate = defaultLeadFollowUpDate()
      await createTask({
        client_id: clientId || null,
        lead_id: lead.id,
        title: `Follow up: ${leadPayload.destination || 'New lead'}`,
        due_date: dueDate,
        status: 'pending',
      }, userId, agencyId)
      await updateLead(lead.id, { follow_up_date: dueDate })
    }
  }

  return { client, lead, clientId }
}
