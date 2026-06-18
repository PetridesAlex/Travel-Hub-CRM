export const FORM_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export const FORM_CATEGORIES = [
  { value: 'feedback', label: 'Feedback' },
  { value: 'satisfaction', label: 'Satisfaction' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'cruise', label: 'Cruise' },
  { value: 'school', label: 'School Trip' },
  { value: 'lead_gen', label: 'Lead Generation' },
  { value: 'custom', label: 'Custom' },
]

export const SECURITY_MODES = [
  { value: 'link_only', label: 'Link only', description: 'Anyone with the link can respond' },
  { value: 'gate', label: 'Gated access', description: 'Require email, booking ref, or access code' },
  { value: 'link_single_use', label: 'Single use', description: 'Link expires after one submission' },
]

export const RECIPIENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'opened', label: 'Opened' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
]

export const QUESTION_TYPES = [
  { value: 'short_text', label: 'Short text', icon: 'Type' },
  { value: 'long_text', label: 'Long text', icon: 'AlignLeft' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'phone', label: 'Phone', icon: 'Phone' },
  { value: 'dropdown', label: 'Dropdown', icon: 'ChevronDown' },
  { value: 'radio', label: 'Single choice', icon: 'Circle' },
  { value: 'checkbox', label: 'Multiple choice', icon: 'CheckSquare' },
  { value: 'date', label: 'Date', icon: 'Calendar' },
  { value: 'rating', label: 'Rating', icon: 'Star' },
  { value: 'nps', label: 'NPS', icon: 'Gauge' },
  { value: 'yes_no', label: 'Yes / No', icon: 'ToggleLeft' },
  { value: 'file', label: 'File upload', icon: 'Paperclip' },
]

export function generateFormToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function publicFormUrl(token) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/f/${token}`
  }
  return `/f/${token}`
}
