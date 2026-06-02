/**
 * briefing-curation - Stage 5: Budget-constrained segment picker.
 *
 * Takes the scored+deduped candidate pool from Stage 4 and the lens from
 * Stage 1. Produces the final ordered list of segments with explicit
 * lens_item_id, relevance_score, and matched_profile_fact - the three
 * fields the v1 pipeline never captured.
 *
 * Constraints applied:
 *   - Word budget from training_material.structural_rubric[type].word_budget
 *     (already in the YAML) - replaces the hardcoded "keep 6-8" rule
 *   - Diversity: no 3x same lens_item unless the user has ≤2 active items
 *   - Coverage: at least one segment per top-weight lens item when possible
 *
 * Output feeds directly into the script-generation stage (Stage 6) which
 * stays unchanged from v1.
 */

import type { LensItem } from "./briefing-lens.ts";
import type { ScoredHeadline } from "./briefing-scoring.ts";

export interface CuratedSegment {
  headline: string;
  analysis: string;
  framework_tag: "signal" | "noise" | "decision_trigger" | "krishs_take";
  source: string;
  relevance_reason: string;
  lens_item_id: string;
  relevance_score: number;
  matched_profile_fact: string;
}

interface WordBudget {
  target: number;
  tolerance: number;
}

/**
 * Convert the training-material rubric word_budget into a segment count
 * target. Scripts run ~80-120 words per segment per the v1 prompt; we use
 * 100 as the midpoint and clamp to a sensible range.
 */
export function segmentCountFromBudget(
  budget: WordBudget,
  minSegments = 3,
  maxSegments = 6,
): number {
  const expanded = Math.round(budget.target / 100);
  return Math.max(minSegments, Math.min(maxSegments, expanded));
}

/**
 * Pick the final segments from a scored pool, respecting diversity and
 * coverage. Uses gpt-4o-mini with structured output for the rewrite step;
 * falls back to a deterministic pass if the LLM call fails.
 */
export async function curateSegments(
  openaiKey: string,
  pool: ScoredHeadline[],
  lens: LensItem[],
  briefingType: string,
  customContext: string | undefined,
  leaderDesc: string,
  targetCount: number,
  model: string = "gpt-4o-mini",
): Promise<CuratedSegment[]> {
  if (pool.length === 0 || lens.length === 0) return [];

  const eligible = pool.slice(0, Math.min(pool.length, 20));
  const lensById = new Map(lens.map(l => [l.id, l]));

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
              `You are the final editor of a personalised news briefing for a ${leaderDesc}. You will receive a ranked pool of candidate headlines and the relevance lens they were scored against. Pick UP TO ${targetCount} segments - only those that are genuinely relevant to the lens. If the pool is thin or weakly matched, returning fewer segments is correct. A deliberately short, tight briefing is better than one padded with filler.

Rules:
- Every segment MUST reference a lens item id from the provided list.
- Never include a candidate that is not genuinely on-topic for its lens item, even if it is the highest-scored remaining option.
- Diversity: if the lens has 3 or more items, do NOT pick 3 segments that map to the same lens item id.
- Coverage: prefer picks that span the top-3 highest-weight lens items when eligible.
- Rewrite each headline in 8-16 words from THIS leader's perspective; never generic news framing.
- analysis: 2-3 sentences on specific impact to this leader. Must name the lens item text or the matched profile fact.
- relevance_reason: one sentence, prose, tying the story to the lens item.
- matched_profile_fact: the quoted text from the matched lens item (copy from lens_item.text).
- framework_tag: one of signal | decision_trigger | krishs_take. Never noise in the output.

Return JSON: {"segments":[{"headline":"","analysis":"","framework_tag":"","source":"","relevance_reason":"","lens_item_id":"","relevance_score":0,"matched_profile_fact":""}]}`,
          },
          {
            role: "user",
            content: JSON.stringify({
              briefing_type: briefingType,
              custom_context: customContext ?? null,
              target_count: targetCount,
              lens,
              candidates: eligible.map(c => ({
                headline: c.title,
                source: c.source,
                snippet: c.snippet ?? null,
                provider: c.provider,
                relevance_score: Number(c.relevance_score.toFixed(4)),
                matched_lens_item_id: c.matched_lens_item_id,
              })),
            }),
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return deterministicPick(eligible, lensById, targetCount);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return deterministicPick(eligible, lensById, targetCount);

    const parsed = JSON.parse(content);
    const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];

    const cleaned: CuratedSegment[] = rawSegments
      .filter((s: Record<string, unknown>) =>
        typeof s.headline === "string" &&
        typeof s.analysis === "string" &&
        typeof s.source === "string" &&
        typeof s.lens_item_id === "string" &&
        lensById.has(s.lens_item_id as string),
      )
      .map((s: Record<string, unknown>) => {
        const lensItem = lensById.get(s.lens_item_id as string)!;
        const tag = normaliseTag(typeof s.framework_tag === "string" ? (s.framework_tag as string) : "signal");
        return {
          headline: (s.headline as string).trim(),
          analysis: (s.analysis as string).trim(),
          framework_tag: tag,
          source: (s.source as string).trim(),
          relevance_reason: typeof s.relevance_reason === "string" ? (s.relevance_reason as string).trim() : `Tied to ${lensItem.type}: ${lensItem.text}`,
          lens_item_id: lensItem.id,
          relevance_score: typeof s.relevance_score === "number" ? (s.relevance_score as number) : 0,
          matched_profile_fact: typeof s.matched_profile_fact === "string" && (s.matched_profile_fact as string).length > 0
            ? (s.matched_profile_fact as string)
            : lensItem.text,
        };
      })
      .slice(0, targetCount);

    if (cleaned.length === 0) return deterministicPick(eligible, lensById, targetCount);

    const diversified = enforceDiversity(cleaned, lens.length);
    return diversified;
  } catch (e) {
    console.warn("briefing-curation: LLM pick failed, using deterministic", e instanceof Error ? e.message : e);
    return deterministicPick(eligible, lensById, targetCount);
  }
}

