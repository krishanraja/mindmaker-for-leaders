/**
 * standard-render: my-standard.md, the artefact half of stage 3a (CH-18).
 *
 * Pure. No Deno imports, no network, no clock. vitest runs this file directly.
 *
 * CH-18 splits Phase 3. 3a is compile-standard plus THIS file rendered into
 * generated_artifacts behind the one-click download CTRL already ships for
 * my-ai-context.md, carrying an honest Draft / Provisional / Verified label.
 * The share of sort completers who open or download it inside a week is the one
 * number that decides whether Phase 6's plugin and marketplace block is worth
 * building at all. So the file has to be worth opening, and it has to be true.
 *
 * The single rule that makes it true is spec 4.3F, and it is the one behaviour
 * that would have prevented the james-harrabin file: A SECTION WITH NO EVIDENCE
 * RENDERS 'AWAITING' PLUS ONE LINE ON WHAT WOULD FILL IT. Never a plausible
 * guess, never an inference dressed as an observation, never a tone description
 * built from adjectives.
 *
 * ctrl-compile/leaves/profile.md states the design constraint this implements:
 * "this file is going to be wrong about something, and the question is whether
 * it is wrong loudly or quietly. A field marked AWAITING is wrong loudly and
 * someone fixes it. A field filled with a plausible guess is wrong quietly, and
 * the person it is about finds out at the worst moment."
 */

import type {
  BaselineLabel,
  CriterionWeight,
  DiscVerdict,
  SideCounts,
  Triage,
} from "./discrimination.ts";
import { BASELINE_LABEL_TEXT, byWeightLoadOrder } from "./discrimination.ts";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** One evidenced line: the claim, and the words it came from. */
export interface EvidencedLine {
  text: string;
  quote?: string | null;
  source_label?: string | null;
  occurred_at?: string | null;
  /** A rule from a situated statement stays situated. The situation IS the rule. */
  situation?: string | null;
}

export interface DomainLine {
  domain: string;
  /** expert or novice. Not a five-point scale; a scale here invites a guess. */
  level: string;
  evidence: string;
  can_do_unaided?: string | null;
  last_updated?: string | null;
  /** Not optional. The level alone tells a model nothing about what to do differently. */
  consequence: string;
}

export interface ArtefactLine {
  signed_off?: string | null;
  rejected?: string | null;
  /** Worth more than the other two combined. */
  difference_in_their_words?: string | null;
}

export interface AudienceLine {
  output_type: string;
  audience: string;
  job: string;
}

export interface PriorLine {
  model_default: string;
  needs_instead: string;
  quote?: string | null;
  date?: string | null;
}

export interface StandardProfile {
  /** The person. Not the operator. They can edit this file and should be told so. */
  owner?: string | null;
  surface: string;
  version?: number;
  last_reviewed?: string | null;
  review_interval_days?: number;
  provenance?: string | null;
  owns?: EvidencedLine[];
  recurring_work?: EvidencedLine[];
  domains?: DomainLine[];
  artefacts?: ArtefactLine[];
  hard_constraints?: EvidencedLine[];
  audiences?: AudienceLine[];
  failure_modes?: EvidencedLine[];
  /** Cosmetic, self-declared, user-editable. Labelled as such in the output. */
  tone?: string | null;
  correct_priors?: PriorLine[];
  open_items?: EvidencedLine[];
}

export interface RenderCriterion {
  name: string;
  check_text: string;
  observable: string | null;
  weight: CriterionWeight;
  /** Their words, verbatim. A tidied pole is a different construct. */
  emergent_pole?: string | null;
  contrast_pole?: string | null;
  rationale?: string | null;
  holds_example?: string | null;
  breaks_example?: string | null;
  disc_verdict: DiscVerdict;
  n_rejected?: number | null;
  n_rejected_failing?: number | null;
  n_accepted?: number | null;
  n_accepted_failing?: number | null;
  gap?: number | null;
  /** Why there is no discrimination line, when there is none. */
  disc_reason?: string | null;
  provenance?: { session?: string | null; items?: number[] | null; construct_id?: string | null };
}

