import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getClient, getClientRelatedData } from '../services/clients'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatDate, formatCurrency, labelFor } from '../utils/format'
import { LEAD_STATUSES, QUOTATION_STATUSES, BOOKING_STATUSES, TRAVEL_TYPES, CLIENT_TYPES } from '../constants/enums'

const TABS = [
  { key: 'leads', label: 'Leads' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'voiceNotes', label: 'Voice Notes' },
]

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [related, setRelated] = useState({ leads: [], quotations: [], bookings: [], tasks: [], voiceNotes: [] })
  const [activeTab, setActiveTab] = useState('leads')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    try {
      const [clientData, relatedData] = await Promise.all([
        getClient(id),
        getClientRelatedData(id),
      ])
      setClient(clientData)
      setRelated(relatedData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-slate-500">Loading...</p>
  if (!client) return <p className="text-slate-500">Client not found.</p>

  const isBusiness = client.client_type === 'business'
  const displayName = isBusiness && client.company_name ? client.company_name : client.full_name

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge
                status={client.client_type || 'individual'}
                label={labelFor(CLIENT_TYPES, client.client_type || 'individual')}
              />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{displayName}</h2>
            {isBusiness && client.full_name && (
              <p className="mt-1 text-sm text-slate-500">Contact: {client.full_name}</p>
            )}
            <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
              <p>Email: {client.email || '—'}</p>
              <p>Phone: {client.phone || '—'}</p>
              {isBusiness ? (
                <p>Company: {client.company_name || '—'}</p>
              ) : (
                <>
                  <p>Nationality: {client.nationality || '—'}</p>
                  <p>Passport: {client.passport_number || '—'}</p>
                  <p>Date of Birth: {formatDate(client.date_of_birth)}</p>
                </>
              )}
              {isBusiness && client.nationality && (
                <p>Nationality: {client.nationality}</p>
              )}
            </div>
            {client.notes && (
              <p className="mt-3 text-sm text-slate-500">{client.notes}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link to={`/leads?client=${id}`}>
              <Button variant="secondary" size="sm">Add Lead</Button>
            </Link>
            <Link to={`/quotations?client=${id}`}>
              <Button size="sm">Create Quotation</Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label} ({related[tab.key]?.length || 0})
          </button>
        ))}
      </div>

      {activeTab === 'leads' && (
        <RelatedList
          items={related.leads}
          render={(item) => (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.destination || 'No destination'}</p>
                <p className="text-sm text-slate-500">{labelFor(TRAVEL_TYPES, item.travel_type)} · Budget: {formatCurrency(item.budget)}</p>
              </div>
              <Badge status={item.status} label={labelFor(LEAD_STATUSES, item.status)} />
            </div>
          )}
          empty="No leads for this client."
        />
      )}

      {activeTab === 'quotations' && (
        <RelatedList
          items={related.quotations}
          render={(item) => (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-500">{formatCurrency(item.selling_price, item.currency)} · Profit: {formatCurrency(item.profit, item.currency)}</p>
              </div>
              <Badge status={item.status} label={labelFor(QUOTATION_STATUSES, item.status)} />
            </div>
          )}
          empty="No quotations for this client."
        />
      )}

      {activeTab === 'bookings' && (
        <RelatedList
          items={related.bookings}
          render={(item) => (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.booking_reference || 'Booking'}</p>
                <p className="text-sm text-slate-500">Balance: {formatCurrency(item.balance_due)} · Due: {formatDate(item.due_date)}</p>
              </div>
              <Badge status={item.status} label={labelFor(BOOKING_STATUSES, item.status)} />
            </div>
          )}
          empty="No bookings for this client."
        />
      )}

      {activeTab === 'tasks' && (
        <RelatedList
          items={related.tasks}
          render={(item) => (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-500">Due: {formatDate(item.due_date)}</p>
              </div>
              <Badge status={item.status} />
            </div>
          )}
          empty="No tasks for this client."
        />
      )}

      {activeTab === 'voiceNotes' && (
        <RelatedList
          items={related.voiceNotes}
          render={(item) => (
            <div>
              <p className="text-sm text-slate-800">{item.transcript}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(item.created_at)} · {item.processing_status}</p>
            </div>
          )}
          empty="No voice notes for this client."
        />
      )}
    </div>
  )
}

function RelatedList({ items, render, empty }) {
  if (!items.length) {
    return <Card><p className="text-sm text-slate-500">{empty}</p></Card>
  }
  return (
    <Card>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="py-3">{render(item)}</li>
        ))}
      </ul>
    </Card>
  )
}
