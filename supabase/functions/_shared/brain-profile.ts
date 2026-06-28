/**
 * brain-profile - the ONE per-user "digital brain" accessor.
 *
 * The product rule is "no silos": a leader's memory facts, their identity
 * (vertical / role), their goals and decisions, AND every tuning preference
 * (the news boosts/bias that used to live in `news_preferences`, the briefing
 * interests/excludes that used to live in `briefing_interests`) must all read
 * out of ONE place. This module is that place: `loadBrainProfile` merges those
 * sources into a single `BrainProfile`, and BOTH the Home feed (`live-headlines`)
 * and the audio Briefing (`generate-briefing`) score against it, so their
 * headlines can never diverge.
 *
 * Physical write-paths stay in their semantically-correct tables (memory facts
 * in `user_memory`, tuning in `news_preferences`, interests in
 * `briefing_interests`), but the READ is unified: the tuning + interest signals
 * come from ONE normalized view (`brain_profile_inputs`) the accessor queries
 * once, so callers see a single brain repository. (They are deliberately NOT
 * merged into `user_memory`, which is "facts about the leader" consumed by the
 * brain graph / skills / Memory Center - tuning rows there would masquerade as
 * biographical facts.)
 *
 * Pure helpers (completeness/gate, signature, lens projection) carry no runtime
 * imports so they unit-test under vitest; the I/O path (`loadBrainProfile`)
 * pulls its Deno-only deps via a dynamic import so importing this module stays
 * cheap for tests.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { LensSource } from "./briefing-lens.ts";

/** Bump to invalidate every per-user pool cache when the scoring inputs change. */
export const BRAIN_SIGNATURE_VERSION = "v1";

/** getUserContext defaults role to this when the user hasn't declared one. */
const DEFAULT_ROLE = "executive";

/** Minimum positive interests (beats + entities) the profile gate requires. */
export const MIN_GATE_INTERESTS = 3;

export type NewsBias = "big" | "practical" | "balanced";

export interface BrainInterest {
  id: string;
  text: string;
}

/**
 * What the profile gate decided, and why. `passesGate` is the single boolean
 * the surfaces check before showing ANY headlines or audio; `missing` drives
 * the "complete your brain to unlock" affordance.
 */
export interface BrainCompleteness {
  hasVertical: boolean;
  hasRole: boolean;
  interestCount: number;
  passesGate: boolean;
  missing: Array<"vertical" | "role" | "interests">;
}

/**
 * The unified per-user brain. A superset of the briefing `LensSource` plus the
 * tuning + interests that used to be siloed, plus the derived gate.
 */
export interface BrainProfile {
  userId: string;
  name: string;
  role: string;
  company: string;
  /** Industry / sector. Gate-critical. */
  vertical: string;

  objectives: string[];
  blockers: string[];
  preferences: string[];
  watchingCompanies: string[];
  missions: Array<{ id: string; title: string }>;
  decisions: Array<{ id: string; text: string }>;
  patterns: Array<{ type: string; text: string; confidence: number }>;

  /** Tuning (was `news_preferences`). */
  boostedCategories: string[];
  newsBias: NewsBias;

  /** Interests / excludes (was `briefing_interests`). */
  interestBeats: BrainInterest[];
  interestEntities: BrainInterest[];
  excludes: string[];

  /** The briefing lens projection (real mission/decision ids preserved). */
  lensSource: LensSource;

  /** Derived profile gate. */
  completeness: BrainCompleteness;
}

/* ------------------------------------------------------------------ */
/* Pure helpers (no runtime imports - unit-tested directly)            */
/* ------------------------------------------------------------------ */

/**
 * Decide whether the brain is loaded enough to curate for. The rule: a real
 * vertical AND a real role AND at least MIN_GATE_INTERESTS positive interests.
 * `role` is treated as unset when it is blank or still the getUserContext
 * default ("executive"), so a never-onboarded user is gated rather than served
 * a generic feed.
 */
export function computeCompleteness(input: {
  vertical: string;
  role: string;
  interestCount: number;
}): BrainCompleteness {
  const hasVertical = input.vertical.trim().length > 0;
  const hasRole =
    input.role.trim().length > 0 && input.role.trim().toLowerCase() !== DEFAULT_ROLE;
  const interestCount = Math.max(0, input.interestCount);
  const missing: BrainCompleteness["missing"] = [];
  if (!hasVertical) missing.push("vertical");
  if (!hasRole) missing.push("role");
  if (interestCount < MIN_GATE_INTERESTS) missing.push("interests");
  return {
    hasVertical,
    hasRole,
    interestCount,
    passesGate: missing.length === 0,
    missing,
  };
}

/** Stable, order-independent serialization of a string list. */
function normList(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim().toLowerCase()).filter(Boolean))].sort();
}

/**
 * A deterministic signature of the inputs that affect curation. Two brains that
 * would produce the same ranking share a signature; any change to identity,
 * goals, decisions, watchlist, tuning, or interests changes it. Used as the
 * per-user pool cache key so curation refreshes the moment the brain changes
 * (the self-recursive loop) without re-scoring on every request.
 */
