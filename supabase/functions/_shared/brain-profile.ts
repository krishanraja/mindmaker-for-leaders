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
 * Physical consolidation into `user_memory` happens at the end of the rollout;
 * until then this accessor is the single read API, so callers already see one
 * brain even while the underlying rows are still being unified. Every sub-read
 * degrades independently (a missing table never nukes the profile).
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

/** The briefing lens projection, for callers that still speak `LensSource`. */
export function toLensSource(profile: BrainProfile): LensSource {
  return profile.lensSource;
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

  const [boostedCategories, newsBias, interests] = await Promise.all([
    loadBoostedCategories(supabase, userId),
    loadNewsBias(supabase, userId),
    loadInterests(supabase, userId),
  ]);

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

/**
 * Tuning reads. These still hit `news_preferences` / `briefing_interests`
 * today; the writers converge onto `user_memory` over the rollout and this
 * accessor is the one place that has to change when they do.
 */
async function loadBoostedCategories(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("news_preferences")
      .select("boosted_categories")
      .eq("user_id", userId)
      .maybeSingle();
    const cats = (data as { boosted_categories?: string[] } | null)?.boosted_categories;
    return Array.isArray(cats) ? cats.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function loadNewsBias(
  supabase: SupabaseClient,
  userId: string,
): Promise<NewsBias> {
  try {
    const { data } = await supabase
      .from("news_preferences")
      .select("bias")
      .eq("user_id", userId)
      .maybeSingle();
    const bias = (data as { bias?: string } | null)?.bias;
    return bias === "big" || bias === "practical" ? bias : "balanced";
  } catch {
    return "balanced";
  }
}

interface LoadedInterests {
  beats: BrainInterest[];
  entities: BrainInterest[];
  excludes: string[];
}

async function loadInterests(
  supabase: SupabaseClient,
  userId: string,
): Promise<LoadedInterests> {
  const out: LoadedInterests = { beats: [], entities: [], excludes: [] };
  try {
    const { data, error } = await supabase
      .from("briefing_interests")
      .select("id, kind, text")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error || !data) return out;
    for (const row of data as Array<{ id: string; kind: string; text: string }>) {
      const text = (row.text ?? "").trim();
      if (!text) continue;
      if (row.kind === "beat") out.beats.push({ id: row.id, text });
      else if (row.kind === "entity") out.entities.push({ id: row.id, text });
      else if (row.kind === "exclude") out.excludes.push(text);
    }
    return out;
  } catch {
    return out;
  }
}
