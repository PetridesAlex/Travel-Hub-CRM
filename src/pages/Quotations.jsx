import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Eye, Download, CalendarCheck, FileText,
  Search, Sparkles, MapPin, TrendingUp, Loader2, User, Wallet, Flag, MoreHorizontal,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getQuotations, createQuotation, updateQuotation, deleteQuotation } from '../services/quotations'
import { getClients } from '../services/clients'
import { getLeads, getLead, updateLead } from '../services/leads'
import { createBooking } from '../services/bookings'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import SearchableSelect, {
  clientSearchText, clientSubLabel, leadSearchText, leadSubLabel,
} from '../components/ui/SearchableSelect'
import { QUOTATION_STATUSES } from '../constants/enums'
import { formatCurrency, formatClientName, formatClientOptionLabel, labelFor } from '../utils/format'
import { notifySlack } from '../services/slackNotify'
import { buildQuotationDraftFromLead, exportQuotationPdf } from '../utils/exportPdf'
import LeadTableHeader, { PREMIUM_HEADER_CLASS, PREMIUM_CELL_CLASS } from '../components/leads/LeadTableHeader'

const emptyForm = {
  client_id: '',
  lead_id: '',
  title: '',
  destination: '',
  supplier_cost: '',
  selling_price: '',
  currency: 'EUR',
  inclusions: '',
  exclusions: '',
  terms: '',
  status: 'draft',
}

const CURRENCIES = [
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'USD', label: 'USD — US Dollar' },
]

function FormSection({ title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 sm:rounded-2xl sm:p-5">
      <div className="mb-3 sm:mb-4">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
      </div>
      <div className="space-y-3 sm:space-y-4">{children}</div>
    </section>
  )
}

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

