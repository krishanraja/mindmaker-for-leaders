import { describe, it, expect } from 'vitest';
import {
  CONSTRUCTS_BEAT_AT,
  FIRST_CONSTRUCT_AT,
  KILL_MIN_GRADED,
  canBeatFireHonestly,
  canReportSelfAgreement,
  canReportSplit,
  formatProgress,
  linesSoFar,
  manipPairDue,
  measurementLines,
  pickFirstConstruct,
  selectBeat,
  shortfallNotes,
  usableLines,
  type BeatInput,
  type WhyLine,
} from '@/lib/sortModel';

/**
 * The rules that keep the check honest, pinned.
 *
 * These are not rendering tests. Every case below is a claim the panel makes to
 * a person about their own judgement, and the only thing standing between a
 * true claim and a plausible-looking fabricated one is the predicate under
 * test. A beat that fires when its data does not exist is the exact failure
 * this whole instrument was built to avoid.
 */

const line = (verdict: WhyLine['verdict'], why: string, itemId = why.slice(0, 8)): WhyLine => ({
  itemId,
  verdict,
  why,
});

const REJECT = 'it reads like it could be for anyone';
const KEEP = 'it names the actual number we agreed';

function input(overrides: Partial<BeatInput> = {}): BeatInput {
  return { gradedCount: 0, total: 33, lines: [], canShowKill: false, ...overrides };
}

describe('formatProgress', () => {
  it('counts real screens, never a percentage', () => {
    expect(formatProgress(12, 30)).toBe('12 of 30');
    expect(formatProgress(1, 33)).toBe('1 of 33');
  });

  it('clamps rather than printing a count past the deck', () => {
    expect(formatProgress(40, 30)).toBe('30 of 30');
    expect(formatProgress(-3, 30)).toBe('0 of 30');
  });

  it('says nothing at all when there is no deck to count against', () => {
    expect(formatProgress(0, 0)).toBe('');
    expect(formatProgress(5, Number.NaN)).toBe('');
  });
});

describe('usableLines', () => {
  it('drops grunts and skipped items', () => {
    const lines = [
      line('would_not_send', 'no'),
      line('skip', 'a perfectly long line about nothing'),
      line('send', KEEP),
    ];
    expect(usableLines(lines).map((l) => l.why)).toEqual([KEEP]);
  });
});

describe('pickFirstConstruct', () => {
  it('refuses to resolve a line from one side only', () => {
    expect(pickFirstConstruct([line('would_not_send', REJECT)])).toBeNull();
    expect(pickFirstConstruct([line('send', KEEP)])).toBeNull();
  });

  it('resolves once both sides have a real line, verbatim', () => {
    const first = pickFirstConstruct([line('would_not_send', REJECT), line('send', KEEP)]);
    expect(first).toEqual({ reject: REJECT, keep: KEEP });
  });

  it('keeps the earliest of each side so the sentence stops moving', () => {
    const first = pickFirstConstruct([
      line('would_not_send', REJECT, 'a'),
      line('send', KEEP, 'b'),
      line('would_not_send', 'some later thought entirely', 'c'),
      line('send', 'another later thought entirely', 'd'),
    ]);
    expect(first).toEqual({ reject: REJECT, keep: KEEP });
  });
});

describe('canBeatFireHonestly', () => {
  it('never lets anything about separating the work fire before the counts allow it (CH-03)', () => {
    // The gate is the backend's. Even at screen 30, false means false.
    expect(
      canBeatFireHonestly('separation_ready', input({ gradedCount: 30, canShowKill: false })),
    ).toBe(false);
    // And true from the backend still cannot fire early.
    expect(
      canBeatFireHonestly(
        'separation_ready',
        input({ gradedCount: KILL_MIN_GRADED - 1, canShowKill: true }),
      ),
    ).toBe(false);
    expect(
      canBeatFireHonestly(
        'separation_ready',
        input({ gradedCount: KILL_MIN_GRADED, canShowKill: true }),
      ),
    ).toBe(true);
  });

  it('will not resolve a line in their words without two-sided evidence', () => {
    const oneSided = input({ gradedCount: 12, lines: [line('would_not_send', REJECT)] });
    expect(canBeatFireHonestly('first_construct', oneSided)).toBe(false);

    const twoSided = input({
      gradedCount: 12,
      lines: [line('would_not_send', REJECT), line('send', KEEP)],
    });
    expect(canBeatFireHonestly('first_construct', twoSided)).toBe(true);
  });

  it('will not show their lines back before they have written any', () => {
    expect(canBeatFireHonestly('constructs_so_far', input({ gradedCount: 25 }))).toBe(false);
    expect(
      canBeatFireHonestly(
        'constructs_so_far',
        input({ gradedCount: 25, lines: [line('send', KEEP)] }),
      ),
    ).toBe(true);
  });

  it('only calls the session complete when every screen is graded', () => {
    expect(canBeatFireHonestly('complete', input({ gradedCount: 32, total: 33 }))).toBe(false);
    expect(canBeatFireHonestly('complete', input({ gradedCount: 33, total: 33 }))).toBe(true);
    // A deck that never loaded is not a finished session.
    expect(canBeatFireHonestly('complete', input({ gradedCount: 0, total: 0 }))).toBe(false);
  });
});

