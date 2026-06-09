/** Shared hotel rate parsing & comparison — used by API and frontend */

export const HOTEL_EXTRACT_KEYS = [
  'hotel_name',
  'destination',
  'check_in',
  'check_out',
  'nights',
  'guest_details',
  'room_type',
  'room_details',
  'meal_plan',
  'breakfast_included',
  'supplier_platform',
  'supplier_net_rate',
  'supplier_price_per_night',
  'booking_platform',
  'booking_public_rate',
  'booking_price_per_night',
  'cancellation_policy',
  'taxes_and_fees',
  'star_rating',
  'additional_notes',
  'inclusions',
]

export function parseMoneyString(value) {
  if (!value?.trim()) return null
  const raw = value.trim()
  const currencyMatch = raw.match(/[€£$]|EUR|GBP|USD/i)
  const currency = currencyMatch
    ? ({ '€': '€', EUR: '€', '£': '£', GBP: '£', $: '$', USD: '$' }[currencyMatch[0].toUpperCase()] || currencyMatch[0])
    : ''

  const numeric = raw.replace(/[^\d.,]/g, '')
  if (!numeric) return null

  let amount
  if (numeric.includes(',') && numeric.includes('.')) {
    amount = parseFloat(numeric.replace(/,/g, ''))
  } else if (numeric.includes(',')) {
    const parts = numeric.split(',')
    amount = parts[parts.length - 1].length === 2
      ? parseFloat(parts.slice(0, -1).join('') + '.' + parts[parts.length - 1])
      : parseFloat(parts.join(''))
  } else {
    amount = parseFloat(numeric)
  }

  if (Number.isNaN(amount)) return null
  return { amount, currency }
}

