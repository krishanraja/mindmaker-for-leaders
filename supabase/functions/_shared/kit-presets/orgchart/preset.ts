/**
 * Agentic Org Chart preset.
 *
 * The class draws the student a branded, honest org chart of their work with
 * agents slotted in: which functions an agent leads, which it assists, which
 * stay human, where to start, and the new human roles to grow into. The intake
 * forks (self = a team of one; biz = a small team) and cascades coherently so
 * each step stays consistent with the last; the live preview assembles the
 * chart box-by-box as the student answers; the take-home pack composes the
 * chart artifact plus where-you-start, roles-to-add, a first-90-days plan and a
 * pack map.
 *
 * Engine fit: this preset uses the additive IntakeQuestion extensions
 * (pathwayFork / pathwayCopy / showIf / adaptiveOptions / nameField /
 * chartFeed) and KitPreset.optionMatrices + agentRoles, all owned by the types
 * module. The three existing presets set none of these and are unaffected.
 *
 * The hero chart artifact uses the new 'llm_chart' strategy: kit-compose runs
 * one structured-JSON call (chartComposePrompt) and stores the validated chart
 * JSON as a json artifact flagged metadata.render = "orgchart" so KitHome
 * renders OrgChartView instead of raw JSON. On any failure it stores the
 * deterministic honest fallback chart, so the hero is never empty.
 *
 * No Deno or Node globals; plain TypeScript only.
 */

import type {
  ArtifactBuildContext,
  IntakeAnswers,
  IntakeOption,
  KitEmailContext,
  KitPreset,
} from "../types.ts";
import {
  chartComposePrompt,
  first90Prompt,
  rolesToAddPrompt,
  whereYouStartPrompt,
  type ChartPromptInput,
} from "./prompts.ts";
import {
  AGENT_ROLE_STUB,
  buildFallbackChart,
  buildPackMap,
  GRIND_FALLBACK,
  GRIND_MATRIX,
  type ChartJson,
} from "./templates.ts";

/* ------------------------------------------------------------------ */
/* Option sets                                                         */
/* ------------------------------------------------------------------ */

const opt = (label: string, description?: string): IntakeOption => ({
  id: slugifyLabel(label),
  label,
  ...(description ? { description } : {}),
});

function slugifyLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "opt"
  );
}

const BIZ_SECTORS = [
  opt("Agency or services"),
  opt("Software or SaaS"),
  opt("E-commerce or retail"),
  opt("Media or content"),
  opt("Professional services"),
  opt("Other"),
];

const SOLO_ROLES = [
  opt("Consultant"),
  opt("Freelancer"),
  opt("Solo founder"),
  opt("Creator"),
  opt("Coach"),
  opt("Agency of one"),
];

const BIZ_FUNCTIONS = [
  opt("Sales"),
  opt("Marketing"),
  opt("Customer support"),
  opt("Finance / ops"),
  opt("Hiring"),
  opt("Content"),
  opt("Data / reporting"),
  opt("Product"),
];

const SELF_HATS = [
  opt("Finding clients"),
  opt("Doing the work"),
  opt("Marketing myself"),
  opt("Admin / scheduling"),
  opt("Invoicing"),
  opt("Content"),
  opt("Research"),
];

const INVOLVES = [
  opt("Pull info from a tool"),
  opt("Write a message or doc"),
  opt("Update a system"),
  opt("Wait on someone"),
  opt("Check or decide something"),
  opt("Send it to a person"),
];

const MATURITY = [
  opt("Barely started", "I write prompts when I remember to"),
  opt("A few of us prompt", "we use AI here and there"),
  opt("Some automations running", "a few things run without me"),
  opt("Agents already running", "agents handle parts of the work"),
];

// Guardrail ids are stable and matched by templates.GUARDRAIL_TOUCH.
const GUARDRAILS: IntakeOption[] = [
  { id: "email", label: "Email real customers" },
  { id: "spend", label: "Spend money" },
  { id: "post", label: "Post publicly" },
  { id: "data", label: "Touch customer data" },
  { id: "final-call", label: "Make the final call" },
  { id: "none", label: "Nothing is off-limits" },
];

