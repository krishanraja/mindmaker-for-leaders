/**
 * briefing-scoring - Stage 4: Embedding-based dedupe + first-pass scoring.
 *
 * Given a pool of candidate headlines from Stage 3 and the ranked lens from
 * Stage 1, this module:
 *   1. Batches all candidate embeddings in a single OpenAI call (never loop)
 *   2. Caches lens_item embeddings in ai_response_cache - they are stable
 *      across briefing types within a day and cost the same amount to
 *      re-embed six times
 *   3. Dedupes candidates whose cosine similarity exceeds
 *      BRIEFING_DEDUPE_THRESHOLD (default 0.87 per red-team guidance)
 *   4. Scores each survivor as max_over_lens_items(cos_sim * lens_item.weight)
 *      and annotates it with the winning lens_item_id
 *
 * Each scored candidate carries the evidence needed by Stage 5 (curation) to
 * produce segments with explicit lens_item_id, relevance_score, and
 * matched_profile_fact - replacing the LLM-asserted relevance_reason prose of
 * the v1 pipeline.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCachedResponse, setCachedResponse, hashPrompt } from "./ai-cache.ts";
import type { LensItem } from "./briefing-lens.ts";

export interface CandidateHeadline {
  title: string;
  source: string;
  /** Optional snippet - included in embedding input when present. */
  snippet?: string;
  /** Provider that surfaced this headline (perplexity | tavily | brave). */
  provider: string;
}

export interface ScoredHeadline extends CandidateHeadline {
  relevance_score: number;
  matched_lens_item_id: string;
}

const EMBEDDING_MODEL = "text-embedding-3-small";
const LENS_EMBEDDING_CACHE_MODEL = "lens-item-embed-v1";
const LENS_EMBEDDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SOURCE_AUTHORITY: Record<string, number> = {
  Bloomberg: 5,
  "Financial Times": 5,
  WSJ: 5,
  Reuters: 5,
  NYT: 4,
  HBR: 4,
  "MIT Tech Review": 4,
  CNBC: 3,
  Forbes: 3,
  Axios: 3,
  TechCrunch: 3,
  "The Verge": 3,
  Wired: 3,
  VentureBeat: 2,
  Analysis: 2,
  "Artificial Analysis": 4,
  Web: 1,
};

