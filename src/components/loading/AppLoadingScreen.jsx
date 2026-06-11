import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import RocketLaunch from './RocketLaunch'

const DEFAULT_STEPS = [
  'Securing your session',
  'Loading agency workspace',
  'Preparing your dashboard',
]

function LoadingContent({ title, currentStep, progress, theme }) {
  return (
    <>
      {theme === 'rocket' ? (
        <RocketLaunch />
      ) : null}

      <div className="mb-2 flex items-center justify-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-teal-400" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Travel Hub CRM
        </p>
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>

      <p
        key={currentStep}
        className="mt-3 min-h-[1.5rem] text-sm text-slate-400"
        style={{ animation: 'fadeSlideIn 0.45s ease-out' }}
      >
        {currentStep}…
      </p>

      <div className="mx-auto mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-300 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] font-medium tabular-nums text-slate-600">{progress}%</p>
    </>
  )
}

export default function AppLoadingScreen({
  title = 'Loading',
  steps = DEFAULT_STEPS,
  variant = 'fullscreen',
  theme = 'default',
  durationMs = 4000,
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (steps.length <= 1) return undefined
    const stepInterval = Math.max(800, Math.floor(durationMs / steps.length))
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length)
    }, stepInterval)
    return () => clearInterval(interval)
  }, [steps, durationMs])

  useEffect(() => {
    const start = performance.now()
    let frame = 0

    function tick(now) {
      const elapsed = now - start
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100))
      setProgress(pct)
      if (elapsed < durationMs) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [durationMs])

  const isFullscreen = variant === 'fullscreen'
  const currentStep = steps[stepIndex] ?? steps[0]
  const resolvedTheme = theme === 'rocket' || variant === 'page' ? 'rocket' : theme

  if (isFullscreen) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-teal-500/15 blur-[100px]" />
          <div className="absolute bottom-1/4 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-[90px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.06),_transparent_65%)]" />
        </div>
        <div className="relative w-full max-w-sm px-6 text-center">
          <LoadingContent
            title={title}
            currentStep={currentStep}
            progress={progress}
            theme={resolvedTheme}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[58vh] w-full items-center justify-center">
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-6 py-10 text-center shadow-xl sm:py-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-sm">
          <LoadingContent
            title={title}
            currentStep={currentStep}
            progress={progress}
            theme={resolvedTheme}
          />
        </div>
      </div>
    </div>
  )
}
