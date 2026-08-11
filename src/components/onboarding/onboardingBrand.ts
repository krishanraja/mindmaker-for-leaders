import type { CSSProperties } from 'react';

export type OnboardingStep =
  | 'intro'
  | 'identity'
  | 'week'
  | 'extra'
  | 'ai'
  | 'future'
  | 'decision'
  | 'thinking'
  | 'result';

export const ONBOARDING_BRAND_PROGRESS: Record<OnboardingStep, number> = {
  intro: 0,
  identity: 0.14,
  week: 0.3,
  extra: 0.46,
  ai: 0.62,
  future: 0.78,
  decision: 0.9,
  thinking: 1,
  result: 1,
};

const START = {
  background: '#0a0908',
  foreground: '#f5f1ea',
  actionInk: '#0a0908',
} as const;

const CTRL = {
  background: '#08090c',
  foreground: '#e6eaf2',
  actionInk: '#090d0e',
} as const;

const ACCENT_A = [
  [0, '#ec4899'],
  [0.14, '#dd599e'],
  [0.3, '#bf67ac'],
  [0.46, '#9979bb'],
  [0.62, '#668fc0'],
  [0.78, '#2cb9b7'],
  [0.9, '#0fcdb4'],
  [1, '#00d9b6'],
] as const;

const ACCENT_B = [
  [0, '#f97316'],
  [0.14, '#ed6a45'],
  [0.3, '#d56d78'],
  [0.46, '#ad78a7'],
  [0.62, '#778cb8'],
  [0.78, '#38b4b3'],
  [0.9, '#11cbb4'],
  [1, '#00d9b6'],
] as const;

const ACTION = [
  [0, '#f5f1ea'],
  [0.14, '#f0e7e5'],
  [0.3, '#e4d9e5'],
  [0.46, '#d7d2ea'],
  [0.62, '#a9c5dd'],
  [0.78, '#65c8bd'],
  [0.9, '#24d0b5'],
  [1, '#00d9b6'],
] as const;

type OnboardingThemeStyle = CSSProperties & {
  '--onboarding-bg': string;
  '--onboarding-fg': string;
  '--onboarding-accent-a': string;
  '--onboarding-accent-b': string;
  '--onboarding-action': string;
  '--onboarding-action-ink': string;
};

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseHex(hex: string) {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ] as const;
}

export function mixHex(start: string, end: string, progress: number) {
  const from = parseHex(start);
  const to = parseHex(end);
  const amount = clamp(progress);
  const channels = from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * amount),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function mixPalette(stops: ReadonlyArray<readonly [number, string]>, progress: number) {
  const amount = clamp(progress);
  const nextIndex = stops.findIndex(([position]) => position >= amount);
  if (nextIndex <= 0) return stops[0][1];
  const [nextPosition, nextColor] = stops[nextIndex];
  const [previousPosition, previousColor] = stops[nextIndex - 1];
  const localProgress = (amount - previousPosition) / (nextPosition - previousPosition);
  return mixHex(previousColor, nextColor, localProgress);
}

export function brandProgressForStep(step: OnboardingStep) {
  return ONBOARDING_BRAND_PROGRESS[step];
}

export function onboardingThemeForProgress(progress: number): OnboardingThemeStyle {
  return {
    '--onboarding-bg': mixHex(START.background, CTRL.background, progress),
    '--onboarding-fg': mixHex(START.foreground, CTRL.foreground, progress),
    '--onboarding-accent-a': mixPalette(ACCENT_A, progress),
    '--onboarding-accent-b': mixPalette(ACCENT_B, progress),
    '--onboarding-action': mixPalette(ACTION, progress),
    '--onboarding-action-ink': mixHex(START.actionInk, CTRL.actionInk, progress),
  };
}
