import { describe, expect, it } from 'vitest';
import {
  AWAITING,
  AWAITING_FILL,
  discriminationLine,
  renderStandardMarkdown,
  standardArtifactName,
  STANDARD_FILENAME,
  type AwaitingConstruct,
  type RenderCriterion,
  type StandardProfile,
} from './standard-render';
import { metricsFrom } from './confusion';

/**
 * The behaviour under test is the one that would have prevented the
 * james-harrabin file: a section with no evidence says AWAITING and says what
 * would fill it, rather than filling itself with something plausible.
 *
 * Plausible is the failure mode. A wrong line that reads well survives review;
 * an AWAITING does not, and someone fixes it.
 */

const EM_DASH = String.fromCharCode(0x2014);

const EMPTY_PROFILE: StandardProfile = { surface: 'client updates' };

function keptCriterion(over: Partial<RenderCriterion> = {}): RenderCriterion {
  return {
    name: 'Earned claim',
    check_text: 'A named client fact appears before the third paragraph.',
    observable: 'within_first_paragraphs:3:has_proper_noun',
    weight: 'essential',
    emergent_pole: 'it has actually seen the client',
    contrast_pole: 'it could be for anyone',
    rationale: "if they can tell we wrote it before we met them, the rest of it doesn't matter",
    disc_verdict: 'keep',
    n_rejected: 9,
    n_rejected_failing: 7,
    n_accepted: 11,
    n_accepted_failing: 1,
    gap: 0.69,
    provenance: { session: 'sort 2026-08-05', items: [3, 11, 19] },
    ...over,
  };
}

describe('discriminationLine', () => {
  it('prints the spec shape, including the singular verb at a count of one', () => {
    expect(discriminationLine(keptCriterion())).toBe(
      '7 of 9 rejected fail this (0.78). 1 of 11 accepted fails it (0.09). Gap 0.69. KEEP.',
    );
  });

  it('prints "not tested" rather than a fabricated number when counts are missing', () => {
    const line = discriminationLine(
      keptCriterion({
        disc_verdict: 'untested',
        n_rejected: null,
        n_rejected_failing: null,
        n_accepted: null,
        n_accepted_failing: null,
        gap: null,
        disc_reason: 'No observable was produced for this construct.',
      }),
    );
    expect(line).toMatch(/^not tested\./);
    expect(line).toContain('No observable was produced');
    expect(line).not.toMatch(/\d+\.\d\d/);
  });

  it('never divides by a zero denominator', () => {
    const line = discriminationLine(
      keptCriterion({
        n_rejected: 0,
        n_rejected_failing: 0,
        n_accepted: 0,
        n_accepted_failing: 0,
        disc_reason: 'Nothing carried this check.',
      }),
    );
    expect(line).toMatch(/^not tested\./);
    expect(line).not.toContain('NaN');
  });
});

