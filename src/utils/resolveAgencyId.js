/** Returns a valid Supabase agency UUID from agency context, or null if unavailable. */
export function resolveAgencyId(agency) {
  const id = agency?.id
  if (!id || id === 'local') return null
  return id
}
