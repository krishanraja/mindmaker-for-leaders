/**
 * Build Your AI Chief of Staff kit preset.
 *
 * The fifth class, and the only DECISION kit. The other four kits build an
 * artifact (a build, an automation, an org chart, an identity pack); this one
 * diagnoses. A short quiz (the eight field-guide inputs plus a role and a tool)
 * feeds a deterministic decision engine (scoring.ts, a verbatim port of the
 * field guide's Section 10), which recommends one of seven "rungs" for building
 * a personal AI chief of staff. The hero output is that recommendation; the kit
 * also hands over ready-to-paste starter files for the recommended rung.
 *
 * Linear intake (no self/biz fork): one quick chip question per screen, the
 * right shape for a quiz. The recommendation, the ranking and the guardrails are
 * computed deterministically; the LLM only warms up the prose (prompts.ts).
 *
 * Platform-agnostic content, tool-specific instructions (spec 2.3). Plain
 * TypeScript only; bundled into both the Deno edge runtime and the Vite client.
 * No Deno or Node globals.
 */

import type {
  ArtifactBuildContext,
  IntakeAnswers,
  KitPreset,
  KitTool,
} from "../types.ts";
import { kitEmailShell } from "../email-shell.ts";
import {
  asChiefScores,
  roleFromIntake,
  scoreChief,
  type ChiefScores,
} from "./scoring.ts";
import {
  AUTONOMY_OPTIONS,
  BUDGET_OPTIONS,
  identityFileFallback,
  JOB_OPTIONS,
  MAINTAIN_OPTIONS,
  NOW_OPTIONS,
  ninetyDayArcFile,
  PRIVACY_OPTIONS,
  ROLE_LABEL,
  ROLE_OPTIONS,
  RUNG_DETAIL,
  firstWeekPlanJson,
  seedMemoryPrompt,
  TECH_OPTIONS,
  threePillarsFile,
  TIME_OPTIONS,
  TOOL_OPTIONS,
  toolLabelOf,
  yourPathFallback,
} from "./templates.ts";
import {
  contextPullPrompt as buildContextPull,
  identityFilePrompt,
  yourPathPrompt,
} from "./prompts.ts";

/* ------------------------------------------------------------------ */
/* Derivations                                                         */
/* ------------------------------------------------------------------ */

function scoresOf(ctx: ArtifactBuildContext): ChiefScores {
  return asChiefScores(ctx.scores) ?? scoreChief(ctx.intake);
}

function roleLabelOf(ctx: ArtifactBuildContext): string {
  return ROLE_LABEL[roleFromIntake(ctx.intake)] ?? "";
}

/* ------------------------------------------------------------------ */
/* Intake: the linear quiz (one chip question per screen)              */
/* ------------------------------------------------------------------ */

const intake: KitPreset["intake"] = [
  {
    id: "role",
    type: "chips",
    eyebrow: "A little about you",
    prompt: "What best describes you?",
    helper: "Just so your chief of staff knows who it works for. There is no wrong answer.",
    options: ROLE_OPTIONS,
    factMappings: [{ fact_key: "role", fact_category: "identity", fact_label: "Role" }],
  },
  {
    id: "tech",
    type: "chips",
    eyebrow: "Comfort",
    prompt: "How comfortable are you building things?",
    helper: "Honest beats aspirational. The recommendation adapts either way.",
    options: TECH_OPTIONS,
  },
  {
    id: "time",
    type: "chips",
    eyebrow: "Time",
    prompt: "How much setup time will you actually invest?",
    helper: "What is real for you, not what you wish. We will match the path to it.",
    options: TIME_OPTIONS,
  },
  {
    id: "budget",
    type: "chips",
    eyebrow: "Budget",
    prompt: "What monthly budget are you happy with?",
    helper: "A good setup can cost almost nothing. This just rules options in or out.",
    options: BUDGET_OPTIONS,
  },
  {
    id: "privacy",
    type: "chips",
    eyebrow: "Privacy",
    prompt: "How sensitive is the data it would touch?",
    helper: "This decides where your memory is allowed to live.",
    options: PRIVACY_OPTIONS,
  },
  {
    id: "job",
    type: "chips",
    eyebrow: "The job",
    prompt: "What do you most want it to do?",
    helper: "Pick the one that matters most right now. You can grow into the rest.",
    options: JOB_OPTIONS,
  },
  {
    id: "autonomy",
    type: "chips",
    eyebrow: "Autonomy",
    prompt: "How much should it act on its own?",
    helper: "Earn this one last. Most people start with drafts they approve.",
    options: AUTONOMY_OPTIONS,
  },
  {
    id: "now",
    type: "chips",
    eyebrow: "Today",
    prompt: "Where are you today?",
    helper: "Wherever you are is fine. This sets your starting line, not your grade.",
    options: NOW_OPTIONS,
    factMappings: [{ fact_key: "ai_journey_stage", fact_category: "identity", fact_label: "AI journey stage" }],
  },
  {
    id: "maintain",
    type: "chips",
    eyebrow: "Upkeep",
    prompt: "Will you do a 15-minute weekly tidy-up?",
    helper: "The honest answer is the safe one. A simpler setup that runs beats a fancy one you do not maintain.",
    options: MAINTAIN_OPTIONS,
  },
  {
    id: "tool",
    type: "chips",
    eyebrow: "Your tool",
    prompt: "Which AI do you use most?",
    helper: "We tailor the install steps to it. The plan itself works with any of them.",
    options: TOOL_OPTIONS,
    factMappings: [{ fact_key: "primary_ai_tool", fact_category: "preference", fact_label: "Primary AI tool" }],
  },
];

