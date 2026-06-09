import { createWorker } from 'tesseract.js'

export async function extractTextFromImage(file, onProgress) {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })

  try {
    const { data: { text } } = await worker.recognize(file)
    return text.trim()
  } finally {
    await worker.terminate()
  }
}

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Resize/compress images before sending to the AI API (faster upload + analysis). */
export async function compressImageForApi(file, maxWidth = 1280, quality = 0.82) {
  const dataUrl = await readImageFile(file)
  if (!file.type.startsWith('image/')) return dataUrl

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Could not process image'))
    img.src = dataUrl
  })
}
