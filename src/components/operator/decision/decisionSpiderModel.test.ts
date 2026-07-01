import { describe, it, expect } from 'vitest';
import type { DecisionClaim, Verdict, ClaimType, Dimension } from '@/hooks/useDecisionEngine';
import { buildSpider, rollupHealth, claimDimension, computeSpiderViewBox, forceVerdict, FORCE_META } from './decisionSpiderModel';

let idc = 0;
function mk(partial: Partial<DecisionClaim> & { verdict: Verdict; type?: ClaimType; dimension?: Dimension | null }): DecisionClaim {
  return {
    id: `c${idc++}`,
    text: 'a claim',
    type: partial.type ?? 'factual',
    is_load_bearing: partial.is_load_bearing ?? false,
    dimension: partial.dimension ?? null,
    verdict: partial.verdict,
    confidence: 0.5,
    rationale: null,
    reaction_value: null,
    reaction_descriptor: null,
    reaction_kind: null,
    reaction_evidence_id: null,
  };
}

describe('rollupHealth', () => {
  it('is grey with no claims', () => expect(rollupHealth([])).toBe('grey'));
  it('is green when a claim checks out and none are shaky', () => {
    expect(rollupHealth([mk({ verdict: 'supported' })])).toBe('green');
  });
  it('is amber when any claim is shaky (contested/unverified/pending)', () => {
    expect(rollupHealth([mk({ verdict: 'supported' }), mk({ verdict: 'contested' })])).toBe('amber');
    expect(rollupHealth([mk({ verdict: 'unverified' })])).toBe('amber');
    expect(rollupHealth([mk({ verdict: 'pending' })])).toBe('amber');
  });
  it('is grey when every claim is a judgment only-you-can-call', () => {
    expect(rollupHealth([mk({ verdict: 'unverifiable' })])).toBe('grey');
  });
});

describe('claimDimension (legacy inference)', () => {
  it('uses the explicit dimension when present', () => {
    expect(claimDimension(mk({ verdict: 'supported', dimension: 'economics' }))).toBe('economics');
  });
  it('infers from type for old untagged claims', () => {
    expect(claimDimension(mk({ verdict: 'supported', type: 'market' }))).toBe('economics');
    expect(claimDimension(mk({ verdict: 'supported', type: 'forecast' }))).toBe('timing');
    expect(claimDimension(mk({ verdict: 'supported', type: 'assumption' }))).toBe('risk');
    expect(claimDimension(mk({ verdict: 'supported', type: 'causal' }))).toBe('capability');
  });
});

describe('buildSpider', () => {
  it('always renders the 6 fixed forces with Capability at top', () => {
    const { forces } = buildSpider([]);
    expect(forces.map((f) => f.key)).toEqual(FORCE_META.map((m) => m.key));
    const cap = forces.find((f) => f.key === 'capability')!;
    // top of the circle = most-negative y
    expect(cap.y).toBeLessThan(Math.min(...forces.filter((f) => f.key !== 'capability').map((f) => f.y)));
  });

  it('groups claims by force and rolls up health per force', () => {
    const claims = [
      mk({ verdict: 'supported', dimension: 'capability' }),
      mk({ verdict: 'contested', dimension: 'economics' }),
      mk({ verdict: 'unverifiable', dimension: 'team' }),
    ];
    const { forces } = buildSpider(claims);
    const byKey = Object.fromEntries(forces.map((f) => [f.key, f]));
    expect(byKey.capability.health).toBe('green');
    expect(byKey.economics.health).toBe('amber');
    expect(byKey.team.health).toBe('grey');
    expect(byKey.risk.claims).toHaveLength(0);
    expect(byKey.risk.health).toBe('grey');
  });

  it('captions use the decision-specific label, falling back to the generic force name', () => {
    const { forces } = buildSpider([mk({ verdict: 'supported', dimension: 'economics' })], { economics: 'Token cost' });
    const byKey = Object.fromEntries(forces.map((f) => [f.key, f]));
    expect(byKey.economics.caption).toBe('Token cost');
    expect(byKey.capability.caption).toBe('Capability'); // no label -> generic
  });
});

describe('computeSpiderViewBox', () => {
  it('centres the box on the hub at 0,0', () => {
    const spider = buildSpider([]);
    const vb = computeSpiderViewBox(spider, 400, 800);
    expect(vb.x).toBeCloseTo(-vb.w / 2, 5);
    expect(vb.y).toBeCloseTo(-vb.h / 2, 5);
    // aspect-corrected to the canvas ratio
    expect(vb.w / vb.h).toBeCloseTo(400 / 800, 3);
  });
});

describe('forceVerdict', () => {
  it('gives an honest one-liner per health', () => {
    const green = buildSpider([mk({ verdict: 'supported', dimension: 'capability' })]).forces.find((f) => f.key === 'capability')!;
    const amber = buildSpider([mk({ verdict: 'contested', dimension: 'economics' })]).forces.find((f) => f.key === 'economics')!;
    const empty = buildSpider([]).forces.find((f) => f.key === 'risk')!;
    expect(forceVerdict(green)).toMatch(/holds up/i);
    expect(forceVerdict(amber)).toMatch(/shaky/i);
    expect(forceVerdict(empty)).toMatch(/nothing here/i);
  });

  it('agrees the verb with the shaky count (1 point does not / N points do not)', () => {
    const one = buildSpider([mk({ verdict: 'contested', dimension: 'economics' })]).forces.find((f) => f.key === 'economics')!;
    const two = buildSpider([
      mk({ verdict: 'contested', dimension: 'risk' }),
      mk({ verdict: 'unverified', dimension: 'risk' }),
    ]).forces.find((f) => f.key === 'risk')!;
    expect(forceVerdict(one)).toBe('Shaky - 1 point here does not add up yet.');
    expect(forceVerdict(two)).toBe('Shaky - 2 points here do not add up yet.');
  });
});
