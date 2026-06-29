import { describe, it, expect } from 'vitest';
import { STARTER_DECISIONS, starterDecisionsFor, pickStarterDecision } from '@/lib/starterDecisions';

describe('starterDecisions', () => {
  it('always returns the full set, just reordered (never drops an option)', () => {
    for (const role of [null, undefined, '', 'CFO', 'CTO', 'CEO', 'Head of Sales', 'random title']) {
      const ordered = starterDecisionsFor(role);
      expect(ordered).toHaveLength(STARTER_DECISIONS.length);
      expect(new Set(ordered)).toEqual(new Set(STARTER_DECISIONS));
    }
  });

  it('leads with the build-vs-buy call for technical roles', () => {
    expect(pickStarterDecision('CTO')).toMatch(/build our own AI agents/i);
    expect(pickStarterDecision('VP of Engineering')).toMatch(/build our own AI agents/i);
  });

  it('leads with the vendor-standardisation call for finance/ops roles', () => {
    expect(pickStarterDecision('CFO')).toMatch(/standardise/i);
    expect(pickStarterDecision('COO / Operations')).toMatch(/standardise/i);
  });

  it('falls back to a sensible generic lead when the role is unknown', () => {
    expect(pickStarterDecision(null)).toBe(STARTER_DECISIONS[1]); // "Where should AI take work off my team first?"
  });
});
