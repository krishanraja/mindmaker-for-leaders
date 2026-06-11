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
}

export interface IntakeFactMapping {
  /** Only write the fact when this option was selected. Omit = always (chip label or text becomes the value). */
  fromOptionId?: string;
  fact_key: string;
  fact_category: "identity" | "business" | "objective" | "blocker" | "preference";
  fact_label: string;
  /** Fixed value override; defaults to the selected option label or typed text. */
  fact_value?: string;
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
 * - static:        render() only; never persisted server-side, the client
 *                  renders it straight from the preset.
 */
export type ArtifactStrategy =
  | "deterministic"
  | "llm_polish"
  | "skill_pipeline"
  | "scaffold_zip"
  | "llm_plan"
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