function normaliseTag(raw: string): CuratedSegment["framework_tag"] {
  const s = raw.toLowerCase().replace(/\s+/g, "_");
  if (s === "decision_trigger") return "decision_trigger";
  if (s === "krishs_take" || s === "krish_take" || s === "krish's_take") return "krishs_take";
  if (s === "noise") return "signal";
  return "signal";
}

/**
 * If the lens has 3+ items, cap same-lens_item picks at 2. Drop over-quota
 * picks in order (lowest relevance_score first within the offending lens).
 */
function enforceDiversity(
  segments: CuratedSegment[],
  lensSize: number,
): CuratedSegment[] {
  if (lensSize < 3) return segments;
  const perLens: Record<string, CuratedSegment[]> = {};
  for (const seg of segments) {
    (perLens[seg.lens_item_id] ||= []).push(seg);
  }
  const out: CuratedSegment[] = [];
  for (const seg of segments) {
    const bucket = perLens[seg.lens_item_id];
    if (!bucket) continue;
    if (bucket.length <= 2 || bucket.indexOf(seg) < 2) out.push(seg);
  }
  return out;
}

/**
 * Deterministic fallback. Picks top-scored candidate per lens item until the
 * target count is reached, then fills remaining slots with the highest-
 * scored candidates overall.
 */
function deterministicPick(
  pool: ScoredHeadline[],
  lensById: Map<string, LensItem>,
  targetCount: number,
): CuratedSegment[] {
  const seen = new Set<string>();
  const picks: ScoredHeadline[] = [];

  // First: best per top-weight lens item.
  const lensItems = [...lensById.values()].sort((a, b) => b.weight - a.weight);
  for (const lensItem of lensItems) {
    if (picks.length >= targetCount) break;
    const best = pool.find(p => p.matched_lens_item_id === lensItem.id && !seen.has(p.title));
    if (best) {
      picks.push(best);
      seen.add(best.title);
    }
  }

  // Fill remaining slots with top overall.
  for (const c of pool) {
    if (picks.length >= targetCount) break;
    if (seen.has(c.title)) continue;
    picks.push(c);
    seen.add(c.title);
  }

  return picks.map(p => {
    const lensItem = lensById.get(p.matched_lens_item_id);
    const anchor = lensItem?.text ?? "your priorities";
    return {
      headline: p.title.replace(/^\[.*?\]\s*/, ""),
      analysis: `Ties directly to ${anchor}. Worth scanning for how it shifts your next move.`,
      framework_tag: "signal" as const,
      source: p.source,
      relevance_reason: `Matched via ${lensItem?.type ?? "priority"}: ${anchor}`,
      lens_item_id: p.matched_lens_item_id,
      relevance_score: p.relevance_score,
      matched_profile_fact: anchor,
    };
  });
}
