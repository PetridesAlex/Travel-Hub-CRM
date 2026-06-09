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
  'supplier_net_amount',
  'supplier_price_per_night',
  'supplier_per_night_amount',
  'booking_platform',
  'booking_public_rate',
  'booking_public_amount',
  'booking_price_per_night',
  'booking_per_night_amount',
  'cancellation_policy',
  'taxes_and_fees',
  'star_rating',
  'additional_notes',
  'inclusions',
]

/** Typical hotel stay bounds — used to reject OCR / parsing mistakes */
export const HOTEL_PRICE_MIN = 20
export const HOTEL_PRICE_MAX = 75000
export const HOTEL_PER_NIGHT_MIN = 15
export const HOTEL_PER_NIGHT_MAX = 12000

function detectCurrency(raw) {
  const currencyMatch = raw.match(/[€£$]|EUR|GBP|USD/i)
  if (!currencyMatch) return '€'
  const token = currencyMatch[0].toUpperCase()
  return ({ '€': '€', EUR: '€', '£': '£', GBP: '£', $: '$', USD: '$' })[token] || currencyMatch[0]
}

/** Parse locale-aware amount from digits + comma/dot only */
export function parseLocalizedAmount(numeric) {
  if (!numeric) return null

  const lastComma = numeric.lastIndexOf(',')
  const lastDot = numeric.lastIndexOf('.')

  if (lastComma === -1 && lastDot === -1) {
    const amount = parseFloat(numeric)
    return Number.isNaN(amount) ? null : amount
  }

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // European: 1.234,56
      return parseFloat(numeric.replace(/\./g, '').replace(',', '.'))
    }
    // US/UK: 1,234.56
    return parseFloat(numeric.replace(/,/g, ''))
  }

  if (lastComma !== -1) {
    const after = numeric.slice(lastComma + 1)
    if (after.length === 2) {
      // Decimal comma: 345,72 or 3.457,72 already handled above
      const before = numeric.slice(0, lastComma).replace(/,/g, '')
      return parseFloat(`${before}.${after}`)
    }
    // Comma-only groups — could be thousands (3,457) or misread
    return parseFloat(numeric.replace(/,/g, ''))
  }

  // Dot only
  const after = numeric.slice(lastDot + 1)
  const dots = (numeric.match(/\./g) || []).length
  if (dots > 1) {
    // European thousands dots: 3.457.728
    return parseFloat(numeric.replace(/\./g, ''))
  }
  if (after.length === 2) {
    // Decimal dot: 345.72
    return parseFloat(numeric)
  }
  if (after.length === 3) {
    // Ambiguous: 345.728 could be €345728 (EU thousands) or misread €345.72
    // Prefer thousands interpretation only if result is plausible for hotels
    const asThousands = parseFloat(numeric.replace(/\./g, ''))
    const asDecimal = parseFloat(numeric)
    if (asDecimal >= HOTEL_PRICE_MIN && asDecimal <= HOTEL_PRICE_MAX) return asDecimal
    if (asThousands >= HOTEL_PRICE_MIN && asThousands <= HOTEL_PRICE_MAX) return asThousands
    return asDecimal
  }
  return parseFloat(numeric)
}

export function parseMoneyString(value) {
  if (!value?.trim()) return null
  const raw = value.trim()
  const currency = detectCurrency(raw)
  const numeric = raw.replace(/[^\d.,]/g, '')
  if (!numeric) return null

  const amount = parseLocalizedAmount(numeric)
  if (amount == null || Number.isNaN(amount)) return null
  return { amount, currency }
}

/** Parse plain numeric amount from AI (no currency symbols) */
export function parsePlainAmount(value) {
  if (value == null || value === '') return null
  const raw = String(value).trim().replace(/[^\d.,]/g, '')
  if (!raw) return null
  const amount = parseLocalizedAmount(raw)
  if (amount == null || Number.isNaN(amount)) return null
  return amount
}

function inRange(amount, min, max) {
  return amount >= min && amount <= max
}

