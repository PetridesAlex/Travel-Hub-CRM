import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { notifyFormSubmission } from './formsNotify.js'

const scryptAsync = promisify(crypto.scrypt)

const rateLimits = new Map()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 30

export function generateAccessToken() {
  return crypto.randomBytes(24).toString('base64url')
}

export async function hashAccessCode(code) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = (await scryptAsync(String(code), salt, 64)).toString('hex')
  return `${salt}:${hash}`
}

export async function verifyAccessCode(code, stored) {
  if (!code || !stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const derived = (await scryptAsync(String(code), salt, 64)).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'))
}

function checkRateLimit(key) {
  const now = Date.now()
  const entry = rateLimits.get(key) || { count: 0, resetAt: now + RATE_WINDOW_MS }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + RATE_WINDOW_MS
  }
  entry.count += 1
  rateLimits.set(key, entry)
  return entry.count <= RATE_MAX
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.headers['x-real-ip'] || 'unknown'
}

export function assertRateLimit(req, token) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`ip:${ip}`) || !checkRateLimit(`token:${token}`)) {
    const err = new Error('Too many requests. Please try again later.')
    err.status = 429
    throw err
  }
}

async function loadRecipient(admin, token) {
  const { data: recipient, error } = await admin
    .from('form_recipients')
    .select('*, forms(*)')
    .eq('access_token', token)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!recipient) {
    const err = new Error('Invalid or expired form link.')
    err.status = 404
    throw err
  }
  return recipient
}

function assertRecipientActive(recipient) {
  if (recipient.status === 'completed') {
    const err = new Error('This form has already been submitted.')
    err.status = 410
    throw err
  }
  if (recipient.status === 'expired') {
    const err = new Error('This form link has expired.')
    err.status = 410
    throw err
  }
  if (recipient.expires_at && new Date(recipient.expires_at) < new Date()) {
    const err = new Error('This form link has expired.')
    err.status = 410
    throw err
  }
}

async function loadLatestVersion(admin, formId) {
  const { data, error } = await admin
    .from('form_versions')
    .select('*')
    .eq('form_id', formId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    const err = new Error('This form is not published yet.')
    err.status = 404
    throw err
  }
  return data
}

export async function loadPublicForm(token) {
  const admin = getSupabaseAdmin()
  const recipient = await loadRecipient(admin, token)
  assertRecipientActive(recipient)

  const form = recipient.forms
  if (!form || form.status !== 'published') {
    const err = new Error('This form is not available.')
    err.status = 404
    throw err
  }

  const version = await loadLatestVersion(admin, form.id)
  const snapshot = version.snapshot || {}

  return {
    form: {
      id: form.id,
      title: form.title,
      description: form.description,
      security_mode: form.security_mode,
      gate_config: form.gate_config || {},
      settings: form.settings || {},
    },
    recipient: {
      id: recipient.id,
      status: recipient.status,
      name: recipient.name,
      email: recipient.email,
    },
    version: {
      id: version.id,
      version_number: version.version_number,
    },
    sections: snapshot.sections || [],
    questions: snapshot.questions || [],
  }
}

export async function markFormOpened(token) {
  const admin = getSupabaseAdmin()
  const recipient = await loadRecipient(admin, token)
  assertRecipientActive(recipient)

  if (recipient.opened_at) {
    return { ok: true, already_opened: true }
  }

  const { error } = await admin
    .from('form_recipients')
    .update({ opened_at: new Date().toISOString(), status: 'opened' })
    .eq('id', recipient.id)

  if (error) throw new Error(error.message)
  return { ok: true }
}

export async function verifyFormGate(token, { email, booking_ref: bookingRef, access_code: accessCode }) {
  const admin = getSupabaseAdmin()
  const recipient = await loadRecipient(admin, token)
  assertRecipientActive(recipient)

  const form = recipient.forms
  const gateConfig = form?.gate_config || {}

  if (form?.security_mode !== 'gate') {
    return { ok: true, gate_required: false }
  }

  if (gateConfig.require_email) {
    const expected = (recipient.email || '').trim().toLowerCase()
    const provided = (email || '').trim().toLowerCase()
    if (!expected || expected !== provided) {
      const err = new Error('Email does not match our records.')
      err.status = 403
      throw err
    }
  }

  if (gateConfig.require_booking_ref) {
    if (!bookingRef?.trim()) {
      const err = new Error('Booking reference is required.')
      err.status = 403
      throw err
    }
    const { data: booking } = await admin
      .from('bookings')
      .select('id')
      .eq('agency_id', recipient.agency_id)
      .ilike('booking_reference', bookingRef.trim())
      .maybeSingle()

    if (!booking) {
      const err = new Error('Booking reference not found.')
      err.status = 403
      throw err
    }
  }

  if (gateConfig.require_access_code) {
    const valid = await verifyAccessCode(accessCode, recipient.access_code_hash)
    if (!valid) {
      const err = new Error('Invalid access code.')
      err.status = 403
      throw err
    }
  }

  return { ok: true, gate_passed: true }
}

