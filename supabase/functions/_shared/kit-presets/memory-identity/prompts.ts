/**
 * The Prompt Pack (Memory, Identity and Self-Healing): paste-ready prompts.
 *
 * These are the take-home blocks from the lesson, productized. Every prompt is
 * a deterministic template with light slot-filling. The big change from the
 * thin 2-question original: the intake is now a coherent pick-cascade (role ->
 * first job -> the tasks it covers -> tool -> what it must never store), so the
 * prompts read STRUCTURED answers, not a single open-ended voice blob. A richer
 * intake means the paste-ready prompt arrives already knowing the role, the
 * exact tasks, and the honesty guardrail, so the student confirms rather than
 * explains.
 *
 * The LLM still lives on the student's side of the fence: their AI tool holds
 * months of their real history, and these prompts make it do the mining and the
 * drafting. No LLM call here. No Deno or Node globals.
 */

import type { KitTool } from "../types.ts";

/**
 * The structured answers the cascade collects, read once in preset.ts and
 * threaded through every prompt and renderer. Replaces the old single `job`
 * voice blob. Each field is honest about being empty: an absent value renders a
 * safe placeholder, never an invented specific.
 */
export interface JobInput {
  /** self = a team of one; biz = building this inside a business. */
  pathway: "self" | "biz";
  /** The name the student put on the pack (nameField). May be empty. */
  name: string;
  /** What they do / their role headline (the profile chip). May be empty. */
  role: string;
  /** The role/domain(s) they chose to build an operator for (boxes). */
  domains: string[];
  /** The first job to stand up (startBox), drawn from the domains. */
  job: string;
  /** The tasks that job actually covers (adaptive matrix off the job). */
  tasks: string[];
  /**
   * How they write, in their own words (the voice intake step). This is the
   * fact that makes the AI sound like them; it grounds my-voice.md and the tone
   * line in the job file. May be empty (they can fill the deeper voice profile
   * after the build instead).
   */
  voice: string;
  /** What the operator must never store (the honesty guardrail, tags). */
  neverStore: string[];
}

/** A clean, single-line read of what they typed about their voice, or empty. */
function voiceLine(input: JobInput): string {
  return input.voice.trim().replace(/\s+/g, " ");
}

/** A safe role label for prose: the picked role, else a neutral stand-in. */
function roleLabel(input: JobInput): string {
  return input.role.trim() || (input.pathway === "biz" ? "your team's work" : "the work you do most");
}

/** A safe job label for prose: the chosen first job, else a neutral stand-in. */
function jobLabel(input: JobInput): string {
  return input.job.trim() || "the job you do most";
}

/** Render a picked list as a clean inline phrase, or a placeholder when empty. */
function listOr(items: string[], placeholder: string): string {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  return clean.length > 0 ? clean.join(", ") : placeholder;
}

/**
 * Where each tool should look for the student's history. ChatGPT leans on its
 * memory feature; Claude has Projects and history; Claude Code and Cursor have
 * the repo and past sessions; Gemini has chat history. "none" gets the safe
 * generic that still works if pasted into a fresh chat.
 */
const TOOL_SEARCH_LINES: Record<KitTool, string> = {
  chatgpt:
    "If you can read my past chats, use your memory feature plus our conversation history and any files I have shared, and draft from what you see.",
  claude:
    "If you can read my past chats, search our Projects, our conversation history, and any files I have shared, and draft from what you see.",
  "claude-code":
    "If you can read my history, search this repository, our past sessions, CLAUDE.md, and any docs in the workspace, and draft from what you see.",
  cursor:
    "If you can read my history, search this repository, our past sessions, the rules files, and any docs in the workspace, and draft from what you see.",
  gemini:
    "If you can read my past chats, search our conversation history and any files I have shared, and draft from what you see.",
  lovable:
    "If you can read my history, search our project history and any files I have shared, and draft from what you see.",
  none:
    "If you can read my past chats, read them first and draft from what you see.",
};

