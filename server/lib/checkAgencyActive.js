/** Future Phase 8: subscription enforcement middleware helper */
export function isAgencySuspended(agency) {
  if (!agency) return false
  if (agency.is_protected) return false
  return Boolean(agency.suspended_at) || agency.subscription_status === 'cancelled'
}

export function agencyAccessError(agency) {
  if (!isAgencySuspended(agency)) return null
  return 'This agency account is suspended. Contact platform support.'
}
