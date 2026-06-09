import { Globe, MapPin, PenLine, Sparkles } from 'lucide-react'
import { getLeadInquiryDisplay, getLeadInquiryTheme, LEAD_SOURCE_TONES } from '../../utils/leadDisplay'

export default function LeadInquiryCell({ lead }) {
  const { title, subtitle, origin, channel, tone } = getLeadInquiryDisplay(lead)
  const theme = getLeadInquiryTheme(tone)
  const toneClass = LEAD_SOURCE_TONES[tone] || LEAD_SOURCE_TONES.website
  const isManual = tone === 'manual'

  return (
    <div className={`relative min-w-0 max-w-[14rem] overflow-hidden rounded-xl border p-2.5 sm:max-w-[18rem] sm:min-w-[11rem] sm:p-3 ${theme.card}`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${theme.accent}`} aria-hidden />

      <div className="flex items-start gap-2.5 pl-1.5">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${theme.iconWrap}`}>
          <MapPin className="h-4 w-4" aria-hidden />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div>
            <p className={`font-semibold leading-snug ${theme.title}`}>{title}</p>
            {subtitle && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{subtitle}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${toneClass}`}
            >
              {isManual ? <PenLine className="h-3 w-3" aria-hidden /> : <Globe className="h-3 w-3" aria-hidden />}
              {origin}
            </span>
            {!isManual && channel && channel !== origin && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${theme.channel}`}>
                <Sparkles className="h-3 w-3 opacity-70" aria-hidden />
                {channel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
