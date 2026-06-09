import { createWorker } from 'tesseract.js'

let sharedWorker = null
let workerInitPromise = null

function reportProgress(onProgress, percent, status) {
  if (!onProgress) return
  if (typeof onProgress === 'function') {
    if (onProgress.length >= 2) {
      onProgress(percent, status)
    } else {
      onProgress(percent)
    }
  }
}

async function getSharedWorker(onProgress) {
  if (sharedWorker) return sharedWorker

  if (!workerInitPromise) {
    workerInitPromise = createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') reportProgress(onProgress, 8, 'Loading OCR engine…')
        else if (m.status === 'initializing api') reportProgress(onProgress, 18, 'Initializing OCR…')
        else if (m.status === 'loading language traineddata') reportProgress(onProgress, 28, 'Loading language data…')
        else if (m.status === 'recognizing text') {
          reportProgress(onProgress, 30 + Math.round((m.progress || 0) * 70), 'Reading screenshot…')
        }
      },
    })
  }

  sharedWorker = await workerInitPromise
  return sharedWorker
}

export async function extractTextFromImage(file, onProgress) {
  const compressed = await compressImageForApi(file, 1400, 0.85)
  reportProgress(onProgress, 5, 'Preparing image…')

  const worker = await getSharedWorker(onProgress)
  const blob = await fetch(compressed).then((r) => r.blob())
  const { data: { text } } = await worker.recognize(blob)
  return text.trim()
}

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Resize/compress images before OCR or API upload. */
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
