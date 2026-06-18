export function normalizeAiFormPayload(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid form data')

  const questions = (data.questions || []).map((q, index) => ({
    question_text: q.question_text || q.label || q.question || `Question ${index + 1}`,
    question_type: q.question_type || (q.options?.length ? 'radio' : 'short_text'),
    options: Array.isArray(q.options) ? q.options : [],
    required: q.required !== false,
    help_text: q.help_text || '',
    config: {
      ...(q.config || {}),
      ...(q.image_url ? { image_url: q.image_url } : {}),
    },
  }))

  return {
    title: data.title || 'Untitled survey',
    description: data.description || '',
    settings: data.settings || {},
    questions,
  }
}

export function parseAiFormJson(output) {
  const text = String(output || '').trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON.')
  const parsed = JSON.parse(jsonMatch[0])
  return normalizeAiFormPayload(parsed)
}
