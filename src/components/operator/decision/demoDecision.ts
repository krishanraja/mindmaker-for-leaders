/**
 * demoDecision - a bundled, static example decision (no network, no engine, no DB) shown in the
 * empty/first-run Decisions tab so a leader always sees the RIGHT SHAPE: a decision at the centre
 * with the six AI-native forces spidering out, some solid (green), some shaky (amber), one that is
 * only-you-can-call (grey). Shapes match the live DecisionCase / DecisionClaim / DecisionEvidence
 * interfaces exactly, so DecisionSpider + ForceDrawer render it with zero branching.
 *
 * Voice + honesty match coldDeck.ts: AI-native, plain language, no em dashes, figures only where a
 * real claim would carry one.
 */

import type { DecisionCase, DecisionClaim, DecisionEvidence } from '@/hooks/useDecisionEngine';

export const DEMO_CASE: DecisionCase = {
  id: 'demo',
  title: 'Move tier-1 support to an AI agent',
  statement: 'Should we stand up an AI agent to handle tier-1 support before hiring more reps?',
  stage: 'complete',
  decision_kind: 'directional',
  recommendation:
    'Pilot an agent on the highest-volume, lowest-risk ticket types first (password resets, order status), keep refunds and account changes human-gated, and only then decide on the hire.',
  counter_case:
    'If the agent hallucinates on money-movement tickets even a little, the trust cost outweighs the deflection savings; that risk is not yet closed.',
  breakpoint_assumption_id: 'demo-c3',
  validate_next: [
    'Measure agent resolution rate on your real ticket mix for two weeks.',
    'Confirm refunds and account changes stay human-gated.',
  ],
  confidence: 0.7,
  error_detail: null,
  last_verified_at: null,
  reframed: false,
  reframed_statement: null,
  reframe_note: null,
  lifecycle_stage: 'orchestrate',
  force_labels: {
    capability: 'Ticket deflection',
    economics: 'Cost per ticket',
    risk: 'Hallucination',
    build_buy: 'Vendor vs build',
    team: 'Ownership',
    timing: 'Before hiring',
  },
};

function claim(
  id: string,
  dimension: DecisionClaim['dimension'],
  verdict: DecisionClaim['verdict'],
  text: string,
  is_load_bearing = false,
): DecisionClaim {
  return {
    id,
    text,
    type: 'market',
    is_load_bearing,
    dimension,
    verdict,
    confidence: verdict === 'supported' ? 0.8 : verdict === 'contested' ? 0.35 : null,
    rationale: null,
    reaction_value: null,
    reaction_descriptor: null,
    reaction_kind: null,
    reaction_evidence_id: null,
  };
}

export const DEMO_CLAIMS: DecisionClaim[] = [
  claim('demo-c1', 'capability', 'supported', 'Modern support agents resolve a majority of tier-1 tickets without a human.', true),
  claim('demo-c2', 'economics', 'supported', 'Per-ticket cost drops below a human rep once monthly volume clears a few thousand.'),
  claim('demo-c3', 'risk', 'contested', 'The agent can get refund and account-change requests wrong in ways that erode trust.', true),
  claim('demo-c4', 'build_buy', 'unverified', 'A vendor agent platform ships faster than building the orchestration in-house.'),
  claim('demo-c5', 'team', 'unverifiable', 'Your support lead is ready to own the agent’s guardrails and escalation rules.'),
  claim('demo-c6', 'timing', 'supported', 'Deflecting tier-1 now frees the headcount budget you would otherwise spend next quarter.'),
];

function ev(
  id: string,
  claim_id: string,
  stance: DecisionEvidence['stance'],
  score: number,
  key_point: string,
  source_title: string,
  reliability_tier: DecisionEvidence['reliability_tier'],
  published_at: string | null,
): DecisionEvidence {
  return {
    id,
    claim_id,
    source_url: 'https://artificialanalysis.ai/models',
    source_title,
    excerpt: key_point,
    stance,
    retriever: 'exa',
    retrieved_at: null,
    relevance_score: null,
    reliability_tier,
    key_point,
    published_at,
    evidence_score: score,
  };
}

export const DEMO_EVIDENCE: DecisionEvidence[] = [
  ev('demo-e1', 'demo-c1', 'supports', 84, 'Leading support agents resolve 60-70% of tier-1 tickets end to end.', 'Enterprise Support Agent Benchmarks 2026', 'reputable', '2026-05-10T00:00:00Z'),
  ev('demo-e2', 'demo-c1', 'supports', 71, 'Deflection is highest on password resets and order status, lowest on billing.', 'Where AI Support Agents Actually Win', 'community', '2026-04-02T00:00:00Z'),
  ev('demo-e3', 'demo-c2', 'supports', 80, 'Blended cost per resolved ticket falls under a human rep past ~2k/month.', 'AI Support Economics: Cost per Resolution', 'reputable', '2026-06-01T00:00:00Z'),
  ev('demo-e4', 'demo-c3', 'refutes', 66, 'Agents still misread refund eligibility rules without tight tool guardrails.', 'Failure Modes in Agentic Customer Support', 'reputable', '2026-05-22T00:00:00Z'),
  ev('demo-e5', 'demo-c3', 'supports', 58, 'Human-gating money-movement actions removes most of the trust risk.', 'Designing Safe Support Agents', 'community', null),
  ev('demo-e6', 'demo-c4', 'supports', 61, 'Vendor platforms cut time-to-first-value from months to weeks.', 'Build vs Buy for Support Agents', 'community', '2026-03-15T00:00:00Z'),
  ev('demo-e7', 'demo-c6', 'supports', 63, 'Teams that deflect first typically defer 1-2 planned support hires.', 'Staffing an AI-native Support Org', 'community', '2026-04-20T00:00:00Z'),
  // demo-c5 (team / ownership) has no evidence on purpose: it renders grey, only-you-can-call.
];
