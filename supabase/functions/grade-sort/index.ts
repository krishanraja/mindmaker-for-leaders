/**
 * grade-sort - stage 2 of the harness chain, the grading half.
 *
 * POST { run_id, item_id, verdict, why?, ms_to_grade?, manip_answer?, pair_id? }
 *   -> { graded, total, pair_split, self_agreement, can_show_kill, new_construct? }
 *
 * One screen, one call. Synchronous and small on purpose: this runs 33 times in
 * about twenty minutes and anything slow here is felt as friction in the one
 * flow the whole product depends on people finishing.
 *
 * Four rules, each traceable to a ruled challenge.
 *
 * CH-15  The grade UPSERTS on item_id. A retried submit or a changed mind
 *        updates in place. The original schema raised 23505 on a retry and a
 *        person could not change their mind, which is a data-integrity bug
 *        wearing a product bug's clothes.
 *
 * CH-10  A why line matching no construct the deck targets becomes a NEW
 *        candidate construct, in the person's own words, verbatim. Until now
 *        every construct in the system originated as a stage-1 model guess: the
 *        person could confirm or deny a dimension but never introduce one. This
 *        is the only path by which a construct enters from the person.
 *
 * CH-03  No kill and no compiled criterion before the counts support it. The
 *        spec pinned the first kill to item 14, where the 4-and-4 rule holds
 *        about half the time and fails most often for exactly the discerning
 *        grader the product targets. `can_show_kill` is returned so the UI can
 *        show nothing rather than fake the beat.
 *
 * CH-09  The manipulation check is asked OPEN ("in one line, what is the
 *        difference between those two?") and scored afterwards. The question
 *        form is the UI's job; this function stores the raw answer regardless
 *        of whether it scored, and records manip_checked/manip_ok on both
 *        halves as the diagnostic record. It is not the halt metric. Pair split
 *        is, and it is computed here from behaviour nobody had to answer.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import {
  canShowKill,
  matchesExistingConstruct,
  namesIntendedDimension,
  pairSplitRate,
  selfAgreement,
  splitRateForHalt,
  haltVerdict,
  type ConstructLike,
  type PairRole,
  type Verdict,
} from "../_shared/sort-composition.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

const VERDICTS: Verdict[] = ["send", "would_not_send", "skip"];

const MAX_WHY_CHARS = 600;
const MAX_MANIP_ANSWER_CHARS = 600;
/** An emergent_pole is one line in their words, not an essay. */
const MAX_POLE_CHARS = 240;
/** Below this a why line is a grunt, not a construct ("meh", "no", "nope"). */
const MIN_WHY_CHARS_FOR_CONSTRUCT = 12;

/** The columns the progress maths reads off every item in the session. */
interface SessionItem {
  id: string;
  position: number;
  pair_id: string | null;
  pair_role: PairRole | null;
  intended_dimension: string | null;
  held_out: boolean;
  repeat_of: string | null;
  targets: string[] | null;
}

/** The graded item itself also carries the fields a new construct is filed under. */
interface GradedItem extends SessionItem {
  user_id: string;
  session_id: string;
  surface: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("grade-sort");
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

    // Everything here is synchronous and owner-scoped, so every read and write
    // goes through RLS as the caller. No service-role client in this function.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const payload = await req.json().catch(() => ({}));
    const runId = typeof payload?.run_id === "string" ? payload.run_id.trim() : "";
    const itemId = typeof payload?.item_id === "string" ? payload.item_id.trim() : "";
    const verdict = VERDICTS.includes(payload?.verdict) ? payload.verdict as Verdict : null;
    const why = typeof payload?.why === "string" ? payload.why.trim().slice(0, MAX_WHY_CHARS) : "";
    const msToGrade = Number.isFinite(Number(payload?.ms_to_grade))
      ? Math.max(0, Math.round(Number(payload.ms_to_grade)))
      : null;
    const manipAnswer = typeof payload?.manip_answer === "string"
      ? payload.manip_answer.trim().slice(0, MAX_MANIP_ANSWER_CHARS)
      : "";
    const manipPairId = typeof payload?.pair_id === "string" ? payload.pair_id.trim() : "";

    if (!runId || !itemId) return json({ error: "run_id and item_id are required." }, 400);
    if (!verdict) return json({ error: "verdict must be send, would_not_send or skip." }, 400);

    // The item, fetched through RLS: this is also the ownership check.
    const { data: item, error: itemErr } = await userClient
      .from("sort_items")
      .select("id, user_id, session_id, surface, position, pair_id, pair_role, intended_dimension, held_out, repeat_of, targets")
      .eq("id", itemId)
      .eq("session_id", runId)
      .maybeSingle();
    if (itemErr) throw new Error(`sort_items read failed: ${itemErr.message}`);
    if (!item) return json({ error: "That item is not part of this sort." }, 404);
    const gradedItem = item as GradedItem;

