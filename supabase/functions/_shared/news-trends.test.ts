import { describe, it, expect } from 'vitest';
import {
  buildCorpus,
  verifyShift,
  verifyAndRank,
  computeMomentum,
  rootDomain,
  populatedDayCount,
  parseProposedShifts,
  buildDetectionMessages,
  isTrendCategory,
  SEED_SHIFTS,
  MIN_DAY_SPAN,
  MIN_SOURCES,
  type DailyPool,
  type CorpusItem,
  type ProposedShift,
} from './news-trends';

/**
 * The cross-day trend detector. These pin the contract the honesty model relies
 * on: the deterministic verify pass GROUNDS every LLM-named shift, so a shift
 * whose cited evidence does not really span multiple days + sources is dropped.
 */

function pool(day: string, cards: Array<{ id: string; headline: string; category?: string; source?: string }>): DailyPool {
  return {
    day,
    cards: cards.map((c) => ({
      id: c.id,
      headline: c.headline,
      category: c.category ?? 'org',
      source: c.source ?? `${c.id}.com`,
      url: `https://${c.source ?? `${c.id}.com`}/x`,
      snippet: c.headline,
      sourceCount: 2,
    })),
  };
}

// A corpus spanning three days, three sources - the minimum a real shift needs.
function threeDayCorpus(): CorpusItem[] {
  return buildCorpus([
    pool('2026-07-01', [{ id: 'a1', headline: 'Labs hire forward-deployed engineers', source: 'reuters.com' }]),
    pool('2026-07-03', [{ id: 'b1', headline: 'Enterprise AI fails at deployment not prompting', source: 'ft.com' }]),
    pool('2026-07-05', [{ id: 'c1', headline: 'FDE role bridges product and customer', source: 'theverge.com' }]),
  ]);
}

describe('buildCorpus', () => {
  it('flattens newest-day-first and preserves recurrence across days', () => {
    const corpus = threeDayCorpus();
    expect(corpus.map((c) => c.id)).toEqual(['c1', 'b1', 'a1']); // newest first
    expect(new Set(corpus.map((c) => c.day)).size).toBe(3); // no cross-day dedupe
  });

  it('drops duplicate ids and caps to max', () => {
    const corpus = buildCorpus(
      [pool('2026-07-01', [{ id: 'x', headline: 'One' }, { id: 'x', headline: 'Dup id' }, { id: 'y', headline: 'Two' }])],
      5,
    );
    expect(corpus.map((c) => c.id)).toEqual(['x', 'y']);
  });

  it('coerces an unknown category to the default', () => {
    const corpus = buildCorpus([pool('2026-07-01', [{ id: 'z', headline: 'H', category: 'nonsense' }])]);
    expect(corpus[0].category).toBe('model');
  });
});

describe('verifyShift - the confabulation gate', () => {
  const byId = () => new Map(threeDayCorpus().map((c) => [c.id, c]));

  it('verifies a shift whose evidence spans enough days and sources', () => {
    const proposed: ProposedShift = {
      title: 'The rise of the forward-deployed engineer',
      summary: 'AI hires now embed with the customer and own deployment.',
      implication: 'Consider a role that owns getting AI into production.',
      category: 'org',
      evidenceIds: ['a1', 'b1', 'c1'],
    };
    const v = verifyShift(proposed, byId());
    expect(v).not.toBeNull();
    expect(v!.daySpan).toBe(3);
    expect(v!.sourceCount).toBe(3);
    expect(v!.evidence).toHaveLength(3);
    expect(v!.category).toBe('org');
  });

  it('REJECTS a shift whose evidence does not span >= MIN_DAY_SPAN days', () => {
    // Three citations but all on the SAME day (one source) -> not a trend.
    const corpus = buildCorpus([
      pool('2026-07-01', [
        { id: 'p', headline: 'A', source: 's1.com' },
        { id: 'q', headline: 'B', source: 's2.com' },
        { id: 'r', headline: 'C', source: 's3.com' },
      ]),
    ]);
    const map = new Map(corpus.map((c) => [c.id, c]));
    const proposed: ProposedShift = {
      title: 'A one-day spike', summary: 's', implication: 'i', category: 'org', evidenceIds: ['p', 'q', 'r'],
    };
    expect(verifyShift(proposed, map)).toBeNull();
    expect(MIN_DAY_SPAN).toBeGreaterThan(1);
  });

  it('REJECTS a shift that cites too few real ids (hallucinated ids ignored)', () => {
    const proposed: ProposedShift = {
      title: 'Weak', summary: 's', implication: 'i', category: 'org',
      evidenceIds: ['a1', 'ghost-1', 'ghost-2'], // only a1 exists
    };
    expect(verifyShift(proposed, byId())).toBeNull();
  });

  it('REJECTS a shift with too few distinct sources', () => {
    // Three days but the SAME source on each -> corroboration too thin.
    const corpus = buildCorpus([
      pool('2026-07-01', [{ id: 'd1', headline: 'A', source: 'same.com' }]),
      pool('2026-07-02', [{ id: 'd2', headline: 'B', source: 'same.com' }]),
      pool('2026-07-03', [{ id: 'd3', headline: 'C', source: 'same.com' }]),
    ]);
    const map = new Map(corpus.map((c) => [c.id, c]));
    const proposed: ProposedShift = {
      title: 'Single-source drumbeat', summary: 's', implication: 'i', category: 'org', evidenceIds: ['d1', 'd2', 'd3'],
    };
    expect(verifyShift(proposed, map)).toBeNull();
    expect(MIN_SOURCES).toBeGreaterThan(1);
  });

  it('REJECTS different publisher labels that resolve to one origin', () => {
    const corpus = threeDayCorpus().map((item, index) => ({
      ...item,
      source: ['Newsletter A', 'Newsletter B', 'Newsletter C'][index],
      url: `https://www.same-origin.com/story-${index}`,
    }));
    const map = new Map(corpus.map((item) => [item.id, item]));
    expect(verifyShift({
      title: 'Circular coverage',
      summary: 's',
      implication: 'i',
      category: 'org',
      evidenceIds: corpus.map((item) => item.id),
    }, map)).toBeNull();
  });

  it('REJECTS uncitable items even when their source labels look independent', () => {
    const corpus = threeDayCorpus().map((item) => ({ ...item, url: null }));
    const map = new Map(corpus.map((item) => [item.id, item]));
    expect(verifyShift({
      title: 'Uncitable shift',
      summary: 's',
      implication: 'i',
      category: 'org',
      evidenceIds: corpus.map((item) => item.id),
    }, map)).toBeNull();
  });

  it('falls back to the most common evidence category when the proposed one is invalid', () => {
    const corpus = buildCorpus([
      pool('2026-07-01', [{ id: 'e1', headline: 'A', category: 'economics', source: 's1.com' }]),
      pool('2026-07-02', [{ id: 'e2', headline: 'B', category: 'economics', source: 's2.com' }]),
      pool('2026-07-03', [{ id: 'e3', headline: 'C', category: 'model', source: 's3.com' }]),
    ]);
    const map = new Map(corpus.map((c) => [c.id, c]));
    const v = verifyShift(
      { title: 'T', summary: 's', implication: 'i', category: 'not-a-lane', evidenceIds: ['e1', 'e2', 'e3'] },
      map,
    );
    expect(v!.category).toBe('economics');
  });
});

