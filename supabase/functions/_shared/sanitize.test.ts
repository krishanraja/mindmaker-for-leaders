import { describe, it, expect } from 'vitest';
import { stripEmDashes, hasDisallowedDash } from './sanitize';

const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

describe('stripEmDashes (no-em-dash house rule on model output)', () => {
  it('removes a spaced em dash used as an aside', () => {
    const out = stripEmDashes(`This is not a delay tactic${EM}it is the minimum needed.`);
    expect(hasDisallowedDash(out)).toBe(false);
    expect(out).toBe('This is not a delay tactic, it is the minimum needed.');
  });

  it('removes a spaced em dash with surrounding whitespace', () => {
    const out = stripEmDashes(`Ship the pilot ${EM} then decide.`);
    expect(hasDisallowedDash(out)).toBe(false);
    expect(out).toBe('Ship the pilot, then decide.');
  });

  it('turns a numeric range into "to"', () => {
    expect(stripEmDashes(`a 60${EM}90 day pilot`)).toBe('a 60 to 90 day pilot');
    expect(stripEmDashes(`4${EN}6 weeks`)).toBe('4 to 6 weeks');
  });

  it('leaves clean text unchanged (idempotent)', () => {
    const clean = 'A clear, calibrated recommendation with no dashes.';
    expect(stripEmDashes(clean)).toBe(clean);
    expect(stripEmDashes(stripEmDashes(clean))).toBe(clean);
  });

  it('handles null / undefined / empty', () => {
    expect(stripEmDashes(null)).toBe('');
    expect(stripEmDashes(undefined)).toBe('');
    expect(stripEmDashes('')).toBe('');
  });

  it('output never contains a disallowed dash', () => {
    const nasty = `One${EM}two ${EM} three${EN}four, five ${EN} six, range 1${EM}9.`;
    expect(hasDisallowedDash(stripEmDashes(nasty))).toBe(false);
  });
});