/** The line we fall back to when a tool cannot reach history. */
const CANNOT_READ_LINE =
  "If you cannot, say so and ask me to paste 2 or 3 recent things I made in that role.";

/**
 * STEP 01, the hero. Turn the student's history into a working operator for the
 * one job they named in the cascade. Because the cascade already pinned the
 * role, the first job, and the tasks it covers, this prompt hands the student's
 * AI those as the starting truth and asks it to CONFIRM rather than interview
 * from scratch. The honesty guardrail (never-store) is carried in verbatim so
 * the operator is told, up front, what it must keep out of the file.
 */
export function jobFileBuildPrompt(input: JobInput): string {
  const job = jobLabel(input);
  const role = roleLabel(input);
  const tasks = input.tasks.map((t) => t.trim()).filter(Boolean);
  const never = input.neverStore.map((n) => n.trim()).filter(Boolean);
  const said = voiceLine(input);

  const lines: string[] = [
    "# Turn my history into a working operator for one job.",
    "",
    `Step 1. Narrow your field of view. In this kind of session you are not my everything; you are one thing: ${job}${
      input.role.trim() ? ` (my role: ${role})` : ""
    }. This is one operator with one job, not my whole work. If it is still too broad to be one operator, tell me how you would split it and let me pick.`,
  ];

  if (tasks.length > 0) {
    lines.push(
      "",
      `Step 2. This job covers these tasks for me: ${tasks.join(
        ", ",
      )}. Treat that as the scope. Add anything obvious you see in my history, and flag anything in the list you think does not belong.`,
    );
  } else {
    lines.push(
      "",
      "Step 2. Ask me, in one line, the handful of tasks this job actually covers, then treat that as the scope.",
    );
  }

  lines.push(
    "",
    `Step 3. ${TOOL_SEARCH_LINES[input.tool]} ${CANNOT_READ_LINE}`,
    "",
    "Step 4. Confirm it with me, one quick question at a time. Every question answerable in a sentence, off the top of my head. Never make me go away and prepare anything. If you can infer it, propose it and let me just say yes or fix it. Ask:",
    "  1. This is the work you do most in this role: [list]. Right, or fix it.",
    "  2. From your past work, good looks like [X] to me. Fair, or adjust it.",
    "  3. You usually need these to do it: [tools, people, files]. Anything missing?",
    "  4. Anything in this job you never want gotten wrong?",
    "If an answer is vague, do not bounce it back. Offer a sharper version from what you already know and let me confirm.",
  );

  if (said) {
    lines.push(
      "",
      `Step 5. Match my voice. This is how I described how I write: "${said}". Hold to it in everything this operator produces for me. My voice does not change when the job does, so carry this same tone into every file you write for me.`,
    );
  } else {
    lines.push(
      "",
      "Step 5. Match my voice. From the writing of mine you can see, sound like me, not like generic AI. If you cannot see enough, ask me to paste two short things I wrote and read the tone from those.",
    );
  }

  if (never.length > 0) {
    lines.push(
      "",
      `Step 6. Hard rule for this file: never write down or store ${never.join(
        ", ",
      )}. If any of that shows up while you are drafting, leave it out and tell me you did.`,
    );
  }

  lines.push(
    "",
    `Step ${never.length > 0 ? 7 : 6}. Write the file and name it after the job, like ${jobFilename(
      input,
    )}, not memory.md. Under a page, in my voice. Mark anything you guessed with (assumed). This file is the role you play for me, not who I am.`,
  );

  return lines.join("\n");
}

