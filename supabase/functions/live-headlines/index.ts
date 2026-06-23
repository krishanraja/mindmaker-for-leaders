// live-headlines: real, dated, sourced, CROSS-VERIFIED AI-native news for Home.
//
// The quality lever for free news is corroboration, not a fancier vendor. This
// function gathers the day's AI stories from four free sources (GDELT + Hacker
// News + a curated RSS allowlist + Brave), keeps the AI-native ones, clusters
// near-duplicate headlines ACROSS sources, ranks by corroboration x reputation x
// freshness x engagement, balances the pick across the nine AI-native lanes, and
// writes one grounded "why it matters" line per story. Each card carries a real
// source + URL + publish age + how many independent sources reported it.
//
// It is a shared, generic industry feed (not per-user), cached once per day in
// live_headlines_cache - one gather a day total, instant for every user. A daily
// pg_cron job (see migration) pre-warms the cache with ?force=1.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  classifyCategory,
  isAiNative,
  relativeTimeAgo,
  type NewsCategoryId,
} from "../_shared/news-ai-native.ts";
import {
  capPerSource,
  clusterArticles,
  corroborationLabel,
  scoreClusters,
  selectBalanced,
  type Cluster,
} from "../_shared/news-cluster.ts";
import { gatherAll, fetchAaModelIndex, matchAaModel, type AaModel } from "../_shared/news-sources.ts";
import { synthesizeReads, type SynthInput } from "../_shared/news-synthesis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HeadlineCard {
  id: string;
  headline: string;
  say: string | null;
  source: string | null;
  corroboration: string | null; // "+2 sources" when multiple outlets agree
  sourceCount: number;
  url: string;
  category: NewsCategoryId;
  timeAgo: string | null;
  // The server importance score (corroboration x reputation x freshness x
  // engagement). Returned so the client can re-rank this shared pool against the
  // leader's selected priorities (src/lib/newsPriority.ts) without a per-user
  // gather. Higher = more important in the world.
  score: number;
  // Independent benchmark cross-check from Artificial Analysis, present only when
  // the story names a specific model AA tracks. Enriches + validates the news
  // with real numbers (it is NOT a standalone card).
  benchmark: {
    model: string;
    intelligenceIndex: number | null;
    pricePer1m: number | null;
    rank: number | null;
  } | null;
}

// Return a RICHER pool than the deck shows (~7), so the client has room to
// re-rank by each leader's priorities. A looser per-category cap keeps the pool
// spanning lanes without truncating to a tight balanced few.
const POOL_SIZE = 20;
const POOL_PER_CATEGORY = 4;
// Stories older than this are dropped: a daily Home feed should be recent news,
// not a months-old archive item a category RSS feed happened to surface.
const MAX_AGE_DAYS = 14;
// How fresh a lone tier-1 story must be to earn a place (see below).
const FRESH_SINGLE_MS = 2 * 24 * 3_600_000;
// Stories worth surfacing must clear a low bar that filters lone low-tier
// rehashes, while keeping enough depth PER CATEGORY for per-user re-ranking:
//   - corroborated by 2+ independent sources (the trust signal), OR
//   - a reputable outlet (allowlist / curated RSS, tier >= 2), OR
//   - a genuinely FRESH (< 2 days) single story. With the wider gather
//     (NewsAPI + Exa), this admits the recent stories that fill out each lane
//     so "Tune feed" has real options to lift; the per-source and per-category
//     caps still stop any one outlet or lane from flooding.
function worthSurfacing(c: Cluster): boolean {
  if (c.sourceCount >= 2 || c.rep.sourceTier >= 2) return true;
  const t = c.bestPublishedIso ? Date.parse(c.bestPublishedIso) : NaN;
  return Number.isFinite(t) && t >= Date.now() - FRESH_SINGLE_MS;
}

