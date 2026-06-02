// Evidence retrievers for claim verification.
// Phase A: Perplexity (grounded + citations), Exa (neural primary sources),
// Brave (breadth fallback). Each runs independently; one failing provider
// never sinks the gather (Promise.allSettled). No evidence => the adjudicator
// returns "unverified", never "false".

import { fetchWithTimeout } from "../_shared/with-timeout.ts";
import type { ClaimType, Evidence } from "./types.ts";

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_e) {
    return null;
  }
}

/** Pull a bare domain (example.com) out of a claim, if one is present. */
function extractDomain(text: string): string | null {
  const m = text.match(/\b([a-z0-9-]+\.(?:com|io|ai|co|org|net|dev|app))\b/i);
  return m ? m[1].toLowerCase() : null;
}

/** Best-effort company name: a quoted name, or a capitalised run before a
 *  corporate suffix. Conservative on purpose; returns null when unsure. */
function extractCompany(text: string): string | null {
  const quoted = text.match(/["']([A-Z][A-Za-z0-9 &.-]{2,40})["']/);
  if (quoted) return quoted[1].trim();
  const suffix = text.match(/\b([A-Z][A-Za-z0-9&.-]+(?:\s+[A-Z][A-Za-z0-9&.-]+){0,3})\s+(?:Inc|Corp|Corporation|Ltd|LLC|GmbH|Co)\b/);
  if (suffix) return suffix[1].trim();
  return null;
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

async function searchNewsApi(query: string): Promise<Evidence[]> {
  const key = Deno.env.get("NEWSAPI_KEY");
  if (!key) return [];
  const params = new URLSearchParams({ q: query, sortBy: "relevancy", pageSize: "5", language: "en" });
  const res = await fetchWithTimeout(`https://newsapi.org/v2/everything?${params}`, {
    method: "GET",
    provider: "newsapi",
    timeoutMs: 12_000,
    headers: { "X-Api-Key": key },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const articles: Array<{ title?: string; url?: string; description?: string; source?: { name?: string } }> = data?.articles ?? [];
  return articles.map((a) => ({
    source_url: a.url ?? null,
    source_title: a.title ?? a.source?.name ?? hostOf(a.url ?? null),
    excerpt: (a.description ?? "").slice(0, 400) || null,
    stance: "neutral" as const,
    retriever: "newsapi" as const,
    relevance_score: null,
  }));
}

async function searchBuiltWith(domain: string): Promise<Evidence[]> {
  const key = Deno.env.get("BUILTWITH_API_KEY");
  if (!key) return [];
  const res = await fetchWithTimeout(`https://api.builtwith.com/v21/api.json?KEY=${key}&LOOKUP=${encodeURIComponent(domain)}`, {
    method: "GET",
    provider: "builtwith",
    timeoutMs: 12_000,
  });
  if (!res.ok) return [];
  const data = await res.json();
  const groups = data?.Results?.[0]?.Result?.Paths?.[0]?.Technologies ?? [];
  const techs = groups.map((t: { Name?: string }) => t.Name).filter(Boolean).slice(0, 25);
  if (techs.length === 0) return [];
  return [{
    source_url: `https://builtwith.com/${domain}`,
    source_title: `BuiltWith: ${domain} tech stack`,
    excerpt: `Detected technologies on ${domain}: ${techs.join(", ")}.`.slice(0, 600),
    stance: "neutral",
    retriever: "builtwith",
    relevance_score: null,
  }];
}

async function searchTranco(domain: string): Promise<Evidence[]> {
  const res = await fetchWithTimeout(`https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(domain)}`, {
    method: "GET",
    provider: "tranco",
    timeoutMs: 10_000,
  });
  if (!res.ok) return [];
  const data = await res.json();
  const ranks: Array<{ date: string; rank: number }> = data?.ranks ?? [];
  if (ranks.length === 0) return [];
  const latest = ranks[ranks.length - 1];
  return [{
    source_url: `https://tranco-list.eu/query?domain=${domain}`,
    source_title: `Tranco rank: ${domain}`,
    excerpt: `${domain} is ranked #${latest.rank} on the Tranco list of popular domains (as of ${latest.date}).`,
    stance: "neutral",
    retriever: "tranco",
    relevance_score: null,
  }];
}

async function searchPdl(company: string): Promise<Evidence[]> {
  const key = Deno.env.get("PDL_API_KEY");
  if (!key) return [];
  const params = new URLSearchParams({ name: company });
  const res = await fetchWithTimeout(`https://api.peopledatalabs.com/v5/company/enrich?${params}`, {
    method: "GET",
    provider: "pdl",
    timeoutMs: 12_000,
    headers: { "X-Api-Key": key },
  });
  if (!res.ok) return [];
  const d = await res.json();
  if (d?.status !== 200 || !d?.name) return [];
  const parts = [
    d.employee_count ? `employees: ${d.employee_count}` : null,
    d.industry ? `industry: ${d.industry}` : null,
    d.size ? `size band: ${d.size}` : null,
    d.founded ? `founded: ${d.founded}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return [];
  return [{
    source_url: d.linkedin_url ? `https://${d.linkedin_url}` : null,
    source_title: `People Data Labs: ${d.name}`,
    excerpt: `${d.name} (${parts.join(", ")}).`,
    stance: "neutral",
    retriever: "pdl",
    relevance_score: null,
  }];
}

/**
 * Gather evidence for a single claim. Always runs the breadth providers
 * (Perplexity, Exa, Brave). Adds typed retrievers by claim type and detected
 * entities: NewsAPI for recency on factual/market claims, PDL for market
 * firmographics when a company is named, BuiltWith + Tranco when a domain
 * appears. Empty array is a valid outcome (claim could not be grounded).
 */
export async function gatherEvidence(query: string, type?: ClaimType): Promise<Evidence[]> {
  const jobs: Array<Promise<Evidence[]>> = [searchPerplexity(query), searchExa(query), searchBrave(query)];

  if (type === "factual" || type === "market") jobs.push(searchNewsApi(query));

  const domain = extractDomain(query);
  if (domain) {
    jobs.push(searchBuiltWith(domain));
    jobs.push(searchTranco(domain));
  }

  if (type === "market") {
    const company = extractCompany(query);
    if (company) jobs.push(searchPdl(company));
  }

  const settled = await Promise.allSettled(jobs);
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
  return deduped.slice(0, 16);
}
