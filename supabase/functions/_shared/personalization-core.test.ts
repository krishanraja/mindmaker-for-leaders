import { describe, it, expect } from 'vitest';
import {
  SCORING,
  clamp01,
  normalizeExternal,
  passesRelevanceGate,
  tuningBoost,
  combineFinalScore,
  balanceByCategory,
  type CombineInputs,
} from './personalization-core';

/**
 * The transparent scoring methodology. These pin the guarantees the owner
 * signed off on:
 *   - the hard gate removes off-brain stories (the immunology-for-a-SaaS case)
 *   - user fit LEADS: a more-relevant story can't be beaten by a more-viral one
 *   - external trust / benchmark / freshness amplify an already-relevant story
 *   - the user's tuning (boosts / bias / dislikes) is a deliberate lever on top
 *   - the pick is balanced across category lanes
 */

const base: CombineInputs = {
  userRelevance: 0.5,
  externalScore: 0,
  aaMatched: false,
  freshness: 0,
  tuning: 0,
};

describe('helpers', () => {
  it('clamps to [0,1]', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.4)).toBe(0.4);
  });
  it('normalises external against EXT_MAX and clamps', () => {
    expect(normalizeExternal(0)).toBe(0);
    expect(normalizeExternal(SCORING.EXT_MAX)).toBe(1);
    expect(normalizeExternal(SCORING.EXT_MAX * 2)).toBe(1);
  });
});

describe('the hard relevance gate', () => {
  it('drops an off-brain story regardless of how viral it is (immunology case)', () => {
    // An immunology story for a B2B-SaaS brain embeds far from every lens item.
    const offBrainRelevance = 0.12;
    expect(passesRelevanceGate(offBrainRelevance)).toBe(false);
  });
  it('admits a story at or above the floor', () => {
    expect(passesRelevanceGate(SCORING.MIN_RELEVANCE)).toBe(true);
    expect(passesRelevanceGate(0.6)).toBe(true);
  });
});

describe('combineFinalScore - user fit leads', () => {
  it('increases monotonically with relevance, all else equal', () => {
    const lo = combineFinalScore({ ...base, userRelevance: 0.4 });
    const hi = combineFinalScore({ ...base, userRelevance: 0.8 });
    expect(hi).toBeGreaterThan(lo);
  });

  it('a more-relevant modest story outranks a barely-relevant viral+benchmarked one', () => {
    // On-brain, modest external signals.
    const onBrain = combineFinalScore({
      userRelevance: 0.6,
      externalScore: 8,
      aaMatched: false,
      freshness: 0.5,
      tuning: 0,
    });
    // Barely passes the gate, but maxed external + AA + freshness.
    const viralOffish = combineFinalScore({
      userRelevance: SCORING.MIN_RELEVANCE + 0.01,
      externalScore: SCORING.EXT_MAX,
      aaMatched: true,
      freshness: 1,
      tuning: 0,
    });
    expect(onBrain).toBeGreaterThan(viralOffish);
  });

  it('external trust amplifies an already-relevant story (breaks ties upward)', () => {
    const plain = combineFinalScore({ ...base, userRelevance: 0.7, externalScore: 0 });
    const corroborated = combineFinalScore({ ...base, userRelevance: 0.7, externalScore: SCORING.EXT_MAX });
    expect(corroborated).toBeGreaterThan(plain);
  });

  it('amplification scales with relevance: the same external lift helps a more-relevant story more', () => {
    const liftAtHigh =
      combineFinalScore({ ...base, userRelevance: 0.9, externalScore: SCORING.EXT_MAX }) -
      combineFinalScore({ ...base, userRelevance: 0.9, externalScore: 0 });
    const liftAtLow =
      combineFinalScore({ ...base, userRelevance: 0.35, externalScore: SCORING.EXT_MAX }) -
      combineFinalScore({ ...base, userRelevance: 0.35, externalScore: 0 });
    expect(liftAtHigh).toBeGreaterThan(liftAtLow);
  });
});

describe('tuningBoost - the user lever', () => {
  const profile = { boostedCategories: ['orchestration'], newsBias: 'balanced' as const };

  it('lifts a story in a boosted category', () => {
    const boosted = tuningBoost({ category: 'orchestration', sourceCount: 1 }, profile);
    const plain = tuningBoost({ category: 'security', sourceCount: 1 }, profile);
    expect(boosted).toBeGreaterThan(plain);
    expect(boosted).toBeCloseTo(SCORING.TUNING_BOOST_CATEGORY);
  });

  it('penalises a repeatedly-disliked category', () => {
    const t = tuningBoost({ category: 'security', sourceCount: 1 }, profile, ['security']);
    expect(t).toBeCloseTo(-SCORING.TUNING_PENALTY_DISLIKED);
  });

  it('"big" bias rewards corroboration; "practical" rewards act-on-now lanes', () => {
    const big = tuningBoost({ category: 'model', sourceCount: 5 }, { boostedCategories: [], newsBias: 'big' });
    expect(big).toBeGreaterThan(0);
    const practical = tuningBoost({ category: 'tools', sourceCount: 1 }, { boostedCategories: [], newsBias: 'practical' });
    expect(practical).toBeCloseTo(SCORING.PRACTICAL_BONUS);
    const practicalNonLane = tuningBoost({ category: 'governance', sourceCount: 1 }, { boostedCategories: [], newsBias: 'practical' });
    expect(practicalNonLane).toBe(0);
  });

  it('a boost can lift a chosen lane above an equally-relevant non-chosen one', () => {
    const relevance = 0.6;
    const chosen =
      combineFinalScore({ ...base, userRelevance: relevance }) +
      tuningBoost({ category: 'orchestration', sourceCount: 1 }, profile);
    const other =
      combineFinalScore({ ...base, userRelevance: relevance }) +
      tuningBoost({ category: 'security', sourceCount: 1 }, profile);
    expect(chosen).toBeGreaterThan(other);
  });
});

describe('balanceByCategory', () => {
  const mk = (category: string, finalScore: number, id: string) => ({ category, finalScore, id });

  it('spreads the pick across lanes rather than filling from one', () => {
    const items = [
      mk('model', 10, 'a'),
      mk('model', 9, 'b'),
      mk('model', 8, 'c'),
      mk('model', 7, 'd'),
      mk('tools', 6, 'e'),
      mk('proof', 5, 'f'),
    ];
    const picked = balanceByCategory(items, 4, 2);
    const cats = picked.map((p) => p.category);
    // model capped at 2 even though it has the 4 highest scores.
    expect(cats.filter((c) => c === 'model').length).toBe(2);
    expect(new Set(cats).size).toBeGreaterThan(1);
  });

  it('leads with the strongest lane and respects the size cap', () => {
    const items = [mk('a', 5, '1'), mk('b', 9, '2'), mk('c', 3, '3')];
    const picked = balanceByCategory(items, 2, 3);
    expect(picked.length).toBe(2);
    expect(picked[0].category).toBe('b'); // strongest lane leads
  });
});
