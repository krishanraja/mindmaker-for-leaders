import { useState, useRef, useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { uploadVoiceRecordingToStorage } from '@/utils/supabaseStorage'
import type { PendingTranscriptReview } from '@/types/voice'

interface UseVoiceOptions {
  maxDuration?: number // in seconds
  onTranscript?: (transcript: string) => void | Promise<void>
  /**
   * When true, transcription result is held in `pendingReview` until `confirmPendingTranscript` runs.
   * Use with TranscriptReviewPanel for editable preview on critical flows.
   */
  deferTranscriptCallback?: boolean
}

/**
 * Categorised reason a recording attempt failed. Lets the UI render a
 * targeted recovery affordance instead of dumping a generic error message.
 *  - `permission_denied`: user blocked mic in the browser (NotAllowedError)
 *  - `no_device`: no mic hardware available (NotFoundError)
 *  - `in_use`: another tab/app is holding the mic (NotReadableError)
 *  - `insecure_context`: page not served over HTTPS (SecurityError on some browsers)
 *  - `unknown`: anything else - show the raw message and offer retry
 */
export type VoiceErrorKind =
  | 'permission_denied'
  | 'no_device'
  | 'in_use'
  | 'insecure_context'
  | 'unknown'

interface UseVoiceReturn {
  isRecording: boolean
  isProcessing: boolean
  duration: number
  transcript: string | null
  error: Error | null
  errorKind: VoiceErrorKind | null
  /** Live browser caption during recording + while server transcribes (non-authoritative). */
  browserCaptionPreview: string
  pendingReview: PendingTranscriptReview | null
  confirmPendingTranscript: (editedText?: string) => Promise<void>
  dismissPendingReview: () => void
  startRecording: () => Promise<void>
  stopRecording: () => void
  resetRecording: () => void
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const { maxDuration = 120, deferTranscriptCallback = false } = options

  const onTranscriptRef = useRef(options.onTranscript)
  useEffect(() => {
    onTranscriptRef.current = options.onTranscript
  }, [options.onTranscript])

  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [errorKind, setErrorKind] = useState<VoiceErrorKind | null>(null)
  const [browserCaptionPreview, setBrowserCaptionPreview] = useState('')
  const [pendingReview, setPendingReview] = useState<PendingTranscriptReview | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognitionRef = useRef<any>(null)
  const webSpeechTranscriptRef = useRef<string>('')

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop()
      } catch {
        /* already stopped */
      }
      speechRecognitionRef.current = null
    }
    webSpeechTranscriptRef.current = ''
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  const confirmPendingTranscript = useCallback(async (editedText?: string) => {
    const pending = pendingReview
    if (!pending) return
    const text = (editedText ?? pending.transcript).trim()
    if (!text) return
    setPendingReview(null)
    setTranscript(text)
    const cb = onTranscriptRef.current
    if (cb) await cb(text)
  }, [pendingReview])

  const dismissPendingReview = useCallback(() => {
    setPendingReview(null)
    setTranscript(null)
  }, [])

  const stopRecordingFnRef = useRef<() => void>(() => {})

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

  useEffect(() => {
    stopRecordingFnRef.current = stopRecording
  }, [stopRecording])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setErrorKind(null)
      setTranscript(null)
      setPendingReview(null)
      setDuration(0)
      setBrowserCaptionPreview('')
      chunksRef.current = []
      webSpeechTranscriptRef.current = ''

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false)
        setIsProcessing(true)

        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop()
          } catch {
            /* already stopped */
          }
          speechRecognitionRef.current = null
        }

        const previewSnapshot = webSpeechTranscriptRef.current.trim()
        if (previewSnapshot) {
          setBrowserCaptionPreview(previewSnapshot)
        }

        try {
          const audioBlob = new Blob(chunksRef.current, {
            type: mediaRecorder.mimeType,
          })

          const result = await api.transcribeAudio(audioBlob)

          if (result.provider) {
            console.log(`[VOICE] Transcribed via ${result.provider}`, result.asr_model ?? '')
          }

          const sessionId = crypto.randomUUID()
          uploadVoiceRecordingToStorage(audioBlob, sessionId, 'voice-capture').catch((err) =>
            console.warn('Audio storage failed (non-blocking):', err),
          )

          if (deferTranscriptCallback) {
            setPendingReview({
              transcript: result.transcript,
              rawTranscript: result.raw_transcript,
              refined: result.refined === true,
            })
          } else {
            setTranscript(result.transcript)
            const cb = onTranscriptRef.current
            if (cb) await cb(result.transcript)
          }
        } catch (err) {
          const fallbackText = webSpeechTranscriptRef.current.trim()
          if (fallbackText.length > 5) {
            console.warn('[VOICE] Edge function failed, using Web Speech API fallback transcript')
            if (deferTranscriptCallback) {
              setPendingReview({ transcript: fallbackText })
            } else {
              setTranscript(fallbackText)
              const cb = onTranscriptRef.current
              if (cb) await cb(fallbackText)
            }
          } else {
            console.error('Transcription error:', err)
            setError(err as Error)
          }
        } finally {
          setIsProcessing(false)
          setBrowserCaptionPreview('')
          cleanup()
        }
      }

      mediaRecorder.start(1000)
      setIsRecording(true)

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any
        const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI()
          recognition.continuous = true
          recognition.interimResults = false
          recognition.lang = 'en-US'

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                webSpeechTranscriptRef.current += event.results[i][0].transcript + ' '
                setBrowserCaptionPreview(webSpeechTranscriptRef.current.trim())
              }
            }
          }
          recognition.onerror = () => {
            /* non-blocking fallback */
          }
          recognition.onend = () => {
            if (mediaRecorderRef.current?.state === 'recording' && speechRecognitionRef.current) {
              try {
                speechRecognitionRef.current.start()
              } catch {
                /* ignore */
              }
            }
          }

          speechRecognitionRef.current = recognition
          recognition.start()
        }
      } catch {
        /* Web Speech API not available */
      }

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            stopRecordingFnRef.current()
          }
          return newDuration
        })
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording:', err)
      // Categorise the DOMException so the UI can render a targeted
      // recovery card instead of a generic "denied" toast. The browser
      // returns a structured error.name; we map the common ones.
      const e = err as { name?: string; message?: string }
      let kind: VoiceErrorKind = 'unknown'
      let message = 'Could not start recording.'
      switch (e.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          kind = 'permission_denied'
          message = 'Microphone access is blocked. Allow it in your browser to record.'
          break
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          kind = 'no_device'
          message = 'No microphone detected. Plug one in or use text instead.'
          break
        case 'NotReadableError':
        case 'TrackStartError':
          kind = 'in_use'
          message = 'Your microphone is busy in another tab or app. Close it and try again.'
          break
        case 'SecurityError':
          kind = 'insecure_context'
          message = 'Recording requires a secure (HTTPS) connection.'
          break
        default:
          message = e.message || message
      }
      const error = new Error(message)
      ;(error as Error & { kind: VoiceErrorKind }).kind = kind
      setError(error)
      setErrorKind(kind)
      cleanup()
    }
  }, [maxDuration, cleanup, deferTranscriptCallback])

  const resetRecording = useCallback(() => {
    cleanup()
    setIsRecording(false)
    setIsProcessing(false)
    setDuration(0)
    setTranscript(null)
    setError(null)
    setErrorKind(null)
    setBrowserCaptionPreview('')
    setPendingReview(null)
  }, [cleanup])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    isRecording,
    isProcessing,
    duration,
    transcript,
    error,
    errorKind,
    browserCaptionPreview,
    pendingReview,
    confirmPendingTranscript,
    dismissPendingReview,
    startRecording,
    stopRecording,
    resetRecording,
  }
}
