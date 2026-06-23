/**
 * news-sources - the free multi-source gather layer for the Home live feed.
 *
 * Each fetcher pulls the day's AI stories from one source and normalizes them to
 * a RawArticle. All are best-effort: a failed/slow source returns [] and never
 * breaks the feed. The strategically-best FREE combination:
 *   - GDELT        (open, no key)  : huge global breadth + structured metadata
 *   - Hacker News  (open, no key)  : community-validated AI/dev signal (points)
 *   - curated RSS  (open, no key)  : quality controlled by a reputable allowlist
 *   - Brave News   (BRAVE_SEARCH_API): fresh mainstream coverage
 * Clustering across these (news-cluster.ts) is what verifies stories against
 * one another. No new API keys are required for this baseline.
 */

import type { RawArticle } from "./news-cluster.ts";

const DEFAULT_TIMEOUT_MS = 7_000;

// --- reputation: a small allowlist that bumps known-good outlets. Everything
// else is tier 1 (generic). RSS allowlist outlets and primary sources get the
// top tiers because we curated them. Keys are bare hostnames (no www.).
const TIER_3 = new Set([
  "openai.com", "anthropic.com", "deepmind.google", "blog.google",
  "ai.googleblog.com", "huggingface.co", "research.google", "microsoft.com",
  "reuters.com", "apnews.com", "bloomberg.com", "ft.com", "wsj.com",
  "nature.com", "science.org",
]);
const TIER_2 = new Set([
  "technologyreview.com", "theverge.com", "arstechnica.com", "wired.com",
  "venturebeat.com", "techcrunch.com", "theinformation.com", "semianalysis.com",
  "simonwillison.net", "news.mit.edu", "stanford.edu", "berkeley.edu",
  "axios.com", "cnbc.com", "theregister.com", "zdnet.com", "nytimes.com",
]);

