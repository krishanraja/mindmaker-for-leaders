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
      headers: { Accept: "application/rss+xml, application/xml, text/xml, */*", "User-Agent": "ctrl-news/1.0" },
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
  const data = await getJson(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`);
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
        // HN surfacing is itself a weak quality vote; bump generic hosts to >=2.
        sourceTier: Math.max(reputationTier(host), 2),
        origin: "hn",
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Curated RSS allowlist (open, no key): quality is controlled by the outlet set.
// ---------------------------------------------------------------------------
export const RSS_FEEDS: string[] = [
  "https://techcrunch.com/category/artificial-intelligence/feed/",
  "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  "https://venturebeat.com/category/ai/feed/",
  "https://www.technologyreview.com/topic/artificial-intelligence/feed",
  "https://feeds.arstechnica.com/arstechnica/technology-lab",
  "https://huggingface.co/blog/feed.xml",
  "https://simonwillison.net/atom/everything/",
  "https://blog.google/technology/ai/rss/",
  "https://news.mit.edu/rss/topic/artificial-intelligence2",
  "https://openai.com/news/rss.xml",
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

/**
 * Gather from every free source in parallel. Each is best-effort: failures
 * resolve to []. Brave is included only when its key is present.
 */
export async function gatherAll(braveKey: string | undefined): Promise<RawArticle[]> {
  const tasks: Array<Promise<RawArticle[]>> = [
    fetchGdelt().catch(() => []),
    fetchHackerNews().catch(() => []),
    fetchRss().catch(() => []),
  ];
  if (braveKey) tasks.push(fetchBrave(braveKey).catch(() => []));
  const results = await Promise.all(tasks);
  return results.flat();
}
