export async function fetchPublicForm(token) {
  const res = await fetch(`/api/forms/public?token=${encodeURIComponent(token)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Failed to load form (${res.status})`)
  return data
}

export async function openPublicForm(token) {
  const res = await fetch('/api/forms/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Failed to open form (${res.status})`)
  return data
}

export async function verifyFormGate(token, gate) {
  const res = await fetch('/api/forms/verify-gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...gate }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Verification failed (${res.status})`)
  return data
}

export async function submitPublicForm(token, payload) {
  const res = await fetch('/api/forms/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Submit failed (${res.status})`)
  return data
}

export async function uploadFormFile(token, { questionId, file }) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  const contentBase64 = btoa(binary)

  const res = await fetch('/api/forms/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      question_id: questionId,
      file_name: file.name,
      mime_type: file.type,
      content_base64: contentBase64,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`)
  return data.file_ref
}
