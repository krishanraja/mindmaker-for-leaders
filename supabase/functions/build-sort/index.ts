/**
 * build-sort - stage 2 of the harness chain, the build half.
 *
 * POST { surface, session_label?, context?, request_id? }
 *   -> 202 { run_id, stage: "planning" }
 *
 * Assembles one 33-screen forced-sort deck: 20 synthesised items as 5
 * constructs x 2 matched pairs, up to 6 of the person's own real artefacts, up
 * to 4 public attributed peer pieces, and 3 repeat probes appended. The budget
 * and every placement rule live in ../_shared/sort-composition.ts, which is
 * pure and unit-tested; this file does auth, IO and stage-writing only.
 *
 * Shape of the response is deliberate (CH-15). Generating ten matched pairs is
 * one large model call; the chain has no run state to poll unless we create it,
 * and section 9 bans covering a minute of work with a spinner. So a
 * harness_runs row is created first, returned immediately, and the work runs in
 * EdgeRuntime.waitUntil writing `stage` as it goes:
 *
 *   planning -> generating_pairs -> assembling -> ready
 *                                             \-> failed (+ error)
 *
 * exactly as decision-engine/pipeline.ts advances decision_cases.stage.
 *
 * Two things this function will not do, both load-bearing:
 *
 *   1. It never pads the `own` class. Fewer than six real artefacts means the
 *      deck is short and the shortfall is written into stage_detail. Model
 *      prose labelled as the person's own work would be a lie told to the one
 *      instrument that exists to measure them (CH-08 wants own items because
 *      they are REAL, not because they are six).
 *   2. It never quietly fixes a bad pair. The Phase 0.5 hand run graded items
 *      as the generator produced them precisely so the measurement lands on the
 *      generator; the same rule holds here. Deterministic rejects (empty half,
 *      unknown construct, identical halves) are counted and reported, and the
 *      em dash count is logged rather than silently rewritten.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { selectModel } from "../_shared/openai-utils.ts";
import { callLLMWithFallback, providerFromModel } from "../_shared/llm-fallback.ts";
import { checkDailySoftCap, recordAiUsage } from "../_shared/ai-usage.ts";
import {
  chooseHoldOut,
  makeRng,
  minPairSeparation,
  planDeck,
  seedFromString,
  SORT_BUDGET,
  type PairInput,
  type PeerInput,
  type PlannedItem,
} from "../_shared/sort-composition.ts";
import { peerCorpusStatus, peerSamplesForSurface, peerSourceLabel } from "../_shared/peer-corpus.ts";
import { getUserContext } from "../_shared/user-context.ts";
import {
  buildPairSystemPrompt,
  buildPairUserPrompt,
  composeContextLine,
  type PairPromptConstruct,
} from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

const MAX_SURFACE_CHARS = 120;
const MAX_LABEL_CHARS = 200;
const MAX_CONTEXT_CHARS = 600;
const MAX_REQUEST_ID_CHARS = 120;

/** Quotes handed to the generator per construct, and how much of each. */
const QUOTES_PER_CONSTRUCT = 3;
const MAX_QUOTE_CHARS = 400;
/** An own artefact longer than this is not a screen; it is a document. */
const MAX_OWN_BODY_CHARS = 4000;
const MIN_ITEM_BODY_CHARS = 40;

// EdgeRuntime is a Supabase runtime global; declared for the type checker.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

interface ConstructRow {
  id: string;
  emergent_pole: string;
  evidence_ids: string[] | null;
  created_at: string;
}

interface GeneratedPair {
  construct_id?: unknown;
  pair_index?: unknown;
  intended_dimension?: unknown;
  satisfies?: unknown;
  violates?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("build-sort");
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
      throw new Error("Database configuration error (unexpected project).");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    // Service-role client for the background writes. The response returns
    // before the deck is built, so the caller's JWT is not a safe thing to be
    // holding by then; every insert below stamps user_id explicitly and RLS
    // stays the boundary for every read path the frontend uses.
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = await req.json().catch(() => ({}));
    const surface = typeof payload?.surface === "string"
      ? payload.surface.trim().slice(0, MAX_SURFACE_CHARS)
      : "";
    const sessionLabel = typeof payload?.session_label === "string"
      ? payload.session_label.trim().slice(0, MAX_LABEL_CHARS)
      : "";
    const contextLine = typeof payload?.context === "string"
      ? payload.context.trim().slice(0, MAX_CONTEXT_CHARS)
      : "";
    const requestId = typeof payload?.request_id === "string"
      ? payload.request_id.trim().slice(0, MAX_REQUEST_ID_CHARS)
      : "";