/** Try to salvage mis-parsed hotel prices */
export function sanitiseHotelAmount(amount, kind = 'total') {
  if (amount == null || amount <= 0) return null
  const min = kind === 'perNight' ? HOTEL_PER_NIGHT_MIN : HOTEL_PRICE_MIN
  const max = kind === 'perNight' ? HOTEL_PER_NIGHT_MAX : HOTEL_PRICE_MAX

  if (inRange(amount, min, max)) return amount

  // Huge values are almost always comma/parsing errors — try larger divisors first
  const divisors = amount > max * 50
    ? [100000, 10000, 1000, 100]
    : [100, 1000, 10000, 100000]

  for (const d of divisors) {
    const candidate = amount / d
    if (inRange(candidate, min, max)) return candidate
  }
  return null
}

export function parseHotelPrice(value, kind = 'total', currency = '€') {
  if (value == null || value === '') return null

  let amount
  let detectedCurrency = currency

  if (typeof value === 'number') {
    amount = value
  } else {
    const str = String(value).trim()
    const plain = parsePlainAmount(str)
    const money = parseMoneyString(str)
    amount = plain ?? money?.amount
    if (money?.currency) detectedCurrency = money.currency
  }

  if (amount == null || Number.isNaN(amount)) return null
  const sanitised = sanitiseHotelAmount(amount, kind)
  if (sanitised == null) return null

  return {
    amount: sanitised,
    currency: detectedCurrency,
    corrected: sanitised !== amount,
  }
}

const RATE_PAIRS = [
  { totalKey: 'supplier_net_rate', amountKey: 'supplier_net_amount', perNightKey: 'supplier_price_per_night', perNightAmountKey: 'supplier_per_night_amount' },
  { totalKey: 'booking_public_rate', amountKey: 'booking_public_amount', perNightKey: 'booking_price_per_night', perNightAmountKey: 'booking_per_night_amount' },
]

