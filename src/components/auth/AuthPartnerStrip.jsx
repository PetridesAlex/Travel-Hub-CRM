function SupabaseLogo({ className = 'h-8 w-8' }) {
  return (
    <img
      src="/partners/supabase.png"
      alt=""
      className={`${className} object-contain`}
      aria-hidden="true"
    />
  )
}

function SlackLogo({ className = 'h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        fill="#E01E5A"
      />
      <path
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill="#36C5F0"
      />
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        fill="#2EB67D"
      />
      <path
        d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.528 2.528 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z"
        fill="#ECB22E"
      />
    </svg>
  )
}

function OpenAILogo({ className = 'h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A5.985 5.985 0 0 0 11.12.488a6.048 6.048 0 0 0-5.8 4.21 5.986 5.986 0 0 0-4.04 2.858 6.042 6.042 0 0 0 .742 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 12.88 23.512a6.048 6.048 0 0 0 5.8-4.211 5.987 5.987 0 0 0 4.039-2.858 6.042 6.042 0 0 0-.437-7.622zm-9.222 12.36a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.516 4.516 0 0 1-4.494 4.494zM4.176 18.78a4.475 4.475 0 0 1-.535-3.014l.142.085 4.783 2.759a.795.795 0 0 0 .788 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 20.95a4.516 4.516 0 0 1-6.564-4.17zM2.594 7.914a4.47 4.47 0 0 1 2.366-1.973V11.6a.79.79 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.516 4.516 0 0 1 2.594 7.914zm16.098 3.785l-5.836-3.37L15.88 7.36a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.679zm2.01-3.023l-.141-.085-4.774-2.782a.795.795 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.494 4.494 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.955a4.494 4.494 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681l-.004 6.69z" />
    </svg>
  )
}

function ResendLogo({ className = 'h-8 w-8' }) {
  return (
    <img
      src="/partners/resend.png"
      alt=""
      className={`${className} object-contain`}
      aria-hidden="true"
    />
  )
}

const PARTNERS = [
  { name: 'Supabase', Logo: SupabaseLogo, logoClass: 'h-8 w-8' },
  { name: 'Slack', Logo: SlackLogo, logoClass: 'h-6 w-6' },
  { name: 'OpenAI', Logo: OpenAILogo, logoClass: 'h-6 w-6 text-white' },
  { name: 'Resend', Logo: ResendLogo, logoClass: 'h-8 w-8' },
]

export default function AuthPartnerStrip() {
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Powered by
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PARTNERS.map(({ name, Logo, logoClass }) => (
          <div
            key={name}
            className="group flex flex-col items-center justify-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 backdrop-blur-sm transition duration-300 hover:border-white/[0.12] hover:bg-white/[0.05] hover:shadow-[0_8px_32px_-12px_rgba(45,212,191,0.15)]"
          >
            <div className="flex h-8 items-center justify-center opacity-80 transition duration-300 group-hover:opacity-100">
              <Logo className={logoClass} />
            </div>
            <span className="text-[10px] font-medium tracking-wide text-slate-600 transition group-hover:text-slate-400">
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