// Strip a trailing publication suffix so cards read like clean headlines, not
// raw RSS titles (e.g. "... auto synthesis system | VentureBeat" -> drop the
// "| VentureBeat"). A pipe is essentially always a "Headline | Publication"
// separator; a dash/colon tail is only stripped when it matches the article's
// own outlet host, so real punctuation in a headline is preserved.
function cleanHeadline(title: string, sourceHost: string | null): string {
  let t = (title || "").trim();
  t = t.replace(/\s*\|\s*[^|]{1,40}$/u, "").trim();
  const tok = (sourceHost || "").replace(/^www\./, "").split(".")[0];
  if (tok && tok.length >= 3) {
    const esc = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`\\s*[-\\u2013\\u2014:]\\s*${esc}\\b.*$`, "i"), "").trim();
  }
  return t || title;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const braveKey = Deno.env.get("BRAVE_SEARCH_API");
    const newsApiKey = Deno.env.get("NEWSAPI_KEY") ?? Deno.env.get("NEWSAPI_API_KEY");
    const exaKey = Deno.env.get("EXA_API_KEY");
    const aaKey = Deno.env.get("ARTIFICIALANALYSIS_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const today = new Date().toISOString().split("T")[0];
    const force = new URL(req.url).searchParams.get("force") === "1";

    // 1. Serve today's cached feed if we have it (one gather per day).
    if (!force) {
      const { data: cached } = await supabase
        .from("live_headlines_cache")
        .select("payload")
        .eq("briefing_date", today)
        .maybeSingle();
      const payload = (cached as { payload?: HeadlineCard[] } | null)?.payload;
      if (Array.isArray(payload) && payload.length > 0) {
        return json({ cards: payload, cached: true });
      }
    }

    // 2. Gather across all free sources, keep AI-native + recent only. A
    //    freshness cutoff matters because some category-archive RSS feeds
    //    (e.g. VentureBeat) return months-old items; stale stories are not
    //    "news". Items with a parseable date older than the cutoff are dropped;
    //    undated items are kept (we cannot prove they are stale).
    const cutoffMs = Date.now() - MAX_AGE_DAYS * 24 * 3_600_000;
    // Gather the news AND the Artificial Analysis leaderboard in parallel. AA is
    // a validation/enrichment layer (real model benchmarks), not a news source,
    // so it is fetched alongside rather than mixed into the article gather.
    const [raw, aaModels] = await Promise.all([
      gatherAll({ braveKey, newsApiKey, exaKey }),
      aaKey ? fetchAaModelIndex(aaKey).catch(() => [] as AaModel[]) : Promise.resolve([] as AaModel[]),
    ]);
    const aiNative = raw.filter((a) => {
      if (!isAiNative(`${a.title} ${a.description}`)) return false;
      if (!a.publishedIso) return true;
      const t = Date.parse(a.publishedIso);
      return !Number.isFinite(t) || t >= cutoffMs;
    });
    // Ops visibility: ?debug=1 returns the per-source gather counts so we can
    // confirm every source (GDELT/HN/RSS/Brave/NewsAPI/Exa) is contributing,
    // without exposing any keys. Returns before the LLM synthesis spend.
    if (new URL(req.url).searchParams.get("debug") === "1") {
      const by = (o: string) => raw.filter((a) => a.origin === o).length;
      return json({
        gathered: { total: raw.length, aiNative: aiNative.length },
        bySource: { gdelt: by("gdelt"), hn: by("hn"), rss: by("rss"), brave: by("brave"), newsapi: by("newsapi"), exa: by("exa") },
        aaModels: aaModels.length, // benchmark rows loaded for news enrichment
        keysPresent: { brave: !!braveKey, newsapi: !!newsApiKey, exa: !!exaKey, aa: !!aaKey, openai: !!openaiKey },
      });
    }
    if (aiNative.length === 0) {
      return json({ cards: [], cached: false, error: "no AI-native stories gathered" });
    }

    // 3. Cluster across sources (cross-verification), score, de-flood any single
    //    outlet (per-source cap), then balance the pick across categories.
    const clusters = capPerSource(
      scoreClusters(clusterArticles(aiNative)).filter(worthSurfacing),
      2,
    );
    const categoryOf = (c: Cluster) => classifyCategory(c.blob);
    const picked = selectBalanced(clusters, categoryOf, POOL_SIZE, POOL_PER_CATEGORY);

    // 4. One grounded "why it matters" line per story (best-effort; falls back
    //    to the article snippet when the LLM is unavailable).
    const synthInputs: SynthInput[] = picked.map((c, i) => ({
      id: `live-${today}-${i}`,
      headline: c.rep.title,
      snippet: c.rep.description,
      category: categoryOf(c),
      sourceCount: c.sourceCount,
    }));
    const reads = await synthesizeReads(openaiKey, synthInputs);

    // 5. Build the cards, ENRICHING any model-about story with its Artificial
    //    Analysis benchmark standing (an independent numeric cross-check). A
    //    matched card also gets a small score lift: a claim backed by real data
    //    is more trustworthy/important than an unbacked one.
    const cards: HeadlineCard[] = picked.map((c, i) => {
      const id = `live-${today}-${i}`;
      const desc = c.rep.description;
      const fallbackSay = desc ? (desc.length > 170 ? `${desc.slice(0, 167)}...` : desc) : null;
      const aa = matchAaModel(`${c.rep.title} ${desc}`, aaModels);
      const benchmark = aa
        ? { model: aa.name, intelligenceIndex: aa.intelligence, pricePer1m: aa.pricePer1m, rank: aa.rank }
        : null;
      return {
        id,
        headline: cleanHeadline(c.rep.title, c.rep.source),
        say: reads.get(id) ?? fallbackSay,
        source: c.rep.source || null,
        corroboration: corroborationLabel(c.sourceCount),
        sourceCount: c.sourceCount,
        url: c.rep.url,
        category: categoryOf(c),
        timeAgo: relativeTimeAgo(c.bestPublishedIso),
        score: Math.round((c.score + (benchmark ? 1.5 : 0)) * 100) / 100,
        benchmark,
      };
    });

    // 6. Cache (best-effort - a failed cache write must not fail the response).
    if (cards.length > 0) {
      await supabase
        .from("live_headlines_cache")
        .upsert({ briefing_date: today, payload: cards, created_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.warn("cache upsert failed:", error.message); });
    }

    return json({ cards, cached: false });
  } catch (e) {
    console.error("live-headlines error:", e);
    return json({ cards: [], error: (e as Error).message });
  }
});
