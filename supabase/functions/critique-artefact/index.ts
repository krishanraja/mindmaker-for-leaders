/**
 * critique-artefact - stages 5, 6 and 7 of the harness chain, run as one pass.
 *
 * POST { artifact_id?, body?, surface?, run_id?, lenses? }
 *   -> 202 { run_id, stage: "loading" }
 *
 * The person submits a real piece of work (pasted, or one CTRL generated) and
 * gets back the 4.6 output contract: what was checked, against whose standard,
 * the mechanical violations, a verdict per criterion with the exact quote, the
 * one highest consequence change, and a revision of the passage that broke.
 *
 * `skills/ctrl-check` is the managed reference implementation of exactly this
 * stage and this function follows it: mechanical pass first, quote before you
 * judge, three independent lenses, never invent a criterion, never a bare
 * rejection, advisory not blocking.
 *
 * ---------------------------------------------------------------------------
 * Why this function is the point of Phase 4 (CH-01)
 * ---------------------------------------------------------------------------
 *
 * The ledger had no writer. Once a skill is installed it runs inside the
 * person's own Claude and CTRL observes nothing (mcp-context is read only by
 * design), so DELIVER never unblocked LEARN and Phase 8 was seeded with
 * synthetic rows in a world where no real ones would ever arrive.
 *
 * The review surface is the first of the three writers. The review is the work
 * and the ledger row is the by-product: the person's accept or push-back on a
 * verdict IS the row. There is no separate feedback form, because every loop
 * that requires a separate act of feedback-giving dies. The row is written by
 * the client straight into `ledger` under its owner-scoped RLS; this function
 * produces the verdicts that give it something to write about.
 *
 * ---------------------------------------------------------------------------
 * Run state (CH-15)
 * ---------------------------------------------------------------------------
 *
 * Five LLM calls at worst is one to two minutes, and section 9 bans covering
 * that with a spinner. One `harness_runs` row of kind 'critique' is created
 * first, returned immediately, and the work runs inside EdgeRuntime.waitUntil
 * writing `stage` as it goes, exactly as compile-standard and decision-engine
 * do:
 *
 *   loading -> 7a -> lenses -> meta -> ready
 *                                  \-> failed (+ error)
 *
 * The finished critique lands in `stage_detail.result`. No new table: the run
 * state IS the artefact here, and a second store would be a second truth.
 *
 * ---------------------------------------------------------------------------
 * What stage 7a does here, and what it deliberately does not
 * ---------------------------------------------------------------------------
 *
 * Demotion rewrites text. CH-16 is absolute: no gate mutates a quoted span, and
 * a person's pasted work is entirely their own words. So:
 *
 *   - a CTRL-AUTHORED artefact (artifact_id, we generated it) is demoted before
 *     the lenses see it, exactly as generate-skill-export does. Unresolved
 *     claims are never shipped.
 *   - PASTED work is checked and REPORTED on, never rewritten. Rewriting
 *     somebody's own sentences into "NOT ESTABLISHED:" would be the gate
 *     corrupting the one string the provenance rule treats as immutable.
 *   - every REVISION this function writes is CTRL-authored, so each one
 *     re-enters the mechanical and provenance checks before it ships. Our own
 *     revision is not exempt from the checks that caught the original.
 *
 * ---------------------------------------------------------------------------
 * `lenses`: the measurement mode (stage 5)
 * ---------------------------------------------------------------------------
 *
 * Default is all three, so nothing that already calls this changes. Stage 5's
 * eval passes ["standard"], because the thing being measured is whether the
 * person's OWN compiled standard agrees with them on work it never trained on.
 * The two house checks are CTRL's, not theirs, and folding them into that
 * number would measure the house style and print it as the person's.
 *
 * With one lens the meta-judge does not run: it exists to arbitrate three
 * independent reviews, there is nothing to arbitrate, and letting a second
 * model rewrite a single lens's verdicts would put the judge inside the
 * measurement. The lens's own enforced verdicts are the answer, and the run
 * says so in `notes`.
 *
 * Exemplars are TRAINING ONLY on every path (loadGradedItems filters held-out
 * and repeat rows in the query and again in code, and the ids it used are
 * returned so a caller can assert it). A held-out item retrieved into the gate
 * is the measurement being scored against its own answer key, and it would
 * inflate every number stage 5 produces by an amount nobody can recover
 * afterwards.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { selectModel } from "../_shared/openai-utils.ts";
import {
  availableProviders,
  callLLMWithFallback,
  providerFromModel,
} from "../_shared/llm-fallback.ts";
import { checkDailySoftCap, recordAiUsage } from "../_shared/ai-usage.ts";
import {
  collectClaims,
  parseUnpointedImperatives,
  runProvenanceChecksOverClaims,
  unpointedClaims,
  type ProvenanceFile,
  type ProvenanceOptions,
} from "../_shared/provenance-checks.ts";
import { demoteUnpointedClaims } from "../_shared/demote-claims.ts";
import {
  breaksNeedingRevision,
  canonicaliseForQuote,
  capCriteria,
  enforceLens,
  enforcementReport,
  HOUSE_CRITERIA,
  isUnrepaired,
  labelFor,
  markUnrepaired,
  MAX_CRITIQUE_PASSES,
  mechanicalFindings,
  pickJudgeProvider,
  quoteVerifies,
  selectExemplars,
  type CritiqueVerdict,
  type GradedItem,
  type LensName,
  type LlmProvider,
  type LoadedCriterion,
  type MechanicalFinding,
  type RawVerdict,
  type ScoredVerdict,
} from "../_shared/critique-core.ts";
import {
  buildEvidenceLensPrompt,
  buildMetaPrompt,
  buildRevisionPrompt,
  buildSignatureLensPrompt,
  buildStandardLensPrompt,
  type BuiltPrompt,
} from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

/** Below this there is nothing to review, and a review of nothing is theatre. */
const MIN_ARTEFACT_CHARS = 120;
/** Above this we are paying to reread; the person can review a section instead. */
const MAX_ARTEFACT_CHARS = 24_000;
/** Evidence rows offered as pointer targets and masked as verbatim spans. */
const MAX_EVIDENCE = 60;
/** Their graded pieces considered for retrieval. Training only. */
const MAX_GRADED = 80;
/** The contract says the revision is the passage that broke, not the document. */
const MAX_REVISED = 2;

