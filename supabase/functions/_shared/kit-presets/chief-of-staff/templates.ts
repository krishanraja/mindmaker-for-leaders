/**
 * Build Your AI Chief of Staff: intake option sets, the per-rung detail map, and
 * the deterministic renderers / fallbacks for the kit's artifacts.
 *
 * The kit is a DECISION engine, not a build engine. The intake is the quiz (the
 * eight field-guide inputs plus a role and a tool); the hero output is a
 * personalised recommendation; the starter files are the platform-agnostic
 * training files the recommended rung needs to get going. Every renderer below
 * is deterministic and reads only the typed answers / the computed scores, so
 * the kit composes honestly with a no-LLM floor.
 *
 * Platform-agnostic content, tool-specific instructions (spec 2.3): the content
 * works on any AI platform; only install / paste lines name the person's chosen
 * tool, falling back to "your AI" when they pick none.
 *
 * Plain TypeScript only; bundled into both the Deno edge runtime and the Vite
 * client. No Deno or Node globals.
 */

import type { IntakeOption, KitTool } from "../types.ts";
import { rungName, type ChiefScores } from "./scoring.ts";

/** Baked into every LLM polish prompt so generated copy holds the register. */
export const VOICE_RULES = `Voice rules for everything you write:
- Calm, plain, second-person ("you"). Warm but never hyped.
- Sentence case. No em dashes anywhere; use hyphens, commas, semicolons or parentheses.
- No buzzwords ("transformation", "leverage" as a verb, "game-changer", "unlock").
- Honest broker tone: the loudest claims come from whoever is selling the tool.
- Short sentences. Assume a smart person who is not technical.`;

/* ------------------------------------------------------------------ */
/* Intake option sets (ids MUST match the scoring enums)                */
/* ------------------------------------------------------------------ */

/** Role is for personalising the identity file, not for scoring. */
export const ROLE_OPTIONS: IntakeOption[] = [
  { id: "founder", label: "Founder or owner" },
  { id: "exec", label: "Exec or leader" },
  { id: "operator", label: "Operator or chief of staff" },
  { id: "manager", label: "Manager" },
  { id: "ic", label: "Individual contributor" },
  { id: "solo", label: "Solo or freelance" },
  { id: "student", label: "Student or early-career" },
  { id: "other", label: "Something else" },
];

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.id, o.label]),
);

export const TECH_OPTIONS: IntakeOption[] = [
  { id: "none", label: "Not technical at all" },
  { id: "light", label: "I can follow clear steps" },
  { id: "comfortable_nocode", label: "Comfortable with no-code tools" },
  { id: "can_code", label: "I can write some code" },
  { id: "engineer", label: "I am an engineer" },
];

export const TIME_OPTIONS: IntakeOption[] = [
  { id: "minutes", label: "A few minutes" },
  { id: "one_evening", label: "An hour or one evening" },
  { id: "a_weekend", label: "A weekend" },
  { id: "weeks", label: "Weeks, if it pays off" },
];

export const BUDGET_OPTIONS: IntakeOption[] = [
  { id: "under_25", label: "Under $25 a month" },
  { id: "25_50", label: "$25 to $50 a month" },
  { id: "50_150", label: "$50 to $150 a month" },
  { id: "150_plus", label: "$150+ a month" },
  { id: "prefer_own_hardware", label: "I'd rather buy hardware once" },
];

export const PRIVACY_OPTIONS: IntakeOption[] = [
  { id: "low", label: "Not sensitive" },
  { id: "medium", label: "Some of it is private" },
  { id: "high", label: "A lot of it is sensitive" },
  { id: "must_be_local", label: "It must never leave my machine" },
];

export const JOB_OPTIONS: IntakeOption[] = [
  { id: "think_draft", label: "Think things through and draft" },
  { id: "inbox_calendar", label: "Tame my inbox and calendar" },
  { id: "scheduled_briefs", label: "Brief me on a schedule" },
  { id: "take_action", label: "Actually take action for me" },
  { id: "everything_private", label: "Run my private work, all of it" },
];

export const AUTONOMY_OPTIONS: IntakeOption[] = [
  { id: "only_respond", label: "Only answer when I ask" },
  { id: "draft_for_approval", label: "Draft things for me to approve" },
  { id: "act_on_low_stakes", label: "Act on small, reversible things" },
  { id: "run_unsupervised", label: "Run on its own" },
];