    if (!surface) {
      return json({
        error: "Pick one surface for this sort, for example 'client updates' or 'board updates'.",
      }, 400);
    }

    // --- Idempotency (CH-15) ------------------------------------------------
    // A retried build must return the first deck, not a second one. sort_items
    // already carries UNIQUE(session_id, position), which stops a retry doubling
    // ONE session; this stops a retry creating a second session.
    if (requestId) {
      const { data: existing } = await userClient
        .from("harness_runs")
        .select("id, stage, status")
        .eq("user_id", userId)
        .eq("kind", "sort")
        .eq("stage_detail->>request_id", requestId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        log.info("build-sort idempotent replay", { userId, run_id: existing.id });
        return json({
          run_id: existing.id,
          stage: existing.stage,
          status: existing.status,
          idempotent: true,
        }, 200);
      }
    }

    const softCap = await checkDailySoftCap(admin, userId, "build-sort");

    const { data: runRow, error: runErr } = await userClient
      .from("harness_runs")
      .insert({
        user_id: userId,
        kind: "sort",
        surface,
        status: "running",
        stage: "planning",
        stage_detail: {
          ...(requestId ? { request_id: requestId } : {}),
          ...(sessionLabel ? { session_label: sessionLabel } : {}),
          budget: SORT_BUDGET,
        },
      })
      .select("id")
      .single();
    if (runErr || !runRow) throw new Error(`harness_runs insert failed: ${runErr?.message ?? "unknown"}`);
    const runId = runRow.id as string;

