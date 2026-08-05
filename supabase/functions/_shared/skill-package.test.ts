import { describe, it, expect } from 'vitest';
import {
  buildSkillPackage,
  CORE_LEAF,
  deriveScope,
  fileAt,
  flattenPackageForPull,
  GENERAL_LEAF,
  gatedFiles,
  parseFlattenedPackage,
  ROUTER_MAX_LINES,
  routerLineCount,
  slugify,
  stripFrontmatter,
  surfaceLeafPath,
  verbatimSpans,
  type BuildPackageInput,
  type PackageCriterion,
  type PackageEvidence,
} from './skill-package';
import {
  collectClaims,
  findAllPointers,
  parseScopeHeader,
  parseUnpointedImperatives,
  runProvenanceChecksOverFiles,
} from './provenance-checks';

/**
 * Phase 3b package tests. These pin the four properties the rest of the chain
 * leans on:
 *   - the router is a router: capped, and carrying no rule of its own
 *   - a leaf's rules point at something, and an unpointed one is counted
 *   - the leader's own verbatim work never trips a check (CH-16)
 *   - the flat form round trips, so MCP can serve what the ZIP contains (CH-02)
 */

const CRITERION: PackageCriterion = {
  shortId: 'C1',
  name: 'Leads with the decision',
  check_text: 'The first paragraph names the decision being asked for.',
  observable: 'within_first_paragraphs:1:contains:decision',
  weight: 'essential',
  holds_example: 'We need a call on the pricing tier by Friday. Here is what changed.',
  breaks_example: 'Never bury the ask. Always open with three paragraphs of context.',
  disc_verdict: 'keep',
  n_rejected: 9,
  n_rejected_failing: 7,
  n_accepted: 11,
  n_accepted_failing: 1,
};

const BASE: BuildPackageInput = {
  name: 'writing-client-updates',
  description:
    'Generates the weekly client update in the leader\'s own shape. Use whenever the leader says ' +
    'draft my client update, write the weekly note, pull together the update, do the Friday note, ' +
    'or client update time. Do not draft a client update without consulting this skill first.',
  body: [
    '## When this skill activates',
    '',
    'The weekly client update falls due every Friday.',
    '',
    '## Workflow',
    '',
    '1. Lead with what changed and what it moved [E7f2a].',
    '2. Name the one decision needed from them [C1].',
    '',
    '## Gotchas',
    '',
    'NOT ESTABLISHED: whether a deck is ever acceptable for this client.',
    '',
    '## Output format',
    '',
    'Three short paragraphs.',
    '',
    '## Learning loop',
    '',
    'Each run gets noted as kept, edited or rejected [C1].',
    '',
    '## References',
    '',
    '`references/company-context.md` - when the update needs the company facts.',
  ].join('\n'),
  surface: 'client updates',
  references: [{ filename: 'company-context.md', content: '# Company\n\nThe pilot runs until March.' }],
  criteria: [CRITERION],
  // E7f2a is cited by the body. E9b1c is available and never cited, which is how
  // the scope header proves it describes the leaf rather than the id set.
  evidence: [
    { shortId: 'E7f2a', situation: 'client updates on the pilot engagement' },
    { shortId: 'E9b1c', situation: 'the monthly board pack' },
  ],
  exemplars: [
    { verdict: 'would_not_send', body: 'Never send a deck. Always pad it out.', why: 'buries the ask' },
    { verdict: 'send', body: 'We need a call on pricing by Friday.', why: 'leads with the decision' },
  ],
  holdout: [{ position: 12, verdict: 'send', body: 'Held back piece.', why: 'clean' }],
  status: 'provisional',
  builtFrom: 'sort session 2026-08-04',
};

function build(overrides: Partial<BuildPackageInput> = {}) {
  return buildSkillPackage({ ...BASE, ...overrides });
}

