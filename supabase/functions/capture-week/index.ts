/**
 * capture-week - stage 9 of the harness chain, LEARN. The weekly pass that
 * turns review history into proposed changes to a person's standard.
 *
 * POST (cron only) -> 200 { week, users, proposed, ... }
 *
 * This is the last stage in the chain and the only one that changes a standard,
 * and it never changes one itself. It writes rows to `proposals` with status
 * 'awaiting'. A named human accepts or rejects each one at /proposals. There is
 * no code path in this file that writes `criteria`: `criteria` is read, twice,
 * and never inserted, updated or deleted. A standard that changes without a
 * decision is a standard nobody owns.
 *
 * `skills/ctrl-capture` is the managed reference implementation of exactly this
 * stage and this function follows it: two strikes, the three types in order,
 * one message of decisions rather than a report, a size delta on every
 * proposal, an `if_wrong` on every proposal, and silence when there is nothing.
 *
 * ---------------------------------------------------------------------------
 * DEPLOY WITH verify_jwt = false
 * ---------------------------------------------------------------------------
 *
 * pg_cron calls this over net.http_post with a bearer secret, not a user JWT,
 * so the platform's JWT verification has to be off and the gate below IS the
 * auth. Same shape as memory-sweep and decision-watch: a dedicated shared
 * secret, OR the service-role key, OR a JWT whose role is service_role.
 * Anything else is 403 before a single row is read.
 *
 *   supabase functions deploy capture-week --no-verify-jwt
 *
 * ---------------------------------------------------------------------------
 * No model chooses anything here (spec 4.9, section 9)
 * ---------------------------------------------------------------------------
 *
 * Two strikes and the three types are arithmetic over ledger rows, and all of
 * it lives in ../_shared/capture-core.ts where vitest can pin it. There is no
 * LLM call in this function at all. A model asked to read a week of ledger and
 * find "what keeps coming up" finds something every week, which is precisely
 * the failure two strikes exists to prevent. If wording ever needs drafting, a
 * model may draft the headline and delta of candidates ALREADY selected here;
 * it may never select one.
 *
 * ---------------------------------------------------------------------------
 * The quarterly pass, and how "every thirteenth run" is decided
 * ---------------------------------------------------------------------------
 *
 * Every thirteenth run does the weekly pass and the quarterly one. There is no
 * run-counter table, and adding one would be a second source of truth about a
 * schedule the cron already owns, so the thirteenth run is derived from the ISO
 * week itself: `weekIndex(week) % 13 === 0`. Deterministic, stateless, and
 * identical whether the cron fired it or an operator re-ran it. `?quarterly=1`
 * forces it for ops.
 *
 * The quarterly re-score reuses ../_shared/confusion.ts for every number and
 * recomputes none of them, and it MUTATES NOTHING. It reads the held-out set,
 * applies the current rubric's deterministic probes (../_shared/discrimination.ts,
 * the same probe machinery the compile stage scores with), builds the matrix,
 * and puts the report in this run's output. Retirements are listed and asked
 * about; nothing is retired here.
 *
 * The honest limit on that number, stated because it will be read: the probe is
 * a deterministic check, not the three-lens gate the review surface runs. It is
 * the strongest re-score available to a cron with no user JWT and no model
 * budget, it is exactly reproducible, and it is not the same instrument as
 * scripts/eval-skill.mjs. A criterion with no checkable observable contributes
 * nothing rather than a guess, and when no criterion on the surface has one the
 * item is 'insufficient', never a quiet 'holds'.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { withTimeout } from "../_shared/with-timeout.ts";
import {
  buildProposal,
  isoWeekOf,
  STRIKE_WINDOW_WEEKS,
  weeklyPass,
  weekIndex,
  windowWeeks,
  type CriterionRow,
  type LedgerRow,
  type ProposalRow,
} from "../_shared/capture-core.ts";
import {
  confusionMatrix,
  metricsFrom,
  type GateVerdict,
  type MeasuredPair,
  type Metrics,
} from "../_shared/confusion.ts";
import { tryApplyProbe } from "../_shared/discrimination.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Every thirteenth run does the quarterly pass alongside the weekly one. */
const QUARTERLY_EVERY = 13;

