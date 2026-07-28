import { pickBestMembership } from '../../shared/agencyMembership.js'

export function canManageAgency(role) {
  return role === 'owner' || role === 'admin'
}

/**
 * Resolve the caller's agency via agency_members (admin client).
 * Prefers shared/protected agencies over empty personal orphans.
 */
export async function resolveUserAgency(admin, userId) {
  const { data: memberships, error: memberError } = await admin
    .from('agency_members')
    .select('role, agency:agencies(*)')
    .eq('user_id', userId)

  if (memberError && memberError.code !== '42P01') throw memberError

  if (memberships?.length) {
    const best = pickBestMembership(memberships)
    if (best?.agency) {
      return { agency: best.agency, role: best.role, agencyId: best.agency.id }
    }
  }

  const { data: owned, error: ownerError } = await admin
    .from('agencies')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (ownerError) throw ownerError
  if (owned) return { agency: owned, role: 'owner', agencyId: owned.id }

  return null
}
