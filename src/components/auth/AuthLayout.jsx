import { Sparkles, Shield, Zap, Globe, Plane } from 'lucide-react'
import AuthPartnerStrip from './AuthPartnerStrip'

const FEATURES = [
  { icon: Zap, label: 'AI-powered proposals & emails' },
  { icon: Globe, label: 'Website leads synced instantly' },
  { icon: Shield, label: 'Secure multi-agency workspace' },
]

function splitTitleAccent(title = '') {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) return { lead: title, accent: null }
  const accent = words.pop()
  return { lead: words.join(' '), accent }
}

export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  const { lead, accent } = splitTitleAccent(title)

  return (
    <div className="relative min-h-screen min-h-[100dvh] overflow-x-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-teal-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.08),_transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen min-h-[100dvh] w-full max-w-[1440px] flex-col lg:flex-row">
        {/* Brand panel */}
        <div className="relative hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center lg:border-r lg:border-white/[0.06] lg:px-12 xl:px-16 2xl:px-20">
          <div className="flex w-full max-w-[28rem] flex-col gap-10 py-16 xl:gap-12 xl:py-20">
            <div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-teal-400/30 blur-lg" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 shadow-lg shadow-teal-900/50 ring-1 ring-white/10">
                    <Plane className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-white">Travel Hub CRM</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-teal-400" />
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                      Premium travel operations
                    </p>
                  </div>
                </div>
              </div>

              <h1 className="mt-10 text-4xl font-semibold leading-[1.15] tracking-tight text-white xl:mt-12 xl:text-[2.65rem]">
                Run your agency
                <span className="mt-2 block bg-gradient-to-r from-teal-200 via-teal-400 to-cyan-300 bg-clip-text text-transparent">
                  like a premium brand.
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
                Leads, bookings, AI proposals, and Slack alerts — unified in one elegant workspace built for modern travel agencies.
              </p>
            </div>

            <AuthPartnerStrip />

            <ul className="space-y-3">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 backdrop-blur-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300 ring-1 ring-teal-400/20">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-300">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8 sm:py-14 md:px-12 lg:w-1/2 lg:px-14 lg:py-16 xl:px-20 2xl:px-24">
          <div className="w-full max-w-[26rem] sm:max-w-[28rem]">
            <div className="mb-8 text-center lg:mb-10">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 shadow-lg ring-1 ring-white/10 lg:hidden">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 lg:hidden">Travel Hub CRM</p>
            </div>

            <div className="mb-8 text-center sm:mb-10">
              {eyebrow && <p className="auth-eyebrow">{eyebrow}</p>}
              <h2 className={`auth-display ${eyebrow ? 'mt-3' : ''}`}>
                {accent ? (
                  <>
                    <span className="auth-display-lead">{lead}</span>{' '}
                    <span className="auth-display-accent">{accent}</span>
                  </>
                ) : (
                  title
                )}
              </h2>
              {subtitle && <p className="auth-lead mx-auto">{subtitle}</p>}
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-teal-400/25 via-white/5 to-transparent" />
              <div className="relative rounded-2xl border border-white/[0.08] bg-slate-900/80 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8 md:p-9">
                {children}
              </div>
            </div>

            {footer && (
              <div className="mt-7 text-center text-sm text-slate-500 sm:mt-8">{footer}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
