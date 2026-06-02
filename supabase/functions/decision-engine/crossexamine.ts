// Cross-examination stage (Edge Pro). Two independent checks on the verified
// breakdown:
//   1. A panel of distinct models each judges the decision. Where they diverge,
//      that disagreement is surfaced as a tension rather than averaged away.
//   2. An adversarial red-team pass (Claude) tries to refute the decision using
//      only the verified claims, and names the single breakpoint.
// Both are advisory inputs to the synthesis stage; neither is treated as truth.

import type { UserContext } from "../_shared/user-context.ts";
import { judgeWithModel, reason, parseLLMJson, type PanelModel } from "./llm.ts";
import type { ClaimVerdict, ExtractedClaim } from "./types.ts";

export interface PanelVote {
  model: PanelModel;
  lean: "support" | "oppose" | "uncertain";
  key_risk: string;
}

export interface CrossExamResult {
  panel: PanelVote[];
  disagreement: boolean;
  disagreementNote: string | null;
  adversarial: { refutation: string; breakpoint_claim_index: number } | null;
}

const PANEL: PanelModel[] = ["claude", "gpt-4o", "gemini", "grok"];

function claimsBlock(claims: Array<{ claim: ExtractedClaim; verdict: ClaimVerdict }>): string {
  return claims
    .map((c, i) => {
      const conf = c.verdict.confidence == null ? "n/a" : c.verdict.confidence.toFixed(2);
      const lb = c.claim.is_load_bearing ? " [LOAD-BEARING]" : "";
      return `[${i}] (${c.claim.type})${lb} ${c.claim.text} -> ${c.verdict.verdict} (${conf})`;
    })
    .join("\n");
}

export async function crossExamine(
  statement: string,
  ctx: UserContext,
  claims: Array<{ claim: ExtractedClaim; verdict: ClaimVerdict }>,
): Promise<CrossExamResult> {
  const block = claimsBlock(claims);
  const roleLine = ctx.role ? `The leader is a ${ctx.role}${ctx.company ? ` at ${ctx.company}` : ""}.` : "";

  const panelSystem = `You are one independent reviewer on a panel judging a business decision. Base your judgment only on the verified claim breakdown provided. Be honest and terse. Return ONLY valid JSON.`;
  const panelUser = `${roleLine}
Decision: "${statement}"

Verified claim breakdown:
${block}

Return JSON: { "lean": "support|oppose|uncertain", "key_risk": "the single biggest risk in one sentence" }`;

  const settled = await Promise.allSettled(
    PANEL.map(async (model): Promise<PanelVote> => {
      const raw = await judgeWithModel(model, panelSystem, panelUser);
      const parsed = parseLLMJson<{ lean: string; key_risk: string }>(raw);
      const lean = ["support", "oppose", "uncertain"].includes(parsed.lean) ? parsed.lean : "uncertain";
      return { model, lean: lean as PanelVote["lean"], key_risk: (parsed.key_risk ?? "").slice(0, 300) };
    }),
  );

  const panel: PanelVote[] = settled.filter((s) => s.status === "fulfilled").map((s) => (s as PromiseFulfilledResult<PanelVote>).value);

  const leans = new Set(panel.map((p) => p.lean));
  const disagreement = leans.has("support") && leans.has("oppose");
  const disagreementNote = disagreement
    ? `The review panel split: ${panel.map((p) => `${p.model} leans ${p.lean}`).join(", ")}. Treat the recommendation as lower confidence.`
    : null;

  // Adversarial red-team: refute using only the verified claims.
  let adversarial: CrossExamResult["adversarial"] = null;
  try {
    const advSystem = `You are a sharp, skeptical board member. Your only job is to argue against the decision using the verified claims. Find the single assumption or claim whose failure most breaks it. No em dashes. Return ONLY valid JSON.`;
    const advUser = `Decision: "${statement}"

Verified claim breakdown:
${block}

Return JSON: { "refutation": "the strongest case against this decision in 2-3 sentences", "breakpoint_claim_index": 0 }
breakpoint_claim_index is the index above whose failure most breaks the decision, or -1.`;
    const raw = await reason(advSystem, advUser, 1000);
    const parsed = parseLLMJson<{ refutation: string; breakpoint_claim_index: number }>(raw);
    adversarial = {
      refutation: (parsed.refutation ?? "").slice(0, 800),
      breakpoint_claim_index: typeof parsed.breakpoint_claim_index === "number" ? parsed.breakpoint_claim_index : -1,
    };
  } catch (_e) {
    adversarial = null;
  }

  return { panel, disagreement, disagreementNote, adversarial };
}
