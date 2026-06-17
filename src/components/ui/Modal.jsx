import { X } from 'lucide-react'
import Button from './Button'

const SIZES = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

export default function Modal({ isOpen, onClose, title, subtitle, children, footer, size = 'md' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={`relative z-10 w-full ${SIZES[size] || SIZES.md} max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-8rem)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/80 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ModalFooter({ onCancel, onSave, saveLabel = 'Save', saving = false, formId }) {
  return (
    <>
      <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
      <Button
        type={formId ? 'submit' : 'button'}
        form={formId}
        onClick={formId ? undefined : onSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : saveLabel}
      </Button>
    </>
  )
}
