import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Send,
  Brain,
  Download,
  Upload,
  Copy,
  Check,
  Loader2,
  FileText,
  Radio,
  ArrowUpRight,
  Activity,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMemoryWeb } from '@/hooks/useMemoryWeb';
import { useToast } from '@/hooks/use-toast';
import { useVoice } from '@/hooks/useVoice';
import { useMemoryExport } from '@/hooks/useMemoryExport';
import { useMarkdownImport } from '@/hooks/useMarkdownImport';
import { useIndustrySeeds } from '@/hooks/useIndustrySeeds';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import { useCockpit } from '@/hooks/useCockpit';
import { buildSeedFacts } from '@/lib/seedFacts';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { Skeleton } from '@/components/ui/skeleton';
import { MemoryWebVisualization } from './MemoryWebVisualization';
import { BetsRail, type OvernightLine } from './BetsRail';
import { DesktopSignalHero, type NeedsCallItem } from './DesktopSignalHero';
import { SeedBeatsPrompt } from '@/components/briefing/SeedBeatsPrompt';
import { TranscriptReviewPanel } from '@/components/voice/TranscriptReviewPanel';
import { useTodaysBriefing, useGenerateBriefing } from '@/hooks/useBriefing';
import { useBriefingContext } from '@/contexts/BriefingContext';
import type { BetState } from '@/types/cockpit';

/* ─── Right rail components ────────────────────────────────────── */

function RailBriefingSlot({
  todaysBriefing,
  briefingLoading,
  generating,
  phase,
  onGenerate,
  onPlay,
}: {
  todaysBriefing: ReturnType<typeof useTodaysBriefing>['briefing'];
  briefingLoading: boolean;
  generating: boolean;
  phase: string | null;
  onGenerate: () => void;
  onPlay: () => void;
}) {
  return (
    <div className="border-b border-border/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="h-3.5 w-3.5 text-accent" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Today's Briefing
        </h3>
      </div>
      <AnimatePresence mode="wait">
        {todaysBriefing && !briefingLoading ? (
          <motion.div
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-sm text-foreground leading-snug line-clamp-3">
              {todaysBriefing.headline || 'Your personalised briefing is ready.'}
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {todaysBriefing.audio_duration_seconds
                  ? `${Math.ceil(todaysBriefing.audio_duration_seconds / 60)} min`
                  : '~3 min'}
              </span>
              <button
                onClick={onPlay}
                className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90"
              >
                Play
              </button>
            </div>
          </motion.div>
        ) : generating ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <p className="text-sm text-foreground">Preparing your briefing</p>
            <p className="text-[11px] text-muted-foreground">
              {phase === 'scanning'
                ? 'Reading your profile'
                : phase === 'personalising'
                ? 'Searching today\'s news'
                : 'Almost ready...'}
            </p>
            <div className="h-1 rounded-full bg-accent/15 overflow-hidden">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: '5%' }}
                animate={{ width: '85%' }}
                transition={{ duration: 18, ease: 'linear' }}
              />
            </div>
          </motion.div>
        ) : !briefingLoading ? (
          <motion.div
            key="cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-sm text-foreground leading-snug">
              Personalised AI news in your own voice.
            </p>
            <button
              onClick={onGenerate}
              className="w-full px-3 py-2 rounded-md bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90"
            >
              Generate today
            </button>
          </motion.div>
        ) : (
          <div className="h-12 rounded-md bg-secondary/40 animate-pulse" />
        )}
      </AnimatePresence>
    </div>
  );
}

const RECENT_CHIP: Record<BetState, string> = {
  countered: 'bg-amber-400',
  explore: 'bg-sky-400',
  quiet: 'bg-muted-foreground/50',
};

