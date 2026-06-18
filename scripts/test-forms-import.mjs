import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFormFromText, parseAiFormJson, normalizeAiFormPayload } from '../src/utils/parseFormFromText.js'
import { parseAiFormJson as parseServer } from '../server/lib/formImportParse.js'
import { buildFormImportPrompt } from '../server/lib/formImportPrompt.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const file of ['.env', '.env.local']) {
  try {
    const content = readFileSync(resolve(root, file), 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const k = trimmed.slice(0, eq).trim()
      const v = trimmed.slice(eq + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  } catch { /* optional */ }
}

const SAMPLE = `Canada | 14-22 July 2025

Your opinion matters! Please take a few minutes to share your feedback.

How would you rate your overall experience on the Canada trip?
• Excellent
• Very Good
• Good
• Fair
• Poor

Did the program meet your expectations?
• Fully
• Mostly
• Not quite
• Not at all

How would you rate "Le Centre Sheraton Montreal hotel"?
• Excellent
• Very Good
• Good
• Fair
• Poor`

function testParseFormFromText() {
  const result = parseFormFromText(SAMPLE)
  assert.equal(result.title, 'Canada | 14-22 July 2025')
  assert.ok(result.description.includes('Your opinion matters'))
  assert.ok(result.questions.length >= 3, `expected >= 3 questions, got ${result.questions.length}`)
  assert.equal(result.questions[0].question_type, 'radio')
  assert.ok(result.questions[0].options.includes('Excellent'))
  console.log('✓ parseFormFromText')
}

function testParseAiFormJson() {
  const json = `{
    "title": "Trip Feedback",
    "description": "Thanks for traveling with us.",
    "questions": [
      {
        "question_text": "How was the hotel?",
        "question_type": "radio",
        "options": ["Excellent", "Good", "Poor"],
        "image_url": "https://example.com/hotel.jpg"
      }
    ]
  }`
  const result = parseAiFormJson(json)
  assert.equal(result.title, 'Trip Feedback')
  assert.equal(result.questions[0].config.image_url, 'https://example.com/hotel.jpg')
  const server = parseServer(json)
  assert.equal(server.questions.length, 1)
  console.log('✓ parseAiFormJson')
}

function testNormalizePayload() {
  const result = normalizeAiFormPayload({
    title: 'Survey',
    questions: [{ label: 'Rate us', options: ['A', 'B'] }],
  })
  assert.equal(result.questions[0].question_text, 'Rate us')
  assert.equal(result.questions[0].question_type, 'radio')
  console.log('✓ normalizeAiFormPayload')
}

function testBuildPrompt() {
  const prompt = buildFormImportPrompt({ text: SAMPLE })
  assert.ok(prompt.instructions.includes('JSON'))
  assert.ok(prompt.input.includes('Canada'))
  console.log('✓ buildFormImportPrompt')
}

async function testAiImportOptional() {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    console.log('○ AI import live test skipped (OPENAI_API_KEY not set)')
    return
  }

  const { createOpenAiResponse } = await import('../server/lib/openaiService.js')
  const prompt = buildFormImportPrompt({ text: SAMPLE.slice(0, 500) })
  const { text } = await createOpenAiResponse({
    instructions: prompt.instructions,
    input: prompt.input,
    temperature: prompt.temperature,
  })

  const form = parseServer(text)
  assert.ok(form.title)
  assert.ok(form.questions.length >= 2, `AI returned ${form.questions.length} questions`)
  console.log(`✓ AI form import live test (${form.questions.length} questions)`)
}

async function main() {
  testParseFormFromText()
  testParseAiFormJson()
  testNormalizePayload()
  testBuildPrompt()
  await testAiImportOptional()
  console.log('\nAll form import tests passed.')
}

main().catch((err) => {
  console.error('\nTest failed:', err.message)
  process.exit(1)
})
