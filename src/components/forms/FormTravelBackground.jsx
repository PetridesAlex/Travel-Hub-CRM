import { Plane } from 'lucide-react'

export default function FormTravelBackground({ children, brandColor = '#0d9488', className = '' }) {
  return (
    <div
      className={`form-travel-bg relative min-h-screen overflow-hidden ${className}`}
      style={{ '--form-brand': brandColor }}
    >
      <div className="form-travel-bg__mesh pointer-events-none absolute inset-0" aria-hidden />
      <div className="form-travel-bg__sun pointer-events-none absolute inset-0" aria-hidden />
      <div className="form-travel-bg__cloud form-travel-bg__cloud--1 pointer-events-none absolute" aria-hidden />
      <div className="form-travel-bg__cloud form-travel-bg__cloud--2 pointer-events-none absolute" aria-hidden />
      <div className="form-travel-bg__cloud form-travel-bg__cloud--3 pointer-events-none absolute" aria-hidden />

      <svg
        className="form-travel-bg__mountains pointer-events-none absolute inset-x-0 bottom-0 h-[38%] w-full"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="form-travel-mountain-far" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--form-brand)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--form-brand)" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="form-travel-mountain-near" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--form-brand)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--form-brand)" stopOpacity="0.14" />
          </linearGradient>
        </defs>
        <path
          fill="url(#form-travel-mountain-far)"
          d="M0,320 L120,220 L280,300 L420,180 L580,280 L720,160 L900,290 L1080,200 L1240,310 L1440,240 L1440,400 L0,400 Z"
        />
        <path
          fill="url(#form-travel-mountain-near)"
          d="M0,360 L200,260 L380,340 L520,240 L680,330 L860,250 L1040,350 L1200,270 L1440,340 L1440,400 L0,400 Z"
        />
      </svg>

      <svg
        className="form-travel-bg__route pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <path
          className="form-travel-bg__route-line"
          d="M -40 720 Q 360 520, 720 480 T 1480 280"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 14"
        />
      </svg>

      <div className="form-travel-bg__plane pointer-events-none absolute" aria-hidden>
        <Plane className="h-5 w-5 rotate-[12deg] text-slate-500/70" strokeWidth={1.75} />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  )
}
