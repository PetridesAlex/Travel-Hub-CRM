import { supabase } from '../lib/supabase'
import { resolveAgencyId } from './agencies'
import { CLIENT_EMBED } from './clients'

export async function getVoiceNotes() {
  const { data, error } = await supabase
    .from('voice_notes')
    .select(`*, clients(${CLIENT_EMBED})`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createVoiceNote(note, userId, agencyId) {
  const resolvedAgencyId = await resolveAgencyId(userId, agencyId)
  const { data, error } = await supabase
    .from('voice_notes')
    .insert({
      ...note,
      user_id: userId,
      agency_id: resolvedAgencyId,
      processing_status: note.generated_content ? 'completed' : 'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateVoiceNote(id, updates) {
  const { data, error } = await supabase
    .from('voice_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVoiceNote(id) {
  const { error } = await supabase.from('voice_notes').delete().eq('id', id)
  if (error) throw error
}