/* ------------------------------------------------------------------ */
/* Artifacts                                                           */
/* ------------------------------------------------------------------ */

const artifacts: KitPreset["artifacts"] = [
  /* ----- Your recommendation ----- */
  {
    id: "your-path",
    title: "Your path",
    order: 1,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Your recommendation",
    description: "Your recommended rung, why it fits you, the one wall, and your first move. Read this first.",
    buildPrompt: (ctx) => yourPathPrompt(ctx, roleLabelOf(ctx)),
    render: (ctx) => yourPathFallback(scoresOf(ctx), roleLabelOf(ctx)),
  },
  {
    id: "ninety-day-arc",
    title: "Your 90-day on-ramp",
    order: 2,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Your recommendation",
    description: "The shortest honest path: native foundation, your first build, then memory and correction.",
    render: (ctx) => ninetyDayArcFile(scoresOf(ctx), toolLabelOf(ctx.tool)),
  },
  {
    id: "seven-day-plan",
    title: "Your first week",
    order: 3,
    contentType: "json",
    strategy: "deterministic",
    part: "Your recommendation",
    description: "Fifteen minutes a day for seven days. Day 1 is tonight.",
    render: (ctx) => firstWeekPlanJson(scoresOf(ctx), toolLabelOf(ctx.tool)),
  },

  /* ----- Starter files ----- */
  {
    id: "identity-file",
    title: "Your identity file",
    order: 4,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Starter files",
    description: "The single source of truth about you. Fill the gaps, then paste it where your AI keeps its instructions.",
    buildPrompt: (ctx) => identityFilePrompt(ctx, roleLabelOf(ctx), toolLabelOf(ctx.tool)),
    render: (ctx) => identityFileFallback(roleLabelOf(ctx), toolLabelOf(ctx.tool)),
  },
  {
    id: "seed-memory-prompt",
    title: "Seed-memory prompt",
    order: 5,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Starter files",
    description: "Paste this once to teach your AI who you are.",
    render: (ctx) => seedMemoryPrompt(roleLabelOf(ctx), toolLabelOf(ctx.tool)),
  },
  {
    id: "three-pillars",
    title: "The three pillars",
    order: 6,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Starter files",
    description: "Identity, memory, monitoring: the checklist that decides whether yours survives.",
    render: (ctx) => threePillarsFile(scoresOf(ctx).recommended.rung, toolLabelOf(ctx.tool)),
  },
  {
    id: "starter-pack",
    title: "Starter pack",
    order: 7,
    contentType: "zip",
    strategy: "scaffold_zip",
    part: "Starter files",
    description: "Everything above in one download, with a README that names your tool.",
    renderFiles: (ctx) => {
      const scores = scoresOf(ctx);
      const roleLabel = roleLabelOf(ctx);
      const toolLabel = toolLabelOf(ctx.tool);
      const d = RUNG_DETAIL[scores.recommended.rung];
      return [
        {
          path: "README.md",
          content: `# Your AI chief of staff starter pack

Your recommended path: rung ${scores.recommended.rung}, ${d.name}.

Use these files in order:
1. your-path.md - your recommendation and first move.
2. identity-file.md - fill the gaps, then paste it where ${toolLabel} keeps its instructions.
3. seed-memory-prompt.md - paste once to teach ${toolLabel} who you are.
4. three-pillars.md - the checklist that keeps it alive.
5. 90-day-plan.md - the on-ramp from this week to day 90.

The content works on any AI platform; only the install lines name ${toolLabel}.`,
        },
        { path: "your-path.md", content: yourPathFallback(scores, roleLabel) },
        { path: "identity-file.md", content: identityFileFallback(roleLabel, toolLabel) },
        { path: "seed-memory-prompt.md", content: seedMemoryPrompt(roleLabel, toolLabel) },
        { path: "three-pillars.md", content: threePillarsFile(scores.recommended.rung, toolLabel) },
        { path: "90-day-plan.md", content: ninetyDayArcFile(scores, toolLabel) },
      ];
    },
  },
];

