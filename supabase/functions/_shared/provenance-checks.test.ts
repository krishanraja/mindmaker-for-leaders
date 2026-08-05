import { describe, it, expect } from 'vitest';
import {
  claimHash,
  collectClaims,
  collectNotEstablished,
  extractImperativeClaims,
  extractNotEstablished,
  findPointer,
  findAllPointers,
  formatScopeHeader,
  isScopeSatisfied,
  maskQuotedSpans,
  parseScopeHeader,
  parseUnpointedImperatives,
  pathMayDeclareScope,
  resolveClaim,
  resolvePointerId,
  runProvenanceChecks,
  runProvenanceChecksOverFiles,
  situatedGeneralisationOffenders,
  unpointedClaims,
  unresolvedPointerClaims,
} from './provenance-checks';
import { shortIdsFor, splitCitableSpans, spanVerifies } from './citable-spans';

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

// ---------------------------------------------------------------------------
// Phase 3b: the package-wide gate
// ---------------------------------------------------------------------------

describe('extractNotEstablished', () => {
  it('picks up the flagged gaps, list-marked or not', () => {
    const body = [
      'NOT ESTABLISHED: never produce a deck.',
      '- NOT ESTABLISHED: always lead with the number.',
      'Keep it short [C1].',
    ].join('\n');
    expect(extractNotEstablished(body).map((c) => c.line)).toEqual([1, 2]);
  });

  it('finds nothing in a body that flags nothing', () => {
    expect(extractNotEstablished('Keep it short [C1].')).toHaveLength(0);
  });
});