export function brainSignature(profile: BrainProfile): string {
  const shape = {
    v: BRAIN_SIGNATURE_VERSION,
    role: profile.role.trim().toLowerCase(),
    vertical: profile.vertical.trim().toLowerCase(),
    objectives: normList(profile.objectives),
    blockers: normList(profile.blockers),
    missions: normList(profile.missions.map((m) => m.title)),
    decisions: normList(profile.decisions.map((d) => d.text)),
    watch: normList(profile.watchingCompanies),
    boosted: normList(profile.boostedCategories),
    bias: profile.newsBias,
    beats: normList(profile.interestBeats.map((b) => b.text)),
    entities: normList(profile.interestEntities.map((e) => e.text)),
    excludes: normList(profile.excludes),
  };
  return JSON.stringify(shape);
}

/**
 * The briefing lens projection, for callers that still speak `LensSource`.
 * Carries the leader's news tuning (boosted lanes + scan bias) onto the lens
 * source so the briefing's query planner leans the SAME way as the tuned Home
 * feed - the "no silos" promise, now end to end.
 */
export function toLensSource(profile: BrainProfile): LensSource {
  return {
    ...profile.lensSource,
    boosted: profile.boostedCategories,
    bias: profile.newsBias,
  };
}

/* ------------------------------------------------------------------ */
/* I/O path (Deno runtime; deps pulled dynamically to keep tests light)*/
/* ------------------------------------------------------------------ */

/**
 * Load the unified brain for a user. Composes the existing memory/lens loaders
 * (so identity, goals, decisions, patterns and real ids are reused verbatim)
 * and merges in the tuning + interest signals that used to be siloed. Returns a
 * fully-formed BrainProfile even when sub-reads fail - the gate just reflects
 * whatever was actually found.
 */
export async function loadBrainProfile(
  supabase: SupabaseClient,
  userId: string,
  opts?: { collectTouchIds?: string[] },
): Promise<BrainProfile> {
  // Dynamic import: keeps this module's top level free of Deno/esm.sh runtime
  // deps so the pure helpers above import cleanly under vitest.
  const { getUserContext, loadLensSource } = await import("./user-context.ts");

  const ctx = await getUserContext(supabase, userId, opts);
  const lensSource = await loadLensSource(supabase, userId, ctx);

  // ONE read of the unified view yields tuning + interests together.
  const { boostedCategories, newsBias, interests } = await loadTuning(supabase, userId);

  const completeness = computeCompleteness({
    vertical: ctx.industry,
    role: ctx.role,
    interestCount: interests.beats.length + interests.entities.length,
  });

  return {
    userId,
    name: ctx.name,
    role: ctx.role,
    company: ctx.company,
    vertical: ctx.industry,
    objectives: ctx.objectives,
    blockers: ctx.blockers,
    preferences: ctx.preferences,
    watchingCompanies: ctx.watchingCompanies,
    missions: lensSource.missions,
    decisions: lensSource.decisions,
    patterns: lensSource.patterns,
    boostedCategories,
    newsBias,
    interestBeats: interests.beats,
    interestEntities: interests.entities,
    excludes: interests.excludes,
    lensSource,
    completeness,
  };
}

interface LoadedInterests {
  beats: BrainInterest[];
  entities: BrainInterest[];
  excludes: string[];
}

interface LoadedTuning {
  boostedCategories: string[];
  newsBias: NewsBias;
  interests: LoadedInterests;
}

/**
 * The one tuning read. Pulls every non-fact brain input (boosted categories,
 * scan bias, interests/excludes) from the unified `brain_profile_inputs` view in
 * a single query and partitions by kind. Degrades to neutral defaults on any
 * error so a missing/again-unreachable view never nukes the profile.
 */
async function loadTuning(
  supabase: SupabaseClient,
  userId: string,
): Promise<LoadedTuning> {
  const interests: LoadedInterests = { beats: [], entities: [], excludes: [] };
  const boosted: string[] = [];
  let newsBias: NewsBias = "balanced";
  try {
    const { data, error } = await supabase
      .from("brain_profile_inputs")
      .select("kind, value, ref_id, interest_kind")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error || !data) return { boostedCategories: boosted, newsBias, interests };
    for (const row of data as Array<{ kind: string; value: string; ref_id: string | null; interest_kind: string | null }>) {
      const value = (row.value ?? "").trim();
      if (!value) continue;
      if (row.kind === "boosted_category") {
        boosted.push(value);
      } else if (row.kind === "bias") {
        newsBias = value === "big" || value === "practical" ? value : "balanced";
      } else if (row.kind === "interest") {
        if (row.interest_kind === "beat") interests.beats.push({ id: row.ref_id ?? value, text: value });
        else if (row.interest_kind === "entity") interests.entities.push({ id: row.ref_id ?? value, text: value });
        else if (row.interest_kind === "exclude") interests.excludes.push(value);
      }
    }
    return { boostedCategories: boosted, newsBias, interests };
  } catch {
    return { boostedCategories: boosted, newsBias, interests };
  }
}
