import { writeAuditLog } from './auditLog.js'
import { canManageAgency } from './resolveUserAgency.js'

const TEAM_ROLES = new Set(['admin', 'agent'])

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

export async function inviteTeamMember(admin, { agencyId, email, role, actorUserId, actorRole }) {
  if (!canManageAgency(actorRole)) {
    throw new Error('Only agency owners and admins can invite team members.')
  }

  const normalizedRole = String(role || 'agent').toLowerCase()
  if (!TEAM_ROLES.has(normalizedRole)) {
    throw new Error('Role must be admin or agent.')
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) throw new Error('Email is required.')

  const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail)

  if (existingUser) {
    const { data: alreadyMember } = await admin
      .from('agency_members')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('user_id', existingUser.id)
      .maybeSingle()

    if (alreadyMember) throw new Error('This user is already on your team.')

    await admin.from('agency_members').insert({
      agency_id: agencyId,
      user_id: existingUser.id,
      role: normalizedRole,
      invited_by: actorUserId,
    })

    await writeAuditLog(admin, {
      actorUserId,
      action: 'agency.member_added',
      entityType: 'agency',
      entityId: agencyId,
      metadata: { email: normalizedEmail, role: normalizedRole },
    })

    return { success: true, email: normalizedEmail, user_id: existingUser.id, added_existing_user: true }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: agency } = await admin.from('agencies').select('name').eq('id', agencyId).maybeSingle()

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: { agency_name: agency?.name || 'Travel Agency' },
    app_metadata: { invited_agency_id: agencyId, agency_role: normalizedRole },
  })
  if (inviteError) throw inviteError

  const invitedUserId = inviteData?.user?.id || null
  if (invitedUserId) {
    await admin.from('agency_members').insert({
      agency_id: agencyId,
      user_id: invitedUserId,
      role: normalizedRole,
      invited_by: actorUserId,
    })
  }

  await admin.from('agency_invitations').insert({
    agency_id: agencyId,
    email: normalizedEmail,
    role: normalizedRole,
    status: 'pending',
    invited_by: actorUserId,
    expires_at: expiresAt.toISOString(),
  })

  await writeAuditLog(admin, {
    actorUserId,
    action: 'agency.member_invited',
    entityType: 'agency',
    entityId: agencyId,
    metadata: { email: normalizedEmail, role: normalizedRole },
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
