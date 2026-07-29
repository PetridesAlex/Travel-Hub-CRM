import { writeAuditLog } from './auditLog.js'
import { canManageAgency } from './resolveUserAgency.js'
import { sendResendEmailWithFallback } from './resendService.js'
import {
  buildAcceptInviteUrl,
  buildTeamInviteEmailHtml,
  buildTeamInviteEmailText,
  buildTeamInviteSubject,
  getAppBaseUrl,
  resolveInviteLogoAbsoluteUrl,
} from './teamInviteEmail.js'

const TEAM_ROLES = new Set(['admin', 'agent'])
const AGENCY_INVITE_FIELDS = 'id, name, logo_url, email, resend_from_email, resend_reply_to, resend_domain'

function authErrorMessage(err) {
  if (!err) return 'Unknown auth error'
  return err.message || err.msg || err.error_description || String(err)
}

async function agencyHasCrmData(admin, agencyId) {
  const [{ count: clients }, { count: leads }] = await Promise.all([
    admin.from('clients').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
    admin.from('leads').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
  ])
  return (clients || 0) > 0 || (leads || 0) > 0
}

/**
 * Remove empty personal agencies so invited users land on the shared agency.
 * Covers "My Travel Agency" and clones named after the real agency when invite metadata was missing.
 */
export async function cleanupOrphanAgenciesForUser(admin, userId, keepAgencyId) {
  const { data: owned } = await admin
    .from('agencies')
    .select('id, name, is_protected, owner_user_id')
    .eq('owner_user_id', userId)

  for (const agency of owned || []) {
    if (agency.id === keepAgencyId) continue
    if (agency.is_protected) continue
    if (await agencyHasCrmData(admin, agency.id)) continue

    await admin.from('agency_members').delete().eq('agency_id', agency.id)
    const { error } = await admin.from('agencies').delete().eq('id', agency.id)
    if (error) throw error
  }
}

async function applyDisplayName(admin, userId, fullName) {
  const name = String(fullName || '').trim()
  if (!name || !userId) return
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { full_name: name },
  })
  if (error) throw error
}

async function findAuthUserByEmail(admin, email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const users = data?.users || []
    const found = users.find((u) => u.email?.toLowerCase() === normalized)
    if (found) return found
    if (users.length < 200) break
  }
  return null
}

async function ensureTeamMembership(admin, { agencyId, userId, role, invitedBy }) {
  const { error } = await admin.from('agency_members').upsert(
    {
      agency_id: agencyId,
      user_id: userId,
      role,
      invited_by: invitedBy,
    },
    { onConflict: 'agency_id,user_id' },
  )
  if (error) throw error
}

async function upsertPendingInvitation(admin, {
  agencyId,
  email,
  role,
  actorUserId,
  expiresAt,
}) {
  const { data: existingRows } = await admin
    .from('agency_invitations')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('email', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)

  const existing = existingRows?.[0]

  if (existing?.id) {
    const { error } = await admin
      .from('agency_invitations')
      .update({
        role,
        invited_by: actorUserId,
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw error
    return
  }

  const { error } = await admin.from('agency_invitations').insert({
    agency_id: agencyId,
    email,
    role,
    status: 'pending',
    invited_by: actorUserId,
    expires_at: expiresAt.toISOString(),
  })
  if (error) throw error
}

async function generateInviteAcceptUrl(admin, {
  email,
  linkType,
  inviteMeta,
  redirectTo,
}) {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: linkType,
    email,
    options: {
      ...(linkType === 'invite' ? { data: inviteMeta } : {}),
      redirectTo,
    },
  })
  if (linkError) throw linkError

  const inviteUrl = buildAcceptInviteUrl(linkData)
  if (!inviteUrl) throw new Error('Invite link could not be generated.')
  return { linkData, inviteUrl, invitedUserId: linkData?.user?.id || null }
}

