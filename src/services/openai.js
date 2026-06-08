import { getOpenAiApiKey } from '../lib/openaiConfig'

function extractResponseText(data) {
  const message = data?.output?.find((item) => item.type === 'message')
  const textPart = message?.content?.find((part) => part.type === 'output_text')
  return textPart?.text?.trim() || ''
}

function buildInput({ messages, images = [] }) {
  const instructions = messages.find((m) => m.role === 'system')?.content || ''
  const userText = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n')

  if (images.length > 0) {
    const content = [
      {
        type: 'input_text',
        text: userText || 'Analyse the attached travel images and extract every relevant detail for a professional travel program proposal.',
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

export async function createChatCompletion({ messages, model = 'gpt-4.1', temperature = 0.3, images = [] }) {
  const apiKey = getOpenAiApiKey()
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Add it in Settings → OpenAI Integration.')
  }

  const { instructions, input } = buildInput({ messages, images })

  const response = await fetch('https://api.openai.com/v1/responses', {
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

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message = body?.error?.message || `OpenAI request failed (${response.status})`
    throw new Error(message)
  }

  const data = await response.json()
  const content = extractResponseText(data)
  if (!content) {
    throw new Error('OpenAI returned an empty response. Please try again.')
  }

  return content
}
