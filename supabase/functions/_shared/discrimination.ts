/**
 * discrimination: the compile arithmetic for stage 3a of the harness chain.
 *
 * Pure. No Deno imports, no network, no clock, no randomness. vitest runs this
 * file directly; compile-standard imports it and holds no compile logic of its
 * own. The deck arithmetic it sits on top of lives in ./sort-composition.ts and
 * is reused here rather than reimplemented (pairSplitRate, selfAgreement,
 * haltVerdict, KILL_MIN_EACH_SIDE).
 *
 * The mechanics below are NOT the ones in spec section 4.3. They are the
 * mechanics as amended by the ruled CHALLENGE.md register:
 *
 *   CH-03  The discrimination test as specced was one global switch on the
 *          person's grade split, with nothing anywhere that computed
 *          n_rejected_failing. Nothing applied a candidate criterion to the
 *          training items, and doing it with an LLM would have been 100 to 160
 *          zero-shot judgements, the exact configuration section 9 forbids. So
 *          the failing counts come from a DETERMINISTIC probe (parseProbe /
 *          applyProbe below), and a construct that cannot yield a checkable
 *          probe is written 'untested' with the reason, never scored quietly.
 *
 *   CH-04  Clustering on grade vectors is undefined at this n: constructs are
 *          targeted by disjoint pairs, so any two constructs share zero graded
 *          items and agreement is 0/0. Clustering here runs on the
 *          CRITERION-APPLICATION vector instead: each criterion's fail/hold
 *          vector over the SAME training items, which is a shared index set by
 *          construction and makes 0.8 a stated significance level rather than a
 *          number with nothing behind it. Never text similarity: two people, or
 *          one person on two days, use the same words for different dimensions.
 *
 *   CH-12  An inconsistent grader produces the same signature as a confounded
 *          generator (flat gaps, everything untested). triageFromSelfAgreement
 *          reads the repeat probes and routes the person to the harness product,
 *          a provisional one, or the honest template-plus-voice product, before
 *          a rubric is compiled at all.
 *
 * ---------------------------------------------------------------------------
 * The unit question, stated in the open because the choice is load-bearing
 * ---------------------------------------------------------------------------
 *
 * CH-03's INSTEAD says "define n per criterion over items whose `targets`
 * contain it". Under the ruled composition (5 constructs x 2 pairs) that set is
 * at most FOUR items per construct, so the 4-accepted-and-4-rejected
 * sufficiency rule can never be satisfied on it: 4 accepted would leave 0
 * rejected. A rule that is provably always 'untested' is a dead branch, not a
 * measurement.
 *
 * So the verdict-bearing counts are taken over the items the criterion's probe
 * could actually be APPLIED to (every training item with a scoreable verdict
 * and a body), and the per-construct targeted counts are computed alongside and
 * reported. That is exactly what CH-03's own falsification plan asks for: "log
 * per-construct n and the global split beside the gap distribution and compare
 * kill rates under each unit." Both units ship in every summary; the tuning log
 * decides which one is right, on data, later.
 *
 * What is NOT global any more, and this is the whole of CH-03 defect 1: the
 * FAILING counts. They come from a probe that differs per criterion, so two
 * criteria over the same 20 items produce different gaps. Under the spec, they
 * could not.
 */

import {
  KILL_MIN_EACH_SIDE,
  type SelfAgreementResult,
  type SortBudget,
  type Verdict,
} from "./sort-composition.ts";

// ---------------------------------------------------------------------------
// Thresholds. Every one of these is [U] in the spec.
// ---------------------------------------------------------------------------

/**
 * PROVISIONAL, PENDING DATA. The spec's own words: "The 0.30 threshold is a
 * starting default, not a finding... Log the observed gap for every candidate
 * the first few times you run this and tune it against real distributions."
 * Phase 0.5's hand run and the first real sorts produce that distribution.
 * Until then this is a documented guess and every summary that uses it reports
 * the full gap distribution beside it so it can be retuned.
 */
export const DISC_GAP_MIN = 0.30;

/**
 * PROVISIONAL, PENDING DATA. A criterion that keeps has to be failed by at
 * least half the rejected work, not merely more often than by accepted work.
 * Same tuning rule as DISC_GAP_MIN.
 */
export const REJECT_FAIL_MIN = 0.5;