async function addExistingUserToTeam(admin, {
  agencyId,
  existingUser,
  role,
  displayName,
  actorUserId,
  normalizedEmail,
  agency,
  inviterEmail,
}) {
  const { data: alreadyMember } = await admin
    .from('agency_members')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('user_id', existingUser.id)
    .maybeSingle()

  await ensureTeamMembership(admin, {
    agencyId,
    userId: existingUser.id,
    role,
    invitedBy: actorUserId,
  })

  await cleanupOrphanAgenciesForUser(admin, existingUser.id, agencyId)
  await applyDisplayName(admin, existingUser.id, displayName)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  await upsertPendingInvitation(admin, {
    agencyId,
    email: normalizedEmail,
    role,
    actorUserId,
    expiresAt,
  })

  const inviteMeta = {
    agency_name: agency.name || 'Travel Agency',
    invited_agency_id: agencyId,
    agency_role: role,
  }
  if (displayName) inviteMeta.full_name = displayName

  await admin.auth.admin.updateUserById(existingUser.id, {
    app_metadata: {
      invited_agency_id: agencyId,
      agency_role: role,
    },
    user_metadata: displayName ? { ...inviteMeta, full_name: displayName } : inviteMeta,
  })

  const appUrl = getAppBaseUrl()
  const redirectTo = `${appUrl}/accept-invite`
  const { inviteUrl } = await generateInviteAcceptUrl(admin, {
    email: normalizedEmail,
    linkType: 'recovery',
    inviteMeta,
    redirectTo,
  })

  const sent = await sendBrandedInviteEmail(admin, {
    agency,
    to: normalizedEmail,
    inviteUrl,
    displayName,
    role,
    inviterEmail,
  })

  if (!sent.ok) {
    throw new Error(
      sent.error ||
        'Failed to send the invite email. Configure Resend under Settings → Integrations (API key + from address), or set RESEND_API_KEY and RESEND_FROM_EMAIL on Vercel.',
    )
  }

  await writeAuditLog(admin, {
    actorUserId,
    action: alreadyMember ? 'agency.member_invite_resent' : 'agency.member_added',
    entityType: 'agency',
    entityId: agencyId,
    metadata: {
      email: normalizedEmail,
      role,
      full_name: displayName,
      email_style: 'branded',
      email_via: sent.via || 'unknown',
      already_member: Boolean(alreadyMember),
    },
  })

  return {
    success: true,
    email: normalizedEmail,
    user_id: existingUser.id,
    added_existing_user: true,
    invite_resent: true,
    branded_email: true,
  }
}

export async function listTeamMembers(admin, agencyId) {
  const { data: members, error } = await admin
    .from('agency_members')
    .select('id, user_id, role, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = await Promise.all(
    (members || []).map(async (member) => {
      const { data } = await admin.auth.admin.getUserById(member.user_id)
      return {
        ...member,
        email: data?.user?.email || null,
        full_name: data?.user?.user_metadata?.full_name || null,
      }
    }),
  )

  const { data: invitations } = await admin
    .from('agency_invitations')
    .select('id, email, role, status, expires_at, created_at')
    .eq('agency_id', agencyId)
    .eq('status', 'pending')
    .in('role', ['admin', 'agent'])
    .order('created_at', { ascending: false })

  return { members: rows, invitations: invitations || [] }
}

async function finalizeInvitedUser(admin, {
  agencyId,
  invitedUserId,
  role,
  invitedBy,
  inviteMeta,
  displayName,
}) {
  if (!invitedUserId) return

  await admin.auth.admin.updateUserById(invitedUserId, {
    app_metadata: {
      invited_agency_id: agencyId,
      agency_role: role,
    },
    user_metadata: displayName ? { ...inviteMeta, full_name: displayName } : inviteMeta,
  })

  await ensureTeamMembership(admin, {
    agencyId,
    userId: invitedUserId,
    role,
    invitedBy,
  })
  await cleanupOrphanAgenciesForUser(admin, invitedUserId, agencyId)
}

async function sendBrandedInviteEmail(admin, {
  agency,
  to,
  inviteUrl,
  displayName,
  role,
  inviterEmail,
}) {
  const appUrl = getAppBaseUrl()
  const logoUrl = resolveInviteLogoAbsoluteUrl(agency, appUrl)
  const html = buildTeamInviteEmailHtml({
    agencyName: agency.name,
    logoUrl,
    inviteUrl,
    displayName,
    role,
    inviterEmail,
  })
  const text = buildTeamInviteEmailText({
    agencyName: agency.name,
    inviteUrl,
    displayName,
    role,
    inviterEmail,
  })

  return sendResendEmailWithFallback(admin, agency, {
    to,
    subject: buildTeamInviteSubject(agency.name),
    html,
    text,
  })
}