export const NOW_OPTIONS: IntakeOption[] = [
  { id: "just_chat", label: "I just open a chat" },
  { id: "some_native", label: "I use a few built-in features" },
  { id: "tried_tools", label: "I've tried some tools" },
  { id: "built_a_flow", label: "I've built an automation" },
  { id: "self_hosting", label: "I self-host things" },
];

export const MAINTAIN_OPTIONS: IntakeOption[] = [
  { id: "yes", label: "Yes, 15 minutes a week" },
  { id: "maybe", label: "Maybe, if it's quick" },
  { id: "no", label: "Honestly, no" },
];

export const TOOL_OPTIONS: IntakeOption[] = [
  { id: "chatgpt", label: "ChatGPT", tool: "chatgpt" },
  { id: "claude", label: "Claude", tool: "claude" },
  { id: "gemini", label: "Gemini", tool: "gemini" },
  { id: "none", label: "Not sure yet", tool: "none" },
];

/* ------------------------------------------------------------------ */
/* The seven rungs, in full (field guide section 4)                     */
/* ------------------------------------------------------------------ */

export interface RungDetail {
  name: string;
  oneLiner: string;
  whoFor: string;
  tools: string[];
  /** The one wall this rung hits. */
  wall: string;
  /** The design call that heads that wall off. */
  designCall: string;
  /** The first concrete move on this rung. */
  firstStep: string;
}

export const RUNG_DETAIL: Record<number, RungDetail> = {
  1: {
    name: "Just chat",
    oneLiner: "Open a chat and ask. No memory, no wiring, no setup.",
    whoFor: "A quick draft, summary or sounding board you will not repeat.",
    tools: ["ChatGPT", "Claude", "Gemini (raw chat)"],
    wall: "It forgets everything when the tab closes, so you stay the memory, forever.",
    designCall: "Treat it as a sounding board for one-offs, never your system of record.",
    firstStep:
      "Keep one running doc of who you are and what you are working on, and paste it in at the start of each session. That is a poor-man's memory until you climb to rung 2.",
  },
  2: {
    name: "Native, switched on",
    oneLiner: "The same Claude or ChatGPT, with the parts most people never turn on.",
    whoFor: "Real results today, zero infrastructure, memory you can see and edit.",
    tools: ["Claude (Memory, Projects, Skills, Connectors)", "ChatGPT equivalents"],
    wall: "It drafts and responds; it will not act on a schedule, and memory drifts if you never prune it.",
    designCall: "Seed memory on purpose with who you are, then prune it for 15 minutes a week.",
    firstStep:
      "Turn on Memory and seed it with your identity file. Make one Project for your work. Connect your calendar. Run a morning brief every weekday until it genuinely helps.",
  },
  3: {
    name: "Buy a product",
    oneLiner: "A finished chief of staff you sign into. Narrow by design.",
    whoFor: "Inbox and calendar relief you will pay for and will not build yourself.",
    tools: ["Lindy", "Motion", "Reclaim.ai", "Gemini for Workspace"],
    wall: "Credit costs are unpredictable and the memory is not portable. Read the meter, not the marketing.",
    designCall: "Pick one narrow job in a channel you already use, and watch the meter for a week.",
    firstStep:
      "Trial one product for one job (calendar, or inbox triage). Track what it actually costs you for a week before you commit.",
  },
  4: {
    name: "No-code orchestration",
    oneLiner: "A canvas where you drag boxes; a schedule fires and the brief lands in your messaging app.",
    whoFor: "Scheduled briefs in the app you already live in, with an afternoon to invest.",
    tools: ["n8n (most powerful for AI)", "Make", "Zapier", "a Claude or GPT node as the brain"],
    wall: "Complex multi-step flows get fiddly to debug. You now maintain a small system, not an app.",
    designCall: "Start with one scheduled flow that delivers to Telegram or Slack; add a second only once the first is reliable.",
    firstStep:
      "Build one no-code flow: a 7am brief that reads your calendar and inbox and posts to your messaging app, with Claude or GPT as the brain.",
  },
  5: {
    name: "Custom API harness",
    oneLiner: "You write the loop: triggers, tools, the memory layer, the output channel, all yours.",
    whoFor: "Reliable action with replay, decision tracing and clean integrations.",
    tools: ["Claude Agent SDK (you own all state)", "OpenAI Assistants (server-managed threads)"],
    wall: "You manage state, rate limits and failures yourself. A real engineering project, not a weekend toy.",
    designCall: "Own your state (the Agent SDK) for replay and tracing, and keep everything in draft mode for the first month.",
    firstStep:
      "Build the five layers (trigger, model, tools, memory, output) for one job, draft-only. Earn write access before you grant it.",
  },
  6: {
    name: "Self-hosted open source",
    oneLiner: "A harness on your own machine or VPS, model-routed, with plain-text memory you own.",
    whoFor: "Privacy that is non-negotiable, and you are technical.",
    tools: ["PAI (Daniel Miessler)", "Hermes Agent (Nous Research)", "OpenClaw (handle with care)"],
    wall: "Security and upkeep are now genuinely your job, and memory can be unreliable. (OpenClaw had 512 vulnerabilities; choose the calmer alternatives.)",
    designCall: "Pick PAI or Hermes over OpenClaw. Secrets management, no inbound ports, a VPN or tunnel.",
    firstStep:
      "Stand up PAI or Hermes on a VPS behind a tunnel, with plain-text memory in files you can read. Route the routine work to a cheap model.",
  },
  7: {
    name: "Own the hardware",
    oneLiner: "The model runs on silicon you own. Buy once, no token balance, no per-prompt cost.",
    whoFor: "Heavy daily use, a hatred of metered bills, and documents that should never leave your desk.",
    tools: ["A local AI box", "an open-weight model via Ollama", "local-first routing"],
    wall: "Hardware up front, and you maintain it. Local models still trail the frontier on the hardest tasks.",
    designCall: "Local-first, not local-only: own the daily 70 to 90 percent, rent the exceptional from the cloud.",
    firstStep:
      "Load an open model on a local box and route the routine work (writing, summaries, private files) to it. Keep a cloud model on hand for the hardest tasks only.",
  },
};

