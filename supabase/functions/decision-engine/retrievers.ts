// Evidence retrievers for claim verification.
// Phase A: Perplexity (grounded + citations), Exa (neural primary sources),
// Brave (breadth fallback). Each runs independently; one failing provider
// never sinks the gather (Promise.allSettled). No evidence => the adjudicator
// returns "unverified", never "false".

import { fetchWithTimeout } from "../_shared/with-timeout.ts";
import type { Evidence } from "./types.ts";

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_e) {
    return null;
  }
}

async function searchPerplexity(query: string): Promise<Evidence[]> {
  const key = Deno.env.get("PERPLEXITY_API_KEY");
  if (!key) return [];
  const res = await fetchWithTimeout("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    provider: "perplexity",
    timeoutMs: 15_000,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content:
            "You are a fact-checking research assistant. Given a claim, report what the current evidence says about whether it is true. Cite sources. Be concise and neutral. State plainly if evidence is thin or absent.",
        },
        { role: "user", content: `Claim to check: ${query}` },
      ],
      temperature: 0.1,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  const citations: string[] = data?.citations ?? data?.search_results?.map((s: { url: string }) => s.url) ?? [];
  const out: Evidence[] = [];
  if (content) {
    out.push({
      source_url: citations[0] ?? null,
      source_title: "Perplexity synthesis",
      excerpt: content.slice(0, 1200),
      stance: "neutral",
      retriever: "perplexity",
      relevance_score: null,
    });
  }
  for (const url of citations.slice(0, 4)) {
    out.push({
      source_url: url,
      source_title: hostOf(url),
      excerpt: null,
      stance: "neutral",
      retriever: "perplexity",
      relevance_score: null,
    });
  }
  return out;
}

async function searchExa(query: string): Promise<Evidence[]> {
  const key = Deno.env.get("EXA_API_KEY");
  if (!key) return [];
  const res = await fetchWithTimeout("https://api.exa.ai/search", {
    method: "POST",
    provider: "exa",
    timeoutMs: 15_000,
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      numResults: 5,
      type: "auto",
      contents: { text: { maxCharacters: 600 } },
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const results: Array<{ title?: string; url?: string; text?: string; score?: number }> = data?.results ?? [];
  return results.map((r) => ({
    source_url: r.url ?? null,
    source_title: r.title ?? hostOf(r.url ?? null),
    excerpt: (r.text ?? "").slice(0, 600) || null,
    stance: "neutral" as const,
    retriever: "exa" as const,
    relevance_score: typeof r.score === "number" ? r.score : null,
  }));
}

async function searchBrave(query: string): Promise<Evidence[]> {
  const key = Deno.env.get("BRAVE_SEARCH_API");
  if (!key) return [];
  const params = new URLSearchParams({ q: query, count: "6", country: "US", search_lang: "en" });
  const res = await fetchWithTimeout(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    method: "GET",
    provider: "brave",
    timeoutMs: 12_000,
    headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": key },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const results: Array<{ title?: string; url?: string; description?: string }> = data?.web?.results ?? [];
  return results.map((r) => ({
    source_url: r.url ?? null,
    source_title: r.title ?? hostOf(r.url ?? null),
    excerpt: (r.description ?? "").slice(0, 400) || null,
    stance: "neutral" as const,
    retriever: "brave" as const,
    relevance_score: null,
  }));
}

/**
 * Gather evidence for a single claim across all Phase A providers.
 * Returns a deduped, capped list. Empty array is a valid outcome and means
 * the claim could not be grounded.
 */
export async function gatherEvidence(query: string): Promise<Evidence[]> {
  const settled = await Promise.allSettled([
    searchPerplexity(query),
    searchExa(query),
    searchBrave(query),
  ]);
  const all: Evidence[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") all.push(...s.value);
  }
  // Dedupe by url (keep the first, which preserves the richer Perplexity synthesis).
  const seen = new Set<string>();
  const deduped: Evidence[] = [];
  for (const e of all) {
    const k = e.source_url ?? `${e.retriever}:${(e.excerpt ?? "").slice(0, 40)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(e);
  }
  return deduped.slice(0, 12);
}
