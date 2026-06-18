import { resolveAgencyLogoUrl } from '../../utils/resolveAgencyLogo'
import FormTravelBackground from './FormTravelBackground'

const DEFAULT_BRAND = '#b71c1c'

export function getFormBranding(form = {}, agency = null) {
  const settings = form.settings || {}
  const brandColor = settings.brand_color || DEFAULT_BRAND
  const heroImage = settings.hero_image_url || null
  const logoUrl = settings.use_agency_logo !== false ? resolveAgencyLogoUrl(agency) : null

  return { brandColor, heroImage, logoUrl, settings }
}

export function FormHero({ branding, agencyName }) {
  const { brandColor, heroImage, logoUrl } = branding

  if (heroImage) {
    return (
      <div className="overflow-hidden rounded-t-xl">
        <img src={heroImage} alt="" className="h-36 w-full object-cover sm:h-44" />
        <div className="h-2" style={{ backgroundColor: brandColor }} />
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-4 rounded-t-xl px-6 py-5 sm:px-8 sm:py-6"
      style={{ backgroundColor: brandColor }}
    >
      {logoUrl && (
        <img src={logoUrl} alt="" className="h-10 w-auto max-w-[120px] object-contain brightness-0 invert sm:h-12" />
      )}
      {agencyName && !logoUrl && (
        <span className="text-lg font-semibold text-white sm:text-xl">{agencyName}</span>
      )}
    </div>
  )
}

export function FormTitleCard({ title, description, branding }) {
  const { brandColor } = branding
  return (
    <div className="relative overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(60,64,67,0.15),0_4px_8px_rgba(60,64,67,0.1)]">
      <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-xl" style={{ backgroundColor: brandColor }} />
      <div className="px-6 py-6 sm:px-8 sm:py-7">
        <h1 className="font-['Georgia',_'Times_New_Roman',_serif] text-2xl font-normal text-slate-900 sm:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-sm italic leading-relaxed text-slate-600 sm:text-[15px]">{description}</p>
        )}
      </div>
    </div>
  )
}

export function FormQuestionCard({ question, branding, children }) {
  const { brandColor } = branding
  const imageUrl = question?.config?.image_url

  return (
    <div className="relative overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(60,64,67,0.15),0_4px_8px_rgba(60,64,67,0.1)]">
      <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-xl" style={{ backgroundColor: brandColor }} />
      <div className="px-6 py-6 sm:px-8 sm:py-7">
        <h2 className="font-['Georgia',_'Times_New_Roman',_serif] text-lg font-normal text-slate-900 sm:text-xl">
          {question.question_text}
          {question.required && <span className="ml-1 text-rose-500">*</span>}
        </h2>
        {question.help_text && (
          <p className="mt-1 text-sm text-slate-500">{question.help_text}</p>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="mt-4 w-full rounded-lg object-cover"
            style={{ maxHeight: '280px' }}
          />
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export default function FormShell({
  form,
  agency,
  children,
  className = '',
}) {
  const branding = getFormBranding(form, agency)

  return (
    <FormTravelBackground brandColor={branding.brandColor} className={className}>
      <div className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[640px] space-y-3">
          {(branding.heroImage || branding.logoUrl || agency?.name) && (
            <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(60,64,67,0.15)]">
              <FormHero branding={branding} agencyName={agency?.name} />
            </div>
          )}
          {children}
        </div>
      </div>
    </FormTravelBackground>
  )
}
