// Propose a hero magnitude for a claim, then HARD-GATE it for honesty. The LLM
// only proposes; supabase/functions/_shared/reaction-extraction.ts decides whether
// it is allowed to surface (sourced / modelled / rejected). Gemini-primary (the
// app's working model); any failure -> null -> the hero leads with words.
import { judgeWithModel, parseLLMJson } from "./llm.ts";
import { gateReaction, type EvidenceLite, type Reaction, type ReactionCandidate } from "../_shared/reaction-extraction.ts";

const SYSTEM = `You distil ONE short magnitude from a claim's evidence for a glanceable hero number.
Return STRICT JSON only: {"value": string|null, "descriptor": string, "modelled": boolean}.
- value: a single short figure, <=8 chars - a percent, multiplier, or money ("40%", "10x", "$2M"). This is THE hero number.
- The figure MUST be supported by the evidence. If a figure appears in the evidence, use it verbatim and set modelled=false. If you must DERIVE/estimate it from the evidence, set modelled=true. If there is no honest number, set value=null.
- descriptor: <=6 words that sit beside the number ("cheaper to rent than build"). NEVER put a number in the descriptor.
- Never invent a figure the evidence does not support.`;

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
