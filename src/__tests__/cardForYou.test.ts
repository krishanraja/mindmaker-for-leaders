import { describe, it, expect } from 'vitest';
import { composeForYouLine, weighPrefillFor } from '@/lib/cardForYou';

/**
 * The for-you line is the overlay's honesty-bounded personalization: it may
 * only state what the brain actually knows (role -> archetype lens, sector)
 * plus the category's plain-language meaning. These tests pin that it adapts
 * to a known role, includes a known sector, degrades gracefully to the
 * default lens when nothing is known, and never fabricates specifics.
 */

describe('composeForYouLine', () => {
  it('maps a known role to its archetype lens', () => {
    const line = composeForYouLine({ role: 'CFO', sector: null, categoryId: 'economics' });
    expect(line).toContain('the cost curve and the numbers');
    expect(line).toContain('what it costs to run AI');
  });

  it('includes the sector when known', () => {
    const line = composeForYouLine({ role: 'CTO', sector: 'healthcare', categoryId: 'tools' });
    expect(line).toContain('in healthcare');
    expect(line).toContain('building and running the systems');
  });

  it('falls back to the default leader lens for an unknown role, with no sector clause', () => {
    const line = composeForYouLine({ role: null, sector: null, categoryId: 'org' });
    expect(line.startsWith('Your seat watches the AI-native version of your business.')).toBe(true);
  });

  it('lowercases the category meaning into a clause with no double period', () => {
    const line = composeForYouLine({ role: 'CEO', sector: 'retail', categoryId: 'economics' });
    expect(line).toContain('moves what it costs');
    expect(line).not.toMatch(/\.\./);
  });

  it('contains no em dashes (house style)', () => {
    const line = composeForYouLine({ role: 'founder', sector: 'fintech', categoryId: 'proof' });
    expect(line).not.toMatch(/[\u2014\u2013]/);
  });
});

describe('weighPrefillFor', () => {
  it('wraps the headline into a decision statement without a double period', () => {
    const prefill = weighPrefillFor('Anthropic releases Claude Sonnet 5 with enhanced agentic capabilities.');
    expect(prefill).toContain('"Anthropic releases Claude Sonnet 5 with enhanced agentic capabilities"');
    expect(prefill).toMatch(/should we change anything/i);
    expect(prefill).not.toContain('."",');
  });
});
