const ROLE_ORDER = { owner: 0, admin: 1, agent: 2 }

const DEFAULT_ORPHAN_NAMES = new Set(['my travel agency', 'my agency'])

export function isDefaultOrphanAgencyName(name) {
  return DEFAULT_ORPHAN_NAMES.has(String(name || '').trim().toLowerCase())
}

/**
 * Prefer real/shared agencies over empty personal "My Travel Agency" orphans.
 * Then prefer higher role (owner > admin > agent).
 */
export function pickBestMembership(memberships = []) {
  const valid = (memberships || []).filter((m) => m?.agency)
  if (!valid.length) return null

  const scored = valid.map((membership) => {
    const agency = membership.agency
    let score = 0
    if (agency.is_protected) score += 1000
    if (!isDefaultOrphanAgencyName(agency.name)) score += 500
    score -= ROLE_ORDER[membership.role] ?? 9
    return { membership, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].membership
}

export { ROLE_ORDER }
