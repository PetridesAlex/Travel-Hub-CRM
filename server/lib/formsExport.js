function escapeCsvCell(value) {
  const str = value == null ? '' : String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function formatAnswerForCsv(answer) {
  if (!answer) return ''
  if (answer.answer_text != null) return answer.answer_text
  if (answer.answer_json == null) return ''
  if (Array.isArray(answer.answer_json)) return answer.answer_json.join('; ')
  if (typeof answer.answer_json === 'object') {
    if (answer.answer_json.file_name) return answer.answer_json.file_name
    return JSON.stringify(answer.answer_json)
  }
  return String(answer.answer_json)
}

export function buildFormResponsesCsv({ form, questions, responses, answersByResponse }) {
  const headers = [
    'Submitted At',
    'Respondent Name',
    'Respondent Email',
    ...(questions || []).map((q) => q.question_text),
  ]

  const rows = (responses || []).map((r) => {
    const answers = answersByResponse.get(r.id) || new Map()
    return [
      r.submitted_at,
      r.respondent_name || '',
      r.respondent_email || '',
      ...(questions || []).map((q) => formatAnswerForCsv(answers.get(q.id))),
    ]
  })

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ]

  return {
    csv: lines.join('\n'),
    filename: `${(form.title || 'form').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-responses.csv`,
  }
}
