import { describe, expect, it } from 'vitest';
import {
  buildBlindSpotCandidate,
  fingerprintBlindSpotSources,
  headlineWithinBudget,
  qualifyBlindSpotPattern,
  signBlindSpotCandidate,
  verifyBlindSpotCandidateSignature,
  type BlindSpotSource,
} from '../../supabase/functions/_shared/blind-spot-core';

const now = new Date('2026-08-11T12:00:00.000Z');

function source(overrides: Partial<BlindSpotSource> & Pick<BlindSpotSource, 'sourceId' | 'sourceKind'>): BlindSpotSource {
  return {
    label: 'Your evidence',
    excerpt: 'A verified piece of user-authored context.',
    observedAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
    eligibleAsIntention: false,
    eligibleAsRecurrence: true,
    ...overrides,
  };
}

const intention = source({
  sourceId: 'intention-1',
  sourceKind: 'memory',
  label: 'Your objective',
  excerpt: 'Build a team that can ship without me in every loop.',
  observedAt: '2026-07-02T12:00:00.000Z',
  updatedAt: '2026-07-02T12:00:00.000Z',
  eligibleAsIntention: true,
  eligibleAsRecurrence: false,
});
const recurrenceA = source({
  sourceId: 'decision-1',
  sourceKind: 'decision',
  excerpt: 'Keep product strategy with me until the new lead is in.',
  observedAt: '2026-07-19T12:00:00.000Z',
  updatedAt: '2026-07-19T12:00:00.000Z',
});
const recurrenceB = source({
  sourceId: 'checkin-1',
  sourceKind: 'check_in',
  excerpt: 'Still covering the product gaps myself.',
  observedAt: '2026-08-10T12:00:00.000Z',
  updatedAt: '2026-08-10T12:00:00.000Z',
});

describe('qualifyBlindSpotPattern', () => {
  it('requires a current intention and two independent recurrence records', () => {
    expect(qualifyBlindSpotPattern(intention, [recurrenceA, recurrenceB], now)).toMatchObject({
      qualifies: true,
      reason: 'qualified',
      signalCount: 3,
      sourceTypeCount: 3,
      windowDays: 39,
    });
  });

  it('returns a tension when recurrence is thin', () => {
    expect(qualifyBlindSpotPattern(intention, [recurrenceA], now)).toMatchObject({
      qualifies: false,
      reason: 'insufficient_recurrence',
    });
  });

  it('rejects same-kind records observed less than seven days apart', () => {
    const nearDuplicate = source({
      sourceId: 'decision-2',
      sourceKind: 'decision',
      observedAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    });
    expect(qualifyBlindSpotPattern(intention, [recurrenceA, nearDuplicate], now)).toMatchObject({
      qualifies: false,
      reason: 'insufficient_independence',
    });
  });

  it('rejects stale evidence', () => {
    const stale = source({
      sourceId: 'checkin-old',
      sourceKind: 'check_in',
      observedAt: '2025-01-01T12:00:00.000Z',
      updatedAt: '2025-01-01T12:00:00.000Z',
    });
    expect(qualifyBlindSpotPattern(intention, [recurrenceA, stale], now)).toMatchObject({
      qualifies: false,
      reason: 'stale_source',
    });
  });
});

describe('buildBlindSpotCandidate', () => {
  const model = {
    headline: 'Strategy is outrunning ownership.',
    explanation: 'The decisions stay with you while ownership is meant to move outward.',
    intention_source_id: intention.sourceId,
    recurrence_source_ids: [recurrenceA.sourceId, recurrenceB.sourceId],
    question: 'Which live decision can someone else own this week?',
    experiment_title: 'Hand over one live product call.',
    experiment_instruction: 'Name the decision, the owner and what only you still need to decide.',
    experiment_check_in_prompt: 'Did the decision stay with its new owner?',
    experiment_duration_minutes: 15,
  };

  it('uses exact server-held anchors and never model-written evidence', () => {
    const candidate = buildBlindSpotCandidate(model, [intention, recurrenceA, recurrenceB], now);
    expect(candidate.kind).toBe('pattern');
    expect(candidate.intention?.excerpt).toBe(intention.excerpt);
    expect(candidate.recurrence.map((anchor) => anchor.excerpt)).toEqual([
      recurrenceA.excerpt,
      recurrenceB.excerpt,
    ]);
    expect(candidate.experiment?.durationMinutes).toBe(15);
  });

  it('downgrades to a tension when selected evidence does not qualify', () => {
    const candidate = buildBlindSpotCandidate({
      ...model,
      recurrence_source_ids: [recurrenceA.sourceId],
    }, [intention, recurrenceA], now);
    expect(candidate.kind).toBe('tension');
    expect(candidate.experiment).toBeNull();
  });

  it('enforces the eight-word headline budget', () => {
    expect(headlineWithinBudget('Strategy is outrunning ownership.')).toBe(true);
    expect(headlineWithinBudget('This headline has far too many words to fit the promised content budget.')).toBe(false);
  });
});

describe('candidate integrity', () => {
  it('changes the anchor fingerprint when evidence changes', async () => {
    const first = await fingerprintBlindSpotSources([intention, recurrenceA, recurrenceB]);
    const second = await fingerprintBlindSpotSources([
      intention,
      { ...recurrenceA, updatedAt: '2026-08-11T12:00:00.000Z' },
      recurrenceB,
    ]);
    expect(first).not.toBe(second);
  });

  it('rejects a tampered confirmation payload', async () => {
    const candidate = buildBlindSpotCandidate({
      headline: 'Strategy is outrunning ownership.',
      explanation: 'The decisions stay with you while ownership is meant to move outward.',
      intention_source_id: intention.sourceId,
      recurrence_source_ids: [recurrenceA.sourceId, recurrenceB.sourceId],
      question: 'Which live decision can someone else own this week?',
      experiment_title: 'Hand over one live product call.',
      experiment_instruction: 'Name the decision, the owner and what only you still need to decide.',
      experiment_check_in_prompt: 'Did the decision stay with its new owner?',
      experiment_duration_minutes: 15,
    }, [intention, recurrenceA, recurrenceB], now);
    const fingerprint = await fingerprintBlindSpotSources([intention, recurrenceA, recurrenceB]);
    const signature = await signBlindSpotCandidate(candidate, fingerprint, 'test-secret');
    expect(await verifyBlindSpotCandidateSignature(candidate, fingerprint, 'test-secret', signature)).toBe(true);
    expect(await verifyBlindSpotCandidateSignature(
      { ...candidate, headline: 'You are definitely the problem.' },
      fingerprint,
      'test-secret',
      signature,
    )).toBe(false);
  });
});
