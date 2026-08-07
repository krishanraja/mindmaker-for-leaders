/**
 * ingest-brain - stage 1 of the harness chain, fed from what CTRL already holds.
 *
 * POST { }  ->  { source_id, facts_used, evidence, constructs, skipped }
 *
 * ingest-evidence is stage 1 for raw material a leader pastes in. This is stage
 * 1 for the material they have already given CTRL over months of use: their
 * memory facts and the decisions they put through the engine. Same tables, same
 * rules, no paste required.
 *
 * It exists because build-sort hard-fails with "there is nothing to build a
 * sort from yet" unless candidate constructs exist, and the only writer of
 * those was a function with no caller anywhere in the app. A leader with a full
 * brain could not start a sort. Now they can, from what they already have.
 *
 * NO MODEL RUNS HERE. The composition and every offset are arithmetic (see
 * _shared/brain-to-evidence.ts for why). That means this function cannot
 * fabricate, and it costs nothing to run.
 *
 * Everything written is situated and every construct is a candidate. A held
 * fact suggests a dimension; only grading it makes a rule. The schema enforces
 * the same thing from below, which is the point.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import {
  composeBrainSource,
  groupIntoConstructs,
  verifyOffsets,
  type BrainDecision,
  type BrainFact,
} from "../_shared/brain-to-evidence.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

/** Enough to compose a rich source; more than the sort could ever use. */
const FACT_LIMIT = 60;
const DECISION_LIMIT = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("ingest-brain");
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
      throw new Error("Database configuration error (unexpected project).");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Everything reads and writes as the caller. There is no service-role
    // client in this function at all: it spends nothing, so it needs no
    // privileged audit row, and RLS is then the only access path.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const [{ data: factRows }, { data: decisionRows }] = await Promise.all([
      userClient
        .from("user_memory")
        .select(
          "id, fact_label, fact_value, fact_category, fact_subtype, importance, confidence_score, verification_status, source_type, created_at",
        )
        .eq("user_id", userId)
        .eq("is_current", true)
        .order("importance", { ascending: false, nullsFirst: false })
        .limit(FACT_LIMIT),
      userClient
        .from("decision_cases")
        .select("id, statement, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(DECISION_LIMIT),
    ]);

    const facts = (factRows ?? []) as BrainFact[];
    const decisions = (decisionRows ?? []) as BrainDecision[];

    const source = composeBrainSource(facts, decisions);
    if (source.items.length === 0) {
      // Honest empty, phrased like build-sort's own refusal so the two read as
      // one system rather than two error dialects.
      return json({
        error: "nothing_to_ingest",
        message:
          "There is nothing in your brain to build a sort from yet. Capture a few things about how you work, or weigh a decision, and this fills up.",
        facts_seen: facts.length,
      }, 422);
    }

    // A wrong offset is a provenance corruption that would survive into a built
    // skill and point at the wrong words. Refuse rather than write.
    const offsets = verifyOffsets(source);
    if (!offsets.ok) {
      log.error("composed offsets did not verify", { userId, broken: offsets.broken.length });
      return json({ error: "offset_verification_failed", broken: offsets.broken.length }, 500);
    }

    const { data: sourceRow, error: sourceErr } = await userClient
      .from("evidence_sources")
      .insert({ user_id: userId, kind: "artefact", label: source.label, body: source.body })
      .select("id")
      .single();
    if (sourceErr || !sourceRow) {
      throw new Error(`evidence_sources insert failed: ${sourceErr?.message ?? "unknown"}`);
    }
    const sourceId = sourceRow.id as string;

    // kind 'declared': the leader stated these about themselves, through the
    // capture flows, and CTRL recorded them. memory_fact_id is what makes a
    // rule in a finished skill traceable back to the fact that suggested it,
    // and this is the first writer that FK has ever had.
    const evidenceRows = source.items.map((item) => ({
      user_id: userId,
      kind: "declared",
      body: item.quote,
      quote: item.quote,
      source_id: sourceId,
      quote_start: item.quoteStart,
      quote_end: item.quoteEnd,
      source_label: source.label,
      situated: true,
      situation: item.situation,
      speaker_is_owner: true,
      memory_fact_id: item.memoryFactId,
    }));

    const { data: written, error: evidenceErr } = await userClient
      .from("evidence")
      .insert(evidenceRows)
      .select("id");
    if (evidenceErr || !written || written.length === 0) {
      // Leave no source with nothing pointing at it.
      await userClient.from("evidence_sources").delete().eq("id", sourceId);
      throw new Error(`evidence insert failed: ${evidenceErr?.message ?? "unknown"}`);
    }

    const withIds = source.items.map((item, i) => ({ ...item, evidenceId: (written[i] as { id: string }).id }));
    const groups = groupIntoConstructs(withIds);

    const { data: constructs, error: constructErr } = await userClient
      .from("constructs")
      .insert(
        groups.map((g) => ({
          user_id: userId,
          scope: "person",
          status: "candidate",
          emergent_pole: g.emergentPole,
          evidence_ids: g.evidenceIds,
        })),
      )
      .select("id");
    if (constructErr) {
      log.warn("construct insert failed", { userId, error: constructErr.message });
      return json({ error: "construct_write_failed", message: constructErr.message }, 500);
    }

    log.info("brain ingested", {
      userId,
      facts: facts.length,
      evidence: written.length,
      constructs: constructs?.length ?? 0,
    });

    return json({
      source_id: sourceId,
      facts_used: source.items.filter((i) => i.memoryFactId).length,
      decisions_used: source.items.filter((i) => !i.memoryFactId).length,
      evidence: written.length,
      constructs: constructs?.length ?? 0,
      skipped: facts.length - source.items.filter((i) => i.memoryFactId).length,
    });
  } catch (err) {
    log.error("ingest-brain failed", { error: err instanceof Error ? err.message : String(err) });
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
