import { useEffect, useState } from 'react'
import { Bot, Pencil, Loader2 } from 'lucide-react'
import { getAgents, updateAgent, toggleAgentActive } from '../../services/aiAgents'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Modal, { ModalFooter } from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { AI_AGENT_CATEGORIES } from '../../constants/aiTemplateFields'
import { labelFor } from '../../utils/format'

const CATEGORY_STYLES = {
  flight: 'bg-sky-50 text-sky-800 ring-sky-100',
  cruise: 'bg-blue-50 text-blue-800 ring-blue-100',
  hotel: 'bg-violet-50 text-violet-800 ring-violet-100',
  itinerary: 'bg-teal-50 text-teal-800 ring-teal-100',
  email: 'bg-indigo-50 text-indigo-800 ring-indigo-100',
  costing: 'bg-amber-50 text-amber-800 ring-amber-100',
  supplier: 'bg-slate-100 text-slate-800 ring-slate-200',
  payment: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
}

export default function AIAgents() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', system_prompt: '', is_active: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    try {
      setLoading(true)
      setAgents(await getAgents())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openEdit(agent) {
    setEditing(agent)
    setForm({
      name: agent.name,
      description: agent.description || '',
      system_prompt: agent.system_prompt,
      is_active: agent.is_active,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      await updateAgent(editing.id, form)
      setModalOpen(false)
      loadAgents()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(agent) {
    try {
      await toggleAgentActive(agent.id, !agent.is_active)
      loadAgents()
    } catch (err) {
      alert(err.message)
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Agent',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${CATEGORY_STYLES[row.category] || CATEGORY_STYLES.email}`}>
          {labelFor(AI_AGENT_CATEGORIES, row.category)}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <p className="max-w-md truncate text-sm text-slate-600">{row.description || '—'}</p>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggle(row) }}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            row.is_active
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-200'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button
          type="button"
          onClick={() => openEdit(row)}
          className="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">AI Agents</h2>
        <p className="text-sm text-slate-500">Specialized assistants with custom system prompts for your agency</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : (
        <Table columns={columns} data={agents} emptyMessage="No agents found. Run migration 007 to seed defaults." />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Edit ${editing?.name || 'Agent'}`}
        footer={<ModalFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={saving} saveLabel="Save Agent" />}
      >
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">System Prompt</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              rows={12}
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-slate-300 text-teal-600"
            />
            Active
          </label>
        </div>
      </Modal>
    </div>
  )
}
