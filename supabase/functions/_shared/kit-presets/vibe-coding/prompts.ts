/**
 * Vibe Coding Field Kit: per-tool prompt variants.
 *
 * Pure string builders, paste-ready for the student's tool. No fenced code
 * blocks inside these strings; the artifact renderers wrap them in fences.
 */

import type { KitTool } from "../types.ts";

/**
 * The fixed spec format every interview must emit. The five-part brief, the
 * acceptance pack and the skill seed all consume this shape, so the headings
 * and order never change.
 */
export const SPEC_FORMAT = `# Spec: [name of the build]

Owner: [you]
Problem: [one sentence: who hurts, when, how often]
Users: [who touches it: just you, your team, customers]
Trigger: [what kicks it off: a time, an email, a click]
Inputs: [where the data lives and how it gets in]
Steps: [the happy path, numbered, seven steps maximum]
Output: [exactly what it produces and where it lands]
Edge cases: [the top three ways this goes sideways]
Out of scope: [what version one will not do]
Done means: [three checks a stranger could run without asking you]`;

function specLeadIn(tool: KitTool): string {
  switch (tool) {
    case "claude":
      return "Before your first question, check our past chats and any Projects we share for what you already know about me and my work. Do not ask me anything you can answer from there.";
    case "chatgpt":
      return "Before your first question, check your memory for what you already know about me and my work. Do not ask me anything you can answer from memory.";
    case "cursor":
    case "claude-code":
      return "Before your first question, look at the repo or folder you are open in: the README, the structure, recent changes. Ask me early whether this build lives here or starts fresh.";
    case "lovable":
      return "Before your first question, look at the app we are building here: its pages, components and data. Ask me early whether this build extends the app or starts a new one.";
    case "gemini":
      return "Before your first question, use anything you already know about me from our past conversations. Do not ask me anything you can answer yourself.";
    default:
      return "You know nothing about me yet, so the interview carries the whole load. Start with the basics and skip nothing.";
  }
}

export interface SpecPromptArgs {
  /** Role label, e.g. "Founder" or "Team lead". */
  role: string;
  /** The grind answer in the student's own words; empty string if skipped. */
  grind: string;
  /** Their definition of shipped, e.g. "a working tool you use yourself". */
  win: string;
}

/**
 * The paste-ready prompt that makes the student's AI interview them and emit
 * a one-page spec in the fixed format above.
 */
export function specInterviewerPrompt(tool: KitTool, args: SpecPromptArgs): string {
  const grindLine = args.grind
    ? `The workflow I want to fix, in my own words: "${args.grind}"`
    : "I will describe the workflow I want to fix when you ask.";

  return `I want to build something small and I need a spec before I touch anything. Interview me, then write it.

${specLeadIn(tool)}

How to run the interview:
- Ask 15 to 20 questions, one at a time. Wait for my answer before the next one.
- Plain language, short questions, no multi-part questions.
- Start broad (what hurts, how often, who is involved), then narrow (inputs, outputs, edge cases, what done means).
- If my scope sounds bigger than a weekend, push back once and propose a smaller cut.
- Do not start building anything. The only output of this session is the spec.

Who I am: ${args.role}.
${grindLine}
Shipped, for me, means ${args.win}.

When the interview is done, write the spec on one page in exactly this format:

${SPEC_FORMAT}`;
}

function capsuleLeadIn(tool: KitTool): string {
  switch (tool) {
    case "claude":
      return "Review everything you know about me: our past chats, any Projects we share, anything I have told you about my work.";
    case "chatgpt":
      return "Review everything you know about me: your memory, my custom instructions, our past conversations.";
    case "cursor":
      return "Review everything you can see: this repo, any rules files, the README, recent commits, and anything I have told you in chat.";
    case "claude-code":
      return "Review everything you can see: CLAUDE.md, the repo structure, recent commits, and anything I have told you in this session.";
    case "lovable":
      return "Review everything you can see in this project: the app's pages, its data model, and the prompts I have given you so far.";
    case "gemini":
      return "Review everything you know about me from our past conversations and anything connected to this account.";
    default:
      return "You know nothing about me yet, so the interview below is the whole job.";
  }
}

/**
 * The Context Capsule pull prompt. The student runs it in their tool; the
 * capsule comes back in a fixed shape that CTRL can parse at /kit/me.
 */
export function contextCapsulePrompt(tool: KitTool): string {
  return `I want a Context Capsule: a one-page summary of who I am and how I work, written so any AI tool could pick it up cold.

${capsuleLeadIn(tool)}

Then interview me for what is missing. Maximum 10 questions, one at a time, and skip anything you already know. Cover: my role and what the business sells, how I like things written, the workflows I repeat, the tools I live in, hard constraints and never-dos, and what I should build first.

When you have enough, write the capsule in markdown with exactly these headings and nothing else:

# Context Capsule

## Role and scope
## How I communicate
## Recurring workflows
## Tools and systems
## Constraints and never-dos
## First build candidate

Keep it tight: bullet points, specifics, no flattery. If you are not sure about something, leave it out rather than guessing.

When it is done, give me the whole capsule in one block so I can copy it. I will paste it back into CTRL at /kit/me so every artifact it builds for me gets sharper.`;
}
