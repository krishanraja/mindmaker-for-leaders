/**
 * generate-briefing Edge Function
 *
 * Generates a personalised AI news briefing for a leader.
 * Pipeline:
 *   1. Pull user context (memory, edge profile, missions)
 *   2. Fetch news (Perplexity -> Brave+OpenAI -> static fallback)
 *   3. Personalise curation via GPT-4o
 *   4. Generate conversational script
 *   5. Store briefing row
 *   6. Trigger audio synthesis
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { selectOptimalModel } from "../_shared/model-router.ts";
import { getModelBenchmarks } from "../_shared/aa-cache.ts";
import type { AAModel } from "../_shared/aa-types.ts";
import { loadTrainingForUser } from "../_shared/training-loader.ts";
import { applyTypographyRules, stripBannedPhrases } from "../_shared/fact-guardrails.ts";
import type { TrainingMaterial } from "../_shared/training-schema.ts";
import { buildImportanceLens, planQueries, type LensItem, type PlannedQuery } from "../_shared/briefing-lens.ts";
import { dedupeAndScore, type CandidateHeadline, type ScoredHeadline } from "../_shared/briefing-scoring.ts";
import { curateSegments, segmentCountFromBudget, type CuratedSegment } from "../_shared/briefing-curation.ts";
import { getUserContext, toLensSource, type UserContext } from "../_shared/user-context.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { fetchWithTimeout, ProviderUnavailableError } from "../_shared/with-timeout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ──────────────────────────────────────────────────────────

interface NewsHeadline {
  title: string;
  source: string;
}

type BriefingType = 'default' | 'macro_trends' | 'vendor_landscape' | 'competitive_intel' | 'boardroom_prep' | 'team_update' | 'ai_landscape' | 'custom_voice';

const PRO_ONLY_TYPES: BriefingType[] = ['vendor_landscape', 'competitive_intel', 'boardroom_prep', 'ai_landscape', 'custom_voice'];

interface BriefingSegment {
  headline: string;
  analysis: string;
  framework_tag: string;
  source: string;
  relevance_reason: string;
  // v2 evidence fields - optional so v1 rows stay schema-compatible.
  lens_item_id?: string;
  relevance_score?: number;
  matched_profile_fact?: string;
}

// ── News Fetching ──────────────────────────────────────────────────

function buildPerplexityPrompt(userCtx: UserContext, briefingType: BriefingType, customContext?: string): string {
  const parts = [
    `You are an elite news curator. You find the stories that make busy leaders stop scrolling.`,
  ];

  if (userCtx.role && userCtx.company) {
    parts.push(`This person is the ${userCtx.role} of ${userCtx.company}.`);
  } else if (userCtx.role) {
    parts.push(`This person is a ${userCtx.role}.`);
  }
  if (userCtx.industry) {
    parts.push(`Their industry: ${userCtx.industry}.`);
  }
  if (userCtx.activeMissions.length > 0) {
    parts.push(`Active priorities: ${userCtx.activeMissions.slice(0, 3).join("; ")}.`);
  }
  if (userCtx.watchingCompanies.length > 0) {
    parts.push(`Companies they track: ${userCtx.watchingCompanies.join(", ")}.`);
  }
  if (userCtx.objectives.length > 0) {
    parts.push(`Their strategic objectives: ${userCtx.objectives.slice(0, 4).join("; ")}.`);
  }
  if (userCtx.blockers.length > 0) {
    parts.push(`Challenges they face: ${userCtx.blockers.slice(0, 3).join("; ")}.`);
  }
  if (userCtx.preferences.length > 0) {
    parts.push(`Tools and methods they use: ${userCtx.preferences.slice(0, 4).join(", ")}.`);
  }
  if (userCtx.recentDecisions.length > 0) {
    parts.push(`Active decisions on their desk: ${userCtx.recentDecisions.slice(0, 3).join("; ")}.`);
  }

  // Type-specific search shaping
  const typeInstructions = buildTypeSearchInstructions(briefingType, customContext, userCtx);

  parts.push(`
${typeInstructions}

QUALITY BAR: Only include stories where THIS SPECIFIC leader would say "that changes something for me." Prefer last-48-hour news. Every headline must pass this test: does it change one of their decisions, affect one of their priorities, or surface a number relevant to their specific situation?

RELEVANCE TEST - every story MUST connect to at least one of these (from the leader's actual profile):
${userCtx.objectives.length > 0 ? `- Their objectives: ${userCtx.objectives.slice(0, 4).join("; ")}` : ''}
${userCtx.activeMissions.length > 0 ? `- Their priorities: ${userCtx.activeMissions.slice(0, 3).join("; ")}` : ''}
${userCtx.recentDecisions.length > 0 ? `- Their active decisions: ${userCtx.recentDecisions.slice(0, 3).join("; ")}` : ''}
${userCtx.watchingCompanies.length > 0 ? `- Their watchlist: ${userCtx.watchingCompanies.join(", ")}` : ''}
${userCtx.preferences.length > 0 ? `- Their tools/methods: ${userCtx.preferences.slice(0, 4).join(", ")}` : ''}
${userCtx.blockers.length > 0 ? `- Their challenges: ${userCtx.blockers.slice(0, 3).join("; ")}` : ''}
If a story does not clearly connect to ANY of the above, DO NOT include it, no matter how trendy or popular the topic is.

For each headline, assign ONE tag:
SIGNAL: Changes the math on a decision this leader faces.
DECISION TRIGGER: Something shifted that demands action or reassessment.
KRISH'S TAKE: A sharp, slightly cynical observation that reframes conventional wisdom.

Do NOT include NOISE items. Do NOT include: governance fluff, workforce surveys, geopolitics, AGI speculation, celebrity AI, funding rounds (unless they shift competitive dynamics). Do NOT include stories about topics unrelated to this leader's objectives, decisions, tools, or watchlist, no matter how trendy in general tech news.

8-18 words per headline. Present tense. Specific numbers when available.

Return ONLY a JSON array of 8-10 items:
[{"title": "[SIGNAL] headline here", "source": "Publication Name"}]`);

  return parts.join(" ");
}

function buildTypeSearchInstructions(briefingType: BriefingType, customContext: string | undefined, userCtx: UserContext): string {
  switch (briefingType) {
    case 'macro_trends':
      return `Focus on: macro-economic shifts affecting AI adoption, analyst reports on market sizing, regulatory changes with real business impact, industry-wide adoption milestones with real numbers. Think board-level trends, not product launches.`;
    case 'vendor_landscape':
      return `Focus on: AI product launches and pricing changes, vendor comparison data, feature releases from major platforms, API pricing shifts, new entrants worth evaluating. Frame through the lens of build-vs-buy decisions in ${userCtx.industry || 'their industry'}.`;
    case 'competitive_intel':
      return `Focus heavily on: ${userCtx.watchingCompanies.length > 0 ? userCtx.watchingCompanies.join(', ') : 'major players in ' + (userCtx.industry || 'AI')}. Find their latest moves, hiring patterns, product launches, partnerships, and strategic pivots. Also surface moves by their direct competitors.`;
    case 'boardroom_prep':
      return `Focus on: stories a board member would ask about. Macro AI trends with hard numbers, industry benchmarks, leadership moves at major companies, regulatory shifts, and data points that support strategic narratives. Everything should be quotable in a presentation.`;
    case 'team_update':
      return `Focus on: practical AI developments that affect day-to-day operations. New tools, workflow improvements, productivity gains with real numbers, team-level adoption stories, and training/upskilling developments.`;
    case 'ai_landscape':
      return `Focus on: AI model benchmark changes, new model releases, pricing shifts across LLM providers, capability improvements in coding/reasoning/speed, and build-vs-buy implications for ${userCtx.industry || 'their industry'}. Use the provided benchmark data as the primary source; supplement with recent news about model releases.`;
    case 'custom_voice':
      return customContext
        ? `The leader specifically asked for: "${customContext}". Tailor your search to find news and insights directly relevant to this request. Interpret their intent and find the most useful stories for their specific situation.`
        : `Search for high-impact AI and business news relevant to this leader's role and industry.`;
    default: {
      const searchTopics = buildPersonalizedSearchTopics(userCtx);
      const parts: string[] = [];

      if (searchTopics.length >= 3) {
        // Rich profile: drive the search with specific topics from the user's actual situation
        parts.push(`SEARCH FOR NEWS ON THESE SPECIFIC TOPICS (derived from this leader's actual priorities, tools, and decisions):`);
        searchTopics.forEach((topic, i) => {
          parts.push(`${i + 1}. ${topic}`);
        });
        parts.push(`\nPrioritize stories that directly connect to the topics above. Every headline should make this specific person say "that changes something for me." If a story doesn't connect to at least one of the above topics, it is probably not relevant enough to include.`);
        if (userCtx.company) {
          parts.push(`Also include news directly affecting ${userCtx.company} and its competitive landscape.`);
        }
        if (userCtx.industry) {
          parts.push(`Frame all results through the lens of ${userCtx.industry}.`);
        }
      } else {
        // Sparse profile: fall back to role/industry search
        if (userCtx.industry && userCtx.role) {
          parts.push(`Search for news that a ${userCtx.role} in ${userCtx.industry} needs to know from the past 48 hours.`);
        } else if (userCtx.industry) {
          parts.push(`Search for the most important ${userCtx.industry} industry news from the past 48 hours.`);
        } else {
          parts.push(`Search for the most important business and technology news from the past 48 hours.`);
        }
        if (userCtx.company) {
          parts.push(`Include news affecting ${userCtx.company} and its competitive landscape.`);
        }
        if (userCtx.objectives?.length > 0) {
          parts.push(`Their strategic goals: ${userCtx.objectives.slice(0, 2).join("; ")}. Prioritize news that advances or threatens these.`);
        }
        if (userCtx.activeMissions.length > 0) {
          parts.push(`Active priorities: ${userCtx.activeMissions.slice(0, 2).join("; ")}. Flag news that affects these.`);
        }
        parts.push(`Prioritize: ${userCtx.industry || 'sector'} developments, competitive shifts${userCtx.company ? ` affecting ${userCtx.company}` : ''}, technology that changes how ${userCtx.role || 'leader'}s operate, and deals or launches with real numbers.`);
      }
      return parts.join("\n");
    }
  }
}

function buildPersonalizedSearchTopics(userCtx: UserContext): string[] {
  const topics: string[] = [];

  // From objectives: each becomes a concrete search topic
  for (const obj of userCtx.objectives.slice(0, 4)) {
    topics.push(obj);
  }

  // From blockers: solution-seeking searches
  for (const blocker of userCtx.blockers.slice(0, 2)) {
    topics.push(blocker);
  }

  // From preferences (tools, methods): search for updates on tools they actually use
  for (const pref of userCtx.preferences.slice(0, 3)) {
    topics.push(`${pref} news updates`);
  }

  // From watching companies: competitive intelligence
  for (const company of userCtx.watchingCompanies.slice(0, 4)) {
    topics.push(`${company} latest news strategy`);
  }

  // From active decisions: decision-relevant context
  for (const decision of userCtx.recentDecisions.slice(0, 2)) {
    topics.push(decision);
  }

  // From active missions: mission-relevant news
  for (const mission of userCtx.activeMissions.slice(0, 2)) {
    topics.push(mission);
  }

  return topics.slice(0, 12);
}

async function fetchWithPerplexity(apiKey: string, userCtx: UserContext, briefingType: BriefingType = 'default', customContext?: string): Promise<NewsHeadline[]> {
  const today = new Date().toISOString().split("T")[0];

  const contextParts: string[] = [];
  if (userCtx.industry) {
    contextParts.push(`Focus heavily on the ${userCtx.industry} industry.`);
  }
  if (userCtx.activeMissions.length > 0) {
    contextParts.push(`Their current priorities: ${userCtx.activeMissions.slice(0, 2).join("; ")}. Flag news that affects these.`);
  }
  if (userCtx.watchingCompanies.length > 0) {
    contextParts.push(`Search specifically for recent news about: ${userCtx.watchingCompanies.join(", ")}.`);
  }
  if (userCtx.recentDecisions.length > 0) {
    contextParts.push(`Decisions on their desk: ${userCtx.recentDecisions.slice(0, 2).join("; ")}. Surface news that informs these.`);
  }
  if (userCtx.objectives?.length > 0) {
    contextParts.push(`Their strategic goals: ${userCtx.objectives.slice(0, 3).join("; ")}. Prioritize news that advances or threatens these.`);
  }
  if (userCtx.blockers?.length > 0) {
    contextParts.push(`Challenges they face: ${userCtx.blockers.slice(0, 2).join("; ")}. Surface solutions or shifts relevant to these.`);
  }
  if (userCtx.role) {
    contextParts.push(`Frame news through the lens of a ${userCtx.role}.`);
  }

  // Perplexity wrapped in fetchWithTimeout: 15s budget + 1 retry on 5xx.
  // Without this, a hung Perplexity stalls the whole briefing pipeline
  // until Supabase's 60s wall clock kills the function.
  const response = await fetchWithTimeout("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    provider: "perplexity",
    timeoutMs: 15_000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: buildPerplexityPrompt(userCtx, briefingType, customContext) },
        {
          role: "user",
          content: `Today is ${today}. Find 8-10 high-signal headlines from the past 48 hours (fall back to 7 days if needed). ${contextParts.join(" ")} Tag each [SIGNAL], [DECISION TRIGGER], or [KRISH'S TAKE]. No filler. Only stories worth interrupting someone for.`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) throw new Error(`Perplexity error: ${response.status}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from Perplexity");
  return parseLLMJson(content);
}

async function fetchWithTavily(apiKey: string, userCtx: UserContext): Promise<NewsHeadline[]> {
  const queries: string[] = [];

  // Primary query: industry + role
  if (userCtx.industry) {
    queries.push(`${userCtx.industry} industry news trends`);
  }
  if (userCtx.industry) {
    queries.push(`AI ${userCtx.industry} business impact`);
  }

  // Watched companies
  if (userCtx.watchingCompanies.length > 0) {
    queries.push(userCtx.watchingCompanies.slice(0, 3).join(" OR ") + " news");
  }

  // Mission-relevant
  for (const mission of userCtx.activeMissions.slice(0, 2)) {
    const keywords = mission.split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(" ");
    if (keywords) queries.push(keywords);
  }

  // Fallback general query
  if (queries.length === 0) {
    queries.push(`${userCtx.industry || 'business'} ${userCtx.role || 'leadership'} news trends`);
  }

  const allResults: Array<{ title: string; url: string; content: string }> = [];

  const queryResults = await Promise.allSettled(
    queries.map(async (query) => {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "advanced",
          topic: "news",
          days: 7,
          max_results: 10,
          include_answer: false,
        }),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    })
  );

  for (const result of queryResults) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      allResults.push(...result.value);
    } else if (result.status === "rejected") {
      console.warn("Tavily query failed:", result.reason);
    }
  }

  if (allResults.length === 0) throw new Error("No Tavily results");

  // Deduplicate and format as NewsHeadline[]
  const seen = new Set<string>();
  const headlines: NewsHeadline[] = [];

  for (const r of allResults) {
    if (!r.title || !r.url) continue;
    const key = r.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);

    let source = "Web";
    try {
      const hostname = new URL(r.url).hostname.replace(/^www\./, "");
      source = formatSource(hostname);
    } catch { /* use default */ }

    headlines.push({ title: r.title, source });
    if (headlines.length >= 25) break;
  }

  return headlines;
}

