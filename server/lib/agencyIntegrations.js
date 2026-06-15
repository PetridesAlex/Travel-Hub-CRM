import { encryptSecret, decryptSecret } from './integrationCrypto.js'

export async function getAgencyIntegrations(admin, agencyId) {
  const { data, error } = await admin
    .from('agency_integrations')
    .select('agency_id, resend_api_key_encrypted, created_at, updated_at')
    .eq('agency_id', agencyId)
    .maybeSingle()
  if (error && !/does not exist|42P01/i.test(error.message)) throw error
  return data || null
}

export async function upsertResendApiKey(admin, agencyId, apiKey) {
  const encrypted = apiKey ? encryptSecret(apiKey) : null
  const { data, error } = await admin
    .from('agency_integrations')
    .upsert({ agency_id: agencyId, resend_api_key_encrypted: encrypted }, { onConflict: 'agency_id' })
    .select('agency_id')
    .single()
  if (error) throw error
  return data
}

export async function getDecryptedResendApiKey(admin, agencyId) {
  const row = await getAgencyIntegrations(admin, agencyId)
  if (!row?.resend_api_key_encrypted) return null
  return decryptSecret(row.resend_api_key_encrypted)
}
