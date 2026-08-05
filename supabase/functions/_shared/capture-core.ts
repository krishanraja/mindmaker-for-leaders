/**
 * capture-core: the deterministic half of stage 9, LEARN.
 *
 * Pure module. No Deno imports, no I/O, no clock and no randomness, so vitest
 * runs it directly and the same five weeks of ledger always produce the same
 * proposals. Everything that talks to the database lives in ../capture-week.
 *
 * `skills/ctrl-capture` is the managed reference implementation of exactly this
 * stage, and every rule below is lifted from it rather than reinvented:
 * `SKILL.md` for the two-strikes filter, the routing and the size obligation,
 * `leaves/weekly.md` for the three types and the proposal shape,
 * `leaves/quarterly.md` for the re-score, and `ctrl-check/reference/ledger.md`
 * for what the rows mean.
 *
 * ---------------------------------------------------------------------------
 * The one thing this stage may do, and the one thing it may never do
 * ---------------------------------------------------------------------------
 *
 * It writes a proposal. A named human accepts or rejects it. Nothing in this
 * file, and nothing in the function that calls it, edits a standard: there is
 * no code path here that produces a `criteria` write of any shape, and that is
 * a property of the module, not a promise about it. A standard that changes
 * without a decision is a standard nobody owns.
 *
 * ---------------------------------------------------------------------------
 * Two strikes, stated exactly
 * ---------------------------------------------------------------------------
 *
 * One occurrence is an observation: someone had a bad Tuesday, the document was
 * unusual, or the reviewer was wrong. It is logged, nothing is proposed, and it
 * is not mentioned. Two is a pattern.
 *
 *     candidate(k) <=> count({ r in rows : key(r) = k and r.week in window }) >= 2
 *     window       =  the 5 ISO weeks ending at nowWeek, inclusive
 *
 * Occurrences are ROWS inside the window, not distinct weeks. The same false
 * positive hitting somebody twice on a Tuesday is a pattern with more urgency
 * than one that took a month, and counting distinct weeks would rank it lower.
 * The distinct weeks are reported alongside so the shape stays visible.
 *
 * Type C drift is the single exception, and it is allowed only because it asks
 * rather than acts: a criterion with ZERO occurrences in the window raises a
 * question with no delta attached.
 *
 * ---------------------------------------------------------------------------
 * What is deliberately NOT here
 * ---------------------------------------------------------------------------
 *
 * No LLM selects anything. The three types and the two-strikes filter are
 * arithmetic over rows, and a model asked to pick out "what keeps coming up"
 * from a week of ledger will find something every single week, which is the
 * exact failure the two-strikes rule exists to prevent (SKILL.md: "A weekly pass
 * that always finds something is a weekly pass inventing things to justify
 * itself"). A model may draft wording for candidates already chosen here; it may
 * never choose them.
 *
 * Method rows (4.10.2) and trigger rows (4.10.3) are grouped and counted, and
 * they are NOT turned into proposals: `proposals.type` admits three values and a
 * method correction amends a skill rather than a criterion. They are reported in
 * the run output so the gap is visible rather than silently dropped. Forcing a
 * method correction into a criterion proposal is the generalisation failure the
 * whole chain is built to stop.
 */

import { jaccard, titleTokens } from "./news-cluster.ts";
import { MAX_CRITERIA_PER_SURFACE } from "./discrimination.ts";

// ---------------------------------------------------------------------------
// Constants. Both are the ruled numbers, not tuning knobs.
// ---------------------------------------------------------------------------

/** The lookback: this week plus the previous four. */
export const STRIKE_WINDOW_WEEKS = 5;

/** Two of the same thing inside the window. One is an observation. */
export const MIN_STRIKES = 2;

/**
 * How alike two uncovered notes have to be before they are treated as the same
 * observation. Deliberately its own constant rather than news-cluster's
 * CLUSTER_THRESHOLD: the two are tuned against completely different text and a
 * shared number would couple them by accident.
 *
 * 0.5 is the conservative direction on purpose. A grouper that under-merges
 * proposes nothing where it might have proposed something; a grouper that
 * over-merges invents a rule out of two unrelated observations and sends it to
 * the owner with two quotes underneath that do not belong together. The first
 * failure costs a week. The second costs the owner's trust in the whole pass.
 *
 * The honest limit, stated because it will be met: this matches rewording, not
 * paraphrase. "second half repeats the first" and "restates the intro in the
 * close" are the same finding to a person and share no tokens, so they will not
 * group here. Grouping them needs a model, and a model that groups is a model
 * that selects.
 */
