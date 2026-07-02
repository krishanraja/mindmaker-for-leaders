import { describe, it, expect } from 'vitest';
import { groupEvidence, MIN_TO_GROUP } from './evidenceGrouping';
import type { DecisionEvidence } from '@/hooks/useDecisionEngine';

let n = 0;
function ev(partial: Partial<DecisionEvidence>): DecisionEvidence {
  n += 1;
  return {
    id: `e${n}`,
    claim_id: 'c1',
    source_url: `https://example.com/${n}`,
    source_title: null,
    excerpt: null,
    stance: 'supports',
    retriever: 'exa',
    retrieved_at: null,
    relevance_score: null,
    reliability_tier: null,
    key_point: null,
    published_at: null,
    evidence_score: 50,
    theme: null,
    ...partial,
  };
}

describe('groupEvidence', () => {
  it('keeps a short section flat (single unlabelled group)', () => {
    const rows = Array.from({ length: MIN_TO_GROUP }, (_, i) => ev({ key_point: `point ${i}` }));
    const groups = groupEvidence(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('');
    expect(groups[0].rows).toHaveLength(MIN_TO_GROUP);
  });

  it('groups by the adjudicator theme when present', () => {
    const rows = [
      ...Array.from({ length: 4 }, () => ev({ theme: 'Pricing benchmarks', key_point: 'a price figure' })),
      ...Array.from({ length: 4 }, () => ev({ theme: 'Independent tests', key_point: 'a test result' })),
    ];
    const groups = groupEvidence(rows);
    const labels = groups.map((g) => g.label).sort();
    expect(labels).toEqual(['Independent tests', 'Pricing benchmarks']);
    expect(groups.every((g) => g.rows.length === 4)).toBe(true);
  });

  it('normalizes theme case so one theme is one group', () => {
    const rows = [
      ev({ theme: 'Pricing Benchmarks' }),
      ev({ theme: 'pricing benchmarks' }),
      ev({ theme: 'PRICING BENCHMARKS' }),
      ...Array.from({ length: 4 }, () => ev({ theme: 'Architecture efficiency' })),
    ];
    const groups = groupEvidence(rows);
    // The three pricing rows collapse into one group; architecture is the other.
    expect(groups).toHaveLength(2);
    const pricing = groups.find((g) => g.label.toLowerCase() === 'pricing benchmarks');
    expect(pricing?.rows).toHaveLength(3);
  });

  it('falls back to token clustering for un-themed rows', () => {
    const rows = [
      ev({ key_point: 'DeepSeek inference pricing is far cheaper per token' }),
      ev({ key_point: 'DeepSeek inference pricing beats rivals per token' }),
      ev({ key_point: 'DeepSeek inference pricing undercuts on token spend' }),
      ev({ key_point: 'SOC 2 compliance audit residency requirements enterprise' }),
      ev({ key_point: 'SOC 2 compliance audit residency posture enterprise' }),
      ev({ key_point: 'SOC 2 compliance audit residency controls enterprise' }),
    ];
    // 6 rows == MIN_TO_GROUP, so bump above the threshold to trigger grouping.
    rows.push(ev({ key_point: 'SOC 2 compliance audit residency logging enterprise' }));
    const groups = groupEvidence(rows);
    expect(groups.length).toBeGreaterThan(1);
    // Every row is accounted for exactly once.
    const total = groups.reduce((s, g) => s + g.rows.length, 0);
    expect(total).toBe(rows.length);
    expect(groups.every((g) => g.label.length > 0)).toBe(true);
  });

  it('orders groups by their strongest member and rows by score within a group', () => {
    const rows = [
      ev({ theme: 'Weak lane', evidence_score: 20 }),
      ev({ theme: 'Weak lane', evidence_score: 10 }),
      ev({ theme: 'Weak lane', evidence_score: 15 }),
      ev({ theme: 'Weak lane', evidence_score: 12 }),
      ev({ theme: 'Strong lane', evidence_score: 90 }),
      ev({ theme: 'Strong lane', evidence_score: 80 }),
      ev({ theme: 'Strong lane', evidence_score: 85 }),
    ];
    const groups = groupEvidence(rows);
    expect(groups[0].label).toBe('Strong lane');
    expect(groups[0].rows.map((r) => r.evidence_score)).toEqual([90, 85, 80]);
  });

  it('stays flat when everything shares one theme (no pointless single header)', () => {
    const rows = Array.from({ length: 9 }, () => ev({ theme: 'One theme' }));
    const groups = groupEvidence(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('');
  });
});
