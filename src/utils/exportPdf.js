import { jsPDF } from 'jspdf'
import { formatCurrency, formatDate, formatClientName } from './format'

const MARGIN = 18
const PAGE_WIDTH = 210
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const TEAL = [13, 148, 136]

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 5) {
  if (!text?.trim()) return y
  const lines = doc.splitTextToSize(text.trim(), maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function addSection(doc, title, body, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(title, MARGIN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  return addWrappedText(doc, body, MARGIN, y, CONTENT_WIDTH, 5) + 4
}

function drawHeader(doc, agency, documentLabel) {
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, PAGE_WIDTH, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(agency?.name || 'Travel Agency', MARGIN, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(documentLabel, MARGIN, 24)

  const contact = [agency?.email, agency?.phone, agency?.website].filter(Boolean).join(' · ')
  if (contact) {
    doc.setFontSize(8)
    doc.text(contact, PAGE_WIDTH - MARGIN, 14, { align: 'right' })
  }
  if (agency?.address) {
    doc.text(agency.address, PAGE_WIDTH - MARGIN, 20, { align: 'right', maxWidth: 80 })
  }

  return 42
}

function drawFooter(doc, agency, pageHeight) {
  const footer = agency?.invoice_footer?.trim()
  if (!footer) return
  doc.setDrawColor(226, 232, 240)
  doc.line(MARGIN, pageHeight - 28, PAGE_WIDTH - MARGIN, pageHeight - 28)
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  addWrappedText(doc, footer, MARGIN, pageHeight - 22, CONTENT_WIDTH, 4)
}

function savePdf(doc, filename) {
  doc.save(filename.replace(/[^\w.-]+/g, '_'))
}

export function exportQuotationPdf(quotation, { agency, client } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = drawHeader(doc, agency, 'TRAVEL QUOTATION')

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(quotation.title || 'Quotation', MARGIN, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Date: ${formatDate(quotation.created_at || new Date())}`, MARGIN, y)
  if (quotation.destination) {
    doc.text(`Destination: ${quotation.destination}`, MARGIN + 70, y)
  }
  y += 10

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.text('Prepared for', MARGIN, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  const clientName = formatClientName(client || quotation.clients)
  y = addWrappedText(doc, clientName, MARGIN, y, CONTENT_WIDTH)
  if (client?.email) y = addWrappedText(doc, client.email, MARGIN, y, CONTENT_WIDTH)
  if (client?.phone) y = addWrappedText(doc, client.phone, MARGIN, y, CONTENT_WIDTH)
  y += 6

  doc.setFillColor(240, 253, 250)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 22, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(13, 148, 136)
  doc.text('Total price', MARGIN + 4, y + 8)
  doc.setFontSize(16)
  doc.text(formatCurrency(quotation.selling_price, quotation.currency), MARGIN + 4, y + 17)
  y += 30

  if (quotation.inclusions) y = addSection(doc, 'Inclusions', quotation.inclusions, y)
  if (quotation.exclusions) y = addSection(doc, 'Exclusions', quotation.exclusions, y)
  if (quotation.terms) y = addSection(doc, 'Terms & Conditions', quotation.terms, y)

  if (agency?.email_signature?.trim()) {
    y += 4
    y = addSection(doc, 'Contact', agency.email_signature, y)
  }

  drawFooter(doc, agency, doc.internal.pageSize.getHeight())
  savePdf(doc, `Quotation_${quotation.title || quotation.id?.slice(0, 8) || 'travel'}.pdf`)
}

export function exportInvoicePdf(invoice, { agency, client } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = drawHeader(doc, agency, 'INVOICE')

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`Invoice ${invoice.invoice_number || ''}`, MARGIN, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Issue date: ${formatDate(invoice.issue_date)}`, MARGIN, y)
  doc.text(`Due date: ${formatDate(invoice.due_date)}`, MARGIN + 60, y)
  y += 10

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill to', MARGIN, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  const clientName = formatClientName(client || invoice.clients)
  y = addWrappedText(doc, clientName, MARGIN, y, CONTENT_WIDTH)
  if (client?.email) y = addWrappedText(doc, client.email, MARGIN, y, CONTENT_WIDTH)
  y += 6

  if (invoice.description) {
    y = addSection(doc, 'Description', invoice.description, y)
  }

  const amount = Number(invoice.amount) || 0
  const tax = Number(invoice.tax_amount) || 0
  const total = Number(invoice.total_amount) || amount + tax
  const currency = invoice.currency || 'EUR'

  doc.setFillColor(248, 250, 252)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 28, 2, 2, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text('Subtotal', MARGIN + 4, y + 8)
  doc.text(formatCurrency(amount, currency), PAGE_WIDTH - MARGIN - 4, y + 8, { align: 'right' })
  doc.text('Tax', MARGIN + 4, y + 16)
  doc.text(formatCurrency(tax, currency), PAGE_WIDTH - MARGIN - 4, y + 16, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Total due', MARGIN + 4, y + 24)
  doc.text(formatCurrency(total, currency), PAGE_WIDTH - MARGIN - 4, y + 24, { align: 'right' })
  y += 36

  if (invoice.notes) y = addSection(doc, 'Notes', invoice.notes, y)

  drawFooter(doc, agency, doc.internal.pageSize.getHeight())
  savePdf(doc, `Invoice_${invoice.invoice_number || invoice.id?.slice(0, 8) || 'travel'}.pdf`)
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