export function formatMoney(amount, currency = '€') {
  const formatted = Number(amount).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${currency}${formatted}`
}

function parseNights(value) {
  const n = parseInt(String(value || '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function perNight(total, nights) {
  if (!total || !nights) return null
  return total.amount / nights
}

function buildTravelDates(checkIn, checkOut) {
  if (checkIn && checkOut) return `${checkIn} – ${checkOut}`
  return checkIn || checkOut || ''
}

export function buildComparisonView(extracted, marginPercent = 15) {
  const margin = Number(marginPercent)
  const safeMargin = Number.isFinite(margin) && margin >= 0 ? margin : 15

  const nights = parseNights(extracted.nights)
  const supplierTotal = parseMoneyString(extracted.supplier_net_rate)
  const bookingTotal = parseMoneyString(extracted.booking_public_rate)
  const currency = supplierTotal?.currency || bookingTotal?.currency || '€'

  let supplierPerNight = parseMoneyString(extracted.supplier_price_per_night)
  let bookingPerNight = parseMoneyString(extracted.booking_price_per_night)

  if (!supplierPerNight && supplierTotal && nights) {
    supplierPerNight = { amount: supplierTotal.amount / nights, currency: supplierTotal.currency || currency }
  }
  if (!bookingPerNight && bookingTotal && nights) {
    bookingPerNight = { amount: bookingTotal.amount / nights, currency: bookingTotal.currency || currency }
  }

  let marginAmount = null
  let clientQuoteTotal = null
  let clientQuotePerNight = null
  let savingsVsBooking = null
  let netVsPublicDiff = null

  if (supplierTotal) {
    marginAmount = supplierTotal.amount * (safeMargin / 100)
    clientQuoteTotal = supplierTotal.amount + marginAmount
    if (nights) clientQuotePerNight = clientQuoteTotal / nights
  }

  if (bookingTotal && supplierTotal) {
    netVsPublicDiff = bookingTotal.amount - supplierTotal.amount
  }
  if (bookingTotal && clientQuoteTotal != null) {
    savingsVsBooking = bookingTotal.amount - clientQuoteTotal
  }

  return {
    hotelName: extracted.hotel_name || '',
    destination: extracted.destination || '',
    checkIn: extracted.check_in || '',
    checkOut: extracted.check_out || '',
    nights,
    travelDates: buildTravelDates(extracted.check_in, extracted.check_out) || extracted.travel_dates || '',
    guests: extracted.guest_details || '',
    roomType: extracted.room_type || '',
    roomDetails: extracted.room_details || '',
    mealPlan: extracted.meal_plan || '',
    breakfastIncluded: extracted.breakfast_included || '',
    starRating: extracted.star_rating || '',
    cancellationPolicy: extracted.cancellation_policy || '',
    taxesAndFees: extracted.taxes_and_fees || '',
    additionalNotes: extracted.additional_notes || '',
    supplier: {
      platform: extracted.supplier_platform || 'Supplier',
      total: supplierTotal ? formatMoney(supplierTotal.amount, supplierTotal.currency || currency) : extracted.supplier_net_rate || '',
      perNight: supplierPerNight ? formatMoney(supplierPerNight.amount, supplierPerNight.currency || currency) : '',
      totalRaw: supplierTotal?.amount ?? null,
      perNightRaw: supplierPerNight?.amount ?? null,
    },
    booking: {
      platform: extracted.booking_platform || 'Booking site',
      total: bookingTotal ? formatMoney(bookingTotal.amount, bookingTotal.currency || currency) : extracted.booking_public_rate || '',
      perNight: bookingPerNight ? formatMoney(bookingPerNight.amount, bookingPerNight.currency || currency) : '',
      totalRaw: bookingTotal?.amount ?? null,
      perNightRaw: bookingPerNight?.amount ?? null,
    },
    margin: {
      percent: safeMargin,
      amount: marginAmount != null ? formatMoney(marginAmount, currency) : '',
      amountRaw: marginAmount,
    },
    clientQuote: {
      total: clientQuoteTotal != null ? formatMoney(clientQuoteTotal, currency) : '',
      perNight: clientQuotePerNight != null ? formatMoney(clientQuotePerNight, currency) : '',
      totalRaw: clientQuoteTotal,
      perNightRaw: clientQuotePerNight,
    },
    netVsPublicDiff: netVsPublicDiff != null ? formatMoney(Math.abs(netVsPublicDiff), currency) : '',
    netVsPublicCheaper: netVsPublicDiff != null ? (netVsPublicDiff >= 0 ? 'supplier' : 'booking') : null,
    savingsVsBooking: savingsVsBooking != null && savingsVsBooking > 0
      ? formatMoney(savingsVsBooking, currency)
      : '',
    savingsVsBookingRaw: savingsVsBooking,
    currency,
    hasSupplierRate: Boolean(supplierTotal || extracted.supplier_net_rate),
    hasBookingRate: Boolean(bookingTotal || extracted.booking_public_rate),
  }
}

export function computeHotelQuoteFields(extracted, marginPercent = 15) {
  const view = buildComparisonView(extracted, marginPercent)
  const safeMargin = view.margin.percent

  let priceDifference = ''
  if (view.netVsPublicDiff && view.netVsPublicCheaper) {
    priceDifference = `${view.netVsPublicDiff} ${view.netVsPublicCheaper === 'supplier' ? 'cheaper via supplier' : 'lower on booking site'}`
  }

  const comparisonSummary = [
    view.hotelName && `Hotel: ${view.hotelName}${view.destination ? `, ${view.destination}` : ''}`,
    view.travelDates && `Dates: ${view.travelDates}${view.nights ? ` (${view.nights} night${view.nights === 1 ? '' : 's'})` : ''}`,
    view.roomType && `Room: ${view.roomType}`,
    view.mealPlan && `Board: ${view.mealPlan}`,
    view.breakfastIncluded && `Breakfast: ${view.breakfastIncluded}`,
    '',
    'Price comparison:',
    view.supplier.total && `• Supplier net (${view.supplier.platform}): ${view.supplier.total}${view.supplier.perNight ? ` (${view.supplier.perNight}/night)` : ''}`,
    view.booking.total && `• Public rate (${view.booking.platform}): ${view.booking.total}${view.booking.perNight ? ` (${view.booking.perNight}/night)` : ''}`,
    view.margin.amount && `• Your margin (${safeMargin}%): ${view.margin.amount}`,
    view.clientQuote.total && `• Client quote: ${view.clientQuote.total}${view.clientQuote.perNight ? ` (${view.clientQuote.perNight}/night)` : ''}`,
    view.savingsVsBooking && `• Client saves ${view.savingsVsBooking} vs ${view.booking.platform}`,
    view.cancellationPolicy && `\nCancellation: ${view.cancellationPolicy}`,
  ].filter((line) => line !== undefined && line !== false).join('\n')

  const inclusions = [
    extracted.inclusions,
    view.breakfastIncluded && `Breakfast: ${view.breakfastIncluded}`,
    view.cancellationPolicy && `Cancellation: ${view.cancellationPolicy}`,
    view.taxesAndFees && `Taxes/fees: ${view.taxesAndFees}`,
  ].filter(Boolean).join('\n')

  return {
    ...extracted,
    travel_dates: view.travelDates || extracted.travel_dates || '',
    room_details: [view.roomType, view.roomDetails].filter(Boolean).join(' — ') || extracted.room_details || '',
    margin_percent: String(safeMargin),
    supplier_price_per_night: view.supplier.perNight || extracted.supplier_price_per_night || '',
    booking_price_per_night: view.booking.perNight || extracted.booking_price_per_night || '',
    price_difference: priceDifference,
    margin_amount: view.margin.amount,
    client_quote_price: view.clientQuote.total,
    comparison_summary: comparisonSummary.trim(),
    inclusions: inclusions || extracted.inclusions || '',
  }
}