// EdgeRuntime is a Supabase runtime global; declared for the type checker.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

interface CriterionRow {
  id: string;
  name: string;
  check_text: string;
  weight: string;
  surface: string;
  holds_example: string | null;
  breaks_example: string | null;
}

interface EvidenceRow {
  id: string;
  quote: string | null;
  situated: boolean | null;
}

interface GradeRow {
  item_id: string;
  verdict: string;
  why: string | null;
  sort_items: {
    body: string | null;
    held_out: boolean | null;
    repeat_of: string | null;
  } | null;
}

/** The three lenses, and the default set. Order is the order they are reported in. */
const ALL_LENSES: LensName[] = ["standard", "evidence", "signature"];

/**
 * Which lenses this run may use.
 *
 * An unrecognised name is dropped rather than silently widening the set, and an
 * empty or absent list means all three, which is what every existing caller
 * sends by sending nothing.
 */
function readLenses(raw: unknown): LensName[] {
  if (!Array.isArray(raw)) return [...ALL_LENSES];
  const asked = new Set(
    raw.filter((v): v is string => typeof v === "string").map((v) => v.trim().toLowerCase()),
  );
  const chosen = ALL_LENSES.filter((lens) => asked.has(lens));
  return chosen.length > 0 ? chosen : [...ALL_LENSES];
}

/** The shape the review surface renders. Spec 4.6, field for field. */
interface CritiqueResult {
  checked: string;
  against: string;
  mechanical: MechanicalFinding[];
  judgement: ScoredVerdict[];
  uncovered: Array<{ note: string; quote: string | null }>;
  escalations: Array<{ criterionName: string; note: string }>;
  oneThing: string | null;
  revised: Array<{ criterionName: string; quote: string; replacement: string }>;
  /** Plain sentences about what did not run and why. Never silence. */
  notes: string[];
  passes: number;
  signature: { ran: boolean; provider: string | null; reason: string | null };
  /**
   * `ids` are the graded items that were retrieved. Returned so a measurement
   * run can assert no held-out item reached the gate, rather than trusting that
   * it did not.
   */
  exemplars: { used: number; bothPoles: boolean; none: boolean; ids: string[] };
  enforcement: ReturnType<typeof enforcementReport>;
  /** The lenses this run was allowed to use, and the ones that answered. */
  lenses: { asked: LensName[]; ran: LensName[]; metaRan: boolean };
  surface: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("critique-artefact");
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
    // before the critique finishes, so the caller's JWT is not a safe thing to
    // still be holding. Every write stamps user_id explicitly, and RLS stays
    // the boundary for every read the frontend does.
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = await req.json().catch(() => ({}));

    // A retried POST returns the run it already started, never a second one.
    const replayId = typeof payload?.run_id === "string" ? payload.run_id.trim() : "";
    if (replayId) {
      const { data: existing } = await userClient
        .from("harness_runs")
        .select("id, kind, stage, status, error")
        .eq("id", replayId)
        .maybeSingle();
      if (!existing || existing.kind !== "critique") {
        return json({ error: "That is not one of your reviews." }, 404);
      }
      return json({
        run_id: existing.id,
        stage: existing.stage,
        status: existing.status,
        idempotent: true,
      }, 200);
    }

    const artifactId = typeof payload?.artifact_id === "string" ? payload.artifact_id.trim() : "";
    const pasted = typeof payload?.body === "string" ? payload.body : "";
    const askedSurface = typeof payload?.surface === "string" ? payload.surface.trim() : "";
    const lenses = readLenses(payload?.lenses);

    let artefact = pasted;
    let checked = askedSurface || "a piece of work";
    let generatorProvider: string | null = null;
    let authored = false;

    if (artifactId) {
      const { data: row, error: artErr } = await userClient
        .from("generated_artifacts")
        .select("id, kind, name, body, metadata")
        .eq("id", artifactId)
        .maybeSingle();
      if (artErr) throw new Error(`generated_artifacts read failed: ${artErr.message}`);
      if (!row) return json({ error: "That is not one of your artefacts." }, 404);
      artefact = typeof row.body === "string" ? row.body : "";
      checked = String(row.name ?? row.kind ?? "a generated artefact");
      // The recorded fact, not an assumption (CH-14). Phase 0 persists which
      // provider actually answered onto metadata.provider.
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      const recorded = metadata.provider;
      generatorProvider = typeof recorded === "string" ? recorded : null;
      authored = true;
    }

