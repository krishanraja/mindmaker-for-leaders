/**
 * Vibe Coding Field Kit: markdown templates, the curated pick-cascade option
 * sets, and the no-LLM fallbacks for the six kept artifacts.
 *
 * Template-literal constants and pure functions returning strings. The option
 * sets and the workflow matrix power the intake's recognition cascade (the
 * student picks the repetitive thing from curated lists, never types a blob),
 * and the live picks preview. No Deno or Node globals; plain TypeScript only.
 */

import type { IntakeOption } from "../types.ts";
import type { VibeScore } from "./scoring.ts";
import { frequencyLabel } from "./scoring.ts";

/** Baked into every LLM polish prompt so generated copy holds the register. */
export const VOICE_RULES = `Voice rules for everything you write:
- Operator tone: direct prose, sentence case, British-Australian spelling.
- No em dashes anywhere. Use hyphens, commas, semicolons or parentheses.
- No buzzwords. Never "transformation", "leverage" as a verb, "game-changer" or "unlock".
- No artificial urgency, no fear. Confidence earned, not asserted.
- Warm and plain: assume a smart person who has never built software. Never assume Cursor or Lovable; the tool is whatever they already have open.
- Short sentences. Every word earns its place.`;

/* ------------------------------------------------------------------ */
/* Pick-cascade option sets                                            */
/* ------------------------------------------------------------------ */

function slugifyLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "opt"
  );
}

const opt = (label: string, description?: string): IntakeOption => ({
  id: slugifyLabel(label),
  label,
  ...(description ? { description } : {}),
});

/**
 * The repetitive AREAS, by pathway. The self set is framed for a student or
 * individual (study, life admin, a side project); the biz set is framed for an
 * operator. Both are deliberately approachable, no jargon, nothing that assumes
 * a developer.
 */
export const AREA_OPTIONS_SELF: IntakeOption[] = [
  opt("Studying or learning"),
  opt("Job hunting or applications"),
  opt("Writing and content"),
  opt("Personal admin"),
  opt("Research and reading"),
  opt("A side project"),
  opt("Money and budgeting"),
];

export const AREA_OPTIONS_BIZ: IntakeOption[] = [
  opt("Finding customers"),
  opt("Marketing and content"),
  opt("Customer support"),
  opt("Admin and scheduling"),
  opt("Reporting and numbers"),
  opt("Invoicing and money"),
  opt("Research"),
];

/** What the chosen workflow actually involves (multi). Shapes the build. */
export const INVOLVES_OPTIONS: IntakeOption[] = [
  opt("Pulling info together from a few places"),
  opt("Writing the same kind of thing each time"),
  opt("Copying things between apps"),
  opt("Formatting or tidying"),
  opt("Checking or comparing"),
  opt("Sending it to someone"),
];

/**
 * Curated AREA -> workflow matrix (AdaptiveOptions.matrixKey). Keyed by the
 * chosen build-first area label; each row is the specific repetitive workflows
 * inside it. This is the RECOGNITION step that replaces the open-ended voice
 * question: the student sees their grind in a list and taps it.
 */
