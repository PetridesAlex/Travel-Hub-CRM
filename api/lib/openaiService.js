const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

export const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.5'

export function getOpenAiApiKey() {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured on the server.')
  }
  return key
}

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function extractOpenAiText(data) {
  const message = data?.output?.find((item) => item.type === 'message')
  const textPart = message?.content?.find((part) => part.type === 'output_text')
  return textPart?.text?.trim() || ''
}

export function buildChatInput({ messages = [], images = [] }) {
  const instructions = messages.find((m) => m.role === 'system')?.content || ''
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n\n')

  if (images.length > 0) {
    const content = [
      {
        type: 'input_text',
        text: userText || 'Analyse the attached images and respond using every relevant detail.',
      },
      ...images.map((url) => ({ type: 'input_image', image_url: url })),
    ]
    return {
      instructions: instructions || undefined,
      input: [{ role: 'user', content }],
    }
  }

  return {
    instructions: instructions || undefined,
    input: userText,
  }
}

/**
 * Call OpenAI Responses API (server-side only).
 */
export async function createOpenAiResponse({
  instructions,
  input,
  temperature = 0.3,
  model = DEFAULT_OPENAI_MODEL,
}) {
  const apiKey = getOpenAiApiKey()

  let response
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        ...(instructions ? { instructions } : {}),
        input,
        temperature,
      }),
    })
  } catch (err) {
    throw new Error(`OpenAI request failed: ${err.message}`)
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    throw new Error(errBody?.error?.message || `OpenAI request failed (${response.status})`)
  }

  const data = await response.json()
  const text = extractOpenAiText(data)
  if (!text) {
    throw new Error('OpenAI returned an empty response.')
  }

  return { text, raw: data }
}

export async function createChatCompletion({
  messages = [],
  images = [],
  temperature = 0.3,
  model = DEFAULT_OPENAI_MODEL,
}) {
  const { instructions, input } = buildChatInput({ messages, images })
  const { text } = await createOpenAiResponse({ instructions, input, temperature, model })
  return text
}
