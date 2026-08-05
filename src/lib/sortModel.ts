/**
 * sortModel - the pure arithmetic behind the check (stage 2 of the harness chain).
 *
 * Everything here is a function of counts and of what the person actually typed.
 * No clock, no randomness, no network: the same inputs always produce the same
 * beat, which is the only way "this beat is honest" can be tested rather than
 * asserted. `src/__tests__/sortFlow.test.ts` pins every rule below.
 *
 * The rules it encodes, each traceable to a ruled challenge in CHALLENGE.md:
 *
 *   CH-03  Nothing about whether a rule separates the work may be shown before
 *          KILL_MIN_GRADED screens AND both sides of the split exist. The
 *          backend computes that gate (`can_show_kill`); this file refuses to
 *          select the beat without it. A staged beat at a fixed item number,
 *          fired when the computation cannot run, is the faked green tick this
 *          whole project exists to prevent.
 *   CH-08  The compiled standard is NEVER a mid-session beat. At screen 20 the
 *          strongest thing that may be shown is the person's own lines back to
 *          them, in their order, with no weights and no ranking, because about
 *          a third of the test set is still ungraded at that point and would be
 *          anchored to a standard they had just endorsed.
 *   CH-09  The open question at screens 8 / 16 / 24 is asked about a pair whose
 *          halves have BOTH been graded. manipPairDue() is that check; it
 *          returns null rather than asking about a half-seen pair.
 *   CH-12  Repeat probes are invisible. Nothing here labels an item as a
 *          repeat, and self-agreement is reportable only once the session is
 *          over (canReportSelfAgreement), never as a live counter, because a
 *          live counter tells the person the repeats exist.
 *
 * Plain language is a hard rule (CLAUDE.md): no display string produced or
 * selected here uses CTRL's internal vocabulary. Internal identifiers keep
 * their names; only what a person reads is translated.
 */

export type SortVerdict = 'send' | 'would_not_send' | 'skip';

/** One line the person wrote about one item, verbatim. */
export interface WhyLine {
  itemId: string;
  verdict: SortVerdict;
  why: string;
}

/**
 * Mirrors KILL_MIN_GRADED in supabase/functions/_shared/sort-composition.ts.
 * The backend is the authority (it also holds the 4-and-4 side counts and
 * returns the single `can_show_kill` boolean); this constant only stops the UI
 * from even asking before the earliest screen it could possibly be true.
 */
export const KILL_MIN_GRADED = 16;

/** Mirrors MIN_PAIRS_FOR_SPLIT_RATE. Fewer scoreable pairs is not a measurement. */
export const MIN_PAIRS_FOR_SPLIT_RATE = 4;

/** The earliest screen at which one line in their own words can resolve. */
export const FIRST_CONSTRUCT_AT = 5;

/** Where the weak, unranked "here is what you have said so far" beat lands (CH-08). */
export const CONSTRUCTS_BEAT_AT = 20;

/**
 * Below this a line is a grunt, not something to quote back at someone
 * ("meh", "no", "nope"). Mirrors MIN_WHY_CHARS_FOR_CONSTRUCT in grade-sort.
 */
export const MIN_WHY_CHARS = 12;

/** The screens the open question is asked after, when a pair is fully graded. */
export const MANIP_SCREENS: readonly number[] = [8, 16, 24];

/** How many of their own lines the screen-20 beat shows back. */
export const CONSTRUCTS_BEAT_MAX_LINES = 3;

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/**
 * Honest progress: a count of real screens, never a percentage. A percentage
 * over a deck that can legitimately run short (see shortfallNotes) is a made-up
 * denominator wearing a progress bar's clothes.
 */
export function formatProgress(done: number, total: number): string {
  if (!Number.isFinite(total) || total <= 0) return '';
  const safeDone = Number.isFinite(done) ? Math.round(done) : 0;
  const clamped = Math.max(0, Math.min(safeDone, Math.round(total)));
  return `${clamped} of ${Math.round(total)}`;
}

// ---------------------------------------------------------------------------
// Their own words
// ---------------------------------------------------------------------------

/** Lines long enough to quote back, from a real verdict (skips are excluded). */
export function usableLines(lines: WhyLine[]): WhyLine[] {
  return lines.filter(
    (line) => line.verdict !== 'skip' && (line.why ?? '').trim().length >= MIN_WHY_CHARS,
  );
}

export interface FirstConstruct {
  /** Verbatim, from the first thing they turned down and said why about. */
  reject: string;
  /** Verbatim, from the first thing they kept and said why about. */
  keep: string;
}

/**
 * The first line that can be resolved in the person's own words, which needs a
 * line about something they dropped AND a line about something they kept. One
 * side alone is a preference, not a distinction, and quoting it as one would be
 * inventing the half we do not have.
 *
 * The EARLIEST of each side wins so the sentence stops moving once it lands;
 * a beat that rewrites itself every screen reads as a machine guessing.
 */
