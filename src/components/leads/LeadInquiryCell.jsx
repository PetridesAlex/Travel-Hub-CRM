import { Globe, MapPin, PenLine } from 'lucide-react'
import { getLeadInquiryDisplay, getLeadInquiryTheme, LEAD_SOURCE_TONES } from '../../utils/leadDisplay'

export default function LeadInquiryCell({ lead }) {
  const { title, context, metaLine, sourceLabel, tone } = getLeadInquiryDisplay(lead)
  const theme = getLeadInquiryTheme(tone)
  const toneClass = LEAD_SOURCE_TONES[tone] || LEAD_SOURCE_TONES.website
  const isManual = tone === 'manual'
  const SourceIcon = isManual ? PenLine : Globe

  return (
    <div className="min-w-[11rem] max-w-[22rem] py-0.5">
      <div className="flex items-start gap-2">
        <MapPin className={`mt-1 h-4 w-4 shrink-0 ${theme.icon}`} aria-hidden />

        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-words text-sm font-semibold leading-snug tracking-tight text-slate-900">
            {title}
          </p>

          {context && (
            <p className="break-words text-xs leading-relaxed text-slate-600">{context}</p>
          )}

          {metaLine && (
            <p className="break-words text-[11px] font-medium leading-relaxed text-slate-500">
              {metaLine}
            </p>
          )}

          {sourceLabel && (
            <span
              className={`inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${toneClass}`}
            >
              <SourceIcon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              <span className="truncate">{sourceLabel}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
