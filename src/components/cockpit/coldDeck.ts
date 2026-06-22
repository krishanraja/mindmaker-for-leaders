// The cold-start fallback deck: generic, AI-native industry headlines that render
// on Home BEFORE a leader has any of their own briefing/signals.
//
// THE EMPTY-HOME FIX. `useCockpit` builds its deck from the leader's own latest
// `briefings.segments` (per-user, RLS owner-scoped) interleaved with their own
// `decision_alerts`. A brand-new account has neither, so the deck is empty and
// Home shows nothing ("nothing on fire"). Home must NEVER be empty: it is the
// industry read first, personalized second. So when the live deck is empty we
// fall back to this curated, in-app set of AI-native headlines (no network, no
// auth, never empty), and weave the leader's own signals in the moment they exist.
//
// Voice + shape match the briefing pipeline's segments (headline + one plain
// "why it matters" line + category + source/time + an honest, optional figure),
// and the nine locked AI-native categories (src/types/newsCategory.ts). These are
// evergreen, plainly worded reads of the AI shift, not dated scoops; they are the
// orientation deck a first-time leader browses while their own world fills in.

import type { DeckCard } from '@/types/cockpit';

// The curated cold deck. Ordered strongest-first (the lead card a fresh leader
// sees). Plain language, AI-native, no em dashes, honest figures only where the
// claim itself carries one.
export const COLD_DECK: DeckCard[] = [
  {
    id: 'cold-model',
    kind: 'news',
    eyebrow: 'Worth a look',
    category: 'model',
    headline: 'Frontier models cleared the long-context wall most teams design around',
    say: 'Work you split into chunks to fit a context window can increasingly run as one pass. The workaround you built may be optional now.',
    source: 'The shift',
    timeAgo: 'this week',
  },
  {
    id: 'cold-economics',
    kind: 'news',
    eyebrow: 'Worth a look',
    category: 'economics',
    headline: 'The cost to run a capable model keeps falling fast',
    say: 'Agents that were too expensive to run at scale keep crossing back under the line. Ideas you shelved on cost are worth a second look.',
    source: 'The shift',
    timeAgo: 'this week',
    magnitude: { value: '-40%', kind: 'modelled' },
  },
  {
    id: 'cold-proof',
    kind: 'news',
    eyebrow: 'Worth a look',
    category: 'proof',
    headline: 'Real deployments now clear two-thirds of routine support unaided',
    say: 'Proof that an agent can carry a whole tier of work, not just demo it. Useful evidence to point a board at.',
    source: 'The shift',
    timeAgo: 'recent',
    magnitude: { value: '67%', kind: 'modelled' },
  },
  {
    id: 'cold-orchestration',
    kind: 'news',
    eyebrow: 'Worth a look',
    category: 'orchestration',
    headline: 'Agent reliability is now an engineering discipline, not a prompt',
    say: 'The teams getting value run evals, guardrails and clean hand-offs. The gap between a demo and a system is process, not a better model.',
    source: 'The shift',
    timeAgo: 'recent',
  },
  {
    id: 'cold-product',
    kind: 'news',
    eyebrow: 'Worth a look',
    category: 'product',
    headline: 'Software is repackaging itself around the AI capability, not the seat',
    say: 'A clean template for charging for what the AI does, not per login. Worth holding against your own pricing model.',
    source: 'The shift',
    timeAgo: 'recent',
  },
  {
    id: 'cold-security',
    kind: 'news',
    eyebrow: 'Worth a look',
    category: 'security',
    headline: 'If an agent reads inbound text and can act, prompt injection is your threat model',
    say: 'Any agent that ingests untrusted input and takes actions needs a guardrail. This is the new baseline, not an edge case.',
    source: 'The shift',
    timeAgo: 'recent',
  },
  {
    id: 'cold-governance',
    kind: 'news',
    eyebrow: 'Worth a look',
    category: 'governance',
    headline: 'When an agent touches a hiring, credit or refund call, you owe an audit trail',
    say: 'Regulation is catching up to autonomous decisions. If an agent is in a high-stakes loop, plan for the paper trail now.',
    source: 'The shift',
    timeAgo: 'recent',
  },
];
