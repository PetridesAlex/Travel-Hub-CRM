import { supabase } from '../lib/supabase'

export async function getEmailDrafts() {
  const { data, error } = await supabase
    .from('email_drafts')
    .select('*, clients(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createEmailDraft(draft, userId) {
  const { data, error } = await supabase
    .from('email_drafts')
    .insert({ ...draft, user_id: userId, status: 'draft' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmailDraft(id, draft) {
  const { data, error } = await supabase
    .from('email_drafts')
    .update(draft)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEmailDraft(id) {
  const { error } = await supabase.from('email_drafts').delete().eq('id', id)
  if (error) throw error
}
