import { describe, expect, it } from 'vitest';
import {
  applicationVector,
  applyProbe,
  baselineLabel,
  byWeightLoadOrder,
  clusterByApplication,
  CLUSTER_AGREEMENT_MIN,
  DISC_GAP_MIN,
  discriminationFor,
  discriminationReason,
  discriminationVerdict,
  hasProperNoun,
  labelCeilingForTriage,
  medianOffDiagonal,
  paragraphsOf,
  parseProbe,
  REJECT_FAIL_MIN,
  triageFromSelfAgreement,
  TRIAGE_REASONS,
  tryApplyProbe,
  UnparseableObservableError,
  weakerLabel,
  WEIGHT_LOAD_ORDER,
  type DiscGrade,
  type DiscTrainingItem,
  type ProbeCriterion,
} from './discrimination';

/**
 * The three things this file exists to pin are the three that fail silently.
 *
 * An observable nobody can check, scored anyway, is a rubric with a number on
 * it and nothing behind the number. A criterion with three rejects on the board
 * looks identical in a database to one with thirty. And a clusterer that merges
 * everything (or nothing) reports a clean run either way.
 */

// -- fixtures ---------------------------------------------------------------

function item(id: string, body: string, targets: string[] = []): DiscTrainingItem {
  return { id, body, targets };
}

function grade(itemId: string, verdict: DiscGrade['verdict']): DiscGrade {
  return { itemId, verdict };
}

/** n items whose bodies alternate on whether they name a client. */
function namedClientDeck(rejected: number, accepted: number) {
  const items: DiscTrainingItem[] = [];
  const grades: DiscGrade[] = [];
  for (let i = 0; i < rejected; i++) {
    items.push(item(`r${i}`, 'We reviewed the account and think the plan is broadly sound.'));
    grades.push(grade(`r${i}`, 'would_not_send'));
  }
  for (let i = 0; i < accepted; i++) {
    items.push(item(`a${i}`, 'We reviewed the Northwind account and think the plan is broadly sound.'));
    grades.push(grade(`a${i}`, 'send'));
  }
  return { items, grades };
}

const NAMES_A_CLIENT: ProbeCriterion = {
  id: 'earned-claim',
  observable: 'contains:Northwind',
};

// -- the probe grammar ------------------------------------------------------

describe('parseProbe', () => {
  it('parses every shape in the grammar', () => {
    expect(parseProbe('contains:Northwind')).toEqual({ kind: 'contains', needle: 'Northwind' });
    expect(parseProbe('matches:/^Hi\\b/i')).toEqual({ kind: 'matches', source: '^Hi\\b', flags: 'i' });
    expect(parseProbe('max_words:120')).toEqual({ kind: 'max_words', n: 120 });
    expect(parseProbe('min_words:40')).toEqual({ kind: 'min_words', n: 40 });
    expect(parseProbe('has_number')).toEqual({ kind: 'has_number' });
    expect(parseProbe('has_proper_noun')).toEqual({ kind: 'has_proper_noun' });
    expect(parseProbe('not:has_number')).toEqual({ kind: 'not', inner: { kind: 'has_number' } });
    expect(parseProbe('within_first_paragraphs:3:has_proper_noun')).toEqual({
      kind: 'within_first_paragraphs',
      n: 3,
      inner: { kind: 'has_proper_noun' },
    });
  });

  it('returns null for an observable that is not machine-checkable', () => {
    // The spec's own prose observables. They read well and check nothing.
    expect(parseProbe('a named client fact appearing before the third paragraph')).toBeNull();
    expect(parseProbe('opens with the decision')).toBeNull();
    expect(parseProbe('')).toBeNull();
    expect(parseProbe(null)).toBeNull();
    expect(parseProbe(undefined)).toBeNull();
    expect(parseProbe('contains:')).toBeNull();
    expect(parseProbe('max_words:0')).toBeNull();
    expect(parseProbe('max_words:many')).toBeNull();
    expect(parseProbe('matches:not-a-regex')).toBeNull();
    expect(parseProbe('matches:/(unclosed/')).toBeNull();
    expect(parseProbe('sounds_like:me')).toBeNull();
    // The inner term of within_first_paragraphs must itself be a probe.
    expect(parseProbe('within_first_paragraphs:2:client name')).toBeNull();
    expect(parseProbe('within_first_paragraphs:2')).toBeNull();
    // No nesting of the same operator.
    expect(parseProbe('within_first_paragraphs:2:within_first_paragraphs:1:has_number')).toBeNull();
  });

  it('strips stateful regex flags so the same probe scores the same item twice', () => {
    const probe = parseProbe('matches:/deadline/gi');
    expect(probe).toEqual({ kind: 'matches', source: 'deadline', flags: 'i' });
    const body = 'The deadline moved.';
    expect(applyProbe('matches:/deadline/gi', body)).toBe(true);
    expect(applyProbe('matches:/deadline/gi', body)).toBe(true);
  });
});

