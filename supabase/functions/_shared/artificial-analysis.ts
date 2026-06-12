/**
 * Artificial Analysis API Client
 *
 * Deno-compatible HTTP client for the Artificial Analysis benchmarking API.
 * Fetches LLM benchmarks, TTS ratings, and image model ratings.
 */

import type { AAModel, AAMediaModel } from "./aa-types.ts";

const AA_BASE_URL = "https://artificialanalysis.ai/api/v2";

function getApiKey(): string {
  const key = Deno.env.get("ARTIFICIALANALYSIS_API_KEY");
  if (!key) {
    throw new Error("ARTIFICIALANALYSIS_API_KEY not configured");
  }
  return key;
}

function buildHeaders(): Record<string, string> {
  return {
    "x-api-key": getApiKey(),
    "Content-Type": "application/json",
  };
}

/**
 * Fetch LLM model benchmarks from Artificial Analysis
 */
export async function fetchLLMModels(): Promise<AAModel[]> {
  const response = await fetch(`${AA_BASE_URL}/data/llms/models`, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Artificial Analysis LLM API error: ${response.status} ${errText.substring(0, 200)}`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data || [];
}

/**
 * Fetch text-to-speech model ratings
 */
export async function fetchTTSModels(): Promise<AAMediaModel[]> {
  const response = await fetch(`${AA_BASE_URL}/data/media/text-to-speech`, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Artificial Analysis TTS API error: ${response.status} ${errText.substring(0, 200)}`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data || [];
}

/**
 * Fetch text-to-image model ratings
 */
export async function fetchImageModels(): Promise<AAMediaModel[]> {
  const response = await fetch(`${AA_BASE_URL}/data/media/text-to-image`, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Artificial Analysis Image API error: ${response.status} ${errText.substring(0, 200)}`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.data || [];
}
