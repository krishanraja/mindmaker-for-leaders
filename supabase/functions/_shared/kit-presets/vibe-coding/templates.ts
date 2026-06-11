/**
 * Vibe Coding Field Kit: markdown templates.
 *
 * Template-literal constants and pure functions returning strings. These are
 * the deterministic renders and the no-LLM fallbacks for polish artifacts.
 */

import type { KitTool } from "../types.ts";
import type { ExperienceLevel, StakesTier, VibeScore } from "./scoring.ts";
import { frequencyLabel } from "./scoring.ts";

/** Baked into every LLM polish prompt so generated copy holds the register. */
export const VOICE_RULES = `Voice rules for everything you write:
- Operator tone: direct prose, sentence case, British-Australian spelling.
- No em dashes anywhere. Use hyphens, commas, semicolons or parentheses.
- No buzzwords. Never "transformation", "leverage" as a verb, "game-changer" or "unlock".
- No artificial urgency, no fear. Confidence earned, not asserted.
- Short sentences. Every word earns its place.`;

/* ------------------------------------------------------------------ */
/* Part 1: Spot + Spec                                                  */
/* ------------------------------------------------------------------ */

/** Deterministic fallback for the leverage audit: a card from scoring alone. */
export function leverageAuditFallback(score: VibeScore, grind: string): string {
  const workflow = grind || "the workflow you described in class";
  return `# Your leverage audit

**The workflow you named:** ${workflow}

**Where it sits:** ${frequencyLabel(score.frequency)} frequency, ${score.judgment} judgment.

**Quadrant:** ${score.quadrant}

**The call:** ${score.recommendation}

**Scope check before you start:** version one is one input, one output, one run. If you cannot describe the output in a single sentence, cut scope until you can.`;
}

export const TIER_GUARDRAILS: Record<StakesTier, string> = {
  "full-speed":
    "Anything beyond your own machine and your own data. That is the second build, after this one works.",
  "with-review":
    "Anything that writes to shared systems or messages your team unattended. You are at With review: a human checks every output before it lands.",
  "human-led":
    "Anything that touches customers or customer data without a person in the loop. You are at Human-led: the tool drafts, you send, every time.",
};

export const EXPERIENCE_GUARDRAILS: Record<ExperienceLevel, string> = {
  never:
    "Multi-step agents, databases, payment or email integrations. One prompt in, one useful output out is the whole game this week.",
  "few-prompts":
    "Building for other people before the version for you works. Ship for an audience of one first.",
  shipped:
    "The platform rebuild. You know the pull; resist it. One new capability shipped this week beats five refactored.",
};

/** Per-tool first move, used on the buildability card. */
export function startingPath(tool: KitTool): string {
  switch (tool) {
    case "claude":
      return "Open claude.ai and create a Project named after your build. Paste the spec interviewer in as the first message. No installs, no setup.";
    case "chatgpt":
      return "Open chatgpt.com, start a new chat, paste the spec interviewer. Turn memory on if it is not already. No installs, no setup.";
    case "cursor":
      return "Open Cursor on a new empty folder. Paste the spec interviewer into chat, then let it scaffold from the finished spec. The folder is the project; nothing else to set up.";
    case "claude-code":
      return "Open a terminal in a new empty folder and start Claude Code. Paste the spec interviewer. The folder is the project; nothing else to set up.";
    case "lovable":
      return "Open lovable.dev and describe your build in one paragraph from your spec. It scaffolds the app while you watch. No local setup at all.";
    case "gemini":
      return "Open gemini.google.com, start a new chat, paste the spec interviewer. No installs, no setup.";
    default:
      return "Open claude.ai in your browser and sign up free. Start a chat, paste the spec interviewer, and you are building. Pick a permanent tool after you have shipped once.";
  }
}

export interface BuildabilityArgs {
  buildName: string;
  toolLabel: string;
  startPath: string;
  tierLabel: string;
  tierGuardrail: string;
  experienceGuardrail: string;
}

export function buildabilityCard(a: BuildabilityArgs): string {
  return `# Buildable by you, this weekend

**Your build:** ${a.buildName}

**First tool to open:** ${a.toolLabel}

**The no-setup path:**
${a.startPath}

**Not yet, given your stakes tier (${a.tierLabel}):**
${a.tierGuardrail}

**Not yet, given where you are:**
${a.experienceGuardrail}

One build, one weekend, one user: you. Everything else is the second build.`;
}

