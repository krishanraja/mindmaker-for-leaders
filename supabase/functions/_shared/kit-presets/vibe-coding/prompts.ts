/**
 * Vibe Coding Field Kit: the compose-wait context-pull prompt.
 *
 * The intake is now a structured pick-cascade, so the heavy "interview me"
 * prompts the old spec-interviewer and context-capsule artifacts used are gone.
 * What remains is the one prompt shown on the compose-wait screen: a gentle,
 * tool-agnostic ask that turns the wait into the student's first real action.
 *
 * Pure string builders, paste-ready for the student's tool. No fenced code
 * blocks inside these strings; callers wrap them where needed. No Deno or Node
 * globals; plain TypeScript only.
 */

import type { KitTool } from "../types.ts";

function leadIn(tool: KitTool): string {
  switch (tool) {
    case "claude":
      return "Use anything you already know about me from our past chats or shared Projects. Do not ask me anything you can answer from there.";
    case "chatgpt":
      return "Use anything you already know about me from your memory and our past chats. Do not ask me anything you can answer from memory.";
    case "cursor":
    case "claude-code":
      return "If you can see a folder or repo I am open in, take a look first. Otherwise just start with the questions.";
    case "lovable":
      return "If we are already building something here, take a look at it first. Otherwise just start with the questions.";
    case "gemini":
      return "Use anything you already know about me from our past conversations. Do not ask me anything you can answer yourself.";
    default:
      return "You do not know anything about me yet, so the questions below are the whole job. Keep them simple.";
  }
}

/**
 * The compose-wait context pull. Tool-agnostic and unintimidating: it asks the
 * student to walk through the one workflow they picked, in their own words, so
 * the kit composes from the truth. The preset prepends the picked workflow when
 * it has one.
 */
export function contextPullPrompt(tool: KitTool, workflow?: string): string {
  const focus = workflow
    ? `Walk me through how I do this today, step by step, the way you would explain it to a friend: "${workflow}".`
    : "Ask me to describe, in my own words, one thing I do over and over that a tool could do for me. Walk me through it step by step, the way I would explain it to a friend.";

  return `I just finished a short class on building my first small tool with AI, and the kit is being put together for me right now. While I wait, help me get clear on the one thing I am building.

${leadIn(tool)}

${focus}

Ask me one short question at a time, plain language, no jargon. Cover: what kicks it off, where the information lives, what the result should look like, and the one part I would never want a tool to do without me. Keep it light; this should take five minutes, not fifty.

When we are done, write it back to me as a short, clear summary I can paste into my build. No flattery, just the facts of how the workflow works.`;
}
