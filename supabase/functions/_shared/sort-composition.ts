/**
 * sort-composition: the deck arithmetic for stage 2 of the harness chain.
 *
 * Pure. No Deno imports, no network, no clock, no global randomness: every
 * non-deterministic choice is threaded through an injected `rng`, so the same
 * seed builds the same deck twice. vitest runs this file directly; build-sort
 * and grade-sort import it and hold no composition logic of their own.
 *
 * The item budget below is NOT the one in the original spec. It is the budget
 * as amended by the ruled CHALLENGE.md register:
 *
 *   CH-03  20 synthesised items are 5 constructs x 2 matched pairs, not 10
 *          constructs x 1 pair. One pair per construct meant holding out three
 *          whole pairs zeroed 3 of 10 constructs (they could never be tested at
 *          any threshold) and left per-criterion n = 2. Five constructs at two
 *          pairs is the same 20 items with n = 4 per construct and nothing
 *          zeroed by the hold-out.
 *   CH-08  6 of the items are the person's OWN real work. The preamble
 *          pre-normalises rejecting, so a discerning grader rejects most
 *          model-written items; without a class they reliably send, the accept
 *          side starves and every criterion compiles 'untested'. Own work is
 *          the structural guarantee, not a threshold tweak.
 *   CH-11  4 peer items are public, attributed writing from the person's
 *          sector. Never another customer's work; see ./peer-corpus.ts.
 *   CH-12  3 repeat probes are appended. They re-show an earlier item to
 *          measure the GRADER (test-retest), and are excluded from training
 *          AND from the hold-out, because they score nothing else.
 *   CH-09  pairSplitRate is the halt metric. It replaced the leading-form
 *          manipulation check ("they were meant to differ in one way, is that
 *          the difference you saw?"), which asserted its own answer and had
 *          coin-flip power over the largest assumption in the method.
 *
 * Two invariants are load-bearing and both are unit-tested here:
 *   - matched-pair halves never sit closer than MIN_PAIR_SEPARATION positions,
 *     because a pair seen side by side is a comparison, not a forced sort;
 *   - the hold-out never splits a pair (revision-2 defect 3). Splitting one
 *     destroys the only thing the pair design buys.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ItemOrigin = "own" | "synthesised" | "peer" | "rewrite";
export type PairRole = "satisfies" | "violates";
export type Verdict = "send" | "would_not_send" | "skip";

/** One generated matched pair, before it is positioned. */
export interface PairInput {
  constructId: string;
  /** 1 or 2: which of the construct's two pairs this is. */
  pairIndex: number;
  satisfies: string;
  violates: string;
  /** The answer key. One plain sentence naming the single intended difference. */
  intendedDimension: string;
}

/** One peer artefact: public, attributed writing (CH-11). */
export interface PeerInput {
  body: string;
  sourceLabel: string;
}

export interface PlanDeckInput {
  pairs: PairInput[];
  own: string[];
  peer: PeerInput[];
  /** Injected uniform [0,1) source. Same rng in, same deck out. */
  rng: () => number;
  /**
   * Which deck this is. Only `repeats` is read here (every other count comes
   * from the arrays above), and it defaults to the full budget so an existing
   * caller behaves exactly as it did.
   */
  budget?: SortBudget;
}

/**
 * A positioned item, one row of sort_items before it has a database id.
 * `key` is the stable local identity used by chooseHoldOut and by the repeat
 * pointers; the caller maps keys to uuids after insert.
 */
export interface PlannedItem {
  key: string;
  position: number;
  body: string;
  origin: ItemOrigin;
  /** Local pair identity (not a uuid); null for own, peer and repeat items. */
  pairKey: string | null;
  pairRole: PairRole | null;
  constructId: string | null;
  /** Stored on the satisfies half only, so one pair carries one answer key. */
  intendedDimension: string | null;
  sourceLabel: string | null;
  /** Set on repeat probes only (CH-12). */
  repeatOfKey: string | null;
  repeatOfPosition: number | null;
}

// ---------------------------------------------------------------------------
// The budget
// ---------------------------------------------------------------------------

