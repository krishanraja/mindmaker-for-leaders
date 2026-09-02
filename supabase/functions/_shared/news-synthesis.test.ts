import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  AFFECTS_IDS,
  STANCE_IDS,
  DAMAGE_STANCE,
  sanitizeAffects,
  sanitizeStance,
  dropDamage,
  synthesizeReads,
  classifyAudience,
} from './news-synthesis';

/**
 * The audience axis (affects) and the leader stance are a payload contract
 * shared with a downstream consumer: eight allowlisted division identifiers
 * and four stance values, with "damage" never cached. These tests pin the
 * validation gate between the model and the payload, so a drifting or
 * hallucinating completion can never widen the contract.
 */

describe('affects allowlist', () => {
  it('is exactly the eight divisions the consumer allowlists', () => {
    expect([...AFFECTS_IDS]).toEqual([
      'leadership', 'sales', 'marketing', 'product',
      'engineering', 'operations', 'finance', 'people',
    ]);
  });

  it('keeps valid entries in model order and drops invented ones', () => {
    expect(sanitizeAffects(['people', 'leadership', 'revenue', 'teams'])).toEqual(['people', 'leadership']);
  });

  it('normalises case and whitespace, and dedupes', () => {
    expect(sanitizeAffects([' People ', 'PEOPLE', 'Finance'])).toEqual(['people', 'finance']);
  });

  it('drops non-string entries defensively', () => {
    expect(sanitizeAffects(['sales', 42, null, { a: 1 }, 'marketing'])).toEqual(['sales', 'marketing']);
  });

  it('caps at five entries so a filter can never return everything', () => {
    const all = sanitizeAffects([...AFFECTS_IDS]);
    expect(all).toHaveLength(5);
  });

  it('treats [] as a real answer and a non-array as absent', () => {
    expect(sanitizeAffects([])).toEqual([]);
    expect(sanitizeAffects(undefined)).toBeUndefined();
    expect(sanitizeAffects('people')).toBeUndefined();
  });
});

describe('stance validation', () => {
  it('accepts exactly the four stance values', () => {
    for (const stance of STANCE_IDS) {
      expect(sanitizeStance(stance)).toBe(stance);
    }
    expect(STANCE_IDS).toHaveLength(4);
  });

  it('normalises case and whitespace', () => {
    expect(sanitizeStance(' Risk ')).toBe('risk');
    expect(sanitizeStance('DAMAGE')).toBe('damage');
  });

  it('rejects anything outside the four values', () => {
    expect(sanitizeStance('doom')).toBeUndefined();
    expect(sanitizeStance('')).toBeUndefined();
    expect(sanitizeStance(3)).toBeUndefined();
    expect(sanitizeStance(undefined)).toBeUndefined();
  });
});

describe('the damage drop (editorial rule)', () => {
  it('removes only damage items and keeps unclassified ones', () => {
    const cards = [
      { id: 'a', stance: 'shift' },
      { id: 'b', stance: DAMAGE_STANCE },
      { id: 'c' },
      { id: 'd', stance: 'risk' },
    ];
    expect(dropDamage(cards).map((c) => c.id)).toEqual(['a', 'c', 'd']);
  });
});

/** Build a canned OpenAI chat completion whose content is the given object. */
function completion(payload: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('synthesizeReads audience parsing', () => {
  it('validates affects/stance from the completion and asks for them in the prompt', async () => {
    const fetchMock = vi.fn(async () => completion({
      reads: [
        {
          id: 's1',
          headline: 'Meta plans to replace staff with AI',
          say: 'Your org chart is now a design decision.',
          affects: ['people', 'leadership', 'Revenue', 'people'],
          stance: 'Shift',
        },
        { id: 's2', headline: 'Agent framework leaks credentials', affects: 'people', stance: 'panic' },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const reads = await synthesizeReads('test-key', [
      { id: 's1', headline: 't1', snippet: 'd1', category: 'model', sourceCount: 2 },
      { id: 's2', headline: 't2', snippet: 'd2', category: 'security', sourceCount: 1 },
    ]);

    expect(reads.get('s1')?.affects).toEqual(['people', 'leadership']);
    expect(reads.get('s1')?.stance).toBe('shift');
    // Junk shapes are absent, never passed through.
    expect(reads.get('s2')?.affects).toBeUndefined();
    expect(reads.get('s2')?.stance).toBeUndefined();
    expect(reads.get('s2')?.headline).toBe('Agent framework leaks credentials');

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.messages[0].content).toContain('"affects"');
    expect(body.messages[0].content).toContain('"stance"');
    expect(body.messages[0].content).toContain('whose week does this change?');
  });

  it('keeps a read whose only content is the audience classification', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => completion({
      reads: [{ id: 's1', affects: [], stance: 'opportunity' }],
    })));
    const reads = await synthesizeReads('test-key', [
      { id: 's1', headline: 't', snippet: 'd', category: 'tools', sourceCount: 1 },
    ]);
    expect(reads.get('s1')?.affects).toEqual([]);
    expect(reads.get('s1')?.stance).toBe('opportunity');
  });

  it('still returns an empty map on a failed call', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const reads = await synthesizeReads('test-key', [
      { id: 's1', headline: 't', snippet: 'd', category: 'tools', sourceCount: 1 },
    ]);
    expect(reads.size).toBe(0);
  });
});

describe('classifyAudience (retained-days backfill)', () => {
  it('returns only validated classifications and never other fields', async () => {
    const fetchMock = vi.fn(async () => completion({
      reads: [
        { id: 'live-2026-08-01-0', affects: ['people'], stance: 'shift' },
        { id: 'live-2026-08-01-1', affects: ['synergy'], stance: 'damage' },
        { id: 'live-2026-08-01-2', headline: 'should be ignored' },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const reads = await classifyAudience('test-key', [
      { id: 'live-2026-08-01-0', headline: 'a', snippet: 's' },
      { id: 'live-2026-08-01-1', headline: 'b', snippet: 's' },
      { id: 'live-2026-08-01-2', headline: 'c', snippet: 's' },
    ]);

    expect(reads.get('live-2026-08-01-0')).toEqual({ affects: ['people'], stance: 'shift' });
    // Invalid affects entries drop to []; the damage stance itself is a valid
    // classification (the CALLER drops the card).
    expect(reads.get('live-2026-08-01-1')).toEqual({ affects: [], stance: 'damage' });
    expect(reads.has('live-2026-08-01-2')).toBe(false);
  });

  it('returns an empty map with no key or no items', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await classifyAudience(undefined, [{ id: 'x', headline: 'h', snippet: 's' }])).size).toBe(0);
    expect((await classifyAudience('test-key', [])).size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
