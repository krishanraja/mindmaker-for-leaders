/**
 * skill-release: what a delivery screen is allowed to say about a built skill.
 *
 * Pure module. No Deno imports, no I/O, no clock, so vitest runs it directly
 * and both the edge writer and the React reader share ONE implementation.
 *
 * ---------------------------------------------------------------------------
 * Why this exists at all
 * ---------------------------------------------------------------------------
 *
 * The package writer labels a skill 'provisional' whenever any compiled
 * criterion exists and 'draft' otherwise. That is a label derived from the
 * EXISTENCE of a rubric, which is precisely the inference releaseVerdict was
 * built to forbid: a compiled standard is a thing that exists, not a thing that
 * was measured. So the label a leader is shown at delivery comes from here, and
 * here goes through releaseVerdict, which is the one door to the word Verified.
 *
 * ---------------------------------------------------------------------------
 * Whose numbers are these
 * ---------------------------------------------------------------------------
 *
 * Nothing measures a generated skill package directly. What HAS been measured,
 * when the leader has run the chain, is the standard the package's rules were
 * compiled from. Those numbers are worth carrying, and they are also the
 * easiest thing in this codebase to over-claim with, so two rules hold:
 *
 *   1. Every number keeps its provenance. `measured_on: 'standard'` means the
 *      measurement is about the standard, not about this skill, and the
 *      rendered sentence says that in words.
 *   2. A missing number stays missing. No default, no zero standing in for an
 *      absent measurement, no label lifted because a rubric was found.
 *
 * A leader with no compiled standard gets Draft and the sentence "No
 * measurement exists", which is true and is the common case.
 */

import { releaseVerdict, storedMetrics, type Metrics } from "./confusion.ts";
import { BASELINE_LABEL_TEXT, type BaselineLabel } from "./discrimination.ts";

export interface SelfAgreementCounts {
  matched: number;
  total: number;
}

export interface SkillReleaseNumbers {
  /** Held-out items carrying a real grade. Null when nothing was measured. */
  held_out_graded: number | null;
  precision: number | null;
  recall: number | null;
  tnr: number | null;
  self_agreement: SelfAgreementCounts | null;
  /**
   * What the numbers are ABOUT. 'standard' is the only value written today: the
   * compiled standard these rules came from. Null means there are no numbers.
   */
  measured_on: "standard" | null;
  /** The generated_artifacts row the numbers were read off. */
  measurement_artifact_id: string | null;
}

export interface SkillRelease {
  label: BaselineLabel;
  /** "Draft" / "Provisional" / "Verified". */
  labelText: string;
  /** releaseVerdict's own sentence, plus the provenance line when numbers exist. */
  reason: string;
  numbers: SkillReleaseNumbers;
  /** The criteria version the package was rendered from. 0 means no standard. */
  criteriaVersion: number;
  renderedAt: string | null;
}

export const NO_NUMBERS: SkillReleaseNumbers = {
  held_out_graded: null,
  precision: null,
  recall: null,
  tnr: null,
  self_agreement: null,
  measured_on: null,
  measurement_artifact_id: null,
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function count(value: unknown): number {
  const n = num(value);
  return n !== null && n > 0 ? Math.floor(n) : 0;
}

function agreementFrom(value: unknown): SelfAgreementCounts | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const total = count(raw.total);
  if (total <= 0) return null;
  return { matched: count(raw.matched), total };
}

/**
 * The numbers a compiled standard artefact recorded, in the shape a skill
 * carries them. Anything absent stays absent.
 */
export function numbersFromStandardMetadata(
  metadata: Record<string, unknown> | null | undefined,
  artifactId: string | null,
): SkillReleaseNumbers {
  const meta = metadata ?? {};
  const precision = num(meta.precision);
  const recall = num(meta.recall);
  const tnr = num(meta.tnr);
  const heldOut = num(meta.held_out_graded);
  const agreement = agreementFrom(meta.self_agreement);
  const anything = precision !== null || recall !== null || tnr !== null ||
    heldOut !== null || agreement !== null;
  if (!anything) return NO_NUMBERS;
  return {
    held_out_graded: heldOut,
    precision,
    recall,
    tnr,
    self_agreement: agreement,
    measured_on: "standard",
    measurement_artifact_id: artifactId,
  };
}

