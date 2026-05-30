/**
 * Training-material loader.
 *
 * Fetches the active global training material from the `training_material`
 * table (optionally merged with a user-scoped override) and caches the result
 * for 60s. Every consumer (fact-guardrails, generate-briefing, memory-context-
 * builder) goes through this function so a single DB row change propagates
 * everywhere.
 *
 * If the DB lookup fails (no row, no permission, network error) the loader
 * falls back to a small built-in skeleton so consumers never crash. The
 * skeleton is intentionally strict: any banned phrase or reject rule the app
 * depends on MUST live in the authored YAML and the DB row.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateTrainingMaterial, type TrainingMaterial } from "./training-schema.ts";

interface CacheEntry {
  data: TrainingMaterial;
  version: number;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
let globalCache: CacheEntry | null = null;
const userCache = new Map<string, CacheEntry>();

const FALLBACK: TrainingMaterial = {
  version: 0,
  scope: "global",
  voice_card: {
    adjectives: ["direct", "crisp", "high-signal"],
    anti_adjectives: ["breathless", "salesy"],
    register: "executive peer",
    sentence_length: "short to medium",
  },
  do_phrases: {
    openers: ["Heads up."],
    connectors: ["Meanwhile,"],
    closers: ["Net:"],
  },
  dont_phrases: [
    "in today's fast-paced world",
    "dive deep",
    "game-changer",
    "it's worth noting",
    "it remains to be seen",
    "interestingly",
    "furthermore",
    "additionally",
    "moreover",
  ],
  typography_rules: {
    forbidden_chars: ["\u2014", "\u2013"],
    forbidden_tokens: ["em dash", "en dash", "bullet point", "markdown", "word count"],
    replacement_map: { "\u2014": ", ", "\u2013": "-" },
  },
  extraction_rejects: [
    { id: "meta_instruction", pattern: "^(don'?t|do not|avoid|never|stop|please stop|make sure you|you should)\\b", reason: "output-shaping instruction", field: "fact_context" },
    { id: "style_rule", pattern: "(em[\\s-]?dash|en[\\s-]?dash|bullet|markdown|format|tone|voice|word\\s*count)", reason: "typography/style rule", field: "both" },
    { id: "transient_state", pattern: "(i'?m tired|running late|feeling \\w+ today)", reason: "transient context", field: "both" },
    { id: "third_party_identity", pattern: "(my (cofounder|co-founder|partner|cto|ceo)(?: is| was)|our (cto|ceo|vp))", reason: "third party", field: "both" },
    { id: "self_addressed_directive", pattern: "(you should|can you|please (use|write|make))", reason: "addressed to app", field: "fact_context" },
  ],
  preference_subtypes: {
    communication_style: { keywords: ["bullet", "summary", "tldr", "async", "sync"], examples: [] },
    decision_style: { keywords: ["data", "gut", "deliberate"], examples: [] },
    work_style: { keywords: ["morning", "deep work"], examples: [] },
    tool_or_method: { keywords: ["uses", "runs"], examples: [] },
  },
  briefing_exemplars: {},
  hot_signal_taxonomy: { must_include: [], deprioritize: [], drop: [] },
  citation_policy: {
    when_to_cite: "whenever a specific number or name appears",
    uncertainty_phrasing: "use 'reportedly' or 'per <source>' when not first-party",
    never: "speculate on private-company internals without attribution",
  },
  watchlist: { companies: [], people: [], themes: [] },
  structural_rubric: {
    default: { hook: "1 sentence", body: "3-5 stories", close: "1 action", word_budget: 220, tolerance: 0.15 },
  },
  self_check_gate: [
    "Any em dashes or en dashes? Replace.",
    "Any banned phrases? Rewrite.",
  ],
  export_voice_cards: {},
  evaluation_corpus: [],
};

/**
 * Returns the active global training material, cached for 60s. If no global
 * row is active in the DB, returns the in-code FALLBACK (version=0) so the
 * app never breaks.
 */
export async function loadGlobalTraining(
  supabase: SupabaseClient
): Promise<TrainingMaterial> {
  const now = Date.now();
  if (globalCache && globalCache.expiresAt > now) return globalCache.data;

  try {
    const { data, error } = await supabase
      .from("training_material")
      .select("body_parsed, version")
      .eq("scope", "global")
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.body_parsed) {
      console.warn("training-loader: no active global row; using fallback", error?.message);
      return FALLBACK;
    }

    const validated = validateTrainingMaterial(data.body_parsed);
    globalCache = { data: validated, version: validated.version, expiresAt: now + CACHE_TTL_MS };
    return validated;
  } catch (e) {
    console.warn("training-loader: load failed; using fallback", e instanceof Error ? e.message : e);
    return FALLBACK;
  }
}

/**
 * Returns the active user-scoped training material overlay, if any, merged
 * over the global row. If no user row exists, returns the global row
 * unchanged.
 */
export async function loadTrainingForUser(
  supabase: SupabaseClient,
  userId: string | null
): Promise<TrainingMaterial> {
  const global = await loadGlobalTraining(supabase);
  if (!userId) return global;

  const now = Date.now();
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.data;

  try {
    const { data } = await supabase
      .from("training_material")
      .select("body_parsed, version")
      .eq("scope", "user")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.body_parsed) {
      userCache.set(userId, { data: global, version: global.version, expiresAt: now + CACHE_TTL_MS });
      return global;
    }

    const override = validateTrainingMaterial(data.body_parsed);
    const merged: TrainingMaterial = {
      ...global,
      ...override,
      voice_card: { ...global.voice_card, ...override.voice_card },
      do_phrases: { ...global.do_phrases, ...override.do_phrases },
      typography_rules: {
        forbidden_chars: [...new Set([...global.typography_rules.forbidden_chars, ...override.typography_rules.forbidden_chars])],
        forbidden_tokens: [...new Set([...global.typography_rules.forbidden_tokens, ...override.typography_rules.forbidden_tokens])],
        replacement_map: { ...global.typography_rules.replacement_map, ...override.typography_rules.replacement_map },
      },
      dont_phrases: [...new Set([...global.dont_phrases, ...override.dont_phrases])],
      extraction_rejects: [...global.extraction_rejects, ...override.extraction_rejects],
    };

    userCache.set(userId, { data: merged, version: merged.version, expiresAt: now + CACHE_TTL_MS });
    return merged;
  } catch (e) {
    console.warn("training-loader: user overlay failed", e instanceof Error ? e.message : e);
    return global;
  }
}

/** Test hook - clears the in-memory caches. Callers are responsible for re-fetching. */
export function __resetTrainingCache(): void {
  globalCache = null;
  userCache.clear();
}
