/**
 * Build Your AI Chief of Staff: the LLM polish prompts and the context-pull.
 *
 * The decision (the rung, the ranking, the guardrails) is computed
 * deterministically in scoring.ts and is NOT the model's job. These prompts only
 * warm up the prose around that fixed decision: the model may never pick a
 * different rung, invent a tool, or soften a guardrail. Each prompt hands the
 * model the computed recommendation and the deterministic draft, and asks it to
 * make the copy warm and personal while keeping every fact.
 *
 * Platform-agnostic content, tool-specific instructions: only install / paste
 * lines name the person's tool. Plain TypeScript only; no Deno or Node globals.
 */

import type { ArtifactBuildContext, KitTool } from "../types.ts";
import { asChiefScores } from "./scoring.ts";
import {
  RUNG_DETAIL,
  VOICE_RULES,
  fitReasons,
  identityFileFallback,
  yourPathFallback,
} from "./templates.ts";

const PREAMBLE =
  "You are writing one piece of a personalised result for someone who just took the 'Build Your AI Chief of Staff' class and answered a short quiz. The quiz already decided their recommended approach (their 'rung'); your job is only to make the writing warm, plain and personal, never to change the recommendation. Be an honest broker: the loudest claims come from whoever is selling a tool. They may not be technical.";

/* ------------------------------------------------------------------ */
/* The recommendation (your-path)                                       */
/* ------------------------------------------------------------------ */

export function yourPathPrompt(ctx: ArtifactBuildContext, roleLabel: string): string {
  const scores = asChiefScores(ctx.scores);
  if (!scores) {
    // No scores (should not happen); the deterministic fallback covers it.
    return `${PREAMBLE}\n\nReturn this markdown unchanged:\n\n${identityFileFallback(roleLabel, "your AI")}`;
  }
  const rec = scores.recommended;
  const d = RUNG_DETAIL[rec.rung];
  const reasons = fitReasons(scores).join("\n- ");
  const draft = yourPathFallback(scores, roleLabel);

  return `${PREAMBLE}

The quiz computed this and it is FIXED. Do not change any of it:
- Recommended rung: ${rec.rung}, ${d.name}.
- What it is: ${d.oneLiner}
- The one wall: ${d.wall}
- The design call that heads it off: ${d.designCall}
- Their first move: ${d.firstStep}
- The reasons it fits them (use these, do not invent others):
- ${reasons}
${scores.guardrailsApplied.length ? `- Guardrails we held: ${scores.guardrailsApplied.join(" | ")}` : ""}
- Warnings to include verbatim near the end: ${scores.warnings.join(" | ")}

Below is a deterministic draft of their result. Rewrite it to read warmly and
personally to this person (role: ${roleLabel || "not given"}), keeping EVERY fact,
heading, rung number, tool name and the warnings exactly. Do not add a different
rung, a tool they were not given, or a claim not in the draft. Keep it to one
page, headings no deeper than ##.

${draft}

${VOICE_RULES}

Return only the markdown.`;
}

/* ------------------------------------------------------------------ */
/* The identity file (Pillar 1)                                         */
/* ------------------------------------------------------------------ */

export function identityFilePrompt(ctx: ArtifactBuildContext, roleLabel: string, toolLabel: string): string {
  const draft = identityFileFallback(roleLabel, toolLabel);
  const ctxBlock = ctx.memoryContext
    ? `\n\nWhat we already know about this person (use it to pre-fill the [FILL IN] gaps you safely can; never invent):\n${ctx.memoryContext}`
    : "";
  return `${PREAMBLE}

Write their identity file: the single source of truth their AI chief of staff
reads first. Start from this exact skeleton, keeping every heading and the "You
have done this correctly when" section verbatim:

${draft}

Rules:
- Pre-fill every [FILL IN] gap you can defend from what we know; leave the rest as
  a [FILL IN: ...] gap with its guidance so they can finish it. Never invent
  facts, numbers, clients or priorities.
- Keep the draft-not-send rule and the never-without-approval list intact.
- The only tool-specific line is the closing install line, which names ${toolLabel}.
${ctxBlock}

${VOICE_RULES}

Return only the markdown.`;
}

/* ------------------------------------------------------------------ */
/* The context-pull (homework) - tool-aware                             */
/* ------------------------------------------------------------------ */

/**
 * Optional homework: pull what the person's own AI already knows about them, so
 * the identity file starts grounded rather than blank. Linear intake does not
 * surface a homework screen, but the preset must provide this, and it is a clean
 * paste-ready prompt if shown.
 */
export function contextPullPrompt(tool: KitTool): string {
  const lead =
    tool === "none"
      ? "You may not know much about me yet, so answer honestly from whatever you do have."
      : "Use anything you already know about me from our past chats and memory. Do not ask me what you can answer yourself.";
  return `I am setting up an AI chief of staff and want it grounded in the real me.

${lead}

In a short, honest list, tell me:
- My role and what I am responsible for.
- The two or three priorities that matter most to me right now.
- How I like an assistant to work with me (draft vs act, short vs detailed).
- Anything I would never want an assistant to do without my say-so.
- How I tend to write (tone, length), with one short example in my own words if you have one.

No flattery, just what you actually know. Write it back as a short summary I can
paste into my chief of staff's identity file.`;
}