    artefact = artefact.replace(/\r\n/g, "\n").trim();
    if (artefact.length < MIN_ARTEFACT_CHARS) {
      return json({
        error: "Paste a bit more. I need the actual piece of work to check it against anything.",
      }, 400);
    }
    if (artefact.length > MAX_ARTEFACT_CHARS) {
      return json({
        error: "That is longer than I can read in one pass. Send the section you want checked.",
      }, 400);
    }

    const softCap = await checkDailySoftCap(admin, userId, "critique-artefact");

    const { data: runRow, error: runErr } = await userClient
      .from("harness_runs")
      .insert({
        user_id: userId,
        kind: "critique",
        surface: askedSurface || null,
        status: "running",
        stage: "loading",
        stage_detail: {
          source: authored ? "artifact" : "paste",
          artifact_id: artifactId || null,
          generator_provider: generatorProvider,
          checked,
          lenses_asked: lenses,
        },
      })
      .select("id")
      .single();
    if (runErr || !runRow) {
      throw new Error(`harness_runs insert failed: ${runErr?.message ?? "unknown"}`);
    }
    const runId = runRow.id as string;

    const work = critique(admin, {
      runId,
      userId,
      artefact,
      checked,
      surface: askedSurface,
      generatorProvider,
      authored,
      lenses,
      log: log.withContext({ run_id: runId, userId }),
    });

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(work);
    } else {
      await work;
    }

    return json({ run_id: runId, stage: "loading", soft_cap: softCap }, 202);
  } catch (e) {
    log.error("critique-artefact handler error", { error: e });
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

interface CritiqueParams {
  runId: string;
  userId: string;
  artefact: string;
  checked: string;
  surface: string;
  generatorProvider: string | null;
  authored: boolean;
  /** Which lenses this run may use. All three unless a caller narrowed it. */
  lenses: LensName[];
  log: ReturnType<typeof createLogger>;
}

/**
 * The background pass. Every exit writes a terminal stage: a run stuck on
 * 'lenses' forever is worse than a run that says it stopped and why.
 */
async function critique(admin: SupabaseClient, params: CritiqueParams): Promise<void> {
  const { runId, userId, checked, generatorProvider, authored, lenses, log } = params;
  const wants = (lens: LensName): boolean => lenses.includes(lens);
  let artefact = params.artefact;
  const detail: Record<string, unknown> = {};
  const notes: string[] = [];

  const setStage = async (stage: string, extra: Record<string, unknown> = {}) => {
    Object.assign(detail, extra);
    await admin
      .from("harness_runs")
      .update({ stage, stage_detail: { ...detail }, updated_at: new Date().toISOString() })
      .eq("id", runId);
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
      .eq("id", runId);
  };

  try {
    const { data: seed } = await admin
      .from("harness_runs")
      .select("stage_detail")
      .eq("id", runId)
      .maybeSingle();
    Object.assign(detail, (seed?.stage_detail as Record<string, unknown>) ?? {});

    // --- 1. loading: the standard, the evidence, their graded work -----------
    await setStage("loading");

    const { criteria, surface } = await loadCriteria(admin, userId, params.surface);
    const evidence = await loadEvidence(admin, userId);
    const graded = await loadGradedItems(admin, userId);

    const capped = capCriteria(criteria);
    if (capped.overCap) {
      notes.push(
        `Your standard has ${criteria.length} criteria for this kind of work and I score at most ` +
          "seven in one pass. I took the essential ones first. The rest are better as a second check.",
      );
    }
    if (capped.scored.length === 0) {
      notes.push(
        "You have not set a standard for this kind of work yet, so I checked it mechanically " +
          "and against my own two checks, but not against your judgement. I will not guess what " +
          "you would say.",
      );
    }

    const quotes = evidence
      .map((row) => String(row.quote ?? "").trim())
      .filter((quote) => quote.length > 0);
    const provOptions: ProvenanceOptions = {
      knownCriterionIds: criteria.map((c) => c.id),
      knownEvidenceIds: evidence.map((row) => row.id),
      situatedEvidenceIds: evidence.filter((row) => row.situated !== false).map((row) => row.id),
      evidenceQuotes: quotes,
    };
    const hasTargets = criteria.length > 0 || evidence.length > 0;

    // --- 2. stage 7a: demote what points at nothing --------------------------
    await setStage("7a", { criteria_loaded: capped.scored.length });

    const scrub = runScrub(artefact, quotes, provOptions, authored && hasTargets);
    artefact = scrub.text;
    if (scrub.demoted > 0) {
      notes.push(
        scrub.demoted === 1
          ? "One rule in this had nothing to point at, so I marked it NOT ESTABLISHED before " +
            "reviewing rather than letting it read as fact."
          : `${scrub.demoted} rules in this had nothing to point at, so I marked them NOT ` +
            "ESTABLISHED before reviewing rather than letting them read as fact.",
      );
    } else if (!authored && scrub.unpointed > 0) {
      notes.push(
        `${scrub.unpointed} statement${scrub.unpointed === 1 ? "" : "s"} in this read as a rule ` +
          "with nothing behind it. I have flagged them below and left your words alone.",
      );
    }

    // The rules with nothing behind them ride WITH the mechanical findings
    // rather than in a block of their own. To the person reading it they are
    // the same kind of thing: something countable, quoted, no judgement call.
    const mechanical = [...mechanicalFindings(artefact, quotes), ...scrub.findings];

    // --- 3. the three lenses, independent, no mutual visibility --------------
    await setStage("lenses", {
      mechanical: mechanical.length,
      demoted: scrub.demoted,
    });

    const selection = selectExemplars(artefact, graded);
    if (selection.none) {
      notes.push(
        "You have not graded any work yet, so I am judging from the criteria alone. That is a " +
          "weaker review than one with your own examples behind it, and I would rather say so " +
          "than let it read as more than it is.",
      );
    } else if (selection.short) {
      notes.push(
        `I had ${selection.exemplars.length} of your own graded pieces to compare against. Three ` +
          "or more is where this gets sharp.",
      );
    }

    const available = availableProviders();
    const judgeProvider = wants("signature") ? pickJudgeProvider(generatorProvider, available) : null;
    const signatureRuns = judgeProvider !== null;
    if (!signatureRuns && wants("signature")) {
      notes.push(
        "Signature: not run, no second provider available. It has to run somewhere other than " +
          "the model that wrote this, and there is nowhere else to run it right now.",
      );
    }

    const lensInput = {
      artefact,
      surface,
      exemplars: selection.exemplars,
      noGradedWork: selection.none,
    };

    const calls: Array<{ lens: LensName; prompt: BuiltPrompt; providers?: LlmProvider[] }> = [];
    if (wants("standard") && capped.scored.length > 0) {
      calls.push({
        lens: "standard",
        prompt: buildStandardLensPrompt({ ...lensInput, criteria: capped.scored }),
      });
    }
    if (wants("evidence")) {
      calls.push({
        lens: "evidence",
        prompt: buildEvidenceLensPrompt({ ...lensInput, criteria: [HOUSE_CRITERIA.evidence] }),
      });
    }
    if (signatureRuns && judgeProvider) {
      calls.push({
        lens: "signature",
        prompt: buildSignatureLensPrompt({ ...lensInput, criteria: [HOUSE_CRITERIA.signature] }),
        // CH-14: any provider that is not the one recorded as generating this.
        providers: [judgeProvider],
      });
    }

    if (calls.length === 0) {
      // Nothing to run is a real state, not an error: a single-lens measurement
      // run against a person with no compiled criteria has no rubric to apply.
      // It says so, and no LLM is called at all.
      notes.push(
        wants("standard") && capped.scored.length === 0 && lenses.length === 1
          ? "There are no compiled checks for this kind of work, so there was nothing to review it " +
            "against and nothing was scored. That is not a pass."
          : "No check was available to run over this, so nothing was scored.",
      );
    }

    // Run in parallel. Each has its own call and none is handed another's
    // output, which is what "independently" means here: not a sequence with a
    // blindfold, three separate reviews of the same submission.
    const settled = await Promise.all(
      calls.map(async (call) => {
        try {
          const raw = await callJson(admin, userId, call.prompt, call.lens, call.providers);
          return { lens: call.lens, raw, error: null as string | null };
        } catch (err) {
          log.warn("lens failed", { lens: call.lens, error: err });
          return { lens: call.lens, raw: null, error: String(err).slice(0, 200) };
        }
      }),
    );

    const lensAnswers: Array<{
      lens: LensName;
      verdicts: ScoredVerdict[];
      uncovered: Array<{ note: string; quote: string | null }>;
      raw: string;
      ran: boolean;
    }> = [];
    let invented: string[] = [];

    for (const outcome of settled) {
      const allowed = allowedFor(outcome.lens, capped.scored);
      if (!outcome.raw) {
        notes.push(lensDownNote(outcome.lens));
        lensAnswers.push({ lens: outcome.lens, verdicts: [], uncovered: [], raw: "", ran: false });
        continue;
      }
      const enforced = enforceLens(readVerdicts(outcome.raw), artefact, {
        lens: outcome.lens,
        allowed,
      });
      invented = [...invented, ...enforced.invented];
      const uncoveredHere = readUncovered(outcome.raw);
      lensAnswers.push({
        lens: outcome.lens,
        verdicts: enforced.verdicts,
        uncovered: uncoveredHere,
        // The meta-judge is handed the ENFORCED answer, not the raw one. A
        // verdict this lens could not quote has already been dropped to
        // insufficient evidence, and letting the judge build on a passage that
        // is not in the work would launder the exact failure the quote rule
        // exists to catch.
        raw: JSON.stringify({
          verdicts: enforced.verdicts.map((v) => ({
            criterion_id: wireId(v),
            criterion_name: v.criterionName,
            verdict: v.verdict,
            quote: v.quote,
            sentence: v.sentence,
            change_to_holds: v.changeToHolds,
            revision: v.revision,
          })),
          uncovered: uncoveredHere,
        }),
        ran: true,
      });
    }

    // --- 4. the meta-judge ---------------------------------------------------
    const ranLenses = lensAnswers.filter((l) => l.ran);
    await setStage("meta", { lenses_ran: ranLenses.length });

    // The judge arbitrates between independent reviews. With fewer than two
    // there is nothing to arbitrate, and a second model rewriting a single
    // lens's verdicts would put the judge inside the measurement rather than
    // over it. The lens's own enforced verdicts are the answer.
    const metaJudges = ranLenses.length >= 2;

    const allowedAll = [
      ...capped.scored,
      HOUSE_CRITERIA.evidence,
      ...(signatureRuns ? [HOUSE_CRITERIA.signature] : []),
    ];

    const metaPrompt = buildMetaPrompt({
      artefact,
      surface,
      criteria: capped.scored,
      // No provider or model identity anywhere in this payload.
      lenses: lensAnswers.map((answer) => ({
        lens: answer.lens,
        label: labelFor(answer.lens),
        json: answer.raw,
        ran: answer.ran,
        note: answer.ran ? undefined : "This lens did not return an answer.",
      })),
    });

    let judgement: ScoredVerdict[] = [];
    let uncovered: Array<{ note: string; quote: string | null }> = [];
    let escalations: Array<{ criterionName: string; note: string }> = [];
    let oneThing: string | null = null;
    let passes = 1;

    let meta: LensJson | null = null;
    if (metaJudges) {
      try {
        meta = await callJson(admin, userId, metaPrompt, "meta");
      } catch (err) {
        log.warn("meta judge failed", { error: err });
      }
    }

    if (meta) {
      const enforced = enforceLens(readVerdicts(meta), artefact, {
        lens: "standard",
        allowed: allowedAll,
      });
      // The meta-judge writes for all three lenses, so each verdict's label is
      // taken from the criterion it scored, never from the call that produced
      // it. A house check reported as their own rule is the specific way a
      // review loses somebody's trust for good.
      judgement = enforced.verdicts.map((verdict) => relabel(verdict, capped.scored));
      invented = [...invented, ...enforced.invented];
      uncovered = readUncovered(meta);
      escalations = readEscalations(meta);
      oneThing = typeof meta.one_thing === "string" ? meta.one_thing.trim() || null : null;
    } else {
      // The panel is still worth something without a judge over it. Merge the
      // lens verdicts, keeping every one, and say plainly that nothing arbitrated.
      if (metaJudges) {
        notes.push(
          "The final pass over the three checks did not come back, so what you are reading is the " +
            "three separate reviews rather than one arbitrated verdict.",
        );
      } else if (ranLenses.length === 1) {
        notes.push(
          `This ran one check only (${labelFor(ranLenses[0].lens)}), so there was nothing to ` +
            "arbitrate between and what you are reading is that check's own answer.",
        );
      }
      judgement = lensAnswers.flatMap((answer) => answer.verdicts);
      uncovered = lensAnswers.flatMap((answer) => answer.uncovered);
    }

    // --- 5. never a bare rejection, bounded at two passes (CH-15) ------------
    const needing = breaksNeedingRevision(judgement);
    if (needing.length > 0 && passes < MAX_CRITIQUE_PASSES) {
      passes += 1;
      const repaired = await repair(admin, userId, {
        artefact,
        surface,
        needing,
        quotes,
        provOptions,
        log,
      });
      if (repaired.size > 0) {
        judgement = judgement.map((verdict) => {
          const fix = repaired.get(verdict.quote);
          return fix ? { ...verdict, revision: fix } : verdict;
        });
      }
      for (const rejected of repaired.rejected) notes.push(rejected);
    }

    // Terminal state: whatever is still unrepaired ships flagged and says so.
    // Never loop, never drop the finding, never hide that it is unrepaired.
    judgement = markUnrepaired(judgement);
    const unrepaired = judgement.filter(isUnrepaired).length;
    if (unrepaired > 0) {
      notes.push(
        unrepaired === 1
          ? "One finding below has no rewrite attached. I could not write a fix I would stand " +
            "behind, so I am saying that rather than dressing it up."
          : `${unrepaired} findings below have no rewrite attached. I could not write fixes I ` +
            "would stand behind, so I am saying that rather than dressing them up.",
      );
    }

    if (invented.length > 0) {
      notes.push(
        `I dropped ${invented.length} judgement${invented.length === 1 ? "" : "s"} made against ` +
          "something that is not in your standard. If one of those matters, it belongs in your " +
          "standard first.",
      );
    }

    const report = enforcementReport(judgement, invented);
    if (report.droppedForQuote > 0) {
      notes.push(
        `${report.droppedForQuote} judgement${report.droppedForQuote === 1 ? "" : "s"} could not ` +
          "point at a real passage in your work, so I did not score them.",
      );
    }

    const result: CritiqueResult = {
      checked,
      against: capped.scored.length > 0
        ? `Your standard for ${surface}, ${capped.scored.length} criteria, plus my two checks`
        : "My two checks. You have not set your own standard for this yet",
      mechanical,
      judgement: orderJudgement(judgement),
      uncovered,
      escalations,
      oneThing,
      revised: revisedBlock(judgement),
      notes,
      passes,
      signature: {
        ran: signatureRuns,
        provider: judgeProvider,
        reason: signatureRuns
          ? null
          : wants("signature")
          ? "no second provider available"
          : "not asked for on this run",
      },
      exemplars: {
        used: selection.exemplars.length,
        bothPoles: selection.bothPoles,
        none: selection.none,
        // Training-set ids only, by construction. Returned so a measurement run
        // can ASSERT that rather than assume it: a held-out item retrieved as an
        // exemplar is the gate being shown the answer key, and it would inflate
        // every number stage 5 prints with no way to tell afterwards.
        ids: selection.exemplars.map((item) => item.id),
      },
      enforcement: report,
      lenses: {
        asked: lenses,
        ran: ranLenses.map((answer) => answer.lens),
        metaRan: meta !== null,
      },
      surface,
    };

    await finish("ready", "done", { result });
    log.info("critique ready", {
      criteria: capped.scored.length,
      verdicts: judgement.length,
      breaks: judgement.filter((v) => v.verdict === "breaks").length,
      unrepaired,
      passes,
      signature_ran: signatureRuns,
    });
  } catch (e) {
    log.error("critique failed", { error: e });
    await finish(
      "failed",
      "failed",
      {},
      e instanceof Error ? e.message : "The review could not be finished.",
    );
  }
}

// ---------------------------------------------------------------------------
// Stage 7a
// ---------------------------------------------------------------------------

interface ScrubResult {
  text: string;
  demoted: number;
  unpointed: number;
  /**
   * The surviving unpointed rules, as findings. Only ever populated on the
   * report-only path: on the demote path they no longer exist. Rendered with
   * the mechanical findings, because a note saying "I flagged them below" has
   * to be followed by them actually being below.
   */
  findings: MechanicalFinding[];
}

/**
 * Collect the imperatives, demote the ones that point at nothing when the text
 * is ours to edit, and report what is left either way.
 *
 * `demote` is false for pasted work and true for a CTRL-authored artefact, and
 * that is the whole CH-16 boundary: we rewrite what we wrote, we report on what
 * they wrote.
 */
function runScrub(
  text: string,
  quotes: string[],
  options: ProvenanceOptions,
  demote: boolean,
): ScrubResult {
  const files: ProvenanceFile[] = [{ path: "", content: text }];
  const claims = collectClaims(files, quotes);

  if (!demote) {
    const checks = runProvenanceChecksOverClaims(claims, options);
    const cited = checks.find((c) => c.id === "prov.everyRuleCited");
    const standing = unpointedClaims(claims);
    return {
      text,
      demoted: 0,
      unpointed: parseUnpointedImperatives(cited?.detail) ?? standing.length,
      findings: standing.map((claim) => ({
        id: "mech.unsourcedRule",
        label: "Stated as a rule with nothing behind it",
        quote: claim.text.slice(0, 160),
        line: claim.line,
      })),
    };
  }

  const demotion = demoteUnpointedClaims(files, claims, quotes);
  const next = demotion.files[0]?.content ?? text;
  const after = runProvenanceChecksOverClaims(collectClaims([{ path: "", content: next }], quotes), options);
  const cited = after.find((c) => c.id === "prov.everyRuleCited");
  return {
    text: next,
    demoted: demotion.demoted.length,
    unpointed: parseUnpointedImperatives(cited?.detail) ?? 0,
    findings: [],
  };
}

// ---------------------------------------------------------------------------
// The revision pass
// ---------------------------------------------------------------------------

interface RepairParams {
  artefact: string;
  surface: string;
  needing: ScoredVerdict[];
  quotes: string[];
  provOptions: ProvenanceOptions;
  log: ReturnType<typeof createLogger>;
}

interface RepairResult {
  size: number;
  /** quote -> replacement, for the revisions that cleared the checks. */
  get(quote: string): string | undefined;
  /** Plain sentences about revisions that were rejected, and why. */
  rejected: string[];
}

/**
 * One repair call, then every returned revision re-enters the checks.
 *
 * A revision is text CTRL wrote, so it is held to the same bar as anything else
 * CTRL writes: it goes through the mechanical pass and the provenance pass
 * before it can ship. A revision that trips either one is rejected rather than
 * cleaned up quietly, and the finding stays unrepaired and says so. Our own
 * revision skipping the checks that caught the original would be an ungated
 * write into a document that was being gated.
 */
async function repair(
  admin: SupabaseClient,
  userId: string,
  params: RepairParams,
): Promise<RepairResult> {
  const fixes = new Map<string, string>();
  const rejected: string[] = [];

  const prompt = buildRevisionPrompt({
    artefact: params.artefact,
    surface: params.surface,
    needing: params.needing.map((v) => ({
      criterionName: v.criterionName,
      quote: v.quote,
      sentence: v.sentence,
    })),
  });

  let answer: LensJson | null = null;
  try {
    answer = await callJson(admin, userId, prompt, "revision");
  } catch (err) {
    params.log.warn("revision pass failed", { error: err });
  }

  const rows: Array<Record<string, unknown>> = Array.isArray(answer?.revisions)
    ? (answer?.revisions as Array<Record<string, unknown>>)
    : [];
  for (const row of rows) {
    const quote = typeof row.quote === "string" ? row.quote.trim() : "";
    const replacement = typeof row.replacement === "string" ? row.replacement.trim() : "";
    if (!quote || !replacement) continue;

    // The passage it claims to be replacing has to be in the work, or it is
    // fixing something that is not there.
    if (!quoteVerifies(params.artefact, quote).ok) {
      rejected.push("I dropped one rewrite because it was fixing a passage that is not in your work.");
      continue;
    }

    // SCRUB, on our own writing.
    const mech = mechanicalFindings(replacement, params.quotes);
    if (mech.length > 0) {
      rejected.push(
        `I dropped one rewrite because it broke the same mechanical rule it was meant to fix (${mech[0].label}).`,
      );
      continue;
    }

    // PROVENANCE, on our own writing. An imperative with nothing behind it is
    // demoted in place rather than dropped, exactly as stage 7a does elsewhere.
    const files: ProvenanceFile[] = [{ path: "", content: replacement }];
    const demoted = demoteUnpointedClaims(files, collectClaims(files, params.quotes), params.quotes);
    const fixed = demoted.files[0]?.content ?? replacement;

    // Asserted, not assumed. A pointer the revision invented resolves to
    // nothing, and demotion does not touch a claim that carries one, so this is
    // the only place that failure would be caught. Rejected rather than
    // repaired: a rewrite citing a criterion that does not exist is worse than
    // the finding it was meant to fix.
    const recheck = runProvenanceChecksOverClaims(
      collectClaims([{ path: "", content: fixed }], params.quotes),
      params.provOptions,
    );
    const unresolved = recheck.find((c) => c.id === "prov.pointerResolves");
    if (unresolved && !unresolved.passed) {
      rejected.push("I dropped one rewrite because it pointed at something that does not exist.");
      continue;
    }

    fixes.set(canonicaliseForQuote(quote), fixed);
  }

  // Matched on the canonical form of the passage, so a revision can only ever
  // attach to the finding whose passage it actually rewrites. A revision landing
  // on the wrong verdict would read as a fix for something it does not fix.
  const byQuote = new Map<string, string>();
  for (const verdict of params.needing) {
    const direct = fixes.get(canonicaliseForQuote(verdict.quote));
    if (direct) byQuote.set(verdict.quote, direct);
  }

  return {
    size: byQuote.size,
    get: (quote: string) => byQuote.get(quote),
    rejected,
  };
}

// ---------------------------------------------------------------------------
// LLM plumbing
// ---------------------------------------------------------------------------

interface LensJson {
  verdicts?: unknown;
  uncovered?: unknown;
  escalations?: unknown;
  revisions?: unknown;
  one_thing?: unknown;
}

async function callJson(
  admin: SupabaseClient,
  userId: string,
  prompt: BuiltPrompt,
  purpose: string,
  providers?: LlmProvider[],
): Promise<LensJson> {
  const response = await callLLMWithFallback(
    {
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      model: selectModel("complex"),
      temperature: 0.2,
      max_tokens: 2600,
      response_format: { type: "json_object" },
    },
    { useCache: false, ...(providers ? { providers } : {}) },
  );

  await recordAiUsage(admin, {
    userId,
    functionName: "critique-artefact",
    provider: providerFromModel(response.model),
    model: response.model,
    purpose: `critique-${purpose}`,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
    status: "ok",
  }).catch(() => undefined);

  return JSON.parse(response.content || "{}") as LensJson;
}

function readVerdicts(json: LensJson): RawVerdict[] {
  return Array.isArray(json.verdicts) ? (json.verdicts as RawVerdict[]) : [];
}

function readUncovered(json: LensJson): Array<{ note: string; quote: string | null }> {
  if (!Array.isArray(json.uncovered)) return [];
  return (json.uncovered as Array<Record<string, unknown>>)
    .map((row) => ({
      note: typeof row.note === "string" ? row.note.trim() : "",
      quote: typeof row.quote === "string" && row.quote.trim() ? row.quote.trim() : null,
    }))
    .filter((row) => row.note.length > 0);
}

function readEscalations(json: LensJson): Array<{ criterionName: string; note: string }> {
  if (!Array.isArray(json.escalations)) return [];
  return (json.escalations as Array<Record<string, unknown>>)
    .map((row) => ({
      criterionName: typeof row.criterion_name === "string" ? row.criterion_name.trim() : "",
      note: typeof row.note === "string" ? row.note.trim() : "",
    }))
    .filter((row) => row.note.length > 0);
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/**
 * The id a verdict travels under between calls. A house check has no criteria
 * row, so it carries its declared house id rather than a null the judge would
 * have to guess at.
 */
function wireId(verdict: ScoredVerdict): string {
  if (verdict.criterionId) return verdict.criterionId;
  return verdict.criterionName === HOUSE_CRITERIA.signature.name
    ? HOUSE_CRITERIA.signature.id
    : HOUSE_CRITERIA.evidence.id;
}

function allowedFor(lens: LensName, scored: LoadedCriterion[]): LoadedCriterion[] {
  if (lens === "standard") return scored;
  if (lens === "evidence") return [HOUSE_CRITERIA.evidence];
  return [HOUSE_CRITERIA.signature];
}

/** A verdict's label comes from the criterion, never from the call. */
function relabel(verdict: ScoredVerdict, scored: LoadedCriterion[]): ScoredVerdict {
  const theirs = scored.some((c) => c.id === verdict.criterionId);
  const lens: LensName = theirs
    ? "standard"
    : verdict.criterionName === HOUSE_CRITERIA.signature.name
    ? "signature"
    : "evidence";
  return { ...verdict, lens, label: labelFor(lens) };
}

function lensDownNote(lens: LensName): string {
  if (lens === "standard") {
    return "The check against your own standard did not come back this time. Everything below is " +
      "my two house checks only.";
  }
  if (lens === "evidence") return "My claims check did not come back this time.";
  return "My signature check did not come back this time.";
}

/** Breaks first, then borderline, then holds, then what could not be scored. */
const VERDICT_ORDER: Record<CritiqueVerdict, number> = {
  breaks: 0,
  borderline: 1,
  holds: 2,
  "insufficient evidence": 3,
};

function orderJudgement(verdicts: ScoredVerdict[]): ScoredVerdict[] {
  return [...verdicts].sort((a, b) => {
    const byVerdict = VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict];
    if (byVerdict !== 0) return byVerdict;
    // Their rule before a house check, always. It is the one that is theirs.
    if (a.lens !== b.lens) return a.lens === "standard" ? -1 : 1;
    return 0;
  });
}

/** REVISED: the passages that broke, capped. Never the whole document. */
function revisedBlock(verdicts: ScoredVerdict[]): CritiqueResult["revised"] {
  return verdicts
    .filter((v) => v.verdict === "breaks" && v.revision && v.quote)
    .slice(0, MAX_REVISED)
    .map((v) => ({
      criterionName: v.criterionName,
      quote: v.quote,
      replacement: v.revision as string,
    }));
}

// ---------------------------------------------------------------------------
// Loads
// ---------------------------------------------------------------------------

const WEIGHTS = new Set(["essential", "important", "optional", "pitfall"]);

/**
 * The compiled criteria that survived the discrimination test, for this surface
 * where there is one.
 *
 * Only `disc_verdict = 'keep'` loads. A criterion a bad piece of work also
 * passes is worse than no criterion, measurably so, and one that was never
 * tested is not a standard yet.
 */
async function loadCriteria(
  admin: SupabaseClient,
  userId: string,
  askedSurface: string,
): Promise<{ criteria: LoadedCriterion[]; surface: string }> {
  const { data } = await admin
    .from("criteria")
    .select("id, name, check_text, weight, surface, holds_example, breaks_example")
    .eq("user_id", userId)
    .eq("is_current", true)
    .eq("disc_verdict", "keep");

  const rows = (data ?? []) as CriterionRow[];
  const wanted = askedSurface.toLowerCase();
  const matching = wanted
    ? rows.filter((row) => String(row.surface ?? "").toLowerCase() === wanted)
    : [];
  // Fall back to everything they have compiled rather than to nothing: a person
  // who graded client updates and pastes a board update is better served by
  // their own criteria than by an empty rubric.
  const chosen = matching.length > 0 ? matching : rows;
  const surface = askedSurface || chosen[0]?.surface || "this kind of work";

  return {
    surface,
    criteria: chosen.map((row, index) => ({
      id: row.id,
      shortId: `C${index + 1}`,
      name: row.name,
      checkText: row.check_text,
      weight: (WEIGHTS.has(row.weight) ? row.weight : "important") as LoadedCriterion["weight"],
      holdsExample: row.holds_example,
      breaksExample: row.breaks_example,
    })),
  };
}

async function loadEvidence(admin: SupabaseClient, userId: string): Promise<EvidenceRow[]> {
  const { data } = await admin
    .from("evidence")
    .select("id, quote, situated")
    .eq("user_id", userId)
    .is("redacted_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_EVIDENCE);
  return (data ?? []) as EvidenceRow[];
}

/**
 * Their own graded pieces, TRAINING ONLY.
 *
 * The hold-out is excluded here for the same reason it is excluded everywhere:
 * a hold-out item retrieved into the gate is the measurement being scored
 * against its own answer key, and nothing downstream can be trusted afterwards.
 * Self-agreement repeats are excluded too; those measure the grader.
 *
 * Excluded TWICE on purpose. The query filters on the joined row so held-out
 * items never come back and never eat the MAX_GRADED budget, and the same
 * predicate runs again in code so a PostgREST embed that silently stopped
 * applying the filter cannot leak one. This is the single bug that would
 * inflate every number stage 5 produces while looking like a clean run, so it
 * gets a belt and braces and the ids ride out on the result for a third check.
 */
async function loadGradedItems(admin: SupabaseClient, userId: string): Promise<GradedItem[]> {
  const { data } = await admin
    .from("sort_grades")
    .select("item_id, verdict, why, sort_items!inner(body, held_out, repeat_of)")
    .eq("user_id", userId)
    .neq("verdict", "skip")
    .eq("sort_items.held_out", false)
    .is("sort_items.repeat_of", null)
    .order("created_at", { ascending: false })
    .limit(MAX_GRADED);

  const rows = (data ?? []) as unknown as GradeRow[];
  return rows
    .filter((row) =>
      row.sort_items &&
      row.sort_items.held_out !== true &&
      !row.sort_items.repeat_of &&
      String(row.sort_items.body ?? "").trim().length > 0
    )
    .map((row) => ({
      id: row.item_id,
      body: String(row.sort_items?.body ?? ""),
      verdict: row.verdict === "send" ? "send" : "would_not_send",
      why: row.why,
      heldOut: false,
    }));
}
