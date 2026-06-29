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

// A boosted lane LEADS the feed: this dominating term sits far above any base
// importance score or position, so when a leader narrows to a lane, that lane
// fills the top of the deck (up to supply) rather than just nudging up a few
// slots. Domination, not a gentle lift - that is what "tune to economics and I
// expect mostly economics" demands.
const BOOST_BLOCK = 1_000_000;
const PRACTICAL_LIFT = 3; // within a group, the practical bias floats actionable lanes up
const BIG_PER_SOURCE = 1.6; // within a group, "biggest moves" floats multi-source stories up
const ROLE_FIT_WEIGHT = 3; // within a group, float lanes that fit the leader's role/business
// The "zeitgeist" nudge: lanes the broader cohort of leaders is anxious about
// right now (the portfolio-pulse aggregate). Deliberately GENTLE - far below the
// leader's own boost/bias/fit - so it only breaks ties among similar-importance
// cards and never overrides a personal choice. Off unless a meaningful set is
// supplied (the hook guards on volume, so thin data has no effect).
const ZEITGEIST_LIFT = 0.5;

// Per-category suitability to the leader's role + business, 0..1 (see
// roleArchetype.ts). Optional: when absent, ranking ignores role fit entirely.
export type RoleFit = Partial<Record<NewsCategoryId, number>>;

/** True when the leader has not tuned anything: pure world-importance order. */
function isNeutral(prefs: NewsPreferences): boolean {
  return prefs.boosted.length === 0 && prefs.bias === 'balanced';
}

/** Whether a card sits in one of the leader's chosen lanes. */
export function isBoosted(card: RankableCard, prefs: NewsPreferences): boolean {
  const cat = card.category as NewsCategoryId | undefined;
  return !!cat && prefs.boosted.includes(cat);
}

/**
 * The scan-bias lift (no base, no boost). This is a SECONDARY ordering applied
 * within a group (boosted vs the rest): "practical" floats actionable lanes up,
 * "biggest moves" floats widely-reported (multi-source) stories up. Visible on
 * its own (tune only the scan, lanes untouched) and on top of a lane choice.
 */
function biasLift(card: RankableCard, bias: NewsBias): number {
  const cat = card.category as NewsCategoryId | undefined;
  if (bias === 'practical') return cat && PRACTICAL_CATEGORIES.has(cat) ? PRACTICAL_LIFT : 0;
  if (bias === 'big') {
    const sources = typeof card.sourceCount === 'number' ? card.sourceCount : 1;
    return Math.max(0, sources - 1) * BIG_PER_SOURCE;
  }
  return 0;
}

/**
 * The personalized score of a card given the leader's preferences. Higher ranks
 * first. A boosted lane dominates (BOOST_BLOCK); the scan bias orders within.
 * Built on top of the supplied base (importance score or feed position).
 */
export function priorityScore(card: RankableCard, prefs: NewsPreferences): number {
  const base = typeof card.score === 'number' ? card.score : 0;
  return base + (isBoosted(card, prefs) ? BOOST_BLOCK : 0) + biasLift(card, prefs.bias);
}

/** The role/business suitability lift for a card's lane (0 when no fit given). */
function fitLift(card: RankableCard, fit: RoleFit | undefined): number {
  if (!fit) return 0;
  const cat = card.category as NewsCategoryId | undefined;
  return cat ? ROLE_FIT_WEIGHT * (fit[cat] ?? 0) : 0;
}

// The cohort-anxiety nudge: lanes the wider set of leaders is grappling with
// right now. A gentle tie-breaker, never a dominator.
export type ZeitgeistLanes = ReadonlySet<NewsCategoryId>;

function zeitgeistLift(card: RankableCard, zeitgeist: ZeitgeistLanes | undefined): number {
  if (!zeitgeist || zeitgeist.size === 0) return 0;
  const cat = card.category as NewsCategoryId | undefined;
  return cat && zeitgeist.has(cat) ? ZEITGEIST_LIFT : 0;
}

/** Shared ordering core: stable sort by (boosted block + bias lift + role fit +
 * zeitgeist nudge + base), with the original index as the tiebreak so equal
 * cards keep order. */
function rankCore<T extends RankableCard>(
  cards: T[],
  prefs: NewsPreferences,
  baseOf: (card: T, index: number, total: number) => number,
  fit: RoleFit | undefined,
  zeitgeist?: ZeitgeistLanes,
): T[] {
  const n = cards.length;
  const scored = cards.map((c, i) => ({
    c,
    i,
    s:
      baseOf(c, i, n) +
      (isBoosted(c, prefs) ? BOOST_BLOCK : 0) +
      biasLift(c, prefs.bias) +
      fitLift(c, fit) +
      zeitgeistLift(c, zeitgeist),
  }));
  scored.sort((a, b) => (b.s - a.s) || (a.i - b.i));
  return scored.map((x) => x.c);
}

/**
 * Re-rank the GENERIC shared pool by the leader's preferences. The spine is the
 * server world-importance score; a chosen lane leads, the scan bias orders, and
 * (when supplied) role/business fit sharpens the order within each group.
 * Returns a new array.
 */
export function rankByPreferences<T extends RankableCard>(
  cards: T[],
  prefs: NewsPreferences,
  fit?: RoleFit,
  zeitgeist?: ZeitgeistLanes,
): T[] {
  return rankCore(cards, prefs, (c) => (typeof c.score === 'number' ? c.score : 0), fit, zeitgeist);
}

/**
 * Re-rank an ALREADY-PERSONALIZED feed by the leader's preferences without
 * fighting the server. The spine here is the incoming POSITION (the server's
 * per-user order), NOT card.score - using the score would re-introduce the
 * generic ranking math and undo the engine's personalization. A chosen lane
 * still leads (BOOST_BLOCK); within each group the server's order is preserved
 * and the scan bias floats stories up.
 *
 * Neutral prefs are an exact identity (the server order is authoritative and
 * untouched), so an untuned leader sees no change. Returns a new array.
 */
export function rankPersonalized<T extends RankableCard>(
  cards: T[],
  prefs: NewsPreferences,
  fit?: RoleFit,
  zeitgeist?: ZeitgeistLanes,
): T[] {
  // Untuned: the server order is authoritative (it already scored against the
  // brain, including role), so leave it - applying role fit or a cohort nudge
  // here would fight a feed that already knows this leader. The zeitgeist prior
  // is for the GENERIC pool (cold leaders), via rankByPreferences.
  if (isNeutral(prefs)) return cards;
  // base = position (n-i): index 0 keeps the highest base, ties broken by index.
  return rankCore(cards, prefs, (_c, i, n) => n - i, fit, zeitgeist);
}
