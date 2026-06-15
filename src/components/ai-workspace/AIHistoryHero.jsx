import { History, Sparkles, FileStack } from 'lucide-react'

export default function AIHistoryHero({ total = 0 }) {
  return (
    <div className="ai-history-hero relative overflow-hidden rounded-2xl border border-slate-200/80 px-5 py-6 shadow-xl sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/90">
              Generation Archive
            </span>
          </div>
          <h1 className="bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            AI History
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Every email, quote, and proposal your team generates — saved automatically, ready to copy or reuse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="ai-history-stat-chip">
            <History className="h-3.5 w-3.5 text-teal-400" />
            {total} saved
          </span>
          <span className="ai-history-stat-chip">
            <FileStack className="h-3.5 w-3.5 text-indigo-400" />
            Auto-archived
          </span>
        </div>
      </div>
    </div>
  )
}
