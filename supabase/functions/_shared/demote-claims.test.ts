import { describe, it, expect } from 'vitest';
import { demoteUnpointedClaims, DEMOTION_PREFIX } from './demote-claims';
import {
  collectClaims,
  runProvenanceChecksOverClaims,
  runProvenanceChecksOverFiles,
  type ProvenanceFile,
} from './provenance-checks';
import { buildSkillPackage, gatedFiles, stripFrontmatter } from './skill-package';

/**
 * Stage 7a, the deterministic half. These pin the properties the whole point of
 * the pass rests on:
 *   - an unpointed imperative is rewritten into its honest NOT ESTABLISHED form
 *   - the list marker and indentation survive byte for byte
 *   - only the offending sentence on a shared line moves
 *   - a pointed claim, an already-demoted line and a masked quote are untouched
 *   - running twice changes nothing
 *   - prov.everyRuleCited passes by construction afterwards
 */

const PATH = 'rubric/client-updates.md';

function pkg(content: string, path = PATH): ProvenanceFile[] {
  return [{ path, content }];
}

function demote(files: ProvenanceFile[], quotes: string[] = []) {
  return demoteUnpointedClaims(files, collectClaims(files, quotes), quotes);
}

describe('demoteUnpointedClaims', () => {
  it('demotes a bare imperative', () => {
    const { files, demoted } = demote(pkg('Keep the update short and to the point.'));
    expect(files[0].content).toBe(
      'NOT ESTABLISHED: Keep the update short and to the point.',
    );
    expect(demoted).toHaveLength(1);
    expect(demoted[0].text).toBe('Keep the update short and to the point.');
  });

  it('keeps the list marker and the indentation exactly', () => {
    const body = [
      '- Keep the update short.',
      '  * Lead with what moved.',
      '1. Send it before noon.',
      '\t- Name the decision you need.',
    ].join('\n');
    const { files, demoted } = demote(pkg(body));
    expect(files[0].content.split('\n')).toEqual([
      '- NOT ESTABLISHED: Keep the update short.',
      '  * NOT ESTABLISHED: Lead with what moved.',
      '1. NOT ESTABLISHED: Send it before noon.',
      '\t- NOT ESTABLISHED: Name the decision you need.',
    ]);
    expect(demoted).toHaveLength(4);
  });

  it('demotes only the offending sentence on a multi-sentence line', () => {
    // Sentence one closes on its pointer, sentence two points at nothing.
    const line = 'Keep the update short. [C1]. Never send it without a number.';
    const { files, demoted } = demote(pkg(line));
    expect(files[0].content).toBe(
      'Keep the update short. [C1]. NOT ESTABLISHED: Never send it without a number.',
    );
    expect(demoted).toHaveLength(1);
    expect(demoted[0].text).toBe('Never send it without a number.');
  });

  it('demotes a sentence whose pointer sits mid-line and cites what follows', () => {
    // "[C1] Never send..." is ONE sentence to the gate, and its pointer is not
    // trailing, so both halves are unpointed. The demoter agrees with the gate
    // rather than second-guessing where the pointer was meant to attach.
    const { files, demoted } = demote(
      pkg('Keep the update short. [C1] Never send it without a number.'),
    );
    expect(files[0].content).toBe(
      'NOT ESTABLISHED: Keep the update short. NOT ESTABLISHED: [C1] Never send it without a number.',
    );
    expect(demoted).toHaveLength(2);
  });

  it('leaves the rest of a line byte-identical when it demotes part of it', () => {
    const before = 'The update went out on Tuesday. Keep it to one page.';
    const { files } = demote(pkg(before));
    const after = files[0].content;
    expect(after.startsWith('The update went out on Tuesday. ')).toBe(true);
    expect(after.slice('The update went out on Tuesday. '.length)).toBe(
      'NOT ESTABLISHED: Keep it to one page.',
    );
  });

  it('demotes each offender on a line that holds several', () => {
    const { files, demoted } = demote(pkg('Keep it short. Avoid filler.'));
    expect(files[0].content).toBe(
      'NOT ESTABLISHED: Keep it short. NOT ESTABLISHED: Avoid filler.',
    );
    expect(demoted).toHaveLength(2);
  });

  it('leaves a line that is already NOT ESTABLISHED untouched', () => {
    const body = [
      'NOT ESTABLISHED: Keep the update short.',
      '- NOT ESTABLISHED: Never send without a number.',
      'Hard rules: NOT ESTABLISHED: Avoid filler.',
    ].join('\n');
    const { files, demoted } = demote(pkg(body));
    expect(files[0].content).toBe(body);
    expect(demoted).toHaveLength(0);
  });

  it('leaves a claim that carries a pointer untouched', () => {
    const body = [
      'Keep the update short. [C1]',
      '- Never send without a number. [E7f2a]',
    ].join('\n');
    const { files, demoted } = demote(pkg(body));
    expect(files[0].content).toBe(body);
    expect(demoted).toHaveLength(0);
  });

  it('leaves a claim whose pointer resolves to nothing untouched', () => {
    // That is prov.pointerResolves' finding. Rewriting it here would hide one
    // fault behind another.
    const body = 'Keep the update short. [C99]';
    const { files, demoted } = demote(pkg(body));
    expect(files[0].content).toBe(body);
    expect(demoted).toHaveLength(0);
  });

  it('never demotes inside a masked verbatim span', () => {
    const quote = 'Keep it to what changed and what it moved.';
    const body = [
      `They said: ${quote}`,
      'Keep the update short.',
    ].join('\n');
    const { files, demoted } = demote(pkg(body), [quote]);
    expect(files[0].content).toBe([`They said: ${quote}`, 'NOT ESTABLISHED: Keep the update short.'].join('\n'));
    expect(demoted).toHaveLength(1);
    expect(files[0].content).toContain(quote);
  });

  it('never demotes inside a fenced evidence block', () => {
    const body = [
      'Keep the update short.',
      '',
      '```evidence',
      'Never send me three pages of context I already have.',
      '```',
    ].join('\n');
    const { files } = demote(pkg(body));
    expect(files[0].content.split('\n')).toEqual([
      'NOT ESTABLISHED: Keep the update short.',
      '',
      '```evidence',
      'Never send me three pages of context I already have.',
      '```',
    ]);
  });

  it('never demotes a scope header the packager wrote', () => {
    const body = [
      '# Client updates',
      '',
      '**Applies to:** client updates on the pilot engagement',
      '**Scope source:** [E7f2a]',
      '',
      'Keep the update short.',
    ].join('\n');
    const { files, demoted } = demote(pkg(body));
    expect(files[0].content.split('\n')[2]).toBe(
      '**Applies to:** client updates on the pilot engagement',
    );
    expect(demoted).toHaveLength(1);
  });

  it('never touches a file the claims did not name', () => {
    const files: ProvenanceFile[] = [
      { path: PATH, content: 'Keep the update short.' },
      { path: 'rubric/general.md', content: 'Keep the fallback honest.' },
    ];
    const result = demoteUnpointedClaims(files, collectClaims([files[0]]), []);
    expect(result.files[1].content).toBe('Keep the fallback honest.');
    expect(result.files[1]).toBe(files[1]);
    expect(result.demoted).toHaveLength(1);
  });

  it('never touches a heading', () => {
    const body = ['## Never do this', '', 'Keep the update short.'].join('\n');
    const { files, demoted } = demote(pkg(body));
    expect(files[0].content.split('\n')[0]).toBe('## Never do this');
    expect(demoted).toHaveLength(1);
  });

  it('is a no-op when handed the stale claims from its own first run', () => {
    const files = pkg('Keep the update short.\n- Never send without a number.');
    const claims = collectClaims(files, []);
    const first = demoteUnpointedClaims(files, claims, []);
    // Deliberately the SAME claims: the offsets and texts are now stale, and a
    // demoter that rewrote on line number alone would double-prefix here.
    const second = demoteUnpointedClaims(first.files, claims, []);
    expect(second.files[0].content).toBe(first.files[0].content);
    expect(second.demoted).toHaveLength(0);
  });

  it('is a no-op when re-run over freshly collected claims', () => {
    const files = pkg('Keep the update short.\n- Never send without a number.');
    const first = demote(files);
    const second = demote(first.files);
    expect(second.files[0].content).toBe(first.files[0].content);
    expect(second.demoted).toHaveLength(0);
  });

  it('leaves the file set otherwise byte-identical', () => {
    const files: ProvenanceFile[] = [
      { path: 'SKILL.md', content: '# router\n\nThis file is a router.\n' },
      { path: PATH, content: '# Client updates\n\nKeep the update short.\n\nThe pilot ran in March.\n' },
      { path: 'rubric/core.md', content: 'NOT ESTABLISHED: which checks apply.\n' },
    ];
    const { files: out } = demoteUnpointedClaims(files, collectClaims(files), []);
    expect(out.map((f) => f.path)).toEqual(files.map((f) => f.path));
    expect(out[0].content).toBe(files[0].content);
    expect(out[2].content).toBe(files[2].content);
    expect(out[1].content).toBe(
      '# Client updates\n\nNOT ESTABLISHED: Keep the update short.\n\nThe pilot ran in March.\n',
    );
  });

  it('returns the same array when there is nothing to demote', () => {
    const files = pkg('Keep the update short. [C1]');
    const result = demoteUnpointedClaims(files, collectClaims(files), []);
    expect(result.files).toBe(files);
    expect(result.demoted).toHaveLength(0);
  });

  it('tolerates a claim whose line number is out of range', () => {
    const files = pkg('Keep the update short.');
    const claims = collectClaims(files).map((c) => ({ ...c, line: 99 }));
    const result = demoteUnpointedClaims(files, claims, []);
    expect(result.files[0].content).toBe('Keep the update short.');
    expect(result.demoted).toHaveLength(0);
  });

  it('makes prov.everyRuleCited pass by construction', () => {
    const files: ProvenanceFile[] = [
      {
        path: PATH,
        content: [
          '# Client updates',
          '',
          '- Lead with what changed and what it moved. [E7f2a]',
          '- Keep the update short and to the point.',
          '- Never send it without a number.',
          'The last one went out on Tuesday. Avoid filler.',
        ].join('\n'),
      },
    ];
    const opts = { knownCriterionIds: ['1'], knownEvidenceIds: ['7f2a'] };

    const before = runProvenanceChecksOverFiles(files, opts)
      .find((c) => c.id === 'prov.everyRuleCited');
    expect(before?.passed).toBe(false);
    expect(before?.detail).toMatch(/^3 of 4 imperatives/);

    const { files: after, demoted } = demoteUnpointedClaims(files, collectClaims(files), []);
    expect(demoted).toHaveLength(3);

    const recheck = runProvenanceChecksOverFiles(after, opts)
      .find((c) => c.id === 'prov.everyRuleCited');
    expect(recheck?.passed).toBe(true);
    expect(recheck?.detail).toMatch(/^0 of 1 imperatives/);
  });

  it('uses the marker extractImperativeClaims already skips', () => {
    expect(DEMOTION_PREFIX).toBe('NOT ESTABLISHED: ');
  });
});

