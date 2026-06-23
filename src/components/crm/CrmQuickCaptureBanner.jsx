import { Bot, ChevronRight, Sparkles } from 'lucide-react'
import Button from '../ui/Button'

export default function CrmQuickCaptureBanner({ onOpen, mode = 'client' }) {
  const isClient = mode === 'client'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-teal-50/40 p-4 shadow-[0_8px_30px_-20px_rgba(91,33,182,0.25)] sm:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-300/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 left-1/4 h-24 w-24 rounded-full bg-teal-300/15 blur-2xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-teal-600 text-white shadow-lg shadow-violet-900/25">
            <Bot className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-violet-200/80 bg-violet-100/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-800">
              <Sparkles className="h-3 w-3" />
              AI assistant
            </div>
            <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {isClient ? 'Add clients by typing naturally' : 'Capture leads from any message'}
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              {isClient
                ? 'Choose Individual or Corporate, paste details or speak freely — e.g. “Save Alex Petrides, phone 97866884, email alex@…”'
                : 'Paste WhatsApp, email, or phone notes — I extract the client, trip, and budget automatically.'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={onOpen}
          className="shrink-0 bg-gradient-to-r from-violet-600 to-teal-600 shadow-lg shadow-violet-900/20 hover:from-violet-700 hover:to-teal-700"
        >
          Open AI assistant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
