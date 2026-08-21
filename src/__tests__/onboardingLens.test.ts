import { describe, expect, it } from 'vitest';
import {
  rankPoolForOnboarding,
  strongestOnboardingLane,
} from '../../supabase/functions/_shared/onboarding-lens';

describe('onboarding lens', () => {
  it('turns the delayed decision into the strongest matching lane', () => {
    expect(strongestOnboardingLane({
      q5: 'Whether to rebuild the team around AI agents',
      q2: 'think',
      q4: 'hybrid',
    })).toBe('orchestration');
  });

  it('uses the same lane signal to rank the shared news pool', () => {
    const cards = [
      { headline: 'Model release', category: 'model', score: 8 },
      { headline: 'Agent operating model', category: 'orchestration', score: 4 },
    ];
    expect(rankPoolForOnboarding(cards, {
      q5: 'How to wire agents into our workflow',
      q2: 'do',
      q4: 'autonomous',
    })[0].headline).toBe('Agent operating model');
  });

  it('preserves pool order when onboarding contains no signal', () => {
    const cards = [
      { headline: 'First', category: 'model', score: 2 },
      { headline: 'Second', category: 'tools', score: 1 },
    ];
    expect(rankPoolForOnboarding(cards, {})[0].headline).toBe('First');
  });
});
