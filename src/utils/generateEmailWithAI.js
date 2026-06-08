import { createChatCompletion } from '../services/openai'
import { hasOpenAiApiKey } from '../lib/openaiConfig'
import {
  EMAIL_SYSTEM_PROMPT,
  buildEmailSubject,
  getTemplateGuidance,
} from '../constants/emailAssistantPrompt'
import { formatFlightDataForEmail } from './formatFlightEmail'

function formatPrice(price, currency) {
  if (!price) return ''
  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : ''
  return sym ? `${sym}${price}` : `${price} ${currency}`
}

function buildUserContext({
  emailType,
  clientName,
  userPrompt,
  flightData,
  flightDetails,
  price,
  currency,
  destination,
  extraNotes,
}) {
  const parts = [
    `Template: ${emailType}`,
    `Client name: ${clientName}`,
  ]

  if (destination) parts.push(`Destination / route: ${destination}`)
  if (price) parts.push(`Price: ${formatPrice(price, currency)}`)
  if (flightDetails) parts.push(`Flight data:\n${flightDetails}`)
  if (userPrompt?.trim()) parts.push(`User instructions:\n${userPrompt.trim()}`)
  if (extraNotes?.trim()) parts.push(`Extra notes:\n${extraNotes.trim()}`)

  return parts.join('\n\n')
}

export async function generateEmailWithAI(source) {
  const {
    emailType,
    clientName = 'Valued Client',
    userPrompt = '',
    flightData = null,
    price = '',
    currency = 'EUR',
    destination = '',
    extraNotes = '',
  } = source

  const flightDetails = flightData
    ? formatFlightDataForEmail({
        ...flightData,
        totalPrice: price || flightData.totalPrice,
        currency: currency || flightData.currency,
      })
    : ''

  const templateGuidance = getTemplateGuidance(emailType)
  const userContext = buildUserContext({
    emailType,
    clientName,
    userPrompt,
    flightData,
    flightDetails,
    price,
    currency,
    destination,
    extraNotes,
  })

  const body = await createChatCompletion({
    messages: [
      { role: 'system', content: EMAIL_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `${templateGuidance}\n\nReplace [Client Name] with: ${clientName}\n\nInformation to use:\n${userContext}`,
      },
    ],
    temperature: 0.35,
  })

  return {
    subject: buildEmailSubject(emailType, { destination, clientName }),
    body,
  }
}

export function canUseAiEmail() {
  return hasOpenAiApiKey()
}
