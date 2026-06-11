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
 */

import { fetchWithTimeout } from "./with-timeout.ts";
import { callOpenAI, type OpenAIRequest, type OpenAIResponse, type OpenAICacheOptions } from "./openai-utils.ts";

const GEMINI_MODEL = "gemini-2.0-flash";

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

/**
 * Call OpenAI, falling back to Gemini 2.0 Flash on any OpenAI failure. Same
 * signature and return type as callOpenAI, so it is a drop-in replacement.
 */
export async function callLLMWithFallback(
  request: OpenAIRequest,
  options: OpenAICacheOptions = {},
): Promise<OpenAIResponse> {
  try {
    return await callOpenAI(request, options);
  } catch (err) {
    console.warn(
      `callLLMWithFallback: OpenAI failed, falling back to ${GEMINI_MODEL}:`,
      String(err).slice(0, 200),
    );
    return await callGemini(request);
  }
}
