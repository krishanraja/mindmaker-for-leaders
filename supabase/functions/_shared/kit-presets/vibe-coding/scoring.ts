/**
 * Vibe Coding Field Kit: deterministic scoring and intake derivations.
 *
 * Pure functions only: no LLM calls, no IO, no runtime globals. Every
 * heuristic that reads intake answers lives here so templates, prompts and
 * the preset all derive from one place.
 *
 * Intake is now a forked pick-cascade (no open-ended voice question): the
 * student forks self vs business, names a profile, picks the repetitive AREAS
 * (multi), picks the one to BUILD FIRST (one), picks the specific WORKFLOW from
 * a curated matrix (one), then the steps it INVOLVES (multi). Every derivation
 * below reads those structured answers, never a free-text blob, so the prompts
 * and templates compose from the deterministic cascade.
 */

import type { IntakeAnswers, IntakeOption } from "../types.ts";
import {
  AREA_OPTIONS_BIZ,
  AREA_OPTIONS_SELF,
  INVOLVES_OPTIONS,
  WORKFLOW_FALLBACK,
  WORKFLOW_MATRIX,
} from "./templates.ts";

export type Frequency = "daily" | "weekly" | "adhoc";
export type Judgment = "low" | "high";
export type StakesTier = "full-speed" | "with-review" | "human-led";
export type ExperienceLevel = "never" | "few-prompts" | "shipped";
export type MapStage = "prompting" | "first-builds" | "agents";
export type VibePathway = "self" | "biz";

export interface VibeScore {
  frequency: Frequency;
  judgment: Judgment;
  quadrant: string;
  recommendation: string;
}

export const STAKES_TIER_LABELS: Record<StakesTier, string> = {
  "full-speed": "Full speed",
  "with-review": "With review",
  "human-led": "Human-led",
};

export const STAKES_TIER_RULES: Record<StakesTier, string> = {
  "full-speed":
    "Your own data, nobody else affected. Build and run freely; keep your registry row current.",
  "with-review":
    "Internal data, teammates affected. A human reviews every output before it lands anywhere shared.",
  "human-led":
    "Customers or customer data. The tool drafts and prepares; a human approves and sends, every time.",
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  never: "never built with AI before; this is the first build",
  "few-prompts": "a few prompts in, nothing shipped yet",
  shipped: "has shipped something before",
};

/* ------------------------------------------------------------------ */
/* Small read helpers                                                   */
/* ------------------------------------------------------------------ */

function labelOf(options: IntakeOption[], id: string | undefined): string {
  return options.find((o) => o.id === id)?.label ?? "";
}

function slugifyLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "opt"
  );
}

export function pathwayFromIntake(intake: IntakeAnswers): VibePathway {
  return intake["pathway"]?.optionId === "biz" ? "biz" : "self";
}

/** The area option set for the active pathway. */
function areaOptions(intake: IntakeAnswers): IntakeOption[] {
  return pathwayFromIntake(intake) === "biz" ? AREA_OPTIONS_BIZ : AREA_OPTIONS_SELF;
}

/* ------------------------------------------------------------------ */
/* Cascade derivations (structured, no free text)                       */
/* ------------------------------------------------------------------ */

/** The repetitive areas the student picked (multi). */
export function areasFromIntake(intake: IntakeAnswers): string[] {
  const opts = areaOptions(intake);
  const ids = intake["areas"]?.optionIds ?? [];
  return ids
    .map((oid) => opts.find((o) => o.id === oid)?.label)
    .filter((l): l is string => Boolean(l));
}

/**
 * The one area to build first (the start box). Its options are drawn from the
 * picked areas (adaptiveOptions.fromQuestionId), so the stored optionId is the
 * slug of the chosen area label. Falls back to the first picked area.
 */
export function buildFirstFromIntake(intake: IntakeAnswers): string {
  const areas = areasFromIntake(intake);
  const pickedId = intake["buildFirst"]?.optionId;
  const match = areas.find((a) => slugifyLabel(a) === pickedId);
  return match ?? areas[0] ?? "";
}

/** The curated workflow options for the chosen build-first area. */
export function workflowOptionsFor(buildFirstLabel: string): IntakeOption[] {
  return WORKFLOW_MATRIX[buildFirstLabel] ?? WORKFLOW_FALLBACK;
}