export const WORKFLOW_MATRIX: Record<string, IntakeOption[]> = {
  // self areas
  "Studying or learning": [
    opt("Turning lecture or video notes into a summary"),
    opt("Making flashcards or a study sheet"),
    opt("Pulling key points out of a long reading"),
    opt("Building a revision plan"),
  ],
  "Job hunting or applications": [
    opt("Tailoring a CV to each role"),
    opt("Writing the cover letter each time"),
    opt("Tracking applications and follow-ups"),
    opt("Prepping answers for interviews"),
  ],
  "Writing and content": [
    opt("Turning a rough draft into something readable"),
    opt("Writing the same kind of post each week"),
    opt("Repurposing one thing across channels"),
    opt("Editing to your own voice"),
  ],
  "Personal admin": [
    opt("Scheduling and rescheduling"),
    opt("Chasing things you keep forgetting"),
    opt("Sorting your inbox"),
    opt("Filling in the same forms"),
  ],
  "Research and reading": [
    opt("Pulling sources into one brief"),
    opt("The same lookup every time"),
    opt("Summarising what you found"),
    opt("Comparing options in a table"),
  ],
  "A side project": [
    opt("The same setup every time you start"),
    opt("Turning ideas into a plan"),
    opt("Writing the recap or update"),
    opt("Tracking what is left to do"),
  ],
  "Money and budgeting": [
    opt("Pulling spending into one view"),
    opt("The monthly money check-in"),
    opt("Splitting or tracking shared costs"),
  ],
  // biz areas
  "Finding customers": [
    opt("Following up after a chat"),
    opt("Writing the outreach message"),
    opt("Researching who to contact"),
    opt("Chasing the people who went quiet"),
  ],
  "Marketing and content": [
    opt("Turning one idea into a week of posts"),
    opt("Writing the same kind of post"),
    opt("Repurposing across channels"),
    opt("Drafting the newsletter"),
  ],
  "Customer support": [
    opt("Answering the same questions"),
    opt("Writing help articles"),
    opt("Sorting and routing messages"),
    opt("Chasing things to resolution"),
  ],
  "Admin and scheduling": [
    opt("Scheduling and rescheduling"),
    opt("Chasing people for things"),
    opt("Sorting the inbox"),
    opt("Onboarding a new client"),
  ],
  "Reporting and numbers": [
    opt("Pulling numbers into one update"),
    opt("Rebuilding the same report"),
    opt("Answering what-happened questions"),
  ],
  "Invoicing and money": [
    opt("Raising and chasing invoices"),
    opt("Reconciling what came in"),
    opt("The monthly money check-in"),
  ],
  Research: [
    opt("Pulling sources into one brief"),
    opt("The same lookup every time"),
    opt("Summarising what you found"),
  ],
};

export const WORKFLOW_FALLBACK: IntakeOption[] = [
  opt("The repetitive one"),
  opt("The fiddly one"),
  opt("The one I keep forgetting"),
];

/**
 * Live picks-preview stub: AREA label -> the tool you would build there. The
 * honest, named build comes from compose off the real answers; this only powers
 * the in-intake "building" preview (KitPicksBoard) so the board feels alive as
 * the student taps. Deterministic, clearly the optimistic stub.
 */
export const AGENT_PICKS_STUB: Record<string, { pick: string; desc: string }> = {
  // self
  "Studying or learning": { pick: "Study helper", desc: "turns your notes into summaries and cards" },
  "Job hunting or applications": { pick: "Application helper", desc: "tailors each CV and tracks the rest" },
  "Writing and content": { pick: "Draft helper", desc: "gets your rough draft to readable" },
  "Personal admin": { pick: "Admin helper", desc: "handles the chasing and the forms" },
  "Research and reading": { pick: "Research helper", desc: "pulls sources into one brief" },
  "A side project": { pick: "Project helper", desc: "does the repeatable setup" },
  "Money and budgeting": { pick: "Money helper", desc: "pulls spending into one view" },
  // biz
  "Finding customers": { pick: "Outreach helper", desc: "drafts and chases, you approve" },
  "Marketing and content": { pick: "Content helper", desc: "spins one idea into the week" },
  "Customer support": { pick: "Support helper", desc: "handles the known questions" },
  "Admin and scheduling": { pick: "Scheduler helper", desc: "books and reschedules around you" },
  "Reporting and numbers": { pick: "Reporting helper", desc: "builds the update, every time" },
  "Invoicing and money": { pick: "Billing helper", desc: "raises and chases, you sign off" },
  Research: { pick: "Research helper", desc: "pulls the brief, you judge it" },
};

/* ------------------------------------------------------------------ */
/* Leverage audit (kept hero) - deterministic fallback                  */
/* ------------------------------------------------------------------ */

/** Deterministic fallback for the leverage audit: a card from scoring alone. */
export function leverageAuditFallback(score: VibeScore, workflow: string): string {
  const named = workflow || "the workflow you picked";
  return `# Your leverage audit

**The workflow you picked:** ${named}

**Where it sits:** ${frequencyLabel(score.frequency)} frequency, ${score.judgment} judgment.

**Quadrant:** ${score.quadrant}

**The call:** ${score.recommendation}

**Scope check before you start:** version one is one input, one output, one run. If you cannot describe the output in a single sentence, cut scope until you can.`;
}

