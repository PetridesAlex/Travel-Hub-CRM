import { extractTemplateFieldsFromImages } from './aiExtractTemplateFields'

/** @deprecated Use extractTemplateFieldsFromImages('flight_offer', ...) */
export function extractFlightFieldsFromImages(imageUrls, session) {
  return extractTemplateFieldsFromImages('flight_offer', imageUrls, session)
}