/** Prefer plain numeric AI amounts; cross-check totals vs per-night × nights */
export function normalizeExtractedPrices(extracted) {
  const nights = parseNights(extracted.nights)
  const result = { ...extracted }
  const warnings = []

  for (const pair of RATE_PAIRS) {
    let total = parseHotelPrice(extracted[pair.amountKey], 'total')
      || parseHotelPrice(extracted[pair.totalKey], 'total')

    let perNight = parseHotelPrice(extracted[pair.perNightAmountKey], 'perNight')
      || parseHotelPrice(extracted[pair.perNightKey], 'perNight')

    if (total?.corrected || perNight?.corrected) {
      warnings.push(`Adjusted ${pair.totalKey} — original value looked incorrect`)
    }

    if (total && perNight && nights) {
      const expected = perNight.amount * nights
      const ratio = Math.abs(total.amount - expected) / Math.max(expected, 1)
      if (ratio > 0.12) {
        if (total.amount > HOTEL_PRICE_MAX && inRange(perNight.amount, HOTEL_PER_NIGHT_MIN, HOTEL_PER_NIGHT_MAX)) {
          total = { amount: expected, currency: perNight.currency, corrected: true }
          warnings.push(`Used per-night × ${nights} nights instead of misread total`)
        } else if (perNight.amount > HOTEL_PER_NIGHT_MAX && inRange(total.amount, HOTEL_PRICE_MIN, HOTEL_PRICE_MAX)) {
          perNight = { amount: total.amount / nights, currency: total.currency, corrected: true }
        }
      }
    } else if (!total && perNight && nights) {
      total = { amount: perNight.amount * nights, currency: perNight.currency }
    } else if (total && !perNight && nights) {
      perNight = { amount: total.amount / nights, currency: total.currency }
    }

    if (total) {
      result[pair.totalKey] = formatMoney(total.amount, total.currency)
      result[pair.amountKey] = String(Math.round(total.amount * 100) / 100)
    } else if (extracted[pair.totalKey]) {
      warnings.push(`Could not parse ${pair.totalKey}: "${extracted[pair.totalKey]}" — check screenshot or edit manually`)
      result[pair.totalKey] = extracted[pair.totalKey]
    }

    if (perNight) {
      result[pair.perNightKey] = formatMoney(perNight.amount, perNight.currency)
      result[pair.perNightAmountKey] = String(Math.round(perNight.amount * 100) / 100)
    }
  }

  result._priceWarnings = warnings
  return result
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

function buildTravelDates(checkIn, checkOut) {
  if (checkIn && checkOut) return `${checkIn} – ${checkOut}`
  return checkIn || checkOut || ''
}

export function buildComparisonView(extracted, marginPercent = 15) {
  const normalized = normalizeExtractedPrices(extracted)
  const margin = Number(marginPercent)
  const safeMargin = Number.isFinite(margin) && margin >= 0 ? margin : 15

  const nights = parseNights(normalized.nights)
  const supplierTotal = parseHotelPrice(normalized.supplier_net_amount, 'total')
    || parseHotelPrice(normalized.supplier_net_rate, 'total')
  const bookingTotal = parseHotelPrice(normalized.booking_public_amount, 'total')
    || parseHotelPrice(normalized.booking_public_rate, 'total')
  const currency = supplierTotal?.currency || bookingTotal?.currency || '€'

  let supplierPerNight = parseHotelPrice(normalized.supplier_per_night_amount, 'perNight')
    || parseHotelPrice(normalized.supplier_price_per_night, 'perNight')
  let bookingPerNight = parseHotelPrice(normalized.booking_per_night_amount, 'perNight')
    || parseHotelPrice(normalized.booking_price_per_night, 'perNight')

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
    hotelName: normalized.hotel_name || '',
    destination: normalized.destination || '',
    checkIn: normalized.check_in || '',
    checkOut: normalized.check_out || '',
    nights,
    travelDates: buildTravelDates(normalized.check_in, normalized.check_out) || normalized.travel_dates || '',
    guests: normalized.guest_details || '',
    roomType: normalized.room_type || '',
    roomDetails: normalized.room_details || '',
    mealPlan: normalized.meal_plan || '',
    breakfastIncluded: normalized.breakfast_included || '',
    starRating: normalized.star_rating || '',
    cancellationPolicy: normalized.cancellation_policy || '',
    taxesAndFees: normalized.taxes_and_fees || '',
    additionalNotes: normalized.additional_notes || '',
    priceWarnings: normalized._priceWarnings || [],
    supplier: {
      platform: normalized.supplier_platform || 'Supplier',
      total: supplierTotal ? formatMoney(supplierTotal.amount, supplierTotal.currency || currency) : '',
      perNight: supplierPerNight ? formatMoney(supplierPerNight.amount, supplierPerNight.currency || currency) : '',
      totalRaw: supplierTotal?.amount ?? null,
      perNightRaw: supplierPerNight?.amount ?? null,
      rawExtracted: extracted.supplier_net_rate || '',
    },
    booking: {
      platform: normalized.booking_platform || 'Booking site',
      total: bookingTotal ? formatMoney(bookingTotal.amount, bookingTotal.currency || currency) : '',
      perNight: bookingPerNight ? formatMoney(bookingPerNight.amount, bookingPerNight.currency || currency) : '',
      totalRaw: bookingTotal?.amount ?? null,
      perNightRaw: bookingPerNight?.amount ?? null,
      rawExtracted: extracted.booking_public_rate || '',
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
    hasSupplierRate: Boolean(supplierTotal),
    hasBookingRate: Boolean(bookingTotal),
  }
}

export function computeHotelQuoteFields(extracted, marginPercent = 15) {
  const view = buildComparisonView(extracted, marginPercent)
  const safeMargin = view.margin.percent
  const normalized = normalizeExtractedPrices(extracted)

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
    normalized.inclusions,
    view.breakfastIncluded && `Breakfast: ${view.breakfastIncluded}`,
    view.cancellationPolicy && `Cancellation: ${view.cancellationPolicy}`,
    view.taxesAndFees && `Taxes/fees: ${view.taxesAndFees}`,
  ].filter(Boolean).join('\n')

  const { _priceWarnings, ...cleanNormalized } = normalized

  return {
    ...cleanNormalized,
    travel_dates: view.travelDates || extracted.travel_dates || '',
    room_details: [view.roomType, view.roomDetails].filter(Boolean).join(' — ') || extracted.room_details || '',
    margin_percent: String(safeMargin),
    supplier_price_per_night: view.supplier.perNight || '',
    booking_price_per_night: view.booking.perNight || '',
    price_difference: priceDifference,
    margin_amount: view.margin.amount,
    client_quote_price: view.clientQuote.total,
    comparison_summary: comparisonSummary.trim(),
    inclusions: inclusions || extracted.inclusions || '',
  }
}
