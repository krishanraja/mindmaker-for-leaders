/**
 * Kit Engine preset contract.
 *
 * A preset is everything class-specific: intake questions, artifact manifest,
 * templates, prompts, scoring, and email copy. The engine (tables, edge
 * functions, UI) renders purely from this contract and never branches on
 * class. Adding a class means adding a preset folder and a registry entry.
 *
 * IMPORTANT: these modules are imported by BOTH the Deno edge runtime and the
 * Vite client bundle (same pattern as _shared/edge-pricing.ts consumed by
 * src/constants/billing.ts). Keep everything in this folder plain TypeScript:
 * no Deno globals, no Node APIs, no imports outside this folder.
 */

/** The AI tool the student lives in. Keys align with memory-context-builder formats. */
export type KitTool =
  | "claude"
  | "chatgpt"
  | "claude-code"
  | "cursor"
  | "gemini"
  | "lovable"
  | "none";

export interface IntakeOption {
  id: string;
  label: string;
  description?: string;
  /** For the tool question: which KitTool this option maps to. */
  tool?: KitTool;
  /**
   * Pathway fork only: which pathway this option selects (see
   * IntakeQuestion.pathwayFork). The org-chart preset's first step offers
   * "for myself" (self) and "for my business" (biz); every later question's
   * showIf / option set keys off the chosen pathway. Ignored by the existing
   * linear presets, which declare no pathwayFork question.
   */
  pathway?: KitPathway;
}

/**
 * The two intake pathways the org-chart preset forks into. 'self' draws a
 * solo operating model (the hats you wear); 'biz' draws a team org chart (the
 * functions the business runs). Linear presets never set a pathway and are
 * unaffected.
 */
export type KitPathway = "self" | "biz";

/**
 * Which slot of the live org chart an answer feeds. The intake UI reads this
 * to assemble the preview chart as the student answers, and the compose LLM
 * reads the same answers to author the real roles/tags off the truth:
 * - "boxes":    the multi-select whose chosen labels become the chart boxes
 *               (functions for biz, hats for self).
 * - "startBox": the single-select naming the biggest time-sink; that box gets
 *               the START-HERE flag and is the first agent to stand up.
 * - "tags":     the guardrails multi-select that shapes which boxes read
 *               agent-led / assisted / you-only. The preview uses a
 *               deterministic stub; the artifact tags come from compose.
 */
export type ChartFeed = "boxes" | "startBox" | "tags";

export interface IntakeFactMapping {
  /** Only write the fact when this option was selected. Omit = always (chip label or text becomes the value). */
  fromOptionId?: string;
  fact_key: string;
  fact_category: "identity" | "business" | "objective" | "blocker" | "preference";
  fact_label: string;
  /** Fixed value override; defaults to the selected option label or typed text. */
  fact_value?: string;
}

/**
 * Conditional visibility for a question. Every field is ANDed; an empty/absent
 * showIf means "always show". Linear presets omit showIf entirely, so they
 * keep rendering every question in order.
 */
export interface IntakeShowIf {
  /** Show only on this pathway (the org-chart fork's chosen branch). */
  pathway?: KitPathway;
  /** Show only when this prior question has any answer. */
  answeredQuestionId?: string;
}

/**
 * Resolve a question's options from prior answers instead of a fixed list.
 * Used by the org-chart cascade so each step stays coherent with the last:
 * e.g. the time-sink single-select is drawn from the boxes the student just
 * picked; the grind single-select is drawn from a curated sector x function
 * matrix keyed by an earlier answer. Deterministic: no LLM at intake time.
 */
export interface AdaptiveOptions {
  /**
   * Build this question's options from the SELECTED options of another
   * question (by id). Each selected option becomes an option here, carrying
   * its label through. Example: time-sink options = the chosen boxes.
   */
  fromQuestionId?: string;
  /**
   * Build options from a curated deterministic matrix on the preset, keyed by
   * a prior answer's selected option label (or the pathway). The named matrix
   * lives on KitPreset.optionMatrices. Example: the grind options for a chosen
   * function, per the sector x function matrix. Never a live LLM call.
   */
  matrixKey?: string;
  /** Which prior question supplies the matrix lookup key (its selected label). */
  matrixFromQuestionId?: string;
  /** Fallback options when the matrix has no row for the resolved key. */
  fallback?: IntakeOption[];
}