export interface SortBudget {
  /** Constructs the synthesised half of the deck tests. */
  constructs: number;
  /** Matched pairs per construct (CH-03: two, so per-construct n is 4). */
  pairsPerConstruct: number;
  pairs: number;
  synthesised: number;
  /** The person's real artefacts (CH-08: the guaranteed accept side). */
  own: number;
  /** Public attributed sector writing (CH-11). */
  peer: number;
  /** Unique screens before the repeat probes. */
  unique: number;
  /** Self-agreement probes, appended (CH-12). */
  repeats: number;
  /** Screens the grader actually sees. */
  total: number;
  holdOut: {
    /** Whole pairs only, never a split one. */
    pairs: number;
    pairItems: number;
    own: number;
    peer: number;
    items: number;
  };
  /** Items that train the compile step: unique minus hold-out. */
  training: number;
}

export const SORT_BUDGET: SortBudget = {
  constructs: 5,
  pairsPerConstruct: 2,
  pairs: 10,
  synthesised: 20,
  own: 6,
  peer: 4,
  unique: 30,
  repeats: 3,
  total: 33,
  // 12, not 10, and the two spare items are the whole point. The release floor
  // for a measured claim is 10 GRADED held-out items, so holding out exactly 10
  // made Verified arithmetically unreachable the moment a leader skipped one
  // screen, however good the gate was. A label nobody can reach is not a high
  // bar, it is a broken one. Two items of slack absorb the ordinary skip.
  //
  // The cost is two training items (20 -> 18), which the discrimination test
  // can afford: it needs 4 accepted and 4 rejected among the items whose probe
  // applies, and 18 clears that with room.
  holdOut: { pairs: 4, pairItems: 8, own: 2, peer: 2, items: 12 },
  training: 18,
};

/**
 * The shorter deck: about twelve minutes instead of about twenty.
 *
 * WHAT IT CUTS, AND WHY IT IS NOT SIMPLY "HALF"
 *
 * A proportional halving produces nothing. The binding floor downstream is
 * discriminationVerdict's 4 accepted AND 4 rejected TRAINING items per
 * criterion; miss it and every criterion compiles 'untested', which means zero
 * criteria rows, which means the standard has nothing in it. So the two classes
 * that feed the ACCEPT side are protected and the rest is cut:
 *
 *   - `own` drops 6 -> 5 but holdOut.own drops 2 -> 1, so FOUR own items train
 *     in both budgets. CH-08's argument is that the person's own work is the
 *     class a discerning grader reliably sends, and the preamble deliberately
 *     pre-normalises rejecting. Halving own starves the accept side and is the
 *     single fastest way to make this whole deck measure nothing.
 *   - the synthesised half carries the cut: 5 constructs -> 3, so 10 pairs -> 6.
 *     Five pairs still train (one is held out), giving 5 satisfying halves on
 *     the accept side beside the 4 own items.
 *   - `peer` drops 4 -> 2, one held out.
 *
 * WHAT IT COSTS, STATED RATHER THAN BURIED
 *
 *   1. Verified is ARITHMETICALLY UNREACHABLE. 4 held-out items is below
 *      VERIFIED_MIN_HELD_OUT (10), so no measurement run can ever lift this
 *      deck past Provisional. That is correct: a precision computed on four
 *      items is a number about four items. It is surfaced on screen via
 *      canReachVerified(), never left for the reader to infer.
 *   2. Three constructs are tested, not five.
 *   3. With one placement block of six pairs, the first pair completes around
 *      position nine, so the open manipulation question lands once (screen 16)
 *      rather than two or three times.
 *
 * Every other gate clears: pair separation (one block of 6 gives offset 6, over
 * MIN_PAIR_SEPARATION), repeat sources (min(10, 19+1-8) = 10 candidates, so all
 * 3 probes are placed and TRIAGE_MIN_REPEATS is met), MIN_PAIRS_FOR_SPLIT_RATE
 * (6 pairs are all graded; hold-out suppresses TRAINING, not grading),
 * KILL_MIN_GRADED at 16 of 22, and CONSTRUCTS_BEAT_AT at 20 of 22.
 */
