/**
 * briefing-lens - Stage 1 (Importance Lens) + Stage 2 (Query Planner)
 *
 * The lens is the core abstraction of briefing v2: instead of flattening every
 * profile table into one prompt, we first produce an explicit ranked list of
 * what matters to this user TODAY for THIS briefing type. Every downstream
 * story is scored against this lens, and every retained segment carries the
 * id of the lens item it matched. That is the "evidence" in "evidence-based
 * relevance".
 *
 * Cache key MUST include briefing_type - a macro_trends lens weights the
 * watchlist differently than a boardroom_prep lens weights decisions.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCachedResponse, setCachedResponse, hashPrompt } from "./ai-cache.ts";
import type { TrainingMaterial } from "./training-schema.ts";
import { computeLensSignature } from "./lens-signature.ts";

export type LensItemType =
  | "decision"
  | "mission"
  | "watchlist"
  | "blocker"
  | "objective"
  | "pattern"
  | "interest_beat"
  | "interest_entity";

export interface LensItem {
  id: string;
  type: LensItemType;
  ref_id: string | null;
  text: string;
  weight: number;
}

/**
 * Output of buildImportanceLens. `items` are positive-weight lens items the
 * pipeline scores candidates against. `excludes` are user-declared topics
 * that post-filter the candidate pool; they never become lens items and do
 * not themselves attract stories.
 */
export interface LensResult {
  items: LensItem[];
  excludes: string[];
}

export interface PlannedQuery {
  query: string;
  intent: string;
  target_lens_item_id: string;
}

export interface LensSource {
  userId: string;
  name: string;
  role: string;
  company: string;
  industry: string;
  objectives: Array<{ id?: string; text: string }>;
  blockers: Array<{ id?: string; text: string }>;
  missions: Array<{ id: string; title: string }>;
  decisions: Array<{ id: string; text: string }>;
  watchingCompanies: string[];
  patterns: Array<{ type: string; text: string; confidence: number }>;
}

const LENS_CACHE_MODEL = "briefing-lens-v2";
const LENS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Minimum post-LLM weight for user-declared interest items. Interests are */
/** explicit preferences; the LLM can reorder them but must not demote them. */
const INTEREST_WEIGHT_FLOOR = 0.8;

interface LoadedInterests {
  beats: Array<{ id: string; text: string }>;
  entities: Array<{ id: string; text: string }>;
  excludes: string[];
}

/**
 * Load negative weight deltas keyed by lens-item signature. Both explicit
 * kills (weight_delta -1.0) and aggregated thumbs-down (weight_delta -0.4)
 * contribute. Deltas are summed per signature so a killed-then-aggregated
 * item falls to -1.4 (effectively gone either way, but the accumulated
 * value gives us audit data).
 */
async function loadLensFeedbackDeltas(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    const { data, error } = await supabase
      .from("briefing_lens_feedback")
      .select("lens_item_signature, weight_delta")
      .eq("user_id", userId)
      .eq("is_active", true);
    if (error || !data) return out;
    for (const row of data as Array<{ lens_item_signature: string; weight_delta: number }>) {
      const current = out.get(row.lens_item_signature) ?? 0;
      out.set(row.lens_item_signature, current + Number(row.weight_delta));
    }
  } catch (e) {
    console.warn("briefing-lens: loadLensFeedbackDeltas failed", e instanceof Error ? e.message : e);
  }
  return out;
}

/**
 * Apply negative feedback deltas to a list of lens items. Drops any item
 * whose effective weight falls to or below zero. Signatures are computed
 * in parallel since SHA-256 via Web Crypto is async.
 */
async function applyFeedbackDeltas(
  items: LensItem[],
  deltas: Map<string, number>,
): Promise<LensItem[]> {
  if (deltas.size === 0 || items.length === 0) return items;
  const signed = await Promise.all(
    items.map(async (item) => {
      const sig = await computeLensSignature(item.type, item.text);
      const delta = deltas.get(sig) ?? 0;
      return { item, sig, effectiveWeight: item.weight + delta };
    }),
  );
  return signed
    .filter((s) => s.effectiveWeight > 0)
    .map((s) => ({ ...s.item, weight: Math.max(0, Math.min(1, s.effectiveWeight)) }));
}

/**
 * Load the user's active declared interests. beat + entity rows become
 * weight-1.0 lens items; exclude rows post-filter the candidate pool in
 * briefing-scoring. Empty structure on any error - the lens pipeline must
 * not fail just because interest loading misbehaved.
 */
