// Reliability tiering for retrieved evidence. Replaces the render-time heuristic in
// StoneDeeper with a REAL value stamped honestly at insert. Pure + deterministic so
// the pipeline insert and the enrich-decision re-run produce identical tiers.
//
// Tiers (decision_evidence.reliability_tier):
//   primary    - official / pricing / filing / gov / first-party primary source
//   reputable  - major news / research / known analyst or press
//   community  - blog / forum / community-authored
//   unverified - everything else (thin, link-only, unknown provenance) - the honest default
//
// Honesty rule (Krish): surface a tier ONLY where the source actually earns it. When the
// provenance is unknown (a generic web hit on an unrecognised domain), the honest answer
// is 'unverified', NOT a flattering guess.

import type { Evidence } from "./types.ts";

export type ReliabilityTier = "primary" | "reputable" | "community" | "unverified";

// Retrievers that, by their nature, return a first-party / official primary datum.
// BuiltWith reports the site's own detected stack; Tranco is a measured ranking; PDL is
// firmographic record data; Artificial Analysis is a measured model benchmark standing.
// These are primary regardless of the URL host.
const PRIMARY_RETRIEVERS = new Set(["builtwith", "tranco", "pdl", "artificialanalysis"]);
// Retrievers that return press / news items.
const NEWS_RETRIEVERS = new Set(["newsapi"]);

// Host suffix groups for the search retrievers (perplexity / exa / brave / tavily),
// whose trustworthiness turns on WHERE the citation points, not the search engine.
const PRIMARY_HOST_RE =
  /(?:^|\.)(?:gov|mil|edu|int|gov\.[a-z]{2,3}|europa\.eu|sec\.gov|federalreserve\.gov|who\.int|imf\.org|worldbank\.org)$/i;
const PRIMARY_HOST_KEYWORDS = /(?:investor|investors|ir|pricing|press(?:room)?|filings?|sec|annualreport)\./i;
const REPUTABLE_HOSTS = new Set([
  "nytimes.com", "wsj.com", "ft.com", "economist.com", "reuters.com", "apnews.com",
  "bloomberg.com", "bbc.com", "bbc.co.uk", "theguardian.com", "washingtonpost.com",
  "forbes.com", "fortune.com", "businessinsider.com", "cnbc.com", "techcrunch.com",
  "theverge.com", "wired.com", "arstechnica.com", "axios.com", "politico.com",
  "hbr.org", "mckinsey.com", "bain.com", "bcg.com", "gartner.com", "forrester.com",
  "pewresearch.org", "statista.com", "nature.com", "science.org", "arxiv.org",
  "crunchbase.com", "pitchbook.com",
]);
const COMMUNITY_HOST_RE =
  /(?:^|\.)(?:medium\.com|substack\.com|wordpress\.com|blogspot\.com|reddit\.com|quora\.com|news\.ycombinator\.com|ycombinator\.com|stackexchange\.com|stackoverflow\.com|github\.io|dev\.to|tumblr\.com)$/i;
const COMMUNITY_HOST_KEYWORDS = /(?:^|\.)(?:blog|forum|community|wiki)\./i;

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch (_e) {
    return null;
  }
}

function reputableBaseDomain(host: string): boolean {
  if (REPUTABLE_HOSTS.has(host)) return true;
  // Match a reputable apex even with a subdomain (e.g. www2.nytimes.com handled above;
  // here catch e.g. graphics.wsj.com -> wsj.com).
  for (const d of REPUTABLE_HOSTS) {
    if (host === d || host.endsWith(`.${d}`)) return true;
  }
  return false;
}

/**
 * Classify one evidence row into a reliability tier, honestly. Considers the retriever
 * (its inherent source class), an explicit source_type hint when present, and - for the
 * web-search retrievers - the citation host. Unknown provenance => 'unverified'.
 */
export function classifyReliability(e: {
  retriever?: string | null;
  source_type?: string | null;
  source_url?: string | null;
}): ReliabilityTier {
  const retriever = (e.retriever ?? "").toLowerCase();
  const sourceType = (e.source_type ?? "").toLowerCase();

  // Explicit primary signals in an upstream source_type override everything.
  if (/\b(official|pricing|filing|primary|gov|government|sec|first[-_ ]?party)\b/.test(sourceType)) return "primary";
  if (/\b(news|press|research|reputable|analyst|journal)\b/.test(sourceType)) return "reputable";
  if (/\b(blog|forum|community|wiki|social)\b/.test(sourceType)) return "community";

  // Retriever-inherent classes.
  if (PRIMARY_RETRIEVERS.has(retriever)) return "primary";
  if (NEWS_RETRIEVERS.has(retriever)) return "reputable";

  // Search retrievers (perplexity / exa / brave / tavily / memory): tier by the host.
  const host = hostOf(e.source_url);
  if (host) {
    if (PRIMARY_HOST_RE.test(host) || PRIMARY_HOST_KEYWORDS.test(host)) return "primary";
    if (reputableBaseDomain(host)) return "reputable";
    if (COMMUNITY_HOST_RE.test(host) || COMMUNITY_HOST_KEYWORDS.test(host)) return "community";
  }

  // Unknown provenance: the honest default is 'unverified', not a flattering guess.
  return "unverified";
}