/** Recent decisions: the living board's recent cases, honestly state-dotted. */
function RailRecentDecisions({
  items,
  onOpen,
}: {
  items: { id: string; title: string; state: BetState; freshness: string }[];
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="border-b border-border/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid className="h-3.5 w-3.5 text-accent" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent decisions
        </h3>
      </div>
      <div className="space-y-2.5">
        {items.slice(0, 5).map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onOpen(it.id)}
            className="flex w-full items-start gap-2.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-secondary/40"
          >
            <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', RECENT_CHIP[it.state])} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-snug text-foreground line-clamp-2">{it.title}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{it.freshness}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RailQuickActions({
  onQuickExport,
  onImport,
  isExporting,
  copied,
  navigate,
}: {
  onQuickExport: () => void;
  onImport: () => void;
  isExporting: boolean;
  copied: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="p-5">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Quick actions
      </h3>
      <div className="space-y-1.5">
        <button
          onClick={onQuickExport}
          disabled={isExporting}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-secondary/60 text-left text-sm group"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
          )}
          <span className="text-foreground flex-1">
            {copied ? 'Copied to clipboard' : 'Copy context to clipboard'}
          </span>
        </button>
        <button
          onClick={() => navigate('/context')}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-secondary/60 text-left text-sm group"
        >
          <Download className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
          <span className="text-foreground flex-1">Open Export wizard</span>
          <ArrowUpRight className="h-3 w-3 text-muted-foreground/40" />
        </button>
        <button
          onClick={onImport}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-secondary/60 text-left text-sm group"
        >
          <Upload className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
          <span className="text-foreground flex-1">Import markdown</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Main dashboard ───────────────────────────────────────────── */