describe('verifyAndRank', () => {
  it('keeps only verifiable shifts, ranked by momentum', () => {
    const corpus = threeDayCorpus();
    const good: ProposedShift = {
      title: 'Real shift', summary: 's', implication: 'i', category: 'org', evidenceIds: ['a1', 'b1', 'c1'],
    };
    const bad: ProposedShift = {
      title: 'Fake shift', summary: 's', implication: 'i', category: 'org', evidenceIds: ['a1'],
    };
    const out = verifyAndRank([bad, good], corpus);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Real shift');
  });
});

describe('momentum + helpers', () => {
  it('rewards day-spread over source count', () => {
    expect(computeMomentum(5, 3, 2)).toBeGreaterThan(computeMomentum(3, 5, 2));
  });

  it('counts populated days only', () => {
    const pools: DailyPool[] = [pool('2026-07-01', [{ id: 'a', headline: 'x' }]), { day: '2026-07-02', cards: [] }];
    expect(populatedDayCount(pools)).toBe(1);
  });

  it('isTrendCategory validates the nine lanes', () => {
    expect(isTrendCategory('org')).toBe(true);
    expect(isTrendCategory('marketing')).toBe(false);
  });

  it('normalizes root domains and rejects malformed URLs', () => {
    expect(rootDomain('https://www.Reuters.com/world/story')).toBe('reuters.com');
    expect(rootDomain('not a URL')).toBeNull();
    expect(rootDomain(null)).toBeNull();
  });
});

describe('parseProposedShifts', () => {
  it('parses valid JSON and skips malformed entries', () => {
    const content = JSON.stringify({
      shifts: [
        { title: 'A', summary: 'sa', implication: 'i', category: 'org', evidenceIds: ['1', '2'] },
        { title: '', summary: 'no title' }, // dropped
        { summary: 'no title either' }, // dropped
      ],
    });
    const out = parseProposedShifts(content);
    expect(out).toHaveLength(1);
    expect(out[0].evidenceIds).toEqual(['1', '2']);
  });

  it('returns [] on non-JSON', () => {
    expect(parseProposedShifts('not json')).toEqual([]);
    expect(parseProposedShifts(null)).toEqual([]);
  });
});

describe('buildDetectionMessages', () => {
  it('includes the corpus ids and the calibration thesis when provided', () => {
    const corpus = threeDayCorpus();
    const { system, user } = buildDetectionMessages(corpus, { thesis: 'Judgment is the moat.' });
    expect(user).toContain('a1');
    expect(system).toContain('Judgment is the moat.');
    expect(system).toContain('STRUCTURAL SHIFTS');
  });
});

describe('SEED_SHIFTS - the honest floor', () => {
  it('are labelled as seeds with no fabricated dated evidence', () => {
    expect(SEED_SHIFTS.length).toBeGreaterThanOrEqual(4);
    for (const s of SEED_SHIFTS) {
      expect(s.seed).toBe(true);
      expect(s.evidence).toHaveLength(0);
      expect(isTrendCategory(s.category)).toBe(true);
    }
  });
});