export default function Quotations() {
  const { user, session } = useAuth()
  const { agency } = useAgency()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [quotations, setQuotations] = useState([])
  const [clients, setClients] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewQuote, setPreviewQuote] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [exportingId, setExportingId] = useState(null)
  const [tableSearch, setTableSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const clientId = searchParams.get('client')
    const leadId = searchParams.get('lead')
    if (clientId) {
      setForm((f) => ({ ...f, client_id: clientId }))
      setModalOpen(true)
    }
    if (leadId) {
      getLead(leadId).then((lead) => {
        setForm(buildQuotationDraftFromLead(lead))
        setModalOpen(true)
      }).catch((err) => console.error(err))
    }
  }, [searchParams])

  async function loadData() {
    try {
      const [quotesData, clientsData, leadsData] = await Promise.all([
        getQuotations(),
        getClients(),
        getLeads(),
      ])
      setQuotations(quotesData)
      setClients(clientsData)
      setLeads(leadsData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, client_id: searchParams.get('client') || '' })
    setModalOpen(true)
  }

  function openEdit(quote) {
    setEditing(quote)
    setForm({
      client_id: quote.client_id || '',
      lead_id: quote.lead_id || '',
      title: quote.title || '',
      destination: quote.destination || '',
      supplier_cost: quote.supplier_cost || '',
      selling_price: quote.selling_price || '',
      currency: quote.currency || 'EUR',
      inclusions: quote.inclusions || '',
      exclusions: quote.exclusions || '',
      terms: quote.terms || '',
      status: quote.status || 'draft',
    })
    setModalOpen(true)
  }

  function setField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'lead_id' && value) {
        const lead = leads.find((l) => l.id === value)
        if (lead?.client_id) next.client_id = lead.client_id
        if (lead?.destination && !prev.destination) next.destination = lead.destination
        if (lead?.budget && !prev.selling_price) next.selling_price = String(lead.budget)
      }
      return next
    })
  }

  async function handleSave() {
    if (!form.title?.trim()) {
      alert('Please enter a quotation title.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id: form.client_id || null,
        lead_id: form.lead_id || null,
        supplier_cost: Number(form.supplier_cost) || 0,
        selling_price: Number(form.selling_price) || 0,
      }
      if (editing) {
        await updateQuotation(editing.id, payload)
      } else {
        const quote = await createQuotation(payload, user.id, agency?.id)
        if (payload.lead_id) {
          await updateLead(payload.lead_id, { status: 'quoted' })
        }
        const linkedClient = clients.find((c) => c.id === payload.client_id)
        notifySlack(session, 'quotation_created', {
          client_name: linkedClient ? formatClientName(linkedClient) : '—',
          destination: payload.destination || quote.destination || '—',
          selling_price: quote.selling_price,
          profit: quote.profit,
          currency: quote.currency || 'EUR',
        })
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(quote) {
    if (!confirm('Delete this quotation?')) return
    try {
      await deleteQuotation(quote.id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleCreateBooking(quote) {
    try {
      await createBooking({
        client_id: quote.client_id,
        quotation_id: quote.id,
        total_cost: quote.selling_price,
        amount_paid: 0,
        status: 'pending',
      }, user.id, agency?.id)
      if (quote.lead_id) {
        await updateLead(quote.lead_id, { status: 'confirmed' })
      }
      if (quote.status !== 'accepted') {
        await updateQuotation(quote.id, { status: 'accepted' })
      }
      alert('Booking created from quotation!')
      navigate('/bookings')
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleExportPdf(quote) {
    setExportingId(quote.id)
    try {
      const client = quote.clients || clients.find((c) => c.id === quote.client_id)
      await exportQuotationPdf(quote, { agency, client })
    } catch (err) {
      alert(err.message || 'Failed to generate PDF')
    } finally {
      setExportingId(null)
    }
  }

  const stats = useMemo(() => {
    const draft = quotations.filter((q) => q.status === 'draft').length
    const sent = quotations.filter((q) => q.status === 'sent').length
    const accepted = quotations.filter((q) => q.status === 'accepted').length
    const pipeline = quotations.reduce((sum, q) => sum + Number(q.selling_price || 0), 0)
    const profit = quotations.reduce((sum, q) => sum + Number(q.profit || 0), 0)
    return { total: quotations.length, draft, sent, accepted, pipeline, profit }
  }, [quotations])

  const filteredQuotations = useMemo(() => {
    let rows = quotations
    if (statusFilter) rows = rows.filter((q) => q.status === statusFilter)
    if (tableSearch.trim()) {
      const term = tableSearch.trim().toLowerCase()
      rows = rows.filter((q) => {
        const clientName = formatClientName(q.clients).toLowerCase()
        return (
          (q.title || '').toLowerCase().includes(term)
          || (q.destination || '').toLowerCase().includes(term)
          || clientName.includes(term)
        )
      })
    }
    return rows
  }, [quotations, statusFilter, tableSearch])

  const selectedClient = clients.find((c) => c.id === form.client_id)
  const estimatedProfit = (Number(form.selling_price) || 0) - (Number(form.supplier_cost) || 0)
  const marginPct = Number(form.selling_price) > 0
    ? Math.round((estimatedProfit / Number(form.selling_price)) * 100)
    : 0

  const columns = [
    {
      key: 'title',
      label: 'Quote',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={FileText} label="Quote" accent="gradient" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <div className="min-w-[9rem]">
          <p className="font-semibold tracking-tight text-slate-900">{row.title}</p>
          {row.destination && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3 shrink-0 text-teal-600" />{row.destination}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden sm:table-cell`,
      headerRender: () => <LeadTableHeader icon={User} label="Client" accent="teal" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden sm:table-cell`,
      render: (row) => <span className="font-medium text-slate-800">{formatClientName(row.clients)}</span>,
    },
    {
      key: 'selling_price',
      label: 'Price',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Wallet} label="Price" accent="violet" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => (
        <span className="text-base font-bold tabular-nums tracking-tight text-slate-900 sm:text-sm">
          {formatCurrency(row.selling_price, row.currency)}
        </span>
      ),
    },
    {
      key: 'profit',
      label: 'Profit',
      headerClassName: `${PREMIUM_HEADER_CLASS} hidden md:table-cell`,
      headerRender: () => <LeadTableHeader icon={TrendingUp} label="Profit" accent="emerald" />,
      cellClassName: `${PREMIUM_CELL_CLASS} hidden md:table-cell`,
      render: (row) => (
        <span className="font-semibold tabular-nums text-emerald-700">{formatCurrency(row.profit, row.currency)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: PREMIUM_HEADER_CLASS,
      headerRender: () => <LeadTableHeader icon={Flag} label="Status" accent="amber" />,
      cellClassName: PREMIUM_CELL_CLASS,
      render: (row) => <Badge status={row.status} label={labelFor(QUOTATION_STATUSES, row.status)} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: `${PREMIUM_HEADER_CLASS} w-[1%] whitespace-nowrap`,
      headerRender: () => <LeadTableHeader icon={MoreHorizontal} label="Actions" accent="slate" />,
      cellClassName: `${PREMIUM_CELL_CLASS} w-[1%] whitespace-nowrap`,
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => { setPreviewQuote(row); setPreviewOpen(true) }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-teal-600" title="Preview">
            <Eye className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => handleExportPdf(row)} disabled={exportingId === row.id} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-teal-600 disabled:opacity-50" title="Download PDF">
            {exportingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => openEdit(row)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-teal-600" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          {['sent', 'accepted'].includes(row.status) && (
            <button type="button" onClick={() => handleCreateBooking(row)} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100" title="Create booking">
              <CalendarCheck className="h-3.5 w-3.5" /> Book
            </button>
          )}
          <button type="button" onClick={() => handleDelete(row)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900 p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-100">
              <Sparkles className="h-3.5 w-3.5" />
              Sales
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Quotations</h2>
            <p className="mt-1 text-sm text-slate-300">Build professional travel quotes, export PDFs, and convert to bookings</p>
          </div>
          <Button onClick={openAdd} className="shrink-0 shadow-lg shadow-violet-900/30">
            <Plus className="h-4 w-4" /> New quotation
          </Button>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total quotes', value: stats.total, icon: FileText },
            { label: 'Draft', value: stats.draft, icon: Pencil },
            { label: 'Pipeline value', value: formatCurrency(stats.pipeline), icon: TrendingUp },
            { label: 'Total profit', value: formatCurrency(stats.profit), icon: Sparkles },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-violet-200/80">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search quotes by title, destination, or client…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ value: '', label: 'All' }, ...QUOTATION_STATUSES].map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === f.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : (
        <Table
          variant="premium"
          caption="All quotations"
          captionCount={`${filteredQuotations.length} shown`}
          columns={columns}
          data={filteredQuotations}
          emptyMessage={tableSearch || statusFilter ? 'No quotations match your filters.' : 'No quotations yet. Create your first quote for a client.'}
        />
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="xl"
        title={editing ? 'Edit quotation' : 'New quotation'}
        subtitle={editing ? 'Update pricing, inclusions, and status' : 'Search for a client and build a professional quote'}
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            onSave={handleSave}
            saving={saving}
            saveLabel={editing ? 'Save changes' : 'Create quotation'}
          />
        }
      >
        <div className="space-y-4 sm:space-y-5">
          <FormSection title="Client & lead" description="Search by name, email, phone, or company — works with large client lists.">
            <div className="grid gap-4 sm:grid-cols-2">
              <SearchableSelect
                label="Client"
                hint={`${clients.length} clients in your agency`}
                value={form.client_id}
                onChange={(id) => setField('client_id', id)}
                items={clients}
                getValue={(c) => c.id}
                getLabel={formatClientOptionLabel}
                getSearchText={clientSearchText}
                getSubLabel={clientSubLabel}
                placeholder="Search client by name, email, or phone…"
                emptyLabel="No clients match. Try a different search or add a client first."
                clearLabel="No client selected"
              />
              <SearchableSelect
                label="Linked lead (optional)"
                value={form.lead_id}
                onChange={(id) => setField('lead_id', id)}
                items={leads}
                getValue={(l) => l.id}
                getLabel={(l) => l.destination || `Lead ${l.id.slice(0, 8)}`}
                getSearchText={leadSearchText}
                getSubLabel={leadSubLabel}
                placeholder="Search leads by destination…"
                emptyLabel="No leads match."
                clearLabel="No lead linked"
              />
            </div>
            {selectedClient && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected client</p>
                <p className="mt-1 font-semibold text-slate-900">{formatClientOptionLabel(selectedClient)}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[selectedClient.email, selectedClient.phone].filter(Boolean).join(' · ') || 'No contact on file'}
                </p>
                <Link to={`/clients/${selectedClient.id}`} className="mt-2 inline-flex text-xs font-semibold text-teal-600 hover:text-teal-700">
                  View client profile →
                </Link>
              </div>
            )}
          </FormSection>

          <FormSection title="Trip details" description="What you're quoting for the traveller.">
            <Input label="Quotation title" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Maldives honeymoon package — May 2026" required />
            <Input label="Destination" value={form.destination} onChange={(e) => setField('destination', e.target.value)} placeholder="e.g. Maldives, Rhodes, Dubai" />
          </FormSection>

          <FormSection title="Pricing" description="Supplier cost vs selling price — profit is calculated automatically.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Supplier cost" type="number" min="0" step="0.01" value={form.supplier_cost} onChange={(e) => setField('supplier_cost', e.target.value)} placeholder="0.00" />
              <Input label="Selling price" type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => setField('selling_price', e.target.value)} placeholder="0.00" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Currency" value={form.currency} onChange={(e) => setField('currency', e.target.value)} options={CURRENCIES} />
              <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)} options={QUOTATION_STATUSES} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Est. profit</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-emerald-900">{formatCurrency(estimatedProfit, form.currency)}</p>
              </div>
              <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Margin</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-violet-900">{marginPct}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Client pays</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{formatCurrency(form.selling_price || 0, form.currency)}</p>
              </div>
            </div>
          </FormSection>

          <FormSection title="Quote content" description="Shown on the PDF and client preview.">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Inclusions</label>
              <textarea className={fieldClass} rows={3} value={form.inclusions} onChange={(e) => setField('inclusions', e.target.value)} placeholder="Flights, transfers, hotel, meals…" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Exclusions</label>
              <textarea className={fieldClass} rows={2} value={form.exclusions} onChange={(e) => setField('exclusions', e.target.value)} placeholder="Visa fees, personal expenses…" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Terms & conditions</label>
              <textarea className={fieldClass} rows={3} value={form.terms} onChange={(e) => setField('terms', e.target.value)} placeholder="Payment terms, cancellation policy…" />
            </div>
          </FormSection>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="lg"
        title="Quotation preview"
        subtitle="Review before sending or exporting PDF"
        footer={
          previewQuote && (
            <>
              <Button variant="secondary" onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button variant="secondary" onClick={() => handleExportPdf(previewQuote)} disabled={exportingId === previewQuote?.id}>
                {exportingId === previewQuote?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
              </Button>
              <Button onClick={() => { setPreviewOpen(false); openEdit(previewQuote) }}>Edit quote</Button>
            </>
          )
        }
      >
        {previewQuote && (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{agency?.name || 'Travel Agency'}</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{previewQuote.title}</h3>
              {previewQuote.destination && (
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{previewQuote.destination}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase text-slate-500">Client</p>
                <p className="mt-1 font-semibold text-slate-900">{formatClientName(previewQuote.clients)}</p>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase text-slate-500">Total price</p>
                <p className="mt-1 text-2xl font-bold text-teal-700">{formatCurrency(previewQuote.selling_price, previewQuote.currency)}</p>
                <p className="text-xs text-emerald-600">Profit {formatCurrency(previewQuote.profit, previewQuote.currency)}</p>
              </div>
            </div>
            {previewQuote.inclusions && (
              <div>
                <h4 className="text-sm font-bold text-slate-800">Inclusions</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{previewQuote.inclusions}</p>
              </div>
            )}
            {previewQuote.exclusions && (
              <div>
                <h4 className="text-sm font-bold text-slate-800">Exclusions</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{previewQuote.exclusions}</p>
              </div>
            )}
            {previewQuote.terms && (
              <div>
                <h4 className="text-sm font-bold text-slate-800">Terms & conditions</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{previewQuote.terms}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
