import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Send,
  Edit3,
  Trash2,
  CheckCircle2,
  Brain,
  Zap,
  Download,
  Upload,
  Target,
  User,
  Briefcase,
  AlertTriangle,
  Settings,
  TrendingUp,
  Shield,
  Eye,
  Copy,
  Check,
  Loader2,
  FileText,
  Radio,
  ArrowUpRight,
  Activity,
  AlertCircle,
  RefreshCw,
  Scale,
  ArrowRight,
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
import { buildSeedFacts } from '@/lib/seedFacts';
import { AlertBanner } from '@/components/operator/decision/decision-views';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { Skeleton } from '@/components/ui/skeleton';
import { MemoryWebVisualization } from './MemoryWebVisualization';
import { SeedBeatsPrompt } from '@/components/briefing/SeedBeatsPrompt';
import { BriefingSheet } from '@/components/briefing/BriefingSheet';
import { TranscriptReviewPanel } from '@/components/voice/TranscriptReviewPanel';
import { useTodaysBriefing, useGenerateBriefing } from '@/hooks/useBriefing';
import { useBriefingContext } from '@/contexts/BriefingContext';
import type {
  MemoryWebFact,
  Temperature,
  FactCategory,
  PatternType,
} from '@/types/memory';

const TEMP_PILL_STYLES: Record<Temperature, string> = {
  hot: 'bg-red-500/10 text-red-400',
  warm: 'bg-amber-500/10 text-amber-400',
  cold: 'bg-slate-500/10 text-slate-400',
};

