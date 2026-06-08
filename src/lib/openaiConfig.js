const STORAGE_KEY = 'openai_api_key'

export function getOpenAiApiKey() {
  const fromStorage = localStorage.getItem(STORAGE_KEY)
  if (fromStorage?.trim()) return fromStorage.trim()
  return import.meta.env.VITE_OPENAI_API_KEY?.trim() || ''
}

export function setOpenAiApiKey(key) {
  if (key?.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim())
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function hasOpenAiApiKey() {
  return Boolean(getOpenAiApiKey())
}
