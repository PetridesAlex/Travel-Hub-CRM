import { supabase } from '../lib/supabase'
import { pickBestMembership } from '../../shared/agencyMembership.js'

const LOCAL_AGENCY_KEY = (userId) => `agency_profile_${userId}`

export const OWNER_AGENCY_FIELDS = [
  'name', 'logo_url', 'address', 'phone', 'email', 'website',
  'invoice_footer', 'email_signature',
  'slack_webhook_url', 'slack_channel_name', 'slack_notifications_enabled',
  'resend_domain', 'resend_from_email', 'resend_reply_to',
]

export function canManageAgencySettings(memberRole) {
  return memberRole === 'owner' || memberRole === 'admin'
}

export function pickOwnerAgencyUpdates(updates) {
  const payload = {}
  for (const key of OWNER_AGENCY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      payload[key] = updates[key]
    }
  }
  return payload
}

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
    member_role: 'owner',
  }
  localStorage.setItem(LOCAL_AGENCY_KEY(userId), JSON.stringify(agency))
  return agency
}

function saveLocalAgency(userId, agency) {
  localStorage.setItem(LOCAL_AGENCY_KEY(userId), JSON.stringify(agency))
  return agency
}

export async function getUserAgency(userId) {
  const { data: memberships, error } = await supabase
    .from('agency_members')
    .select('role, agency:agencies(*)')
    .eq('user_id', userId)

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return null
    }
    throw error
  }

  if (memberships?.length) {
    const best = pickBestMembership(memberships)
    if (best?.agency) {
      return { ...best.agency, member_role: best.role }
    }
  }

  const { data: owned, error: ownerError } = await supabase
    .from('agencies')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (ownerError) {
    if (ownerError.code === '42P01' || ownerError.message?.includes('does not exist')) {
      return null
    }
    throw ownerError
  }

  if (owned) return { ...owned, member_role: 'owner' }
  return null
}

export async function getOrCreateAgency(userId, defaultName = 'My Travel Agency') {
  const existing = await getUserAgency(userId)
  if (existing) return existing

  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (data) return { ...data, member_role: 'owner' }

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

  return { ...created, member_role: 'owner' }
}

export async function resolveAgencyId(userId, agencyId) {
  if (agencyId && agencyId !== 'local') return agencyId
  if (!userId) return null
  const agency = await getUserAgency(userId) || await getOrCreateAgency(userId)
  if (!agency?.id || agency.id === 'local') return null
  return agency.id
}

export async function updateAgency(userId, agencyId, updates, memberRole = 'owner') {
  if (!canManageAgencySettings(memberRole)) {
    throw new Error('Only agency owners and admins can change settings.')
  }

  const payload = pickOwnerAgencyUpdates(updates)
  if (!Object.keys(payload).length) {
    if (agencyId === 'local') return loadLocalAgency(userId)
    const { data } = await supabase.from('agencies').select('*').eq('id', agencyId).maybeSingle()
    return data ? { ...data, member_role: memberRole } : data
  }

  if (agencyId === 'local') {
    const current = loadLocalAgency(userId)
    return saveLocalAgency(userId, { ...current, ...payload })
  }

  const { data, error } = await supabase
    .from('agencies')
    .update(payload)
    .eq('id', agencyId)
    .select()
    .single()

  if (error) throw error
  return { ...data, member_role: memberRole }
}