export const SHORT_SORT_BUDGET: SortBudget = {
  constructs: 3,
  pairsPerConstruct: 2,
  pairs: 6,
  synthesised: 12,
  own: 5,
  peer: 2,
  unique: 19,
  repeats: 3,
  total: 22,
  holdOut: { pairs: 1, pairItems: 2, own: 1, peer: 1, items: 4 },
  training: 15,
};

export type SortDepth = "short" | "full";

/** The default when a caller says nothing. Short, by product decision. */
export const DEFAULT_SORT_DEPTH: SortDepth = "short";

/** Anything that is not exactly 'full' is short. An unreadable depth is never the long deck. */
export function parseSortDepth(raw: unknown): SortDepth {
  return raw === "full" ? "full" : DEFAULT_SORT_DEPTH;
}

export function budgetForDepth(depth: SortDepth): SortBudget {
  return depth === "full" ? SORT_BUDGET : SHORT_SORT_BUDGET;
}

// ---------------------------------------------------------------------------
// Placement constants
// ---------------------------------------------------------------------------

/**
 * Matched-pair halves sit at least this many positions apart. Four is the
 * protocol's floor (skills/ctrl-intake/leaves/sort.md); the block scheme below
 * exceeds it in practice.
 */
export const MIN_PAIR_SEPARATION = 4;

/**
 * The person's own work never appears in the first three screens. A
 * self-referential item that early primes them to hunt for the trap, which is
 * the one reading of the deck the preamble spends two sentences preventing.
 */
export const OWN_EARLIEST_POSITION = 4;

/**
 * Own items are spread from here to the end, so the deck reads mid-to-late for
 * self-authored work while still landing two or three of them before the kill
 * gate can compute at item 16 (CH-08 needs accepts on the board by then).
 */
export const OWN_WINDOW_START = 5;

/** Repeat probes re-show something from the opening stretch of the deck. */
export const REPEAT_SOURCE_WINDOW = 10;

/** A repeat lands at least this far after the item it repeats (CH-12). */
export const REPEAT_MIN_GAP = 8;

/** Target pairs per placement block; see coupleIndices(). */
const BLOCK_TARGET_PAIRS = 5;

// ---------------------------------------------------------------------------
// Halt thresholds (CH-09)
// ---------------------------------------------------------------------------

/**
 * PROVISIONAL, PENDING DATA. These are the starting rule CH-09 names, not a
 * measured boundary. The Phase 0.5 hand run and the first real sorts produce
 * the distribution these get tuned against; until then they are a documented
 * guess and must be reported as one wherever they gate anything.
 */
export const PAIR_SPLIT_PROCEED_AT = 0.7;
/** PROVISIONAL, PENDING DATA. Below this the generator is treated as confounded. */
export const PAIR_SPLIT_HALT_BELOW = 0.4;
/** PROVISIONAL, PENDING DATA. Fewer scoreable pairs than this is not a measurement. */
export const MIN_PAIRS_FOR_SPLIT_RATE = 4;

/** No kill beat before this many graded screens (CH-03 defect 5). */
export const KILL_MIN_GRADED = 16;
/** And not before both sides of the discrimination test exist (CH-03 / CH-08). */
export const KILL_MIN_EACH_SIDE = 4;

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/**
 * mulberry32. A small, seedable uniform source so a run id produces the same
 * deck on a retry. Deliberately here rather than in the edge function: a deck
 * that cannot be reproduced cannot be audited.
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash, for seeding an rng from a uuid. */
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function shuffled<T>(list: T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Pick k elements spread across `list`: the list is cut into k contiguous
 * bands and one element is drawn from each. Bands are disjoint, so the result
 * has no duplicates and is never clumped.
 */
function pickSpread<T>(list: T[], k: number, rng: () => number): T[] {
  if (k <= 0 || list.length === 0) return [];
  if (k >= list.length) return [...list];
  const out: T[] = [];
  for (let i = 0; i < k; i++) {
    const lo = Math.floor((i * list.length) / k);
    const hi = Math.floor(((i + 1) * list.length) / k) - 1;
    const span = Math.max(1, hi - lo + 1);
    const idx = Math.min(hi, lo + Math.floor(rng() * span));
    out.push(list[idx]);
  }
  return out;
}

/** Deterministic (rng-free) spread of k indices across n slots. */
function spreadIndices(n: number, k: number): number[] {
  if (k <= 0 || n <= 0) return [];
  if (k >= n) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: k }, (_, i) => Math.floor((i * n) / k));
}

