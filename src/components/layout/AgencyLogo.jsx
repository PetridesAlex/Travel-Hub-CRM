import { useState } from 'react'
import { Plane } from 'lucide-react'

function agencyInitials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

const SIZE_MAP = {
  sm: {
    box: 'h-8 w-8 rounded-lg',
    icon: 'h-3.5 w-3.5',
    text: 'text-[10px]',
  },
  md: {
    box: 'h-10 w-10 rounded-xl sm:h-11 sm:w-11',
    icon: 'h-5 w-5',
    text: 'text-sm',
  },
  lg: {
    box: 'h-12 w-12 rounded-2xl sm:h-14 sm:w-14',
    icon: 'h-6 w-6',
    text: 'text-base',
  },
  xl: {
    box: 'h-14 w-14 rounded-2xl sm:h-16 sm:w-16',
    icon: 'h-7 w-7',
    text: 'text-lg',
  },
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
  const sizes = SIZE_MAP[size] || SIZE_MAP.md

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div
        className={`absolute inset-0 blur-md ${sizes.box} ${
          showImage ? 'bg-white/20' : 'bg-teal-400/35'
        }`}
      />
      <div
        className={`relative flex items-center justify-center overflow-hidden shadow-lg ring-1 ring-white/15 ${sizes.box} ${
          showImage
            ? 'bg-white shadow-black/30'
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
          <span className={`font-bold tracking-tight text-white ${sizes.text}`}>{initials}</span>
        ) : (
          <Plane className={`${sizes.icon} text-white`} />
        )}
      </div>
    </div>
  )
}
