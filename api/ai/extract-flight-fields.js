import extractTemplateFieldsHandler from './extract-template-fields.js'

/** Legacy alias — flight_offer extraction */
export default async function handler(req, res) {
  req.body = { ...req.body, category: 'flight_offer' }
  return extractTemplateFieldsHandler(req, res)
}
