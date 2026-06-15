import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function getKey() {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-fallback-key'
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(plainText) {
  if (!plainText) return null
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptSecret(payload) {
  if (!payload) return null
  const [ivB64, tagB64, dataB64] = String(payload).split(':')
  if (!ivB64 || !tagB64 || !dataB64) return null
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
