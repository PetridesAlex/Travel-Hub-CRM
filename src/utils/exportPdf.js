import { jsPDF } from 'jspdf'
import { formatCurrency, formatDate, formatClientName } from './format'
import { resolveAgencyLogoUrl } from './resolveAgencyLogo'

const MARGIN = 16
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const FOOTER_RESERVE = 22

const COLORS = {
  teal: [13, 148, 136],
  slate900: [15, 23, 42],
  slate700: [51, 65, 85],
  slate500: [100, 116, 139],
  slate100: [241, 245, 249],
  white: [255, 255, 255],
}

async function loadImageForPdf(url) {
  if (!url) return null
  try {
    const absolute = url.startsWith('http')
      ? url
      : `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
    const res = await fetch(absolute)
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const dims = await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
    if (!dims) return null
    const format = blob.type?.includes('png') ? 'PNG' : 'JPEG'
    return { dataUrl, format, ...dims }
  } catch {
    return null
  }
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 4.8) {
  if (!text?.trim()) return y
  const lines = doc.splitTextToSize(text.trim(), maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function ensureSpace(doc, y, needed, agency, logo, documentLabel) {
  if (y + needed <= PAGE_HEIGHT - FOOTER_RESERVE) return y
  drawPageFooter(doc, agency, doc.getNumberOfPages())
  doc.addPage()
  return drawContinuationHeader(doc, agency, logo, documentLabel)
}

function drawContinuationHeader(doc, agency, logo, documentLabel) {
  doc.setFillColor(...COLORS.slate900)
  doc.rect(0, 0, PAGE_WIDTH, 14, 'F')
  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(documentLabel, MARGIN, 9)
  doc.setFont('helvetica', 'normal')
  doc.text(agency?.name || 'Travel Agency', PAGE_WIDTH - MARGIN, 9, { align: 'right' })
  return 22
}

function drawPageFooter(doc, agency, pageNum) {
  const total = doc.getNumberOfPages()
  const y = PAGE_HEIGHT - 12
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...COLORS.slate500)
  const footer = agency?.invoice_footer?.trim()
  if (footer) {
    addWrappedText(doc, footer, MARGIN, y, CONTENT_WIDTH * 0.72, 3.5)
  }
  doc.text(`Page ${pageNum} of ${total}`, PAGE_WIDTH - MARGIN, y, { align: 'right' })
}

function drawPremiumHeader(doc, agency, logo, documentLabel, quoteRef) {
  const headerHeight = logo ? 36 : 30
  doc.setFillColor(...COLORS.white)
  doc.rect(0, 0, PAGE_WIDTH, headerHeight, 'F')

  let textX = MARGIN
  if (logo) {
    const maxLogoH = 14
    const maxLogoW = 52
    const scale = Math.min(maxLogoW / logo.width, maxLogoH / logo.height)
    const w = logo.width * scale
    const h = logo.height * scale
    const logoY = (headerHeight - h) / 2 - 1
    doc.addImage(logo.dataUrl, logo.format, MARGIN, logoY, w, h)
    textX = MARGIN + w + 6
  }

  doc.setTextColor(...COLORS.slate900)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(logo ? 13 : 16)
  doc.text(agency?.name || 'Travel Agency', textX, logo ? 12 : 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.slate500)
  const contactLines = [
    agency?.address,
    [agency?.phone, agency?.email].filter(Boolean).join(' · '),
    agency?.website,
  ].filter(Boolean)
  let contactY = logo ? 17 : 20
  contactLines.forEach((line) => {
    doc.text(line, textX, contactY)
    contactY += 4
  })

  if (quoteRef) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.teal)
    doc.text(quoteRef, PAGE_WIDTH - MARGIN, 10, { align: 'right' })
  }

  const barY = headerHeight
  doc.setFillColor(...COLORS.slate900)
  doc.rect(0, barY, PAGE_WIDTH, 10, 'F')
  doc.setFillColor(...COLORS.teal)
  doc.rect(0, barY, 3, 10, 'F')
  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(documentLabel, MARGIN + 2, barY + 6.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(formatDate(new Date()), PAGE_WIDTH - MARGIN, barY + 6.5, { align: 'right' })

  return barY + 16
}

function drawMetaCard(doc, x, y, w, h, label, lines) {
  doc.setFillColor(...COLORS.slate100)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y, w, h, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.slate500)
  doc.text(label.toUpperCase(), x + 4, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.slate900)
  let lineY = y + 12
  lines.filter(Boolean).forEach((line) => {
    const wrapped = doc.splitTextToSize(String(line), w - 8)
    doc.text(wrapped, x + 4, lineY)
    lineY += wrapped.length * 5
  })
}

function drawPriceHighlight(doc, y, quotation) {
  const h = 28
  doc.setFillColor(...COLORS.slate900)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, h, 3, 3, 'F')
  doc.setFillColor(...COLORS.teal)
  doc.roundedRect(MARGIN, y, 3, h, 1.5, 1.5, 'F')

  doc.setTextColor(203, 213, 225)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Total quotation price', MARGIN + 8, y + 10)

  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(formatCurrency(quotation.selling_price, quotation.currency), MARGIN + 8, y + 21)

  if (quotation.profit != null && Number(quotation.profit) > 0) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(153, 246, 228)
    doc.text(
      `All inclusive · ${quotation.currency || 'EUR'}`,
      PAGE_WIDTH - MARGIN - 4,
      y + 12,
      { align: 'right' },
    )
  }

  return y + h + 8
}

function drawContentSection(doc, title, body, y, agency, logo, documentLabel) {
  y = ensureSpace(doc, y, 24, agency, logo, documentLabel)
  doc.setFillColor(...COLORS.teal)
  doc.rect(MARGIN, y, 2, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.slate900)
  doc.text(title, MARGIN + 5, y + 6)
  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.slate700)
  const lines = doc.splitTextToSize(body.trim(), CONTENT_WIDTH - 4)
  const blockH = lines.length * 5 + 8
  y = ensureSpace(doc, y, blockH, agency, logo, documentLabel)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(241, 245, 249)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, blockH, 2, 2, 'FD')
  doc.text(lines, MARGIN + 4, y + 6)
  return y + blockH + 8
}

function finalizePdf(doc, agency, filename) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i)
    drawPageFooter(doc, agency, i)
  }
  doc.save(filename.replace(/[^\w.-]+/g, '_'))
}

export async function exportQuotationPdf(quotation, { agency, client } = {}) {
  const logoUrl = resolveAgencyLogoUrl(agency)
  const logo = await loadImageForPdf(logoUrl)
  const quoteRef = quotation.id
    ? `REF: Q-${quotation.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
    : null

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = drawPremiumHeader(doc, agency, logo, 'TRAVEL QUOTATION', quoteRef)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...COLORS.slate900)
  const titleLines = doc.splitTextToSize(quotation.title || 'Travel Quotation', CONTENT_WIDTH)
  doc.text(titleLines, MARGIN, y)
  y += titleLines.length * 7 + 2

  if (quotation.destination) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.teal)
    doc.text(`Destination: ${quotation.destination}`, MARGIN, y)
    y += 8
  }

  const cardW = (CONTENT_WIDTH - 4) / 2
  const clientName = formatClientName(client || quotation.clients)
  const clientLines = [clientName, client?.email, client?.phone].filter(Boolean)
  const quoteLines = [
    `Date: ${formatDate(quotation.created_at || new Date())}`,
    quotation.destination ? `Trip: ${quotation.destination}` : null,
    `Currency: ${quotation.currency || 'EUR'}`,
    quotation.status ? `Status: ${String(quotation.status).replace(/_/g, ' ')}` : null,
  ].filter(Boolean)

  drawMetaCard(doc, MARGIN, y, cardW, 28, 'Prepared for', clientLines)
  drawMetaCard(doc, MARGIN + cardW + 4, y, cardW, 28, 'Quote details', quoteLines)
  y += 36

  y = drawPriceHighlight(doc, y, quotation)

  if (quotation.inclusions) {
    y = drawContentSection(doc, 'Inclusions', quotation.inclusions, y, agency, logo, 'TRAVEL QUOTATION')
  }
  if (quotation.exclusions) {
    y = drawContentSection(doc, 'Exclusions', quotation.exclusions, y, agency, logo, 'TRAVEL QUOTATION')
  }
  if (quotation.terms) {
    y = drawContentSection(doc, 'Terms & Conditions', quotation.terms, y, agency, logo, 'TRAVEL QUOTATION')
  }

  if (agency?.email_signature?.trim()) {
    y = ensureSpace(doc, y, 30, agency, logo, 'TRAVEL QUOTATION')
    y += 4
    doc.setDrawColor(...COLORS.teal)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, y, MARGIN + 40, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.slate700)
    y = addWrappedText(doc, agency.email_signature, MARGIN, y, CONTENT_WIDTH * 0.6, 4.5)
  }

  y = ensureSpace(doc, y, 20, agency, logo, 'TRAVEL QUOTATION')
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.slate500)
  doc.text(
    'This quotation is subject to availability and confirmation. Thank you for choosing us for your travel plans.',
    MARGIN,
    y,
  )

  finalizePdf(
    doc,
    agency,
    `Quotation_${quotation.title || quotation.id?.slice(0, 8) || 'travel'}.pdf`,
  )
}