describe('selectBeat', () => {
  it('says plainly that the opening screens are not enough yet', () => {
    const beat = selectBeat(input({ gradedCount: 4, lines: [line('would_not_send', REJECT)] }));
    expect(beat.kind).toBe('accumulating');
    expect(beat.holdBack).toBe('too_early');
  });

  it('carries the raw counts even while it has nothing to say', () => {
    const beat = selectBeat(
      input({
        gradedCount: 3,
        lines: [line('send', KEEP, 'a'), line('would_not_send', REJECT, 'b'), line('skip', '', 'c')],
      }),
    );
    expect({ kept: beat.kept, dropped: beat.dropped, skipped: beat.skipped }).toEqual({
      kept: 1,
      dropped: 1,
      skipped: 1,
    });
  });

  it('resolves the first line in their own words at screen five, verbatim', () => {
    const beat = selectBeat(
      input({
        gradedCount: FIRST_CONSTRUCT_AT,
        lines: [line('would_not_send', REJECT), line('send', KEEP)],
      }),
    );
    expect(beat.kind).toBe('first_construct');
    expect(beat.reject).toBe(REJECT);
    expect(beat.keep).toBe(KEEP);
  });

  it('keeps accumulating, and says why, when the words are not there', () => {
    const beat = selectBeat(
      input({ gradedCount: 9, lines: [line('would_not_send', REJECT), line('would_not_send', 'same again here')] }),
    );
    expect(beat.kind).toBe('accumulating');
    expect(beat.holdBack).toBe('no_two_sided_lines');
  });

  it('is still watching at screen 16 when the counts are not there (CH-03)', () => {
    const beat = selectBeat(
      input({
        gradedCount: KILL_MIN_GRADED,
        canShowKill: false,
        lines: [line('would_not_send', REJECT), line('send', KEEP)],
      }),
    );
    expect(beat.kind).toBe('watching');
    expect(beat.holdBack).toBe('counts_not_there');
  });

  it('lands the separation beat only once the backend says both sides exist', () => {
    const beat = selectBeat(
      input({
        gradedCount: KILL_MIN_GRADED,
        canShowKill: true,
        lines: [line('would_not_send', REJECT), line('send', KEEP)],
      }),
    );
    expect(beat.kind).toBe('separation_ready');
  });

  it('shows only their own unranked lines at screen 20, never a compiled standard (CH-08)', () => {
    const beat = selectBeat(
      input({
        gradedCount: CONSTRUCTS_BEAT_AT,
        canShowKill: true,
        lines: [line('would_not_send', REJECT), line('send', KEEP)],
      }),
    );
    expect(beat.kind).toBe('constructs_so_far');
    // Their words, in the order they said them, and nothing else.
    expect(beat.lines).toEqual([REJECT, KEEP]);
    expect(beat).not.toHaveProperty('weights');
  });

  it('falls back to the honest watching state at screen 20 when no lines were written', () => {
    const beat = selectBeat(input({ gradedCount: CONSTRUCTS_BEAT_AT, canShowKill: false }));
    expect(beat.kind).toBe('watching');
  });

  it('caps how many lines it reads back', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      line('send', `a genuinely long enough line number ${i}`, `id-${i}`),
    );
    expect(linesSoFar(many)).toHaveLength(3);
  });

  it('completes only at the last screen', () => {
    const lines = Array.from({ length: 33 }, (_, i) => line('send', KEEP, `id-${i}`));
    expect(selectBeat(input({ gradedCount: 32, total: 33, lines })).kind).not.toBe('complete');
    expect(selectBeat(input({ gradedCount: 33, total: 33, lines })).kind).toBe('complete');
  });
});

