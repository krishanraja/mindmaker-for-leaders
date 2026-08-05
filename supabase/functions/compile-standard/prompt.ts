/**
 * compile-standard criterion-writing prompt.
 *
 * The model does exactly one job here: put a NAME, a CHECK sentence, a WEIGHT
 * and a machine-checkable OBSERVABLE on a construct the person already
 * separated by hand. It is given their words and told to reuse them.
 *
 * Everything the model is NOT asked for is deliberate, and each omission closes
 * a specific way this stage could invent:
 *
 *   - It does not write the poles. Both poles come from the person: the
 *     emergent pole is the construct row, the contrast pole is the verbatim why
 *     line from a piece they turned down. A cleaned-up pole is a different
 *     construct wearing the same words (ctrl-compile/leaves/criteria.md).
 *   - It does not write the examples. holds_example and breaks_example are
 *     lifted from real graded items after the probe has run, so an example is
 *     always a real piece of work that really did hold or really did break.
 *   - It does not judge whether the criterion is any good. That is the
 *     discrimination test, and it is deterministic (CH-03). An LLM verdict on
 *     100 to 160 items with no exemplars is the configuration section 9 forbids.
 *
 * The one thing it can get wrong that matters is the observable, so the grammar
 * is given in full and returning null is stated as the correct answer whenever
 * the construct is not machine-checkable. A construct with a null observable
 * compiles to 'untested' with the reason, which is a true statement. A construct
 * with an invented observable compiles to a number, which is not.
 *
 * No Deno imports, so this module stays importable by the test runner.
 */

import { PROBE_GRAMMAR_HELP } from "../_shared/discrimination.ts";

export interface CriterionPromptConstruct {
  id: string;
  /** Their words, verbatim. Never tidied. */
  emergentPole: string;
  contrastPole: string | null;
  rationale: string | null;
  /** Verbatim quotes from the evidence behind this construct. */
  quotes: string[];
  /** Verbatim why lines from pieces they SENT. */
  acceptedWhy: string[];
  /** Verbatim why lines from pieces they would NOT send. */
  rejectedWhy: string[];
}

export interface CriterionPromptInput {
  surface: string;
  constructs: CriterionPromptConstruct[];
}

export function buildCriteriaSystemPrompt(): string {
  return `You are turning constructs a person elicited by hand into criteria a machine can check.

You are not deciding what this person values. They already did that, by grading
thirty pieces of work. You are naming what they separated, in their vocabulary,
and saying what someone would point at in a piece of writing to check it.

Rules. Each one is load-bearing.

1. ONE criterion per construct. Never merge two constructs, never split one.
   Merging is a later step and it is done on evidence, not on how similar two
   sentences sound.
2. The NAME comes from the emergent pole, shortened, in their words. "Earned
   claim." "Actually seen the client." Never "Client Specificity Score", never
   "Personalisation Criterion". They will read this file, and if it sounds like
   a consultant wrote it they will not trust that it came from them.
3. The CHECK is one plain sentence stating what has to be true. Binary. No
   score, no percentage, no five point scale: an aggregate hides which criterion
   failed, and which criterion failed is the entire value of a review.
4. The OBSERVABLE is the criterion. Everything else is context. It must be
   written in the probe grammar below, and it must be something a program can
   evaluate against the text with no judgement.
5. If the construct cannot be reduced to a checkable probe, return
   "observable": null. That is the correct answer, not a failure. Do NOT invent
   a probe that approximates the idea. A construct with a null observable is
   recorded as untested with the reason, which is true. A construct with an
   invented probe produces a number that is not.
6. WEIGHT is one of essential, important, optional, pitfall. Pitfall carries
   negative weight: it is the thing that spoils the piece rather than the thing
   that makes it good.
7. No em dashes anywhere.

The probe grammar. These are the only shapes that parse:

${PROBE_GRAMMAR_HELP.map((line) => `  ${line}`).join("\n")}

Notes on the grammar:
  contains is a case insensitive substring.
  matches takes a JavaScript regular expression between slashes, then flags.
  within_first_paragraphs takes a paragraph count and then ANOTHER probe from
    this list, so use within_first_paragraphs:3:has_proper_noun for "names
    something specific before the third paragraph", and
    within_first_paragraphs:2:contains:recommend for a literal word.
  has_proper_noun is true when a capitalised word appears that is not merely the
    first word of a sentence, or when an acronym appears.
  not takes any probe from this list.

Return one JSON object and nothing else:

{
  "criteria": [
    {
      "construct_id": "<copied character for character from the input>",
      "name": "<their words, shortened>",
      "check_text": "<one plain sentence>",
      "observable": "<a probe from the grammar above, or null>",
      "weight": "essential",
      "observable_note": "<one short line saying why there is no probe, when observable is null>"
    }
  ]
}`;
}

