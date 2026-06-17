/**
 * Autonomous Business Pack: leverage scoring + structured intake readers.
 *
 * Pure deterministic maths over the STRUCTURED intake cascade. No LLM, no IO,
 * no globals. Imported by both the Deno edge runtime and the Vite client; keep
 * it plain.
 *
 * The intake is the forked recognition cascade (no open-ended voice blob):
 *   pathway -> profile -> area (multi, the boxes) -> timeSink (one, the start
 *   box) -> workflow (one, adaptive from the time-sink) -> involves (multi) ->
 *   hours (one) -> revenue (one) -> spectrum (one, AI maturity) -> tool ->
 *   leaves (multi, the guardrails / what leaves the building).
 *
 * Every reader here resolves a STRUCTURED label off the picked options, so the
 * leverage maths and the artifact copy are built from what the student tapped,
 * never from free text we have to parse.
 */

import type { IntakeAnswers, IntakeOption } from "../types.ts";

/* ------------------------------------------------------------------ */
/* Option sets (single source of truth, shared with preset.ts)         */
/* ------------------------------------------------------------------ */

export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "opt"
  );
}

const opt = (label: string, description?: string): IntakeOption => ({
  id: slugify(label),
  label,
  ...(description ? { description } : {}),
});

/** What the business is (biz pathway): the line at the top of the pack. */
export const BIZ_SECTORS: IntakeOption[] = [
  opt("Agency or services"),
  opt("Software or SaaS"),
  opt("E-commerce or retail"),
  opt("Media or content"),
  opt("Professional services"),
  opt("Other"),
];

/** Who the operator is (self pathway). */
export const SOLO_ROLES: IntakeOption[] = [
  opt("Consultant"),
  opt("Freelancer"),
  opt("Solo founder"),
  opt("Creator"),
  opt("Coach"),
  opt("Agency of one"),
];

/** The areas a business runs (biz pathway): the boxes the student recognises. */
export const BIZ_AREAS: IntakeOption[] = [
  opt("Sales"),
  opt("Marketing"),
  opt("Customer support"),
  opt("Finance / ops"),
  opt("Hiring"),
  opt("Content"),
  opt("Data / reporting"),
  opt("Product"),
];

/** The hats a solo operator wears (self pathway): the boxes. */
export const SELF_HATS: IntakeOption[] = [
  opt("Finding clients"),
  opt("Doing the work"),
  opt("Marketing myself"),
  opt("Admin / scheduling"),
  opt("Invoicing"),
  opt("Content"),
  opt("Research"),
];

/** What the recurring workflow involves (multi). Shapes the skill we seed. */
export const INVOLVES: IntakeOption[] = [
  opt("Pulling info from a tool"),
  opt("Writing a message or doc"),
  opt("Updating a system"),
  opt("Waiting on someone"),
  opt("Checking or deciding something"),
  opt("Sending it to a person"),
];

/** What leaves the building (multi): the guardrails. Stable ids matched below. */
export const LEAVES: IntakeOption[] = [
  { id: "email", label: "Email to real people" },
  { id: "posting", label: "Posting publicly" },
  { id: "payments", label: "Payments or invoices" },
  { id: "client-comms", label: "Client communications" },
  { id: "none", label: "None of these" },
];

/**
 * The curated, deterministic workflow matrix for AdaptiveOptions.matrixKey.
 * Keyed by the chosen AREA label (the time-sink). Each row is the recognisable
 * recurring workflows inside that area. Never a live LLM call; pure data.
 */
export const WORKFLOW_MATRIX: Record<string, IntakeOption[]> = {
  // biz areas
  Sales: [
    opt("Following up after calls"),
    opt("Chasing the pipeline for updates"),
    opt("Writing proposals or quotes"),
    opt("Qualifying inbound leads"),
    opt("Researching prospects"),
  ],
  Marketing: [
    opt("Turning one idea into a week of posts"),
    opt("Building the campaign report"),
    opt("Briefing and chasing creative"),
    opt("Writing email sequences"),
  ],
  "Customer support": [
    opt("Answering the same questions"),
    opt("Triaging and routing tickets"),
    opt("Writing help articles"),
    opt("Chasing resolutions"),
  ],
  "Finance / ops": [
    opt("Reconciling numbers across tools"),
    opt("Building the weekly update"),
    opt("Chasing approvals"),
    opt("Onboarding a vendor or client"),
  ],
  Hiring: [
    opt("Screening inbound applicants"),
    opt("Sourcing and first outreach"),
    opt("Scheduling interviews"),
    opt("Writing the job post"),
  ],
  Content: [
    opt("Turning a call into a post"),
    opt("Editing to your voice"),
    opt("Repurposing across channels"),
    opt("Planning the calendar"),
  ],
  "Data / reporting": [
    opt("Pulling numbers into one update"),
    opt("Rebuilding the same dashboard"),
    opt("Answering what-happened asks"),
  ],
  Product: [
    opt("Synthesising user feedback"),
    opt("Writing specs from notes"),
    opt("Triaging the backlog"),
  ],
  // self hats
  "Finding clients": [
    opt("Following up with leads"),
    opt("Writing cold outreach"),
    opt("Researching who to contact"),
  ],
  "Doing the work": [
    opt("The same setup every project"),
    opt("Turning notes into deliverables"),
    opt("Writing the recap"),
  ],
  "Marketing myself": [
    opt("Turning work into content"),
    opt("Posting consistently"),
    opt("Writing the newsletter"),
  ],
  "Admin / scheduling": [
    opt("Scheduling and rescheduling"),
    opt("Chasing people for things"),
    opt("Inbox triage"),
  ],
  Invoicing: [opt("Raising and chasing invoices"), opt("Reconciling what came in")],
  Research: [opt("Pulling sources into a brief"), opt("The same lookup each time")],
};