    // --- 1. the grade (CH-15: upsert, never a 23505) ------------------------
    const { error: gradeErr } = await userClient
      .from("sort_grades")
      .upsert({
        user_id: userId,
        item_id: itemId,
        verdict,
        // The line is optional and asked every time. It is the highest-value
        // thing the sort produces: the verdict says what, the line says why.
        why: why || null,
        ms_to_grade: msToGrade,
      }, { onConflict: "item_id" });
    if (gradeErr) throw new Error(`sort_grades upsert failed: ${gradeErr.message}`);

    // --- 2. session state ----------------------------------------------------
    const { data: sessionItems, error: sessionErr } = await userClient
      .from("sort_items")
      .select("id, position, pair_id, pair_role, held_out, repeat_of, targets, intended_dimension")
      .eq("session_id", runId)
      .order("position", { ascending: true });
    if (sessionErr) throw new Error(`session items read failed: ${sessionErr.message}`);
    const items = (sessionItems ?? []) as SessionItem[];
    const itemById = new Map(items.map((it) => [it.id, it]));

    const { data: grades, error: gradeReadErr } = await userClient
      .from("sort_grades")
      .select("item_id, verdict, why")
      .in("item_id", items.map((it) => it.id));
    if (gradeReadErr) throw new Error(`sort_grades read failed: ${gradeReadErr.message}`);
    const gradeList = (grades ?? []) as Array<{ item_id: string; verdict: Verdict; why: string | null }>;

    // --- 3. CH-10: a why line with nowhere to go ----------------------------
    let newConstruct: { id: string; emergent_pole: string } | null = null;
    if (why.length >= MIN_WHY_CHARS_FOR_CONSTRUCT && verdict !== "skip") {
      newConstruct = await maybeCreateConstruct(userClient, {
        userId,
        why,
        surface: gradedItem.surface,
        position: gradedItem.position,
        deckConstructIds: [...new Set(items.flatMap((it) => it.targets ?? []))],
        log,
      });
    }

    // --- 4. CH-09: the open manipulation answer -----------------------------
    let manip: { pair_id: string; ok: boolean; scored: boolean } | null = null;
    if (manipAnswer && manipPairId) {
      manip = await recordManipulationAnswer(userClient, {
        runId,
        pairId: manipPairId,
        answer: manipAnswer,
        items,
        log,
      });
    }

    // --- 5. progress ---------------------------------------------------------
    const gradedIds = new Set(gradeList.map((g) => g.item_id));
    const gradedCount = gradeList.length;
    const total = items.length;

    const pairGrades = gradeList
      .map((g) => {
        const row = itemById.get(g.item_id);
        return { pairId: row?.pair_id ?? null, pairRole: row?.pair_role ?? null, verdict: g.verdict };
      });
    const split = pairSplitRate(pairGrades);
    const haltRate = splitRateForHalt(pairGrades);

    const agreement = selfAgreement(
      gradeList.map((g) => ({
        itemId: g.item_id,
        repeatOfItemId: itemById.get(g.item_id)?.repeat_of ?? null,
        verdict: g.verdict,
      })),
    );

    // Training items only: not held out, not a repeat probe. The hold-out never
    // trains anything and the repeats measure the grader.
    let trainingAccepts = 0;
    let trainingRejects = 0;
    for (const g of gradeList) {
      const row = itemById.get(g.item_id);
      if (!row || row.held_out || row.repeat_of) continue;
      if (g.verdict === "send") trainingAccepts += 1;
      if (g.verdict === "would_not_send") trainingRejects += 1;
    }

    const kill = canShowKill({ gradedCount, trainingAccepts, trainingRejects });

    log.info("grade recorded", {
      userId,
      run_id: runId,
      position: gradedItem.position,
      verdict,
      graded: gradedCount,
      total,
    });

