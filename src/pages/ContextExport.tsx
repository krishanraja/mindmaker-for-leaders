/**
 * ContextExport Page - Multi-step wizard
 * Step 1: "What do you need?" - voice-led workflow capture or preset
 * Step 2: "Where will you use it?" - pick AI platform (presets only)
 * Step 3: "Your export is ready" - copy/download + platform-specific guide
 *
 * The voice-led entry opens SkillCaptureSheet (which owns its own voice
 * capture). On submit, the skill triage decides the artifact:
 *   - skill_success → SkillPreviewSheet with downloadable ZIP
 *   - any other outcome → fall back to generate-custom-export and surface
 *     the result as a one-off markdown context blob in Step 3
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Download,
  FileText,
  MessageSquare,
  Code2,
  Terminal,
  Sparkles,
  Bot,
  Users,
  Target,
  Mail,
  TrendingUp,
  PenTool,
  Layers,
  GitBranch,
  Compass,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  X,
  ArrowLeft,
  ArrowRight,
  Mic,
  Lock,
  ChevronDown,
  ChevronUp,
  Settings,
  User,
  Clipboard,
  FolderOpen,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FF } from '@/lib/flags';
import { useDevice } from '@/hooks/useDevice';
import { useAuth } from '@/hooks/useAuth';
import { useMemoryExport } from '@/hooks/useMemoryExport';
import { useExportRecommendations } from '@/hooks/useExportRecommendations';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { Coachmark } from '@/components/onboarding/Coachmark';
import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_GUIDES } from '@/lib/platform-guides';
import { ModelRecommendationCard } from '@/components/export/ModelRecommendationCard';
import { BroadcastBar } from '@/components/export/BroadcastBar';
import { SkillCaptureSheet } from '@/components/edge/SkillCaptureSheet';
import { SkillPreviewSheet } from '@/components/edge/SkillPreviewSheet';
import { useSkillExport } from '@/hooks/useSkillExport';
import type { ExportFormat, ExportUseCase } from '@/types/memory';
import type { ExportRecommendation } from '@/types/edge';
import { isSkillSuccess, type SkillSeed } from '@/types/skill';

// Icon lookup for dynamic recommendation icons
const ICON_MAP: Record<string, typeof Bot> = {
  PenTool,
  Layers,
  GitBranch,
  Compass,
  BookOpen,
  Users,
  TrendingUp,
  Target,
  Settings,
  User,
  Clipboard,
  FolderOpen,
  FileText,
  Check,
  Download,
  MessageSquare,
};

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  icon: typeof Bot;
  description: string;
}[] = [
  { value: 'chatgpt', label: 'ChatGPT', icon: Bot, description: 'Custom Instructions' },
  { value: 'claude', label: 'Claude', icon: Sparkles, description: 'Conversation context' },
  { value: 'gemini', label: 'Gemini', icon: MessageSquare, description: 'Chat context' },
  { value: 'cursor', label: 'Cursor', icon: Code2, description: '.cursorrules file' },
  { value: 'claude-code', label: 'Claude Code', icon: Terminal, description: 'CLAUDE.md file' },
  { value: 'markdown', label: 'Raw Markdown', icon: FileText, description: 'Universal format' },
];

const USE_CASE_OPTIONS: {
  value: ExportUseCase;
  label: string;
  icon: typeof Target;
  description: string;
}[] = [
  { value: 'general', label: 'General Advisor', icon: Bot, description: 'All-purpose context for any AI conversation' },
  { value: 'meeting', label: 'Meeting Prep', icon: Users, description: 'Context optimized for preparing for meetings' },
  { value: 'decision', label: 'Decision Support', icon: Target, description: 'Focus on goals, blockers, and decision history' },
  { value: 'code', label: 'Code Review', icon: Code2, description: 'Technical preferences and project context' },
  { value: 'email', label: 'Email Drafting', icon: Mail, description: 'Communication style and relationship context' },
  { value: 'strategy', label: 'Strategic Planning', icon: TrendingUp, description: 'Business context, objectives, and patterns' },
];

type WizardStep = 1 | 2 | 3;

const stepSlide = {
  initial: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -80 : 80, opacity: 0 }),
};

export default function ContextExport() {
  const { isMobile } = useDevice();
  const {
    exportResult,
    isExporting: isGenerating,
    generateExport,
    generateCustomExport,
    customTitle,
  } = useMemoryExport();
  const { recommendations, hasRecommendations } = useExportRecommendations();
  const { hasAccess: isPaidUser, subscribe } = useEdgeSubscription();
  const { userId, email } = useAuth();
  const skillExport = useSkillExport();

  const location = useLocation();
  const navigate = useNavigate();

  const [skillCaptureOpen, setSkillCaptureOpen] = useState(false);
  const [skillPreviewOpen, setSkillPreviewOpen] = useState(false);
  const [skillSeed, setSkillSeed] = useState<SkillSeed | null>(null);

  // Entry points (Edge AutomatePainCard, Memory blocker button, Briefing
  // decision_trigger button) navigate to /context with location.state.seed.
  // We consume the seed once, open the capture sheet pre-anchored, and clear
  // the route state so a refresh doesn't replay it.
  useEffect(() => {
    const state = location.state as
      | { seed?: SkillSeed; openSkillBuilder?: boolean }
      | null;
    if (state?.seed && state.seed.text) {
      setSkillSeed(state.seed);
      skillExport.reset();
      setSkillCaptureOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    } else if (state?.openSkillBuilder) {
      // No-seed entry: open the capture sheet so the leader can voice a fresh
      // pain. The sheet renders its own pain-picker / examples row.
      setSkillSeed(null);
      skillExport.reset();
      setSkillCaptureOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
    // Intentional: only run on first relevant state change. skillExport.reset
    // and setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const [step, setStep] = useState<WizardStep>(1);
  const [direction, setDirection] = useState(1);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<ExportUseCase | null>(null);
  // isCustomMode now indicates "voice-led context fallback": the user spoke a
  // workflow, triage said it isn't a skill, so we routed it through
  // generate-custom-export and landed on Step 3 with a markdown blob.
  const [isCustomMode, setIsCustomMode] = useState(false);
  // When voice-led capture falls back to context blob, this holds the triage
  // reasoning so we can show the user WHY their voice clip didn't become a
  // skill (e.g. "This is more of a one-off task than a repeatable workflow").
  const [triageBanner, setTriageBanner] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'positive' | 'negative' | null>(null);
  const [showRawContent, setShowRawContent] = useState(false);

  const goToStep = useCallback((target: WizardStep) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  }, [step]);

  const handleUseCaseSelect = useCallback((useCase: ExportUseCase) => {
    setSelectedUseCase(useCase);
    setIsCustomMode(false);
    setTriageBanner(null);
    goToStep(2);
  }, [goToStep]);

  const handleFormatSelect = useCallback((format: ExportFormat) => {
    setSelectedFormat(format);
    if (selectedUseCase) {
      generateExport(format, selectedUseCase);
    }
    goToStep(3);
  }, [selectedUseCase, generateExport, goToStep]);

  const handleCopy = useCallback(async () => {
    if (!exportResult?.content) return;
    try {
      await navigator.clipboard.writeText(exportResult.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => {
        setFeedbackSubmitted(null);
        setShowFeedback(true);
      }, 2200);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  }, [exportResult?.content]);

  const handleDownload = useCallback(() => {
    if (!exportResult || !selectedFormat) return;
    // Per-target artefacts: each file has its own filename + MIME. ChatGPT
    // produces Instructions + Knowledge; Gemini produces system-instruction +
    // context; others produce a single file with the tool-native filename
    // (CLAUDE.md, .cursorrules, etc.).
    const artefacts = exportResult.artefacts?.length
      ? exportResult.artefacts
      : [{
          filename: exportResult.primary_filename || PLATFORM_GUIDES[selectedFormat]?.filename || 'my-ai-context.md',
          mime: exportResult.primary_mime || 'text/markdown',
          kind: 'universal',
          content: exportResult.content,
        }];

    for (const art of artefacts) {
      const blob = new Blob([art.content], { type: art.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = art.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    setTimeout(() => {
      setFeedbackSubmitted(null);
      setShowFeedback(true);
    }, 500);
  }, [exportResult, selectedFormat]);

  const submitExportFeedback = useCallback(async (rating: 'positive' | 'negative') => {
    setFeedbackSubmitted(rating);
    try {
      // 'feedback' table isn't in the generated Database types yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('feedback' as any).insert({
        user_id: userId,
        user_email: email,
        feedback_text: JSON.stringify({
          type: 'export_rating',
          export_target: selectedFormat,
          use_case: isCustomMode ? 'voice_context' : selectedUseCase,
          rating,
        }),
        page_context: 'context-export-wizard',
        user_agent: navigator.userAgent,
      });
    } catch {
      // Non-blocking
    }
    setTimeout(() => setShowFeedback(false), 1800);
  }, [userId, email, selectedFormat, selectedUseCase, isCustomMode]);

  const handleOpenSkillCapture = useCallback(() => {
    skillExport.reset();
    setSkillSeed(null);
    setSkillCaptureOpen(true);
  }, [skillExport]);

  const handleSkillCaptureSubmit = useCallback(async (transcript: string, seed?: SkillSeed | null) => {
    const response = await skillExport.generateSkill(transcript, { seed: seed ?? null });
    if (!response) return;

    if (isSkillSuccess(response)) {
      setSkillCaptureOpen(false);
      setSkillPreviewOpen(true);
      return;
    }

    // Triage rejected the skill - the voice clip is a one-off task, a
    // preference, or a memory fact rather than a repeatable workflow. Rescue
    // the transcript by routing it through generate-custom-export and landing
    // the user on Step 3 with a markdown context blob they can paste anywhere.
    const routingPrefix: Record<string, string> = {
      custom_instruction: "This is more of a universal preference than a repeatable workflow - here's a markdown context blob you can paste into any AI's custom instructions.",
      memory_fact: "This reads as context about you, not a workflow - here's a markdown blob you can paste into any AI to brief it on you.",
      saved_style: "This sounds like a tone or style preference - here's a markdown blob you can paste into any AI to anchor its voice.",
    };
    const prefix = routingPrefix[response.triage.result] || "This isn't a repeatable workflow - here's a markdown context blob you can paste into any AI.";
    const reasoning = response.triage.reasoning ? ` ${response.triage.reasoning}` : '';
    setTriageBanner(`${prefix}${reasoning}`);
    setIsCustomMode(true);
    setSelectedUseCase(null);
    setSelectedFormat('markdown');
    setSkillCaptureOpen(false);
    setDirection(1);
    setStep(3);
    await generateCustomExport(transcript, 'markdown');
  }, [skillExport, generateCustomExport]);

  const handleStartOver = useCallback(() => {
    setStep(1);
    setDirection(-1);
    setSelectedFormat(null);
    setSelectedUseCase(null);
    setIsCustomMode(false);
    setTriageBanner(null);
    setShowRawContent(false);
    setShowFeedback(false);
    setFeedbackSubmitted(null);
  }, []);

  // ─── Step 1: What do you need? ──────────────────────────────────
  const step1Content = (
    <motion.div
      key="step1"
      custom={direction}
      variants={stepSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="space-y-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">What do you need?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a preset or describe your task with voice
        </p>
      </div>

      {/* Voice-led capture - the single entry point for both skill builder
          and one-off context blobs. Opens SkillCaptureSheet (which owns voice
          capture); on submit, triage decides whether the artifact is a
          downloadable skill ZIP or a markdown context blob shown in Step 3. */}
      <div className={cn(
        'rounded-xl border p-4',
        isPaidUser ? 'border-accent/20 bg-accent/5' : 'border-border bg-card',
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
            isPaidUser ? 'bg-accent/10' : 'bg-secondary',
          )}>
            {isPaidUser ? (
              <Zap className="h-5 w-5 text-accent" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Describe a workflow</span>
              {!isPaidUser && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">
                  Pro
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Voice or type a task. We'll turn recurring workflows into a triggered Claude skill, and one-off tasks into a markdown context blob.
            </p>

            {isPaidUser ? (
              <button
                onClick={handleOpenSkillCapture}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-accent bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                <Mic className="h-4 w-4" />
                Start with voice
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={async () => {
                  const url = await subscribe();
                  if (url) window.location.href = url;
                }}
                className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recommended presets */}
      {hasRecommendations && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Recommended for You</h3>
          </div>
          <div className="flex flex-col gap-2">
            {recommendations.map((rec: ExportRecommendation, i: number) => {
              const Icon = ICON_MAP[rec.iconName] || Bot;
              return (
                <motion.button
                  key={rec.useCase}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleUseCaseSelect(rec.useCase)}
                  className="flex items-start gap-3 p-3 rounded-lg text-left transition-all border border-border bg-card hover:border-accent/30"
                >
                  <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{rec.label}</span>
                      <span className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                        rec.badgeVariant === 'teal'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      )}>
                        {rec.badgeText}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{rec.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* All presets */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2.5">
          {hasRecommendations ? 'All Use Cases' : 'Use Case'}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {USE_CASE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handleUseCaseSelect(option.value)}
                className="flex flex-col items-start gap-1.5 p-3 rounded-lg text-left transition-all border border-border bg-card hover:border-accent/30"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  // ─── Step 2: Where will you use it? ─────────────────────────────
  const step2Content = (
    <motion.div
      key="step2"
      custom={direction}
      variants={stepSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="space-y-5"
    >
      <div>
        <button
          onClick={() => goToStep(1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h2 className="text-lg font-semibold text-foreground">Where will you use it?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick the AI tool you want to use this with
        </p>
      </div>

      <div className="grid gap-2">
        {FORMAT_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => handleFormatSelect(option.value)}
              className="flex items-center gap-3 p-4 rounded-lg text-left transition-all border border-border bg-card hover:border-accent/30"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  // ─── Step 3: Your export is ready ───────────────────────────────
  const guide = selectedFormat ? PLATFORM_GUIDES[selectedFormat] : null;
  const useCaseLabel = isCustomMode
    ? (customTitle || 'Custom Task')
    : USE_CASE_OPTIONS.find((o) => o.value === selectedUseCase)?.label || 'General';

  const step3Content = (
    <motion.div
      key="step3"
      custom={direction}
      variants={stepSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="space-y-5"
    >
      <div>
        <button
          onClick={() => goToStep(isCustomMode ? 1 : 2)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {isGenerating ? 'Generating...' : 'Your export is ready'}
        </h2>
        {exportResult && !isGenerating && (
          <p className="text-sm text-muted-foreground mt-1">
            {exportResult.token_count.toLocaleString()} tokens for {guide?.label || 'export'}
          </p>
        )}
      </div>

      {/* Triage banner - surfaces only on voice-led runs that triage redirected
          away from the skill flow. Explains WHY this came back as a one-off
          context blob rather than a triggered skill. */}
      {triageBanner && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2.5"
        >
          <Sparkles className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/80 leading-relaxed">{triageBanner}</p>
        </motion.div>
      )}

      {/* Loading state */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            {isCustomMode ? 'Building your context blob...' : 'Building your context...'}
          </p>
        </div>
      )}

      {/* Result */}
      {exportResult && !isGenerating && (
        <>
          {/* Summary card */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Check className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{useCaseLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {exportResult.token_count.toLocaleString()} tokens - formatted for {guide?.label}
                </p>
                {exportResult.artefacts && exportResult.artefacts.length > 1 && (
                  <p className="text-xs text-accent mt-1">
                    {exportResult.artefacts.length} files - {exportResult.artefacts.map(a => a.filename).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* AI model recommendation based on live benchmarks */}
          <ModelRecommendationCard
            useCase={selectedUseCase}
            platform={selectedFormat}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                'bg-accent text-white hover:bg-accent/90'
              )}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all border border-border bg-card text-foreground hover:bg-secondary"
            >
              <Download className="h-4 w-4" />
              {!isMobile && 'Download'}
            </button>
          </div>

          {/* Cross-app broadcast bar - flag gated, additive, renders nothing when off */}
          {FF.contextBroadcast() && (
            <BroadcastBar content={exportResult.content} />
          )}

          {/* Platform-specific guide */}
          {guide && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <h3 className="text-sm font-medium text-foreground">How to set it up</h3>
              </div>
              <div className="p-4 space-y-3">
                {guide.steps.map((s) => {
                  const StepIcon = ICON_MAP[s.iconName] || Check;
                  return (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-accent">{s.step}</span>
                      </div>
                      <div className="flex items-start gap-2 flex-1">
                        <StepIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground/80 leading-relaxed">{s.text}</p>
                      </div>
                    </div>
                  );
                })}
                {isMobile && guide.mobileNote && (
                  <div className="mt-3 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                    <p className="text-xs text-amber-700 leading-relaxed">{guide.mobileNote}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expandable raw content */}
          <button
            onClick={() => setShowRawContent(!showRawContent)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {showRawContent ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showRawContent ? 'Hide raw content' : 'View raw content'}
          </button>
          {showRawContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div className={cn(
                'p-4 overflow-y-auto scrollbar-hide',
                isMobile ? 'max-h-[300px]' : 'max-h-[500px]'
              )}>
                <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
                  {exportResult.content}
                </pre>
              </div>
            </motion.div>
          )}

          {/* Feedback */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
              >
                {feedbackSubmitted ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground text-center"
                  >
                    Thanks for the feedback!
                  </motion.p>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-foreground/80">Was this useful?</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => submitExportFeedback('positive')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Yes
                      </button>
                      <button
                        onClick={() => submitExportFeedback('negative')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        Not really
                      </button>
                      <button
                        onClick={() => setShowFeedback(false)}
                        className="ml-1 p-1 rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/50 transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start over */}
          <div className="pt-2">
            <button
              onClick={handleStartOver}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Start over
            </button>
          </div>
        </>
      )}
    </motion.div>
  );

  // ─── Wizard content ─────────────────────────────────────────────
  const wizardContent = (
    <AnimatePresence mode="wait" custom={direction}>
      {step === 1 && step1Content}
      {step === 2 && step2Content}
      {step === 3 && step3Content}
    </AnimatePresence>
  );

  // ─── Skill Builder sheets (rendered at page root) ───────────────
  const skillSheets = (
    <>
      <SkillCaptureSheet
        isOpen={skillCaptureOpen}
        onClose={() => setSkillCaptureOpen(false)}
        onSubmit={handleSkillCaptureSubmit}
        isGenerating={skillExport.isGenerating}
        generationError={skillExport.error}
        initialSeed={skillSeed}
      />
      {skillExport.skillData && skillExport.qualityGate && skillExport.zipFilename && (
        <SkillPreviewSheet
          isOpen={skillPreviewOpen}
          onClose={() => setSkillPreviewOpen(false)}
          skill={skillExport.skillData}
          qualityGate={skillExport.qualityGate}
          onDownload={skillExport.downloadZip}
          zipFilename={skillExport.zipFilename}
        />
      )}
    </>
  );

  // ─── Desktop layout ─────────────────────────────────────────────
  if (!isMobile) {
    const stepLabels = ['What you need', 'Where it goes', 'Your export'];
    const desktopRail = (
      <div className="flex flex-col">
        {/* Step progress in rail */}
        <div className="border-b border-border/60 p-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Wizard
          </h3>
          <ol className="space-y-1">
            {stepLabels.map((label, i) => {
              const s = (i + 1) as WizardStep;
              const isActive = s === step;
              const isDone = s < step;
              // Voice-led runs skip Step 2 (format picker) - render it as
              // greyed-out "Skipped" rather than a clickable backstop.
              const isSkipped = isCustomMode && s === 2;
              const isClickable = !isSkipped && s < step;
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => (isClickable ? goToStep(s) : undefined)}
                    disabled={!isClickable && !isActive}
                    className={cn(
                      'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm text-left transition-colors',
                      isActive
                        ? 'bg-accent/15 text-accent'
                        : isSkipped
                        ? 'text-muted-foreground/50 cursor-not-allowed line-through'
                        : isDone
                        ? 'text-foreground hover:bg-secondary/60'
                        : 'text-muted-foreground/60 cursor-not-allowed',
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : isSkipped
                          ? 'bg-secondary/50 text-muted-foreground/50'
                          : isDone
                          ? 'bg-accent/30 text-accent'
                          : 'bg-secondary text-muted-foreground/60',
                      )}
                    >
                      {isSkipped ? '-' : isDone ? <Check className="h-3 w-3" /> : s}
                    </span>
                    <span className="flex-1">{label}{isSkipped ? ' (skipped)' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Context summary based on current state */}
        <div className="border-b border-border/60 p-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Current selection
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <dt className="text-muted-foreground">Mode</dt>
              <dd className="text-foreground font-medium text-right">
                {isCustomMode ? 'Voice' : selectedUseCase ? 'Preset' : '-'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-muted-foreground">Use case</dt>
              <dd className="text-foreground font-medium text-right">
                {isCustomMode
                  ? customTitle || 'Voice capture'
                  : USE_CASE_OPTIONS.find((o) => o.value === selectedUseCase)?.label || '-'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-muted-foreground">Target</dt>
              <dd className="text-foreground font-medium text-right">
                {FORMAT_OPTIONS.find((o) => o.value === selectedFormat)?.label || '-'}
              </dd>
            </div>
            {exportResult && (
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted-foreground">Tokens</dt>
                <dd className="text-foreground font-mono font-medium text-right">
                  {exportResult.token_count.toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Tip */}
        <div className="p-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Pro tip
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {step === 1
              ? 'Describe a workflow with voice and we\'ll turn recurring ones into a Claude skill - or pick a preset for one-click context.'
              : step === 2
              ? 'Different tools want different shapes - ChatGPT prefers structured instructions, Cursor wants .cursorrules, Markdown works anywhere.'
              : 'Re-export anytime as your Memory Web grows - the context will get sharper.'}
          </p>
        </div>
      </div>
    );

    return (
      <>
        <DesktopShell
          eyebrow="Export"
          title="Export to AI"
          actions={
            step > 1 ? (
              <button
                onClick={handleStartOver}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Start over
              </button>
            ) : null
          }
          rightRail={desktopRail}
        >
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <p className="text-sm text-muted-foreground">
                Make any AI tool understand you - in one click.
              </p>
            </motion.div>
            <Coachmark
              id="export"
              icon={ArrowRight}
              title="One context, every AI"
              body="Pick a tool (ChatGPT, Claude, Cursor, and more) and CTRL formats your full context for it. Paste it in once, and the AI knows you - no more re-explaining yourself."
              className="mb-4"
            />
            {wizardContent}
          </div>
        </DesktopShell>
        {skillSheets}
      </>
    );
  }

  // ─── Mobile layout ──────────────────────────────────────────────
  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      <AppHeader />

      <div className="flex-shrink-0 px-4 pb-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            <h1 className="text-base font-semibold text-foreground">Export to AI</h1>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => {
              const isSkipped = isCustomMode && s === 2;
              const isClickable = !isSkipped && s < step;
              return (
                <button
                  key={s}
                  onClick={() => isClickable ? goToStep(s as WizardStep) : undefined}
                  disabled={!isClickable && s !== step}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    s === step
                      ? 'w-8 bg-accent'
                      : isSkipped
                      ? 'w-2 bg-border/50 cursor-not-allowed'
                      : isClickable
                      ? 'w-2 bg-accent/40 cursor-pointer hover:bg-accent/60'
                      : 'w-2 bg-border',
                  )}
                  aria-label={`Step ${s}${isSkipped ? ' (skipped)' : ''}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-20">
        <Coachmark
          id="export"
          icon={ArrowRight}
          title="One context, every AI"
          body="Pick a tool (ChatGPT, Claude, Cursor, and more) and CTRL formats your full context for it. Paste it in once, and the AI knows you - no more re-explaining yourself."
          className="mb-3 mt-1"
        />
        {wizardContent}
      </main>

      <BottomNav />
      {skillSheets}
    </div>
  );
}
