import { useCallback, useEffect, useRef, useState } from 'react'

const SPEECH_ERRORS = {
  'not-allowed': 'Microphone access was blocked. Click the lock icon in your browser address bar and allow microphone access, then try again.',
  'no-speech': 'No speech detected. Try speaking closer to the microphone.',
  'audio-capture': 'No microphone found. Connect a microphone and try again.',
  'network': 'Speech recognition needs an internet connection in this browser.',
  'aborted': 'Speech recognition was stopped.',
  'service-not-allowed': 'Speech recognition is not available. Use Chrome, Edge, or Safari on a secure (HTTPS) connection.',
}

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

async function requestMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia) return true

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      throw new Error(SPEECH_ERRORS['not-allowed'])
    }
    if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      throw new Error(SPEECH_ERRORS['audio-capture'])
    }
    throw new Error('Could not access microphone. Check your browser permissions and try again.')
  }
}

export function useSpeechRecognition(options = {}) {
  const { lang = 'en-US', onFinalTranscript } = options

  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isSecureContext, setIsSecureContext] = useState(true)
  const [permissionGranted, setPermissionGranted] = useState(null)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [error, setError] = useState('')

  const recognitionRef = useRef(null)
  const keepListeningRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const onFinalTranscriptRef = useRef(onFinalTranscript)

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript
  }, [onFinalTranscript])

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionCtor()
    const secure = window.isSecureContext !== false
    setIsSecureContext(secure)
    setIsSupported(Boolean(SpeechRecognition) && secure)

    if (!SpeechRecognition || !secure) return undefined

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onresult = (event) => {
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0]?.transcript || ''

        if (result.isFinal) {
          finalTranscriptRef.current += text
          onFinalTranscriptRef.current?.(text)
        } else {
          interim += text
        }
      }

      setTranscript(finalTranscriptRef.current + interim)
      setError('')
    }

    recognition.onerror = (event) => {
      const message = SPEECH_ERRORS[event.error] || `Speech recognition error: ${event.error}`

      if (event.error === 'no-speech' || event.error === 'aborted') {
        return
      }

      if (event.error === 'not-allowed') {
        setPermissionGranted(false)
      }

      setError(message)
      keepListeningRef.current = false
      setIsListening(false)
    }

    recognition.onend = () => {
      if (keepListeningRef.current) {
        try {
          recognition.start()
        } catch {
          keepListeningRef.current = false
          setIsListening(false)
        }
        return
      }

      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      keepListeningRef.current = false
      recognition.stop()
    }
  }, [lang])

  const startListening = useCallback(async (initialText = '') => {
    if (!getSpeechRecognitionCtor()) {
      setError('Voice input requires Chrome, Edge, or Safari. Firefox does not support browser speech recognition yet.')
      return
    }

    if (!window.isSecureContext) {
      setError('Voice input requires a secure connection (HTTPS). Open the app via your deployed URL, not an insecure local address.')
      return
    }

    setError('')
    setIsRequestingPermission(true)

    try {
      await requestMicrophoneAccess()
      setPermissionGranted(true)
    } catch (err) {
      setPermissionGranted(false)
      setError(err.message)
      setIsRequestingPermission(false)
      return
    }

    setIsRequestingPermission(false)

    if (!recognitionRef.current) {
      setError('Speech recognition is not ready yet. Please try again in a moment.')
      return
    }

    finalTranscriptRef.current = initialText
    setTranscript(initialText)
    keepListeningRef.current = true
    setIsListening(true)

    try {
      recognitionRef.current.start()
    } catch {
      try {
        recognitionRef.current.stop()
        recognitionRef.current.start()
      } catch {
        keepListeningRef.current = false
        setIsListening(false)
        setError('Could not start microphone. Click Dictate again.')
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    keepListeningRef.current = false
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = ''
    setTranscript('')
    setError('')
  }, [])

  const canUseVoice = isSupported || Boolean(getSpeechRecognitionCtor())

  return {
    transcript,
    setTranscript,
    isListening,
    isSupported,
    canUseVoice,
    isSecureContext,
    permissionGranted,
    isRequestingPermission,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
