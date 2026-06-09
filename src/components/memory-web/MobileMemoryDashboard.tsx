import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Send,
  MessageSquare,
  Radio,
  ListChecks,
  Brain,
  Zap,
  ChevronRight,
  User,
  Briefcase,
  Target,
  AlertTriangle,
  Settings,
  TrendingUp,
  Shield,
  Eye,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemoryWeb } from '@/hooks/useMemoryWeb';
import { useVoice } from '@/hooks/useVoice';
import { useUserMemory } from '@/hooks/useUserMemory';
import { useMarkdownImport } from '@/hooks/useMarkdownImport';
import { FactVerificationCard } from '@/components/memory/FactVerificationCard';
import { VerificationSwipeStack } from '@/components/memory/VerificationSwipeStack';
import { useVerificationFlow } from '@/hooks/useVerificationFlow';
import { MemoryWebVisualization } from './MemoryWebVisualization';
import { useIndustrySeeds } from '@/hooks/useIndustrySeeds';
import { buildSeedFacts } from '@/lib/seedFacts';
import { BottomNav } from './BottomNav';
import { AppHeader } from './AppHeader';
import { useToast } from '@/hooks/use-toast';
import { sanitizeTranscriptionError } from '@/utils/transcriptionErrors';
import { TranscriptReviewPanel } from '@/components/voice/TranscriptReviewPanel';
import { BriefingCard } from '@/components/dashboard/BriefingCard';
import { DecisionInboxCard } from '@/components/operator/decision/DecisionInboxCard';
import { BriefingSheet, MiniPlayer, CustomBriefingSheet } from '@/components/briefing';
import { InterestsSheet } from '@/components/briefing/InterestsSheet';
import { useTodaysBriefing, useGenerateBriefing } from '@/hooks/useBriefing';
import { useBriefingInterests } from '@/hooks/useBriefingInterests';
import { useBriefingContext } from '@/contexts/BriefingContext';
import type { BriefingType } from '@/types/briefing';
import type { FactCategory, PatternType } from '@/types/memory';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const PATTERN_CONFIG: Record<PatternType, { icon: typeof TrendingUp; label: string; color: string }> = {
  strength: { icon: TrendingUp, label: 'Strength', color: 'text-emerald-400 bg-emerald-500/10' },
  preference: { icon: Settings, label: 'Preference', color: 'text-blue-400 bg-blue-500/10' },
  behavior: { icon: Eye, label: 'Behavior', color: 'text-purple-400 bg-purple-500/10' },
  blindspot: { icon: Shield, label: 'Blind Spot', color: 'text-amber-400 bg-amber-500/10' },
  anti_preference: { icon: AlertTriangle, label: 'Avoids', color: 'text-red-400 bg-red-500/10' },
};

