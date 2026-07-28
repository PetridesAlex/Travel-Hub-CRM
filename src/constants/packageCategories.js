import {
  Flower2,
  Palmtree,
  Ship,
  Snowflake,
  Sun,
  Building2,
  Package,
} from 'lucide-react'

/** Canonical package categories used across list, detail, and sidebar nav. */
export const PACKAGE_CATEGORIES = [
  {
    id: 'Summer Packages',
    label: 'Summer',
    fullLabel: 'Summer Packages',
    icon: 'Sun',
    accent: 'from-amber-400 to-orange-500',
    chip: 'border-amber-200/80 bg-amber-50 text-amber-900',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
  },
  {
    id: 'Christmas Packages',
    label: 'Christmas',
    fullLabel: 'Christmas Packages',
    icon: 'Snowflake',
    accent: 'from-sky-400 to-indigo-500',
    chip: 'border-sky-200/80 bg-sky-50 text-sky-900',
    iconBg: 'bg-gradient-to-br from-sky-400 to-indigo-500',
  },
  {
    id: 'Easter Packages',
    label: 'Easter',
    fullLabel: 'Easter Packages',
    icon: 'Flower2',
    accent: 'from-rose-400 to-pink-500',
    chip: 'border-rose-200/80 bg-rose-50 text-rose-900',
    iconBg: 'bg-gradient-to-br from-rose-400 to-pink-500',
  },
  {
    id: 'City Breaks',
    label: 'City Breaks',
    fullLabel: 'City Breaks',
    icon: 'Building2',
    accent: 'from-violet-400 to-fuchsia-500',
    chip: 'border-violet-200/80 bg-violet-50 text-violet-900',
    iconBg: 'bg-gradient-to-br from-violet-400 to-fuchsia-500',
  },
  {
    id: 'Exotic Packages',
    label: 'Exotic',
    fullLabel: 'Exotic Packages',
    icon: 'Palmtree',
    accent: 'from-teal-400 to-emerald-500',
    chip: 'border-teal-200/80 bg-teal-50 text-teal-900',
    iconBg: 'bg-gradient-to-br from-teal-400 to-emerald-500',
  },
  {
    id: 'Cruises',
    label: 'Cruises',
    fullLabel: 'Cruises',
    icon: 'Ship',
    accent: 'from-cyan-400 to-blue-600',
    chip: 'border-cyan-200/80 bg-cyan-50 text-cyan-900',
    iconBg: 'bg-gradient-to-br from-cyan-400 to-blue-600',
  },
  {
    id: 'Other',
    label: 'Other',
    fullLabel: 'Other',
    icon: 'Package',
    accent: 'from-slate-400 to-slate-600',
    chip: 'border-slate-200/80 bg-slate-50 text-slate-700',
    iconBg: 'bg-gradient-to-br from-slate-400 to-slate-600',
  },
]

export const PACKAGE_CATEGORY_OPTIONS = PACKAGE_CATEGORIES.map((c) => c.id)

const ICON_MAP = {
  Sun,
  Snowflake,
  Flower2,
  Building2,
  Palmtree,
  Ship,
  Package,
}

export function getPackageCategoryIcon(iconName) {
  return ICON_MAP[iconName] || Package
}

export function getPackageCategoryMeta(categoryId) {
  return (
    PACKAGE_CATEGORIES.find((c) => c.id === categoryId) || {
      id: categoryId || 'Other',
      label: categoryId || 'Other',
      fullLabel: categoryId || 'Other',
      icon: 'Package',
      accent: 'from-slate-400 to-slate-600',
      chip: 'border-slate-200/80 bg-slate-50 text-slate-700',
      iconBg: 'bg-gradient-to-br from-slate-400 to-slate-600',
    }
  )
}

export function packagesCategoryPath(categoryId) {
  if (!categoryId || categoryId === 'all') return '/packages'
  return `/packages?category=${encodeURIComponent(categoryId)}`
}
