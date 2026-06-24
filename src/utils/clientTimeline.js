import { parseISO, isValid } from 'date-fns'
import { labelFor } from './format'
import { TRAVEL_TYPES } from '../constants/enums'

const TYPE_LABELS = new Set(['cruise', 'honeymoon', 'school_trip', 'group'])

function yearFromDate(value) {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return null
  return date.getFullYear()
}

function resolveDestination({ destination, travelType, title }) {
  const dest = destination?.trim()
  if (dest) return dest

  if (travelType && TYPE_LABELS.has(travelType)) {
    return labelFor(TRAVEL_TYPES, travelType)
  }

  const cleanTitle = title?.trim()
  if (cleanTitle && cleanTitle.length <= 60) return cleanTitle

  return null
}

function bookingLabel(booking) {
  const quote = booking.quotations
  const lead = quote?.leads || booking.leads
  return (
    resolveDestination({
      destination: quote?.destination || lead?.destination,
      travelType: lead?.travel_type,
      title: quote?.title,
    })
    || booking.booking_reference
    || 'Trip'
  )
}

function quotationLabel(quote) {
  const lead = quote.leads
  return (
    resolveDestination({
      destination: quote.destination,
      travelType: lead?.travel_type,
      title: quote.title,
    })
    || 'Quotation'
  )
}

function leadLabel(lead) {
  return (
    resolveDestination({
      destination: lead.destination,
      travelType: lead.travel_type,
    })
    || 'Inquiry'
  )
}

/**
 * Build a chronological travel timeline from bookings, quotations, and leads.
 * Bookings take priority; quotations without bookings and unmatched leads fill gaps.
 */
export function buildClientTimeline({ leads = [], quotations = [], bookings = [] } = {}) {
  const entries = []
  const bookedQuotationIds = new Set()
  const quotedLeadIds = new Set()

  const activeBookings = bookings.filter((b) => b.status !== 'cancelled')

  for (const booking of activeBookings) {
    if (booking.quotation_id) bookedQuotationIds.add(booking.quotation_id)

    const year = yearFromDate(booking.travel_start_date) || yearFromDate(booking.created_at)
    entries.push({
      id: `booking-${booking.id}`,
      sourceId: booking.id,
      sourceType: 'booking',
      year,
      label: bookingLabel(booking),
      status: booking.status,
      sortDate: booking.travel_start_date || booking.created_at,
      meta: booking.booking_reference ? `Ref ${booking.booking_reference}` : null,
    })
  }

  for (const quote of quotations) {
    if (bookedQuotationIds.has(quote.id)) continue
    if (!['sent', 'accepted'].includes(quote.status)) continue

    if (quote.lead_id) quotedLeadIds.add(quote.lead_id)

    const year = yearFromDate(quote.created_at)
    entries.push({
      id: `quotation-${quote.id}`,
      sourceId: quote.id,
      sourceType: 'quotation',
      year,
      label: quotationLabel(quote),
      status: quote.status,
      sortDate: quote.created_at,
      meta: quote.selling_price != null ? `Quote ${Number(quote.selling_price).toLocaleString('en-EU')} ${quote.currency || 'EUR'}` : null,
    })
  }

  for (const lead of leads) {
    if (quotedLeadIds.has(lead.id)) continue
    if (lead.status === 'lost') continue
    if (!lead.destination?.trim() && !TYPE_LABELS.has(lead.travel_type)) continue

    const year = yearFromDate(lead.created_at)
    entries.push({
      id: `lead-${lead.id}`,
      sourceId: lead.id,
      sourceType: 'lead',
      year,
      label: leadLabel(lead),
      status: lead.status,
      sortDate: lead.created_at,
      meta: 'Inquiry',
    })
  }

  return entries.sort((a, b) => {
    const yearDiff = (b.year || 0) - (a.year || 0)
    if (yearDiff !== 0) return yearDiff
    return String(b.sortDate || '').localeCompare(String(a.sortDate || ''))
  })
}

export function buildClientInsights({ leads = [], quotations = [], bookings = [] } = {}) {
  const sentQuotations = quotations.filter((q) => ['sent', 'accepted'].includes(q.status))
  const revenueBookings = bookings.filter((b) =>
    ['confirmed', 'completed'].includes(b.status),
  )

  const lifetimeSpend = revenueBookings.reduce(
    (sum, b) => sum + Number(b.amount_paid || b.total_cost || 0),
    0,
  )

  const completedTrips = bookings.filter((b) =>
    b.status === 'completed' || (b.status === 'confirmed' && b.travel_start_date),
  ).length

  const activeLeads = leads.filter((l) => !['confirmed', 'lost'].includes(l.status)).length

  const primaryCurrency = quotations.find((q) => q.currency)?.currency
    || 'EUR'

  return {
    quotationsSent: sentQuotations.length,
    totalQuotations: quotations.length,
    lifetimeSpend,
    currency: primaryCurrency,
    completedTrips,
    activeLeads,
    isRepeatTraveler: completedTrips >= 2,
  }
}