describe('buildSkillPackage layout', () => {
  it('produces the router, the three rubric leaves, references, exemplars and evals', () => {
    const paths = build().files.map((f) => f.path);
    expect(paths[0]).toBe('SKILL.md');
    expect(paths).toContain(CORE_LEAF);
    expect(paths).toContain('rubric/client-updates.md');
    expect(paths).toContain(GENERAL_LEAF);
    expect(paths).toContain('references/company-context.md');
    expect(paths).toContain('exemplars/INDEX.md');
    expect(paths).toContain('exemplars/1.md');
    expect(paths).toContain('evals/holdout.jsonl');
  });

  it('always ships the fallback leaf, even with no criteria and no graded work', () => {
    const pkg = build({ criteria: [], exemplars: [], holdout: [] });
    expect(fileAt(pkg, GENERAL_LEAF)?.content).toContain('NOT ESTABLISHED');
    // The core leaf still exists and says what would fill it, rather than
    // vanishing and leaving the router pointing at nothing.
    expect(fileAt(pkg, CORE_LEAF)?.content).toContain('NOT ESTABLISHED');
  });

  it('routes only to files that exist', () => {
    const pkg = build({ exemplars: [], holdout: [], references: [] });
    const router = fileAt(pkg, 'SKILL.md')!.content;
    const routed = Array.from(router.matchAll(/^\| `([^`]+)` \|/gm)).map((m) => m[1]);
    const present = new Set(pkg.files.map((f) => f.path));
    expect(routed.length).toBeGreaterThan(0);
    for (const path of routed) expect(present.has(path)).toBe(true);
  });

  it('puts the graded examples in a fenced evidence block so the mask finds them', () => {
    expect(fileAt(build(), CORE_LEAF)?.content).toContain('```evidence');
  });

  it('writes the hold-out as one JSON object per line', () => {
    const jsonl = fileAt(build(), 'evals/holdout.jsonl')!.content.trim().split('\n');
    expect(jsonl).toHaveLength(1);
    expect(JSON.parse(jsonl[0])).toMatchObject({ position: 12, verdict: 'send' });
  });
});

describe('the router', () => {
  it('stays under the hard cap of 80 lines', () => {
    expect(routerLineCount(build())).toBeLessThanOrEqual(ROUTER_MAX_LINES);
  });

  it('stays under the cap with a maximal description and every optional leaf', () => {
    const pkg = build({
      description: 'x'.repeat(1000),
      references: [
        { filename: 'company-context.md', content: 'a' },
        { filename: 'voice-profile.md', content: 'b' },
        { filename: 'format-rules.md', content: 'c' },
      ],
      criteria: [CRITERION, { ...CRITERION, shortId: 'C2', name: 'Second' }],
    });
    expect(routerLineCount(pkg)).toBeLessThanOrEqual(ROUTER_MAX_LINES);
  });

  it('carries no rule of its own, so it never needs a pointer', () => {
    const router = gatedFiles(build()).find((f) => f.path === 'SKILL.md')!;
    expect(collectClaims([router])).toHaveLength(0);
  });

  it('does not read the frontmatter description as a rule', () => {
    // The description is the trigger contract and is written in exactly the
    // imperative shape the spec requires ("Use whenever...", "Do not X
    // without..."). Counting it would fail every package for the one field
    // that has to look like that.
    const router = fileAt(build(), 'SKILL.md')!.content;
    expect(router).toContain('Use whenever the');
    expect(router).toContain('consulting this skill first.');
    expect(collectClaims([{ path: 'SKILL.md', content: stripFrontmatter(router) }])).toHaveLength(0);
  });

  it('records status and built_from in the frontmatter', () => {
    const router = fileAt(build(), 'SKILL.md')!.content;
    expect(router).toContain('status: provisional');
    expect(router).toContain('built_from: sort session 2026-08-04');
  });
});

describe('what the gate reads', () => {
  it('gates the router, the rubric leaves and the references, and nothing else', () => {
    const paths = gatedFiles(build()).map((f) => f.path).sort();
    expect(paths).toEqual([
      'SKILL.md',
      'references/company-context.md',
      'rubric/client-updates.md',
      'rubric/core.md',
      'rubric/general.md',
    ]);
  });

  it('never gates exemplars or evals', () => {
    const paths = gatedFiles(build()).map((f) => f.path);
    expect(paths.some((p) => p.startsWith('exemplars/'))).toBe(false);
    expect(paths.some((p) => p.startsWith('evals/'))).toBe(false);
  });

  it('passes an imperative that carries a pointer and fails one that does not', () => {
    const withPointer = runProvenanceChecksOverFiles([
      { path: 'rubric/core.md', content: 'Lead with the decision [C1].' },
    ]);
    expect(withPointer[0].passed).toBe(true);

    const without = runProvenanceChecksOverFiles([
      { path: 'rubric/core.md', content: 'Lead with the decision.' },
    ]);
    expect(without[0].passed).toBe(false);
    expect(parseUnpointedImperatives(without[0].detail)).toBe(1);
    expect(without[0].detail).toContain('rubric/core.md');
  });

  it('reads a NOT ESTABLISHED line as a fix rather than a violation', () => {
    const checks = runProvenanceChecksOverFiles([
      { path: 'rubric/general.md', content: 'NOT ESTABLISHED: whether a deck is acceptable.' },
    ]);
    expect(checks[0].passed).toBe(true);
    expect(parseUnpointedImperatives(checks[0].detail)).toBe(0);
  });
});