/** The metrics object releaseVerdict reads, or null when nothing was measured. */
function metricsFor(numbers: SkillReleaseNumbers): Metrics | null {
  if (numbers.precision === null && numbers.recall === null && numbers.tnr === null) return null;
  return storedMetrics({
    precision: numbers.precision,
    recall: numbers.recall,
    tnr: numbers.tnr,
    n: numbers.held_out_graded ?? 0,
  });
}

/**
 * The sentence that keeps the numbers attached to what they measured.
 *
 * Without it, "Precision 0.82 over 12 scored pieces" beside a skill name reads
 * as a claim about the skill. It is a claim about the standard the skill's
 * rules were compiled from, which is a weaker and true thing.
 */
const STANDARD_PROVENANCE =
  "Those numbers are from the standard these rules were compiled from, not from a test of this " +
  "skill. Nothing has run this package against work you graded.";

/**
 * The verdict, from numbers only.
 *
 * releaseVerdict is called with what exists and nothing else. A skill with no
 * measurement behind it lands on Draft with a sentence saying no measurement
 * exists, which is the honest description of almost every skill built today.
 */
export function skillRelease(input: {
  numbers?: SkillReleaseNumbers | null;
  criteriaVersion?: number | null;
  renderedAt?: string | null;
}): SkillRelease {
  const numbers = input.numbers ?? NO_NUMBERS;
  const verdict = releaseVerdict({
    metrics: metricsFor(numbers),
    heldOutGraded: numbers.held_out_graded ?? 0,
    selfAgreement: numbers.self_agreement,
  });
  const reason = numbers.measured_on === "standard"
    ? `${verdict.reason} ${STANDARD_PROVENANCE}`
    : verdict.reason;
  return {
    label: verdict.label,
    labelText: BASELINE_LABEL_TEXT[verdict.label],
    reason,
    numbers,
    criteriaVersion: count(input.criteriaVersion),
    renderedAt: typeof input.renderedAt === "string" && input.renderedAt ? input.renderedAt : null,
  };
}

/**
 * Read a skill artefact's stored release block back.
 *
 * The stored label is NOT trusted on its own. It is re-derived from the numbers
 * sitting beside it, exactly as readStandardMeta does, so a row that says
 * 'verified' with nothing under it renders as what it is. A writer older than
 * this field produces Draft, which is the correct answer for an artefact that
 * recorded no measurement.
 */
export function readSkillRelease(
  metadata: Record<string, unknown> | null | undefined,
): SkillRelease {
  const meta = metadata ?? {};
  const stored = (meta.release ?? {}) as Record<string, unknown>;
  const numbersRaw = (stored.numbers ?? null) as Record<string, unknown> | null;
  const numbers: SkillReleaseNumbers = numbersRaw
    ? {
      held_out_graded: num(numbersRaw.held_out_graded),
      precision: num(numbersRaw.precision),
      recall: num(numbersRaw.recall),
      tnr: num(numbersRaw.tnr),
      self_agreement: agreementFrom(numbersRaw.self_agreement),
      measured_on: numbersRaw.measured_on === "standard" ? "standard" : null,
      measurement_artifact_id: typeof numbersRaw.measurement_artifact_id === "string"
        ? numbersRaw.measurement_artifact_id
        : null,
    }
    : NO_NUMBERS;
  return skillRelease({
    numbers,
    criteriaVersion: num(meta.criteria_version),
    renderedAt: typeof meta.rendered_at === "string" ? meta.rendered_at : null,
  });
}

/** The three numbers, when they exist, for a surface that shows numbers. */
export function threeNumbers(release: SkillRelease): string | null {
  const { precision, recall, tnr, held_out_graded: n } = release.numbers;
  if (precision === null && recall === null && tnr === null) return null;
  const fmt = (v: number | null): string => (v === null ? "not measurable" : v.toFixed(2));
  const over = n !== null && n > 0 ? `, over ${n} scored ${n === 1 ? "piece" : "pieces"}` : "";
  return `Precision ${fmt(precision)}, recall ${fmt(recall)}, TNR ${fmt(tnr)}${over}.`;
}
