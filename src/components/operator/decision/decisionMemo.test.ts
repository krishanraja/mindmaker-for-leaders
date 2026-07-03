import { describe, it, expect } from 'vitest';
import { buildDecisionMemo } from './decisionMemo';
import type {
  DecisionCase,
  DecisionClaim,
  DecisionEvidence,
  DecisionTension,
} from '@/hooks/useDecisionEngine';

/**
 * The memo is the artifact a leader carries out of a weigh, so it must be
 * honest: every section renders only real stored data, nullable fields on
 * older rows are skipped (never faked), and no options-considered section is
 * invented. These tests pin that contract with a full case and a sparse one.
 */

const NOW = new Date('2026-07-03T12:00:00Z');

const fullCase: DecisionCase = {
  id: 'case-1',
  title: 'Standardise the company on one AI vendor',
  statement: 'Which AI vendor should we standardise the company on?',
  stage: 'complete',
  decision_kind: 'directional',
  recommendation: 'Standardise on one primary vendor with a second for leverage.',
  counter_case: 'A single vendor concentrates pricing risk if the market shifts.',
  breakpoint_assumption_id: 'claim-2',
  validate_next: ['Run a 2-week pilot with the shortlist', ''],
  confidence: 0.72,
  error_detail: null,
  last_verified_at: '2026-07-02T12:00:00Z',
  reframed: true,
  reframed_statement: 'Which AI vendor should anchor how we build and ship with AI?',
  reframe_note: 'Weighed as a build-substrate call, not a procurement line item.',
  lifecycle_stage: 'substrate',
};

const claims: DecisionClaim[] = [
  {
    id: 'claim-1',
    text: 'Vendor consolidation cuts integration cost.',
    type: 'market',
    is_load_bearing: false,
    verdict: 'supported',
    confidence: 0.8,
    rationale: null,
    reaction_value: null,
    reaction_descriptor: null,
    reaction_kind: null,
    reaction_evidence_id: null,
  },
  {
    id: 'claim-2',
    text: 'Model quality differences between top vendors stay small.',
    type: 'forecast',
    is_load_bearing: true,
    verdict: 'unverifiable',
    confidence: 0.5,
    rationale: null,
    reaction_value: null,
    reaction_descriptor: null,
    reaction_kind: null,
    reaction_evidence_id: null,
  },
];

const evidence: DecisionEvidence[] = [
  {
    id: 'ev-1',
    claim_id: 'claim-1',
    source_url: 'https://www.example.com/report',
    source_title: 'Enterprise AI stack report',
    excerpt: 'Consolidated stacks report lower integration overhead.',
    stance: 'supports',
    retriever: 'exa',
    retrieved_at: null,
    relevance_score: null,
    reliability_tier: 'reputable',
    key_point: 'Consolidated stacks report lower integration overhead',
    published_at: '2026-06-01T00:00:00Z',
  },
];

const tensions: DecisionTension[] = [
  { id: 't-1', kind: 'model_disagreement', description: 'Two of four models lean against consolidating now.', severity: 'medium' },
];

describe('buildDecisionMemo', () => {
  it('renders every section from real data, in memo order', () => {
    const memo = buildDecisionMemo(fullCase, claims, evidence, tensions, NOW);
    expect(memo).toContain('# Standardise the company on one AI vendor');
    expect(memo).toContain('## The question');
    expect(memo).toContain('Weighed as its AI-native version:');
    expect(memo).toContain('## The call');
    expect(memo).toContain('Confidence: 72%');
    expect(memo).toContain('## What checks out');
    expect(memo).toContain("## What's shaky");
    expect(memo).toContain('(your call)'); // unverifiable verdict, plain-language label
    expect(memo).toContain('## The breakpoint');
    expect(memo).toContain('Model quality differences');
    expect(memo).toContain('## The case against');
    expect(memo).toContain('## Tensions');
    expect(memo).toContain('The models disagree:');
    expect(memo).toContain('## Validate next');
    expect(memo).toContain('2-week pilot');
    expect(memo).toContain('## Evidence');
    expect(memo).toContain('example.com');
    expect(memo).toContain('Evidence last checked');
    // sections appear in order
    expect(memo.indexOf('## The call')).toBeGreaterThan(memo.indexOf('## The question'));
    expect(memo.indexOf('## Evidence')).toBeGreaterThan(memo.indexOf('## Validate next'));
  });

  it('skips empty validate_next entries and never fabricates an options section', () => {
    const memo = buildDecisionMemo(fullCase, claims, evidence, tensions, NOW);
    expect(memo).not.toMatch(/## Options/i);
    expect(memo.match(/^- /gm)!.length).toBeGreaterThan(0);
    expect(memo).not.toContain('\n- \n');
  });

  it('renders a sparse older row without faking missing sections', () => {
    const sparse: DecisionCase = {
      ...fullCase,
      title: null,
      recommendation: null,
      counter_case: null,
      breakpoint_assumption_id: null,
      validate_next: null,
      confidence: null,
      last_verified_at: null,
      reframed: null,
      reframed_statement: null,
      reframe_note: null,
    };
    const memo = buildDecisionMemo(sparse, [], [], [], NOW);
    expect(memo).toContain('# Decision memo');
    expect(memo).toContain('## The question');
    expect(memo).not.toContain('## The call');
    expect(memo).not.toContain('## The breakpoint');
    expect(memo).not.toContain('## The case against');
    expect(memo).not.toContain('## Validate next');
    expect(memo).not.toContain('## Evidence');
    expect(memo).not.toContain('Evidence last checked');
  });

  it('keeps evidence grouped under its claim, capped at 3 lines', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      ...evidence[0],
      id: `ev-${i}`,
      key_point: `Point number ${i}`,
    }));
    const memo = buildDecisionMemo(fullCase, claims, many, [], NOW);
    const appendix = memo.slice(memo.indexOf('## Evidence'));
    expect(appendix.match(/Point number/g)!.length).toBe(3);
  });

  it('contains no em dashes (house style)', () => {
    const memo = buildDecisionMemo(fullCase, claims, evidence, tensions, NOW);
    expect(memo).not.toMatch(/[\u2014\u2013]/);
  });
});
