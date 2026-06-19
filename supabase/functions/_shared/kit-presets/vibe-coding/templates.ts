/**
 * Vibe Coding Field Kit: markdown templates, the intake option sets, and the
 * no-LLM fallbacks for the kept artifacts.
 *
 * The kit is re-centered on a SOLUTION: it teaches the AI who the person is,
 * how they like to work (preferences), what has burned them before (past pains,
 * turned into guardrails), and the one thing they want to build. The intake is
 * a short forked cascade: fork self/biz, name + role, preferences (multi),
 * past pains (multi), the one build (free text), tool, level.
 *
 * Template-literal constants and pure functions returning strings. The
 * preference and pain option sets power the intake's recognition cascade and the
 * living-panel preview. No Deno or Node globals; plain TypeScript only.
 */

import type { IntakeOption } from "../types.ts";

/** Baked into every LLM polish prompt so generated copy holds the register. */
export const VOICE_RULES = `Voice rules for everything you write:
- Operator tone: direct prose, sentence case, British-Australian spelling.
- No em dashes anywhere. Use hyphens, commas, semicolons or parentheses.
- No buzzwords. Never "transformation", "leverage" as a verb, "game-changer" or "unlock".
- No artificial urgency, no fear. Confidence earned, not asserted.
- Warm and plain: assume a smart person who has never built software. Never assume Cursor or Lovable; the tool is whatever they already have open.
- Short sentences. Every word earns its place.`;

/* ------------------------------------------------------------------ */
/* Intake option sets                                                  */
/* ------------------------------------------------------------------ */

/**
 * How the person likes the AI to work with them (multi). This is the
 * differentiator: the AI's working style with them, captured as plain
 * recognition picks. These become the behavior contract in the kit.
 */
export const PREFERENCE_OPTIONS: IntakeOption[] = [
  { id: "explain", label: "Explain as you go" },
  { id: "justdo", label: "Just do it, show me after" },
  { id: "steps", label: "Small steps I can follow" },
  { id: "ask", label: "Ask before big changes" },
  { id: "why", label: "Teach me the why" },
  { id: "brief", label: "Keep it short" },
];

/**
 * What has gone wrong before (multi). Each one is acknowledged and walled off
 * into a guardrail (see PAIN_GUARD) so the same scar cannot happen again.
 */
export const PAIN_OPTIONS: IntakeOption[] = [
  { id: "forgot", label: "It forgot what we were doing" },
  { id: "broke", label: "The code would not run" },
  { id: "changed", label: "It changed things I did not ask for" },
  { id: "sprawl", label: "The project sprawled out" },
  { id: "wrong", label: "Confident, and wrong" },
];

/**
 * Short behavior label for each preference id. Used in the identity / how-i-work
 * contract and the living-panel preview. One canonical sentence per pick.
 */
export const PREF_LABEL: Record<string, string> = {
  explain: "Explains as it goes",
  justdo: "Acts first, shows you after",
  steps: "Works in small steps you can follow",
  ask: "Asks before big changes",
  why: "Teaches the why, not just the what",
  brief: "Keeps it short",
};

/**
 * Each past pain mapped to the guardrail the kit installs for it. This is the
 * "we turn each of these into a guardrail" promise made concrete: the back half
 * of the sentence reads naturally after "we add ...".
 */
export const PAIN_GUARD: Record<string, string> = {
  forgot: "a memory file so it never loses the thread",
  broke: "a run-it-first check before calling anything done",
  changed: "a rule to ask before touching anything you did not point it at",
  sprawl: "scope held to one finishable build",
  wrong: "make it show its work so confident-and-wrong gets caught",
};

/** A one-line reflect-back for each pain, for the humanity moment in the UI. */
export const PAIN_REFLECT: Record<string, string> = {
  forgot: "That one is the worst. Your kit gives it a memory file so it stops losing the thread.",
  broke: "Frustrating. Your build brief ships with a run-it-first check so you catch that early.",
  changed: "We will set a rule: it asks before touching anything you did not point it at.",
  sprawl: "Scope creep is real. Your kit scopes the build to one thing you can actually finish.",
  wrong: "It happens. Your kit makes it show its work so confident-and-wrong gets caught.",
};

/* ------------------------------------------------------------------ */
/* How-i-work (the working-style contract) - deterministic fallback     */
/* ------------------------------------------------------------------ */

export interface HowYouWorkArgs {
  prefLabels: string[];
  guardLines: string[];
  toolLabel: string;
}

/**
 * Deterministic fallback for the working-style card: who the AI is when it works
 * with this person. Built from their preferences and their pains-as-guardrails,
 * with a self-check the AI can run on itself. Platform-agnostic content; the
 * tool only shapes the closing install line.
 */
