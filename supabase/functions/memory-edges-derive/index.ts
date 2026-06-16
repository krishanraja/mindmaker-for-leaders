// memory-edges-derive: derive honest fact-to-fact edges for the current user.
//
// POST {} -> { edges: n }
//
// Loads the caller's is_current facts, asks the LLM (Claude primary, OpenAI
// fallback - NOT Gemini, it 400s on this shape) to propose relationships ONLY
// where the fact contents justify them, then replaces the user's source='inferred'
// edges with the new set. source='user' edges (affirmed by the leader) are never
// touched. Idempotent: re-running replaces the inferred edges in place.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { fetchWithTimeout } from "../_shared/with-timeout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

const ALLOWED_RELATIONS = ["depends_on", "supports", "tension", "informs", "relates"] as const;
type Relation = (typeof ALLOWED_RELATIONS)[number];

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_REASONING_MODEL = "gpt-4o";

interface FactRow {
  id: string;
  fact_label: string;
  fact_value: string;
  fact_category: string;
}

interface ProposedEdge {
  from_fact_id: string;
  to_fact_id: string;
  relation: Relation;
  strength: number;
  rationale: string;
}

// --- LLM: Claude primary, OpenAI fallback (Gemini deliberately omitted). -----

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

async function callOpenAI(system: string, user: string, maxTokens = 2000): Promise<string> {
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
      temperature: 0.2,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no content");
  return text;
}

// Claude primary, OpenAI fallback. The prompt asks for JSON; parseLLMJson
// tolerates fenced blocks and prose wrappers.
async function reason(system: string, user: string, maxTokens = 2000): Promise<string> {
  try {
    return await callAnthropic(system, user, maxTokens);
  } catch (_e) {
    return await callOpenAI(system, user, maxTokens);
  }
}

// Tolerant JSON extractor: raw JSON, fenced blocks, or prose wrappers.
function parseLLMJson<T>(raw: string): T {
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

const SYSTEM_PROMPT =
  "You map honest relationships between a leader's known facts. You are given a numbered list of facts. " +
  "Return ONLY relationships that the fact contents clearly justify. Never invent a connection that the facts do not support; " +
  "if you are unsure, leave it out. Quality over quantity. " +
  "Each relation must be exactly one of: depends_on, supports, tension, informs, relates. " +
  'Meanings: depends_on (the from-fact cannot hold without the to-fact); supports (from-fact reinforces to-fact); ' +
  "tension (the two facts pull against each other); informs (from-fact shapes or contextualises to-fact); relates (a real but looser link). " +
  "strength is 0 to 1 (how strong the link is). rationale is one short honest sentence grounded in the two facts. " +
  'Respond with JSON only: {"edges":[{"from_fact_id":"<id>","to_fact_id":"<id>","relation":"<relation>","strength":<0-1>,"rationale":"<one sentence>"}]}. ' +
  "from_fact_id and to_fact_id must be ids from the provided list and must differ. No self-edges. If nothing is justified, return an empty edges array. " +
  "Return AT MOST 24 of the strongest, most clearly justified relationships - quality over quantity, so the map stays readable.";

function buildUserPrompt(facts: FactRow[]): string {
  const lines = facts.map(
    (f) => `id=${f.id} [${f.fact_category}] ${f.fact_label}: ${f.fact_value}`,
  );
  return `Facts:\n${lines.join("\n")}\n\nReturn the JSON object now.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("memory-edges-derive");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
      throw new Error("Database configuration error (unexpected project).");
    }

    // Auth via the caller's JWT.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    // Service-role client for the edge replacement writes (stamps user_id explicitly).
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Load the user's current facts.
    const { data: factsRaw, error: factsErr } = await admin
      .from("user_memory")
      .select("id, fact_label, fact_value, fact_category")
      .eq("user_id", userId)
      .eq("is_current", true)
      .limit(80);
    if (factsErr) throw new Error(`facts load failed: ${factsErr.message}`);

    const facts = (factsRaw ?? []) as FactRow[];
    const validIds = new Set(facts.map((f) => f.id));

    // Fewer than two facts cannot produce an honest edge. Still replace the
    // inferred set (to clear stale edges) and return 0.
    if (facts.length < 2) {
      await admin
        .from("memory_edges")
        .delete()
        .eq("user_id", userId)
        .eq("source", "inferred");
      return json({ edges: 0 });
    }

    // Ask the LLM to propose honest edges.
    let proposed: ProposedEdge[] = [];
    try {
      const raw = await reason(SYSTEM_PROMPT, buildUserPrompt(facts), 4096);
      const parsed = parseLLMJson<{ edges?: ProposedEdge[] }>(raw);
      proposed = Array.isArray(parsed?.edges) ? parsed.edges : [];
    } catch (e) {
      log.error("LLM edge derivation failed", { userId, error: e });
      throw new Error("Could not derive edges right now. Please try again.");
    }

    // Validate + dedupe. Drop anything the facts do not actually reference,
    // self-edges, bad relations, or duplicate (from,to,relation) triples.
    const seen = new Set<string>();
    const clean = proposed
      .filter((e) =>
        e &&
        typeof e.from_fact_id === "string" &&
        typeof e.to_fact_id === "string" &&
        e.from_fact_id !== e.to_fact_id &&
        validIds.has(e.from_fact_id) &&
        validIds.has(e.to_fact_id) &&
        (ALLOWED_RELATIONS as readonly string[]).includes(e.relation)
      )
      .map((e) => {
        const s = typeof e.strength === "number" && isFinite(e.strength)
          ? Math.max(0, Math.min(1, e.strength))
          : 0.5;
        const rationale = typeof e.rationale === "string" ? e.rationale.slice(0, 500) : null;
        return {
          user_id: userId,
          from_fact_id: e.from_fact_id,
          to_fact_id: e.to_fact_id,
          relation: e.relation,
          strength: s,
          rationale,
          source: "inferred" as const,
          is_active: true,
        };
      })
      .filter((e) => {
        const k = `${e.from_fact_id}|${e.to_fact_id}|${e.relation}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

    // Replace the inferred set atomically-ish: delete then insert. source='user'
    // edges are never touched.
    const { error: delErr } = await admin
      .from("memory_edges")
      .delete()
      .eq("user_id", userId)
      .eq("source", "inferred");
    if (delErr) throw new Error(`edge cleanup failed: ${delErr.message}`);

    if (clean.length > 0) {
      const { error: insErr } = await admin.from("memory_edges").insert(clean);
      if (insErr) throw new Error(`edge insert failed: ${insErr.message}`);
    }

    log.info("Derived memory edges", { userId, edges: clean.length, facts: facts.length });
    return json({ edges: clean.length });
  } catch (e) {
    log.error("memory-edges-derive handler error", { error: e });
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
