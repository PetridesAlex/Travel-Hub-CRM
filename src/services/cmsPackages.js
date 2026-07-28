import { supabase } from '../lib/supabase'

const SELECT_LIST =
  'id, legacy_id, title, destination, category, price, duration, image, featured, package_type, hidden, published, details, updated_at, created_at'

export function isPackagesCmsSchemaMissing(error) {
  if (!error) return false
  const msg = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return (
    msg.includes('cms_package') &&
    (msg.includes('schema cache') ||
      msg.includes('does not exist') ||
      msg.includes('could not find') ||
      msg.includes('relation') ||
      error?.code === '42P01' ||
      error?.code === 'PGRST205')
  )
}

function formatError(error) {
  if (isPackagesCmsSchemaMissing(error)) {
    return 'Package CMS tables are not set up in Supabase yet. Run supabase/migrations/023_cms_packages.sql.'
  }
  return error?.message || 'Request failed'
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null))
}

export function isUsableImageSrc(value) {
  if (value == null) return false
  const src = String(value).trim()
  if (!src) return false
  return (
    src.startsWith('/') ||
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('blob:')
  )
}

export function resolvePackageCoverImage(pkgOrRow) {
  if (!pkgOrRow) return ''
  const details = pkgOrRow.details || {}
  const gallery = Array.isArray(details.gallery) ? details.gallery : []
  const hotels = Array.isArray(details.hotels) ? details.hotels : []
  const candidates = [
    details.coverImage,
    details.thumbnailImage,
    gallery[0],
    pkgOrRow.image,
    ...hotels.map((hotel) => hotel?.image),
  ]
  for (const candidate of candidates) {
    if (isUsableImageSrc(candidate)) return String(candidate).trim()
  }
  return ''
}

export async function fetchCmsPackages({ includeHidden = true } = {}) {
  let query = supabase.from('cms_packages').select(SELECT_LIST).order('legacy_id', { ascending: true })

  if (!includeHidden) {
    query = query.eq('hidden', false).eq('published', true)
  }

  const { data, error } = await query
  if (error) {
    return {
      data: [],
      error: { message: formatError(error), schemaMissing: isPackagesCmsSchemaMissing(error) },
    }
  }
  return { data: data || [], error: null, schemaMissing: false }
}

export async function fetchCmsPackageById(id) {
  const { data, error } = await supabase.from('cms_packages').select('*').eq('id', id).maybeSingle()
  if (error) {
    return {
      data: null,
      error: { message: formatError(error), schemaMissing: isPackagesCmsSchemaMissing(error) },
    }
  }
  if (!data) return { data: null, error: { message: 'Package not found.' } }
  return { data, error: null }
}

export async function getNextLegacyId() {
  const { data, error } = await supabase
    .from('cms_packages')
    .select('legacy_id')
    .order('legacy_id', { ascending: false })
    .limit(1)

  if (error) {
    return {
      legacyId: 1,
      error: { message: formatError(error), schemaMissing: isPackagesCmsSchemaMissing(error) },
    }
  }
  const cmsMax = Number(data?.[0]?.legacy_id) || 0
  return { legacyId: cmsMax + 1, error: null }
}

export async function saveCmsPackage(row) {
  const details = cloneJson(row.details || {})
  const hotels = Array.isArray(details.hotels) ? details.hotels : []
  const cheapestDouble = hotels.reduce((min, hotel) => {
    const value = Number(hotel?.prices?.double)
    if (Number.isFinite(value) && value > 0 && value < min) return value
    return min
  }, Infinity)

  const resolvedCover = resolvePackageCoverImage({ ...row, details })
  if (resolvedCover) {
    if (!isUsableImageSrc(details.coverImage)) details.coverImage = resolvedCover
    if (!isUsableImageSrc(details.thumbnailImage)) details.thumbnailImage = resolvedCover
  }

  const payload = {
    title: (row.title || 'Untitled package').trim(),
    destination: (row.destination || '').trim() || null,
    category: (row.category || '').trim() || null,
    price:
      row.price != null && row.price !== ''
        ? Number(row.price)
        : cheapestDouble !== Infinity
          ? cheapestDouble
          : null,
    duration: (row.duration || '').trim() || null,
    description: (row.description || '').trim() || null,
    long_description: (row.long_description || '').trim() || null,
    image: isUsableImageSrc(row.image) ? row.image : resolvedCover || null,
    featured: Boolean(row.featured),
    package_type: row.package_type || null,
    hidden: Boolean(row.hidden),
    published: row.published !== false,
    details,
    updated_at: new Date().toISOString(),
  }

  if (row.id) {
    const { data, error } = await supabase
      .from('cms_packages')
      .update(payload)
      .eq('id', row.id)
      .select('*')
      .single()

    if (error) {
      return {
        data: null,
        error: { message: formatError(error), schemaMissing: isPackagesCmsSchemaMissing(error) },
      }
    }
    return { data, error: null }
  }

  const { data, error } = await supabase
    .from('cms_packages')
    .insert({ ...payload, legacy_id: Number(row.legacy_id) })
    .select('*')
    .single()

  if (error) {
    return {
      data: null,
      error: { message: formatError(error), schemaMissing: isPackagesCmsSchemaMissing(error) },
    }
  }
  return { data, error: null }
}

export async function deleteCmsPackage(id) {
  const { error } = await supabase.from('cms_packages').delete().eq('id', id)
  return {
    error: error
      ? { message: formatError(error), schemaMissing: isPackagesCmsSchemaMissing(error) }
      : null,
  }
}

export const HONEYWELL_PACKAGE_SITE = 'https://www.honeywelltravel.com.cy'
