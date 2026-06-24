/**
 * Build Your AI Chief of Staff: the decision engine.
 *
 * This is the heart of the kit. The field guide ships a complete decision engine
 * (Section 10): eight typed inputs, a per-rung scoring rubric, guardrails, and a
 * tie-break. It ports here verbatim as a DETERMINISTIC pure function: no LLM is
 * needed to pick the rung. Free, instant, unit-testable, and honest. The LLM
 * (in prompts.ts) only warms up the prose of the recommendation; the rung, the
 * ranking, and the guardrails are computed here and never invented.
 *
 * The "rung" is one of seven ways to build a personal AI chief of staff, a
 * single dial from least effort/control (1, just chat) to most ownership/upkeep
 * (7, own the hardware). Higher is not better; it is more ownership for more
 * upkeep. The engine returns the highest-scoring rung the guardrails allow, ties
 * broken toward the LOWER rung (start simple, climb only at a real wall).
 *
 * Pure functions only: no LLM calls, no IO, no runtime globals. Same constraint
 * as the rest of _shared/kit-presets (see types.ts header): plain TypeScript,
 * imported by the Deno edge runtime, the Vite client bundle (via kitPdf.ts), and
 * vitest.
 */

import type { IntakeAnswers } from "../types.ts";

/* ------------------------------------------------------------------ */
/* The eight inputs (field guide 10.1)                                  */
/* ------------------------------------------------------------------ */

export type TechLevel = "none" | "light" | "comfortable_nocode" | "can_code" | "engineer";
export type TimeBudget = "minutes" | "one_evening" | "a_weekend" | "weeks";
export type MoneyBudget = "under_25" | "25_50" | "50_150" | "150_plus" | "prefer_own_hardware";
export type PrivacyNeed = "low" | "medium" | "high" | "must_be_local";
export type JobWanted =
  | "think_draft"
  | "inbox_calendar"
  | "scheduled_briefs"
  | "take_action"
  | "everything_private";
export type AutonomyLevel = "only_respond" | "draft_for_approval" | "act_on_low_stakes" | "run_unsupervised";
export type CurrentRung = "just_chat" | "some_native" | "tried_tools" | "built_a_flow" | "self_hosting";
export type MaintainHabit = "no" | "maybe" | "yes";

export interface ChiefInputs {
  tech: TechLevel;
  time: TimeBudget;
  budget: MoneyBudget;
  privacy: PrivacyNeed;
  job: JobWanted;
  autonomy: AutonomyLevel;
  now: CurrentRung;
  maintain: MaintainHabit;
}

/**
 * Safe defaults for any unanswered input. Deliberately the lowest-commitment
 * value of each axis so a sparse answer set lands on a simple, safe rung rather
 * than over-recommending. maintain defaults to "maybe" (neutral, not "yes").
 */
const DEFAULTS: ChiefInputs = {
  tech: "none",
  time: "minutes",
  budget: "under_25",
  privacy: "low",
  job: "think_draft",
  autonomy: "only_respond",
  now: "just_chat",
  maintain: "maybe",
};

/* ------------------------------------------------------------------ */
/* The seven rungs (field guide 3 + 4)                                  */
/* ------------------------------------------------------------------ */

export interface RungRef {
  rung: number;
  name: string;
}

export const RUNGS: RungRef[] = [
  { rung: 1, name: "Just chat" },
  { rung: 2, name: "Native, switched on" },
  { rung: 3, name: "Buy a product" },
  { rung: 4, name: "No-code orchestration" },
  { rung: 5, name: "Custom API harness" },
  { rung: 6, name: "Self-hosted open source" },
  { rung: 7, name: "Own the hardware" },
];

export function rungName(rung: number): string {
  return RUNGS.find((r) => r.rung === rung)?.name ?? `Rung ${rung}`;
}

/* ------------------------------------------------------------------ */
/* Reading the intake                                                   */
/* ------------------------------------------------------------------ */

/** Read one chip answer's optionId, falling back to the safe default. */
function pick<T extends string>(intake: IntakeAnswers, key: string, fallback: T): T {
  const id = intake[key]?.optionId;
  return (id as T) || fallback;
}

/** The eight inputs, read from the intake, each defaulted when unanswered. */
export function inputsFromIntake(intake: IntakeAnswers): ChiefInputs {
  return {
    tech: pick(intake, "tech", DEFAULTS.tech),
    time: pick(intake, "time", DEFAULTS.time),
    budget: pick(intake, "budget", DEFAULTS.budget),
    privacy: pick(intake, "privacy", DEFAULTS.privacy),
    job: pick(intake, "job", DEFAULTS.job),
    autonomy: pick(intake, "autonomy", DEFAULTS.autonomy),
    now: pick(intake, "now", DEFAULTS.now),
    maintain: pick(intake, "maintain", DEFAULTS.maintain),
  };
}

