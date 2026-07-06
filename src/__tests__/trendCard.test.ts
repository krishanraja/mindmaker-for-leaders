import { describe, it, expect } from 'vitest';
import { pickTopTrend, trendToDeckCard, trendWeighPrefill, type TrendItem } from '@/lib/trendCard';
import { roleFitByCategory } from '@/lib/roleArchetype';

function trend(partial: Partial<TrendItem> & { id: string; category: string }): TrendItem {
  return {
    title: `Shift ${partial.id}`,
    summary: 'what is changing',
    implication: 'what it means for your org',
    evidence: [],
    daySpan: 0,
    sourceCount: 0,
    momentum: 0,
    ...partial,
  };
}

describe('pickTopTrend', () => {
  it('returns null for an empty or missing feed', () => {
    expect(pickTopTrend([], {})).toBeNull();
    expect(pickTopTrend(undefined, {})).toBeNull();
  });

  it('picks the shift whose lane best fits the leader (a CFO gets economics over product)', () => {
    const fit = roleFitByCategory('CFO', 'fintech');
    const top = pickTopTrend(
      [trend({ id: 'p', category: 'product' }), trend({ id: 'e', category: 'economics' })],
      fit,
    );
    expect(top!.category).toBe('economics');
  });

  it('breaks ties by momentum', () => {
    const fit = roleFitByCategory('CFO', 'fintech'); // two economics shifts tie on fit
    const top = pickTopTrend(
      [trend({ id: 'lo', category: 'economics', momentum: 10 }), trend({ id: 'hi', category: 'economics', momentum: 99 })],
      fit,
    );
    expect(top!.id).toBe('hi');
  });
});

describe('trendToDeckCard', () => {
  it('shapes a detected shift into a weigh-forward trend card', () => {
    const card = trendToDeckCard(
      trend({
        id: 'abc',
        category: 'org',
        title: 'The rise of the forward-deployed engineer',
        evidence: [
          { headline: 'A', source: 'reuters.com', url: 'https://r/x', date: '2026-07-01' },
          { headline: 'B', source: 'ft.com', url: 'https://f/x', date: '2026-07-20' },
        ],
        daySpan: 4,
        sourceCount: 3,
      }),
    );
    expect(card.kind).toBe('trend');
    expect(card.eyebrow).toBe('The shift');
    expect(card.route).toBe('/decision');
    expect(card.corroboration).toBe('across 2 stories');
    expect(card.timeAgo).toBe('over 3 weeks'); // Jul 1 -> Jul 20 span
    expect(card.pov).toBe('what it means for your org'); // implication rides in pov
    expect(card.prefill).toContain('forward-deployed engineer');
  });

  it('labels a seed shift as ongoing with no dated evidence', () => {
    const card = trendToDeckCard(trend({ id: 's', category: 'org', seed: true }));
    expect(card.corroboration).toBe('An ongoing shift');
    expect(card.timeAgo).toBeNull();
    expect(card.evidence).toEqual([]);
  });
});

describe('trendWeighPrefill', () => {
  it('frames the shift as an org decision to weigh', () => {
    const p = trendWeighPrefill(trend({ id: 'x', category: 'org', title: 'Agents move to production.' }));
    expect(p).toContain('Agents move to production');
    expect(p.toLowerCase()).toContain('org');
  });
});
