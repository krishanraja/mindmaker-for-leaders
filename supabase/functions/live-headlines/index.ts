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
import { gatherAll } from "../_shared/news-sources.ts";
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
}

const MAX_CARDS = 14;
// Stories older than this are dropped: a daily Home feed should be recent news,
// not a months-old archive item a category RSS feed happened to surface.
const MAX_AGE_DAYS = 14;
// Stories worth surfacing must clear a low bar: either corroborated by 2+
// sources, or a single strong/fresh source. This filters lone low-tier rehashes.
function worthSurfacing(c: Cluster): boolean {
  return c.sourceCount >= 2 || c.rep.sourceTier >= 2;
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
    const raw = await gatherAll(braveKey);
    const aiNative = raw.filter((a) => {
      if (!isAiNative(`${a.title} ${a.description}`)) return false;
      if (!a.publishedIso) return true;
      const t = Date.parse(a.publishedIso);
      return !Number.isFinite(t) || t >= cutoffMs;
    });
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
    const picked = selectBalanced(clusters, categoryOf, MAX_CARDS);

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

    // 5. Build the cards.
    const cards: HeadlineCard[] = picked.map((c, i) => {
      const id = `live-${today}-${i}`;
      const desc = c.rep.description;
      const fallbackSay = desc ? (desc.length > 170 ? `${desc.slice(0, 167)}...` : desc) : null;
      return {
        id,
        headline: c.rep.title,
        say: reads.get(id) ?? fallbackSay,
        source: c.rep.source || null,
        corroboration: corroborationLabel(c.sourceCount),
        sourceCount: c.sourceCount,
        url: c.rep.url,
        category: categoryOf(c),
        timeAgo: relativeTimeAgo(c.bestPublishedIso),
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
