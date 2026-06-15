import { Bot, Copy, Check, Loader2, Sparkles, User, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AIGeneratorChatPanel({
  output,
  generating,
  generationId,
  selectedAgent,
  selectedTemplate,
  copied,
  saving,
  saveMessage,
  onCopy,
  onSave,
  onOutputChange,
  onRegenerate,
}) {
  if (!output && !generating) {
    return (
      <div className="ai-gen-welcome flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="ai-gen-welcome-orb mb-6 flex h-20 w-20 items-center justify-center rounded-3xl">
          <Sparkles className="h-9 w-9 text-violet-300" />
        </div>
        <p className="ai-gen-welcome-eyebrow mb-2">Production workspace</p>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Your AI command center is ready</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
          Configure your specialist and template on the left, attach screenshots or dictate your brief below, then generate client-ready content in seconds.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {['Flight quotation', 'Hotel comparison', 'Group costing', 'Cruise proposal'].map((hint) => (
            <span key={hint} className="ai-gen-hint-chip">{hint}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {/* User context bubble */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md border border-slate-200/80 bg-slate-100 px-4 py-3 text-sm text-slate-700 shadow-sm">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <User className="h-3 w-3" /> Your brief
              </div>
              <p>
                Generate <span className="font-semibold">{selectedTemplate?.name || 'content'}</span>
                {selectedAgent ? <> using <span className="font-semibold">{selectedAgent.name}</span></> : null}
              </p>
            </div>
          </div>

          {/* Assistant bubble */}
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-500/25">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">{selectedAgent?.name || 'AI Assistant'}</span>
                {generating && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                    Writing…
                  </span>
                )}
              </div>
              <div className="ai-gen-output-bubble overflow-hidden rounded-2xl rounded-tl-md border border-slate-200/80 bg-white shadow-md">
                {generating && !output ? (
                  <div className="space-y-3 px-5 py-6">
                    <div className="ai-gen-shimmer h-3 w-3/4 rounded-full" />
                    <div className="ai-gen-shimmer h-3 w-full rounded-full" />
                    <div className="ai-gen-shimmer h-3 w-5/6 rounded-full" />
                    <div className="ai-gen-shimmer h-3 w-2/3 rounded-full" />
                  </div>
                ) : (
                  <textarea
                    className="min-h-[20rem] w-full resize-y border-0 bg-transparent px-5 py-4 text-[0.9375rem] leading-[1.75] text-slate-800 focus:outline-none focus:ring-0"
                    rows={16}
                    value={output}
                    onChange={(e) => onOutputChange(e.target.value)}
                    placeholder="Generated content will appear here…"
                  />
                )}
              </div>

              {output && !generating && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {generationId && (
                    <p className="mr-auto text-[11px] text-slate-500">
                      Saved to history ·{' '}
                      <Link to="/ai-workspace/history" className="font-semibold text-teal-700 hover:underline">
                        View all
                      </Link>
                    </p>
                  )}
                  {saveMessage && (
                    <span className={`text-xs ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-emerald-600'}`}>
                      {saveMessage}
                    </span>
                  )}
                  {generationId && (
                    <button type="button" onClick={onSave} disabled={saving} className="ai-gen-action-btn">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Save
                    </button>
                  )}
                  <button type="button" onClick={onCopy} className="ai-gen-action-btn">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" onClick={onRegenerate} className="ai-gen-action-btn">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
