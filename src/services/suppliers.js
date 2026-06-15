import { supabase } from '../lib/supabase'
import { resolveAgencyId } from './agencies'

export async function getSuppliers(search = '', type = '') {
  let query = supabase.from('suppliers').select('*').order('company_name')

  if (search) {
    query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (type) query = query.eq('supplier_type', type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createSupplier(supplier, userId, agencyId) {
  const resolvedAgencyId = await resolveAgencyId(userId, agencyId)
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...supplier, user_id: userId, agency_id: resolvedAgencyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSupplier(id, supplier) {
  const { data, error } = await supabase
    .from('suppliers')
    .update(supplier)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSupplier(id) {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}
