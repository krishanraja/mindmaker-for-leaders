/**
 * news-cluster - the cross-verification core for the Home live-headlines feed,
 * as pure, unit-testable helpers (no I/O).
 *
 * Strategy (docs/MAIN-APP-POLISH-SPEC.md North Star + the multi-source plan):
 * the quality lever for free news is not a fancier vendor, it is corroboration.
 * We gather the same day's stories from several free sources (GDELT, Hacker
 * News, a curated RSS allowlist, Brave) and cluster near-duplicate headlines
 * ACROSS sources. A story carried by several independent reputable outlets is
 * trustworthy and ranks high; a lone blog rehash ranks low. The count of
 * distinct corroborating sources becomes a real product signal.
 *
 * These functions take already-fetched, normalized articles and do the
 * clustering + ranking deterministically so the behaviour is testable and the
 * edge function stays a thin orchestrator.
 */

// A single article from any source, normalized to a common shape. Fetchers in
// news-sources.ts produce these; this module never does I/O.
export interface RawArticle {
  title: string;
  url: string;
  description: string;
  source: string; // bare hostname / outlet, e.g. "reuters.com"
  publishedIso: string | null;
  engagement: number; // HN points (or any 0+ attention signal); 0 when unknown
  sourceTier: number; // reputation weight: 3 = primary/top-tier, 2 = strong, 1 = generic
  origin: "brave" | "gdelt" | "hn" | "rss";
}

// A cluster of articles judged to be the same story across sources.
export interface Cluster {
  rep: RawArticle; // the representative (best) article in the cluster
  sources: string[]; // distinct corroborating sources (deduped hostnames)
  sourceCount: number; // sources.length, the corroboration signal
  maxEngagement: number;
  bestPublishedIso: string | null; // freshest published timestamp in the cluster
  blob: string; // combined title + description text for AI-native test + tagging
  score: number; // ranking score (set by scoreClusters)
}

// Stopwords stripped before title tokenization so clustering keys on the
// content words ("openai launches gpt-5" -> {openai, launches, gpt5}).
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "for", "to", "of", "in", "on", "at",
  "by", "with", "from", "as", "is", "are", "was", "were", "be", "been", "it",
  "its", "this", "that", "these", "those", "new", "now", "how", "why", "what",
  "who", "will", "can", "could", "should", "would", "has", "have", "had", "you",
  "your", "we", "our", "they", "their", "he", "she", "his", "her", "than",
  "into", "over", "after", "amid", "says", "say", "said", "report", "reports",
]);

/**
 * Significant tokens of a title: lowercased, punctuation-stripped, stopwords
 * removed, very short tokens dropped. Numbers and model names (gpt4, o3) survive
 * because they are highly discriminative for AI stories.
 */
