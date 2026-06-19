/**
 * Vibe Coding Field Kit preset.
 *
 * Everything class-specific for the Vibe Coding Lightning Lesson follow-up.
 *
 * The kit is about a SOLUTION. Its job is to make any AI tool work the person's
 * way on one real build. The intake is a short forked pick-cascade plus one
 * free-text field: fork self/business, name + role, PREFERENCES (how they like
 * the AI to work with them), PAST PAINS (turned into guardrails), the ONE BUILD
 * they want to ship (the single free text), tool, then level. A live picks
 * preview (previewKind 'picks') assembles the knowledge bank as they answer.
 *
 * The take-home pack: the working-style contract (how the kit works with you),
 * the build brief (the spec), the first skill (the ZIP), the acceptance pack,
 * the seven-day plan and the personal map. Every compose prompt reads the
 * STRUCTURED answers (their preferences, their pains-as-guardrails, their build
 * description), and stays honesty-gated by a deterministic fallback.
 *
 * Platform-agnostic content, tool-specific instructions (spec 2.3): every
 * artifact's content works on any AI platform; only install or paste lines name
 * the person's chosen tool, and fall back to "your AI" when they pick none.
 *
 * Plain TypeScript only; bundled into both the Deno edge runtime and the Vite
 * client. No Deno or Node globals.
 */

import type {
  ArtifactBuildContext,
  IntakeAnswers,
  KitEmailContext,
  KitPreset,
  KitTool,
} from "../types.ts";
import { KIT_TOOL_LABELS } from "../types.ts";
import {
  EXPERIENCE_LABELS,
  buildFromIntake,
  experienceFromIntake,
  guardrailsFromIntake,
  nameFromIntake,
  painLabelsFromIntake,
  preferenceLabelsFromIntake,
  roleFromIntake,
  shortBuildName,
  stageFromExperience,
} from "./scoring.ts";
import {
  PAIN_OPTIONS,
  PREFERENCE_OPTIONS,
  VOICE_RULES,
  acceptancePackFallback,
  buildBriefTemplate,
  howYouWorkFallback,
} from "./templates.ts";
import { MERIDIAN_WORKED_EXAMPLE } from "./examples.ts";
import { contextPullPrompt } from "./prompts.ts";

/* ------------------------------------------------------------------ */
/* Shared derivations                                                   */
/* ------------------------------------------------------------------ */

interface Derived {
  name: string;
  role: string;
  /** How they like the AI to work with them, as short behaviour labels. */
  prefLabels: string[];
  /** Their past pains, as their human labels. */
  painLabels: string[];
  /** Their pains turned into the guardrails the kit installs. */
  guardLines: string[];
  /** The one thing they want to build, in their own words. */
  build: string;
  /** A short, human name for the build. */
  buildName: string;
  toolLabel: string;
  experience: ReturnType<typeof experienceFromIntake>;
}

function derive(ctx: ArtifactBuildContext): Derived {
  const build = buildFromIntake(ctx.intake);
  return {
    name: nameFromIntake(ctx.intake),
    role: roleFromIntake(ctx.intake),
    prefLabels: preferenceLabelsFromIntake(ctx.intake),
    painLabels: painLabelsFromIntake(ctx.intake),
    guardLines: guardrailsFromIntake(ctx.intake),
    build,
    buildName: shortBuildName(build),
    toolLabel: KIT_TOOL_LABELS[ctx.tool],
    experience: experienceFromIntake(ctx.intake),
  };
}

function profileBlock(ctx: ArtifactBuildContext): string {
  const d = derive(ctx);
  return [
    `Who they are: ${d.name ? `${d.name}, ` : ""}${d.role}`,
    `How they like the AI to work with them: ${d.prefLabels.length > 0 ? d.prefLabels.join("; ") : "not specified"}`,
    `What has burned them before: ${d.painLabels.length > 0 ? d.painLabels.join("; ") : "not specified"}`,
    `Guardrails the kit installs (from those pains): ${d.guardLines.length > 0 ? d.guardLines.join("; ") : "the standard ask-first guardrail"}`,
    `The one thing they want to build: ${d.build || "not specified"}`,
    `Tool they will build in: ${d.toolLabel}`,
    `Experience: ${EXPERIENCE_LABELS[d.experience]}`,
  ].join("\n");
}

