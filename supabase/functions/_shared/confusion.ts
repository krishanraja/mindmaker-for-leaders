/**
 * confusion: the measurement arithmetic for stage 5 of the harness chain.
 *
 * Pure. No Deno imports, no network, no clock, no randomness. vitest runs this
 * file directly; scripts/eval-skill.mjs imports it and holds no measurement
 * logic of its own, and standard-render imports it so the file a person reads
 * and the script that produced the numbers cannot disagree.
 *
 * This is the stage that decides whether the product may use the word
 * "verified", so the whole module is written around one rule: a number that was
 * not measured is never printed, and an absent measurement is never rendered as
 * a zero. Those are two different facts about the world and collapsing them is
 * how a gate ends up claiming a precision it never had.
 *
 * ---------------------------------------------------------------------------
 * What is measured, and why the positive class is "would not send"
 * ---------------------------------------------------------------------------
 *
 * Does the gate agree with the person on work it never trained on. For each
 * held-out item the Standard lens runs over the body with the compiled rubric
 * loaded and exemplars drawn from the TRAINING set only, and its verdict is
 * compared to what the person said.
 *
 * "would not send" is the positive class, because catching what they would
 * reject is the job:
 *
 *     TP = person would_not_send, gate breaks
 *     FP = person send,           gate breaks   <- the ones that get it ignored
 *     FN = person would_not_send, gate holds
 *     TN = person send,           gate holds
 *
 * All three of precision, recall and TNR are reported SEPARATELY, and never
 * rolled into one agreement number. Raw agreement is misleading under class
 * imbalance (a gate that holds on everything scores well when the person sends
 * most things and is worth nothing), and the number that actually matters is
 * TNR on their rejects.
 *
 * ---------------------------------------------------------------------------
 * The ruled challenges this implements
 * ---------------------------------------------------------------------------
 *
 *   CH-03  The degenerate case is a first-class outcome, not an error path.
 *          When zero criteria load, the Standard lens judges against an empty
 *          rubric, TP and FP are both 0, and precision is 0/0. That is NaN,
 *          which satisfies neither row of 4.7b's release table and renders as
 *          "NaN" on the screen at item 30. So metricsFrom returns NULL for any
 *          zero-denominator metric: null is an absent measurement, 0 is a
 *          measured zero, and the two must stay distinguishable everywhere
 *          downstream. Callers render "baseline: none", never a figure.
 *
 *   CH-12  Self-agreement is the ceiling on precision and is reported beside
 *          it. An inconsistent grader produces the same signature as a
 *          confounded generator, and a gate cannot be more consistent than the
 *          person it was built from, so a grader whose repeats disagree caps
 *          the label at Provisional however good the arithmetic looks. That cap
 *          comes from the already-ruled triage in ./discrimination.ts rather
 *          than from a second copy of the rule.
 *
 * Thresholds are all [U] in the spec and every one of them lives in
 * ./discrimination.ts, marked PROVISIONAL, PENDING DATA. They are imported here
 * rather than restated, because two copies of a release threshold is how a
 * product ends up shipping under a bar nobody agreed to.
 */

import {
  baselineLabel,
  labelCeilingForTriage,
  PROVISIONAL_MIN_PRECISION,
  triageFromSelfAgreement,
  VERIFIED_MIN_HELD_OUT,
  VERIFIED_MIN_PRECISION,
  VERIFIED_MIN_RECALL,
  weakerLabel,
  type BaselineLabel,
} from "./discrimination.ts";
import type { SelfAgreementResult, Verdict } from "./sort-composition.ts";

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/**
 * PROVISIONAL, PENDING DATA. Spec 4.7b's release floor: below this the gate
 * flags too much work the person would have sent, and a gate that cries wolf
 * gets ignored, which is worse than no gate. Return to stage 3.
 *
 * Note the deliberate gap between this and VERIFIED_MIN_PRECISION (0.8): 4.7b's
 * release row and the ruled verified floor are different bars, both [U]. A
 * standard between them is releasable and is NOT verified, and releaseVerdict
 * says which of the two it means rather than letting the looser number quietly
 * license the stronger word.
 */
export const RELEASE_MIN_PRECISION = PROVISIONAL_MIN_PRECISION;

/** PROVISIONAL, PENDING DATA. 4.7b's release row asks for recall too. */
export const RELEASE_MIN_RECALL = 0.6;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** What the person said. 'skip' is an escape, never a middle point. */
export type HumanVerdict = Verdict;

/**
 * What the gate said about the same item.
 *
 * 'insufficient' is the critic's "I could not point at a passage in this work",
 * which is a refusal to score rather than a score. It never becomes a holds.
 */
export type GateVerdict = "holds" | "breaks" | "insufficient";

