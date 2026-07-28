import { writeAuditLog } from './auditLog.js'
import { canManageAgency } from './resolveUserAgency.js'

const TEAM_ROLES = new Set(['admin', 'agent'])

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

async function addExistingUserToTeam(admin, {
  agencyId,
  existingUser,
  role,
  displayName,
  actorUserId,
  normalizedEmail,
}) {
  const { data: alreadyMember } = await admin
    .from('agency_members')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('user_id', existingUser.id)
    .maybeSingle()

  if (alreadyMember) throw new Error('This user is already on your team.')

  await ensureTeamMembership(admin, {
    agencyId,
    userId: existingUser.id,
    role,
    invitedBy: actorUserId,
  })

  await cleanupOrphanAgenciesForUser(admin, existingUser.id, agencyId)
  await applyDisplayName(admin, existingUser.id, displayName)

  await writeAuditLog(admin, {
    actorUserId,
    action: 'agency.member_added',
    entityType: 'agency',
    entityId: agencyId,
    metadata: { email: normalizedEmail, role, full_name: displayName },
  })

  return {
    success: true,
    email: normalizedEmail,
    user_id: existingUser.id,
    added_existing_user: true,
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

  const existingUser = await findAuthUserByEmail(admin, normalizedEmail)
  if (existingUser) {
    return addExistingUserToTeam(admin, {
      agencyId,
      existingUser,
      role: normalizedRole,
      displayName,
      actorUserId,
      normalizedEmail,
    })
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: agency } = await admin.from('agencies').select('name').eq('id', agencyId).maybeSingle()

  // Insert invitation first so the signup trigger can mark it accepted.
  const { error: inviteInsertError } = await admin.from('agency_invitations').insert({
    agency_id: agencyId,
    email: normalizedEmail,
    role: normalizedRole,
    status: 'pending',
    invited_by: actorUserId,
    expires_at: expiresAt.toISOString(),
  })
  if (inviteInsertError) throw inviteInsertError

  // inviteUserByEmail only persists `data` → user_metadata (not app_metadata).
  // Put agency targeting there so the DB trigger joins Honeywell instead of creating an orphan.
  const inviteMeta = {
    agency_name: agency?.name || 'Travel Agency',
    invited_agency_id: agencyId,
    agency_role: normalizedRole,
  }
  if (displayName) inviteMeta.full_name = displayName

  const redirectBase = process.env.APP_URL || process.env.VITE_APP_URL || process.env.SITE_URL || null
  const inviteOptions = { data: inviteMeta }
  if (redirectBase) {
    inviteOptions.redirectTo = `${String(redirectBase).replace(/\/$/, '')}/login`
  }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    inviteOptions,
  )

  if (inviteError) {
    const msg = authErrorMessage(inviteError)
    // Race: user appeared between listUsers and invite
    if (/already|registered|exists/i.test(msg)) {
      const raced = await findAuthUserByEmail(admin, normalizedEmail)
      if (raced) {
        return addExistingUserToTeam(admin, {
          agencyId,
          existingUser: raced,
          role: normalizedRole,
          displayName,
          actorUserId,
          normalizedEmail,
        })
      }
    }
    await admin
      .from('agency_invitations')
      .delete()
      .eq('agency_id', agencyId)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
    throw new Error(msg)
  }

  const invitedUserId = inviteData?.user?.id || null
  if (invitedUserId) {
    // Keep app_metadata in sync for helpers that read it later
    await admin.auth.admin.updateUserById(invitedUserId, {
      app_metadata: {
        invited_agency_id: agencyId,
        agency_role: normalizedRole,
      },
      ...(displayName ? { user_metadata: { ...inviteMeta, full_name: displayName } } : {}),
    })

    await ensureTeamMembership(admin, {
      agencyId,
      userId: invitedUserId,
      role: normalizedRole,
      invitedBy: actorUserId,
    })
    await cleanupOrphanAgenciesForUser(admin, invitedUserId, agencyId)
  }

  await writeAuditLog(admin, {
    actorUserId,
    action: 'agency.member_invited',
    entityType: 'agency',
    entityId: agencyId,
    metadata: { email: normalizedEmail, role: normalizedRole, full_name: displayName },
  })

  return { success: true, email: normalizedEmail, user_id: invitedUserId, added_existing_user: false }
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