/** A construct that did not become a criterion, and the counts that say why. */
export interface AwaitingConstruct {
  name: string;
  emergent_pole?: string | null;
  contrast_pole?: string | null;
  observable?: string | null;
  disc_verdict: DiscVerdict;
  counts?: (SideCounts & { gap?: number | null }) | null;
  reason: string;
}

export interface StandardNumbers {
  held_out_graded?: number | null;
  precision?: number | null;
  recall?: number | null;
  tnr?: number | null;
  measured_at?: string | null;
  self_agreement?: { matched: number; total: number } | null;
  pair_split?: { split: number; total: number; rate: number } | null;
  triage?: Triage | null;
  triage_reason?: string | null;
}

export interface RenderStandardInput {
  criteria: RenderCriterion[];
  constructs: AwaitingConstruct[];
  profile: StandardProfile;
  label: BaselineLabel;
  numbers?: StandardNumbers | null;
}

// ---------------------------------------------------------------------------
// AWAITING
// ---------------------------------------------------------------------------

export const AWAITING = "AWAITING";

/**
 * One line per section on what would fill it. These are the sentences that turn
 * a hole into a next action, and they are the reason an empty section is more
 * useful than a filled-in guess.
 */
export const AWAITING_FILL: Record<string, string> = {
  owns:
    "Filled by a transcript or a short note naming what actually reports to you and what you are only involved in.",
  recurring_work:
    "Filled by naming what you produce every week or more often, who reviews it, and what shape it takes.",
  domains:
    "Filled by evidence of something you can do unaided that a competent newcomer cannot. A self rating does not fill it.",
  artefacts:
    "Filled by one piece you signed off, one you turned down, and the difference between them in your own words.",
  constructs:
    "Filled by a sort where at least four accepted and four rejected pieces carry the same checkable test.",
  hard_constraints:
    "Filled by something you demonstrated, with the quote and the date. Nothing inferred belongs here.",
  audiences:
    "Filled by naming who reads each thing you send and what that thing has to do for them.",
  failure_modes:
    "Filled by one thing that actually went wrong, described specifically enough to recognise again.",
  tone:
    "Filled by you, in your own words. It is the one part of this file you are the only source for.",
  open_items: "Filled the next time we talk. This is the list of what is still owed.",
};