/** Stamp a tier onto a retrieved Evidence (source_type is set to the retriever upstream). */
export function tierForEvidence(e: Evidence): ReliabilityTier {
  return classifyReliability({ retriever: e.retriever, source_type: e.retriever, source_url: e.source_url });
}

// --- The single 0-100 evidence score (freshness + reliability + corroboration) -----------
//
// One honest, sortable number per source so the UI can show a compact score ring instead of
// making the leader read a paragraph to judge trust. Pure + deterministic so all three insert
// paths (pipeline / enrich / research) agree and the value never drifts the way a render-time
// heuristic would.

const TIER_WEIGHT: Record<ReliabilityTier, number> = {
  primary: 100,
  reputable: 80,
  community: 50,
  unverified: 30,
};

/**
 * Freshness 0..1 from a published date. Fresh (<= 30d) = 1.0, then a linear decay to a 0.3
 * floor by ~3y. An UNKNOWN date returns a neutral 0.6 (neither fresh nor stale) - we never
 * punish a source for a date the retriever did not surface, and never flatter a stale one.
 */
function freshness(publishedAt: string | null | undefined): number {
  if (!publishedAt) return 0.6;
  const ts = Date.parse(publishedAt);
  if (!Number.isFinite(ts)) return 0.6;
  const days = (Date.now() - ts) / 86_400_000;
  if (days < 0) return 0.6; // a future date is suspect, not "extra fresh"
  if (days <= 30) return 1;
  return Math.max(0.3, 1 - (days - 30) / 1000); // ~0.3 floor near 3 years
}

/**
 * Combine reliability tier (the spine), freshness, retrieval relevance, and the claim's
 * corroboration into one 0-100 score. `corroboration` is the number of INDEPENDENT supporting
 * domains for the WHOLE claim (countIndependentSupport from corroboration.ts), applied to every
 * row of that claim - a row sitting inside a well-corroborated claim earns a small bump.
 *
 * relevance_score is Exa-only; for every other retriever it is null, so we default to a neutral
 * 0.7 rather than penalise a Perplexity/Brave row for a field its API never returns.
 */
export function scoreEvidence(
  e: {
    retriever?: string | null;
    source_type?: string | null;
    source_url?: string | null;
    published_at?: string | null;
    relevance_score?: number | null;
  },
  corroboration: number,
): number {
  const tier = TIER_WEIGHT[classifyReliability(e)];
  const fresh = freshness(e.published_at);
  const relevance =
    typeof e.relevance_score === "number" ? Math.max(0, Math.min(1, e.relevance_score)) : 0.7;
  const corrobBump = Math.min(Math.max(corroboration, 0), 3) * 5; // +0..15 for independent backing
  const base = tier * 0.6 + fresh * 100 * 0.2 + relevance * 100 * 0.2;
  return Math.round(Math.min(100, base + corrobBump));
}

/**
 * Build the canonical decision_evidence insert row from a retrieved Evidence. The single place
 * the three insert paths (decision-engine/pipeline, enrich-decision, decision-research) agree on
 * the persisted shape - including the honestly-stamped reliability_tier, the captured
 * published_at, and the computed evidence_score - so a new field can never silently ship from
 * one path and not the others.
 */
export function buildEvidenceRow(
  e: Evidence,
  opts: { userId: string; claimId: string; corroboration: number },
): {
  claim_id: string;
  user_id: string;
  source_url: string | null;
  source_type: string;
  source_title: string | null;
  excerpt: string | null;
  stance: string;
  retriever: string;
  relevance_score: number | null;
  reliability_tier: ReliabilityTier;
  published_at: string | null;
  evidence_score: number;
} {
  return {
    claim_id: opts.claimId,
    user_id: opts.userId,
    source_url: e.source_url,
    source_type: e.retriever,
    source_title: e.source_title,
    excerpt: e.excerpt,
    stance: e.stance,
    retriever: e.retriever,
    relevance_score: e.relevance_score,
    reliability_tier: tierForEvidence(e),
    published_at: e.published_at ?? null,
    evidence_score: scoreEvidence(e, opts.corroboration),
  };
}
