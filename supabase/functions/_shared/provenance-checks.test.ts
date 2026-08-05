import { describe, it, expect } from 'vitest';
import {
  extractImperativeClaims,
  findPointer,
  findAllPointers,
  maskQuotedSpans,
  parseUnpointedImperatives,
  runProvenanceChecks,
} from './provenance-checks';

/**
 * Phase 1 baseline instrument. These pin the behaviours the later phases
 * depend on:
 *   - an imperative with no pointer is counted, and the count is readable
 *   - a pointer to nothing fails, but only when there are ids to check against
 *   - a standing rule resting on situated evidence fails
 *   - a missing id set produces an honest skip, never a fake pass
 *   - no check ever reads inside a masked evidence quote (CH-16)
 */

function check(body: string, opts = {}, id: string) {
  const found = runProvenanceChecks(body, opts).find((c) => c.id === id);
  if (!found) throw new Error(`missing check ${id}`);
  return found;
}

describe('extractImperativeClaims', () => {
  it('picks up command verbs and command words', () => {
    const body = [
      'Use the client brief before drafting.',
      'The report went out on Tuesday.',
      'You MUST confirm the number with finance.',
      'Avoid stock phrasing.',
    ].join('\n');
    const claims = extractImperativeClaims(body);
    expect(claims.map((c) => c.line)).toEqual([1, 3, 4]);
  });

  it('skips markdown headings', () => {
    const claims = extractImperativeClaims('## Never do this\n\nKeep it short.');
    expect(claims).toHaveLength(1);
    expect(claims[0].text).toBe('Keep it short.');
  });

  it('skips NOT ESTABLISHED lines, list-marked or not', () => {
    const body = [
      'NOT ESTABLISHED: never produce a deck.',
      '- NOT ESTABLISHED: always lead with the number.',
      '- Always lead with the decision [E12]',
    ].join('\n');
    const claims = extractImperativeClaims(body);
    expect(claims).toHaveLength(1);
    expect(claims[0].line).toBe(3);
  });

  it('keeps a trailing pointer attached to the sentence it cites', () => {
    const claims = extractImperativeClaims('Keep the summary to one page. [C3]');
    expect(claims).toHaveLength(1);
    expect(findPointer(claims[0].text)).toEqual({ kind: 'criterion', id: '3' });
  });

  it('strips list markers so the first word is the verb', () => {
    const claims = extractImperativeClaims('1. Send the draft before noon.\n- Write in plain words.');
    expect(claims).toHaveLength(2);
  });
});

describe('findPointer', () => {
  it('reads a trailing criterion pointer', () => {
    expect(findPointer('Lead with the decision [C12]')).toEqual({ kind: 'criterion', id: '12' });
  });

  it('reads a trailing evidence pointer with a uuid fragment', () => {
    expect(findPointer('Lead with the decision [E7f2a1]')).toEqual({ kind: 'evidence', id: '7f2a1' });
  });

  it('tolerates punctuation after the pointer', () => {
    expect(findPointer('Lead with the decision [C3].')).toEqual({ kind: 'criterion', id: '3' });
  });

  it('accepts hyphenated ids', () => {
    expect(findPointer('Do the thing [E7f2a1-4b]')).toEqual({ kind: 'evidence', id: '7f2a1-4b' });
  });

  it('returns null when the pointer is not trailing', () => {
    expect(findPointer('Per [C3] the summary must be short, so keep it short')).toBeNull();
  });

  it('returns null when there is no pointer', () => {
    expect(findPointer('Keep it short.')).toBeNull();
  });

  it('finds every pointer in a passage', () => {
    expect(findAllPointers('Do X [C3] and Y [E9a1]')).toEqual([
      { kind: 'criterion', id: '3' },
      { kind: 'evidence', id: '9a1' },
    ]);
  });
});

describe('maskQuotedSpans', () => {
  const quote = 'we never want a deck for this engagement';

  it('blanks the quote to same-length spaces and keeps line count', () => {
    const body = `Line one.\nHe said: ${quote}\nLine three.`;
    const masked = maskQuotedSpans(body, [quote]);
    expect(masked).toHaveLength(body.length);
    expect(masked.split('\n')).toHaveLength(3);
    expect(masked).not.toContain('never');
    expect(masked).toContain('Line three.');
  });

  it('stops a quote containing "never" from tripping the imperative extractor', () => {
    const body = `Their own words: ${quote}`;
    expect(extractImperativeClaims(body)).toHaveLength(1);
    expect(extractImperativeClaims(maskQuotedSpans(body, [quote]))).toHaveLength(0);
  });

  it('masks every occurrence, not just the first', () => {
    const masked = maskQuotedSpans(`${quote}\nfiller\n${quote}`, [quote]);
    expect(masked).not.toContain('deck');
  });

  it('ignores a quote that is not an exact substring', () => {
    const body = `He said we never want a deck for this ENGAGEMENT`;
    expect(maskQuotedSpans(body, [quote])).toBe(body);
  });

  it('masks a fenced block whose info string labels it as evidence', () => {
    const body = ['```evidence', 'Never send a deck.', '```', 'Keep it short.'].join('\n');
    const masked = maskQuotedSpans(body, []);
    expect(masked).not.toContain('Never send a deck.');
    expect(masked).toContain('Keep it short.');
    expect(extractImperativeClaims(masked)).toHaveLength(1);
  });

  it('masks a fenced block whose first line labels it as the target voice register', () => {
    const body = ['```', 'Target voice register:', 'Always open with the number.', '```', 'Keep it short.'].join('\n');
    const masked = maskQuotedSpans(body, []);
    expect(masked).not.toContain('Always open with the number.');
    expect(extractImperativeClaims(masked)).toHaveLength(1);
  });

  it('leaves an unlabelled code fence alone', () => {
    const body = ['```bash', 'npm run build', '```'].join('\n');
    expect(maskQuotedSpans(body, [])).toBe(body);
  });

  it('skips quotes too short to mask safely', () => {
    const body = 'Always add a note.';
    expect(maskQuotedSpans(body, ['a'])).toBe(body);
  });
});

