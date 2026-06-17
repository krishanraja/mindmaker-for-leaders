/**
 * Vibe Coding Field Kit preset.
 *
 * Everything class-specific for the Vibe Coding Lightning Lesson follow-up.
 *
 * Intake is a forked pick-cascade (no open-ended voice question): the student
 * forks self vs business, names a profile, recognises their repetitive AREAS
 * from a curated list (multi), picks the one to BUILD FIRST (one), picks the
 * specific WORKFLOW from a curated matrix (one), then the steps it INVOLVES
 * (multi), then tool / win / stakes / experience. The copy is deliberately
 * gentle: a casual mid-level student should not feel they need Cursor or Lovable
 * or any developer setup. A live picks preview (previewKind 'picks') assembles a
 * board of what they could build as they tap.
 *
 * The take-home pack is trimmed to six heroes: the leverage audit, the five-part
 * brief, the first skill (the ZIP), the acceptance pack, the seven-day plan and
 * the personal map. Every compose prompt reads the STRUCTURED cascade answers
 * (the chosen workflow label, the steps it involves), never a free-text blob,
 * and stays honesty-gated by a deterministic fallback.
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
  STAKES_TIER_LABELS,
  STAKES_TIER_RULES,
  areasFromIntake,
  buildFirstFromIntake,
  experienceFromIntake,
  involvesFromIntake,
  offeringFromIntake,
  roleFromIntake,
  scoreVibeCoding,
  shortBuildName,
  stageFromExperience,
  stakesTierFromIntake,
  stakesTouchesFromIntake,
  winFromIntake,
  workflowFromIntake,
} from "./scoring.ts";
import type { VibeScore } from "./scoring.ts";
import {
  AGENT_PICKS_STUB,
  AREA_OPTIONS_BIZ,
  AREA_OPTIONS_SELF,
  INVOLVES_OPTIONS,
  VOICE_RULES,
  WORKFLOW_FALLBACK,
  WORKFLOW_MATRIX,
  acceptancePackFallback,
  fivePartBriefTemplate,
  leverageAuditFallback,
} from "./templates.ts";
import { MERIDIAN_WORKED_EXAMPLE } from "./examples.ts";
import { contextPullPrompt } from "./prompts.ts";

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
  /** The chosen build-first area (the start box). */
  area: string;
  /** The specific workflow label picked from the curated matrix. */
  workflow: string;
  /** What the workflow involves (multi). */
  involves: string[];
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
  const workflow = workflowFromIntake(ctx.intake);
  return {
    role: roleFromIntake(ctx.intake),
    offering: offeringFromIntake(ctx.intake),
    area: buildFirstFromIntake(ctx.intake),
    workflow,
    involves: involvesFromIntake(ctx.intake),
    buildName: shortBuildName(workflow),
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
    `Who they are: ${d.role}${d.offering ? ` (they are calling their build "${d.offering}")` : ""}`,
    `The area they are starting in: ${d.area || "not specified"}`,
    `The specific workflow they picked: ${d.workflow || "not specified"}`,
    `What that workflow involves: ${d.involves.length > 0 ? d.involves.join(", ") : "not specified"}`,
    `Tool they will build in: ${d.toolLabel}`,
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
  "You are writing one artifact of the Vibe Coding Field Kit for a student who just finished the Vibe Coding Lightning Lesson. They are not a developer; they may be a student or an operator building their very first small tool. Be encouraging and plain. Never assume they have Cursor, Lovable or any developer setup; the tool is whatever they already have open.";

/* ------------------------------------------------------------------ */
/* Intake: the forked pick-cascade (no open-ended voice question)       */
/* ------------------------------------------------------------------ */

const intake: KitPreset["intake"] = [
  // 0. THE FORK - self vs business. Pathway only.
  {
    id: "pathway",
    type: "chips",
    pathwayFork: true,
    eyebrow: "Let's find your first build",
    prompt: "Who are you building for?",
    helper: "This changes what we ask, and what you walk away with.",
    options: [
      { id: "self", label: "Myself", pathway: "self" },
      { id: "biz", label: "My work or business", pathway: "biz" },
    ],
    factMappings: [
      { fact_key: "kit_vibe_pathway", fact_category: "identity", fact_label: "Vibe coding pathway" },
    ],
  },

  // 0b. PROFILE - the name on the kit + who they are (nameField + role chips).
  {
    id: "profile",
    type: "chips",
    eyebrow: "About you",
    prompt: "Tell us a little about you.",
    helper: "No wrong answer. This just tunes what we suggest.",
    showIf: { answeredQuestionId: "pathway" },
    nameField: { label: "What should we call this build of yours?", placeholder: "e.g. my study helper" },
    pathwayCopy: {
      self: { prompt: "Tell us a little about you.", helper: "No wrong answer. This just tunes what we suggest." },
      biz: { prompt: "Tell us a little about your work.", helper: "No wrong answer. This just tunes what we suggest." },
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

  // 1. AREAS (multi, chartFeed:boxes) - the repetitive areas, recognised from a list.
  {
    id: "areas",
    type: "chips_multi",
    eyebrow: "Where the time goes",
    prompt: "Where does your time go on repeat?",
    chartFeed: "boxes",
    showIf: { answeredQuestionId: "pathway" },
    pathwayCopy: {
      self: {
        prompt: "Where does your time go on repeat?",
        helper: "Tap the areas where you do the same kind of thing again and again.",
      },
      biz: {
        prompt: "Where does your time go on repeat?",
        helper: "Tap the areas where the same work comes around again and again.",
      },
    },
    pathwayOptions: { self: AREA_OPTIONS_SELF, biz: AREA_OPTIONS_BIZ },
    options: [...AREA_OPTIONS_SELF, ...AREA_OPTIONS_BIZ],
  },

  // 2. BUILD FIRST (one, chartFeed:startBox) - drawn from the picked areas.
  {
    id: "buildFirst",
    type: "chips",
    eyebrow: "Start here",
    prompt: "Which one would you build first?",
    helper: "Pick the one that would save you the most, or just annoys you the most.",
    chartFeed: "startBox",
    showIf: { answeredQuestionId: "areas" },
    adaptiveOptions: { fromQuestionId: "areas" },
  },

  // 3. WORKFLOW (one) - the specific repetitive thing, recognised from a curated matrix.
  {
    id: "workflow",
    type: "chips",
    eyebrow: "The repetitive thing",
    prompt: "Which of these is the repetitive thing?",
    helper: "Tap the closest one. This is what your tool will take off your plate.",
    showIf: { answeredQuestionId: "buildFirst" },
    adaptiveOptions: {
      matrixKey: "workflow",
      matrixFromQuestionId: "buildFirst",
      fallback: WORKFLOW_FALLBACK,
    },
  },

  // 4. INVOLVES (multi) - what the workflow actually involves. Shapes the build.
  {
    id: "involves",
    type: "chips_multi",
    eyebrow: "The steps",
    prompt: "What does that actually involve?",
    helper: "Tap the steps. This shapes the tool we help you build.",
    showIf: { answeredQuestionId: "workflow" },
    options: INVOLVES_OPTIONS,
  },

  // 5. TOOL - where will you build. Softened, "not sure yet" is first-class.
  {
    id: "tool",
    type: "chips",
    eyebrow: "Your tool",
    prompt: "Which AI do you already use?",
    helper: "Whatever you have open is fine. No special software needed.",
    showIf: { answeredQuestionId: "involves" },
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

  // 6. WIN - what counts as shipped.
  {
    id: "win",
    type: "chips",
    eyebrow: "Done looks like",
    prompt: "What would count as a win, a week from now?",
    showIf: { answeredQuestionId: "tool" },
    options: [
      { id: "use-myself", label: "A working tool I use myself" },
      { id: "someone-touched", label: "Something a friend or teammate actually used" },
      { id: "show-it", label: "Something I can show and walk through" },
      { id: "you-pick", label: "You pick for me" },
    ],
    factMappings: [
      { fact_key: "first_ship_definition", fact_category: "objective", fact_label: "First ship definition" },
    ],
  },

  // 7. STAKES (chartFeed:tags) - who uses it and what it touches.
  {
    id: "stakes",
    type: "chips",
    eyebrow: "Who it touches",
    prompt: "Who will use it, and what does it touch?",
    chartFeed: "tags",
    showIf: { answeredQuestionId: "win" },
    options: [
      { id: "just-me", label: "Just me, nothing sensitive" },
      { id: "team-internal", label: "My team or friends, internal stuff" },
      { id: "customers", label: "Customers or their data" },
    ],
  },

  // 8. EXPERIENCE - built anything with AI before.
  {
    id: "experience",
    type: "chips",
    eyebrow: "Where you're at",
    prompt: "Built anything with AI before?",
    helper: "Totally fine if not. This just sets the pace.",
    showIf: { answeredQuestionId: "stakes" },
    options: [
      { id: "never", label: "Never" },
      { id: "few-prompts", label: "A few prompts" },
      { id: "shipped", label: "Shipped something" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Artifacts: the six kept heroes                                       */
/* ------------------------------------------------------------------ */

const artifacts: KitPreset["artifacts"] = [
  /* ----- Spot + Spec ----- */
  {
    id: "leverage-audit",
    title: "Leverage audit",
    order: 1,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Spot + Spec",
    description: "Read it once, accept or swap the recommended first build, then start there.",
    buildPrompt: (ctx) => {
      const d = derive(ctx);
      const score = resolveScore(ctx);
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

Deterministic scoring already placed their chosen workflow on the frequency x judgment 2x2: frequency ${score.frequency}, judgment ${score.judgment}, quadrant "${score.quadrant}".

Write their leverage audit as a single markdown card titled "# Your leverage audit". It must:
1. Show their chosen workflow ("${d.workflow || "the one they picked"}") and one line on where it sits on the 2x2 and why. Use the scoring above; do not contradict it.
2. Infer 3 to 5 more candidates from the other areas they picked (${areasFromIntake(ctx.intake).join(", ") || "their areas"}) and the context below. One line each, with the candidate's 2x2 position in brackets.
3. Rank everything, best first build at the top: high frequency, low judgment, smallest scope wins.
4. Recommend exactly ONE first build. Scope it down until it feels almost too small: one input, one output, one run. Say what version one does and what it deliberately does not.

It is a card, not a worksheet: under 250 words, no questions back to the student, no tables, headings no deeper than ##.

${VOICE_RULES}${contextBlock(ctx)}

Return only the markdown.`;
    },
    render: (ctx) => leverageAuditFallback(resolveScore(ctx), workflowFromIntake(ctx.intake)),
  },

  /* ----- Brief + Build ----- */
  {
    id: "five-part-brief",
    title: "Five-part brief",
    order: 2,
    contentType: "markdown",
    strategy: "llm_polish",
    part: "Brief + Build",
    description: "Fill the [FILL IN] gaps, then paste the whole brief into your first build session.",
    buildPrompt: (ctx) => {
      const d = derive(ctx);
      const involvesLine =
        d.involves.length > 0
          ? `What it involves today: ${d.involves.join(", ")}.`
          : "They did not detail the steps.";
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

${involvesLine}

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
- Context names where the information lives today and the manual steps as they happen. Use what they told you it involves: ${d.involves.join(", ") || "(not given)"}.
- Format describes what the output literally looks like: sections, order, what goes where.
- Constraints include the tool (${d.toolLabel}), the stakes tier rule (${d.tierLabel}: ${d.tierRule}), read-only against sources unless they said otherwise, and what it must never touch, send or change.
- Acceptance is three checks anyone could run; tie one to their definition of shipped (${d.win}). If a check cannot fail, it is not a check.
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
      const brief = fivePartBriefTemplate({
        buildName: d.buildName,
        workflow: d.workflow,
        involves: d.involves,
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
    id: "first-skill",
    title: "Your first skill",
    order: 3,
    contentType: "zip",
    strategy: "skill_pipeline",
    part: "Brief + Build",
    description: "Download, install in your tool, run test prompt 1 tonight.",
    buildSeed: (ctx) => {
      const d = derive(ctx);
      const workflow = d.workflow || "a recurring thing I do over and over";
      const involvesLine =
        d.involves.length > 0
          ? `Here is what it involves: ${d.involves.map((s) => s.toLowerCase()).join("; ")}.`
          : "";
      const transcript = `I am a ${d.role.toLowerCase()}.${d.offering ? ` I am calling this build "${d.offering}".` : ""}

The repetitive thing I want a tool to take off my plate, in the area of ${d.area.toLowerCase() || "my work"}: ${workflow.toLowerCase()}. ${involvesLine}

One week from now, shipped means ${d.win}. I will build it in ${d.toolLabel}.

Who it touches: stakes tier ${d.tierLabel}. ${d.tierRule}

My experience with AI builds: ${EXPERIENCE_LABELS[d.experience]}. Pitch the skill's instructions at that level, and assume I have no developer tools, just a normal AI chat.

Requirements for the generated skill (must follow exactly):
- The skill body MUST include a section titled "Learning loop" that instructs the agent to do two things without being asked:
  1. On every run, append one dated log line to BUILD_LOG.md: what ran, what felt off, one rule to add.
  2. At the start of every session, read LESSONS.md and treat its rules as binding instructions.
- Keep the skill scoped to the single workflow above. Do not generalise it into a do-everything assistant.`;
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
      const draft = acceptancePackFallback({ workflow: d.workflow, win: d.win });
      return `${PROMPT_PREAMBLE}

Student:
${profileBlock(ctx)}

Below is the deterministic draft of their acceptance pack: a runnable shipped checklist plus the false green verifier, a prompt that makes their AI prove outputs against real results (the text it wrote, the file it made, the thing it produced), never its own claims. Improve it:
- Rewrite the checklist so each item is specific to their build and chosen workflow ("${d.workflow || "their workflow"}"): the real place the output lands, the real thing to check against. Keep it to 5 to 7 checkboxes, each one able to fail.
- Keep the false green verifier's four-step structure intact, but make step 3's re-run instruction specific to their workflow.
- Keep both section headings exactly as they are. Keep the verifier inside its fenced text block.

${draft}

${VOICE_RULES}${contextBlock(ctx)}

Return only the markdown.`;
    },
    render: (ctx) => {
      const d = derive(ctx);
      return acceptancePackFallback({ workflow: d.workflow, win: d.win });
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
- Day 7 is always: ship it scrappy. Their definition of shipped is "${d.win}"; scrappy counts.
- Days 2 to 6 walk from brief to build to verify, calibrated to their experience (${EXPERIENCE_LABELS[d.experience]}). Never built means smaller steps and more checking; shipped before means compress the early days and spend more on verify.
- "title" is 6 words or fewer. "action" is one or two sentences, imperative, and names the exact kit artifact to use that day (five-part brief, acceptance pack, leverage audit).
- Plain language, sentence case, no buzzwords, no em dashes.`;
    },
    render: (ctx) => {
      const d = derive(ctx);
      const skill = ctx.firstSkillName || "your first skill";
      const days = [
        { day: 1, title: "Install and run", action: `Install ${skill} in ${d.toolLabel} and run test prompt 1.`, minutes: 15 },
        { day: 2, title: "Read the audit", action: "Read your leverage audit and lock in the one build it recommends. Do not widen the scope.", minutes: 15 },
        { day: 3, title: "Write the brief", action: "Fill every [FILL IN] gap in your five-part brief.", minutes: 25 },
        { day: 4, title: "Sharpen the brief", action: "Read the brief back as a stranger. Tighten the goal and the acceptance checks until each one could fail.", minutes: 20 },
        { day: 5, title: "Build version one", action: "Open a fresh session, paste your brief, and build the happy path only. Nothing extra.", minutes: 30 },
        { day: 6, title: "Verify it honestly", action: "Run the acceptance pack checklist, then paste the false green verifier after your tool says done.", minutes: 25 },
        { day: 7, title: "Ship it scrappy", action: `Put it in front of its first user: you. Shipped means ${d.win}. Then log it in CTRL.`, minutes: 30 },
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
          tier: d.tierLabel,
          touches: stakesTouchesFromIntake(ctx.intake),
          path: "Day 1 install your skill and run it; days 2 to 6 read the audit, write the brief, build and verify; day 7 ship it scrappy.",
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
        bodyHtml: `<p style="margin:0 0 16px 0;">Your kit lives at the button below. Inside: six things that take the repetitive workflow you picked from idea to shipped in seven days.</p>
<p style="margin:0 0 16px 0;">Do day 1 tonight: install your skill and run test prompt 1. Ten minutes, and the kit stops being a bookmark. A normal AI chat is all you need.</p>`,
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
        bodyHtml: `<p style="margin:0 0 16px 0;">You picked your first build in the kit. If your skill has not run yet, it is a file, not a tool.</p>
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
  version: "2.0.0",
  title: "Vibe Coding Field Kit",
  classTitle: "Vibe Coding Lightning Lesson",
  tagline: "One workflow, one week, one shipped build.",
  mavenUrl: "https://maven.com/mindmaker",
  codePrefixes: ["VIBE"],
  passDays: 30,
  skillQuota: 3,
  previewKind: "picks",
  optionMatrices: { workflow: WORKFLOW_MATRIX },
  agentRoles: Object.fromEntries(
    Object.entries(AGENT_PICKS_STUB).map(([k, v]) => [k, { agentRole: v.pick, agentDesc: v.desc }]),
  ),
  intake,
  artifacts,
  contextPullPrompt: (tool: KitTool, ctx?: Partial<ArtifactBuildContext>): string => {
    const workflow = ctx?.intake ? workflowFromIntake(ctx.intake as IntakeAnswers) : "";
    return contextPullPrompt(tool, workflow || undefined);
  },
  score: (intakeAnswers: IntakeAnswers) => scoreVibeCoding(intakeAnswers),
  emails,
};
