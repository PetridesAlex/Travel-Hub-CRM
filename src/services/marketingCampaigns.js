import { supabase } from '../lib/supabase'

export async function getMarketingCampaigns() {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createMarketingCampaign(campaign, userId) {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({ ...campaign, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMarketingCampaign(id, campaign) {
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .update(campaign)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMarketingCampaign(id) {
  const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id)
  if (error) throw error
}