const SOURCE_MAP: Record<string, string> = {
  "bloomberg.com": "Bloomberg",
  "ft.com": "Financial Times",
  "wsj.com": "WSJ",
  "nytimes.com": "NYT",
  "reuters.com": "Reuters",
  "cnbc.com": "CNBC",
  "techcrunch.com": "TechCrunch",
  "theverge.com": "The Verge",
  "wired.com": "Wired",
  "hbr.org": "HBR",
  "technologyreview.com": "MIT Tech Review",
  "forbes.com": "Forbes",
  "axios.com": "Axios",
  "venturebeat.com": "VentureBeat",
};

function formatSource(hostname: string): string {
  const clean = hostname.replace(/^www\./, "");
  return (
    SOURCE_MAP[clean] ||
    clean.split(".")[0].charAt(0).toUpperCase() + clean.split(".")[0].slice(1)
  );
}

async function fetchBraveNews(apiKey: string, userCtx: UserContext): Promise<string[]> {
  const queries: string[] = [];

  // Industry-specific queries first (highest relevance)
  if (userCtx.industry) {
    queries.push(`"${userCtx.industry}" AND ("trend" OR "growth" OR "disruption" OR "news")`);
    queries.push(`"AI" AND "${userCtx.industry}" AND ("impact" OR "adoption" OR "launch")`);
  }

  // Watched companies (high relevance)
  if (userCtx.watchingCompanies.length > 0) {
    queries.push(userCtx.watchingCompanies.slice(0, 3).map(c => `"${c}"`).join(" OR "));
  }

  // Mission-relevant queries
  for (const mission of userCtx.activeMissions.slice(0, 2)) {
    const keywords = mission.split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(" ");
    if (keywords) queries.push(keywords);
  }

  // Objective-derived queries
  for (const obj of (userCtx.objectives || []).slice(0, 2)) {
    const keywords = obj.split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(" ");
    if (keywords) queries.push(keywords);
  }

  // General AI queries (only if we lack user-specific queries, and contextualized to industry)
  if (queries.length < 3) {
    if (userCtx.industry) {
      queries.push(`"AI" AND "${userCtx.industry}" AND ("pricing" OR "launch" OR "release")`);
    } else {
      queries.push('"AI" AND ("pricing" OR "API" OR "launch" OR "release")');
    }
  }

  // Role-specific query (contextualized with industry)
  if (userCtx.role) {
    queries.push(`"${userCtx.role}" AND "${userCtx.industry || 'business'}" AND ("trends" OR "strategy" OR "innovation")`);
  }

  const allResults: Array<{
    title: string;
    meta_url?: { hostname: string };
  }> = [];

  const queryResults = await Promise.allSettled(
    queries.map(async (query) => {
      const params = new URLSearchParams({
        q: query,
        freshness: "pw",
        count: "10",
        country: "US",
        search_lang: "en",
      });
      const response = await fetch(
        `https://api.search.brave.com/res/v1/news/search?${params}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": apiKey,
          },
        }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    })
  );

  for (const result of queryResults) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      allResults.push(...result.value);
    } else if (result.status === "rejected") {
      console.warn("Brave query failed:", result.reason);
    }
  }

  if (allResults.length === 0) throw new Error("No Brave results");

  const seen = new Set<string>();
  const titles: string[] = [];
  for (const r of allResults) {
    if (!r.title || !r.meta_url?.hostname) continue;
    const key = r.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);
    const title = r.title.replace(/\s*[-|]\s*[^-|]+$/, "").trim();
    if (title.length > 15) {
      titles.push(`${title} (${formatSource(r.meta_url.hostname)})`);
    }
    if (titles.length >= 25) break;
  }
  return titles;
}

async function curateWithOpenAI(
  rawTitles: string[],
  apiKey: string,
  userCtx: UserContext,
  modelOverride?: string
): Promise<NewsHeadline[]> {
  const today = new Date().toISOString().split("T")[0];

  const contextLines: string[] = [];
  if (userCtx.role) contextLines.push(`Role: ${userCtx.role}`);
  if (userCtx.company) contextLines.push(`Company: ${userCtx.company}`);
  if (userCtx.industry) contextLines.push(`Industry: ${userCtx.industry}`);
  if (userCtx.activeMissions.length > 0) contextLines.push(`Current priorities: ${userCtx.activeMissions.slice(0, 3).join("; ")}`);
  if (userCtx.objectives?.length > 0) contextLines.push(`Goals: ${userCtx.objectives.slice(0, 2).join("; ")}`);
  if (userCtx.recentDecisions.length > 0) contextLines.push(`Decisions on their desk: ${userCtx.recentDecisions.slice(0, 2).join("; ")}`);

  const leaderDesc = `${userCtx.role || 'executive'}${userCtx.industry ? ` in ${userCtx.industry}` : ''}${userCtx.company ? ` at ${userCtx.company}` : ''}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelOverride || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a news curator for a specific leader.
${contextLines.join("\n")}

Rewrite raw headlines through a cynical, experienced operator's lens. Assign each: SIGNAL, DECISION TRIGGER, or KRISH'S TAKE.
PRIORITIZE stories that directly affect their industry, role, or active priorities.
DEPRIORITIZE generic AI news unless it specifically changes something for this leader.
Return JSON: [{"title": "[TAG] headline", "source": "Source"}]. Select 10-15. Skip governance, geopolitics.`,
        },
        {
          role: "user",
          content: `Today: ${today}. Pick 10-15 most relevant for this ${leaderDesc}. Rank by direct relevance to their situation.\n\n${rawTitles.map((h, i) => `${i + 1}. ${h}`).join("\n")}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI curation error: ${response.status}`);
  const data = await response.json();
  return parseLLMJson(data?.choices?.[0]?.message?.content || "");
}

function parseLLMJson(content: string): NewsHeadline[] {
  const cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  let parsed: unknown[];

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) {
      try {
        parsed = JSON.parse(cleaned.substring(start, end + 1));
      } catch {
        const lastComplete = cleaned.lastIndexOf("},");
        if (lastComplete > 0) {
          try {
            parsed = JSON.parse(
              cleaned.substring(start, lastComplete + 1) + "]"
            );
          } catch {
            throw new Error("Could not parse LLM JSON");
          }
        } else {
          throw new Error("Could not parse LLM JSON");
        }
      }
    } else {
      throw new Error("No JSON array in response");
    }
  }

  return (Array.isArray(parsed) ? parsed : [])
    .filter(
      (h: unknown): h is { title: string; source: string } =>
        typeof h === "object" &&
        h !== null &&
        "title" in h &&
        "source" in h &&
        typeof (h as Record<string, unknown>).title === "string" &&
        ((h as Record<string, unknown>).title as string).length > 15
    )
    .map((h) => ({ title: h.title, source: h.source }))
    .slice(0, 15);
}

const STATIC_FALLBACK: NewsHeadline[] = [
  { title: "[SIGNAL] Claude 4 outperforms GPT-5 on coding benchmarks, build-vs-buy math shifts again", source: "The Verge" },
  { title: "[DECISION TRIGGER] OpenAI cuts API pricing 40%, time to reevaluate your LLM vendor costs", source: "TechCrunch" },
  { title: "[KRISH'S TAKE] 80% of companies using AI does not equal 80% using it well. Most run demos, not systems", source: "Analysis" },
  { title: "[SIGNAL] AI agents now handle 60% of tier-1 support tickets at companies that deployed them", source: "Forbes" },
  { title: "[NOISE] Another AI startup raises $200M to build the future of work. Wake me when they ship", source: "TechCrunch" },
  { title: "[DECISION TRIGGER] Google drops Gemini API prices by 35%, your vendor spreadsheet needs updating", source: "Bloomberg" },
  { title: "[SIGNAL] One-person businesses generating $1M+ revenue using AI for sales, support, and fulfilment", source: "WSJ" },
  { title: "[KRISH'S TAKE] If your AI strategy is a slide deck, it is not a strategy. Ship something this week", source: "Analysis" },
];

// ── Second-Pass Curation ──────────────────────────────────────────

async function curateHeadlines(
  headlines: NewsHeadline[],
  userCtx: UserContext,
  openaiKey: string,
  briefingType: BriefingType,
  customContext?: string,
  modelOverride?: string,
): Promise<NewsHeadline[]> {
  if (headlines.length <= 8) return headlines;

  const typeHint = briefingType !== 'default'
    ? `This is a "${briefingType}" briefing${customContext ? `: "${customContext}"` : ''}. Prioritize stories that serve this specific angle.`
    : '';

  const feedbackHint = userCtx.feedbackPreferences.preferredTags.length > 0
    ? `This leader tends to find ${userCtx.feedbackPreferences.preferredTags.join(', ')} stories most useful.${userCtx.feedbackPreferences.preferredSources.length > 0 ? ` Stories from ${userCtx.feedbackPreferences.preferredSources.join(', ')} resonate.` : ''} Lean toward these.`
    : '';

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelOverride || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a ruthless news editor. Your job: cut the weak stories and keep only what would make a busy ${userCtx.role || 'executive'}${userCtx.industry ? ` in ${userCtx.industry}` : ''}${userCtx.company ? ` at ${userCtx.company}` : ''} stop what they are doing to listen. ${typeHint} ${feedbackHint}
${userCtx.activeMissions.length > 0 ? `Their active priorities: ${userCtx.activeMissions.slice(0, 3).join('; ')}. Stories touching these priorities should rank higher.` : ''}
${userCtx.recentDecisions.length > 0 ? `Decisions on their desk: ${userCtx.recentDecisions.slice(0, 2).join('; ')}. News informing these decisions is high-priority.` : ''}
${(userCtx.objectives?.length || 0) > 0 ? `Strategic goals: ${userCtx.objectives.slice(0, 2).join('; ')}.` : ''}

Rules:
- Deduplicate similar stories (keep the strongest angle)
- Kill anything incremental ("Company X hires Y" unless Y is a massive name)
- Kill anything that is just commentary without new information
- Kill generic AI news that does not concretely affect this leader's industry or decisions
- Rank by: does this change a decision, reveal a shift, or surface a must-know number for THIS specific leader?
- Return the top 6-8, ordered by impact to this leader

Return ONLY a JSON array: [{"title": "headline", "source": "Source"}]`,
        },
        {
          role: "user",
          content: headlines.map((h, i) => `${i + 1}. ${h.title} (${h.source})`).join("\n"),
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    console.warn("Second-pass curation failed, using original headlines");
    return headlines.slice(0, 8);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return headlines.slice(0, 8);

  try {
    return parseLLMJson(content);
  } catch {
    return headlines.slice(0, 8);
  }
}

// ── Personalisation + Script Generation ────────────────────────────

function buildCohortToneDirective(learningStyle: string): string {
  switch (learningStyle.toLowerCase()) {
    case 'leading':
    case 'strategic_visionary':
      return 'This leader thinks in market maps and competitive dynamics. Lead with implications, not descriptions. "This shifts the calculus on..." works better than "This happened."';
    case 'advancing':
    case 'pragmatic_executor':
      return 'This leader wants to know what changed and what to do about it. Be concrete. "Your move: ..." or "This means your team should..." Hit the action before the analysis.';
    case 'establishing':
    case 'analytical_optimizer':
      return 'This leader responds to numbers. Lead with the data point. "40% drop", "$2B market", "3x faster". Then explain what the number means for their specific situation.';
    case 'emerging':
    case 'collaborative_builder':
      return 'This leader thinks about team and organizational impact. Frame through "this affects how your team...", "your org should watch...", "the people implication is..."';
    default:
      return 'Lead with what changed, then why it matters to them specifically.';
  }
}

function buildBriefingPurposeBlock(briefingType: BriefingType, customContext?: string): string {
  switch (briefingType) {
    case 'macro_trends':
      return 'PURPOSE: This briefing is for big-picture strategic thinking. Frame everything as: what trend is shifting, how fast, and what it means for their positioning. Think quarterly strategy review, not daily news.';
    case 'vendor_landscape':
      return 'PURPOSE: This briefing prepares the leader for vendor conversations. Frame everything as: what changed in the tool/platform landscape, pricing shifts, capability gaps closing, and build-vs-buy implications.';
    case 'competitive_intel':
      return 'PURPOSE: This briefing is competitive intelligence. Frame everything as: what did their competitors or watchlist companies do, what does it signal about market direction, and where does it create an opening or threat.';
    case 'boardroom_prep':
      return 'PURPOSE: This briefing prepares the leader for a board or executive presentation. Frame everything as: what would a board member ask about, what data points tell the story, and what is the "so what" for the business.';
    case 'team_update':
      return 'PURPOSE: This briefing is for team communication. Frame everything as: what does the team need to know, what practical tools or changes affect their work, and what should they start/stop doing.';
    case 'ai_landscape':
      return 'PURPOSE: This briefing uses live AI model benchmark data. Frame everything as: which models matter for their specific use cases, pricing changes that affect ROI, and capability shifts that change build-vs-buy decisions. Lead with what changed and why it matters to them.';
    case 'custom_voice':
      return customContext
        ? `PURPOSE: The leader specifically asked for: "${customContext}". Shape every story through this lens. Make every insight directly useful for their stated need.`
        : '';
    default:
      return '';
  }
}

async function generateBriefingScript(
  headlines: NewsHeadline[],
  userCtx: UserContext,
  openaiKey: string,
  briefingType: BriefingType = 'default',
  customContext?: string,
  modelOverride?: string,
  training?: TrainingMaterial,
  userDirectives?: string,
): Promise<{ segments: BriefingSegment[]; script: string; training_version: number }> {
  const contextBlock = [
    `Name: ${userCtx.name}`,
    `Role: ${userCtx.role}`,
    userCtx.company ? `Company: ${userCtx.company}` : null,
    userCtx.industry ? `Industry: ${userCtx.industry}` : null,
    userCtx.teamSize ? `Team size: ${userCtx.teamSize}` : null,
    userCtx.strengths.length
      ? `Strengths: ${userCtx.strengths.join(", ")}`
      : null,
    userCtx.weaknesses.length
      ? `Blind spots: ${userCtx.weaknesses.join(", ")}`
      : null,
    userCtx.activeMissions.length
      ? `Currently working on: ${userCtx.activeMissions.join("; ")}`
      : null,
    userCtx.recentDecisions.length
      ? `Active decisions on their desk: ${userCtx.recentDecisions.join("; ")}`
      : null,
    userCtx.confirmedPatterns.length
      ? `Behavioral patterns: ${userCtx.confirmedPatterns.join("; ")}`
      : null,
    userCtx.watchingCompanies.length
      ? `Companies they watch: ${userCtx.watchingCompanies.join(", ")}`
      : null,
    userCtx.objectives?.length
      ? `Strategic goals: ${userCtx.objectives.join("; ")}`
      : null,
    userCtx.blockers?.length
      ? `Challenges they face: ${userCtx.blockers.join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const headlinesBlock = headlines
    .map((h, i) => `${i + 1}. ${h.title} (${h.source})`)
    .join("\n");

  const cohortDirective = buildCohortToneDirective(userCtx.learningStyle);
  const purposeBlock = buildBriefingPurposeBlock(briefingType, customContext);
  const firstName = userCtx.name.split(" ")[0];

  // ── Training-material injection ────────────────────────────────────
  // All voice / typography / dont-phrases / self-check / exemplars come from
  // the authored YAML so voice tuning is a YAML edit, not a redeploy.
  const trainingBlocks: string[] = [];
  let trainingVersion = 0;
  if (training) {
    trainingVersion = training.version;
    trainingBlocks.push(
      `<voice_card>\n` +
      `register: ${training.voice_card.register}\n` +
      `adjectives: ${training.voice_card.adjectives.join(", ")}\n` +
      `anti_adjectives: ${training.voice_card.anti_adjectives.join(", ")}\n` +
      `sentence_length: ${training.voice_card.sentence_length}\n` +
      `</voice_card>`
    );
    trainingBlocks.push(
      `<do_phrases>\n` +
      `openers: ${training.do_phrases.openers.join(" | ")}\n` +
      `connectors: ${training.do_phrases.connectors.join(" | ")}\n` +
      `closers: ${training.do_phrases.closers.join(" | ")}\n` +
      `</do_phrases>`
    );
    trainingBlocks.push(
      `<dont_phrases>\nNEVER use these: ${training.dont_phrases.join("; ")}\n</dont_phrases>`
    );
    trainingBlocks.push(
      `<typography_rules>\n` +
      `Forbidden characters: ${training.typography_rules.forbidden_chars.join(" ")}\n` +
      `Forbidden tokens: ${training.typography_rules.forbidden_tokens.join(", ")}\n` +
      `</typography_rules>`
    );
    const rubricKey = briefingType === 'default' ? 'daily_brief' : briefingType;
    const rubric = training.structural_rubric[rubricKey] || training.structural_rubric.daily_brief;
    if (rubric) {
      trainingBlocks.push(
        `<structural_rubric>\n` +
        `hook: ${rubric.hook}\n` +
        `body: ${rubric.body}\n` +
        `close: ${rubric.close}\n` +
        `word_budget: ${rubric.word_budget} (tolerance \u00B1${Math.round(rubric.tolerance * 100)}%)\n` +
        `</structural_rubric>`
      );
    }
    const exemplarKey = briefingType === 'default' ? 'daily_brief' : briefingType;
    const exemplars = training.briefing_exemplars[exemplarKey];
    if (exemplars && exemplars.length > 0) {
      trainingBlocks.push(`<example>\n${exemplars[0]}\n</example>`);
    }
    trainingBlocks.push(
      `<self_check_gate>\n` +
      `Before returning, silently verify each:\n` +
      training.self_check_gate.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\n</self_check_gate>`
    );
  }
  if (userDirectives && userDirectives.trim().length > 0) {
    trainingBlocks.push(
      `<user-directives>\n` +
      `These are the user's personal rules for their briefings. Apply them AFTER the house rules above:\n` +
      userDirectives.trim() +
      `\n</user-directives>`
    );
  }
  const trainingInjection = trainingBlocks.join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelOverride || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are briefing a peer, not presenting to an audience. Think: sharp friend who read everything so they don't have to.

${trainingInjection}

YOUR VOICE:
- Short sentences. Vary rhythm. One long, then two short, then a half-sentence opinion.
- Drop opinions between stories, not just at the end. "That is a bigger deal than it sounds." or "Worth watching, but not worth panicking over."
- Transitions ARE insights, not connectors. Never say "moving on to", "in other news", "additionally", "furthermore", "let's dive in", or "let's take a look at".
- The bridge between stories should be a thought: "Which brings up something related..." or just jump straight in.

${cohortDirective}

${purposeBlock}

CRITICAL RULES:
- Never mention "Mindmaker", "CTRL", or any platform/product name. You are a trusted advisor.
- Use first name only: "${firstName}". Never "as a Mindmaker user" or similar.
- No em dashes. Use commas, semicolons, or periods instead.
- No filler phrases: "it's worth noting", "interestingly", "it remains to be seen", "this is significant because"
- Show, don't tell. Instead of "This is important because...", just explain the impact directly.

YOU WILL:
1. Select 3-5 headlines (NOT 5-8) that are MOST impactful for this specific leader
2. REWRITE each headline through their lens. Not generic news. Frame from THEIR perspective:
   - Generic: "OpenAI cuts API pricing 40%"
   - For a SaaS CEO: "Your LLM costs just dropped 40%"
   - For a marketing VP: "Your AI content pipeline just got cheaper"
3. For each story, explain impact in 2-3 sentences. Reference their decisions, missions, or blind spots.
4. Apply framework nudges naturally (never name the framework):
   - "Worth pressure-testing this against..."
   - "The question is whether this changes your assumptions about..."
   - "Before your next [meeting/quarter], consider..."

OUTPUT JSON:
{
  "segments": [
    {
      "headline": "Rewritten headline, under 15 words, from THEIR perspective",
      "analysis": "2-3 sentences: specific impact on THEM + one framework nudge",
      "framework_tag": "signal|decision_trigger|krishs_take",
      "source": "Source Name",
      "relevance_reason": "One sentence: why this was selected for THIS leader"
    }
  ],
  "script": "The audio script. 500-600 words max. Structure below."
}

SCRIPT STRUCTURE (this is what they hear):
1. COLD OPEN (1 sentence, no greeting): "${firstName}, [one punchy hook]." Examples: "${firstName}, three things before your first meeting." or "${firstName}, one number to know this morning: [stat]."
2. 3-5 STORIES: Each gets 80-120 words. One sentence: what happened. Two sentences: why it changes something for THEM. One sentence: reframe or decision nudge.
3. CLOSER (1-2 sentences): "The one thing from today worth acting on: [specific action tied to their active decision or mission]."

Total: 500-600 words. 3-4 minutes spoken. Every sentence earns its place.`,
        },
        {
          role: "user",
          content: `LEADER CONTEXT:\n${contextBlock}\n\nTODAY'S HEADLINES:\n${headlinesBlock}\n\nBuild a ${briefingType === 'default' ? 'daily' : briefingType.replace(/_/g, ' ')} briefing. Select 3-5 stories. Write the script as if you are personally briefing this leader. Tight, sharp, zero filler.`,
        },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`GPT-4o error: ${response.status} ${err.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from GPT-4o");

  const parsed = JSON.parse(content);

  // Post-process: apply typography rules + strip banned phrases. Both rule
  // sets come from the training material so tuning is a YAML edit.
  let script = parsed.script || "";
  if (training) {
    script = applyTypographyRules(script, training);
    script = stripBannedPhrases(script, training);
  } else {
    // Fallback when training material is unavailable. Keep the minimum.
    script = script.replace(/\u2014/g, ", ").replace(/\u2013/g, "-");
    script = script.replace(/\s{2,}/g, " ").trim();
  }

  return {
    segments: parsed.segments || [],
    script,
    training_version: trainingVersion,
  };
}

// ── AI Landscape Headline Generator ────────────────────────────────

function generateAILandscapeHeadlines(models: AAModel[], userCtx: UserContext): NewsHeadline[] {
  const headlines: NewsHeadline[] = [];
  const ranked = models
    .filter((m) => m.artificial_analysis_intelligence_index != null)
    .sort((a, b) => (b.artificial_analysis_intelligence_index ?? 0) - (a.artificial_analysis_intelligence_index ?? 0));

  if (ranked.length === 0) return headlines;

  // Top model insight
  const top = ranked[0];
  headlines.push({
    title: `[SIGNAL] ${top.name} by ${top.model_creator?.name || 'Unknown'} leads intelligence benchmarks at ${top.artificial_analysis_intelligence_index} - ${top.price_1m_blended_3_to_1 != null ? `$${top.price_1m_blended_3_to_1.toFixed(2)}/1M tokens` : 'pricing TBD'}`,
    source: "Artificial Analysis",
  });

  // Best value model (high quality, low cost)
  const valueModels = ranked
    .filter((m) => (m.price_1m_blended_3_to_1 ?? 999) < 2.0 && (m.artificial_analysis_intelligence_index ?? 0) > 60)
    .sort((a, b) => (a.price_1m_blended_3_to_1 ?? 999) - (b.price_1m_blended_3_to_1 ?? 999));
  if (valueModels.length > 0) {
    const best = valueModels[0];
    headlines.push({
      title: `[DECISION TRIGGER] ${best.name} scores ${best.artificial_analysis_intelligence_index} on intelligence at just $${best.price_1m_blended_3_to_1?.toFixed(2)}/1M tokens - strongest value play right now`,
      source: "Artificial Analysis",
    });
  }

  // Coding leader
  const codingRanked = models
    .filter((m) => m.artificial_analysis_coding_index != null)
    .sort((a, b) => (b.artificial_analysis_coding_index ?? 0) - (a.artificial_analysis_coding_index ?? 0));
  if (codingRanked.length > 0) {
    const codingTop = codingRanked[0];
    headlines.push({
      title: `[SIGNAL] ${codingTop.name} dominates coding benchmarks at ${codingTop.artificial_analysis_coding_index} - ${userCtx.role?.toLowerCase().includes('cto') || userCtx.industry?.toLowerCase().includes('tech') ? 'directly relevant to your engineering stack decisions' : 'matters if your team builds with AI'}`,
      source: "Artificial Analysis",
    });
  }

  // Speed leader
  const speedRanked = models
    .filter((m) => m.median_output_tokens_per_second != null && m.median_output_tokens_per_second > 0)
    .sort((a, b) => (b.median_output_tokens_per_second ?? 0) - (a.median_output_tokens_per_second ?? 0));
  if (speedRanked.length > 0) {
    const fastest = speedRanked[0];
    headlines.push({
      title: `[SIGNAL] ${fastest.name} outputs ${fastest.median_output_tokens_per_second?.toFixed(0)} tokens/sec - fastest in class for real-time applications`,
      source: "Artificial Analysis",
    });
  }

  // Price compression trend
  const affordableHighQuality = ranked.filter(
    (m) => (m.artificial_analysis_intelligence_index ?? 0) > 70 && (m.price_1m_blended_3_to_1 ?? 999) < 1.5
  );
  if (affordableHighQuality.length >= 3) {
    headlines.push({
      title: `[KRISH'S TAKE] ${affordableHighQuality.length} models now score above 70 on intelligence at under $1.50/1M tokens. The cost barrier to high-quality AI is collapsing.`,
      source: "Analysis",
    });
  }

  // Provider diversity
  const providers = new Set(ranked.slice(0, 10).map((m) => m.model_creator?.name).filter(Boolean));
  if (providers.size >= 4) {
    headlines.push({
      title: `[SIGNAL] Top 10 models span ${providers.size} providers (${[...providers].slice(0, 4).join(', ')}${providers.size > 4 ? ' and more' : ''}) - vendor lock-in risk is dropping`,
      source: "Artificial Analysis",
    });
  }

  // Math/reasoning leader
  const mathRanked = models
    .filter((m) => m.artificial_analysis_math_index != null)
    .sort((a, b) => (b.artificial_analysis_math_index ?? 0) - (a.artificial_analysis_math_index ?? 0));
  if (mathRanked.length > 0 && mathRanked[0].artificial_analysis_math_index !== top.artificial_analysis_math_index) {
    headlines.push({
      title: `[SIGNAL] ${mathRanked[0].name} leads math and reasoning benchmarks at ${mathRanked[0].artificial_analysis_math_index} - different leader than overall intelligence`,
      source: "Artificial Analysis",
    });
  }

  // Personalized insight based on user context
  if (userCtx.objectives?.length > 0) {
    headlines.push({
      title: `[KRISH'S TAKE] Given your objective "${userCtx.objectives[0]}", the model landscape suggests ${ranked.length > 5 ? 'strong optionality' : 'limited but improving choices'} across providers. The quality-to-cost ratio has never been better for leaders investing in AI.`,
      source: "Analysis",
    });
  }

  return headlines.slice(0, 10);
}