/**
 * The wiring generate-skill-export uses, reproduced exactly: claims are
 * collected from gatedFiles(pkg), which blanks frontmatter, but the demotion is
 * applied to pkg.files, which still carries it. If line numbers or offsets drift
 * between those two views a rule gets rewritten in the wrong place, so it is
 * pinned here rather than reasoned about.
 */
describe('demoteUnpointedClaims over a real package', () => {
  const build = () =>
    buildSkillPackage({
      name: 'client-update',
      description:
        'Use whenever drafting the weekly client update. Triggers on: client update, weekly update, ' +
        'status note, pilot update, progress note. Do not draft a client update without consulting ' +
        'this skill first.',
      surface: 'client updates',
      body: [
        '## Procedure',
        '',
        '- Lead with what changed and what it moved. [E7f2a]',
        '- Keep the update short and to the point.',
        '- Never send it without a number.',
        '',
        '## Gotchas',
        '',
        'The last one went out on Tuesday. Avoid three pages of context.',
      ].join('\n'),
      evidence: [{ shortId: 'E7f2a', situation: 'the pilot engagement' }],
    });

  const opts = { knownCriterionIds: [], knownEvidenceIds: ['7f2a'], situatedEvidenceIds: ['7f2a'] };

  it('demotes the leaf rules and leaves everything else byte-identical', () => {
    const pkg = build();
    const claims = collectClaims(gatedFiles(pkg), []);
    const { files, demoted } = demoteUnpointedClaims(pkg.files, claims, []);

    expect(demoted).toHaveLength(3);

    const before = new Map(pkg.files.map((f) => [f.path, f.content]));
    const leaf = 'rubric/client-updates.md';
    for (const file of files) {
      if (file.path === leaf) continue;
      expect(file.content).toBe(before.get(file.path));
    }

    const leafContent = files.find((f) => f.path === leaf)?.content ?? '';
    expect(leafContent).toContain('- Lead with what changed and what it moved. [E7f2a]');
    expect(leafContent).toContain('- NOT ESTABLISHED: Keep the update short and to the point.');
    expect(leafContent).toContain('- NOT ESTABLISHED: Never send it without a number.');
    expect(leafContent).toContain(
      'The last one went out on Tuesday. NOT ESTABLISHED: Avoid three pages of context.',
    );
    // The scope header the packager derived is untouched.
    expect(leafContent).toContain('**Applies to:** the pilot engagement');
  });

  it('makes prov.everyRuleCited pass over the shipped package', () => {
    const pkg = build();
    const claims = collectClaims(gatedFiles(pkg), []);
    const before = runProvenanceChecksOverClaims(claims, opts)
      .find((c) => c.id === 'prov.everyRuleCited');
    expect(before?.passed).toBe(false);

    const demotedPkg = { ...pkg, files: demoteUnpointedClaims(pkg.files, claims, []).files };
    const after = runProvenanceChecksOverClaims(
      collectClaims(gatedFiles(demotedPkg), []),
      opts,
    ).find((c) => c.id === 'prov.everyRuleCited');
    expect(after?.passed).toBe(true);
    expect(after?.detail).toMatch(/^0 of /);
  });

  it('never rewrites a line inside the router frontmatter', () => {
    // A synthetic router whose frontmatter carries the trigger contract AND
    // whose body carries an imperative: gatedFiles blanks the first, so the
    // claim's line number is measured against a body the demoter is handed
    // WITHOUT that blanking.
    const file: ProvenanceFile = {
      path: 'SKILL.md',
      content: [
        '---',
        'name: client-update',
        'description: >',
        '  Use whenever drafting the update. Do not draft one without consulting this skill first.',
        '---',
        '',
        '# client-update',
        '',
        'Keep the routing table thin.',
      ].join('\n'),
    };
    const gated = [{ path: file.path, content: stripFrontmatter(file.content) }];
    const { files, demoted } = demoteUnpointedClaims([file], collectClaims(gated, []), []);

    expect(demoted).toHaveLength(1);
    const lines = files[0].content.split('\n');
    expect(lines.slice(0, 5)).toEqual(file.content.split('\n').slice(0, 5));
    expect(lines[8]).toBe('NOT ESTABLISHED: Keep the routing table thin.');
  });
});
