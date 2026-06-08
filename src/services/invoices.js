import { supabase, getCurrentUserId } from '../lib/supabase'
import { getClientsByIds } from './clients'

const INVOICE_FIELDS = [
  'invoice_number',
  'client_id',
  'booking_id',
  'quotation_id',
  'issue_date',
  'due_date',
  'amount',
  'tax_amount',
  'currency',
  'status',
  'service_type',
  'description',
  'notes',
]

function pickInvoicePayload(invoice) {
  const payload = {}
  for (const key of INVOICE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(invoice, key)) {
      payload[key] = invoice[key]
    }
  }
  return payload
}

async function attachClients(invoices) {
  if (!invoices?.length) return []

  const clientIds = [...new Set(invoices.map((inv) => inv.client_id).filter(Boolean))]
  if (!clientIds.length) {
    return invoices.map((inv) => ({ ...inv, clients: null }))
  }

  const clients = await getClientsByIds(clientIds)
  const clientsById = Object.fromEntries(clients.map((client) => [client.id, client]))
  return invoices.map((inv) => ({
    ...inv,
    clients: inv.client_id ? clientsById[inv.client_id] || null : null,
  }))
}

export async function getInvoices(search = '', status = '', serviceType = '') {
  let query = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (serviceType) {
    query = query.eq('service_type', serviceType)
  }

  if (search) {
    query = query.or(
      `invoice_number.ilike.%${search}%,description.ilike.%${search}%,notes.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  return attachClients(data || [])
}

export async function getInvoice(id) {
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single()
  if (error) throw error
  const [enriched] = await attachClients([data])
  return enriched
}

export async function createInvoice(invoice, userId) {
  const uid = userId || (await getCurrentUserId())
  if (!uid) throw new Error('You must be signed in to save an invoice.')

  const payload = pickInvoicePayload(invoice)

  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...payload, user_id: uid })
    .select('*')
    .single()

  if (error) throw error

  const [enriched] = await attachClients([data])
  return enriched
}

export async function updateInvoice(id, invoice) {
  const payload = pickInvoicePayload(invoice)

  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  const [enriched] = await attachClients([data])
  return enriched
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
}
