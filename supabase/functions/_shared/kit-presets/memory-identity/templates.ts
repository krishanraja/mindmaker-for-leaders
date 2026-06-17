/**
 * The Prompt Pack: option sets, the adaptive task matrix, and the identity-file
 * scaffolds.
 *
 * Two jobs in one module:
 *  1. The curated, deterministic option data for the new pick-cascade intake:
 *     the role/domain recognition lists (per pathway), the firstJob -> tasks
 *     matrix (AdaptiveOptions.matrixKey = "tasks"), and the never-store
 *     guardrail options. Pure data, no LLM, mirroring how the org-chart preset
 *     keeps its GRIND_MATRIX here. preset.ts wires these into the intake.
 *  2. Renders about-me.md, my-voice.md and my-channels.md, plus a short README.
 *     Each file carries the build prompt that fills it from the student's
 *     history; the renderers now read the STRUCTURED JobInput (role + job),
 *     never a single open-ended voice blob.
 *
 * Deterministic string building, no LLM, no Deno or Node globals.
 */

import type { IntakeOption, KitTool } from "../types.ts";
import { KIT_TOOL_LABELS } from "../types.ts";
import {
  aboutMeBuildPrompt,
  channelsBuildPrompt,
  jobFilename,
  selfCorrectFooter,
  voiceBuildPrompt,
  type JobInput,
} from "./prompts.ts";

const FENCE = "```";

/* ================================================================== */
/* Intake option data (the new pick-cascade)                           */
/* ================================================================== */

function opt(label: string, description?: string): IntakeOption {
  return {
    id: label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "opt",
    label,
    ...(description ? { description } : {}),
  };
}

/** Profile chip (what they do) on the self branch. The role headline. */
export const SELF_ROLES: IntakeOption[] = [
  opt("Founder"),
  opt("Consultant"),
  opt("Freelancer"),
  opt("Creator"),
  opt("Coach"),
  opt("Operator"),
  opt("Something else"),
];

/** Profile chip (what they do) on the biz branch. */
export const BIZ_ROLES: IntakeOption[] = [
  opt("Founder / CEO"),
  opt("Head of a function"),
  opt("Operations"),
  opt("Marketing"),
  opt("Sales"),
  opt("Product"),
  opt("Something else"),
];

/**
 * The RECOGNITION list (boxes): which role/domain to build the first operator
 * for. Self = the hats a one-person operation wears; biz = the functions a
 * small team runs. Multi-select so they can mark more than one, but the cascade
 * then asks which single one to build first.
 */
export const SELF_DOMAINS: IntakeOption[] = [
  opt("Content and writing"),
  opt("Sales and outreach"),
  opt("Client and customer work"),
  opt("Research and analysis"),
  opt("Admin and scheduling"),
  opt("Finance and invoicing"),
  opt("Hiring and recruiting"),
];

export const BIZ_DOMAINS: IntakeOption[] = [
  opt("Marketing and content"),
  opt("Sales and pipeline"),
  opt("Customer support"),
  opt("Research and analysis"),
  opt("Operations and admin"),
  opt("Finance and reporting"),
  opt("Hiring and recruiting"),
];

/**
 * The first-job -> tasks matrix. AdaptiveOptions.matrixKey = "tasks", keyed by
 * the chosen first-job LABEL (the startBox option carries its source label
 * through, and the source options ARE the domain labels above, identical across
 * pathways where they overlap). Each row is the handful of concrete tasks that
 * job actually covers, so the student recognises and confirms rather than types.
 *
 * The keys cover every domain label from BOTH pathways. Where a self label and
 * a biz label name the same work ("Content and writing" vs "Marketing and
 * content") they get their own rows so the tasks read true to that framing.
 */
export const TASK_MATRIX: Record<string, IntakeOption[]> = {
  "Content and writing": [
    opt("Draft posts and articles"),
    opt("Repurpose one piece into many"),
    opt("Edit to my standard"),
    opt("Outline from a rough idea"),
    opt("Headlines and hooks"),
  ],
  "Marketing and content": [
    opt("Draft posts and articles"),
    opt("Repurpose one piece into many"),
    opt("Campaign and channel briefs"),
    opt("Edit to brand voice"),
    opt("Headlines and hooks"),
  ],
  "Sales and outreach": [
    opt("Personalise outreach"),
    opt("Reply to inbound"),
    opt("Draft follow-ups"),
    opt("Research a prospect"),
    opt("Summarise a call"),
  ],
  "Sales and pipeline": [
    opt("Personalise outreach"),
    opt("Qualify and triage inbound"),
    opt("Draft follow-ups"),
    opt("Research an account"),
    opt("Update the pipeline notes"),
  ],
  "Client and customer work": [
    opt("Draft client updates"),
    opt("Turn notes into deliverables"),
    opt("Answer common questions"),
    opt("Prep for a meeting"),
    opt("Write the recap and next steps"),
  ],
  "Customer support": [
    opt("Answer common questions"),
    opt("Draft replies to tickets"),
    opt("Summarise a thread"),
    opt("Triage by urgency"),
    opt("Write the help-doc version"),
  ],
  "Research and analysis": [
    opt("Pull and summarise sources"),
    opt("Compare options on a grid"),
    opt("Turn data into a readout"),
    opt("Find the counter-argument"),
    opt("Write the brief"),
  ],
  "Admin and scheduling": [
    opt("Draft and triage email"),
    opt("Turn a thread into next steps"),
    opt("Prep an agenda"),
    opt("Write the recap"),
    opt("Track the open loops"),
  ],
  "Operations and admin": [
    opt("Draft and triage email"),
    opt("Turn a thread into next steps"),
    opt("Write the SOP"),
    opt("Prep an agenda"),
    opt("Track the open loops"),
  ],
  "Finance and invoicing": [
    opt("Draft invoices and reminders"),
    opt("Reconcile a list"),
    opt("Summarise the numbers"),
    opt("Chase a payment politely"),
    opt("Write the month-end note"),
  ],
  "Finance and reporting": [
    opt("Summarise the numbers"),
    opt("Turn data into a readout"),
    opt("Build the recurring report"),
    opt("Flag what moved and why"),
    opt("Write the board-ready note"),
  ],
  "Hiring and recruiting": [
    opt("Write the job post"),
    opt("Screen against the brief"),
    opt("Draft outreach to candidates"),
    opt("Summarise an interview"),
    opt("Write the structured scorecard"),
  ],
};

