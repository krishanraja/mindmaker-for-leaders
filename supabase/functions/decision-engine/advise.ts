// Synthesis stage: calibrated recommendation, the strongest counter-case, the
// single load-bearing assumption whose failure breaks the decision, and a
// short "validate next" list. Commercial judgment only, never medical / legal
// / financial advice, never more certainty than the verdicts support.

import type { UserContext } from "../_shared/user-context.ts";
import { reason, parseLLMJson } from "./llm.ts";
import type { AdviseResult, ClaimVerdict, ExtractedClaim } from "./types.ts";

const SYSTEM = `You are the synthesis stage of a decision-verification engine for senior leaders.
You are given a decision, the leader's context, and a verified breakdown of the claims it rests on (each with a verdict and confidence). Produce calibrated, useful advice.

Hard rules:
- Commercial and strategic judgment only. Never give medical, legal, or financial-investment advice. If the decision strays into those, say so and recommend a qualified professional.
- Your confidence must track the evidence. If load-bearing claims are unverified or contested, your confidence must be low and you must say why.
- Always include the strongest honest counter-case, not a token one.
- Name the single assumption or claim whose failure most breaks the decision (breakpoint).
- No em dashes. No filler. Write the way a sharp operator talks.
- Return ONLY valid JSON.`;

function contextBlock(ctx: UserContext): string {
  const lines: string[] = [];
  if (ctx.role) lines.push(`Role: ${ctx.role}`);
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.industry) lines.push(`Industry: ${ctx.industry}`);
  if (ctx.objectives.length) lines.push(`Objectives: ${ctx.objectives.join("; ")}`);
  return lines.join("\n") || "No profile context.";
}

export async function advise(
  statement: string,
  ctx: UserContext,
  claims: Array<{ claim: ExtractedClaim; verdict: ClaimVerdict }>,
  tensions: string[],
): Promise<AdviseResult> {
  const claimLines = claims
    .map((c, i) => {
      const conf = c.verdict.confidence == null ? "n/a" : c.verdict.confidence.toFixed(2);
      const lb = c.claim.is_load_bearing ? " [LOAD-BEARING]" : "";
      return `[${i}] (${c.claim.type})${lb} ${c.claim.text}\n    verdict: ${c.verdict.verdict} (confidence ${conf}). ${c.verdict.rationale}`;
    })
    .join("\n");

  const tensionLines = tensions.length ? tensions.map((t) => `- ${t}`).join("\n") : "none surfaced";

  const user = `Decision:
"""
${statement}
"""

Leader context:
${contextBlock(ctx)}

Verified claims:
${claimLines}

Tensions with the leader's own context:
${tensionLines}

Return JSON exactly:
{
  "recommendation": "one clear, calibrated recommendation in 2-4 sentences",
  "counter_case": "the strongest honest argument against the recommendation, 2-3 sentences",
  "breakpoint_claim_index": 0,
  "confidence": 0.0,
  "validate_next": ["concrete thing to validate before committing", "..."]
}
breakpoint_claim_index is the index of the single claim above whose failure most breaks the decision, or -1 if none.`;

  const raw = await reason(SYSTEM, user, 1800);
  const parsed = parseLLMJson<AdviseResult>(raw);

  parsed.recommendation = (parsed.recommendation ?? "").slice(0, 1200) || "Insufficient verified evidence to recommend a direction with confidence.";
  parsed.counter_case = (parsed.counter_case ?? "").slice(0, 1200) || "Not enough verified signal to construct a counter-case.";
  parsed.confidence = Math.max(0, Math.min(1, typeof parsed.confidence === "number" ? parsed.confidence : 0.3));
  parsed.validate_next = (parsed.validate_next ?? []).filter((s) => typeof s === "string").map((s) => s.slice(0, 300)).slice(0, 6);
  if (typeof parsed.breakpoint_claim_index !== "number") parsed.breakpoint_claim_index = -1;
  return parsed;
}