/**
 * PROVISIONAL, PENDING DATA. CH-04's stated significance level: at 20 shared
 * observations, two independent 50%-fail criteria reach 16/20 agreement with
 * p = 0.006. The falsification test named there is in the return value: if the
 * median off-diagonal agreement runs above roughly 0.7, the application vectors
 * are measuring one axis and clustering should be switched off rather than
 * retuned. The full matrix is returned so that can be read, not guessed at.
 */
export const CLUSTER_AGREEMENT_MIN = 0.8;

/**
 * PROVISIONAL, PENDING DATA. Held-out items below this can never carry a
 * 'verified' label, whatever the precision. Ten is the spec's held-out budget;
 * a label earned on fewer is a label earned on nothing.
 */
export const VERIFIED_MIN_HELD_OUT = 10;
/** PROVISIONAL, PENDING DATA. */
export const VERIFIED_MIN_PRECISION = 0.8;
/** PROVISIONAL, PENDING DATA. */
export const VERIFIED_MIN_RECALL = 0.8;
/** 4.7b's release floor: below this the standard goes back to stage 3. */
export const PROVISIONAL_MIN_PRECISION = 0.6;

/** Cap on a probe's regex source, so a generated pattern cannot run away. */
export const MAX_PROBE_PATTERN_CHARS = 200;
/** Cap on probe recursion (not: within_first_paragraphs: ...). */
const MAX_PROBE_DEPTH = 4;

// ---------------------------------------------------------------------------
// The probe grammar
// ---------------------------------------------------------------------------

/**
 * A criterion's `observable` is the criterion (ctrl-compile/leaves/criteria.md:
 * "The observable is the criterion. Everything above it is context."). To be
 * the criterion it has to be checkable, and to be checkable without 160
 * zero-shot LLM judgements it has to be a declarative probe rather than free
 * text.
 *
 * The grammar is deliberately small. Every shape below can be evaluated against
 * a string with no model, no state and no clock:
 *
 *   contains:<text>                     case-insensitive substring
 *   matches:/re/flags                   regular expression (g and y stripped)
 *   max_words:<n>                       word count at most n
 *   min_words:<n>                       word count at least n
 *   within_first_paragraphs:<n>:<probe> the probe holds inside the first n
 *                                       paragraphs (the inner term is itself a
 *                                       probe, so use contains: for a literal)
 *   has_number                          at least one digit
 *   has_proper_noun                     a capitalised word that is not merely
 *                                       sentence-initial, or an acronym
 *   not:<probe>                         negation of any of the above
 *
 * Anything else returns null from parseProbe, and null means 'untested' with
 * the reason recorded. There is no fallback that guesses at intent: an
 * observable we cannot check is a value, not a criterion, and scoring it
 * anyway is the failure this whole chain exists to prevent.
 */
export type Probe =
  | { kind: "contains"; needle: string }
  | { kind: "matches"; source: string; flags: string }
  | { kind: "max_words"; n: number }
  | { kind: "min_words"; n: number }
  | { kind: "within_first_paragraphs"; n: number; inner: Probe }
  | { kind: "has_number" }
  | { kind: "has_proper_noun" }
  | { kind: "not"; inner: Probe };

/** One line per shape, for the prompt that asks a model to emit one. */
export const PROBE_GRAMMAR_HELP: string[] = [
  "contains:<text>",
  "matches:/regex/flags",
  "max_words:<n>",
  "min_words:<n>",
  "within_first_paragraphs:<n>:<probe>",
  "has_number",
  "has_proper_noun",
  "not:<probe>",
];

function parseCount(raw: string, max: number): number | null {
  if (!/^\d{1,5}$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > max) return null;
  return n;
}

/**
 * Parse an observable into a probe, or null when it is not machine-checkable.
 *
 * Null is a first-class answer here. It is what a construct that describes a
 * value rather than a check produces, and the caller writes 'untested' plus the
 * reason rather than inventing something scorable.
 */
