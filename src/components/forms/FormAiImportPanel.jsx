import { useState } from 'react'
import { Bot, Loader2, Sparkles, Wand2 } from 'lucide-react'
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

  const handleGenerate = async (useAi = true) => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await importFormFromText(text, session, { useAi })
      const count = onImport(result)
      setMessage(`Imported ${count} question${count === 1 ? '' : 's'}. Review and edit below, then save.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/40 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Import from ChatGPT</h3>
          <p className="mt-1 text-sm text-slate-600">
            Paste a survey outline from ChatGPT or Google Forms. AI will build the title, description, and multiple-choice questions — then you can edit everything.
          </p>
        </div>
      </div>

      <textarea
        className="min-h-[220px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
        placeholder={EXAMPLE}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => handleGenerate(true)} disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate with AI
        </Button>
        <Button type="button" variant="secondary" onClick={() => handleGenerate(false)} disabled={loading || !text.trim()}>
          <Wand2 className="h-4 w-4" /> Quick parse (no AI)
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Tip: Ask ChatGPT to create a post-trip feedback survey with multiple-choice rating questions for each hotel and activity.
      </p>
    </div>
  )
}
