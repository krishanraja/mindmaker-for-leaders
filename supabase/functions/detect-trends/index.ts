// detect-trends: structural-shift ("trend") surfacing for Home.
//
// The Home live-headlines feed answers "what happened today". A structural SHIFT
// is different: a pattern that recurs across many DISTINCT stories over WEEKS
// (e.g. "the rise of the forward-deployed engineer"), which tells a leader how
// their org may need to change. This function reads the last ~3 weeks of the
// daily live_headlines_cache pools, has ONE LLM pass NAME candidate shifts, then
// keeps only those whose cited evidence really recurs across enough distinct
// days + sources (the deterministic verify gate in _shared/news-trends.ts). The
// LLM articulates; recurrence grounds; the gate rejects the rest.
//
// Cadence: shifts move over WEEKS, so detection runs weekly (the pg_cron job
// posts ?force=1). The client just READS the current set (a cheap select), and
// picks the most role-relevant one to surface as a Home "shift" card.
//
// Flag: TRENDS_ENABLED (default off) - additive + reversible. Off => the read
// path returns no trends, so Home reads exactly as before.
//   GET (no params, or client invoke)  -> read current news_trends (or seeds)
//   ?force=1 (cron / manual)           -> run detection + overwrite the set
//   ?debug=1                           -> run detection, return diagnostics, NO write
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWithTimeout } from "../_shared/with-timeout.ts";
import { createLogger } from "../_shared/logger.ts";
import { JUDGMENT_ECONOMY_LENS } from "../_shared/editorial-lens.ts";
import {
  buildCorpus,
  buildDetectionMessages,
  parseProposedShifts,
  populatedDayCount,
  verifyAndRank,
  SEED_SHIFTS,
  WINDOW_DAYS,
  MIN_HISTORY_DAYS,
  MAX_CORPUS,
  type DailyPool,
  type VerifiedShift,
} from "../_shared/news-trends.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = createLogger("detect-trends");
const OPENAI_TIMEOUT_MS = 30_000;

const TRENDS_ENABLED = (Deno.env.get("TRENDS_ENABLED") ?? "false") === "true";

// The client-facing trend shape (camelCase). A VerifiedShift + a stable id.
interface TrendOut extends VerifiedShift {
  id: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function seedTrends(): TrendOut[] {
  return SEED_SHIFTS.map((s, i) => ({ ...s, id: `seed-${i}` }));
}

/** Read the current detected set; empty array when none. */
async function readCurrentTrends(supabase: SupabaseClient): Promise<TrendOut[]> {
  const { data, error } = await supabase
    .from("news_trends")
    .select("id, category, title, summary, implication, evidence, day_span, source_count, momentum")
    .eq("is_current", true)
    .order("momentum", { ascending: false })
    .limit(8);
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => ({
    id: String(r.id),
    category: r.category,
    title: r.title,
    summary: r.summary,
    implication: r.implication,
    evidence: Array.isArray(r.evidence) ? r.evidence : [],
    daySpan: r.day_span ?? 0,
    sourceCount: r.source_count ?? 0,
    momentum: r.momentum ?? 0,
    seed: false,
  }));
}

/** Load the last WINDOW_DAYS of daily pools from the shared headline cache. */
async function loadPools(supabase: SupabaseClient): Promise<DailyPool[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("live_headlines_cache")
    .select("briefing_date, payload")
    .gte("briefing_date", since)
    .order("briefing_date", { ascending: false });
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => ({
    day: String(r.briefing_date),
    cards: Array.isArray(r.payload) ? r.payload : [],
  }));
}

/** The one batched LLM detection call. Empty on any failure (caller falls back). */
async function proposeShifts(openaiKey: string, corpus: ReturnType<typeof buildCorpus>) {
  const { system, user } = buildDetectionMessages(corpus, {
    thesis: JUDGMENT_ECONOMY_LENS.thesis,
    facets: JUDGMENT_ECONOMY_LENS.facets,
  });
  try {
    const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      timeoutMs: OPENAI_TIMEOUT_MS,
      provider: "openai",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      log.warn("openai non-ok", { status: res.status });
      return [];
    }
    const data = await res.json();
    return parseProposedShifts(data?.choices?.[0]?.message?.content);
  } catch (e) {
    log.warn("openai call failed", { error: e });
    return [];
  }
}

/** Overwrite the current set: retire the old, insert the freshly verified. */
async function persistTrends(supabase: SupabaseClient, shifts: VerifiedShift[]): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const { error: retireErr } = await supabase
    .from("news_trends")
    .update({ is_current: false })
    .eq("is_current", true);
  if (retireErr) log.warn("retire failed", { error: retireErr.message });
  const rows = shifts.map((s) => ({
    detected_on: today,
    category: s.category,
    title: s.title,
    summary: s.summary,
    implication: s.implication,
    evidence: s.evidence,
    day_span: s.daySpan,
    source_count: s.sourceCount,
    momentum: s.momentum,
    is_current: true,
  }));
  const { error: insErr } = await supabase.from("news_trends").insert(rows);
  if (insErr) log.error("insert failed", { error: insErr.message });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const debug = url.searchParams.get("debug") === "1";

    // Flag off: additive + reversible. No trends surface; Home reads as before.
    if (!TRENDS_ENABLED) {
      return json({ trends: [], enabled: false });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // ---- READ PATH: the cheap default the client hits every load. ----
    if (!force && !debug) {
      const current = await readCurrentTrends(supabase);
      if (current.length > 0) return json({ trends: current, source: "detected" });
      // Honest floor: no detected set yet -> curated evergreen shifts.
      return json({ trends: seedTrends(), source: "seed" });
    }

    // ---- DETECTION PATH (force / debug). ----
    const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    const pools = await loadPools(supabase);
    const populated = populatedDayCount(pools);

    // Too little history to see a durable pattern -> seeds, never overwrite.
    if (populated < MIN_HISTORY_DAYS || !openaiKey) {
      const reason = !openaiKey ? "no_openai_key" : "thin_history";
      log.info("detection skipped", { reason, populated });
      return json({
        trends: seedTrends(),
        source: "seed",
        reason,
        ...(debug ? { populatedDays: populated, windowDays: WINDOW_DAYS } : {}),
      });
    }

    const corpus = buildCorpus(pools, MAX_CORPUS);
    const proposed = await proposeShifts(openaiKey, corpus);
    const verified = verifyAndRank(proposed, corpus);

    // Only overwrite when we actually verified something, so a single bad run
    // never wipes a good set (the read path keeps serving the prior detection).
    const write = force && !debug && verified.length > 0;
    if (write) await persistTrends(supabase, verified);

    const out: TrendOut[] = (verified.length > 0 ? verified : SEED_SHIFTS as VerifiedShift[]).map(
      (s, i) => ({ ...s, id: verified.length > 0 ? `detected-${i}` : `seed-${i}` }),
    );

    return json({
      trends: out,
      source: verified.length > 0 ? "detected" : "seed",
      written: write,
      ...(debug
        ? {
            corpusSize: corpus.length,
            populatedDays: populated,
            windowDays: WINDOW_DAYS,
            proposed: proposed.length,
            verified: verified.length,
            shifts: verified.map((s) => ({
              title: s.title,
              category: s.category,
              daySpan: s.daySpan,
              sourceCount: s.sourceCount,
              momentum: s.momentum,
              evidence: s.evidence.length,
            })),
          }
        : {}),
    });
  } catch (e) {
    log.error("detect-trends error", { error: e });
    return json({ trends: [], error: (e as Error).message }, 200);
  }
});