/* ------------------------------------------------------------------ */
/* Intake read helpers                                                 */
/* ------------------------------------------------------------------ */

function pathwayOf(intake: IntakeAnswers): "self" | "biz" {
  return intake["pathway"]?.optionId === "biz" ? "biz" : "self";
}
function textOf(intake: IntakeAnswers, id: string): string {
  return intake[id]?.text?.trim() ?? "";
}
function labelOfSelected(question: IntakeOption[], id: string | undefined): string {
  return question.find((o) => o.id === id)?.label ?? "";
}
function selectedLabels(intake: IntakeAnswers, id: string, options: IntakeOption[]): string[] {
  const ids = intake[id]?.optionIds ?? [];
  return ids
    .map((oid) => options.find((o) => o.id === oid)?.label)
    .filter((l): l is string => Boolean(l));
}

/** The boxes the student picked: functions (biz) or hats (self). */
function boxLabelsOf(intake: IntakeAnswers): string[] {
  const pathway = pathwayOf(intake);
  return selectedLabels(intake, "boxes", pathway === "biz" ? BIZ_FUNCTIONS : SELF_HATS);
}

/** The start box label (the chosen time-sink), validated against the boxes. */
function startLabelOf(intake: IntakeAnswers): string {
  const boxes = boxLabelsOf(intake);
  // The time-sink options are drawn from the boxes (adaptiveOptions.fromQuestionId),
  // so the stored optionId is the slug of the chosen box label.
  const sinkId = intake["timeSink"]?.optionId;
  const match = boxes.find((b) => slugifyLabel(b) === sinkId);
  return match ?? boxes[0] ?? "";
}

function guardrailIdsOf(intake: IntakeAnswers): string[] {
  return intake["guardrails"]?.optionIds ?? [];
}

function grindLabelOf(intake: IntakeAnswers): string {
  const startLabel = startLabelOf(intake);
  const matrix = GRIND_MATRIX[startLabel] ?? GRIND_FALLBACK;
  return labelOfSelected(matrix, intake["grind"]?.optionId);
}

function chartPromptInput(ctx: ArtifactBuildContext): ChartPromptInput {
  const { intake } = ctx;
  const pathway = pathwayOf(intake);
  return {
    pathway,
    businessName: textOf(intake, "profile"),
    whatItDoes:
      labelOfSelected(pathway === "biz" ? BIZ_SECTORS : SOLO_ROLES, intake["profile"]?.optionId) ||
      "",
    boxLabels: boxLabelsOf(intake),
    timeSink: startLabelOf(intake),
    grind: grindLabelOf(intake),
    involves: selectedLabels(intake, "involves", INVOLVES),
    maturity: labelOfSelected(MATURITY, intake["maturity"]?.optionId),
    guardrails: selectedLabels(intake, "guardrails", GUARDRAILS),
    tool: ctx.tool,
  };
}

/**
 * The honest deterministic fallback chart from the intake. Also used by the
 * pack-map artifact so its counts are always available even if the LLM chart
 * call has not run yet for that build.
 */
function fallbackChartOf(intake: IntakeAnswers): ChartJson {
  return buildFallbackChart({
    pathway: pathwayOf(intake),
    businessName: textOf(intake, "profile"),
    boxLabels: boxLabelsOf(intake),
    startLabel: startLabelOf(intake),
    guardrailIds: guardrailIdsOf(intake),
  });
}

