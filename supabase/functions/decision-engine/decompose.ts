// Decompose a decision statement into typed, falsifiable claims grounded in
// the leader's Memory Web context. Also surfaces contradictions between the
// decision and the leader's stated objectives / blockers / recent decisions.
// This typing step is the biggest reliability lever: models classify reliably
// even where they adjudicate unreliably.

import type { UserContext } from "../_shared/user-context.ts";
import { reason, parseLLMJson } from "./llm.ts";
import type { DecomposeResult } from "./types.ts";

const SYSTEM = `You are the decomposition stage of a decision-verification engine for senior leaders.
Your job is to break a decision or business case into the specific claims and assumptions it rests on, and to type each one. You do not judge whether the decision is good. You only decompose.

Claim types:
- factual: a checkable fact about the world right now (verifiable against sources)
- market: a claim about market size, growth, pricing, or competitors (verifiable)
- causal: a claim that X will cause Y (partially verifiable, often contested)
- assumption: something taken as given that has not been validated (not web-verifiable)
- forecast: a projection about the future (not web-verifiable)

Rules:
- Extract 3 to 8 claims. Each must be a single, specific, testable statement.
- Mark is_load_bearing true for claims where, if false, the whole decision fails.
- profile_tensions: list contradictions between this decision and the leader's stated objectives, blockers, or recent decisions. Empty array if none.
- Return ONLY valid JSON. No commentary, no markdown.`;

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
    { "text": "specific testable claim", "type": "factual|market|causal|assumption|forecast", "is_load_bearing": true }
  ],
  "profile_tensions": [
    { "description": "how this decision contradicts a stated objective/blocker/decision", "severity": "low|medium|high" }
  ]
}`;

  const raw = await reason(SYSTEM, user, 2500);
  const parsed = parseLLMJson<DecomposeResult>(raw);

  // Defensive normalisation.
  const validTypes = new Set(["factual", "market", "causal", "assumption", "forecast"]);
  parsed.claims = (parsed.claims ?? [])
    .filter((c) => c && typeof c.text === "string" && c.text.trim().length > 0)
    .map((c) => ({
      text: c.text.trim().slice(0, 600),
      type: validTypes.has(c.type) ? c.type : "factual",
      is_load_bearing: Boolean(c.is_load_bearing),
    }))
    .slice(0, 8);
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