export function howYouWorkFallback(a: HowYouWorkArgs): string {
  const prefs =
    a.prefLabels.length > 0
      ? a.prefLabels.map((p) => `- ${p}.`).join("\n")
      : "- Work in small, checkable steps and keep me in the loop.";
  const guards =
    a.guardLines.length > 0
      ? a.guardLines.map((g) => `- We add ${g}.`).join("\n")
      : "- Ask before touching anything I did not point you at.";

  return `# How I like to work

This file tells any AI how to work with me. Read it first, then keep to it.

## Default behaviour
${prefs}

## Guardrails (from what has burned me before)
${guards}

## You have done this correctly when
- You worked the way the default behaviour above describes, without me reminding you.
- None of the guardrails above were crossed.
- If you were unsure, you asked rather than guessed.

To use this, paste it into the same conversation as your build brief, or save it where ${a.toolLabel} keeps its instructions.`;
}

/* ------------------------------------------------------------------ */
/* Build brief (the spec) - deterministic template                      */
/* ------------------------------------------------------------------ */

export interface BriefArgs {
  buildName: string;
  build: string;
  role: string;
  name: string;
  prefLabels: string[];
  guardLines: string[];
  toolLabel: string;
}

/**
 * Deterministic five-part build brief, sourced from the new fields: the build
 * description, the person's preferences, and their pains-as-guardrails. The
 * [FILL IN] gaps each carry a Guidance line, so an LLM polish (or the person)
 * can complete it. Platform-agnostic content; the tool names only the install.
 */
export function buildBriefTemplate(a: BriefArgs): string {
  const goalSeed = a.build
    ? `Build this: ${a.build.trim()}.`
    : "[FILL IN: the one thing this build does, in one sentence.]";
  const whoLine = a.name ? `I am ${a.name}, a ${a.role.toLowerCase()}.` : `I am a ${a.role.toLowerCase()}.`;
  const prefLine =
    a.prefLabels.length > 0
      ? `Work with me like this: ${a.prefLabels.map((p) => p.toLowerCase()).join("; ")}.`
      : "Work in small, checkable steps and keep me in the loop.";
  const guardBlock =
    a.guardLines.length > 0
      ? a.guardLines.map((g) => `- We add ${g}.`).join("\n")
      : "- Ask before touching anything I did not point you at.";

  return `# Build brief: ${a.buildName}

Fill every [FILL IN] gap, then paste the whole brief as the first message of your first build session. You do not need a developer tool: a normal chat with your AI works fine.

## 1. Goal
${goalSeed}
[FILL IN: sharpen into one sentence: who feels the difference, what changes, by when.]
Guidance: a goal is an outcome, not a feature list. "Mondays start with the plan already written" beats "build a tool".

## 2. Context
${whoLine} ${prefLine}
[FILL IN: where the information lives today (the actual apps and files), who else touches it, and how long the manual version takes.]
Guidance: name the real places. "My notes" is vague; "the Google Doc called Lecture Notes" is buildable.

## 3. Format
[FILL IN: what the output literally looks like. Name the sections, the order, what goes where.]
Guidance: "a summary" is not a format; "five bullet points, then three questions to revise from" is.

## 4. Constraints
- Tool: ${a.toolLabel}.
- Read-only against your sources unless you say otherwise.
${guardBlock}
- [FILL IN: what it must never touch, send or change. Name it plainly.]
Guidance: constraints are the cheapest bugs you will ever prevent. Write the never-dos down now.

## 5. Acceptance
- [FILL IN: check 1: something anyone could run and verify without asking you.]
- [FILL IN: check 2: one output checked by hand against the source.]
- [FILL IN: check 3: the old manual step actually retired.]
Guidance: if a check cannot fail, it is not a check. Each one needs a way to come back FAIL.`;
}

/* ------------------------------------------------------------------ */
/* Acceptance pack (kept hero) - deterministic fallback                 */
/* ------------------------------------------------------------------ */

export interface AcceptanceArgs {
  buildName: string;
  build: string;
}

/** Deterministic fallback: a runnable checklist plus the false-green verifier. */
export function acceptancePackFallback(a: AcceptanceArgs): string {
  const named = a.build?.trim() || a.buildName || "your build";
  return `# Acceptance pack

## The shipped checklist

Run this before you call it done. Every box needs evidence you can point at, not a feeling.

- [ ] Ran end to end on real information, not the sample
- [ ] The output landed where it is meant to live, and you went and looked at it there
- [ ] One output checked by hand against the source; it matches
- [ ] Someone else (or you, tomorrow morning) can run it from a one-line instruction
- [ ] It does the one thing it is for, and nothing it should not

## The false green verifier

Your tool will say it worked. Make it prove it. Paste this after any "done" or "fixed":

\`\`\`text
You just told me this is done. Do not summarise what you did; prove it.

1. Show me the actual result: the text it wrote, the file it made, the thing it produced. Paste the contents, not a description of them.
2. Take each acceptance check in my brief and show the evidence that passes it, or write FAIL next to it.
3. Run the build again ("${named}") with one input changed, and show me both outputs side by side so I can see it responds to input.
4. If you cannot show a real result for a claim, say so plainly. "It should work" counts as a fail.
\`\`\`

Never let the worker grade its own homework. That includes this one.`;
}
