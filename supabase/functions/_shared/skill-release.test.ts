import { describe, expect, it } from 'vitest';
import {
  NO_NUMBERS,
  numbersFromStandardMetadata,
  readSkillRelease,
  skillRelease,
  threeNumbers,
} from './skill-release.ts';

/**
 * The failure mode these tests exist to prevent is a delivery screen that reads
 * as a grade. Two rules, and every assertion below is one of them:
 *
 *   1. A label is never lifted by the existence of a rubric. Only measurement
 *      lifts it, and only through releaseVerdict.
 *   2. A number never loses the thing it was measured on.
 */

describe('numbersFromStandardMetadata', () => {
  it('is empty when the standard recorded nothing', () => {
    expect(numbersFromStandardMetadata({}, 'a1')).toEqual(NO_NUMBERS);
    expect(numbersFromStandardMetadata(null, null)).toEqual(NO_NUMBERS);
  });

  it('does not treat an explicit null measurement as a measurement', () => {
    // This is exactly what compile-standard writes before any measure stage.
    const numbers = numbersFromStandardMetadata(
      { precision: null, recall: null, tnr: null, confusion: null },
      'a1',
    );
    expect(numbers.measured_on).toBeNull();
  });

  it('carries the numbers with what they were measured on', () => {
    const numbers = numbersFromStandardMetadata(
      { precision: 0.9, recall: 0.85, tnr: 0.8, held_out_graded: 12, self_agreement: { matched: 5, total: 5 } },
      'artifact-9',
    );
    expect(numbers.precision).toBe(0.9);
    expect(numbers.held_out_graded).toBe(12);
    expect(numbers.measured_on).toBe('standard');
    expect(numbers.measurement_artifact_id).toBe('artifact-9');
  });
});

describe('skillRelease', () => {
  it('is Draft with no measurement, however many criteria exist', () => {
    // The package writer used to say 'provisional' whenever a rubric existed.
    // criteriaVersion 4 here means the leader HAS a standard; it still does not
    // buy a label, because nothing was run.
    const release = skillRelease({ numbers: null, criteriaVersion: 4 });
    expect(release.label).toBe('draft');
    expect(release.labelText).toBe('Draft');
    expect(release.reason).toContain('No measurement exists');
  });

  it('keeps the provenance sentence attached whenever numbers are shown', () => {
    const numbers = numbersFromStandardMetadata(
      { precision: 0.9, recall: 0.85, tnr: 0.8, held_out_graded: 12, self_agreement: { matched: 5, total: 5 } },
      'artifact-9',
    );
    const release = skillRelease({ numbers, criteriaVersion: 2 });
    expect(release.reason).toContain('not from a test of this skill');
  });

  it('cannot reach Verified on a hold-out below the floor', () => {
    const numbers = numbersFromStandardMetadata(
      { precision: 1, recall: 1, tnr: 1, held_out_graded: 4, self_agreement: { matched: 5, total: 5 } },
      'artifact-9',
    );
    expect(skillRelease({ numbers }).label).not.toBe('verified');
  });
});

describe('readSkillRelease', () => {
  it('reads a written artefact back with its label and version', () => {
    const meta = {
      criteria_version: 3,
      rendered_at: '2026-08-05T10:00:00.000Z',
      release: {
        label: 'provisional',
        reason: 'ignored on read',
        numbers: {
          precision: 0.7,
          recall: 0.7,
          tnr: 0.7,
          held_out_graded: 14,
          self_agreement: { matched: 5, total: 5 },
          measured_on: 'standard',
          measurement_artifact_id: 'std-1',
        },
      },
    };
    const release = readSkillRelease(meta);
    expect(release.label).toBe('provisional');
    expect(release.criteriaVersion).toBe(3);
    expect(release.renderedAt).toBe('2026-08-05T10:00:00.000Z');
  });

  it('re-derives the label rather than trusting the stored one', () => {
    const release = readSkillRelease({
      release: { label: 'verified', reason: 'trust me', numbers: null },
    });
    expect(release.label).toBe('draft');
  });

  it('gives Draft for a writer older than the field', () => {
    expect(readSkillRelease({ zip_filename: 'thing.zip' }).label).toBe('draft');
    expect(readSkillRelease(null).label).toBe('draft');
  });
});

describe('threeNumbers', () => {
  it('is null when nothing was measured', () => {
    expect(threeNumbers(skillRelease({}))).toBeNull();
  });

  it('prints all three plus the denominator', () => {
    const numbers = numbersFromStandardMetadata(
      { precision: 0.82, recall: 0.75, tnr: 0.9, held_out_graded: 12 },
      'std-1',
    );
    expect(threeNumbers(skillRelease({ numbers }))).toBe(
      'Precision 0.82, recall 0.75, TNR 0.90, over 12 scored pieces.',
    );
  });

  it('says which one is missing instead of printing a zero', () => {
    const numbers = numbersFromStandardMetadata(
      { precision: 0.82, recall: null, tnr: null, held_out_graded: 12 },
      'std-1',
    );
    expect(threeNumbers(skillRelease({ numbers }))).toContain('recall not measurable');
  });
});