describe('the surface leaf declares its scope, once', () => {
  const SURFACE_LEAF = 'rubric/client-updates.md';

  function scopeOf(pkg = build()) {
    return parseScopeHeader(fileAt(pkg, SURFACE_LEAF)!.content);
  }

  it('writes the header from the situations of the evidence its rules cite', () => {
    expect(scopeOf()).toEqual({
      appliesTo: 'client updates on the pilot engagement',
      scopeIds: ['7f2a'],
    });
  });

  it('names only evidence the leaf actually cites', () => {
    // The rule the whole mechanism rests on: a leaf may not declare a scope its
    // cited evidence does not support. E9b1c was available and never cited, so
    // the board pack is not part of what this leaf covers.
    const leaf = fileAt(build(), SURFACE_LEAF)!.content;
    const rules = leaf
      .split('\n')
      .filter((line) => !line.startsWith('**Applies to:**') && !line.startsWith('**Scope source:**'))
      .join('\n');
    const cited = new Set(
      findAllPointers(rules).filter((p) => p.kind === 'evidence').map((p) => p.id),
    );
    const scope = scopeOf()!;
    for (const id of scope.scopeIds) expect(cited.has(id)).toBe(true);
    expect(scope.scopeIds).not.toContain('9b1c');
    expect(scope.appliesTo).not.toContain('board pack');
  });

  it('omits the header when no cited evidence carries a situation', () => {
    // Never invent a scope. With nothing situated behind the citation the leaf
    // says nothing about coverage, and its rules go back to needing their own
    // qualifier, which is the honest fallback rather than a quiet upgrade.
    expect(scopeOf(build({ evidence: [{ shortId: 'E7f2a', situation: null }] }))).toBeNull();
    expect(scopeOf(build({ evidence: [] }))).toBeNull();
    expect(fileAt(build({ evidence: [] }), SURFACE_LEAF)!.content).not.toContain('Applies to:');
  });

  it('never writes one on core.md or general.md', () => {
    // Always-on and fallback are not situations. This boundary is what still
    // catches a standing rule landing in core.md off one situated remark.
    const pkg = build();
    expect(parseScopeHeader(fileAt(pkg, CORE_LEAF)!.content)).toBeNull();
    expect(parseScopeHeader(fileAt(pkg, GENERAL_LEAF)!.content)).toBeNull();
    expect(parseScopeHeader(fileAt(pkg, 'SKILL.md')!.content)).toBeNull();
  });

  it('is what clears prov.noSituatedGeneralisation for a scoped leaf', () => {
    // The finding this mechanism was built for: the body's rules rest on a
    // situated transcript quote, and before the header every one of them read as
    // a standing rule.
    const opts = {
      knownCriterionIds: ['1'],
      knownEvidenceIds: ['7f2a'],
      situatedEvidenceIds: ['7f2a'],
    };
    const scoped = build();
    const scopedChecks = runProvenanceChecksOverFiles(gatedFiles(scoped), {
      ...opts,
      evidenceQuotes: verbatimSpans(scoped),
    });
    expect(scopedChecks[2].passed).toBe(true);
    expect(scopedChecks[0].passed).toBe(true);

    const unscoped = build({ evidence: [{ shortId: 'E7f2a', situation: null }] });
    const unscopedChecks = runProvenanceChecksOverFiles(gatedFiles(unscoped), {
      ...opts,
      evidenceQuotes: verbatimSpans(unscoped),
    });
    expect(unscopedChecks[2].passed).toBe(false);
  });

  it('derives nothing from evidence the content never points at', () => {
    expect(deriveScope('Lead with what changed [E7f2a].', [])).toBeNull();
    expect(deriveScope('Lead with what changed.', [{ shortId: 'E7f2a', situation: 'the pilot' }]))
      .toBeNull();
    expect(deriveScope('Lead with what changed [C1].', [{ shortId: 'E7f2a', situation: 'the pilot' }]))
      .toBeNull();
  });

  it('joins distinct situations and dedupes both sides', () => {
    const evidence: PackageEvidence[] = [
      { shortId: 'E7f2a', situation: 'the pilot engagement' },
      { shortId: 'E9b1c', situation: 'the pilot engagement' },
      { shortId: 'Eaa11', situation: 'the weekly call' },
    ];
    const scope = deriveScope('A [E7f2a]. B [E9b1c]. C [E7f2a]. D [Eaa11].', evidence)!;
    expect(scope.appliesTo).toBe('the pilot engagement; the weekly call');
    expect(scope.scopeIds).toEqual(['7f2a', '9b1c', 'aa11']);
  });

  it('knows which leaf the generator actually wrote', () => {
    expect(surfaceLeafPath(build())).toBe(SURFACE_LEAF);
  });
});