/** The person's role, for personalising the identity file. Empty when skipped. */
export function roleFromIntake(intake: IntakeAnswers): string {
  return intake["role"]?.optionId ?? "";
}

/* ------------------------------------------------------------------ */
/* The scoring rubric (field guide 10.2)                                */
/* ------------------------------------------------------------------ */

const has = <T extends string>(set: readonly T[], v: T): boolean => set.includes(v);

/** Raw per-rung points, summed exactly per the field guide rubric. */
export function rawScores(i: ChiefInputs): Record<number, number> {
  const s: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  // Option 1 - Just chat
  if (i.time === "minutes" && i.tech === "none") s[1] += 3;
  if (i.job === "think_draft") s[1] += 2;
  if (i.budget === "under_25") s[1] += 2;
  if (has(["scheduled_briefs", "take_action", "everything_private"] as const, i.job)) s[1] -= 3;
  if (i.maintain === "yes") s[1] -= 2;

  // Option 2 - Native, switched on (the default; carries a +2 baseline)
  s[2] += 2;
  if (has(["minutes", "one_evening"] as const, i.time)) s[2] += 3;
  if (has(["none", "light"] as const, i.tech)) s[2] += 3;
  if (has(["think_draft", "inbox_calendar"] as const, i.job)) s[2] += 2;
  if (has(["medium", "high"] as const, i.privacy)) s[2] += 2;
  if (has(["just_chat", "some_native"] as const, i.now)) s[2] += 2;
  if (i.job === "take_action") s[2] -= 2;
  if (i.autonomy === "run_unsupervised") s[2] -= 2;

  // Option 3 - Buy a product
  if (i.job === "inbox_calendar" && has(["none", "light"] as const, i.tech)) s[3] += 3;
  if (i.time === "minutes" && has(["50_150", "150_plus"] as const, i.budget)) s[3] += 2;
  if (i.autonomy === "draft_for_approval") s[3] += 1;
  if (has(["high", "must_be_local"] as const, i.privacy)) s[3] -= 3;
  if (i.budget === "under_25") s[3] -= 2;
  if (i.maintain === "yes") s[3] -= 1;

  // Option 4 - No-code orchestration
  if (i.job === "scheduled_briefs") s[4] += 3;
  if (i.tech === "comfortable_nocode") s[4] += 3;
  if (has(["a_weekend", "weeks"] as const, i.time)) s[4] += 2;
  if (has(["draft_for_approval", "act_on_low_stakes"] as const, i.autonomy)) s[4] += 2;
  if (i.maintain === "yes") s[4] += 2;
  if (has(["medium", "high"] as const, i.privacy)) s[4] += 1;
  if (i.time === "minutes") s[4] -= 2;

  // Option 5 - Custom API harness
  if (has(["can_code", "engineer"] as const, i.tech)) s[5] += 3;
  if (i.job === "take_action") s[5] += 3;
  if (has(["act_on_low_stakes", "run_unsupervised"] as const, i.autonomy) && i.maintain === "yes") s[5] += 2;
  if (i.time === "weeks") s[5] += 2;
  if (has(["none", "light"] as const, i.tech)) s[5] -= 3;

  // Option 6 - Self-hosted open source
  if (has(["high", "must_be_local"] as const, i.privacy)) s[6] += 3;
  if (i.tech === "engineer") s[6] += 3;
  if (i.job === "everything_private") s[6] += 2;
  if (i.maintain === "yes") s[6] += 2;
  if (i.maintain === "no") s[6] -= 3;
  if (has(["none", "light"] as const, i.tech)) s[6] -= 3;

  // Option 7 - Own the hardware
  if (i.budget === "prefer_own_hardware" || i.privacy === "must_be_local") s[7] += 3;
  if (i.tech === "engineer") s[7] += 3;
  if (i.job === "everything_private") s[7] += 2;
  if (i.time === "weeks") s[7] += 1;
  if (i.maintain === "no") s[7] -= 3;
  if (has(["none", "light", "comfortable_nocode"] as const, i.tech)) s[7] -= 3;

  /* ---- Reachability adjustments ------------------------------------ *
   * The base rubric above is field guide 10.2 verbatim. But Option 2's
   * +2 baseline plus its broad bonuses shadow Options 1 and 3, leaving
   * them effectively unreachable for the very personas the guide's own
   * shortcuts (10.4) route to them. The guide explicitly invites tuning
   * ("weights are a starting point"), so these three lines, each grounded
   * in the guide's own wall / strong-when notes, make every rung reachable
   * for its archetype without disturbing the others:
   *   - Native drifts without upkeep (Option 2's wall: "memory drifts if
   *     you never prune it"), so it is the wrong call for someone who will
   *     not maintain it.
   *   - A product is the buy-don't-build, hands-off, paid path (Option 3's
   *     strong-when: "you want it and will not build it").
   *   - Just chat is the deliberate no-upkeep floor for someone who only
   *     wants a thinking partner that responds (Option 1). */
  if (i.maintain === "no") s[2] -= 3;
  if (i.maintain === "no") s[3] += 3;
  if (has(["50_150", "150_plus"] as const, i.budget)) s[3] += 1;
  if (i.maintain === "no" && i.autonomy === "only_respond") s[1] += 3;

  return s;
}