describe('prov.everyRuleCited', () => {
  it('fires on an unpointed imperative and reports the count', () => {
    const body = 'Keep the summary to one page.\nAlways confirm the number [E9a1].';
    const result = check(body, {}, 'prov.everyRuleCited');
    expect(result.passed).toBe(false);
    expect(parseUnpointedImperatives(result.detail)).toBe(1);
  });

  it('passes when every imperative carries a pointer', () => {
    const body = 'Keep the summary to one page [C3].\nAlways confirm the number [E9a1].';
    const result = check(body, {}, 'prov.everyRuleCited');
    expect(result.passed).toBe(true);
    expect(parseUnpointedImperatives(result.detail)).toBe(0);
  });

  it('does not count a NOT ESTABLISHED passage as unpointed', () => {
    const body = 'NOT ESTABLISHED: never produce a deck.';
    const result = check(body, {}, 'prov.everyRuleCited');
    expect(result.passed).toBe(true);
    expect(parseUnpointedImperatives(result.detail)).toBe(0);
  });

  it('never counts an imperative that only exists inside a quoted span', () => {
    const quote = 'we never want a deck for this engagement';
    const body = `Their own words: ${quote}\nKeep the summary to one page.`;
    const result = check(body, { evidenceQuotes: [quote] }, 'prov.everyRuleCited');
    expect(parseUnpointedImperatives(result.detail)).toBe(1);
  });
});

describe('prov.pointerResolves', () => {
  const body = 'Keep the summary to one page [C3].\nAlways confirm the number [E9a1].';

  it('skips honestly when no ids are supplied', () => {
    const result = check(body, {}, 'prov.pointerResolves');
    expect(result.passed).toBe(true);
    expect(result.detail).toBe('pointer resolution not checked this pass (no ids supplied)');
  });

  it('passes when every pointer is in the known sets', () => {
    const result = check(
      body,
      { knownCriterionIds: ['3'], knownEvidenceIds: ['9a1'] },
      'prov.pointerResolves',
    );
    expect(result.passed).toBe(true);
  });

  it('resolves a uuid fragment against the full id', () => {
    const result = check(
      'Always confirm the number [E7f2a].',
      { knownEvidenceIds: ['7f2a1b4c-0000-4000-8000-000000000000'] },
      'prov.pointerResolves',
    );
    expect(result.passed).toBe(true);
  });

  it('fails when a pointer resolves to nothing', () => {
    const result = check(
      body,
      { knownCriterionIds: ['3'], knownEvidenceIds: ['other'] },
      'prov.pointerResolves',
    );
    expect(result.passed).toBe(false);
    expect(result.detail).toContain('[E9a1]');
  });

  it('checks only the kinds it was given ids for', () => {
    const result = check(body, { knownCriterionIds: ['3'] }, 'prov.pointerResolves');
    expect(result.passed).toBe(true);
    expect(result.detail).toContain('not checked (no ids supplied)');
  });
});

describe('prov.noSituatedGeneralisation', () => {
  it('skips honestly when the situated set is absent', () => {
    const result = check('Never produce a deck [E12].', {}, 'prov.noSituatedGeneralisation');
    expect(result.passed).toBe(true);
    expect(result.detail).toBe('situated evidence not checked this pass (no ids supplied)');
  });

  it('fails a standing rule whose only pointer is situated evidence', () => {
    const result = check(
      'Never produce a deck [E12].',
      { situatedEvidenceIds: ['12'] },
      'prov.noSituatedGeneralisation',
    );
    expect(result.passed).toBe(false);
    expect(result.detail).toContain('situated evidence only');
  });

  it('passes the same rule once it names its situation', () => {
    const result = check(
      'For progress updates on this engagement, lead with the decision [E12].',
      { situatedEvidenceIds: ['12'] },
      'prov.noSituatedGeneralisation',
    );
    expect(result.passed).toBe(true);
  });

  it('passes when the rule also rests on a criterion', () => {
    const result = check(
      'Never produce a deck [E12] [C3].',
      { situatedEvidenceIds: ['12'] },
      'prov.noSituatedGeneralisation',
    );
    expect(result.passed).toBe(true);
  });

  it('leaves an unpointed rule to prov.everyRuleCited', () => {
    const result = check(
      'Never produce a deck.',
      { situatedEvidenceIds: ['12'] },
      'prov.noSituatedGeneralisation',
    );
    expect(result.passed).toBe(true);
  });
});

describe('runProvenanceChecks', () => {
  it('always returns the three checks in order', () => {
    expect(runProvenanceChecks('Keep it short.').map((c) => c.id)).toEqual([
      'prov.everyRuleCited',
      'prov.pointerResolves',
      'prov.noSituatedGeneralisation',
    ]);
  });

  it('handles an empty body without throwing', () => {
    const result = runProvenanceChecks('');
    expect(result).toHaveLength(3);
    expect(parseUnpointedImperatives(result[0].detail)).toBe(0);
  });
});