/* ------------------------------------------------------------------ */
/* Email shell                                                         */
/* ------------------------------------------------------------------ */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(body: string, ctx: KitEmailContext, buttonLabel: string): string {
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    '<body style="margin:0;padding:0;background-color:#f3f5f1;">',
    '<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#13282c;font-size:16px;line-height:1.6;">',
    body,
    '<p style="margin:28px 0;">',
    `<a href="${escapeHtml(ctx.kitUrl)}" style="display:inline-block;background-color:#1e7860;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${buttonLabel}</a>`,
    "</p>",
    '<p style="margin:24px 0 0;">Krish</p>',
    "</div>",
    "</body>",
    "</html>",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* The preset                                                          */
/* ------------------------------------------------------------------ */

export const orgchartPreset: KitPreset = {
  slug: "orgchart",
  version: "1.0.0",
  title: "Agentic Org Chart",
  classTitle: "Agentic Org Chart Lightning Lesson",
  tagline: "A branded chart of your work with the agents to add, and where to start.",
  mavenUrl: "https://maven.com/mindmaker",
  codePrefixes: ["ORGCHART", "ORG", "CHART"],
  passDays: 30,
  skillQuota: 3,

  /* ---- the live preview is the bespoke OrgChartView ---------------- */
  previewKind: "orgchart",

  /* ---- the curated, deterministic option matrices + preview stub ---- */
  optionMatrices: { grind: GRIND_MATRIX },
  agentRoles: AGENT_ROLE_STUB,

  /* ---- the coherent forked, adaptive, chart-building cascade -------- */
  intake: [
    // 0. THE FORK - who are we drawing this for. Pathway only.
    {
      id: "pathway",
      type: "chips",
      pathwayFork: true,
      eyebrow: "Let's draw your chart",
      prompt: "Who are we drawing this for?",
      helper: "This changes what we ask, and the chart you walk away with.",
      options: [
        { id: "self", label: "I'm building for myself", pathway: "self" },
        { id: "biz", label: "I'm scoping for my business", pathway: "biz" },
      ],
      factMappings: [
        { fact_key: "kit_orgchart_pathway", fact_category: "identity", fact_label: "Org chart pathway" },
      ],
    },

    // 0b. PROFILE - the name on the chart + what it does (the leadership node).
    // Carries the nameField (the branding on the chart) and the sector/role.
    {
      id: "profile",
      type: "chips",
      eyebrow: "Your business",
      prompt: "Tell us about your business.",
      helper: "This is the line at the top of your chart.",
      showIf: { answeredQuestionId: "pathway" },
      nameField: { label: "Name on the chart", placeholder: "e.g. Northstar Media" },
      pathwayCopy: {
        self: { prompt: "Tell us about you.", helper: "This is the line at the top of your chart." },
        biz: { prompt: "Tell us about your business.", helper: "This is the line at the top of your chart." },
      },
      pathwayOptions: { biz: BIZ_SECTORS, self: SOLO_ROLES },
      options: [...BIZ_SECTORS, ...SOLO_ROLES],
      factMappings: [
        { fact_key: "kit_orgchart_sector", fact_category: "business", fact_label: "What the business does" },
      ],
    },

    // 1. BOXES (multi) - the chart boxes. Pathway-specific option set + copy.
    {
      id: "boxes",
      type: "chips_multi",
      eyebrow: "The shape",
      prompt: "Which functions does your business run?",
      chartFeed: "boxes",
      showIf: { answeredQuestionId: "pathway" },
      pathwayCopy: {
        self: {
          prompt: "Which hats do you wear?",
          helper: "Tap all that apply. These become your chart.",
        },
        biz: {
          prompt: "Which functions does your business run?",
          helper: "Tap all that apply. These become the boxes on your chart.",
        },
      },
      // KitIntake selects the option set by pathway: SELF_HATS vs BIZ_FUNCTIONS.
      // pathwayOptions drives the intake (and the live preview / backend read
      // the pathway-correct set); `options` is the concatenated fallback.
      pathwayOptions: { biz: BIZ_FUNCTIONS, self: SELF_HATS },
      options: [...BIZ_FUNCTIONS, ...SELF_HATS],
    },

    // 2. TIME-SINK (one) - the start box. Options adapt from the chosen boxes.
    {
      id: "timeSink",
      type: "chips",
      eyebrow: "Where it hurts",
      prompt: "Where does the most time get burned?",
      chartFeed: "startBox",
      showIf: { answeredQuestionId: "boxes" },
      adaptiveOptions: { fromQuestionId: "boxes" },
      pathwayCopy: {
        self: {
          prompt: "Which hat eats the most time?",
          helper: "This is where your chart starts: the first thing worth handing to an agent.",
        },
        biz: {
          prompt: "Where does the most time get burned?",
          helper: "This is where your chart starts: the first thing worth handing to an agent.",
        },
      },
    },

    // 3. GRIND (one) - the specific workflow, adaptive from the time-sink via matrix.
    {
      id: "grind",
      type: "chips",
      eyebrow: "The grind",
      prompt: "What's the grind there?",
      helper: "Pick the closest one.",
      showIf: { answeredQuestionId: "timeSink" },
      adaptiveOptions: {
        matrixKey: "grind",
        matrixFromQuestionId: "timeSink",
        fallback: GRIND_FALLBACK,
      },
    },

    // 4. INVOLVES (multi) - what the grind actually involves. Shapes the agent.
    {
      id: "involves",
      type: "chips_multi",
      eyebrow: "The grind",
      prompt: "What does that actually involve?",
      helper: "Tap the steps. This shapes the agent we design.",
      showIf: { answeredQuestionId: "grind" },
      options: INVOLVES,
    },

    // 5. MATURITY (one) - how far along with AI today.
    {
      id: "maturity",
      type: "chips",
      eyebrow: "Today",
      prompt: "How far along is the business with AI?",
      showIf: { answeredQuestionId: "involves" },
      pathwayCopy: {
        self: { prompt: "How far along are you with AI?" },
        biz: { prompt: "How far along is the business with AI?" },
      },
      options: MATURITY,
      factMappings: [
        { fact_key: "ai_journey_stage", fact_category: "identity", fact_label: "AI journey stage" },
      ],
    },

    // 6. GUARDRAILS (multi) - what an agent must never do without a human. Feeds tags.
    {
      id: "guardrails",
      type: "chips_multi",
      eyebrow: "Guardrails",
      prompt: "What should an agent never do without a human?",
      helper: "This decides what is agent-led, assisted, or kept with you.",
      chartFeed: "tags",
      showIf: { answeredQuestionId: "maturity" },
      pathwayCopy: {
        self: { prompt: "What would you never hand off blind?" },
        biz: { prompt: "What should an agent never do without a human?" },
      },
      options: GUARDRAILS,
    },
  ],

  /* ---- artifacts -------------------------------------------------- */
  artifacts: [
    // (a) THE HERO: the structured chart. llm_chart -> json flagged for OrgChartView.
    {
      id: "agentic-org-chart",
      title: "Your agentic org chart",
      order: 1,
      contentType: "json",
      strategy: "llm_chart",
      part: "Chart",
      description:
        "Your work as a chart: every box tagged agent-led, assisted, or you-only, with the agent to add and the human role beside it.",
      buildPrompt: (ctx) => chartComposePrompt(chartPromptInput(ctx)),
      // Deterministic honest fallback when the chart call fails or is malformed.
      render: (ctx) => JSON.stringify(fallbackChartOf(ctx.intake)),
    },

    // (b) WHERE YOU START - the first agent to stand up. llm_polish markdown.
    {
      id: "where-you-start",
      title: "Where you start",
      order: 2,
      contentType: "markdown",
      strategy: "llm_polish",
      part: "Chart",
      description: "The first agent to stand up, why this box, and what the first build looks like this week.",
      buildPrompt: (ctx) => whereYouStartPrompt(chartPromptInput(ctx)),
      render: (ctx) => {
        const i = chartPromptInput(ctx);
        const start = i.timeSink || "your biggest time-sink";
        return [
          "# Where you start",
          "",
          `**Stand up your first agent on ${start}.**`,
          "",
          `It is painful, repeatable, and low-risk: the right place to learn to ship one agent. The grind there (${i.grind || "the repetitive part"}) is exactly what an agent should take first.`,
          "",
          i.guardrails.length > 0
            ? `Keep a hand on the wheel: anything that touches ${i.guardrails.join(", ")} gets drafted and shown to you for approval before it goes out. The agent does the work; you make the call.`
            : "Nothing here leaves the building unsupervised, so the first agent can run the loop end to end while you watch it for a week.",
          "",
          "Everything else on your chart waits its turn. One agent shipped beats three half-built.",
        ].join("\n");
      },
    },

    // (c) ROLES TO ADD - the new human roles. llm_polish markdown.
    {
      id: "roles-to-add",
      title: "Roles to add",
      order: 3,
      contentType: "markdown",
      strategy: "llm_polish",
      part: "Chart",
      description: "As agents take the grind, the human roles that open up beside them.",
      buildPrompt: (ctx) => rolesToAddPrompt(chartPromptInput(ctx)),
      render: (ctx) => {
        const i = chartPromptInput(ctx);
        const lines = ["# Roles to add", ""];
        const ordered = [i.timeSink, ...i.boxLabels.filter((b) => b !== i.timeSink)].filter(Boolean);
        for (const box of ordered) {
          lines.push(`- **${box}**: you grow into running this, not doing it. The agent takes the grind; you own the judgement and the exceptions.`);
        }
        lines.push("", "Add these one at a time, starting with the box you build first.");
        return lines.join("\n");
      },
    },

    // (d) FIRST 90 DAYS - staged plan. llm_plan -> { days: [...] } (7 stages).
    {
      id: "first-90-days",
      title: "Your first 90 days",
      order: 4,
      contentType: "json",
      strategy: "llm_plan",
      part: "Operate",
      description: "Stand up your first agent, prove it, then expand across the chart. One stage at a time.",
      buildPrompt: (ctx) => first90Prompt(chartPromptInput(ctx), ctx.firstSkillName),
    },

    // (e) PACK MAP - the chart at a glance. deterministic json.
    {
      id: "pack-map",
      title: "Pack map",
      order: 5,
      contentType: "json",
      strategy: "deterministic",
      part: "Operate",
      description: "Your chart at a glance: boxes, where you start, and what's agent-led.",
      render: (ctx) => {
        const chart = fallbackChartOf(ctx.intake);
        const guardrails = chartPromptInput(ctx).guardrails;
        return buildPackMap(chart, guardrails);
      },
    },
  ],

  // The compose-wait context-pull: ask the student's tool to map their week.
  contextPullPrompt: (_tool, ctx) => {
    const intake = (ctx?.intake ?? {}) as IntakeAnswers;
    const start = startLabelOf(intake) || "the work that eats your week";
    return [
      "# Map my week so my chart is built from the truth.",
      "",
      `While my chart composes: in your own words, walk through ${start} from start to finish, the way you would explain it to a new hire. Every manual step, every tool you open, every person you wait on.`,
      "",
      "Then tell me the one part of it you would hand to an agent first, and the one part you would never let it do without you.",
    ].join("\n");
  },

  emails: {
    pack: {
      subject: () => "Your agentic org chart",
      html: (ctx) =>
        emailShell(
          [
            '<p style="margin:0 0 16px;">Your chart is built from your own answers, not a template. Every box is tagged agent-led, assisted, or you-only, with the agent to add and the human role beside it.</p>',
            '<p style="margin:0 0 16px;">One job this week: stand up the first agent on your start box. Painful, repeatable, low-risk, that is the one to learn on.</p>',
            '<p style="margin:0 0 16px;">The pack has the chart, where to start, the roles to add, and your first 90 days.</p>',
          ].join("\n"),
          ctx,
          "Open your chart",
        ),
    },
    day3: {
      subject: () => "Day 3. Have you started the first box?",
      html: (ctx) =>
        emailShell(
          [
            '<p style="margin:0 0 16px;">Your chart named one box to start with: the first agent worth standing up.</p>',
            '<p style="margin:0 0 16px;">Open the chart, read the where-you-start brief, and do the first build this week. Scrappy counts.</p>',
            '<p style="margin:0 0 16px;">Stuck? Reply with one line and I will point you at the fix.</p>',
          ].join("\n"),
          ctx,
          "Open the chart",
        ),
    },
    day7: {
      subject: () => "One box, one agent. This week.",
      html: (ctx) =>
        emailShell(
          [
            '<p style="margin:0 0 16px;">The plan said by today one agent runs your start box.</p>',
            '<p style="margin:0 0 16px;">An agent that does 70 percent of the grind is a week-one win. Ship it, then move to the next box on the chart.</p>',
            '<p style="margin:0 0 16px;">Open your first 90 days and finish the first stage.</p>',
          ].join("\n"),
          ctx,
          "Open the plan",
        ),
    },
  },

  reading: undefined,
};