/** Split P into n blocks as evenly as possible, largest first. */
function evenSplit(total: number, blocks: number): number[] {
  const n = Math.max(1, blocks);
  const base = Math.floor(total / n);
  const rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/**
 * Couple the 2P slots reserved for pair items so that the two halves of any
 * pair are at least MIN_PAIR_SEPARATION positions apart.
 *
 * The slots arrive sorted, so an index offset of k guarantees a POSITION gap of
 * at least k. Slots are cut into blocks of `b` pairs (2b slots) and coupled
 * within a block at offset b, which makes the gap at least b. Blocks are sized
 * around BLOCK_TARGET_PAIRS so the first pair completes early enough for the
 * open manipulation question at screen 8 while every offset stays >= 4.
 *
 * Honest limit: with fewer than 4 pairs no index offset can reach 4, so the
 * separation there is whatever the deck's own spread gives. That shape only
 * arises when the person has one construct, and the caller reports it.
 */
function coupleIndices(slotCount: number): Array<[number, number]> {
  const P = Math.floor(slotCount / 2);
  if (P <= 0) return [];
  const blocks = evenSplit(P, Math.max(1, Math.round(P / BLOCK_TARGET_PAIRS)));
  const couples: Array<[number, number]> = [];
  let cursor = 0;
  for (const k of blocks) {
    for (let j = 0; j < k; j++) couples.push([cursor + j, cursor + k + j]);
    cursor += 2 * k;
  }
  return couples;
}

// ---------------------------------------------------------------------------
// planDeck
// ---------------------------------------------------------------------------

/**
 * Position every item, then append the repeat probes.
 *
 * Order of reservation matters and is not arbitrary:
 *   1. own positions first, because their constraint (never screens 1 to 3,
 *      spread mid-to-late) is the only one anchored to absolute positions;
 *   2. peer next, spread across what is left, so the deck never runs a block of
 *      model-written items with no outside voice in it;
 *   3. pairs into the remainder, coupled by the block scheme above.
 */
export function planDeck(input: PlanDeckInput): PlannedItem[] {
  const { pairs, own, peer, rng, budget = SORT_BUDGET } = input;
  const nPairs = pairs.length;
  const nOwn = own.length;
  const nPeer = peer.length;
  const total = nPairs * 2 + nOwn + nPeer;
  if (total === 0) return [];

  const allPositions = Array.from({ length: total }, (_, i) => i + 1);

  // 1. own
  let ownWindow = allPositions.filter((p) => p >= Math.min(OWN_WINDOW_START, total));
  if (ownWindow.length < nOwn) {
    // Degenerate deck (almost all own work). Take the last nOwn positions,
    // which still keeps them out of the opening screens wherever there is room.
    ownWindow = allPositions.slice(Math.max(0, total - nOwn));
  }
  const ownPositions = pickSpread(ownWindow, nOwn, rng);
  const ownTaken = new Set(ownPositions);

  // 2. peer
  const freeAfterOwn = allPositions.filter((p) => !ownTaken.has(p));
  const peerPositions = pickSpread(freeAfterOwn, nPeer, rng);
  const peerTaken = new Set(peerPositions);

  // 3. pairs
  const pairSlots = freeAfterOwn.filter((p) => !peerTaken.has(p));
  const couples = coupleIndices(pairSlots.length);
  const pairOrder = shuffled(pairs, rng);

  const items: PlannedItem[] = [];

  couples.forEach((couple, i) => {
    const pair = pairOrder[i];
    if (!pair) return;
    const pairKey = `pair:${pair.constructId}:${pair.pairIndex}`;
    // Which half leads is coin-flipped, so "satisfies first" is not a pattern
    // the grader can learn halfway through the deck.
    const satisfiesFirst = rng() < 0.5;
    const [loIdx, hiIdx] = couple;
    const loPos = pairSlots[loIdx];
    const hiPos = pairSlots[hiIdx];
    const halves: Array<{ role: PairRole; body: string; position: number }> = satisfiesFirst
      ? [
        { role: "satisfies", body: pair.satisfies, position: loPos },
        { role: "violates", body: pair.violates, position: hiPos },
      ]
      : [
        { role: "violates", body: pair.violates, position: loPos },
        { role: "satisfies", body: pair.satisfies, position: hiPos },
      ];
    for (const half of halves) {
      items.push({
        key: `${pairKey}:${half.role}`,
        position: half.position,
        body: half.body,
        origin: "synthesised",
        pairKey,
        pairRole: half.role,
        constructId: pair.constructId,
        // The answer key rides the satisfies half only: one pair, one key.
        intendedDimension: half.role === "satisfies" ? pair.intendedDimension : null,
        sourceLabel: null,
        repeatOfKey: null,
        repeatOfPosition: null,
      });
    }
  });

  ownPositions.forEach((position, i) => {
    items.push({
      key: `own:${i}`,
      position,
      body: own[i],
      origin: "own",
      pairKey: null,
      pairRole: null,
      constructId: null,
      intendedDimension: null,
      sourceLabel: null,
      repeatOfKey: null,
      repeatOfPosition: null,
    });
  });

  peerPositions.forEach((position, i) => {
    items.push({
      key: `peer:${i}`,
      position,
      body: peer[i].body,
      origin: "peer",
      pairKey: null,
      pairRole: null,
      constructId: null,
      intendedDimension: null,
      sourceLabel: peer[i].sourceLabel,
      repeatOfKey: null,
      repeatOfPosition: null,
    });
  });

  items.sort((a, b) => a.position - b.position);

  // 4. repeats (CH-12). Appended after the unique deck, sourced from the
  // opening stretch, and only where the gap rule can actually be met.
  const latestSource = Math.min(REPEAT_SOURCE_WINDOW, total + 1 - REPEAT_MIN_GAP);
  const repeatCandidates = items.filter((it) => it.position <= latestSource);
  const sources = pickSpread(repeatCandidates, Math.min(budget.repeats, repeatCandidates.length), rng);
  sources.forEach((source, i) => {
    items.push({
      key: `repeat:${i}`,
      position: total + 1 + i,
      body: source.body,
      // Origin is inherited so the screen looks identical to its first showing.
      origin: source.origin,
      // Deliberately NOT carrying pair_id/pair_role/targets: a repeat must not
      // land a third grade on a pair and skew the split rate it is not part of.
      pairKey: null,
      pairRole: null,
      constructId: null,
      intendedDimension: null,
      sourceLabel: source.sourceLabel,
      repeatOfKey: source.key,
      repeatOfPosition: source.position,
    });
  });

  return items;
}

/** Smallest position gap between the halves of any pair. Infinity when none. */
export function minPairSeparation(items: PlannedItem[]): number {
  const byPair = new Map<string, number[]>();
  for (const it of items) {
    if (!it.pairKey || it.repeatOfKey) continue;
    const list = byPair.get(it.pairKey) ?? [];
    list.push(it.position);
    byPair.set(it.pairKey, list);
  }
  let min = Infinity;
  for (const positions of byPair.values()) {
    if (positions.length < 2) continue;
    positions.sort((a, b) => a - b);
    for (let i = 1; i < positions.length; i++) {
      min = Math.min(min, positions[i] - positions[i - 1]);
    }
  }
  return min;
}

// ---------------------------------------------------------------------------
// chooseHoldOut
// ---------------------------------------------------------------------------

export interface HoldOutSelection {
  heldOutIds: string[];
  pairs: number;
  own: number;
  peer: number;
}

/**
 * The budget's held-out share never trains anything: 12 of the full deck's 30,
 * 4 of the short deck's 19.
 *
 * WHOLE PAIRS ONLY. Holding out items at random splits roughly half the pairs
 * across the boundary and destroys the one property the pair design buys: that
 * a hold-out pair tests the same construct the training set taught. Repeats are
 * never held out; they measure the grader, not the standard.
 *
 * THE COUNTS ARE ABSOLUTE, NOT PROPORTIONAL, WHICH IS WHY THE BUDGET IS A
 * PARAMETER. Applying the full deck's holdOut.pairs (4) to a six-pair deck
 * makes spreadIndices take its k >= n branch and hold out FOUR OF SIX pairs,
 * leaving two pairs to train on. Two training pairs cannot reach
 * discriminationVerdict's 4-and-4 floor, so every criterion compiles 'untested'
 * and the sort produces no standard at all. Each budget carries its own
 * hold-out shape for exactly that reason.
 *
 * rng-free on purpose. planDeck has already randomised position, so an evenly
 * spread selection over position order is already unpredictable, and a
 * deterministic hold-out is one less thing to reproduce when auditing a run.
 */
export function chooseHoldOut(
  items: PlannedItem[],
  budget: SortBudget = SORT_BUDGET,
): HoldOutSelection {
  const unique = items.filter((it) => !it.repeatOfKey);

  const pairFirstPosition = new Map<string, number>();
  const pairMembers = new Map<string, PlannedItem[]>();
  for (const it of unique) {
    if (!it.pairKey) continue;
    const list = pairMembers.get(it.pairKey) ?? [];
    list.push(it);
    pairMembers.set(it.pairKey, list);
    const seen = pairFirstPosition.get(it.pairKey);
    if (seen === undefined || it.position < seen) pairFirstPosition.set(it.pairKey, it.position);
  }
  // Complete pairs only: half a pair is not a pair.
  const completePairs = [...pairMembers.entries()]
    .filter(([, members]) => members.length === 2)
    .map(([key]) => key)
    .sort((a, b) => (pairFirstPosition.get(a) ?? 0) - (pairFirstPosition.get(b) ?? 0));

  const ownItems = unique.filter((it) => it.origin === "own").sort((a, b) => a.position - b.position);
  const peerItems = unique.filter((it) => it.origin === "peer").sort((a, b) => a.position - b.position);

  const pairPicks = spreadIndices(completePairs.length, Math.min(budget.holdOut.pairs, completePairs.length))
    .map((i) => completePairs[i]);
  const ownPicks = spreadIndices(ownItems.length, Math.min(budget.holdOut.own, ownItems.length))
    .map((i) => ownItems[i]);
  const peerPicks = spreadIndices(peerItems.length, Math.min(budget.holdOut.peer, peerItems.length))
    .map((i) => peerItems[i]);

  const heldOutIds: string[] = [];
  for (const pairKey of pairPicks) {
    for (const member of pairMembers.get(pairKey) ?? []) heldOutIds.push(member.key);
  }
  for (const it of ownPicks) heldOutIds.push(it.key);
  for (const it of peerPicks) heldOutIds.push(it.key);

  return {
    heldOutIds,
    pairs: pairPicks.length,
    own: ownPicks.length,
    peer: peerPicks.length,
  };
}

// ---------------------------------------------------------------------------
// pairSplitRate: the halt metric (CH-09)
// ---------------------------------------------------------------------------

export interface PairGradeRow {
  pairId: string | null;
  pairRole: PairRole | null;
  verdict: Verdict;
}

export interface PairSplitResult {
  split: number;
  total: number;
  /** split / total, or 0 when nothing is scoreable. Read `total` before `rate`. */
  rate: number;
}

/**
 * A pair SPLITS when the satisfying half was sent and the violating half was
 * not. That is the free, unbiased instrument CH-09 moved the halt onto: ten
 * behavioural observations already in the data, no questions asked.
 *
 * A pair counts toward the denominator only when both halves are graded and
 * neither is a skip. Skip is excluded from every calculation in this
 * instrument; it is an escape, never a middle point.
 *
 * Residual confound, stated because it does not go away: a non-splitting pair
 * is either confounded OR targets a construct the person does not hold. The
 * open manipulation answers are the diagnostic for which.
 */
export function pairSplitRate(grades: PairGradeRow[]): PairSplitResult {
  const byPair = new Map<string, { satisfies?: Verdict; violates?: Verdict }>();
  for (const g of grades) {
    if (!g.pairId || !g.pairRole) continue;
    const entry = byPair.get(g.pairId) ?? {};
    entry[g.pairRole] = g.verdict;
    byPair.set(g.pairId, entry);
  }

  let split = 0;
  let total = 0;
  for (const entry of byPair.values()) {
    const { satisfies, violates } = entry;
    if (!satisfies || !violates) continue;
    if (satisfies === "skip" || violates === "skip") continue;
    total += 1;
    if (satisfies === "send" && violates === "would_not_send") split += 1;
  }

  return { split, total, rate: total > 0 ? split / total : 0 };
}

/** The rate, or null when too few pairs are scoreable to call it a measurement. */
export function splitRateForHalt(
  grades: PairGradeRow[],
  minPairs: number = MIN_PAIRS_FOR_SPLIT_RATE,
): number | null {
  const result = pairSplitRate(grades);
  return result.total >= minPairs ? result.rate : null;
}

export type HaltVerdict = "proceed" | "proceed_flagged" | "halt";

/**
 * CH-09's starting rule. Null (not enough scoreable pairs yet) is
 * 'proceed_flagged', never 'proceed': an unmeasured generator is not a passing
 * generator, and it is not a failing one either.
 */
export function haltVerdict(rate: number | null): HaltVerdict {
  if (rate === null || Number.isNaN(rate)) return "proceed_flagged";
  if (rate >= PAIR_SPLIT_PROCEED_AT) return "proceed";
  if (rate >= PAIR_SPLIT_HALT_BELOW) return "proceed_flagged";
  return "halt";
}

// ---------------------------------------------------------------------------
// selfAgreement: the grader check (CH-12)
// ---------------------------------------------------------------------------

export interface RepeatGradeRow {
  itemId: string;
  /** Set on the probe; points at the item it re-shows. */
  repeatOfItemId?: string | null;
  verdict: Verdict;
}

export interface SelfAgreementResult {
  matched: number;
  total: number;
}

/**
 * Test-retest over the repeat probes. An inconsistent grader produces the same
 * signature as a confounded generator (flat gaps, everything untested), so
 * without this number the release gate cannot be read at all.
 *
 * Skips are excluded on both showings, same rule as everywhere else.
 */
export function selfAgreement(grades: RepeatGradeRow[]): SelfAgreementResult {
  const byItem = new Map<string, Verdict>();
  for (const g of grades) byItem.set(g.itemId, g.verdict);

  let matched = 0;
  let total = 0;
  for (const g of grades) {
    if (!g.repeatOfItemId) continue;
    const first = byItem.get(g.repeatOfItemId);
    if (!first) continue;
    if (first === "skip" || g.verdict === "skip") continue;
    total += 1;
    if (first === g.verdict) matched += 1;
  }
  return { matched, total };
}

// ---------------------------------------------------------------------------
// The kill gate (CH-03 defect 5, CH-08)
// ---------------------------------------------------------------------------

export interface KillGateInput {
  /** Screens graded so far in this session, including held-out and repeats. */
  gradedCount: number;
  /** 'send' verdicts among graded TRAINING items (not held out, not a repeat). */
  trainingAccepts: number;
  /** 'would_not_send' verdicts among graded training items. */
  trainingRejects: number;
}

/**
 * Whether a kill (or any compiled criterion) may be shown yet.
 *
 * The spec pinned the first kill to item 14. At item 14 the expected graded
 * count is 9.3 and the 4-and-4 rule holds about half the time, most often
 * failing for exactly the discerning grader the product targets, so the beat
 * the flow called most important was unavailable at random. Kills now land when
 * they compute, never before KILL_MIN_GRADED, and the UI reads this flag rather
 * than faking the beat.
 */
export function canShowKill(input: KillGateInput): boolean {
  return input.gradedCount >= KILL_MIN_GRADED &&
    input.trainingAccepts >= KILL_MIN_EACH_SIDE &&
    input.trainingRejects >= KILL_MIN_EACH_SIDE;
}

// ---------------------------------------------------------------------------
// Text matching (CH-09 open answers, CH-10 emergent constructs)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "being", "it", "its", "this", "that", "these", "those", "of", "to", "in", "on",
  "for", "with", "as", "at", "by", "from", "they", "them", "their", "you", "your",
  "he", "she", "his", "her", "we", "our", "us", "my", "me", "one", "ones", "other",
  "another", "would", "could", "should", "not", "no", "do", "does", "did", "have",
  "has", "had", "than", "then", "there", "here", "what", "which", "who", "whom",
  "how", "when", "where", "why", "so", "if", "about", "into", "out", "up", "down",
  "over", "under", "more", "most", "less", "least", "very", "just", "only", "also",
  "too", "can", "will", "thing", "things", "something", "anything", "both", "same",
  "two", "second", "first", "difference", "different", "differ", "between", "seem",
  "seems", "like", "reads", "read", "feels", "feel", "sounds", "sound",
]);

