// LLM helper for suggest-bets.
//
// One reasoning call, Claude primary with OpenAI GPT-4o fallback. NEVER Gemini
// (it 400s on this shape). Both calls go through fetchWithTimeout so a hung
// provider can never stall the request. Mirrors the decision-engine reason()
// contract but is kept local so suggest-bets owns its own surface and does not
// reach into another function's directory.

import { fetchWithTimeout } from "../_shared/with-timeout.ts";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_REASONING_MODEL = "gpt-4o";

async function callAnthropic(system: string, user: string, maxTokens: number): Promise<string> {
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

async function callOpenAI(system: string, user: string, maxTokens: number): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    provider: "openai",
    timeoutMs: 30_000,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_REASONING_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no content");
  return text;
}

/**
 * Reasoning call. Claude primary, GPT-4o fallback. Never Gemini.
 * The `user` prompt already instructs the model to return JSON only.
 */
export async function reason(system: string, user: string, maxTokens = 1500): Promise<string> {
  try {
    return await callAnthropic(system, user, maxTokens);
  } catch (_e) {
    return await callOpenAI(system, user, maxTokens);
  }
}

/** Tolerant JSON extractor: handles raw JSON, fenced blocks, and prose wrappers. */
export function parseLLMJson<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch (_e) {
    const noFence = trimmed.replace(/```(?:json)?/gi, "").trim();
    const match = noFence.match(/[{[][\s\S]*[}\]]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Could not parse JSON from LLM output");
  }
}