function authorityOf(source: string): number {
  return SOURCE_AUTHORITY[source] ?? 2;
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Single batched call to the embeddings API. Input array order is preserved
 * in the output - we rely on that to align embeddings back to candidates.
 */
async function embedBatch(openaiKey: string, inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embeddings API error: ${response.status}`);
  }

  const data = await response.json();
  const rows = Array.isArray(data?.data) ? data.data : [];
  // Sort by index - the API guarantees order but we defend against surprises.
  rows.sort((a: { index: number }, b: { index: number }) => a.index - b.index);
  return rows.map((r: { embedding: number[] }) => r.embedding);
}

async function embedLensItems(
  supabase: SupabaseClient,
  openaiKey: string,
  lens: LensItem[],
): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  const missingIdx: number[] = [];

  for (let i = 0; i < lens.length; i++) {
    const item = lens[i];
    const cacheKey = hashPrompt(`lens-embed:${item.text}`);
    const cached = await getCachedResponse(supabase, cacheKey, LENS_EMBEDDING_CACHE_MODEL, LENS_EMBEDDING_TTL_MS);
    if (cached && Array.isArray(cached.v)) {
      out.set(item.id, cached.v as number[]);
    } else {
      missingIdx.push(i);
    }
  }

  if (missingIdx.length > 0) {
    const inputs = missingIdx.map(i => lens[i].text);
    const vectors = await embedBatch(openaiKey, inputs);
    await Promise.all(missingIdx.map(async (origIdx, j) => {
      const item = lens[origIdx];
      const v = vectors[j];
      if (!v) return;
      out.set(item.id, v);
      const cacheKey = hashPrompt(`lens-embed:${item.text}`);
      await setCachedResponse(supabase, cacheKey, LENS_EMBEDDING_CACHE_MODEL, { v }, LENS_EMBEDDING_TTL_MS);
    }));
  }

  return out;
}

function getDedupeThreshold(): number {
  const raw = Deno.env.get("BRIEFING_DEDUPE_THRESHOLD");
  if (!raw) return 0.87;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : 0.87;
}

/**
 * Threshold for excluding a candidate based on cosine similarity to any
 * user-declared exclude. Default 0.80 is intentionally more aggressive than
 * dedupe (0.87) - users who said "never show me geopolitics" shouldn't see
 * borderline geopolitics stories either.
 */
function getExcludeThreshold(): number {
  const raw = Deno.env.get("BRIEFING_EXCLUDE_THRESHOLD");
  if (!raw) return 0.80;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : 0.80;
}

/**
 * Minimum relevance floor: (cosine_sim × lens_item.weight). Below this,
 * a candidate is not genuinely on-topic and is dropped before curation.
 * Prevents "biomedical story for a tech-profile user" drift when the
 * candidate pool is broad and the lens has a weakly-matching item.
 *
 * 0.30 is an initial calibration. Tune via BRIEFING_MIN_RELEVANCE env var
 * or migrate to a briefing_config table column once we have data.
 */
function getMinRelevance(): number {
  const raw = Deno.env.get("BRIEFING_MIN_RELEVANCE");
  if (!raw) return 0.30;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 && n < 1 ? n : 0.30;
}

/**
 * Dedupe + score in one pass.
 *
 * Dedupe rule: if a candidate's cosine similarity against an already-kept
 * candidate exceeds threshold, keep the one with higher source authority;
 * ties break to the earlier candidate. This replaces the old 50-char prefix
 * string-match dedupe which missed semantically-identical stories published
 * with different headlines.
 *
 * Score rule: each surviving candidate's relevance_score is the maximum over
 * all lens items of (cos_sim(candidate, lens_item) * lens_item.weight). The
 * lens_item that produced that max becomes matched_lens_item_id.
 */
export async function dedupeAndScore(
  supabase: SupabaseClient,
  openaiKey: string,
  candidates: CandidateHeadline[],
  lens: LensItem[],
  excludes: string[] = [],
): Promise<ScoredHeadline[]> {
  if (candidates.length === 0 || lens.length === 0) return [];

  const dedupeThreshold = getDedupeThreshold();
  const excludeThreshold = getExcludeThreshold();
  const minRelevance = getMinRelevance();

  const candidateInputs = candidates.map(c =>
    c.snippet && c.snippet.length > 0 ? `${c.title} - ${c.snippet}` : c.title,
  );
  // Embed candidates + excludes in the same batch to avoid a second API call.
  const batchInputs = [...candidateInputs, ...excludes];
  const allVectors = await embedBatch(openaiKey, batchInputs);
  const candidateVectors = allVectors.slice(0, candidateInputs.length);
  const excludeVectors = allVectors.slice(candidateInputs.length);
  const lensVectors = await embedLensItems(supabase, openaiKey, lens);

  // Exclude + dedupe pass. Exclusions short-circuit before dedupe so we
  // don't waste slots comparing them. Authority is the dedupe tiebreaker;
  // earlier provider breaks authority ties.
  const kept: Array<{ cand: CandidateHeadline; vec: number[] }> = [];
  let excludedCount = 0;
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const vec = candidateVectors[i];
    if (!vec) continue;

    // Exclude filter - drop if semantically close to ANY user-declared exclude.
    let isExcluded = false;
    for (const ev of excludeVectors) {
      if (!ev) continue;
      if (cosine(vec, ev) >= excludeThreshold) {
        isExcluded = true;
        break;
      }
    }
    if (isExcluded) {
      excludedCount++;
      continue;
    }

    let duplicateOfIdx = -1;
    for (let k = 0; k < kept.length; k++) {
      if (cosine(vec, kept[k].vec) >= dedupeThreshold) {
        duplicateOfIdx = k;
        break;
      }
    }

    if (duplicateOfIdx === -1) {
      kept.push({ cand, vec });
    } else {
      const existing = kept[duplicateOfIdx];
      if (authorityOf(cand.source) > authorityOf(existing.cand.source)) {
        kept[duplicateOfIdx] = { cand, vec };
      }
    }
  }
  if (excludedCount > 0) {
    console.log(`briefing-scoring: excluded ${excludedCount} candidates via user exclude list`);
  }

  // Score pass.
  const scored: ScoredHeadline[] = [];
  let belowThresholdCount = 0;
  for (const { cand, vec } of kept) {
    let bestScore = 0;
    let bestLensId = lens[0].id;
    for (const lensItem of lens) {
      const lv = lensVectors.get(lensItem.id);
      if (!lv) continue;
      const sim = cosine(vec, lv);
      const weighted = sim * lensItem.weight;
      if (weighted > bestScore) {
        bestScore = weighted;
        bestLensId = lensItem.id;
      }
    }
    // Drop candidates below the minimum relevance floor so curation can't
    // fill "pick N" with weakly-matched filler.
    if (bestScore < minRelevance) {
      belowThresholdCount++;
      continue;
    }
    scored.push({
      ...cand,
      relevance_score: bestScore,
      matched_lens_item_id: bestLensId,
    });
  }
  if (belowThresholdCount > 0) {
    console.log(
      `briefing-scoring: dropped ${belowThresholdCount} candidates below relevance floor ${minRelevance}`,
    );
  }

  scored.sort((a, b) => b.relevance_score - a.relevance_score);
  return scored;
}

/** Test-only helper exported for the scoring unit test. */
export function __cosineForTests(a: number[], b: number[]): number {
  return cosine(a, b);
}