/* ------------------------------------------------------------------ */
/* Part 2: Brief + Build                                                */
/* ------------------------------------------------------------------ */

export interface BriefArgs {
  buildName: string;
  grind: string;
  role: string;
  offering: string;
  toolLabel: string;
  tierLabel: string;
  tierRule: string;
  win: string;
}

/** Deterministic five-part brief with intake slotted in and [FILL IN] gaps. */
export function fivePartBriefTemplate(a: BriefArgs): string {
  const offeringLine = a.offering ? ` The business sells ${a.offering}.` : "";
  const goalSeed = a.grind
    ? `Stop doing this by hand: "${a.grind}"`
    : "[FILL IN: the manual workflow this replaces, in one sentence.]";
  const contextSeed = a.grind
    ? `The workflow today, in my words: "${a.grind}"`
    : "[FILL IN: walk through the manual steps as they happen today.]";

  return `# Build brief: ${a.buildName}

Fill every [FILL IN] gap, run the whole thing through the brief upgrader, then paste it as the first message of your build session.

## 1. Goal
${goalSeed}
[FILL IN: sharpen into one sentence: who feels the difference, what changes, by when.]
Guidance: a goal is an outcome, not a feature list. "Mondays start with the numbers already assembled" beats "build a dashboard".

## 2. Context
I am a ${a.role}.${offeringLine} ${contextSeed}
[FILL IN: where the data lives today (the actual systems and files), who else touches it, and how long the manual version takes.]
Guidance: name real systems. "Our CRM" is vague; "HubSpot, the Deals pipeline" is buildable.

## 3. Format
[FILL IN: what the output literally looks like. Name the sections, the columns, the sort order.]
Guidance: "a table" is not a format; "a table by client, sorted by overdue days, worst first" is.

## 4. Constraints
- Tool: ${a.toolLabel}.
- Stakes tier: ${a.tierLabel}. ${a.tierRule}
- Read-only against source systems unless I say otherwise.
- [FILL IN: what it must never touch, send or spend. Name systems and numbers.]
Guidance: constraints are the cheapest bugs you will ever prevent. Write the never-dos down now.

## 5. Acceptance
Shipped means ${a.win}.
- [FILL IN: check 1: something a stranger could run and verify without asking you.]
- [FILL IN: check 2: one output spot-checked by hand against the source.]
- [FILL IN: check 3: the old manual step actually retired.]
Guidance: if a check cannot fail, it is not a check. Each one needs a way to come back FAIL.`;
}

/** The brief upgrader: a paste-ready critique prompt. Not tool-specific. */
export function briefUpgraderTemplate(): string {
  return `# Brief upgrader

Copy the block, paste it into your tool, put your draft brief where marked. Ship the tightened version it returns, not your draft.

\`\`\`text
Here is a draft brief for something I want to build. Do not build anything yet. Critique the brief first.

Read it twice: once as a senior software developer, once as a product designer.

As the developer, tell me:
- What is vague enough to become a bug?
- What data, permissions or edge cases have I not mentioned?
- What will be slow, fragile or expensive the way I have framed it?

As the designer, tell me:
- Where is the output format underspecified?
- What will the user try first that I have not planned for?
- What have I included that version one does not need?

Then rewrite the brief, tightened, in the same five-part structure: Goal, Context, Format, Constraints, Acceptance. Mark every assumption you made with [ASSUMED] so I can confirm or correct it. Do not start building until I say the brief is right.

[PASTE YOUR DRAFT BRIEF HERE]
\`\`\``;
}

export interface ConstitutionArgs {
  buildName: string;
  toolLabel: string;
  tierLabel: string;
  tierRule: string;
  role: string;
  offering: string;
  grind: string;
}