// ── v2 Pipeline (evidence-based lens + embeddings) ────────────────

interface V2FetchResult {
  candidates: CandidateHeadline[];
  provider: string;
}

/**
 * Wrap a per-provider fetch with a hard timeout and a minimal retry.
 * Returns an empty array on failure - Stage 3 never lets one slow or broken
 * provider block the briefing.
 */
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function v2FetchTavily(apiKey: string, queries: PlannedQuery[]): Promise<V2FetchResult> {
  const candidates: CandidateHeadline[] = [];
  await Promise.allSettled(queries.map(async (q) => {
    try {
      const res = await withTimeout(
        fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query: q.query,
            search_depth: "advanced",
            topic: "news",
            days: 7,
            max_results: 8,
            include_answer: false,
          }),
        }),
        8_000,
        `Tavily(${q.target_lens_item_id})`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      for (const r of results) {
        if (!r?.title || !r?.url) continue;
        let source = "Web";
        try {
          const host = new URL(r.url).hostname.replace(/^www\./, "");
          source = formatSource(host);
        } catch { /* keep default */ }
        candidates.push({
          title: r.title,
          source,
          snippet: typeof r.content === "string" ? r.content.slice(0, 280) : undefined,
          provider: "tavily",
        });
      }
    } catch (e) {
      console.warn(`v2 Tavily query failed (${q.target_lens_item_id}):`, e instanceof Error ? e.message : e);
    }
  }));
  return { candidates, provider: "tavily" };
}

