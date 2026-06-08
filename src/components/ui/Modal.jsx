import { X } from 'lucide-react'
import Button from './Button'

export default function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
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