export function MobileMemoryDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { facts, patterns, stats, delta, isLoading, error: memoryError, refresh } = useMemoryWeb();
  const {
    pendingVerifications,
    isExtracting,
    extractFromTranscript,
    verifyFact,
    rejectFact,
    clearPendingVerifications,
  } = useUserMemory();
  const { toast } = useToast();
  const { triggerImport, isImporting, fileInputProps } = useMarkdownImport();
  const {
    isFlowOpen: isVerifyFlowOpen,
    pendingFacts: verifyPendingFacts,
    unverifiedCount,
    verifiedRate,
    openFlow: openVerifyFlow,
    closeFlow: closeVerifyFlow,
    verifyFact: flowVerifyFact,
    rejectFact: flowRejectFact,
    refreshPending,
  } = useVerificationFlow();
  const { briefing: todaysBriefing, customBriefings, loading: briefingLoading, refetch: refetchBriefing } = useTodaysBriefing();
  const { setBriefing, setSheetOpen, playback, isMiniPlayerVisible } = useBriefingContext();
  const { generate, generating, phase } = useGenerateBriefing();
  const { all: declaredInterests, loading: interestsLoading } = useBriefingInterests();
  const [customSheetOpen, setCustomSheetOpen] = useState(false);
  const [briefingExpanded, setBriefingExpanded] = useState(false);
  const [interestsSheetOpen, setInterestsSheetOpen] = useState(false);

  const hasDataForBriefing = facts.length > 0;
  // A user is "declared" once they've picked enough interests to make the
  // briefing worth generating. Below this threshold the briefing would be
  // generic, so we gate auto-generation on it and surface the cold-start CTA
  // instead.
  const hasDeclaredInterests = declaredInterests.length >= 3;

  // Sync briefing into context
  useEffect(() => {
    if (todaysBriefing) setBriefing(todaysBriefing);
  }, [todaysBriefing, setBriefing]);

  const handlePlayBriefing = () => {
    if (todaysBriefing) {
      setBriefing(todaysBriefing);
      setSheetOpen(true);
    }
  };

  const handleGenerateBriefing = async () => {
    await generate(undefined, undefined, undefined, refetchBriefing);
    await refetchBriefing();
  };

  const [refreshingBriefing, setRefreshingBriefing] = useState(false);
  const handleRefreshBriefing = async () => {
    setRefreshingBriefing(true);
    try {
      await generate('default', undefined, true, refetchBriefing);
      await refetchBriefing();
    } finally {
      setRefreshingBriefing(false);
    }
  };

  const handleCustomGenerate = async (briefingType: BriefingType, customContext?: string) => {
    const briefingId = await generate(briefingType, customContext, undefined, refetchBriefing);
    if (briefingId) {
      setCustomSheetOpen(false);
      await refetchBriefing();
    }
  };

  const [mode, setMode] = useState<'idle' | 'voice' | 'text' | 'review'>('idle');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [editReviewText, setEditReviewText] = useState('');
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTranscript = useCallback(
    async (text: string) => {
      setIsProcessing(true);
      try {
        const result = await extractFromTranscript(text);
        if (result?.success === false) {
          toast({
            title: 'Processing failed',
            description: result.error || 'Could not extract insights. Please try again.',
            variant: 'destructive',
          });
        } else if (result?.pending_verifications?.length > 0) {
          setShowVerification(true);
        }
        await refresh();
      } catch (err) {
        console.error('Error processing:', err);
        toast({
          title: 'Processing failed',
          description: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
        setMode('idle');
      }
    },
    [extractFromTranscript, refresh, toast],
  );

  const {
    isRecording,
    isProcessing: isTranscribing,
    duration,
    error: voiceError,
    browserCaptionPreview,
    pendingReview,
    confirmPendingTranscript,
    dismissPendingReview,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({ maxDuration: 120, deferTranscriptCallback: true, onTranscript: handleTranscript });

  useEffect(() => {
    if (pendingReview) {
      setEditReviewText(pendingReview.transcript);
      setMode('review');
    }
  }, [pendingReview]);

  const handleConfirmVoiceReview = useCallback(async () => {
    await confirmPendingTranscript(editReviewText);
  }, [confirmPendingTranscript, editReviewText]);

  const handleDismissVoiceReview = useCallback(() => {
    dismissPendingReview();
    setMode('idle');
  }, [dismissPendingReview]);

  const activeProcessing = isProcessing || isExtracting || isTranscribing;

  useEffect(() => {
    if (voiceError) {
      toast({
        title: 'Transcription failed',
        description: sanitizeTranscriptionError(voiceError.message),
        variant: 'destructive',
      });
      setIsProcessing(false);
      setMode('idle');
    }
  }, [voiceError, toast]);

  useEffect(() => {
    if (activeProcessing) {
      processingTimerRef.current = setTimeout(() => {
        toast({
          title: 'Processing is taking longer than expected',
          description: 'You can cancel and try again.',
          variant: 'destructive',
        });
      }, 120_000);
    } else if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    return () => {
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    };
  }, [activeProcessing, toast]);

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      resetRecording();
      startRecording();
      setMode('voice');
    }
  }, [isRecording, startRecording, stopRecording, resetRecording]);

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    await handleTranscript(textInput.trim());
    setTextInput('');
  };

  const handleCancelProcessing = useCallback(() => {
    resetRecording();
    setIsProcessing(false);
    setMode('idle');
    toast({ title: 'Cancelled', description: 'You can try recording again.' });
  }, [resetRecording, toast]);

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const hasData = facts.length > 0;

  // Cold start: ambient industry seeds keep the web alive when there are no
  // real facts yet. Only fetched when the canvas would otherwise be empty.
  const showEmpty = !isLoading && !hasData && !memoryError;
  const { data: emptySeedData } = useIndustrySeeds(showEmpty);
  const emptySeedFacts = useMemo(() => buildSeedFacts(emptySeedData), [emptySeedData]);

  const isVoiceExpanded =
    isRecording || activeProcessing || mode === 'text' || mode === 'review' || !!pendingReview;

  return (
    <>
      {/* Hidden file input for markdown import */}
      <input {...fileInputProps} />
      <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
        {/* Header */}
        <AppHeader />

        {/* Briefing area - fixed height slot, shows exactly one state */}
        {hasData && (
          <div className="flex-shrink-0 px-4 pt-2 relative z-20">
            <AnimatePresence mode="wait">
              {todaysBriefing && !briefingLoading ? (
                <motion.div
                  key="briefing-card"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <BriefingCard
                    briefing={todaysBriefing}
                    hasListened={playback.hasListened}
                    onPlay={handlePlayBriefing}
                    onRefresh={handleRefreshBriefing}
                    refreshing={refreshingBriefing}
                    onCustomBriefing={() => setCustomSheetOpen(true)}
                    customBriefingCount={customBriefings.length}
                    onExpandChange={setBriefingExpanded}
                  />
                </motion.div>
              ) : generating ? (
                <motion.div
                  key="generating-banner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-accent/20 bg-accent/5 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Radio className="w-4 h-4 text-accent animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground whitespace-nowrap">Preparing your briefing</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {phase === 'scanning' ? 'Reading your profile'
                          : phase === 'personalising' ? 'Searching today\'s news'
                          : 'Almost ready...'}
                      </p>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0 w-[100px] py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold overflow-hidden text-center">
                    <motion.div
                      className="absolute inset-0 bg-accent-foreground/15 rounded-xl"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 15, ease: "linear" }}
                      style={{ transformOrigin: "left" }}
                    />
                    <span className="relative z-10">
                      {phase === 'scanning' ? 'Reading profile...'
                        : phase === 'personalising' ? 'Searching news...'
                        : 'Preparing...'}
                    </span>
                  </div>
                </motion.div>
              ) : !briefingLoading && !interestsLoading && !hasDeclaredInterests ? (
                <motion.div
                  key="coldstart-cta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-accent/20 bg-accent/5 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <ListChecks className="w-4 h-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground whitespace-nowrap">Make your briefing yours</p>
                      <p className="text-xs text-muted-foreground truncate">Pick a few beats and we'll personalise it</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInterestsSheetOpen(true)}
                    className="flex-shrink-0 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold text-center hover:bg-accent/90 transition-colors"
                  >
                    Set interests
                  </button>
                </motion.div>
              ) : !briefingLoading ? (
                <motion.div
                  key="generate-cta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-accent/20 bg-accent/5 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Radio className="w-4 h-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground whitespace-nowrap">Your Daily Briefing</p>
                      <p className="text-xs text-muted-foreground truncate">Personalised AI news, in your voice</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateBriefing}
                    className="flex-shrink-0 w-[100px] py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold text-center hover:bg-accent/90 transition-colors"
                  >
                    Generate
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className="empty:hidden [&>*]:mt-2">
              <DecisionInboxCard alertsOnly />
            </div>
          </div>
        )}

        {/* Health Score bar */}
        {hasData && stats && (
          <div className="flex-shrink-0 px-5 py-1.5 relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 4px rgba(16,185,129,0.2)',
                    '0 0 8px rgba(139,92,246,0.3)',
                    '0 0 4px rgba(16,185,129,0.2)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="rounded-full"
              >
                <Brain className="h-3.5 w-3.5 text-accent flex-shrink-0" />
              </motion.div>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #10b981, #8b5cf6, #ec4899)',
                    backgroundSize: '200% 100%',
                  }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${stats.health_score}%`,
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{
                    width: { duration: 1, ease: 'easeOut' },
                    backgroundPosition: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
                  }}
                />
              </div>
              <span className="text-xs font-bold text-foreground tabular-nums flex-shrink-0">
                {stats.health_score}%
              </span>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                {stats.total_facts}f &middot; {stats.patterns_count}p
              </span>
              {delta && delta.new_facts > 0 && (
                <motion.span
                  className="text-[10px] text-accent font-medium flex-shrink-0"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  +{delta.new_facts}
                </motion.span>
              )}
            </motion.div>
          </div>
        )}

        {/* Main content area - Memory Web visualization as hero. The floor is
            viewport-relative so the web shrinks gracefully on short phones
            (keeping the voice input above the nav) and stays generous on tall
            screens, rather than a fixed 280px that clips small devices. */}
        {!isVoiceExpanded && (
          <div className="flex-1 min-h-[clamp(170px,30vh,320px)] relative">
            {/* The living memory web - always visible. Falls back to ambient
                industry seeds so it is never a blank canvas. */}
            <MemoryWebVisualization
              facts={hasData ? facts : emptySeedFacts}
              showEmptyState={!isLoading && !hasData && !memoryError && emptySeedFacts.length === 0 && mode === 'idle'}
              clearSelection={briefingExpanded}
            />

            {/* Loading */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="w-16 h-16 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent, rgba(139,92,246,0.4), transparent)',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
              </div>
            )}

            {/* Error state - shown only when query failed and there is no cached data */}
            {!isLoading && !!memoryError && !hasData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
              >
                <AlertCircle className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Could not load memories
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Check your connection and try again.
                </p>
                <button
                  onClick={() => refresh()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </motion.div>
            )}

            {/* Pattern pills overlay - bottom of web area */}
            {hasData && patterns.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute bottom-2 left-3 right-3 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1"
              >
                {patterns.slice(0, 3).map((p) => {
                  const config = PATTERN_CONFIG[p.pattern_type] || PATTERN_CONFIG.behavior;
                  return (
                    <motion.div
                      key={p.id}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'flex-shrink-0 px-2.5 py-1.5 rounded-full backdrop-blur-md',
                        'border border-white/5 bg-background/70',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-[8px] px-1 py-0.5 rounded-full font-bold', config.color)}>
                          {config.label}
                        </span>
                        <p className="text-[10px] text-foreground/70 max-w-[120px] truncate">
                          {p.pattern_text}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        )}

        {/* Voice Input Area */}
        <div className={cn(
          'flex-shrink-0 px-5 overflow-hidden relative z-10',
          isVoiceExpanded && 'flex-1',
        )}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={cn('flex flex-col', isVoiceExpanded && 'h-full justify-center')}
          >
            <AnimatePresence mode="wait">
              {mode === 'idle' && !activeProcessing && !pendingReview && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2 py-2"
                >
                  <p className="text-xs text-foreground/60">
                    {hasData
                      ? 'Add a fact about you, your team, or your work'
                      : 'Tell us about your role to start your Memory Web'}
                  </p>

                  {/* Animated mic button with glow rings */}
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: [
                          '0 0 0 0px rgba(16,185,129,0.2), 0 0 0 0px rgba(139,92,246,0.1)',
                          '0 0 0 8px rgba(16,185,129,0.0), 0 0 0 16px rgba(139,92,246,0.0)',
                        ],
                      }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                    />
                    <motion.button
                      onClick={handleVoiceToggle}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className={cn(
                        'w-12 h-12 rounded-full relative',
                        'bg-gradient-to-br from-accent to-accent/70',
                        'flex items-center justify-center',
                        'shadow-lg shadow-accent/25',
                      )}
                    >
                      <Mic className="w-5 h-5 text-white" />
                    </motion.button>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-[10px] text-muted-foreground/50">Tap to narrate</p>
                    <span className="text-muted-foreground/20">|</span>
                    <button
                      onClick={() => setMode('text')}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <MessageSquare className="w-2.5 h-2.5" />
                      Type instead
                    </button>
                    <span className="text-muted-foreground/20">|</span>
                    <button
                      onClick={triggerImport}
                      disabled={isImporting}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      {isImporting ? 'Importing...' : 'Import file'}
                    </button>
                  </div>
                </motion.div>
              )}

              {mode === 'voice' && isRecording && (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 py-6"
                >
                  {/* Pulsing recording button with expanding rings */}
                  <div className="relative">
                    {[0, 1, 2].map((ring) => (
                      <motion.div
                        key={ring}
                        className="absolute inset-0 rounded-full border border-red-400/20"
                        animate={{
                          scale: [1, 1.6 + ring * 0.3],
                          opacity: [0.4, 0],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.8,
                          delay: ring * 0.4,
                          ease: 'easeOut',
                        }}
                        style={{
                          width: 80,
                          height: 80,
                          left: 0,
                          top: 0,
                        }}
                      />
                    ))}
                    <motion.button
                      onClick={handleVoiceToggle}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-red-500/30 relative"
                    >
                      <MicOff className="w-8 h-8 text-white" />
                    </motion.button>
                  </div>

                  <div className="text-2xl font-bold tabular-nums text-foreground">
                    {formatTime(duration)}
                  </div>

                  {/* Animated waveform */}
                  <div className="flex items-center justify-center gap-0.5 h-6">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [3, Math.random() * 22 + 3, 3] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.4 + Math.random() * 0.4,
                          delay: i * 0.03,
                        }}
                        className="w-0.5 rounded-full"
                        style={{
                          background: `linear-gradient(to top, rgba(239,68,68,0.4), rgba(239,68,68,0.9))`,
                        }}
                      />
                    ))}
                  </div>
                  {browserCaptionPreview ? (
                    <p className="text-[10px] text-muted-foreground/70 text-center max-w-[280px] italic">
                      Live caption (approx.): {browserCaptionPreview}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">Tap to stop</p>
                  )}
                </motion.div>
              )}

              {mode === 'review' && pendingReview && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="py-2 w-full max-w-md mx-auto"
                >
                  <TranscriptReviewPanel
                    transcript={pendingReview.transcript}
                    rawTranscript={pendingReview.rawTranscript}
                    refined={pendingReview.refined}
                    editedText={editReviewText}
                    onEditedTextChange={setEditReviewText}
                    onConfirm={handleConfirmVoiceReview}
                    onDismiss={handleDismissVoiceReview}
                    confirmLabel="Continue"
                    className="border-foreground/10"
                  />
                </motion.div>
              )}

              {mode === 'text' && !activeProcessing && (
                <motion.div
                  key="text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-3 py-4"
                >
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Tell me about your role, current projects, goals, or challenges..."
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
                      if (e.key === 'Enter' && e.metaKey) handleTextSubmit();
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setMode('idle'); setTextInput(''); }}
                      className="flex-1 py-2.5 rounded-xl bg-foreground/5 text-muted-foreground text-sm font-medium"
                    >
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
                </motion.div>
              )}

              {activeProcessing && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  {/* Multi-ring spinner */}
                  <div className="relative w-16 h-16">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-accent via-purple-500 to-pink-500 p-[2px]"
                    >
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                        <Brain className="w-6 h-6 text-purple-400" />
                      </div>
                    </motion.div>
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                      className="absolute -inset-2 rounded-full border border-accent/10 border-t-accent/30"
                    />
                  </div>

                  <p className="text-sm text-foreground font-medium">
                    {isTranscribing ? 'Processing speech...' : 'Weaving into your memory web...'}
                  </p>
                  {isTranscribing && browserCaptionPreview ? (
                    <p className="text-[10px] text-muted-foreground text-center max-w-[280px] italic">
                      Browser preview (may differ): {browserCaptionPreview}
                    </p>
                  ) : null}
                  <button
                    onClick={handleCancelProcessing}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Spacer for fixed bottom nav */}
        <div className="flex-shrink-0 h-20" />

        <MiniPlayer />
      </div>
      <BottomNav />

      {/* Verify action - floating above bottom nav */}
      <AnimatePresence>
        {hasData && !isVoiceExpanded && unverifiedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "fixed left-4 right-4 z-40",
              isMiniPlayerVisible ? "bottom-nav-clearance-with-player" : "bottom-nav-clearance"
            )}
          >
            <button
              onClick={openVerifyFlow}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-semibold backdrop-blur-md border border-emerald-500/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verify ({unverifiedCount})
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVerification && pendingVerifications.length > 0 && (
          <FactVerificationCard
            facts={pendingVerifications}
            onVerify={verifyFact}
            onReject={rejectFact}
            onDismiss={() => { setShowVerification(false); clearPendingVerifications(); }}
            onComplete={() => { setShowVerification(false); refresh(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVerifyFlowOpen && (
          <VerificationSwipeStack
            facts={verifyPendingFacts}
            onVerify={flowVerifyFact}
            onReject={flowRejectFact}
            onDismiss={closeVerifyFlow}
            onComplete={closeVerifyFlow}
            unverifiedCount={unverifiedCount}
            verifiedRate={verifiedRate}
            onContinue={refreshPending}
          />
        )}
      </AnimatePresence>
      <BriefingSheet />
      <CustomBriefingSheet
        isOpen={customSheetOpen}
        onClose={() => setCustomSheetOpen(false)}
        onGenerate={handleCustomGenerate}
        isGenerating={generating}
      />
      <InterestsSheet
        open={interestsSheetOpen}
        onOpenChange={setInterestsSheetOpen}
        onSaved={() => {
          // Kick the briefing off right away so it's ready when the user
          // returns to the home tab. The auto-gen effect would also catch
          // this once `hasDeclaredInterests` flips true, but firing here
          // keeps the feedback loop tight.
          void handleGenerateBriefing();
        }}
      />
    </>
  );
}
