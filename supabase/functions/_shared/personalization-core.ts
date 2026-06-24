/**
 * personalization-core - the ONE curation engine.
 *
 * Both the Home feed (`live-headlines`) and the audio Briefing
 * (`generate-briefing`) score the same gathered, clustered candidate pool
 * against the SAME unified brain (`brain-profile.ts`) through this module, so
 * their headlines provably cannot diverge. It does not invent scoring - it
 * unifies the two that already exist (news-cluster = external trust;
 * briefing-scoring = user fit) into one transparent, ordered methodology.
 *
 * The stages (Stage 1-3 gather/cluster stay shared infra and are passed in;
 * this module owns Stage 0 + Stages 4-8, the per-user half of the two-tier
 * cache):
 *   0. Profile gate        - below the gate, no headlines / no audio.
 *   4. User relevance      - embed candidates + the brain lens; relevance =
 *                            max(cosine x lens_weight); the 0.30 hard gate drops
 *                            off-brain stories (this is what kills the
 *                            "immunology story for a SaaS founder" case).
 *   5. Combine             - one final score (see combineFinalScore).
 *   6. Category balance     - spread the pick across the 9 AI-native lanes.
 *   7. Tuning              - the user's boosts / bias / dislikes.
 *   8. Output              - one per-user scored pool; Home takes the top N,
 *                            the Briefing curates over the same pool.
 *
 * THE METHODOLOGY (signed off in the plan, refined here): user fit LEADS, and
 * external trust / benchmark / freshness only AMPLIFY an already-relevant story
 * (they are multiplied by relevance). That guarantees a less-relevant but viral
 * story can never outrank a more-relevant one on popularity alone - the
 * additive form considered earlier did not guarantee this. Off-brain stories
 * are removed by the hard relevance gate BEFORE this runs. Every weight is a
 * named, exported constant so the owner can tune the math without touching
 * logic.
 *
 * Pure helpers carry no runtime imports (unit-tested under vitest); the I/O
 * path pulls its Deno deps via dynamic import.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { BrainProfile } from "./brain-profile.ts";
import type { LensItem } from "./briefing-lens.ts";
import type { CandidateHeadline, ScoredHeadline } from "./briefing-scoring.ts";

/**
 * The scoring constants - the whole methodology in one block. Tune here.
 */
export const SCORING = {
  /** Weight on user fit (cosine vs the brain lens). User fit LEADS. */
  W_REL: 6,
  /** Weight on external trust (corroboration x reputation x freshness x engagement). */
  W_EXT: 3,
  /** Weight on Artificial-Analysis benchmark enrichment (model-named stories). */
  W_AA: 1,
  /** Weight on raw recency. */
  W_FRESH: 1,
  /** Practical ceiling of the news-cluster external score, for normalising to [0,1]. */
  EXT_MAX: 20,
  /** Hard relevance gate: a story below this max-cosine-vs-lens is dropped. */
  MIN_RELEVANCE: 0.3,
  /** Tuning: a story in a user-boosted category. */
  TUNING_BOOST_CATEGORY: 1.5,
  /** Tuning: a story in a category the user has repeatedly disliked. */
  TUNING_PENALTY_DISLIKED: 2.0,
  /** Tuning: "biggest moves" bias - per extra corroborating source. */
  BIG_BONUS_PER_SOURCE: 0.3,
  BIG_BONUS_CAP: 1.5,
  /** Tuning: "practical" bias - lift for act-on-now lanes. */
  PRACTICAL_BONUS: 0.5,
} as const;

/** The act-on-now lanes the "practical" bias lifts (ids from newsCategory.ts). */
const PRACTICAL_CATEGORIES = new Set(["tools", "product", "proof", "orchestration"]);

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** External cluster score -> [0,1]. */
export function normalizeExternal(externalScore: number): number {
  return clamp01(externalScore / SCORING.EXT_MAX);
}

/** The hard gate: is this story relevant enough to the brain to show at all? */
export function passesRelevanceGate(userRelevance: number): boolean {
  return userRelevance >= SCORING.MIN_RELEVANCE;
}

