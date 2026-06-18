import { supabase } from '../lib/supabase'

export async function getFormResponses(formId, { search = '', fromDate = '', toDate = '' } = {}) {
  let query = supabase
    .from('form_responses')
    .select('*, form_recipients(name, email, client_id)')
    .eq('form_id', formId)
    .order('submitted_at', { ascending: false })

  if (fromDate) query = query.gte('submitted_at', fromDate)
  if (toDate) query = query.lte('submitted_at', `${toDate}T23:59:59`)

  const { data, error } = await query
  if (error) throw error

  let rows = data || []
  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter(
      (r) =>
        r.respondent_name?.toLowerCase().includes(q) ||
        r.respondent_email?.toLowerCase().includes(q),
    )
  }
  return rows
}

export async function getResponseWithAnswers(responseId) {
  const [responseRes, answersRes] = await Promise.all([
    supabase.from('form_responses').select('*').eq('id', responseId).single(),
    supabase.from('form_answers').select('*').eq('response_id', responseId),
  ])

  if (responseRes.error) throw responseRes.error
  if (answersRes.error) throw answersRes.error

  return {
    response: responseRes.data,
    answers: answersRes.data || [],
  }
}

export async function getFormAnalytics(formId) {
  const { data: formRow } = await supabase.from('forms').select('agency_id').eq('id', formId).single()

  const [recipientsRes, responsesRes, answersRes, versionRes] = await Promise.all([
    supabase.from('form_recipients').select('status, sent_at').eq('form_id', formId),
    supabase.from('form_responses').select('id, submitted_at').eq('form_id', formId),
    formRow?.agency_id
      ? supabase.from('form_answers').select('question_id, answer_text, answer_json').eq('agency_id', formRow.agency_id)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('form_versions').select('snapshot').eq('form_id', formId).order('version_number', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (recipientsRes.error) throw recipientsRes.error
  if (responsesRes.error) throw responsesRes.error

  const recipients = recipientsRes.data || []
  const responses = responsesRes.data || []
  const questions = versionRes.data?.snapshot?.questions || []

  const sent = recipients.filter((r) => r.sent_at).length || recipients.length
  const completed = recipients.filter((r) => r.status === 'completed').length
  const totalResponses = responses.length

  const trends = {}
  for (const r of responses) {
    const day = r.submitted_at?.slice(0, 10)
    if (day) trends[day] = (trends[day] || 0) + 1
  }

  const ratingQuestions = questions.filter((q) => q.question_type === 'rating')
  const npsQuestions = questions.filter((q) => q.question_type === 'nps')

  let avgRating = null
  let npsScore = null

  if (answersRes.data?.length) {
    if (ratingQuestions.length) {
      const ratingIds = new Set(ratingQuestions.map((q) => q.id))
      const ratings = answersRes.data
        .filter((a) => ratingIds.has(a.question_id))
        .map((a) => Number(a.answer_json ?? a.answer_text))
        .filter((n) => !Number.isNaN(n))
      if (ratings.length) {
        avgRating = ratings.reduce((s, n) => s + n, 0) / ratings.length
      }
    }

    if (npsQuestions.length) {
      const npsIds = new Set(npsQuestions.map((q) => q.id))
      const scores = answersRes.data
        .filter((a) => npsIds.has(a.question_id))
        .map((a) => Number(a.answer_json ?? a.answer_text))
        .filter((n) => !Number.isNaN(n))
      if (scores.length) {
        const promoters = scores.filter((s) => s >= 9).length
        const detractors = scores.filter((s) => s <= 6).length
        npsScore = Math.round(((promoters - detractors) / scores.length) * 100)
      }
    }
  }

  return {
    sent,
    totalResponses,
    completionRate: sent ? Math.round((completed / sent) * 100) : (totalResponses ? 100 : 0),
    avgRating: avgRating != null ? Math.round(avgRating * 10) / 10 : null,
    npsScore,
    trends: Object.entries(trends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
  }
}

export async function exportFormResponsesCsv(formId, session) {
  if (!session?.access_token) throw new Error('You must be signed in.')
  const res = await fetch(`/api/forms/export?form_id=${encodeURIComponent(formId)}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Export failed (${res.status})`)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match?.[1] || 'form-responses.csv'
  return { blob, filename }
}
