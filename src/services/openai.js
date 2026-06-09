/**
 * @deprecated Direct browser OpenAI calls are disabled.
 * Use aiAssist.js — all AI runs server-side via OPENAI_API_KEY on Vercel.
 */
import { chatCompletion, isAiAvailable } from './aiAssist'

export async function createChatCompletion({ messages, temperature = 0.3, images = [] }, session) {
  if (!isAiAvailable(session)) {
    throw new Error('Sign in to use AI features. API keys are configured server-side only.')
  }

  const instructions = messages.find((m) => m.role === 'system')?.content
  const chatMessages = messages.filter((m) => m.role !== 'system')

  return chatCompletion({
    messages: chatMessages,
    instructions,
    temperature,
    images,
  }, session)
}