export function pickFirstConstruct(lines: WhyLine[]): FirstConstruct | null {
  const usable = usableLines(lines);
  const reject = usable.find((line) => line.verdict === 'would_not_send');
  const keep = usable.find((line) => line.verdict === 'send');
  if (!reject || !keep) return null;
  return { reject: reject.why.trim(), keep: keep.why.trim() };
}

/** Their lines in the order they said them. No ranking, no weighting (CH-08). */
export function linesSoFar(lines: WhyLine[], limit = CONSTRUCTS_BEAT_MAX_LINES): string[] {
  return usableLines(lines)
    .slice(0, limit)
    .map((line) => line.why.trim());
}

// ---------------------------------------------------------------------------
// Beat selection
// ---------------------------------------------------------------------------

export type BeatKind =
  /** Raw signal only. Labelled plainly as not enough yet. */
  | 'accumulating'
  /** One distinction, in their own words, both sides evidenced. */
  | 'first_construct'
  /** Past the earliest screen but the counts do not support the check yet. */
  | 'watching'
  /** Both sides are on the board, so a rule can be tested against real grades. */
  | 'separation_ready'
  /** Screen 20: their lines back, unranked and unweighted. */
  | 'constructs_so_far'
  /** Every screen graded. */
  | 'complete';

/** Why a stronger beat did not fire. Rendered as plain copy by the panel. */
export type HoldBackReason =
  | 'too_early'
  | 'no_two_sided_lines'
  | 'counts_not_there';

export interface BeatInput {
  gradedCount: number;
  /** Screens in this deck. 0 while the deck is still being put together. */
  total: number;
  lines: WhyLine[];
  /** The backend gate. Never inferred locally (CH-03). */
  canShowKill: boolean;
}

export interface Beat {
  kind: BeatKind;
  kept: number;
  dropped: number;
  skipped: number;
  /** Verbatim; present on first_construct only. */
  reject?: string;
  keep?: string;
  /** Verbatim; present on constructs_so_far only. */
  lines?: string[];
  holdBack?: HoldBackReason;
}

export function countVerdicts(lines: WhyLine[]): { kept: number; dropped: number; skipped: number } {
  let kept = 0;
  let dropped = 0;
  let skipped = 0;
  for (const line of lines) {
    if (line.verdict === 'send') kept += 1;
    else if (line.verdict === 'would_not_send') dropped += 1;
    else skipped += 1;
  }
  return { kept, dropped, skipped };
}

/**
 * Can this beat fire without inventing anything? The predicate the panel is
 * built on, and the one worth testing directly: every "yes" here is a claim
 * that the data behind the beat actually exists.
 */
export function canBeatFireHonestly(kind: BeatKind, input: BeatInput): boolean {
  switch (kind) {
    case 'complete':
      return input.total > 0 && input.gradedCount >= input.total;
    case 'constructs_so_far':
      return input.gradedCount >= CONSTRUCTS_BEAT_AT && linesSoFar(input.lines).length > 0;
    case 'separation_ready':
      // Two locks, both required: the backend says the counts are there, and we
      // are past the earliest screen at which that could ever be true.
      return input.gradedCount >= KILL_MIN_GRADED && input.canShowKill;
    case 'first_construct':
      return input.gradedCount >= FIRST_CONSTRUCT_AT && pickFirstConstruct(input.lines) !== null;
    case 'watching':
      return input.gradedCount >= KILL_MIN_GRADED;
    case 'accumulating':
      return true;
    default:
      return false;
  }
}

/**
 * The one beat the panel shows right now.
 *
 * Order is deliberate and each fall-through is a refusal, not a default: when a
 * stronger beat cannot fire honestly the panel drops to the weaker one and says
 * why, rather than dressing the weaker state in the stronger one's language.
 */
export function selectBeat(input: BeatInput): Beat {
  const counts = countVerdicts(input.lines);
  const base: Beat = { kind: 'accumulating', ...counts };

  if (canBeatFireHonestly('complete', input)) {
    return { ...base, kind: 'complete' };
  }

  if (canBeatFireHonestly('constructs_so_far', input)) {
    // CH-08: their words, their order, nothing ranked, nothing renamed, and
    // explicitly NOT the compiled standard.
    return { ...base, kind: 'constructs_so_far', lines: linesSoFar(input.lines) };
  }

  if (input.gradedCount >= KILL_MIN_GRADED) {
    if (canBeatFireHonestly('separation_ready', input)) {
      return { ...base, kind: 'separation_ready' };
    }
    return { ...base, kind: 'watching', holdBack: 'counts_not_there' };
  }

  if (input.gradedCount >= FIRST_CONSTRUCT_AT) {
    const first = pickFirstConstruct(input.lines);
    if (first) return { ...base, kind: 'first_construct', reject: first.reject, keep: first.keep };
    return { ...base, kind: 'accumulating', holdBack: 'no_two_sided_lines' };
  }

  return { ...base, holdBack: 'too_early' };
}