export interface IntakeQuestion {
  id: string;
  /** chips = single select; chips_multi = multi select; voice_text = voice-first free text. */
  type: "chips" | "chips_multi" | "voice_text";
  prompt: string;
  helper?: string;
  options?: IntakeOption[];
  /** Example chips shown under a voice_text question (tap to prefill). */
  examples?: string[];
  /** Optional one-line text field attached to a chips question. */
  optionalText?: { prompt: string; placeholder: string };
  /** Deterministic Memory Web writes for this answer (source_type 'kit', verified). */
  factMappings?: IntakeFactMapping[];

  /* ---- org-chart preset extensions (all optional, additive) ------------- *
   * The three existing presets (vibe-coding, autonomous-business,           *
   * memory-identity) set none of these, so KitIntake renders them as the    *
   * plain linear flow. KitIntake switches to the forked, adaptive,          *
   * chart-building flow only when the preset declares a pathwayFork.        */

  /**
   * Marks the first step as the pathway fork. Its options each carry a
   * `pathway`; the chosen one becomes the active pathway and every later
   * question's showIf / adaptive options key off it. At most one question per
   * preset sets this. Presence of a pathwayFork question is how KitIntake
   * decides fork-mode vs linear-mode.
   */
  pathwayFork?: boolean;

  /**
   * Optional pathway-specific prompt/helper overrides. When the active
   * pathway has an entry here, KitIntake shows the override instead of the
   * base prompt/helper. Lets one question id read differently for self vs biz
   * (e.g. "which functions does your business run?" vs "which hats do you
   * wear?") without duplicating the question.
   */
  pathwayCopy?: Partial<Record<KitPathway, { prompt?: string; helper?: string }>>;

  /** Eyebrow label (small uppercase Gobold tag) above the question. */
  eyebrow?: string;

  /**
   * Pathway-specific option sets. When present and a pathway is active, the
   * intake shows the active pathway's set instead of `options`. Lets one
   * question id offer business functions on the biz branch and solo hats on
   * the self branch without two question ids (and without the intake showing
   * cross-pathway options the compose layer would drop). When absent, `options`
   * is used as-is. Linear presets omit it.
   */
  pathwayOptions?: Partial<Record<KitPathway, IntakeOption[]>>;

  /** Show this question only when the condition holds (see IntakeShowIf). */
  showIf?: IntakeShowIf;

  /** Resolve options from prior answers / a curated matrix (see AdaptiveOptions). */
  adaptiveOptions?: AdaptiveOptions;

  /**
   * A free-text identity field attached to the FIRST question (the business /
   * person name), surfaced as a labelled input above the options. Its value
   * becomes the chart's leadership node label. Distinct from optionalText,
   * which sits below the options and is genuinely optional.
   */
  nameField?: { label: string; placeholder: string };

  /** Which live-chart slot this answer feeds (see ChartFeed). */
  chartFeed?: ChartFeed;
}

/** One student answer, keyed by question id. */
export interface IntakeAnswer {
  optionId?: string;
  optionIds?: string[];
  text?: string;
}

export type IntakeAnswers = Record<string, IntakeAnswer>;

export interface ArtifactBuildContext {
  intake: IntakeAnswers;
  tool: KitTool;
  /** Markdown context from buildMemoryContext; empty string for a cold start. */
  memoryContext: string;
  /** Student feedback when regenerating. */
  feedback?: string;
  /** Output of preset.score(intake), if the preset defines scoring. */
  scores?: unknown;
  /** Name of the generated first skill, available to later artifacts (plan, map). */
  firstSkillName?: string;
  /** ISO date of redemption, for plan date math rendered server-side. */
  redeemedAt?: string;
}

/**
 * How the orchestrator produces an artifact:
 * - deterministic: render() returns final markdown. Zero LLM.
 * - llm_polish:    buildPrompt() feeds ONE batched cheap-model call across all
 *                  polish artifacts; render() (required) is the no-LLM fallback.
 * - skill_pipeline: buildSeed() synthesizes the transcript for the existing
 *                  generate-skill-export prompt/quality-gate/zip modules.
 * - scaffold_zip:  renderFiles() returns files packaged into a ZIP. Zero LLM.
 * - llm_plan:      buildPrompt() feeds a mid-tier call returning the 7-day plan
 *                  JSON ({ days: [{ day, title, action, minutes }] }).
 * - llm_chart:     buildPrompt() feeds one structured-JSON call returning the
 *                  org-chart JSON (OrgChartView contract). The result is stored
 *                  as a json artifact flagged metadata.render = "orgchart" so
 *                  KitHome renders OrgChartView instead of raw JSON. render()
 *                  (required) is the deterministic honest fallback.
 * - static:        render() only; never persisted server-side, the client
 *                  renders it straight from the preset.
 */