export function reputationTier(host: string): number {
  const h = host.replace(/^www\./, "").toLowerCase();
  if (TIER_3.has(h)) return 3;
  if (TIER_2.has(h)) return 2;
  // company/edu/gov primary sources tend to be trustworthy first-party reads
  if (/\.gov$/.test(h) || /\.edu$/.test(h)) return 2;
  return 1;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function stripHtml(s: string | null | undefined): string {
  return (s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getJson(url: string, headers: Record<string, string> = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getText(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      // A browser-like UA: several reputable feeds (the Verge, Ars) 403 a bare
      // bot UA. We still identify honestly via the trailing token.
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent":
          "Mozilla/5.0 (compatible; ctrl-news/1.0; +https://ctrl.themindmaker.ai)",
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// GDELT (open, no key): global news index. ArtList gives title/url/domain/date.
// ---------------------------------------------------------------------------
const GDELT_QUERY =
  '(("artificial intelligence" OR "AI model" OR "AI agent" OR "generative AI" OR LLM OR "large language model" OR OpenAI OR Anthropic) sourcelang:english)';

export async function fetchGdelt(maxRecords = 75): Promise<RawArticle[]> {
  const params = new URLSearchParams({
    query: GDELT_QUERY,
    mode: "ArtList",
    format: "json",
    maxrecords: String(maxRecords),
    timespan: "3d",
    sort: "DateDesc",
  });
  const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
  // GDELT frequently 429s, and it is our biggest breadth source so its flakiness
  // hurts most. One backoff retry recovers the common transient throttle without
  // slowing the gather when the first call succeeds.
  let data = await getJson(gdeltUrl);
  if (data === null) {
    await new Promise((r) => setTimeout(r, 1_500));
    data = await getJson(gdeltUrl);
  }
  const arts = (data as { articles?: Array<Record<string, unknown>> } | null)?.articles;
  if (!Array.isArray(arts)) return [];
  const out: RawArticle[] = [];
  for (const a of arts) {
    const url = typeof a.url === "string" ? a.url : "";
    const title = stripHtml(typeof a.title === "string" ? a.title : "");
    if (!url || !title) continue;
    const host = (typeof a.domain === "string" && a.domain) ? a.domain.replace(/^www\./, "") : hostOf(url);
    out.push({
      title,
      url,
      description: "",
      source: host,
      publishedIso: parseGdeltDate(typeof a.seendate === "string" ? a.seendate : null),
      engagement: 0,
      sourceTier: reputationTier(host),
      origin: "gdelt",
    });
  }
  return out;
}

// GDELT seendate is like "20260622T123000Z" or "20260622123000". Return ISO.
export function parseGdeltDate(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${se}Z`;
  return Number.isFinite(Date.parse(iso)) ? iso : null;
}

// ---------------------------------------------------------------------------
// Hacker News (Algolia, open, no key): community-validated signal with points.
// ---------------------------------------------------------------------------
const HN_QUERIES = ["AI", "LLM agents", "GPT OR Claude OR Gemini"];

export async function fetchHackerNews(): Promise<RawArticle[]> {
  const results = await Promise.all(
    HN_QUERIES.map((q) => {
      const params = new URLSearchParams({
        query: q,
        tags: "story",
        hitsPerPage: "25",
        numericFilters: "points>30",
      });
      return getJson(`https://hn.algolia.com/api/v1/search_by_date?${params}`);
    }),
  );
  const out: RawArticle[] = [];
  const seen = new Set<string>();
  for (const data of results) {
    const hits = (data as { hits?: Array<Record<string, unknown>> } | null)?.hits;
    if (!Array.isArray(hits)) continue;
    for (const h of hits) {
      const url = typeof h.url === "string" ? h.url : "";
      const title = stripHtml(typeof h.title === "string" ? h.title : "");
      if (!url || !title || seen.has(url)) continue; // skip Ask HN (no url) + dupes
      // Skip self-promotion posts (Show HN / Launch HN / Ask HN). These are
      // founder/project announcements, not the reputable industry news a chief
      // of staff needs; letting them through filled the feed with personal repos.
      if (/^(show|launch|ask)\s+hn[:\s]/i.test(title)) continue;
      seen.add(url);
      const host = hostOf(url);
      const points = typeof h.points === "number" ? h.points : 0;
      out.push({
        title,
        url,
        description: stripHtml(typeof h.story_text === "string" ? h.story_text : ""),
        source: host,
        publishedIso: typeof h.created_at === "string" ? h.created_at : null,
        engagement: points,
        // Honest reputation of the LINKED outlet: HN community attention is
        // captured by `engagement`, not by inflating the source tier. A story
        // HN surfaced from a reputable outlet still gets that outlet's tier.
        sourceTier: reputationTier(host),
        origin: "hn",
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Curated RSS allowlist (open, no key): quality is controlled by the outlet set.
// ---------------------------------------------------------------------------
// Breadth matters: GDELT rate-limits (429) and any single feed can fail, so a
// wide reputable allowlist keeps the deck full and raises the odds that a story
// is corroborated across outlets. All run in parallel under one timeout, so more
// feeds do not slow the gather. Per-source capping (capPerSource) stops any one
// prolific outlet from flooding, so it is safe to include high-volume blogs.
export const RSS_FEEDS: string[] = [
  // mainstream tech press
  "https://techcrunch.com/category/artificial-intelligence/feed/",
  "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  "https://venturebeat.com/category/ai/feed/",
  "https://www.technologyreview.com/topic/artificial-intelligence/feed",
  "https://feeds.arstechnica.com/arstechnica/technology-lab",
  "https://www.wired.com/feed/tag/ai/latest/rss",
  "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
  "https://www.theregister.com/headlines.atom",
  "https://the-decoder.com/feed/",
  "https://www.artificialintelligence-news.com/feed/",
  // primary sources / labs / vendors
  "https://openai.com/news/rss.xml",
  "https://huggingface.co/blog/feed.xml",
  "https://blog.google/technology/ai/rss/",
  "https://deepmind.google/blog/rss.xml",
  "https://blogs.microsoft.com/ai/feed/",
  "https://blogs.nvidia.com/feed/",
  // research / institutions / expert commentary
  "https://news.mit.edu/rss/topic/artificial-intelligence2",
  "https://simonwillison.net/atom/everything/",
  "https://importai.substack.com/feed",
];

export async function fetchRss(feeds: string[] = RSS_FEEDS, perFeed = 6): Promise<RawArticle[]> {
  const texts = await Promise.all(feeds.map((f) => getText(f)));
  const out: RawArticle[] = [];
  for (const xml of texts) {
    if (!xml) continue;
    out.push(...parseFeed(xml).slice(0, perFeed));
  }
  return out;
}

/**
 * Parse an RSS 2.0 or Atom feed into RawArticles via regex. The edge Deno
 * runtime has no DOMParser, and full XML parsing is overkill for the handful of
 * fields we need; this is a pragmatic, fault-tolerant extractor.
 */
export function parseFeed(xml: string): RawArticle[] {
  const out: RawArticle[] = [];
  const isAtom = /<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const itemRe = isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi;
  const items = xml.match(itemRe) ?? [];
  for (const item of items) {
    const title = stripHtml(firstMatch(item, /<title[^>]*>([\s\S]*?)<\/title>/i));
    const url = extractLink(item, isAtom);
    if (!title || !url) continue;
    const desc = stripHtml(
      firstMatch(item, /<description[^>]*>([\s\S]*?)<\/description>/i) ||
        firstMatch(item, /<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
        firstMatch(item, /<content[^>]*>([\s\S]*?)<\/content>/i),
    ).slice(0, 400);
    const dateRaw =
      firstMatch(item, /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
      firstMatch(item, /<published[^>]*>([\s\S]*?)<\/published>/i) ||
      firstMatch(item, /<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
      firstMatch(item, /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
    const host = hostOf(url);
    out.push({
      title,
      url,
      description: desc,
      source: host,
      publishedIso: normalizeDate(dateRaw),
      engagement: 0,
      sourceTier: Math.max(reputationTier(host), 2), // curated allowlist => >=2
      origin: "rss",
    });
  }
  return out;
}

function firstMatch(s: string, re: RegExp): string {
  const m = s.match(re);
  return m ? m[1].trim() : "";
}

function extractLink(item: string, isAtom: boolean): string {
  if (isAtom) {
    // prefer rel="alternate"; fall back to the first href
    const alt = item.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
    if (alt) return alt[1].trim();
    const any = item.match(/<link[^>]*href=["']([^"']+)["']/i);
    if (any) return any[1].trim();
    return "";
  }
  const rss = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  return rss ? stripHtml(rss[1]) : "";
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const t = Date.parse(raw.trim());
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

// ---------------------------------------------------------------------------
// Brave News (BRAVE_SEARCH_API): fresh mainstream coverage. Already keyed.
// ---------------------------------------------------------------------------
const BRAVE_QUERIES: string[] = [
  "new AI model release OR benchmark OR frontier model",
  "AI agents OR agent orchestration OR autonomous agents enterprise",
  "AI developer tools OR coding assistant OR LLM platform launch",
  "AI governance OR AI regulation OR AI safety policy",
  "enterprise AI adoption OR AI ROI OR AI deployment results",
];

interface BraveResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
  meta_url?: { hostname?: string };
}

export async function fetchBrave(apiKey: string): Promise<RawArticle[]> {
  const lanes = await Promise.all(
    BRAVE_QUERIES.map((q) => {
      const params = new URLSearchParams({
        q,
        freshness: "pw",
        count: "8",
        country: "US",
        search_lang: "en",
      });
      return getJson(
        `https://api.search.brave.com/res/v1/news/search?${params}`,
        { "Accept-Encoding": "gzip", "X-Subscription-Token": apiKey },
      );
    }),
  );
  const out: RawArticle[] = [];
  for (const data of lanes) {
    const results = (data as { results?: BraveResult[] } | null)?.results;
    if (!Array.isArray(results)) continue;
    for (const r of results) {
      const title = stripHtml(r.title);
      const url = typeof r.url === "string" ? r.url : "";
      if (!title || !url) continue;
      const host = (r.meta_url?.hostname || hostOf(url)).replace(/^www\./, "");
      out.push({
        title,
        url,
        description: stripHtml(r.description),
        source: host,
        publishedIso: r.page_age ?? null,
        engagement: 0,
        sourceTier: reputationTier(host),
        origin: "brave",
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// NewsAPI.org (NEWSAPI_KEY): a large mainstream aggregator. Adds breadth and,
// crucially, extra independent outlets so more stories cross the corroboration
// bar (the trust signal). One /v2/everything pass over an AI query, recent-first.
// ---------------------------------------------------------------------------
const NEWSAPI_QUERY =
  '"artificial intelligence" OR "AI model" OR "AI agent" OR "generative AI" OR LLM OR OpenAI OR Anthropic OR "Gemini" OR "Claude"';

export async function fetchNewsApi(apiKey: string, pageSize = 60): Promise<RawArticle[]> {
  const from = new Date(Date.now() - 3 * 24 * 3_600_000).toISOString().split("T")[0];
  const params = new URLSearchParams({
    q: NEWSAPI_QUERY,
    language: "en",
    sortBy: "publishedAt",
    pageSize: String(pageSize),
    from,
    searchIn: "title,description",
  });
  // Key sent as a header (not the query string) so it never lands in logs/caches.
  const data = await getJson(`https://newsapi.org/v2/everything?${params}`, { "X-Api-Key": apiKey });
  const arts = (data as { articles?: Array<Record<string, unknown>> } | null)?.articles;
  if (!Array.isArray(arts)) return [];
  const out: RawArticle[] = [];
  for (const a of arts) {
    const url = typeof a.url === "string" ? a.url : "";
    const title = stripHtml(typeof a.title === "string" ? a.title : "");
    if (!url || !title || /\[Removed\]/i.test(title)) continue;
    const host = hostOf(url);
    const src = a.source as { name?: string } | undefined;
    out.push({
      title,
      url,
      description: stripHtml(typeof a.description === "string" ? a.description : ""),
      source: host || (src?.name ?? ""),
      publishedIso: typeof a.publishedAt === "string" ? a.publishedAt : null,
      engagement: 0,
      sourceTier: reputationTier(host),
      origin: "newsapi",
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Exa (EXA_API_KEY): neural/semantic search built for finding high-signal
// content by MEANING, not keywords. This is the best complement to the keyword
// aggregators: it surfaces the specific AI-native stories (agent frameworks,
// model launches, real deployments) that keyword feeds miss, and it does not
// rate-limit like GDELT. A few intent-shaped queries, each recent-first.
// ---------------------------------------------------------------------------
const EXA_QUERIES: string[] = [
  "major new AI model release or benchmark result",
  "AI agent framework, orchestration, or autonomous agent launch for builders",
  "notable enterprise AI deployment or real-world results",
  "AI pricing, funding, or go-to-market move",
];

interface ExaResult {
  title?: string;
  url?: string;
  publishedDate?: string;
  text?: string;
  summary?: string;
}

export async function fetchExa(apiKey: string): Promise<RawArticle[]> {
  const startPublishedDate = new Date(Date.now() - 5 * 24 * 3_600_000).toISOString();
  const lanes = await Promise.all(
    EXA_QUERIES.map(async (q) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      try {
        const res = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            query: q,
            type: "auto",
            category: "news",
            numResults: 10,
            startPublishedDate,
            contents: { summary: true },
          }),
          signal: controller.signal,
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  const out: RawArticle[] = [];
  const seen = new Set<string>();
  for (const data of lanes) {
    const results = (data as { results?: ExaResult[] } | null)?.results;
    if (!Array.isArray(results)) continue;
    for (const r of results) {
      const url = typeof r.url === "string" ? r.url : "";
      const title = stripHtml(r.title);
      if (!url || !title || seen.has(url)) continue;
      seen.add(url);
      const host = hostOf(url);
      out.push({
        title,
        url,
        description: stripHtml(r.summary || r.text || "").slice(0, 400),
        source: host,
        publishedIso: r.publishedDate ?? null,
        engagement: 0,
        sourceTier: reputationTier(host),
        origin: "exa",
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Artificial Analysis (ARTIFICIALANALYSIS_API_KEY): NOT a source of its own
// cards. It is structured frontier-model ground-truth (intelligence index,
// blended price, rank) used to ENRICH and VALIDATE the news: when a story names
// a specific model, we attach that model's real benchmark standing so the card
// carries an independent, numeric cross-check instead of just a press claim.
// ---------------------------------------------------------------------------
export interface AaModel {
  name: string; // cleaned display name, e.g. "Claude Fable 5"
  matchKey: string; // lowercased name used to spot the model in a headline
  intelligence: number | null; // Artificial Analysis Intelligence Index
  pricePer1m: number | null; // blended $/1M tokens (3:1)
  rank: number | null; // 1-based rank by intelligence
}

function aaNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Fetch the AA model leaderboard as a reference index (cleaned names + numbers +
 * intelligence rank). Best-effort: returns [] on any failure.
 */
export async function fetchAaModelIndex(apiKey: string, timeoutMs = 8_000): Promise<AaModel[]> {
  const data = await getJson(
    "https://artificialanalysis.ai/api/v2/data/llms/models",
    { "x-api-key": apiKey },
    timeoutMs,
  );
  const rows = (data as { data?: Array<Record<string, unknown>> } | null)?.data;
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const models: AaModel[] = [];
  for (const r of rows) {
    // Strip AA's config qualifier (e.g. "Claude Fable 5 (Adaptive Reasoning,
    // Max Effort, ...)") so the name matches how a headline writes it.
    const name = stripHtml(typeof r.name === "string" ? r.name : "").replace(/\s*\([^)]*\).*$/, "").trim();
    if (!name) continue;
    const ev = (r.evaluations ?? {}) as Record<string, unknown>;
    const pricing = (r.pricing ?? {}) as Record<string, unknown>;
    const intelligence = aaNum(
      ev.artificial_analysis_intelligence_index ?? ev.intelligence_index ?? r.intelligence_index,
    );
    const pricePer1m = aaNum(
      pricing.price_1m_blended_3_to_1 ?? pricing.price_1m_blended ?? r.price_1m_blended_3_to_1,
    );
    models.push({ name, matchKey: name.toLowerCase(), intelligence, pricePer1m, rank: null });
  }

  // Rank by intelligence (1 = smartest), so an enriched card can say "#2".
  const ranked = [...models].filter((m) => m.intelligence != null).sort((a, b) => (b.intelligence as number) - (a.intelligence as number));
  ranked.forEach((m, i) => { m.rank = i + 1; });
  return models;
}

// A model name is specific enough to match in prose only if it carries a version
// token (a digit). Bare family words ("Claude", "Gemini") would match far too
// loosely and mis-attribute a number to the wrong model.
function isSpecificModelName(matchKey: string): boolean {
  return matchKey.length >= 4 && /\d/.test(matchKey);
}

/**
 * Find the AA model a piece of news text is about, if any. Prefers the longest
 * (most specific) matching name so "GPT-5.5" beats "GPT". Returns null when no
 * specific model is named, so only genuinely model-about stories get enriched.
 */
export function matchAaModel(text: string, models: AaModel[]): AaModel | null {
  const hay = ` ${text.toLowerCase()} `;
  let best: AaModel | null = null;
  for (const m of models) {
    if (!isSpecificModelName(m.matchKey)) continue;
    if (hay.includes(m.matchKey) && (!best || m.matchKey.length > best.matchKey.length)) {
      best = m;
    }
  }
  return best;
}

export interface GatherKeys {
  braveKey?: string;
  newsApiKey?: string;
  exaKey?: string;
}

/**
 * Gather from every source in parallel. Each is best-effort: failures resolve to
 * []. The keyed sources (Brave / NewsAPI / Exa) are included only when their key
 * is present, so the gather degrades gracefully if any key is missing.
 */
export async function gatherAll(keys: GatherKeys | string | undefined): Promise<RawArticle[]> {
  // Back-compat: an old caller passed just the Brave key as a string.
  const k: GatherKeys = typeof keys === "string" ? { braveKey: keys } : (keys ?? {});
  const tasks: Array<Promise<RawArticle[]>> = [
    fetchGdelt().catch(() => []),
    fetchHackerNews().catch(() => []),
    fetchRss().catch(() => []),
  ];
  if (k.braveKey) tasks.push(fetchBrave(k.braveKey).catch(() => []));
  if (k.newsApiKey) tasks.push(fetchNewsApi(k.newsApiKey).catch(() => []));
  if (k.exaKey) tasks.push(fetchExa(k.exaKey).catch(() => []));
  const results = await Promise.all(tasks);
  return results.flat();
}
