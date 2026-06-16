import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  ArrowRight,
  MessageSquare,
  Send,
  X,
  CheckCircle2,
  Shield,
  Flame,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoice } from '@/hooks/useVoice';
import { supabase } from '@/integrations/supabase/client';
import mindmakerIcon from '@/assets/mindmaker-icon.png';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  onComplete: () => void;
}

type Step = 'welcome' | 'prompt' | 'recording' | 'transcribing' | 'submitting' | 'submit_stalled' | 'done';

interface QuestionConfig {
  heading: string;
  prompt: string;
  icon: typeof Shield;
  color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUESTIONS: QuestionConfig[] = [
  {
    heading: 'What are you great at?',
    prompt:
      'Tell me about a leadership skill you\'re proud of. Something people come to you for.',
    icon: Shield,
    color: 'bg-primary',
  },
  {
    heading: 'What drains you?',
    prompt:
      'What\'s the task you dread? The thing that takes you 3x longer than it should?',
    icon: Flame,
    color: 'bg-accent',
  },
  {
    heading: 'What matters most right now?',
    prompt:
      'What would make the biggest difference in your work this quarter?',
    icon: Target,
    color: 'bg-secondary',
  },
];

const TOTAL_STEPS = QUESTIONS.length;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EdgeOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const [responses, setResponses] = useState<string[]>([]);