/* ------------------------------------------------------------------ */
/* Guardrails (field guide 10.3)                                        */
/* ------------------------------------------------------------------ */

/** The "spend your effort on the pillars" line, always appended (10.3). */
export const PILLARS_LINE =
  "Whichever rung you land on, it is a detail. Spend your real effort on the three pillars: identity, memory, and monitoring.";

/** The autonomy warning, appended when they want unsupervised action (10.3). */
export const AUTONOMY_WARNING =
  "Earn autonomy. Start everything in draft mode for a month before you grant write access.";

interface GuardrailResult {
  /** Rungs the guardrails forbid as the recommendation. */
  blocked: Set<number>;
  /** Human-readable notes for each guardrail that fired. */
  notes: string[];
  /** Standing warnings (autonomy) plus the always-on pillars line. */
  warnings: string[];
}

function applyGuardrails(i: ChiefInputs): GuardrailResult {
  const blocked = new Set<number>();
  const notes: string[] = [];
  const warnings: string[] = [];

  // maintain=no caps the recommendation at rung 4 (anything higher rots).
  if (i.maintain === "no") {
    [5, 6, 7].forEach((r) => blocked.add(r));
    notes.push(
      "You said you will not do the weekly upkeep, so we capped this at a setup that survives without it. A simpler setup that runs beats a sophisticated one you do not maintain.",
    );
  }

  // privacy=must_be_local never recommends a bought product (memory is not yours).
  if (i.privacy === "must_be_local") {
    blocked.add(3);
    notes.push(
      "Your data has to stay local, so a bought product is off the table: its memory lives in someone else's cloud, not yours.",
    );
  }

  // tech in {none, light} never recommends rungs 5-7; route to 2/3/4.
  if (i.tech === "none" || i.tech === "light") {
    [5, 6, 7].forEach((r) => blocked.add(r));
    notes.push(
      "You are early on the building side, so we kept you to setups you can actually stand up today: native, a product, or no-code. Climb later, when you hit a real wall.",
    );
  }

  if (i.autonomy === "run_unsupervised") warnings.push(AUTONOMY_WARNING);
  warnings.push(PILLARS_LINE);

  return { blocked, notes, warnings };
}

/* ------------------------------------------------------------------ */
/* The recommendation                                                   */
/* ------------------------------------------------------------------ */

export interface RankedRung {
  rung: number;
  name: string;
  score: number;
}

export interface ChiefScores {
  /** The eight resolved inputs (defaults filled). */
  inputs: ChiefInputs;
  /** Raw per-rung totals from the rubric (all seven, for transparency). */
  optionScores: Record<number, number>;
  /** The eligible rungs (guardrails applied), sorted by score desc, rung asc. */
  ranked: RankedRung[];
  /** The single recommended rung: top eligible, ties broken toward the lower. */
  recommended: RankedRung;
  /** Human-readable notes for each guardrail that fired. */
  guardrailsApplied: string[];
  /** Standing warnings (autonomy) plus the always-on pillars line. */
  warnings: string[];
}

/**
 * The full decision. Scores all seven rungs, applies the guardrails, and picks
 * the highest-scoring ELIGIBLE rung, ties broken toward the lower rung. Returns
 * the recommendation, the eligible ranking (the runners-up), the guardrail notes
 * and the warnings, plus the raw scores for every rung.
 */
export function scoreChief(intake: IntakeAnswers): ChiefScores {
  const inputs = inputsFromIntake(intake);
  const optionScores = rawScores(inputs);
  const { blocked, notes, warnings } = applyGuardrails(inputs);

  const ranked: RankedRung[] = RUNGS.filter((r) => !blocked.has(r.rung))
    .map((r) => ({ rung: r.rung, name: r.name, score: optionScores[r.rung] }))
    // Highest score first; tie-break toward the LOWER rung (start simple).
    .sort((a, b) => b.score - a.score || a.rung - b.rung);

  // ranked is never empty: rungs 1-4 are never all blocked by the guardrails.
  const recommended = ranked[0] ?? { rung: 2, name: rungName(2), score: optionScores[2] };

  return {
    inputs,
    optionScores,
    ranked,
    recommended,
    guardrailsApplied: notes,
    warnings,
  };
}

/** Narrowing helper for the unknown ctx.scores handed to artifacts. */
export function asChiefScores(scores: unknown): ChiefScores | null {
  if (
    scores &&
    typeof scores === "object" &&
    "recommended" in scores &&
    "inputs" in scores
  ) {
    return scores as ChiefScores;
  }
  return null;
}