/** lowercase, punctuation-stripped, stopword-free, lightly de-pluralised. */
export function contentTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of (text ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3) continue;
    const token = raw.length > 3 && raw.endsWith("s") && !raw.endsWith("ss")
      ? raw.slice(0, -1)
      : raw;
    if (STOPWORDS.has(token) || STOPWORDS.has(raw)) continue;
    out.add(token);
  }
  return out;
}

function sharedCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

/** Provisional: tuned on the first real open answers, not on anything yet. */
export const DIMENSION_MATCH_MIN_SHARED = 2;
export const DIMENSION_MATCH_MIN_RATIO = 0.3;

/**
 * Does an open manipulation answer name the intended dimension?
 *
 * Deliberately crude token overlap. The open answer is the diagnostic, not the
 * gate (the gate is pair split), and the raw answer is stored regardless, so a
 * generous-but-dumb scorer costs nothing a human reader cannot correct later.
 */
export function namesIntendedDimension(answer: string, intendedDimension: string): boolean {
  const target = contentTokens(intendedDimension);
  if (target.size === 0) return false;
  const given = contentTokens(answer);
  const shared = sharedCount(target, given);
  return shared >= DIMENSION_MATCH_MIN_SHARED && shared / target.size >= DIMENSION_MATCH_MIN_RATIO;
}