/**
 * The specific workflow the student picked from the curated matrix. This is the
 * structured replacement for the old open-ended "grind" voice answer: a clean,
 * concrete label the prompts and templates can quote verbatim.
 */
export function workflowFromIntake(intake: IntakeAnswers): string {
  const buildFirst = buildFirstFromIntake(intake);
  const opts = workflowOptionsFor(buildFirst);
  return labelOf(opts, intake["workflow"]?.optionId);
}

/**
 * The steps the workflow involves (multi). Shapes how concrete the brief and
 * skill seed are about what the tool actually does.
 */
export function involvesFromIntake(intake: IntakeAnswers): string[] {
  const ids = intake["involves"]?.optionIds ?? [];
  return ids
    .map((oid) => INVOLVES_OPTIONS.find((o) => o.id === oid)?.label)
    .filter((l): l is string => Boolean(l));
}

/**
 * The plain-English description of the workflow used everywhere the old code
 * read the voice blob. Composed from the structured cascade: the workflow
 * label, scoped to the area it lives in. Never free text.
 */
export function grindFromIntake(intake: IntakeAnswers): string {
  const workflow = workflowFromIntake(intake);
  const area = buildFirstFromIntake(intake);
  if (workflow && area) {
    return `${workflow.charAt(0).toLowerCase()}${workflow.slice(1)} (in ${area.toLowerCase()})`;
  }
  return workflow || area || "";
}

/* ------------------------------------------------------------------ */
/* Frequency / judgment scoring                                         */
/* ------------------------------------------------------------------ */

/**
 * Frequency now reads the chosen WORKFLOW label and how many steps it involves,
 * not a regex over free text. The curated workflows are inherently recurring
 * (they are the repetitive ones, by construction), so the signal is the rhythm
 * words baked into the labels plus the involves count.
 */
const DAILY_WORKFLOW = /\b(every|each)\b|\bdaily\b|inbox|triage|chasing|chase|same\b/i;
const WEEKLY_WORKFLOW = /weekly|update|report|recap|newsletter|digest|calendar|round-?up/i;

export function inferFrequency(workflow: string): Frequency {
  const text = workflow.toLowerCase();
  if (DAILY_WORKFLOW.test(text)) return "daily";
  if (WEEKLY_WORKFLOW.test(text)) return "weekly";
  // Curated workflows are repetitive by construction; default to weekly cadence.
  return "weekly";
}

export function frequencyLabel(frequency: Frequency): string {
  return frequency === "adhoc" ? "ad hoc" : frequency;
}

/**
 * Judgment needed before output can be trusted unattended. Customer-facing
 * work is always high judgment; internal data is high judgment only while
 * the builder has never shipped anything.
 */
export function inferJudgment(
  stakesOptionId: string,
  experience: ExperienceLevel,
): Judgment {
  if (stakesOptionId === "customers") return "high";
  if (stakesOptionId === "team-internal" && experience === "never") return "high";
  return "low";
}

/** Places the chosen workflow on the frequency x judgment 2x2. */
export function scoreVibeCoding(intake: IntakeAnswers): VibeScore {
  const frequency = inferFrequency(workflowFromIntake(intake));
  const judgment = inferJudgment(
    intake["stakes"]?.optionId ?? "just-me",
    experienceFromIntake(intake),
  );
  const highFrequency = frequency !== "adhoc";

  let quadrant: string;
  let recommendation: string;

  if (highFrequency && judgment === "low") {
    quadrant = "Build first: high frequency, low judgment";
    recommendation =
      "Build this one. Scope it to one input, one output, one run, then halve it again. If you can describe the output in a single sentence, it is small enough to ship this week.";
  } else if (highFrequency && judgment === "high") {
    quadrant = "Assist, do not replace: high frequency, high judgment";
    recommendation =
      "Build the assistant, keep the call. Make the tool gather, draft and lay out options; you stay the approver on anything that leaves your hands.";
  } else if (!highFrequency && judgment === "low") {
    quadrant = "Batch it: low frequency, low judgment";
    recommendation =
      "Worth building, not worth building first. Template the most repetitive slice now, automate it after your first ship, and consider a more frequent workflow for this week.";
  } else {
    quadrant = "Keep a human on it: low frequency, high judgment";
    recommendation =
      "Do not automate the decision. Build the prep instead: something that gathers the inputs and lays them out so the judgment call takes minutes, not an afternoon.";
  }

  return { frequency, judgment, quadrant, recommendation };
}

