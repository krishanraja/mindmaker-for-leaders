// live-headlines: real, dated, sourced, CROSS-VERIFIED AI-native news for Home,
// now scored against the leader's unified brain so the feed is THEIRS.
//
// Two tiers (the per-user half of the one curation engine):
//   TIER 1 (shared, daily): gather the day's AI stories from the free sources,
//     keep AI-native, cluster near-duplicates ACROSS sources, score by
//     corroboration x reputation x freshness x engagement, balance across the
//     nine lanes, and write one grounded "why it matters" line per story. One
//     gather a day total, cached in live_headlines_cache; the pg_cron job
//     pre-warms it with ?force=1.
//   TIER 2 (per-user): score that shared pool against the leader's brain
//     (brain-profile + importance lens) through personalization-core, so a
//     more-relevant story leads and an off-brain one is dropped. Below the
//     profile gate (no vertical / role / 3 interests) we return needs_profile
//     instead of headlines. Per-user result cached in personal_pool_cache,
//     keyed on a brain signature so it refreshes the moment the brain changes.
//
// Fallback-safe by construction: any failure in the per-user path (no user, no
// OpenAI key, lens/score error, empty result) returns the shared generic pool,
// so Home is never blank.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
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
  freshnessScore,
  scoreClusters,
  selectBalanced,
  type Cluster,
  type RawArticle,
} from "../_shared/news-cluster.ts";
import { gatherAll, fetchAaModelIndex, matchAaModel, type AaModel } from "../_shared/news-sources.ts";
import { synthesizeReads, type SynthInput } from "../_shared/news-synthesis.ts";
import { loadBrainProfile, brainSignature, toLensSource } from "../_shared/brain-profile.ts";
import { buildImportanceLens } from "../_shared/briefing-lens.ts";
import { scorePoolForUser, type EngineCandidate, type ScoredPoolItem } from "../_shared/personalization-core.ts";

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
  // The importance score. For the shared pool this is the world-importance score
  // (corroboration x reputation x freshness x engagement); for a personalized
  // feed it is the per-user finalScore. Returned so the client can fall back to
  // a local re-rank for the generic pool (src/lib/newsPriority.ts).
  score: number;
  benchmark: {
    model: string;
    intelligenceIndex: number | null;
    pricePer1m: number | null;
    rank: number | null;
  } | null;
}

/**
 * The shared, daily-cached pool item: a display card PLUS the raw signals the
 * per-user engine needs to re-score it (so Tier 2 never re-gathers or re-LLMs).
 */
interface SharedCard extends HeadlineCard {
  snippet: string;
  /** Raw external cluster score (no AA lift baked in - that is aaMatched). */
  externalScore: number;
  /** Recency in [0,1]. */
  freshness: number;
  aaMatched: boolean;
}

const POOL_SIZE = 20;
const POOL_PER_CATEGORY = 4;
const MAX_AGE_DAYS = 14;
const FRESH_SINGLE_MS = 2 * 24 * 3_600_000;
// The lens "type" Home asks for: a broad "what matters across your world" lens.
const HOME_LENS_TYPE = "macro_trends";
// Per-user personalization is on by default but fully fallback-safe; set
// HOME_PERSONALIZATION_ENABLED=false to serve the shared generic pool to all.
const PERSONALIZE = (Deno.env.get("HOME_PERSONALIZATION_ENABLED") ?? "true") !== "false";
// The profile gate (no headlines below a minimum brain) is OFF by default so
// existing leaders are never suddenly walled; flip HOME_PROFILE_GATE_ENABLED=true
// once the "complete your brain to unlock" UX has been eyeballed on prod. Below
// the gate with the gate OFF, we serve the generic pool (today's behaviour).
const GATE_ENABLED = (Deno.env.get("HOME_PROFILE_GATE_ENABLED") ?? "false") === "true";

function worthSurfacing(c: Cluster): boolean {
  if (c.sourceCount >= 2 || c.rep.sourceTier >= 2) return true;
  const t = c.bestPublishedIso ? Date.parse(c.bestPublishedIso) : NaN;
  return Number.isFinite(t) && t >= Date.now() - FRESH_SINGLE_MS;
}

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

interface GatherEnv {
  braveKey?: string;
  newsApiKey?: string;
  exaKey?: string;
  aaKey?: string;
  openaiKey?: string;
}

/** Tier 1, part A: gather the day's AI-native stories + the AA leaderboard. */
async function gatherAiNative(env: GatherEnv): Promise<{ raw: RawArticle[]; aiNative: RawArticle[]; aaModels: AaModel[] }> {
  const cutoffMs = Date.now() - MAX_AGE_DAYS * 24 * 3_600_000;
  const [raw, aaModels] = await Promise.all([
    gatherAll({ braveKey: env.braveKey, newsApiKey: env.newsApiKey, exaKey: env.exaKey }),
    env.aaKey ? fetchAaModelIndex(env.aaKey).catch(() => [] as AaModel[]) : Promise.resolve([] as AaModel[]),
  ]);
  const aiNative = raw.filter((a) => {
    if (!isAiNative(`${a.title} ${a.description}`)) return false;
    if (!a.publishedIso) return true;
    const t = Date.parse(a.publishedIso);
    return !Number.isFinite(t) || t >= cutoffMs;
  });
  return { raw, aiNative, aaModels };
}

