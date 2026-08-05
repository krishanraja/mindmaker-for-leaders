/**
 * The four prompts of the CRITIQUE stage: three lenses and the meta-judge.
 *
 * Every rule these prompts state is ALSO enforced in code after the answer
 * comes back (see _shared/critique-core.ts). That duplication is deliberate.
 * The prompt is how the model is asked to behave; the enforcement is how the
 * behaviour is guaranteed. Where the two disagree, the code wins and the output
 * reports the correction, so nobody ever reads a verdict the system quietly
 * disagreed with.
 *
 * The three lenses are written to be run INDEPENDENTLY, with no mutual
 * visibility. None of these builders takes another lens's output, and there is
 * no debate step. Debate measurably degrades consistency and the degradation
 * does not recover; disagreement between independent verifiers is signal, and
 * the meta-judge escalates it rather than flattening it.
 */

import type { LoadedCriterion, RetrievedExemplar } from "../_shared/critique-core.ts";

export interface LensPromptInput {
  artefact: string;
  /** What kind of work this is, in the person's own words. */
  surface: string;
  /** The compiled criteria this lens may score. Empty for the house lenses. */
  criteria: readonly LoadedCriterion[];
  /** Three to five of their own graded items, nearest to the artefact. */
  exemplars: readonly RetrievedExemplar[];
  /** True when they have graded nothing, so the lens is told rather than left to assume. */
  noGradedWork: boolean;
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

const HOUSE_RULES = [
  "Three verdicts only: holds, borderline, breaks. No numeric score, no percentage,",
  "no five point scale. An aggregate hides which criterion failed and which criterion",
  "failed is the entire value of this review.",
  "",
  "QUOTE BEFORE YOU SCORE. For every criterion, copy the exact passage out of the",
  "submission first, character for character, then score it. If you cannot point at a",
  "specific passage, set verdict to \"insufficient evidence\" and leave quote empty. You",
  "may not score a criterion you cannot point at. A quote that is not a substring of the",
  "submission is dropped automatically and the drop is shown to the reader, so a",
  "paraphrase costs you the finding.",
  "",
  "A borderline is usable ONLY if you name the single change that moves it to holds, in",
  "change_to_holds. Without that it is a breaks.",
  "",
  "NEVER RETURN A BARE REJECTION. Every breaks carries a revision of that specific",
  "passage in the revision field. Not the whole document. A gate that only says no gets",
  "routed around within a fortnight, and the revision is what keeps it in the workflow.",
  "",
  "Never invent a criterion. Score only the criteria you are handed. If the piece has an",
  "obvious problem that no criterion covers, put it in uncovered as an observation, with",
  "the quote. Those observations are the most valuable thing you produce, because they",
  "are the standard telling us what it does not yet contain.",
  "",
  "You are reviewing somebody else's work against somebody else's standard. You are not",
  "the author. Do not soften a verdict, do not rank this against anyone else's work, and",
  "do not guess at a rule that has not been stated.",
  "",
  "Write plainly. No em dashes anywhere in your own sentences (quotes from the",
  "submission stay exactly as written, including any dashes in them).",
].join("\n");

const JSON_SHAPE = [
  "Return JSON only, in exactly this shape:",
  "{",
  '  "verdicts": [',
  "    {",
  '      "criterion_id": "the id you were given, e.g. C1",',
  '      "criterion_name": "the name you were given",',
  '      "verdict": "holds | borderline | breaks | insufficient evidence",',
  '      "quote": "the exact passage from the submission, character for character",',
  '      "sentence": "one sentence: what is happening and why it lands there",',
  '      "change_to_holds": "borderline only: the single change that moves it to holds",',
  '      "revision": "breaks only: the rewritten version of that passage"',
  "    }",
  "  ],",
  '  "uncovered": [{ "note": "what is wrong", "quote": "the passage" }],',
  '  "one_thing": "the single highest consequence change. Not a list. One."',
  "}",
].join("\n");

function renderCriteria(criteria: readonly LoadedCriterion[]): string {
  if (criteria.length === 0) return "(none)";
  return criteria
    .map((c) => {
      const lines = [`${c.shortId}. ${c.name} [${c.weight}]`, `   ${c.checkText}`];
      if (c.holdsExample) lines.push(`   Holds, for example: ${c.holdsExample}`);
      if (c.breaksExample) lines.push(`   Breaks, for example: ${c.breaksExample}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * Their own graded work, each labelled with the verdict they gave it and the
 * line they wrote about it, verbatim.
 *
 * Retrieved exemplars moved one judging benchmark from 54.9 to 81.7 percent, a
 * larger effect than anything achieved by rewording a rubric. A criterion
 * describes the standard; an exemplar demonstrates it. Never cleaned up: a
 * tidied exemplar is our writing, not theirs.
 */
function renderExemplars(exemplars: readonly RetrievedExemplar[], noGradedWork: boolean): string {
  if (noGradedWork) {
    return [
      "NONE. This person has not graded any work yet, so you are judging from the",
      "criteria alone. Say less, hedge nothing, and prefer insufficient evidence over a",
      "confident call. A review with no examples behind it is weaker and the reader is",
      "being told so.",
    ].join("\n");
  }
  if (exemplars.length === 0) return "(none retrieved)";
  return exemplars
    .map((e, i) => {
      const verdict = e.verdict === "send" ? "THEY WOULD SEND THIS" : "THEY WOULD NOT SEND THIS";
      const why = e.why ? `\nTheir words: "${e.why}"` : "";
      return `[${i + 1}] ${verdict}${why}\n---\n${e.body}\n---`;
    })
    .join("\n\n");
}

function artefactBlock(artefact: string, surface: string): string {
  return [
    `THE SUBMISSION (a ${surface || "piece of work"}), between the markers:`,
    "<<<SUBMISSION",
    artefact,
    "SUBMISSION>>>",
  ].join("\n");
}

/**
 * Lens 1, Standard. Against the person's compiled criteria and ONLY those.
 *
 * This is the lens that could block once the criteria have been measured.
 * Everything it says is labelled as their rule, so everything it says has to be
 * theirs. It is advisory until the false positive rate has been measured, which
 * means it reports and the human decides.
 */
export function buildStandardLensPrompt(input: LensPromptInput): BuiltPrompt {
  const system = [
    "You are checking a piece of work against one specific person's own standard.",
    "That standard was compiled from work they graded themselves. It is theirs, not",
    "yours, and not the industry's.",
    "",
    HOUSE_RULES,
    "",
    "Score ONLY the criteria below. Not more than seven. If a criterion in the list does",
    "not apply to this submission, say insufficient evidence rather than stretching it.",
  ].join("\n");

  const user = [
    "THEIR CRITERIA:",
    renderCriteria(input.criteria),
    "",
    "THEIR OWN GRADED WORK, nearest to this submission:",
    renderExemplars(input.exemplars, input.noGradedWork),
    "",
    artefactBlock(input.artefact, input.surface),
    "",
    JSON_SHAPE,
  ].join("\n");

  return { system, user };
}

/**
 * Lens 2, Evidence. Advisory permanently, and labelled CTRL's check.
 *
 * House level and written rather than elicited from this person. It earns its
 * place because the failure it catches is the single most common way slop passes
 * as substance: a claim that is true, and unsourced, in a document going to
 * somebody else.
 */
export function buildEvidenceLensPrompt(input: LensPromptInput): BuiltPrompt {
  const system = [
    "You are checking one thing only: is every claim in this piece earned.",
    "",
    "Every number sourced. Every outcome attributable to a named instance. Every quote",
    "real. An assertion of a result with no source, no example and no named instance is a",
    "breaks, and it is still a breaks when the claim happens to be true.",
    "",
    "This is a house check, not this person's rule, and it is advisory. Report it as such.",
    "",
    HOUSE_RULES,
  ].join("\n");

  const user = [
    "THE CHECK:",
    renderCriteria(input.criteria),
    "",
    artefactBlock(input.artefact, input.surface),
    "",
    JSON_SHAPE,
  ].join("\n");

  return { system, user };
}

/**
 * Lens 3, Signature. Advisory permanently, labelled CTRL's check, and run on a
 * provider that did not generate the artefact (CH-14).
 *
 * The hardest of the three, which is exactly why it may not block and why it is
 * never allowed to be the generator's own family marking its own work.
 */
export function buildSignatureLensPrompt(input: LensPromptInput): BuiltPrompt {
  const system = [
    "You are checking one thing only: could this have been written by anyone, with the",
    "name swapped.",
    "",
    "Run it by asking what in this piece could not have been written by somebody who had",
    "never met them. If the answer is nothing, that is a breaks and you say so plainly.",
    "A specific number, a named client, a decision they actually made, a sentence in a",
    "shape only they use: any one of those is what a holds looks like.",
    "",
    "This is a house check, not this person's rule, and it is advisory. Report it as such.",
    "",
    HOUSE_RULES,
  ].join("\n");

  const user = [
    "THE CHECK:",
    renderCriteria(input.criteria),
    "",
    "THEIR OWN GRADED WORK, for what their writing actually looks like:",
    renderExemplars(input.exemplars, input.noGradedWork),
    "",
    artefactBlock(input.artefact, input.surface),
    "",
    JSON_SHAPE,
  ].join("\n");

  return { system, user };
}

export interface MetaPromptInput {
  artefact: string;
  surface: string;
  criteria: readonly LoadedCriterion[];
  /**
   * The three lens answers, each already enforced, with NO model or provider
   * identity attached. The judge must not be able to prefer a lens because of
   * what produced it.
   */
  lenses: Array<{ lens: string; label: string; json: string; ran: boolean; note?: string }>;
}

/**
 * The meta-judge. A fourth call that sees the three lens outputs and the rubric,
 * sees no model identities, and writes a fresh verdict.
 *
 * It does not average and it does not summarise. Where two lenses disagree on
 * the same criterion it escalates rather than picking, because verifiers that
 * agree are right far more often than verifiers that split, and flattening a
 * split into one verdict throws away the most useful thing the panel produced.
 */
export function buildMetaPrompt(input: MetaPromptInput): BuiltPrompt {
  const system = [
    "Three independent reviews of the same piece of work are below. They were run",
    "separately and none of them saw the others. You do not know what produced any of",
    "them and you must not try to work it out.",
    "",
    "Write a FRESH verdict. Do not average the three. Do not summarise them. Read the",
    "submission yourself and score it, using the three as evidence about what is there.",
    "",
    "Where two reviews disagree on the SAME criterion, escalate it: keep your own verdict,",
    "and put the disagreement in escalations in one plain sentence so a human can look.",
    "Do not split the difference.",
    "",
    "Keep the labels straight. A criterion from their compiled standard is their rule. The",
    "two house checks (every claim earned, only they could have written it) are CTRL's",
    "check, they are advisory permanently, and they must never be reported as this",
    "person's own rule.",
    "",
    HOUSE_RULES,
  ].join("\n");

  const lensBlocks = input.lenses
    .map((lens) => {
      if (!lens.ran) {
        return `LENS: ${lens.lens} (${lens.label})\nDID NOT RUN. ${lens.note ?? ""}`.trim();
      }
      return `LENS: ${lens.lens} (${lens.label})\n${lens.json}`;
    })
    .join("\n\n");

  const user = [
    "THEIR CRITERIA:",
    renderCriteria(input.criteria),
    "",
    "THE THREE REVIEWS:",
    lensBlocks,
    "",
    artefactBlock(input.artefact, input.surface),
    "",
    "Return JSON only, in exactly this shape:",
    "{",
    '  "verdicts": [',
    "    {",
    '      "criterion_id": "the id, e.g. C1 or house.evidence",',
    '      "criterion_name": "the name",',
    '      "verdict": "holds | borderline | breaks | insufficient evidence",',
    '      "quote": "the exact passage from the submission, character for character",',
    '      "sentence": "one sentence: what is happening and why it lands there",',
    '      "change_to_holds": "borderline only",',
    '      "revision": "breaks only: the rewritten version of that passage"',
    "    }",
    "  ],",
    '  "uncovered": [{ "note": "what is wrong", "quote": "the passage" }],',
    '  "escalations": [{ "criterion_name": "...", "note": "one sentence" }],',
    '  "one_thing": "the single highest consequence change. Not a list. One."',
    "}",
  ].join("\n");

  return { system, user };
}

export interface RevisionPromptInput {
  artefact: string;
  surface: string;
  /** The findings that broke and have no fix attached yet. */
  needing: Array<{ criterionName: string; quote: string; sentence: string }>;
}

/**
 * The second pass, and the only one there is (CH-15, max_pass = 2).
 *
 * It exists to close the one hard rule the first pass can fail: never a bare
 * rejection. It rewrites the passages that broke and nothing else. Whatever it
 * returns re-enters the mechanical and provenance checks before it ships, so a
 * revision cannot smuggle in what the original was caught for.
 */
export function buildRevisionPrompt(input: RevisionPromptInput): BuiltPrompt {
  const system = [
    "You are fixing specific passages in somebody else's work. Rewrite ONLY the passages",
    "listed. Do not rewrite the document, do not add a preamble, and do not change their",
    "voice into yours.",
    "",
    "Each replacement must be usable as a drop-in for the quoted passage: same job, same",
    "register, same length or shorter.",
    "",
    "Do not add a claim they did not make. If the finding is that a claim is unsourced,",
    "the fix is to state it in the form they can actually stand behind, or to name what",
    "would source it, never to invent a source.",
    "",
    "No em dashes. Plain words.",
  ].join("\n");

  const user = [
    artefactBlock(input.artefact, input.surface),
    "",
    "THE PASSAGES THAT BROKE:",
    input.needing
      .map((n, i) => `[${i + 1}] ${n.criterionName}\n  Finding: ${n.sentence}\n  Passage: "${n.quote}"`)
      .join("\n\n"),
    "",
    "Return JSON only:",
    "{",
    '  "revisions": [{ "criterion_name": "...", "quote": "the passage as given", "replacement": "the fixed passage" }]',
    "}",
  ].join("\n");

  return { system, user };
}
