/**
 * compile-standard - stage 3a of the harness chain.
 *
 * POST { run_id }            (run_id is the SORT run)
 *   -> 202 { run_id, sort_run_id, stage: "loading" }
 *
 * Turns one graded sort into a rubric that separates, and into my-standard.md,
 * the artefact CH-18 splits Phase 3 to ship.
 *
 * The response shape is the same one build-sort and decision-engine use, for
 * the same reason: the work here is one model call plus a probe pass, the chain
 * has no run state to poll unless we create it, and section 9 bans covering a
 * minute of work with a spinner. A harness_runs row of kind 'compile' is
 * created first, returned immediately, and the work runs inside
 * EdgeRuntime.waitUntil writing `stage` as it goes:
 *
 *   loading -> probing -> clustering -> writing -> ready
 *           \-> halted              (the instrument is confounded, CH-09)
 *           \-> template_and_voice  (the grader is inconsistent, CH-12)
 *           \-> failed (+ error)
 *
 * The compile run points at the sort it compiled through
 * stage_detail.sort_run_id, so one sort can be recompiled after a threshold
 * change without losing which grades produced which rubric.
 *
 * Four things this function will not do, all load-bearing.
 *
 *   1. It will not compile on a confounded instrument (CH-09). If the matched
 *      pairs did not split, the grades are attributed to the wrong dimension
 *      and a rubric built on them is internally consistent and about nothing.
 *      That is a halt, reported, not a warning logged next to a shipped rubric.
 *
 *   2. It will not compile a rubric for a grader who does not agree with
 *      themselves (CH-12). An inconsistent grader produces the same signature
 *      as a confounded generator, and the honest product there is a template
 *      plus a voice layer with no number attached. It is named and routed to.
 *
 *   3. It will not score a construct whose observable is not machine-checkable
 *      (CH-03). Those compile to 'untested' with the reason and land in the
 *      profile as AWAITING. No LLM stands in for the probe.
 *
 *   4. It will not arrive with blocking authority. disposition is ALWAYS
 *      'advisory' on write. Blocking is earned later, after false positives
 *      have been measured, and it is a different decision made on different
 *      evidence.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { selectModel } from "../_shared/openai-utils.ts";
import { callLLMWithFallback, providerFromModel } from "../_shared/llm-fallback.ts";
import { checkDailySoftCap, recordAiUsage } from "../_shared/ai-usage.ts";
import { getUserContext } from "../_shared/user-context.ts";
import {
  haltVerdict,
  pairSplitRate,
  selfAgreement,
  splitRateForHalt,
  type PairRole,
  type Verdict,
} from "../_shared/sort-composition.ts";
import {
  baselineLabel,
  byWeightLoadOrder,
  CLUSTER_AGREEMENT_MIN,
  clusterByApplication,
  DISC_GAP_MIN,
  discriminationFor,
  discriminationReason,
  discriminationVerdict,
  labelCeilingForTriage,
  MAX_CRITERIA_PER_SURFACE,
  medianOffDiagonal,
  parseProbe,
  REJECT_FAIL_MIN,
  triageFromSelfAgreement,
  tryApplyProbe,
  weakerLabel,
  type CriterionWeight,
  type DiscTrainingItem,
} from "../_shared/discrimination.ts";
import {
  renderStandardMarkdown,
  standardArtifactName,
  type AwaitingConstruct,
  type RenderCriterion,
  type StandardProfile,
} from "../_shared/standard-render.ts";
import {
  buildCriteriaSystemPrompt,
  buildCriteriaUserPrompt,
  fallbackName,
  nameIsInTheirWords,
  type CriterionPromptConstruct,
} from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

const WEIGHTS: CriterionWeight[] = ["essential", "important", "optional", "pitfall"];
const MAX_EXAMPLE_CHARS = 280;
const MAX_NAME_CHARS = 80;
const MAX_CHECK_CHARS = 240;
const MAX_PROVENANCE_ITEMS = 8;
const MAX_WHY_PER_SIDE = 6;

// EdgeRuntime is a Supabase runtime global; declared for the type checker.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

interface SortItemRow {
  id: string;
  position: number;
  body: string;
  origin: string;
  surface: string;
  pair_id: string | null;
  pair_role: PairRole | null;
  held_out: boolean;
  repeat_of: string | null;
  targets: string[] | null;
}

interface GradeRow {
  item_id: string;
  verdict: Verdict;
  why: string | null;
}

interface ConstructRow {
  id: string;
  emergent_pole: string;
  contrast_pole: string | null;
  rationale: string | null;
  observable: string | null;
  evidence_ids: string[] | null;
}

interface GeneratedCriterion {
  construct_id?: unknown;
  name?: unknown;
  check_text?: unknown;
  observable?: unknown;
  weight?: unknown;
  observable_note?: unknown;
}

/** One candidate, after the model has written it and before it is tested. */
interface Candidate {
  constructId: string;
  name: string;
  checkText: string;
  observable: string | null;
  observableNote: string | null;
  weight: CriterionWeight;
  emergentPole: string;
  contrastPole: string | null;
  rationale: string | null;
  /** Positions of the training items generated to test this construct. */
  itemPositions: number[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("compile-standard");
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

    // Service-role client for the background writes: the response returns
    // before the compile finishes, so the caller's JWT is not a safe thing to be
    // holding by then. Every insert stamps user_id explicitly and RLS remains
    // the boundary for every read path the frontend uses.
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = await req.json().catch(() => ({}));
    const sortRunId = typeof payload?.run_id === "string" ? payload.run_id.trim() : "";
    if (!sortRunId) return json({ error: "run_id is required (the sort run to compile)." }, 400);

    // Ownership check through RLS, and the surface comes from the sort itself.
    const { data: sortRun, error: sortErr } = await userClient
      .from("harness_runs")
      .select("id, kind, surface, status, stage, created_at")
      .eq("id", sortRunId)
      .maybeSingle();
    if (sortErr) throw new Error(`harness_runs read failed: ${sortErr.message}`);
    if (!sortRun || sortRun.kind !== "sort") {
      return json({ error: "That is not one of your sort runs." }, 404);
    }

    // Idempotency: a retried compile returns the first run, never a second one.
    const { data: existing } = await userClient
      .from("harness_runs")
      .select("id, stage, status")
      .eq("user_id", userId)
      .eq("kind", "compile")
      .eq("stage_detail->>sort_run_id", sortRunId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id && existing.status !== "failed") {
      log.info("compile-standard idempotent replay", { userId, run_id: existing.id });
      return json({
        run_id: existing.id,
        sort_run_id: sortRunId,
        stage: existing.stage,
        status: existing.status,
        idempotent: true,
      }, 200);
    }

    const softCap = await checkDailySoftCap(admin, userId, "compile-standard");

    const surface = (sortRun.surface as string | null) ?? "";
    const { data: runRow, error: runErr } = await userClient
      .from("harness_runs")
      .insert({
        user_id: userId,
        kind: "compile",
        surface,
        status: "running",
        stage: "loading",
        stage_detail: {
          sort_run_id: sortRunId,
          thresholds: {
            gap_min: DISC_GAP_MIN,
            reject_fail_min: REJECT_FAIL_MIN,
            cluster_agreement_min: CLUSTER_AGREEMENT_MIN,
            provisional_pending_data: true,
          },
        },
      })
      .select("id")
      .single();
    if (runErr || !runRow) throw new Error(`harness_runs insert failed: ${runErr?.message ?? "unknown"}`);
    const compileRunId = runRow.id as string;

    const work = compile(admin, {
      compileRunId,
      sortRunId,
      userId,
      surface,
      log: log.withContext({ run_id: compileRunId, userId }),
    });

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(work);
    } else {
      await work;
    }