/** Tier 1, part B: cluster + score + balance + synthesize + AA-enrich -> the shared pool. */
async function buildSharedPool(
  aiNative: RawArticle[],
  aaModels: AaModel[],
  openaiKey: string | undefined,
  today: string,
): Promise<SharedCard[]> {
  const clusters = capPerSource(scoreClusters(clusterArticles(aiNative)).filter(worthSurfacing), 2);
  const categoryOf = (c: Cluster) => classifyCategory(c.blob);
  const picked = selectBalanced(clusters, categoryOf, POOL_SIZE, POOL_PER_CATEGORY);

  const synthInputs: SynthInput[] = picked.map((c, i) => ({
    id: `live-${today}-${i}`,
    headline: c.rep.title,
    snippet: c.rep.description,
    category: categoryOf(c),
    sourceCount: c.sourceCount,
  }));
  const reads = await synthesizeReads(openaiKey ?? "", synthInputs);

  return picked.map((c, i) => {
    const id = `live-${today}-${i}`;
    const desc = c.rep.description ?? "";
    const fallbackSay = desc ? (desc.length > 170 ? `${desc.slice(0, 167)}...` : desc) : null;
    const read = reads.get(id);
    const aa = matchAaModel(`${c.rep.title} ${desc}`, aaModels);
    const benchmark = aa
      ? { model: aa.name, intelligenceIndex: aa.intelligence, pricePer1m: aa.pricePer1m, rank: aa.rank }
      : null;
    return {
      id,
      headline: read?.headline ?? cleanHeadline(c.rep.title, c.rep.source),
      say: read?.say ?? fallbackSay,
      source: c.rep.source || null,
      corroboration: corroborationLabel(c.sourceCount),
      sourceCount: c.sourceCount,
      url: c.rep.url,
      category: categoryOf(c) as NewsCategoryId,
      timeAgo: relativeTimeAgo(c.bestPublishedIso),
      score: Math.round((c.score + (benchmark ? 1.5 : 0)) * 100) / 100,
      benchmark,
      snippet: desc,
      externalScore: c.score,
      freshness: freshnessScore(c.bestPublishedIso, Date.now()),
      aaMatched: !!aa,
    };
  });
}

/** Strip the per-user re-score fields back down to the display card. */
function toDisplayCard(s: SharedCard): HeadlineCard {
  const { snippet: _s, externalScore: _e, freshness: _f, aaMatched: _a, ...card } = s;
  return card;
}

/**
 * A shared-pool item as an engine candidate (carries every field through).
 * Defends against an old-shape cache row (written before this deploy, same day)
 * that lacks the per-user re-score fields, so scoring never sees NaN.
 */
function toEngineCandidate(s: SharedCard): EngineCandidate & SharedCard {
  return {
    ...s,
    title: s.headline,
    source: s.source ?? "Web",
    provider: "live",
    snippet: s.snippet ?? s.say ?? "",
    externalScore: Number.isFinite(s.externalScore) ? s.externalScore : (Number.isFinite(s.score) ? s.score : 0),
    freshness: Number.isFinite(s.freshness) ? s.freshness : 0,
    aaMatched: s.aaMatched ?? !!s.benchmark,
  };
}