async function loadInterests(
  supabase: SupabaseClient,
  userId: string,
): Promise<LoadedInterests> {
  const empty: LoadedInterests = { beats: [], entities: [], excludes: [] };
  try {
    const { data, error } = await supabase
      .from("briefing_interests")
      .select("id, kind, text")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error || !data) return empty;

    const out: LoadedInterests = { beats: [], entities: [], excludes: [] };
    for (const row of data as Array<{ id: string; kind: string; text: string }>) {
      if (!row.text || row.text.trim().length === 0) continue;
      if (row.kind === "beat") out.beats.push({ id: row.id, text: row.text.trim() });
      else if (row.kind === "entity") out.entities.push({ id: row.id, text: row.text.trim() });
      else if (row.kind === "exclude") out.excludes.push(row.text.trim());
    }
    return out;
  } catch (e) {
    console.warn("briefing-lens: loadInterests failed", e instanceof Error ? e.message : e);
    return empty;
  }
}

/**
 * Build a deterministic prompt hash that uniquely identifies a lens.
 * Includes user, briefing_type, date AND a signature of the input profile
 * so a profile change within the day invalidates the cache.
 */
function buildLensCacheKey(
  userId: string,
  briefingType: string,
  date: string,
  source: LensSource,
): string {
  const signature = JSON.stringify({
    o: source.objectives.map(o => o.text).sort(),
    m: source.missions.map(m => m.title).sort(),
    d: source.decisions.map(d => d.text).sort(),
    w: [...source.watchingCompanies].sort(),
    b: source.blockers.map(b => b.text).sort(),
    r: source.role,
    c: source.company,
    i: source.industry,
  });
  return hashPrompt(`lens:${userId}:${briefingType}:${date}:${signature}`);
}

function lensItemId(type: LensItemType, idx: number): string {
  return `${type}_${idx}`;
}

/**
 * Deterministic fallback lens. Used when the LLM lens call fails or is
 * skipped. Weights are hand-tuned per briefing_type to match the intent of
 * each briefing.
 *
 * Returns at most 8 items, newest/most-active first, weighted 1.0 for the
 * top-priority item type of this briefing and 0.6 for supporting items.
 */
function deterministicLens(
  source: LensSource,
  briefingType: string,
): LensItem[] {
  const items: LensItem[] = [];
  let idx = 0;

  const typeWeights: Record<string, { decision: number; mission: number; watchlist: number; objective: number; blocker: number; pattern: number }> = {
    default: { decision: 1.0, mission: 0.9, watchlist: 0.7, objective: 0.8, blocker: 0.6, pattern: 0.4 },
    macro_trends: { decision: 0.7, mission: 0.8, watchlist: 0.6, objective: 1.0, blocker: 0.5, pattern: 0.3 },
    vendor_landscape: { decision: 1.0, mission: 0.7, watchlist: 0.9, objective: 0.6, blocker: 0.7, pattern: 0.3 },
    competitive_intel: { decision: 0.8, mission: 0.7, watchlist: 1.0, objective: 0.6, blocker: 0.5, pattern: 0.3 },
    boardroom_prep: { decision: 0.9, mission: 1.0, watchlist: 0.7, objective: 0.9, blocker: 0.5, pattern: 0.3 },
    team_update: { decision: 0.7, mission: 1.0, watchlist: 0.5, objective: 0.7, blocker: 0.9, pattern: 0.4 },
    ai_landscape: { decision: 0.9, mission: 0.6, watchlist: 0.6, objective: 0.8, blocker: 0.7, pattern: 0.3 },
    custom_voice: { decision: 0.8, mission: 0.8, watchlist: 0.8, objective: 0.8, blocker: 0.8, pattern: 0.4 },
  };
  const w = typeWeights[briefingType] || typeWeights.default;

  for (const d of source.decisions.slice(0, 3)) {
    items.push({ id: lensItemId("decision", idx++), type: "decision", ref_id: d.id, text: d.text, weight: w.decision });
  }
  for (const m of source.missions.slice(0, 3)) {
    items.push({ id: lensItemId("mission", idx++), type: "mission", ref_id: m.id, text: m.title, weight: w.mission });
  }
  for (const wCo of source.watchingCompanies.slice(0, 4)) {
    items.push({ id: lensItemId("watchlist", idx++), type: "watchlist", ref_id: null, text: wCo, weight: w.watchlist });
  }
  for (const o of source.objectives.slice(0, 3)) {
    items.push({ id: lensItemId("objective", idx++), type: "objective", ref_id: o.id ?? null, text: o.text, weight: w.objective });
  }
  for (const b of source.blockers.slice(0, 2)) {
    items.push({ id: lensItemId("blocker", idx++), type: "blocker", ref_id: b.id ?? null, text: b.text, weight: w.blocker });
  }

  return items
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);
}