describe('applyProbe', () => {
  const body = [
    'Northwind asked for the revised plan on Tuesday.',
    '',
    'We have 3 options and my recommendation is the second one.',
  ].join('\n');

  it('evaluates each shape against a real body', () => {
    expect(applyProbe('contains:northwind', body)).toBe(true);
    expect(applyProbe('contains:Acme', body)).toBe(false);
    expect(applyProbe('has_number', body)).toBe(true);
    expect(applyProbe('has_proper_noun', body)).toBe(true);
    expect(applyProbe('not:has_number', body)).toBe(false);
    expect(applyProbe('min_words:5', body)).toBe(true);
    expect(applyProbe('max_words:5', body)).toBe(false);
    expect(applyProbe('within_first_paragraphs:1:contains:Northwind', body)).toBe(true);
    expect(applyProbe('within_first_paragraphs:1:has_number', body)).toBe(false);
    expect(applyProbe('within_first_paragraphs:2:has_number', body)).toBe(true);
  });

  it('throws rather than scoring an unparseable observable false', () => {
    expect(() => applyProbe('opens with the decision', body)).toThrow(UnparseableObservableError);
    expect(tryApplyProbe('opens with the decision', body)).toBeNull();
  });

  it('reads single-newline prose as paragraphs so the window is not the whole piece', () => {
    const singleNewlines = 'First line with no digits.\nSecond line has 7 in it.';
    expect(paragraphsOf(singleNewlines)).toHaveLength(2);
    expect(applyProbe('within_first_paragraphs:1:has_number', singleNewlines)).toBe(false);
  });

  it('does not count a sentence-initial capital as a proper noun', () => {
    expect(hasProperNoun('The plan is sound and the timing works.')).toBe(false);
    expect(hasProperNoun('The plan for Northwind is sound.')).toBe(true);
    expect(hasProperNoun('ROI was the sticking point.')).toBe(true);
  });
});

// -- the discrimination test ------------------------------------------------

describe('discriminationFor', () => {
  it('counts fails per criterion, not the global grade split', () => {
    const { items, grades } = namedClientDeck(9, 11);
    const counts = discriminationFor(NAMES_A_CLIENT, items, grades);
    expect(counts.n_rejected).toBe(9);
    expect(counts.n_rejected_failing).toBe(9);
    expect(counts.n_accepted).toBe(11);
    expect(counts.n_accepted_failing).toBe(0);
    expect(counts.reject_fail_rate).toBe(1);
    expect(counts.accept_fail_rate).toBe(0);
    expect(counts.gap).toBe(1);
    expect(counts.applied).toBe(20);
  });

  it('excludes skips and bodyless items from both sides', () => {
    const items = [
      item('a', 'Northwind signed.'),
      item('b', 'Nothing named here.'),
      item('c', '   '),
      item('d', 'Also nothing named.'),
    ];
    const grades = [
      grade('a', 'send'),
      grade('b', 'would_not_send'),
      grade('c', 'would_not_send'),
      grade('d', 'skip'),
    ];
    const counts = discriminationFor(NAMES_A_CLIENT, items, grades);
    expect(counts.n_accepted).toBe(1);
    expect(counts.n_rejected).toBe(1);
    expect(counts.unscoreable).toBe(1);
    expect(counts.applied).toBe(2);
  });

  it('records the reason and zero counts when the observable is not checkable', () => {
    const { items, grades } = namedClientDeck(9, 11);
    const counts = discriminationFor(
      { id: 'vague', observable: 'a named client fact appearing before the third paragraph' },
      items,
      grades,
    );
    expect(counts.probe_parsed).toBe(false);
    expect(counts.unparsed_reason).toMatch(/not in the probe grammar/);
    expect(counts.applied).toBe(0);
    expect(counts.gap).toBe(0);
    expect(discriminationVerdict(counts)).toBe('untested');
  });

  it('reports the per-construct targeted unit beside the applied one (CH-03 tuning log)', () => {
    const items = [
      item('p1', 'Northwind signed.', ['k1']),
      item('p2', 'Nothing named here.', ['k1']),
      item('own1', 'Northwind again, my own note.', []),
      item('own2', 'Generic note.', []),
    ];
    const grades = [
      grade('p1', 'send'),
      grade('p2', 'would_not_send'),
      grade('own1', 'send'),
      grade('own2', 'would_not_send'),
    ];
    const counts = discriminationFor({ ...NAMES_A_CLIENT, constructId: 'k1' }, items, grades);
    expect(counts.n_accepted).toBe(2);
    expect(counts.n_rejected).toBe(2);
    expect(counts.targeted.n_accepted).toBe(1);
    expect(counts.targeted.n_rejected).toBe(1);
    expect(counts.targeted.n_rejected_failing).toBe(1);
  });
});