export function parseProbe(observable: string | null | undefined, depth = 0): Probe | null {
  if (typeof observable !== "string") return null;
  if (depth > MAX_PROBE_DEPTH) return null;
  const raw = observable.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  if (lower === "has_number") return { kind: "has_number" };
  if (lower === "has_proper_noun") return { kind: "has_proper_noun" };

  const colon = raw.indexOf(":");
  if (colon <= 0) return null;
  const head = raw.slice(0, colon).trim().toLowerCase();
  const tail = raw.slice(colon + 1);

  switch (head) {
    case "not": {
      const inner = parseProbe(tail, depth + 1);
      return inner ? { kind: "not", inner } : null;
    }
    case "contains": {
      const needle = tail.trim();
      if (!needle) return null;
      return { kind: "contains", needle };
    }
    case "matches": {
      const body = tail.trim();
      const m = /^\/(.*)\/([a-z]*)$/s.exec(body);
      if (!m) return null;
      const source = m[1];
      const rawFlags = m[2];
      if (!source || source.length > MAX_PROBE_PATTERN_CHARS) return null;
      if (!/^[gimsuy]*$/.test(rawFlags)) return null;
      // g and y carry lastIndex state across calls; a stateful probe would
      // score the same item differently depending on call order.
      const flags = rawFlags.replace(/[gy]/g, "");
      try {
        new RegExp(source, flags);
      } catch {
        return null;
      }
      return { kind: "matches", source, flags };
    }
    case "max_words": {
      const n = parseCount(tail.trim(), 10000);
      return n === null ? null : { kind: "max_words", n };
    }
    case "min_words": {
      const n = parseCount(tail.trim(), 10000);
      return n === null ? null : { kind: "min_words", n };
    }
    case "within_first_paragraphs": {
      const split = tail.indexOf(":");
      if (split <= 0) return null;
      const n = parseCount(tail.slice(0, split).trim(), 50);
      if (n === null) return null;
      const inner = parseProbe(tail.slice(split + 1), depth + 1);
      // No nesting of the same operator: "within the first 3 paragraphs of the
      // first 2 paragraphs" is not a thing anyone means.
      if (!inner || inner.kind === "within_first_paragraphs") return null;
      return { kind: "within_first_paragraphs", n, inner };
    }
    default:
      return null;
  }
}

/** Raised when applyProbe is handed an observable that is not checkable. */
export class UnparseableObservableError extends Error {
  readonly observable: string;
  constructor(observable: string) {
    super(
      `That observable is not machine-checkable, so it has no holds or fails answer: ${observable}`,
    );
    this.name = "UnparseableObservableError";
    this.observable = observable;
  }
}

function words(body: string): number {
  const trimmed = body.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Paragraphs, blank-line separated. A body that uses single newlines instead
 * (most pasted work does) falls back to line splitting, so
 * within_first_paragraphs does not silently read the whole piece as one
 * paragraph and pass everything.
 */
export function paragraphsOf(body: string): string[] {
  const byBlank = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  const byLine = body.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return byLine.length > 0 ? byLine : [];
}

const PROPER_NOUN_WORD = /^[A-Z][a-z]+/;
const ACRONYM = /^[A-Z]{2,}$/;

/**
 * A capitalised word that is not merely the start of a sentence, or an
 * all-caps token of two or more letters (an acronym is never sentence case).
 *
 * Honest limit, stated rather than hidden: this fires on "Monday" and on a
 * capitalised product name as readily as on a client name. It is a probe for
 * "something specific is named here", not a named-entity recogniser, and the
 * criterion text is what tells the reader which one was meant.
 */
export function hasProperNoun(body: string): boolean {
  const sentences = body.split(/(?<=[.!?])\s+|\n+/);
  for (const sentence of sentences) {
    const tokens = sentence.trim().split(/\s+/).filter(Boolean);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].replace(/^[^A-Za-z0-9]+/, "").replace(/[^A-Za-z0-9]+$/, "");
      if (!token) continue;
      if (ACRONYM.test(token)) return true;
      if (i > 0 && PROPER_NOUN_WORD.test(token)) return true;
    }
  }
  return false;
}

function evaluate(probe: Probe, body: string): boolean {
  switch (probe.kind) {
    case "contains":
      return body.toLowerCase().includes(probe.needle.toLowerCase());
    case "matches":
      return new RegExp(probe.source, probe.flags).test(body);
    case "max_words":
      return words(body) <= probe.n;
    case "min_words":
      return words(body) >= probe.n;
    case "within_first_paragraphs":
      return evaluate(probe.inner, paragraphsOf(body).slice(0, probe.n).join("\n\n"));
    case "has_number":
      return /\d/.test(body);
    case "has_proper_noun":
      return hasProperNoun(body);
    case "not":
      return !evaluate(probe.inner, body);
  }
}

