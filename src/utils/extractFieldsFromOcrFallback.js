import { parseFlightScreenshot } from './parseFlightScreenshot'
import { parsedScreenshotsToFlightInput } from './mapFlightDataToTemplateFields'
import { getFieldsForCategory } from '../constants/aiTemplateFields'
import { extractTextFromImage } from './screenshotOcr'

export async function extractFieldsFromOcrFallback(category, files, onProgress) {

  if (category === 'flight_offer') {
    const parsedList = []
    for (let i = 0; i < files.length; i++) {
      const rawText = await extractTextFromImage(files[i], (progress, status) => {
        onProgress?.(progress, status, i, files.length)
      })
      parsedList.push(parseFlightScreenshot(rawText))
    }
    return parsedScreenshotsToFlightInput(parsedList)
  }

  const chunks = []
  for (let i = 0; i < files.length; i++) {
    const rawText = await extractTextFromImage(files[i], (progress, status) => {
      onProgress?.(progress, status, i, files.length)
    })
    if (rawText?.trim()) chunks.push(rawText.trim())
  }

  if (!chunks.length) return {}

  const combined = chunks.join('\n\n---\n\n')
  const fields = getFieldsForCategory(category)
  const textareaField = fields.find((f) => f.type === 'textarea' && f.key === 'notes')
    || fields.find((f) => f.type === 'textarea')
    || fields[fields.length - 1]

  if (!textareaField) return {}

  return { [textareaField.key]: combined }
}
