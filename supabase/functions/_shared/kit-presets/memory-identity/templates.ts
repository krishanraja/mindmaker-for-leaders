/**
 * The Prompt Pack: identity-file scaffolds.
 *
 * Renders about-me.md, my-voice.md and my-channels.md, plus a short README.
 * Each file carries the build prompt that fills it, so the student's AI does
 * the drafting from their history; the student only confirms. Deterministic
 * string building, no LLM, no globals.
 */

import type { KitTool } from "../types.ts";
import { KIT_TOOL_LABELS } from "../types.ts";
import {
  aboutMeBuildPrompt,
  channelsBuildPrompt,
  selfCorrectFooter,
  voiceBuildPrompt,
} from "./prompts.ts";

const FENCE = "```";

export interface IdentityInput {
  tool: KitTool;
  /** The job the student picked, used only to relate identity to the role file. */
  job: string;
}

function fillHeader(tool: KitTool, what: string): string[] {
  const toolLabel = KIT_TOOL_LABELS[tool];
  return [
    "## How to fill this file",
    `Paste the prompt below into ${toolLabel}. It mines your history for ${what}, drafts the file, and confirms it with you one quick question at a time. Paste its output into the sections underneath, then cut anything that does not sound like you. Two minutes, done.`,
    "",
  ];
}

export function renderAboutMe(input: IdentityInput): string {
  return [
    "# about-me.md",
    "",
    "Who I am, how I decide, what I am working toward. This is about me, the person, never a role the AI plays.",
    "",
    ...fillHeader(input.tool, "who you are and what you are known for"),
    FENCE,
    aboutMeBuildPrompt(input.tool),
    FENCE,
    "",
    "## Who I am",
    "- [FILL IN from the draft: what you do, for whom]",
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

export function renderVoice(input: IdentityInput): string {
  return [
    "# my-voice.md",
    "",
    "How I sound. Drop this into any writing task on its own and the output comes back in my voice.",
    "",
    ...fillHeader(input.tool, "your actual tone and phrasing, from things you wrote"),
    FENCE,
    voiceBuildPrompt(input.tool),
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

export function renderChannels(input: IdentityInput): string {
  return [
    "# my-channels.md",
    "",
    "Where I publish and what each place is for. One short block per channel.",
    "",
    ...fillHeader(input.tool, "the places you post and what you put on each"),
    FENCE,
    channelsBuildPrompt(input.tool),
    FENCE,
    "",
    "## Channels",
    "- [FILL IN from the draft: one block per channel - who it is for, what it is for, the format you use]",
    "",
  ].join("\n");
}

export function renderIdentityReadme(input: IdentityInput): string {
  const role = input.job.trim().length > 0 ? input.job.trim() : "the job you run most";
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
    `Identity is who you are. A job file (like a ${role} operator) is a role the AI plays. Keep them apart, or the tool confuses who you are with what you once asked it to be. The role can change. You do not.`,
    "",
    "## Make every file self-correcting",
    "Paste this footer at the bottom of any file above, and at the bottom of your job file. It turns every correction into a rule the system keeps.",
    "",
    FENCE,
    selfCorrectFooter(),
    FENCE,
    "",
  ].join("\n");
}
