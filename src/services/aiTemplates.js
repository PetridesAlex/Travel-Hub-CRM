import { supabase } from '../lib/supabase'

export async function getTemplates({ category = '', search = '', activeOnly = false } = {}) {
  let query = supabase
    .from('ai_templates')
    .select('*, ai_agents(id, name, slug, category)')
    .order('name')

  if (category) query = query.eq('category', category)
  if (activeOnly) query = query.eq('is_active', true)
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getTemplate(id) {
  const { data, error } = await supabase
    .from('ai_templates')
    .select('*, ai_agents(id, name, slug, category)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createTemplate(template, userId, agencyId) {
  const { data, error } = await supabase
    .from('ai_templates')
    .insert({
      ...template,
      user_id: userId,
      agency_id: agencyId,
      agent_id: template.agent_id || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTemplate(id, updates) {
  const { data, error } = await supabase
    .from('ai_templates')
    .update({
      ...updates,
      agent_id: updates.agent_id || null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from('ai_templates').delete().eq('id', id)
  if (error) throw error
}
