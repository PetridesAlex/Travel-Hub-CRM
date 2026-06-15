import { supabase } from '../lib/supabase'
import { resolveAgencyId } from './agencies'
import { CLIENT_EMBED } from './clients'

export async function getLeads(filters = {}) {
  let query = supabase
    .from('leads')
    .select(`*, clients(${CLIENT_EMBED})`)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.travel_type) query = query.eq('travel_type', filters.travel_type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getLead(id) {
  const { data, error } = await supabase
    .from('leads')
    .select(`*, clients(${CLIENT_EMBED})`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createLead(lead, userId, agencyId) {
  const resolvedAgencyId = await resolveAgencyId(userId, agencyId)
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...lead, user_id: userId, agency_id: resolvedAgencyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLead(id, lead) {
  const { data, error } = await supabase
    .from('leads')
    .update(lead)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}
