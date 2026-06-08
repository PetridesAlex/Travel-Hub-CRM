import { Mic, MicOff } from 'lucide-react'

export default function VoiceInputButton({
  isListening,
  isSupported,
  onStart,
  onStop,
  size = 'lg',
  className = '',
}) {
  const sizes = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  if (!isSupported) return null

  return (
    <button
      type="button"
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      onClick={isListening ? onStop : onStart}
      className={`flex items-center justify-center rounded-full transition-colors ${
        isListening
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-teal-600 text-white hover:bg-teal-700'
      } ${sizes[size]} ${className}`}
    >
      {isListening ? <MicOff className={iconSizes[size]} /> : <Mic className={iconSizes[size]} />}
    </button>
  )
}