/**
 * Stage 1: Importance Lens. Asks gpt-4o-mini to reorder and reweight the
 * deterministic lens based on today's briefing type - letting the LLM apply
 * judgement about which profile items actually matter for THIS briefing.
 *
 * Cached 24h keyed on (user, briefing_type, date, profile_signature).
 * Falls back to the deterministic lens on any error.
 */
export async function buildImportanceLens(
  supabase: SupabaseClient,
  openaiKey: string | undefined,
  source: LensSource,
  briefingType: string,
  model: string = "gpt-4o-mini",
): Promise<LensResult> {
  const today = new Date().toISOString().split("T")[0];
  const interests = await loadInterests(supabase, source.userId);

  // Interests become weight-1.0 lens items, prepended to the deterministic
  // baseline. They outrank inferred signals by construction.
  const interestItems: LensItem[] = [
    ...interests.beats.map(b => ({
      id: `interest_beat_${b.id}`,
      type: "interest_beat" as const,
      ref_id: b.id,
      text: b.text,
      weight: 1.0,
    })),
    ...interests.entities.map(e => ({
      id: `interest_entity_${e.id}`,
      type: "interest_entity" as const,
      ref_id: e.id,
      text: e.text,
      weight: 1.0,
    })),
  ];

  const baseline = deterministicLens(source, briefingType);
  // Cap at 10 (was 8) so users with 3-5 interests still get baseline coverage.
  const preFeedback = [...interestItems, ...baseline].slice(0, 10);

  // Apply persisted negative feedback BEFORE the LLM reweight so the LLM
  // never sees items the user explicitly killed or aggregated-down. Interests
  // are subject to the same rule: users can kill their own past interests.
  const feedbackDeltas = await loadLensFeedbackDeltas(supabase, source.userId);
  const combined = await applyFeedbackDeltas(preFeedback, feedbackDeltas);

  if (combined.length === 0) return { items: [], excludes: interests.excludes };
  if (!openaiKey) return { items: combined, excludes: interests.excludes };

  const cacheKey = buildLensCacheKey(source.userId, briefingType, today, source);
  const cached = await getCachedResponse(supabase, cacheKey, LENS_CACHE_MODEL, LENS_CACHE_TTL_MS);
  if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
    // Fresh interests always overlay the cache so a user toggling Interests
    // mid-day sees the effect without waiting for cache expiry. Same for
    // negative feedback - kills need to take effect immediately.
    const cachedItems = cached.items as LensItem[];
    const merged = mergeInterestsIntoCached(interestItems, cachedItems);
    const filtered = await applyFeedbackDeltas(merged, feedbackDeltas);
    return { items: filtered, excludes: interests.excludes };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              `You build a RELEVANCE LENS for a personalised news briefing. Reorder and reweight the candidate lens items so the items most relevant to a "${briefingType}" briefing rise to the top. Weights must be between 0 and 1. Keep every item id unchanged. Return AT MOST 10 items, sorted by weight descending. Do not invent new items. Items whose id starts with "interest_" are USER-DECLARED preferences - their weight must remain >= ${INTEREST_WEIGHT_FLOOR}. Return JSON: {"items": [{"id":"...","type":"...","ref_id":"...","text":"...","weight":0.85}]}`,
          },
          {
            role: "user",
            content: JSON.stringify({
              leader: {
                role: source.role,
                company: source.company,
                industry: source.industry,
              },
              briefing_type: briefingType,
              candidate_items: combined,
            }),
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return { items: combined, excludes: interests.excludes };
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return { items: combined, excludes: interests.excludes };

    const parsed = JSON.parse(content);
    const raw = Array.isArray(parsed.items) ? parsed.items : [];
    const allowedIds = new Set(combined.map(b => b.id));
    const byId = new Map(combined.map(b => [b.id, b]));

    const items: LensItem[] = raw
      .filter((r: Record<string, unknown>) => typeof r.id === "string" && allowedIds.has(r.id as string))
      .map((r: Record<string, unknown>) => {
        const b = byId.get(r.id as string)!;
        let w = typeof r.weight === "number" ? r.weight : b.weight;
        // Clamp interest items to the floor so the LLM can't demote them.
        if (b.type === "interest_beat" || b.type === "interest_entity") {
          w = Math.max(INTEREST_WEIGHT_FLOOR, w);
        }
        return { ...b, weight: Math.max(0, Math.min(1, w)) };
      })
      .slice(0, 10);

    const finalItems = items.length > 0 ? items : combined;
    await setCachedResponse(supabase, cacheKey, LENS_CACHE_MODEL, { items: finalItems }, LENS_CACHE_TTL_MS);
    return { items: finalItems, excludes: interests.excludes };
  } catch (e) {
    console.warn("briefing-lens: LLM lens failed, using deterministic", e instanceof Error ? e.message : e);
    return { items: combined, excludes: interests.excludes };
  }
}

