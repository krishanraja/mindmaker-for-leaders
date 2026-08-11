import { describe, expect, it } from 'vitest';
import {
  companyAiLabel,
  fallbackResult,
  sliderValueForKey,
  weekNeedsMeLabel,
  type OnboardingAnswers,
} from '@/components/onboarding/onboardingModel';

const answers: OnboardingAnswers = {
  weekNeedsMe: 82,
  extraSelf: 'think',
  companyAi: 64,
  companyFuture: 'hybrid',
  delayedDecision: 'Whether to rebuild the team around AI',
};

describe('onboarding labels', () => {
  it('covers every slider boundary without a gap', () => {
    expect([0, 19, 20, 49, 50, 79, 80, 100].map(weekNeedsMeLabel)).toEqual([
      'Almost none of it',
      'Almost none of it',
      'About a quarter to half',
      'About a quarter to half',
      'Most of it',
      'Most of it',
      "All of it, and that's the problem",
      "All of it, and that's the problem",
    ]);
    expect(companyAiLabel(19)).toBe('A few corners');
    expect(companyAiLabel(20)).toBe('A whole function');
    expect(companyAiLabel(80)).toBe('Almost everything except the choices');
  });
});

describe('sliderValueForKey', () => {
  it('supports standard range-control keyboard interactions', () => {
    expect(sliderValueForKey(50, 'ArrowLeft')).toBe(49);
    expect(sliderValueForKey(50, 'ArrowDown')).toBe(49);
    expect(sliderValueForKey(50, 'ArrowRight')).toBe(51);
    expect(sliderValueForKey(50, 'ArrowUp')).toBe(51);
    expect(sliderValueForKey(50, 'PageDown')).toBe(40);
    expect(sliderValueForKey(50, 'PageUp')).toBe(60);
    expect(sliderValueForKey(50, 'Home')).toBe(0);
    expect(sliderValueForKey(50, 'End')).toBe(100);
  });

  it('clamps at the limits and ignores unrelated keys', () => {
    expect(sliderValueForKey(0, 'ArrowLeft')).toBe(0);
    expect(sliderValueForKey(100, 'PageUp')).toBe(100);
    expect(sliderValueForKey(50, 'Enter')).toBeNull();
  });
});

describe('fallbackResult', () => {
  it('is stable for the same response and answers', () => {
    expect(fallbackResult('response-123', answers)).toEqual(fallbackResult('response-123', answers));
  });

  it('always preserves human choice in the future state', () => {
    const result = fallbackResult('response-123', answers);
    expect(result.archetypeKey).toBe('think+hybrid');
    expect(result.threeYears).toContain('The choices remain human.');
  });
});