export const WORKFLOW_FALLBACK: IntakeOption[] = [
  opt("The repetitive one"),
  opt("The fiddly one"),
  opt("The one I keep forgetting"),
];

/* ------------------------------------------------------------------ */
/* Structured intake readers                                           */
/* ------------------------------------------------------------------ */

export type Pathway = "self" | "biz";

export function pathwayOf(intake: IntakeAnswers): Pathway {
  return intake["pathway"]?.optionId === "biz" ? "biz" : "self";
}

function labelOfId(options: IntakeOption[], id: string | undefined): string {
  return options.find((o) => o.id === id)?.label ?? "";
}

function labelsOfIds(options: IntakeOption[], ids: string[] | undefined): string[] {
  return (ids ?? [])
    .map((id) => options.find((o) => o.id === id)?.label)
    .filter((l): l is string => Boolean(l));
}

/** The name on the pack (from the profile nameField text input). */
export function nameOf(intake: IntakeAnswers): string {
  return intake["profile"]?.text?.trim() ?? "";
}

/** What the business does / who the operator is (the profile chip). */
export function whatItDoesOf(intake: IntakeAnswers): string {
  const pathway = pathwayOf(intake);
  return labelOfId(pathway === "biz" ? BIZ_SECTORS : SOLO_ROLES, intake["profile"]?.optionId);
}

/** The areas / hats the student recognised (the boxes). */
export function areaLabelsOf(intake: IntakeAnswers): string[] {
  const pathway = pathwayOf(intake);
  return labelsOfIds(pathway === "biz" ? BIZ_AREAS : SELF_HATS, intake["area"]?.optionIds);
}

/**
 * The chosen time-sink area (the start box). Its stored optionId is the slug of
 * the chosen area label (the time-sink options are drawn from the areas), so we
 * resolve it back against the picked areas.
 */
export function timeSinkOf(intake: IntakeAnswers): string {
  const areas = areaLabelsOf(intake);
  const sinkId = intake["timeSink"]?.optionId;
  return areas.find((a) => slugify(a) === sinkId) ?? areas[0] ?? "";
}

/** The specific recurring workflow inside the time-sink (from the matrix). */
export function workflowOf(intake: IntakeAnswers): string {
  const sink = timeSinkOf(intake);
  const row = WORKFLOW_MATRIX[sink] ?? WORKFLOW_FALLBACK;
  return labelOfId(row, intake["workflow"]?.optionId);
}

/** What that workflow involves (pull / write / update / wait / decide / send). */
export function involvesOf(intake: IntakeAnswers): string[] {
  return labelsOfIds(INVOLVES, intake["involves"]?.optionIds);
}

/** What leaves the building (the guardrail option ids), excluding "none". */
export function externalLeaves(intake: IntakeAnswers): string[] {
  return (intake["leaves"]?.optionIds ?? []).filter((id) => id !== "none");
}

/** The first-build display name: the chosen workflow, or a safe default. */
export function firstBuildName(intake: IntakeAnswers): string {
  const wf = workflowOf(intake);
  if (wf) return wf;
  const sink = timeSinkOf(intake);
  return sink ? `the ${sink.toLowerCase()} workflow` : "your first workflow";
}

/* ------------------------------------------------------------------ */
/* Hours + revenue weights                                             */
/* ------------------------------------------------------------------ */

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
  /** The other areas the student picked, as next candidates to score later. */
  additionalCandidates: string[];
}

/** Render a score without a trailing .0 (22.5 stays 22.5, 12 stays 12). */
export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * The leverage score: hours midpoint x revenue weight. Shown to the student
 * with the arithmetic visible so they can re-run it on anything. Now sourced
 * entirely from the structured cascade: the biggest time-sink IS the workflow
 * being scored, and the other picked areas are the next candidates.
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

  // Next candidates = the other areas the student recognised (not the sink).
  const sink = timeSinkOf(intake);
  const additionalCandidates = areaLabelsOf(intake).filter((a) => a !== sink);

  return {
    hoursPerWeek,
    revenueProximity,
    score,
    verdict,
    rationale,
    additionalCandidates,
  };
}
