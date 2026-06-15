import { Bot, Sparkles, Zap } from 'lucide-react'

export default function AIGeneratorHero() {
  return (
    <div className="ai-gen-hero relative overflow-hidden rounded-2xl border border-slate-200/80 px-5 py-6 shadow-xl sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/4 h-32 w-32 rounded-full bg-teal-500/15 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/90">
              AI Command Center
            </span>
          </div>
          <h1 className="bg-gradient-to-r from-white via-slate-100 to-violet-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            AI Generator
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Choose your specialist, drop in screenshots or speak your brief — production-ready emails, quotes, and itineraries in seconds.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="ai-gen-stat-chip">
            <Bot className="h-3.5 w-3.5 text-teal-400" />
            Multi-agent
          </span>
          <span className="ai-gen-stat-chip">
            <Zap className="h-3.5 w-3.5 text-violet-400" />
            Screenshot OCR
          </span>
        </div>
      </div>
    </div>
  )
}