export interface ConstructLike {
  id: string;
  emergentPole: string;
}

/** Provisional: overlap over the shorter phrase, so a terse why line can match. */
export const CONSTRUCT_MATCH_MIN_SHARED = 2;
export const CONSTRUCT_MATCH_MIN_RATIO = 0.5;

/**
 * Does this why line already have somewhere to go?
 *
 * CH-10: a why line matching no existing construct was the highest-value column
 * in the schema being discarded. When this returns null, grade-sort writes a
 * new candidate construct in the person's own words, which is the only path by
 * which a construct enters the system from the PERSON rather than from a
 * stage-1 model guess.
 *
 * Matching is intentionally loose (any overlap over the shorter phrase). A
 * false match loses a duplicate; a false miss creates a candidate that the
 * compile step can retire. Neither is expensive, and candidate status carries
 * no claim.
 */
export function matchesExistingConstruct(
  why: string,
  constructs: ConstructLike[],
): ConstructLike | null {
  const tokens = contentTokens(why);
  if (tokens.size === 0) return null;
  let best: ConstructLike | null = null;
  let bestScore = 0;
  for (const c of constructs) {
    const poleTokens = contentTokens(c.emergentPole);
    if (poleTokens.size === 0) continue;
    const shared = sharedCount(tokens, poleTokens);
    if (shared < CONSTRUCT_MATCH_MIN_SHARED) continue;
    const ratio = shared / Math.min(tokens.size, poleTokens.size);
    if (ratio >= CONSTRUCT_MATCH_MIN_RATIO && ratio > bestScore) {
      bestScore = ratio;
      best = c;
    }
  }
  return best;
}