/** STEP 01, the proof. Run cold vs loaded, compare. Reads the chosen job. */
export function beforeAfterTest(input: JobInput): string {
  const role = jobLabel(input);
  const firstTask = input.tasks.map((t) => t.trim()).filter(Boolean)[0];
  const taskLine = firstTask
    ? `Ask: ${firstTask}`
    : `Ask: [one task you do every week in ${role}]`;
  return [
    "# Prove the job file earns its place.",
    "",
    "RUN 1 (cold): Open a brand-new chat with nothing loaded.",
    taskLine,
    "",
    "RUN 2 (loaded): Paste the job file at the top, then ask the exact same thing.",
    "",
    "The gap between those two answers is the tax you have been paying. Loaded should skip the questions, hit your standard, and pick up where you left off. If the task uses a real email or document, strip names and numbers before pasting it into a tool you do not control.",
  ].join("\n");
}

/** STEP 02. about-me.md build prompt. About the person, never a role. */
export function aboutMeBuildPrompt(input: JobInput): string {
  const role = input.role.trim();
  const seed = role
    ? `  1. I think you work as ${role}. Right, or fix it.`
    : "  1. I think you do [X] for [Y]. Right, or fix it.";
  return [
    "# Build my about-me file. This is about me, the person, not a role for you to play.",
    "",
    `Step 1. ${TOOL_SEARCH_LINES[input.tool]} Draft a rough about-me from what you see. If you cannot, say so.`,
    "",
    "Step 2. Confirm it with me, one quick question at a time. Every question answerable in a sentence, off the top of my head. Never make me go away and prepare anything. If you can infer it, propose it and let me just say yes or fix it. Ask:",
    seed,
    "  2. What are you spending most of your time on right now?",
    "  3. Who comes to you for help, and with what?",
    "  4. Anything you are known for that I would not want you to get wrong?",
    'If an answer is vague ("I help businesses grow"), do not bounce it back. Offer a sharper version from what you already know and let me confirm.',
    "",
    "Step 3. Write about-me.md from my answers. Under a page, plain sentences. Mark anything you guessed with (assumed). Never describe how you, the AI, should behave. This file is only about me.",
  ].join("\n");
}

/**
 * STEP 02. my-voice.md build prompt. Pulled from things the student wrote, and
 * grounded in what they already told us about their voice at intake (the voice
 * step). When they gave us a voice line, the prompt hands it over as the
 * starting read so their AI confirms and sharpens it rather than guessing cold.
 */
export function voiceBuildPrompt(input: JobInput): string {
  const said = voiceLine(input);
  const lines: string[] = [
    "# Build my voice file from things I actually wrote.",
    "",
  ];
  if (said) {
    lines.push(
      `Here is how I already described my own voice: "${said}". Treat that as the starting read, then check it against the writing below and sharpen it.`,
      "",
    );
  }
  lines.push(
    `Step 1. Find 3 things I wrote recently. ${TOOL_SEARCH_LINES[input.tool]} If you cannot, ask me to paste 3 short ones. Read the writing itself.`,
    "",
    "Step 2. You do the work, I just react. Show me your read and let me confirm or nudge it, one quick thing at a time:",
    said
      ? "  1. Lining up what you told me with how you actually write, here is how you sound: [2 lines]. Sound right?"
      : "  1. Here is how you sound to me: [2 lines]. Sound right?",
    "  2. These are the words you reach for most: [short list]. Any you dislike?",
    "  3. Anything you never want to see in your writing?",
    "Keep it to yes, no, or small fixes. Do not ask me to analyse my own writing.",
    "",
    'Step 3. Write my-voice.md: how I sound in 3 or 4 lines, then "Always" (3 habits, each with a real example) and "Never" (3 things to avoid). Pull the examples yourself. Do not make me find them.',
  );
  return lines.join("\n");
}

