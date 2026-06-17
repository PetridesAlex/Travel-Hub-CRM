export const OUTLOOK_PROVIDERS = {
  m365: {
    label: 'Microsoft 365 (work / school)',
    inboxUrl: 'https://outlook.office.com/mail/',
    composeUrl: 'https://outlook.office.com/mail/deeplink/compose',
  },
  personal: {
    label: 'Outlook.com (personal)',
    inboxUrl: 'https://outlook.live.com/mail/',
    composeUrl: 'https://outlook.live.com/mail/deeplink/compose',
  },
}

const STORAGE_PROVIDER = 'outlook_provider'
const STORAGE_EMAIL = 'outlook_email'

export function getOutlookPrefs() {
  const provider = localStorage.getItem(STORAGE_PROVIDER) || 'm365'
  return {
    provider: OUTLOOK_PROVIDERS[provider] ? provider : 'm365',
    email: localStorage.getItem(STORAGE_EMAIL) || '',
  }
}

export function saveOutlookPrefs({ provider, email }) {
  if (provider && OUTLOOK_PROVIDERS[provider]) {
    localStorage.setItem(STORAGE_PROVIDER, provider)
  }
  if (email !== undefined) {
    localStorage.setItem(STORAGE_EMAIL, email.trim())
  }
}

export function buildOutlookComposeUrl({ to, subject, body, provider = getOutlookPrefs().provider } = {}) {
  const config = OUTLOOK_PROVIDERS[provider] || OUTLOOK_PROVIDERS.m365
  const params = new URLSearchParams()
  if (to?.trim()) params.set('to', to.trim())
  if (subject?.trim()) params.set('subject', subject.trim())
  if (body?.trim()) params.set('body', body.trim())
  const query = params.toString()
  return query ? `${config.composeUrl}?${query}` : config.composeUrl
}

export function openOutlookInbox(provider = getOutlookPrefs().provider) {
  const config = OUTLOOK_PROVIDERS[provider] || OUTLOOK_PROVIDERS.m365
  window.open(config.inboxUrl, '_blank', 'noopener,noreferrer')
}

export function openOutlookCompose(options = {}) {
  window.open(buildOutlookComposeUrl(options), '_blank', 'noopener,noreferrer')
}
