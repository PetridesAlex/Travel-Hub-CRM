import { useState } from 'react'
import { Loader2, Send, Sparkles, Mic } from 'lucide-react'
import VoiceInputButton from '../VoiceInputButton'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

export default function AICalendarAssistant({
  suggestions = [],
  onAsk,
  loading = false,
  lastReply = '',
  error = '',
}) {
  const [message, setMessage] = useState('')
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
    await onAsk(text)
  }

  function handleSuggestion(prompt) {
    setMessage(prompt)
    onAsk(prompt)
  }

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white shadow-xl">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 ring-1 ring-violet-400/30">
            <Sparkles className="h-4 w-4 text-violet-300" />
          </span>
          <div>
            <p className="text-sm font-bold">AI Calendar Assistant</p>
            <p className="text-[11px] text-slate-400">Schedule, summarize, and manage your week</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Suggestions</p>
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSuggestion(item.prompt)}
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-xs text-slate-200 transition hover:border-violet-400/30 hover:bg-violet-500/10 disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {lastReply && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300">Assistant</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{lastReply}</p>
          </div>
        )}

        {(error || speechError) && (
          <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-200 ring-1 ring-red-400/20">
            <p>{error || speechError}</p>
            {error?.includes('502') || error?.includes('dev:api') ? (
              <p className="mt-1 text-[10px] opacity-80">Run: npm run dev:api in a second terminal</p>
            ) : null}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-white/10 bg-slate-950/80 p-4">
        <div className="relative">
          <textarea
            value={displayMessage}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder='e.g. "Schedule follow-up with Andreas next Tuesday at 10am"'
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
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
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? 'Thinking...' : 'Ask assistant'}
        </button>
        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-500">
          <Mic className="h-3 w-3" />
          Voice or text — creates events, tasks, and follow-ups
        </p>
      </form>
    </div>
  )
}