/* ------------------------------------------------------------------ */
/* Five-part brief (kept hero) - deterministic template                 */
/* ------------------------------------------------------------------ */

export interface BriefArgs {
  buildName: string;
  workflow: string;
  involves: string[];
  role: string;
  offering: string;
  toolLabel: string;
  tierLabel: string;
  tierRule: string;
  win: string;
}

/** Deterministic five-part brief with the cascade slotted in and [FILL IN] gaps. */
export function fivePartBriefTemplate(a: BriefArgs): string {
  const offeringLine = a.offering ? ` I am calling this build "${a.offering}".` : "";
  const goalSeed = a.workflow
    ? `Stop doing this by hand: ${a.workflow.toLowerCase()}.`
    : "[FILL IN: the repetitive thing this replaces, in one sentence.]";
  const involvesLine =
    a.involves.length > 0
      ? `Today it involves: ${a.involves.map((s) => s.toLowerCase()).join("; ")}.`
      : "[FILL IN: walk through the steps as they happen today.]";

  return `# Build brief: ${a.buildName}

Fill every [FILL IN] gap, then paste the whole brief as the first message of your first build session. You do not need a developer tool: a normal chat with your AI works fine.

## 1. Goal
${goalSeed}
[FILL IN: sharpen into one sentence: who feels the difference, what changes, by when.]
Guidance: a goal is an outcome, not a feature list. "Mondays start with the summary already written" beats "build a tool".

## 2. Context
I am a ${a.role}.${offeringLine} ${involvesLine}
[FILL IN: where the information lives today (the actual apps and files), who else touches it, and how long the manual version takes.]
Guidance: name the real places. "My notes" is vague; "the Google Doc called Lecture Notes" is buildable.

## 3. Format
[FILL IN: what the output literally looks like. Name the sections, the order, what goes where.]
Guidance: "a summary" is not a format; "five bullet points, then three questions to revise from" is.

## 4. Constraints
- Tool: ${a.toolLabel}.
- Stakes tier: ${a.tierLabel}. ${a.tierRule}
- Read-only against your sources unless you say otherwise.
- [FILL IN: what it must never touch, send or change. Name it plainly.]
Guidance: constraints are the cheapest bugs you will ever prevent. Write the never-dos down now.

## 5. Acceptance
Shipped means ${a.win}.
- [FILL IN: check 1: something anyone could run and verify without asking you.]
- [FILL IN: check 2: one output checked by hand against the source.]
- [FILL IN: check 3: the old manual step actually retired.]
Guidance: if a check cannot fail, it is not a check. Each one needs a way to come back FAIL.`;
}

/* ------------------------------------------------------------------ */
/* Acceptance pack (kept hero) - deterministic fallback                 */
/* ------------------------------------------------------------------ */

export interface AcceptanceArgs {
  workflow: string;
  win: string;
}

/** Deterministic fallback: a runnable checklist plus the false-green verifier. */
export function acceptancePackFallback(a: AcceptanceArgs): string {
  const workflow = a.workflow || "your workflow";
  return `# Acceptance pack

## The shipped checklist

Run this before you call it done. Every box needs evidence you can point at, not a feeling.

- [ ] Ran end to end on real information, not the sample
- [ ] The output landed where it is meant to live, and you went and looked at it there
- [ ] One output checked by hand against the source; it matches
- [ ] Someone else (or you, tomorrow morning) can run it from a one-line instruction
- [ ] Your definition of shipped happened: ${a.win}

## The false green verifier

Your tool will say it worked. Make it prove it. Paste this after any "done" or "fixed":

\`\`\`text
You just told me this is done. Do not summarise what you did; prove it.

1. Show me the actual result: the text it wrote, the file it made, the thing it produced. Paste the contents, not a description of them.
2. Take each acceptance check in my brief and show the evidence that passes it, or write FAIL next to it.
3. Run it again ("${workflow}") with one input changed, and show me both outputs side by side so I can see it responds to input.
4. If you cannot show a real result for a claim, say so plainly. "It should work" counts as a fail.
\`\`\`

Never let the worker grade its own homework. That includes this one.`;
}
