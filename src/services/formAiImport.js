import { parseFormFromText, parseAiFormJson, normalizeAiFormPayload } from '../utils/parseFormFromText'

export async function importFormFromText(text, session, { useAi = true } = {}) {
  const trimmed = String(text || '').trim()
  if (!trimmed) throw new Error('Paste your survey questions first.')

  if (!useAi || !session?.access_token) {
    return normalizeAiFormPayload(parseFormFromText(trimmed))
  }

  try {
    const res = await fetch('/api/ai/assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ task: 'form_import', text: trimmed }),
    })

    const raw = await res.text()
    let data = {}
    try { data = raw ? JSON.parse(raw) : {} } catch { data = {} }

    if (!res.ok) throw new Error(data.error || raw?.slice(0, 200))

    if (data.form) return normalizeAiFormPayload(data.form)
    return parseAiFormJson(data.output)
  } catch (err) {
    if (err.message?.includes('OPENAI') || err.message?.includes('502')) {
      return normalizeAiFormPayload(parseFormFromText(trimmed))
    }
    throw err
  }
}

export function applyImportedForm({ title, description, settings, questions }, { setMeta, setQuestions }) {
  setMeta((prev) => ({
    ...prev,
    title,
    description: description || prev.description,
    settings: { ...prev.settings, ...settings },
  }))

  const imported = questions.map((q, index) => ({
    id: `temp-${crypto.randomUUID()}`,
    section_id: null,
    question_type: q.question_type,
    question_text: q.question_text,
    help_text: q.help_text || '',
    options: q.options || [],
    config: q.config || {},
    required: q.required !== false,
    sort_order: index,
  }))

  setQuestions(imported)
  return imported.length
}
