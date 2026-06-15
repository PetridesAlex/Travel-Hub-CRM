import { supabase } from '../lib/supabase'
import { resolveAgencyId } from './agencies'
import { CLIENT_EMBED } from './clients'

export async function getQuotations() {
  const { data, error } = await supabase
    .from('quotations')
    .select(`*, clients(${CLIENT_EMBED}), leads(destination)`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getQuotation(id) {
  const { data, error } = await supabase
    .from('quotations')
    .select(`*, clients(${CLIENT_EMBED}), leads(destination, travel_type)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createQuotation(quotation, userId, agencyId) {
  const resolvedAgencyId = await resolveAgencyId(userId, agencyId)
  const { data, error } = await supabase
    .from('quotations')
    .insert({ ...quotation, user_id: userId, agency_id: resolvedAgencyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateQuotation(id, quotation) {
  const { data, error } = await supabase
    .from('quotations')
    .update(quotation)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteQuotation(id) {
  const { error } = await supabase.from('quotations').delete().eq('id', id)
  if (error) throw error
}