async function v2FetchBrave(apiKey: string, queries: PlannedQuery[]): Promise<V2FetchResult> {
  const candidates: CandidateHeadline[] = [];
  await Promise.allSettled(queries.map(async (q) => {
    try {
      const params = new URLSearchParams({
        q: q.query,
        freshness: "pw",
        count: "10",
        country: "US",
        search_lang: "en",
      });
      const res = await withTimeout(
        fetch(`https://api.search.brave.com/res/v1/news/search?${params}`, {
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": apiKey,
          },
        }),
        8_000,
        `Brave(${q.target_lens_item_id})`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      for (const r of results) {
        if (!r?.title || !r?.meta_url?.hostname) continue;
        const title = (r.title as string).replace(/\s*[-|]\s*[^-|]+$/, "").trim();
        if (title.length < 15) continue;
        candidates.push({
          title,
          source: formatSource(r.meta_url.hostname),
          snippet: typeof r.description === "string" ? (r.description as string).slice(0, 280) : undefined,
          provider: "brave",
        });
      }
    } catch (e) {
      console.warn(`v2 Brave query failed (${q.target_lens_item_id}):`, e instanceof Error ? e.message : e);
    }
  }));
  return { candidates, provider: "brave" };
}

async function v2FetchPerplexity(apiKey: string, queries: PlannedQuery[]): Promise<V2FetchResult> {
  // Perplexity's Sonar is slow; send ONE request covering all planned queries.
  const queryBlock = queries.map((q, i) => `${i + 1}. ${q.query}`).join("\n");
  try {
    const res = await withTimeout(
      fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content:
                `Return 10-15 recent news headlines (past 7 days) that answer the queries below. For each, include a 1-2 sentence snippet and the publication. No commentary. Return ONLY JSON: [{"title":"","source":"","snippet":""}].`,
            },
            { role: "user", content: queryBlock },
          ],
          temperature: 0.1,
        }),
      }),
      10_000,
      "Perplexity",
    );
    if (!res.ok) return { candidates: [], provider: "perplexity" };
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    let parsed: unknown[] = [];
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      if (start !== -1 && end > start) {
        try { parsed = JSON.parse(cleaned.substring(start, end + 1)); } catch { /* drop */ }
      }
    }
    const candidates: CandidateHeadline[] = (Array.isArray(parsed) ? parsed : [])
      .filter((h): h is { title: string; source: string; snippet?: string } =>
        !!h && typeof h === "object" &&
        typeof (h as Record<string, unknown>).title === "string" &&
        typeof (h as Record<string, unknown>).source === "string" &&
        ((h as Record<string, unknown>).title as string).length > 15,
      )
      .map(h => ({
        title: h.title,
        source: h.source,
        snippet: typeof h.snippet === "string" ? h.snippet.slice(0, 280) : undefined,
        provider: "perplexity",
      }));
    return { candidates, provider: "perplexity" };
  } catch (e) {
    console.warn("v2 Perplexity failed:", e instanceof Error ? e.message : e);
    return { candidates: [], provider: "perplexity" };
  }
}