export function DesktopMemoryDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    facts,
    stats,
    delta,
    isLoading,
    error: memoryError,
    refresh: refreshMemory,
    submitInput,
  } = useMemoryWeb();
  const { isExporting, generateExport, copyToClipboard } = useMemoryExport();
  const { briefing: todaysBriefing, loading: briefingLoading, refetch: refetchBriefing } = useTodaysBriefing();
  const { setBriefing, setSheetOpen } = useBriefingContext();
  const { generate, generating, phase } = useGenerateBriefing();
  const hasData = facts.length > 0;
  const { toast } = useToast();

  // The living decision board (cases + open alerts) and the honest cockpit
  // projection (bets board + the day's strongest signal hero).
  const decisionInbox = useDecisionInbox();
  const { data: cockpit } = useCockpit();

  // The command-centre is a state machine: Board (the signal hero) OR Brain (the
  // memory-web canvas). One state at a time, never both.
  const [canvasMode, setCanvasMode] = useState<'board' | 'brain'>('board');

  // The selected bet drives the centre's "your call" quote-back. It defaults to
  // the bet the day's signal hit (the call that moved hardest overnight).
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedBetId && cockpit.bets.some((b) => b.id === selectedBetId)) return;
    setSelectedBetId(cockpit.hero.betId ?? cockpit.bets[0]?.id ?? null);
  }, [cockpit.hero.betId, cockpit.bets, selectedBetId]);

  // Cold start: seed the web with ambient industry context so the canvas is
  // never empty. Only fetched when there is genuinely nothing to show.
  const showEmpty = !isLoading && !hasData && !memoryError;
  const { data: emptySeedData } = useIndustrySeeds(showEmpty);
  const emptySeedFacts = useMemo(() => buildSeedFacts(emptySeedData), [emptySeedData]);

  useEffect(() => {
    if (todaysBriefing) setBriefing(todaysBriefing);
  }, [todaysBriefing, setBriefing]);

  const handlePlayBriefing = () => {
    if (todaysBriefing) {
      setBriefing(todaysBriefing);
      setSheetOpen(true);
    }
  };

  const handleOpenBriefing = useCallback(() => {
    if (todaysBriefing) {
      setBriefing(todaysBriefing);
      setSheetOpen(true);
    } else {
      navigate('/briefing');
    }
  }, [todaysBriefing, setBriefing, setSheetOpen, navigate]);

  const handleGenerateBriefing = async () => {
    await generate(undefined, undefined, undefined, refetchBriefing);
    await refetchBriefing();
  };

  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickExportCopied, setQuickExportCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editDesktopReviewText, setEditDesktopReviewText] = useState('');

  const handleDesktopVoiceTranscript = useCallback((transcript: string) => {
    setInputText(transcript);
  }, []);

  const {
    isRecording,
    isProcessing: isVoiceProcessing,
    pendingReview,
    confirmPendingTranscript,
    dismissPendingReview,
    browserCaptionPreview,
    startRecording,
    stopRecording,
  } = useVoice({
    maxDuration: 120,
    deferTranscriptCallback: true,
    onTranscript: handleDesktopVoiceTranscript,
  });

  useEffect(() => {
    if (pendingReview) {
      setEditDesktopReviewText(pendingReview.transcript);
    }
  }, [pendingReview]);

  const handleConfirmDesktopReview = useCallback(async () => {
    await confirmPendingTranscript(editDesktopReviewText);
  }, [confirmPendingTranscript, editDesktopReviewText]);

  const { triggerImport, handleFiles, isImporting, fileInputProps } = useMarkdownImport();

  // Wire up cmd-K actions
  useEffect(() => {
    const onVoice = () => {
      if (!isRecording) startRecording();
    };
    const onGen = () => handleGenerateBriefing();
    window.addEventListener('mm:capture-voice', onVoice);
    window.addEventListener('mm:generate-briefing', onGen);
    return () => {
      window.removeEventListener('mm:capture-voice', onVoice);
      window.removeEventListener('mm:generate-briefing', onGen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || '';

  // The human date header for the command panel (e.g. "Tuesday, 12 June").
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [],
  );

  const handleSubmit = async () => {
    if (!inputText.trim() || isSubmitting) return;
    const text = inputText.trim();
    setInputText('');
    setIsSubmitting(true);
    try {
      const result = await submitInput(text);
      if (result?.success) {
        toast({ title: 'Added to your Memory Web', description: result.error || undefined });
      } else {
        toast({ title: 'Processing failed', description: result?.error || 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickExport = async () => {
    await generateExport('claude', 'general');
    const ok = await copyToClipboard();
    if (ok) {
      setQuickExportCopied(true);
      setTimeout(() => setQuickExportCopied(false), 2000);
    }
  };

  const handleOpenRead = useCallback(
    (betId: string | null | undefined) => {
      navigate(betId ? `/decision?case=${betId}` : '/decision');
    },
    [navigate],
  );

  const handleSelectBet = useCallback(
    (id: string) => {
      setSelectedBetId(id);
      setCanvasMode('board');
    },
    [],
  );

  // The selected bet's call (its statement) + honest state, for the "your call"
  // quote-back. Falls back to the bet the signal hit.
  const selectedCase = useMemo(
    () => decisionInbox.cases.find((c) => c.id === selectedBetId) ?? null,
    [decisionInbox.cases, selectedBetId],
  );
  const selectedBet = useMemo(
    () => cockpit.bets.find((b) => b.id === selectedBetId) ?? null,
    [cockpit.bets, selectedBetId],
  );

  // Overnight summary lines from the open alerts (the rail's "since yesterday").
  const overnight: OvernightLine[] = useMemo(() => {
    return decisionInbox.alerts.slice(0, 3).map((a): OvernightLine => ({
      tone: a.kind === 'evidence_shifted' ? 'ok' : 'down',
      text: a.headline,
    }));
  }, [decisionInbox.alerts]);

  // "Needs your call" cards: the bets carrying an open signal (cap handled in the hero).
  const needs: NeedsCallItem[] = useMemo(() => {
    const byId = new Map(decisionInbox.cases.map((c) => [c.id, c]));
    return cockpit.bets
      .filter((b) => b.state !== 'quiet')
      .map((b): NeedsCallItem => {
        const alert = decisionInbox.alerts.find((a) => a.decision_case_id === b.id);
        return {
          id: b.id,
          title: alert?.headline || byId.get(b.id)?.title || b.question,
          detail: alert?.detail || '',
          betState: b.state,
        };
      });
  }, [cockpit.bets, decisionInbox.cases, decisionInbox.alerts]);
  const needsExtra = Math.max(0, needs.length - 2);

  // Recent decisions for the right rail (the living board, honestly dotted).
  const recentDecisions = useMemo(
    () =>
      cockpit.bets.map((b) => ({ id: b.id, title: b.question, state: b.state, freshness: b.freshness })),
    [cockpit.bets],
  );

  const rightRail = hasData ? (
    <div className="flex flex-col">
      <RailBriefingSlot
        todaysBriefing={todaysBriefing}
        briefingLoading={briefingLoading}
        generating={generating}
        phase={phase}
        onGenerate={handleGenerateBriefing}
        onPlay={handlePlayBriefing}
      />
      <RailRecentDecisions items={recentDecisions} onOpen={(id) => handleOpenRead(id)} />
      <RailQuickActions
        onQuickExport={handleQuickExport}
        onImport={triggerImport}
        isExporting={isExporting}
        copied={quickExportCopied}
        navigate={navigate}
      />
      {delta && delta.new_facts > 0 && (
        <div className="border-t border-border/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-accent" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Activity
            </h3>
          </div>
          <p className="text-sm text-foreground">
            <span className="text-accent font-medium">+{delta.new_facts}</span> facts
            {delta.new_patterns > 0 && (
              <>
                {', '}
                <span className="text-accent font-medium">+{delta.new_patterns}</span> patterns
              </>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{delta.period}</p>
        </div>
      )}
    </div>
  ) : undefined;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input {...fileInputProps} />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4 p-12 rounded-3xl border-2 border-dashed border-accent/50 bg-accent/5">
              <Upload className="h-12 w-12 text-accent" />
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">Drop your file to import</p>
                <p className="text-sm text-muted-foreground mt-1">Supports .md and .txt files</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Importing overlay */}
      <AnimatePresence>
        {isImporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4 p-12">
              <Loader2 className="h-10 w-10 text-accent animate-spin" />
              <p className="text-lg font-semibold text-foreground">Extracting memories...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DesktopShell
        eyebrow={greeting + (firstName ? `, ${firstName}` : '')}
        title="Command centre"
        bleed
        actions={
          hasData ? (
            <>
              {/* Board / Brain state toggle - one canvas state at a time */}
              <div className="hidden md:flex items-center overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setCanvasMode('board')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold transition-colors',
                    canvasMode === 'board'
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Board
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasMode('brain')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold transition-colors',
                    canvasMode === 'brain'
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Brain
                </button>
              </div>
              <button
                onClick={handleQuickExport}
                disabled={isExporting}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-colors',
                  quickExportCopied
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-accent text-accent-foreground hover:bg-accent/90',
                )}
              >
                {quickExportCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {quickExportCopied ? 'Copied' : 'Quick export'}
              </button>
            </>
          ) : null
        }
        rightRail={rightRail}
      >
        {/* ── LOADING ──────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex-1 min-h-0 p-8 space-y-4" aria-busy="true" aria-label="Loading your command centre">
            <Skeleton className="h-10 w-64 rounded-lg" />
            <Skeleton className="h-72 w-full rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* ── COMMAND CENTRE (board read / bet focus / brain) ──────────── */}
        {!isLoading && hasData && (
          <div className="flex min-h-0 flex-1">
            {/* LEFT: the whole honest bets board */}
            <BetsRail
              bets={cockpit.bets}
              liveCount={cockpit.liveCount}
              selectedBetId={selectedBetId}
              onSelectBet={handleSelectBet}
              onAddBet={() => navigate('/decision')}
              overnight={overnight}
            />

            {/* CENTRE: the command panel - one canvas state at a time */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide px-7 py-6">
                {canvasMode === 'brain' ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="mb-3 flex items-center gap-2.5">
                      <Brain className="h-4 w-4 text-accent" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Your brain
                      </h3>
                      <span className="text-[10px] text-muted-foreground/60">
                        {facts.length} things CTRL knows - click to explore
                      </span>
                    </div>
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card/40">
                      <MemoryWebVisualization facts={facts} />
                    </div>
                  </div>
                ) : (
                  <DesktopSignalHero
                    hero={cockpit.hero}
                    call={selectedCase?.statement ?? cockpit.hero.betQuestion}
                    callState={(selectedBet?.state ?? cockpit.hero.betState) as BetState | null}
                    dateLabel={dateLabel}
                    needs={needs}
                    needsExtra={needsExtra}
                    onOpenRead={handleOpenRead}
                    onPressureTest={() => navigate('/decision')}
                    onOpenBriefing={handleOpenBriefing}
                    onGoDecide={() => navigate('/decision')}
                  />
                )}
              </div>

              {/* Capture bar - the always-available "voice a thought / drop a note"
                  input that grows the brain. Sits below the canvas, full-width. */}
              <div className="shrink-0 border-t border-border/60 bg-background/60 px-7 py-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm focus-within:border-accent/40 transition-colors">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!!pendingReview || isVoiceProcessing}
                    className={cn(
                      'flex-shrink-0 p-2 rounded-lg transition-colors',
                      isRecording
                        ? 'bg-red-500/10 text-red-400 animate-pulse'
                        : 'hover:bg-secondary text-muted-foreground hover:text-foreground',
                      (pendingReview || isVoiceProcessing) && 'opacity-50 cursor-not-allowed',
                    )}
                    title={isRecording ? 'Stop recording' : 'Start recording'}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={triggerImport}
                    disabled={isImporting}
                    className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground"
                    title="Import markdown or text file"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                  <div className="w-px h-5 bg-border flex-shrink-0" />
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a thought, paste a note, or drop a markdown file..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                  />
                  <kbd className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 rounded border border-border bg-background text-[10px] font-mono text-muted-foreground">
                    Enter
                  </kbd>
                  <button
                    onClick={handleSubmit}
                    disabled={!inputText.trim() || isSubmitting || !!pendingReview}
                    className={cn(
                      'flex-shrink-0 p-2 rounded-lg transition-colors',
                      isSubmitting
                        ? 'text-accent animate-pulse cursor-wait'
                        : inputText.trim()
                        ? 'text-accent hover:bg-accent/10'
                        : 'text-muted-foreground/40 cursor-not-allowed',
                    )}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                {(isRecording || isVoiceProcessing) && browserCaptionPreview ? (
                  <p className="mt-1.5 text-[10px] text-muted-foreground px-1 italic line-clamp-2">
                    {isVoiceProcessing ? 'Preview (may differ): ' : 'Live caption (approx.): '}
                    {browserCaptionPreview}
                  </p>
                ) : null}
                {pendingReview && (
                  <div className="mt-2">
                    <TranscriptReviewPanel
                      transcript={pendingReview.transcript}
                      rawTranscript={pendingReview.rawTranscript}
                      refined={pendingReview.refined}
                      editedText={editDesktopReviewText}
                      onEditedTextChange={setEditDesktopReviewText}
                      onConfirm={handleConfirmDesktopReview}
                      onDismiss={() => dismissPendingReview()}
                      confirmLabel="Insert into field"
                      className="border-border"
                    />
                  </div>
                )}
                {/* Seed beats prompt for cold-start interests */}
                <SeedBeatsPrompt />
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────── */}
        {!isLoading && !!memoryError && !hasData && (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-dashed border-border bg-card/30 py-20 px-8 text-center"
            >
              <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Could not load your command centre
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Something went wrong fetching your memories. Check your connection and try again.
              </p>
              <button
                onClick={() => refreshMemory()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </motion.div>
          </div>
        )}

        {/* ── EMPTY / COLD START ───────────────────────────────────────── */}
        {showEmpty && (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-8">
            <input {...fileInputProps} />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl border border-border bg-card/30 overflow-hidden"
            >
              {/* Ambient seeded web (decorative, not interactive) */}
              <div className="absolute inset-0 opacity-70 pointer-events-none">
                <MemoryWebVisualization
                  facts={emptySeedFacts}
                  showEmptyState={emptySeedFacts.length === 0}
                />
              </div>

              {/* Overlay content */}
              <div className="relative z-10 py-16 px-8 text-center bg-gradient-to-b from-card/30 via-card/70 to-card/90">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  This is the shape of your world
                </h2>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
                  Voice a few thoughts about your role, company, goals, and challenges,
                  and these ambient nodes become your own living Memory Web - the context
                  every AI you use draws on.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => startRecording()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-semibold shadow-lg shadow-accent/20 hover:bg-accent/90"
                  >
                    <Mic className="h-4 w-4" />
                    Voice a thought
                  </button>
                  <button
                    onClick={triggerImport}
                    disabled={isImporting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    <FileText className="h-4 w-4" />
                    Import markdown
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground/50 mt-4">
                  Tip: press{' '}
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[10px] font-mono">
                    ⌘K
                  </kbd>{' '}
                  anytime to jump or run actions.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </DesktopShell>
    </div>
  );
}