export async function exportInvoicePdf(invoice, { agency, client } = {}) {
  const logoUrl = resolveAgencyLogoUrl(agency)
  const logo = await loadImageForPdf(logoUrl)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = drawPremiumHeader(doc, agency, logo, 'INVOICE', invoice.invoice_number ? `REF: ${invoice.invoice_number}` : null)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...COLORS.slate900)
  doc.text(`Invoice ${invoice.invoice_number || ''}`, MARGIN, y)
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.slate500)
  doc.text(`Issue date: ${formatDate(invoice.issue_date)}`, MARGIN, y)
  doc.text(`Due date: ${formatDate(invoice.due_date)}`, MARGIN + 70, y)
  y += 10

  const clientName = formatClientName(client || invoice.clients)
  drawMetaCard(doc, MARGIN, y, CONTENT_WIDTH, 22, 'Bill to', [clientName, client?.email].filter(Boolean))
  y += 30

  if (invoice.description) {
    y = drawContentSection(doc, 'Description', invoice.description, y, agency, logo, 'INVOICE')
  }

  const amount = Number(invoice.amount) || 0
  const tax = Number(invoice.tax_amount) || 0
  const total = Number(invoice.total_amount) || amount + tax
  const currency = invoice.currency || 'EUR'

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 30, 2, 2, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.slate700)
  doc.text('Subtotal', MARGIN + 4, y + 10)
  doc.text(formatCurrency(amount, currency), PAGE_WIDTH - MARGIN - 4, y + 10, { align: 'right' })
  doc.text('Tax', MARGIN + 4, y + 18)
  doc.text(formatCurrency(tax, currency), PAGE_WIDTH - MARGIN - 4, y + 18, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.slate900)
  doc.text('Total due', MARGIN + 4, y + 26)
  doc.text(formatCurrency(total, currency), PAGE_WIDTH - MARGIN - 4, y + 26, { align: 'right' })
  y += 38

  if (invoice.notes) {
    y = drawContentSection(doc, 'Notes', invoice.notes, y, agency, logo, 'INVOICE')
  }

  finalizePdf(doc, agency, `Invoice_${invoice.invoice_number || invoice.id?.slice(0, 8) || 'travel'}.pdf`)
}

export function buildQuotationDraftFromLead(lead) {
  const destination = lead.destination || 'Travel enquiry'
  return {
    client_id: lead.client_id || '',
    lead_id: lead.id,
    title: `Quote — ${destination}`,
    destination: lead.destination || '',
    supplier_cost: '',
    selling_price: lead.budget ? String(lead.budget) : '',
    currency: 'EUR',
    inclusions: lead.travel_dates ? `Travel dates: ${lead.travel_dates}` : '',
    exclusions: '',
    terms: '',
    status: 'draft',
  }
}

function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function defaultLeadFollowUpDate(existingDate) {
  return existingDate || addDaysISO(1)
}
