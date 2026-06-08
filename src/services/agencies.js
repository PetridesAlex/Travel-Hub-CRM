import { supabase } from '../lib/supabase'

const LOCAL_AGENCY_KEY = (userId) => `agency_profile_${userId}`

function loadLocalAgency(userId, defaultName = 'My Travel Agency') {
  const raw = localStorage.getItem(LOCAL_AGENCY_KEY(userId))
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      localStorage.removeItem(LOCAL_AGENCY_KEY(userId))
    }
  }

  const agency = {
    id: 'local',
    name: defaultName,
    api_key: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16),
    subscription_status: 'trial',
    subscription_plan: 'starter',
  }
  localStorage.setItem(LOCAL_AGENCY_KEY(userId), JSON.stringify(agency))
  return agency
}

function saveLocalAgency(userId, agency) {
  localStorage.setItem(LOCAL_AGENCY_KEY(userId), JSON.stringify(agency))
  return agency
}

export async function getOrCreateAgency(userId, defaultName = 'My Travel Agency') {
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (data) return data

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return loadLocalAgency(userId, defaultName)
    }
    throw error
  }

  const { data: created, error: createError } = await supabase
    .from('agencies')
    .insert({ owner_user_id: userId, name: defaultName })
    .select()
    .single()

  if (createError) {
    if (createError.code === '42P01' || createError.message?.includes('does not exist')) {
      return loadLocalAgency(userId, defaultName)
    }
    throw createError
  }

  return created
}

export async function updateAgency(userId, agencyId, updates) {
  if (agencyId === 'local') {
    const current = loadLocalAgency(userId)
    return saveLocalAgency(userId, { ...current, ...updates })
  }

  const { data, error } = await supabase
    .from('agencies')
    .update(updates)
    .eq('id', agencyId)
    .eq('owner_user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
