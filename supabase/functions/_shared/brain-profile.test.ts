import { describe, it, expect } from 'vitest';
import {
  computeCompleteness,
  brainSignature,
  toLensSource,
  MIN_GATE_INTERESTS,
  type BrainProfile,
} from './brain-profile';

/**
 * The unified brain's pure contract. These pin the behaviours the curation
 * engine and the profile gate depend on:
 *   - the gate needs a real vertical + real role + >=3 interests
 *   - the signature is order-independent but change-sensitive (the cache key)
 */

function makeProfile(over: Partial<BrainProfile> = {}): BrainProfile {
  const base: BrainProfile = {
    userId: 'u1',
    name: 'Sam',
    role: 'founder',
    company: 'Acme',
    vertical: 'B2B SaaS',
    objectives: ['move upmarket to enterprise'],
    blockers: [],
    preferences: [],
    watchingCompanies: ['OpenAI'],
    missions: [{ id: 'm1', title: 'land first enterprise logo' }],
    decisions: [{ id: 'd1', text: 'hire a head of sales' }],
    patterns: [],
    boostedCategories: ['orchestration'],
    newsBias: 'practical',
    interestBeats: [
      { id: 'b1', text: 'agent frameworks' },
      { id: 'b2', text: 'enterprise AI adoption' },
      { id: 'b3', text: 'AI pricing' },
    ],
    interestEntities: [],
    excludes: ['crypto'],
    lensSource: {
      userId: 'u1',
      name: 'Sam',
      role: 'founder',
      company: 'Acme',
      industry: 'B2B SaaS',
      objectives: [{ text: 'move upmarket to enterprise' }],
      blockers: [],
      missions: [{ id: 'm1', title: 'land first enterprise logo' }],
      decisions: [{ id: 'd1', text: 'hire a head of sales' }],
      watchingCompanies: ['OpenAI'],
      patterns: [],
    },
    completeness: {
      hasVertical: true,
      hasRole: true,
      interestCount: 3,
      passesGate: true,
      missing: [],
    },
  };
  return { ...base, ...over };
}

describe('computeCompleteness (profile gate)', () => {
  it('passes when vertical + role + >=3 interests are present', () => {
    const c = computeCompleteness({ vertical: 'B2B SaaS', role: 'founder', interestCount: 3 });
    expect(c.passesGate).toBe(true);
    expect(c.missing).toEqual([]);
  });

  it('requires the minimum interest count', () => {
    const c = computeCompleteness({
      vertical: 'B2B SaaS',
      role: 'founder',
      interestCount: MIN_GATE_INTERESTS - 1,
    });
    expect(c.passesGate).toBe(false);
    expect(c.missing).toContain('interests');
  });

  it('treats a blank vertical as missing', () => {
    const c = computeCompleteness({ vertical: '   ', role: 'founder', interestCount: 5 });
    expect(c.hasVertical).toBe(false);
    expect(c.missing).toContain('vertical');
    expect(c.passesGate).toBe(false);
  });

  it('treats the default "executive" role as not-yet-set', () => {
    const c = computeCompleteness({ vertical: 'B2B SaaS', role: 'Executive', interestCount: 5 });
    expect(c.hasRole).toBe(false);
    expect(c.missing).toContain('role');
  });

  it('reports every missing field at once for a cold brain', () => {
    const c = computeCompleteness({ vertical: '', role: '', interestCount: 0 });
    expect(c.missing).toEqual(['vertical', 'role', 'interests']);
  });
});

describe('brainSignature (per-user cache key)', () => {
  it('is stable across re-computation of the same brain', () => {
    expect(brainSignature(makeProfile())).toBe(brainSignature(makeProfile()));
  });

  it('ignores the order of list-valued inputs', () => {
    const a = makeProfile({ boostedCategories: ['orchestration', 'security', 'proof'] });
    const b = makeProfile({ boostedCategories: ['proof', 'orchestration', 'security'] });
    expect(brainSignature(a)).toBe(brainSignature(b));
  });

  it('changes when a tuning preference changes (busts the cache)', () => {
    const before = brainSignature(makeProfile({ newsBias: 'practical' }));
    const after = brainSignature(makeProfile({ newsBias: 'big' }));
    expect(before).not.toBe(after);
  });

  it('changes when a new interest is added', () => {
    const before = brainSignature(makeProfile());
    const after = brainSignature(
      makeProfile({
        interestBeats: [
          { id: 'b1', text: 'agent frameworks' },
          { id: 'b2', text: 'enterprise AI adoption' },
          { id: 'b3', text: 'AI pricing' },
          { id: 'b4', text: 'model evals' },
        ],
      }),
    );
    expect(before).not.toBe(after);
  });

  it('changes when a new decision enters the brain', () => {
    const before = brainSignature(makeProfile());
    const after = brainSignature(
      makeProfile({
        decisions: [
          { id: 'd1', text: 'hire a head of sales' },
          { id: 'd2', text: 'raise a Series A' },
        ],
      }),
    );
    expect(before).not.toBe(after);
  });

  it('does not change when only a real mission id (not its text) differs', () => {
    const before = brainSignature(makeProfile({ missions: [{ id: 'm1', title: 'land first enterprise logo' }] }));
    const after = brainSignature(makeProfile({ missions: [{ id: 'm999', title: 'land first enterprise logo' }] }));
    expect(before).toBe(after);
  });
});

describe('toLensSource', () => {
  it('returns the preserved lens projection with real ids', () => {
    const p = makeProfile();
    expect(toLensSource(p)).toBe(p.lensSource);
    expect(toLensSource(p).missions[0].id).toBe('m1');
  });
});
