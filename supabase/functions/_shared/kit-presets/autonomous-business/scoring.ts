/**
 * Autonomous Business Pack: leverage scoring.
 *
 * Pure deterministic maths over intake answers. No LLM, no IO, no globals.
 * Imported by both the Deno edge runtime and the Vite client; keep it plain.
 */

import type { IntakeAnswers } from "../types.ts";

/** Midpoint hours for each "hours" chip. The "more than 10" chip uses 12. */
export const HOURS_MIDPOINTS: Record<string, number> = {
  "under-2": 1.5,
  "2-5": 3.5,
  "5-10": 7.5,
  "10-plus": 12,
};

export const HOURS_LABELS: Record<string, string> = {
  "under-2": "under 2 hours a week",
  "2-5": "2 to 5 hours a week",
  "5-10": "5 to 10 hours a week",
  "10-plus": "more than 10 hours a week",
};

/** Revenue proximity weights for each "revenue" chip. */
export const REVENUE_WEIGHTS: Record<string, number> = {
  direct: 3,
  supports: 2,
  internal: 1,
};

export const REVENUE_LABELS: Record<string, string> = {
  direct: "directly makes money",
  supports: "supports sales or clients",
  internal: "keeps the lights on internally",
};

export type LeverageVerdict =
  | "build this first now"
  | "strong first build"
  | "good practice build";

export interface LeverageScore {
  hoursPerWeek: number;
  revenueProximity: number;
  score: number;
  verdict: LeverageVerdict;
  rationale: string;
  additionalCandidates: string[];
}

/** Render a score without a trailing .0 (22.5 stays 22.5, 12 stays 12). */
export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Split the free-text workflows answer into the primary workflow and any
 * additional candidates. Line breaks win; a single line falls back to
 * sentence boundaries. Deterministic, no cleverness.
 */
export function parseWorkflows(text: string): { primary: string; additional: string[] } {
  const cleaned = (text ?? "").trim();
  if (!cleaned) return { primary: "", additional: [] };

  const lines = cleaned
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0);

  let segments: string[];
  if (lines.length > 1) {
    segments = lines;
  } else {
    segments = lines[0]
      .split(/[.;!?]+\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    if (segments.length === 0) segments = [lines[0]];
  }

  const tidy = segments.map((s) => s.replace(/[.;,\s]+$/, "").trim()).filter((s) => s.length > 0);
  return { primary: tidy[0] ?? "", additional: tidy.slice(1, 5) };
}

/**
 * The leverage score: hours midpoint x revenue weight. Shown to the student
 * with the arithmetic visible so they can re-run it on anything.
 */
export function scoreLeverage(intake: IntakeAnswers): LeverageScore {
  const hoursId = intake["hours"]?.optionId ?? "";
  const revenueId = intake["revenue"]?.optionId ?? "";

  const hoursPerWeek = HOURS_MIDPOINTS[hoursId] ?? 1.5;
  const revenueProximity = REVENUE_WEIGHTS[revenueId] ?? 1;
  const score = hoursPerWeek * revenueProximity;

  let verdict: LeverageVerdict;
  if (score >= 15) {
    verdict = "build this first now";
  } else if (score >= 7) {
    verdict = "strong first build";
  } else {
    verdict = "good practice build";
  }

  const hoursLabel = HOURS_LABELS[hoursId] ?? "a few hours a week";
  const revenueLabel = REVENUE_LABELS[revenueId] ?? "keeps the lights on internally";

  let tail: string;
  if (verdict === "build this first now") {
    tail = "Automating it pays back faster than anything else you named.";
  } else if (verdict === "strong first build") {
    tail = "Meaty enough to matter, contained enough to ship this week.";
  } else {
    tail = "Low stakes, which makes it the right place to learn the build loop before you point it at revenue.";
  }
  const rationale = `It eats ${hoursLabel} and it ${revenueLabel}. ${tail}`;

  const { additional } = parseWorkflows(intake["workflows"]?.text ?? "");

  return {
    hoursPerWeek,
    revenueProximity,
    score,
    verdict,
    rationale,
    additionalCandidates: additional,
  };
}