/* ------------------------------------------------------------------ */
/* Tool labels                                                          */
/* ------------------------------------------------------------------ */

export function toolLabelOf(tool: KitTool): string {
  switch (tool) {
    case "chatgpt":
      return "ChatGPT";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    default:
      return "your AI";
  }
}

/* ------------------------------------------------------------------ */
/* Fit reasons (why the recommended rung fits the person)               */
/* ------------------------------------------------------------------ */

/** One plain line per salient input, tracing the recommendation to the answers. */
export function fitReasons(scores: ChiefScores): string[] {
  const i = scores.inputs;
  const out: string[] = [];

  const jobLine: Record<string, string> = {
    think_draft: "You mostly want a sharper thinking partner, not something that acts on its own.",
    inbox_calendar: "You want your inbox and calendar handled, which is a narrow, well-served job.",
    scheduled_briefs: "You want briefing on a schedule, so it has to run without you opening anything.",
    take_action: "You want it to actually take action, which is the thing you earn last and on purpose.",
    everything_private: "You want it to run your private work end to end, so where the memory lives matters most.",
  };
  out.push(jobLine[i.job]);

  const techLine: Record<string, string> = {
    none: "You told us you are not technical, so we kept you to setups you can stand up today.",
    light: "You can follow clear steps, so a guided setup is well within reach; deep engineering is not the move yet.",
    comfortable_nocode: "You are comfortable with no-code, which is exactly the sweet spot for serious DIY.",
    can_code: "You can write code, so owning the loop is realistic when you need reliable action.",
    engineer: "You are an engineer, so the higher-ownership rungs are genuinely on the table.",
  };
  out.push(techLine[i.tech]);

  if (i.privacy === "must_be_local") {
    out.push("Your data has to stay on your machine, which rules out anything that holds your memory in someone else's cloud.");
  } else if (i.privacy === "high") {
    out.push("A lot of your work is sensitive, so memory you can see and own beats a black box.");
  }

  const timeLine: Record<string, string> = {
    minutes: "You have minutes, not hours, so the setup has to pay off almost immediately.",
    one_evening: "An evening is enough to switch on the parts that matter.",
    a_weekend: "A weekend is enough to wire up your first real automation.",
    weeks: "You are willing to invest weeks if it pays off, which opens the higher rungs.",
  };
  out.push(timeLine[i.time]);

  if (i.maintain === "no") {
    out.push("You were honest that you will not do weekly upkeep, so we kept you to something that survives without it.");
  } else if (i.maintain === "yes") {
    out.push("You will do the weekly 15-minute upkeep, which is what makes any of this compound.");
  }

  return out.filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Your path (the hero recommendation) - deterministic fallback         */
/* ------------------------------------------------------------------ */

export function yourPathFallback(scores: ChiefScores, roleLabel: string): string {
  const rec = scores.recommended;
  const d = RUNG_DETAIL[rec.rung];
  const who = roleLabel ? `As ${aOrAn(roleLabel)} ${roleLabel.toLowerCase()}, ` : "";
  const reasons = fitReasons(scores).map((r) => `- ${r}`).join("\n");

  // The runners-up: the next eligible rungs, for an honest "close seconds".
  const runners = scores.ranked
    .filter((r) => r.rung !== rec.rung)
    .slice(0, 2)
    .map((r) => `- Rung ${r.rung}, ${RUNG_DETAIL[r.rung]?.name}: ${RUNG_DETAIL[r.rung]?.oneLiner}`)
    .join("\n");

  // The next rung up (the climb), if there is one above the recommendation.
  const nextUp = RUNG_DETAIL[rec.rung + 1];

  const warnings = scores.warnings.map((w) => `> ${w}`).join("\n>\n");
  const guards = scores.guardrailsApplied.length
    ? `\n## One thing we held the line on\n${scores.guardrailsApplied.map((g) => `- ${g}`).join("\n")}\n`
    : "";

  return `# Your path: rung ${rec.rung}, ${d.name}

${who}start here. ${d.oneLiner}

## Why this fits you
${reasons}

## The one wall to expect
${d.wall}

The design call that heads it off: ${d.designCall}

## Your first move
${d.firstStep}

## The tools for this rung
${d.tools.map((t) => `- ${t}`).join("\n")}
${guards}${
    nextUp
      ? `\n## If you outgrow it\nClimb only when you hit a real wall, not before. Your next rung up is rung ${rec.rung + 1}, ${nextUp.name}: ${nextUp.oneLiner}\n`
      : ""
  }${
    runners
      ? `\n## Close seconds\n${runners}\n`
      : ""
  }
${warnings}`;
}

/* ------------------------------------------------------------------ */
/* The identity file (Pillar 1) - deterministic fallback                */
/* ------------------------------------------------------------------ */

export function identityFileFallback(roleLabel: string, toolLabel: string): string {
  const role = roleLabel ? roleLabel.toLowerCase() : "the person I work for";
  return `# My AI chief of staff: identity file

This is the single source of truth about who I am and how you, my AI chief of
staff, work for me. Read it first, every session, and keep to it.

## Who you work for
- My role: ${role}.
- [FILL IN: what I am responsible for, in one line.]
- [FILL IN: the one or two priorities that matter most this quarter.]

## How I want you to work with me
- Draft, do not send. Anything that goes out under my name waits for my explicit go.
- Keep it short and plain. Lead with the answer, then the reasoning if I ask.
- When you are unsure, ask one sharp question rather than guessing.

## What you must never do without my approval
- Anything involving money, people, or legal commitments.
- Sending a message, posting, or changing a record on my behalf.
- [FILL IN: anything specific to me that is off-limits.]

## How I sound
- [FILL IN: one or two lines describing my tone, or paste a paragraph I actually wrote.]

## You have done this correctly when
- You acted within the rules above without me reminding you.
- You drafted, and waited for my go, on anything that leaves under my name.
- You asked instead of guessing when a fact was missing.

To use this, paste it where ${toolLabel} keeps its standing instructions (its memory,
a project, or the top of a new chat), so every session starts from the real me.`;
}

/* ------------------------------------------------------------------ */
/* Seed-memory prompt - deterministic                                   */
/* ------------------------------------------------------------------ */

export function seedMemoryPrompt(roleLabel: string, toolLabel: string): string {
  const role = roleLabel ? roleLabel.toLowerCase() : "my role";
  return `# Seed your chief of staff's memory

Paste this into ${toolLabel} once, to teach it who you are. Then keep your identity
file as the place you update over time.

\`\`\`text
I want you to act as my AI chief of staff. Remember the following about me and
use it in every future conversation, without me repeating it:

- My role: ${role}.
- What I am responsible for: [fill in].
- My priorities right now: [fill in].
- How I like you to work: draft things for me to approve, keep it short and
  plain, ask one sharp question when you are unsure rather than guessing.
- Never do without my explicit go: send anything under my name, spend money,
  or make commitments to people.
- My communication style: [fill in, or I will paste a sample].

When you have stored this, reply with a one-line summary of who I am and how you
will work, so I can confirm you have it right.
\`\`\`

You have done this correctly when ${toolLabel} can brief you on your week without
you re-explaining who you are.`;
}