    return json({ run_id: compileRunId, sort_run_id: sortRunId, stage: "loading", soft_cap: softCap }, 202);
  } catch (e) {
    log.error("compile-standard handler error", { error: e });
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

interface CompileParams {
  compileRunId: string;
  sortRunId: string;
  userId: string;
  surface: string;
  log: ReturnType<typeof createLogger>;
}

/**
 * The background pass. Every exit writes a terminal stage: a run stuck on
 * 'probing' forever is worse than a run that says it stopped and why.
 */
async function compile(admin: SupabaseClient, params: CompileParams): Promise<void> {
  const { compileRunId, sortRunId, userId, surface, log } = params;
  const detail: Record<string, unknown> = {};

  const setStage = async (stage: string, extra: Record<string, unknown> = {}) => {
    Object.assign(detail, extra);
    await admin
      .from("harness_runs")
      .update({ stage, stage_detail: { ...detail }, updated_at: new Date().toISOString() })
      .eq("id", compileRunId);
  };

  const finish = async (
    stage: string,
    status: "done" | "failed",
    extra: Record<string, unknown> = {},
    error?: string,
  ) => {
    Object.assign(detail, extra);
    await admin
      .from("harness_runs")
      .update({
        stage,
        status,
        ...(error ? { error } : {}),
        stage_detail: { ...detail },
        updated_at: new Date().toISOString(),
      })
      .eq("id", compileRunId);
  };

  try {
    const { data: existingRun } = await admin
      .from("harness_runs")
      .select("stage_detail")
      .eq("id", compileRunId)
      .maybeSingle();
    Object.assign(detail, (existingRun?.stage_detail as Record<string, unknown>) ?? {});

    // --- 1. load the sort ----------------------------------------------------
    const { data: itemRows, error: itemErr } = await admin
      .from("sort_items")
      .select("id, position, body, origin, surface, pair_id, pair_role, held_out, repeat_of, targets")
      .eq("session_id", sortRunId)
      .eq("user_id", userId)
      .order("position", { ascending: true });
    if (itemErr) throw new Error(`sort_items read failed: ${itemErr.message}`);
    const items = (itemRows ?? []) as SortItemRow[];
    if (items.length === 0) {
      await finish("failed", "failed", { items: 0 }, "That sort has no items to compile.");
      return;
    }

    const { data: gradeRows, error: gradeErr } = await admin
      .from("sort_grades")
      .select("item_id, verdict, why")
      .eq("user_id", userId)
      .in("item_id", items.map((it) => it.id));
    if (gradeErr) throw new Error(`sort_grades read failed: ${gradeErr.message}`);
    const grades = (gradeRows ?? []) as GradeRow[];
    const gradeByItem = new Map(grades.map((g) => [g.item_id, g]));
    const itemById = new Map(items.map((it) => [it.id, it]));

    const training = items.filter((it) => !it.held_out && !it.repeat_of);
    const heldOut = items.filter((it) => it.held_out);
    const heldOutGraded = heldOut.filter((it) => {
      const v = gradeByItem.get(it.id)?.verdict;
      return v === "send" || v === "would_not_send";
    }).length;

    const trainingProbeItems: DiscTrainingItem[] = training.map((it) => ({
      id: it.id,
      body: it.body,
      targets: it.targets ?? [],
      position: it.position,
    }));
    const trainingGrades = training
      .map((it) => gradeByItem.get(it.id))
      .filter((g): g is GradeRow => Boolean(g))
      .map((g) => ({ itemId: g.item_id, verdict: g.verdict }));

    // --- 2. precondition: is the instrument sound? (CH-09) --------------------
    // Pair split is the halt metric. It is ten behavioural observations already
    // in the data, and it replaced a leading-form manipulation check that
    // asserted its own answer and had coin-flip power over the largest
    // assumption in the method.
    const pairGrades = grades.map((g) => {
      const row = itemById.get(g.item_id);
      return { pairId: row?.pair_id ?? null, pairRole: row?.pair_role ?? null, verdict: g.verdict };
    });
    const split = pairSplitRate(pairGrades);
    const haltRate = splitRateForHalt(pairGrades);
    const halt = haltVerdict(haltRate);
    const haltDetail = {
      pair_split: { split: split.split, total: split.total, rate: Number(split.rate.toFixed(4)) },
      halt_verdict: halt,
    };

    if (halt === "halt") {
      // Never compile a rubric on a confounded instrument. The grades are real;
      // what they attach to is not, and a standard built on them would be
      // internally consistent and about nothing.
      await finish("halted", "done", {
        ...haltDetail,
        outcome: "halted",
        reason:
          `Only ${split.split} of ${split.total} matched pairs separated the way they were built to. ` +
          "That means the pieces differed on more than the one thing they were supposed to differ on, " +
          "so we cannot tell which difference your grades were about. Nothing has been compiled. " +
          "The fix is upstream in how the pieces were generated, not in the rubric.",
        next: "rebuild_sort",
      });
      log.warn("compile halted on pair split", { rate: haltRate, total: split.total });
      return;
    }

    // --- 3. triage: is the GRADER consistent? (CH-12) -------------------------
    const agreement = selfAgreement(
      grades.map((g) => ({
        itemId: g.item_id,
        repeatOfItemId: itemById.get(g.item_id)?.repeat_of ?? null,
        verdict: g.verdict,
      })),
    );
    const triage = triageFromSelfAgreement(agreement);
    const triageDetail = {
      self_agreement: { matched: agreement.matched, total: agreement.total },
      triage: triage.triage,
      triage_measured: triage.measured,
      triage_reason: triage.reason,
    };

    if (triage.triage === "template_and_voice") {
      await finish("template_and_voice", "done", {
        ...haltDetail,
        ...triageDetail,
        outcome: "template_and_voice",
        reason: triage.reason,
        next: "build_skill_and_voice",
      });
      log.info("compile routed to template plus voice", { matched: agreement.matched, total: agreement.total });
      return;
    }

    // --- 4. the constructs this deck tested ----------------------------------
    const constructIds = [...new Set(training.flatMap((it) => it.targets ?? []))].filter(Boolean);
    if (constructIds.length === 0) {
      await finish("failed", "failed", { ...haltDetail, ...triageDetail }, "That sort tested no constructs.");
      return;
    }

    const { data: constructRows, error: constructErr } = await admin
      .from("constructs")
      .select("id, emergent_pole, contrast_pole, rationale, observable, evidence_ids")
      .eq("user_id", userId)
      .in("id", constructIds);
    if (constructErr) throw new Error(`constructs read failed: ${constructErr.message}`);
    const constructs = (constructRows ?? []) as ConstructRow[];
    if (constructs.length === 0) {
      await finish("failed", "failed", { ...haltDetail, ...triageDetail }, "The constructs this sort tested are gone.");
      return;
    }

    // Evidence quotes, for the person's own words in the prompt.
    const evidenceIds = [...new Set(constructs.flatMap((c) => c.evidence_ids ?? []))].slice(0, 60);
    const quotesByEvidence = new Map<string, string>();
    if (evidenceIds.length > 0) {
      const { data: evidenceRows } = await admin
        .from("evidence")
        .select("id, quote, body, redacted_at")
        .eq("user_id", userId)
        .in("id", evidenceIds);
      for (const row of evidenceRows ?? []) {
        // A redacted row keeps its pointer and loses its words (CH-06).
        if (row.redacted_at) continue;
        const text = ((row.quote ?? row.body ?? "") as string).trim();
        if (text) quotesByEvidence.set(row.id as string, text);
      }
    }

    // Why lines, per construct, verbatim. These are the person's own words and
    // they are the only source for a contrast pole.
    const whyByConstruct = new Map<string, { accepted: string[]; rejected: string[] }>();
    const positionsByConstruct = new Map<string, number[]>();
    for (const item of training) {
      const grade = gradeByItem.get(item.id);
      for (const constructId of item.targets ?? []) {
        const positions = positionsByConstruct.get(constructId) ?? [];
        positions.push(item.position);
        positionsByConstruct.set(constructId, positions);
        if (!grade) continue;
        const why = (grade.why ?? "").trim();
        if (!why) continue;
        const bucket = whyByConstruct.get(constructId) ?? { accepted: [], rejected: [] };
        if (grade.verdict === "send") bucket.accepted.push(why);
        if (grade.verdict === "would_not_send") bucket.rejected.push(why);
        whyByConstruct.set(constructId, bucket);
      }
    }
    // A pair that split is the strongest separation the sort produced, so the
    // why line on the half they turned down leads the contrast pole list.
    const splitRejectWhy = new Map<string, string[]>();
    const pairMembers = new Map<string, SortItemRow[]>();
    for (const item of items) {
      if (!item.pair_id) continue;
      const list = pairMembers.get(item.pair_id) ?? [];
      list.push(item);
      pairMembers.set(item.pair_id, list);
    }
    for (const members of pairMembers.values()) {
      const satisfies = members.find((m) => m.pair_role === "satisfies");
      const violates = members.find((m) => m.pair_role === "violates");
      if (!satisfies || !violates) continue;
      if (gradeByItem.get(satisfies.id)?.verdict !== "send") continue;
      if (gradeByItem.get(violates.id)?.verdict !== "would_not_send") continue;
      const why = (gradeByItem.get(violates.id)?.why ?? "").trim();
      if (!why) continue;
      for (const constructId of violates.targets ?? []) {
        const list = splitRejectWhy.get(constructId) ?? [];
        list.push(why);
        splitRejectWhy.set(constructId, list);
      }
    }

    const promptConstructs: CriterionPromptConstruct[] = constructs.map((c) => {
      const why = whyByConstruct.get(c.id) ?? { accepted: [], rejected: [] };
      return {
        id: c.id,
        emergentPole: c.emergent_pole,
        contrastPole: c.contrast_pole,
        rationale: c.rationale,
        quotes: (c.evidence_ids ?? [])
          .map((id) => quotesByEvidence.get(id))
          .filter((q): q is string => Boolean(q))
          .slice(0, 3),
        acceptedWhy: why.accepted.slice(0, MAX_WHY_PER_SIDE),
        rejectedWhy: [...(splitRejectWhy.get(c.id) ?? []), ...why.rejected].slice(0, MAX_WHY_PER_SIDE),
      };
    });

    await setStage("probing", {
      ...haltDetail,
      ...triageDetail,
      constructs: constructs.length,
      training_items: training.length,
      training_graded: trainingGrades.length,
      held_out_graded: heldOutGraded,
    });

    // --- 5. one batched call: name the criteria, write the probes ------------
    const aiResponse = await callLLMWithFallback(
      {
        messages: [
          { role: "system", content: buildCriteriaSystemPrompt() },
          { role: "user", content: buildCriteriaUserPrompt({ surface, constructs: promptConstructs }) },
        ],
        model: selectModel("complex"),
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      },
      { useCache: false },
    );

    await recordAiUsage(admin, {
      userId,
      functionName: "compile-standard",
      provider: providerFromModel(aiResponse.model),
      model: aiResponse.model,
      purpose: "compile-standard-criteria",
      promptTokens: aiResponse.usage?.prompt_tokens,
      completionTokens: aiResponse.usage?.completion_tokens,
      totalTokens: aiResponse.usage?.total_tokens,
      status: "ok",
    });

    let parsed: { criteria?: unknown };
    try {
      parsed = JSON.parse(aiResponse.content || "{}");
    } catch {
      await finish(
        "failed",
        "failed",
        { ...haltDetail, ...triageDetail },
        "The criterion writer returned something we could not read. Try compiling again.",
      );
      return;
    }

    const raw: GeneratedCriterion[] = Array.isArray(parsed?.criteria)
      ? parsed.criteria as GeneratedCriterion[]
      : [];
    const constructById = new Map(constructs.map((c) => [c.id, c]));
    const candidates: Candidate[] = [];
    const rejects: Array<{ reason: string; construct_id?: string }> = [];

    for (const entry of raw) {
      const constructId = typeof entry?.construct_id === "string" ? entry.construct_id.trim() : "";
      const construct = constructById.get(constructId);
      if (!construct) {
        rejects.push({ reason: "unknown_construct", construct_id: constructId || undefined });
        continue;
      }
      if (candidates.some((c) => c.constructId === constructId)) {
        rejects.push({ reason: "duplicate_construct", construct_id: constructId });
        continue;
      }

      const checkText = typeof entry?.check_text === "string"
        ? entry.check_text.trim().slice(0, MAX_CHECK_CHARS)
        : "";
      if (!checkText) {
        rejects.push({ reason: "no_check_text", construct_id: constructId });
        continue;
      }

      const why = whyByConstruct.get(constructId) ?? { accepted: [], rejected: [] };
      const vocabulary = [
        construct.emergent_pole,
        construct.contrast_pole ?? "",
        construct.rationale ?? "",
        ...why.accepted,
        ...why.rejected,
        ...(construct.evidence_ids ?? []).map((id) => quotesByEvidence.get(id) ?? ""),
      ];
      const proposedName = typeof entry?.name === "string" ? entry.name.trim().slice(0, MAX_NAME_CHARS) : "";
      // Rule 2 of the prompt, enforced rather than requested. A name built from
      // words they never used is the signal that stops someone believing the
      // file came from them, and they would be right to check.
      const name = proposedName && nameIsInTheirWords(proposedName, vocabulary)
        ? proposedName
        : fallbackName(construct.emergent_pole);

      // The observable is the only thing here that can be quietly wrong, so it
      // is parsed before it is stored. Anything that does not parse becomes
      // null plus a reason, never a probe that approximates the idea.
      const proposedObservable = typeof entry?.observable === "string" ? entry.observable.trim() : "";
      const observable = proposedObservable && parseProbe(proposedObservable) ? proposedObservable : null;
      const observableNote = observable
        ? null
        : (typeof entry?.observable_note === "string" && entry.observable_note.trim()
          ? entry.observable_note.trim().slice(0, MAX_CHECK_CHARS)
          : proposedObservable
          ? "The observable it proposed is not in the probe grammar, so nothing was checked against it."
          : "This construct did not reduce to something a machine can point at.");

      const weight: CriterionWeight = WEIGHTS.includes(entry?.weight as CriterionWeight)
        ? entry.weight as CriterionWeight
        : "important";

      // Both poles are theirs. The contrast pole is the verbatim why line from a
      // piece they turned down, preferring one from a pair that actually split.
      const contrastPole = (splitRejectWhy.get(constructId) ?? [])[0]
        ?? why.rejected[0]
        ?? construct.contrast_pole
        ?? null;
      const rationale = construct.rationale ?? why.accepted[0] ?? null;

      candidates.push({
        constructId,
        name,
        checkText,
        observable,
        observableNote,
        weight,
        emergentPole: construct.emergent_pole,
        contrastPole,
        rationale,
        itemPositions: (positionsByConstruct.get(constructId) ?? []).slice(0, MAX_PROVENANCE_ITEMS),
      });
    }

    if (candidates.length === 0) {
      await finish(
        "failed",
        "failed",
        { ...haltDetail, ...triageDetail, criterion_rejects: rejects },
        "The criterion writer produced nothing usable. Try compiling again.",
      );
      return;
    }

    // --- 6. the discrimination test (CH-03) ----------------------------------
    const tested = candidates.map((candidate) => {
      const counts = discriminationFor(
        { id: candidate.constructId, observable: candidate.observable, constructId: candidate.constructId },
        trainingProbeItems,
        trainingGrades,
      );
      const verdict = discriminationVerdict(counts);
      return {
        candidate,
        counts,
        verdict,
        reason: candidate.observable
          ? discriminationReason(counts, verdict)
          : candidate.observableNote ?? discriminationReason(counts, verdict),
      };
    });

    // Every gap, every time, for the tuning log. The 0.30 threshold is a
    // documented guess until this distribution has been looked at.
    const gapDistribution = tested.map((t) => ({
      construct_id: t.candidate.constructId,
      name: t.candidate.name,
      observable: t.candidate.observable,
      weight: t.candidate.weight,
      verdict: t.verdict,
      gap: t.counts.gap,
      reject_fail_rate: t.counts.reject_fail_rate,
      accept_fail_rate: t.counts.accept_fail_rate,
      n_rejected: t.counts.n_rejected,
      n_rejected_failing: t.counts.n_rejected_failing,
      n_accepted: t.counts.n_accepted,
      n_accepted_failing: t.counts.n_accepted_failing,
      // CH-03's falsification plan: the per-construct unit beside the applied
      // one, so kill rates can be compared under each.
      targeted: t.counts.targeted,
      probe_parsed: t.counts.probe_parsed,
      reason: t.reason,
    }));

    // --- 7. clustering on the application vector (CH-04) ---------------------
    await setStage("clustering", { gap_distribution: gapDistribution, criterion_rejects: rejects });

    const keepers = tested
      .filter((t) => t.verdict === "keep")
      .sort((a, b) => {
        const byWeight = byWeightLoadOrder(
          { weight: a.candidate.weight },
          { weight: b.candidate.weight },
        );
        return byWeight !== 0 ? byWeight : b.counts.gap - a.counts.gap;
      });

    const clustered = clusterByApplication(
      keepers.map((k) => ({ id: k.candidate.constructId, observable: k.candidate.observable })),
      trainingProbeItems,
    );
    const mergedAway = new Set(clustered.merges.map((m) => m.merged));
    const mergedNames = new Map<string, string[]>();
    for (const merge of clustered.merges) {
      const names = mergedNames.get(merge.kept) ?? [];
      const merged = keepers.find((k) => k.candidate.constructId === merge.merged);
      if (merged) names.push(merged.candidate.name);
      mergedNames.set(merge.kept, names);
    }

    const surviving = keepers.filter((k) => !mergedAway.has(k.candidate.constructId));

    // Seven per surface. At ninety percent compliance per instruction, ten land
    // together about a third of the time, so an eighth costs the other seven.
    const capped = surviving.slice(0, MAX_CRITERIA_PER_SURFACE);
    const cappedOut = surviving.slice(MAX_CRITERIA_PER_SURFACE).map((k) => k.candidate.name);

    // --- 8. write the criteria -----------------------------------------------
    await setStage("writing", {
      clustering: {
        agreement_ids: clustered.agreement.ids,
        agreement_matrix: clustered.agreement.matrix,
        agreement_n: clustered.agreement.n,
        median_off_diagonal: medianOffDiagonal(clustered.agreement),
        merges: clustered.merges,
        unclusterable: clustered.unclusterable,
        reason: clustered.reason,
      },
    });

    const { data: priorRows } = await admin
      .from("criteria")
      .select("id, version")
      .eq("user_id", userId)
      .eq("surface", surface)
      .eq("is_current", true);
    const priorVersion = Math.max(0, ...((priorRows ?? []) as Array<{ version: number }>).map((r) => r.version ?? 1));
    const nextVersion = priorVersion + 1;

    if ((priorRows ?? []).length > 0) {
      // Supersede rather than delete: the unique index is partial on is_current,
      // and the old rows are what a six-week-old argument gets settled against.
      const { error: supersedeErr } = await admin
        .from("criteria")
        .update({ is_current: false })
        .eq("user_id", userId)
        .eq("surface", surface)
        .eq("is_current", true);
      if (supersedeErr) throw new Error(`criteria supersede failed: ${supersedeErr.message}`);
    }

    const usedNames = new Set<string>();
    const rendered: RenderCriterion[] = [];
    const criteriaRows: Record<string, unknown>[] = [];

    for (const keeper of capped) {
      const { candidate, counts, verdict, reason } = keeper;
      let name = candidate.name;
      let suffix = 2;
      while (usedNames.has(name.toLowerCase())) {
        name = `${candidate.name} (${suffix})`;
        suffix += 1;
      }
      usedNames.add(name.toLowerCase());

      const examples = pickExamples(candidate.observable, training, gradeByItem);

      const provenance = {
        session: `sort ${sortRunId}`,
        sort_run_id: sortRunId,
        compile_run_id: compileRunId,
        construct_id: candidate.constructId,
        items: candidate.itemPositions,
        merged_from: mergedNames.get(candidate.constructId) ?? [],
        thresholds: {
          gap_min: DISC_GAP_MIN,
          reject_fail_min: REJECT_FAIL_MIN,
          cluster_agreement_min: CLUSTER_AGREEMENT_MIN,
          provisional_pending_data: true,
        },
        compiled_at: new Date().toISOString(),
      };

      criteriaRows.push({
        user_id: userId,
        scope: "person",
        construct_id: candidate.constructId,
        surface,
        name,
        check_text: candidate.checkText,
        observable: candidate.observable,
        weight: candidate.weight,
        holds_example: examples.holds,
        breaks_example: examples.breaks,
        n_rejected: counts.n_rejected,
        n_rejected_failing: counts.n_rejected_failing,
        n_accepted: counts.n_accepted,
        n_accepted_failing: counts.n_accepted_failing,
        disc_verdict: verdict,
        provenance,
        version: nextVersion,
        is_current: true,
        // Always. Blocking is earned after false positives have been measured,
        // and that is a different decision on different evidence.
        disposition: "advisory",
      });

      rendered.push({
        name,
        check_text: candidate.checkText,
        observable: candidate.observable,
        weight: candidate.weight,
        emergent_pole: candidate.emergentPole,
        contrast_pole: candidate.contrastPole,
        rationale: candidate.rationale,
        holds_example: examples.holds,
        breaks_example: examples.breaks,
        disc_verdict: verdict,
        n_rejected: counts.n_rejected,
        n_rejected_failing: counts.n_rejected_failing,
        n_accepted: counts.n_accepted,
        n_accepted_failing: counts.n_accepted_failing,
        gap: counts.gap,
        disc_reason: reason,
        provenance: { session: `sort ${sortRunId}`, items: candidate.itemPositions },
      });
    }

    if (criteriaRows.length > 0) {
      const { error: insertErr } = await admin.from("criteria").insert(criteriaRows);
      if (insertErr) throw new Error(`criteria insert failed: ${insertErr.message}`);
    }

    // Write the contrast pole back in their own words and, where the row's own
    // CHECKs allow it, mark the construct compiled so a later sort knows it has
    // been through this once. The pole is the valuable half: it came from a why
    // line on a piece they turned down, and until now the row had one pole.
    for (const keeper of capped) {
      const constructId = keeper.candidate.constructId;
      const pole = keeper.candidate.contrastPole;
      const { error: statusErr } = await admin
        .from("constructs")
        .update({
          ...(pole ? { contrast_pole: pole } : {}),
          status: "compiled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("id", constructId);
      if (!statusErr) continue;
      // elicited_needs_evidence wants two evidence rows and an emergent
      // construct from one why line has one. Losing the status label costs
      // nothing; losing the pole would lose the person's words, so retry it
      // on its own.
      log.warn("construct status update refused, keeping the pole", { error: statusErr });
      if (pole) {
        await admin
          .from("constructs")
          .update({ contrast_pole: pole, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("id", constructId);
      }
    }

    // --- 9. the standard as an artefact (CH-18) ------------------------------
    // Everything that did not make the final rubric lands in the profile as
    // AWAITING with its counts, which is the standard telling the person what it
    // does not yet contain.
    const keptConstructIds = new Set(capped.map((k) => k.candidate.constructId));
    const awaiting: AwaitingConstruct[] = tested
      .filter((t) => !keptConstructIds.has(t.candidate.constructId))
      .map((t) => ({
        name: t.candidate.name,
        emergent_pole: t.candidate.emergentPole,
        contrast_pole: t.candidate.contrastPole,
        observable: t.candidate.observable,
        disc_verdict: t.verdict,
        counts: t.counts.probe_parsed
          ? {
            n_rejected: t.counts.n_rejected,
            n_rejected_failing: t.counts.n_rejected_failing,
            n_accepted: t.counts.n_accepted,
            n_accepted_failing: t.counts.n_accepted_failing,
            gap: t.counts.gap,
          }
          : null,
        reason: mergedAway.has(t.candidate.constructId)
          ? "It landed the same way on the same pieces as a criterion above, so the two are one check."
          : cappedOut.includes(t.candidate.name)
          ? "It separates, but seven is the cap per surface and this one sat below the line."
          : t.reason,
      }));

    let ownerName = "";
    try {
      const ctx = await getUserContext(admin, userId);
      ownerName = (ctx.name ?? "").trim();
    } catch (e) {
      log.warn("owner name lookup failed", { error: e });
    }

    const profile = buildProfile({
      ownerName,
      surface,
      sortRunId,
      gradedCount: grades.length,
      heldOutGraded,
      untestedCount: awaiting.length,
      training,
      gradeByItem,
      version: nextVersion,
    });

    // CH-12 caps what the numbers are allowed to claim; the numbers cap the
    // rest. Nothing has been run against the hold-out at this stage, so
    // precision and recall are null on purpose and the label is Draft. A
    // measurement stage lifts it later; a compile step never lifts its own.
    const label = weakerLabel(
      baselineLabel({ heldOutGraded, precision: null, recall: null }),
      labelCeilingForTriage(triage.triage),
    );

    const markdown = renderStandardMarkdown({
      criteria: rendered,
      constructs: awaiting,
      profile,
      label,
      numbers: {
        held_out_graded: heldOutGraded,
        precision: null,
        recall: null,
        self_agreement: { matched: agreement.matched, total: agreement.total },
        pair_split: { split: split.split, total: split.total, rate: split.rate },
        triage: triage.triage,
        triage_reason: triage.reason,
      },
    });

    const { data: artifactRow, error: artifactErr } = await admin
      .from("generated_artifacts")
      .insert({
        user_id: userId,
        kind: "standard",
        name: standardArtifactName(surface),
        body: markdown,
        metadata: {
          criteria_version: nextVersion,
          label,
          surface,
          sort_run_id: sortRunId,
          compile_run_id: compileRunId,
          criteria_kept: rendered.length,
          criteria_awaiting: awaiting.length,
          triage: triage.triage,
          self_agreement: { matched: agreement.matched, total: agreement.total },
          pair_split: { split: split.split, total: split.total, rate: split.rate },
          held_out_graded: heldOutGraded,
          // Absent on purpose until a measure stage runs. A missing baseline is
          // information; a fabricated one is what this chain exists to prevent.
          precision: null,
          recall: null,
          rendered_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();
    if (artifactErr) {
      // The rubric is written and real; losing the rendered file is a smaller
      // failure than losing the criteria, so it is reported and not thrown.
      log.warn("generated_artifacts insert failed", { error: artifactErr });
    }

    const untestedCount = tested.filter((t) => t.verdict === "untested").length;
    const deletedCount = tested.filter((t) => t.verdict === "delete").length;

    await finish("ready", "done", {
      outcome: "ready",
      kept: rendered.length,
      deleted: deletedCount,
      untested: untestedCount,
      merged: clustered.merges.length,
      capped_out: cappedOut,
      criteria_version: nextVersion,
      label,
      artifact_id: artifactRow?.id ?? null,
      gap_distribution: gapDistribution,
      criterion_rejects: rejects,
    });

    log.info("standard compiled", {
      constructs: constructs.length,
      kept: rendered.length,
      deleted: deletedCount,
      untested: untestedCount,
      merged: clustered.merges.length,
      label,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error compiling the standard";
    await finish("failed", "failed", {}, message);
    log.error("compile-standard background error", { error: e });
  }
}

/**
 * A holds example and a breaks example, both real.
 *
 * They are lifted from graded work after the probe has run, so an example is
 * always a piece that really did hold and really was sent, or really did break
 * and really was turned down. Their own work leads: a person recognises their
 * own sentence and does not recognise a generated one.
 */
function pickExamples(
  observable: string | null,
  training: SortItemRow[],
  gradeByItem: Map<string, GradeRow>,
): { holds: string | null; breaks: string | null } {
  if (!observable) return { holds: null, breaks: null };
  const ordered = [...training].sort((a, b) => {
    const own = (a.origin === "own" ? 0 : 1) - (b.origin === "own" ? 0 : 1);
    return own !== 0 ? own : a.position - b.position;
  });

  let holds: string | null = null;
  let breaks: string | null = null;
  for (const item of ordered) {
    const verdict = gradeByItem.get(item.id)?.verdict;
    if (verdict !== "send" && verdict !== "would_not_send") continue;
    const applied = tryApplyProbe(observable, item.body);
    if (applied === null) return { holds: null, breaks: null };
    if (!holds && applied && verdict === "send") holds = excerpt(item.body);
    if (!breaks && !applied && verdict === "would_not_send") breaks = excerpt(item.body);
    if (holds && breaks) break;
  }
  return { holds, breaks };
}

function excerpt(body: string): string {
  const trimmed = (body ?? "").trim();
  return trimmed.length <= MAX_EXAMPLE_CHARS ? trimmed : `${trimmed.slice(0, MAX_EXAMPLE_CHARS)}...`;
}

interface ProfileParams {
  ownerName: string;
  surface: string;
  sortRunId: string;
  gradedCount: number;
  heldOutGraded: number;
  untestedCount: number;
  training: SortItemRow[];
  gradeByItem: Map<string, GradeRow>;
  version: number;
}

/**
 * The profile shell around the criteria.
 *
 * Only three sections are filled here, and each is filled from something that
 * actually happened:
 *
 *   - the owner, the surface and the provenance line, all facts about this run;
 *   - Artefacts, from the person's OWN work in the deck: one piece they said
 *     they would send, one they said they would not, and the difference in
 *     their own words from the why line. That is the strongest thing a sort
 *     produces and it is section 4 of the profile exactly;
 *   - Open items, derived from real counts, saying what would move the label.
 *
 * Everything else renders AWAITING. Owns, recurring work, domain expertise,
 * hard constraints, audiences, failure modes and tone are all knowable, and
 * none of them is knowable FROM A SORT. Filling them from user_memory would put
 * inferred facts in a file whose whole claim is that it contains none, so they
 * stay empty and say what would fill them.
 */
function buildProfile(params: ProfileParams): StandardProfile {
  const {
    ownerName,
    surface,
    sortRunId,
    gradedCount,
    heldOutGraded,
    untestedCount,
    training,
    gradeByItem,
    version,
  } = params;

  const own = training.filter((it) => it.origin === "own");
  const sentOwn = own.find((it) => gradeByItem.get(it.id)?.verdict === "send");
  const turnedDownOwn = own.find((it) => gradeByItem.get(it.id)?.verdict === "would_not_send");
  const difference = (gradeByItem.get(turnedDownOwn?.id ?? "")?.why ?? "").trim();

  const artefacts = sentOwn && turnedDownOwn
    ? [{
      signed_off: excerpt(sentOwn.body),
      rejected: excerpt(turnedDownOwn.body),
      // Verbatim. It is worth more than the other two combined and a tidied
      // version of it is a different sentence.
      difference_in_their_words: difference || null,
    }]
    : [];

  const openItems: Array<{ text: string }> = [];
  if (untestedCount > 0) {
    openItems.push({
      text: `${untestedCount} ${untestedCount === 1 ? "construct is" : "constructs are"} untested. ` +
        "Another sort on this surface, or more of your own work in the deck, is what would test them.",
    });
  }
  if (heldOutGraded > 0) {
    openItems.push({
      text: `${heldOutGraded} pieces were held back and graded before you saw any of this. ` +
        "Running the standard against them is what turns Draft into a number.",
    });
  }
  if (artefacts.length === 0) {
    openItems.push({
      text: "One piece of your own you would send and one you would not, on this surface. " +
        "Two real artefacts fill the section a sort cannot fill on its own.",
    });
  }

  return {
    owner: ownerName || null,
    surface,
    version,
    last_reviewed: new Date().toISOString().slice(0, 10),
    review_interval_days: 90,
    provenance: `sort run ${sortRunId}, ${gradedCount} graded screens`,
    artefacts,
    open_items: openItems,
  };
}