/** What tuningBoost needs off a candidate. */
export interface TuningTarget {
  category: string;
  sourceCount: number;
}

/**
 * The user's own tuning, read from the unified brain (was the client-side
 * `rankByPreferences` / `news_preferences` silo). Additive: a deliberate user
 * lever on top of the relevance-led base. `dislikedCategories` comes from the
 * self-recursive feedback loop (heart/skip), defaulting to none.
 */
export function tuningBoost(
  target: TuningTarget,
  profile: Pick<BrainProfile, "boostedCategories" | "newsBias">,
  dislikedCategories: string[] = [],
): number {
  let t = 0;
  if (profile.boostedCategories.includes(target.category)) t += SCORING.TUNING_BOOST_CATEGORY;
  if (dislikedCategories.includes(target.category)) t -= SCORING.TUNING_PENALTY_DISLIKED;
  if (profile.newsBias === "big") {
    t += Math.min(SCORING.BIG_BONUS_CAP, SCORING.BIG_BONUS_PER_SOURCE * Math.max(0, target.sourceCount - 1));
  } else if (profile.newsBias === "practical" && PRACTICAL_CATEGORIES.has(target.category)) {
    t += SCORING.PRACTICAL_BONUS;
  }
  return t;
}

export interface CombineInputs {
  /** User fit in [0,1] (max cosine x lens_weight). */
  userRelevance: number;
  /** Raw external cluster score (corroboration x reputation x freshness x engagement). */
  externalScore: number;
  /** Whether a tracked frontier model is named (Artificial Analysis match). */
  aaMatched: boolean;
  /** Recency in [0,1]. */
  freshness: number;
  /** Output of tuningBoost. */
  tuning: number;
}

/**
 * Combine user x external into ONE final score.
 *
 *   finalScore = W_REL * rel
 *              + rel * (W_EXT * extNorm + W_AA * aa + W_FRESH * fresh)
 *              + tuning
 *
 * User fit leads (the W_REL term) AND gates the rest (external/benchmark/
 * freshness are multiplied by rel), so a more-relevant story can never be
 * beaten by a less-relevant, more-viral one. Off-brain stories never reach
 * here - they fail passesRelevanceGate first.
 */
export function combineFinalScore(i: CombineInputs): number {
  const rel = clamp01(i.userRelevance);
  const ext = normalizeExternal(i.externalScore);
  const aa = i.aaMatched ? 1 : 0;
  const fresh = clamp01(i.freshness);
  return (
    SCORING.W_REL * rel +
    rel * (SCORING.W_EXT * ext + SCORING.W_AA * aa + SCORING.W_FRESH * fresh) +
    i.tuning
  );
}

/**
 * A gathered + clustered candidate ready for per-user scoring. Stage 1-3
 * (shared, daily-cached) produce these; the engine adds relevance + finalScore.
 */
export interface EngineCandidate extends CandidateHeadline {
  category: string;
  /** news-cluster external score (corroboration x reputation x freshness x engagement). */
  externalScore: number;
  sourceCount: number;
  /** Recency in [0,1] (news-cluster freshnessScore of the freshest item). */
  freshness: number;
  /** A tracked frontier model is named in this story. */
  aaMatched: boolean;
  url: string | null;
  timeAgo: string | null;
  corroboration: string | null;
}

export interface ScoredPoolItem extends EngineCandidate {
  userRelevance: number;
  matchedLensItemId: string;
  finalScore: number;
}

/**
 * Category-balanced top-N over already-scored items. Spreads the pick across
 * lanes (max `maxPerCategory` each) so one over-represented lane cannot fill
 * the pool; within a lane, higher finalScore first. Generic twin of
 * news-cluster.selectBalanced, over pool items rather than clusters.
 */