export const TOPIC_SIMILARITY_MIN = 0.5;

// ---------------------------------------------------------------------------
// Rows, as the ledger holds them
// ---------------------------------------------------------------------------

export type LedgerSignal = "output" | "method" | "trigger";

export type LedgerVerdict =
  | "holds"
  | "borderline"
  | "breaks"
  | "uncovered"
  | "undertrigger"
  | "fired";

export type LedgerDisposition = "accepted" | "rejected" | "unknown";

export type MethodClass = "omission" | "stance" | "sequence" | "boundary";

/** One ledger row. Shaped exactly as `public.ledger` holds it. */
export interface LedgerRow {
  id?: string;
  user_id: string;
  /** ISO year-week, e.g. "2026-W32". */
  week: string;
  surface: string;
  signal: LedgerSignal;
  class?: MethodClass | null;
  criterion_id?: string | null;
  criterion_name: string;
  verdict: LedgerVerdict;
  quote?: string | null;
  disposition: LedgerDisposition;
  created_at?: string;
}

/** One current criterion, as the drift check needs it. */
export interface CriterionRow {
  id: string;
  user_id: string;
  surface: string;
  name: string;
  weight?: string;
  disposition?: string;
}

export interface SignalGroups {
  output: LedgerRow[];
  method: LedgerRow[];
  trigger: LedgerRow[];
}

/**
 * Split the week's rows into the three signal classes.
 *
 * Most designs record only the first. The second is the one an expert actually
 * produces, and under a design with one ledger it is the one guaranteed to be
 * agreed with in conversation and then lost.
 */
