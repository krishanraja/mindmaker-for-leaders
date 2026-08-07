import { describe, expect, it } from 'vitest';
import {
  composeBrainSource,
  groupIntoConstructs,
  verifyOffsets,
  type BrainFact,
} from './brain-to-evidence.ts';

const fact = (over: Partial<BrainFact> & { id: string }): BrainFact => ({
  fact_label: 'How they work',
  fact_value: 'Ships weekly, never sits on a decision.',
  fact_category: 'preference',
  importance: 6,
  confidence_score: 0.8,
  verification_status: 'inferred',
  source_type: 'voice',
  ...over,
});

describe('composeBrainSource', () => {
  it('produces an offset that is the exact slice, which is the whole point', () => {
    const s = composeBrainSource([fact({ id: 'a' }), fact({ id: 'b', fact_value: 'Hates long decks.' })]);
    expect(s.items).toHaveLength(2);
    for (const item of s.items) {
      expect(s.body.slice(item.quoteStart, item.quoteEnd)).toBe(item.quote);
    }
    expect(verifyOffsets(s).ok).toBe(true);
  });

  it('points every fact row back at its user_memory id', () => {
    const s = composeBrainSource([fact({ id: 'fact-1' })]);
    expect(s.items[0].memoryFactId).toBe('fact-1');
  });

  it('never mines a fact the leader already rejected or disputed', () => {
    const s = composeBrainSource([
      fact({ id: 'a', verification_status: 'rejected' }),
      fact({ id: 'b', verification_status: 'disputed' }),
      fact({ id: 'c' }),
    ]);
    expect(s.items.map((i) => i.memoryFactId)).toEqual(['c']);
  });

  it('drops facts too weak to be worth grading time', () => {
    const s = composeBrainSource([fact({ id: 'weak', confidence_score: 0.2 }), fact({ id: 'ok' })]);
    expect(s.items.map((i) => i.memoryFactId)).toEqual(['ok']);
  });

  it('skips a fact with no value rather than emitting an empty quote', () => {
    // An empty quote would violate quote_required_for_speech at insert.
    const s = composeBrainSource([fact({ id: 'blank', fact_value: '   ' }), fact({ id: 'ok' })]);
    expect(s.items.map((i) => i.memoryFactId)).toEqual(['ok']);
    for (const item of s.items) expect(item.quote.length).toBeGreaterThan(0);
  });

  it('orders strongest first so a truncated source keeps what matters', () => {
    const s = composeBrainSource([
      fact({ id: 'low', importance: 2, fact_value: 'Minor.' }),
      fact({ id: 'high', importance: 9, fact_value: 'Load bearing.' }),
    ]);
    expect(s.items[0].memoryFactId).toBe('high');
  });

  it('truncates on a block boundary and keeps every remaining offset honest', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      fact({ id: `f${i}`, fact_value: `Value number ${i} `.repeat(20) }),
    );
    const s = composeBrainSource(many, [], { maxChars: 2000 });
    expect(s.body.length).toBeLessThanOrEqual(2000);
    expect(s.items.length).toBeLessThan(40);
    expect(verifyOffsets(s).ok).toBe(true);
  });

  it('always marks the situation, because the schema refuses a situated row without one', () => {
    const s = composeBrainSource([fact({ id: 'a', verification_status: 'verified' })]);
    expect(s.items[0].situation).toContain('confirmed by them');
    expect(s.items[0].situation.length).toBeGreaterThan(0);
  });

  it('carries weighed decisions in, with no memory fact id', () => {
    const s = composeBrainSource([], [{ id: 'd1', statement: 'Should we build or buy the agent stack?' }]);
    expect(s.items).toHaveLength(1);
    expect(s.items[0].memoryFactId).toBeNull();
    expect(s.body).toContain('build or buy');
  });

  it('handles an empty brain without throwing', () => {
    const s = composeBrainSource([], []);
    expect(s.items).toEqual([]);
    expect(s.body).toBe('');
    expect(verifyOffsets(s).ok).toBe(true);
  });
});

describe('verifyOffsets', () => {
  it('reports a corrupted offset rather than letting it reach the database', () => {
    const s = composeBrainSource([fact({ id: 'a' })]);
    s.items[0].quoteEnd -= 3;
    const r = verifyOffsets(s);
    expect(r.ok).toBe(false);
    expect(r.broken).toEqual([0]);
  });
});

describe('groupIntoConstructs', () => {
  it('gathers evidence under one pole per distinct axis', () => {
    const groups = groupIntoConstructs([
      { emergentPole: 'How they work', evidenceId: 'e1' } as never,
      { emergentPole: 'How they work', evidenceId: 'e2' } as never,
      { emergentPole: 'What they weigh', evidenceId: 'e3' } as never,
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.emergentPole === 'How they work')?.evidenceIds).toEqual(['e1', 'e2']);
  });
});
