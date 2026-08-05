import { describe, expect, it } from 'vitest';
import { readStandardMeta } from '@/hooks/useStandard';
import type { GeneratedArtifact } from '@/types/artifact';

/**
 * One claim, tested from the person's side: the word Verified on their standard
 * means a measurement run said so, and nothing else.
 *
 * The failure this guards is the quiet one. A row whose metadata says
 * 'verified' with no numbers under it looks identical in the database to a real
 * release, and it renders identically in the card unless something re-derives
 * the label from the numbers. That re-derivation is releaseVerdict, and this
 * pins that the card goes through it rather than trusting the stored string.
 */

const artifact = (metadata: Record<string, unknown>): GeneratedArtifact =>
  ({
    id: 'a1',
    user_id: 'u1',
    kind: 'standard',
    name: 'My standard',
    body: '# standard',
    metadata,
    created_at: '2026-08-05T00:00:00.000Z',
  }) as unknown as GeneratedArtifact;

describe('readStandardMeta', () => {
  it('refuses a stored verified label that has no measurement under it', () => {
    const meta = readStandardMeta(artifact({ label: 'verified', criteria_kept: 5 }));
    expect(meta?.label).toBe('draft');
    expect(meta?.releaseReason).toMatch(/No measurement exists/i);
  });

  it('refuses a stored verified label on a hold-out below the floor', () => {
    const meta = readStandardMeta(
      artifact({
        label: 'verified',
        precision: 1,
        recall: 1,
        tnr: 1,
        held_out_graded: 4,
        self_agreement: { matched: 3, total: 3 },
      }),
    );
    expect(meta?.label).toBe('provisional');
  });

  it('keeps verified when the stored numbers actually support it', () => {
    const meta = readStandardMeta(
      artifact({
        label: 'verified',
        precision: 0.85,
        recall: 0.9,
        tnr: 0.88,
        held_out_graded: 12,
        self_agreement: { matched: 3, total: 3 },
        confusion: {
          tp: 9,
          fp: 1,
          fn: 1,
          tn: 8,
          excluded: { skipped: 1, insufficient: 0, total: 1 },
        },
      }),
    );
    // The label survives, and the counts come back with it so the card can say
    // what it caught rather than only what its precision was.
    expect(meta?.label).toBe('verified');
    expect(meta?.measurement?.counts?.tp).toBe(9);
    expect(meta?.measurement?.precision).toBeCloseTo(0.9, 6);
  });

  it('never reads upward from a missing label', () => {
    expect(readStandardMeta(artifact({}))?.label).toBe('draft');
    expect(readStandardMeta(artifact({ label: 'excellent' }))?.label).toBe('draft');
  });

  it('caps at provisional when the grader disagreed with themselves', () => {
    const meta = readStandardMeta(
      artifact({
        label: 'verified',
        precision: 0.9,
        recall: 0.9,
        tnr: 0.9,
        held_out_graded: 12,
        self_agreement: { matched: 2, total: 3 },
      }),
    );
    expect(meta?.label).toBe('provisional');
  });
});