/**
 * Does this observable HOLD on this item? Deterministic, no LLM.
 *
 * Throws on an unparseable observable rather than returning false. False would
 * mean "this item fails the criterion", which is a scored answer, and a scored
 * answer to a question that cannot be asked is exactly the quiet wrongness the
 * AWAITING discipline exists to stop. Callers gate on parseProbe first;
 * discriminationFor and clusterByApplication both do.
 */
export function applyProbe(observable: string, itemBody: string): boolean {
  const probe = parseProbe(observable);
  if (!probe) throw new UnparseableObservableError(observable);
  return evaluate(probe, itemBody ?? "");
}

/** The non-throwing form: null when the observable is not checkable. */
export function tryApplyProbe(
  observable: string | null | undefined,
  itemBody: string,
): boolean | null {
  const probe = parseProbe(observable);
  if (!probe) return null;
  return evaluate(probe, itemBody ?? "");
}

// ---------------------------------------------------------------------------
// The discrimination test (CH-03)
// ---------------------------------------------------------------------------

export type DiscVerdict = "keep" | "delete" | "untested";

export interface ProbeCriterion {
  /** Local identity (a name or a temporary id); only used for reporting. */
  id: string;
  /** The declarative probe, or null when the construct yielded none. */
  observable: string | null;
  /** The construct this criterion compiles from, for the targeted counts. */
  constructId?: string | null;
}

export interface DiscTrainingItem {
  id: string;
  body: string;
  /** Construct ids this item was generated to test. Own and peer items: []. */
  targets?: string[] | null;
  position?: number | null;
}

export interface DiscGrade {
  itemId: string;
  verdict: Verdict;
}

export interface SideCounts {
  n_rejected: number;
  n_rejected_failing: number;
  n_accepted: number;
  n_accepted_failing: number;
}

export interface DiscriminationCounts extends SideCounts {
  /** rejected items failing / rejected items. 0 when the denominator is 0. */
  reject_fail_rate: number;
  /** accepted items failing / accepted items. 0 when the denominator is 0. */
  accept_fail_rate: number;
  /** reject_fail_rate minus accept_fail_rate, rounded so 0.30 is 0.30. */
  gap: number;
  /** Items the probe actually ran on. */
  applied: number;
  /** Graded items the probe could not run on (no body). */
  unscoreable: number;
  probe_parsed: boolean;
  /** Why there is no probe, when there is none. Recorded, never inferred. */
  unparsed_reason: string | null;
  /**
   * CH-03's per-construct unit, computed and reported beside the applied unit
   * so the Phase 2 tuning log can compare kill rates under each. NOT the unit
   * the verdict is taken on; see the header note for why.
   */
  targeted: SideCounts;
  /** Item ids the probe ran on, in input order. The application vector's index. */
  applied_item_ids: string[];
}

/** Six decimal places, so 0.5 - 0.2 is 0.3 and the 0.30 boundary is a boundary. */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? round6(numerator / denominator) : 0;
}

function emptySides(): SideCounts {
  return { n_rejected: 0, n_rejected_failing: 0, n_accepted: 0, n_accepted_failing: 0 };
}

/**
 * The four counts, per criterion, over the training items its probe could be
 * applied to.
 *
 * Skips are excluded on both sides, the same rule the rest of the instrument
 * uses: skip is an escape, never a middle point. An item with no body is
 * counted as unscoreable rather than as a pass or a fail.
 */
