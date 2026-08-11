import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_BRAND_PROGRESS,
  brandProgressForStep,
  mixHex,
  onboardingThemeForProgress,
  type OnboardingStep,
} from './onboardingBrand';

describe('onboarding brand transition', () => {
  it('moves monotonically from Make Your Mind Up to CTRL', () => {
    const sequence: OnboardingStep[] = [
      'intro',
      'identity',
      'week',
      'extra',
      'ai',
      'future',
      'decision',
      'thinking',
      'result',
    ];
    const progress = sequence.map(brandProgressForStep);

    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(1);
    expect(progress.every((value, index) => index === 0 || value >= progress[index - 1])).toBe(true);
    expect(ONBOARDING_BRAND_PROGRESS.thinking).toBe(1);
  });

  it('pins the exact palette endpoints', () => {
    expect(onboardingThemeForProgress(0)).toMatchObject({
      '--onboarding-bg': '#0a0908',
      '--onboarding-fg': '#f5f1ea',
      '--onboarding-accent-a': '#ec4899',
      '--onboarding-accent-b': '#f97316',
    });
    expect(onboardingThemeForProgress(1)).toMatchObject({
      '--onboarding-bg': '#08090c',
      '--onboarding-fg': '#e6eaf2',
      '--onboarding-accent-a': '#00d9b6',
      '--onboarding-accent-b': '#00d9b6',
      '--onboarding-action': '#00d9b6',
    });
    expect(onboardingThemeForProgress(0.46)).toMatchObject({
      '--onboarding-accent-a': '#9979bb',
      '--onboarding-accent-b': '#ad78a7',
      '--onboarding-action': '#d7d2ea',
    });
  });

  it('clamps colour interpolation outside the supported range', () => {
    expect(mixHex('#000000', '#ffffff', -1)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#000000', '#ffffff', 2)).toBe('#ffffff');
  });
});
