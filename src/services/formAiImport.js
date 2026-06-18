import { parseFormFromText, normalizeAiFormPayload } from '../utils/parseFormFromText'
import { importFormFromAi, isAiAvailable } from './aiAssist'

export async function importFormFromText(text, session, { useAi = true } = {}) {
  const trimmed = String(text || '').trim()
  if (!trimmed) throw new Error('Paste your survey text in the box above first.')

  if (!useAi) {
    return normalizeAiFormPayload(parseFormFromText(trimmed))
  }

  if (!isAiAvailable(session)) {
    throw new Error('You must be signed in to use AI generation.')
  }

  try {
    const form = await importFormFromAi(trimmed, session)
    if (!form?.questions?.length) {
      throw new Error('AI returned an empty form. Try Quick parse or refine your outline.')
    }
    return normalizeAiFormPayload(form)
  } catch (err) {
    const msg = err.message || ''
    const canFallback =
      msg.includes('502') ||
      msg.includes('OPENAI') ||
      msg.includes('unavailable') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError')

    if (canFallback) {
      const local = normalizeAiFormPayload(parseFormFromText(trimmed))
      if (local.questions?.length) {
        local._fallbackNote =
          'AI server was unavailable — used quick parse instead. For best results, run "npm run dev:api" locally or check Vercel env vars.'
      }
      return local
    }
    throw err
  }
}

export function applyImportedForm({ title, description, settings, questions, _fallbackNote }, { setMeta, setQuestions }) {
  if (!questions?.length) {
    throw new Error('No questions were found. Check your outline has questions ending with "?" and bullet options.')
  }

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
  return { count: imported.length, fallbackNote: _fallbackNote || null }
}