/** Deterministic project constitution with intake slots and [FILL IN] gaps. */
export function constitutionTemplate(a: ConstitutionArgs): string {
  const offeringLine = a.offering ? ` The business sells ${a.offering}.` : "";
  const what = a.grind
    ? `It replaces this manual workflow: "${a.grind}".`
    : "[FILL IN: one sentence on the manual workflow it replaces.]";

  return `# Project constitution: ${a.buildName}

Paste this at the top of every fresh session, before any task. It is the memory your tool does not have.

## What this is
${a.buildName}, built and owned by a ${a.role}.${offeringLine} ${what}

## Decisions already made
- Tool: ${a.toolLabel}. Do not suggest switching tools.
- Version one does exactly one thing: [FILL IN: the one thing]. New feature ideas go in a NOTES list, not the build.
- Stakes tier: ${a.tierLabel}. ${a.tierRule}

## What must never break
- [FILL IN: the one output someone relies on, e.g. "the Monday numbers are never silently wrong"]
- No data leaves [FILL IN: where data is allowed to live].
- Nothing sends externally (email, message, post) without a human pressing send.

## My conventions
- Plain language in every label and message; nothing I would not say out loud.
- Dates as [FILL IN: your format, e.g. 9 Jun 2026]. Currency as [FILL IN: e.g. AUD, no decimals].
- [FILL IN: one convention of yours, e.g. "client names always in full"]

## Design system stub
- Tone of anything the build writes: direct, plain, sentence case.
- Tables over prose for numbers. One screen where possible; cut content before shrinking it.
- Type and colour: [FILL IN: or write "system defaults, do not fight them"].
- Every screen answers one question. If a screen answers three, it is three screens.`;
}

/** The four session habits as literal copy-paste openers. */
export function sessionScripts(tool: KitTool): string {
  const planNote =
    tool === "claude-code"
      ? "\n\nClaude Code note: it has a built-in plan mode (shift+tab to cycle into it). The opener works either way."
      : tool === "cursor"
        ? "\n\nCursor note: paste this in Ask mode, approve the plan, then switch to Agent mode to execute."
        : "";

  return `# Session scripts

Four habits as four openers. Copy the one that matches the moment; keep the wording until the habits are automatic.

## 1. Plan first (start of any build task)

\`\`\`text
Before you write or change anything, give me a numbered plan: what you will do, what you will touch, and what could break. Do not execute anything until I approve the plan. If anything in my request is ambiguous, ask me now, not halfway through.
\`\`\`${planNote}

## 2. Fresh session (start of any new chat)

\`\`\`text
Read my project constitution below before doing anything else. This session has exactly one task: [THE ONE TASK]. Stay inside it. If you notice other problems, list them at the end; do not fix them.

[PASTE YOUR CONSTITUTION HERE]
\`\`\`

## 3. Debug (when something breaks)

\`\`\`text
Something is broken. What I expected: [EXPECTED]. What happened: [ACTUAL]. Do not patch anything yet. Diagnose first: list the three most likely causes in order, with the evidence for each, and tell me how to confirm the front-runner. Propose the smallest possible fix only after we have confirmed the cause.
\`\`\`

## 4. Wrap up (end of every session)

\`\`\`text
We are wrapping up. Summarise what changed this session: built, fixed, decided, still open. Then append one dated line to BUILD_LOG.md (what ran, what felt off, one rule to add) and tell me if anything we learned belongs in LESSONS.md as a standing rule.
\`\`\`

Four scripts, four habits: plan before action, one task per session, diagnose before patching, log before closing.`;
}

/* ------------------------------------------------------------------ */
/* Part 3: Verify + Govern                                              */
/* ------------------------------------------------------------------ */

export interface AcceptanceArgs {
  grind: string;
  win: string;
}

/** Deterministic fallback: generic checklist + verifier with their workflow slotted. */
export function acceptancePackFallback(a: AcceptanceArgs): string {
  const workflow = a.grind || "your workflow";
  return `# Acceptance pack

## The shipped checklist

Run this before you call it done. Every box needs evidence you can point at, not a feeling.

- [ ] Ran end to end on real data, not the sample
- [ ] The output landed where it is meant to live, and you went and looked at it there
- [ ] One output spot-checked by hand against the source; the numbers match
- [ ] Someone else (or you, tomorrow morning) can run it from a one-line instruction
- [ ] Your definition of shipped happened: ${a.win}

## The false green verifier

Your tool will say it worked. Make it prove it. Paste this after any "done" or "fixed":

\`\`\`text
You just told me this is done. Do not summarise what you did; prove it.

1. Show me the actual artifact: the row that was written, the file that was created, the message that sent. Paste the contents, not a description of them.
2. Take each acceptance check in my brief and show the evidence that passes it, or write FAIL next to it.
3. Run the workflow again ("${workflow}") with one input changed, and show me both outputs side by side so I can see it responds to input.
4. If you cannot produce an artifact for a claim, say so plainly. "It should work" counts as a fail.
\`\`\`

Never let the worker grade its own homework. That includes this one.`;
}

