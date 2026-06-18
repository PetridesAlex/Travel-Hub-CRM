import Input from '../ui/Input'
import Select from '../ui/Select'

const fieldClass =
  'w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20'

export default function QuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
  onFileSelect,
}) {
  const { question_type: type, question_text: label, help_text: help, options = [], config = {}, required } = question

  const wrap = (children) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-800">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {help && <p className="text-xs text-slate-500">{help}</p>}
      {children}
    </div>
  )

  if (type === 'long_text') {
    return wrap(
      <textarea
        className={`${fieldClass} min-h-[100px] resize-y`}
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />,
    )
  }

  if (type === 'dropdown') {
    return wrap(
      <Select
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        options={[{ value: '', label: 'Select…' }, ...options.map((o) => ({ value: o, label: o }))]}
      />,
    )
  }

  if (type === 'radio') {
    return wrap(
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name={question.id}
              checked={value === opt}
              disabled={disabled}
              onChange={() => onChange(opt)}
              className="text-teal-600"
            />
            {opt}
          </label>
        ))}
      </div>,
    )
  }

  if (type === 'checkbox') {
    const selected = Array.isArray(value) ? value : []
    return wrap(
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.checked) onChange([...selected, opt])
                else onChange(selected.filter((v) => v !== opt))
              }}
              className="rounded text-teal-600"
            />
            {opt}
          </label>
        ))}
      </div>,
    )
  }

  if (type === 'date') {
    return wrap(
      <input
        type="date"
        className={fieldClass}
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />,
    )
  }

  if (type === 'rating') {
    const max = config.max || 5
    const current = Number(value) || 0
    return wrap(
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-lg border text-sm font-semibold transition ${
              n <= current
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-400 hover:border-amber-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>,
    )
  }

  if (type === 'nps') {
    const current = value != null ? Number(value) : null
    return wrap(
      <div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(n)}
              className={`h-8 min-w-[2rem] rounded-lg border px-1 text-xs font-semibold transition ${
                current === n
                  ? 'border-teal-400 bg-teal-50 text-teal-800'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-teal-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>{config.low_label || 'Not likely'}</span>
          <span>{config.high_label || 'Very likely'}</span>
        </div>
      </div>,
    )
  }

  if (type === 'yes_no') {
    return wrap(
      <div className="flex gap-3">
        {['yes', 'no'].map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition ${
              value === opt
                ? 'border-teal-400 bg-teal-50 text-teal-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>,
    )
  }

  if (type === 'file') {
    return wrap(
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
      />,
    )
  }

  const inputType = type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'
  return wrap(
    <Input
      type={inputType}
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />,
  )
}