export async function inviteTeamMember(admin, { agencyId, email, role, fullName, actorUserId, actorRole }) {
  if (!canManageAgency(actorRole)) {
    throw new Error('Only agency owners and admins can invite team members.')
  }

  const normalizedRole = String(role || 'agent').toLowerCase()
  if (!TEAM_ROLES.has(normalizedRole)) {
    throw new Error('Role must be admin or agent.')
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) throw new Error('Email is required.')

  const displayName = String(fullName || '').trim() || null

  const { data: agency, error: agencyError } = await admin
    .from('agencies')
    .select(AGENCY_INVITE_FIELDS)
    .eq('id', agencyId)
    .maybeSingle()
  if (agencyError) throw agencyError
  if (!agency) throw new Error('Agency not found.')

  const { data: actorUserData } = await admin.auth.admin.getUserById(actorUserId)
  const inviterEmail = actorUserData?.user?.email || null

  const existingUser = await findAuthUserByEmail(admin, normalizedEmail)
  if (existingUser) {
    return addExistingUserToTeam(admin, {
      agencyId,
      existingUser,
      role: normalizedRole,
      displayName,
      actorUserId,
      normalizedEmail,
      agency,
      inviterEmail,
    })
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Insert invitation first so the signup trigger can mark it accepted.
  await upsertPendingInvitation(admin, {
    agencyId,
    email: normalizedEmail,
    role: normalizedRole,
    actorUserId,
    expiresAt,
  })

  // inviteUserByEmail / generateLink only persist `data` → user_metadata.
  const inviteMeta = {
    agency_name: agency.name || 'Travel Agency',
    invited_agency_id: agencyId,
    agency_role: normalizedRole,
  }
  if (displayName) inviteMeta.full_name = displayName

  const appUrl = getAppBaseUrl()
  const redirectTo = `${appUrl}/accept-invite`

  const clearPendingInvite = async () => {
    await admin
      .from('agency_invitations')
      .delete()
      .eq('agency_id', agencyId)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
  }

  const handleAlreadyRegistered = async (msg) => {
    if (!/already|registered|exists/i.test(msg)) return null
    const raced = await findAuthUserByEmail(admin, normalizedEmail)
    if (!raced) return null
    return addExistingUserToTeam(admin, {
      agencyId,
      existingUser: raced,
      role: normalizedRole,
      displayName,
      actorUserId,
      normalizedEmail,
      agency,
      inviterEmail,
    })
  }

  // Always generate a link and send a branded Honeywell email (agency or platform Resend).
  // Do not use Supabase's default invite mail — it has no logo and no password setup page.
  let inviteUrl
  let invitedUserId
  try {
    const generated = await generateInviteAcceptUrl(admin, {
      email: normalizedEmail,
      linkType: 'invite',
      inviteMeta,
      redirectTo,
    })
    inviteUrl = generated.inviteUrl
    invitedUserId = generated.invitedUserId
  } catch (linkError) {
    const msg = authErrorMessage(linkError)
    const existingPath = await handleAlreadyRegistered(msg)
    if (existingPath) return existingPath
    await clearPendingInvite()
    throw new Error(msg)
  }

  await finalizeInvitedUser(admin, {
    agencyId,
    invitedUserId,
    role: normalizedRole,
    invitedBy: actorUserId,
    inviteMeta,
    displayName,
  })

  const sent = await sendBrandedInviteEmail(admin, {
    agency,
    to: normalizedEmail,
    inviteUrl,
    displayName,
    role: normalizedRole,
    inviterEmail,
  })

  if (!sent.ok) {
    throw new Error(
      sent.error ||
        'Failed to send the invite email. Configure Resend under Settings → Integrations (API key + from address), or set RESEND_API_KEY and RESEND_FROM_EMAIL on Vercel.',
    )
  }

  await writeAuditLog(admin, {
    actorUserId,
    action: 'agency.member_invited',
    entityType: 'agency',
    entityId: agencyId,
    metadata: {
      email: normalizedEmail,
      role: normalizedRole,
      full_name: displayName,
      email_style: 'branded',
      email_via: sent.via || 'unknown',
    },
  })

  return {
    success: true,
    email: normalizedEmail,
    user_id: invitedUserId,
    added_existing_user: false,
    branded_email: true,
  }
}

export async function removeTeamMember(admin, { agencyId, memberId, actorUserId, actorRole }) {
  if (!canManageAgency(actorRole)) {
    throw new Error('Only agency owners and admins can remove team members.')
  }

  const { data: member, error } = await admin
    .from('agency_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (error) throw error
  if (!member) throw new Error('Team member not found.')
  if (member.role === 'owner') throw new Error('Cannot remove the agency owner.')

  const { error: deleteError } = await admin.from('agency_members').delete().eq('id', memberId)
  if (deleteError) throw deleteError

  await writeAuditLog(admin, {
    actorUserId,
    action: 'agency.member_removed',
    entityType: 'agency',
    entityId: agencyId,
    metadata: { user_id: member.user_id, role: member.role },
  })

  return { success: true }
}