export function discriminationFor(
  criterion: ProbeCriterion,
  trainingItems: DiscTrainingItem[],
  grades: DiscGrade[],
): DiscriminationCounts {
  const probe = parseProbe(criterion.observable);
  const verdictByItem = new Map<string, Verdict>();
  for (const g of grades) verdictByItem.set(g.itemId, g.verdict);

  if (!probe) {
    return {
      ...emptySides(),
      reject_fail_rate: 0,
      accept_fail_rate: 0,
      gap: 0,
      applied: 0,
      unscoreable: 0,
      probe_parsed: false,
      unparsed_reason: criterion.observable
        ? "The observable is not in the probe grammar, so nothing could be checked against it."
        : "No observable was produced for this construct, so there is nothing to check.",
      targeted: emptySides(),
      applied_item_ids: [],
    };
  }

  const applied = emptySides();
  const targeted = emptySides();
  const appliedIds: string[] = [];
  let unscoreable = 0;

  for (const item of trainingItems) {
    const verdict = verdictByItem.get(item.id);
    if (verdict !== "send" && verdict !== "would_not_send") continue;
    const body = (item.body ?? "").trim();
    if (!body) {
      unscoreable += 1;
      continue;
    }

    const holds = evaluate(probe, item.body);
    const fails = !holds;
    appliedIds.push(item.id);

    if (verdict === "would_not_send") {
      applied.n_rejected += 1;
      if (fails) applied.n_rejected_failing += 1;
    } else {
      applied.n_accepted += 1;
      if (fails) applied.n_accepted_failing += 1;
    }

    const targetsThis = Boolean(
      criterion.constructId && (item.targets ?? []).includes(criterion.constructId),
    );
    if (targetsThis) {
      if (verdict === "would_not_send") {
        targeted.n_rejected += 1;
        if (fails) targeted.n_rejected_failing += 1;
      } else {
        targeted.n_accepted += 1;
        if (fails) targeted.n_accepted_failing += 1;
      }
    }
  }

  const rejectFailRate = rate(applied.n_rejected_failing, applied.n_rejected);
  const acceptFailRate = rate(applied.n_accepted_failing, applied.n_accepted);

  return {
    ...applied,
    reject_fail_rate: rejectFailRate,
    accept_fail_rate: acceptFailRate,
    gap: round6(rejectFailRate - acceptFailRate),
    applied: appliedIds.length,
    unscoreable,
    probe_parsed: true,
    unparsed_reason: null,
    targeted,
    applied_item_ids: appliedIds,
  };
}

export interface DiscriminationOptions {
  gapMin?: number;
  rejectFailMin?: number;
  /** Items needed on EACH side before a verdict is a verdict. */
  minPerSide?: number;
}

/**
 * keep / delete / untested.
 *
 * Order is deliberate. Sufficiency first: a criterion with three rejects on the
 * board has no gap worth reading, whatever the arithmetic says. Then delete,
 * because a criterion a bad piece of work also passes is worse than no
 * criterion (a naive generated rubric scored 42.9 percent where no rubric at
 * all scored 55.6). Then keep. Anything left over is untested, not kept.
 */
export function discriminationVerdict(
  counts: DiscriminationCounts,
  opts: DiscriminationOptions = {},
): DiscVerdict {
  const gapMin = opts.gapMin ?? DISC_GAP_MIN;
  const rejectFailMin = opts.rejectFailMin ?? REJECT_FAIL_MIN;
  const minPerSide = opts.minPerSide ?? KILL_MIN_EACH_SIDE;

  if (!counts.probe_parsed) return "untested";
  if (counts.n_rejected < minPerSide || counts.n_accepted < minPerSide) return "untested";
  if (counts.gap < gapMin) return "delete";
  if (counts.gap >= gapMin && counts.reject_fail_rate >= rejectFailMin) return "keep";
  return "untested";
}

/** The plain sentence a person reads next to the verdict. Never a number we do not have. */
export function discriminationReason(
  counts: DiscriminationCounts,
  verdict: DiscVerdict,
  opts: DiscriminationOptions = {},
): string {
  const gapMin = opts.gapMin ?? DISC_GAP_MIN;
  const rejectFailMin = opts.rejectFailMin ?? REJECT_FAIL_MIN;
  const minPerSide = opts.minPerSide ?? KILL_MIN_EACH_SIDE;

  if (!counts.probe_parsed) return counts.unparsed_reason ?? "There was nothing checkable to test.";
  if (counts.n_rejected < minPerSide || counts.n_accepted < minPerSide) {
    return `Only ${counts.n_rejected} rejected and ${counts.n_accepted} accepted items carried this check. ` +
      `${minPerSide} of each is the floor before a gap means anything.`;
  }
  if (verdict === "delete") {
    return `Accepted work fails this almost as often as rejected work does, so it does not separate ` +
      `your work. Gap ${counts.gap.toFixed(2)}, below ${gapMin.toFixed(2)}.`;
  }
  if (verdict === "keep") return `Gap ${counts.gap.toFixed(2)}. It separates.`;
  return `It separates but rejected work fails it only ${counts.reject_fail_rate.toFixed(2)} of the time, ` +
    `below ${rejectFailMin.toFixed(2)}, so it is not carrying the standard on its own.`;
}

