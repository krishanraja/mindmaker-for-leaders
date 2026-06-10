/**
 * Vibe Coding Field Kit preset.
 *
 * Everything class-specific for the Vibe Coding Lightning Lesson follow-up:
 * intake, the 15-artifact manifest across Spot + Spec / Brief + Build /
 * Verify + Govern, deterministic scoring, per-tool prompts and the three
 * nudge emails. Plain TypeScript only; bundled into both the Deno edge
 * runtime and the Vite client.
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
  STAKES_TIER_LABELS,
  STAKES_TIER_RULES,
  experienceFromIntake,
  grindFromIntake,
  offeringFromIntake,
  roleFromIntake,
  scoreVibeCoding,
  shortBuildName,
  stageFromExperience,
  stakesTierFromIntake,
  stakesTouchesFromIntake,
  winFromIntake,
} from "./scoring.ts";
import type { VibeScore } from "./scoring.ts";
import {
  EXPERIENCE_GUARDRAILS,
  TIER_GUARDRAILS,
  VOICE_RULES,
  acceptancePackFallback,
  buildLogTemplate,
  buildabilityCard,
  briefUpgraderTemplate,
  constitutionTemplate,
  fivePartBriefTemplate,
  lessonsTemplate,
  leverageAuditFallback,
  sessionScripts,
  stakesDialCard,
  startingPath,
  toolRegistryTemplate,
} from "./templates.ts";
import { MERIDIAN_WORKED_EXAMPLE } from "./examples.ts";
import { contextCapsulePrompt, specInterviewerPrompt } from "./prompts.ts";

/* ------------------------------------------------------------------ */
/* Shared derivations                                                   */
/* ------------------------------------------------------------------ */

function resolveScore(ctx: ArtifactBuildContext): VibeScore {
  const s = ctx.scores as VibeScore | undefined;
  if (s && s.frequency && s.judgment && s.quadrant && s.recommendation) return s;
  return scoreVibeCoding(ctx.intake);
}

interface Derived {
  role: string;
  offering: string;
  grind: string;
  buildName: string;
  toolLabel: string;
  win: string;
  tier: ReturnType<typeof stakesTierFromIntake>;
  tierLabel: string;
  tierRule: string;
  experience: ReturnType<typeof experienceFromIntake>;
}

function derive(ctx: ArtifactBuildContext): Derived {
  const tier = stakesTierFromIntake(ctx.intake);
  const grind = grindFromIntake(ctx.intake);
  return {
    role: roleFromIntake(ctx.intake),
    offering: offeringFromIntake(ctx.intake),
    grind,
    buildName: shortBuildName(grind),
    toolLabel: KIT_TOOL_LABELS[ctx.tool],
    win: winFromIntake(ctx.intake),
    tier,
    tierLabel: STAKES_TIER_LABELS[tier],
    tierRule: STAKES_TIER_RULES[tier],
    experience: experienceFromIntake(ctx.intake),
  };
}

