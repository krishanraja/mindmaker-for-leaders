import type { DecisionClaim, DecisionEvidence } from '@/hooks/useDecisionEngine';

/**
 * The worked example a visitor sees before they hand over a decision of their own.
 *
 * It is rendered by the REAL ConsiderationStone the product uses, in the real
 * verdict vocabulary (Holds / Contested / Thin / Only you), so the front door
 * shows the instrument rather than a picture of it. The fourth consideration is
 * deliberately "Only you": no source can settle whether a team has the capacity,
 * and a page that pretended otherwise would be selling the opposite of CTRL.
 *
 * Every source below is a live public page, which is what lets the copy above
 * it invite a visitor to click one.
 *
 * This stays a worked example rather than a stored run on purpose. A live run
 * of this statement was tried on 2026-08-06 and returned 22 sources, all of
 * them tagged unverified and 18 of 21 domains SEO content farms, so putting it
 * here would have sent visitors clicking from a page about trustworthy evidence
 * straight into untrustworthy evidence. Swap CLAIMS for a real case's rows once
 * the verify stage's source quality is worth showing off.
 */

export const STATEMENT = 'Should we switch our primary AI vendor to cut inference costs?';

function claim(
  p: Partial<DecisionClaim> & { id: string; text: string; verdict: DecisionClaim['verdict'] },
): DecisionClaim {
  return {
    type: 'market',
    is_load_bearing: false,
    confidence: 0.6,
    rationale: null,
    reaction_value: null,
    reaction_descriptor: null,
    reaction_kind: null,
    reaction_evidence_id: null,
    ...p,
  };
}

const ev = (
  id: string,
  claimId: string,
  stance: DecisionEvidence['stance'],
  title: string,
  url: string | null,
  tier: DecisionEvidence['reliability_tier'] = 'reputable',
): DecisionEvidence => ({
  id,
  claim_id: claimId,
  source_url: url,
  source_title: title,
  excerpt: null,
  stance,
  retriever: 'perplexity',
  retrieved_at: null,
  relevance_score: 0.8,
  reliability_tier: tier,
});

export const CLAIMS: { claim: DecisionClaim; evidence: DecisionEvidence[] }[] = [
  {
    claim: claim({
      id: 'c1',
      text: 'The alternative AI vendor is meaningfully cheaper at our volume',
      verdict: 'supported',
      is_load_bearing: true,
      rationale:
        'Two independent price indexes put the alternative well below current blended cost per million tokens at this tier.',
    }),
    evidence: [
      ev('e1', 'c1', 'supports', 'Artificial Analysis: blended price per 1M tokens', 'https://artificialanalysis.ai/models', 'primary'),
      ev('e2', 'c1', 'supports', 'OpenRouter: live price per model', 'https://openrouter.ai/models', 'primary'),
    ],
  },
  {
    claim: claim({
      id: 'c2',
      text: 'Output quality holds for our actual tasks with current tech',
      verdict: 'contested',
      is_load_bearing: true,
      rationale: 'The headline index and the task-level arena disagree. Parity depends on the work you actually run.',
    }),
    evidence: [
      ev('e3', 'c2', 'supports', 'Artificial Analysis: intelligence index', 'https://artificialanalysis.ai/models', 'primary'),
      ev('e4', 'c2', 'refutes', 'LMArena: leaderboard by task', 'https://lmarena.ai/', 'reputable'),
    ],
  },
  {
    claim: claim({
      id: 'c3',
      text: 'Switching costs stay low once we are migrated',
      verdict: 'unverified',
      rationale: 'One source addressed portability, and none addressed lock-in at your integration depth.',
    }),
    evidence: [ev('e5', 'c3', 'supports', 'Model Context Protocol: specification', 'https://modelcontextprotocol.io/')],
  },
  {
    claim: claim({
      id: 'c4',
      text: 'Our team can absorb an AI migration this quarter',
      verdict: 'unverifiable',
      is_load_bearing: true,
      rationale: 'Internal capacity. No external source can settle this one, and CTRL will not pretend otherwise.',
    }),
    evidence: [],
  },
];