// ---------------------------------------------------------------------------
// Clustering on the application vector (CH-04)
// ---------------------------------------------------------------------------

export interface ClusterCriterion {
  id: string;
  observable: string | null;
}

export interface AgreementMatrix {
  /** Criterion ids, in row and column order. */
  ids: string[];
  /** Symmetric, 1.0 on the diagonal. Empty when there is nothing to compare. */
  matrix: number[][];
  /** How many training items each agreement was computed over. */
  n: number;
}

export interface ClusterOutcome {
  /** A complete partition: every input criterion appears exactly once. */
  clusters: Array<{ id: string; members: string[] }>;
  agreement: AgreementMatrix;
  merges: Array<{ kept: string; merged: string; agreement: number }>;
  /** Criteria that could not be clustered, with the reason. Never merged. */
  unclusterable: Array<{ id: string; reason: string }>;
  /** Set when no merge was possible at all, saying why. */
  reason: string | null;
}

/** Each criterion's fail/hold vector over the same items. null when no probe. */
export function applicationVector(
  criterion: ClusterCriterion,
  items: DiscTrainingItem[],
): boolean[] | null {
  const probe = parseProbe(criterion.observable);
  if (!probe) return null;
  return items.map((item) => evaluate(probe, item.body ?? ""));
}

/**
 * Two constructs are the same criterion when their probes land the same way on
 * the same work.
 *
 * The person's grades stay as the LABEL for the discrimination test; they are
 * not the clustering feature. That separation is CH-04's fix: grade vectors
 * share no index set at this composition, so agreement on them is 0/0 and the
 * threshold means nothing under any implementation.
 *
 * The full pairwise matrix comes back whether or not anything merged, because
 * the falsification test for this whole step is a property of the matrix
 * (median off-diagonal above roughly 0.7 means the vectors measure one axis and
 * clustering should be switched off, not retuned).
 */
export function clusterByApplication(
  criteria: ClusterCriterion[],
  trainingItems: DiscTrainingItem[],
  minAgreement: number = CLUSTER_AGREEMENT_MIN,
): ClusterOutcome {
  const scoreable = trainingItems.filter((it) => (it.body ?? "").trim().length > 0);
  const vectors = new Map<string, boolean[]>();
  const unclusterable: Array<{ id: string; reason: string }> = [];

  for (const criterion of criteria) {
    const vector = scoreable.length > 0 ? applicationVector(criterion, scoreable) : null;
    if (!vector) {
      unclusterable.push({
        id: criterion.id,
        reason: criterion.observable
          ? "The observable is not in the probe grammar, so it has no application vector."
          : "No observable, so it has no application vector.",
      });
      continue;
    }
    vectors.set(criterion.id, vector);
  }

  const ids = criteria.map((c) => c.id).filter((id) => vectors.has(id));

  const emptyPartition = (reason: string): ClusterOutcome => ({
    clusters: criteria.map((c) => ({ id: c.id, members: [c.id] })),
    agreement: { ids, matrix: [], n: scoreable.length },
    merges: [],
    unclusterable,
    reason,
  });

  if (scoreable.length === 0) {
    return emptyPartition(
      "No training item had a body to run a probe against, so no two criteria could be compared.",
    );
  }
  if (ids.length < 2) {
    return emptyPartition(
      `Only ${ids.length} criterion had a checkable observable. Agreement needs two, so nothing was merged.`,
    );
  }

  const matrix: number[][] = ids.map(() => new Array(ids.length).fill(0));
  for (let i = 0; i < ids.length; i++) {
    matrix[i][i] = 1;
    const a = vectors.get(ids[i])!;
    for (let j = i + 1; j < ids.length; j++) {
      const b = vectors.get(ids[j])!;
      let same = 0;
      for (let k = 0; k < a.length; k++) if (a[k] === b[k]) same += 1;
      const agreement = round6(same / a.length);
      matrix[i][j] = agreement;
      matrix[j][i] = agreement;
    }
  }

  // Greedy absorption in input order. The caller sorts by weight before calling,
  // so the survivor of a merge is the more important criterion, not an accident
  // of iteration.
  const mergedInto = new Map<string, string>();
  const merges: Array<{ kept: string; merged: string; agreement: number }> = [];
  for (let i = 0; i < ids.length; i++) {
    if (mergedInto.has(ids[i])) continue;
    for (let j = i + 1; j < ids.length; j++) {
      if (mergedInto.has(ids[j])) continue;
      if (matrix[i][j] >= minAgreement) {
        mergedInto.set(ids[j], ids[i]);
        merges.push({ kept: ids[i], merged: ids[j], agreement: matrix[i][j] });
      }
    }
  }

  const clusters: Array<{ id: string; members: string[] }> = [];
  const byId = new Map<string, { id: string; members: string[] }>();
  for (const criterion of criteria) {
    const parent = mergedInto.get(criterion.id);
    if (parent) continue;
    const cluster = { id: criterion.id, members: [criterion.id] };
    clusters.push(cluster);
    byId.set(criterion.id, cluster);
  }
  for (const [child, parent] of mergedInto) {
    byId.get(parent)?.members.push(child);
  }

  return {
    clusters,
    agreement: { ids, matrix, n: scoreable.length },
    merges,
    unclusterable,
    reason: merges.length === 0
      ? `No two criteria agreed at ${minAgreement} or above across ${scoreable.length} training items.`
      : null,
  };
}

