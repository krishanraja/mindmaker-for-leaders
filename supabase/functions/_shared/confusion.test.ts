import { describe, expect, it } from 'vitest';
import fixtureJson from './__fixtures__/confusion-cases.json';
import {
  confusionMatrix,
  formatNumbersForPeople,
  MEASUREMENT_ABSENT,
  metricsFrom,
  NO_MEASUREMENT,
  releaseVerdict,
  RELEASE_MIN_PRECISION,
  storedMetrics,
  UnknownVerdictError,
  type ConfusionMatrix,
  type MeasuredPair,
} from './confusion';
import { VERIFIED_MIN_HELD_OUT } from './discrimination';

/**
 * The four failures this file exists to prevent, all of which look like a
 * working measurement from the outside:
 *
 *   1. 0/0 rendered as 0. A precision with no denominator is an ABSENT
 *      measurement; a precision of 0 is a gate that fired and was wrong every
 *      time. Collapsing them means item 30 shows a number for a run in which
 *      nothing was measured, which is the whole failure this chain exists to
 *      stop (CH-03).
 *   2. The positive class quietly inverting. If TP and TN swap, every number
 *      below still looks plausible and the product ships a gate measured on the
 *      wrong job.
 *   3. Excluded rows getting coerced into a cell, which shrinks the denominator
 *      in the flattering direction and is invisible in the output.
 *   4. 'verified' arriving from somewhere other than releaseVerdict.
 */

// -- helpers ----------------------------------------------------------------

const pairs = (spec: Array<[MeasuredPair['human'], MeasuredPair['gate'], number]>): MeasuredPair[] => {
  const out: MeasuredPair[] = [];
  let i = 0;
  for (const [human, gate, count] of spec) {
    for (let k = 0; k < count; k++) out.push({ human, gate, itemId: `i${i++}` });
  }
  return out;
};

const CONSISTENT = { matched: 3, total: 3 };

// -- the matrix -------------------------------------------------------------

describe('confusionMatrix', () => {
  it('puts "would not send, and the gate broke" in TP, and "send, and the gate broke" in FP', () => {
    // The orientation, asserted with a worked example rather than by naming the
    // fields. Person rejects 5 (gate catches 4), person sends 7 (gate flags 1).
    const m = confusionMatrix(
      pairs([
        ['would_not_send', 'breaks', 4],
        ['would_not_send', 'holds', 1],
        ['send', 'breaks', 1],
        ['send', 'holds', 6],
      ]),
    );

    expect(m.tp).toBe(4);
    expect(m.fn).toBe(1);
    expect(m.fp).toBe(1);
    expect(m.tn).toBe(6);

    const metrics = metricsFrom(m);
    // Catching what they would reject is the job, so recall is over their
    // rejects (4 of 5) and precision is over what the gate flagged (4 of 5).
    expect(metrics.recall).toBeCloseTo(4 / 5, 6);
    expect(metrics.precision).toBeCloseTo(4 / 5, 6);
    // And TNR is over what they would have SENT, which is the other 7.
    expect(metrics.tnr).toBeCloseTo(6 / 7, 6);
  });

  it('excludes skips and insufficient-evidence verdicts, and counts them separately', () => {
    const m = confusionMatrix(
      pairs([
        ['would_not_send', 'breaks', 2],
        ['send', 'holds', 2],
        ['skip', 'breaks', 3],
        ['skip', 'holds', 1],
        ['would_not_send', 'insufficient', 2],
        ['send', 'insufficient', 1],
      ]),
    );

    expect(m.tp + m.fp + m.fn + m.tn).toBe(4);
    expect(m.excluded.skipped).toBe(4);
    expect(m.excluded.insufficient).toBe(3);
    expect(m.excluded.total).toBe(7);
    // Nothing was coerced: an insufficient never becomes a holds, so it can
    // never be credited as agreement.
    expect(m.tn).toBe(2);
    expect(m.fn).toBe(0);
  });

  it('counts a skip as a skip even when the gate also refused', () => {
    const m = confusionMatrix([{ human: 'skip', gate: 'insufficient' }]);
    expect(m.excluded.skipped).toBe(1);
    expect(m.excluded.insufficient).toBe(0);
    expect(m.excluded.total).toBe(1);
  });

  it('throws on an unrecognised verdict rather than coercing it into a cell', () => {
    expect(() => confusionMatrix([{ human: 'maybe' as MeasuredPair['human'], gate: 'holds' }]))
      .toThrow(UnknownVerdictError);
    expect(() => confusionMatrix([{ human: 'send', gate: 'unsure' as MeasuredPair['gate'] }]))
      .toThrow(UnknownVerdictError);
  });
});

