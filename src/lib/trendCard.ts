/**
 * trendCard - turn the shared structural-shift ("trend") feed into the ONE
 * Home "shift" card most relevant to this leader.
 *
 * The detect-trends edge function returns a small set of current shifts (shared,
 * generic industry insight). This module (pure + testable, like newsPriority.ts
 * and cardForYou.ts) picks the shift whose lane best fits the leader's role +
 * business (roleFitByCategory), and shapes it into a DeckCard. The card leads
 * with the shift and, unlike a news card, its primary action WEIGHS what the
 * shift means for the org - pattern -> implication -> decision.
 */
import type { DeckCard, TrendEvidence } from '@/types/cockpit';
import type { NewsCategoryId } from '@/types/newsCategory';

// The server (detect-trends) shift shape, camelCase.
export interface TrendItem {
  id: string;
  category: NewsCategoryId | string;
  title: string;
  summary: string; // what's changing
  implication: string; // what it means for how you organise
  evidence: TrendEvidence[];
  daySpan: number;
  sourceCount: number;
  momentum: number;
  seed?: boolean; // an evergreen curated shift, not a freshly detected one
}

/**
 * Pick the single most role-relevant current shift: highest role-fit of the
 * shift's lane, breaking ties by momentum. Returns null for an empty feed.
 */
export function pickTopTrend(
  trends: TrendItem[] | null | undefined,
  fit: Partial<Record<NewsCategoryId, number>> | undefined,
): TrendItem | null {
  if (!Array.isArray(trends) || trends.length === 0) return null;
  const scored = trends.map((t, i) => ({
    t,
    i,
    fit: fit?.[t.category as NewsCategoryId] ?? 0.5,
  }));
  scored.sort((a, b) => (b.fit - a.fit) || (b.t.momentum - a.t.momentum) || (a.i - b.i));
  return scored[0].t;
}

/** Calendar span of the evidence, as a plain label ("over 2 weeks"). */
function spanLabel(evidence: TrendEvidence[]): string | null {
  const times = evidence
    .map((e) => (e.date ? Date.parse(`${e.date}T00:00:00Z`) : NaN))
    .filter((t) => Number.isFinite(t)) as number[];
  if (times.length < 2) return null;
  const days = (Math.max(...times) - Math.min(...times)) / 86_400_000;
  if (days < 10) return 'this week';
  const weeks = Math.round(days / 7);
  return `over ${weeks} weeks`;
}

/** The story -> decision seam for a shift: weigh the ORG implication. */
export function trendWeighPrefill(t: TrendItem): string {
  const clean = t.title.trim().replace(/\.$/, '');
  return `Given the shift "${clean}", should we change how our team or org is set up to build with AI right now?`;
}

/** Shape a shift into the Home "shift" DeckCard. */
export function trendToDeckCard(t: TrendItem): DeckCard {
  const stories = t.evidence?.length ?? 0;
  return {
    id: `trend-${t.id}`,
    kind: 'trend',
    eyebrow: 'The shift',
    category: (t.category as NewsCategoryId) ?? null,
    headline: t.title.trim(),
    say: t.summary?.trim() || null,
    // the org implication rides in `pov`; the read sheet shows it as
    // "For your org" (TrendCard itself doesn't render pov).
    pov: t.implication?.trim() || null,
    // temporal corroboration: the honest "why I'm flagging this" chip.
    corroboration: t.seed || stories === 0 ? 'An ongoing shift' : `across ${stories} stories`,
    timeAgo: t.seed ? null : spanLabel(t.evidence),
    route: '/decision',
    prefill: trendWeighPrefill(t),
    evidence: t.seed ? [] : (t.evidence ?? []),
  };
}