    const work = buildDeck(admin, {
      runId,
      userId,
      surface,
      contextLine,
      log: log.withContext({ run_id: runId, userId }),
    });

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(work);
    } else {
      // Local / fallback: await so the deck still gets built.
      await work;
    }

    return json({ run_id: runId, stage: "planning", soft_cap: softCap }, 202);
  } catch (e) {
    log.error("build-sort handler error", { error: e });
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

interface BuildParams {
  runId: string;
  userId: string;
  surface: string;
  contextLine: string;
  log: ReturnType<typeof createLogger>;
}

/**
 * The background pass. Every exit writes a terminal stage, because a run stuck
 * on 'generating_pairs' forever is worse than a run that says it failed.
 */
async function buildDeck(admin: SupabaseClient, params: BuildParams): Promise<void> {
  const { runId, userId, surface, contextLine, log } = params;
  const detail: Record<string, unknown> = {};

  const setStage = async (stage: string, extra: Record<string, unknown> = {}) => {
    Object.assign(detail, extra);
    await admin
      .from("harness_runs")
      .update({ stage, stage_detail: { ...detail }, updated_at: new Date().toISOString() })
      .eq("id", runId);
  };

  const fail = async (message: string, extra: Record<string, unknown> = {}) => {
    Object.assign(detail, extra);
    await admin
      .from("harness_runs")
      .update({
        stage: "failed",
        status: "failed",
        error: message,
        stage_detail: { ...detail },
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);
    log.warn("build-sort run failed", { reason: message });
  };

  try {
    // Merge the request_id / session_label already on the row so setStage does
    // not overwrite them with a fresh object.
    const { data: existingRun } = await admin
      .from("harness_runs")
      .select("stage_detail")
      .eq("id", runId)
      .maybeSingle();
    Object.assign(detail, (existingRun?.stage_detail as Record<string, unknown>) ?? {});

    // --- 1. constructs ------------------------------------------------------
    // Top 5 candidates, most evidence first. PostgREST cannot order by
    // array_length, so a bounded page is sorted here.
    const { data: constructRows, error: constructErr } = await admin
      .from("constructs")
      .select("id, emergent_pole, evidence_ids, created_at")
      .eq("user_id", userId)
      .eq("status", "candidate")
      .order("created_at", { ascending: false })
      .limit(50);
    if (constructErr) throw new Error(`constructs read failed: ${constructErr.message}`);

    const constructs = ((constructRows ?? []) as ConstructRow[])
      .sort((a, b) => {
        const byEvidence = (b.evidence_ids?.length ?? 0) - (a.evidence_ids?.length ?? 0);
        if (byEvidence !== 0) return byEvidence;
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      })
      .slice(0, SORT_BUDGET.constructs);

    if (constructs.length === 0) {
      await fail(
        "There is nothing to build a sort from yet. Add a call transcript or some of your writing first, and the candidates it produces become the pairs.",
        { constructs: 0 },
      );
      return;
    }

    // Evidence quotes, so the generator writes in the person's world rather
    // than a generic one. Quotes are context only; they are never reused as
    // item text (prompt rule 4).
    const evidenceIds = [...new Set(constructs.flatMap((c) => c.evidence_ids ?? []))].slice(0, 60);
    const quotesByEvidence = new Map<string, { quote: string; situation: string | null }>();
    if (evidenceIds.length > 0) {
      const { data: evidenceRows } = await admin
        .from("evidence")
        .select("id, quote, body, situation, redacted_at")
        .eq("user_id", userId)
        .in("id", evidenceIds);
      for (const row of evidenceRows ?? []) {
        // A redacted row keeps its pointer and loses its words (CH-06). It
        // contributes nothing to the prompt and that is correct.
        if (row.redacted_at) continue;
        const text = (row.quote ?? row.body ?? "").toString().trim();
        if (!text) continue;
        quotesByEvidence.set(row.id as string, {
          quote: text.slice(0, MAX_QUOTE_CHARS),
          situation: (row.situation as string | null) ?? null,
        });
      }
    }

    const promptConstructs: PairPromptConstruct[] = constructs.map((c) => {
      const evidence = (c.evidence_ids ?? [])
        .map((id) => quotesByEvidence.get(id))
        .filter((e): e is { quote: string; situation: string | null } => Boolean(e))
        .slice(0, QUOTES_PER_CONSTRUCT);
      return {
        id: c.id,
        emergentPole: c.emergent_pole,
        quotes: evidence.map((e) => e.quote),
        situation: evidence.find((e) => e.situation)?.situation ?? null,
      };
    });

    // The doc's CONTEXT block, from facts already held. Best-effort: a missing
    // profile means a generic-but-honest context, never an invented employer.
    let resolvedContext = contextLine;
    if (!resolvedContext) {
      try {
        const ctx = await getUserContext(admin, userId);
        resolvedContext = composeContextLine(
          { role: ctx.role, company: ctx.company, industry: ctx.industry },
          surface,
        );
      } catch (e) {
        log.warn("context lookup failed, using the generic block", { error: e });
        resolvedContext = composeContextLine({}, surface);
      }
    }

    await setStage("generating_pairs", {
      constructs: constructs.length,
      constructs_expected: SORT_BUDGET.constructs,
      quotes: quotesByEvidence.size,
    });

    // --- 2. one generation call --------------------------------------------
    // Temperature 0.7 on purpose: ten pairs from one call need variety in
    // subject and register, or the deck reads as ten versions of one email and
    // measures the topic instead of the construct.
    const aiResponse = await callLLMWithFallback(
      {
        messages: [
          { role: "system", content: buildPairSystemPrompt() },
          {
            role: "user",
            content: buildPairUserPrompt({
              surface,
              context: resolvedContext,
              constructs: promptConstructs,
            }),
          },
        ],
        model: selectModel("complex"),
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      },
      { useCache: false },
    );

    await recordAiUsage(admin, {
      userId,
      functionName: "build-sort",
      provider: providerFromModel(aiResponse.model),
      model: aiResponse.model,
      purpose: "build-sort-pairs",
      promptTokens: aiResponse.usage?.prompt_tokens,
      completionTokens: aiResponse.usage?.completion_tokens,
      totalTokens: aiResponse.usage?.total_tokens,
      status: "ok",
    });

    let parsed: { pairs?: unknown };
    try {
      parsed = JSON.parse(aiResponse.content || "{}");
    } catch {
      await fail("The pair generator returned something we could not read. Try building the sort again.");
      return;
    }

    const knownConstructIds = new Set(constructs.map((c) => c.id));
    const rawPairs: GeneratedPair[] = Array.isArray(parsed?.pairs) ? parsed.pairs as GeneratedPair[] : [];
    const rejects: Array<{ reason: string; construct_id?: string }> = [];
    const pairs: PairInput[] = [];
    let emDashPairs = 0;

    for (const raw of rawPairs) {
      const constructId = typeof raw?.construct_id === "string" ? raw.construct_id.trim() : "";
      const satisfies = typeof raw?.satisfies === "string" ? raw.satisfies.trim() : "";
      const violates = typeof raw?.violates === "string" ? raw.violates.trim() : "";
      const intended = typeof raw?.intended_dimension === "string" ? raw.intended_dimension.trim() : "";
      const pairIndex = Number(raw?.pair_index) === 2 ? 2 : 1;

      if (!knownConstructIds.has(constructId)) {
        rejects.push({ reason: "unknown_construct", construct_id: constructId || undefined });
        continue;
      }
      if (satisfies.length < MIN_ITEM_BODY_CHARS || violates.length < MIN_ITEM_BODY_CHARS) {
        rejects.push({ reason: "half_too_short", construct_id: constructId });
        continue;
      }
      if (satisfies === violates) {
        rejects.push({ reason: "halves_identical", construct_id: constructId });
        continue;
      }
      if (!intended) {
        // No answer key means no manipulation check and no way to read a
        // non-splitting pair. Drop it rather than write one without a key.
        rejects.push({ reason: "no_intended_dimension", construct_id: constructId });
        continue;
      }
      if (pairs.some((p) => p.constructId === constructId && p.pairIndex === pairIndex)) {
        rejects.push({ reason: "duplicate_pair_index", construct_id: constructId });
        continue;
      }
      // Logged, not repaired. A pair is graded as the generator produced it.
      if (satisfies.includes("\u2014") || violates.includes("\u2014")) emDashPairs += 1;

      pairs.push({ constructId, pairIndex, satisfies, violates, intendedDimension: intended });
    }

    if (pairs.length === 0) {
      await fail("The pair generator produced nothing usable. Try building the sort again.", {
        pairs: 0,
        pair_rejects: rejects,
      });
      return;
    }

    await setStage("assembling", {
      pairs: pairs.length,
      pairs_expected: SORT_BUDGET.pairs,
      pair_rejects: rejects,
      em_dash_pairs: emDashPairs,
    });

    // --- 3. the person's own work (CH-08) -----------------------------------
    const { data: artefactRows } = await admin
      .from("evidence")
      .select("id, body, source_label, created_at, redacted_at")
      .eq("user_id", userId)
      .eq("kind", "artefact")
      .is("redacted_at", null)
      .order("created_at", { ascending: false })
      .limit(SORT_BUDGET.own * 3);

    const own: string[] = [];
    for (const row of artefactRows ?? []) {
      const body = (row.body ?? "").toString().trim();
      if (body.length < MIN_ITEM_BODY_CHARS) continue;
      own.push(body.slice(0, MAX_OWN_BODY_CHARS));
      if (own.length >= SORT_BUDGET.own) break;
    }
    const ownShortfall = Math.max(0, SORT_BUDGET.own - own.length);

    // --- 4. peer items (CH-11) ----------------------------------------------
    const peerStatus = peerCorpusStatus(surface);
    const peer: PeerInput[] = peerSamplesForSurface(surface, SORT_BUDGET.peer).map((sample) => ({
      body: sample.body,
      sourceLabel: peerSourceLabel(sample),
    }));

    // --- 5. plan + hold out --------------------------------------------------
    // Seeded from the run id, so the same run rebuilds the same deck and an
    // auditor can reproduce it.
    const rng = makeRng(seedFromString(runId));
    const planned = planDeck({ pairs, own, peer, rng });
    const holdOut = chooseHoldOut(planned);
    const heldOut = new Set(holdOut.heldOutIds);
    const separation = minPairSeparation(planned);

    // --- 6. write the deck ---------------------------------------------------
    const pairIdByKey = new Map<string, string>();
    for (const item of planned) {
      if (item.pairKey && !pairIdByKey.has(item.pairKey)) {
        pairIdByKey.set(item.pairKey, crypto.randomUUID());
      }
    }

    const unique = planned.filter((it) => !it.repeatOfKey);
    const repeats = planned.filter((it) => it.repeatOfKey);

    // sort_items has no source_label column, so peer attribution rides
    // stage_detail.peer_attribution below rather than being dropped. The
    // attribution is the whole basis on which a peer item is allowed in the
    // deck (CH-11); it does not get to go missing.
    const uniqueRows = unique.map((item: PlannedItem) => ({
      user_id: userId,
      session_id: runId,
      surface,
      body: item.body,
      origin: item.origin,
      pair_id: item.pairKey ? pairIdByKey.get(item.pairKey) ?? null : null,
      pair_role: item.pairRole,
      intended_dimension: item.intendedDimension,
      targets: item.constructId ? [item.constructId] : [],
      held_out: heldOut.has(item.key),
      position: item.position,
    }));

    const { data: insertedUnique, error: itemErr } = await admin
      .from("sort_items")
      .insert(uniqueRows)
      .select("id, position");
    if (itemErr || !insertedUnique) throw new Error(`sort_items insert failed: ${itemErr?.message ?? "unknown"}`);

    const idByPosition = new Map<number, string>();
    for (const row of insertedUnique) idByPosition.set(row.position as number, row.id as string);

    if (repeats.length > 0) {
      const repeatRows = repeats.map((item) => ({
        user_id: userId,
        session_id: runId,
        surface,
        body: item.body,
        origin: item.origin,
        pair_id: null,
        pair_role: null,
        intended_dimension: null,
        targets: [],
        held_out: false,
        repeat_of: idByPosition.get(item.repeatOfPosition ?? -1) ?? null,
        position: item.position,
      })).filter((row) => row.repeat_of !== null);
      if (repeatRows.length > 0) {
        const { error: repeatErr } = await admin.from("sort_items").insert(repeatRows);
        if (repeatErr) {
          // A missing probe costs the self-agreement number, not the deck.
          log.warn("repeat probe insert failed", { error: repeatErr });
        }
      }
    }

    const peerAttribution = planned
      .filter((it) => it.origin === "peer" && it.sourceLabel)
      .map((it) => ({ position: it.position, source_label: it.sourceLabel }));

    await admin
      .from("harness_runs")
      .update({
        stage: "ready",
        status: "done",
        stage_detail: {
          ...detail,
          items: unique.length,
          items_expected: SORT_BUDGET.unique,
          repeats: repeats.length,
          own_available: own.length,
          own_expected: SORT_BUDGET.own,
          own_shortfall: ownShortfall,
          peer_available: peer.length,
          peer_expected: SORT_BUDGET.peer,
          peer_shortfall: peerStatus.shortfall,
          peer_awaiting_curation: peerStatus.awaitingCuration,
          peer_surface: peerStatus.resolvedSurface,
          peer_attribution: peerAttribution,
          held_out: holdOut.heldOutIds.length,
          held_out_shape: { pairs: holdOut.pairs, own: holdOut.own, peer: holdOut.peer },
          min_pair_separation: Number.isFinite(separation) ? separation : null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);

    log.info("sort deck ready", {
      items: unique.length,
      repeats: repeats.length,
      pairs: pairs.length,
      own: own.length,
      own_shortfall: ownShortfall,
      peer: peer.length,
      held_out: holdOut.heldOutIds.length,
    });
  } catch (e) {
    await fail(e instanceof Error ? e.message : "Unknown error building the sort");
    log.error("build-sort background error", { error: e });
  }
}
