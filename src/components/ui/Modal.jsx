import { useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

const SIZES = {
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
}

export default function Modal({ isOpen, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/5 ${
          SIZES[size] || SIZES.md
        } max-h-[min(94dvh,100%)] rounded-t-2xl sm:max-h-[min(92dvh,100%)] sm:rounded-2xl`}
      >
        {/* Header — sticky */}
        <div className="shrink-0 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-2">
              <h2 id="modal-title" className="text-base font-bold tracking-tight text-slate-900 sm:text-xl">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 hidden text-sm leading-relaxed text-slate-500 sm:block">
                  {subtitle}
                </p>
              )}
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
          {subtitle && (
            <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:hidden">
              {subtitle}
            </p>
          )}
        </div>

        {/* Body — scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {/* Footer — sticky */}
        {footer && (
          <div className="shrink-0 border-t border-slate-200/80 bg-slate-50/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ModalFooter({
  onCancel,
  onSave,
  saveLabel = 'Save',
  saving = false,
  formId,
  cancelLabel = 'Cancel',
}) {
  return (
    <>
      <Button variant="secondary" type="button" onClick={onCancel} disabled={saving}>
        {cancelLabel}
      </Button>
      <Button
        type={formId ? 'submit' : 'button'}
        form={formId}
        onClick={formId ? undefined : onSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : saveLabel}
      </Button>
    </>
  )
}