/* ------------------------------------------------------------------ */
/* The three pillars checklist - deterministic                          */
/* ------------------------------------------------------------------ */

export function threePillarsFile(rung: number, toolLabel: string): string {
  const d = RUNG_DETAIL[rung];
  return `# The three pillars: what actually decides whether yours survives

The rung you picked (${rung}, ${d.name}) is a detail. These three decisions are
what separate a real chief of staff from another abandoned tab. Work them, in
order, whatever your rung.

## 1. Identity
Does it know who it is and who it works for?
- [ ] You wrote an identity file (start from the one in this kit).
- [ ] It holds your role, your standards, your priorities, and the lines it must
      never cross without you.
- [ ] You keep enduring personal context separate from project context.

## 2. Memory
Does it remember right, and forget what is stale?
- [ ] Memory is structured, not a dump. Curate what goes in; more context is not
      better, structured context is.
- [ ] You run a correction loop: when it makes a mistake, you write the fix back
      permanently, so the same mistake does not survive four occurrences.
- [ ] You prune stale facts, so it never confidently tells you about priorities
      that changed three months ago.

## 3. Monitoring
Do you know when it quietly stopped working?
- [ ] You judge it by reading the actual output, not a green status light.
- [ ] You set one alert: if the morning brief has not arrived by 9am, it tells you.

A weekly 15-minute review of these three is the entire maintenance habit. Keep it
boring, and it compounds. Run all of this inside ${toolLabel}, or wherever your
setup lives.`;
}