describe('claimHash', () => {
  it('is stable across whitespace and case, so pass 1 and pass 2 join up', () => {
    expect(claimHash('Lead with the decision [C1].')).toBe(
      claimHash('  lead   with the  decision [C1].  '),
    );
  });

  it('separates two different claims', () => {
    expect(claimHash('Lead with the decision [C1].')).not.toBe(claimHash('Keep it short [C1].'));
  });

  it('is 16 hex characters', () => {
    expect(claimHash('anything')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('collectClaims', () => {
  const files = [
    { path: 'rubric/core.md', content: '## Core\n\nLead with the decision [C1].\nKeep it short.' },
    { path: 'rubric/general.md', content: 'NOT ESTABLISHED: anything else.' },
  ];

  it('reports the file and the nearest heading for every claim', () => {
    const claims = collectClaims(files);
    expect(claims).toHaveLength(2);
    expect(claims[0].path).toBe('rubric/core.md');
    expect(claims[0].section).toBe('rubric/core.md#Core');
    expect(claims[0].pointer).toEqual({ kind: 'criterion', id: '1' });
    expect(claims[1].pointer).toBeNull();
  });

  it('collects the flagged gaps separately from the claims', () => {
    const gaps = collectNotEstablished(files);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].path).toBe('rubric/general.md');
  });

  it('never reads inside a quoted span, whatever file it is in', () => {
    const quote = 'we never want a deck for this engagement';
    const claims = collectClaims(
      [{ path: 'rubric/core.md', content: `Their words: ${quote}` }],
      [quote],
    );
    expect(claims).toHaveLength(0);
  });
});

describe('runProvenanceChecksOverFiles', () => {
  it('counts across every gated file, not only the first', () => {
    const result = runProvenanceChecksOverFiles([
      { path: 'rubric/core.md', content: 'Lead with the decision.' },
      { path: 'references/company-context.md', content: 'Never mention the pilot.' },
    ]);
    expect(parseUnpointedImperatives(result[0].detail)).toBe(2);
    expect(result[0].passed).toBe(false);
  });

  it('passes once every file points at something', () => {
    const result = runProvenanceChecksOverFiles(
      [
        { path: 'rubric/core.md', content: 'Lead with the decision [C1].' },
        { path: 'references/company-context.md', content: 'For this pilot, name the client [E7f2].' },
      ],
      { knownCriterionIds: ['1'], knownEvidenceIds: ['7f2'], situatedEvidenceIds: ['7f2'] },
    );
    expect(result.every((c) => c.passed)).toBe(true);
  });

  it('fails a standing rule that rests only on a situated span, even in a leaf', () => {
    const result = runProvenanceChecksOverFiles(
      [{ path: 'rubric/core.md', content: 'Never produce a deck [E7f2].' }],
      { knownEvidenceIds: ['7f2'], situatedEvidenceIds: ['7f2'] },
    );
    expect(result[2].passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Declared scope: the situated form, expressed once at the right altitude
// ---------------------------------------------------------------------------

describe('parseScopeHeader', () => {
  const header = [
    '# client updates',
    '',
    '**Applies to:** client updates on the pilot engagement',
    '**Scope source:** [E12], [Ef66a]',
    '',
    'Lead with what changed [E12].',
  ].join('\n');

  it('reads the applies-to line and the ids behind it', () => {
    expect(parseScopeHeader(header)).toEqual({
      appliesTo: 'client updates on the pilot engagement',
      scopeIds: ['12', 'f66a'],
    });
  });

  it('returns null for a file that declares nothing', () => {
    expect(parseScopeHeader('# core\n\nLead with the decision [C1].')).toBeNull();
    expect(parseScopeHeader('')).toBeNull();
  });

  it('returns null rather than crashing on a malformed header', () => {
    // An applies-to with nothing behind it is a coverage claim with no evidence,
    // which is the shape this module refuses everywhere else.
    expect(parseScopeHeader('**Applies to:** everything\n\nBody.')).toBeNull();
    expect(parseScopeHeader('**Applies to:**\n**Scope source:** [E12]')).toBeNull();
    expect(parseScopeHeader('**Scope source:** none of them')).toBeNull();
    expect(parseScopeHeader(undefined as unknown as string)).toBeNull();
  });

  it('ignores a declaration buried below the top of the file', () => {
    const buried = ['# leaf', '', 'a', 'b', 'c', 'd', 'e', 'f', 'g',
      '**Applies to:** everything', '**Scope source:** [E12]'].join('\n');
    expect(parseScopeHeader(buried)).toBeNull();
  });

  it('round trips what formatScopeHeader writes', () => {
    const scope = { appliesTo: 'the weekly note', scopeIds: ['7f2a'] };
    expect(parseScopeHeader(`# leaf\n\n${formatScopeHeader(scope).join('\n')}\n`)).toEqual(scope);
  });
});

describe('pathMayDeclareScope', () => {
  it('allows a surface leaf and nothing else', () => {
    expect(pathMayDeclareScope('rubric/client-updates.md')).toBe(true);
    // core is always-on and general is the fallback: neither is a situation.
    expect(pathMayDeclareScope('rubric/core.md')).toBe(false);
    expect(pathMayDeclareScope('rubric/general.md')).toBe(false);
    // The router carries no rules, and a reference file is written by the
    // generator, so honouring a header there would let it scope itself.
    expect(pathMayDeclareScope('SKILL.md')).toBe(false);
    expect(pathMayDeclareScope('references/company-context.md')).toBe(false);
    expect(pathMayDeclareScope('')).toBe(false);
  });
});

describe('prov.noSituatedGeneralisation with a declared scope', () => {
  const SCOPED_LEAF = [
    '# client updates',
    '',
    '**Applies to:** client updates on the pilot engagement',
    '**Scope source:** [E12]',
    '',
    'Lead with what changed and the impact of those changes [E12].',
  ].join('\n');

  const opts = { knownEvidenceIds: ['12', '9f0a'], situatedEvidenceIds: ['12', '9f0a'] };

  it('does not flag a rule whose situation the leaf already declares', () => {
    const checks = runProvenanceChecksOverFiles(
      [{ path: 'rubric/client-updates.md', content: SCOPED_LEAF }],
      opts,
    );
    expect(checks[2].passed).toBe(true);
    // and it is not silently lost from the count either
    expect(checks[0].passed).toBe(true);
  });

  it('still flags the same rule in core.md, which is the james-harrabin guard', () => {
    // "We do not want a deck" was said by ONE client about ONE engagement. In a
    // surface leaf that says so at the top it is a scoped rule. In the always-on
    // leaf it is a standing rule about everything the leader produces, and that
    // is the flattening this whole chain exists to catch. The boundary is the
    // point: core.md may never declare a scope, so the same sentence fails here.
    const checks = runProvenanceChecksOverFiles(
      [{ path: 'rubric/core.md', content: SCOPED_LEAF }],
      opts,
    );
    expect(checks[2].passed).toBe(false);
    expect(checks[2].detail).toContain('situated evidence only');
  });

  it('still flags a rule citing a situation the leaf does not cover', () => {
    // A different situated id: the board pack, smuggled into the client-update
    // leaf. The header covers [E12] and says nothing about [E9f0a].
    const smuggled = SCOPED_LEAF.replace(
      'Lead with what changed and the impact of those changes [E12].',
      'Give them the context, the numbers and the recommendation [E9f0a].',
    );
    const checks = runProvenanceChecksOverFiles(
      [{ path: 'rubric/client-updates.md', content: smuggled }],
      opts,
    );
    expect(checks[2].passed).toBe(false);
  });

  it('never reads the header itself as a rule', () => {
    // The situation string is the leader's world, not ours: it can contain
    // "never" or "must" and the header is still metadata, not a rule.
    const leaf = [
      '# client updates',
      '',
      '**Applies to:** updates where he never wants a deck',
      '**Scope source:** [E12]',
      '',
      'Lead with what changed [E12].',
    ].join('\n');
    const claims = collectClaims([{ path: 'rubric/client-updates.md', content: leaf }]);
    expect(claims).toHaveLength(1);
    expect(claims[0].text).toContain('Lead with what changed');
  });

  it('leaves a claim in an unscoped file behaving exactly as before', () => {
    const checks = runProvenanceChecksOverFiles(
      [{ path: 'rubric/core.md', content: 'Never produce a deck [E12].' }],
      opts,
    );
    expect(checks[2].passed).toBe(false);
  });
});

describe('isScopeSatisfied', () => {
  const [claim] = collectClaims([
    {
      path: 'rubric/client-updates.md',
      content: '# leaf\n\n**Applies to:** the pilot\n**Scope source:** [E12]\n\nLead with it [E12].',
    },
  ]);

  it('is true when the file covers every situated pointer on the claim', () => {
    expect(isScopeSatisfied(claim, claim.scope, ['12'])).toBe(true);
  });

  it('is false when the file declares no scope', () => {
    expect(isScopeSatisfied(claim, null, ['12'])).toBe(false);
  });

  it('is false when the claim cites a situation the scope does not name', () => {
    expect(isScopeSatisfied(claim, { appliesTo: 'the board pack', scopeIds: ['9f0a'] }, ['12']))
      .toBe(false);
  });
});

describe('the offender sets the retry is built from', () => {
  const files = [
    { path: 'rubric/client-updates.md', content: 'Keep it short.\nLead with the change [E404].' },
  ];

  it('names the unpointed line with its file and its line number', () => {
    const claims = collectClaims(files);
    const [offender] = unpointedClaims(claims);
    expect(offender.path).toBe('rubric/client-updates.md');
    expect(offender.line).toBe(1);
    expect(offender.text).toBe('Keep it short.');
  });

  it('names the pointer that resolves to nothing', () => {
    const found = unresolvedPointerClaims(collectClaims(files), { knownEvidenceIds: ['12'] });
    expect(found).toHaveLength(1);
    expect(found[0].unresolved).toEqual([{ kind: 'evidence', id: '404' }]);
  });

  it('reports the same offenders the check counted', () => {
    const claims = collectClaims([
      { path: 'rubric/core.md', content: 'Never produce a deck [E12].' },
    ]);
    const offenders = situatedGeneralisationOffenders(claims, ['12']);
    const checks = runProvenanceChecksOverFiles(
      [{ path: 'rubric/core.md', content: 'Never produce a deck [E12].' }],
      { situatedEvidenceIds: ['12'] },
    );
    expect(offenders).toHaveLength(1);
    expect(checks[2].detail).toContain(offenders[0].text.slice(0, 20));
  });
});

describe('resolveClaim and resolvePointerId', () => {
  const opts = { knownCriterionIds: ['1'], knownEvidenceIds: ['7f2a'] };

  it('marks an unpointed claim unresolved', () => {
    const [claim] = collectClaims([{ path: 'x.md', content: 'Lead with the decision.' }]);
    expect(resolveClaim(claim, opts)).toBe('unresolved');
  });

  it('marks a resolving pointer cited', () => {
    const [claim] = collectClaims([{ path: 'x.md', content: 'Lead with the decision [C1].' }]);
    expect(resolveClaim(claim, opts)).toBe('cited');
  });

  it('marks a pointer to nothing unresolved, which is the whole point', () => {
    const [claim] = collectClaims([{ path: 'x.md', content: 'Lead with the decision [C9].' }]);
    expect(resolveClaim(claim, opts)).toBe('unresolved');
  });

  it('treats an unchecked kind as standing rather than as a failure', () => {
    const [claim] = collectClaims([{ path: 'x.md', content: 'Lead with the decision [E9z9].' }]);
    expect(resolveClaim(claim, {})).toBe('cited');
  });

  it('hands back the id a pointer resolved to, so the row can be found', () => {
    expect(resolvePointerId({ kind: 'evidence', id: '7f2a' }, ['7f2a'])).toBe('7f2a');
    expect(resolvePointerId({ kind: 'evidence', id: 'nope' }, ['7f2a'])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Citable spans: what a leader with no graded work can point at
// ---------------------------------------------------------------------------

describe('splitCitableSpans', () => {
  const transcript =
    'Every week I write the client update for the pilot engagement.\n' +
    'I lead with what changed and what it moved, then the one decision I need from them.\n' +
    'Short.';

  it('returns spans that are exact slices of the source', () => {
    const spans = splitCitableSpans(transcript);
    expect(spans.length).toBeGreaterThan(0);
    for (const span of spans) {
      expect(transcript.slice(span.start, span.end)).toBe(span.text);
      expect(spanVerifies(transcript, span)).toBe(true);
    }
  });

  it('drops fragments too short to be a statement', () => {
    expect(splitCitableSpans(transcript).some((s) => s.text === 'Short.')).toBe(false);
  });

  it('respects the limit and returns nothing for an empty source', () => {
    expect(splitCitableSpans(transcript, { limit: 1 })).toHaveLength(1);
    expect(splitCitableSpans('')).toEqual([]);
  });

  it('rejects a span whose offsets do not slice back to its own text', () => {
    expect(spanVerifies(transcript, { text: 'invented', start: 0, end: 8 })).toBe(false);
  });
});

describe('shortIdsFor', () => {
  it('gives four hex characters when that is unique', () => {
    const ids = shortIdsFor([
      '7f2a1b4c-0000-4000-8000-000000000000',
      '9b1c0000-0000-4000-8000-000000000000',
    ]);
    expect(Array.from(ids.values())).toEqual(['7f2a', '9b1c']);
  });

  it('extends every id on a collision rather than letting one resolve to two rows', () => {
    const ids = shortIdsFor([
      '7f2a1b4c-0000-4000-8000-000000000000',
      '7f2a9999-0000-4000-8000-000000000000',
    ]);
    const values = Array.from(ids.values());
    expect(new Set(values).size).toBe(2);
    expect(values[0].length).toBeGreaterThan(4);
  });
});

describe("NOT ESTABLISHED under a label", () => {
  it("does not count a labelled honest gap as an unpointed rule", () => {
    // The generator did the right thing: no pointer existed, so it wrote the
    // escape. Anchoring the marker to the line start alone counted this as a
    // violation, which penalises the fix rather than the failure.
    const claims = extractImperativeClaims("Hard rules: NOT ESTABLISHED: Avoid excessive detail");
    expect(claims).toHaveLength(0);
  });

  it("records the labelled form as a marked gap, so it is not lost", () => {
    const gaps = extractNotEstablished("Hard rules: NOT ESTABLISHED: Avoid excessive detail");
    expect(gaps).toHaveLength(1);
  });

  it("still counts a rule that merely mentions the marker mid-sentence", () => {
    // The marker has to INTRODUCE the assertion. Burying it inside a live rule
    // is not an escape, and treating it as one would be a way to silence any
    // rule by mentioning the phrase.
    const claims = extractImperativeClaims("Avoid long updates because NOT ESTABLISHED: no source");
    expect(claims.length).toBeGreaterThan(0);
  });

  it("strips at most one label, so a nested prefix is not an escape", () => {
    const claims = extractImperativeClaims("Rules: Voice: NOT ESTABLISHED: avoid filler");
    expect(claims.length).toBeGreaterThan(0);
  });
});