/** STEP 02. my-channels.md build prompt. Where the student publishes and why. */
export function channelsBuildPrompt(input: JobInput): string {
  return [
    "# Build my content channels file.",
    "",
    `Step 1. ${TOOL_SEARCH_LINES[input.tool]} List the places I seem to post (newsletter, LinkedIn, email, decks, talks, a podcast, wherever) and what I put on each. If you cannot, ask me to name them.`,
    "",
    "Step 2. Confirm the list with me, one quick question at a time. Keep every answer to a sentence or a pick:",
    "  1. Here are the channels I found: [list]. Which are real, which do I drop?",
    "  2. For each one, who is it for, in a few words?",
    "  3. What is each for: audience, sales, recruiting, or thinking out loud? Pick one.",
    "Do not ask me to write rules or dig up examples. Infer the rest and I will correct it.",
    "",
    "Step 3. Write my-channels.md with one short block per channel: who it is for, what it is for, and the format I tend to use. A few lines each. If two channels do the same job, say so.",
  ].join("\n");
}

/**
 * STEP 03. The self-correcting loop. One footer, dropped into any file. When
 * the student named things the operator must never store, those are baked into
 * the loop as a standing rule so the honesty guardrail is enforced on every run,
 * not just at build time.
 */
export function selfCorrectFooter(input?: JobInput): string {
  const never = input
    ? input.neverStore.map((n) => n.trim()).filter(Boolean)
    : [];
  const lines = [
    "# SELF-CORRECTION. Run this on any failure or correction, before anything else:",
    "",
    "1. When the session feels complete, LOG anything that broke and the root cause, not just the symptom. Look back at previous sessions for similar errors that can be easily avoided next time with clearer instructions.",
    '2. PROPOSE one rule that prevents the whole class of this mistake, not the single instance. (Instance: "that 30% stat is invented." Class: "never give a number or cite a source unless I gave it to you or you verified it, and flag anything unverified.")',
    "3. If I pasted my skill file into this session, edit it and reproduce the new file. If it is a Claude skill, use the skill-creator tool to update the skill, keeping it under 1024 characters. If neither, ask me to attach the file.",
  ];
  if (never.length > 0) {
    lines.push(
      `4. Standing rule, never to be relaxed: never store or write down ${never.join(
        ", ",
      )}. If a correction would require keeping any of that, refuse and tell me.`,
    );
  }
  lines.push(
    "",
    "Never mark a task complete without running this check first. The same mistake does not get to happen twice.",
  );
  return lines.join("\n");
}

/** Power-up. Turn the files into a single Claude skill. */
export function makeItASkillPrompt(): string {
  return [
    "# Turn these files into a Claude skill.",
    "",
    "Using the skill creator, build a skill from the files we just made. Hold a hard line between two things and never blur them: the role you play for a given job, and who I am (my identity, my voice, my channels). The role can change. I do not.",
    "",
    "If a skill like this already exists, update it instead of making a duplicate. When you are done, tell me what is in the skill and what you deliberately left out.",
  ].join("\n");
}

/** Power-up. Weekly hygiene pass. Audit the context and tighten it. */
export function weeklyHygienePrompt(tool: KitTool): string {
  const isClaude = tool === "claude" || tool === "claude-code";
  const lookLine = isClaude
    ? "Look at all my context files: the markdown files I have dropped in here, and my installed skills."
    : "Look at all my context files: the markdown files I have dropped in here.";
  const actLine = isClaude
    ? "Then act on it. Use the skill creator to update the skills directly so I can review and save them."
    : "Then act on it. Hand me the updated markdown files, ready to drop in over the old ones.";
  return [
    "# Weekly hygiene. Audit my context and tighten it.",
    "",
    `${lookLine} Go through them and tell me:`,
    "1. What is missing. Anything you keep having to ask me for that should already be written down.",
    "2. What changed this week. Any new decision, recurring task, or preference I revealed in the last seven days that is worth keeping.",
    "3. What keeps breaking. Any mistake that has happened more than once, and the single rule that would end it.",
    "",
    actLine,
  ].join("\n");
}

/** Kebab filename for the job file, like content-marketer.md, from the job. */
export function jobFilename(input: JobInput): string {
  const slug = jobLabel(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 4)
    .join("-");
  return `${slug.length > 0 ? slug : "the-job"}.md`;
}
