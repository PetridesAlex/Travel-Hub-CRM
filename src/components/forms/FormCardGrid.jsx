import { Link } from 'react-router-dom'
import {
  BarChart3, ClipboardList, Copy, FileText, MessageSquare, Pencil, Trash2,
  Sparkles, Calendar,
} from 'lucide-react'
import { FORM_CATEGORIES } from '../../constants/formFields'
import { formatDate, labelFor } from '../../utils/format'

const CATEGORY_GRADIENTS = {
  feedback: 'from-rose-500 via-fuchsia-500 to-orange-400',
  satisfaction: 'from-violet-500 via-purple-500 to-indigo-500',
  corporate: 'from-slate-600 via-slate-700 to-slate-800',
  cruise: 'from-sky-500 via-blue-500 to-indigo-600',
  school: 'from-amber-400 via-orange-500 to-rose-500',
  lead_gen: 'from-teal-500 via-emerald-500 to-cyan-500',
  custom: 'from-pink-500 via-rose-500 to-red-500',
}

const STATUS_STYLES = {
  published: {
    outer: 'bg-gradient-to-br from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] p-[2px] shadow-lg shadow-rose-500/20',
    badge: 'bg-emerald-500/90 text-white',
    label: 'Live',
  },
  draft: {
    outer: 'border border-slate-200/80 p-0 shadow-sm',
    badge: 'bg-slate-100 text-slate-700',
    label: 'Draft',
  },
  archived: {
    outer: 'border border-slate-200/60 p-0 opacity-90 shadow-sm',
    badge: 'bg-slate-600/90 text-white',
    label: 'Archived',
  },
}

function FormPreview({ form }) {
  const settings = form.settings || {}
  const heroImage = settings.hero_image_url
  const brandColor = settings.brand_color || '#b71c1c'
  const gradient = CATEGORY_GRADIENTS[form.category] || CATEGORY_GRADIENTS.custom

  if (heroImage && (!heroImage.startsWith('data:') || heroImage.length < 500000)) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img src={heroImage} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: brandColor }} />
      </div>
    )
  }

  return (
    <div className={`relative flex aspect-[4/3] w-full flex-col items-center justify-center bg-gradient-to-br ${gradient} p-6 transition duration-500 group-hover:scale-[1.02]`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.15),transparent_45%)]" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
        <FileText className="h-7 w-7" />
      </span>
      <p className="relative mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
        {labelFor(FORM_CATEGORIES, form.category)}
      </p>
    </div>
  )
}

function FormCard({
  form,
  stats,
  onDuplicate,
  onDelete,
}) {
  const statusStyle = STATUS_STYLES[form.status] || STATUS_STYLES.draft
  const responses = stats?.responses || 0
  const isPublished = form.status === 'published'

  return (
    <article className={`group overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-0.5 ${statusStyle.outer}`}>
      <div className="overflow-hidden rounded-[calc(1rem-2px)] bg-white">
        {/* Preview */}
        <Link to={`/forms/${form.id}/edit`} className="block">
          <FormPreview form={form} />
        </Link>

        {/* Header row — profile-style */}
        <div className="flex items-start justify-between gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link
              to={`/forms/${form.id}/edit`}
              className="line-clamp-1 text-sm font-bold tracking-tight text-slate-900 transition hover:text-rose-600"
            >
              {form.title}
            </Link>
            {form.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{form.description}</p>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle.badge}`}>
            {statusStyle.label}
          </span>
        </div>

        {/* Stats row — Instagram engagement style */}
        <div className="flex items-center gap-4 px-4 pb-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            <MessageSquare className={`h-4 w-4 ${responses > 0 ? 'text-rose-500' : 'text-slate-300'}`} />
            <span className="text-xs font-bold tabular-nums text-slate-800">{responses}</span>
            <span className="text-[10px] font-medium text-slate-400">responses</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium">{formatDate(form.updated_at)}</span>
          </div>
          <div className="ml-auto hidden items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 sm:flex">
            <ClipboardList className="h-3 w-3 text-violet-500" />
            <span className="text-[10px] font-semibold text-slate-600">
              {labelFor(FORM_CATEGORIES, form.category)}
            </span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-0.5">
            <Link
              to={`/forms/${form.id}/responses`}
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
              title="Responses"
            >
              <MessageSquare className="h-[18px] w-[18px]" />
            </Link>
            <Link
              to={`/forms/${form.id}/analytics`}
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
              title="Analytics"
            >
              <BarChart3 className="h-[18px] w-[18px]" />
            </Link>
            <Link
              to={`/forms/${form.id}/edit`}
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-teal-50 hover:text-teal-600"
              title="Edit"
            >
              <Pencil className="h-[18px] w-[18px]" />
            </Link>
            <button
              type="button"
              onClick={() => onDuplicate(form.id)}
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"
              title="Duplicate"
            >
              <Copy className="h-[18px] w-[18px]" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {isPublished && (
              <span className="mr-1 hidden items-center gap-1 rounded-full bg-gradient-to-r from-pink-500/10 to-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 sm:inline-flex">
                <Sparkles className="h-3 w-3" />
                Live link
              </span>
            )}
            <button
              type="button"
              onClick={() => onDelete(form.id)}
              className="rounded-xl p-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function FormCardGrid({ forms = [], stats = {}, onDuplicate, onDelete }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {forms.map((form) => (
        <FormCard
          key={form.id}
          form={form}
          stats={stats[form.id]}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
