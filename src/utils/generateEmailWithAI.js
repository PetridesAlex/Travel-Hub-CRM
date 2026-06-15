import { generateTravelEmail, isAiAvailable } from '../services/aiAssist'
import { buildEmailSubject } from '../constants/emailAssistantPrompt'
import { formatFlightDataForEmail } from './formatFlightEmail'
import { formatClientSalutation, sanitizeEmailBody } from './professionalEmailHelpers'

function formatPrice(price, currency) {
  if (!price) return ''
  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : ''
  return sym ? `${sym}${price}` : `${price} ${currency}`
}

export async function generateEmailWithAI(source, session) {
  const {
    emailType,
    clientName = 'Valued Client',
    userPrompt = '',
    flightData = null,
    price = '',
    currency = 'EUR',
    destination = '',
    extraNotes = '',
    agencyName = '',
  } = source

  const salutationName = formatClientSalutation(clientName)

  const flightDetails = flightData
    ? formatFlightDataForEmail({
        ...flightData,
        totalPrice: price || flightData.totalPrice,
        currency: currency || flightData.currency,
      })
    : ''

  const rawBody = await generateTravelEmail(emailType, {
    client_name: salutationName,
    user_prompt: userPrompt,
    flight_details: flightDetails,
    price,
    currency,
    destination,
    extra_notes: extraNotes,
    agency_name: agencyName,
  }, session)

  return {
    subject: buildEmailSubject(emailType, { destination, clientName: salutationName }),
    body: sanitizeEmailBody(rawBody, userPrompt),
  }
}

export function canUseAiEmail(session) {
  return isAiAvailable(session)
}
