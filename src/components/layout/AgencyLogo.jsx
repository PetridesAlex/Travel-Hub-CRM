import { useState } from 'react'
import { Plane } from 'lucide-react'

function agencyInitials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export default function AgencyLogo({
  name = 'Travel Agency',
  logoUrl,
  size = 'md',
  className = '',
}) {
  const [imgError, setImgError] = useState(false)
  const showImage = Boolean(logoUrl) && !imgError
  const initials = agencyInitials(name)

  const sizeClasses =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : size === 'lg'
        ? 'h-12 w-12 rounded-2xl sm:h-14 sm:w-14'
        : 'h-10 w-10 rounded-xl sm:h-11 sm:w-11'

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-base' : 'text-sm'

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`absolute inset-0 blur-md ${sizeClasses} ${
          showImage ? 'bg-white/15' : 'bg-teal-400/30'
        }`}
      />
      <div
        className={`relative flex items-center justify-center overflow-hidden shadow-lg ring-1 ring-white/10 ${sizeClasses} ${
          showImage
            ? 'bg-white shadow-black/25'
            : 'bg-gradient-to-br from-teal-400 to-teal-700 shadow-teal-900/40'
        }`}
      >
        {showImage ? (
          <img
            src={logoUrl}
            alt={name ? `${name} logo` : 'Agency logo'}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : initials ? (
          <span className={`font-bold tracking-tight text-white ${textSize}`}>{initials}</span>
        ) : (
          <Plane className={`${iconSize} text-white`} />
        )}
      </div>
    </div>
  )
}
