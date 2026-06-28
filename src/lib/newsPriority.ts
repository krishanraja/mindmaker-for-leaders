// newsPriority - how a leader's selected news priorities re-rank the shared
// industry feed into THEIR feed. Pure + unit-testable (no I/O, no React).
//
// Why this exists: live-headlines is one shared, daily-cached pool (cost: one
// gather/day for everyone). Personalization happens HERE, on the client, by
// re-scoring that pool against the leader's chosen priorities. Their selections
// are the signal (especially when their memory profile is still thin), exactly
// the "real-world options I can select from to finesse the scoring" the feed
// was asked for.

import type { NewsCategoryId } from '@/types/newsCategory';

// What serves the leader best when they scan in two seconds.
export type NewsBias = 'big' | 'practical' | 'balanced';

export interface NewsPreferences {
  // The category ids to lift to the top. Empty = neutral (pure world-importance
  // ranking), so a leader who never chose still gets a sensible feed.
  boosted: NewsCategoryId[];
  bias: NewsBias;
}

export const DEFAULT_NEWS_PREFERENCES: NewsPreferences = { boosted: [], bias: 'balanced' };

// The selectable priority GROUPS shown in the picker (human-facing), each
// mapping to one or more of the nine category ids. These are the "real-world
// options" a leader picks from.
export interface PriorityGroup {
  id: string;
  label: string;
  hint: string;
  categories: NewsCategoryId[];
}

export const PRIORITY_GROUPS: readonly PriorityGroup[] = [
  {
    id: 'capability',
    label: 'Frontier models & capability',
    hint: "New models, benchmarks, what's newly possible to build",
    categories: ['model'],
  },
  {
    id: 'build',
    label: 'Tools, infra & how-to',
    hint: 'Dev tools, agent frameworks, orchestration, real deployments to copy',
    categories: ['tools', 'orchestration', 'proof'],
  },
  {
    id: 'commercial',
    label: 'Economics, funding & GTM',
    hint: 'Pricing, cost curves, funding, packaging and go-to-market',
    categories: ['economics', 'product'],
  },
  {
    id: 'risk',
    label: 'Governance, security & people',
    hint: 'Regulation, AI risk/security, and how teams are changing',
    categories: ['governance', 'security', 'org'],
  },
] as const;

// The category ids the "practical & actionable" bias lifts: things a leader can
// act on now (tools to use, patterns to copy, packaging/pricing to mirror).
const PRACTICAL_CATEGORIES: ReadonlySet<NewsCategoryId> = new Set<NewsCategoryId>([
  'tools',
  'orchestration',
  'proof',
  'product',
]);

/** Map selected group ids to the flat set of category ids they boost. */
export function categoriesForGroups(groupIds: string[]): NewsCategoryId[] {
  const out = new Set<NewsCategoryId>();
  for (const g of PRIORITY_GROUPS) {
    if (groupIds.includes(g.id)) g.categories.forEach((c) => out.add(c));
  }
  return [...out];
}

/** The group ids currently covered by a preference's boosted categories (for the picker's selected state). */
export function groupsForCategories(boosted: NewsCategoryId[]): string[] {
  const set = new Set(boosted);
  // a group is "on" if all its categories are boosted
  return PRIORITY_GROUPS.filter((g) => g.categories.every((c) => set.has(c))).map((g) => g.id);
}

// A card as the ranker needs to see it (a subset of the deck/headline card).
export interface RankableCard {
  category?: NewsCategoryId | string | null;
  score?: number | null; // server importance (corroboration x reputation x freshness x engagement)
  sourceCount?: number | null; // corroboration depth (proxy for "a big, widely-reported move")
}

const BOOST_PRIORITY = 5; // a chosen lane outranks an unchosen one of similar world-importance
const BOOST_PRACTICAL = 3;
const BIG_PER_SOURCE = 1.6; // each extra corroborating outlet, when bias = "biggest moves"

/** True when the leader has not tuned anything: pure world-importance order. */
function isNeutral(prefs: NewsPreferences): boolean {
  return prefs.boosted.length === 0 && prefs.bias === 'balanced';
}

/**
 * The additive lift a card earns from the leader's preferences alone (no base
 * score). This is what a chosen lane / scan bias adds on TOP of whatever the
 * ranking spine is - the server importance score (generic pool) or the server
 * position (personalized feed).
 */
function priorityLift(card: RankableCard, prefs: NewsPreferences): number {
  const cat = card.category as NewsCategoryId | undefined;
  let s = 0;
  if (cat && prefs.boosted.includes(cat)) s += BOOST_PRIORITY;
  if (prefs.bias === 'practical') {
    if (cat && PRACTICAL_CATEGORIES.has(cat)) s += BOOST_PRACTICAL;
  } else if (prefs.bias === 'big') {
    const sources = typeof card.sourceCount === 'number' ? card.sourceCount : 1;
    s += Math.max(0, sources - 1) * BIG_PER_SOURCE;
  }
  return s;
}

/**
 * The personalized score of a card given the leader's preferences. Higher ranks
 * first. Built on the server importance score, then lifted by the leader's
 * chosen lanes and their scan bias.
 */
export function priorityScore(card: RankableCard, prefs: NewsPreferences): number {
  const base = typeof card.score === 'number' ? card.score : 0;
  return base + priorityLift(card, prefs);
}

/** Keep variety: a per-category cap stops one lane filling the feed; overflow
 * is appended last so nothing is lost. Operates on an already-ordered list. */
function capByCategory<T extends RankableCard>(ordered: T[], maxPerCategory: number): T[] {
  const taken = new Map<string, number>();
  const out: T[] = [];
  const overflow: T[] = [];
  for (const c of ordered) {
    const key = (c.category as string) || '_';
    const n = taken.get(key) ?? 0;
    if (n >= maxPerCategory) {
      overflow.push(c);
      continue;
    }
    taken.set(key, n + 1);
    out.push(c);
  }
  return [...out, ...overflow];
}

/**
 * Re-rank the GENERIC shared pool by the leader's preferences. The spine is the
 * server world-importance score; chosen lanes/bias lift on top. Stable for equal
 * scores (preserves the server's order). Returns a new array.
 */
export function rankByPreferences<T extends RankableCard>(
  cards: T[],
  prefs: NewsPreferences,
  maxPerCategory = 3,
): T[] {
  const scored = cards.map((c, i) => ({ c, i, s: priorityScore(c, prefs) }));
  scored.sort((a, b) => (b.s - a.s) || (a.i - b.i));
  return capByCategory(scored.map((x) => x.c), maxPerCategory);
}

/**
 * Re-rank an ALREADY-PERSONALIZED feed by the leader's preferences without
 * fighting the server. The spine here is the incoming POSITION (the server's
 * per-user order), NOT card.score - using the score would re-introduce the
 * generic ranking math and undo the engine's personalization. A chosen lane
 * lifts a card a few slots; it nudges, never nukes, the server order.
 *
 * Neutral prefs are an exact identity (the server order is authoritative and
 * untouched - not even the variety cap runs), so an untuned leader sees no
 * change. Returns a new array.
 */
export function rankPersonalized<T extends RankableCard>(
  cards: T[],
  prefs: NewsPreferences,
  maxPerCategory = 3,
): T[] {
  if (isNeutral(prefs)) return cards;
  const n = cards.length;
  // base = position (n-i): index 0 keeps the highest base, ties broken by index.
  const scored = cards.map((c, i) => ({ c, i, s: (n - i) + priorityLift(c, prefs) }));
  scored.sort((a, b) => (b.s - a.s) || (a.i - b.i));
  return capByCategory(scored.map((x) => x.c), maxPerCategory);
}
