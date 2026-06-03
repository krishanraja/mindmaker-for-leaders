import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  ArrowRight,
  MessageSquare,
  Send,
  Check,
  Copy,
  Volume2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import mindmakerIcon from '@/assets/mindmaker-icon.png';
import { useOnboardingInterview } from '@/hooks/useOnboardingInterview';
import { useVoice } from '@/hooks/useVoice';
import { useUserMemory } from '@/hooks/useUserMemory';
import { useMemoryExport } from '@/hooks/useMemoryExport';
import { FactVerificationCard } from '@/components/memory/FactVerificationCard';

interface Props {
  onComplete: () => void;
}

/**
 * Auto-advances after a short delay when there are no facts to verify.
 */
function VerificationAutoAdvance({ onComplete }: { onComplete: () => void }) {
  const called = useRef(false);
  useEffect(() => {
    if (called.current) return;
    const timer = setTimeout(() => {
      if (!called.current) {
        called.current = true;
        onComplete();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      key="no-verify"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <p className="text-muted-foreground">Processing...</p>
    </motion.div>
  );
}

export function OnboardingInterview({ onComplete }: Props) {
  const {
    step,
    inputMode,
    currentQuestion,
    isAudioLoading,
    conversation,
    turnCount,
    isInterviewComplete,
    fieldsStatus,
    error: interviewError,
    welcomeText,
    startInterview,
    submitResponse,
    getFullTranscript,
    moveToVerification,
    completeOnboarding,
    skipAudio,
    setStep,
    setInputMode,
  } = useOnboardingInterview();

  const {
    pendingVerifications,
    isExtracting,
    extractFromTranscript,
    verifyFact,
    rejectFact,
    clearPendingVerifications,
  } = useUserMemory();

  const { exportResult, generateExport } = useMemoryExport();

  const [textInput, setTextInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [extractedFactCount, setExtractedFactCount] = useState(0);

  // Handle user voice transcript
  const handleTranscript = useCallback(
    async (text: string) => {
      await submitResponse(text);
    },
    [submitResponse],
  );

  const {
    isRecording,
    isProcessing: isTranscribing,
    duration,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({ maxDuration: 120, onTranscript: handleTranscript });

  // When step changes to 'extracting', run extraction
  const extractionStarted = useRef(false);
  useEffect(() => {
    if (step === 'extracting' && !extractionStarted.current) {
      extractionStarted.current = true;
      const transcript = getFullTranscript();
      extractFromTranscript(transcript, undefined, 'voice').then((result) => {
        const count = result?.pending_verifications?.length || 0;
        setExtractedFactCount(count);
        moveToVerification();
      });
    }
  }, [step, getFullTranscript, extractFromTranscript, moveToVerification]);

  // Handle voice toggle
  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
      setStep('transcribing');
    } else {
      resetRecording();
      startRecording();
      setStep('recording');
    }
  }, [isRecording, startRecording, stopRecording, resetRecording, setStep]);

  // Handle text submit
  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput('');
    await submitResponse(text);
  }, [textInput, submitResponse]);

  // Handle verification complete
  const handleVerificationComplete = useCallback(async () => {
    await generateExport('claude', 'general');
    completeOnboarding();
  }, [generateExport, completeOnboarding]);

  const handleCopy = async () => {
    if (exportResult?.content) {
      await navigator.clipboard.writeText(exportResult.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Calculate progress: approximate based on fields captured
  const totalRequired = 6;
  const capturedCount = fieldsStatus.captured.length;
  const progress = Math.min((capturedCount / totalRequired) * 100, 100);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Progress bar - shown during interview */}
      {step !== 'welcome' && step !== 'complete' && step !== 'verification' && (
        <div className="flex-shrink-0 px-6 pt-6 pb-2">
          <div className="h-1.5 rounded-full overflow-hidden bg-muted">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {capturedCount > 0
              ? `${capturedCount} of ${totalRequired} key areas covered`
              : 'Getting to know you...'}
          </p>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {/* WELCOME */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8 max-w-md"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center mx-auto shadow-lg shadow-accent/25">
                  <img src={mindmakerIcon} alt="Mindmaker" className="h-10 w-10 object-contain" />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Welcome to CTRL
                </h1>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {welcomeText}
                </p>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Everything you share stays private, and you can edit or delete any of it
                  later. Let's start with a few quick questions.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="space-y-3"
              >
                <button
                  onClick={() => startInterview('voice')}
                  className="w-full px-8 py-3 rounded-xl bg-accent text-accent-foreground font-semibold flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
                >
                  <Mic className="h-4 w-4" />
                  Let's Talk
                </button>
                <button
                  onClick={() => startInterview('text')}
                  className="w-full px-8 py-3 rounded-xl bg-foreground/5 text-muted-foreground font-medium flex items-center justify-center gap-2 hover:bg-foreground/10 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  I'll type instead
                </button>
                <button
                  onClick={onComplete}
                  className="w-full py-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  Skip for now, I'll explore first
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* PLAYING QUESTION - Krishan is speaking */}
          {step === 'playing_question' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 max-w-md"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  {isAudioLoading ? (
                    <Loader2 className="h-7 w-7 text-accent animate-spin" />
                  ) : (
                    <Volume2 className="h-7 w-7 text-accent" />
                  )}
                </div>
              </motion.div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  {isAudioLoading ? 'Preparing...' : 'Krishan'}
                </p>
                <p className="text-lg font-medium text-foreground leading-relaxed">
                  {currentQuestion}
                </p>
              </div>
              {!isAudioLoading && !isInterviewComplete && (
                <button
                  onClick={skipAudio}
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  Skip to respond
                </button>
              )}
            </motion.div>
          )}

          {/* WAITING FOR RESPONSE - Voice Mode */}
          {step === 'waiting_for_response' && inputMode === 'voice' && (
            <motion.div
              key="wait-voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 max-w-md"
            >
              <div className="bg-muted/30 rounded-xl p-4 text-left">
                <p className="text-xs text-muted-foreground/60 mb-1">Krishan asked:</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {currentQuestion}
                </p>
              </div>
              <motion.button
                onClick={handleVoiceToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-20 h-20 rounded-full mx-auto bg-accent flex items-center justify-center shadow-lg shadow-accent/25"
              >
                <Mic className="w-9 h-9 text-white" />
              </motion.button>
              <div className="flex items-center justify-center gap-3">
                <p className="text-xs text-muted-foreground/50">Tap to speak</p>
                <span className="text-muted-foreground/20">|</span>
                <button
                  onClick={() => setInputMode('text')}
                  className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  Type instead
                </button>
              </div>
              {interviewError && (
                <p className="text-xs text-destructive">{interviewError}</p>
              )}
            </motion.div>
          )}

          {/* WAITING FOR RESPONSE - Text Mode */}
          {step === 'waiting_for_response' && inputMode === 'text' && (
            <motion.div
              key="wait-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md space-y-4"
            >
              <div className="bg-muted/30 rounded-xl p-4 text-left">
                <p className="text-xs text-muted-foreground/60 mb-1">Krishan asked:</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {currentQuestion}
                </p>
              </div>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your response..."
                autoFocus
                rows={4}
                className={cn(
                  'w-full px-4 py-3 rounded-xl',
                  'bg-foreground/5 border border-foreground/10',
                  'text-foreground placeholder:text-foreground/30',
                  'focus:outline-none focus:ring-2 focus:ring-accent/30',
                  'resize-none text-sm',
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleTextSubmit();
                }}
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2',
                  'bg-accent text-accent-foreground',
                  !textInput.trim() && 'opacity-50',
                )}
              >
                <Send className="w-4 h-4" />
                Send
              </button>
              {interviewError && (
                <p className="text-xs text-destructive">{interviewError}</p>
              )}
            </motion.div>
          )}

          {/* RECORDING */}
          {step === 'recording' && (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6"
            >
              <div className="bg-muted/30 rounded-xl p-3 text-left max-w-md mx-auto">
                <p className="text-xs text-muted-foreground/60 leading-relaxed">
                  {currentQuestion}
                </p>
              </div>
              <motion.button
                onClick={handleVoiceToggle}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-24 h-24 rounded-full mx-auto bg-destructive flex items-center justify-center shadow-lg shadow-destructive/25"
              >
                <MicOff className="w-10 h-10 text-white" />
              </motion.button>
              <div className="text-2xl font-bold tabular-nums">{formatTime(duration)}</div>
              <div className="flex items-center justify-center gap-0.5 h-6">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, Math.random() * 24 + 4, 4] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.4 + Math.random() * 0.4,
                      delay: i * 0.03,
                    }}
                    className="w-0.5 bg-destructive rounded-full"
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground/50">Tap the button when you're done</p>
            </motion.div>
          )}

          {/* TRANSCRIBING */}
          {step === 'transcribing' && (
            <motion.div
              key="transcribing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="w-20 h-20 rounded-full bg-gradient-to-r from-accent to-accent/30 p-[2px] mx-auto"
              >
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <img src={mindmakerIcon} alt="Mindmaker" className="w-8 h-8 object-contain" />
                </div>
              </motion.div>
              <p className="text-foreground font-medium">Listening...</p>
              <p className="text-sm text-muted-foreground">Transcribing your response</p>
            </motion.div>
          )}

          {/* GENERATING NEXT QUESTION */}
          {step === 'generating_next' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="w-20 h-20 rounded-full bg-gradient-to-r from-accent to-accent/30 p-[2px] mx-auto"
              >
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <img src={mindmakerIcon} alt="Mindmaker" className="w-8 h-8 object-contain" />
                </div>
              </motion.div>
              <p className="text-foreground font-medium">Thinking...</p>
            </motion.div>
          )}

          {/* EXTRACTING */}
          {step === 'extracting' && (
            <motion.div
              key="extracting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="w-20 h-20 rounded-full bg-gradient-to-r from-accent to-accent/30 p-[2px] mx-auto"
              >
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <img src={mindmakerIcon} alt="Mindmaker" className="w-8 h-8 object-contain" />
                </div>
              </motion.div>
              <p className="text-foreground font-medium">Building your Memory Web...</p>
              <p className="text-sm text-muted-foreground">
                Extracting insights from our conversation
              </p>
            </motion.div>
          )}

          {/* VERIFICATION */}
          {step === 'verification' && pendingVerifications.length > 0 && (
            <FactVerificationCard
              facts={pendingVerifications}
              onVerify={verifyFact}
              onReject={rejectFact}
              onDismiss={() => {
                clearPendingVerifications();
                handleVerificationComplete();
              }}
              onComplete={handleVerificationComplete}
            />
          )}
          {step === 'verification' && pendingVerifications.length === 0 && (
            <VerificationAutoAdvance onComplete={handleVerificationComplete} />
          )}

          {/* COMPLETE */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-5 max-w-md w-full"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto shadow-lg">
                <Check className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Your Memory Web is live
              </h2>
              <p className="text-sm text-muted-foreground">
                {extractedFactCount > 0
                  ? `${extractedFactCount} ${extractedFactCount === 1 ? 'point' : 'points'} from your conversation - ready to review.`
                  : 'Your profile is ready.'}{' '}
                Come back anytime to add more. The more you think out loud, the clearer everything gets.
              </p>
              {exportResult?.content && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Copy this into ChatGPT or Claude. See the difference context makes.
                  </p>
                  <pre className="text-left text-xs text-foreground/70 bg-foreground/5 rounded-xl p-4 max-h-48 overflow-auto whitespace-pre-wrap font-mono border border-border">
                    {exportResult.content}
                  </pre>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2',
                      copied
                        ? 'bg-accent/20 text-accent'
                        : 'bg-foreground/5 text-foreground hover:bg-foreground/10',
                    )}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                </>
              )}
              <button
                onClick={onComplete}
                className="w-full px-8 py-3 rounded-xl bg-accent text-accent-foreground font-semibold shadow-lg shadow-accent/25"
              >
                Go to Dashboard
                <ArrowRight className="inline h-4 w-4 ml-2" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