// -- the degenerate case (CH-03) --------------------------------------------

describe('metricsFrom: a zero denominator is null, never NaN and never 0', () => {
  const empty: ConfusionMatrix = {
    tp: 0,
    fp: 0,
    fn: 0,
    tn: 0,
    excluded: { skipped: 0, insufficient: 0, total: 0 },
  };

  it('returns null for every metric on an empty matrix', () => {
    const m = metricsFrom(empty);
    expect(m.precision).toBeNull();
    expect(m.recall).toBeNull();
    expect(m.tnr).toBeNull();
    expect(m.n).toBe(0);
    for (const value of [m.precision, m.recall, m.tnr]) {
      expect(Number.isNaN(value as number)).toBe(false);
      expect(value).not.toBe(0);
    }
  });

  it('zero criteria loaded: precision is null while recall is a measured zero', () => {
    // The exact CH-03 shape. An empty rubric holds on everything, so the gate
    // flagged nothing: TP + FP is 0 and precision has no denominator. Recall
    // DID have a denominator (they rejected four things) and it is really zero.
    const m = confusionMatrix(
      pairs([
        ['would_not_send', 'holds', 4],
        ['send', 'holds', 6],
      ]),
    );
    const metrics = metricsFrom(m);

    expect(metrics.precision).toBeNull();
    expect(metrics.recall).toBe(0);
    expect(metrics.tnr).toBe(1);
    expect(metrics.n).toBe(10);
  });

  it('a null precision can never be released as verified, whatever else is true', () => {
    const metrics = metricsFrom(
      confusionMatrix(
        pairs([
          ['would_not_send', 'holds', 4],
          ['send', 'holds', 16],
        ]),
      ),
    );
    const verdict = releaseVerdict({ metrics, heldOutGraded: 20, selfAgreement: CONSISTENT });

    expect(verdict.label).toBe('draft');
    expect(verdict.reason).toMatch(/flagged none of them|no precision/i);
    expect(verdict.reason).not.toMatch(/NaN/);
  });
});

// -- the release verdict ----------------------------------------------------