/* ------------------------------------------------------------------ */
/* Emails                                                              */
/* ------------------------------------------------------------------ */

const emails: KitPreset["emails"] = {
  pack: {
    subject: () => "Your AI chief of staff: start here",
    html: (ctx) =>
      kitEmailShell({
        heading: "Your path is ready",
        kitUrl: ctx.kitUrl,
        buttonLabel: "Open your recommendation",
        bodyHtml: `<p style="margin:0 0 16px 0;">Your quiz answers pointed to one place to start. Inside: your recommended rung, why it fits you, the one wall to expect, and the starter files to get going (an identity file, a seed-memory prompt, and a 90-day plan).</p>
<p style="margin:0 0 16px 0;">Do day 1 tonight: write your identity file and paste it in. Twenty minutes, and your AI stops forgetting who you are.</p>`,
      }),
  },
  day3: {
    subject: () => "Day 3. Is your identity file in yet?",
    html: (ctx) => {
      const toolLabel = ctx.toolLabel || "your AI";
      return kitEmailShell({
        heading: "Day 3. Is your identity file in yet?",
        kitUrl: ctx.kitUrl,
        buttonLabel: "Open your first week",
        bodyHtml: `<p style="margin:0 0 16px 0;">The rung you picked barely matters. What matters is the identity file, the memory, and noticing when it stops working.</p>
<p style="margin:0 0 16px 0;">Two minutes, right now: open ${toolLabel}, paste your identity file, and ask it to brief you on your week. If it forgets who you are, the file needs one more line.</p>
<p style="margin:0 0 16px 0;">Stuck? Reply and tell me where. I read every reply.</p>`,
      });
    },
  },
  day7: {
    subject: () => "One week in. Did it get sharper?",
    html: (ctx) =>
      kitEmailShell({
        heading: "One week in. Did it get sharper?",
        kitUrl: ctx.kitUrl,
        buttonLabel: "Open your 90-day plan",
        bodyHtml: `<p style="margin:0 0 16px 0;">A week of morning briefs should already feel a little less generic. If it does, the memory is working. If it does not, fix the memory before you add anything.</p>
<p style="margin:0 0 16px 0;">This week: do the one correction that matters and write it back into your identity file. That write-back loop is the whole engine.</p>`,
      }),
  },
};

/* ------------------------------------------------------------------ */
/* Preset                                                              */
/* ------------------------------------------------------------------ */

export const chiefOfStaffPreset: KitPreset = {
  slug: "chief-of-staff",
  version: "1.0.0",
  title: "Build Your AI Chief of Staff",
  classTitle: "Build Your AI Chief of Staff",
  tagline: "Answer a few questions; get the one path to your AI chief of staff that actually fits you.",
  mavenUrl: "https://maven.com/mindmaker",
  codePrefixes: ["CHIEF"],
  passDays: 30,
  skillQuota: 3,
  intake,
  artifacts,
  score: (intake: IntakeAnswers) => scoreChief(intake),
  contextPullPrompt: (tool: KitTool) => buildContextPull(tool),
  emails,
};
