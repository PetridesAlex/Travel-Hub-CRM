import { writeAuditLog } from './auditLog.js'
import { upsertResendApiKey, getAgencyIntegrations } from './agencyIntegrations.js'

export const AGENCY_SELECT_FIELDS = `
  id, name, logo_url, api_key, owner_user_id,
  subscription_status, subscription_plan, monthly_price, trial_ends_at, suspended_at,
  is_protected, address, phone, email, website,
  invoice_footer, email_signature,
  slack_webhook_url, slack_channel_name, slack_notifications_enabled,
  resend_domain, resend_from_email, resend_reply_to,
  created_at, updated_at
`

const PROFILE_FIELDS = [
  'name', 'logo_url', 'address', 'phone', 'email', 'website',
  'invoice_footer', 'email_signature',
  'slack_webhook_url', 'slack_channel_name', 'slack_notifications_enabled',
  'resend_domain', 'resend_from_email', 'resend_reply_to',
]

const SUBSCRIPTION_FIELDS = [
  'subscription_status', 'subscription_plan', 'monthly_price', 'trial_ends_at',
]

function pickFields(body, allowed) {
  const out = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      out[key] = body[key]
    }
  }
  return out
}

export function sanitizeAgencyForClient(agency) {
  if (!agency) return agency
  return { ...agency, api_key: agency.api_key ? `${agency.api_key.slice(0, 8)}…` : null }
}

async function getOwnerEmail(admin, ownerUserId) {
  if (!ownerUserId) return null
  const { data, error } = await admin.auth.admin.getUserById(ownerUserId)
  if (error) return null
  return data?.user?.email || null
}

export async function listAgencies(admin, { search = '', status = '', page = 1, pageSize = 25 } = {}) {
  let query = admin.from('agencies').select(AGENCY_SELECT_FIELDS, { count: 'exact' })

  if (search?.trim()) {
    const term = search.trim()
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`)
  }

  if (status) {
    query = query.eq('subscription_status', status)
  }

  const from = (Math.max(1, page) - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to)
  if (error) throw error

  const rows = await Promise.all(
    (data || []).map(async (agency) => ({
      ...sanitizeAgencyForClient(agency),
      owner_email: await getOwnerEmail(admin, agency.owner_user_id),
    })),
  )

  return { agencies: rows, total: count || 0, page, pageSize }
}

export async function getAgencyById(admin, agencyId) {
  const { data, error } = await admin
    .from('agencies')
    .select(AGENCY_SELECT_FIELDS)
    .eq('id', agencyId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const owner_email = await getOwnerEmail(admin, data.owner_user_id)

  const { data: invitations } = await admin
    .from('agency_invitations')
    .select('id, email, role, status, expires_at, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(10)

  const integrations = await getAgencyIntegrations(admin, agencyId)

  return {
    ...data,
    owner_email,
    invitations: invitations || [],
    has_resend_api_key: Boolean(integrations?.resend_api_key_encrypted),
  }
}

export async function createAgency(admin, body, actorUserId) {
  const name = String(body.name || '').trim()
  if (!name) throw new Error('Agency name is required.')

  const insert = {
    name,
    owner_user_id: body.owner_user_id || null,
    subscription_status: body.subscription_status || 'trial',
    subscription_plan: body.subscription_plan || 'starter',
    ...pickFields(body, [...PROFILE_FIELDS, ...SUBSCRIPTION_FIELDS]),
  }

  const { data, error } = await admin.from('agencies').insert(insert).select(AGENCY_SELECT_FIELDS).single()
  if (error) throw error

  if (body.resend_api_key) {
    await upsertResendApiKey(admin, data.id, body.resend_api_key)
  }

  await writeAuditLog(admin, {
    actorUserId,
    action: 'agency.created',
    entityType: 'agency',
    entityId: data.id,
    metadata: { name: data.name },
  })

  return getAgencyById(admin, data.id)
}

export async function updateAgency(admin, agencyId, body, actorUserId) {
  const { data: existing, error: fetchError } = await admin
    .from('agencies')
    .select('id, is_protected, subscription_status')
    .eq('id', agencyId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!existing) throw new Error('Agency not found.')

  if (existing.is_protected && body.suspended_at) {
    throw new Error('This agency is protected and cannot be suspended.')
  }

  if (existing.is_protected && body.subscription_status === 'cancelled') {
    throw new Error('This agency is protected and cannot be cancelled.')
  }

  const updates = {
    ...pickFields(body, PROFILE_FIELDS),
    ...pickFields(body, SUBSCRIPTION_FIELDS),
  }

  if (Object.prototype.hasOwnProperty.call(body, 'owner_user_id')) {
    updates.owner_user_id = body.owner_user_id
  }

  if (Object.prototype.hasOwnProperty.call(body, 'suspended_at')) {
    updates.suspended_at = body.suspended_at
  }

  if (body.suspend === true && !existing.is_protected) {
    updates.subscription_status = 'cancelled'
    updates.suspended_at = new Date().toISOString()
  }

  if (body.reactivate === true) {
    updates.subscription_status = body.subscription_status || 'active'
    updates.suspended_at = null
  }

  if (!Object.keys(updates).length && !body.resend_api_key) {
    return getAgencyById(admin, agencyId)
  }

  if (Object.keys(updates).length) {
    const { error } = await admin.from('agencies').update(updates).eq('id', agencyId)
    if (error) throw error
  }

  if (Object.prototype.hasOwnProperty.call(body, 'resend_api_key')) {
    await upsertResendApiKey(admin, agencyId, body.resend_api_key || null)
  }

  await writeAuditLog(admin, {
    actorUserId,
    action: 'agency.updated',
    entityType: 'agency',
    entityId: agencyId,
    metadata: { fields: Object.keys(updates) },
  })

  return getAgencyById(admin, agencyId)
}

export async function inviteAgencyOwner(admin, { agencyId, email, actorUserId }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) throw new Error('Owner email is required.')

  const { data: agency, error: agencyError } = await admin
    .from('agencies')
    .select('id, name, owner_user_id')
    .eq('id', agencyId)
    .maybeSingle()
  if (agencyError) throw agencyError
  if (!agency) throw new Error('Agency not found.')
  if (agency.owner_user_id) throw new Error('Agency already has an owner.')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: { agency_name: agency.name },
    app_metadata: { invited_agency_id: agencyId, agency_role: 'owner' },
  })
  if (inviteError) throw inviteError

  const invitedUserId = inviteData?.user?.id || null

  if (invitedUserId) {
    await admin.from('agencies').update({ owner_user_id: invitedUserId }).eq('id', agencyId)
  }

  await admin.from('agency_invitations').insert({
    agency_id: agencyId,
    email: normalizedEmail,
    role: 'owner',
    status: 'pending',
    invited_by: actorUserId,
    expires_at: expiresAt.toISOString(),
  })

  await writeAuditLog(admin, {
    actorUserId,
    action: 'agency.owner_invited',
    entityType: 'agency',
    entityId: agencyId,
    metadata: { email: normalizedEmail },
  })

  return { success: true, email: normalizedEmail, user_id: invitedUserId }
}