describe('CH-16: the verbatim deadlock', () => {
  it('clears the gate on a package whose exemplars are banned constructions verbatim', () => {
    // The deadlock case, stated plainly: the personal kill list is computed FROM
    // the would_not_send items, and the package ships those items verbatim
    // because a negative exemplar is what makes exemplars useful. If the check
    // read them, every package would block on its own required content, forever,
    // and regenerating could not clear it.
    const pkg = build();
    const exemplar = fileAt(pkg, 'exemplars/1.md')!.content;
    expect(exemplar).toContain('Never send a deck. Always pad it out.');

    const checks = runProvenanceChecksOverFiles(gatedFiles(pkg), {
      evidenceQuotes: verbatimSpans(pkg),
    });
    expect(checks[0].passed).toBe(true);
    expect(parseUnpointedImperatives(checks[0].detail)).toBe(0);
  });

  it('does not read the breaks example quoted inside a rubric leaf', () => {
    const pkg = build();
    const core = fileAt(pkg, CORE_LEAF)!.content;
    expect(core).toContain('Never bury the ask.');
    // It sits inside a fence labelled evidence, so the mask blanks it before
    // anything reads it. Nothing mutates the span; the check simply does not
    // look there. What remains is the criterion's own line, which points at the
    // criterion it came from.
    const claims = collectClaims([{ path: CORE_LEAF, content: core }]);
    expect(claims.every((c) => c.pointer !== null)).toBe(true);
    expect(claims.some((c) => c.text.includes('Never bury the ask'))).toBe(false);
  });

  it('still catches a fabricated quoted rule that resolves to no evidence', () => {
    // The exemption binds to a resolved quote, never to punctuation. A rule in
    // quotation marks that matches nothing is still a rule.
    const claims = collectClaims(
      [{ path: 'rubric/core.md', content: '"Never produce a deck for anyone."' }],
      ['a completely different quote'],
    );
    expect(claims).toHaveLength(1);
  });
});

describe('flattenPackageForPull (CH-02)', () => {
  it('round trips every file with its delimiter', () => {
    const pkg = build();
    const flat = flattenPackageForPull(pkg);
    for (const file of pkg.files) expect(flat).toContain(`## file: ${file.path}`);

    const parsed = parseFlattenedPackage(flat);
    expect(parsed.map((f) => f.path)).toEqual(pkg.files.map((f) => f.path));
    expect(parsed.map((f) => f.content)).toEqual(pkg.files.map((f) => f.content.trim()));
  });

  it('leads with the router', () => {
    const flat = flattenPackageForPull(build());
    expect(flat.startsWith('## file: SKILL.md')).toBe(true);
  });

  it('carries the leaf content, not only the routing table', () => {
    // The whole point: get_skill returns one string, so a router whose leaves
    // cannot be fetched resolves to nothing on the far side.
    const flat = flattenPackageForPull(build());
    expect(flat).toContain('The first paragraph names the decision being asked for. [C1]');
    expect(flat).toContain('NOT ESTABLISHED');
  });

  it('survives an empty package without throwing', () => {
    expect(parseFlattenedPackage('')).toEqual([]);
  });
});

describe('slugify and stripFrontmatter', () => {
  it('makes a safe leaf name and never an empty one', () => {
    expect(slugify('Client Updates')).toBe('client-updates');
    expect(slugify('   ')).toBe('standard');
    expect(slugify('!!!', 'surface')).toBe('surface');
  });

  it('blanks frontmatter without moving any line number', () => {
    const content = '---\nname: x\n---\n\nLead with the decision.';
    const stripped = stripFrontmatter(content);
    expect(stripped.split('\n')).toHaveLength(content.split('\n').length);
    expect(stripped).not.toContain('name: x');
    expect(stripped).toContain('Lead with the decision.');
  });

  it('leaves a file with no frontmatter alone', () => {
    expect(stripFrontmatter('# Title\n\nBody.')).toBe('# Title\n\nBody.');
  });
});
