/**
 * editorial-lens.ts - the shared "Judgment Economy" editorial lens.
 *
 * One curated point of view that biases the live surfaces toward a specific
 * editorial direction WITHOUT changing what gets gathered and WITHOUT inventing
 * facts. It is a LENS, not a filter: with the flag off (the default) every
 * surface behaves exactly as before, so this is purely additive and reversible.
 *
 * The direction (distilled from the curated anchor signals - LinkedIn posts,
 * essays, podcast guests): execution is becoming free; judgment, taste,
 * coordination and credibility are the new moat. The anchor items live here as
 * calibration EXEMPLARS and a curated source list, never as feed rows.
 *
 * Consumed by `news-synthesis.ts` (the opinionated POV line) and, later, by
 * `briefing-lens.ts` (query bias). Kept deliberately small so the sibling repos
 * (mindmaker, makeyourmindup) can mirror the same direction in their own voice.
 *
 * Flag: EDITORIAL_LENS_ENABLED=true turns it on. Unset/false = today's behaviour.
 */

export interface EditorialLens {
  /** Stable id, also used as a cache discriminator where relevant. */
  id: string;
  /** One-paragraph thesis - the spine every surface leans toward. */
  thesis: string;
  /** The facets the thesis breaks into. */
  facets: string[];
  /** Distilled exemplar POVs (few-shot calibration, never copied verbatim). */
  exemplarPOVs: string[];
  /** What the POV pushes against - named, never strawmanned. */
  antagonists: string[];
  /** What a strong on-direction story must contain. */
  evidencePatterns: string[];
  /** Bare domains worth lifting in reputation (a quality signal, not a filter). */
  curatedSources: string[];
}

export const JUDGMENT_ECONOMY_LENS: EditorialLens = {
  id: "judgment-economy",
  thesis:
    "Execution is becoming free; judgment, taste, coordination and credibility are the new moat. " +
    "The leaders who win point AI at the repeatable middle and spend their own judgment on the calls no model can make.",
  facets: [
    "the software/execution moat is dying - anything cloneable in a weekend was never the moat",
    "judgment, taste and verification are the scarce, monetizable assets",
    "most of AI transformation is human: process, adoption, orchestration, routing, evals",
    "non-linear careers and community capitalise on judgment, not headcount",
  ],
  exemplarPOVs: [
    "If non-engineers can clone your product in days, the moat was the data, contracts and switching costs, never the features.",
    "Trust AI to do the work, not to do the thinking - the dangerous prompt is 'what is wrong with this?'.",
    "Most of AI transformation has nothing to do with AI: only one of ten steps is the model.",
    "When coordination gets cheap, the moat migrates from the work to owning the work's context.",
    "Token cost makes model routing, not raw capability, the next applied-AI edge.",
  ],
  antagonists: [
    "the easy button and the 'one prompt, job done' promise",
    "the demo that cannot run by week ten",
    "hype with no shipped proof",
    "the say-do gap between what leaders claim and what they actually deploy",
  ],
  evidencePatterns: [
    "a real deployment, number or shipped outcome, not a press release",
    "a named tradeoff or the judgment call a leader actually had to make",
    "who owns the context, distribution or credibility layer",
  ],
  curatedSources: [
    "every.to",
    "stratechery.com",
    "platformer.news",
    "newcomer.co",
    "groundlevel-ai.com",
    "importai.net",
  ],
};

/** True when the lens flag is on. Defaults to false (today's behaviour). */
export function isLensEnabled(): boolean {
  try {
    return (Deno.env.get("EDITORIAL_LENS_ENABLED") ?? "false") === "true";
  } catch {
    return false;
  }
}

/** The active lens, or null when the flag is off (neutral = today's behaviour). */
export function getEditorialLens(): EditorialLens | null {
  return isLensEnabled() ? JUDGMENT_ECONOMY_LENS : null;
}
