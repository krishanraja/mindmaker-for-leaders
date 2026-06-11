/**
 * Autonomous Business Pack: context-pull miner prompts.
 *
 * Deterministic templates with slot-filling, varied per tool. The student's
 * AI holds their history; these prompts make it do the mining. No LLM here,
 * the LLM is on the student's side of the fence.
 */

import type { KitTool } from "../types.ts";

/**
 * Where each tool should look. ChatGPT leans on its memory feature; Claude
 * has Projects and history; Claude Code and Cursor have the repo and past
 * sessions; Gemini has chat history. Everything else gets the safe generic.
 */
const TOOL_SEARCH_LINES: Record<KitTool, string> = {
  chatgpt:
    "Use your memory feature plus our full conversation history and any files I have shared with you.",
  claude:
    "Search our Projects, our full conversation history, and any files I have shared with you.",
  "claude-code":
    "Search this repository, our past sessions, CLAUDE.md, and any docs or notes in the workspace.",
  cursor:
    "Search this repository, our past sessions, the rules files, and any docs or notes in the workspace.",
  gemini:
    "Search our chat history and any files I have shared with you.",
  lovable:
    "Search our project history and any files I have shared with you.",
  none:
    "Search our conversation history and any files I have shared with you.",
};

/**
 * The workflow miner. Pulls how the student actually does one workflow:
 * process, corrections, voice, tools, open problems. Output is a CONTEXT
 * BLOCK they paste back into CTRL.
 */
export function workflowMinerPrompt(tool: KitTool, workflow: string): string {
  const target =
    workflow.trim().length > 0 ? workflow.trim() : "[describe your workflow here]";
  return [
    `${TOOL_SEARCH_LINES[tool]} Find everything relevant to this workflow: ${target}.`,
    "",
    "I want: how I describe it, the steps I follow, the tools I mention, mistakes I have corrected you on, and my tone and phrasing while doing it.",
    "",
    "Output a CONTEXT BLOCK with these sections:",
    "- PROCESS AS I ACTUALLY DO IT",
    "- MY RULES AND CORRECTIONS",
    "- MY VOICE MARKERS",
    "- TOOLS AND SYSTEMS NAMED",
    "- OPEN PROBLEMS",
    "",
    "Format: markdown, under 600 words, my actual words wherever possible. Do not invent anything; if a section is thin, say so.",
  ].join("\n");
}

/**
 * The voice miner. Pulls tone and phrasing, not process. Output fills the
 * voice.md anchor file.
 */
export function voiceMinerPrompt(tool: KitTool): string {
  return [
    `${TOOL_SEARCH_LINES[tool]} This time mine for how I sound, not what I do.`,
    "",
    "Find: phrases I repeat, how I open and close messages, how blunt or warm I am, words I never use, how I give feedback, and how my client voice differs from my internal voice.",
    "",
    "Output a VOICE BLOCK with these sections:",
    "- MY VOICE MARKERS (specific, quotable patterns)",
    "- PHRASES I ACTUALLY USE (verbatim examples)",
    "- WORDS AND PATTERNS I AVOID",
    "- REGISTER (how formal, and when it shifts)",
    "",
    "Format: markdown, under 400 words, my actual words wherever possible. I will paste this into a voice.md file my AI reads before drafting anything as me.",
  ].join("\n");
}
