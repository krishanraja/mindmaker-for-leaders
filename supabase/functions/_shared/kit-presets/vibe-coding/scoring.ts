/**
 * Vibe Coding Field Kit: deterministic scoring and intake derivations.
 *
 * Pure functions only: no LLM calls, no IO, no runtime globals. Every
 * heuristic that reads intake answers lives here so templates, prompts and
 * the preset all derive from one place.
 */

import type { IntakeAnswers } from "../types.ts";

export type Frequency = "daily" | "weekly" | "adhoc";
export type Judgment = "low" | "high";
export type StakesTier = "full-speed" | "with-review" | "human-led";
export type ExperienceLevel = "never" | "few-prompts" | "shipped";
export type MapStage = "prompting" | "first-builds" | "agents";

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

/** High-frequency wording: daily rhythms and "constantly" phrasing. */
const DAILY_PATTERN =
  /\b(every|each) (day|morning|afternoon|evening|night)\b|\bdaily\b|\ball day\b|\btwice a day\b|\bseveral times a day\b|\bconstantly\b|\bevery time\b|\bover and over\b|\bagain and again\b|\bkeep having to\b/;

/** Weekly rhythms, including named weekdays. */
const WEEKLY_PATTERN =
  /\b(every|each) (week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\bweekly\b|\bonce a week\b|\bevery other week\b|\bmost weeks\b/;

export function inferFrequency(grind: string): Frequency {
  const text = grind.toLowerCase();
  if (DAILY_PATTERN.test(text)) return "daily";
  if (WEEKLY_PATTERN.test(text)) return "weekly";
  return "adhoc";
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

/** Places the grind workflow on the frequency x judgment 2x2. */
export function scoreVibeCoding(intake: IntakeAnswers): VibeScore {
  const frequency = inferFrequency(grindFromIntake(intake));
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
/* Intake derivations                                                   */
/* ------------------------------------------------------------------ */

export function grindFromIntake(intake: IntakeAnswers): string {
  return intake["grind"]?.text?.trim() ?? "";
}

const ROLE_LABELS: Record<string, string> = {
  founder: "Founder",
  "run-a-team": "Team lead",
  "solo-operator": "Solo operator",
  consultant: "Consultant",
  "side-builder": "Side builder",
};

export function roleFromIntake(intake: IntakeAnswers): string {
  return ROLE_LABELS[intake["role"]?.optionId ?? ""] ?? "Operator";
}

export function offeringFromIntake(intake: IntakeAnswers): string {
  return intake["role"]?.text?.trim() ?? "";
}

const DEFAULT_WIN = "a working tool you use yourself";

const WIN_LABELS: Record<string, string> = {
  "use-myself": DEFAULT_WIN,
  "someone-touched": "something a teammate or customer has touched",
  demo: "a demo you can show",
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

/** What the first build touches, for the registry row. */
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
 * A short, human build name derived from the grind answer. Used as the skill
 * nameHint, the registry row and the personal map. Deterministic and rough
 * by design; the student can rename later.
 */
export function shortBuildName(grind: string): string {
  const cleaned = grind.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Your first build";

  const stripped = cleaned
    .replace(
      /^(every|each) (monday|tuesday|wednesday|thursday|friday|saturday|sunday|day|week|morning|month|quarter)[,\s]+/i,
      "",
    )
    .replace(/^(i|we) (have to |need to |always |usually |currently |manually )?/i, "")
    .trim();

  const clause = (stripped.split(/[.;,]/)[0] ?? stripped).trim();
  let name = clause || cleaned;
  if (name.length > 48) {
    const cut = name.slice(0, 48);
    const lastSpace = cut.lastIndexOf(" ");
    name = (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim();
  }
  // Drop dangling connectives left behind by truncation ("...into one").
  const filler =
    /\s(a|an|and|at|by|for|from|in|into|my|of|on|one|or|our|the|then|to|with)$/i;
  while (filler.test(name)) {
    name = name.replace(filler, "").trim();
  }
  if (!name) return "Your first build";
  return name.charAt(0).toUpperCase() + name.slice(1);
}
