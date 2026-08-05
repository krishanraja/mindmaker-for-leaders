/**
 * ingest-evidence extraction prompt.
 *
 * HANDRUN_PROMPT_1_RULES below is PROMPT 1 from docs/PHASE-0.5-HANDRUN.md
 * Step 1, character for character. That doc is the Phase 0.5 hand run, and the
 * hand run only measures the shipped generator if the shipped generator sends
 * the same words. Editing either copy alone breaks the comparison, so the
 * constant is asserted byte-identical against the doc in
 * ../_shared/ingest-post-check.test.ts. Change the doc and the test fails.
 *
 * The doc's plain-text output block ("Output each candidate as: CANDIDATE <n>
 * ...") is the one deliberate divergence: this function runs in JSON mode, so
 * the output contract below replaces it. The rules themselves are untouched.
 *
 * No Deno imports here, so the drift test can import this module under vitest.
 */

// Verbatim: docs/PHASE-0.5-HANDRUN.md, Step 1, fenced block, through rule 6.
export const HANDRUN_PROMPT_1_RULES = `You are extracting CANDIDATES, not rules. Nothing you produce is a preference.

1. Every candidate carries at least one verbatim quote. If you cannot quote it,
   do not produce it. Paraphrase is not evidence.
2. Mark every candidate SITUATED and state the situation in the speaker's own
   framing. A statement made about one artefact, one meeting or one moment is
   about that thing until they tell you otherwise.
3. Do NOT produce a contrast pole. You have not seen them separate anything.
   The sort produces it.
4. Do NOT infer a rule from a preference, or a preference from an observation.
   "He asked for bullets once" is an observation. It is not "he wants bullets."
5. If the source contradicts itself, produce both candidates and flag the
   conflict. Do not resolve it. You do not have the evidence to.
6. Produce no more than 12 candidates per source, ranked by how often the
   speaker returned to the point unprompted, which is the only frequency
   signal you have.`;

// The JSON contract replaces the doc's plain-text output block. Everything here
// is either the shape the post-check reads or a restatement of a rule above in
// terms of the fields that carry it.
const JSON_OUTPUT_CONTRACT = `Return one JSON object and nothing else:

{
  "candidates": [
    {
      "emergent_pole": "<one line, the dimension you think they judge work on>",
      "items": [
        {
          "quote": "<verbatim from the source>",
          "situation": "<what this was about, in the speaker's framing>",
          "speaker_is_owner": true,
          "kind": "utterance"
        }
      ]
    }
  ]
}

Field rules:
- quote is copied character for character from the source text. Do not tidy it,
  do not fix its grammar, do not join two sentences that were apart. A quote
  that does not appear in the source is discarded and the candidate with it.
- situation is rule 2 above, in their framing, not yours.
- speaker_is_owner is true when the person whose standard we are capturing said
  it, false when someone else in the room did.
- kind is one of "utterance" (they said it), "declared" (they stated it as a
  position about their own work), or "observation" (something the source shows
  them doing, quoted).
- Do NOT emit a contrast_pole field. Rule 3 above is not negotiable.
- The emergent_pole may not contain always, never, must or forbidden outside a
  quoted span. A candidate is not a rule and may not be phrased like one,
  because the phrasing survives longer than the caveat.
- At most 12 candidates. 1 to 3 items each.
- If you can produce nothing that carries a real quote, return
  {"candidates": []}. An empty result is a correct result.`;

export function buildIngestSystemPrompt(): string {
  return `${HANDRUN_PROMPT_1_RULES}\n\n${JSON_OUTPUT_CONTRACT}`;
}

export interface IngestUserPromptInputs {
  sourceKind: string;
  label: string;
  body: string;
  surface?: string;
}

export function buildIngestUserPrompt({
  sourceKind,
  label,
  body,
  surface,
}: IngestUserPromptInputs): string {
  const lines: string[] = [
    `SOURCE_KIND: ${sourceKind}`,
    `SOURCE_LABEL: ${label}`,
  ];
  if (surface && surface.trim()) {
    // Context only. It narrows what counts as relevant; it never licenses a
    // candidate the source does not carry a quote for.
    lines.push(`SURFACE (the kind of work this material is about): ${surface.trim()}`);
  }
  lines.push(
    ``,
    `TRANSCRIPT FOLLOWS:`,
    body,
  );
  return lines.join("\n");
}