describe('discriminationVerdict', () => {
  function counts(over: Partial<ReturnType<typeof discriminationFor>>) {
    const base = discriminationFor(NAMES_A_CLIENT, [], []);
    return { ...base, probe_parsed: true, unparsed_reason: null, ...over };
  }

  it('is untested with fewer than four on either side, whatever the gap', () => {
    const thinRejects = counts({
      n_rejected: 3,
      n_rejected_failing: 3,
      n_accepted: 11,
      n_accepted_failing: 0,
      reject_fail_rate: 1,
      accept_fail_rate: 0,
      gap: 1,
    });
    expect(discriminationVerdict(thinRejects)).toBe('untested');
    expect(discriminationReason(thinRejects, 'untested')).toMatch(/4 of each is the floor/);

    const thinAccepts = counts({
      n_rejected: 12,
      n_rejected_failing: 12,
      n_accepted: 3,
      n_accepted_failing: 0,
      reject_fail_rate: 1,
      accept_fail_rate: 0,
      gap: 1,
    });
    expect(discriminationVerdict(thinAccepts)).toBe('untested');
  });

  it('keeps at exactly the 0.30 boundary and deletes just below it', () => {
    const atBoundary = counts({
      n_rejected: 10,
      n_rejected_failing: 8,
      n_accepted: 10,
      n_accepted_failing: 5,
      reject_fail_rate: 0.8,
      accept_fail_rate: 0.5,
      gap: 0.3,
    });
    expect(DISC_GAP_MIN).toBe(0.3);
    expect(atBoundary.gap).toBe(DISC_GAP_MIN);
    expect(discriminationVerdict(atBoundary)).toBe('keep');

    const justBelow = counts({
      n_rejected: 10,
      n_rejected_failing: 8,
      n_accepted: 10,
      n_accepted_failing: 6,
      reject_fail_rate: 0.8,
      accept_fail_rate: 0.6,
      gap: 0.2,
    });
    expect(discriminationVerdict(justBelow)).toBe('delete');
  });

  it('computes the 0.30 boundary from real counts without a float artefact', () => {
    // 0.5 - 0.2 is 0.30000000000000004 in IEEE 754. Rounding is what makes the
    // boundary a boundary rather than a coin flip on representation.
    const items: DiscTrainingItem[] = [];
    const grades: DiscGrade[] = [];
    // 10 rejected, 5 of them missing the client name.
    for (let i = 0; i < 10; i++) {
      const named = i >= 5;
      items.push(item(`r${i}`, named ? 'Northwind update.' : 'Generic update.'));
      grades.push(grade(`r${i}`, 'would_not_send'));
    }
    // 10 accepted, 2 of them missing it.
    for (let i = 0; i < 10; i++) {
      const named = i >= 2;
      items.push(item(`a${i}`, named ? 'Northwind update.' : 'Generic update.'));
      grades.push(grade(`a${i}`, 'send'));
    }
    const c = discriminationFor(NAMES_A_CLIENT, items, grades);
    expect(c.reject_fail_rate).toBe(0.5);
    expect(c.accept_fail_rate).toBe(0.2);
    expect(c.gap).toBe(0.3);
    expect(c.gap < DISC_GAP_MIN).toBe(false);
    // Gap is at the floor and rejected work fails it exactly REJECT_FAIL_MIN of
    // the time, so it keeps by a hair. One fewer reject failing and it does not.
    expect(REJECT_FAIL_MIN).toBe(0.5);
    expect(discriminationVerdict(c)).toBe('keep');
  });

  it('deletes a criterion that a bad piece of work also passes', () => {
    // Every item is long prose; "min_words:5" holds on all of them, so rejected
    // and accepted work fail it at identical rates. This is the criterion the
    // whole test exists to remove.
    const items: DiscTrainingItem[] = [];
    const grades: DiscGrade[] = [];
    for (let i = 0; i < 8; i++) {
      items.push(item(`r${i}`, 'A competent paragraph of perfectly reasonable prose.'));
      grades.push(grade(`r${i}`, 'would_not_send'));
      items.push(item(`a${i}`, 'Another competent paragraph of perfectly reasonable prose.'));
      grades.push(grade(`a${i}`, 'send'));
    }
    const c = discriminationFor({ id: 'is-prose', observable: 'min_words:5' }, items, grades);
    expect(c.reject_fail_rate).toBe(0);
    expect(c.accept_fail_rate).toBe(0);
    expect(c.gap).toBe(0);
    expect(discriminationVerdict(c)).toBe('delete');
    expect(discriminationReason(c, 'delete')).toMatch(/does not separate/);
  });

  it('is untested when it separates but rejected work rarely fails it', () => {
    const weak = counts({
      n_rejected: 10,
      n_rejected_failing: 4,
      n_accepted: 10,
      n_accepted_failing: 0,
      reject_fail_rate: 0.4,
      accept_fail_rate: 0,
      gap: 0.4,
    });
    expect(discriminationVerdict(weak)).toBe('untested');
    expect(discriminationReason(weak, 'untested')).toMatch(/not carrying the standard/);
  });
});

