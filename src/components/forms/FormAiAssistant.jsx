import { useState } from 'react'
import { Link2, Loader2, Send, Sparkles, Mic, Copy, CheckCircle2, ExternalLink, Pencil } from 'lucide-react'
import VoiceInputButton from '../VoiceInputButton'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

const SUGGESTIONS = [
  {
    id: 'feedback',
    label: 'Post-trip feedback',
    prompt: `Canada group trip | July 2025 feedback

Your opinion matters! Please share your feedback on the trip.

How would you rate your overall experience?
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

How would you rate the hotel accommodation?
• Excellent
• Very Good
• Good
• Fair
• Poor

Any comments or suggestions for future trips?`,
  },
  {
    id: 'hotel',
    label: 'Hotel ratings',
    prompt: `Hotel stay feedback — Rhodes 2026

How would you rate "Grand Hotel Rhodes"?
• Excellent
• Very Good
• Good
• Fair
• Poor

Was the room clean and comfortable?
• Yes
• No

How was the breakfast service?
• Excellent
• Good
• Average
• Poor

Would you recommend this hotel to other travellers?
• Yes
• No`,
  },
  {
    id: 'nps',
    label: 'NPS survey',
    prompt: `Travel agency satisfaction survey

How likely are you to recommend our agency to a friend or colleague? (0 = not at all, 10 = extremely likely)

How would you rate our booking process?
• Excellent
• Very Good
• Good
• Fair
• Poor

What did we do well?

What could we improve?`,
  },
]

export default function FormAiAssistant({
  onGenerate,
  loading = false,
  result = null,
  error = '',
}) {
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const {
    transcript,
    isListening,
    isSupported,
    isRequestingPermission,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition()

  const displayMessage = isListening ? `${message}${message && transcript ? ' ' : ''}${transcript}` : message

  async function handleSubmit(e) {
    e?.preventDefault()
    const text = (isListening ? displayMessage : message).trim()
    if (!text || loading) return
    setMessage('')
    if (isListening) stopListening()
    await onGenerate(text)
  }

  function handleSuggestion(prompt) {
    setMessage(prompt)
    onGenerate(prompt)
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may fail silently
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-r from-slate-900 via-violet-950 to-rose-950 text-white shadow-xl">
      <form onSubmit={handleSubmit} className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Label + quick start */}
          <div className="flex shrink-0 flex-col gap-2 lg:w-52 xl:w-56">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 ring-1 ring-violet-400/30">
                <Sparkles className="h-4 w-4 text-violet-300" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">AI Form Assistant</p>
                <p className="text-[10px] text-slate-400">Paste, speak, publish & get link</p>
              </div>
            </div>
            {!result && (
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSuggestion(item.prompt)}
                    disabled={loading}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-200 transition hover:border-violet-400/30 hover:bg-violet-500/10 disabled:opacity-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input + action */}
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative min-w-0 flex-1">
              <textarea
                value={displayMessage}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder='Paste survey or describe: "Post-trip feedback with hotel ratings..."'
                className="h-full min-h-[3.25rem] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 sm:min-h-[2.75rem]"
              />
              {isSupported && (
                <div className="absolute right-2 top-2">
                  <VoiceInputButton
                    isListening={isListening}
                    isSupported={isSupported}
                    isRequestingPermission={isRequestingPermission}
                    onStart={startListening}
                    onStop={stopListening}
                    size="sm"
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !displayMessage.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end rounded-xl bg-gradient-to-r from-violet-600 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-violet-500 hover:to-rose-500 disabled:opacity-50 sm:self-stretch sm:px-5"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? 'Generating…' : 'Generate & publish'}
            </button>
          </div>
        </div>

        {/* Result / error — full width below */}
        {result && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2 sm:flex-1">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-100">
                  Published · {result.questionCount} questions · {result.form?.title}
                </p>
                <p className="truncate font-mono text-[11px] text-violet-200" title={result.publicUrl}>
                  {result.publicUrl}
                </p>
                {result.fallbackNote && (
                  <p className="mt-1 text-[10px] text-amber-200/90">{result.fallbackNote}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => copyLink(result.publicUrl)}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <a
                href={result.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Preview
              </a>
              <a
                href={`/forms/${result.form?.id}/edit`}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </a>
            </div>
          </div>
        )}

        {(error || speechError) && (
          <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-200 ring-1 ring-red-400/20">
            <p>{error || speechError}</p>
            {error?.includes('502') || error?.includes('dev:api') ? (
              <p className="mt-0.5 text-[10px] opacity-80">Run: npm run dev:api</p>
            ) : null}
          </div>
        )}

        <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500 lg:pl-[13.5rem]">
          <Mic className="h-3 w-3" />
          <Link2 className="h-3 w-3" />
          Voice or text — creates questions, publishes, and returns your share link
        </p>
      </form>
    </div>
  )
}