const MAX_QUOTE_CHARS = 300;
const MAX_WHY_LINES = 6;

function quoteBlock(label: string, lines: string[]): string {
  if (lines.length === 0) return `${label}: none recorded`;
  const kept = lines.slice(0, MAX_WHY_LINES).map((l) => `    "${l.slice(0, MAX_QUOTE_CHARS)}"`);
  return `${label}:\n${kept.join("\n")}`;
}

export function buildCriteriaUserPrompt(input: CriterionPromptInput): string {
  const blocks = input.constructs.map((c, i) => {
    const parts: string[] = [
      `CONSTRUCT ${i + 1}`,
      `  id: ${c.id}`,
      `  emergent pole (their words, verbatim): "${c.emergentPole.slice(0, MAX_QUOTE_CHARS)}"`,
    ];
    if (c.contrastPole) {
      parts.push(`  contrast pole (their words, verbatim): "${c.contrastPole.slice(0, MAX_QUOTE_CHARS)}"`);
    }
    if (c.rationale) parts.push(`  why it matters to them: "${c.rationale.slice(0, MAX_QUOTE_CHARS)}"`);
    if (c.quotes.length > 0) {
      parts.push(`  ${quoteBlock("things they said", c.quotes)}`);
    }
    parts.push(`  ${quoteBlock("what they wrote when they SENT a piece", c.acceptedWhy)}`);
    parts.push(`  ${quoteBlock("what they wrote when they would NOT send a piece", c.rejectedWhy)}`);
    return parts.join("\n");
  });

  return `SURFACE: ${input.surface}

CONSTRUCTS:

${blocks.join("\n\n")}

Return one criterion per construct, in the order the constructs appear.`;
}

// ---------------------------------------------------------------------------
// The deterministic gate on what comes back
// ---------------------------------------------------------------------------

const NAME_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "it",
  "its", "is", "that", "this", "at", "by", "from", "as", "not", "no",
]);

/**
 * Is this name built from the person's own vocabulary?
 *
 * Rule 2 says the name comes from the emergent pole, shortened, in their words.
 * That is checkable: every content word in the name has to appear somewhere in
 * what they actually said. A name that fails this is replaced by a deterministic
 * shortening of the emergent pole rather than kept, because a consultant-sounding
 * name is the exact signal that makes someone stop believing the file came from
 * them.
 */
export function nameIsInTheirWords(name: string, corpus: string[]): boolean {
  const haystack = corpus.join(" ").toLowerCase();
  const tokens = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const content = tokens.filter((t) => t.length > 2 && !NAME_STOPWORDS.has(t));
  if (content.length === 0) return false;
  return content.every((token) => {
    if (haystack.includes(token)) return true;
    // Allow a light plural or gerund difference: "claim" against "claims".
    const stem = token.replace(/(ing|ed|es|s)$/, "");
    return stem.length > 2 && haystack.includes(stem);
  });
}

/** The fallback name: the emergent pole, shortened, unchanged otherwise. */
export function fallbackName(emergentPole: string, maxWords = 6): string {
  const words = emergentPole.trim().split(/\s+/).filter(Boolean).slice(0, maxWords);
  if (words.length === 0) return "Unnamed";
  const joined = words.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}
