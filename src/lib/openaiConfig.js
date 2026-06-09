/**
 * OpenAI is configured server-side only (OPENAI_API_KEY on Vercel).
 * Client code must never read or store API keys.
 */

export function getOpenAiApiKey() {
  return ''
}

export function setOpenAiApiKey() {
  // No-op: keys are not stored in the browser.
}

export function hasOpenAiApiKey() {
  return false
}
