/** Bundled logos for known agencies (overridden when agencies.logo_url is set). */
const BUNDLED_LOGOS = [
  { match: /honeywell/i, url: '/logos/honeywell-travel.png' },
]

export function resolveAgencyLogoUrl(agency) {
  if (agency?.logo_url) return agency.logo_url
  const name = agency?.name || ''
  for (const { match, url } of BUNDLED_LOGOS) {
    if (match.test(name)) return url
  }
  return null
}