/**
 * Proposals sent to one person in one run.
 *
 * "Not a report and not a summary of the week. Just the decisions they need to
 * make." A first run over a busy ledger can find a dozen things, and a dozen
 * yes-or-no decisions in one message is a message that gets closed. The rest
 * are not lost: nothing was proposed for them, so they are still two-struck
 * next week and arrive then.
 */
const PROPOSALS_PER_USER = 5;

/** Ledger rows read per run. A cap that is hit is reported, never silent. */
const LEDGER_ROW_CAP = 5000;

/** Held-out items re-scored per user in the quarterly pass. */
const QUARTERLY_ITEM_CAP = 40;

/** Wall-clock budget for one database round trip. */
const DB_TIMEOUT_MS = 15_000;

function roleFromJwt(bearer: string): string | null {
  try {
    let p = bearer.split(".")[1];
    p = p.replace(/-/g, "+").replace(/_/g, "/");
    while (p.length % 4) p += "=";
    return JSON.parse(atob(p)).role ?? null;
  } catch (_e) {
    return null;
  }
}

interface QuarterlyReport {
  user_id: string;
  sort_run_id: string | null;
  /** Held-out items carrying a real grade. Not the number scored. */
  held_out_graded: number;
  criteria_scored: number;
  criteria_without_a_check: number;
  precision: number | null;
  recall: number | null;
  tnr: number | null;
  counts: { tp: number; fp: number; fn: number; tn: number };
  excluded: { skipped: number; insufficient: number };
  previous_tnr: number | null;
  tnr_decayed: boolean;
  decay_note: string | null;
  retirements: Array<{ criterion: string; surface: string; last_seen_week: string | null }>;
  note: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const log = createLogger("capture-week");
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // -------------------------------------------------------------------------
  // The gate. Cron-only, exactly as memory-sweep.
  // -------------------------------------------------------------------------
  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const captureSecret = Deno.env.get("CAPTURE_WEEK_SECRET") ?? "";
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const okCaller =
    (!!bearer && ((!!captureSecret && bearer === captureSecret) || (!!svcKey && bearer === svcKey))) ||
    roleFromJwt(bearer) === "service_role";
  if (!okCaller) return json({ error: "Forbidden" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const admin = createClient(supabaseUrl, svcKey, { auth: { persistSession: false } }) as SupabaseClient;

  const url = new URL(req.url);
  const weekParam = url.searchParams.get("week");
  const nowWeek = weekParam && weekIndex(weekParam) !== null ? weekParam : isoWeekOf(new Date());
  const window = windowWeeks(nowWeek, STRIKE_WINDOW_WEEKS);
  const index = weekIndex(nowWeek) ?? 0;
  const quarterly = url.searchParams.get("quarterly") === "1" || index % QUARTERLY_EVERY === 0;
  const dryRun = url.searchParams.get("dry_run") === "1";

  const started = Date.now();

  try {
    // -----------------------------------------------------------------------
    // This week's ledger plus the previous four.
    // -----------------------------------------------------------------------
    const { data: ledgerData, error: ledgerError } = await withTimeout(
      admin
        .from("ledger")
        .select("id, user_id, week, surface, signal, class, criterion_id, criterion_name, verdict, quote, disposition, created_at")
        .in("week", window)
        .order("created_at", { ascending: true })
        .limit(LEDGER_ROW_CAP),
      DB_TIMEOUT_MS,
      "ledger window",
    );
    if (ledgerError) {
      log.error("ledger read failed", { error: ledgerError });
      return json({ error: ledgerError.message }, 500);
    }

    const rows = (ledgerData ?? []) as LedgerRow[];
    if (rows.length === 0) {
      // A weekly pass that always finds something is a weekly pass inventing
      // things to justify itself. Nothing to read is one line and a stop.
      const summary = {
        week: nowWeek,
        window,
        quarterly,
        users: 0,
        rows_read: 0,
        proposed: 0,
        note: "No reviews were recorded in the last five weeks, so there is nothing to learn from yet.",
      };
      log.info("nothing to read", summary);
      return json(summary);
    }

    const byUser = new Map<string, LedgerRow[]>();
    for (const row of rows) {
      const bucket = byUser.get(row.user_id);
      if (bucket) bucket.push(row);
      else byUser.set(row.user_id, [row]);
    }

    let proposed = 0;
    let alreadyOnFile = 0;
    let errors = 0;
    const perUser: Array<Record<string, unknown>> = [];
    const quarterlyReports: QuarterlyReport[] = [];

    for (const [userId, userRows] of byUser) {
      try {
        // ---------------------------------------------------------------
        // Their current rubric. READ ONLY, here and everywhere in this file.
        // ---------------------------------------------------------------
        const { data: criteriaData } = await withTimeout(
          admin
            .from("criteria")
            .select("id, user_id, surface, name, weight, disposition, observable")
            .eq("user_id", userId)
            .eq("is_current", true),
          DB_TIMEOUT_MS,
          "criteria",
        );
        const criteriaRows = (criteriaData ?? []) as Array<CriterionRow & { observable: string | null }>;
        const criteria = criteriaRows.filter((c) => c.disposition !== "retired");

        // Everything already decided on, or waiting to be. Re-proposing a
        // rejection is arguing, and the reference is explicit that we do not.
        const { data: existing } = await withTimeout(
          admin
            .from("proposals")
            .select("id, status, evidence")
            .eq("user_id", userId)
            .in("status", ["awaiting", "rejected"]),
          DB_TIMEOUT_MS,
          "existing proposals",
        );
        const alreadyProposed = new Set<string>();
        for (const p of (existing ?? []) as Array<{ evidence: { key?: unknown } | null }>) {
          const key = p.evidence?.key;
          if (typeof key === "string" && key) alreadyProposed.add(key);
        }

        // ---------------------------------------------------------------
        // The pass itself. All arithmetic, all in capture-core.
        // ---------------------------------------------------------------
        const pass = weeklyPass({
          rows: userRows,
          criteria,
          nowWeek,
          alreadyProposed,
        });

        // How many rules this surface already carries, for the size delta.
        const countBySurface = new Map<string, number>();
        for (const c of criteria) {
          countBySurface.set(c.surface, (countBySurface.get(c.surface) ?? 0) + 1);
        }

        const send = pass.candidates.slice(0, PROPOSALS_PER_USER);
        const held = pass.candidates.length - send.length;
        const proposals: ProposalRow[] = send.map((candidate) =>
          buildProposal(candidate, countBySurface.get(candidate.surface) ?? 0),
        );

        if (proposals.length > 0 && !dryRun) {
          const { error: insertError } = await withTimeout(
            admin.from("proposals").insert(proposals),
            DB_TIMEOUT_MS,
            "insert proposals",
          );
          if (insertError) {
            // Logged loudly rather than swallowed: a proposal that silently did
            // not land is a loop that looks like it is running and is not.
            errors += 1;
            log.error("proposal insert failed", { userId, error: insertError, count: proposals.length });
          } else {
            proposed += proposals.length;
          }
        } else if (proposals.length > 0) {
          proposed += proposals.length;
        }

        alreadyOnFile += alreadyProposed.size;

        perUser.push({
          user_id: userId,
          rows_read: pass.rowsRead,
          candidates: pass.candidates.length,
          proposed: proposals.length,
          held_for_next_week: held,
          types: proposals.map((p) => p.type),
          // Named, not proposed: proposals.type admits three values and a
          // method correction amends a skill rather than a criterion.
          method_strikes: pass.methodStrikes.length,
          trigger_strikes: pass.triggerStrikes.length,
        });

        if (quarterly) {
          const report = await runQuarterly(admin, userId, criteriaRows, userRows, nowWeek);
          if (report) quarterlyReports.push(report);
        }
      } catch (e) {
        errors += 1;
        log.warn("user pass failed", { userId, error: e });
      }
    }

    const summary = {
      week: nowWeek,
      window,
      quarterly,
      dry_run: dryRun,
      users: byUser.size,
      rows_read: rows.length,
      rows_capped: rows.length >= LEDGER_ROW_CAP,
      proposed,
      already_on_file: alreadyOnFile,
      errors,
      duration_ms: Date.now() - started,
      per_user: perUser,
      ...(quarterly ? { quarterly_report: quarterlyReports } : {}),
    };
    log.info("weekly pass complete", summary);
    return json(summary);
  } catch (e) {
    log.error("capture failed", { error: e });
    return json({ error: e instanceof Error ? e.message : "capture failed" }, 500);
  }
});

// ---------------------------------------------------------------------------
// The quarterly pass
// ---------------------------------------------------------------------------

/**
 * Re-score the held-out set, report the three numbers, check for decay, list
 * what looks retirable. Mutates nothing.
 *
 * "Report all three separately. Never a single agreement number." Raw agreement
 * is misleading whenever the classes are unbalanced and they always are, and a
 * gate that says holds to everything scores well on agreement and is worthless.
 *
 * The number to watch is the false positive count, because it is the one that
 * predicts whether people keep using the gate. And TRUE NEGATIVE RATE FALLS AS
 * THE GENERATOR IMPROVES, which is the finding that most threatens this whole
 * architecture, so it is compared against the previous quarter every time
 * rather than when somebody complains. If you wait for a complaint, the gate
 * has already lost the room.
 */
async function runQuarterly(
  admin: SupabaseClient,
  userId: string,
  criteria: Array<CriterionRow & { observable: string | null }>,
  ledgerRows: readonly LedgerRow[],
  nowWeek: string,
): Promise<QuarterlyReport | null> {
  const retirements = retirementCandidates(criteria, ledgerRows, nowWeek);

  const empty = (note: string, runId: string | null = null): QuarterlyReport => ({
    user_id: userId,
    sort_run_id: runId,
    held_out_graded: 0,
    criteria_scored: 0,
    criteria_without_a_check: criteria.filter((c) => !c.observable).length,
    precision: null,
    recall: null,
    tnr: null,
    counts: { tp: 0, fp: 0, fn: 0, tn: 0 },
    excluded: { skipped: 0, insufficient: 0 },
    previous_tnr: null,
    tnr_decayed: false,
    decay_note: null,
    retirements,
    note,
  });

  const { data: runData } = await withTimeout(
    admin
      .from("harness_runs")
      .select("id, surface, created_at")
      .eq("user_id", userId)
      .eq("kind", "sort")
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(1),
    DB_TIMEOUT_MS,
    "sort run",
  );
  const run = ((runData ?? []) as Array<{ id: string; surface: string | null }>)[0];
  if (!run) return empty("No completed sort, so there is no held-out set to re-score.");

  const { data: itemData } = await withTimeout(
    admin
      .from("sort_items")
      .select("id, surface, body, held_out, repeat_of, sort_grades(verdict)")
      .eq("session_id", run.id)
      .eq("held_out", true)
      .is("repeat_of", null)
      .limit(QUARTERLY_ITEM_CAP),
    DB_TIMEOUT_MS,
    "held-out items",
  );

  type Item = {
    id: string;
    surface: string;
    body: string;
    sort_grades: Array<{ verdict: string }> | { verdict: string } | null;
  };
  const items = (itemData ?? []) as Item[];

  const graded = items
    .map((item) => {
      const g = Array.isArray(item.sort_grades) ? item.sort_grades[0] : item.sort_grades;
      return { item, verdict: g?.verdict ?? null };
    })
    .filter((row) => row.verdict === "send" || row.verdict === "would_not_send" || row.verdict === "skip");

  const scoreable = graded.filter((row) => row.verdict !== "skip");
  if (scoreable.length === 0) {
    return empty("The held-out set carries no grades, so there is nothing to score against.", run.id);
  }

  // The probes that can actually be checked. A criterion with no observable
  // contributes nothing rather than a guess.
  const surface = run.surface ?? scoreable[0].item.surface;
  const probes = criteria.filter((c) => c.surface === surface && !!c.observable);

  const pairs: MeasuredPair[] = [];
  for (const { item, verdict } of graded) {
    if (verdict === "skip") {
      pairs.push({ human: "skip", gate: "insufficient", itemId: item.id });
      continue;
    }
    pairs.push({
      human: verdict as "send" | "would_not_send",
      gate: gateVerdictFor(probes, item.body),
      itemId: item.id,
    });
  }

  const matrix = confusionMatrix(pairs);
  const metrics: Metrics = metricsFrom(matrix);

  // The previous quarter's TNR, from the standard the measurement stage wrote.
  // Read, never written: this function does not relabel anything.
  const { data: standardData } = await withTimeout(
    admin
      .from("generated_artifacts")
      .select("metadata, created_at")
      .eq("user_id", userId)
      .eq("kind", "standard")
      .order("created_at", { ascending: false })
      .limit(1),
    DB_TIMEOUT_MS,
    "previous standard",
  );
  const meta = ((standardData ?? []) as Array<{ metadata: Record<string, unknown> | null }>)[0]?.metadata ?? null;
  const storedTnr = meta && typeof meta.tnr === "number" ? meta.tnr : null;
  const previousTnr = storedTnr !== null && Number.isFinite(storedTnr) ? storedTnr : null;
  const decayed = metrics.tnr !== null && previousTnr !== null && metrics.tnr < previousTnr;

  return {
    user_id: userId,
    sort_run_id: run.id,
    held_out_graded: scoreable.length,
    criteria_scored: probes.length,
    criteria_without_a_check: criteria.filter((c) => c.surface === surface && !c.observable).length,
    precision: metrics.precision,
    recall: metrics.recall,
    tnr: metrics.tnr,
    counts: { tp: matrix.tp, fp: matrix.fp, fn: matrix.fn, tn: matrix.tn },
    excluded: { skipped: matrix.excluded.skipped, insufficient: matrix.excluded.insufficient },
    previous_tnr: previousTnr,
    tnr_decayed: decayed,
    decay_note: decayed
      ? "True negative rate is below the last measurement. It falls as the work being produced gets " +
        "better, so this is the expected direction and the reason recalibration is scheduled rather " +
        "than waited for."
      : null,
    retirements,
    note: probes.length === 0
      ? "No rule on this surface has anything checkable attached, so every piece came back " +
        "unscoreable rather than passing quietly."
      : null,
  };
}

/**
 * One item through the current rubric, deterministically.
 *
 *   breaks       -> at least one checkable rule does not hold on this piece
 *   holds        -> at least one rule could be checked and none of them broke
 *   insufficient -> nothing on this surface could be checked at all
 *
 * The third is never silently a 'holds'. A check that could not run has not
 * agreed with anybody, and counting it as agreement is how a gate ends up
 * claiming a true negative rate it never earned.
 */
function gateVerdictFor(
  probes: Array<{ observable: string | null }>,
  body: string,
): GateVerdict {
  let applied = 0;
  let broke = false;
  for (const probe of probes) {
    const holds = tryApplyProbe(probe.observable, body ?? "");
    if (holds === null) continue;
    applied += 1;
    if (!holds) broke = true;
  }
  if (applied === 0) return "insufficient";
  return broke ? "breaks" : "holds";
}

/**
 * Criteria that have not come up in the window, with the last week they did.
 *
 * Listed and asked about. NOTHING IS RETIRED HERE. A criterion that stopped
 * firing might be the one thing preventing a failure nobody has seen recently,
 * which is what success looks like, and the owner is the only one who can tell
 * those two apart.
 */
function retirementCandidates(
  criteria: readonly CriterionRow[],
  rows: readonly LedgerRow[],
  nowWeek: string,
): Array<{ criterion: string; surface: string; last_seen_week: string | null }> {
  const window = new Set(windowWeeks(nowWeek, STRIKE_WINDOW_WEEKS));
  const seenInWindow = new Set<string>();
  const lastSeen = new Map<string, string>();

  for (const row of rows) {
    if (row.signal !== "output") continue;
    const key = `${row.surface}:${row.criterion_name}`;
    const prior = lastSeen.get(key);
    if (!prior || (weekIndex(row.week) ?? 0) > (weekIndex(prior) ?? 0)) lastSeen.set(key, row.week);
    if (window.has(row.week)) seenInWindow.add(key);
  }

  return criteria
    .filter((c) => c.disposition !== "retired" && !seenInWindow.has(`${c.surface}:${c.name}`))
    .map((c) => ({
      criterion: c.name,
      surface: c.surface,
      last_seen_week: lastSeen.get(`${c.surface}:${c.name}`) ?? null,
    }));
}
