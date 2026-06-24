import http from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import generateHandler from '../api/ai/generate.js'
import assistHandler from '../api/ai/assist.js'
import voiceProgramHandler from '../api/ai/voice-program.js'
import extractTemplateFieldsHandler from '../api/ai/extract-template-fields.js'
import formsHandler from '../api/forms.js'
import compareHotelRatesHandler from '../api/ai/compare-hotel-rates.js'
import slackTestHandler from '../api/slack/test.js'
import slackNotifyHandler from '../api/slack/notify.js'
import slackPaymentRemindersHandler from '../api/slack/payment-reminders.js'
import leadsInboundHandler from '../api/leads/inbound.js'
import adminHandler from '../api/admin.js'
import agencyHandler from '../api/agency.js'


const apiRoutes = {
  '/api/ai/generate': generateHandler,
  '/api/ai/assist': assistHandler,
  '/api/ai/calendar-assist': assistHandler,
  '/api/ai/task-assist': assistHandler,
  '/api/ai/voice-program': voiceProgramHandler,
  '/api/ai/extract-flight-fields': async (req, res) => {
    req.body = { ...req.body, category: 'flight_offer' }
    return extractTemplateFieldsHandler(req, res)
  },
  '/api/ai/extract-template-fields': extractTemplateFieldsHandler,
  '/api/forms': formsHandler,
  '/api/forms/public': formsHandler,
  '/api/forms/open': formsHandler,
  '/api/forms/verify-gate': formsHandler,
  '/api/forms/submit': formsHandler,
  '/api/forms/upload': formsHandler,
  '/api/forms/export': formsHandler,
  '/api/ai/compare-hotel-rates': compareHotelRatesHandler,
  '/api/slack/test': slackTestHandler,
  '/api/slack/notify': slackNotifyHandler,
  '/api/slack/payment-reminders': slackPaymentRemindersHandler,
  '/api/leads/inbound': leadsInboundHandler,
  '/api/admin/agencies': adminHandler,
  '/api/admin/agency': adminHandler,
  '/api/admin/invite': adminHandler,
  '/api/agency/integrations': agencyHandler,
  '/api/agency/team': agencyHandler,
  '/api/email/send': agencyHandler,
}

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

  const handler = apiRoutes[url.pathname]
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  try {
    const body = req.method === 'POST' ? await readJsonBody(req) : {}
    await handler(
      { method: req.method, headers: req.headers, body, url: req.url },
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

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${port} is already in use — an old API server is probably still running.`)
    console.error(`Run: npm run dev:api:restart\n`)
    process.exit(1)
  }
  throw err
})

server.listen(port, () => {
  console.log(`Local AI API running at http://localhost:${port}`)
  console.log(`Routes: ${Object.keys(apiRoutes).join(', ')}`)
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY is not set in .env — generation will fail until you add it.')
  }
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.warn('Warning: SLACK_WEBHOOK_URL is not set in .env — Slack notifications will fail until you add it.')
  }
})
