import { formatMoney, parseHotelPrice } from './hotelRateComparison.js'

function parseCount(value, fallback = 1) {
  const n = parseInt(String(value || '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function parseHotelTotal(input, prefix) {
  const totalKey = `${prefix}_total`
  const perNightKey = `${prefix}_per_night`
  const nights = parseCount(input.nights, 1)

  let total = parseHotelPrice(input[totalKey], 'total')
  let perNight = parseHotelPrice(input[perNightKey], 'perNight')

  if (!total && perNight) {
    total = { amount: perNight.amount * nights, currency: perNight.currency }
  } else if (total && !perNight && nights) {
    perNight = { amount: total.amount / nights, currency: total.currency }
  }

  return {
    name: input[`${prefix}_name`] || '',
    room: input[`${prefix}_room`] || '',
    mealPlan: input[`${prefix}_meal_plan`] || '',
    total,
    perNight,
    totalRaw: total?.amount ?? null,
    perNightRaw: perNight?.amount ?? null,
    currency: total?.currency || perNight?.currency || '€',
  }
}

function perPerson(amount, passengers) {
  if (amount == null || !passengers) return null
  return amount / passengers
}

export function parseExtraServices(input = {}) {
  const raw = input.extra_services
  if (Array.isArray(raw)) {
    return raw.filter((s) => s && (s.category || s.name || s.cost))
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function buildServiceLine(service, passengers, currency) {
  const parsed = parseHotelPrice(service.cost, 'total', currency)
  const label = [service.category, service.name].filter(Boolean).join(' — ') || service.category || 'Service'
  const perPersonRaw = parsed?.amount != null ? perPerson(parsed.amount, passengers) : null

  return {
    id: service.id,
    category: service.category || 'Other',
    name: service.name || '',
    label,
    cost: parsed?.amount != null ? formatMoney(parsed.amount, parsed.currency || currency) : '',
    costRaw: parsed?.amount ?? null,
    perPerson: perPersonRaw != null ? formatMoney(perPersonRaw, parsed?.currency || currency) : '',
    perPersonRaw,
    currency: parsed?.currency || currency,
  }
}

export function buildPackageCostingView(input = {}) {
  const nights = parseCount(input.nights, 1)
  const passengers = parseCount(input.passengers, 1)
  const rooms = parseCount(input.rooms, 1)
  const markupPercent = Number(input.markup_percent)
  const safeMarkup = Number.isFinite(markupPercent) && markupPercent >= 0 ? markupPercent : 15

  const hotelA = parseHotelTotal(input, 'hotel_a')
  const hotelB = parseHotelTotal(input, 'hotel_b')
  const currency = hotelA.currency || hotelB.currency || '€'

  const hotelAPerPerson = hotelA.totalRaw != null ? perPerson(hotelA.totalRaw, passengers) : null
  const hotelBPerPerson = hotelB.totalRaw != null ? perPerson(hotelB.totalRaw, passengers) : null

  let recommended = null
  let costSaving = null

  if (hotelA.totalRaw != null && hotelB.totalRaw != null) {
    if (hotelA.totalRaw < hotelB.totalRaw) {
      recommended = 'A'
      costSaving = hotelB.totalRaw - hotelA.totalRaw
    } else if (hotelB.totalRaw < hotelA.totalRaw) {
      recommended = 'B'
      costSaving = hotelA.totalRaw - hotelB.totalRaw
    } else {
      recommended = 'A'
      costSaving = 0
    }
  } else if (hotelA.totalRaw != null) {
    recommended = 'A'
  } else if (hotelB.totalRaw != null) {
    recommended = 'B'
  }

  const selectedKey = input.selected_hotel === 'B' ? 'B' : input.selected_hotel === 'A' ? 'A' : recommended
  const selectedHotel = selectedKey === 'B' ? hotelB : hotelA
  const hotelNetCost = selectedHotel.totalRaw

  const extraServices = parseExtraServices(input).map((s) => buildServiceLine(s, passengers, currency))
  const servicesTotalRaw = extraServices.reduce((sum, s) => sum + (s.costRaw || 0), 0)
  const packageNetCost = (hotelNetCost || 0) + servicesTotalRaw

  let markupAmount = null
  let sellingPrice = null
  let sellingPerPerson = null
  let profit = null
  let marginPercent = null

  if (packageNetCost > 0) {
    markupAmount = packageNetCost * (safeMarkup / 100)
    sellingPrice = packageNetCost + markupAmount
    sellingPerPerson = perPerson(sellingPrice, passengers)
    profit = markupAmount
    marginPercent = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0
  }

  const recommendedLabel = recommended
    ? recommended === 'A'
      ? `Option A — ${hotelA.name || 'Hotel A'}`
      : `Option B — ${hotelB.name || 'Hotel B'}`
    : ''

  const servicesBreakdown = extraServices
    .filter((s) => s.costRaw != null)
    .map((s) => `• ${s.label}: ${s.cost}${s.perPerson ? ` (${s.perPerson}/person)` : ''}`)
    .join('\n')

  return {
    packageName: input.package_name || '',
    travelDates: input.travel_dates || '',
    passengers,
    rooms,
    nights,
    hotelA: {
      ...hotelA,
      perPerson: hotelAPerPerson != null ? formatMoney(hotelAPerPerson, currency) : '',
      perPersonRaw: hotelAPerPerson,
      total: hotelA.totalRaw != null ? formatMoney(hotelA.totalRaw, currency) : '',
      perNight: hotelA.perNightRaw != null ? formatMoney(hotelA.perNightRaw, currency) : '',
    },
    hotelB: {
      ...hotelB,
      perPerson: hotelBPerPerson != null ? formatMoney(hotelBPerPerson, currency) : '',
      perPersonRaw: hotelBPerPerson,
      total: hotelB.totalRaw != null ? formatMoney(hotelB.totalRaw, currency) : '',
      perNight: hotelB.perNightRaw != null ? formatMoney(hotelB.perNightRaw, currency) : '',
    },
    extraServices,
    servicesTotal: servicesTotalRaw > 0 ? formatMoney(servicesTotalRaw, currency) : '',
    servicesTotalRaw,
    servicesBreakdown,
    recommended,
    recommendedLabel,
    costSaving: costSaving != null && costSaving > 0 ? formatMoney(costSaving, currency) : '',
    costSavingRaw: costSaving,
    selectedHotel: selectedKey,
    selectedHotelName: selectedHotel.name || (selectedKey === 'B' ? 'Hotel B' : 'Hotel A'),
    hotelNetCost: hotelNetCost != null ? formatMoney(hotelNetCost, currency) : '',
    hotelNetCostRaw: hotelNetCost,
    packageNetCost: packageNetCost > 0 ? formatMoney(packageNetCost, currency) : '',
    packageNetCostRaw: packageNetCost > 0 ? packageNetCost : null,
    markup: {
      percent: safeMarkup,
      amount: markupAmount != null ? formatMoney(markupAmount, currency) : '',
      amountRaw: markupAmount,
    },
    supplierCost: packageNetCost > 0 ? formatMoney(packageNetCost, currency) : '',
    supplierCostRaw: packageNetCost > 0 ? packageNetCost : null,
    sellingPrice: sellingPrice != null ? formatMoney(sellingPrice, currency) : '',
    sellingPriceRaw: sellingPrice,
    sellingPerPerson: sellingPerPerson != null ? formatMoney(sellingPerPerson, currency) : '',
    sellingPerPersonRaw: sellingPerPerson,
    profit: profit != null ? formatMoney(profit, currency) : '',
    profitRaw: profit,
    marginPercent: marginPercent != null ? `${marginPercent.toFixed(1)}%` : '',
    marginPercentRaw: marginPercent,
    currency,
    hasHotelA: hotelA.totalRaw != null,
    hasHotelB: hotelB.totalRaw != null,
    hasServices: extraServices.some((s) => s.costRaw != null),
    hasPackageTotal: packageNetCost > 0,
  }
}

export function computePackageCostingFields(input = {}) {
  const view = buildPackageCostingView(input)

  const comparisonSummary = [
    view.packageName && `Package: ${view.packageName}`,
    view.travelDates && `Dates: ${view.travelDates}`,
    `Group: ${view.passengers} pax · ${view.rooms} room${view.rooms === 1 ? '' : 's'} · ${view.nights} night${view.nights === 1 ? '' : 's'}`,
    '',
    'Hotel comparison (like-for-like):',
    view.hasHotelA && `• Option A — ${view.hotelA.name || 'Hotel A'}: ${view.hotelA.total}${view.hotelA.perNight ? ` (${view.hotelA.perNight}/night)` : ''}${view.hotelA.perPerson ? ` · ${view.hotelA.perPerson}/person` : ''}`,
    view.hotelA.room && `  Room: ${view.hotelA.room}${view.hotelA.mealPlan ? ` · ${view.hotelA.mealPlan}` : ''}`,
    view.hasHotelB && `• Option B — ${view.hotelB.name || 'Hotel B'}: ${view.hotelB.total}${view.hotelB.perNight ? ` (${view.hotelB.perNight}/night)` : ''}${view.hotelB.perPerson ? ` · ${view.hotelB.perPerson}/person` : ''}`,
    view.hotelB.room && `  Room: ${view.hotelB.room}${view.hotelB.mealPlan ? ` · ${view.hotelB.mealPlan}` : ''}`,
    view.recommendedLabel && view.costSaving && `→ Recommended: ${view.recommendedLabel} (saves ${view.costSaving})`,
    view.hasServices && '',
    view.hasServices && 'Additional services:',
    view.servicesBreakdown,
    view.hasServices && view.servicesTotal && `Services subtotal: ${view.servicesTotal}`,
    '',
    'Package selling price:',
    view.hotelNetCost && `• Selected hotel net (${view.selectedHotelName}): ${view.hotelNetCost}`,
    view.servicesTotal && `• Additional services: ${view.servicesTotal}`,
    view.packageNetCost && `• Total package net: ${view.packageNetCost}`,
    view.markup.amount && `• Markup (${view.markup.percent}%): ${view.markup.amount}`,
    view.sellingPrice && `• Selling price: ${view.sellingPrice}${view.sellingPerPerson ? ` (${view.sellingPerPerson}/person)` : ''}`,
    view.profit && `• Profit: ${view.profit}${view.marginPercent ? ` · Margin: ${view.marginPercent}` : ''}`,
  ].filter((line) => line !== undefined && line !== false).join('\n')

  return {
    ...input,
    extra_services: parseExtraServices(input),
    nights: String(view.nights),
    passengers: String(view.passengers),
    rooms: String(view.rooms),
    markup_percent: String(view.markup.percent),
    selected_hotel: view.selectedHotel || input.selected_hotel || '',
    hotel_a_per_night: view.hotelA.perNight || input.hotel_a_per_night || '',
    hotel_a_per_person: view.hotelA.perPerson || input.hotel_a_per_person || '',
    hotel_b_per_night: view.hotelB.perNight || input.hotel_b_per_night || '',
    hotel_b_per_person: view.hotelB.perPerson || input.hotel_b_per_person || '',
    recommended_option: view.recommendedLabel || '',
    cost_saving: view.costSaving || '',
    hotel_net_cost: view.hotelNetCost || '',
    services_total: view.servicesTotal || '',
    services_breakdown: view.servicesBreakdown || '',
    package_net_cost: view.packageNetCost || '',
    supplier_cost: view.packageNetCost || '',
    markup_amount: view.markup.amount || '',
    selling_price: view.sellingPrice || '',
    selling_per_person: view.sellingPerPerson || '',
    profit: view.profit || '',
    margin_percent: view.marginPercent || '',
    comparison_summary: comparisonSummary.trim(),
  }
}