// -- clustering on the application vector -----------------------------------

describe('clusterByApplication', () => {
  const items = [
    item('i1', 'Northwind signed the 3 year deal.'),
    item('i2', 'Generic note with no names and no numbers.'),
    item('i3', 'Northwind moved the 2 milestones.'),
    item('i4', 'Another generic note.'),
    item('i5', 'Northwind asked about the 4 workstreams.'),
  ];

  it('merges two criteria whose probes land identically on the same items', () => {
    const out = clusterByApplication(
      [
        { id: 'names-client', observable: 'contains:Northwind' },
        { id: 'is-specific', observable: 'has_number' },
      ],
      items,
    );
    // Both hold on i1, i3, i5 and fail on i2, i4: identical vectors.
    expect(applicationVector({ id: 'a', observable: 'contains:Northwind' }, items))
      .toEqual(applicationVector({ id: 'b', observable: 'has_number' }, items));
    expect(out.merges).toHaveLength(1);
    expect(out.merges[0]).toMatchObject({ kept: 'names-client', merged: 'is-specific', agreement: 1 });
    expect(out.clusters).toHaveLength(1);
    expect(out.clusters[0].members).toEqual(['names-client', 'is-specific']);
  });

  it('does not merge orthogonal criteria', () => {
    const out = clusterByApplication(
      [
        { id: 'names-client', observable: 'contains:Northwind' },
        { id: 'not-named', observable: 'not:contains:Northwind' },
      ],
      items,
    );
    expect(out.merges).toHaveLength(0);
    expect(out.clusters).toHaveLength(2);
    expect(out.reason).toMatch(/No two criteria agreed/);
    expect(out.agreement.matrix[0][1]).toBe(0);
  });

  it('returns a symmetric matrix with a 1.0 diagonal', () => {
    const out = clusterByApplication(
      [
        { id: 'a', observable: 'contains:Northwind' },
        { id: 'b', observable: 'not:contains:Northwind' },
        { id: 'c', observable: 'min_words:4' },
      ],
      items,
    );
    const { ids, matrix, n } = out.agreement;
    expect(ids).toEqual(['a', 'b', 'c']);
    expect(n).toBe(items.length);
    for (let i = 0; i < ids.length; i++) {
      expect(matrix[i][i]).toBe(1);
      for (let j = 0; j < ids.length; j++) {
        expect(matrix[i][j]).toBe(matrix[j][i]);
        expect(matrix[i][j]).toBeGreaterThanOrEqual(0);
        expect(matrix[i][j]).toBeLessThanOrEqual(1);
      }
    }
    expect(medianOffDiagonal(out.agreement)).not.toBeNull();
  });

  it('never merges a criterion with no checkable observable, and says why', () => {
    const out = clusterByApplication(
      [
        { id: 'checkable', observable: 'contains:Northwind' },
        { id: 'prose', observable: 'opens with the decision' },
      ],
      items,
    );
    expect(out.merges).toHaveLength(0);
    expect(out.unclusterable).toEqual([
      { id: 'prose', reason: expect.stringMatching(/not in the probe grammar/) },
    ]);
    // The partition is still complete: nothing silently disappears.
    expect(out.clusters.map((c) => c.id).sort()).toEqual(['checkable', 'prose']);
    expect(out.reason).toMatch(/Only 1 criterion had a checkable observable/);
  });

  it('says why when there is nothing to compare against', () => {
    const out = clusterByApplication([{ id: 'a', observable: 'has_number' }], []);
    expect(out.merges).toHaveLength(0);
    expect(out.agreement.matrix).toEqual([]);
    expect(out.reason).toMatch(/No training item had a body/);
  });

  it('honours the stated threshold', () => {
    expect(CLUSTER_AGREEMENT_MIN).toBe(0.8);
    // 4 of 5 positions agree: 0.8, exactly at the line.
    const nearlyIdentical = [
      { id: 'a', observable: 'contains:Northwind' },
      { id: 'b', observable: 'matches:/Northwind|milestones/' },
    ];
    const out = clusterByApplication(nearlyIdentical, items);
    expect(out.agreement.matrix[0][1]).toBe(1);
    expect(out.merges).toHaveLength(1);

    const stricter = clusterByApplication(nearlyIdentical, items, 1.01);
    expect(stricter.merges).toHaveLength(0);
  });
});

