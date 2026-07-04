// Synthesis stage: calibrated recommendation, the strongest counter-case, the
// single load-bearing assumption whose failure breaks the decision, and a
// short "validate next" list. Commercial judgment only, never medical / legal
// / financial advice, never more certainty than the verdicts support.

import type { UserContext } from "../_shared/user-context.ts";
import { reason, parseLLMJson } from "./llm.ts";
import { stripEmDashes } from "../_shared/sanitize.ts";
import type { AdviseResult, ClaimVerdict, ExtractedClaim } from "./types.ts";

const SYSTEM = `You are the synthesis stage of CTRL's decision engine for senior leaders.
You are given a decision, the leader's context, and a verified breakdown of the claims it rests on (each with a verdict and confidence). Produce calibrated, useful advice.

CTRL is ONLY about building, orchestrating, productizing, and getting to market the AI-native version of a business. The decision you advise on is AI-native (it has passed the reframe stage). Reason strictly within the AI-native decision model and NEVER drift into generic business advice. If you find yourself recommending a generic business move (hire, raise prices, expand a market) with no AI-native angle, pull it back to the AI-native version of that move.

The AI-native dimensions to weigh the move on:
- Capability fit: can the AI actually do this yet
- Economics: cost to build plus run vs the value
- Autonomy and risk: how much AI can own, where the human checkpoint is, the failure surface
- Build vs buy: your build vs a vendor or model, lock-in vs portability
- Org readiness: the skills and structure to run it
- Sequencing: is this the right next move, or does something come first

Hard rules:
- AI-native judgment only: building, orchestrating, productizing, or going to market with AI. Never give general business advice, and never give medical, legal, or financial-investment advice. If the decision strays into those, say so and recommend a qualified professional.
- Your confidence must track the evidence. If load-bearing claims are unverified or contested, your confidence must be low and you must say why.
- Always include the strongest honest counter-case, not a token one.
- Name the single assumption or claim whose failure most breaks the decision (breakpoint).
- Honesty floor: never fabricate evidence; show where the call holds and where it breaks.
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

export interface AdversarialInput {
  refutation: string | null;
  panelRisks: string[];
  disagreement: boolean;
}

export async function advise(
  statement: string,
  ctx: UserContext,
  claims: Array<{ claim: ExtractedClaim; verdict: ClaimVerdict }>,
  tensions: string[],
  adversarial?: AdversarialInput,
): Promise<AdviseResult> {
  const claimLines = claims
    .map((c, i) => {
      const conf = c.verdict.confidence == null ? "n/a" : c.verdict.confidence.toFixed(2);
      const lb = c.claim.is_load_bearing ? " [LOAD-BEARING]" : "";
      return `[${i}] (${c.claim.type})${lb} ${c.claim.text}\n    verdict: ${c.verdict.verdict} (confidence ${conf}). ${c.verdict.rationale}`;
    })
    .join("\n");

  const tensionLines = tensions.length ? tensions.map((t) => `- ${t}`).join("\n") : "none surfaced";

  let adversarialBlock = "";
  if (adversarial) {
    const bits: string[] = [];
    if (adversarial.refutation) bits.push(`Red-team refutation: ${adversarial.refutation}`);
    if (adversarial.panelRisks.length) bits.push(`Panel-identified risks: ${adversarial.panelRisks.join("; ")}`);
    if (adversarial.disagreement) bits.push(`The review panel disagreed on direction, so confidence must be lower.`);
    if (bits.length) adversarialBlock = `\n\nAdversarial review (account for this honestly):\n${bits.join("\n")}`;
  }

  const user = `Decision:
"""
${statement}
"""

Leader context:
${contextBlock(ctx)}

Verified claims:
${claimLines}

Tensions with the leader's own context:
${tensionLines}${adversarialBlock}

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

  // Hold model output to the same no-em-dash house rule the build gate enforces
  // on source (the model does not always comply despite the prompt).
  parsed.recommendation = stripEmDashes((parsed.recommendation ?? "").slice(0, 1200)) || "Insufficient verified evidence to recommend a direction with confidence.";
  parsed.counter_case = stripEmDashes((parsed.counter_case ?? "").slice(0, 1200)) || "Not enough verified signal to construct a counter-case.";
  parsed.confidence = Math.max(0, Math.min(1, typeof parsed.confidence === "number" ? parsed.confidence : 0.3));
  parsed.validate_next = (parsed.validate_next ?? []).filter((s) => typeof s === "string").map((s) => stripEmDashes(s.slice(0, 300))).slice(0, 6);
  if (typeof parsed.breakpoint_claim_index !== "number") parsed.breakpoint_claim_index = -1;
  return parsed;
}
