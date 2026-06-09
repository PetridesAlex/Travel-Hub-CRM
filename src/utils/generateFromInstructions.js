import { generateEmail } from '../templates/emailTemplates'
import { formatFlightDataForEmail } from './formatFlightEmail'
import { buildRouteLabel } from './parseFlightScreenshot'
import { applyRegenerationInstructions } from './applyRegenerationInstructions'
import { generateEmailWithAI, canUseAiEmail } from './generateEmailWithAI'
import { buildEmailSubject } from '../constants/emailAssistantPrompt'

function formatPriceLine(price, currency) {
  if (!price) return ''
  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : ''
  return sym ? `${sym}${price}` : `${price} ${currency}`
}

function buildStructuredBody({
  emailType,
  clientName,
  introduction,
  detailsHeading,
  details,
  inclusions,
  price,
  currency,
  importantNotes,
  isSupplier = false,
}) {
  const greeting = isSupplier ? 'Dear Supplier,' : `Dear ${clientName},`
  const sections = [greeting, '', introduction]

  if (details?.trim()) {
    sections.push('', detailsHeading, details.trim())
  }

  if (inclusions?.trim()) {
    sections.push('', 'Inclusions', inclusions.trim())
  }

  if (price?.trim()) {
    sections.push('', 'Price', price.trim())
  }

  if (importantNotes?.trim()) {
    sections.push('', 'Important Notes', importantNotes.trim())
  }

  sections.push('', 'Kind Regards,', 'Your Travel Agency Team')
  return sections.join('\n')
}

function buildTemplateEmail({
  emailType,
  clientName,
  userPrompt,
  flightDetails,
  price,
  currency,
  destination,
  extraNotes,
}) {
  const isSupplier = emailType === 'supplier_request'
  const name = clientName.trim() || 'Valued Client'
  const combinedNotes = [userPrompt, extraNotes].filter(Boolean).join('\n\n')

  const templateConfig = {
    flight_offer: {
      detailsHeading: 'Flight Details',
      introduction: `Thank you for your enquiry. Please find below our flight quotation${destination ? ` for ${destination}` : ''}.`,
      details: flightDetails || combinedNotes,
      inclusions: flightDetails ? combinedNotes : '',
      price: price ? formatPriceLine(price, currency) : '',
      importantNotes: 'Fares are subject to change until ticketed. Please confirm if you wish to proceed.',
    },
    cruise_offer: {
      detailsHeading: 'Cruise Details',
      introduction: `Thank you for your interest. We are pleased to present the following cruise offer${destination ? ` for ${destination}` : ''}.`,
      details: combinedNotes || destination || '',
      inclusions: '',
      price: price ? `From ${formatPriceLine(price, currency)} per person` : '',
      importantNotes: 'Cabins are subject to availability. Please contact us to secure your booking.',
    },
    hotel_offer: {
      detailsHeading: 'Hotel Details',
      introduction: `Thank you for your enquiry. Please find our hotel quotation below${destination ? ` for ${destination}` : ''}.`,
      details: combinedNotes || destination || '',
      inclusions: '',
      price: price ? formatPriceLine(price, currency) : '',
      importantNotes: 'Rates are subject to availability at the time of booking.',
    },
    supplier_request: {
      detailsHeading: 'Request Details',
      introduction: 'We would like to request availability and pricing for the following:',
      details: [destination && `Location: ${destination}`, combinedNotes].filter(Boolean).join('\n'),
      inclusions: '',
      price: '',
      importantNotes: 'Please include cancellation policy and confirm availability at your earliest convenience.',
      isSupplier: true,
    },
    payment_reminder: {
      detailsHeading: 'Payment Details',
      introduction: 'I hope this message finds you well. This is a friendly reminder regarding an upcoming payment for your booking.',
      details: price ? `Amount due: ${formatPriceLine(price, currency)}` : combinedNotes,
      inclusions: '',
      price: '',
      importantNotes: 'If you have already made this payment, please disregard this message. Kindly arrange payment at your earliest convenience to secure your booking.',
    },
  }

  const config = templateConfig[emailType] || templateConfig.flight_offer

  const body = buildStructuredBody({
    emailType,
    clientName: name,
    introduction: config.introduction,
    detailsHeading: config.detailsHeading,
    details: config.details,
    inclusions: config.inclusions,
    price: config.price,
    currency,
    importantNotes: config.importantNotes,
    isSupplier: config.isSupplier,
  })

  return {
    subject: buildEmailSubject(emailType, { destination, clientName: name }),
    body,
  }
}

/**
 * Build email from screenshot data, free-text instructions, or both.
 */
export async function buildEmailFromInput({
  emailType = 'flight_offer',
  clientName = 'Valued Client',
  userPrompt = '',
  flightData = null,
  price = '',
  currency = 'EUR',
  destination = '',
  extraNotes = '',
  session = null,
}) {
  const flightDetails = flightData
    ? formatFlightDataForEmail({
        ...flightData,
        totalPrice: price || flightData.totalPrice,
        currency: currency || flightData.currency,
      })
    : ''

  const route = destination || (flightData ? buildRouteLabel(flightData) : '')

  const source = {
    emailType,
    clientName,
    userPrompt,
    flightData,
    price,
    currency,
    destination: route,
    extraNotes,
  }

  if (canUseAiEmail(session)) {
    try {
      return await generateEmailWithAI({ ...source, destination: route }, session)
    } catch (err) {
      console.warn('AI email generation failed, using template fallback:', err)
    }
  }

  return buildTemplateEmail({
    emailType,
    clientName,
    userPrompt,
    flightDetails,
    price,
    currency,
    destination: route,
    extraNotes,
  })
}

/**
 * Regenerate: apply instructions to the current email, or rebuild from source.
 */
export async function regenerateEmail(source, regenInstruction = '', currentEmail = {}, session = null) {
  const freshEmail = await buildEmailFromInput({ ...source, session })

  if (!regenInstruction.trim()) {
    return freshEmail
  }

  return applyRegenerationInstructions({
    subject: currentEmail.subject || freshEmail.subject,
    body: currentEmail.body || freshEmail.body,
    instruction: regenInstruction,
    freshEmail,
  })
}

/** @deprecated use buildEmailFromInput — kept for legacy template helper */
export function buildEmailFromTemplate(type, data) {
  return generateEmail(type, data)
}