export interface RegistryArgs {
  buildName: string;
  touches: string;
  tierLabel: string;
}

export function toolRegistryTemplate(a: RegistryArgs): string {
  return `# Tool registry

One row per thing you have built that does work without you. Row one is your first build; the empty rows are the habit.

| Tool | What it touches | Owner | Stakes tier | Last reviewed |
| --- | --- | --- | --- | --- |
| ${a.buildName} | ${a.touches} | You | ${a.tierLabel} | [DATE OF FIRST RUN] |
|  |  |  |  |  |
|  |  |  |  |  |

Three rules that keep this honest:
- Nothing runs unattended unless it has a row.
- "Last reviewed" older than a month means review it this week or switch it off.
- When an owner moves on (including future you changing roles), the tool is re-reviewed or retired, never orphaned.`;
}

export const TIER_REQUIREMENTS: Record<StakesTier, string> = {
  "full-speed":
    "Nothing sensitive, nobody else affected. Build and run freely. Keep your registry row current; that is the entire overhead at this tier.",
  "with-review":
    "A human (you) reviews every output before it lands anywhere shared. Run it attended for the first two weeks; consider unattended runs only after a clean fortnight.",
  "human-led":
    "The tool drafts, gathers and prepares; a human approves and sends, every time, no exceptions. Log each run in the registry while the build is this new.",
};

export const TIER_TRIGGERS: Record<StakesTier, string> = {
  "full-speed":
    "The moment a teammate starts relying on the output, you are at With review. Tell them it is AI-assisted and start checking outputs before they land.",
  "with-review":
    "The moment customer data or anything customer-facing enters, you are at Human-led. Stop unattended runs that day and put a person between the tool and the customer.",
  "human-led":
    "You are at the top of the dial. Watch scale instead: the day volume tempts you to skip the human check is the day to hand it to engineering, not the day to relax the rule.",
};

export interface StakesDialArgs {
  buildName: string;
  tier: StakesTier;
}

export function stakesDialCard(a: StakesDialArgs): string {
  const mark = (t: StakesTier) => (t === a.tier ? "  <-- you are here" : "");
  return `# Stakes dial

**Your build:** ${a.buildName}

\`\`\`text
Full speed${mark("full-speed")}
With review${mark("with-review")}
Human-led${mark("human-led")}
\`\`\`

**What your tier requires:**
${TIER_REQUIREMENTS[a.tier]}

**The trigger that moves you up a tier:**
${TIER_TRIGGERS[a.tier]}

## The handoff packet

When this build outgrows you, hand engineering three things:

1. The working app, exactly as it runs today
2. Your project constitution (the rules file)
3. One page of architecture notes: what talks to what, where the data lives, what runs on a schedule

Then ask for a risk assessment, not a quote. The build already exists; the question is what it takes to trust it at the next tier.`;
}

/** BUILD_LOG.md for the learning loop ZIP. */
export function buildLogTemplate(buildName: string): string {
  return `# BUILD_LOG

One line per run, appended by the agent (see the Learning loop section in your skill). You skim it weekly; patterns here become rules in LESSONS.md.

| Date | What ran | What felt off | One rule to add |
| --- | --- | --- | --- |
| 2026-06-15 | ${buildName}, end to end | Date range defaulted to last month without saying so | State the date range in the output header, every run |
|  |  |  |  |
`;
}

/** LESSONS.md for the learning loop ZIP. */
export function lessonsTemplate(): string {
  return `# LESSONS

Standing rules this build has earned. The agent reads this file at the start of every session and treats every line as binding.

1. Never accept "done" without an artifact: the row, the file, the message that sent.
2. State the data source and date range in every output, every time.
3. When an output looks right but arrived suspiciously fast, spot-check one value against the source by hand.

Add a rule whenever you correct the same mistake twice. Delete rules that stop earning their place.

## The flywheel

Once a month, paste this file back into CTRL at /kit and regenerate your skill. Every rule here becomes a permanent instruction in the next version; the build gets sharper because you used it.
`;
}