describe('releaseVerdict', () => {
  const strong = metricsFrom(
    confusionMatrix(
      pairs([
        ['would_not_send', 'breaks', 5],
        ['send', 'breaks', 1],
        ['send', 'holds', 6],
      ]),
    ),
  );

  it('says plainly that no measurement exists when nothing has been run', () => {
    const verdict = releaseVerdict({ metrics: null, heldOutGraded: 30, selfAgreement: CONSISTENT });
    expect(verdict.label).toBe('draft');
    expect(verdict.reason).toMatch(/No measurement exists/i);
    expect(verdict.reason).not.toMatch(/\d\.\d\d/);
  });

  it('treats NO_MEASUREMENT the same as nothing at all', () => {
    expect(releaseVerdict({ metrics: NO_MEASUREMENT, heldOutGraded: 30 }).label).toBe('draft');
  });

  it('is verified only above the held-out floor', () => {
    expect(
      releaseVerdict({ metrics: strong, heldOutGraded: VERIFIED_MIN_HELD_OUT, selfAgreement: CONSISTENT }).label,
    ).toBe('verified');

    const thin = releaseVerdict({
      metrics: strong,
      heldOutGraded: VERIFIED_MIN_HELD_OUT - 1,
      selfAgreement: CONSISTENT,
    });
    expect(thin.label).not.toBe('verified');
    expect(thin.reason).toMatch(new RegExp(`floor of ${VERIFIED_MIN_HELD_OUT}`));
  });

  it('is never verified on a perfect score over five pieces', () => {
    const perfect = metricsFrom(
      confusionMatrix(
        pairs([
          ['would_not_send', 'breaks', 2],
          ['send', 'holds', 3],
        ]),
      ),
    );
    const verdict = releaseVerdict({ metrics: perfect, heldOutGraded: 5, selfAgreement: CONSISTENT });
    expect(perfect.precision).toBe(1);
    expect(perfect.recall).toBe(1);
    expect(verdict.label).toBe('provisional');
  });

  it('caps the label at provisional when the grader disagrees with themselves', () => {
    const capped = releaseVerdict({
      metrics: strong,
      heldOutGraded: 12,
      selfAgreement: { matched: 2, total: 3 },
    });
    expect(capped.label).toBe('provisional');
    expect(capped.reason).toMatch(/2 of 3 repeated pieces/);
    expect(capped.reason).toMatch(/cannot be more consistent than the person/);
  });

  it('caps at provisional when self-agreement was never measured', () => {
    const unmeasured = releaseVerdict({ metrics: strong, heldOutGraded: 12 });
    expect(unmeasured.label).toBe('provisional');
    expect(unmeasured.reason).toMatch(/too few repeated pieces/i);
  });

  it('sends a gate that cries wolf back to the compile step', () => {
    const wolf = metricsFrom(
      confusionMatrix(
        pairs([
          ['would_not_send', 'breaks', 3],
          ['would_not_send', 'holds', 1],
          ['send', 'breaks', 5],
          ['send', 'holds', 3],
        ]),
      ),
    );
    const verdict = releaseVerdict({ metrics: wolf, heldOutGraded: 12, selfAgreement: CONSISTENT });

    expect(wolf.precision).toBeLessThan(RELEASE_MIN_PRECISION);
    expect(verdict.label).toBe('draft');
    expect(verdict.reason).toMatch(/cries wolf|goes back to the compile step/i);
  });

  it('reports all three numbers separately, never one agreement figure', () => {
    const verdict = releaseVerdict({ metrics: strong, heldOutGraded: 12, selfAgreement: CONSISTENT });
    expect(verdict.reason).toMatch(/Precision \d\.\d\d/);
    expect(verdict.reason).toMatch(/recall \d\.\d\d/);
    expect(verdict.reason).toMatch(/TNR \d\.\d\d/);
    expect(verdict.reason).not.toMatch(/agreement of|overall accuracy/i);
  });
});

// -- the plain-language rendering -------------------------------------------

