// Stage 0: the AI-native reframe. Runs at the FRONT of the pipeline.
//
// CTRL is ONLY about building, orchestrating, productizing, and getting to
// market the AI-native version of a business (docs/MAIN-APP-POLISH-SPEC.md
// section 0). The engine must never reason on a general-business decision as-is
// and must never refuse it. So before decompose/verify/advise, we:
//   1. classify whether the submitted statement is already AI-native, and
//   2. if it is general business, reframe it into the AI-native version of that
//      decision (the LLM does the context-specific reframe; the deterministic
//      templatedReframe is the fallback so we never silently pass it through).
//
// The reframe is surfaced HONESTLY downstream: the pipeline carries BOTH the
// original statement and the reframed one plus a short note, and the rest of the
// engine reasons on the reframed statement. Nothing is silently swapped.

import { reason, parseLLMJson } from "./llm.ts";
import { stripEmDashes } from "../_shared/sanitize.ts";
import {
  classifyDecision,
  isAiNativeDecision,
  templatedReframe,
  LIFECYCLE_STAGES,
  type LifecycleStage,
  REFRAME_NOTE,
} from "../_shared/decision-ai-native.ts";

export interface ReframeResult {
  /** The statement the rest of the pipeline reasons on (reframed if needed, else the original). */
  effectiveStatement: string;
  /** The leader's original, untouched statement. Always carried. */
  originalStatement: string;
  /** true when a reframe happened (the effective statement differs from the original). */
  reframed: boolean;
  /** The honest, leader-facing note explaining the reframe. null when none happened. */
  reframeNote: string | null;
  /** Which AI-native lifecycle stage the (reframed) decision lives in, when known. */
  lifecycleStage: LifecycleStage | null;
}

const SYSTEM = `You are the reframe stage of CTRL's decision engine.

CTRL is ONLY about building, orchestrating, productizing, and getting to market the AI-native version of a business. It is NOT a general business advisor and never gives general business advice.

Your single job: given a decision a leader submitted, decide if it is already AI-native (about deploying, building, orchestrating, or selling AI), and if it is NOT, reframe it into the AI-native version of that same decision so the rest of the engine can reason on it.

The AI-native lifecycle a decision can live in:
- build: what to build WITH AI inside the business (internal workflows, tools, agents)
- orchestrate: how AI and people are wired together (the agentic org, handoffs, the autonomy line)
- productize: turning AI capability into the offering (the AI-native version of what you sell)
- gtm: how that AI-native product reaches customers (positioning, distribution, pricing of the AI offering itself)
- substrate: the operating layer underneath (the AI knowing you and the business: knowledge, voice, guardrails)

Reframe principle (do NOT answer the general decision, pull it to its AI-native version):
- "Should I hire a VP of Sales?" -> "Before you hire, should an agent own part of the sales motion first, and what does the human role become?"
- "Should we raise prices?" -> "Should the AI-native version of your offer change what you sell and how you price the AI capability itself?"
- "Should we move upmarket?" -> "What would the AI-native version of your product need to be to win upmarket?"

Rules:
- If the decision is ALREADY AI-native, set is_ai_native true and return the statement unchanged as reframed_statement.
- If it is general business, set is_ai_native false and write reframed_statement as the AI-native version of that decision. Keep the leader's real subject; do not invent facts, numbers, or context. The reframe is a question that pulls them to the AI-native lens.
- Never refuse. Never give general business advice. No em dashes. No preamble.
- Return ONLY valid JSON.`;

function isLifecycle(v: unknown): v is LifecycleStage {
  return typeof v === "string" && (LIFECYCLE_STAGES as readonly string[]).includes(v);
}

interface LLMReframe {
  is_ai_native?: boolean;
  reframed_statement?: string;
  lifecycle_stage?: string;
}

/**
 * Run the AI-native reframe. LLM-first with a deterministic backstop:
 *   - The deterministic classifier (classifyDecision) decides the default and is
 *     the floor: if it says the statement is general business, we WILL reframe,
 *     even if the LLM disagrees, so a general decision can never slip through.
 *   - When a reframe is needed, the LLM produces the context-specific
 *     restatement; if the LLM is unavailable or returns nothing usable, we fall
 *     back to templatedReframe, and if no template matches, to a generic
 *     AI-native lens restatement. We never fabricate beyond asking the
 *     AI-native question.
 */
export async function reframeToAiNative(statement: string): Promise<ReframeResult> {
  const original = statement.trim();
  const det = classifyDecision(original);

  // Already AI-native by the deterministic gate: pass through unchanged.
  // (We still let the LLM confirm, but never downgrade a clearly AI-native
  // statement into a reframe, to avoid needless churn.)
  if (det.aiNative) {
    return {
      effectiveStatement: original,
      originalStatement: original,
      reframed: false,
      reframeNote: null,
      lifecycleStage: null,
    };
  }

  // General business: a reframe WILL happen. Try the LLM for a context-specific
  // restatement; fall back to the deterministic template, then to a generic lens.
  let reframedStatement = "";
  let lifecycle: LifecycleStage | null = det.templated?.stage ?? null;

  try {
    const user = `Decision the leader submitted:
"""
${original}
"""

Return JSON exactly:
{
  "is_ai_native": false,
  "reframed_statement": "the AI-native version of this decision, as a question that pulls the leader to the AI-native lens",
  "lifecycle_stage": "build | orchestrate | productize | gtm | substrate"
}`;
    const raw = await reason(SYSTEM, user, 700);
    const parsed = parseLLMJson<LLMReframe>(raw);
    const candidate = (parsed.reframed_statement ?? "").toString().trim();
    // Accept the LLM reframe only if it is non-empty and itself AI-native (the
    // LLM is not allowed to hand us back another general-business statement).
    if (candidate.length > 0 && isAiNativeDecision(candidate)) {
      reframedStatement = stripEmDashes(candidate.slice(0, 600));
    }
    if (isLifecycle(parsed.lifecycle_stage)) lifecycle = parsed.lifecycle_stage;
  } catch (_e) {
    // Fall through to the deterministic backstop below.
  }

  if (!reframedStatement) {
    // Deterministic template, then a generic AI-native lens restatement.
    reframedStatement =
      det.templated?.reframed ??
      `What is the AI-native version of this decision: how would an agent or AI capability own part of "${original.slice(0, 200)}", and what does the human role become?`;
  }

  return {
    effectiveStatement: reframedStatement,
    originalStatement: original,
    reframed: true,
    reframeNote: REFRAME_NOTE,
    lifecycleStage: lifecycle,
  };
}
