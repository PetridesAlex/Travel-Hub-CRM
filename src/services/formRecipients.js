import { supabase } from '../lib/supabase'
import { resolveAgencyId } from './agencies'
import { generateFormToken } from '../constants/formFields'

export async function getRecipients(formId) {
  const { data, error } = await supabase
    .from('form_recipients')
    .select('*')
    .eq('form_id', formId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createRecipient(formId, agencyId, recipient) {
  const accessToken = recipient.access_token || generateFormToken()
  const { data, error } = await supabase
    .from('form_recipients')
    .insert({
      form_id: formId,
      agency_id: agencyId,
      email: recipient.email || null,
      name: recipient.name || null,
      client_id: recipient.client_id || null,
      booking_id: recipient.booking_id || null,
      access_token: accessToken,
      access_code_hash: recipient.access_code_hash || null,
      expires_at: recipient.expires_at || null,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createRecipientsBulk(formId, userId, agencyId, recipients) {
  const resolvedAgencyId = await resolveAgencyId(userId, agencyId)
  const rows = recipients.map((r) => ({
    form_id: formId,
    agency_id: resolvedAgencyId,
    email: r.email || null,
    name: r.name || null,
    client_id: r.client_id || null,
    booking_id: r.booking_id || null,
    access_token: generateFormToken(),
    status: 'pending',
  }))

  const { data, error } = await supabase.from('form_recipients').insert(rows).select()
  if (error) throw error
  return data || []
}

export async function ensureGenericRecipient(formId, agencyId) {
  const { data: existing } = await supabase
    .from('form_recipients')
    .select('*')
    .eq('form_id', formId)
    .is('email', null)
    .is('name', null)
    .limit(1)
    .maybeSingle()

  if (existing) return existing
  return createRecipient(formId, agencyId, { name: 'Public link' })
}

export async function markRecipientSent(id) {
  const { data, error } = await supabase
    .from('form_recipients')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecipient(id) {
  const { error } = await supabase.from('form_recipients').delete().eq('id', id)
  if (error) throw error
}

export async function parseCsvRecipients(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
  const emailIdx = header.findIndex((h) => h.includes('email'))
  const nameIdx = header.findIndex((h) => h.includes('name'))

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    return {
      email: emailIdx >= 0 ? cols[emailIdx] : cols[0],
      name: nameIdx >= 0 ? cols[nameIdx] : cols[1] || null,
    }
  }).filter((r) => r.email)
}
