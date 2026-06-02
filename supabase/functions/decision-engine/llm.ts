// LLM helpers for the Decision Engine.
// Reasoning steps (decompose, advise) try Anthropic Claude first, fall back to
// OpenAI GPT-4o. Cheap adjudication (per-claim verdict) runs on gpt-4o-mini.
// All calls go through fetchWithTimeout so a hung provider never stalls the run.

import { fetchWithTimeout } from "../_shared/with-timeout.ts";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_REASONING_MODEL = "gpt-4o";
const OPENAI_CHEAP_MODEL = "gpt-4o-mini";

async function callAnthropic(system: string, user: string, maxTokens = 2000): Promise<string> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    provider: "anthropic",
    timeoutMs: 30_000,
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Anthropic returned no text");
  return text;
}

async function callOpenAI(
  system: string,
  user: string,
  opts: { model?: string; maxTokens?: number; jsonMode?: boolean } = {},
): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const { model = OPENAI_REASONING_MODEL, maxTokens = 2000, jsonMode = true } = opts;
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    provider: "openai",
    timeoutMs: 30_000,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no content");
  return text;
}

/**
 * Reasoning call for decompose / advise. Claude primary, GPT-4o fallback.
 * `user` should already instruct the model to return JSON only.
 */
export async function reason(system: string, user: string, maxTokens = 2000): Promise<string> {
  try {
    return await callAnthropic(system, user, maxTokens);
  } catch (_e) {
    // Fall back to OpenAI (json mode off here; the prompt asks for JSON and
    // parseLLMJson tolerates prose wrappers).
    return await callOpenAI(system, user, { maxTokens, jsonMode: false });
  }
}

/** Cheap, JSON-mode adjudication call (per-claim verdict). */
export async function adjudicateCall(system: string, user: string): Promise<string> {
  return await callOpenAI(system, user, { model: OPENAI_CHEAP_MODEL, maxTokens: 1200, jsonMode: true });
}

/** Tolerant JSON extractor: handles raw JSON, fenced blocks, and prose wrappers. */
export function parseLLMJson<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch (_e) {
    // Strip code fences then grab the first balanced object or array.
    const noFence = trimmed.replace(/```(?:json)?/gi, "").trim();
    const match = noFence.match(/[{[][\s\S]*[}\]]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Could not parse JSON from LLM output");
  }
}