describe('renderStandardMarkdown', () => {
  it('renders AWAITING plus a fill line for every empty section', () => {
    const md = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
    });

    for (const heading of [
      '## 1. Owns',
      '## 2. Recurring work',
      '## 3. Domain expertise, evidenced and not claimed',
      '## 4. Artefacts',
      '## 5. Constructs',
      '## 6. Hard constraints',
      '## 7. Audience and purpose per output type',
      '## 8. Witnessed failure modes',
      '## 9. Surface tone preference',
    ]) {
      expect(md).toContain(heading);
    }

    // Every one of the nine is AWAITING, and every one says what would fill it.
    for (const key of [
      'owns',
      'recurring_work',
      'domains',
      'artefacts',
      'constructs',
      'hard_constraints',
      'audiences',
      'failure_modes',
      'tone',
    ]) {
      expect(md).toContain(AWAITING_FILL[key]);
    }

    // Nine sections plus the constructs AWAITING heading plus baseline and open
    // items: the word appears many times and none of them is a guess.
    expect(md.split(AWAITING).length - 1).toBeGreaterThanOrEqual(9);
  });

  it('never invents content for a section it has no evidence for', () => {
    const md = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
    });
    // No trait model, no adjective tone, no inferred rule anywhere.
    expect(md).not.toMatch(/MBTI|DISC|Big Five|learning style/i);
    expect(md).not.toMatch(/clear and professional/i);
    // The tone section carries its honesty label rather than a description.
    expect(md).toContain('Cosmetic, self-declared, and yours to edit.');
  });

  it('carries front matter with the person as owner and an honest review interval', () => {
    const md = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: {
        surface: 'client updates',
        owner: 'Krish Raja',
        last_reviewed: '2026-08-05',
        provenance: 'sort session 2026-08-05, 30 graded items',
        version: 2,
      },
      label: 'draft',
    });
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain('version: 2');
    expect(md).toContain('last_reviewed: 2026-08-05');
    expect(md).toContain('review_interval: 90 days');
    expect(md).toContain('owner: Krish Raja');
    expect(md).toContain('provenance: sort session 2026-08-05, 30 graded items');
    expect(md).toContain('# Krish Raja: the standard');
  });

  it('marks a missing owner and a missing provenance AWAITING rather than guessing', () => {
    const md = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
    });
    expect(md).toContain(`owner: ${AWAITING} (no name on file)`);
    expect(md).toContain(`provenance: ${AWAITING}`);
  });

  it('renders a kept criterion with its poles, observable, discrimination and provenance', () => {
    const md = renderStandardMarkdown({
      criteria: [keptCriterion()],
      constructs: [],
      profile: { ...EMPTY_PROFILE, owner: 'Krish Raja' },
      label: 'provisional',
    });
    expect(md).toContain('### C1. Earned claim');
    expect(md).toContain('- Emergent pole (your words): "it has actually seen the client"');
    expect(md).toContain('- Contrast pole (your words): "it could be for anyone"');
    expect(md).toContain('- Observable: within_first_paragraphs:3:has_proper_noun');
    expect(md).toContain(
      '- Discrimination: 7 of 9 rejected fail this (0.78). 1 of 11 accepted fails it (0.09). Gap 0.69. KEEP.',
    );
    expect(md).toContain('- Provenance: sort 2026-08-05, items 3, 11, 19');
  });

  it('loads criteria essential, pitfall, important, optional', () => {
    const md = renderStandardMarkdown({
      criteria: [
        keptCriterion({ name: 'Optional one', weight: 'optional' }),
        keptCriterion({ name: 'Important one', weight: 'important' }),
        keptCriterion({ name: 'Pitfall one', weight: 'pitfall' }),
        keptCriterion({ name: 'Essential one', weight: 'essential' }),
      ],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'provisional',
    });
    const order = ['Essential one', 'Pitfall one', 'Important one', 'Optional one']
      .map((name) => md.indexOf(name));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(md).toContain('### C1. Essential one');
    expect(md).toContain('### C4. Optional one');
  });

  it('flags a criterion that cannot name where it came from', () => {
    const md = renderStandardMarkdown({
      criteria: [keptCriterion({ provenance: {} })],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
    });
    expect(md).toContain('it did not come from you');
  });

  it('puts untested constructs in the profile with their counts, not in the rubric', () => {
    const untested: AwaitingConstruct = {
      name: 'Opens with the decision',
      emergent_pole: 'I want to know the answer in the first line',
      observable: null,
      disc_verdict: 'untested',
      counts: {
        n_rejected: 2,
        n_rejected_failing: 2,
        n_accepted: 1,
        n_accepted_failing: 0,
        gap: 1,
      },
      reason: 'Only 2 rejected and 1 accepted items carried this check.',
    };
    const md = renderStandardMarkdown({
      criteria: [],
      constructs: [untested],
      profile: EMPTY_PROFILE,
      label: 'draft',
    });
    expect(md).toContain(`### ${AWAITING}: constructs that did not become criteria`);
    expect(md).toContain('**Opens with the decision** (untested)');
    expect(md).toContain('Counts: 2 of 2 rejected fail it, 0 of 1 accepted fail it.');
    expect(md).toContain('Observable: none that a machine can check');
    // It is NOT rendered as a criterion.
    expect(md).not.toContain('### C1.');
  });

  it('reports a baseline of none rather than a number computed from training items', () => {
    const md = renderStandardMarkdown({
      criteria: [keptCriterion()],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
      numbers: { held_out_graded: 10, precision: null, recall: null },
    });
    expect(md).toContain('Baseline: none yet. 10 held-out items are graded');
    expect(md).not.toMatch(/Precision \d/);
  });

  it('reports a measured baseline when one exists, with self-agreement beside it', () => {
    const md = renderStandardMarkdown({
      criteria: [keptCriterion()],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'verified',
      numbers: {
        held_out_graded: 10,
        precision: 0.8,
        recall: 0.8,
        tnr: 0.9,
        measured_at: '2026-08-05',
        self_agreement: { matched: 3, total: 3 },
        pair_split: { split: 8, total: 10, rate: 0.8 },
      },
    });
    expect(md).toContain('Baseline: 10 held-out items. Precision 0.80, recall 0.80, TNR 0.90 as of 2026-08-05.');
    expect(md).toContain('you graded 3 of 3 repeated pieces the same way');
    expect(md).toContain('Pair split: 8 of 10 matched pairs separated');
    expect(md).toContain('Label: Verified.');
  });

  it('leads the baseline with the counts in plain words when a measurement exists', () => {
    const md = renderStandardMarkdown({
      criteria: [keptCriterion()],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'verified',
      numbers: {
        held_out_graded: 12,
        measured_at: '2026-08-05',
        self_agreement: { matched: 3, total: 3 },
        measurement: metricsFrom({
          tp: 4,
          fp: 1,
          fn: 1,
          tn: 6,
          excluded: { skipped: 1, insufficient: 1, total: 2 },
        }),
      },
    });
    expect(md).toContain('Of the things you would not have sent, it caught 4 of 5.');
    expect(md).toContain('It also flagged 1 you would have sent.');
    expect(md).toContain('2 pieces are not in those numbers: 1 you skipped');
    // The three numbers still ship, separately, as the summary line.
    expect(md).toContain('Baseline: 12 held-out items, 12 of them scored. Precision 0.80, recall 0.80, TNR 0.86');
    expect(md).not.toContain('%');
  });

  it('CH-03: a run that flagged nothing renders baseline none, never a figure', () => {
    // Zero criteria loaded. The check holds on everything, so TP and FP are both
    // zero and precision is 0/0. TNR in that run is a perfect 1.00 and printing
    // it would be the most flattering possible lie.
    const md = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
      numbers: {
        held_out_graded: 10,
        measurement: metricsFrom({
          tp: 0,
          fp: 0,
          fn: 4,
          tn: 6,
          excluded: { skipped: 0, insufficient: 0, total: 0 },
        }),
        release_reason: 'A check that never fires has not been shown to do anything.',
      },
    });
    expect(md).toContain('Baseline: none. The check ran on 10 held-out items and flagged none of them');
    expect(md).not.toMatch(/Precision \d/);
    expect(md).not.toMatch(/TNR \d/);
    expect(md).not.toMatch(/\bNaN\b/);
    expect(md).toContain('A check that never fires has not been shown to do anything.');
  });

  it('says self-agreement is AWAITING when no repeat was graded', () => {
    const md = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
      numbers: { held_out_graded: 0, self_agreement: { matched: 0, total: 0 } },
    });
    expect(md).toContain(`Self-agreement: ${AWAITING}`);
    expect(md).toContain('Baseline: none. No held-out set was graded');
  });

  it('omits the tenth section entirely rather than promising one it has no evidence for', () => {
    const withoutPriors = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
    });
    expect(withoutPriors).not.toContain('## 10. Correct priors');

    const withPriors = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: {
        ...EMPTY_PROFILE,
        correct_priors: [
          {
            model_default: 'The model will default to producing documents and write-ups.',
            needs_instead: 'No deck and no detailed notes for progress on this engagement.',
            quote: "We're very uncorporate as a client, so we don't want a deck",
            date: '5 June',
          },
        ],
      },
      label: 'draft',
    });
    expect(withPriors).toContain('## 10. Correct priors');
    expect(withPriors).toContain("We're very uncorporate as a client");
  });

  it('keeps a situated statement situated', () => {
    const md = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: {
        ...EMPTY_PROFILE,
        hard_constraints: [
          {
            text: 'No written progress reports on this engagement',
            quote: "we don't want a deck or any detailed notes of what you've done",
            source_label: 'Scope call',
            occurred_at: '2026-06-05',
            situation: 'about how the consultant reports progress on this engagement',
          },
        ],
      },
      label: 'draft',
    });
    expect(md).toContain('Situation: about how the consultant reports progress on this engagement');
  });

  it('writes no em dashes, in any branch', () => {
    const full = renderStandardMarkdown({
      criteria: [keptCriterion()],
      constructs: [
        {
          name: 'Something untested',
          disc_verdict: 'untested',
          observable: null,
          reason: 'Not enough graded items.',
          counts: null,
        },
      ],
      profile: {
        surface: 'client updates',
        owner: 'Krish Raja',
        owns: [{ text: 'The client relationship' }],
        recurring_work: [{ text: 'A weekly client update' }],
        domains: [{ domain: 'Claude', level: 'expert', evidence: 'built a briefing unprompted', consequence: 'do not scaffold' }],
        artefacts: [{ signed_off: 'a', rejected: 'b', difference_in_their_words: 'c' }],
        hard_constraints: [{ text: 'no decks' }],
        audiences: [{ output_type: 'update', audience: 'the client', job: 'show movement' }],
        failure_modes: [{ text: 'sent before the numbers were checked' }],
        tone: 'plain, short sentences',
        correct_priors: [{ model_default: 'a', needs_instead: 'b' }],
        open_items: [{ text: 'two more artefacts' }],
      },
      label: 'verified',
      numbers: {
        held_out_graded: 10,
        precision: 0.8,
        recall: 0.8,
        self_agreement: { matched: 3, total: 3 },
        triage_reason: 'You graded the same piece the same way every time.',
      },
    });
    const empty = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
    });
    expect(full).not.toContain(EM_DASH);
    expect(empty).not.toContain(EM_DASH);
  });

  it('ends with exactly one trailing newline and no runs of blank lines', () => {
    const md = renderStandardMarkdown({
      criteria: [],
      constructs: [],
      profile: EMPTY_PROFILE,
      label: 'draft',
    });
    expect(md.endsWith('\n')).toBe(true);
    expect(md.endsWith('\n\n')).toBe(false);
    expect(md).not.toContain('\n\n\n');
  });
});

describe('naming', () => {
  it('uses one filename and one artifact name', () => {
    expect(STANDARD_FILENAME).toBe('my-standard.md');
    expect(standardArtifactName('client updates')).toBe('My standard: client updates');
    expect(standardArtifactName('')).toBe('My standard');
  });
});