/**
 * Fan out all providers with a hard wall-clock cap. Per red-team guidance:
 * one slow provider must not block the briefing.
 */
async function v2FetchAll(
  queries: PlannedQuery[],
  providerKeys: { perplexity?: string; tavily?: string; brave?: string },
  totalCapMs = 12_000,
): Promise<CandidateHeadline[]> {
  const tasks: Array<Promise<V2FetchResult>> = [];
  if (providerKeys.perplexity) tasks.push(v2FetchPerplexity(providerKeys.perplexity, queries));
  if (providerKeys.tavily) tasks.push(v2FetchTavily(providerKeys.tavily, queries));
  if (providerKeys.brave) tasks.push(v2FetchBrave(providerKeys.brave, queries));
  if (tasks.length === 0) return [];

  const capped = Promise.race([
    Promise.allSettled(tasks),
    new Promise<Array<PromiseSettledResult<V2FetchResult>>>(resolve =>
      setTimeout(() => resolve([]), totalCapMs),
    ),
  ]);

  const results = await capped;
  const candidates: CandidateHeadline[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value?.candidates) {
      candidates.push(...r.value.candidates);
    }
  }
  return candidates;
}

interface V2PipelineArgs {
  supabase: ReturnType<typeof createClient>;
  supabaseUrl: string;
  supabaseServiceKey: string;
  openaiKey: string;
  userId: string;
  userCtx: UserContext;
  briefingType: BriefingType;
  customContext?: string;
  voiceNoteUrl?: string;
  isProOnly: boolean;
  today: string;
  resolvedScriptModel: string;
  resolvedCurationModel: string;
  providerKeys: { perplexity?: string; tavily?: string; brave?: string };
}

