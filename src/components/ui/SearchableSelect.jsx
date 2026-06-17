import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, X } from 'lucide-react'

function defaultFilter(item, query, getSearchText) {
  if (!query.trim()) return true
  const haystack = (getSearchText?.(item) || '').toLowerCase()
  return haystack.includes(query.trim().toLowerCase())
}

function useDropdownPosition(open, anchorRef) {
  const [style, setStyle] = useState(null)

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setStyle(null)
      return undefined
    }

    function update() {
      const el = anchorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const viewportH = window.innerHeight
      const spaceBelow = viewportH - rect.bottom - 12
      const spaceAbove = rect.top - 12
      const preferred = Math.min(280, Math.max(160, spaceBelow))
      const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow
      const maxHeight = placeAbove
        ? Math.min(280, spaceAbove)
        : preferred

      setStyle({
        position: 'fixed',
        left: Math.max(8, rect.left),
        width: Math.min(rect.width, window.innerWidth - 16),
        top: placeAbove ? rect.top - maxHeight - 8 : rect.bottom + 8,
        maxHeight,
        zIndex: 70,
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorRef])

  return style
}

export default function SearchableSelect({
  label,
  hint,
  value,
  onChange,
  items = [],
  getValue = (item) => item?.id,
  getLabel = (item) => String(item),
  getSearchText = (item) => getLabel(item),
  getSubLabel,
  placeholder = 'Search…',
  emptyLabel = 'No match found',
  allowClear = true,
  clearLabel = 'Clear selection',
  disabled = false,
  required = false,
  error,
}) {
  const listId = useId()
  const rootRef = useRef(null)
  const anchorRef = useRef(null)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const dropdownStyle = useDropdownPosition(open, anchorRef)

  const selected = useMemo(
    () => items.find((item) => getValue(item) === value) || null,
    [items, value, getValue],
  )

  const filtered = useMemo(
    () => items.filter((item) => defaultFilter(item, query, getSearchText)),
    [items, query, getSearchText],
  )

  useEffect(() => {
    function handleClickOutside(e) {
      const target = e.target
      if (rootRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(item) {
    onChange(getValue(item))
    setQuery('')
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  const dropdown = open && !disabled && dropdownStyle && createPortal(
    <div
      ref={dropdownRef}
      id={listId}
      style={dropdownStyle}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"
    >
      <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {filtered.length} result{filtered.length === 1 ? '' : 's'}
        {items.length > 0 && ` · ${items.length} total`}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
        {allowClear && value && (
          <li>
            <button
              type="button"
              onClick={handleClear}
              className="flex w-full items-center px-3 py-3 text-left text-sm text-slate-500 active:bg-slate-100 sm:py-2.5 sm:hover:bg-slate-50"
            >
              {clearLabel}
            </button>
          </li>
        )}
        {filtered.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-slate-500">{emptyLabel}</li>
        ) : filtered.map((item) => {
          const id = getValue(item)
          const isSelected = id === value
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className={`flex w-full items-start gap-2 px-3 py-3 text-left transition active:bg-teal-50 sm:py-2.5 sm:hover:bg-teal-50/80 ${
                  isSelected ? 'bg-teal-50' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{getLabel(item)}</p>
                  {getSubLabel?.(item) && (
                    <p className="mt-0.5 text-xs text-slate-500">{getSubLabel(item)}</p>
                  )}
                </div>
                {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>,
    document.body,
  )

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}

      <div ref={anchorRef}>
        {selected && !open ? (
          <div className="flex flex-col gap-2 rounded-xl border border-teal-200/80 bg-gradient-to-r from-teal-50/80 to-white p-3 shadow-sm sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{getLabel(selected)}</p>
              {getSubLabel?.(selected) && (
                <p className="mt-0.5 break-all text-xs text-slate-500 sm:truncate">{getSubLabel(selected)}</p>
              )}
            </div>
            {!disabled && (
              <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                >
                  Change
                </button>
                {allowClear && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label={clearLabel}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              disabled={disabled}
              placeholder={placeholder}
              className={`w-full rounded-xl border bg-white py-3 pl-10 pr-10 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 sm:py-2.5 sm:text-sm ${
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-teal-500/20'
              }`}
              aria-expanded={open}
              aria-controls={listId}
              autoComplete="off"
            />
            <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>

      {dropdown}

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function clientSearchText(client) {
  return [client?.full_name, client?.company_name, client?.email, client?.phone, client?.passport_number]
    .filter(Boolean)
    .join(' ')
}

export function clientSubLabel(client) {
  const parts = [client?.email, client?.phone].filter(Boolean)
  return parts.join(' · ') || null
}

export function leadSearchText(lead) {
  const clientName = lead?.clients?.full_name || lead?.clients?.company_name || ''
  return [lead?.destination, clientName, lead?.travel_type, lead?.notes].filter(Boolean).join(' ')
}

export function leadSubLabel(lead) {
  const parts = []
  if (lead?.clients) parts.push(lead.clients.full_name || lead.clients.company_name)
  if (lead?.budget != null) parts.push(`Budget: €${lead.budget}`)
  return parts.filter(Boolean).join(' · ') || null
}
