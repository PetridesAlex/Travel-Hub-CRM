import { useState } from 'react'
import { Bot, Loader2, Sparkles, Wand2, FileText } from 'lucide-react'
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

export default function FormAiImportPanel({ onImport }) {
  const { session } = useAuth()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadExample = () => {
    setText(EXAMPLE)
    setError('')
    setMessage('Example loaded — click Generate with AI or edit the text first.')
  }

  const handleGenerate = async (useAi = true) => {
    if (!text.trim()) {
      setError('Paste your survey text above, or click "Load example survey" to try it.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await importFormFromText(text, session, { useAi })
      const { count, fallbackNote } = onImport(result)
      let msg = `Imported ${count} question${count === 1 ? '' : 's'}. Switched to Builder — review, add images, then save.`
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
    <div className="space-y-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/40 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Import from ChatGPT</h3>
          <p className="mt-1 text-sm text-slate-600">
            Paste a survey outline from ChatGPT or Google Forms. AI builds the title, description, and multiple-choice questions.
          </p>
        </div>
      </div>

      {!hasText && (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The gray placeholder is not included automatically — paste your text or load the example below.
        </p>
      )}

      <textarea
        className="min-h-[220px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
        placeholder="Paste your survey here…"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (error) setError('')
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={loadExample}>
          <FileText className="h-4 w-4" /> Load example survey
        </Button>
        {hasText && (
          <span className="text-xs text-slate-500">{text.trim().length} characters ready</span>
        )}
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => handleGenerate(true)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate with AI
        </Button>
        <Button type="button" variant="secondary" onClick={() => handleGenerate(false)} disabled={loading}>
          <Wand2 className="h-4 w-4" /> Quick parse (no AI)
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Local dev: run <code className="rounded bg-slate-100 px-1">npm run dev:api</code> in a second terminal so AI requests reach the server.
      </p>
    </div>
  )
}
