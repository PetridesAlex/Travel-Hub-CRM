import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, FileText, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAgency } from '../../hooks/useAgency'
import { resolveAgencyId } from '../../utils/resolveAgencyId'
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../services/aiTemplates'
import { getAgents } from '../../services/aiAgents'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Modal, { ModalFooter } from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { AI_TEMPLATE_CATEGORIES } from '../../constants/aiTemplateFields'
import { labelFor } from '../../utils/format'

const emptyForm = {
  name: '',
  category: 'flight_offer',
  description: '',
  template_body: '',
  tone: 'professional',
  agent_id: '',
  is_active: true,
}

export default function AITemplates() {
  const { user } = useAuth()
  const { agency } = useAgency()
  const [templates, setTemplates] = useState([])
  const [agents, setAgents] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [categoryFilter, search])

  async function loadData() {
    try {
      setLoading(true)
      const [templatesData, agentsData] = await Promise.all([
        getTemplates({ category: categoryFilter, search }),
        getAgents(),
      ])
      setTemplates(templatesData)
      setAgents(agentsData)
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

  function openEdit(template) {
    setEditing(template)
    setForm({
      name: template.name,
      category: template.category,
      description: template.description || '',
      template_body: template.template_body,
      tone: template.tone || 'professional',
      agent_id: template.agent_id || '',
      is_active: template.is_active,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.template_body.trim()) {
      alert('Name and template body are required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateTemplate(editing.id, form)
      } else {
        const agencyId = resolveAgencyId(agency)
        if (!agencyId) throw new Error('Agency not found. Please complete setup in Settings.')
        await createTemplate(form, user.id, agencyId)
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(template) {
    if (!confirm(`Delete template "${template.name}"?`)) return
    try {
      await deleteTemplate(template.id)
      loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  const agentOptions = [{ value: '', label: 'No linked agent' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]

  const filteredCount = useMemo(() => templates.length, [templates])

  const columns = [
    {
      key: 'name',
      label: 'Template',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.ai_agents?.name || 'No agent linked'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {labelFor(AI_TEMPLATE_CATEGORIES, row.category)}
        </span>
      ),
    },
    {
      key: 'tone',
      label: 'Tone',
      render: (row) => <span className="text-sm capitalize text-slate-600">{row.tone || 'professional'}</span>,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1.5">
          <button type="button" onClick={() => openEdit(row)} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => handleDelete(row)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">AI Templates</h2>
          <p className="text-sm text-slate-500">Reusable email and document structures for each agent</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Template</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[{ value: '', label: 'All categories' }, ...AI_TEMPLATE_CATEGORIES]}
          className="w-48"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="max-w-xs"
        />
        <span className="self-center text-xs text-slate-500">{filteredCount} template{filteredCount === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
      ) : (
        <Table columns={columns} data={templates} emptyMessage="No templates yet." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Template' : 'Add Template'}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} />}
      >
        <div className="space-y-3">
          <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={AI_TEMPLATE_CATEGORIES} />
          <Select label="Linked Agent" value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })} options={agentOptions} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Tone" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Template Body *</label>
            <p className="mb-2 text-xs text-slate-400">Use placeholders like {'{{client_name}}'}, {'{{route}}'}, {'{{price}}'}</p>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              rows={14}
              value={form.template_body}
              onChange={(e) => setForm({ ...form, template_body: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
        </div>
      </Modal>
    </div>
  )
}
