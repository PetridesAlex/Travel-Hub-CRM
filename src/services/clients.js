import { supabase } from '../lib/supabase'
import { resolveAgencyId } from './agencies'

/** Safe client embed for joined queries — uses * so missing optional columns don't break */
export const CLIENT_EMBED = '*'

export async function getClientsByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]
  if (!uniqueIds.length) return []

  const { data, error } = await supabase.from('clients').select('*').in('id', uniqueIds)
  if (error) throw error
  return data || []
}

export async function getClients(search = '', clientType = '') {
  let query = supabase.from('clients').select('*').order('created_at', { ascending: false })

  if (clientType) {
    query = query.eq('client_type', clientType)
  }

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,passport_number.ilike.%${search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getClient(id) {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createClient(client, userId, agencyId) {
  const resolvedAgencyId = await resolveAgencyId(userId, agencyId)
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...client, user_id: userId, agency_id: resolvedAgencyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClient(id, client) {
  const { data, error } = await supabase
    .from('clients')
    .update(client)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}

export async function getClientRelatedData(clientId) {
  const [leads, quotations, bookings, tasks, voiceNotes] = await Promise.all([
    supabase.from('leads').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('quotations').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('bookings').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('voice_notes').select('*').eq('linked_client_id', clientId).order('created_at', { ascending: false }),
  ])

  return {
    leads: leads.data || [],
    quotations: quotations.data || [],
    bookings: bookings.data || [],
    tasks: tasks.data || [],
    voiceNotes: voiceNotes.data || [],
  }
}
