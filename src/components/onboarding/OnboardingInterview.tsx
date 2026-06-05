import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  ArrowRight,
  MessageSquare,
  Send,
  Check,
  Volume2,
  Loader2,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import mindmakerIcon from '@/assets/mindmaker-icon.png';
import { useOnboardingInterview } from '@/hooks/useOnboardingInterview';
import { useVoice } from '@/hooks/useVoice';
import { useUserMemory } from '@/hooks/useUserMemory';
import { useIndustrySeeds } from '@/hooks/useIndustrySeeds';
import { buildSeedFacts, toWebFact } from '@/lib/seedFacts';
import { MemoryWebVisualization } from '@/components/memory-web/MemoryWebVisualization';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { DecisionResult, CaptureView } from '@/components/operator/decision/decision-views';

interface Props {
  onComplete: () => void;
}

export function OnboardingInterview({ onComplete }: Props) {
  const {
    step,
    inputMode,
    currentQuestion,
    isAudioLoading,
    isInterviewComplete,
    fieldsStatus,
    error: interviewError,
    welcomeText,
    startInterview,
    submitResponse,
    getFullTranscript,
    completeOnboarding,
    skipAudio,
    setStep,
    setInputMode,
  } = useOnboardingInterview();

  const { memory, extractFromTranscript } = useUserMemory();

  // Industry seeds make the Memory Web bloom feel alive even before any of the
  // leader's own facts land. Fetched up front so they are ready by bloom time.
  const seeds = useIndustrySeeds(true);

  // The concrete session-one artifact: a real decision, pressure-tested.
  const engine = useDecisionEngine();

  const [textInput, setTextInput] = useState('');
  const [extractedFactCount, setExtractedFactCount] = useState(0);
  const [decisionStatement, setDecisionStatement] = useState('');

  // Handle user voice transcript
  const handleTranscript = useCallback(
    async (text: string) => {
      await submitResponse(text);
    },
    [submitResponse],
  );

  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({ maxDuration: 120, onTranscript: handleTranscript });

  // When step changes to 'extracting', run extraction, then bloom the web.
  const extractionStarted = useRef(false);
  useEffect(() => {
    if (step === 'extracting' && !extractionStarted.current) {
      extractionStarted.current = true;
      const transcript = getFullTranscript();
      extractFromTranscript(transcript, undefined, 'voice').then((result) => {
        const count = result?.pending_verifications?.length || result?.facts_stored || 0;
        setExtractedFactCount(count);
        setStep('blooming');
      });
    }
  }, [step, getFullTranscript, extractFromTranscript, setStep]);

  // Facts driving the bloom: the leader's own (hot, centre) over an ambient
  // ring of industry seeds (cold, periphery) so the canvas is never empty.
  const webFacts = useMemo(
    () => [...memory.map(toWebFact), ...buildSeedFacts(seeds.data)],
    [memory, seeds.data],
  );

  // Prefill the decision capture with a challenge the leader just named, so the
  // pressure test feels drawn from their own words (still fully editable).
  useEffect(() => {
    if (step === 'first_artifact' && !decisionStatement) {
      const blocker = memory.find((m) => m.fact_category === 'blocker');
      const objective = memory.find((m) => m.fact_category === 'objective');
      const seedText = blocker?.fact_value || objective?.fact_value || '';
      if (seedText) setDecisionStatement(seedText);
    }
  }, [step, decisionStatement, memory]);

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

  const finish = useCallback(() => {
    completeOnboarding();
    onComplete();
  }, [completeOnboarding, onComplete]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Calculate progress: approximate based on fields captured
  const totalRequired = 6;
  const capturedCount = fieldsStatus.captured.length;
  const progress = Math.min((capturedCount / totalRequired) * 100, 100);

  const showProgress =
    step !== 'welcome' &&
    step !== 'complete' &&
    step !== 'blooming' &&
    step !== 'first_artifact';

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Progress bar - shown during the interview Q&A */}
      {showProgress && (
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
      <div className="flex-1 flex items-center justify-center px-6 overflow-y-auto">
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

          {/* BLOOMING - watch the Memory Web come alive */}
          {step === 'blooming' && (
            <motion.div
              key="blooming"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg flex flex-col items-center text-center py-6"
            >
              <div className="space-y-1.5 mb-3">
                <h2 className="text-xl font-bold text-foreground">Your Memory Web is live</h2>
                <p className="text-sm text-muted-foreground">
                  {extractedFactCount > 0
                    ? `${extractedFactCount} ${extractedFactCount === 1 ? 'point' : 'points'} from our conversation, mapped against your world.`
                    : 'A living map of your world, ready to sharpen every AI you use.'}
                </p>
              </div>
              <div className="w-full h-[48vh] rounded-2xl border border-border bg-card/40 overflow-hidden">
                <MemoryWebVisualization facts={webFacts} showEmptyState={webFacts.length === 0} />
              </div>
              <button
                onClick={() => setStep('first_artifact')}
                className="mt-5 px-8 py-3 rounded-xl bg-accent text-accent-foreground font-semibold flex items-center gap-2 shadow-lg shadow-accent/25"
              >
                See it in action
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* FIRST ARTIFACT - pressure-test a real decision */}
          {step === 'first_artifact' && (
            <motion.div
              key="first-artifact"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-xl py-6 space-y-4"
            >
              {engine.decisionCase ? (
                <>
                  <DecisionResult engine={engine} onReset={engine.reset} />
                  {engine.isComplete && (
                    <button
                      onClick={finish}
                      className="w-full px-8 py-3 rounded-xl bg-accent text-accent-foreground font-semibold flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
                    >
                      Take me to my dashboard
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </>
              ) : engine.upgradeRequired ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">{engine.upgradeMessage}</p>
                  <button onClick={finish} className="text-sm text-accent font-medium underline underline-offset-4">
                    Continue to my dashboard
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-accent">
                    <Scale className="h-5 w-5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">One real decision</span>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <CaptureView
                      value={decisionStatement}
                      onChange={setDecisionStatement}
                      onStart={() => engine.start(decisionStatement)}
                      starting={engine.starting}
                      autoFocus
                      heading="Put a real call through your new web"
                      subhead="Say a decision you are actually weighing. CTRL breaks it into the claims it rests on, checks each against real evidence and your own context, and tells you where it breaks. This is what every day here looks like."
                    />
                  </div>
                  {engine.error && <p className="text-xs text-destructive text-center">{engine.error}</p>}
                  <button
                    onClick={finish}
                    className="w-full py-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    Skip for now, take me to my dashboard
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* COMPLETE - graceful fallback */}
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
                Come back anytime to add more. The more you think out loud, the clearer
                everything gets.
              </p>
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
