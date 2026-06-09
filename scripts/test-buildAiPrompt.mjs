import { fillTemplate, buildOpenAiUserMessage } from '../api/lib/buildAiPrompt.js'

const templateBody = `Dear {{client_name}},

Route: {{route}}
Price: {{price}}`

const input = {
  client_name: 'Mr Andreas',
  route: 'Paphos – Athens – Paphos',
  travel_dates: '14 June 2026 – 21 June 2026',
  outbound_details: '14 June 2026, FR336, Paphos 19:10, Athens 20:55',
  return_details: '21 June 2026, FR335, Athens 21:20, Paphos 23:00',
  inclusions: '1 small bag, Reserved seat, Priority boarding',
  price: '€258.74',
}

const filled = fillTemplate(templateBody, input)
const message = buildOpenAiUserMessage({
  templateBody,
  inputData: input,
  agencyName: 'Test Travel Agency',
})

console.log('--- fillTemplate ---')
console.log(filled)
console.log('\n--- buildOpenAiUserMessage (excerpt) ---')
console.log(message.slice(0, 500))
console.log('\n✓ Prompt builder test passed')