// -- triage -----------------------------------------------------------------

describe('triageFromSelfAgreement', () => {
  it('routes 3 of 3 to the harness product', () => {
    const out = triageFromSelfAgreement({ matched: 3, total: 3 });
    expect(out.triage).toBe('harness');
    expect(out.measured).toBe(true);
    expect(out.reason).toBe(TRIAGE_REASONS.harness);
  });

  it('refuses to compile a rubric at 0 or 1 of 3', () => {
    expect(triageFromSelfAgreement({ matched: 0, total: 3 }).triage).toBe('template_and_voice');
    expect(triageFromSelfAgreement({ matched: 1, total: 3 }).triage).toBe('template_and_voice');
    expect(triageFromSelfAgreement({ matched: 1, total: 3 }).reason)
      .toBe(TRIAGE_REASONS.template_and_voice);
  });

  it('is provisional in between', () => {
    expect(triageFromSelfAgreement({ matched: 2, total: 3 }).triage).toBe('provisional');
    expect(triageFromSelfAgreement({ matched: 3, total: 4 }).triage).toBe('provisional');
  });

  it('is provisional and says so when there were too few repeats to measure', () => {
    const out = triageFromSelfAgreement({ matched: 0, total: 0 });
    expect(out.triage).toBe('provisional');
    expect(out.measured).toBe(false);
    expect(out.reason).toMatch(/not enough repeat screens/);
    expect(triageFromSelfAgreement({ matched: 0, total: 2 }).measured).toBe(false);
  });
});

// -- the label --------------------------------------------------------------

describe('baselineLabel', () => {
  it('is draft when nothing has been measured', () => {
    expect(baselineLabel({ heldOutGraded: 10, precision: null, recall: null })).toBe('draft');
    expect(baselineLabel({ heldOutGraded: 0, precision: 0.9, recall: 0.9 })).toBe('draft');
  });

  it('cannot be verified below ten graded held-out items', () => {
    expect(baselineLabel({ heldOutGraded: 9, precision: 1, recall: 1 })).toBe('provisional');
    expect(baselineLabel({ heldOutGraded: 10, precision: 1, recall: 1 })).toBe('verified');
  });

  it('is draft below the release floor', () => {
    expect(baselineLabel({ heldOutGraded: 10, precision: 0.55, recall: 0.9 })).toBe('draft');
    expect(baselineLabel({ heldOutGraded: 10, precision: 0.6, recall: 0.9 })).toBe('provisional');
  });

  it('lets triage cap what a measurement is allowed to claim', () => {
    expect(labelCeilingForTriage('template_and_voice')).toBe('draft');
    expect(labelCeilingForTriage('provisional')).toBe('provisional');
    expect(labelCeilingForTriage('harness')).toBe('verified');
    expect(weakerLabel('verified', 'provisional')).toBe('provisional');
    expect(weakerLabel('draft', 'verified')).toBe('draft');
  });
});

describe('weight load order', () => {
  it('is essential, pitfall, important, optional', () => {
    expect(WEIGHT_LOAD_ORDER).toEqual(['essential', 'pitfall', 'important', 'optional']);
    const sorted = [
      { weight: 'optional' as const },
      { weight: 'pitfall' as const },
      { weight: 'essential' as const },
      { weight: 'important' as const },
    ].sort(byWeightLoadOrder);
    expect(sorted.map((c) => c.weight)).toEqual(['essential', 'pitfall', 'important', 'optional']);
  });
});