const CATEGORY_CONFIG: Record<FactCategory, { icon: typeof User; label: string; gradient: string; bg: string; dot: string }> = {
  identity: { icon: User, label: 'Identity', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10 text-violet-400', dot: 'bg-violet-400' },
  business: { icon: Briefcase, label: 'Business', gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10 text-blue-400', dot: 'bg-blue-400' },
  objective: { icon: Target, label: 'Goals', gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  blocker: { icon: AlertTriangle, label: 'Challenges', gradient: 'from-red-500 to-orange-600', bg: 'bg-red-500/10 text-red-400', dot: 'bg-red-400' },
  preference: { icon: Settings, label: 'Preferences', gradient: 'from-amber-500 to-yellow-600', bg: 'bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
};

const PATTERN_CONFIG: Record<PatternType, { label: string; color: string }> = {
  strength: { label: 'Strength', color: 'bg-emerald-500/10 text-emerald-400' },
  preference: { label: 'Preference', color: 'bg-blue-500/10 text-blue-400' },
  behavior: { label: 'Behavior', color: 'bg-purple-500/10 text-purple-400' },
  blindspot: { label: 'Blind Spot', color: 'bg-amber-500/10 text-amber-400' },
  anti_preference: { label: 'Avoids', color: 'bg-red-500/10 text-red-400' },
};

function FactCard({
  fact,
  onEdit,
  onDelete,
  onVerify,
}: {
  fact: MemoryWebFact;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onVerify?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = CATEGORY_CONFIG[fact.fact_category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/60 bg-card hover:border-accent/30 transition-colors group cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', config?.dot)} />
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {fact.fact_label}
            </h4>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {fact.verification_status !== 'verified' && (
              <button
                onClick={(e) => { e.stopPropagation(); onVerify?.(fact.id); }}
                className="p-1 rounded hover:bg-secondary text-emerald-500"
                title="Verify"
              >
                <CheckCircle2 className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(fact.id); }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground"
              title="Edit"
            >
              <Edit3 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(fact.id); }}
              className="p-1 rounded hover:bg-secondary text-red-400"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <p className="text-sm text-foreground leading-relaxed line-clamp-3 group-hover:line-clamp-none">
          {fact.fact_value}
        </p>
        <div className="flex items-center flex-wrap gap-1 mt-2">
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium', TEMP_PILL_STYLES[fact.temperature])}>
            {fact.temperature}
          </span>
          {fact.verification_status === 'verified' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-400">
              verified
            </span>
          )}
          <span className="text-[9px] text-muted-foreground/50 ml-auto">
            {Math.round(fact.confidence_score * 100)}%
          </span>
        </div>
        <AnimatePresence>
          {expanded && fact.fact_context && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <p className="pt-2.5 mt-2.5 border-t border-border/60 text-xs text-muted-foreground">
                {fact.fact_context}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

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
    <div className="border-b border-border/60 p-5">
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

function RailCoverage({ stats }: { stats: ReturnType<typeof useMemoryWeb>['stats'] }) {
  const total = stats?.total_facts || 0;
  return (
    <div className="border-b border-border/60 p-5">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Coverage
      </h3>
      <div className="space-y-2">
        {(Object.entries(stats?.category_distribution || {}) as [FactCategory, number][])
          .sort((a, b) => b[1] - a[1])
          .map(([cat, count]) => {
            const config = CATEGORY_CONFIG[cat];
            if (!config) return null;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={cat} className="flex items-center gap-2.5">
                <span className="text-xs text-muted-foreground w-16 truncate">
                  {config.label}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full bg-gradient-to-r', config.gradient)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground/70 w-5 text-right">
                  {count}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* The marquee recurring action: pressure-test a real decision. Elevated out of
   Edge so it reads as a primary, everyday move, grounded in the Memory Web. */
function DecisionCtaCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-left transition-colors hover:bg-primary/10"
    >
      <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <Scale className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Pressure-test a decision</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Break a real call into the claims it rests on, check each against the evidence and your own context.
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-primary/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
    </button>
  );
}

/* ─── Main dashboard ───────────────────────────────────────────── */

export function DesktopMemoryDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    facts,
    patterns,
    stats,
    delta,
    isLoading,
    error: memoryError,
    refresh: refreshMemory,
    editFact,
    deleteFact,
    verifyFact,
    submitInput,
  } = useMemoryWeb();
  const { isExporting, generateExport, copyToClipboard } = useMemoryExport();
  const { briefing: todaysBriefing, loading: briefingLoading, refetch: refetchBriefing } = useTodaysBriefing();
  const { setBriefing, setSheetOpen, playback } = useBriefingContext();
  const { generate, generating, phase } = useGenerateBriefing();
  const hasData = facts.length > 0;
  const { toast } = useToast();

  // Decision Engine: open alerts pull the leader back; the CTA leads with the
  // marquee action.
  const decisionInbox = useDecisionInbox();

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

  const strengthPatterns = patterns.filter((p) => p.pattern_type === 'strength');
  const blindspotPatterns = patterns.filter((p) => p.pattern_type === 'blindspot');
  const otherPatterns = patterns.filter((p) => p.pattern_type !== 'strength' && p.pattern_type !== 'blindspot');

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
      <RailQuickActions
        onQuickExport={handleQuickExport}
        onImport={triggerImport}
        isExporting={isExporting}
        copied={quickExportCopied}
        navigate={navigate}
      />
      <RailCoverage stats={stats} />
      {delta && delta.new_facts > 0 && (
        <div className="p-5">
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
        title="Memory Web"
        actions={
          hasData ? (
            <>
              <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground mr-2 px-3 border-r border-border/60">
                <span>
                  <span className="text-foreground font-semibold">{stats?.total_facts || 0}</span>{' '}
                  facts
                </span>
                <span>
                  <span className="text-foreground font-semibold">{stats?.patterns_count || 0}</span>{' '}
                  patterns
                </span>
                <span>
                  Health{' '}
                  <span className="text-emerald-400 font-semibold">
                    {stats?.health_score || 0}%
                  </span>
                </span>
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
        <div className="space-y-6">
          {/* Decision alerts: a re-verified call whose evidence shifted pulls
              the leader back. */}
          {decisionInbox.alerts.length > 0 && (
            <AlertBanner
              alerts={decisionInbox.alerts}
              onReRun={() => navigate('/decision')}
              onDismiss={(a) => decisionInbox.acknowledge(a.id)}
            />
          )}

          {/* Marquee action, shown once the leader has context to ground it. */}
          {hasData && <DecisionCtaCard onClick={() => navigate('/decision')} />}

          {/* Input bar - sticky-feeling, primary action */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm hover:border-accent/30 focus-within:border-accent/40 transition-colors">
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
                placeholder={
                  hasData
                    ? 'Type a thought, paste a note, or drop a markdown file...'
                    : 'Tell me about your role, company, and goals - or drop a .md file...'
                }
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
              <p className="text-[10px] text-muted-foreground px-1 italic line-clamp-2">
                {isVoiceProcessing ? 'Preview (may differ): ' : 'Live caption (approx.): '}
                {browserCaptionPreview}
              </p>
            ) : null}
            {pendingReview && (
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
            )}
          </div>

          {/* Seed beats prompt for cold-start interests */}
          {hasData && <SeedBeatsPrompt />}

          {isLoading && (
            // Content-shaped skeleton (hero canvas + fact cards) so the 3-6s
            // first load reads as "your memory is arriving", not a blank spinner.
            <div className="space-y-4" aria-busy="true" aria-label="Loading your memory">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
          )}

          {!isLoading && hasData && (
            <>
              {/* Memory Web - hero canvas */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden shadow-sm"
              >
                <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Brain className="h-4 w-4 text-accent" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Memory Web
                    </h3>
                    <span className="text-[10px] text-muted-foreground/60 ml-2">
                      {facts.length} nodes - click to explore
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(Object.keys(CATEGORY_CONFIG) as FactCategory[]).map((cat) => {
                      const c = CATEGORY_CONFIG[cat];
                      const count = stats?.category_distribution?.[cat] || 0;
                      if (count === 0) return null;
                      return (
                        <div
                          key={cat}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                          title={`${c.label}: ${count}`}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />
                          <span className="text-muted-foreground/70">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="h-[clamp(420px,_calc(100vh-360px),_640px)] relative">
                  <MemoryWebVisualization facts={facts} />
                </div>
              </motion.div>

              {/* Patterns - 3 columns */}
              {patterns.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Skills & Patterns
                    </h2>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Strengths */}
                    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
                      <h4 className="text-xs font-semibold text-emerald-400 mb-2.5 flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3" /> Strengths to 10X
                      </h4>
                      <div className="space-y-2">
                        {strengthPatterns.length > 0 ? (
                          strengthPatterns.slice(0, 4).map((p) => (
                            <div key={p.id} className="rounded-md bg-emerald-500/[0.05] border border-emerald-500/10 p-2.5">
                              <p className="text-xs text-foreground leading-relaxed">{p.pattern_text}</p>
                              <span className="text-[10px] text-emerald-400 mt-1 block">
                                {Math.round(p.confidence * 100)}% confidence
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground/50 py-3 text-center">
                            Share more wins to discover strengths
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Blind Spots */}
                    <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-4">
                      <h4 className="text-xs font-semibold text-amber-400 mb-2.5 flex items-center gap-1.5">
                        <Shield className="h-3 w-3" /> Blind Spots
                      </h4>
                      <div className="space-y-2">
                        {blindspotPatterns.length > 0 ? (
                          blindspotPatterns.slice(0, 4).map((p) => (
                            <div key={p.id} className="rounded-md bg-amber-500/[0.05] border border-amber-500/10 p-2.5">
                              <p className="text-xs text-foreground leading-relaxed">{p.pattern_text}</p>
                              <span className="text-[10px] text-amber-400 mt-1 block">
                                {Math.round(p.confidence * 100)}% confidence
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground/50 py-3 text-center">
                            Narrate more to uncover blind spots
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Behaviors */}
                    <div className="rounded-xl border border-purple-500/15 bg-purple-500/[0.03] p-4">
                      <h4 className="text-xs font-semibold text-purple-400 mb-2.5 flex items-center gap-1.5">
                        <Eye className="h-3 w-3" /> Behaviors
                      </h4>
                      <div className="space-y-2">
                        {otherPatterns.length > 0 ? (
                          otherPatterns.slice(0, 4).map((p) => {
                            const config = PATTERN_CONFIG[p.pattern_type] || PATTERN_CONFIG.behavior;
                            return (
                              <div key={p.id} className="rounded-md bg-purple-500/[0.05] border border-purple-500/10 p-2.5">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-semibold', config.color)}>
                                    {config.label}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground leading-relaxed">{p.pattern_text}</p>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground/50 py-3 text-center">
                            More narration reveals patterns
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Facts grid - denser, 4 cols */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Facts
                    </h2>
                    <span className="text-[10px] text-muted-foreground/60">
                      {facts.length} total
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/memory')}
                    className="text-[11px] text-accent hover:underline"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5">
                  {facts.slice(0, 24).map((fact) => (
                    <FactCard
                      key={fact.id}
                      fact={fact}
                      onEdit={editFact}
                      onDelete={deleteFact}
                      onVerify={verifyFact}
                    />
                  ))}
                </div>
              </motion.div>
            </>
          )}

          {/* Error state - shown only when query failed and there is no cached data */}
          {!isLoading && !!memoryError && !hasData && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-dashed border-border bg-card/30 py-20 px-8 text-center"
            >
              <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Could not load your Memory Web
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
          )}

          {/* Empty state - the web is never bare: ambient industry seeds bloom
              behind the call to action so the canvas reads as alive. */}
          {showEmpty && (
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
                <div className="max-w-md mx-auto mt-6">
                  <DecisionCtaCard onClick={() => navigate('/decision')} />
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
          )}
        </div>
      </DesktopShell>

      <BriefingSheet />
    </div>
  );
}
