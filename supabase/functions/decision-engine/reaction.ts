// Propose a hero magnitude for a claim, then HARD-GATE it for honesty. The LLM
// only proposes; supabase/functions/_shared/reaction-extraction.ts decides whether
// it is allowed to surface (sourced / modelled / rejected). Gemini-primary (the
// app's working model); any failure -> null -> the hero leads with words.
import { judgeWithModel, parseLLMJson } from "./llm.ts";
import { gateReaction, type EvidenceLite, type Reaction, type ReactionCandidate } from "../_shared/reaction-extraction.ts";

const SYSTEM = `You distil ONE short magnitude from a claim's evidence for a glanceable hero number.
Return STRICT JSON only: {"value": string|null, "descriptor": string, "modelled": boolean}.
- value: a single short figure, <=8 chars - a percent, multiplier, or money ("40%", "10x", "$2M"). This is THE hero number, the thing a leader reads in one glance.
- Grounding (critical):
  - If the evidence STATES the headline figure directly, use it verbatim and set modelled=false.
  - If the meaningful magnitude is a COMPARISON or ratio you must COMPUTE from figures that are present in the evidence (e.g. two prices -> "10x cheaper", two latencies -> "3x faster"), compute it, keep it round/approximate, and set modelled=true. Only derive from numbers that actually appear in the evidence.
  - If the claim has no quantitative grounding, or no single figure captures it, set value=null (the surface will lead with words instead - that is fine and honest).
- descriptor: <=6 words beside the number ("cheaper to rent than build"). NEVER put a number in the descriptor.
- Never invent a figure the evidence does not support. A wrong number is far worse than no number.`;

export async function proposeReaction(claimText: string, evidence: EvidenceLite[]): Promise<Reaction | null> {
  if (!evidence.some((e) => e.excerpt)) return null; // nothing to source from
  const snippets = evidence.map((e, i) => `[${i}] ${e.excerpt ?? "(link only)"}`).join("\n");
  const user = `Claim: ${claimText}\n\nEvidence:\n${snippets}\n\nReturn the JSON.`;
  let candidate: ReactionCandidate | null = null;
  try {
    const raw = await judgeWithModel("gemini", SYSTEM, user);
    const parsed = parseLLMJson<{ value?: string | null; descriptor?: string; modelled?: boolean }>(raw);
    if (parsed && parsed.value) {
      candidate = { value: String(parsed.value), descriptor: String(parsed.descriptor ?? ""), modelled: !!parsed.modelled };
    }
  } catch (_e) {
    return null; // model/parse failure -> words lead
  }
  return gateReaction(candidate, evidence); // the honesty guarantee
}
