import http from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import handler from '../api/ai/generate.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(filename) {
  try {
    const content = readFileSync(resolve(root, filename), 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

for (const file of ['.env', '.env.local']) loadEnvFile(file)

function createVercelResponse(res) {
  const state = { statusCode: 200 }
  return {
    status(code) {
      state.statusCode = code
      return this
    },
    json(data) {
      res.writeHead(state.statusCode, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    },
  }
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString()
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname !== '/api/ai/generate') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  try {
    const body = req.method === 'POST' ? await readJsonBody(req) : {}
    await handler(
      { method: req.method, headers: req.headers, body },
      createVercelResponse(res),
    )
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message || 'Internal server error' }))
    }
  }
})

const port = Number(process.env.API_PORT) || 3000
server.listen(port, () => {
  console.log(`Local AI API running at http://localhost:${port}`)
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY is not set in .env — generation will fail until you add it.')
  }
})