function profileBlock(ctx: ArtifactBuildContext): string {
  const d = derive(ctx);
  return [
    `Role: ${d.role}${d.offering ? ` (the business sells: ${d.offering})` : ""}`,
    `Workflow they named: ${d.grind || "not given; they skipped the question"}`,
    `Tool they build in: ${d.toolLabel}`,
    `Shipped means: ${d.win}`,
    `Stakes tier: ${d.tierLabel} (${d.tierRule})`,
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
  "You are writing one artifact of the Vibe Coding Field Kit for a student who just finished the Vibe Coding Lightning Lesson. They are not a developer; they are an operator building their first small tool.";

/* ------------------------------------------------------------------ */
/* Intake                                                               */
/* ------------------------------------------------------------------ */

const intake: KitPreset["intake"] = [
  {
    id: "role",
    type: "chips",
    prompt: "What do you do?",
    options: [
      { id: "founder", label: "Founder" },
      { id: "run-a-team", label: "Run a team" },
      { id: "solo-operator", label: "Solo operator" },
      { id: "consultant", label: "Consultant" },
      { id: "side-builder", label: "Building on the side" },
    ],
    optionalText: {
      prompt: "What does your company sell or make?",
      placeholder: "e.g. advertising across three sites and a podcast network",
    },
    factMappings: [
      { fact_key: "role", fact_category: "identity", fact_label: "Role" },
      {
        fact_key: "company_offering",
        fact_category: "business",
        fact_label: "What the company sells or makes",
      },
    ],
  },
  {
    id: "grind",
    type: "voice_text",
    prompt:
      "Describe one thing you do over and over that a tool should be doing for you. Talk through the steps.",
    helper: "Say it like you would to a colleague: the steps, the tools, how often. Messy is fine.",
    examples: [
      "Every Monday I pull numbers from three dashboards into one update for my team.",
      "After every client call I retype my notes into the CRM and write the follow-up email.",
      "Each week I chase the same people for status updates and paste them into a report.",
    ],
  },
  {
    id: "tool",
    type: "chips",
    prompt: "Where will you build?",
    options: [
      { id: "claude", label: "Claude", tool: "claude" },
      { id: "chatgpt", label: "ChatGPT", tool: "chatgpt" },
      { id: "cursor", label: "Cursor", tool: "cursor" },
      { id: "lovable", label: "Lovable", tool: "lovable" },
      { id: "none", label: "Not sure yet", tool: "none" },
    ],
    factMappings: [
      {
        fact_key: "primary_ai_tool",
        fact_category: "preference",
        fact_label: "Primary AI tool",
      },
    ],
  },
  {
    id: "win",
    type: "chips",
    prompt: "What counts as shipped, one week from now?",
    options: [
      { id: "use-myself", label: "A working tool I use myself" },
      { id: "someone-touched", label: "Something a teammate or customer touched" },
      { id: "demo", label: "A demo I can show" },
      { id: "you-pick", label: "You pick for me" },
    ],
    factMappings: [
      {
        fact_key: "first_ship_definition",
        fact_category: "objective",
        fact_label: "First ship definition",
      },
    ],
  },
  {
    id: "stakes",
    type: "chips",
    prompt: "Who will use it, and what does it touch?",
    options: [
      { id: "just-me", label: "Just me, nothing sensitive" },
      { id: "team-internal", label: "My team, internal data" },
      { id: "customers", label: "Customers or customer data" },
    ],
  },
  {
    id: "experience",
    type: "chips",
    prompt: "Built anything with AI before?",
    options: [
      { id: "never", label: "Never" },
      { id: "few-prompts", label: "A few prompts" },
      { id: "shipped", label: "Shipped something" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Artifacts                                                            */
/* ------------------------------------------------------------------ */

const artifacts: KitPreset["artifacts"] = [
  /* ----- Part 1: Spot + Spec ----- */
  {
    id: "leverage-audit",
    title: "Leverage audit",
    order: 1,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Spot + Spec",
    description: "Read it once, accept or swap the recommended first build, then start there.",
    buildPrompt: (ctx) => {
      const score = resolveScore(ctx);
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

Deterministic scoring already placed their named workflow on the frequency x judgment 2x2: frequency ${score.frequency}, judgment ${score.judgment}, quadrant "${score.quadrant}".

Write their leverage audit as a single markdown card titled "# Your leverage audit". It must:
1. Show their named workflow and one line on where it sits on the 2x2 and why. Use the scoring above; do not contradict it.
2. Infer 3 to 5 more automation candidates from their role and the context below. One line each, with the candidate's 2x2 position in brackets.
3. Rank everything, best first build at the top: high frequency, low judgment, smallest scope wins.
4. Recommend exactly ONE first build. Scope it down until it feels almost too small: one input, one output, one run. Say what version one does and what it deliberately does not.

It is a card, not a worksheet: under 250 words, no questions back to the student, no tables, headings no deeper than ##.

${VOICE_RULES}${contextBlock(ctx)}

Return only the markdown.`;
    },
    render: (ctx) => leverageAuditFallback(resolveScore(ctx), grindFromIntake(ctx.intake)),
  },
  {
    id: "spec-interviewer",
    title: "Spec interviewer",
    order: 2,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Spot + Spec",
    description: "Paste it into your tool, answer one question at a time, keep the spec it writes.",
    render: (ctx) => {
      const d = derive(ctx);
      const prompt = specInterviewerPrompt(ctx.tool, {
        role: d.role,
        grind: d.grind,
        win: d.win,
      });
      const onRamp =
        ctx.tool === "none"
          ? "\n\nNo tool yet? This doubles as your first ever session. Open claude.ai or chatgpt.com in a browser, sign up free, start a new chat, and paste the block below as your first message.\n"
          : "";
      return `# Spec interviewer

Your AI interviews you; you talk; it writes the spec. Copy the block, paste it into ${d.toolLabel}, and answer one question at a time.${onRamp}

\`\`\`text
${prompt}
\`\`\`

Keep the spec it writes. The five-part brief, the acceptance pack and your first skill all build on it.`;
    },
  },
  {
    id: "buildability-card",
    title: "Buildability card",
    order: 3,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Spot + Spec",
    description: "Open the tool it names and start on the path it gives you. One screen, no setup.",
    render: (ctx) => {
      const d = derive(ctx);
      return buildabilityCard({
        buildName: d.buildName,
        toolLabel: d.toolLabel,
        startPath: startingPath(ctx.tool),
        tierLabel: d.tierLabel,
        tierGuardrail: TIER_GUARDRAILS[d.tier],
        experienceGuardrail: EXPERIENCE_GUARDRAILS[d.experience],
      });
    },
  },

  /* ----- Part 2: Brief + Build ----- */
  {
    id: "five-part-brief",
    title: "Five-part brief",
    order: 4,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Brief + Build",
    description: "Fill the [FILL IN] gaps, then paste the whole brief into your first build session.",
    buildPrompt: (ctx) => {
      const d = derive(ctx);
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

Write their five-part build brief in markdown using exactly this skeleton, headings verbatim:

# Build brief: ${d.buildName}

## 1. Goal
## 2. Context
## 3. Format
## 4. Constraints
## 5. Acceptance

Rules for filling it:
- Pre-fill every line you can defend from the profile and context. Do not invent systems, names or numbers they have not given you.
- Where only the student can know the answer, write a gap as [FILL IN: what goes here] followed by one line starting "Guidance:" that teaches what good looks like for that slot.
- Goal is one sentence: who feels the difference, what changes, by when.
- Context names where the data lives today and the manual steps as they happen.
- Format describes what the output literally looks like: sections, columns, sort order.
- Constraints include the tool (${d.toolLabel}), the stakes tier rule (${d.tierLabel}: ${d.tierRule}), read-only against sources unless they said otherwise, and what it must never touch, send or spend.
- Acceptance is three checks a stranger could run; tie one to their definition of shipped (${d.win}). If a check cannot fail, it is not a check.
- The whole brief fits on one page. Open with one line telling them to fill the gaps, run it through the brief upgrader, then paste it as the first message of their build session.

After the brief, append this divider and worked example exactly as given, character for character, changing nothing:

---

## Worked example

${MERIDIAN_WORKED_EXAMPLE}

${VOICE_RULES}${contextBlock(ctx)}

Return only the markdown.`;
    },
    render: (ctx) => {
      const d = derive(ctx);
      const brief = fivePartBriefTemplate({
        buildName: d.buildName,
        grind: d.grind,
        role: d.role,
        offering: d.offering,
        toolLabel: d.toolLabel,
        tierLabel: d.tierLabel,
        tierRule: d.tierRule,
        win: d.win,
      });
      return `${brief}\n\n---\n\n## Worked example\n\n${MERIDIAN_WORKED_EXAMPLE}`;
    },
  },
  {
    id: "brief-upgrader",
    title: "Brief upgrader",
    order: 5,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Brief + Build",
    description: "Paste it with your draft brief underneath; ship the tightened version it returns.",
    render: () => briefUpgraderTemplate(),
  },
  {
    id: "first-skill",
    title: "Your first skill",
    order: 6,
    contentType: "zip",
    strategy: "skill_pipeline",
    part: "Brief + Build",
    description: "Download, install in your tool, run test prompt 1 tonight.",
    buildSeed: (ctx) => {
      const d = derive(ctx);
      const grind = d.grind || "a recurring manual workflow I described in class";
      const transcript = `I am a ${d.role.toLowerCase()}.${d.offering ? ` The business sells ${d.offering}.` : ""}

Here is the thing I do over and over that a tool should be doing for me, in my own words: ${grind}

One week from now, shipped means ${d.win}. The build runs in ${d.toolLabel}.

Who it touches: stakes tier ${d.tierLabel}. ${d.tierRule}

My experience with AI builds: ${EXPERIENCE_LABELS[d.experience]}. Pitch the skill's instructions at that level.

Requirements for the generated skill (must follow exactly):
- The skill body MUST include a section titled "Learning loop" that instructs the agent to do two things without being asked:
  1. On every run, append one dated log line to BUILD_LOG.md: what ran, what felt off, one rule to add.
  2. At the start of every session, read LESSONS.md and treat its rules as binding instructions.
- Keep the skill scoped to the single workflow above. Do not generalise it into a do-everything assistant.`;
      return { transcript, nameHint: d.buildName };
    },
  },
  {
    id: "project-constitution",
    title: "Project constitution",
    order: 7,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Brief + Build",
    description: "Fill the gaps once; paste it at the top of every fresh session.",
    buildPrompt: (ctx) => {
      const d = derive(ctx);
      const draft = constitutionTemplate({
        buildName: d.buildName,
        toolLabel: d.toolLabel,
        tierLabel: d.tierLabel,
        tierRule: d.tierRule,
        role: d.role,
        offering: d.offering,
        grind: d.grind,
      });
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

Below is the deterministic draft of their project constitution: the rules file they paste at the top of every fresh session. Improve it:
- Fill any [FILL IN] gap you can defend from the profile and context. Leave [FILL IN: ...] markers wherever only the student can know the answer.
- Sharpen the prose. Keep every heading and the overall shape. Do not add new sections.
- Keep it to one page.

${draft}

${VOICE_RULES}${contextBlock(ctx)}

Return only the markdown.`;
    },
    render: (ctx) => {
      const d = derive(ctx);
      return constitutionTemplate({
        buildName: d.buildName,
        toolLabel: d.toolLabel,
        tierLabel: d.tierLabel,
        tierRule: d.tierRule,
        role: d.role,
        offering: d.offering,
        grind: d.grind,
      });
    },
  },
  {
    id: "session-scripts",
    title: "Session scripts",
    order: 8,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Brief + Build",
    description: "Copy the opener that matches the moment: plan, fresh session, debug, wrap up.",
    render: (ctx) => sessionScripts(ctx.tool),
  },
  {
    id: "context-capsule",
    title: "Context capsule",
    order: 9,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Brief + Build",
    description: "Paste it into your tool, answer up to ten questions, paste the capsule back into CTRL.",
    render: (ctx) => {
      const d = derive(ctx);
      return `# Context capsule

Ten minutes that makes every other artifact sharper. Copy the block, paste it into ${d.toolLabel}, and answer up to ten questions.

\`\`\`text
${contextCapsulePrompt(ctx.tool)}
\`\`\`

When the capsule comes back, paste it into CTRL at /kit/me to sharpen every artifact.`;
    },
  },

  /* ----- Part 3: Verify + Govern ----- */
  {
    id: "acceptance-pack",
    title: "Acceptance pack",
    order: 10,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Verify + Govern",
    description: "Run the checklist before you call it shipped; paste the verifier after any \"done\".",
    buildPrompt: (ctx) => {
      const draft = acceptancePackFallback({
        grind: grindFromIntake(ctx.intake),
        win: winFromIntake(ctx.intake),
      });
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

Below is the deterministic draft of their acceptance pack: a runnable shipped checklist plus the false green verifier, a prompt that makes their AI prove outputs against real artifacts (the row, the file, the email that sent), never its own claims. Improve it:
- Rewrite the checklist so each item is specific to their build and workflow: the real place the output lands, the real thing to spot-check against. Keep it to 5 to 7 checkboxes, each one able to fail.
- Keep the false green verifier's four-step structure intact, but make step 3's re-run instruction specific to their workflow.
- Keep both section headings exactly as they are. Keep the verifier inside its fenced text block.

${draft}

${VOICE_RULES}${contextBlock(ctx)}

Return only the markdown.`;
    },
    render: (ctx) =>
      acceptancePackFallback({
        grind: grindFromIntake(ctx.intake),
        win: winFromIntake(ctx.intake),
      }),
  },
  {
    id: "tool-registry",
    title: "Tool registry",
    order: 11,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Verify + Govern",
    description: "Keep one row per build; review the table monthly.",
    render: (ctx) => {
      const d = derive(ctx);
      return toolRegistryTemplate({
        buildName: d.buildName,
        touches: stakesTouchesFromIntake(ctx.intake),
        tierLabel: d.tierLabel,
      });
    },
  },
  {
    id: "stakes-dial",
    title: "Stakes dial",
    order: 12,
    contentType: "markdown",
    strategy: "deterministic",
    part: "Verify + Govern",
    description: "Check your tier, note the trigger that moves you up one, save the handoff packet.",
    render: (ctx) => {
      const d = derive(ctx);
      return stakesDialCard({ buildName: d.buildName, tier: d.tier });
    },
  },
  {
    id: "learning-loop",
    title: "Learning loop pack",
    order: 13,
    contentType: "zip",
    strategy: "scaffold_zip",
    part: "Verify + Govern",
    description: "Drop both files into your project folder; your skill writes to them on every run.",
    renderFiles: (ctx) => {
      const buildName = shortBuildName(grindFromIntake(ctx.intake));
      return [
        { path: "BUILD_LOG.md", content: buildLogTemplate(buildName) },
        { path: "LESSONS.md", content: lessonsTemplate() },
      ];
    },
  },
  {
    id: "seven-day-plan",
    title: "Seven-day plan",
    order: 14,
    contentType: "json",
    strategy: "llm_plan",
    part: "Verify + Govern",
    description: "Thirty minutes a day for seven days; day 1 is tonight.",
    buildPrompt: (ctx) => {
      const d = derive(ctx);
      const skill = ctx.firstSkillName || "their first skill";
      return `You are writing the 7-day plan for a Vibe Coding Field Kit student.

Student:
${profileBlock(ctx)}
First skill name: ${skill}

Return ONLY valid JSON, no markdown fences, in exactly this shape:
{"days":[{"day":1,"title":"...","action":"...","minutes":20},{"day":2,...},...,{"day":7,...}]}

Rules:
- Exactly 7 entries, day 1 through day 7.
- "minutes" is an integer, 30 or less, honest for the action described.
- Day 1 is always: install ${skill} in ${d.toolLabel} and run test prompt 1.
- Day 7 is always: ship it scrappy. Their definition of shipped is "${d.win}"; scrappy counts.
- Days 2 to 6 walk from spec to brief to build to verify, calibrated to their experience (${EXPERIENCE_LABELS[d.experience]}). Never built means smaller steps and more checking; shipped before means compress the early days and spend more on verify and govern.
- "title" is 6 words or fewer. "action" is one or two sentences, imperative, and names the exact kit artifact to use that day (spec interviewer, five-part brief, brief upgrader, session scripts, acceptance pack, tool registry).
- Plain language, sentence case, no buzzwords, no em dashes.`;
    },
    render: (ctx) => {
      const d = derive(ctx);
      const skill = ctx.firstSkillName || "your first skill";
      const days = [
        { day: 1, title: "Install and run", action: `Install ${skill} in ${d.toolLabel} and run test prompt 1.`, minutes: 15 },
        { day: 2, title: "Get interviewed", action: "Paste the spec interviewer into your tool and answer one question at a time. Keep the spec.", minutes: 30 },
        { day: 3, title: "Write the brief", action: "Fill every [FILL IN] gap in your five-part brief from the spec.", minutes: 25 },
        { day: 4, title: "Upgrade the brief", action: "Run your draft through the brief upgrader and accept or reject each [ASSUMED] line.", minutes: 20 },
        { day: 5, title: "Build version one", action: "Open a fresh session with the plan-first opener from session scripts, paste your brief, and build the happy path only.", minutes: 30 },
        { day: 6, title: "Verify it honestly", action: "Run the acceptance pack checklist, then paste the false green verifier after your tool says done.", minutes: 25 },
        { day: 7, title: "Ship it scrappy", action: `Put it in front of its first user. Shipped means ${d.win}. Add the registry row, then log it in CTRL.`, minutes: 30 },
      ];
      return JSON.stringify({ days }, null, 2);
    },
  },
  {
    id: "personal-map",
    title: "Your personal map",
    order: 15,
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
          tier: d.tierLabel,
          path: `Day 1 install your skill and run it; days 2 to 6 spec, brief, build and verify; day 7 ship it scrappy.`,
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
        bodyHtml: `<p style="margin:0 0 16px 0;">Your kit lives at the button below. Inside: fifteen artifacts that take the workflow you named in class from idea to shipped in seven days.</p>
<p style="margin:0 0 16px 0;">Do day 1 tonight: install your skill and run test prompt 1. Ten minutes, and the kit stops being a bookmark.</p>`,
      }),
  },
  day3: {
    subject: () => "Day 3. Did your skill run yet?",
    html: (ctx: KitEmailContext) => {
      const skillName = ctx.skillName || "your first skill";
      const toolLabel = ctx.toolLabel || "your tool";
      const testPrompt =
        ctx.testPrompt || "test prompt 1 from the test prompts file in your skill ZIP";
      return emailShell({
        heading: "Day 3. Did your skill run yet?",
        kitUrl: ctx.kitUrl,
        buttonLabel: "Open the 7-day plan",
        bodyHtml: `<p style="margin:0 0 16px 0;">You built ${skillName} in class. If it has not run yet, it is a file, not a tool.</p>
<p style="margin:0 0 16px 0;">Two minutes, right now: open ${toolLabel}, load the skill, and run this:</p>
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
  version: "1.0.0",
  title: "Vibe Coding Field Kit",
  classTitle: "Vibe Coding Lightning Lesson",
  tagline: "One workflow, one week, one shipped build.",
  mavenUrl: "https://maven.com/mindmaker",
  codePrefixes: ["VIBE"],
  passDays: 30,
  skillQuota: 3,
  intake,
  artifacts,
  contextPullPrompt: (tool: KitTool, ctx?: Partial<ArtifactBuildContext>): string => {
    const base = contextCapsulePrompt(tool);
    const grind = ctx?.intake ? grindFromIntake(ctx.intake as IntakeAnswers) : "";
    if (!grind) return base;
    return `${base}

One thing you already know: the workflow I named in class was "${grind}". Use it when we get to the first build candidate.`;
  },
  score: (intakeAnswers: IntakeAnswers) => scoreVibeCoding(intakeAnswers),
  emails,
};