function contextBlock(ctx: ArtifactBuildContext): string {
  let out = "";
  if (ctx.memoryContext) {
    out += `\n\nWhat CTRL already knows about this student:\n${ctx.memoryContext}`;
  }
  if (ctx.feedback) {
    out += `\n\nThe student asked for this change on regeneration; honour it:\n${ctx.feedback}`;
  }
  return out;
}

const PROMPT_PREAMBLE =
  "You are writing one artifact of the Vibe Coding Field Kit for someone who just finished the Vibe Coding Lightning Lesson. They are not a developer; they may be a student or an operator building their very first small tool. Be encouraging and plain. The kit's job is to make any AI work the way THEY work on the one build they named. Never assume they have Cursor, Lovable or any developer setup; the tool is whatever they already have open. The content must work on any AI platform; only name their tool in install or paste instructions.";

/* ------------------------------------------------------------------ */
/* Intake: the forked cascade, re-centered on the solution              */
/* ------------------------------------------------------------------ */

const intake: KitPreset["intake"] = [
  // 1. THE FORK - self vs business. Pathway only.
  {
    id: "pathway",
    type: "chips",
    pathwayFork: true,
    eyebrow: "First",
    prompt: "Who are you building for?",
    helper: "It changes the examples we use. Nothing else.",
    options: [
      { id: "self", label: "Just me", pathway: "self" },
      { id: "biz", label: "My work or business", pathway: "biz" },
    ],
    factMappings: [
      { fact_key: "kit_vibe_pathway", fact_category: "identity", fact_label: "Vibe coding pathway" },
    ],
  },

  // 2. PROFILE - name field + who they are (role chips per pathway).
  {
    id: "profile",
    type: "chips",
    eyebrow: "A little about you",
    prompt: "What should we call you?",
    helper: "This is the first thing your AI will know about you.",
    showIf: { answeredQuestionId: "pathway" },
    nameField: { label: "Your name", placeholder: "First name is fine" },
    pathwayCopy: {
      self: { prompt: "What should we call you?", helper: "This is the first thing your AI will know about you." },
      biz: { prompt: "What should we call you?", helper: "This is the first thing your AI will know about you." },
    },
    pathwayOptions: {
      self: [
        { id: "student", label: "Student or early-career" },
        { id: "side-builder", label: "Building on the side" },
        { id: "solo-operator", label: "Solo operator" },
        { id: "freelancer", label: "Freelancer" },
        { id: "career-switcher", label: "Switching into a new field" },
        { id: "curious", label: "Just curious" },
      ],
      biz: [
        { id: "founder", label: "Founder" },
        { id: "run-a-team", label: "Run a team" },
        { id: "solo-operator", label: "Solo operator" },
        { id: "consultant", label: "Consultant" },
        { id: "side-builder", label: "Building on the side" },
        { id: "student", label: "Student or early-career" },
      ],
    },
    options: [
      { id: "student", label: "Student or early-career" },
      { id: "side-builder", label: "Building on the side" },
      { id: "solo-operator", label: "Solo operator" },
      { id: "freelancer", label: "Freelancer" },
      { id: "founder", label: "Founder" },
      { id: "consultant", label: "Consultant" },
    ],
    factMappings: [
      { fact_key: "role", fact_category: "identity", fact_label: "Role" },
    ],
  },

  // 3. PREFERENCES (NEW, multi) - how they like the AI to work with them.
  {
    id: "preferences",
    type: "chips_multi",
    eyebrow: "How you like to work",
    prompt: "How should it treat you by default?",
    helper: "There is no right answer. Pick whatever sounds like you.",
    showIf: { answeredQuestionId: "profile" },
    options: PREFERENCE_OPTIONS,
    factMappings: [
      {
        fact_key: "ai_working_preferences",
        fact_category: "preference",
        fact_label: "How they like AI to work with them",
      },
    ],
  },

  // 4. PAINS (NEW, multi) - what has gone wrong before, turned into guardrails.
  {
    id: "pains",
    type: "chips_multi",
    eyebrow: "What has burned you",
    prompt: "What's gone wrong before?",
    helper: "Be honest. We turn each of these into a guardrail so it does not happen again.",
    showIf: { answeredQuestionId: "preferences" },
    options: PAIN_OPTIONS,
    factMappings: [
      {
        fact_key: "past_ai_pains",
        fact_category: "preference",
        fact_label: "Past pains with AI",
      },
    ],
  },

  // 5. BUILD (NEW, the one free text) - the one thing they want to build.
  {
    id: "build",
    type: "voice_text",
    eyebrow: "The one build",
    prompt: "What's the one thing you want to build?",
    helper: "One real thing you would actually use. We will brief it so any AI can build it with you.",
    showIf: { answeredQuestionId: "pains" },
    examples: [
      "A tool that turns my messy notes into a weekly plan",
      "Something that drafts my follow-up messages",
      "A helper that pulls my research into one brief",
    ],
    factMappings: [
      { fact_key: "vibe_one_build", fact_category: "objective", fact_label: "The one build" },
    ],
  },

  // 6. TOOL - platform-agnostic; tailors install wording only.
  {
    id: "tool",
    type: "chips",
    eyebrow: "Your tool",
    prompt: "Which AI are you building with?",
    helper: "We tailor the install steps. The kit itself works with any of them.",
    showIf: { answeredQuestionId: "build" },
    options: [
      { id: "chatgpt", label: "ChatGPT", tool: "chatgpt" },
      { id: "claude", label: "Claude", tool: "claude" },
      { id: "gemini", label: "Gemini", tool: "gemini" },
      { id: "cursor", label: "Cursor", tool: "cursor" },
      { id: "lovable", label: "Lovable", tool: "lovable" },
      { id: "none", label: "Not sure yet", tool: "none" },
    ],
    factMappings: [
      { fact_key: "primary_ai_tool", fact_category: "preference", fact_label: "Primary AI tool" },
    ],
  },

  // 7. LEVEL - where they are at (the old experience question; id kept).
  {
    id: "level",
    type: "chips",
    eyebrow: "Where you're at",
    prompt: "Where are you at?",
    helper: "Totally fine wherever. This just sets the pace.",
    showIf: { answeredQuestionId: "tool" },
    options: [
      { id: "never", label: "Never built with AI" },
      { id: "few-prompts", label: "A few prompts in" },
      { id: "shipped", label: "Shipped something" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Artifacts                                                            */
/* ------------------------------------------------------------------ */

const artifacts: KitPreset["artifacts"] = [
  /* ----- Spot + Spec ----- */
  {
    id: "how-you-work",
    title: "How your kit works with you",
    order: 1,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Spot + Spec",
    description: "Read it once, then paste it alongside your build so any AI works your way.",
    buildPrompt: (ctx) => {
      const d = derive(ctx);
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

Write their working-style contract as a single markdown card titled "# How I like to work". It tells any AI how to work with this person and is the differentiator of the whole kit. It must:
1. Open with one warm line in their second person ("you") that says this file makes any AI work their way.
2. A "## Default behaviour" section: turn each of their preferences (${d.prefLabels.join("; ") || "small, checkable steps"}) into one plain instruction line the AI can follow. Do not invent preferences they did not pick.
3. A "## Guardrails (from what has burned me before)" section: one line per guardrail (${d.guardLines.join("; ") || "ask before touching anything I did not point you at"}). Frame each as a calm rule, not a warning.
4. A "## You have done this correctly when" section: 3 short self-check lines an AI can run on itself, drawn from the behaviour and guardrails above.

It is a card, not a worksheet: under 250 words, no questions back to the student, no tables, headings no deeper than ##. End with one line telling them to paste it alongside their build brief, or save it where ${d.toolLabel} keeps its instructions.

${VOICE_RULES}${contextBlock(ctx)}

Return only the markdown.`;
    },
    render: (ctx) => {
      const d = derive(ctx);
      return howYouWorkFallback({
        prefLabels: d.prefLabels,
        guardLines: d.guardLines,
        toolLabel: d.toolLabel,
      });
    },
  },

  /* ----- Brief + Build ----- */
  {
    id: "build-brief",
    title: "Your build brief",
    order: 2,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Brief + Build",
    description: "Fill the [FILL IN] gaps, then paste the whole brief into your first build session.",
    buildPrompt: (ctx) => {
      const d = derive(ctx);
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

Write their build brief in markdown using exactly this skeleton, headings verbatim:

# Build brief: ${d.buildName}

## 1. Goal
## 2. Context
## 3. Format
## 4. Constraints
## 5. Acceptance

Rules for filling it:
- The build they described, in their words, is: "${d.build || "(they did not describe it)"}". Brief THIS build; do not invent a different one.
- Pre-fill every line you can defend from the profile and context. Do not invent systems, names or numbers they have not given you.
- Where only the student can know the answer, write a gap as [FILL IN: what goes here] followed by one line starting "Guidance:" that teaches what good looks like for that slot.
- Goal is one sentence: who feels the difference, what changes, by when.
- Context names where the information lives today and the manual steps as they happen. Weave in how they like to work: ${d.prefLabels.join("; ") || "small, checkable steps"}.
- Format describes what the output literally looks like: sections, order, what goes where.
- Constraints include the tool (${d.toolLabel}), read-only against sources unless they said otherwise, the guardrails from their past pains (${d.guardLines.join("; ") || "ask before touching anything they did not point you at"}), and what it must never touch, send or change.
- Acceptance is three checks anyone could run. If a check cannot fail, it is not a check.
- The whole brief fits on one page. Open with one line telling them to fill the gaps, then paste it as the first message of their build session. Reassure them a normal AI chat is enough; no developer tool required.

After the brief, append this divider and worked example exactly as given, character for character, changing nothing:

---

## Worked example

${MERIDIAN_WORKED_EXAMPLE}

${VOICE_RULES}${contextBlock(ctx)}

Return only the markdown.`;
    },
    render: (ctx) => {
      const d = derive(ctx);
      const brief = buildBriefTemplate({
        buildName: d.buildName,
        build: d.build,
        role: d.role,
        name: d.name,
        prefLabels: d.prefLabels,
        guardLines: d.guardLines,
        toolLabel: d.toolLabel,
      });
      return `${brief}\n\n---\n\n## Worked example\n\n${MERIDIAN_WORKED_EXAMPLE}`;
    },
  },
  {
    id: "first-skill",
    title: "Your first skill",
    order: 3,
    contentType: "zip",
    strategy: "skill_pipeline",
    part: "Brief + Build",
    description: "Download, install in your tool, run test prompt 1 tonight.",
    buildSeed: (ctx) => {
      const d = derive(ctx);
      const build = d.build || "one real thing I would actually use";
      const prefLine =
        d.prefLabels.length > 0
          ? `Here is how I like you to work with me: ${d.prefLabels.map((s) => s.toLowerCase()).join("; ")}.`
          : "Work with me in small, checkable steps and keep me in the loop.";
      const guardLine =
        d.guardLines.length > 0
          ? `Things have gone wrong before, so these guardrails are not optional: ${d.guardLines.map((s) => s.toLowerCase()).join("; ")}.`
          : "Ask before touching anything I did not point you at.";
      const transcript = `I am ${d.name ? `${d.name}, ` : ""}a ${d.role.toLowerCase()}.

The one thing I want to build: ${build.toLowerCase()}.

${prefLine}

${guardLine}

I will build it in ${d.toolLabel}.

My experience with AI builds: ${EXPERIENCE_LABELS[d.experience]}. Pitch the skill's instructions at that level, and assume I have no developer tools, just a normal AI chat.

Requirements for the generated skill (must follow exactly):
- The skill body MUST include a section titled "Learning loop" that instructs the agent to do two things without being asked:
  1. On every run, append one dated log line to BUILD_LOG.md: what ran, what felt off, one rule to add.
  2. At the start of every session, read LESSONS.md and treat its rules as binding instructions.
- The skill MUST honour the working preferences and guardrails above as standing instructions.
- Keep the skill scoped to the single build above. Do not generalise it into a do-everything assistant.`;
      return { transcript, nameHint: d.buildName };
    },
  },

  /* ----- Verify + Govern ----- */
  {
    id: "acceptance-pack",
    title: "Acceptance pack",
    order: 4,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Verify + Govern",
    description: "Run the checklist before you call it shipped; paste the verifier after any \"done\".",
    buildPrompt: (ctx) => {
      const d = derive(ctx);
      const draft = acceptancePackFallback({ buildName: d.buildName, build: d.build });
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

Below is the deterministic draft of their acceptance pack: a runnable shipped checklist plus the false green verifier, a prompt that makes their AI prove outputs against real results (the text it wrote, the file it made, the thing it produced), never its own claims. Improve it:
- Rewrite the checklist so each item is specific to their build ("${d.build || "their build"}"): the real place the output lands, the real thing to check against. Keep it to 5 to 7 checkboxes, each one able to fail.
- Keep the false green verifier's four-step structure intact, but make step 3's re-run instruction specific to their build.
- Keep both section headings exactly as they are. Keep the verifier inside its fenced text block.

${draft}

${VOICE_RULES}${contextBlock(ctx)}

Return only the markdown.`;
    },
    render: (ctx) => {
      const d = derive(ctx);
      return acceptancePackFallback({ buildName: d.buildName, build: d.build });
    },
  },
  {
    id: "seven-day-plan",
    title: "Seven-day plan",
    order: 5,
    contentType: "json",
    strategy: "llm_plan",
    part: "Verify + Govern",
    description: "Thirty minutes a day for seven days; day 1 is tonight.",
    buildPrompt: (ctx) => {
      const d = derive(ctx);
      const skill = ctx.firstSkillName || "their first skill";
      return `You are writing the 7-day plan for a Vibe Coding Field Kit student. They are not a developer; keep it gentle and assume only a normal AI chat.

Student:
${profileBlock(ctx)}
First skill name: ${skill}

Return ONLY valid JSON, no markdown fences, in exactly this shape:
{"days":[{"day":1,"title":"...","action":"...","minutes":20},{"day":2,...},...,{"day":7,...}]}

Rules:
- Exactly 7 entries, day 1 through day 7.
- "minutes" is an integer, 30 or less, honest for the action described.
- Day 1 is always: install ${skill} in ${d.toolLabel} and run test prompt 1.
- Day 7 is always: ship it scrappy. A working version of "${d.build || "their build"}" they use once counts.
- Days 2 to 6 walk from brief to build to verify, calibrated to their experience (${EXPERIENCE_LABELS[d.experience]}). Never built means smaller steps and more checking; shipped before means compress the early days and spend more on verify.
- "title" is 6 words or fewer. "action" is one or two sentences, imperative, and names the exact kit artifact to use that day (build brief, acceptance pack, how I like to work).
- Plain language, sentence case, no buzzwords, no em dashes.`;
    },
    render: (ctx) => {
      const d = derive(ctx);
      const skill = ctx.firstSkillName || "your first skill";
      const build = d.build || "your build";
      const days = [
        { day: 1, title: "Install and run", action: `Install ${skill} in ${d.toolLabel} and run test prompt 1.`, minutes: 15 },
        { day: 2, title: "Set how it works", action: "Paste your how I like to work file so any AI works your way. Keep it open.", minutes: 15 },
        { day: 3, title: "Write the brief", action: "Fill every [FILL IN] gap in your build brief.", minutes: 25 },
        { day: 4, title: "Sharpen the brief", action: "Read the brief back as a stranger. Tighten the goal and the acceptance checks until each one could fail.", minutes: 20 },
        { day: 5, title: "Build version one", action: "Open a fresh session, paste your brief, and build the happy path only. Nothing extra.", minutes: 30 },
        { day: 6, title: "Verify it honestly", action: "Run the acceptance pack checklist, then paste the false green verifier after your tool says done.", minutes: 25 },
        { day: 7, title: "Ship it scrappy", action: `Put ${build} in front of its first user: you. Used once counts. Then log it in CTRL.`, minutes: 30 },
      ];
      return JSON.stringify({ days }, null, 2);
    },
  },
  {
    id: "personal-map",
    title: "Your personal map",
    order: 6,
    contentType: "json",
    strategy: "deterministic",
    part: "Verify + Govern",
    description: "Where you are, what you are building, and the seven-day path.",
    render: (ctx) => {
      const d = derive(ctx);
      return JSON.stringify(
        {
          stage: stageFromExperience(d.experience),
          firstBuild: d.buildName,
          tool: d.toolLabel,
          worksWithYou: d.prefLabels,
          guardrails: d.guardLines,
          path: "Day 1 install your skill and run it; days 2 to 6 set how it works, write the brief, build and verify; day 7 ship it scrappy.",
        },
        null,
        2,
      );
    },
  },
];

/* ------------------------------------------------------------------ */
/* Emails                                                               */
/* ------------------------------------------------------------------ */

function emailShell(opts: {
  heading: string;
  bodyHtml: string;
  buttonLabel: string;
  kitUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f5f5f4;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;font-size:16px;line-height:1.6;">
<p style="font-weight:600;font-size:18px;margin:0 0 16px 0;">${opts.heading}</p>
${opts.bodyHtml}
<p style="margin:28px 0;"><a href="${opts.kitUrl}" style="background-color:#1c1917;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;display:inline-block;">${opts.buttonLabel}</a></p>
<p style="margin:24px 0 0 0;">Krish</p>
</div>
</body>
</html>`;
}

const emails: KitPreset["emails"] = {
  pack: {
    subject: () => "Your Vibe Coding Field Kit",
    html: (ctx: KitEmailContext) =>
      emailShell({
        heading: "Your Vibe Coding Field Kit",
        kitUrl: ctx.kitUrl,
        buttonLabel: "Open your kit",
        bodyHtml: `<p style="margin:0 0 16px 0;">Your kit lives at the button below. Inside: your build briefed so any AI can ship it with you, set up to work the way you work, and a seven-day path to get it shipped.</p>
<p style="margin:0 0 16px 0;">Do day 1 tonight: install your skill and run test prompt 1. Ten minutes, and the kit stops being a bookmark. A normal AI chat is all you need.</p>`,
      }),
  },
  day3: {
    subject: () => "Day 3. Did your skill run yet?",
    html: (ctx: KitEmailContext) => {
      const skillName = ctx.skillName || "your first skill";
      const toolLabel = ctx.toolLabel || "your AI";
      const testPrompt =
        ctx.testPrompt || "test prompt 1 from the test prompts file in your skill ZIP";
      return emailShell({
        heading: "Day 3. Did your skill run yet?",
        kitUrl: ctx.kitUrl,
        buttonLabel: "Open the 7-day plan",
        bodyHtml: `<p style="margin:0 0 16px 0;">You named the one thing you want to build. If your skill has not run yet, it is a file, not a tool.</p>
<p style="margin:0 0 16px 0;">Two minutes, right now: open ${toolLabel}, load ${skillName}, and run this:</p>
<p style="margin:0 0 16px 0;padding:12px 16px;background-color:#e7e5e4;border-radius:6px;font-family:Consolas,Menlo,monospace;font-size:14px;">${testPrompt}</p>
<p style="margin:0 0 16px 0;">If it breaks, reply and tell me what happened. I read every reply.</p>`,
      });
    },
  },
  day7: {
    subject: () => "Ship it scrappy. Today.",
    html: (ctx: KitEmailContext) =>
      emailShell({
        heading: "Ship it scrappy. Today.",
        kitUrl: ctx.kitUrl,
        buttonLabel: "Finish day 7 and log it",
        bodyHtml: `<p style="margin:0 0 16px 0;">Seven days since class. Scrappy counts: ugly, half manual, used once by one person is still shipped.</p>
<p style="margin:0 0 16px 0;">Do the last unchecked step on your plan, then hit I Shipped It so I know.</p>
<p style="margin:0 0 16px 0;">Blocked? Reply with one line on where it stuck and I will point you at the unblock.</p>`,
      }),
  },
};

/* ------------------------------------------------------------------ */
/* Preset                                                               */
/* ------------------------------------------------------------------ */

export const vibeCodingPreset: KitPreset = {
  slug: "vibe-coding",
  version: "3.0.0",
  title: "Vibe Coding Field Kit",
  classTitle: "Vibe Coding Lightning Lesson",
  tagline: "Make any AI work your way on one real build.",
  mavenUrl: "https://maven.com/mindmaker",
  codePrefixes: ["VIBE"],
  passDays: 30,
  skillQuota: 3,
  previewKind: "picks",
  intake,
  artifacts,
  contextPullPrompt: (tool: KitTool, ctx?: Partial<ArtifactBuildContext>): string => {
    const build = ctx?.intake ? buildFromIntake(ctx.intake as IntakeAnswers) : "";
    return contextPullPrompt(tool, build || undefined);
  },
  emails,
};
