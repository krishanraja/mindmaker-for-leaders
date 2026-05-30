import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Mic, MicOff, Send, Sparkles, MessageSquare } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useVoice } from "@/hooks/useVoice"
import { useUserMemory } from "@/hooks/useUserMemory"
import { FactVerificationCard } from "@/components/memory/FactVerificationCard"
import { TranscriptReviewPanel } from "@/components/voice/TranscriptReviewPanel"

type CaptureMode = 'idle' | 'voice' | 'text' | 'processing' | 'review'

export default function Voice() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<CaptureMode>('idle')
  const [textInput, setTextInput] = useState('')
  const [showVerification, setShowVerification] = useState(false)
  const [editReviewText, setEditReviewText] = useState('')

  const {
    pendingVerifications,
    isExtracting,
    extractFromTranscript,
    verifyFact,
    rejectFact,
    clearPendingVerifications,
  } = useUserMemory()

  const handleComplete = useCallback(() => {
    setMode('idle')
    navigate('/diagnostic')
  }, [navigate])

  const processInput = useCallback(async (text: string) => {
    if (!text.trim()) {
      setMode('idle')
      return
    }

    try {
      const result = await extractFromTranscript(text)

      if (result.pending_verifications?.length > 0) {
        setShowVerification(true)
      } else {
        handleComplete()
      }
    } catch (err) {
      console.error('Error processing input:', err)
      handleComplete()
    }
  }, [extractFromTranscript, handleComplete])

  const handleTranscript = useCallback(async (text: string) => {
    setMode('processing')
    await processInput(text)
  }, [processInput])

  const {
    isRecording,
    isProcessing: isTranscribing,
    duration,
    error: voiceError,
    errorKind: voiceErrorKind,
    browserCaptionPreview,
    pendingReview,
    confirmPendingTranscript,
    dismissPendingReview,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({
    maxDuration: 120,
    deferTranscriptCallback: true,
    onTranscript: handleTranscript,
  })

  useEffect(() => {
    if (pendingReview) {
      setEditReviewText(pendingReview.transcript)
      setMode('review')
    }
  }, [pendingReview])

  const handleConfirmReview = useCallback(async () => {
    await confirmPendingTranscript(editReviewText)
  }, [confirmPendingTranscript, editReviewText])

  const handleDismissReview = useCallback(() => {
    dismissPendingReview()
    setMode('idle')
  }, [dismissPendingReview])

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return
    setMode('processing')
    await processInput(textInput)
    setTextInput('')
  }

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      resetRecording()
      startRecording()
      setMode('voice')
    }
  }, [isRecording, startRecording, stopRecording, resetRecording])

  const handleVerificationComplete = () => {
    setShowVerification(false)
    handleComplete()
  }

  const handleVerificationDismiss = () => {
    setShowVerification(false)
    clearPendingVerifications()
    handleComplete()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isLoading = mode === 'processing' || isExtracting || isTranscribing

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      {/* Header - Minimal */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4">
        <motion.button
          onClick={() => navigate(-1)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </motion.button>
        <motion.img 
          src="/mindmaker-full-logo.png" 
          alt="Mindmaker" 
          className="h-5 w-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        />
        <div className="w-9" /> {/* Spacer for centering */}
      </header>

      {/* Main Content - Centered, No Scroll */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 sm:px-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {/* Idle State */}
            {mode === 'idle' && !isLoading && !pendingReview && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center"
              >
                {/* Prompt */}
                <motion.p 
                  className="text-center text-lg text-foreground/80 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  What's on your mind?
                </motion.p>

                {/* Mic Button */}
                <motion.button
                  onClick={handleVoiceToggle}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative w-24 h-24 rounded-full",
                    "bg-accent text-accent-foreground",
                    "flex items-center justify-center",
                    "glow-accent transition-all duration-300"
                  )}
                >
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-accent/30"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  />
                  <Mic className="h-10 w-10" />
                </motion.button>
                
                <p className="text-xs text-muted-foreground mt-4 mb-8">
                  Tap to speak
                </p>

                {/* Divider */}
                <div className="flex items-center gap-4 w-full max-w-xs mb-6">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-xs text-muted-foreground/50">or</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Text Option */}
                <motion.button
                  onClick={() => setMode('text')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl",
                    "bg-secondary/50 border border-border/50",
                    "text-muted-foreground text-sm",
                    "hover:bg-secondary transition-colors"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Type instead
                </motion.button>
              </motion.div>
            )}

            {/* Voice Recording State */}
            {mode === 'voice' && isRecording && (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center"
              >
                {/* Recording Indicator */}
                <motion.button
                  onClick={handleVoiceToggle}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={cn(
                    "relative w-24 h-24 rounded-full",
                    "bg-destructive text-destructive-foreground",
                    "flex items-center justify-center",
                    "shadow-lg shadow-destructive/30"
                  )}
                >
                  <MicOff className="h-10 w-10" />
                </motion.button>

                {/* Timer */}
                <div className="text-2xl font-semibold tabular-nums text-foreground mt-6">
                  {formatTime(duration)}
                  <span className="text-sm text-muted-foreground ml-2">/ 2:00</span>
                </div>

                {/* Waveform */}
                <div className="flex items-center justify-center gap-0.5 h-8 mt-4">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [6, Math.random() * 20 + 6, 6] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.4 + Math.random() * 0.3,
                        delay: i * 0.03,
                      }}
                      className="w-0.5 bg-destructive/60 rounded-full"
                    />
                  ))}
                </div>

                {browserCaptionPreview ? (
                  <p className="text-xs text-muted-foreground mt-4 max-w-full text-center px-2 italic">
                    Live caption (approx.): {browserCaptionPreview}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-4">
                    Tap to stop
                  </p>
                )}
              </motion.div>
            )}

            {/* Text Input Mode */}
            {mode === 'text' && !isLoading && (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Tell me about your work and what's challenging you..."
                  autoFocus
                  rows={4}
                  className={cn(
                    "w-full px-4 py-3 rounded-2xl",
                    "bg-secondary/30 border border-border/50",
                    "text-foreground placeholder:text-muted-foreground/50",
                    "focus:outline-none focus:ring-2 focus:ring-accent/30",
                    "resize-none text-sm"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleTextSubmit()
                    }
                  }}
                />
                <div className="flex gap-3 mt-4">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setMode('idle')
                      setTextInput('')
                    }}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl",
                      "bg-secondary/30 border border-border/50",
                      "text-muted-foreground text-sm font-medium",
                      "hover:bg-secondary/50 transition-colors"
                    )}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim()}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl",
                      "bg-accent text-accent-foreground",
                      "text-sm font-medium",
                      "flex items-center justify-center gap-2",
                      "hover:bg-accent/90 transition-colors",
                      !textInput.trim() && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                    Submit
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Processing State */}
            {isLoading && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center py-8"
              >
                {/* Animated Ring */}
                <div className="relative w-20 h-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-accent/20 border-t-accent"
                  />
                  <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-accent" />
                  </div>
                </div>
                <p className="text-sm text-foreground mt-6">
                  {isTranscribing ? 'Processing...' : 'Learning about you...'}
                </p>
                {isTranscribing && browserCaptionPreview ? (
                  <p className="text-xs text-muted-foreground mt-3 max-w-full text-center px-2 italic">
                    Browser preview (may differ): {browserCaptionPreview}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    This only takes a moment
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {mode === 'review' && pendingReview && (
            <TranscriptReviewPanel
              transcript={pendingReview.transcript}
              rawTranscript={pendingReview.rawTranscript}
              refined={pendingReview.refined}
              editedText={editReviewText}
              onEditedTextChange={setEditReviewText}
              onConfirm={handleConfirmReview}
              onDismiss={handleDismissReview}
              confirmLabel="Continue"
              className="mt-4"
            />
          )}

          {/* Error Display - categorised so the user gets a real path forward,
              not just a vague "denied" message. permission_denied / no_device /
              in_use all surface a recovery card with Type Instead fallback. */}
          {voiceError && voiceErrorKind && voiceErrorKind !== 'unknown' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 max-w-md mx-auto"
            >
              <p className="text-sm font-semibold text-foreground mb-1">
                {voiceErrorKind === 'permission_denied' && 'Microphone access is blocked'}
                {voiceErrorKind === 'no_device' && 'No microphone detected'}
                {voiceErrorKind === 'in_use' && 'Microphone is busy elsewhere'}
                {voiceErrorKind === 'insecure_context' && 'HTTPS required'}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {voiceErrorKind === 'permission_denied' && (
                  <>
                    Click the lock or shield icon next to the URL, allow microphone, then refresh.
                    Or type your thoughts instead.
                  </>
                )}
                {voiceErrorKind === 'no_device' && (
                  <>Plug in a microphone or headset, or type your thoughts instead.</>
                )}
                {voiceErrorKind === 'in_use' && (
                  <>Close any other tab or app using your microphone (Zoom, Meet, etc.), then try again.</>
                )}
                {voiceErrorKind === 'insecure_context' && (
                  <>Recording only works on secure (HTTPS) sites. Try the production URL.</>
                )}
              </p>
              <div className="flex gap-2">
                {(voiceErrorKind === 'permission_denied' || voiceErrorKind === 'in_use') && (
                  <button
                    onClick={() => { resetRecording(); startRecording() }}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    Try again
                  </button>
                )}
                <button
                  onClick={() => { resetRecording(); setMode('text') }}
                  className="text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted"
                >
                  Type instead
                </button>
              </div>
            </motion.div>
          )}
          {voiceError && (!voiceErrorKind || voiceErrorKind === 'unknown') && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-destructive text-xs text-center mt-4"
            >
              {voiceError.message}
            </motion.p>
          )}
        </div>
      </main>

      {/* Footer Hint */}
      <footer className="relative z-10 px-4 sm:px-6 pb-4">
        <p className="text-[10px] text-muted-foreground/40 text-center">
          Key points from your recording - confirm what matters
        </p>
      </footer>

      {/* Verification Overlay */}
      <AnimatePresence>
        {showVerification && pendingVerifications.length > 0 && (
          <FactVerificationCard
            facts={pendingVerifications}
            onVerify={verifyFact}
            onReject={rejectFact}
            onDismiss={handleVerificationDismiss}
            onComplete={handleVerificationComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