describe('manipPairDue', () => {
  const pairMembers = new Map<string, string[]>([
    ['p1', ['a', 'b']],
    ['p2', ['c', 'd']],
  ]);
  const pairByItem = new Map<string, string>([
    ['a', 'p1'],
    ['b', 'p1'],
    ['c', 'p2'],
    ['d', 'p2'],
  ]);

  const base = {
    justGradedItemId: 'b',
    gradedIds: new Set(['a', 'b', 'c']),
    askedPairs: new Set<string>(),
    pairByItem,
    pairMembers,
  };

  it('asks only at the three screens it is meant to', () => {
    expect(manipPairDue({ ...base, screen: 8 })).toBe('p1');
    expect(manipPairDue({ ...base, screen: 7 })).toBeNull();
    expect(manipPairDue({ ...base, screen: 16 })).toBe('p1');
    expect(manipPairDue({ ...base, screen: 24 })).toBe('p1');
  });

  it('never asks about two pieces they have not both seen (CH-09)', () => {
    // Only one half of p1 graded, and p2 is half graded too: nothing to ask.
    const halfSeen = manipPairDue({
      ...base,
      screen: 8,
      justGradedItemId: 'a',
      gradedIds: new Set(['a', 'c']),
    });
    expect(halfSeen).toBeNull();
  });

  it('prefers the pair they just finished', () => {
    const bothComplete = manipPairDue({
      ...base,
      screen: 16,
      justGradedItemId: 'd',
      gradedIds: new Set(['a', 'b', 'c', 'd']),
    });
    expect(bothComplete).toBe('p2');
  });

  it('never asks about the same two twice', () => {
    const asked = manipPairDue({
      ...base,
      screen: 16,
      gradedIds: new Set(['a', 'b', 'c', 'd']),
      askedPairs: new Set(['p1']),
    });
    expect(asked).toBe('p2');
  });
});

describe('what may be reported, and when', () => {
  it('refuses a split rate over too few pairs', () => {
    expect(canReportSplit(3)).toBe(false);
    expect(canReportSplit(4)).toBe(true);
  });

  it('holds self-agreement back until the session is over (CH-12)', () => {
    // Reporting it live would tell them some pieces come back a second time,
    // which is the one thing that breaks the measurement.
    expect(canReportSelfAgreement(2, false)).toBe(false);
    expect(canReportSelfAgreement(0, true)).toBe(false);
    expect(canReportSelfAgreement(3, true)).toBe(true);
  });
});

describe('measurementLines', () => {
  it('says plainly that no measurement exists when none was handed in', () => {
    expect(measurementLines(null)).toHaveLength(1);
    expect(measurementLines(null)[0]).toMatch(/no accuracy number here/i);
    expect(measurementLines(undefined)[0]).toMatch(/none is claimed/i);
  });

  it('renders the counts it was given and computes nothing', () => {
    // Deliberately inconsistent input: the rates say one thing and the counts
    // say another. The screen must repeat the counts it was handed rather than
    // quietly recompute a rate it thinks is more correct, because a frontend
    // that can compute this number will one day compute it from whatever it
    // happens to have (CH-03).
    const lines = measurementLines({
      precision: 0.5,
      recall: 0.5,
      tnr: 0.5,
      n: 12,
      counts: { tp: 4, fp: 1, fn: 1, tn: 6, excluded: { skipped: 0, insufficient: 0, total: 0 } },
    });
    expect(lines[0]).toBe('Of the things you would not have sent, it caught 4 of 5.');
    expect(lines[1]).toBe('It also flagged 1 you would have sent.');
    expect(lines.join(' ')).not.toContain('%');
    expect(lines.join(' ')).not.toContain('0.5');
  });
});

describe('shortfallNotes', () => {
  it('says nothing when the deck came out whole', () => {
    expect(
      shortfallNotes({ items: 30, items_expected: 30, own_shortfall: 0, peer_shortfall: 0 }),
    ).toEqual([]);
  });

  it('states the missing own work and what it costs', () => {
    const notes = shortfallNotes({ own_available: 2, own_expected: 6, own_shortfall: 4 });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('2');
    expect(notes[0]).toContain('6');
  });

  it('names an empty peer shelf rather than quietly shipping a shorter deck', () => {
    const notes = shortfallNotes({ peer_awaiting_curation: true, peer_shortfall: 4 });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('no public work by other people');
  });

  it('reports the short deck as a weaker measurement, not as a full one', () => {
    const notes = shortfallNotes({ items: 26, items_expected: 30 });
    expect(notes.some((n) => n.includes('26 screens instead of 30'))).toBe(true);
    expect(notes.some((n) => n.includes('weaker'))).toBe(true);
  });
});
