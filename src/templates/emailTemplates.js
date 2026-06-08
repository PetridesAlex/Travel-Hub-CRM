import { buildEmailSubject } from '../constants/emailAssistantPrompt'

function formatPrice(price, currency) {
  if (!price) return ''
  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : ''
  return sym ? `${sym}${price}` : `${price} ${currency}`
}

export function generateEmail(type, data) {
  const {
    clientName: rawClientName = 'Valued Client',
    destination = '',
    price = '',
    currency = 'EUR',
    notes = '',
    packageDetails = '',
    flightDetails = '',
  } = data
  const clientName = rawClientName.trim() || 'Valued Client'
  const content = packageDetails || notes || destination || ''

  const templates = {
    flight_offer: {
      subject: buildEmailSubject('flight_offer', { destination }),
      body: `Dear ${clientName},

Thank you for your enquiry. Please find below our flight quotation${destination ? ` for ${destination}` : ''}.

Flight Details
${flightDetails || content || 'As per your request.'}

${notes ? `Inclusions\n${notes}\n` : ''}${price ? `Price\n${formatPrice(price, currency)}\n` : ''}
Important Notes
Fares are subject to change until ticketed. Please confirm if you wish to proceed.

Kind Regards,
Your Travel Agency Team`,
    },
    cruise_offer: {
      subject: buildEmailSubject('cruise_offer', { destination }),
      body: `Dear ${clientName},

Thank you for your interest. We are pleased to present the following cruise offer${destination ? ` for ${destination}` : ''}.

Cruise Details
${content || 'As per your request.'}

${price ? `Price\nFrom ${formatPrice(price, currency)} per person\n` : ''}
Important Notes
Cabins are subject to availability. Please contact us to secure your booking.

Kind Regards,
Your Travel Agency Team`,
    },
    hotel_offer: {
      subject: buildEmailSubject('hotel_offer', { destination }),
      body: `Dear ${clientName},

Thank you for your enquiry. Please find our hotel quotation below${destination ? ` for ${destination}` : ''}.

Hotel Details
${content || 'As per your request.'}

${price ? `Price\n${formatPrice(price, currency)}\n` : ''}
Important Notes
Rates are subject to availability at the time of booking.

Kind Regards,
Your Travel Agency Team`,
    },
    supplier_request: {
      subject: buildEmailSubject('supplier_request', { destination }),
      body: `Dear Supplier,

We would like to request availability and pricing for the following:

Request Details
${destination ? `Location: ${destination}\n` : ''}${content || 'Please see requirements below.'}

Important Notes
Please include cancellation policy and confirm availability at your earliest convenience.

Kind Regards,
Your Travel Agency Team`,
    },
    payment_reminder: {
      subject: buildEmailSubject('payment_reminder', { clientName }),
      body: `Dear ${clientName},

I hope this message finds you well. This is a friendly reminder regarding an upcoming payment for your booking.

Payment Details
${price ? `Amount due: ${formatPrice(price, currency)}` : content || 'Please refer to your booking confirmation.'}

Important Notes
If you have already made this payment, please disregard this message. Kindly arrange payment at your earliest convenience.

Kind Regards,
Your Travel Agency Team`,
    },
    // Legacy aliases
    hotel_request: {
      subject: buildEmailSubject('hotel_offer', { destination }),
      body: `Dear Supplier,

We would like to request hotel availability and rates:

Request Details
${destination ? `Location: ${destination}\n` : ''}${content || 'Standard room request.'}

Important Notes
Please include cancellation policy and meal plan options.

Kind Regards,
Travel Agency Team`,
    },
    client_offer: {
      subject: buildEmailSubject('flight_offer', { destination }),
      body: `Dear ${clientName},

Thank you for your interest in travelling with us.

Introduction
${content || 'We are pleased to offer you the following travel arrangement.'}

${price ? `Price\n${formatPrice(price, currency)}\n` : ''}
Important Notes
This offer is subject to availability. Please let us know if you would like to proceed.

Kind Regards,
Your Travel Agency Team`,
    },
    follow_up: {
      subject: 'Following Up on Your Travel Enquiry',
      body: `Dear ${clientName},

I hope this message finds you well. I wanted to follow up on your recent travel enquiry${destination ? ` regarding ${destination}` : ''}.

Introduction
${notes || 'Please let me know if you have any questions or if you would like to discuss the options we prepared for you.'}

Important Notes
I look forward to hearing from you.

Kind Regards,
Your Travel Agency Team`,
    },
  }

  return templates[type] || templates.flight_offer
}
