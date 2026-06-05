// Free-tier AI usage logging + a generous soft daily spend cap.
//
// Two jobs:
//   1. recordAiUsage(): write one row to ai_usage_audit per paid provider call,
//      with a rough estimated cost. Best-effort, never throws into the caller.
//   2. checkDailySoftCap(): sum a user's estimated spend today and compare to a
//      generous cap. It NEVER blocks the request; exceeding the cap only emits a
//      structured overage log (and returns a flag the caller may surface), so we
//      learn real demand before designing pricing.
//
// The cap is tunable without a code deploy via the AI_SOFT_CAP_USD_PER_DAY
// secret. Prices are deliberately approximate: this drives a spend SIGNAL, not
// billing, so an unknown model still costs something rather than silently zero.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "./logger.ts";

const log = createLogger("ai-usage");

const DEFAULT_SOFT_CAP_USD = 2.0;

/** Generous per-user daily soft cap in USD (env-overridable, never blocks). */
export function softCapUsd(): number {
  const raw = Deno.env.get("AI_SOFT_CAP_USD_PER_DAY");
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SOFT_CAP_USD;
}

type Price = { in: number; out: number }; // USD per 1K tokens
const PRICES: Record<string, Price> = {
  "gpt-4o": { in: 0.0025, out: 0.01 },
  "gpt-4o-mini": { in: 0.00015, out: 0.0006 },
  "gemini-2.0-flash": { in: 0.0001, out: 0.0004 },
  "gemini-1.5-pro": { in: 0.00125, out: 0.005 },
};
const DEFAULT_PRICE: Price = { in: 0.001, out: 0.003 };

// Flat per-call estimates for providers that are not token-priced (USD).
const FLAT_CALL_USD: Record<string, number> = {
  elevenlabs: 0.03,
  perplexity: 0.005,
  tavily: 0.005,
  brave: 0.003,
  exa: 0.005,
};

export interface AiUsageRecord {
  userId?: string | null;
  functionName: string;
  provider?: string;
  model?: string;
  purpose?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  status?: string; // ok | fallback | error
  metadata?: Record<string, unknown>;
}

/** Rough USD estimate for one provider call. Approximate by design. */
export function estimateCostUsd(r: AiUsageRecord): number {
  const provider = (r.provider ?? "").toLowerCase();
  const hasTokens = Boolean(r.totalTokens || r.promptTokens || r.completionTokens);

  // Non-token providers (TTS, web search) priced per call.
  if (!hasTokens && provider && FLAT_CALL_USD[provider] !== undefined) {
    return FLAT_CALL_USD[provider];
  }

  const model = (r.model ?? "").toLowerCase();
  const key = Object.keys(PRICES).find((k) => model.includes(k));
  const price = key ? PRICES[key] : DEFAULT_PRICE;
  const pIn = r.promptTokens ?? 0;
  const pOut = r.completionTokens ?? (r.totalTokens ? Math.max(0, r.totalTokens - pIn) : 0);
  const tokenCost = (pIn / 1000) * price.in + (pOut / 1000) * price.out;
  const flat = provider && FLAT_CALL_USD[provider] !== undefined ? FLAT_CALL_USD[provider] : 0;
  return Number((tokenCost + flat).toFixed(6));
}

/**
 * Best-effort: write one usage row. Never throws into the caller. Returns the
 * estimated cost so a caller can accumulate across calls if it wants.
 */
export async function recordAiUsage(
  supabase: SupabaseClient,
  r: AiUsageRecord,
): Promise<number> {
  const est = estimateCostUsd(r);
  try {
    const total =
      r.totalTokens ?? ((r.promptTokens ?? 0) + (r.completionTokens ?? 0) || null);
    await supabase.from("ai_usage_audit").insert({
      user_id: r.userId ?? null,
      function_name: r.functionName,
      provider: r.provider ?? null,
      model: r.model ?? null,
      purpose: r.purpose ?? null,
      prompt_tokens: r.promptTokens ?? null,
      completion_tokens: r.completionTokens ?? null,
      total_tokens: total,
      latency_ms: r.latencyMs ?? null,
      status: r.status ?? "ok",
      est_cost_usd: est,
      metadata: r.metadata ?? {},
    });
  } catch (e) {
    log.warn("recordAiUsage insert failed", { userId: r.userId ?? undefined, error: e });
  }
  return est;
}

export interface SoftCapResult {
  overCap: boolean;
  spentUsd: number;
  limitUsd: number;
}

/**
 * Sum today's estimated AI spend for a user and compare to the generous soft
 * cap. NEVER blocks. When over, emits a structured overage log and returns
 * overCap=true (callers may optionally surface a gentle notice). Fails open
 * (overCap=false) on any error, and for anonymous callers with no userId.
 */
export async function checkDailySoftCap(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  functionName: string,
): Promise<SoftCapResult> {
  const limitUsd = softCapUsd();
  if (!userId) return { overCap: false, spentUsd: 0, limitUsd };
  try {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("ai_usage_audit")
      .select("est_cost_usd")
      .eq("user_id", userId)
      .gte("created_at", startOfDay.toISOString());
    if (error) throw error;
    const spentUsd = (data ?? []).reduce(
      (sum: number, row: { est_cost_usd: number | null }) => sum + (Number(row.est_cost_usd) || 0),
      0,
    );
    const overCap = spentUsd >= limitUsd;
    if (overCap) {
      log.warn("daily soft cap exceeded (not blocking)", {
        userId,
        function_name: functionName,
        spent_usd: Number(spentUsd.toFixed(4)),
        limit_usd: limitUsd,
      });
    }
    return { overCap, spentUsd: Number(spentUsd.toFixed(4)), limitUsd };
  } catch (e) {
    log.warn("checkDailySoftCap failed open", { userId, error: e });
    return { overCap: false, spentUsd: 0, limitUsd };
  }
}
