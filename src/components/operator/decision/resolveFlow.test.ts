import { describe, it, expect } from 'vitest';
import { nextActiveCase, resolvedMomentCopy } from './resolveFlow';
import type { DecisionCaseSummary } from '@/hooks/useDecisionInbox';

const summary = (over: Partial<DecisionCaseSummary>): DecisionCaseSummary => ({
  id: 'c1',
  title: null,
  statement: 'Should we switch models?',
  stage: 'complete',
  status: 'active',
  decision_kind: null,
  confidence: null,
  created_at: '2026-07-01T00:00:00Z',
  last_verified_at: null,
  pinned_at: null,
  ...over,
});

describe('nextActiveCase', () => {
  it('returns null when no cases remain', () => {
    expect(nextActiveCase([], 'c1')).toBeNull();
    expect(nextActiveCase([summary({ id: 'c1' })], 'c1')).toBeNull();
  });

  it('excludes the resolved case even when a stale list still contains it', () => {
    // The inbox snapshot may predate the refresh; the just-resolved case must
    // NEVER be re-opened (the original "takes me back to the closed decision" bug).
    const stale = [summary({ id: 'resolved', pinned_at: '2026-07-01T00:00:00Z' }), summary({ id: 'other' })];
    expect(nextActiveCase(stale, 'resolved')?.id).toBe('other');
  });

  it('prefers the pinned case over a newer unpinned one', () => {
    const cases = [
      summary({ id: 'newest', created_at: '2026-07-02T00:00:00Z' }),
      summary({ id: 'pinned', pinned_at: '2026-06-30T00:00:00Z' }),
    ];
    expect(nextActiveCase(cases, null)?.id).toBe('pinned');
  });

  it('falls back to the first (newest) case when nothing is pinned', () => {
    const cases = [summary({ id: 'a' }), summary({ id: 'b' })];
    expect(nextActiveCase(cases, null)?.id).toBe('a');
  });
});

describe('resolvedMomentCopy', () => {
  it('keys the sub line to how it played out', () => {
    expect(resolvedMomentCopy('true', 0).sub).toMatch(/win on the record/i);
    expect(resolvedMomentCopy('false', 0).sub).toMatch(/logged honestly/i);
    expect(resolvedMomentCopy('too_early', 0).sub).toMatch(/parked for now/i);
  });

  it('only mentions the record count when there is one, with singular/plural', () => {
    expect(resolvedMomentCopy('true', 0).record).toBeNull();
    expect(resolvedMomentCopy('true', 1).record).toBe("That's 1 call on your record.");
    expect(resolvedMomentCopy('false', 4).record).toBe("That's 4 calls on your record.");
  });

  it('never uses em dashes (house style)', () => {
    (['true', 'false', 'too_early'] as const).forEach((p) => {
      const copy = resolvedMomentCopy(p, 3);
      const all = [copy.headline, copy.sub, copy.record ?? ''].join(' ');
      expect(all).not.toMatch(/[\u2014\u2013]/);
    });
  });
});
