// laneReserve - a curated, per-category evergreen reserve of AI-native headlines.
//
// THE "GUARANTEE AT LEAST THREE" FIX. When a leader narrows their feed to a lane
// (Tune), the shared daily pool may genuinely hold only one or two stories in
// that lane that day. Rather than diluting their choice with off-topic filler,
// we top up from this ON-TOPIC reserve so any chosen lane always shows >=3
// headlines. These are evergreen, plainly-worded reads of the AI shift (same
// voice as coldDeck.ts) - never dated scoops - so they are always honest as a
// "worth holding in mind" card even on a thin news day.
//
// Distinct from coldDeck.ts: coldDeck is the WHOLE-feed fallback when the live
// feed is empty; this reserve is the per-lane top-up. Headlines here are kept
// distinct from coldDeck so a card never reads as a duplicate.

import type { DeckCard } from '@/types/cockpit';
import type { NewsCategoryId } from '@/types/newsCategory';

function card(id: string, category: NewsCategoryId, headline: string, say: string): DeckCard {
  return { id, kind: 'news', eyebrow: 'Worth a look', category, headline, say, source: 'The shift', timeAgo: 'this week' };
}

// >=2 per lane (3 for model, the only single-category Tune group) so any chosen
// group can always reach the floor of 3 even when the live pool has none.
const RESERVE: readonly DeckCard[] = [
  // model (3 - "Frontier models & capability" is a single-category group)
  card('rsv-model-1', 'model', 'Frontier models keep crossing capability lines every few weeks', 'What was impossible to build last quarter is often a prompt away now. Re-test the ideas you parked as too hard.'),
  card('rsv-model-2', 'model', "Smaller open models now rival last year's frontier", 'You can run capable AI more cheaply and on your own terms. The build-versus-rent maths is shifting in your favour.'),
  card('rsv-model-3', 'model', 'Reasoning models turn hard, multi-step work into a single call', 'Tasks that needed a human chain of steps increasingly run end to end. Look for the workflows worth handing over.'),
  // economics
  card('rsv-economics-1', 'economics', 'The price of a capable AI answer keeps falling', 'Every few months the same task costs less to run. Ideas you shelved on cost deserve another look.'),
  card('rsv-economics-2', 'economics', 'Funding is flowing to applied, revenue-ready AI', 'Money is chasing AI that ships value now, not demos. A signal for where your own bets should sit.'),
  // product
  card('rsv-product-1', 'product', 'AI-native products charge for outcomes, not seats', 'Pricing is moving to what the AI does, not who logs in. Worth holding against your own model.'),
  card('rsv-product-2', 'product', 'The AI features that win feel invisible, not bolted on', 'Buyers reward AI woven into the workflow over a chatbot in the corner. A bar for your own roadmap.'),
  // tools
  card('rsv-tools-1', 'tools', 'The agent tooling stack is consolidating fast', 'Frameworks, eval tools and orchestration are maturing into a real stack. Easier to build on than six months ago.'),
  card('rsv-tools-2', 'tools', 'Open connectors are making agents portable', 'Shared protocols let your AI plug into the tools you already run. Less lock-in, faster to wire up.'),
  // orchestration
  card('rsv-orchestration-1', 'orchestration', 'Reliable agents come from process, not a cleverer prompt', 'Evals, guardrails and clean hand-offs separate a demo from a system. The work is engineering, not wording.'),
  card('rsv-orchestration-2', 'orchestration', 'Multi-agent setups are moving from demo to production', 'Teams are getting several agents to cooperate on real work. The patterns to copy are emerging now.'),
  // proof
  card('rsv-proof-1', 'proof', 'Real deployments are clearing whole tiers of routine work', 'Evidence that an agent can own a function, not just assist with it. Useful to point a board at.'),
  card('rsv-proof-2', 'proof', 'Adoption is outrunning the hype in the quiet places', 'The durable wins are unglamorous back-office automations. Look there before the flashy use cases.'),
  // governance
  card('rsv-governance-1', 'governance', 'Rules are catching up to what agents are allowed to do', 'When AI touches high-stakes calls, expect to show your work. Plan the paper trail before you need it.'),
  card('rsv-governance-2', 'governance', 'An audit trail is becoming table stakes for AI decisions', 'Regulators want to see how an automated decision was made. Build the logging in from the start.'),
  // security
  card('rsv-security-1', 'security', 'If your agent reads untrusted input, assume prompt injection', 'Any agent that ingests outside text and can act needs a guardrail. This is the baseline now, not an edge case.'),
  card('rsv-security-2', 'security', 'Agent permissions are the new attack surface', 'What an agent can touch matters more than how clever it is. Scope its access tightly.'),
  // org
  card('rsv-org-1', 'org', 'Roles are reshaping around what AI now handles', 'The org chart shifts as agents take routine load. Worth mapping which tasks move, not just which jobs.'),
  card('rsv-org-2', 'org', 'The scarce skill is orchestrating AI, not just using it', 'Teams that win pair people with agents deliberately. Hiring and training are following.'),
];

/**
 * Up to `n` on-topic evergreen cards for the chosen categories, ordered by
 * role-fit (the lane the leader's job cares about most leads), skipping anything
 * the caller is already showing. Used to top a thin lane up to the floor of 3.
 */
export function reserveForCategories(
  categories: NewsCategoryId[],
  fit: Record<NewsCategoryId, number> | undefined,
  n: number,
  isExcluded?: (card: DeckCard) => boolean,
): DeckCard[] {
  if (n <= 0) return [];
  const catSet = new Set<string>(categories);
  const pool = RESERVE.filter((c) => c.category != null && catSet.has(c.category as string));
  // Order by role-fit of the card's lane (desc), stable on original order.
  const ordered = pool
    .map((c, i) => ({ c, i, f: fit?.[c.category as NewsCategoryId] ?? 0.5 }))
    .sort((a, b) => (b.f - a.f) || (a.i - b.i))
    .map((x) => x.c);
  const out: DeckCard[] = [];
  for (const c of ordered) {
    if (out.length >= n) break;
    if (isExcluded?.(c)) continue;
    out.push(c);
  }
  return out;
}
