import { Trash2, ChevronUp, ChevronDown, Upload } from 'lucide-react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { QUESTION_TYPES } from '../../constants/formFields'

export default function QuestionEditor({ question, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const update = (patch) => onChange({ ...question, ...patch })

  const optionsText = Array.isArray(question.options) ? question.options.join('\n') : ''
  const needsOptions = ['dropdown', 'radio', 'checkbox'].includes(question.question_type)
  const imageUrl = question.config?.image_url || ''

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => update({ config: { ...question.config, image_url: reader.result } })
    reader.readAsDataURL(file)
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Field type"
              value={question.question_type}
              onChange={(e) => update({ question_type: e.target.value })}
              options={QUESTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!question.required}
                onChange={(e) => update({ required: e.target.checked })}
                className="rounded text-teal-600"
              />
              Required
            </label>
          </div>
          <Input
            label="Question"
            value={question.question_text || ''}
            onChange={(e) => update({ question_text: e.target.value })}
          />
          <Input
            label="Help text (optional)"
            value={question.help_text || ''}
            onChange={(e) => update({ help_text: e.target.value })}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Question image (optional)</label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={imageUrl?.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => update({ config: { ...question.config, image_url: e.target.value || null } })}
                placeholder="https://... hotel or destination photo"
                className="flex-1"
              />
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" /> Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="" className="mt-2 h-28 w-full rounded-lg object-cover" />
            )}
          </div>
          {needsOptions && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Options (one per line)</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={4}
                value={optionsText}
                onChange={(e) =>
                  update({
                    options: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean),
                  })
                }
              />
            </div>
          )}
          {question.question_type === 'rating' && (
            <Input
              label="Max rating"
              type="number"
              min={3}
              max={10}
              value={question.config?.max || 5}
              onChange={(e) => update({ config: { ...question.config, max: Number(e.target.value) || 5 } })}
            />
          )}
          {question.question_type === 'nps' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Low label"
                value={question.config?.low_label || ''}
                onChange={(e) => update({ config: { ...question.config, low_label: e.target.value } })}
              />
              <Input
                label="High label"
                value={question.config?.high_label || ''}
                onChange={(e) => update({ config: { ...question.config, high_label: e.target.value } })}
              />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" disabled={!canMoveUp} onClick={onMoveUp} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
            <ChevronUp className="h-4 w-4" />
          </button>
          <button type="button" disabled={!canMoveDown} onClick={onMoveDown} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
            <ChevronDown className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
