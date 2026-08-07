import type { MemoryWebFact } from '@/types/memory';
import type { MemoryEdge } from '@/hooks/useMemoryEdges';

/**
 * A worked brain for the landing hero.
 *
 * WHY THIS IS HAND-BUILT AND STATIC
 *
 * The graph on the landing page has to render for a visitor with no account, so
 * it cannot read anybody's memory. It must therefore be invented, and the only
 * honest way to invent it is to invent a PERSON: a plausible generic operator
 * whose facts are ordinary enough that nobody could mistake them for a
 * customer's. Nothing here is lifted from a real leader's brain, and nothing
 * here should ever be.
 *
 * The facts are deliberately dull and specific in the way real ones are. A demo
 * brain full of aspirational one-liners is the tell that it was written by a
 * marketing team, and a visitor who is going to trust CTRL with what they
 * actually think will spot it immediately.
 *
 * The EDGES are the point. Anyone can store facts; what the hero has to show in
 * three seconds is that CTRL holds how they relate, including one `tension`,
 * because a system that only ever agrees with itself is not modelling anything.
 *
 * `import type` on both types means neither pulls a hook or a Supabase client
 * into the public bundle: they erase at compile time.
 */

const NOW = '2026-01-01T00:00:00.000Z';

/** Everything a MemoryWebFact needs that the demo does not care about. */
function fact(
  id: string,
  category: MemoryWebFact['fact_category'],
  label: string,
  value: string,
  over: Partial<MemoryWebFact> = {},
): MemoryWebFact {
  return {
    id,
    user_id: 'demo',
    fact_key: id,
    fact_category: category,
    fact_label: label,
    fact_value: value,
    confidence_score: 0.86,
    is_high_stakes: false,
    verification_status: 'verified',
    source_type: 'voice',
    is_current: true,
    temperature: 'warm',
    reference_count: 3,
    created_at: NOW,
    updated_at: NOW,
    ...over,
  };
}

export const BRAIN_DEMO_FACTS: MemoryWebFact[] = [
  fact(
    'demo-identity',
    'identity',
    'Runs a 40-person services business',
    'Founder and managing director. Eleven years in, second business.',
    { is_high_stakes: true, temperature: 'hot', reference_count: 22 },
  ),
  fact(
    'demo-business',
    'business',
    'Revenue is project-based, not recurring',
    'Six to nine large engagements a year. Cash is lumpy and always has been.',
    { temperature: 'hot', reference_count: 14 },
  ),
  fact(
    'demo-objective',
    'objective',
    'Wants delivery to run without them in the room',
    'Aiming to be out of day-to-day delivery within four quarters.',
    { is_high_stakes: true, reference_count: 11 },
  ),
  fact(
    'demo-blocker',
    'blocker',
    'Every proposal still goes through them',
    'Nothing leaves the building unread. It is the bottleneck and they know it.',
    { verification_status: 'inferred', confidence_score: 0.72, temperature: 'hot' },
  ),
  fact(
    'demo-preference',
    'preference',
    'Will not send anything that reads as generic',
    'A proposal that could have been for any other client gets rewritten.',
    { reference_count: 9 },
  ),
  fact(
    'demo-blocker-hiring',
    'blocker',
    'Hiring senior people has not stuck',
    'Two senior hires in eighteen months, neither still here.',
    { verification_status: 'inferred', confidence_score: 0.64, temperature: 'cold' },
  ),
  fact(
    'demo-preference-brevity',
    'preference',
    'Reads nothing longer than a page',
    'Wants the decision in the first paragraph or it does not get read.',
    { reference_count: 7 },
  ),
];

/**
 * How those facts hold each other up.
 *
 * The `tension` edge is deliberate and load-bearing: the leader wants out of
 * delivery, and also refuses to let anything go out unread. Both are true, they
 * pull against each other, and a brain that quietly dropped one of them to look
 * tidy would be worth less than no brain.
 */
export const BRAIN_DEMO_EDGES: MemoryEdge[] = [
  edge('e1', 'demo-blocker', 'demo-objective', 'tension', 0.9, 'Wanting out of delivery, and reading everything before it ships, cannot both hold.'),
  edge('e2', 'demo-preference', 'demo-blocker', 'depends_on', 0.82, 'The refusal to send anything generic is why nothing goes out unread.'),
  edge('e3', 'demo-business', 'demo-identity', 'supports', 0.75, 'Project revenue is the shape of the business they built.'),
  edge('e4', 'demo-objective', 'demo-business', 'depends_on', 0.7, 'Stepping back needs revenue that does not depend on them selling it.'),
  edge('e5', 'demo-blocker-hiring', 'demo-objective', 'tension', 0.68, 'Senior hires not sticking is what keeps the exit four quarters away.'),
  edge('e6', 'demo-preference-brevity', 'demo-preference', 'relates', 0.6, 'Both are the same standard: say the specific thing, quickly.'),
  edge('e7', 'demo-blocker', 'demo-identity', 'informs', 0.55, 'Being the last read is part of how they see their own role.'),
];

function edge(
  id: string,
  from: string,
  to: string,
  relation: MemoryEdge['relation'],
  strength: number,
  rationale: string,
): MemoryEdge {
  return {
    id,
    user_id: 'demo',
    from_fact_id: from,
    to_fact_id: to,
    relation,
    strength,
    rationale,
    source: 'inferred',
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  };
}