export function balanceByCategory<T extends { category: string; finalScore: number }>(
  items: T[],
  max: number,
  maxPerCategory = 3,
): T[] {
  const buckets = new Map<string, T[]>();
  for (const it of items) {
    const arr = buckets.get(it.category) ?? [];
    arr.push(it);
    buckets.set(it.category, arr);
  }
  for (const arr of buckets.values()) arr.sort((a, b) => b.finalScore - a.finalScore);
  const cats = [...buckets.keys()].sort(
    (a, b) => (buckets.get(b)![0]?.finalScore ?? 0) - (buckets.get(a)![0]?.finalScore ?? 0),
  );
  const out: T[] = [];
  const taken = new Map<string, number>();
  let round = 0;
  let added = true;
  while (out.length < max && added) {
    added = false;
    for (const cat of cats) {
      if ((taken.get(cat) ?? 0) >= maxPerCategory) continue;
      const arr = buckets.get(cat)!;
      if (round < arr.length) {
        out.push(arr[round]);
        taken.set(cat, (taken.get(cat) ?? 0) + 1);
        added = true;
        if (out.length >= max) break;
      }
    }
    round++;
  }
  return out;
}

export type PersonalizationResult =
  | { status: "needs_profile"; missing: BrainProfile["completeness"]["missing"]; pool: [] }
  | { status: "ok"; pool: ScoredPoolItem[] };

export interface ScorePoolOptions {
  supabase: SupabaseClient;
  openaiKey: string;
  profile: BrainProfile;
  /** Stage 1-3 output: gathered + clustered + externally-scored candidates. */
  candidates: EngineCandidate[];
  /** The brain's importance lens (built by the caller from the same profile). */
  lens: LensItem[];
  /** Categories the user has repeatedly disliked (self-recursive feedback). */
  dislikedCategories?: string[];
  poolSize?: number;
  perCategory?: number;
}

/**
 * The per-user half of the engine: Stage 0 gate, Stage 4 relevance (with the
 * hard gate), Stage 5 combine, Stage 6 balance, Stage 7 tuning. Returns one
 * scored pool both surfaces consume. Stage 1-3 (gather/cluster) are the
 * caller's shared, daily-cached input.
 */
export async function scorePoolForUser(opts: ScorePoolOptions): Promise<PersonalizationResult> {
  const { profile } = opts;

  // Stage 0 - profile gate.
  if (!profile.completeness.passesGate) {
    return { status: "needs_profile", missing: profile.completeness.missing, pool: [] };
  }
  if (opts.candidates.length === 0 || opts.lens.length === 0) {
    return { status: "ok", pool: [] };
  }

  // Stage 4 - user relevance + the hard 0.30 gate + excludes, reusing the
  // briefing scorer verbatim. Extra EngineCandidate fields survive its `...cand`
  // spread, so each scored story still carries its external signals.
  const { dedupeAndScore } = await import("./briefing-scoring.ts");
  const scored = (await dedupeAndScore(
    opts.supabase,
    opts.openaiKey,
    opts.candidates,
    opts.lens,
    profile.excludes,
  )) as Array<ScoredHeadline & EngineCandidate>;

  // Stages 5 + 7 - combine user x external (+ tuning) into one final score.
  // A repeatedly-disliked category is HARD-dropped (not just penalised): the
  // leader has told us to stop showing that lane, and category-balancing would
  // otherwise keep refilling it. This matches the client's "train the feed".
  const dislikedList = opts.dislikedCategories ?? [];
  const dislikedSet = new Set(dislikedList);
  const pool: ScoredPoolItem[] = scored
    .filter((s) => !dislikedSet.has(s.category))
    .map((s) => {
    const tuning = tuningBoost(
      { category: s.category, sourceCount: s.sourceCount },
      profile,
      dislikedList,
    );
    const finalScore = combineFinalScore({
      userRelevance: s.relevance_score,
      externalScore: s.externalScore,
      aaMatched: s.aaMatched,
      freshness: s.freshness,
      tuning,
    });
    return {
      ...s,
      userRelevance: s.relevance_score,
      matchedLensItemId: s.matched_lens_item_id,
      finalScore,
    };
  });

  // Stage 6 - category balance over the final score.
  const balanced = balanceByCategory(pool, opts.poolSize ?? 20, opts.perCategory ?? 4);
  return { status: "ok", pool: balanced };
}