// ---------------------------------------------------------------------------
// The open question (CH-09)
// ---------------------------------------------------------------------------

export interface ManipDueInput {
  /** 1-based screen just graded. */
  screen: number;
  justGradedItemId: string;
  gradedIds: ReadonlySet<string>;
  /** Pairs already asked about in this session. */
  askedPairs: ReadonlySet<string>;
  pairByItem: ReadonlyMap<string, string>;
  pairMembers: ReadonlyMap<string, string[]>;
}

/**
 * Which pair the open question should be asked about, or null.
 *
 * Null is a first-class answer: at screen 8 the person may not yet have seen
 * both halves of anything (halves sit at least four positions apart and the
 * deck is shuffled), and asking about a half-seen pair would be asking them to
 * compare something they have not read. The question is skipped rather than
 * softened.
 *
 * The pair containing the item they just graded wins, because "those two" is
 * only a meaningful phrase about something fresh.
 */
export function manipPairDue(input: ManipDueInput): string | null {
  if (!MANIP_SCREENS.includes(input.screen)) return null;

  const complete = (pairId: string): boolean => {
    if (input.askedPairs.has(pairId)) return false;
    const members = input.pairMembers.get(pairId) ?? [];
    if (members.length !== 2) return false;
    return members.every((id) => input.gradedIds.has(id));
  };

  const justGradedPair = input.pairByItem.get(input.justGradedItemId);
  if (justGradedPair && complete(justGradedPair)) return justGradedPair;

  for (const pairId of input.pairMembers.keys()) {
    if (complete(pairId)) return pairId;
  }
  return null;
}

// ---------------------------------------------------------------------------
// What may be reported, and when
// ---------------------------------------------------------------------------

/** A split rate over fewer than four scoreable pairs is noise, not a number. */
export function canReportSplit(pairsScored: number): boolean {
  return pairsScored >= MIN_PAIRS_FOR_SPLIT_RATE;
}

/**
 * Self-agreement may only be reported once the session is over.
 *
 * It is measured by showing three items a second time. Reporting it live would
 * tell the person the repeats exist, which changes how they grade the rest and
 * destroys the measurement (CH-12).
 */
export function canReportSelfAgreement(probesScored: number, sessionComplete: boolean): boolean {
  return sessionComplete && probesScored > 0;
}

// ---------------------------------------------------------------------------
// Shortfalls (never hidden, never padded)
// ---------------------------------------------------------------------------

/** The slice of harness_runs.stage_detail the frontend reads. */
export interface SortRunDetail {
  items?: number;
  items_expected?: number;
  own_available?: number;
  own_expected?: number;
  own_shortfall?: number;
  peer_available?: number;
  peer_expected?: number;
  peer_shortfall?: number;
  peer_awaiting_curation?: boolean;
  held_out?: number;
  constructs?: number;
  constructs_expected?: number;
  pairs?: number;
  pairs_expected?: number;
}

/**
 * What the deck was missing, in plain words, with the cost stated.
 *
 * build-sort never pads: fewer real pieces means a shorter deck, and the
 * shortfall rides stage_detail. The only dishonest thing left to do with that
 * is not read it, so this is surfaced in the completion state every time.
 */
export function shortfallNotes(detail: SortRunDetail): string[] {
  const notes: string[] = [];

  const ownShort = Math.max(0, detail.own_shortfall ?? 0);
  if (ownShort > 0) {
    const have = detail.own_available ?? 0;
    const want = detail.own_expected ?? have + ownShort;
    notes.push(
      `I only had ${have} of your own pieces, not ${want}. Your own work is the part you reliably keep, so with fewer of them there is less on the keep side to measure against.`,
    );
  }

  if (detail.peer_awaiting_curation) {
    notes.push(
      'I had no public work by other people for this kind of writing, so those screens are missing. Without someone else in the mix this reads more like your reaction to yourself than your standard.',
    );
  } else {
    const peerShort = Math.max(0, detail.peer_shortfall ?? 0);
    if (peerShort > 0) {
      notes.push(
        `I was ${peerShort} short on public work by other people, so the deck ran that much lighter on the one class you did not write.`,
      );
    }
  }

  const items = detail.items;
  const expected = detail.items_expected;
  if (typeof items === 'number' && typeof expected === 'number' && items < expected) {
    notes.push(
      `The deck ran short: ${items} screens instead of ${expected}. That means fewer items in the test set, so the measurement at the end is weaker than a full deck would give.`,
    );
  }

  return notes;
}
