/**
 * Provider fallback for chat/JSON completions.
 *
 * Tries OpenAI first (so existing behavior and model selection are unchanged),
 * and falls back to Gemini 2.0 Flash when OpenAI is unavailable: quota/429,
 * outage, timeout, or a missing key. Returns the same OpenAIResponse shape, so
 * callers stay provider-agnostic and need no other changes.
 *
 * JSON mode maps across providers: an OpenAI `response_format: json_object`
 * request becomes Gemini `responseMimeType: application/json`, so downstream
 * JSON.parse keeps working on the fallback path.
 *
 * ---------------------------------------------------------------------------
 * Provider routing (CH-14)
 * ---------------------------------------------------------------------------
 *
 * `options.providers` is an ORDERED preference. Omit it and the order is
 * OpenAI then Gemini, which is exactly what every existing caller already gets,
 * so nothing outside the critique stage changes behaviour.
 *
 * It exists because one lens has to run somewhere other than the family that
 * generated the artefact. Before this, pinning a judge was impossible: the
 * function was try-OpenAI, catch, Gemini, with no way to say which. On any
 * OpenAI outage Gemini judged its own generation and nothing recorded that it
 * had happened. Naming the order makes "this was judged by a different family"
 * a checkable fact rather than an assumption.
 *
 * A preferred provider that is not configured is skipped, not attempted, and a
 * preference is never quietly widened: if the caller asked for Gemini only and
 * Gemini is unavailable, the call fails rather than silently becoming OpenAI.
 * The pure helpers live in critique-core.ts (this file cannot be unit tested,
 * it imports the Supabase SDK over https) and pickJudgeProvider is re-exported
 * here so callers find the routing where the contract says it is.
 */

import { fetchWithTimeout } from "./with-timeout.ts";
import { callOpenAI, type OpenAIRequest, type OpenAIResponse, type OpenAICacheOptions } from "./openai-utils.ts";
import {
  DEFAULT_PROVIDER_ORDER,
  resolveProviderOrder,
  type LlmProvider,
} from "./critique-core.ts";

export { pickJudgeProvider } from "./critique-core.ts";
export type { LlmProvider } from "./critique-core.ts";

const GEMINI_MODEL = "gemini-2.0-flash";

/** Providers this deployment actually has a key for, in the default order. */
export function availableProviders(): LlmProvider[] {
  const out: LlmProvider[] = [];
  if (Deno.env.get("OPENAI_API_KEY")) out.push("openai");
  if (Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY")) out.push("gemini");
  return out;
}

/** Tag usage rows with the provider that actually answered. */
export function providerFromModel(model: string | undefined): "openai" | "gemini" | "unknown" {
  const m = (model ?? "").toLowerCase();
  if (m.includes("gemini")) return "gemini";
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3")) return "openai";
  return "unknown";
}

/**
 * Flatten OpenAI-style chat messages into a single Gemini prompt. Gemini's
 * REST generateContent has no system role in this shape, so the system
 * messages become a leading instruction block.
 */
function flattenMessages(messages: Array<{ role: string; content: string }>): string {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => (m.role === "user" ? m.content : `${m.role.toUpperCase()}: ${m.content}`))
    .join("\n\n");
  return system ? `${system}\n\n${rest}` : rest;
}

async function callGemini(request: OpenAIRequest): Promise<OpenAIResponse> {
  const key = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_AI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const wantsJson = request.response_format?.type === "json_object";
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      provider: "gemini",
      timeoutMs: 30_000,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: flattenMessages(request.messages) }] }],
        generationConfig: {
          temperature: request.temperature ?? 0.3,
          maxOutputTokens: request.max_tokens ?? 2000,
          ...(wantsJson ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${errorText.slice(0, 200)}`);
  }

  const data = await res.json();
  let content: string = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .join("");
  // Strip stray code fences in case the model wraps JSON despite the mime type.
  content = content.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  if (!content) throw new Error("Gemini returned no content");

  const u = data?.usageMetadata;
  return {
    content,
    model: GEMINI_MODEL,
    usage: u
      ? {
          prompt_tokens: u.promptTokenCount ?? 0,
          completion_tokens: u.candidatesTokenCount ?? 0,
          total_tokens: u.totalTokenCount ?? 0,
        }
      : undefined,
    cached: false,
  };
}

export interface LLMFallbackOptions extends OpenAICacheOptions {
  /**
   * Ordered provider preference. Omit for today's order (OpenAI, then Gemini),
   * which is what every existing caller gets and what they got before this
   * argument existed. A named order is honoured exactly: unavailable entries
   * are skipped and nothing outside the list is ever tried.
   */
  providers?: readonly LlmProvider[];
}

/**
 * Call the first preferred provider, falling through the rest of the preference
 * on failure. Same return type as callOpenAI, so it stays a drop-in replacement.
 */
export async function callLLMWithFallback(
  request: OpenAIRequest,
  options: LLMFallbackOptions = {},
): Promise<OpenAIResponse> {
  const { providers, ...cacheOptions } = options;
  const named = Array.isArray(providers) && providers.length > 0;

  // No preference means the old path, byte for byte: try OpenAI, and let it
  // decide (it serves a cache hit before it looks for a key), then Gemini. Not
  // filtered by availability, because filtering would change behaviour for the
  // seven existing callers and this argument was added for one new one.
  const order = named
    ? resolveProviderOrder(providers, availableProviders())
    : [...DEFAULT_PROVIDER_ORDER];

  if (order.length === 0) {
    // The caller named providers and none of them are configured. Failing is the
    // honest answer: substituting a provider they did not ask for is the silent
    // self-review CH-14 exists to prevent.
    throw new Error(`No configured provider among: ${(providers ?? []).join(", ")}`);
  }

  let lastError: unknown = null;
  for (const provider of order) {
    try {
      if (provider === "openai") return await callOpenAI(request, cacheOptions);
      return await callGemini(request);
    } catch (err) {
      lastError = err;
      console.warn(
        `callLLMWithFallback: ${provider} failed:`,
        String(err).slice(0, 200),
      );
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`All providers failed: ${order.join(", ")}`);
}