    return json({
      graded: gradedCount,
      total,
      remaining: Math.max(0, total - gradedCount),
      next_position: items.find((it) => !gradedIds.has(it.id))?.position ?? null,
      // Only when computable. `total` under MIN_PAIRS_FOR_SPLIT_RATE returns a
      // null rate, because three pairs is not a measurement of a generator.
      pair_split: split.total > 0
        ? { split: split.split, total: split.total, rate: Number(split.rate.toFixed(4)) }
        : null,
      halt: haltRate === null ? null : { rate: Number(haltRate.toFixed(4)), verdict: haltVerdict(haltRate) },
      self_agreement: agreement.total > 0 ? agreement : null,
      // The UI shows nothing rather than a fake beat when this is false.
      can_show_kill: kill,
      training_split: { accepts: trainingAccepts, rejects: trainingRejects },
      new_construct: newConstruct,
      manip,
    }, 200);
  } catch (e) {
    log.error("grade-sort handler error", { error: e });
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

interface MaybeConstructParams {
  userId: string;
  why: string;
  surface: string;
  position: number;
  deckConstructIds: string[];
  log: ReturnType<typeof createLogger>;
}

/**
 * CH-10. When a why line matches no construct this deck targets, it becomes a
 * candidate construct in the person's own words.
 *
 * Matched against the deck's own targets AND the person's other candidates, so
 * a dimension they raise three times in one session produces one construct
 * rather than three.
 *
 * The pole is the why line VERBATIM (trimmed and capped, nothing else). A
 * tidied pole is a paraphrase, and a paraphrase is not evidence. Status is
 * 'candidate' and no contrast_pole is written: the person has separated an item
 * from the pile, which is not the same as having separated two poles. The
 * evidence row carries kind 'grade' and stays situated, because a line written
 * about one artefact is about that artefact until they say otherwise.
 */
async function maybeCreateConstruct(
  client: SupabaseClient,
  params: MaybeConstructParams,
): Promise<{ id: string; emergent_pole: string } | null> {
  const { userId, why, surface, position, deckConstructIds, log } = params;

  const { data: existing, error } = await client
    .from("constructs")
    .select("id, emergent_pole")
    .eq("user_id", userId)
    .in("status", ["candidate", "elicited", "compiled"])
    .limit(200);
  if (error) {
    log.warn("construct match read failed", { error });
    return null;
  }

  const rows = (existing ?? []) as Array<{ id: string; emergent_pole: string }>;
  // The deck's own targets first: those are what the why line is being asked
  // about. Everything else the person holds is checked too, so one session does
  // not mint the same construct three times.
  const deckSet = new Set(deckConstructIds);
  const candidates: ConstructLike[] = [
    ...rows.filter((r) => deckSet.has(r.id)),
    ...rows.filter((r) => !deckSet.has(r.id)),
  ].map((r) => ({ id: r.id, emergentPole: r.emergent_pole }));

  if (matchesExistingConstruct(why, candidates)) return null;

  const { data: evidenceRow, error: evidenceErr } = await client
    .from("evidence")
    .insert({
      user_id: userId,
      kind: "grade",
      body: why,
      source_label: `Sort grade, ${surface}, item ${position}`,
      situated: true,
      situation: `Grading item ${position} of a ${surface} sort`,
      speaker_is_owner: true,
      occurred_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (evidenceErr || !evidenceRow) {
    log.warn("grade evidence insert failed", { error: evidenceErr });
    return null;
  }

  const { data: construct, error: constructErr } = await client
    .from("constructs")
    .insert({
      user_id: userId,
      scope: "person",
      status: "candidate",
      emergent_pole: why.slice(0, MAX_POLE_CHARS),
      evidence_ids: [evidenceRow.id],
    })
    .select("id, emergent_pole")
    .single();
  if (constructErr || !construct) {
    // Do not leave an evidence row nothing points at.
    await client.from("evidence").delete().eq("id", evidenceRow.id);
    log.warn("emergent construct insert failed", { error: constructErr });
    return null;
  }

  log.info("emergent construct created from a why line", { construct_id: construct.id });
  return construct as { id: string; emergent_pole: string };
}

interface ManipParams {
  runId: string;
  pairId: string;
  answer: string;
  items: SessionItem[];
  log: ReturnType<typeof createLogger>;
}

/**
 * CH-09. Store the open answer and whether it named the intended dimension.
 *
 * The answer text has no column on sort_items (the schema carries only the
 * manip_checked / manip_ok booleans), so the raw answer is appended to
 * harness_runs.stage_detail.manip_answers. It is stored whether or not the
 * crude token scorer matched, because the scorer is a convenience and the
 * answer is the actual diagnostic a human reads when a pair fails to split.
 */
async function recordManipulationAnswer(
  client: SupabaseClient,
  params: ManipParams,
): Promise<{ pair_id: string; ok: boolean; scored: boolean } | null> {
  const { runId, pairId, answer, items, log } = params;

  const members = items.filter((it) => it.pair_id === pairId);
  if (members.length === 0) return null;
  const key = members.find((it) => it.intended_dimension)?.intended_dimension ?? "";
  const scored = key.trim().length > 0;
  const ok = scored ? namesIntendedDimension(answer, key) : false;

  const { error: updateErr } = await client
    .from("sort_items")
    .update({ manip_checked: true, manip_ok: scored ? ok : null })
    .eq("session_id", runId)
    .eq("pair_id", pairId);
  if (updateErr) log.warn("manip flag update failed", { error: updateErr });

  const { data: run } = await client
    .from("harness_runs")
    .select("stage_detail")
    .eq("id", runId)
    .maybeSingle();
  const detail = ((run?.stage_detail as Record<string, unknown>) ?? {});
  const prior = Array.isArray(detail.manip_answers) ? detail.manip_answers as unknown[] : [];
  const { error: detailErr } = await client
    .from("harness_runs")
    .update({
      stage_detail: {
        ...detail,
        manip_answers: [
          ...prior.filter((a) => (a as { pair_id?: string })?.pair_id !== pairId),
          { pair_id: pairId, answer, matches_key: ok, scored, at: new Date().toISOString() },
        ],
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (detailErr) log.warn("manip answer write failed", { error: detailErr });

  return { pair_id: pairId, ok, scored };
}