function normalizeAnswer(question, raw) {
  if (raw == null || raw === '') return { answer_text: null, answer_json: null }

  const type = question.question_type
  if (type === 'checkbox' || type === 'rating' || type === 'nps' || type === 'file') {
    return { answer_text: null, answer_json: raw }
  }
  if (type === 'yes_no') {
    return { answer_text: raw === true || raw === 'yes' ? 'Yes' : 'No', answer_json: null }
  }
  return { answer_text: String(raw), answer_json: null }
}

function validateAnswers(questions, answers) {
  const byId = new Map((answers || []).map((a) => [a.question_id, a.value]))
  const errors = []

  for (const q of questions) {
    if (!q.required) continue
    const val = byId.get(q.id)
    const empty = val == null || val === '' || (Array.isArray(val) && !val.length)
    if (empty) errors.push(`"${q.question_text}" is required.`)
  }

  if (errors.length) {
    const err = new Error(errors.join(' '))
    err.status = 400
    throw err
  }
}

export async function submitForm(token, body, req) {
  const admin = getSupabaseAdmin()
  const recipient = await loadRecipient(admin, token)
  assertRecipientActive(recipient)

  const form = recipient.forms
  if (form?.security_mode === 'gate') {
    await verifyFormGate(token, body.gate || {})
  }

  const version = await loadLatestVersion(admin, form.id)
  const questions = version.snapshot?.questions || []
  validateAnswers(questions, body.answers)

  const respondentName = body.respondent_name || recipient.name || null
  const respondentEmail = body.respondent_email || recipient.email || null

  const metadata = {
    user_agent: req.headers['user-agent'] || null,
    ip: getClientIp(req),
  }

  const { data: response, error: responseError } = await admin
    .from('form_responses')
    .insert({
      form_id: form.id,
      form_version_id: version.id,
      recipient_id: recipient.id,
      agency_id: recipient.agency_id,
      respondent_name: respondentName,
      respondent_email: respondentEmail,
      metadata,
    })
    .select()
    .single()

  if (responseError) throw new Error(responseError.message)

  const answerRows = (body.answers || []).map((a) => {
    const question = questions.find((q) => q.id === a.question_id)
    const normalized = normalizeAnswer(question || {}, a.value)
    return {
      response_id: response.id,
      question_id: a.question_id,
      agency_id: recipient.agency_id,
      ...normalized,
    }
  })

  if (answerRows.length) {
    const { error: answersError } = await admin.from('form_answers').insert(answerRows)
    if (answersError) throw new Error(answersError.message)
  }

  const completedAt = new Date().toISOString()
  const recipientUpdate = {
    completed_at: completedAt,
    status: 'completed',
  }

  await admin.from('form_recipients').update(recipientUpdate).eq('id', recipient.id)

  try {
    await notifyFormSubmission(admin, {
      form,
      response,
      questions,
      answers: body.answers || [],
      version,
    })
  } catch (notifyErr) {
    console.warn('Form notification failed:', notifyErr.message)
  }

  return {
    ok: true,
    thank_you: form.settings?.thank_you_message || 'Thank you for your response!',
    single_use: form.security_mode === 'link_single_use',
  }
}

export async function uploadFormFile(token, { question_id: questionId, file_name: fileName, mime_type: mimeType, content_base64: contentBase64 }) {
  const admin = getSupabaseAdmin()
  const recipient = await loadRecipient(admin, token)
  assertRecipientActive(recipient)

  const form = recipient.forms
  const version = await loadLatestVersion(admin, form.id)
  const question = (version.snapshot?.questions || []).find((q) => q.id === questionId)

  if (!question || question.question_type !== 'file') {
    const err = new Error('Invalid file upload question.')
    err.status = 400
    throw err
  }

  const buffer = Buffer.from(contentBase64, 'base64')
  const maxBytes = 10 * 1024 * 1024
  if (buffer.length > maxBytes) {
    const err = new Error('File exceeds 10MB limit.')
    err.status = 400
    throw err
  }

  const safeName = (fileName || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_')
  const tempId = crypto.randomUUID()
  const storagePath = `${recipient.agency_id}/${form.id}/${tempId}/${safeName}`

  const { error: uploadError } = await admin.storage
    .from('form-uploads')
    .upload(storagePath, buffer, { contentType: mimeType || 'application/octet-stream', upsert: false })

  if (uploadError) throw new Error(uploadError.message)

  return {
    ok: true,
    file_ref: {
      storage_path: storagePath,
      file_name: safeName,
      mime_type: mimeType,
      size_bytes: buffer.length,
      question_id: questionId,
    },
  }
}