/**
 * When we pull a cached lens, the user may have added or removed interests
 * since the cache was written. Overlay the current interest items on top of
 * the cached list so they take effect immediately.
 */
function mergeInterestsIntoCached(currentInterests: LensItem[], cached: LensItem[]): LensItem[] {
  const currentIds = new Set(currentInterests.map(i => i.id));
  const nonInterestCached = cached.filter(c => c.type !== "interest_beat" && c.type !== "interest_entity");
  // Also drop any cached interest that is no longer active.
  const stillActiveCachedInterests = cached.filter(c =>
    (c.type === "interest_beat" || c.type === "interest_entity") && currentIds.has(c.id),
  );
  const existingIds = new Set(stillActiveCachedInterests.map(c => c.id));
  const addedInterests = currentInterests.filter(i => !existingIds.has(i.id));
  return [...addedInterests, ...stillActiveCachedInterests, ...nonInterestCached].slice(0, 10);
}

/**
 * Stage 2: Query Planner. Turns the lens into 4-6 targeted news queries.
 * Uses training_material.hot_signal_taxonomy and watchlist to bias queries
 * toward must-include categories and away from drop categories.
 *
 * If no LLM is available, falls back to a deterministic template (verbatim
 * lens_item.text). The template fallback is per-plan design: the lens itself
 * is the real unlock; the planner LLM is polish.
 */
export async function planQueries(
  openaiKey: string | undefined,
  lens: LensItem[],
  training: TrainingMaterial | undefined,
  briefingType: string,
  customContext: string | undefined,
  industry: string | undefined = undefined,
  model: string = "gpt-4o-mini",
): Promise<PlannedQuery[]> {
  const topLens = lens.slice(0, 6);
  if (topLens.length === 0) return [];

  const deterministic: PlannedQuery[] = topLens.slice(0, 5).map(item => ({
    query: queryForLensItem(item, briefingType, industry),
    intent: `Coverage of ${item.type} "${truncate(item.text, 60)}"`,
    target_lens_item_id: item.id,
  }));

  if (!openaiKey) return deterministic;

  try {
    const mustInclude = training?.hot_signal_taxonomy?.must_include ?? [];
    const drop = training?.hot_signal_taxonomy?.drop ?? [];
    const watchlist = training?.watchlist ?? { companies: [], people: [], themes: [] };
    const industryGuidance = industryQueryBias(industry);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              `You are a news-search query planner. Given a lens (items that matter to a specific leader today) produce 4-6 distinct web-search queries. Each query must target exactly one lens item. Every query must cite the target lens item's id. Prefer specific named entities over generic topics. Bias queries toward must_include categories; never target drop categories.

Industry scoping is critical: the leader works in "${industry ?? "an unspecified industry"}". Every query MUST stay within that industry's adjacent domains (see industry_bias.include). Queries MUST NOT drift into industry_bias.exclude domains unless a lens item explicitly names that domain. E.g., a technology leader should not receive biomedical, clinical, or pharmaceutical queries unless a lens item explicitly names biotech. When uncertain, stay inside industry_bias.include.

Return JSON: {"queries":[{"query":"...","intent":"...","target_lens_item_id":"..."}]}`,
          },
          {
            role: "user",
            content: JSON.stringify({
              briefing_type: briefingType,
              custom_context: customContext ?? null,
              leader_industry: industry ?? null,
              industry_bias: industryGuidance,
              lens: topLens,
              must_include: mustInclude,
              drop,
              watchlist,
            }),
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return deterministic;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return deterministic;

    const parsed = JSON.parse(content);
    const raw = Array.isArray(parsed.queries) ? parsed.queries : [];
    const allowedIds = new Set(topLens.map(t => t.id));
    const cleaned: PlannedQuery[] = raw
      .filter((q: Record<string, unknown>) =>
        typeof q.query === "string" &&
        (q.query as string).trim().length > 3 &&
        typeof q.target_lens_item_id === "string" &&
        allowedIds.has(q.target_lens_item_id as string),
      )
      .map((q: Record<string, unknown>) => ({
        query: (q.query as string).trim(),
        intent: typeof q.intent === "string" ? (q.intent as string) : "Coverage",
        target_lens_item_id: q.target_lens_item_id as string,
      }))
      .slice(0, 6);

    return cleaned.length >= 3 ? cleaned : deterministic;
  } catch (e) {
    console.warn("briefing-lens: planner failed, using deterministic", e instanceof Error ? e.message : e);
    return deterministic;
  }
}