/* ------------------------------------------------------------------ */
/* Profile / tier / experience derivations                              */
/* ------------------------------------------------------------------ */

const ROLE_LABELS_BIZ: Record<string, string> = {
  founder: "Founder",
  "run-a-team": "Team lead",
  "solo-operator": "Solo operator",
  consultant: "Consultant",
  "side-builder": "Side builder",
  student: "Student or early-career",
};

const ROLE_LABELS_SELF: Record<string, string> = {
  student: "Student or early-career",
  "side-builder": "Building on the side",
  "solo-operator": "Solo operator",
  freelancer: "Freelancer",
  "career-switcher": "Switching into a new field",
  curious: "Just curious",
};

export function roleFromIntake(intake: IntakeAnswers): string {
  const id = intake["profile"]?.optionId ?? "";
  const map = pathwayFromIntake(intake) === "biz" ? ROLE_LABELS_BIZ : ROLE_LABELS_SELF;
  return map[id] ?? (pathwayFromIntake(intake) === "biz" ? "Operator" : "Builder");
}

/** The "name on the kit" the student typed in the profile nameField. */
export function nameFromIntake(intake: IntakeAnswers): string {
  return intake["profile"]?.text?.trim() ?? "";
}

/**
 * The working name the student gave their build in the profile nameField, if
 * any. Surfaced as context in the brief and skill seed; empty when they skipped
 * it. Kept under the name `offeringFromIntake` for call-site parity with the
 * other presets' derive() blocks.
 */
export function offeringFromIntake(intake: IntakeAnswers): string {
  return nameFromIntake(intake);
}

const DEFAULT_WIN = "a working tool you use yourself";

const WIN_LABELS: Record<string, string> = {
  "use-myself": DEFAULT_WIN,
  "someone-touched": "something a teammate or friend has actually used",
  "show-it": "something you can show someone and walk them through",
  "you-pick":
    "a working tool you use yourself (the kit picked: start where the time savings are yours)",
};

export function winFromIntake(intake: IntakeAnswers): string {
  return WIN_LABELS[intake["win"]?.optionId ?? ""] ?? DEFAULT_WIN;
}

export function stakesTierFromIntake(intake: IntakeAnswers): StakesTier {
  switch (intake["stakes"]?.optionId) {
    case "customers":
      return "human-led";
    case "team-internal":
      return "with-review";
    default:
      return "full-speed";
  }
}

/** What the first build touches, for the personal map. */
export function stakesTouchesFromIntake(intake: IntakeAnswers): string {
  switch (intake["stakes"]?.optionId) {
    case "customers":
      return "Customer data";
    case "team-internal":
      return "Internal team data";
    default:
      return "Your own files and data";
  }
}

export function experienceFromIntake(intake: IntakeAnswers): ExperienceLevel {
  switch (intake["experience"]?.optionId) {
    case "shipped":
      return "shipped";
    case "few-prompts":
      return "few-prompts";
    default:
      return "never";
  }
}

export function stageFromExperience(level: ExperienceLevel): MapStage {
  if (level === "shipped") return "agents";
  if (level === "few-prompts") return "first-builds";
  return "prompting";
}

/**
 * A short, human build name derived from the chosen workflow label. Used as the
 * skill nameHint and the personal map. Deterministic; the student can rename.
 */
export function shortBuildName(workflow: string): string {
  const cleaned = workflow.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Your first build";

  const stripped = cleaned.replace(/^(the|a|an)\s+/i, "").trim();

  let name = (stripped.split(/[.;,(]/)[0] ?? stripped).trim() || cleaned;
  if (name.length > 48) {
    const cut = name.slice(0, 48);
    const lastSpace = cut.lastIndexOf(" ");
    name = (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim();
  }
  const filler =
    /\s(a|an|and|at|by|for|from|in|into|my|of|on|one|or|our|the|then|to|with)$/i;
  while (filler.test(name)) {
    name = name.replace(filler, "").trim();
  }
  if (!name) return "Your first build";
  return name.charAt(0).toUpperCase() + name.slice(1);
}