/** Median off-diagonal agreement: CH-04's own switch-it-off signal. */
export function medianOffDiagonal(agreement: AgreementMatrix): number | null {
  const values: number[] = [];
  for (let i = 0; i < agreement.matrix.length; i++) {
    for (let j = i + 1; j < agreement.matrix.length; j++) values.push(agreement.matrix[i][j]);
  }
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 1
    ? values[mid]
    : round6((values[mid - 1] + values[mid]) / 2);
}

// ---------------------------------------------------------------------------
// Triage on the grader, before anything is compiled (CH-12)
// ---------------------------------------------------------------------------

export type Triage = "harness" | "provisional" | "template_and_voice";

/** Repeat probes needed before test-retest is a measurement rather than a hint. */
export const TRIAGE_MIN_REPEATS = 3;
/** At or below this share, do not compile a rubric. */
export const TRIAGE_TEMPLATE_MAX_RATIO = 1 / 3;

/**
 * The strings the UI shows. They are here rather than in a component because
 * the same sentence has to appear in the run detail, the standard file and the
 * screen, and three copies of a claim is how they drift apart.
 */
export const TRIAGE_REASONS: Record<Triage, string> = {
  harness:
    "You graded the same piece the same way every time it came round. That consistency is what makes a measured standard possible, so we compiled one.",
  provisional:
    "You graded the same piece differently on at least one repeat. That is normal, and it means the standard is provisional: it is built, and no accuracy number is claimed for it yet.",
  template_and_voice:
    "The same piece came back a different answer most times it repeated. A rubric built on that would be internally consistent and about nothing, so we have not built one. What you get instead is a strong template plus your voice, with no number attached.",
};

export const TRIAGE_UNMEASURED_REASON =
  "There were not enough repeat screens to check whether you grade the same piece the same way twice, so nothing is claimed either way. The standard is provisional.";

export interface TriageOutcome {
  triage: Triage;
  reason: string;
  matched: number;
  total: number;
  /** False when there were too few repeats to measure at all. */
  measured: boolean;
}

/**
 * CH-12's branch, taken BEFORE a rubric is compiled.
 *
 * 3 of 3 goes to the harness product. 0 or 1 of 3 does not get a rubric at all:
 * the honest product there is a good template plus a voice layer, which the
 * strategy already names and never routes anyone to. Everything between is
 * provisional. Too few repeats to read is provisional too, and says so; an
 * unmeasured grader is not a passing grader and is not a failing one either,
 * the same rule haltVerdict applies to an unmeasured generator.
 */
export function triageFromSelfAgreement(agreement: SelfAgreementResult): TriageOutcome {
  const { matched, total } = agreement;
  if (total < TRIAGE_MIN_REPEATS) {
    return {
      triage: "provisional",
      reason: TRIAGE_UNMEASURED_REASON,
      matched,
      total,
      measured: false,
    };
  }
  if (matched === total) {
    return { triage: "harness", reason: TRIAGE_REASONS.harness, matched, total, measured: true };
  }
  if (matched / total <= TRIAGE_TEMPLATE_MAX_RATIO) {
    return {
      triage: "template_and_voice",
      reason: TRIAGE_REASONS.template_and_voice,
      matched,
      total,
      measured: true,
    };
  }
  return {
    triage: "provisional",
    reason: TRIAGE_REASONS.provisional,
    matched,
    total,
    measured: true,
  };
}

