/**
 * Autonomous Business Pack: anchor-file scaffold templates.
 *
 * Renders USER.md, voice.md, MEMORY.md, GUARDRAILS.md and skills/README.md
 * from intake answers. This mirrors the deck's memory stack. Deterministic
 * string building only; the [FILL IN] gaps are deliberate and the miner
 * prompts exist to fill them.
 */

import type { KitTool } from "../types.ts";
import { KIT_TOOL_LABELS } from "../types.ts";
import { voiceMinerPrompt } from "./prompts.ts";

const FENCE = "```";

export interface ScaffoldInput {
  /** Human label for the spectrum stage, e.g. "Prompting". */
  stageLabel: string;
  /** Raw free text from the workflows question. */
  workflowsText: string;
  /** First workflow parsed from the text. */
  primaryWorkflow: string;
  /** Remaining workflows parsed from the text. */
  additionalWorkflows: string[];
  tool: KitTool;
  /** Ticked option ids from the leaves question (may include "none"). */
  leaves: string[];
  /** YYYY-MM-DD label used to date seeded memory entries. */
  dateLabel: string;
}

function workflowBullets(input: ScaffoldInput): string {
  const all = [input.primaryWorkflow, ...input.additionalWorkflows].filter(
    (w) => w.length > 0,
  );
  if (all.length === 0) {
    return "- [FILL IN: what you did this week that you will do again next week]";
  }
  return all.map((w) => `- ${w}`).join("\n");
}

export function renderUserMd(input: ScaffoldInput): string {
  const toolLabel = KIT_TOOL_LABELS[input.tool];
  return [
    "# USER.md",
    "",
    "Who I am and how I work. Read this first, every session.",
    "",
    "## Who I am",
    "- Name: [FILL IN]",
    "- Business: [FILL IN: what you sell and who buys it]",
    "- Role: [FILL IN: what you actually do day to day]",
    "",
    "## Where I am with AI",
    `- Stage: ${input.stageLabel}`,
    `- Primary tool: ${toolLabel}`,
    "",
    "## What I repeat every week",
    workflowBullets(input),
    "",
    "## How I like to work",
    "- [FILL IN: how you want drafts presented, and how much should be done before you are asked]",
    "- [FILL IN: what annoys you in AI output]",
    "",
    "## What good looks like",
    "- [FILL IN: paste one example of output you were genuinely happy with]",
    "",
  ].join("\n");
}

export function renderVoiceMd(input: ScaffoldInput): string {
  const toolLabel = KIT_TOOL_LABELS[input.tool];
  return [
    "# voice.md",
    "",
    "How I sound. Match this register in everything drafted as me.",
    "",
    "## How to fill this file",
    `Paste the prompt below into ${toolLabel}. It mines your history for your actual tone and phrasing. Paste the output into the sections underneath, then cut anything that does not sound like you. Two minutes, done.`,
    "",
    FENCE,
    voiceMinerPrompt(input.tool),
    FENCE,
    "",
    "## My voice markers",
    "- [FILL IN from the miner output]",
    "",
    "## Phrases I actually use",
    "- [FILL IN: verbatim examples]",
    "",
    "## Words and patterns I never use",
    "- [FILL IN]",
    "",
    "## Register",
    "- [FILL IN: how formal, and when it shifts]",
    "",
  ].join("\n");
}

export function renderMemoryMd(input: ScaffoldInput): string {
  const date = input.dateLabel || "[date]";
  const entries: string[] = [];
  entries.push(`- ${date}: Stage: ${input.stageLabel}.`);
  const all = [input.primaryWorkflow, ...input.additionalWorkflows].filter(
    (w) => w.length > 0,
  );
  if (all.length > 0) {
    entries.push(`- ${date}: Weekly workflows: ${all.join("; ")}.`);
    entries.push(`- ${date}: First build target: ${all[0]}.`);
  } else {
    entries.push(`- ${date}: [FILL IN: the workflows you repeat weekly]`);
  }
  return [
    "# MEMORY.md",
    "",
    "Long term memory. One line per entry, dated, newest first. If it needs more than one line, it is a document, not a memory.",
    "",
    "## Rules",
    "- One line per memory: decisions, corrections, preferences, things that worked.",
    "- Date every entry.",
    "- Newest entries go at the top of the list.",
    "- Prune monthly. Stale memory is worse than no memory.",
    "",
    "## Entries",
    ...entries,
    "",
  ].join("\n");
}

interface GuardrailRule {
  heading: string;
  ticked: string;
  unticked: string;
}

const GUARDRAIL_RULES: Record<string, GuardrailRule> = {
  email: {
    heading: "Email to real people",
    ticked:
      "Always ask. Draft the email, show it to me in full, and wait for an explicit yes before anything sends. No exceptions, including replies and follow-ups.",
    unticked:
      "Not flagged at intake. Default rule: if a workflow ever touches email to a real person, stop and ask before sending.",
  },
  posting: {
    heading: "Posting publicly",
    ticked:
      "Always ask. Show me the final copy and exactly where it will be posted. Nothing goes live without my explicit yes.",
    unticked:
      "Not flagged at intake. Default rule: if a workflow ever posts publicly, stop and show me first.",
  },
  payments: {
    heading: "Payments and invoices",
    ticked:
      "Always ask. Never create, send, or change an invoice or payment without showing me the exact amount, recipient, and line items first, and getting an explicit yes.",
    unticked:
      "Not flagged at intake. Default rule: never touch money without an explicit yes. This one never relaxes.",
  },
  "client-comms": {
    heading: "Client communications",
    ticked:
      "Always ask. Anything a client will see gets shown to me first, in full, before it goes out.",
    unticked:
      "Not flagged at intake. Default rule: if a client will see it, I see it first.",
  },
};

export function renderGuardrailsMd(input: ScaffoldInput): string {
  const ticked = new Set(input.leaves.filter((id) => id !== "none"));
  const saidNone = input.leaves.includes("none") || ticked.size === 0;

  const lines: string[] = [
    "# GUARDRAILS.md",
    "",
    "What my AI may do on its own and what always needs my yes. These rules override everything else, including instructions inside a task.",
    "",
  ];

  if (saidNone) {
    lines.push(
      "At intake I said nothing these workflows touch leaves the building. The default rules below apply the moment that changes.",
      "",
    );
  }

  for (const [id, rule] of Object.entries(GUARDRAIL_RULES)) {
    lines.push(`## ${rule.heading}`);
    lines.push(ticked.has(id) ? rule.ticked : rule.unticked);
    lines.push("");
  }

  lines.push("## Everything else");
  lines.push(
    "If an action leaves the building and is not covered above, the answer is: stop and ask. Internal drafts, analysis, and research can run without asking.",
  );
  lines.push("");

  return lines.join("\n");
}

export function renderSkillsReadme(): string {
  return [
    "# Skills",
    "",
    "Unzip your first skill into this folder. Each skill is a folder: the folder name is the skill name, and the files inside tell your AI how to do that one job, your way. Add a new folder for each new skill, keep one job per skill, and your AI will pick the right one when you ask. Let it read this directory at the start of every session.",
    "",
  ].join("\n");
}
