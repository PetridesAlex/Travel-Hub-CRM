import { useState } from 'react'
import { Bot, Loader2, Sparkles, Wand2, FileText, ClipboardPaste, ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import { importFormFromText } from '../../services/formAiImport'
import { useAuth } from '../../hooks/useAuth'

const EXAMPLE = `Canada | 14-22 July 2025

Your opinion matters! Please take a few minutes to share your feedback.

How would you rate your overall experience on the Canada trip?
• Excellent
• Very Good
• Good
• Fair
• Poor

Did the program meet your expectations?
• Fully
• Mostly
• Not quite
• Not at all

How would you rate "Le Centre Sheraton Montreal hotel"?
• Excellent
• Very Good
• Good
• Fair
• Poor`

const STEPS = [
  'Paste your ChatGPT or Google Forms outline on the right',
  'Click Generate with AI to build questions automatically',
  'Review in Builder, add hotel photos, then Publish & Distribute',
]

export default function FormAiImportPanel({ onImport }) {
  const { session } = useAuth()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadExample = () => {
    setText(EXAMPLE)
    setError('')
    setMessage('Example survey loaded — ready to generate.')
  }

  const handleGenerate = async (useAi = true) => {
    if (!text.trim()) {
      setError('Paste your survey text on the right, or load the example first.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await importFormFromText(text, session, { useAi })
      const { count, fallbackNote } = onImport(result)
      let msg = `${count} question${count === 1 ? '' : 's'} imported — switched to Builder for review.`
      if (fallbackNote) msg = `${fallbackNote} ${msg}`
      setMessage(msg)
    } catch (err) {
      setError(err.message || 'Import failed. Try Quick parse or check you are signed in.')
    } finally {
      setLoading(false)
    }
  }

  const hasText = Boolean(text.trim())

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)]">
      <div className="pointer-events-none h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

      <div className="grid lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Left panel — guidance */}
        <div className="relative border-b border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900 p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-100">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered
            </div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white shadow-lg shadow-violet-900/40">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">Import from ChatGPT</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Turn a pasted survey outline into a polished, branded feedback form in seconds.
            </p>

            <ol className="mt-8 space-y-4">
              {STEPS.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-violet-200">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-snug">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pro tip</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                Ask ChatGPT: &ldquo;Create a post-trip feedback survey with rating questions for each hotel.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Right panel — editor */}
        <div className="flex flex-col bg-gradient-to-b from-slate-50/80 to-white p-6 lg:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ClipboardPaste className="h-4 w-4 text-violet-600" />
              Survey outline
            </div>
            <button
              type="button"
              onClick={loadExample}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
            >
              <FileText className="h-3.5 w-3.5" />
              Load example
            </button>
          </div>

          {!hasText && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-900">
              <span className="font-medium">Note:</span>
              <span>Gray placeholder text is not included — paste or load the example.</span>
            </div>
          )}

          <div className="relative flex-1">
            <textarea
              className="min-h-[260px] w-full resize-y rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 font-mono text-[13px] leading-relaxed text-slate-800 shadow-inner shadow-slate-900/5 transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 lg:min-h-[320px]"
              placeholder="Paste your survey here…"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (error) setError('')
              }}
            />
            {hasText && (
              <span className="absolute bottom-3 right-3 rounded-md bg-slate-900/70 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white">
                {text.trim().length} chars
              </span>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}
          {message && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <ArrowRight className="h-4 w-4 shrink-0" />
              {message}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200/60 pt-6">
            <Button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={loading}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-violet-900/20 hover:from-violet-700 hover:to-indigo-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate with AI
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleGenerate(false)} disabled={loading}>
              <Wand2 className="h-4 w-4" /> Quick parse
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
