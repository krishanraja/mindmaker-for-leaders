/**
 * Vibe Coding Field Kit: the compose-wait context-pull prompt (the homework).
 *
 * The intake is a short structured cascade plus one free-text build, so the
 * heavy "interview me" prompts are gone. What remains is the homework prompt
 * shown while the kit composes: a gentle, tool-agnostic ask that pulls in what
 * the person's AI already knows about how they like to work and what has burned
 * them before, so the kit composes from the truth.
 *
 * Platform-agnostic content, tool-specific instructions: the prompt body works
 * anywhere; only the lead-in names the person's chosen tool (or "your AI" when
 * they did not pick one). Pure string builders, paste-ready. No fenced code
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
      return "If you can see a folder or repo I am open in, take a look first. Otherwise just answer from what you know about me.";
    case "lovable":
      return "If we are already building something here, take a look at it first. Otherwise just answer from what you know about me.";
    case "gemini":
      return "Use anything you already know about me from our past conversations. Do not ask me anything you can answer yourself.";
    default:
      return "You may not know much about me yet, so answer honestly from whatever you do have.";
  }
}

/**
 * The compose-wait homework. Tool-agnostic and unintimidating: it asks the
 * person's AI to write back what it already knows about how they like to work,
 * what they tend to build, and what has tripped them up, so the kit can ground
 * its identity and guardrails in real history. The preset prepends the person's
 * build when it has one.
 */
export function contextPullPrompt(tool: KitTool, build?: string): string {
  const buildLine = build
    ? `For context, the one thing I am about to build is: "${build}".`
    : "";

  return `I just finished a short class on building my first small tool with AI, and my kit is being put together for me right now. While I wait, help me catch you up so the kit is built around the real me.

${leadIn(tool)}

${buildLine}

Tell me, in a short and honest list:
- How I like you to work with me (do I want you to explain as you go, just do it, ask before big changes, keep it short, and so on).
- The kinds of things I tend to build or work on.
- Anything I have struggled with before when building with AI (lost context, things breaking, scope creeping, confident wrong answers).

Be specific. No flattery, just what you actually know. When you are done, write it back as a short summary I can paste into my kit.`;
}
