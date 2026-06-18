import { supabase } from '../lib/supabase'
import { resolveAgencyId } from './agencies'

export async function getForms(status = '') {
  let query = supabase.from('forms').select('*').order('updated_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getForm(id) {
  const { data, error } = await supabase.from('forms').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getFormWithStructure(id) {
  const [form, sectionsRes, questionsRes] = await Promise.all([
    getForm(id),
    supabase.from('form_sections').select('*').eq('form_id', id).order('sort_order'),
    supabase.from('form_questions').select('*').eq('form_id', id).order('sort_order'),
  ])

  if (sectionsRes.error) throw sectionsRes.error
  if (questionsRes.error) throw questionsRes.error

  return {
    form,
    sections: sectionsRes.data || [],
    questions: questionsRes.data || [],
  }
}

export async function createForm(payload, userId, agencyId) {
  const resolvedAgencyId = await resolveAgencyId(userId, agencyId)
  const { data, error } = await supabase
    .from('forms')
    .insert({
      ...payload,
      user_id: userId,
      agency_id: resolvedAgencyId,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateForm(id, updates) {
  const { data, error } = await supabase.from('forms').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteForm(id) {
  const { error } = await supabase.from('forms').delete().eq('id', id)
  if (error) throw error
}

export async function createSection(formId, agencyId, section, sortOrder = 0) {
  const { data, error } = await supabase
    .from('form_sections')
    .insert({ ...section, form_id: formId, agency_id: agencyId, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSection(id, updates) {
  const { data, error } = await supabase.from('form_sections').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSection(id) {
  const { error } = await supabase.from('form_sections').delete().eq('id', id)
  if (error) throw error
}

export async function createQuestion(formId, agencyId, question, sortOrder = 0) {
  const { data, error } = await supabase
    .from('form_questions')
    .insert({ ...question, form_id: formId, agency_id: agencyId, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateQuestion(id, updates) {
  const { data, error } = await supabase.from('form_questions').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteQuestion(id) {
  const { error } = await supabase.from('form_questions').delete().eq('id', id)
  if (error) throw error
}

export async function reorderItems(table, items) {
  const updates = items.map((item, index) =>
    supabase.from(table).update({ sort_order: index }).eq('id', item.id),
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

function buildSnapshot(sections, questions) {
  return {
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      sort_order: s.sort_order,
    })),
    questions: questions.map((q) => ({
      id: q.id,
      section_id: q.section_id,
      question_type: q.question_type,
      question_text: q.question_text,
      help_text: q.help_text,
      options: q.options || [],
      config: q.config || {},
      required: q.required,
      sort_order: q.sort_order,
    })),
  }
}

export async function publishForm(formId) {
  const { form, sections, questions } = await getFormWithStructure(formId)

  const { data: latest } = await supabase
    .from('form_versions')
    .select('version_number')
    .eq('form_id', formId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const versionNumber = (latest?.version_number || 0) + 1
  const snapshot = buildSnapshot(sections, questions)

  const { data: version, error: versionError } = await supabase
    .from('form_versions')
    .insert({
      form_id: formId,
      agency_id: form.agency_id,
      version_number: versionNumber,
      snapshot,
    })
    .select()
    .single()

  if (versionError) throw versionError

  const { data: updated, error } = await supabase
    .from('forms')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', formId)
    .select()
    .single()

  if (error) throw error
  return { form: updated, version }
}

export async function duplicateForm(formId, userId) {
  const { form, sections, questions } = await getFormWithStructure(formId)

  const copy = await createForm(
    {
      title: `${form.title} (copy)`,
      description: form.description,
      category: form.category,
      security_mode: form.security_mode,
      gate_config: form.gate_config,
      settings: form.settings,
      status: 'draft',
      template_source_id: form.id,
    },
    userId,
    form.agency_id,
  )

  const sectionMap = new Map()
  for (const section of sections) {
    const created = await createSection(copy.id, copy.agency_id, {
      title: section.title,
      description: section.description,
    }, section.sort_order)
    sectionMap.set(section.id, created.id)
  }

  for (const q of questions) {
    await createQuestion(copy.id, copy.agency_id, {
      section_id: q.section_id ? sectionMap.get(q.section_id) : null,
      question_type: q.question_type,
      question_text: q.question_text,
      help_text: q.help_text,
      options: q.options,
      config: q.config,
      required: q.required,
    }, q.sort_order)
  }

  return copy
}

export async function getFormStats(formIds = []) {
  if (!formIds.length) return {}

  const [recipientsRes, responsesRes] = await Promise.all([
    supabase.from('form_recipients').select('form_id, status').in('form_id', formIds),
    supabase.from('form_responses').select('form_id').in('form_id', formIds),
  ])

  if (recipientsRes.error) throw recipientsRes.error
  if (responsesRes.error) throw responsesRes.error

  const stats = {}
  for (const id of formIds) {
    stats[id] = { sent: 0, opened: 0, completed: 0, responses: 0 }
  }

  for (const r of recipientsRes.data || []) {
    if (!stats[r.form_id]) stats[r.form_id] = { sent: 0, opened: 0, completed: 0, responses: 0 }
    stats[r.form_id].sent += 1
    if (r.status === 'opened' || r.status === 'completed') stats[r.form_id].opened += 1
    if (r.status === 'completed') stats[r.form_id].completed += 1
  }

  for (const r of responsesRes.data || []) {
    if (!stats[r.form_id]) stats[r.form_id] = { sent: 0, opened: 0, completed: 0, responses: 0 }
    stats[r.form_id].responses += 1
  }

  return stats
}
