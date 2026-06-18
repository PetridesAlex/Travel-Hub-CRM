import { sendResendEmail } from './resendService.js'

const AGENCY_FIELDS = `
  id, name, owner_user_id, email,
  resend_domain, resend_from_email, resend_reply_to
`

async function getOwnerEmail(admin, ownerUserId) {
  if (!ownerUserId) return null
  const { data, error } = await admin.auth.admin.getUserById(ownerUserId)
  if (error) return null
  return data?.user?.email || null
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatAnswerValue(question, answer) {
  if (!answer) return '—'
  const val = answer.value ?? answer.answer_text ?? answer.answer_json
  if (val == null) return '—'
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'object') {
    if (val.file_name) return val.file_name
    return JSON.stringify(val)
  }
  const text = String(val)
  return text.length > 200 ? `${text.slice(0, 200)}…` : text
}

function buildSummaryHtml({ form, response, questions, answers }) {
  const answerByQ = new Map((answers || []).map((a) => [a.question_id, a]))
  const rows = (questions || []).slice(0, 12).map((q) => {
    const ans = answerByQ.get(q.id)
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;vertical-align:top;">${escapeHtml(q.question_text)}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${escapeHtml(formatAnswerValue(q, ans))}</td></tr>`
  }).join('')

  const crmUrl =
    process.env.VITE_APP_URL ||
    process.env.CRM_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    ''
  const responsesLink = crmUrl ? `${crmUrl.replace(/\/$/, '')}/forms/${form.id}/responses` : null

  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#0f172a;margin:0 0 8px;">New form response</h2>
      <p style="color:#64748b;margin:0 0 16px;">${escapeHtml(form.title)}</p>
      <p style="color:#334155;margin:0 0 16px;">
        <strong>From:</strong> ${escapeHtml(response.respondent_name || 'Anonymous')}
        ${response.respondent_email ? ` &lt;${escapeHtml(response.respondent_email)}&gt;` : ''}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
      ${responsesLink ? `<p style="margin-top:20px;"><a href="${responsesLink}" style="color:#0d9488;">View all responses</a></p>` : ''}
    </div>
  `
}

export async function notifyFormSubmission(admin, { form, response, questions, answers }) {
  const { data: agency, error } = await admin
    .from('agencies')
    .select(AGENCY_FIELDS)
    .eq('id', form.agency_id)
    .single()

  if (error || !agency) return { ok: false, error: 'Agency not found' }

  const settings = form.settings || {}
  let recipients = Array.isArray(settings.notification_emails)
    ? settings.notification_emails.filter(Boolean)
    : []

  if (!recipients.length) {
    const ownerEmail = await getOwnerEmail(admin, agency.owner_user_id)
    if (ownerEmail) recipients = [ownerEmail]
    else if (agency.email) recipients = [agency.email]
  }

  if (!recipients.length) {
    return { ok: false, error: 'No notification recipients configured.' }
  }

  const html = buildSummaryHtml({ form, response, questions, answers })
  const subject = `New response: ${form.title}`

  return sendResendEmail(admin, agency, { to: recipients, subject, html })
}
