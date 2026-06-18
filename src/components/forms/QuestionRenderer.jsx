import Input from '../ui/Input'
import Select from '../ui/Select'

const fieldClass =
  'w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-800 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

export default function QuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
  onFileSelect,
  variant = 'default',
  branding,
}) {
  const { question_type: type, options = [], config = {}, required } = question
  const isCard = variant === 'card'

  const inner = renderField(type, { question, value, onChange, disabled, onFileSelect, options, config, fieldClass })

  if (isCard) {
    return inner
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-800">
        {question.question_text}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {question.help_text && <p className="text-xs text-slate-500">{question.help_text}</p>}
      {config.image_url && (
        <img src={config.image_url} alt="" className="my-2 w-full rounded-lg object-cover" style={{ maxHeight: '240px' }} />
      )}
      {inner}
    </div>
  )
}

function renderField(type, ctx) {
  const { question, value, onChange, disabled, onFileSelect, options, config, fieldClass } = ctx
  const accent = 'text-[var(--form-brand,#b71c1c)]'

  if (type === 'long_text') {
    return (
      <textarea
        className={`${fieldClass} min-h-[100px] resize-y`}
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (type === 'dropdown') {
    return (
      <Select
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        options={[{ value: '', label: 'Select…' }, ...options.map((o) => ({ value: o, label: o }))]}
      />
    )
  }

  if (type === 'radio' || type === 'rating') {
    const opts = type === 'rating' && !options.length
      ? Array.from({ length: config.max || 5 }, (_, i) => String(i + 1))
      : options
    return (
      <div className="space-y-2.5">
        {opts.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-3 text-[15px] text-slate-800">
            <input
              type="radio"
              name={question.id}
              checked={value === opt || String(value) === String(opt)}
              disabled={disabled}
              onChange={() => onChange(type === 'rating' ? Number(opt) : opt)}
              className={`h-4 w-4 border-slate-300 ${accent}`}
              style={{ accentColor: 'var(--form-brand, #b71c1c)' }}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (type === 'checkbox') {
    const selected = Array.isArray(value) ? value : []
    return (
      <div className="space-y-2.5">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-3 text-[15px] text-slate-800">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.checked) onChange([...selected, opt])
                else onChange(selected.filter((v) => v !== opt))
              }}
              className="h-4 w-4 rounded border-slate-300"
              style={{ accentColor: 'var(--form-brand, #b71c1c)' }}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (type === 'date') {
    return (
      <input
        type="date"
        className={fieldClass}
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (type === 'nps') {
    const current = value != null ? Number(value) : null
    return (
      <div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              className={`h-9 min-w-[2.25rem] rounded-md border px-1 text-sm font-medium transition ${
                current === n
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{config.low_label || 'Not likely'}</span>
          <span>{config.high_label || 'Very likely'}</span>
        </div>
      </div>
    )
  }

  if (type === 'yes_no') {
    return (
      <div className="space-y-2.5">
        {['Yes', 'No'].map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-3 text-[15px] text-slate-800">
            <input
              type="radio"
              name={question.id}
              checked={value === opt.toLowerCase() || value === opt}
              disabled={disabled}
              onChange={() => onChange(opt.toLowerCase())}
              className="h-4 w-4"
              style={{ accentColor: 'var(--form-brand, #b71c1c)' }}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (type === 'file') {
    return (
      <input
        type="file"
        disabled={disabled}
        accept={config.accept || 'image/*,.pdf'}
        className="text-sm text-slate-600"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file || !onFileSelect) return
          const ref = await onFileSelect(file)
          onChange(ref)
        }}
      />
    )
  }

  const inputType = type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'
  return (
    <Input
      type={inputType}
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