describe('formatNumbersForPeople', () => {
  const measured = metricsFrom(
    confusionMatrix(
      pairs([
        ['would_not_send', 'breaks', 4],
        ['would_not_send', 'holds', 1],
        ['send', 'breaks', 1],
        ['send', 'holds', 6],
      ]),
    ),
  );

  it('renders counts, not percentages', () => {
    const lines = formatNumbersForPeople(measured);
    expect(lines[0]).toBe('Of the things you would not have sent, it caught 4 of 5.');
    expect(lines[1]).toBe('It also flagged 1 you would have sent.');
    expect(lines.join(' ')).not.toContain('%');
    expect(lines.join(' ')).not.toMatch(/percent/i);
  });

  it('never contains a percent sign, whatever the shape of the matrix', () => {
    const shapes: MeasuredPair[][] = [
      [],
      pairs([['skip', 'holds', 3]]),
      pairs([['would_not_send', 'holds', 4], ['send', 'holds', 6]]),
      pairs([['would_not_send', 'breaks', 2]]),
      pairs([['send', 'breaks', 2], ['send', 'holds', 1], ['would_not_send', 'insufficient', 1]]),
    ];
    for (const shape of shapes) {
      const text = formatNumbersForPeople(metricsFrom(confusionMatrix(shape))).join(' ');
      expect(text).not.toContain('%');
      expect(text).not.toMatch(/\bNaN\b/);
    }
  });

  it('says what is missing rather than printing a figure when a side is empty', () => {
    const noRejects = formatNumbersForPeople(
      metricsFrom(confusionMatrix(pairs([['send', 'holds', 4]]))),
    );
    expect(noRejects[0]).toMatch(/nothing yet to say about what it catches/i);

    const noSends = formatNumbersForPeople(
      metricsFrom(confusionMatrix(pairs([['would_not_send', 'breaks', 3]]))),
    );
    expect(noSends[1]).toMatch(/nothing yet to say about how often it flags/i);
  });

  it('makes the shrinking denominator visible', () => {
    const lines = formatNumbersForPeople(
      metricsFrom(
        confusionMatrix(
          pairs([
            ['would_not_send', 'breaks', 2],
            ['send', 'holds', 2],
            ['skip', 'holds', 1],
            ['send', 'insufficient', 2],
          ]),
        ),
      ),
    );
    expect(lines[2]).toBe(
      '3 pieces are not in those numbers: 1 you skipped, and 2 it could not point at anything in.',
    );
  });

  it('says nothing has been measured when nothing has', () => {
    expect(formatNumbersForPeople(null)).toEqual([MEASUREMENT_ABSENT]);
    expect(formatNumbersForPeople(NO_MEASUREMENT)).toEqual([MEASUREMENT_ABSENT]);
  });

  it('admits when the counts behind a stored measurement were not kept', () => {
    const stored = storedMetrics({ precision: 0.8, recall: 0.8, tnr: 0.9, n: 12 });
    const lines = formatNumbersForPeople(stored);
    expect(stored.counts).toBeNull();
    expect(lines[0]).toMatch(/counts behind it were not kept/i);
    expect(lines.join(' ')).not.toContain('%');
  });

  it('drops a non-finite stored rate to null rather than passing it through', () => {
    const stored = storedMetrics({
      precision: Number.NaN,
      recall: Number.POSITIVE_INFINITY,
      tnr: 0.9,
      n: 12,
    });
    expect(stored.precision).toBeNull();
    expect(stored.recall).toBeNull();
    expect(stored.tnr).toBe(0.9);
  });
});

// -- the committed fixture (the CI gate) ------------------------------------

interface FixtureCase {
  name: string;
  why: string;
  heldOutGraded: number;
  selfAgreement: { matched: number; total: number };
  pairs: MeasuredPair[];
  expect: {
    matrix: ConfusionMatrix;
    metrics: { precision: number | null; recall: number | null; tnr: number | null; n: number };
    label: string;
    people: string[];
  };
}

const fixture = fixtureJson as unknown as { cases: FixtureCase[] };

describe('confusion-cases.json', () => {
  it('carries the whole set, so a deleted case fails the build', () => {
    expect(fixture.cases.length).toBe(5);
  });

  for (const testCase of fixture.cases) {
    it(testCase.name, () => {
      const matrix = confusionMatrix(testCase.pairs);
      expect(matrix).toEqual(testCase.expect.matrix);

      const metrics = metricsFrom(matrix);
      expect(metrics.precision).toEqual(testCase.expect.metrics.precision);
      expect(metrics.recall).toEqual(testCase.expect.metrics.recall);
      expect(metrics.tnr).toEqual(testCase.expect.metrics.tnr);
      expect(metrics.n).toBe(testCase.expect.metrics.n);

      const verdict = releaseVerdict({
        metrics,
        heldOutGraded: testCase.heldOutGraded,
        selfAgreement: testCase.selfAgreement,
      });
      expect(verdict.label).toBe(testCase.expect.label);
      expect(verdict.reason.length).toBeGreaterThan(0);

      expect(formatNumbersForPeople(metrics)).toEqual(testCase.expect.people);
    });
  }
});