/* ------------------------------------------------------------------ */
/* The 90-day arc (markdown) - deterministic                            */
/* ------------------------------------------------------------------ */

export function ninetyDayArcFile(scores: ScoreLike, toolLabel: string): string {
  const rec = scores.recommended;
  const d = RUNG_DETAIL[rec.rung];
  return `# Your 90-day on-ramp

Everyone starts the same way, on the native foundation, then climbs to the rung
that fits. This is the shortest honest path to a chief of staff you actually use.

## Days 1 to 14: native foundation (everyone starts here)
Turn on Memory and seed it with your identity file. Make one Project for your
work. Connect your calendar. Run a morning brief every weekday in ${toolLabel}
until it genuinely helps you start the day. Add nothing else.

## Days 15 to 45: your first build (rung ${rec.rung}, ${d.name})
${d.firstStep}
Review it daily and refine. The design call that keeps it alive: ${d.designCall}

## Days 46 to 90: memory, correction, expand
Build the correction loop: log mistakes, and write the important ones back into
your files each week. Add a second workflow only once the first is reliable. Set
the 9am alert. By day 90 it should feel noticeably sharper than day 1. If it does
not, fix the memory before you add any more capability.

Whichever rung you land on, it is a detail. Spend your real effort on the three
pillars: identity, memory, and monitoring.`;
}

/* ------------------------------------------------------------------ */
/* The first-week plan (json {days}) - deterministic                    */
/* ------------------------------------------------------------------ */

/** Minimal shape so this module does not import the full ChiefScores everywhere. */
export interface ScoreLike {
  recommended: { rung: number; name: string };
}

/**
 * The first week, day by day. Everyone does the native foundation first (field
 * guide 10.5.1: most start at days 1 to 14 regardless of final rung), so the
 * week is the universal kickoff, with day 7 pointed at the recommended rung's
 * first real move. Returns the {days} JSON the kit plan infra renders.
 */
export function firstWeekPlanJson(scores: ScoreLike, toolLabel: string): string {
  const rec = scores.recommended;
  const d = RUNG_DETAIL[rec.rung];
  const days = [
    { day: 1, title: "Write your identity file", action: `Open the identity file from this kit, fill the gaps, and paste it into ${toolLabel}.`, minutes: 20 },
    { day: 2, title: "Seed the memory", action: `Run the seed-memory prompt in ${toolLabel} and confirm it can describe you back.`, minutes: 15 },
    { day: 3, title: "Connect your calendar", action: `Connect your calendar (or paste this week's events) and ask for a read of the week.`, minutes: 15 },
    { day: 4, title: "Run a morning brief", action: "Ask for a short brief of today: what matters, what to ignore. Note what was off.", minutes: 15 },
    { day: 5, title: "Correct one thing", action: "Pick the one thing the brief got wrong and write the fix into your identity file.", minutes: 15 },
    { day: 6, title: "Set the 9am alert", action: "Decide how you will notice if the brief stops arriving, and set that one alert.", minutes: 10 },
    { day: 7, title: `Start rung ${rec.rung}: ${d.name}`, action: d.firstStep, minutes: 30 },
  ];
  return JSON.stringify({ days }, null, 2);
}

/* ------------------------------------------------------------------ */
/* Small utils                                                          */
/* ------------------------------------------------------------------ */

function aOrAn(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

export { rungName };
