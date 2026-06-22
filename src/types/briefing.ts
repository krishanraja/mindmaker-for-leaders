/**
 * CTRL Briefing Types
 * Personalised AI news briefing for leaders
 */

export type FrameworkTag = 'signal' | 'noise' | 'decision_trigger' | 'krishs_take' | 'decision_alert';

export type BriefingType =
  | 'default'
  | 'macro_trends'
  | 'vendor_landscape'
  | 'competitive_intel'
  | 'boardroom_prep'
  | 'team_update'
  | 'ai_landscape'
  | 'custom_voice';

export interface BriefingTypeConfig {
  type: BriefingType;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  isProOnly: boolean;
}

export const BRIEFING_TYPES: BriefingTypeConfig[] = [
  {
    type: 'default',
    label: "Daily Brief",
    description: 'Top AI and business news for your world',
    icon: 'Radio',
    isProOnly: false,
  },
  {
    type: 'macro_trends',
    label: 'Macro Trends',
    description: 'Big shifts in AI, markets, regulation',
    icon: 'TrendingUp',
    isProOnly: false,
  },
  {
    type: 'vendor_landscape',
    label: 'Vendor Landscape',
    description: 'Launches, pricing, and vendor moves',
    icon: 'Layers',
    isProOnly: true,
  },
  {
    type: 'competitive_intel',
    label: 'Competitive Intel',
    description: 'What your watchlist is doing now',
    icon: 'Target',
    isProOnly: true,
  },
  {
    type: 'boardroom_prep',
    label: 'Boardroom Prep',
    description: 'Trends and data for exec presentations',
    icon: 'Briefcase',
    isProOnly: true,
  },
  {
    type: 'ai_landscape',
    label: 'AI Model Landscape',
    description: 'Live benchmarks on the models that matter',
    icon: 'BarChart3',
    isProOnly: true,
  },
  {
    type: 'custom_voice',
    label: 'Custom',
    description: 'Describe what you need; we build it',
    icon: 'Mic',
    isProOnly: true,
  },
];

/**
 * An honest, gated magnitude stored on a segment at generation time.
 * `sourced` = the numeric core appears verbatim in the segment's own evidence
 * text. `modelled` = an explicit CTRL estimate, rendered with the `est.` mark so
 * it never reads as measured. Absent/null when no figure passes the honesty gate
 * (the hero then leads with words).
 */
export interface BriefingSegmentMagnitude {
  value: string; // "10x" | "-40%" | "$2M"
  kind: 'sourced' | 'modelled';
}

export interface BriefingSegment {
  headline: string;
  analysis: string;
  framework_tag: FrameworkTag;
  source: string;
  relevance_reason: string;
  // v2 evidence fields. Null/undefined on pre-v2 rows; always populated on
  // schema_version=2 rows.
  lens_item_id?: string | null;
  relevance_score?: number | null;
  matched_profile_fact?: string | null;
  // Stored honest magnitude (sourced or modelled). Null/undefined on pre-magnitude
  // rows and whenever the honesty gate finds no defensible number for the segment.
  magnitude?: BriefingSegmentMagnitude | null;
  // Decision linkage. Populated ONLY on segments that come from a real decision
  // alert/trigger (prependDecisionAlerts stamps these from the open
  // decision_alerts row + its decision_cases). They carry the real
  // decision_case_id and the decision statement so the hero can lead with the
  // actual bet. Absent on every non-decision segment (never invent a link).
  decision_case_id?: string;
  decision_statement?: string;
}

export interface Briefing {
  id: string;
  user_id: string;
  briefing_date: string;
  briefing_type: BriefingType;
  script_text: string | null;
  segments: BriefingSegment[];
  audio_url: string | null;
  audio_duration_seconds: number | null;
  context_snapshot: Record<string, unknown> | null;
  news_sources: Record<string, unknown> | null;
  generation_model: string;
  custom_context: string | null;
  voice_note_url: string | null;
  is_pro_only: boolean;
  created_at: string;
  // 1 = legacy pipeline. 2 = evidence-based lens pipeline.
  schema_version?: number;
  // Background-job pipeline stage (added when generation moved off the request
  // thread). queued|searching|curating|scripting|complete|failed. Legacy rows
  // (generated synchronously, before the background job) have stage = null.
  stage?: BriefingStage | null;
  error_text?: string | null;
  generation_started_at?: string | null;
}

export type BriefingStage =
  | 'queued'
  | 'searching'
  | 'curating'
  | 'scripting'
  | 'complete'
  | 'failed';

/** Stages where the pipeline is still working (the UI shows live progress). */
const ACTIVE_STAGES: ReadonlySet<string> = new Set([
  'queued',
  'searching',
  'curating',
  'scripting',
]);

/**
 * A briefing is "generating" when it has an active stage. Legacy rows (stage
 * null) are never generating - they were written synchronously and complete.
 */
export function isBriefingGenerating(b: Pick<Briefing, 'stage'> | null | undefined): boolean {
  return !!b?.stage && ACTIVE_STAGES.has(b.stage);
}

/**
 * A briefing is "ready to read" when the background job finished
 * (stage = complete) OR it is a legacy synchronous row (stage null) with a
 * script. A failed row is neither generating nor ready.
 */
export function isBriefingReady(
  b: Pick<Briefing, 'stage' | 'script_text'> | null | undefined,
): boolean {
  if (!b) return false;
  if (b.stage === 'complete') return true;
  if (!b.stage) return !!b.script_text; // legacy row
  return false;
}

export interface BriefingFeedback {
  id: string;
  briefing_id: string;
  segment_index: number;
  reaction: 'useful' | 'not_useful' | 'save';
  created_at: string;
  // v2 feedback enrichment. Server accepts nulls for v1 rows.
  lens_item_id?: string | null;
  dwell_ms?: number | null;
  replayed?: boolean;
}

export type BriefingInterestKind = 'beat' | 'entity' | 'exclude';

export type BriefingInterestSource =
  | 'manual'
  | 'seed_accepted'
  | 'feedback_promoted'
  | 'inferred_auto'
  | 'inferred_suggested';

export interface BriefingInterest {
  id: string;
  user_id: string;
  kind: BriefingInterestKind;
  text: string;
  weight: number;
  source: BriefingInterestSource;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Medium-confidence interests inferred from user_memory by
 * `infer-briefing-interests` and waiting for one-tap user acceptance.
 */
export interface SuggestedBriefingInterest {
  id: string;
  user_id: string;
  kind: BriefingInterestKind;
  text: string;
  confidence: number;
  reason: string | null;
  source: 'inferred_suggested';
  accepted_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PlaybackSpeed = 1 | 1.25 | 1.5 | 2;

export interface BriefingPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: PlaybackSpeed;
  currentSegmentIndex: number;
  hasListened: boolean;
}

export const FRAMEWORK_TAG_CONFIG: Record<FrameworkTag, {
  label: string;
  className: string;
}> = {
  signal: {
    label: 'SIGNAL',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  },
  noise: {
    label: 'NOISE',
    className: 'bg-muted text-muted-foreground border-border',
  },
  decision_trigger: {
    label: 'DECISION TRIGGER',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  },
  krishs_take: {
    label: "KRISH'S TAKE",
    className: 'bg-accent/10 text-accent border-accent/30',
  },
  decision_alert: {
    label: 'DECISION ALERT',
    className: 'bg-amber-500/15 text-amber-500 border-amber-500/40',
  },
};
