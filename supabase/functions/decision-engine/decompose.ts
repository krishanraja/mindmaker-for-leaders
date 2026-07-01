// Decompose a decision statement into typed, falsifiable claims grounded in
// the leader's Memory Web context. Also surfaces contradictions between the
// decision and the leader's stated objectives / blockers / recent decisions.
// This typing step is the biggest reliability lever: models classify reliably
// even where they adjudicate unreliably.

import type { UserContext } from "../_shared/user-context.ts";
import { reason, parseLLMJson } from "./llm.ts";
import type { DecomposeResult } from "./types.ts";

const SYSTEM = `You are the decomposition stage of CTRL's decision engine for senior leaders.

CTRL is ONLY about building, orchestrating, productizing, and getting to market the AI-native version of a business. Every decision you decompose is an AI-native decision (it has already passed the reframe stage). You reason strictly within the AI-native decision model below and never drift into generic business advice. You do not judge whether the decision is good. You only decompose it into the specific claims and assumptions it rests on, and type each one.

The AI-native lifecycle (where the decision lives, for context only):
- build: what to build WITH AI inside the business (workflows, tools, agents)
- orchestrate: how AI and people are wired together (the agentic org, handoffs, the autonomy line)
- productize: turning AI capability into the offering (the AI-native version of what you sell)
- gtm: how that AI-native product reaches customers (positioning, distribution, pricing of the AI offering)
- substrate: the operating layer underneath (the AI knowing you and the business: knowledge, voice, guardrails)

The AI-native FORCES (tag every claim with the single force it most bears on, using the key):
- capability (Capability fit): can the AI actually do this yet
- economics (Economics): cost to build plus run vs the value
- risk (Autonomy and risk): how much AI can own, where the human checkpoint is, the failure surface
- build_buy (Build vs buy): your build vs a vendor or model, lock-in vs portability
- team (Org readiness): the skills and structure to run it
- timing (Sequencing): is this the right next move, or does something come first

Claim types:
- factual: a checkable fact about the world right now (verifiable against sources)
- market: a claim about the AI market, model capability, AI pricing, or competitors (verifiable)
- causal: a claim that X will cause Y (partially verifiable, often contested)
- assumption: something taken as given that has not been validated (not web-verifiable)
- forecast: a projection about the future (not web-verifiable)

Rules:
- Extract 3 to 8 claims. Each must be a single, specific, testable statement, and each must stay about the AI-native decision (capability, agents, the AI stack, AI economics, autonomy, the AI offering). Do not introduce generic business claims.
- Mark is_load_bearing true for claims where, if false, the whole decision fails.
- Tag each claim with "dimension": the single force it most bears on (one of: capability | economics | risk | build_buy | team | timing).
- force_labels: for each force that at least one claim touches, give a 1-2 word specific concern this decision raises for that force (e.g. economics -> "Token cost", risk -> "Hallucination", capability -> "RAG accuracy"). Only include forces that appear. Keep each to 1-2 words.
- profile_tensions: list contradictions between this decision and the leader's stated objectives, blockers, or recent decisions. Empty array if none.
- Honesty floor: never fabricate a claim or a fact. Return ONLY valid JSON. No commentary, no markdown.`;

function contextBlock(ctx: UserContext): string {
  const lines: string[] = [];
  if (ctx.role) lines.push(`Role: ${ctx.role}`);
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.industry) lines.push(`Industry: ${ctx.industry}`);
  if (ctx.objectives.length) lines.push(`Stated objectives: ${ctx.objectives.join("; ")}`);
  if (ctx.blockers.length) lines.push(`Known blockers: ${ctx.blockers.join("; ")}`);
  if (ctx.recentDecisions.length) lines.push(`Recent decisions: ${ctx.recentDecisions.join("; ")}`);
  if (ctx.confirmedPatterns.length) lines.push(`Behavioural patterns: ${ctx.confirmedPatterns.join("; ")}`);
  return lines.length ? lines.join("\n") : "No profile context available.";
}

export async function decompose(statement: string, ctx: UserContext): Promise<DecomposeResult> {
  const user = `Leader context:
${contextBlock(ctx)}

Decision or business case:
"""
${statement}
"""

Return JSON exactly in this shape:
{
  "title": "a short 3-6 word title for this decision",
  "decision_kind": "binary | directional | investment | hiring | gtm | other",
  "claims": [
    { "text": "specific testable claim", "type": "factual|market|causal|assumption|forecast", "is_load_bearing": true, "dimension": "capability|economics|risk|build_buy|team|timing" }
  ],
  "force_labels": { "economics": "Token cost", "risk": "Hallucination" },
  "profile_tensions": [
    { "description": "how this decision contradicts a stated objective/blocker/decision", "severity": "low|medium|high" }
  ]
}`;

  const raw = await reason(SYSTEM, user, 2500);
  const parsed = parseLLMJson<DecomposeResult>(raw);

  // Defensive normalisation.
  const validTypes = new Set(["factual", "market", "causal", "assumption", "forecast"]);
  const validDimensions = new Set(["capability", "economics", "risk", "build_buy", "team", "timing"]);
  // Infer a force from the claim type when the model omits/mis-tags the dimension, so every new
  // claim is always tagged (mirrors the client-side legacy fallback).
  const dimFromType: Record<string, "capability" | "economics" | "risk" | "build_buy" | "team" | "timing"> = {
    market: "economics", causal: "capability", forecast: "timing", assumption: "risk", factual: "capability",
  };
  parsed.claims = (parsed.claims ?? [])
    .filter((c) => c && typeof c.text === "string" && c.text.trim().length > 0)
    .map((c) => {
      const type = validTypes.has(c.type) ? c.type : "factual";
      const dimension = validDimensions.has((c as { dimension?: string }).dimension ?? "")
        ? (c as { dimension: typeof dimFromType[string] }).dimension
        : dimFromType[type];
      return {
        text: c.text.trim().slice(0, 600),
        type,
        is_load_bearing: Boolean(c.is_load_bearing),
        dimension,
      };
    })
    .slice(0, 8);
  // force_labels: keep only valid force keys, clamp each to a short 1-2 word label.
  const rawLabels = (parsed as { force_labels?: Record<string, unknown> }).force_labels ?? {};
  const force_labels: Partial<Record<string, string>> = {};
  for (const [k, v] of Object.entries(rawLabels)) {
    if (validDimensions.has(k) && typeof v === "string" && v.trim()) {
      force_labels[k] = v.trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 24);
    }
  }
  parsed.force_labels = force_labels as DecomposeResult["force_labels"];
  parsed.profile_tensions = (parsed.profile_tensions ?? [])
    .filter((t) => t && typeof t.description === "string")
    .map((t) => ({
      description: t.description.slice(0, 400),
      severity: (["low", "medium", "high"].includes(t.severity) ? t.severity : "medium") as "low" | "medium" | "high",
    }))
    .slice(0, 5);
  if (!parsed.title) parsed.title = statement.slice(0, 60);
  const validKinds = new Set(["binary", "directional", "investment", "hiring", "gtm", "other"]);
  if (!validKinds.has(parsed.decision_kind)) parsed.decision_kind = "other";
  return parsed;
}
