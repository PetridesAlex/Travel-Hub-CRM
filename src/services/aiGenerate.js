export async function generateAiContent(
  { agentId, templateId, clientId, leadId, inputData, extraNotes },
  session,
) {
  if (!session?.access_token) {
    throw new Error('You must be signed in to generate content.')
  }

  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      agent_id: agentId,
      template_id: templateId,
      client_id: clientId || null,
      lead_id: leadId || null,
      input_data: inputData || {},
      extra_notes: extraNotes || '',
    }),
  })

  const raw = await res.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = {}
  }

  if (!res.ok) {
    if (res.status === 502 && !data.error) {
      throw new Error(
        'AI API unavailable (502). On local dev, run "npm run dev:api" in a second terminal. On production, ensure api/ and vercel.json are deployed to Vercel.',
      )
    }
    throw new Error(data.error || raw?.slice(0, 200) || `Generation failed (${res.status})`)
  }

  return data
}
