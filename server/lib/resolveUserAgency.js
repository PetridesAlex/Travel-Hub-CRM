const ROLE_ORDER = { owner: 0, admin: 1, agent: 2 }

export function canManageAgency(role) {
  return role === 'owner' || role === 'admin'
}

export async function resolveUserAgency(supabase, userId) {
  const { data: memberships, error: memberError } = await supabase
    .from('agency_members')
    .select('role, agency:agencies(*)')
    .eq('user_id', userId)

  if (memberError && memberError.code !== '42P01') throw memberError

  if (memberships?.length) {
    const best = [...memberships].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))[0]
    if (best?.agency) {
      return { agency: best.agency, role: best.role }
    }
  }

  const { data: owned, error: ownerError } = await supabase
    .from('agencies')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (ownerError) throw ownerError
  if (owned) return { agency: owned, role: 'owner' }

  return null
}
