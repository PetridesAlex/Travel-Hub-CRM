import { useCallback, useEffect, useRef, useState } from 'react'

const SPEECH_ERRORS = {
  'not-allowed': 'Microphone access was blocked. Allow microphone permission in your browser settings.',
  'no-speech': 'No speech detected. Try speaking closer to the microphone.',
  'audio-capture': 'No microphone found. Connect a microphone and try again.',
  'network': 'Speech recognition needs an internet connection in this browser.',
  'aborted': 'Speech recognition was stopped.',
}

export function useSpeechRecognition(options = {}) {
  const { lang = 'en-US', onFinalTranscript } = options

  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState('')

  const recognitionRef = useRef(null)
  const keepListeningRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const onFinalTranscriptRef = useRef(onFinalTranscript)

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript
  }, [onFinalTranscript])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)

    if (!SpeechRecognition) return undefined

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

      if (event.error === 'no-speech') {
        return
      }

      if (event.error === 'aborted') {
        return
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

  const startListening = useCallback((initialText = '') => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser. Use Chrome, Edge, or Safari.')
      return
    }

    setError('')
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
      } catch (err) {
        keepListeningRef.current = false
        setIsListening(false)
        setError('Could not start microphone. Click the button again.')
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

  return {
    transcript,
    setTranscript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