export type ArtifactStrategy =
  | "deterministic"
  | "llm_polish"
  | "skill_pipeline"
  | "scaffold_zip"
  | "llm_plan"
  | "llm_chart"
  | "static";

export interface ArtifactFile {
  path: string;
  content: string;
}

export interface ArtifactSpec {
  id: string;
  title: string;
  /** Display + composition order. */
  order: number;
  contentType: "markdown" | "json" | "zip";
  strategy: ArtifactStrategy;
  /** The "what to do with this" line on the artifact card. */
  description: string;
  /** Which part of the kit page this belongs to (preset-defined grouping). */
  part?: string;
  render?: (ctx: ArtifactBuildContext) => string;
  buildPrompt?: (ctx: ArtifactBuildContext) => string;
  renderFiles?: (ctx: ArtifactBuildContext) => ArtifactFile[];
  buildSeed?: (ctx: ArtifactBuildContext) => { transcript: string; nameHint?: string };
}

export interface KitEmailContext {
  kitUrl: string;
  classTitle: string;
  skillName?: string;
  testPrompt?: string;
  toolLabel?: string;
  redeemedAtLabel?: string;
}

export interface KitEmailTemplate {
  subject: (ctx: KitEmailContext) => string;
  html: (ctx: KitEmailContext) => string;
}

export interface KitReadingPage {
  id: string;
  title: string;
  markdown: string;
}

export interface KitPreset {
  /** Stable identifier stored on codes/redemptions/builds. */
  slug: string;
  /** Bumped manually when content changes materially. */
  version: string;
  /** Product name shown on the kit page, e.g. "Vibe Coding Field Kit". */
  title: string;
  /** The class it follows, e.g. "Vibe Coding Lightning Lesson". */
  classTitle: string;
  tagline: string;
  /** Where a dead-code visitor goes to catch the next class. */
  mavenUrl: string;
  /** Code prefixes (e.g. ["VIBE"]) for optimistic branding before redeem resolves. */
  codePrefixes: string[];
  intake: IntakeQuestion[];
  artifacts: ArtifactSpec[];
  /**
   * The context-pull prompt for the compose-wait screen: shown the moment
   * composition starts so the wait becomes the student's first action.
   */
  contextPullPrompt: (tool: KitTool, ctx?: Partial<ArtifactBuildContext>) => string;
  /** Deterministic scoring over intake answers (pure function, no LLM). */
  score?: (intake: IntakeAnswers) => unknown;
  emails: {
    pack: KitEmailTemplate;
    day3: KitEmailTemplate;
    day7: KitEmailTemplate;
  };
  reading?: KitReadingPage[];
  /** Snapshotted onto kit_codes seeds; the DB rows are the runtime truth. */
  passDays: number;
  skillQuota: number;

  /* ---- org-chart preset extensions (optional, additive) ---------------- */

  /**
   * Curated deterministic option matrices for AdaptiveOptions.matrixKey. Keyed
   * first by matrix name, then by the resolved lookup key (a prior answer's
   * selected label or the pathway). Pure data, no LLM: the "grind" question's
   * options for a chosen function live here. Linear presets omit it.
   */
  optionMatrices?: Record<string, Record<string, IntakeOption[]>>;

  /**
   * Label -> { agentRole, agentDesc } lookup the LIVE CHART PREVIEW uses to
   * label boxes as the student answers (a deterministic stub, clearly marked
   * "building" in the UI). The real, honest roles on the final chart artifact
   * come from the compose LLM off the student's actual answers; this map only
   * powers the optimistic in-intake preview so the chart feels alive.
   */
  agentRoles?: Record<string, { agentRole: string; agentDesc: string }>;
}

/** Resolve the KitTool from intake answers (the question with id "tool"). */
export function toolFromIntake(preset: KitPreset, intake: IntakeAnswers): KitTool {
  const q = preset.intake.find((x) => x.id === "tool");
  const picked = intake["tool"]?.optionId;
  const opt = q?.options?.find((o) => o.id === picked);
  return opt?.tool ?? "claude";
}

/** Human label for a tool id, for copy like "Open ChatGPT". */
export const KIT_TOOL_LABELS: Record<KitTool, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  "claude-code": "Claude Code",
  cursor: "Cursor",
  gemini: "Gemini",
  lovable: "Lovable",
  none: "your AI tool",
};
