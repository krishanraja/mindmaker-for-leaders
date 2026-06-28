import { describe, it, expect } from 'vitest';
import { resolveArchetype, roleFitByCategory } from '@/lib/roleArchetype';
import { reserveForCategories } from '@/components/cockpit/laneReserve';
import type { NewsCategoryId } from '@/types/newsCategory';

describe('resolveArchetype', () => {
  it('places common roles, most-specific first', () => {
    expect(resolveArchetype('VP of Engineering').id).toBe('engineering');
    expect(resolveArchetype('Chief Financial Officer').id).toBe('finance');
    expect(resolveArchetype('Head of Product').id).toBe('product');
    expect(resolveArchetype('CMO').id).toBe('marketing');
    // a bare CEO with no other signal falls through to founder
    expect(resolveArchetype('CEO').id).toBe('founder');
  });
  it('falls back to the generalist for unknown / empty roles', () => {
    expect(resolveArchetype(null).id).toBe('leader');
    expect(resolveArchetype('Vibe Curator').id).toBe('leader');
  });
});

describe('roleFitByCategory', () => {
  it('scores the lanes a job cares about higher', () => {
    const cfo = roleFitByCategory('CFO', null);
    expect(cfo.economics).toBeGreaterThan(cfo.tools);
    const cto = roleFitByCategory('CTO', null);
    expect(cto.tools).toBeGreaterThan(cto.economics);
  });
  it('lets the industry nudge lanes up', () => {
    const plainCto = roleFitByCategory('CTO', null);
    const fintechCto = roleFitByCategory('CTO', 'fintech');
    expect(fintechCto.governance).toBeGreaterThan(plainCto.governance);
  });
  it('returns all nine lanes in 0..1', () => {
    const f = roleFitByCategory('Operations Director', 'logistics');
    const cats: NewsCategoryId[] = ['model', 'economics', 'tools', 'orchestration', 'product', 'governance', 'security', 'org', 'proof'];
    for (const c of cats) {
      expect(f[c]).toBeGreaterThanOrEqual(0);
      expect(f[c]).toBeLessThanOrEqual(1);
    }
  });
});

describe('reserveForCategories', () => {
  it('always supplies enough on-topic cards to reach the floor', () => {
    // model is the only single-category Tune group; it must reach 3 alone.
    const cards = reserveForCategories(['model'], undefined, 3);
    expect(cards.length).toBe(3);
    expect(cards.every((c) => c.category === 'model')).toBe(true);
  });
  it('orders backfill by role fit (the lane the job cares about leads)', () => {
    const fit = roleFitByCategory('CFO', null); // economics >> product
    const cards = reserveForCategories(['economics', 'product'], fit, 1);
    expect(cards[0].category).toBe('economics');
  });
  it('skips cards the caller is already showing', () => {
    const first = reserveForCategories(['economics'], undefined, 1)[0];
    const next = reserveForCategories(['economics'], undefined, 1, (c) => c.id === first.id);
    expect(next[0]?.id).not.toBe(first.id);
  });
});
