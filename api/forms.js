import { verifySession } from '../server/lib/verifySession.js'
import { getSupabaseAdmin } from '../server/lib/supabaseAdmin.js'
import { resolveUserAgency } from '../server/lib/resolveUserAgency.js'
import {
  assertRateLimit,
  loadPublicForm,
  markFormOpened,
  verifyFormGate,
  submitForm,
  uploadFormFile,
} from '../server/lib/formsPublic.js'
import { buildFormResponsesCsv } from '../server/lib/formsExport.js'

function resolveAction(req) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const fromQuery = url.searchParams.get('action')
  if (fromQuery) return fromQuery
  const parts = url.pathname.split('/').filter(Boolean)
  const idx = parts.indexOf('forms')
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
  if (req.method === 'GET' && url.searchParams.get('token')) return 'public'
  return null
}

export default async function handler(req, res) {
  const action = resolveAction(req)

  try {
    if (action === 'public' && req.method === 'GET') {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      const token = url.searchParams.get('token')
      if (!token) return res.status(400).json({ error: 'token is required.' })
      assertRateLimit(req, token)
      const data = await loadPublicForm(token)
      return res.status(200).json(data)
    }

    if (action === 'open' && req.method === 'POST') {
      const { token } = req.body || {}
      if (!token) return res.status(400).json({ error: 'token is required.' })
      assertRateLimit(req, token)
      const result = await markFormOpened(token)
      return res.status(200).json(result)
    }

    if (action === 'verify-gate' && req.method === 'POST') {
      const { token, email, booking_ref, access_code } = req.body || {}
      if (!token) return res.status(400).json({ error: 'token is required.' })
      assertRateLimit(req, token)
      const result = await verifyFormGate(token, { email, booking_ref, access_code })
      return res.status(200).json(result)
    }

    if (action === 'submit' && req.method === 'POST') {
      const { token } = req.body || {}
      if (!token) return res.status(400).json({ error: 'token is required.' })
      assertRateLimit(req, token)
      const result = await submitForm(token, req.body, req)
      return res.status(200).json(result)
    }

    if (action === 'upload' && req.method === 'POST') {
      const { token } = req.body || {}
      if (!token) return res.status(400).json({ error: 'token is required.' })
      assertRateLimit(req, token)
      const result = await uploadFormFile(token, req.body)
      return res.status(200).json(result)
    }

    if (action === 'export' && req.method === 'GET') {
      const auth = await verifySession(req)
      if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      const formId = url.searchParams.get('form_id')
      if (!formId) return res.status(400).json({ error: 'form_id is required.' })

      const adminResult = getSupabaseAdmin()
      if (!adminResult.ok) return res.status(500).json({ error: adminResult.error })

      const admin = adminResult.supabase
      const resolved = await resolveUserAgency(admin, auth.user.id)
      if (!resolved?.agency?.id) return res.status(403).json({ error: 'Agency access required.' })

      const { data: form, error: formError } = await admin
        .from('forms')
        .select('*')
        .eq('id', formId)
        .eq('agency_id', resolved.agency.id)
        .single()

      if (formError || !form) return res.status(404).json({ error: 'Form not found.' })

      const { data: version } = await admin
        .from('form_versions')
        .select('snapshot')
        .eq('form_id', formId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const questions = version?.snapshot?.questions || []

      const { data: responses } = await admin
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false })

      const responseIds = (responses || []).map((r) => r.id)
      let answers = []
      if (responseIds.length) {
        const { data: answerRows } = await admin
          .from('form_answers')
          .select('*')
          .in('response_id', responseIds)
        answers = answerRows || []
      }

      const answersByResponse = new Map()
      for (const a of answers) {
        if (!answersByResponse.has(a.response_id)) {
          answersByResponse.set(a.response_id, new Map())
        }
        answersByResponse.get(a.response_id).set(a.question_id, a)
      }

      const { csv, filename } = buildFormResponsesCsv({
        form,
        questions,
        responses: responses || [],
        answersByResponse,
      })

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      return res.status(200).send(csv)
    }

    return res.status(404).json({ error: 'Unknown forms action.' })
  } catch (err) {
    const status = err.status || 500
    return res.status(status).json({ error: err.message || 'Internal server error' })
  }
}