export interface MeasuredPair {
  human: HumanVerdict;
  gate: GateVerdict;
  /** Optional, for reporting which item fell where. Never used in the counts. */
  itemId?: string;
}

/** Counted, printed, never folded into the matrix. A shrinking denominator has to be visible. */
export interface ExcludedCounts {
  /** The person skipped it. Excluded from every calculation in this instrument. */
  skipped: number;
  /** The gate refused to score it. Not a holds and not a breaks. */
  insufficient: number;
  total: number;
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  excluded: ExcludedCounts;
}

/** Raised rather than coerced: an unrecognised verdict counted as anything is a silent lie. */
export class UnknownVerdictError extends Error {
  constructor(field: "human" | "gate", value: unknown) {
    super(`Unrecognised ${field} verdict: ${JSON.stringify(value)}`);
    this.name = "UnknownVerdictError";
  }
}

const HUMAN_VERDICTS = new Set<string>(["send", "would_not_send", "skip"]);
const GATE_VERDICTS = new Set<string>(["holds", "breaks", "insufficient"]);

/**
 * The four cells, with "would not send" as the positive class.
 *
 * Skips and insufficient-evidence gate verdicts are EXCLUDED and counted
 * separately. Neither is coerced into a cell: a skip scored as a send would
 * invent an opinion the person declined to give, and an insufficient scored as
 * a holds would credit the gate with agreeing when it said it could not tell.
 *
 * A skip is counted as a skip even when the gate also refused, because the
 * person's escape is the earlier and larger fact about that row.
 */
export function confusionMatrix(pairs: readonly MeasuredPair[]): ConfusionMatrix {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let skipped = 0;
  let insufficient = 0;

  for (const pair of pairs) {
    if (!HUMAN_VERDICTS.has(pair.human as string)) throw new UnknownVerdictError("human", pair.human);
    if (!GATE_VERDICTS.has(pair.gate as string)) throw new UnknownVerdictError("gate", pair.gate);

    if (pair.human === "skip") {
      skipped += 1;
      continue;
    }
    if (pair.gate === "insufficient") {
      insufficient += 1;
      continue;
    }

    const flagged = pair.gate === "breaks";
    if (pair.human === "would_not_send") {
      if (flagged) tp += 1;
      else fn += 1;
    } else {
      if (flagged) fp += 1;
      else tn += 1;
    }
  }

  return { tp, fp, fn, tn, excluded: { skipped, insufficient, total: skipped + insufficient } };
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface Metrics {
  /** TP / (TP + FP). Null when the gate flagged nothing: 0/0 is not a zero. */
  precision: number | null;
  /** TP / (TP + FN). Null when there was nothing they would have rejected. */
  recall: number | null;
  /** TN / (TN + FP). Null when there was nothing they would have sent. */
  tnr: number | null;
  /** Items that landed in a cell. Excluded items are deliberately not in here. */
  n: number;
  /**
   * The counts the plain-language sentences are made of.
   *
   * Carried on the metrics rather than passed alongside them so that the
   * rendering can never be handed three rates with no counts behind them and be
   * forced to invent a denominator to make a sentence out of. Null only when
   * the metrics were read back from a store that did not keep the counts, and
   * the rendering says exactly that rather than guessing.
   */
  counts: ConfusionMatrix | null;
}

/** Six decimal places, so a rate reads as the fraction it is rather than as float noise. */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Null, never NaN, never 0, when a denominator is zero.
 *
 * This is the whole of CH-03 in one function. 0/0 is NaN, NaN satisfies neither
 * release row, and a NaN that gets defaulted to 0 somewhere downstream reads as
 * "measured, and terrible" when the truth is "not measured at all". A
 * zero-denominator metric is an ABSENT MEASUREMENT and it stays distinguishable
 * from a measured zero all the way to the screen.
 */
function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return round6(numerator / denominator);
}

export function metricsFrom(m: ConfusionMatrix): Metrics {
  return {
    precision: ratio(m.tp, m.tp + m.fp),
    recall: ratio(m.tp, m.tp + m.fn),
    tnr: ratio(m.tn, m.tn + m.fp),
    n: m.tp + m.fp + m.fn + m.tn,
    counts: m,
  };
}

/** The honest empty measurement: nothing was run, and every metric says so. */
export const NO_MEASUREMENT: Metrics = {
  precision: null,
  recall: null,
  tnr: null,
  n: 0,
  counts: null,
};

/**
 * Rates read back from a store (artifact metadata, a run row) that kept the
 * numbers but not the matrix.
 *
 * Deliberately NOT a way to conjure a metric: every field is required, a
 * non-finite value becomes null rather than passing through, and counts stay
 * null so the plain-language rendering says the counts are missing instead of
 * inventing them.
 */
