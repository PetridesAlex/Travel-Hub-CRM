import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAgency } from '../hooks/useAgency'
import { getMarketingCampaigns, createMarketingCampaign, updateMarketingCampaign, deleteMarketingCampaign } from '../services/marketingCampaigns'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal, { ModalFooter } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import { CAMPAIGN_TYPES, CAMPAIGN_STATUSES } from '../constants/enums'
import { labelFor } from '../utils/format'

const emptyForm = {
  title: '',
  campaign_type: 'general',
  audience: '',
  subject: '',
  body: '',
  status: 'draft',
}

export default function MarketingCampaigns() {
  const { user } = useAuth()
  const { agency } = useAgency()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function loadCampaigns() {
    try {
      const data = await getMarketingCampaigns()
      setCampaigns(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(campaign) {
    setEditing(campaign)
    setForm({
      title: campaign.title || '',
      campaign_type: campaign.campaign_type || 'general',
      audience: campaign.audience || '',
      subject: campaign.subject || '',
      body: campaign.body || '',
      status: campaign.status || 'draft',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) {
        await updateMarketingCampaign(editing.id, form)
      } else {
        await createMarketingCampaign(form, user.id, agency?.id)
      }
      setModalOpen(false)
      loadCampaigns()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(campaign) {
    if (!confirm(`Delete campaign "${campaign.title}"?`)) return
    try {
      await deleteMarketingCampaign(campaign.id)
      loadCampaigns()
    } catch (err) {
      alert(err.message)
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'campaign_type', label: 'Type', render: (row) => labelFor(CAMPAIGN_TYPES, row.campaign_type) },
    { key: 'audience', label: 'Audience' },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} label={labelFor(CAMPAIGN_STATUSES, row.status)} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-teal-600">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => handleDelete(row)} className="text-slate-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Marketing Campaigns</h2>
          <p className="text-sm text-slate-500">Create campaigns for Brevo email marketing via n8n</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> New Campaign</Button>
      </div>

      <Card className="border-teal-200 bg-teal-50">
        <p className="text-sm text-teal-800">
          When a campaign status is set to <strong>scheduled</strong>, n8n can send the audience to Brevo for email delivery.
        </p>
      </Card>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <Table columns={columns} data={campaigns} emptyMessage="No campaigns yet." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Campaign' : 'New Campaign'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select label="Campaign Type" value={form.campaign_type} onChange={(e) => setForm({ ...form, campaign_type: e.target.value })} options={CAMPAIGN_TYPES} />
          <Input label="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="e.g. cruise clients, honeymoon leads" />
          <Input label="Email Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email Body</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={CAMPAIGN_STATUSES} />
        </div>
      </Modal>
    </div>
  )
}