function queryForLensItem(
  item: LensItem,
  briefingType: string,
  industry?: string,
): string {
  const base = item.text.trim();
  // Industry-scoped suffix keeps deterministic-fallback queries from drifting
  // across domains when the lens item text is generic (e.g., "AI" alone).
  const bias = industryQueryBias(industry);
  const scope =
    bias.include.length > 0 && !mentionsIndustryDomain(base, bias)
      ? ` (${bias.include.slice(0, 2).join(" OR ")})`
      : "";
  switch (item.type) {
    case "watchlist":
      return briefingType === "competitive_intel"
        ? `"${base}" strategy OR product OR hiring latest`
        : `"${base}" news latest`;
    case "decision":
      return `${base} industry news 2026${scope}`;
    case "mission":
      return `${base} latest developments${scope}`;
    case "objective":
      return `${base} trends 2026${scope}`;
    case "blocker":
      return `${base} solutions OR tools${scope}`;
    case "pattern":
      return `${base}${scope}`;
  }
}

/**
 * Industry → domain include/exclude lists for query biasing. This is the
 * guardrail that keeps a technology leader from receiving biomedical
 * headlines when lens items are generic (e.g., "AI", "productivity").
 *
 * Unknown industries get a permissive default (no scoping) so the planner
 * can still function. To add an industry, extend the switch.
 */
export function industryQueryBias(industry: string | undefined): {
  include: string[];
  exclude: string[];
} {
  const norm = (industry ?? "").trim().toLowerCase();
  if (!norm) return { include: [], exclude: [] };
  if (/tech|software|saas|ai|platform|developer/.test(norm)) {
    return {
      include: ["SaaS", "enterprise software", "AI infrastructure", "developer tools", "cloud platforms"],
      exclude: ["biomedical", "clinical trial", "pharma", "drug approval", "medical device"],
    };
  }
  if (/finance|banking|fintech|capital|invest|asset/.test(norm)) {
    return {
      include: ["fintech", "capital markets", "banking", "payments", "asset management"],
      exclude: ["biomedical", "clinical trial", "pharma"],
    };
  }
  if (/health|bio|pharma|medical|clinic/.test(norm)) {
    return {
      include: ["biotech", "clinical trial", "pharma", "medical device", "digital health"],
      exclude: ["consumer retail", "fashion"],
    };
  }
  if (/retail|consumer|e-?commerce|brand/.test(norm)) {
    return {
      include: ["retail", "consumer brands", "e-commerce", "DTC", "supply chain"],
      exclude: ["biomedical", "clinical trial"],
    };
  }
  if (/energy|oil|gas|utility|power|renewable/.test(norm)) {
    return {
      include: ["energy markets", "renewables", "grid", "oil & gas", "utilities"],
      exclude: ["biomedical", "clinical trial"],
    };
  }
  if (/legal|law|compliance/.test(norm)) {
    return {
      include: ["legal", "regulation", "compliance", "policy"],
      exclude: ["biomedical", "clinical trial"],
    };
  }
  return { include: [], exclude: [] };
}

function mentionsIndustryDomain(
  text: string,
  bias: { include: string[]; exclude: string[] },
): boolean {
  const lower = text.toLowerCase();
  for (const term of [...bias.include, ...bias.exclude]) {
    if (lower.includes(term.toLowerCase())) return true;
  }
  return false;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "\u2026";
}