/**
 * v2 pipeline - evidence-based relevance.
 * Stages: lens -> query planner -> provider fan-out -> embed+dedupe+score ->
 * budget-constrained curation -> v1 script generator -> synth trigger.
 */
async function runV2Pipeline(args: V2PipelineArgs): Promise<Record<string, unknown>> {
  const {
    supabase, supabaseUrl, supabaseServiceKey, openaiKey, userId, userCtx,
    briefingType, customContext, voiceNoteUrl, isProOnly, today,
    resolvedScriptModel, resolvedCurationModel, providerKeys,
  } = args;

  const t0 = Date.now();

  // Fetch mission + decision IDs so lens_item refs point at real rows.
  const [{ data: missions }, { data: decisions }, training] = await Promise.all([
    supabase.from("user_missions").select("id, title").eq("user_id", userId).eq("status", "active").limit(3),
    supabase.from("user_decisions").select("id, decision_text").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(5),
    loadTrainingForUser(supabase, userId).catch(() => undefined),
  ]);
  const missionIds = ((missions as Array<{ id: string }> | null) ?? []).map(m => m.id);
  const decisionIds = ((decisions as Array<{ id: string }> | null) ?? []).map(d => d.id);

  const source = toLensSource(userId, userCtx, missionIds, decisionIds);

  // Stage 1: lens + user-declared excludes.
  console.log("[v2] Building importance lens...");
  const { items: lens, excludes } = await buildImportanceLens(supabase, openaiKey, source, briefingType);
  console.log(`[v2] Lens size=${lens.length}, top=${lens.slice(0, 3).map(l => `${l.type}(${l.weight.toFixed(2)})`).join(", ")}, excludes=${excludes.length}`);

  if (lens.length === 0) {
    throw new Error("Lens empty - user has no profile data to personalise against");
  }

  // Stage 2: query plan. Pass industry so queries stay inside the leader's
  // domain (e.g., a technology leader doesn't pull biomedical headlines).
  console.log("[v2] Planning queries...");
  const queries = await planQueries(openaiKey, lens, training, briefingType, customContext, source.industry);
  console.log(`[v2] Queries planned: ${queries.length}`);

  // Stage 3: provider fan-out with hard 12s cap.
  console.log("[v2] Fetching providers...");
  const tFetch = Date.now();
  const rawCandidates = await v2FetchAll(queries, providerKeys, 12_000);
  console.log(`[v2] Providers returned ${rawCandidates.length} raw candidates in ${Date.now() - tFetch}ms`);

  // Stage 4: embed + dedupe + score + exclude-filter.
  let scored: ScoredHeadline[] = [];
  if (rawCandidates.length > 0) {
    console.log("[v2] Scoring candidates...");
    const tScore = Date.now();
    scored = await dedupeAndScore(supabase, openaiKey, rawCandidates, lens, excludes);
    console.log(`[v2] ${scored.length} survivors after dedupe+excludes in ${Date.now() - tScore}ms`);
  }

  const usedFallback = scored.length === 0;

  // 2.5 EARLY INSERT so the frontend sees headlines while curation runs.
  const preliminarySegments: BriefingSegment[] = (scored.length > 0 ? scored.slice(0, 8) : []).map(s => ({
    headline: s.title.replace(/^\[.*?\]\s*/, ""),
    analysis: "",
    framework_tag: "signal",
    source: s.source,
    relevance_reason: "",
    lens_item_id: s.matched_lens_item_id,
    relevance_score: Number(s.relevance_score.toFixed(4)),
  }));

  const { data: earlyBriefing, error: earlyInsertError } = await supabase
    .from("briefings")
    .insert({
      user_id: userId,
      briefing_date: today,
      briefing_type: briefingType,
      script_text: null,
      segments: preliminarySegments,
      context_snapshot: {
        ...userCtx,
        v2: true,
        lens,
        queries,
        excludes,
        used_fallback: usedFallback,
      },
      news_sources: scored.map(s => ({ title: s.title, source: s.source, provider: s.provider })),
      generation_model: resolvedScriptModel,
      custom_context: customContext || null,
      voice_note_url: voiceNoteUrl || null,
      is_pro_only: isProOnly,
      schema_version: 2,
    })
    .select("id")
    .single();

  if (earlyInsertError) throw earlyInsertError;
  const briefingId = (earlyBriefing as { id: string }).id;
  console.log(`[v2] Preliminary briefing inserted: ${briefingId}`);

  if (scored.length === 0) {
    // No candidates survived - return the briefing with an empty curated segment list.
    // Client will show a friendly "no new stories worth your time today" state.
    return {
      briefing_id: briefingId,
      already_exists: false,
      has_audio: false,
      segment_count: 0,
      briefing_type: briefingType,
      used_fallback: true,
      pipeline_version: 2,
    };
  }

  // Stage 5: budget-constrained curation.
  const rubricKey = briefingType === "default" ? "daily_brief" : briefingType;
  const rubric = training?.structural_rubric[rubricKey] ?? training?.structural_rubric.daily_brief;
  const wordBudget = rubric ? { target: rubric.word_budget, tolerance: rubric.tolerance } : { target: 450, tolerance: 0.15 };
  const targetCount = segmentCountFromBudget(wordBudget);

  const leaderDesc = `${userCtx.role || "executive"}${userCtx.industry ? ` in ${userCtx.industry}` : ""}${userCtx.company ? ` at ${userCtx.company}` : ""}`;

  console.log(`[v2] Curating ${targetCount} segments from ${scored.length} candidates...`);
  const curated: CuratedSegment[] = await curateSegments(
    openaiKey,
    scored,
    lens,
    briefingType,
    customContext,
    leaderDesc,
    targetCount,
    resolvedCurationModel,
  );
  console.log(`[v2] Curation produced ${curated.length} segments`);

  // Stage 6: v1 script generator, now fed curated segments instead of raw headlines.
  const { data: directivesRow } = await supabase
    .from("user_briefing_directives")
    .select("body")
    .eq("user_id", userId)
    .maybeSingle();
  const userDirectives = ((directivesRow as { body?: string } | null)?.body) || undefined;

  const scriptHeadlines: NewsHeadline[] = curated.map(c => ({
    title: `[${c.framework_tag.toUpperCase().replace(/_/g, " ")}] ${c.headline}`,
    source: c.source,
  }));

  console.log("[v2] Generating script...");
  const { script, training_version } = await generateBriefingScript(
    scriptHeadlines,
    userCtx,
    openaiKey,
    briefingType,
    customContext,
    resolvedScriptModel,
    training,
    userDirectives,
  );
  console.log(`[v2] Script produced (training_material_version=${training_version})`);

  // Merge v2 curated segments with any script-side rewrites: we keep the v2
  // segments as-is because they carry the evidence fields; the script is the
  // narrative layer on top.
  const finalSegments: BriefingSegment[] = curated.map(c => ({
    headline: c.headline,
    analysis: c.analysis,
    framework_tag: c.framework_tag,
    source: c.source,
    relevance_reason: c.relevance_reason,
    lens_item_id: c.lens_item_id,
    relevance_score: Number(c.relevance_score.toFixed(4)),
    matched_profile_fact: c.matched_profile_fact,
  }));

  const { error: updateError } = await supabase
    .from("briefings")
    .update({
      script_text: script,
      segments: finalSegments,
    })
    .eq("id", briefingId);

  if (updateError) console.error("[v2] Failed to update briefing with polished content:", updateError);
  else console.log(`[v2] Briefing refined: ${briefingId}`);

  // Audio synthesis is user-triggered: the frontend calls synthesize-briefing
  // only when the user clicks "Generate audio". This avoids TTS spend on
  // briefings that are read but not listened to.

  console.log(`[v2] Total pipeline time: ${Date.now() - t0}ms`);

  return {
    briefing_id: briefingId,
    already_exists: false,
    has_audio: false,
    segment_count: finalSegments.length,
    briefing_type: briefingType,
    used_fallback: false,
    pipeline_version: 2,
  };
}