/** Resolve the calling user from the Authorization JWT (null when anon/absent). */
async function resolveUserId(req: Request, supabase: SupabaseClient): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const env: GatherEnv = {
      braveKey: Deno.env.get("BRAVE_SEARCH_API") ?? undefined,
      newsApiKey: Deno.env.get("NEWSAPI_KEY") ?? Deno.env.get("NEWSAPI_API_KEY") ?? undefined,
      exaKey: Deno.env.get("EXA_API_KEY") ?? undefined,
      aaKey: Deno.env.get("ARTIFICIALANALYSIS_API_KEY") ?? undefined,
      openaiKey: Deno.env.get("OPENAI_API_KEY") ?? undefined,
    };
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const url = new URL(req.url);
    const today = new Date().toISOString().split("T")[0];
    const force = url.searchParams.get("force") === "1";
    const debug = url.searchParams.get("debug") === "1";

    // ---- Ops debug: per-source gather counts (no keys exposed). ----
    if (debug) {
      const { raw, aiNative, aaModels } = await gatherAiNative(env);
      const by = (o: string) => raw.filter((a) => a.origin === o).length;
      return json({
        gathered: { total: raw.length, aiNative: aiNative.length },
        bySource: { gdelt: by("gdelt"), hn: by("hn"), rss: by("rss"), brave: by("brave"), newsapi: by("newsapi"), exa: by("exa") },
        aaModels: aaModels.length,
        keysPresent: { brave: !!env.braveKey, newsapi: !!env.newsApiKey, exa: !!env.exaKey, aa: !!env.aaKey, openai: !!env.openaiKey },
        personalize: PERSONALIZE,
      });
    }

    // ---- TIER 1: the shared daily pool (cache, or build on miss/force). ----
    let shared: SharedCard[] | null = null;
    if (!force) {
      const { data: cached } = await supabase
        .from("live_headlines_cache")
        .select("payload")
        .eq("briefing_date", today)
        .maybeSingle();
      const payload = (cached as { payload?: SharedCard[] } | null)?.payload;
      if (Array.isArray(payload) && payload.length > 0) shared = payload;
    }
    if (!shared) {
      const { aiNative, aaModels } = await gatherAiNative(env);
      if (aiNative.length === 0) return json({ cards: [], cached: false, error: "no AI-native stories gathered" });
      shared = await buildSharedPool(aiNative, aaModels, env.openaiKey, today);
      if (shared.length > 0) {
        await supabase
          .from("live_headlines_cache")
          .upsert({ briefing_date: today, payload: shared, created_at: new Date().toISOString() })
          .then(({ error }) => { if (error) console.warn("cache upsert failed:", error.message); });
      }
    }

    const genericCards = shared.map(toDisplayCard);

    // ---- TIER 2: personalize for the calling user (fallback-safe). ----
    const userId = PERSONALIZE ? await resolveUserId(req, supabase) : null;
    if (!userId || !env.openaiKey) {
      return json({ cards: genericCards, cached: !force, personalized: false });
    }

    try {
      const profile = await loadBrainProfile(supabase, userId);

      // Profile gate. When enabled, below the minimum brain we return no
      // headlines and prompt to unlock. When disabled (default), a sub-gate
      // leader simply gets the generic pool (no regression vs today).
      if (!profile.completeness.passesGate) {
        if (GATE_ENABLED) {
          return json({ cards: [], status: "needs_profile", missing: profile.completeness.missing });
        }
        return json({ cards: genericCards, cached: !force, personalized: false, reason: "below_gate" });
      }

      const signature = brainSignature(profile);

      // Per-user cache (keyed on the brain signature so it busts when the brain changes).
      const { data: pc } = await supabase
        .from("personal_pool_cache")
        .select("payload, signature")
        .eq("user_id", userId)
        .eq("briefing_date", today)
        .maybeSingle();
      const pcRow = pc as { payload?: HeadlineCard[]; signature?: string } | null;
      if (pcRow && pcRow.signature === signature && Array.isArray(pcRow.payload) && pcRow.payload.length > 0) {
        return json({ cards: pcRow.payload, cached: true, personalized: true });
      }

      const lens = (await buildImportanceLens(supabase, env.openaiKey, toLensSource(profile), HOME_LENS_TYPE)).items;
      const candidates = shared.map(toEngineCandidate);
      const result = await scorePoolForUser({
        supabase,
        openaiKey: env.openaiKey,
        profile,
        candidates,
        lens,
        poolSize: POOL_SIZE,
        perCategory: POOL_PER_CATEGORY,
      });

      if (result.status === "needs_profile") {
        return json({ cards: [], status: "needs_profile", missing: result.missing });
      }

      const personalized = (result.pool as Array<ScoredPoolItem & SharedCard>).map((item) => ({
        id: item.id,
        headline: item.headline,
        say: item.say,
        source: item.source,
        corroboration: item.corroboration,
        sourceCount: item.sourceCount,
        url: item.url,
        category: item.category as NewsCategoryId,
        timeAgo: item.timeAgo,
        score: Math.round(item.finalScore * 100) / 100,
        benchmark: item.benchmark,
      } as HeadlineCard));

      // Empty after scoring (e.g. nothing cleared the relevance gate today):
      // fall back to the generic pool so Home is never blank.
      if (personalized.length === 0) {
        return json({ cards: genericCards, cached: !force, personalized: false, fallback: "empty_after_scoring" });
      }

      await supabase
        .from("personal_pool_cache")
        .upsert(
          { user_id: userId, briefing_date: today, signature, payload: personalized, created_at: new Date().toISOString() },
          { onConflict: "user_id,briefing_date" },
        )
        .then(({ error }) => { if (error) console.warn("personal cache upsert failed:", error.message); });

      return json({ cards: personalized, cached: false, personalized: true });
    } catch (e) {
      console.error("live-headlines personalization failed, serving generic pool:", e);
      return json({ cards: genericCards, cached: !force, personalized: false, fallback: "error" });
    }
  } catch (e) {
    console.error("live-headlines error:", e);
    return json({ cards: [], error: (e as Error).message });
  }
});