/** Fallback tasks when the chosen job has no matrix row. Honest and generic. */
export const TASK_FALLBACK: IntakeOption[] = [
  opt("Draft the first version"),
  opt("Summarise and condense"),
  opt("Turn notes into a deliverable"),
  opt("Answer the recurring questions"),
  opt("Edit to my standard"),
];

/**
 * The honesty guardrail (tags / chartFeed:tags): what the operator must never
 * store in its files. Stable ids so the compose prompts and the keep/never
 * artifact can read them. "Nothing off-limits" is the explicit no-op pick.
 */
export const NEVER_STORE: IntakeOption[] = [
  { id: "secrets", label: "Passwords and keys" },
  { id: "others-pii", label: "Other people's private data" },
  { id: "client-confidential", label: "Client-confidential details" },
  { id: "financials", label: "Sensitive financials" },
  { id: "personal", label: "My own personal / health data" },
  { id: "nothing", label: "Nothing is off-limits" },
];

/* ================================================================== */
/* Identity-file scaffolds (now read the structured JobInput)          */
/* ================================================================== */

function fillHeader(tool: KitTool, what: string): string[] {
  const toolLabel = KIT_TOOL_LABELS[tool];
  return [
    "## How to fill this file",
    `Paste the prompt below into ${toolLabel}. It mines your history for ${what}, drafts the file, and confirms it with you one quick question at a time. Paste its output into the sections underneath, then cut anything that does not sound like you. Two minutes, done.`,
    "",
  ];
}

export function renderAboutMe(input: JobInput): string {
  return [
    "# about-me.md",
    "",
    "Who I am, how I decide, what I am working toward. This is about me, the person, never a role the AI plays.",
    "",
    ...fillHeader(input.tool, "who you are and what you are known for"),
    FENCE,
    aboutMeBuildPrompt(input),
    FENCE,
    "",
    "## Who I am",
    `- [FILL IN from the draft: what you do, for whom${
      input.role.trim() ? `; you told us: ${input.role.trim()}` : ""
    }]`,
    "",
    "## What I am working toward",
    "- [FILL IN: where your time is going right now]",
    "",
    "## What people come to me for",
    "- [FILL IN]",
    "",
    "## Known for, do not get wrong",
    "- [FILL IN]",
    "",
  ].join("\n");
}

export function renderVoice(input: JobInput): string {
  return [
    "# my-voice.md",
    "",
    "How I sound. Drop this into any writing task on its own and the output comes back in my voice.",
    "",
    ...fillHeader(input.tool, "your actual tone and phrasing, from things you wrote"),
    FENCE,
    voiceBuildPrompt(input),
    FENCE,
    "",
    "## How I sound",
    "- [FILL IN from the draft: 3 or 4 lines]",
    "",
    "## Always (with a real example each)",
    "- [FILL IN]",
    "",
    "## Never",
    "- [FILL IN]",
    "",
  ].join("\n");
}

export function renderChannels(input: JobInput): string {
  return [
    "# my-channels.md",
    "",
    "Where I publish and what each place is for. One short block per channel.",
    "",
    ...fillHeader(input.tool, "the places you post and what you put on each"),
    FENCE,
    channelsBuildPrompt(input),
    FENCE,
    "",
    "## Channels",
    "- [FILL IN from the draft: one block per channel - who it is for, what it is for, the format you use]",
    "",
  ].join("\n");
}

export function renderIdentityReadme(input: JobInput): string {
  const role = input.job.trim().length > 0 ? input.job.trim() : "the job you run most";
  const file = jobFilename(input);
  return [
    "# Your identity files",
    "",
    "Three small files, each useful on its own. They are about you and they do not change when the job changes. Keep them one click away. To write a post in your voice, drop in my-voice.md (and my-channels.md if it matters) and brief your AI as usual.",
    "",
    "## The files",
    "- about-me.md: who you are, how you decide, what you are working toward.",
    "- my-voice.md: how you sound, with real examples.",
    "- my-channels.md: where you publish and what each place is for.",
    "",
    "## Hold the line",
    `Identity is who you are. A job file (your ${role} operator, \`${file}\`) is a role the AI plays. Keep them apart, or the tool confuses who you are with what you once asked it to be. The role can change. You do not.`,
    "",
    "## Make every file self-correcting",
    "Paste this footer at the bottom of any file above, and at the bottom of your job file. It turns every correction into a rule the system keeps.",
    "",
    FENCE,
    selfCorrectFooter(input),
    FENCE,
    "",
  ].join("\n");
}
