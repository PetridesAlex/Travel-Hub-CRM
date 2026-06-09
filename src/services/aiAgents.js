import { supabase } from '../lib/supabase'

export async function getAgents({ activeOnly = false } = {}) {
  let query = supabase
    .from('ai_agents')
    .select('*')
    .order('name')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getAgent(id) {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function updateAgent(id, updates) {
  const { data, error } = await supabase
    .from('ai_agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleAgentActive(id, isActive) {
  return updateAgent(id, { is_active: isActive })
}
