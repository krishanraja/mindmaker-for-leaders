import type { BlindSpotCandidateV2 } from '@/types/blindSpot';

export const blindSpotPatternFixture: BlindSpotCandidateV2 = {
  kind: 'pattern',
  headline: 'Strategy is outrunning ownership.',
  explanation: 'You keep naming ownership as the constraint while the decisions stay with you.',
  evidenceStrength: { signalCount: 3, sourceTypeCount: 2, windowDays: 39 },
  intention: {
    sourceId: '00000000-0000-4000-8000-000000000001',
    sourceKind: 'memory',
    label: 'Your objective',
    excerpt: 'Build a team that can ship without me in every loop.',
    observedAt: '2026-07-02T12:00:00.000Z',
    role: 'intention',
  },
  recurrence: [
    { sourceId: '00000000-0000-4000-8000-000000000002', sourceKind: 'decision', label: 'Your decision', excerpt: 'Keep product strategy with me until the new lead is in.', observedAt: '2026-07-19T12:00:00.000Z', role: 'recurrence' },
    { sourceId: '00000000-0000-4000-8000-000000000003', sourceKind: 'memory', label: 'Your blocker', excerpt: 'Too many decisions still come back to me.', observedAt: '2026-08-07T12:00:00.000Z', role: 'recurrence' },
    { sourceId: '00000000-0000-4000-8000-000000000004', sourceKind: 'check_in', label: 'Your check-in', excerpt: 'Still covering the product gaps myself.', observedAt: '2026-08-10T12:00:00.000Z', role: 'recurrence' },
  ],
  question: 'Which live decision can someone else own this week?',
  experiment: {
    title: 'Hand over one live product call.',
    instruction: 'Name the decision, the owner and what only you still need to decide.',
    checkInPrompt: 'Did the decision stay with its new owner?',
    durationMinutes: 15,
  },
};

export const blindSpotTensionFixture: BlindSpotCandidateV2 = {
  ...blindSpotPatternFixture,
  kind: 'tension',
  headline: 'Ownership may be lagging intent.',
  explanation: 'There is one signal here, but not enough repetition to call it a pattern.',
  evidenceStrength: { signalCount: 2, sourceTypeCount: 2, windowDays: 17 },
  recurrence: blindSpotPatternFixture.recurrence.slice(0, 1),
  question: 'What has returned to you since this decision?',
  experiment: null,
};