// ── Main Handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    const braveKey = Deno.env.get("BRAVE_SEARCH_API");
    const tavilyKey = Deno.env.get("TAVILY_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Cost-control rate limit. Briefing generation triggers 4+ external API
    // calls (Perplexity, Brave, Tavily, OpenAI, embeddings, ElevenLabs) and
    // costs ~$0.02 per run. 12/min/user is generous for legitimate use and
    // bounds runaway-loop or compromised-token cost exposure.
    const rateLimit = await checkRateLimit(
      { maxRequests: 12, windowMs: 60_000, identifier: "generate-briefing" },
      user.id,
      supabase,
    );
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          message: "You're generating briefings faster than expected. Try again in a minute.",
          retry_after_ms: Math.max(0, rateLimit.resetAt - Date.now()),
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body for briefing type and force-regenerate flag
    let briefingType: BriefingType = 'default';
    let customContext: string | undefined;
    let voiceNoteUrl: string | undefined;
    let force = false;
    let requestedVersion: 1 | 2 | undefined;

    try {
      const body = await req.json();
      if (body.briefing_type && typeof body.briefing_type === 'string') {
        briefingType = body.briefing_type as BriefingType;
      }
      if (body.custom_context && typeof body.custom_context === 'string') {
        customContext = body.custom_context;
      }
      if (body.voice_note_url && typeof body.voice_note_url === 'string') {
        voiceNoteUrl = body.voice_note_url;
      }
      if (body.force === true) {
        force = true;
      }
      if (body.briefing_version === 2 || body.briefing_version === "2") requestedVersion = 2;
      if (body.briefing_version === 1 || body.briefing_version === "1") requestedVersion = 1;
    } catch {
      // No body or invalid JSON - use defaults
    }

    const isProOnly = PRO_ONLY_TYPES.includes(briefingType);

    // Server-side subscription check for pro-only types
    if (isProOnly) {
      const { data: sub } = await supabase
        .from("edge_subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!sub) {
        return new Response(
          JSON.stringify({ error: "Edge Pro subscription required for this briefing type" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if this specific briefing type already exists today
    // (custom_voice allows multiples, others are one per day).
    //
    // The v2 pipeline inserts a "preliminary" briefing row early so the
    // user sees headlines while the script polishes. If the function
    // crashes between the preliminary insert and the final update,
    // script_text remains NULL and segments are the unpolished ones.
    // Treating that as a successful "already_exists" would lock the user
    // into bad output forever. We detect stale-incomplete rows here and
    // replace them transparently - same effect as a force-regen but the
    // user didn't have to ask. The 5-minute window is generous enough to
    // cover slow Perplexity / OpenAI runs but short enough that a real
    // crash gets recovered on the user's next visit.
    const STALE_INCOMPLETE_GRACE_MS = 5 * 60 * 1000;
    if (briefingType !== 'custom_voice') {
      const { data: existing } = await supabase
        .from("briefings")
        .select("id, audio_url, script_text, created_at")
        .eq("user_id", user.id)
        .eq("briefing_date", today)
        .eq("briefing_type", briefingType)
        .maybeSingle();

      // Stale-incomplete recovery: a briefing whose script never landed AND
      // is older than the grace window is considered crashed and replaced.
      if (
        existing &&
        !existing.script_text &&
        existing.created_at &&
        Date.now() - new Date(existing.created_at).getTime() > STALE_INCOMPLETE_GRACE_MS
      ) {
        console.warn(
          `Stale-incomplete briefing ${existing.id} (script_text null, age >5m); replacing.`,
        );
        await supabase.from("briefing_feedback").delete().eq("briefing_id", existing.id);
        await supabase.from("briefings").delete().eq("id", existing.id);
        // Fall through into the regular "no existing row" path below.
      } else if (existing && force) {
        // Force-regen idempotency: at most one force-regeneration per minute
        // per (user, date, type). Without this, a double-tap on "Refresh
        // stories" deletes the existing row, then both callers see no
        // existing row and run two parallel pipelines - burning ~$0.04 of
        // external-API spend instead of $0.02. With this check, the second
        // caller gets a clear 429 + the still-existing briefing id.
        const forceCooldown = await checkRateLimit(
          { maxRequests: 1, windowMs: 60_000, identifier: "force-regen" },
          `${user.id}:${today}:${briefingType}`,
          supabase,
        );
        if (!forceCooldown.allowed) {
          console.log(
            `Force-regen cooldown for ${user.id} ${today} ${briefingType}; returning existing briefing.`,
          );
          return new Response(
            JSON.stringify({
              briefing_id: existing.id,
              already_exists: true,
              has_audio: !!existing.audio_url,
              cooldown: true,
              retry_after_ms: Math.max(0, forceCooldown.resetAt - Date.now()),
              message: "Today's briefing was just regenerated. Try again in a minute if you need another refresh.",
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Force regeneration: delete old briefing and its feedback
        console.log(`Force regeneration: deleting briefing ${existing.id}`);
        await supabase.from("briefing_feedback").delete().eq("briefing_id", existing.id);
        await supabase.from("briefings").delete().eq("id", existing.id);
      } else if (existing) {
        return new Response(
          JSON.stringify({
            briefing_id: existing.id,
            already_exists: true,
            has_audio: !!existing.audio_url,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 0. Resolve model selections via dynamic routing (or fallback)
    const scriptModelSelection = await selectOptimalModel("briefing_script", supabase);
    const curationModelSelection = await selectOptimalModel("briefing_curation", supabase);
    const resolvedScriptModel = scriptModelSelection.model;
    const resolvedCurationModel = curationModelSelection.model;
    console.log(`Model routing: script=${resolvedScriptModel}, curation=${resolvedCurationModel}`);

    // 1. Get user context
    console.log("Fetching user context...");
    const userCtx = await getUserContext(supabase, user.id);

    // Sparse-profile guardrail: a thin profile produces a generic lens which
    // pulls broad news which matches weakly - exactly the failure mode that
    // put biomedical headlines on a technology leader's briefing. Return a
    // structured signal the UI can convert into a targeted onboarding CTA
    // instead of a bad briefing. custom_voice is user-narrated and bypasses
    // the lens pipeline, so it's allowed through.
    if (briefingType !== 'custom_voice') {
      const { data: interestRows } = await supabase
        .from("briefing_interests")
        .select("id, kind")
        .eq("user_id", user.id)
        .eq("is_active", true);
      const interests = (interestRows ?? []) as Array<{ id: string; kind: string }>;
      const positiveInterests = interests.filter(r => r.kind !== "exclude").length;
      const missionCount = userCtx.activeMissions?.length ?? 0;
      const decisionCount = userCtx.recentDecisions?.length ?? 0;
      const depth = positiveInterests + missionCount + decisionCount;
      if (depth < 5) {
        const missing: string[] = [];
        if (positiveInterests < 3) missing.push("interests");
        if (missionCount < 1) missing.push("missions");
        if (decisionCount < 1) missing.push("recent decisions");
        console.log(
          `Profile too sparse (depth=${depth}, interests=${positiveInterests}, missions=${missionCount}, decisions=${decisionCount}); returning onboarding signal.`,
        );
        return new Response(
          JSON.stringify({
            error: "profile_too_sparse",
            message: "Add more signal to your profile to unlock a tailored briefing.",
            depth,
            required: 5,
            missing,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const searchTopics = buildPersonalizedSearchTopics(userCtx);
    console.log("User context populated:", {
      name: userCtx.name,
      role: userCtx.role,
      company: userCtx.company,
      industry: userCtx.industry,
      objectives: userCtx.objectives.slice(0, 4),
      blockers: userCtx.blockers.slice(0, 3),
      preferences: userCtx.preferences.slice(0, 4),
      missions: userCtx.activeMissions,
      watchlist: userCtx.watchingCompanies,
      decisions: userCtx.recentDecisions.slice(0, 3),
      strengths: userCtx.strengths.length,
      patterns: userCtx.confirmedPatterns.length,
      learningStyle: userCtx.learningStyle,
      briefingType,
      searchTopics,
    });

    // Flag: route to v2 evidence-based pipeline if enabled.
    // Request body wins > per-user memory opt-in > env default.
    const v2EnvDefault = (Deno.env.get("BRIEFING_V2_ENABLED_DEFAULT") ?? "false").toLowerCase() === "true";
    let v2Enabled = v2EnvDefault;
    try {
      const { data: optIn } = await supabase
        .from("user_memory")
        .select("fact_value")
        .eq("user_id", user.id)
        .eq("fact_key", "briefing_v2_enabled")
        .eq("is_current", true)
        .maybeSingle();
      if (optIn && typeof (optIn as { fact_value?: unknown }).fact_value !== "undefined") {
        v2Enabled = String((optIn as { fact_value: unknown }).fact_value).toLowerCase() === "true";
      }
    } catch { /* flag lookup best-effort */ }
    if (requestedVersion === 2) v2Enabled = true;
    if (requestedVersion === 1) v2Enabled = false;

    if (v2Enabled && briefingType !== "ai_landscape") {
      const result = await runV2Pipeline({
        supabase,
        supabaseUrl,
        supabaseServiceKey,
        openaiKey,
        userId: user.id,
        userCtx,
        briefingType,
        customContext,
        voiceNoteUrl,
        isProOnly,
        today,
        resolvedScriptModel,
        resolvedCurationModel,
        providerKeys: { perplexity: perplexityKey, tavily: tavilyKey, brave: braveKey },
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch news (shaped by briefing type)
    console.log(`Fetching news for ${briefingType} briefing...`);
    let headlines: NewsHeadline[] = [];

    // AI Landscape briefing: generate synthetic headlines from live benchmark data
    if (briefingType === 'ai_landscape') {
      try {
        const aaModels = await getModelBenchmarks(supabase);
        if (aaModels.length > 0) {
          headlines = generateAILandscapeHeadlines(aaModels, userCtx);
          console.log(`AI Landscape: ${headlines.length} synthetic headlines from benchmark data`);
        }
      } catch (e) {
        console.error("AI Landscape data fetch failed:", e);
      }
    }

    // Race all available news providers in parallel instead of sequential fallback
    if (headlines.length === 0) {
      const providers: Promise<NewsHeadline[]>[] = [];

      if (perplexityKey) {
        providers.push(
          fetchWithPerplexity(perplexityKey, userCtx, briefingType, customContext)
            .then(h => {
              if (h.length === 0) throw new Error("Empty Perplexity result");
              console.log(`Perplexity: ${h.length} headlines`);
              return h;
            })
        );
      }

      if (tavilyKey && openaiKey) {
        providers.push(
          fetchWithTavily(tavilyKey, userCtx)
            .then(raw => {
              if (raw.length === 0) throw new Error("Empty Tavily result");
              return curateWithOpenAI(
                raw.map(h => `${h.title} (${h.source})`),
                openaiKey,
                userCtx,
                resolvedCurationModel
              );
            })
            .then(h => {
              if (h.length === 0) throw new Error("Empty Tavily+OpenAI result");
              console.log(`Tavily+OpenAI: ${h.length} headlines`);
              return h;
            })
        );
      }

      if (braveKey && openaiKey) {
        providers.push(
          fetchBraveNews(braveKey, userCtx)
            .then(raw => {
              if (raw.length === 0) throw new Error("Empty Brave result");
              return curateWithOpenAI(raw, openaiKey, userCtx, resolvedCurationModel);
            })
            .then(h => {
              if (h.length === 0) throw new Error("Empty Brave+OpenAI result");
              console.log(`Brave+OpenAI: ${h.length} headlines`);
              return h;
            })
        );
      }

      if (providers.length > 0) {
        try {
          headlines = await Promise.any(providers);
        } catch (e) {
          console.error("All news providers failed:", e);
        }
      }
    }

    let usedFallback = false;
    if (headlines.length === 0) {
      console.log("Using static fallback");
      headlines = STATIC_FALLBACK;
      usedFallback = true;
    }

    // 2.5 EARLY INSERT: Create preliminary briefing with raw headlines
    // so the frontend can display them immediately while curation + script run
    const preliminarySegments: BriefingSegment[] = headlines.slice(0, 8).map((h) => {
      const tagMatch = h.title.match(/^\[(SIGNAL|DECISION TRIGGER|KRISH'S TAKE|NOISE)\]\s*/i);
      const rawTag = tagMatch ? tagMatch[1].toLowerCase().replace(/\s+/g, '_') : 'signal';
      const cleanTitle = h.title.replace(/^\[.*?\]\s*/, '');
      return {
        headline: cleanTitle,
        analysis: '',
        framework_tag: rawTag,
        source: h.source,
        relevance_reason: '',
      };
    });

    const { data: earlyBriefing, error: earlyInsertError } = await supabase
      .from("briefings")
      .insert({
        user_id: user.id,
        briefing_date: today,
        briefing_type: briefingType,
        script_text: null,
        segments: preliminarySegments,
        context_snapshot: { ...userCtx, used_fallback: usedFallback },
        news_sources: headlines,
        generation_model: resolvedScriptModel,
        custom_context: customContext || null,
        voice_note_url: voiceNoteUrl || null,
        is_pro_only: isProOnly,
      })
      .select("id")
      .single();

    if (earlyInsertError) throw earlyInsertError;

    const briefingId = earlyBriefing.id;
    console.log(`Preliminary briefing inserted: ${briefingId} (${preliminarySegments.length} raw headlines)`);

    // 3. Second-pass curation: deduplicate, rank, keep top 6-8
    console.log("Running second-pass curation...");
    headlines = await curateHeadlines(headlines, userCtx, openaiKey, briefingType, customContext, resolvedCurationModel);
    console.log(`After curation: ${headlines.length} headlines`);

    // 4. Load training material + user directives, then generate briefing.
    //    Training material contains voice, typography, dont_phrases,
    //    exemplars, rubric and self-check. User directives are optional
    //    per-user prose from Settings -> Briefing Rules.
    console.log("Loading training material...");
    const training = await loadTrainingForUser(supabase, user.id).catch(e => {
      console.warn("training load failed (non-blocking):", e);
      return undefined;
    });
    const { data: directivesRow } = await supabase
      .from("user_briefing_directives")
      .select("body")
      .eq("user_id", user.id)
      .maybeSingle();
    const userDirectives = (directivesRow?.body as string | undefined) || undefined;

    console.log("Generating personalised briefing...");
    const { segments, script, training_version } = await generateBriefingScript(
      headlines,
      userCtx,
      openaiKey,
      briefingType,
      customContext,
      resolvedScriptModel,
      training,
      userDirectives,
    );
    console.log(`Briefing produced with training_material_version=${training_version}`);

    if (!script || segments.length === 0) {
      throw new Error("Failed to generate briefing content");
    }

    // 5. Update briefing with polished segments + script
    const { error: updateError } = await supabase
      .from("briefings")
      .update({
        script_text: script,
        segments,
        news_sources: headlines,
      })
      .eq("id", briefingId);

    if (updateError) {
      console.error("Failed to update briefing with polished content:", updateError);
    } else {
      console.log(`Briefing refined: ${briefingId} (${segments.length} polished segments)`);
    }

    // 6. Audio synthesis is user-triggered (see v2 path note above).

    // 7. Return briefing ID
    return new Response(
      JSON.stringify({
        briefing_id: briefingId,
        already_exists: false,
        has_audio: false,
        segment_count: segments.length,
        briefing_type: briefingType,
        used_fallback: usedFallback,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-briefing error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
