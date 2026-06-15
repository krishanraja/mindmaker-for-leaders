// Per-claim verification. The reliability core.
//
// - assumption / forecast claims are NOT web-verified. They are returned as
//   "unverifiable" with a prompt to validate them manually. Faking a verdict
//   on an assumption is exactly the failure mode that destroys trust.
// - factual / market / causal claims retrieve evidence, then an adjudicator
//   reads the actual retrieved text and returns a 4-state verdict plus a
//   per-evidence stance. No evidence => "unverified", never "false".

import { adjudicateCall, parseLLMJson } from "./llm.ts";
import { gatherEvidence } from "./retrievers.ts";
import { governByCorroboration } from "../_shared/corroboration.ts";
import type { ClaimVerdict, Evidence, ExtractedClaim } from "./types.ts";

const ADJUDICATOR_SYSTEM = `You are the adjudication stage of a decision-verification engine.
You are given one claim and a numbered list of retrieved evidence snippets. Decide how well the evidence supports the claim. You must not use prior knowledge beyond the evidence provided.

Verdict rules:
- "supported": multiple independent snippets clearly support the claim.
- "contested": snippets conflict, or credible sources refute the claim.
- "unverified": evidence is thin, absent, tangential, or low quality. When in doubt, choose this.
Calibrate confidence honestly. If you choose "unverified", confidence must be <= 0.35. Never assert more certainty than the evidence earns.
Return ONLY valid JSON.`;

export interface VerifyOutput {
  verdict: ClaimVerdict;
  evidence: Evidence[];
}

export async function verifyClaim(claim: ExtractedClaim): Promise<VerifyOutput> {
  // Assumptions and forecasts are unverifiable by nature.
  if (claim.type === "assumption" || claim.type === "forecast") {
    return {
      verdict: {
        verdict: "unverifiable",
        confidence: null,
        rationale:
          claim.type === "assumption"
            ? "This is an assumption, not a checkable fact. Validate it directly before relying on it."
            : "This is a projection about the future and cannot be verified against current evidence. Pressure-test the inputs behind it.",
      },
      evidence: [],
    };
  }

  const evidence = await gatherEvidence(claim.text, claim.type);

  if (evidence.length === 0) {
    return {
      verdict: {
        verdict: "unverified",
        confidence: 0.2,
        rationale: "No usable evidence was retrieved for this claim. Treat it as unconfirmed.",
      },
      evidence: [],
    };
  }

  const numbered = evidence
    .map((e, i) => `[${i}] (${e.retriever}) ${e.source_title ?? e.source_url ?? "source"}: ${e.excerpt ?? "(link only)"}`)
    .join("\n");

  const user = `Claim (${claim.type}): ${claim.text}

Evidence:
${numbered}

Return JSON exactly:
{
  "verdict": "supported | contested | unverified",
  "confidence": 0.0,
  "rationale": "one or two sentences referencing the evidence",
  "evidence_stances": [ { "index": 0, "stance": "supports|refutes|neutral" } ]
}`;

  try {
    const raw = await adjudicateCall(ADJUDICATOR_SYSTEM, user);
    const parsed = parseLLMJson<{
      verdict: string;
      confidence: number;
      rationale: string;
      evidence_stances?: Array<{ index: number; stance: string }>;
    }>(raw);

    const validVerdicts = new Set(["supported", "contested", "unverified"]);
    const verdict = validVerdicts.has(parsed.verdict) ? parsed.verdict : "unverified";
    let confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.2;
    confidence = Math.max(0, Math.min(1, confidence));
    if (verdict === "unverified") confidence = Math.min(confidence, 0.35);

    // Apply per-evidence stances back onto the evidence rows.
    for (const s of parsed.evidence_stances ?? []) {
      const e = evidence[s.index];
      if (e && ["supports", "refutes", "neutral"].includes(s.stance)) {
        e.stance = s.stance as Evidence["stance"];
      }
    }

    // Corroboration governor: a confident "supported" needs >= 2 INDEPENDENT supporting
    // sources (distinct domains). The LLM does not reliably enforce independence; this does.
    const gov = governByCorroboration(verdict, confidence, evidence);
    const baseRationale = (parsed.rationale ?? "").slice(0, gov.governed ? 460 : 600);
    return {
      verdict: {
        verdict: gov.verdict as ClaimVerdict["verdict"],
        confidence: gov.confidence,
        rationale: gov.governed
          ? `${baseRationale} (Only ${gov.independentSources} independent source${gov.independentSources === 1 ? "" : "s"} found - not enough to confirm.)`.trim()
          : baseRationale || "Adjudicated against retrieved evidence.",
      },
      evidence,
    };
  } catch (_e) {
    // Adjudicator failed: do not guess. Return unverified but keep the evidence.
    return {
      verdict: {
        verdict: "unverified",
        confidence: 0.2,
        rationale: "Evidence was retrieved but could not be adjudicated cleanly. Review the sources directly.",
      },
      evidence,
    };
  }
}
