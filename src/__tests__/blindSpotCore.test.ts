import { describe, expect, it } from 'vitest';
import {
  ensureTentativeInsight,
  groundIndependentEvidence,
} from '../../supabase/functions/_shared/blind-spot-core';

describe('groundIndependentEvidence', () => {
  const facts = [
    'Objective: delegate weekly operating reviews to the leadership team',
    'Decision record: the founder delayed hiring an operations lead',
  ];

  it('accepts two grounded lines tied to two independent facts', () => {
    expect(groundIndependentEvidence([
      'You want to delegate the weekly operating reviews.',
      'The operations lead hiring decision has been delayed.',
    ], facts)).toHaveLength(2);
  });

  it('does not count two paraphrases of one fact as independent evidence', () => {
    expect(groundIndependentEvidence([
      'You want to delegate the weekly operating reviews.',
      'Weekly operating reviews are something you want to delegate.',
    ], facts)).toHaveLength(1);
  });

  it('rejects fluent evidence that is not in the supplied facts', () => {
    expect(groundIndependentEvidence([
      'Your board is pressing you to grow international revenue.',
      'Your product team is struggling with customer retention.',
    ], facts)).toEqual([]);
  });
});

describe('ensureTentativeInsight', () => {
  it('preserves a genuinely tentative observation', () => {
    expect(ensureTentativeInsight('There may be a gap between delegation and trust.'))
      .toBe('There may be a gap between delegation and trust.');
  });

  it('turns an absolute model claim into a question-shaped observation', () => {
    expect(ensureTentativeInsight('You hold on to decisions for too long.'))
      .toBe('I wonder if you hold on to decisions for too long.');
  });
});
