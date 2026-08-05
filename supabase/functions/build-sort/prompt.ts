/**
 * build-sort pair-generation prompt.
 *
 * HANDRUN_PROMPT_2_RULES below is PROMPT 2 from docs/PHASE-0.5-HANDRUN.md
 * Step 2, character for character. That doc is the Phase 0.5 hand run, and the
 * hand run's whole validity rests on one rule, stated in the doc's own words:
 *
 *   "generate the items with PROMPT 2 below, exactly as written... That prompt
 *    is what build-sort will ship in Phase 2, verbatim."
 *
 * The hand run measures the generator, not a facilitator. If the shipped
 * generator sends different words, the hand run measured something we do not
 * ship and the numbers it produced (pair-split rate above all) are void.
 * Editing either copy alone breaks the comparison, so the constant is asserted
 * byte-identical against the doc in ../_shared/sort-composition.test.ts.
 * Change the doc and the test fails.
 *
 * The doc's plain-text output block ("Output per pair: PAIR <construct-n>...")
 * is the one deliberate divergence: this function runs in JSON mode, so the
 * output contract below replaces it. The rules themselves are untouched, and
 * the three input labels the doc ends with (SURFACE, CONTEXT, CONSTRUCTS) are
 * reproduced exactly in the user prompt.
 *
 * No Deno imports here, so the drift test can import this module under vitest.
 */

// Verbatim: docs/PHASE-0.5-HANDRUN.md, Step 2, fenced block, through rule 6.
export const HANDRUN_PROMPT_2_RULES =
  `You are generating a paired-opposite forced sort for one person.

For EACH candidate construct below, produce TWO matched pairs (four artefacts
per construct, 20 artefacts total for 5 constructs).

A matched pair is two artefacts on the same subject, same length, same
register, same facts, differing on exactly ONE dimension: the construct.
One SATISFIES the emergent pole. One VIOLATES it.

Rules. Each one is load-bearing; skipping any invalidates the instrument.

1. Vary ONLY the target dimension. Same subject, same names, same numbers,
   same structure, length within 10 percent. If satisfying the construct
   forces a second change (shorter sentences shrink the piece), compensate
   elsewhere so length stays matched.
2. The violating half is COMPETENT work. It would pass review at most
   companies. Not a strawman, not sloppy, no errors. The only thing wrong
   with it is the dimension.
3. Both halves are deliberately mid-grade on everything EXCEPT the target
   dimension, so no other quality signal separates them.
4. Write in this person's world: use the CONTEXT block for plausible clients,
   numbers and situations. Never reuse their real sentences.
5. For each pair, write INTENDED_DIMENSION: one plain sentence naming the
   single difference ("one names a specific client fact, the other could be
   for anyone"). This is the answer key. It is never shown before grading.
6. No em dashes anywhere.`;

// The JSON contract replaces the doc's plain-text "Output per pair" block.
// Nothing here adds a rule; it names the fields the rules above already
// describe (PAIR n.1|n.2 becomes construct_id + pair_index, ITEM A / ITEM B
// become satisfies / violates).
const JSON_OUTPUT_CONTRACT = `Return one JSON object and nothing else:

{
  "pairs": [
    {
      "construct_id": "<the id of the construct this pair tests, copied exactly>",
      "pair_index": 1,
      "intended_dimension": "<one plain sentence, rule 5 above>",
      "satisfies": "<the artefact that satisfies the emergent pole>",
      "violates": "<the artefact that violates it>"
    }
  ]
}

Field rules:
- Two pairs per construct: pair_index 1 and pair_index 2. Both pairs test the
  same construct on a DIFFERENT subject, so the construct is tested twice and
  not the topic.
- construct_id is copied character for character from the CONSTRUCTS block. A
  pair whose construct_id is not in that block is discarded.
- satisfies and violates are the full artefacts, ready to read on their own. No
  headings, no labels, no commentary about the pair, nothing that hints which
  half is which. The grader sees them separately and never side by side.
- intended_dimension is the answer key and is never shown before grading. Write
  it as the plain difference, not as praise or a verdict.
- If a construct cannot yield two honest matched pairs, return fewer pairs for
  it rather than a strawman. A missing pair costs one construct. A confounded
  pair corrupts every criterion downstream of it.`;

export function buildPairSystemPrompt(): string {
  return `${HANDRUN_PROMPT_2_RULES}\n\n${JSON_OUTPUT_CONTRACT}`;
}

export interface PairPromptConstruct {
  id: string;
  emergentPole: string;
  /** Verbatim quotes from the person, the evidence this candidate rests on. */
  quotes: string[];
  situation?: string | null;
}

export interface PairUserPromptInputs {
  /** The one surface picked for this sort, e.g. "client status emails". */
  surface: string;
  /** Three lines: company, role, plausible clients and numbers. */
  context: string;
  constructs: PairPromptConstruct[];
}

/**
 * The doc's three trailing input blocks, in the doc's order and with the doc's
 * labels: SURFACE, CONTEXT, CONSTRUCTS.
 */
export function buildPairUserPrompt({ surface, context, constructs }: PairUserPromptInputs): string {
  const lines: string[] = [
    `SURFACE: ${surface}`,
    `CONTEXT: ${context}`,
    `CONSTRUCTS:`,
  ];
  constructs.forEach((c, i) => {
    lines.push(``);
    lines.push(`CANDIDATE ${i + 1} (construct_id: ${c.id})`);
    lines.push(`DIMENSION: ${c.emergentPole}`);
    for (const quote of c.quotes) lines.push(`QUOTE: "${quote}"`);
    if (c.situation) lines.push(`SITUATION: ${c.situation}`);
  });
  return lines.join("\n");
}

/**
 * Fallback CONTEXT when the person has given us nothing to build one from. It
 * describes the shape of a context block rather than inventing a company, so
 * the model is not handed a fabricated employer to write about.
 */
export function defaultContextLine(surface: string): string {
  return [
    `We do not have their company details on file.`,
    `Write for a senior operator producing ${surface} for a small number of named clients or stakeholders.`,
    `Invent plausible client names and numbers; do not name real companies.`,
  ].join(" ");
}

export interface ContextFacts {
  role?: string | null;
  company?: string | null;
  industry?: string | null;
}

/**
 * The doc's CONTEXT block is "3 lines: your company, role, the kind of
 * clients/numbers that are plausible". Built from facts already held, and only
 * from the ones actually held: an empty field is left out rather than filled
 * with a guess the generator would then write ten artefacts around.
 */
export function composeContextLine(facts: ContextFacts, surface: string): string {
  const parts: string[] = [];
  if (facts.company && facts.company.trim()) parts.push(`They work at ${facts.company.trim()}.`);
  if (facts.role && facts.role.trim()) parts.push(`Their role is ${facts.role.trim()}.`);
  if (facts.industry && facts.industry.trim()) parts.push(`They operate in ${facts.industry.trim()}.`);
  if (parts.length === 0) return defaultContextLine(surface);
  parts.push(
    `Invent plausible client names and numbers for that world; do not name real companies and do not reuse their own sentences.`,
  );
  return parts.join(" ");
}
