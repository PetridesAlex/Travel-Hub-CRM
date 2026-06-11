import { Mic, MicOff, Loader2 } from 'lucide-react'

export default function VoiceInputButton({
  isListening,
  isSupported,
  isRequestingPermission = false,
  onStart,
  onStop,
  size = 'lg',
  className = '',
  disabled = false,
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

  const isDisabled = disabled || !isSupported || isRequestingPermission

  return (
    <button
      type="button"
      aria-label={
        isRequestingPermission
          ? 'Requesting microphone access'
          : isListening
            ? 'Stop listening'
            : 'Start voice input'
      }
      disabled={isDisabled}
      onClick={isListening ? onStop : onStart}
      className={`flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isListening
          ? 'bg-red-500 text-white animate-pulse'
          : isSupported
            ? 'bg-teal-600 text-white hover:bg-teal-700'
            : 'bg-slate-300 text-slate-500'
      } ${sizes[size]} ${className}`}
    >
      {isRequestingPermission ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : isListening ? (
        <MicOff className={iconSizes[size]} />
      ) : (
        <Mic className={iconSizes[size]} />
      )}
    </button>
  )
}
