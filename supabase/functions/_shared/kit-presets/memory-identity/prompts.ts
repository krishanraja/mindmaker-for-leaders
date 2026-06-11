/**
 * The Prompt Pack (Memory, Identity and Self-Healing): paste-ready prompts.
 *
 * These are the take-home blocks from the lesson, productized. Every prompt is
 * a deterministic template with light slot-filling (the student's tool and the
 * job they picked). The LLM lives on the student's side of the fence: their AI
 * tool holds months of their real history, and these prompts make it do the
 * mining and the drafting. No LLM call here. No Deno or Node globals.
 */

import type { KitTool } from "../types.ts";

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
 * STEP 01, the hero. Turn the student's history into a working operator for
 * one job. This is the context-pull prompt shown the moment composition starts,
 * so the wait becomes the student's first real action.
 */
export function jobFileBuildPrompt(tool: KitTool, job: string): string {
  const trimmed = job.trim();
  const hasJob = trimmed.length > 0;

  const step1 = hasJob
    ? `Step 1. The job to run for me is: ${trimmed}. If that is clear, go. If it is too broad to be one operator, tell me how you would split it and let me pick.`
    : "Step 1. Ask me one thing first: which job should you run for me? (content marketer, recruiter, analyst, chief of staff, whatever I do a lot). One line from me, then go.";

  return [
    "# Turn my history into a working operator for one job.",
    "",
    step1,
    "",
    `Step 2. ${TOOL_SEARCH_LINES[tool]} ${CANNOT_READ_LINE}`,
    "",
    "Step 3. Confirm it with me, one quick question at a time. Every question answerable in a sentence, off the top of my head. Never make me go away and prepare anything. If you can infer it, propose it and let me just say yes or fix it. Ask:",
    "  1. This is the work you do most in this role: [list]. Right, or fix it.",
    "  2. From your past work, good looks like [X] to me. Fair, or adjust it.",
    "  3. You usually need these to do it: [tools, people, files]. Anything missing?",
    "  4. Anything in this job you never want gotten wrong?",
    "If an answer is vague, do not bounce it back. Offer a sharper version from what you already know and let me confirm.",
    "",
    "Step 4. Write the file and name it after the job, like content-marketer.md, not memory.md. Under a page. Mark anything you guessed with (assumed). This file is the role you play for me, not who I am.",
  ].join("\n");
}

/** STEP 01, the proof. Run cold vs loaded, compare. */
export function beforeAfterTest(job: string): string {
  const role = job.trim().length > 0 ? job.trim() : "this role";
  return [
    "# Prove the job file earns its place.",
    "",
    "RUN 1 (cold): Open a brand-new chat with nothing loaded.",
    `Ask: [one task you do every week in ${role}]`,
    "",
    "RUN 2 (loaded): Paste the job file at the top, then ask the exact same thing.",
    "",
    "The gap between those two answers is the tax you have been paying. Loaded should skip the questions, hit your standard, and pick up where you left off. If the task uses a real email or document, strip names and numbers before pasting it into a tool you do not control.",
  ].join("\n");
}

/** STEP 02. about-me.md build prompt. About the person, never a role. */
export function aboutMeBuildPrompt(tool: KitTool): string {
  return [
    "# Build my about-me file. This is about me, the person, not a role for you to play.",
    "",
    `Step 1. ${TOOL_SEARCH_LINES[tool]} Draft a rough about-me from what you see. If you cannot, say so.`,
    "",
    "Step 2. Confirm it with me, one quick question at a time. Every question answerable in a sentence, off the top of my head. Never make me go away and prepare anything. If you can infer it, propose it and let me just say yes or fix it. Ask:",
    "  1. I think you do [X] for [Y]. Right, or fix it.",
    "  2. What are you spending most of your time on right now?",
    "  3. Who comes to you for help, and with what?",
    "  4. Anything you are known for that I would not want you to get wrong?",
    'If an answer is vague ("I help businesses grow"), do not bounce it back. Offer a sharper version from what you already know and let me confirm.',
    "",
    "Step 3. Write about-me.md from my answers. Under a page, plain sentences. Mark anything you guessed with (assumed). Never describe how you, the AI, should behave. This file is only about me.",
  ].join("\n");
}

/** STEP 02. my-voice.md build prompt. Pulled from things the student wrote. */
export function voiceBuildPrompt(tool: KitTool): string {
  return [
    "# Build my voice file from things I actually wrote.",
    "",
    `Step 1. Find 3 things I wrote recently. ${TOOL_SEARCH_LINES[tool]} If you cannot, ask me to paste 3 short ones. Read the writing itself.`,
    "",
    "Step 2. You do the work, I just react. Show me your read and let me confirm or nudge it, one quick thing at a time:",
    "  1. Here is how you sound to me: [2 lines]. Sound right?",
    "  2. These are the words you reach for most: [short list]. Any you dislike?",
    "  3. Anything you never want to see in your writing?",
    "Keep it to yes, no, or small fixes. Do not ask me to analyse my own writing.",
    "",
    'Step 3. Write my-voice.md: how I sound in 3 or 4 lines, then "Always" (3 habits, each with a real example) and "Never" (3 things to avoid). Pull the examples yourself. Do not make me find them.',
  ].join("\n");
}

/** STEP 02. my-channels.md build prompt. Where the student publishes and why. */
export function channelsBuildPrompt(tool: KitTool): string {
  return [
    "# Build my content channels file.",
    "",
    `Step 1. ${TOOL_SEARCH_LINES[tool]} List the places I seem to post (newsletter, LinkedIn, email, decks, talks, a podcast, wherever) and what I put on each. If you cannot, ask me to name them.`,
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

/** STEP 03. The self-correcting loop. One footer, dropped into any file. */
export function selfCorrectFooter(): string {
  return [
    "# SELF-CORRECTION. Run this on any failure or correction, before anything else:",
    "",
    "1. When the session feels complete, LOG anything that broke and the root cause, not just the symptom. Look back at previous sessions for similar errors that can be easily avoided next time with clearer instructions.",
    '2. PROPOSE one rule that prevents the whole class of this mistake, not the single instance. (Instance: "that 30% stat is invented." Class: "never give a number or cite a source unless I gave it to you or you verified it, and flag anything unverified.")',
    "3. If I pasted my skill file into this session, edit it and reproduce the new file. If it is a Claude skill, use the skill-creator tool to update the skill, keeping it under 1024 characters. If neither, ask me to attach the file.",
    "",
    "Never mark a task complete without running this check first. The same mistake does not get to happen twice.",
  ].join("\n");
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