function awaitingBlock(key: string): string[] {
  return [AWAITING, "", AWAITING_FILL[key] ?? "Filled by evidence we do not have yet."];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function has<T>(list: T[] | null | undefined): list is T[] {
  return Array.isArray(list) && list.length > 0;
}

function quoteLine(line: EvidencedLine): string[] {
  const out: string[] = [`- ${clean(line.text) || AWAITING}`];
  const quote = clean(line.quote);
  if (quote) {
    const attribution = [clean(line.source_label), clean(line.occurred_at)]
      .filter(Boolean)
      .join(", ");
    out.push(`  > "${quote}"${attribution ? ` (${attribution})` : ""}`);
  }
  const situation = clean(line.situation);
  // A rule from a situated statement stays situated. Flattening it here is the
  // exact failure the boundary exists to prevent.
  if (situation) out.push(`  Situation: ${situation}`);
  return out;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * The discrimination line, in the shape the spec prints it:
 *
 *   7 of 9 rejected fail this (0.78). 1 of 11 accepted fails it (0.09). Gap 0.69. KEEP.
 *
 * When the counts are not there, this says "not tested" and gives the reason.
 * It never computes a rate from a zero denominator and it never prints a number
 * that was not measured.
 */
export function discriminationLine(criterion: RenderCriterion): string {
  const nRejected = criterion.n_rejected;
  const nAccepted = criterion.n_accepted;
  const rejectedFailing = criterion.n_rejected_failing;
  const acceptedFailing = criterion.n_accepted_failing;

  const complete =
    typeof nRejected === "number" && nRejected > 0 &&
    typeof nAccepted === "number" && nAccepted > 0 &&
    typeof rejectedFailing === "number" &&
    typeof acceptedFailing === "number";

  if (!complete) {
    const reason = clean(criterion.disc_reason);
    return `not tested. ${reason || "No graded items carried a checkable test for this."}`;
  }

  const rejectRate = rejectedFailing / nRejected;
  const acceptRate = acceptedFailing / nAccepted;
  const gap = typeof criterion.gap === "number" ? criterion.gap : rejectRate - acceptRate;
  const acceptVerb = acceptedFailing === 1 ? "fails" : "fail";
  const rejectVerb = rejectedFailing === 1 ? "fails" : "fail";
  return `${rejectedFailing} of ${nRejected} rejected ${rejectVerb} this (${fmt(rejectRate)}). ` +
    `${acceptedFailing} of ${nAccepted} accepted ${acceptVerb} it (${fmt(acceptRate)}). ` +
    `Gap ${fmt(gap)}. ${criterion.disc_verdict.toUpperCase()}.`;
}

function provenanceLine(criterion: RenderCriterion): string {
  const parts: string[] = [];
  const session = clean(criterion.provenance?.session);
  if (session) parts.push(session);
  const items = criterion.provenance?.items;
  if (Array.isArray(items) && items.length > 0) {
    parts.push(`items ${items.join(", ")}`);
  }
  return parts.length > 0
    ? parts.join(", ")
    : `${AWAITING}. This criterion cannot name where it came from, which means it did not come from you.`;
}

function criterionBlock(criterion: RenderCriterion, index: number): string[] {
  const out: string[] = [`### C${index}. ${clean(criterion.name) || "Unnamed"}`, ""];
  out.push(`- Emergent pole (your words): ${clean(criterion.emergent_pole) ? `"${clean(criterion.emergent_pole)}"` : AWAITING}`);
  out.push(`- Contrast pole (your words): ${clean(criterion.contrast_pole) ? `"${clean(criterion.contrast_pole)}"` : AWAITING}`);
  const rationale = clean(criterion.rationale);
  if (rationale) out.push(`- Rationale: "${rationale}"`);
  out.push(`- Check: ${clean(criterion.check_text) || AWAITING}`);
  out.push(`- Observable: ${clean(criterion.observable) || `${AWAITING}. Nothing here is machine-checkable yet.`}`);
  out.push(`- Weight: ${criterion.weight}`);
  out.push(`- Discrimination: ${discriminationLine(criterion)}`);
  const holds = clean(criterion.holds_example);
  const breaks = clean(criterion.breaks_example);
  if (holds) out.push(`- Holds, from your own graded work: "${holds}"`);
  if (breaks) out.push(`- Breaks, from your own graded work: "${breaks}"`);
  out.push(`- Provenance: ${provenanceLine(criterion)}`);
  return out;
}

function awaitingConstructBlock(construct: AwaitingConstruct): string[] {
  const out: string[] = [`- **${clean(construct.name) || "Unnamed"}** (${construct.disc_verdict})`];
  const pole = clean(construct.emergent_pole);
  if (pole) out.push(`  Your words: "${pole}"`);
  const contrast = clean(construct.contrast_pole);
  if (contrast) out.push(`  Against: "${contrast}"`);
  const observable = clean(construct.observable);
  out.push(`  Observable: ${observable || "none that a machine can check"}`);
  const counts = construct.counts;
  if (counts) {
    out.push(
      `  Counts: ${counts.n_rejected_failing} of ${counts.n_rejected} rejected fail it, ` +
        `${counts.n_accepted_failing} of ${counts.n_accepted} accepted fail it.` +
        (typeof counts.gap === "number" ? ` Gap ${fmt(counts.gap)}.` : ""),
    );
  }
  out.push(`  ${clean(construct.reason)}`);
  return out;
}

// ---------------------------------------------------------------------------
// Front matter and label
// ---------------------------------------------------------------------------

const DEFAULT_REVIEW_INTERVAL_DAYS = 90;

function frontMatter(profile: StandardProfile): string[] {
  const owner = clean(profile.owner);
  return [
    "---",
    `version: ${profile.version ?? 1}`,
    `last_reviewed: ${clean(profile.last_reviewed) || AWAITING}`,
    `review_interval: ${profile.review_interval_days ?? DEFAULT_REVIEW_INTERVAL_DAYS} days`,
    // The owner is the person, not whoever ran the compile. They can edit this
    // file, and the line below says so out loud.
    `owner: ${owner || `${AWAITING} (no name on file)`}`,
    `surface: ${clean(profile.surface) || AWAITING}`,
    `provenance: ${clean(profile.provenance) || AWAITING}`,
    "---",
  ];
}

export function labelParagraph(label: BaselineLabel, numbers?: StandardNumbers | null): string {
  const text = BASELINE_LABEL_TEXT[label];
  if (label === "verified") {
    const p = numbers?.precision;
    const r = numbers?.recall;
    const n = numbers?.held_out_graded;
    return `**${text}.** Measured against ${n} held-out pieces you graded before you saw any of this: ` +
      `precision ${typeof p === "number" ? fmt(p) : AWAITING}, recall ${typeof r === "number" ? fmt(r) : AWAITING}.`;
  }
  if (label === "provisional") {
    return `**${text}.** This is built from real grades and has not yet been measured against work it ` +
      `has never seen, so no accuracy number is claimed for it.`;
  }
  return `**${text}.** Nothing here is measured yet. No accuracy number is claimed, and you should read ` +
    `every line as a proposal you can strike out.`;
}

// ---------------------------------------------------------------------------
// The nine sections
// ---------------------------------------------------------------------------

function section(number: number, title: string, lines: string[]): string[] {
  return [`## ${number}. ${title}`, "", ...lines, ""];
}

function ownsSection(profile: StandardProfile): string[] {
  if (!has(profile.owns)) return section(1, "Owns", awaitingBlock("owns"));
  return section(1, "Owns", profile.owns.flatMap(quoteLine));
}

function recurringSection(profile: StandardProfile): string[] {
  if (!has(profile.recurring_work)) {
    return section(2, "Recurring work", awaitingBlock("recurring_work"));
  }
  return section(2, "Recurring work", profile.recurring_work.flatMap(quoteLine));
}

function domainSection(profile: StandardProfile): string[] {
  if (!has(profile.domains)) {
    return section(3, "Domain expertise, evidenced and not claimed", awaitingBlock("domains"));
  }
  const rows: string[] = [
    "| Domain | Level | Evidence | Can do unaided that a competent newcomer cannot | Last updated |",
    "|---|---|---|---|---|",
  ];
  for (const d of profile.domains) {
    rows.push(
      `| ${clean(d.domain)} | ${clean(d.level)} | ${clean(d.evidence)} | ` +
        `${clean(d.can_do_unaided) || AWAITING} | ${clean(d.last_updated) || AWAITING} |`,
    );
  }
  rows.push("");
  for (const d of profile.domains) {
    // The consequence line is not optional: the level alone tells a model
    // nothing about what to do differently, and scaffolding that helps a
    // beginner measurably hurts an expert.
    rows.push(`> ${clean(d.domain)}: ${clean(d.level)}. ${clean(d.evidence)}`);
    rows.push(`> Consequence: ${clean(d.consequence) || AWAITING}`);
    rows.push("");
  }
  return section(3, "Domain expertise, evidenced and not claimed", rows);
}

function artefactSection(profile: StandardProfile): string[] {
  if (!has(profile.artefacts)) return section(4, "Artefacts", awaitingBlock("artefacts"));
  const lines: string[] = [];
  for (const a of profile.artefacts) {
    lines.push(`- Signed off: ${clean(a.signed_off) || AWAITING}`);
    lines.push(`- Turned down: ${clean(a.rejected) || AWAITING}`);
    lines.push(`- The difference, your words: ${clean(a.difference_in_their_words) || AWAITING}`);
    lines.push("");
  }
  return section(4, "Artefacts", lines);
}

function constructSection(
  criteria: RenderCriterion[],
  constructs: AwaitingConstruct[],
): string[] {
  const lines: string[] = [];
  const kept = [...criteria].sort(byWeightLoadOrder);

  if (kept.length === 0) {
    lines.push(...awaitingBlock("constructs"));
    lines.push("");
    lines.push(
      "Nothing here is a rubric yet. Below is what the sort found and why each one stopped short, " +
        "which is the standard telling you what it does not yet contain.",
    );
    lines.push("");
  } else {
    lines.push(
      "These are the checks that separated your accepted work from your rejected work. " +
        "Order is load order: the ones at the top are the ones that get applied.",
    );
    lines.push("");
    kept.forEach((criterion, i) => {
      lines.push(...criterionBlock(criterion, i + 1));
      lines.push("");
    });
  }

  if (has(constructs)) {
    lines.push(`### ${AWAITING}: constructs that did not become criteria`);
    lines.push("");
    for (const construct of constructs) {
      lines.push(...awaitingConstructBlock(construct));
      lines.push("");
    }
  }

  return section(5, "Constructs", lines);
}

function constraintSection(profile: StandardProfile): string[] {
  if (!has(profile.hard_constraints)) {
    return section(6, "Hard constraints", awaitingBlock("hard_constraints"));
  }
  return section(6, "Hard constraints", profile.hard_constraints.flatMap(quoteLine));
}

function audienceSection(profile: StandardProfile): string[] {
  if (!has(profile.audiences)) {
    return section(7, "Audience and purpose per output type", awaitingBlock("audiences"));
  }
  const lines = ["| Output | Who reads it | What it has to do |", "|---|---|---|"];
  for (const a of profile.audiences) {
    lines.push(`| ${clean(a.output_type)} | ${clean(a.audience)} | ${clean(a.job)} |`);
  }
  return section(7, "Audience and purpose per output type", lines);
}

function failureSection(profile: StandardProfile): string[] {
  if (!has(profile.failure_modes)) {
    return section(8, "Witnessed failure modes", awaitingBlock("failure_modes"));
  }
  return section(8, "Witnessed failure modes", profile.failure_modes.flatMap(quoteLine));
}

function toneSection(profile: StandardProfile): string[] {
  // The label is load-bearing. This is the one section built from what someone
  // said about themselves rather than what they did, it is the weakest evidence
  // in the document, and a reader will assume it is the most authoritative
  // because it is the most legible.
  const header = "_Cosmetic, self-declared, and yours to edit._";
  const tone = clean(profile.tone);
  if (!tone) {
    return section(9, "Surface tone preference", [header, "", ...awaitingBlock("tone")]);
  }
  return section(9, "Surface tone preference", [header, "", tone]);
}

function priorSection(profile: StandardProfile): string[] {
  // The tenth section exists only when there is evidence for it. profile.md:
  // "Add a tenth if you have the evidence." An empty tenth would be an AWAITING
  // for a section nobody promised.
  if (!has(profile.correct_priors)) return [];
  const lines: string[] = [];
  for (const p of profile.correct_priors) {
    lines.push(`> ${clean(p.model_default)}`);
    lines.push(`> Instead: ${clean(p.needs_instead)}`);
    const quote = clean(p.quote);
    if (quote) lines.push(`> Your words${clean(p.date) ? `, ${clean(p.date)}` : ""}: "${quote}"`);
    lines.push("");
  }
  return section(10, "Correct priors", lines);
}

function baselineSection(numbers: StandardNumbers | null | undefined, label: BaselineLabel): string[] {
  const lines: string[] = [];
  const heldOut = numbers?.held_out_graded ?? 0;
  const precision = numbers?.precision;
  const recall = numbers?.recall;

  if (typeof precision === "number" && heldOut > 0) {
    lines.push(
      `Baseline: ${heldOut} held-out items. Precision ${fmt(precision)}` +
        (typeof recall === "number" ? `, recall ${fmt(recall)}` : "") +
        (typeof numbers?.tnr === "number" ? `, TNR ${fmt(numbers.tnr)}` : "") +
        (clean(numbers?.measured_at) ? ` as of ${clean(numbers?.measured_at)}` : "") + ".",
    );
  } else if (heldOut > 0) {
    lines.push(
      `Baseline: none yet. ${heldOut} held-out items are graded and nothing has been run against them, ` +
        "so there is no honest way to say whether this improved anything.",
    );
  } else {
    lines.push(
      "Baseline: none. No held-out set was graded, so there is no honest way to measure whether this " +
        "improved anything, only whether you keep using it.",
    );
  }

  const agreement = numbers?.self_agreement;
  if (agreement && agreement.total > 0) {
    lines.push("");
    lines.push(
      `Self-agreement: you graded ${agreement.matched} of ${agreement.total} repeated pieces the same way ` +
        "the second time. That number is about the grading, not about the work, and it is reported here " +
        "because a rubric cannot be more consistent than the person it came from.",
    );
  } else {
    lines.push("");
    lines.push(
      `Self-agreement: ${AWAITING}. Too few repeated pieces were graded to check whether the same piece ` +
        "gets the same answer twice.",
    );
  }

  const split = numbers?.pair_split;
  if (split && split.total > 0) {
    lines.push("");
    lines.push(
      `Pair split: ${split.split} of ${split.total} matched pairs separated the way they were built to. ` +
        "That is the check on the item generator, not on you.",
    );
  }

  const triageReason = clean(numbers?.triage_reason);
  if (triageReason) {
    lines.push("");
    lines.push(triageReason);
  }

  lines.push("");
  lines.push(`Label: ${BASELINE_LABEL_TEXT[label]}.`);
  return ["## Baseline", "", ...lines, ""];
}

function openItemsSection(profile: StandardProfile): string[] {
  const lines = has(profile.open_items)
    ? profile.open_items.flatMap(quoteLine)
    : awaitingBlock("open_items");
  return ["## Open items", "", ...lines, ""];
}

// ---------------------------------------------------------------------------
// renderStandardMarkdown
// ---------------------------------------------------------------------------

/**
 * my-standard.md.
 *
 * Nothing in here is generated prose. Every line is either something the person
 * did, something they said verbatim, a number that was measured, or the word
 * AWAITING with one line on what would fill it.
 */
export function renderStandardMarkdown(input: RenderStandardInput): string {
  const { criteria, constructs, profile, label } = input;
  const numbers = input.numbers ?? null;

  const owner = clean(profile.owner);
  const title = owner ? `# ${owner}: the standard` : "# Your standard";

  const out: string[] = [
    ...frontMatter(profile),
    "",
    title,
    "",
    labelParagraph(label, numbers),
    "",
    "This file is yours. Every line is either something you did, something you said in your own words, " +
      "or the word AWAITING with one line on what would fill it. If a line is wrong, edit it: a file you " +
      "cannot change is a file about you rather than a file for you.",
    "",
    ...ownsSection(profile),
    ...recurringSection(profile),
    ...domainSection(profile),
    ...artefactSection(profile),
    ...constructSection(criteria, constructs),
    ...constraintSection(profile),
    ...audienceSection(profile),
    ...failureSection(profile),
    ...toneSection(profile),
    ...priorSection(profile),
    ...baselineSection(numbers, label),
    ...openItemsSection(profile),
  ];

  // Collapse runs of blank lines so a mostly-AWAITING file still reads as one
  // document rather than as a sequence of gaps.
  const collapsed: string[] = [];
  for (const line of out) {
    if (line === "" && collapsed[collapsed.length - 1] === "") continue;
    collapsed.push(line);
  }
  return `${collapsed.join("\n").trimEnd()}\n`;
}

/** The filename the download uses. One file, one name, every time. */
export const STANDARD_FILENAME = "my-standard.md";

/** The artifact row name, so the Library and the download agree. */
export function standardArtifactName(surface: string): string {
  const s = clean(surface);
  return s ? `My standard: ${s}` : "My standard";
}
