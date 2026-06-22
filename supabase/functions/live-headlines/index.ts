// live-headlines: real, dated, sourced AI-native news for the Home deck.
//
// Why this exists: Home used to show a hardcoded "cold deck" (generic evergreen
// lines, source "The shift", no links) plus a leader's editorialized briefing
// segments. Neither is real, dated, reputable news the user can open. This
// function pulls live articles from Brave News (already keyed as
// BRAVE_SEARCH_API), keeps the AI-native ones, tags each with one of the nine
// categories, and returns cards that carry a real source + URL + publish age.
//
// It is a shared, generic industry feed (not per-user), so it is cached once per
// day in live_headlines_cache - one Brave fetch a day total, instant for users.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  classifyCategory,
  isAiNative,
  relativeTimeAgo,
  type NewsCategoryId,
} from "../_shared/news-ai-native.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HeadlineCard {
  id: string;
  headline: string;
  say: string | null;
  source: string | null;
  url: string;
  category: NewsCategoryId;
  timeAgo: string | null;
}

// One query per AI-native category lane, so the deck spans the nine categories
// rather than over-indexing on model news.
const QUERIES: string[] = [
  "new AI model release OR benchmark OR frontier model capability",
  "AI agents OR agent orchestration OR autonomous agents enterprise",
  "AI developer tools OR coding assistant OR LLM platform launch",
  "AI startup funding OR AI product launch OR AI go-to-market",
  "AI governance OR AI regulation OR AI safety policy",
  "enterprise AI adoption OR AI ROI OR AI deployment results",
  "AI security OR prompt injection OR AI agent risk",
];

const MAX_CARDS = 14;
const BRAVE_TIMEOUT_MS = 7_000;

function stripHtml(s: string | null | undefined): string {
  return (s || "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

interface BraveResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
  meta_url?: { hostname?: string };
}

async function fetchBrave(apiKey: string, q: string): Promise<BraveResult[]> {
  const params = new URLSearchParams({
    q,
    freshness: "pw", // past week, so "today/yesterday" dominate but the lane is never empty
    count: "8",
    country: "US",
    search_lang: "en",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BRAVE_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/news/search?${params}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
        signal: controller.signal,
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.results) ? (data.results as BraveResult[]) : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function hostnameOf(r: BraveResult): string {
  const h = r.meta_url?.hostname;
  if (h) return h.replace(/^www\./, "");
  try {
    return new URL(r.url ?? "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const today = new Date().toISOString().split("T")[0];
    const force = new URL(req.url).searchParams.get("force") === "1";

    // 1. Serve today's cached feed if we have it (one Brave fetch per day).
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

    if (!braveKey) return json({ cards: [], error: "news source not configured" });

    // 2. Fan out across the category lanes, keep AI-native, dedupe, tag.
    const lanes = await Promise.all(QUERIES.map((q) => fetchBrave(braveKey, q)));
    const seen = new Set<string>();
    const cards: HeadlineCard[] = [];

    for (const lane of lanes) {
      for (const r of lane) {
        if (cards.length >= MAX_CARDS) break;
        const headline = stripHtml(r.title);
        const link = typeof r.url === "string" ? r.url : "";
        if (!headline || !link) continue;

        const dedupeKey = headline.toLowerCase().slice(0, 64);
        if (seen.has(dedupeKey)) continue;

        const desc = stripHtml(r.description);
        const blob = `${headline} ${desc}`;
        if (!isAiNative(blob)) continue; // AI-native lens: skip generic business news

        seen.add(dedupeKey);
        cards.push({
          id: `live-${today}-${cards.length}`,
          headline,
          say: desc ? (desc.length > 170 ? `${desc.slice(0, 167)}...` : desc) : null,
          source: hostnameOf(r) || null,
          url: link,
          category: classifyCategory(blob),
          // Brave's `age` is already a human string ("3 hours ago"); fall back to
          // computing it from the ISO page_age. Never fabricated.
          timeAgo: (typeof r.age === "string" && r.age) ? r.age : relativeTimeAgo(r.page_age ?? null),
        });
      }
    }

    // 3. Cache (best-effort - a failed cache write must not fail the response).
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
