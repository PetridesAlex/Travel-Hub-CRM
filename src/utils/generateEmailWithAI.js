import { generateTravelEmail, isAiAvailable } from '../services/aiAssist'
import { buildEmailSubject } from '../constants/emailAssistantPrompt'
import { formatFlightDataForEmail } from './formatFlightEmail'

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
  } = source

  const flightDetails = flightData
    ? formatFlightDataForEmail({
        ...flightData,
        totalPrice: price || flightData.totalPrice,
        currency: currency || flightData.currency,
      })
    : ''

  const body = await generateTravelEmail(emailType, {
    client_name: clientName,
    user_prompt: userPrompt,
    flight_details: flightDetails,
    price,
    currency,
    destination,
    extra_notes: extraNotes,
  }, session)

  return {
    subject: buildEmailSubject(emailType, { destination, clientName }),
    body,
  }
}

export function canUseAiEmail(session) {
  return isAiAvailable(session)
}
