import { supabase } from '../lib/supabase'
import { CLIENT_EMBED } from './clients'

export async function getGenerations({ agentId = '', category = '', clientId = '', limit = 50 } = {}) {
  let query = supabase
    .from('ai_generations')
    .select(`
      *,
      ai_agents(id, name, category),
      ai_templates(id, name, category),
      clients(${CLIENT_EMBED}),
      leads(destination)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agentId) query = query.eq('agent_id', agentId)
  if (clientId) query = query.eq('client_id', clientId)
  if (category) query = query.eq('generation_type', category)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getGeneration(id) {
  const { data, error } = await supabase
    .from('ai_generations')
    .select(`
      *,
      ai_agents(id, name, category),
      ai_templates(id, name, category),
      clients(${CLIENT_EMBED}),
      leads(destination)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createGeneration(record, userId, agencyId) {
  const { data, error } = await supabase
    .from('ai_generations')
    .insert({
      ...record,
      user_id: userId,
      agency_id: agencyId,
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function updateGeneration(id, updates) {
  const { data, error } = await supabase
    .from('ai_generations')
    .update(updates)
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function deleteGeneration(id) {
  const { error } = await supabase.from('ai_generations').delete().eq('id', id)
  if (error) throw error
}