export function groupBySignal(rows: readonly LedgerRow[]): SignalGroups {
  const groups: SignalGroups = { output: [], method: [], trigger: [] };
  for (const row of rows) {
    if (row.signal === "method") groups.method.push(row);
    else if (row.signal === "trigger") groups.trigger.push(row);
    else groups.output.push(row);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// ISO weeks
// ---------------------------------------------------------------------------

const MS_PER_WEEK = 7 * 86_400_000;
/** 1970-01-05 was a Monday, and it is ISO 1970-W02. The index origin. */
const EPOCH_MONDAY_MS = Date.UTC(1970, 0, 5);

/** ISO year-week for a date, e.g. "2026-W32". The week-numbering year. */
export function isoWeekOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function parseIsoWeek(week: string): { year: number; week: number } | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(week ?? "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const w = Number(m[2]);
  if (!Number.isFinite(year) || w < 1 || w > 53) return null;
  return { year, week: w };
}

/** The Monday of an ISO week, in UTC ms. Jan 4 is always in week 1. */
function mondayMsOf(year: number, week: number): number {
  const jan4 = Date.UTC(year, 0, 4);
  const dow = new Date(jan4).getUTCDay() || 7;
  return jan4 - (dow - 1) * 86_400_000 + (week - 1) * MS_PER_WEEK;
}

/**
 * A monotonic integer per ISO week, so week arithmetic is subtraction rather
 * than calendar reasoning. Null for anything that is not an ISO week: a row
 * whose week cannot be read is dropped from the window rather than assigned to
 * one, because assigning it would put an occurrence in a week it never had.
 */
export function weekIndex(week: string): number | null {
  const parsed = parseIsoWeek(week);
  if (!parsed) return null;
  return Math.round((mondayMsOf(parsed.year, parsed.week) - EPOCH_MONDAY_MS) / MS_PER_WEEK);
}

function weekFromIndex(index: number): string {
  return isoWeekOf(new Date(EPOCH_MONDAY_MS + index * MS_PER_WEEK));
}

/**
 * The window: `count` ISO weeks ending at `nowWeek`, inclusive, oldest first.
 * Returns an empty list for an unreadable week rather than guessing a window.
 */
export function windowWeeks(nowWeek: string, count = STRIKE_WINDOW_WEEKS): string[] {
  const end = weekIndex(nowWeek);
  if (end === null || count < 1) return [];
  const weeks: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) weeks.push(weekFromIndex(end - i));
  return weeks;
}

/** The newest week present in a set of rows. The default window's right edge. */
export function latestWeek(rows: readonly LedgerRow[]): string | null {
  let best: { index: number; week: string } | null = null;
  for (const row of rows) {
    const index = weekIndex(row.week);
    if (index === null) continue;
    if (!best || index > best.index) best = { index, week: row.week };
  }
  return best?.week ?? null;
}

function resolveWindow(rows: readonly LedgerRow[], weeks?: readonly string[]): readonly string[] {
  if (weeks && weeks.length > 0) return weeks;
  const now = latestWeek(rows);
  return now ? windowWeeks(now) : [];
}

// ---------------------------------------------------------------------------
// Two strikes
// ---------------------------------------------------------------------------

export interface StrikeGroup {
  /** The grouping key. Also the dedupe key a proposal is stored under. */
  key: string;
  rows: LedgerRow[];
  /** Rows inside the window. Not distinct weeks; see the header. */
  occurrences: number;
  /** The distinct weeks they landed in, oldest first. */
  weeks: string[];
}

/**
 * The default grouping: what counts as "the same thing" for an output row.
 *
 * A criterion row groups on the criterion, because that is what a proposal
 * would change. An uncovered row has no criterion, so it groups on its note,
 * and typeAUncovered overrides this with topic clustering that can see all the
 * rows at once. Method and trigger rows group on their own class so the counts
 * in the run output mean something.
 */
export function defaultStrikeKey(row: LedgerRow): string | null {
  if (row.signal === "method") {
    return row.class ? `method:${row.class}:${row.surface}` : null;
  }
  if (row.signal === "trigger") {
    return `trigger:${row.verdict}:${row.criterion_name}`;
  }
  if (row.verdict === "uncovered") {
    const topic = normaliseTopic(row.quote ?? row.criterion_name);
    return topic ? `uncovered:${topic}` : null;
  }
  const id = row.criterion_id ?? `name:${row.criterion_name}`;
  return `criterion:${id}`;
}

/**
 * The anti-noise mechanism, and the single rule that separates a standard which
 * sharpens from one that accumulates noise until nobody reads it.
 *
 * Rows outside the window are dropped before counting, which is what makes the
 * five-week edge real: two occurrences six weeks apart are two observations,
 * not a pattern, and this returns nothing for them.
 *
 * Output is ordered most-struck first with an alphabetical tiebreak, so two runs
 * over the same rows produce the same order.
 */
export function twoStrikes(
  rows: readonly LedgerRow[],
  weeks: readonly string[],
  keyOf: (row: LedgerRow) => string | null = defaultStrikeKey,
): StrikeGroup[] {
  const inWindow = new Set(weeks);
  const byKey = new Map<string, LedgerRow[]>();

  for (const row of rows) {
    if (!inWindow.has(row.week)) continue;
    const key = keyOf(row);
    if (!key) continue;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(row);
    else byKey.set(key, [row]);
  }

  const groups: StrikeGroup[] = [];
  for (const [key, bucket] of byKey) {
    if (bucket.length < MIN_STRIKES) continue;
    groups.push({
      key,
      rows: bucket,
      occurrences: bucket.length,
      weeks: distinctWeeks(bucket),
    });
  }

  return groups.sort((a, b) => b.occurrences - a.occurrences || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

function distinctWeeks(rows: readonly LedgerRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) if (row.week) seen.add(row.week);
  return [...seen].sort((a, b) => (weekIndex(a) ?? 0) - (weekIndex(b) ?? 0));
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export type ProposalType = "uncovered" | "false_positive" | "drift";

export interface EvidenceLine {
  week: string;
  surface: string;
  criterion: string;
  verdict: LedgerVerdict;
  quote: string | null;
  disposition: LedgerDisposition;
}

interface CandidateBase {
  userId: string;
  surface: string;
  key: string;
  occurrences: number;
  weeks: string[];
  evidence: EvidenceLine[];
}

/** Type A. The standard telling you what it does not yet contain. */
export interface UncoveredCandidate extends CandidateBase {
  type: "uncovered";
  /** The note itself, verbatim, in the words they wrote it in. */
  topic: string;
}

/** Type B. The gate said breaks and the person pushed back, twice. */
export interface FalsePositiveCandidate extends CandidateBase {
  type: "false_positive";
  criterionId: string | null;
  criterionName: string;
  /** Where the pushbacks landed. One surface means the delta is a scope change. */
  surfaces: string[];
}

/**
 * Type C. A criterion that has not fired in the window.
 *
 * The `never` fields are the structural half of "never attach a delta to a
 * drift proposal": this type cannot carry one, so a caller that tries to write
 * a delta onto a drift candidate does not compile. buildProposal re-checks at
 * runtime for rows that arrived as JSON, where the type system was not present.
 */
export interface DriftCandidate extends CandidateBase {
  type: "drift";
  criterionId: string | null;
  criterionName: string;
  /** The last week it appeared at all, if it ever did. */
  lastFiredWeek: string | null;
  /** The whole proposal. It asks; it does not answer. */
  question: string;
  delta?: never;
  delta_text?: never;
  deltaText?: never;
}

export type Candidate = UncoveredCandidate | FalsePositiveCandidate | DriftCandidate;

// ---------------------------------------------------------------------------
// Type A: uncovered
// ---------------------------------------------------------------------------

/** Content tokens of a note, for the topic grouping. */
function topicTokens(text: string): Set<string> {
  return titleTokens(String(text ?? ""));
}

/** A stable key for a note, used when clustering is not available. */
function normaliseTopic(text: string): string {
  return [...topicTokens(text)].sort().join(" ");
}

/**
 * Uncovered rows, grouped by what they were about, then two-struck.
 *
 * These are the most valuable lines in the ledger and they are processed first:
 * they are the only source of a genuinely new criterion that did not come from
 * a workshop.
 *
 * Grouping is single-link over content-token overlap, greedy in week order, so
 * it is deterministic and reruns identically. It merges rewordings of the same
 * note and will not merge paraphrases; see TOPIC_SIMILARITY_MIN for why that
 * direction was chosen.
 */
export function typeAUncovered(
  rows: readonly LedgerRow[],
  weeks?: readonly string[],
): UncoveredCandidate[] {
  const window = resolveWindow(rows, weeks);
  const uncovered = groupBySignal(rows).output.filter(
    (row) => row.verdict === "uncovered" && window.includes(row.week),
  );
  if (uncovered.length === 0) return [];

  // Deterministic input order: oldest first, then by note, so the representative
  // note of a cluster is the first one they wrote rather than whatever the
  // database returned.
  const ordered = [...uncovered].sort(
    (a, b) =>
      (weekIndex(a.week) ?? 0) - (weekIndex(b.week) ?? 0) ||
      noteOf(a).localeCompare(noteOf(b)),
  );

  const clusters: Array<{ key: string; tokens: Set<string>; rows: LedgerRow[]; topic: string }> = [];
  const keyByRow = new Map<LedgerRow, string>();

  for (const row of ordered) {
    const note = noteOf(row);
    const tokens = topicTokens(note);
    if (tokens.size === 0) continue;

    let home = clusters.find((c) => jaccard(c.tokens, tokens) >= TOPIC_SIMILARITY_MIN);
    if (!home) {
      home = { key: `uncovered:${normaliseTopic(note)}`, tokens: new Set(tokens), rows: [], topic: note };
      clusters.push(home);
    } else {
      for (const t of tokens) home.tokens.add(t);
    }
    home.rows.push(row);
    keyByRow.set(row, home.key);
  }

  const struck = twoStrikes(ordered, window, (row) => keyByRow.get(row) ?? null);
  const topicByKey = new Map(clusters.map((c) => [c.key, c.topic]));

  return struck.map((group) => ({
    type: "uncovered" as const,
    userId: group.rows[0].user_id,
    surface: dominantSurface(group.rows),
    key: group.key,
    occurrences: group.occurrences,
    weeks: group.weeks,
    evidence: group.rows.map(evidenceLine),
    topic: topicByKey.get(group.key) ?? noteOf(group.rows[0]),
  }));
}

function noteOf(row: LedgerRow): string {
  return String(row.quote ?? "").trim() || row.criterion_name;
}

// ---------------------------------------------------------------------------
// Type B: false positive
// ---------------------------------------------------------------------------

/**
 * A criterion the gate flagged and the person pushed back on, twice.
 *
 * The most urgent thing this system can find. False positives are what get a
 * gate ignored, and an ignored gate cannot be repaired later because the
 * credibility has already been spent. Two rejections on one criterion promote
 * here automatically, without waiting for anything else: no separate threshold,
 * no additional signal, and no benefit of the doubt for the criterion.
 *
 * An owner disagreeing twice is not obstruction. It is the clearest signal
 * available that the criterion is wrong, badly phrased, or firing too broadly.
 */
export function typeBFalsePositive(
  rows: readonly LedgerRow[],
  weeks?: readonly string[],
): FalsePositiveCandidate[] {
  const window = resolveWindow(rows, weeks);
  const pushbacks = groupBySignal(rows).output.filter(
    (row) =>
      row.verdict === "breaks" &&
      row.disposition === "rejected" &&
      row.criterion_name !== "uncovered",
  );

  return twoStrikes(pushbacks, window, (row) =>
    `criterion:${row.criterion_id ?? `name:${row.criterion_name}`}`,
  ).map((group) => {
    const surfaces = [...new Set(group.rows.map((r) => r.surface).filter(Boolean))].sort();
    return {
      type: "false_positive" as const,
      userId: group.rows[0].user_id,
      surface: dominantSurface(group.rows),
      key: group.key,
      occurrences: group.occurrences,
      weeks: group.weeks,
      evidence: group.rows.map(evidenceLine),
      criterionId: group.rows[0].criterion_id ?? null,
      criterionName: group.rows[0].criterion_name,
      surfaces,
    };
  });
}

// ---------------------------------------------------------------------------
// Type C: drift
// ---------------------------------------------------------------------------

/**
 * A criterion that has not fired at all in the window.
 *
 * The ONE zero-occurrence case, and it is allowed only because it asks rather
 * than acts. Either the problem is solved and the rule can be retired, or the
 * rule stopped working. Flag it, do not assume which, and propose no change: a
 * criterion that stopped firing might be the one thing preventing a failure
 * nobody has seen recently, which is what success looks like.
 *
 * The gate must have RUN for silence to mean anything. "This rule did not
 * fire" is a statement about the checks that happened, so with no checks at
 * all it carries no information: it reports "you have not used the gate" as
 * "your rules went stale", which is the one shape of noise most likely to get
 * a weekly pass ignored. So drift needs at least one output row in the window
 * before it will ask anything. This is not an extra rule on top of Type C, it
 * is Type C's own premise made explicit.
 */
export function typeCDrift(
  criteria: readonly CriterionRow[],
  rows: readonly LedgerRow[],
  nowWeek: string,
): DriftCandidate[] {
  const window = windowWeeks(nowWeek);
  if (window.length === 0) return [];
  const inWindow = new Set(window);

  const gateRanInWindow = rows.some(
    (row) => row.signal === "output" && inWindow.has(row.week),
  );
  if (!gateRanInWindow) return [];

  const firedIds = new Set<string>();
  const firedNames = new Set<string>();
  /** Last week each criterion appeared, over EVERY row handed in, not just the window. */
  const lastSeen = new Map<string, string>();

  for (const row of rows) {
    if (row.signal !== "output") continue;
    const idKey = row.criterion_id ? `id:${row.criterion_id}` : null;
    const nameKey = `name:${row.surface}:${row.criterion_name}`;
    for (const key of [idKey, nameKey]) {
      if (!key) continue;
      const seen = lastSeen.get(key);
      if (!seen || (weekIndex(row.week) ?? 0) > (weekIndex(seen) ?? 0)) lastSeen.set(key, row.week);
    }
    if (!inWindow.has(row.week)) continue;
    if (row.criterion_id) firedIds.add(row.criterion_id);
    firedNames.add(`${row.surface}:${row.criterion_name}`);
  }

  const candidates: DriftCandidate[] = [];
  for (const criterion of criteria) {
    if (criterion.disposition === "retired") continue;
    if (firedIds.has(criterion.id)) continue;
    if (firedNames.has(`${criterion.surface}:${criterion.name}`)) continue;

    const lastFiredWeek = lastSeen.get(`id:${criterion.id}`) ??
      lastSeen.get(`name:${criterion.surface}:${criterion.name}`) ?? null;

    candidates.push({
      type: "drift",
      userId: criterion.user_id,
      surface: criterion.surface,
      key: `drift:${criterion.id}`,
      occurrences: 0,
      weeks: [],
      evidence: [],
      criterionId: criterion.id,
      criterionName: criterion.name,
      lastFiredWeek,
      question: driftQuestion(criterion.name, lastFiredWeek),
    });
  }

  return candidates.sort((a, b) => a.criterionName.localeCompare(b.criterionName));
}

function driftQuestion(name: string, lastFiredWeek: string | null): string {
  const when = lastFiredWeek
    ? `The last time it came up was ${lastFiredWeek}.`
    : "It has not come up since it was written.";
  return (
    `"${name}" has not come up once in the last ${STRIKE_WINDOW_WEEKS} weeks. ${when} ` +
    "Has the problem it was written for been solved, or has the rule stopped working? " +
    "I am not proposing an answer, because a rule that went quiet might be the one thing " +
    "stopping something you have not had to see for a while."
  );
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

const TYPE_ORDER: Record<ProposalType, number> = {
  uncovered: 0,
  false_positive: 1,
  drift: 2,
};

/**
 * A, then B, then C, and within each by occurrence count descending.
 *
 * This is spec 4.9's stated order and it is followed as stated. Worth naming the
 * tension rather than quietly resolving it: B is the most URGENT thing the
 * system can find, because a false positive is what gets the gate switched off,
 * while A is the highest VALUE, because it is the only source of a rule that did
 * not come from a workshop. The spec puts value first. If owners start ignoring
 * these messages, the first thing to try is swapping these two, and that is a
 * one-line change to this table.
 */
export function orderProposals<T extends { type: ProposalType; occurrences: number; key: string }>(
  candidates: readonly T[],
): T[] {
  return [...candidates].sort(
    (a, b) =>
      TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
      b.occurrences - a.occurrences ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
}

// ---------------------------------------------------------------------------
// The size obligation (4.10.4)
// ---------------------------------------------------------------------------

export interface SizeDelta {
  /** Net change in the number of rules if this is accepted. */
  delta: number;
  /** What has to come out, or be split, to pay for it. Never empty. */
  pairedObligation: string;
}

/**
 * Every accepted change carries a deletion, and every proposal states it.
 *
 * The binding constraint is context occupied, not tokens spent. A pass that only
 * adds looks like progress for about four months before it starts degrading
 * everything around it, and the mitigation is not care, it is a mechanism.
 *
 * The seven-per-surface cap is the same MAX_CRITERIA_PER_SURFACE the compile
 * stage loads against, imported rather than restated: two copies of a cap is how
 * a rubric ends up with eight rules and a loader that reads seven.
 */
export function sizeDelta(
  proposal: { type: ProposalType },
  currentCriteriaCount: number,
): SizeDelta {
  const count = Number.isFinite(currentCriteriaCount) ? Math.max(0, Math.floor(currentCriteriaCount)) : 0;

  if (proposal.type === "uncovered") {
    if (count >= MAX_CRITERIA_PER_SURFACE) {
      return {
        delta: 1,
        pairedObligation:
          `You already have ${count} rules on this kind of work, which is the most that get read in ` +
          "one pass. Taking this one on means splitting them into two checks that run separately, " +
          "or retiring one of the existing rules in the same breath.",
      };
    }
    return {
      delta: 1,
      pairedObligation:
        `This takes you from ${count} rules to ${count + 1} on this kind of work. One of the ` +
        "existing rules comes out with it, or you say plainly which one you are keeping instead.",
    };
  }

  if (proposal.type === "false_positive") {
    return {
      delta: 0,
      pairedObligation:
        "Nothing is added. The old wording comes out in the same edit and this replaces it, rather " +
        "than sitting beside it with a note. Keeping the previous version next to the current one " +
        "is a tax on every future read.",
    };
  }

  return {
    delta: 0,
    pairedObligation:
      "Nothing is added either way. Saying it is done removes a rule; saying it still matters " +
      "leaves the count where it is. This one is a question, so it carries no text to paste.",
  };
}

// ---------------------------------------------------------------------------
// The proposal row
// ---------------------------------------------------------------------------

/** A row for `public.proposals`, ready to insert. */
export interface ProposalRow {
  user_id: string;
  type: ProposalType;
  surface: string;
  headline: string;
  /** Null for drift, and only for drift. The table enforces this too. */
  delta_text: string | null;
  if_wrong: string;
  size_delta: number;
  evidence: Record<string, unknown>;
  status: "awaiting";
}

/** Raised rather than written: a drift proposal with a delta is not a drift proposal. */
export class DriftCarriesDeltaError extends Error {
  constructor(key: string) {
    super(`A drift candidate carried a delta: ${key}. Drift asks a question; it does not propose an answer.`);
    this.name = "DriftCarriesDeltaError";
  }
}

function quoteLine(line: EvidenceLine): string {
  const quote = line.quote ? `"${line.quote}"` : "(no passage recorded)";
  return `  ${line.week}  ${line.surface}  ${quote} -> ${line.disposition}`;
}

/**
 * The row the owner decides on.
 *
 * Two fields are load-bearing and neither is decoration.
 *
 * `if_wrong` is NOT NULL in the table, and the reason is not schema tidiness. It
 * makes the owner's decision cheap, and writing it forces a falsifiable
 * consequence instead of a preference. A proposal you cannot write an `if_wrong`
 * for is a proposal that has not been thought through and should not be sent.
 *
 * `delta_text` is written out IN FULL for A and B, ready to paste, so the owner
 * can answer without opening another file. For C it is null, because drift asks
 * rather than answers, and the table's `drift_proposes_no_delta` CHECK makes
 * that an invariant of the database rather than a habit of this function.
 */
export function buildProposal(candidate: Candidate, currentCriteriaCount = 0): ProposalRow {
  const size = sizeDelta(candidate, currentCriteriaCount);
  const evidence: Record<string, unknown> = {
    key: candidate.key,
    occurrences: candidate.occurrences,
    weeks: candidate.weeks,
    lines: candidate.evidence,
    size: { delta: size.delta, paired_obligation: size.pairedObligation },
  };

  if (candidate.type === "drift") {
    // Runtime half of the type-level guarantee: a candidate that arrived as
    // JSON never met the compiler.
    const loose = candidate as unknown as Record<string, unknown>;
    if (loose.delta != null || loose.delta_text != null || loose.deltaText != null) {
      throw new DriftCarriesDeltaError(candidate.key);
    }
    evidence.criterion_id = candidate.criterionId;
    evidence.criterion_name = candidate.criterionName;
    evidence.last_fired_week = candidate.lastFiredWeek;
    evidence.question = candidate.question;
    return {
      user_id: candidate.userId,
      type: "drift",
      surface: candidate.surface,
      headline: `"${candidate.criterionName}" has not come up in ${STRIKE_WINDOW_WEEKS} weeks`,
      delta_text: null,
      if_wrong:
        "If you retire it and it was still doing work, whatever it was catching comes back and " +
        "nothing flags it, because the rule that would have is gone. If you keep it and it is " +
        "genuinely finished, it holds a slot the next real rule needs.",
      size_delta: size.delta,
      evidence,
      status: "awaiting",
    };
  }

  if (candidate.type === "false_positive") {
    evidence.criterion_id = candidate.criterionId;
    evidence.criterion_name = candidate.criterionName;
    evidence.surfaces = candidate.surfaces;
    const oneSurface = candidate.surfaces.length === 1 ? candidate.surfaces[0] : null;
    const delta = oneSurface
      ? `Change the rule "${candidate.criterionName}" so it does not apply to ${oneSurface}:\n\n` +
        `  ${candidate.criterionName}\n` +
        `  Applies to: everything except ${oneSurface}.\n\n` +
        "Replace the existing line with that one. You disagreed with it on " +
        `${oneSurface} ${candidate.occurrences} times and nowhere else, so it is probably right ` +
        "where it came from and wrong here.\n\n" +
        candidate.evidence.map(quoteLine).join("\n")
      : `Stop the rule "${candidate.criterionName}" blocking anything:\n\n` +
        `  ${candidate.criterionName}\n` +
        "  Treat as: a note, not a stop.\n\n" +
        "Replace the existing line with that one. It flagged work you were happy with " +
        `${candidate.occurrences} times across ${candidate.surfaces.join(", ")}, so it is firing ` +
        "too widely rather than being wrong in one place.\n\n" +
        candidate.evidence.map(quoteLine).join("\n");

    return {
      user_id: candidate.userId,
      type: "false_positive",
      surface: candidate.surface,
      headline:
        `"${candidate.criterionName}" flagged work you were happy with ${candidate.occurrences} times`,
      delta_text: delta,
      if_wrong:
        `If this is wrong, "${candidate.criterionName}" stops catching the thing it was written ` +
        "for, and nothing flags the ones it misses. You would see it as work going out that you " +
        "would have pulled back, and the next check against the pieces you graded is where it shows.",
      size_delta: size.delta,
      evidence,
      status: "awaiting",
    };
  }

  evidence.topic = candidate.topic;
  const name = shortName(candidate.topic);
  const delta =
    `Add one rule to your ${candidate.surface} checks:\n\n` +
    `  ${name}\n` +
    `  Check: ${candidate.topic}\n\n` +
    `You raised this ${candidate.occurrences} times and no rule covers it. ` +
    "It has nothing checkable attached yet, so it starts as a note rather than a stop.\n\n" +
    candidate.evidence.map(quoteLine).join("\n");

  return {
    user_id: candidate.userId,
    type: "uncovered",
    surface: candidate.surface,
    headline: `You raised this ${candidate.occurrences} times and no rule covers it`,
    delta_text: delta,
    if_wrong:
      "If this is wrong, the check starts flagging work you would have sent on a rule you never " +
      "actually held. You would see it as the check nagging about something you do not care " +
      "about, and pushing back on it twice brings it straight back here as the urgent kind.",
    size_delta: size.delta,
    evidence,
    status: "awaiting",
  };
}

/** A short handle for a new rule, taken from their own words, never invented. */
function shortName(topic: string): string {
  const words = String(topic ?? "").replace(/\s+/g, " ").trim().split(" ").slice(0, 5).join(" ");
  if (!words) return "Unnamed";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function evidenceLine(row: LedgerRow): EvidenceLine {
  return {
    week: row.week,
    surface: row.surface,
    criterion: row.criterion_name,
    verdict: row.verdict,
    quote: row.quote ?? null,
    disposition: row.disposition,
  };
}

/** The surface most of the rows landed on, with an alphabetical tiebreak. */
function dominantSurface(rows: readonly LedgerRow[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.surface) continue;
    counts.set(row.surface, (counts.get(row.surface) ?? 0) + 1);
  }
  let best: { surface: string; n: number } | null = null;
  for (const [surface, n] of [...counts].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!best || n > best.n) best = { surface, n };
  }
  return best?.surface ?? "unknown";
}

// ---------------------------------------------------------------------------
// The whole weekly pass, as arithmetic
// ---------------------------------------------------------------------------

export interface WeeklyPassInput {
  rows: readonly LedgerRow[];
  criteria: readonly CriterionRow[];
  nowWeek: string;
  /** Keys already proposed and awaiting or rejected. Never re-proposed. */
  alreadyProposed?: ReadonlySet<string>;
}

export interface WeeklyPassResult {
  window: string[];
  candidates: Candidate[];
  /** Counted and named, never proposed. See the header. */
  methodStrikes: StrikeGroup[];
  triggerStrikes: StrikeGroup[];
  /** Rows read, so a run that found nothing can say what it read. */
  rowsRead: number;
}

/**
 * Group, two-strike, type, order, and drop anything already decided on.
 *
 * "Do not argue and do not re-propose the same thing next week": a key that is
 * awaiting or rejected is skipped here, which is why rejection is silent rather
 * than a loop. The second rejection of the same criterion arrives as a Type B
 * on a different key, which is exactly the promotion the reference asks for.
 */
export function weeklyPass(input: WeeklyPassInput): WeeklyPassResult {
  const window = windowWeeks(input.nowWeek);
  const inWindow = input.rows.filter((row) => window.includes(row.week));
  const groups = groupBySignal(inWindow);
  const already = input.alreadyProposed ?? new Set<string>();

  const candidates: Candidate[] = [
    ...typeAUncovered(groups.output, window),
    ...typeBFalsePositive(groups.output, window),
    ...typeCDrift(input.criteria, input.rows, input.nowWeek),
  ].filter((candidate) => !already.has(candidate.key));

  return {
    window,
    candidates: orderProposals(candidates),
    methodStrikes: twoStrikes(groups.method, window),
    triggerStrikes: twoStrikes(groups.trigger, window),
    rowsRead: inWindow.length,
  };
}