// ---------------------------------------------------------------------------
// The label on the artefact (spec 6.2, CH-18)
// ---------------------------------------------------------------------------

export type BaselineLabel = "draft" | "provisional" | "verified";

export interface BaselineInput {
  /** Held-out items with a real grade against them. */
  heldOutGraded: number;
  /** Null when nothing has been measured. Null is the honest common case at 3a. */
  precision?: number | null;
  recall?: number | null;
}

export const BASELINE_LABEL_TEXT: Record<BaselineLabel, string> = {
  draft: "Draft",
  provisional: "Provisional",
  verified: "Verified",
};

/**
 * Draft, Provisional or Verified, and never a fourth thing.
 *
 * 'verified' is impossible below VERIFIED_MIN_HELD_OUT graded held-out items,
 * whatever the precision, because a precision computed on four items is a
 * number about four items. With no precision at all the answer is 'draft': at
 * compile time nothing has been run against the hold-out yet, and the label has
 * to say that rather than borrow confidence from the fact that a rubric exists.
 */
export function baselineLabel(input: BaselineInput): BaselineLabel {
  const { heldOutGraded } = input;
  const precision = typeof input.precision === "number" && Number.isFinite(input.precision)
    ? input.precision
    : null;
  const recall = typeof input.recall === "number" && Number.isFinite(input.recall)
    ? input.recall
    : null;

  if (precision === null || heldOutGraded <= 0) return "draft";
  if (
    heldOutGraded >= VERIFIED_MIN_HELD_OUT &&
    precision >= VERIFIED_MIN_PRECISION &&
    recall !== null &&
    recall >= VERIFIED_MIN_RECALL
  ) {
    return "verified";
  }
  if (precision >= PROVISIONAL_MIN_PRECISION) return "provisional";
  return "draft";
}

/**
 * Could a deck built on this budget EVER be called Verified, however well it is
 * graded and however good the measurement turns out to be?
 *
 * Computed rather than stored, because a boolean written next to a budget is a
 * second copy of the same fact and the two drift. Lives here rather than in
 * sort-composition because VERIFIED_MIN_HELD_OUT is a release threshold, and
 * this module already imports that module (never the other way round).
 *
 * `false` is not a defect to route around. It is the honest price of a shorter
 * deck and it belongs on the screen the person chooses the deck on, not in a
 * comment they will never read.
 */
export function canReachVerified(budget: SortBudget): boolean {
  return budget.holdOut.items >= VERIFIED_MIN_HELD_OUT;
}

/** The weaker of two labels. Triage caps what a measurement is allowed to claim. */
const LABEL_ORDER: BaselineLabel[] = ["draft", "provisional", "verified"];
export function weakerLabel(a: BaselineLabel, b: BaselineLabel): BaselineLabel {
  return LABEL_ORDER.indexOf(a) <= LABEL_ORDER.indexOf(b) ? a : b;
}

/** The ceiling a triage outcome puts on the label, whatever the numbers say. */
export function labelCeilingForTriage(triage: Triage): BaselineLabel {
  if (triage === "template_and_voice") return "draft";
  if (triage === "provisional") return "provisional";
  return "verified";
}

// ---------------------------------------------------------------------------
// Weight ordering
// ---------------------------------------------------------------------------

export type CriterionWeight = "essential" | "important" | "optional" | "pitfall";

/**
 * Load order: essential, then pitfall, then important, then optional.
 * Non-negotiables go at the top because position measurably changes which
 * criteria get applied and the bottom of a list is where things quietly stop
 * mattering.
 */
export const WEIGHT_LOAD_ORDER: CriterionWeight[] = [
  "essential",
  "pitfall",
  "important",
  "optional",
];

/** Seven per surface. At 90 percent compliance per instruction, ten land together about a third of the time. */
export const MAX_CRITERIA_PER_SURFACE = 7;

export function byWeightLoadOrder<T extends { weight: CriterionWeight }>(a: T, b: T): number {
  return WEIGHT_LOAD_ORDER.indexOf(a.weight) - WEIGHT_LOAD_ORDER.indexOf(b.weight);
}