  // Safety timeout for the submitting state. Previously this silently fired
  // advanceAfterSubmit() after 30s - the user was moved on without knowing
  // their answer might not have saved. Now we transition to a `submit_stalled`
  // step that surfaces a recovery card with Retry / Skip choices so the user
  // is in control when something is genuinely slow.
  const submittingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Pending response captured at submit time; used by the Retry path.
  const pendingResponseRef = useRef<string | null>(null);
  useEffect(() => {
    if (step === 'submitting') {
      submittingTimerRef.current = setTimeout(() => {
        console.warn(
          `EdgeOnboarding submission stalled (>30s) at question ${questionIndex}`,
        );
        setStep('submit_stalled');
      }, 30_000);
    }
    return () => clearTimeout(submittingTimerRef.current);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------------------------------------------------
  // Voice handling
  // -----------------------------------------------------------------------

  const handleTranscript = useCallback(
    async (text: string) => {
      setStep('submitting');
      await submitResponse(text);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questionIndex],
  );

  const {
    isRecording,
    isProcessing: isTranscribing,
    duration,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({ maxDuration: 120, onTranscript: handleTranscript });

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      resetRecording();
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording, resetRecording]);

  // -----------------------------------------------------------------------
  // Submission
  // -----------------------------------------------------------------------

  async function submitResponse(text: string) {
    pendingResponseRef.current = text;
    const nextResponses = [...responses, text];
    setResponses(nextResponses);

    try {
      await supabase.functions.invoke('extract-user-context', {
        body: { transcript: text },
      });
    } catch (err) {
      console.error('extract-user-context failed:', err);
      // Non-blocking -- we still advance so the user isn't stuck.
    }

    pendingResponseRef.current = null;
    advanceAfterSubmit(nextResponses);
  }

  // Recovery handlers for the submit_stalled step.
  const handleStalledRetry = useCallback(() => {
    const text = pendingResponseRef.current;
    if (!text) {
      // No pending text means the user got here via an edge case;
      // treat as a skip.
      setStep('submitting');
      advanceAfterSubmit();
      return;
    }
    setStep('submitting');
    void submitResponse(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStalledSkip = useCallback(() => {
    pendingResponseRef.current = null;
    advanceAfterSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function advanceAfterSubmit(nextResponses?: string[]) {
    clearTimeout(submittingTimerRef.current);
    const collected = nextResponses ?? responses;
    const nextIndex = questionIndex + 1;

    if (nextIndex >= TOTAL_STEPS) {
      setStep('done');
    } else {
      setQuestionIndex(nextIndex);
      setInputMode('voice');
      setTextInput('');
      setStep('prompt');
    }
  }

  // -----------------------------------------------------------------------
  // Text submit
  // -----------------------------------------------------------------------

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    setStep('submitting');
    await submitResponse(textInput.trim());
    setTextInput('');
    setInputMode('voice');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textInput, questionIndex, responses]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const q = QUESTIONS[questionIndex];
  const Icon = q?.icon ?? Shield;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Progress bar */}
      {step !== 'welcome' && step !== 'done' && (
        <div className="flex-shrink-0 px-6 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: '0%' }}
                  animate={{
                    width:
                      i < questionIndex
                        ? '100%'
                        : i === questionIndex &&
                          (step === 'recording' || step === 'transcribing' || step === 'submitting')
                          ? '50%'
                          : '0%',
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Question {Math.min(questionIndex + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
          </p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {/* ---- WELCOME ---- */}
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
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto shadow-lg shadow-accent/25">
                  <img src={mindmakerIcon} alt="Mindmaker" className="h-8 w-8 object-contain" />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Let's find your edge
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                  Three questions. Three minutes. We'll build your leadership context from here.
                </p>
              </motion.div>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={() => setStep('prompt')}
                className="px-8 py-3 rounded-xl bg-accent text-accent-foreground font-semibold flex items-center gap-2 mx-auto shadow-lg shadow-accent/25"
              >
                Let's Go
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </motion.div>
          )}

          {/* ---- PROMPT ---- */}
          {step === 'prompt' && (
            <motion.div
              key={`prompt-${questionIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 max-w-md"
            >
              <div
                className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center mx-auto shadow-lg',
                  q.color,
                )}
              >
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Question {questionIndex + 1}
                </span>
                <h2 className="text-xl font-bold text-foreground">{q.heading}</h2>
                <p className="text-base text-muted-foreground leading-relaxed">{q.prompt}</p>
              </div>

              {/* Voice button */}
              <motion.button
                onClick={() => {
                  setStep('recording');
                  setInputMode('voice');
                  resetRecording();
                  startRecording();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'w-20 h-20 rounded-full mx-auto',
                  q.color,
                  'flex items-center justify-center',
                  'shadow-lg',
                )}
              >
                <Mic className="w-9 h-9 text-white" />
              </motion.button>
              <div className="flex items-center justify-center gap-3">
                <p className="text-xs text-muted-foreground/50">Tap to speak (1-2 minutes)</p>
                <span className="text-muted-foreground/20">|</span>
                <button
                  onClick={() => {
                    setStep('recording');
                    setInputMode('text');
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  Type instead
                </button>
              </div>
            </motion.div>
          )}

          {/* ---- RECORDING (voice) ---- */}
          {step === 'recording' && inputMode === 'voice' && isRecording && (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                {q.heading}
              </span>
              <motion.button
                onClick={handleVoiceToggle}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={cn(
                  'w-24 h-24 rounded-full mx-auto',
                  'bg-destructive',
                  'flex items-center justify-center',
                  'shadow-lg shadow-destructive/25',
                )}
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

          {/* ---- RECORDING (text fallback) ---- */}
          {step === 'recording' && inputMode === 'text' && !isTranscribing && (
            <motion.div
              key="text-input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-md space-y-4"
            >
              <div className="text-center space-y-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center mx-auto',
                    q.color,
                  )}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent block">
                  {q.heading}
                </span>
                <p className="text-sm text-muted-foreground">{q.prompt}</p>
              </div>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your answer here..."
                autoFocus
                rows={5}
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
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setInputMode('voice');
                    setTextInput('');
                    setStep('prompt');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-foreground/5 text-muted-foreground text-sm font-medium flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5',
                    'bg-accent text-accent-foreground',
                    !textInput.trim() && 'opacity-50',
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit
                </button>
              </div>
              <button
                onClick={() => {
                  setInputMode('voice');
                  setStep('recording');
                  resetRecording();
                  startRecording();
                }}
                className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center justify-center gap-1"
              >
                <Mic className="w-3 h-3" />
                Switch to voice
              </button>
            </motion.div>
          )}

          {/* ---- TRANSCRIBING ---- */}
          {step === 'recording' && !isRecording && inputMode === 'voice' && (
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
              <p className="text-foreground font-medium">Transcribing your response...</p>
              <p className="text-sm text-muted-foreground">This may take a few seconds</p>
            </motion.div>
          )}

          {/* ---- SUBMITTING ---- */}
          {step === 'submitting' && (
            <motion.div
              key="submitting"
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
              <p className="text-foreground font-medium">Processing your answer...</p>
              <p className="text-sm text-muted-foreground">Building your leadership context</p>
            </motion.div>
          )}

          {/* ---- SUBMIT STALLED ---- recovery card when extract-user-context
                  hasn't responded after 30s. The user picks: retry the same
                  answer, or skip past this question. Replaces the previous
                  silent auto-advance. */}
          {step === 'submit_stalled' && (
            <motion.div
              key="submit_stalled"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-5 max-w-sm"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/15 mx-auto flex items-center justify-center">
                <Shield className="w-7 h-7 text-amber-500" />
              </div>
              <div className="space-y-1.5">
                <p className="text-foreground font-semibold">That took longer than expected</p>
                <p className="text-sm text-muted-foreground">
                  Your last answer may not have saved. Retry, or skip and we'll keep going.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-1">
                <Button onClick={handleStalledRetry} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Retry
                </Button>
                <Button variant="outline" onClick={handleStalledSkip}>
                  Skip
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---- DONE ---- */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 max-w-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto shadow-lg shadow-accent/25">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </motion.div>
              <h2 className="text-xl font-bold text-foreground">Context captured</h2>
              <p className="text-muted-foreground leading-relaxed">
                We now have a picture of your strengths, friction points, and priorities.
                Let's turn that into your Edge.
              </p>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={onComplete}
                className="px-8 py-3 rounded-xl bg-accent text-accent-foreground font-semibold shadow-lg shadow-accent/25 flex items-center gap-2 mx-auto"
              >
                Build My Edge
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