export function titleTokens(title: string): Set<string> {
  const toks = (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return new Set(toks);
}

/** Jaccard similarity of two token sets (0..1). Empty sets => 0. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Two headlines are "the same story" at or above this title-token similarity.
// 0.5 is deliberately moderate: high enough to avoid merging distinct stories,
// low enough to catch the same event reworded across outlets.
export const CLUSTER_THRESHOLD = 0.5;

/**
 * Cluster articles by headline similarity across sources. Greedy single-pass:
 * articles are processed best-first (tier, then engagement, then freshness) so
 * the representative of each cluster is its strongest member. An article joins
 * the first existing cluster whose representative title is similar enough; else
 * it starts a new cluster.
 */
export function clusterArticles(
  articles: RawArticle[],
  threshold = CLUSTER_THRESHOLD,
): Cluster[] {
  const ranked = [...articles].sort(compareArticleStrength);
  const clusters: Array<Cluster & { repTokens: Set<string> }> = [];

  for (const art of ranked) {
    const toks = titleTokens(art.title);
    let placed = false;
    for (const c of clusters) {
      if (jaccard(toks, c.repTokens) >= threshold) {
        if (!c.sources.includes(art.source)) c.sources.push(art.source);
        c.sourceCount = c.sources.length;
        c.maxEngagement = Math.max(c.maxEngagement, art.engagement);
        c.bestPublishedIso = freshest(c.bestPublishedIso, art.publishedIso);
        // keep the rep's blob but enrich description if the rep had none
        if (!c.rep.description && art.description) {
          c.blob = `${c.rep.title} ${art.description}`.trim();
        }
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({
        rep: art,
        repTokens: toks,
        sources: [art.source],
        sourceCount: 1,
        maxEngagement: art.engagement,
        bestPublishedIso: art.publishedIso,
        blob: `${art.title} ${art.description}`.trim(),
        score: 0,
      });
    }
  }

  // strip the internal repTokens before returning
  return clusters.map(({ repTokens: _drop, ...c }) => c);
}

/** Sort comparator: stronger article first (higher tier, engagement, fresher). */
export function compareArticleStrength(a: RawArticle, b: RawArticle): number {
  if (b.sourceTier !== a.sourceTier) return b.sourceTier - a.sourceTier;
  if (b.engagement !== a.engagement) return b.engagement - a.engagement;
  const ta = a.publishedIso ? Date.parse(a.publishedIso) : 0;
  const tb = b.publishedIso ? Date.parse(b.publishedIso) : 0;
  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
}

/** The fresher of two ISO timestamps (either may be null). */
export function freshest(a: string | null, b: string | null): string | null {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (!Number.isFinite(ta)) return Number.isFinite(tb) ? b : a;
  if (!Number.isFinite(tb)) return a;
  return tb > ta ? b : a;
}

/**
 * Score every cluster for ranking. The signal blends, in order of weight:
 *   - corroboration: distinct source count (the trust lever), capped at 4
 *   - reputation: the representative's source tier
 *   - freshness: exponential-ish decay over hours since published
 *   - engagement: log-damped HN attention
 * Returns the same clusters with `score` populated (mutates + returns).
 */
export function scoreClusters(clusters: Cluster[], nowMs: number = Date.now()): Cluster[] {
  for (const c of clusters) {
    const corroboration = Math.min(c.sourceCount, 4) * 3.0; // dominant signal
    const reputation = c.rep.sourceTier * 1.5;
    const freshness = freshnessScore(c.bestPublishedIso, nowMs) * 2.0;
    const engagement = Math.log10(1 + Math.max(0, c.maxEngagement)) * 0.8;
    c.score = corroboration + reputation + freshness + engagement;
  }
  return clusters;
}

/** Freshness in 0..1: 1 at publish, ~0.5 at 24h, decaying toward 0 by ~4 days. */
export function freshnessScore(publishedIso: string | null, nowMs: number): number {
  if (!publishedIso) return 0.4; // unknown date: middling, never top
  const t = Date.parse(publishedIso);
  if (!Number.isFinite(t)) return 0.4;
  const hours = Math.max(0, (nowMs - t) / 3_600_000);
  return 1 / (1 + hours / 24); // 1.0 now, 0.5 at 24h, 0.25 at 72h
}

/**
 * Select the final set of clusters, balanced across categories so the deck
 * spans the nine AI-native lanes rather than over-indexing on one. Round-robin:
 * take the top-scored cluster from each category bucket in turn until `max` is
 * reached or buckets are exhausted. Within a bucket, higher score first.
 *
 * @param categoryOf maps a cluster to its category id (the caller classifies).
 */
export function selectBalanced(
  clusters: Cluster[],
  categoryOf: (c: Cluster) => string,
  max: number,
): Cluster[] {
  const buckets = new Map<string, Cluster[]>();
  for (const c of clusters) {
    const cat = categoryOf(c);
    const arr = buckets.get(cat) ?? [];
    arr.push(c);
    buckets.set(cat, arr);
  }
  for (const arr of buckets.values()) arr.sort((a, b) => b.score - a.score);

  // Order categories by their strongest cluster so the best lanes lead.
  const cats = [...buckets.keys()].sort(
    (a, b) => (buckets.get(b)![0]?.score ?? 0) - (buckets.get(a)![0]?.score ?? 0),
  );

  const out: Cluster[] = [];
  let round = 0;
  let added = true;
  while (out.length < max && added) {
    added = false;
    for (const cat of cats) {
      const arr = buckets.get(cat)!;
      if (round < arr.length) {
        out.push(arr[round]);
        added = true;
        if (out.length >= max) break;
      }
    }
    round++;
  }
  return out;
}

/**
 * A human corroboration label for a cluster's source row, e.g.
 *   1 source  -> null (the source name already shows; no "+N")
 *   2 sources -> "+1 source"
 *   4 sources -> "+3 sources"
 * Rendered as a small chip next to the representative source on the card.
 */
export function corroborationLabel(sourceCount: number): string | null {
  const others = sourceCount - 1;
  if (others <= 0) return null;
  return `+${others} source${others === 1 ? "" : "s"}`;
}