export function storedMetrics(input: {
  precision: number | null;
  recall: number | null;
  tnr: number | null;
  n: number;
  counts?: ConfusionMatrix | null;
}): Metrics {
  const clean = (v: number | null): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    precision: clean(input.precision),
    recall: clean(input.recall),
    tnr: clean(input.tnr),
    n: Number.isFinite(input.n) && input.n > 0 ? Math.floor(input.n) : 0,
    counts: input.counts ?? null,
  };
}

// ---------------------------------------------------------------------------
// The release verdict
// ---------------------------------------------------------------------------

export interface ReleaseInput {
  /** Null or NO_MEASUREMENT when no measurement stage has run. */
  metrics?: Metrics | null;
  /** Held-out items carrying a real grade. Not the number the gate scored. */
  heldOutGraded: number;
  /** The grader's test-retest over the repeat probes. Absent counts as unmeasured. */
  selfAgreement?: SelfAgreementResult | null;
}

export interface ReleaseOutcome {
  label: BaselineLabel;
  /** Why this label and not a stronger one, in the words the person reads. */
  reason: string;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * Draft, Provisional or Verified, and the sentence that says why.
 *
 * This is the ONLY door to the word Verified. Anywhere a label is shown it
 * comes from here, never from the existence of a rubric: a compiled standard is
 * a thing that exists, not a thing that was measured, and the entire failure
 * this chain was built to prevent is the second being inferred from the first.
 *
 * The order below is the order the constraints are REPORTED in, and it is the
 * order they bind in. Every branch computes the same label; what changes is
 * which constraint the sentence names, and it names the one that is actually
 * holding the label down:
 *
 *   1. nothing was run                 -> Draft, and say no measurement exists
 *   2. precision has no denominator    -> Draft (CH-03: 0/0 is not a score)
 *   3. fewer than 10 held-out graded   -> capped, and say the floor is not met
 *   4. precision below the release     -> Draft; too many false positives and
 *      floor                              the gate gets ignored. Back to stage 3.
 *                                         Ahead of the grader cap on purpose: a
 *                                         gate under the floor goes back however
 *                                         consistent the person was
 *   5. the grader disagrees with       -> capped at Provisional (CH-12), because
 *      themselves                         precision cannot exceed the grader's
 *                                         own consistency
 *   6. everything clears               -> Verified, with all three numbers
 */
export function releaseVerdict(input: ReleaseInput): ReleaseOutcome {
  const metrics = input.metrics ?? NO_MEASUREMENT;
  const heldOutGraded = Number.isFinite(input.heldOutGraded) ? Math.max(0, Math.floor(input.heldOutGraded)) : 0;
  const agreement: SelfAgreementResult = input.selfAgreement ?? { matched: 0, total: 0 };

  const triage = triageFromSelfAgreement(agreement);
  const ceiling = labelCeilingForTriage(triage.triage);
  const measured = baselineLabel({
    heldOutGraded,
    precision: metrics.precision,
    recall: metrics.recall,
  });
  const label = weakerLabel(measured, ceiling);

  const consistency = agreement.total > 0
    ? `You graded ${agreement.matched} of ${agreement.total} repeated pieces the same way the second time, ` +
      "and a check cannot be more consistent than the person it came from."
    : "There were too few repeated pieces to check whether the same piece gets the same answer twice, " +
      "so the ceiling on this is unknown rather than high.";

  // 1. Nothing ran.
  if (metrics.n === 0 && metrics.precision === null) {
    return {
      label,
      reason:
        "No measurement exists. Nothing has been run against the pieces you graded before you saw any " +
        "of this, so there is no accuracy number for it and none is claimed.",
    };
  }

  // 2. CH-03's degenerate case: the gate flagged nothing, so precision is 0/0.
  if (metrics.precision === null) {
    return {
      label: weakerLabel("draft", ceiling),
      reason:
        `The check ran on ${metrics.n} held-out pieces and flagged none of them, so there is no ` +
        "precision to report. Nothing divided by nothing is not a score of zero, it is an absent " +
        "measurement, and a check that never fires has not been shown to do anything.",
    };
  }

  const three = `Precision ${fmt(metrics.precision)}` +
    (metrics.recall !== null ? `, recall ${fmt(metrics.recall)}` : ", recall not measurable") +
    (metrics.tnr !== null ? `, TNR ${fmt(metrics.tnr)}` : ", TNR not measurable") +
    `, over ${metrics.n} scored pieces.`;

  // 3. The floor on the size of the hold-out.
  if (heldOutGraded < VERIFIED_MIN_HELD_OUT) {
    const pieces = `${heldOutGraded} ${heldOutGraded === 1 ? "piece" : "pieces"}`;
    return {
      label,
      reason:
        `${three} That rests on ${pieces} of graded held-out work, below the floor of ` +
        `${VERIFIED_MIN_HELD_OUT}. A number about ${pieces} is a number about ${pieces}, so Verified ` +
        "is not available here whatever the arithmetic says.",
    };
  }

  // 4. The release floor. Checked before the ceiling so the binding constraint
  // is the one named: a gate under the floor goes back to stage 3 regardless of
  // how consistent the grader was.
  if (metrics.precision < RELEASE_MIN_PRECISION) {
    return {
      label: weakerLabel("draft", ceiling),
      reason:
        `${three} Precision is below ${fmt(RELEASE_MIN_PRECISION)}: too much of what it flags is work ` +
        "you would have sent, and a check that cries wolf gets ignored, which is worse than no check. " +
        "This goes back to the compile step rather than out as a standard.",
    };
  }

  // 5. The grader's own consistency caps what the arithmetic may claim.
  if (ceiling !== "verified" && measured === "verified") {
    return {
      label,
      reason:
        `${three} ${consistency} That caps this at ${label === "draft" ? "Draft" : "Provisional"} ` +
        "however good those numbers look.",
    };
  }

  if (label === "verified") {
    return {
      label,
      reason:
        `${three} Measured against ${heldOutGraded} pieces you graded before you saw any of this. ` +
        consistency,
    };
  }

  const belowVerified: string[] = [];
  if (metrics.precision < VERIFIED_MIN_PRECISION) {
    belowVerified.push(`precision is under ${fmt(VERIFIED_MIN_PRECISION)}`);
  }
  if (metrics.recall === null) belowVerified.push("recall could not be measured");
  else if (metrics.recall < VERIFIED_MIN_RECALL) {
    belowVerified.push(`recall is under ${fmt(VERIFIED_MIN_RECALL)}`);
  }

  const releasable = metrics.precision >= RELEASE_MIN_PRECISION &&
    metrics.recall !== null && metrics.recall >= RELEASE_MIN_RECALL;

  return {
    label,
    reason: `${three} ${
      releasable
        ? "That clears the release floor, so the numbers ship with it, "
        : "That is real but short of the bar, "
    }${belowVerified.length > 0 ? `and ${belowVerified.join(" and ")}, ` : ""}so it is ${
      label === "draft" ? "a Draft" : "Provisional"
    } rather than Verified.`,
  };
}

// ---------------------------------------------------------------------------
// The plain-language rendering
// ---------------------------------------------------------------------------

/** What the completion screen and the standard say when nothing has been measured. */
export const MEASUREMENT_ABSENT =
  "Nothing has been checked against the pieces you graded before you saw any of this, so there is no " +
  "accuracy number here and none is claimed.";

/**
 * The three numbers, in counts, in the words a person actually reads.
 *
 *   "Of the things you would not have sent, it caught 4 of 5.
 *    It also flagged 1 you would have sent."
 *
 * Never a percentage: a percentage over five items is a made-up denominator
 * wearing a statistic's clothes, and 80 percent reads far heavier than 4 of 5.
 * Never one number either, because the two sides fail differently and the one
 * that gets a gate switched off is the second sentence, not the first.
 *
 * When a metric is null this says what is missing rather than printing a figure.
 */
export function formatNumbersForPeople(metrics: Metrics | null | undefined): string[] {
  const m = metrics ?? NO_MEASUREMENT;

  if (!m.counts) {
    if (m.precision === null && m.recall === null && m.tnr === null) return [MEASUREMENT_ABSENT];
    return [
      "A measurement exists for this, but the counts behind it were not kept, so there is nothing " +
      "plain to say about what it caught. Running the check again puts them back.",
    ];
  }

  const { tp, fp, fn, tn, excluded } = m.counts;
  const rejected = tp + fn;
  const sent = tn + fp;
  const lines: string[] = [];

  if (rejected === 0) {
    lines.push(
      "None of the pieces it was checked on were ones you turned down, so there is nothing yet to say " +
      "about what it catches.",
    );
  } else {
    lines.push(`Of the things you would not have sent, it caught ${tp} of ${rejected}.`);
  }

  if (sent === 0) {
    lines.push(
      "None of them were ones you would have sent, so there is nothing yet to say about how often it " +
      "flags work you were happy with.",
    );
  } else if (fp === 0) {
    lines.push(`It flagged none of the ${sent} you would have sent.`);
  } else {
    lines.push(`It also flagged ${fp} you would have sent.`);
  }

  if (excluded.total > 0) {
    const parts: string[] = [];
    if (excluded.skipped > 0) parts.push(`${excluded.skipped} you skipped`);
    if (excluded.insufficient > 0) {
      parts.push(`${excluded.insufficient} it could not point at anything in`);
    }
    lines.push(
      `${excluded.total} ${excluded.total === 1 ? "piece is" : "pieces are"} not in those numbers: ` +
      `${parts.join(", and ")}.`,
    );
  }

  return lines;
}
