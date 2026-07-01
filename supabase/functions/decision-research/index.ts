// decision-research: make a finished decision ACTIONABLE.
//
// POST { case_id, mode }  mode = "research_more" | "strengthen" | "counter_evidence"
//   -> 202 { case_id, stage: "verifying" }  (runs in background; the frontend
//      polls decision_cases/claims/evidence exactly like the engine run)
//
// Reuses the decision-engine primitives rather than reinventing them:
//   - research_more   : re-verify the load-bearing claims (fresh evidence +
//                       refreshed verdicts), then re-advise.
//   - strengthen      : gather ADDITIONAL supporting evidence for each
//                       load-bearing claim, then re-advise (the case for it,
//                       firmed up).
//   - counter_evidence: run the adversarial panel (crossExamine) + gather
//                       REFUTING evidence, persist the strongest counter-case and
//                       its risks, then re-advise WITH that adversarial input.
//
// Honest by construction: every appended row is real retriever output; verdicts
// and the recommendation are recomputed from the full claim set, never asserted.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { getUserContext } from "../_shared/user-context.ts";
import { verifyClaim } from "../decision-engine/verify.ts";
import { gatherEvidence } from "../decision-engine/retrievers.ts";
import { advise, type AdversarialInput } from "../decision-engine/advise.ts";
import { crossExamine } from "../decision-engine/crossexamine.ts";
import { buildEvidenceRow } from "../decision-engine/reliability.ts";
import { countIndependentSupport } from "../_shared/corroboration.ts";
import type { ClaimVerdict, ExtractedClaim, Evidence, Stance } from "../decision-engine/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";
const MODES = ["research_more", "strengthen", "counter_evidence"] as const;
type Mode = (typeof MODES)[number];

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

interface ClaimRow {
  id: string;
  text: string;
  type: ExtractedClaim["type"];
  is_load_bearing: boolean;
  dimension: ExtractedClaim["dimension"] | null;
  verdict: ClaimVerdict["verdict"];
  confidence: number | null;
  rationale: string | null;
}

/** Run async callbacks with bounded concurrency. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(limit, items.length || 1)).fill(0).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) break;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Insert evidence rows for a claim, via the shared builder so reliability tier, published date,
 *  and the 0-100 score are stamped identically to the engine + enrich paths. `corroboration` is
 *  the independent-support count for this research pass (per-batch approximation). */
async function insertEvidence(
  admin: SupabaseClient,
  claimId: string,
  userId: string,
  evidence: Evidence[],
  corroboration: number,
): Promise<void> {
  if (!evidence.length) return;
  const { error } = await admin.from("decision_evidence").insert(
    evidence.map((e) => buildEvidenceRow(e, { userId, claimId, corroboration })),
  );
  if (error) console.warn("decision-research: evidence insert failed", error.message);
}

async function runResearch(
  admin: SupabaseClient,
  params: { caseId: string; userId: string; mode: Mode; statement: string; claims: ClaimRow[] },
  log: ReturnType<typeof createLogger>,
): Promise<void> {
  const { caseId, userId, mode, statement, claims } = params;
  const started = Date.now();
  try {
    const ctx = await getUserContext(admin, userId);
    // The load-bearing, verifiable claims are where extra research pays off.
    const targets = claims.filter((c) => c.is_load_bearing && c.type !== "assumption" && c.type !== "forecast");
    const workSet = targets.length ? targets : claims.filter((c) => c.type !== "assumption" && c.type !== "forecast");

    let adversarial: AdversarialInput | undefined;

    if (mode === "research_more") {
      // Re-verify each target: fresh evidence + a refreshed verdict.
      await mapLimit(workSet, 3, async (c) => {
        const claim: ExtractedClaim = { text: c.text, type: c.type, is_load_bearing: c.is_load_bearing, dimension: c.dimension ?? "capability" };
        const { verdict, evidence } = await verifyClaim(claim);
        await insertEvidence(admin, c.id, userId, evidence, countIndependentSupport(evidence));
        await admin.from("decision_claims").update({
          verdict: verdict.verdict,
          confidence: verdict.confidence,
          rationale: verdict.rationale,
          updated_at: new Date().toISOString(),
        }).eq("id", c.id);
        // reflect the refreshed verdict locally for the re-advise.
        c.verdict = verdict.verdict;
        c.confidence = verdict.confidence;
        c.rationale = verdict.rationale;
      });
    } else if (mode === "strengthen") {
      // Gather ADDITIONAL supporting evidence (keep supports/neutral) per claim.
      await mapLimit(workSet, 3, async (c) => {
        const ev = await gatherEvidence(`evidence that supports: ${c.text}`, c.type);
        const supportive = ev.filter((e) => e.stance === "supports" || e.stance === "neutral");
        await insertEvidence(admin, c.id, userId, supportive, countIndependentSupport(ev));
      });
    } else {
      // counter_evidence: adversarial panel + refuting evidence per claim.
      const verifiedForJudging = claims.map((c) => ({
        claim: { text: c.text, type: c.type, is_load_bearing: c.is_load_bearing, dimension: c.dimension ?? "capability" } as ExtractedClaim,
        verdict: { verdict: c.verdict, confidence: c.confidence, rationale: c.rationale ?? "" } as ClaimVerdict,
      }));
      try {
        const xex = await crossExamine(statement, ctx, verifiedForJudging);
        adversarial = {
          refutation: xex.adversarial?.refutation ?? null,
          panelRisks: xex.panel.map((p) => `${p.model}: ${p.key_risk}`).filter((s) => s.length > 6),
          disagreement: xex.disagreement,
        };
        // Persist the surfaced risks as tensions so they show on the decision.
        const risks = (adversarial.panelRisks ?? []).slice(0, 4);
        if (risks.length) {
          await admin.from("decision_tensions").insert(
            risks.map((r) => ({
              decision_case_id: caseId,
              user_id: userId,
              kind: "vs_evidence",
              description: r,
              severity: "medium",
            })),
          );
        }
      } catch (e) {
        log.warn("cross-examine failed, falling back to refuting retrieval only", { error: e });
      }
      await mapLimit(workSet, 3, async (c) => {
        const ev = await gatherEvidence(`evidence against or risks of: ${c.text}`, c.type);
        const refuting = ev.filter((e) => (e.stance as Stance) === "refutes");
        await insertEvidence(admin, c.id, userId, refuting, countIndependentSupport(ev));
      });
    }

    // Re-advise over the (possibly refreshed) claim set so the recommendation,
    // counter-case, confidence and next checks reflect the new research.
    await admin.from("decision_cases").update({ stage: "advising", updated_at: new Date().toISOString() }).eq("id", caseId);
    const verified = claims.map((c) => ({
      claim: { text: c.text, type: c.type, is_load_bearing: c.is_load_bearing, dimension: c.dimension ?? "capability" } as ExtractedClaim,
      verdict: { verdict: c.verdict, confidence: c.confidence, rationale: c.rationale ?? "" } as ClaimVerdict,
    }));
    const result = await advise(statement, ctx, verified, [], adversarial);

    await admin.from("decision_cases").update({
      recommendation: result.recommendation,
      counter_case: result.counter_case,
      validate_next: result.validate_next,
      confidence: result.confidence,
      stage: "complete",
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", caseId);

    await admin.from("decision_events").insert({
      decision_case_id: caseId,
      user_id: userId,
      type: "advice_updated",
      payload: { mode, confidence: result.confidence, duration_ms: Date.now() - started },
    });

    log.info("decision research complete", { mode, duration_ms: Date.now() - started });
  } catch (e) {
    log.error("decision research failed", { error: e });
    // Never strand the case mid-research - return it to a readable complete state.
    await admin.from("decision_cases").update({ stage: "complete", updated_at: new Date().toISOString() }).eq("id", caseId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const log = createLogger("decision-research");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) throw new Error("Database configuration error (unexpected project).");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const caseId: string = (body.case_id ?? "").toString();
    const mode: Mode = MODES.includes(body.mode) ? body.mode : "research_more";
    if (!caseId) return json({ error: "case_id is required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Load + authorize the case; it must be the leader's own and finished.
    const { data: caseRow } = await admin
      .from("decision_cases")
      .select("id, user_id, statement, reframed_statement, reframed, stage")
      .eq("id", caseId)
      .maybeSingle();
    if (!caseRow || caseRow.user_id !== userId) return json({ error: "Not found" }, 404);
    if (caseRow.stage !== "complete") return json({ error: "This decision is still being analysed. Try again in a moment." }, 409);

    const { data: claimRows } = await admin
      .from("decision_claims")
      .select("id, text, type, is_load_bearing, dimension, verdict, confidence, rationale")
      .eq("decision_case_id", caseId)
      .order("created_at");
    const claims = (claimRows ?? []) as ClaimRow[];
    if (!claims.length) return json({ error: "This decision has no claims to research." }, 409);

    const statement = (caseRow.reframed ? caseRow.reframed_statement : null) || caseRow.statement;

    // Flip to a running stage so the frontend's poll shows progress immediately.
    await admin.from("decision_cases").update({ stage: "verifying", updated_at: new Date().toISOString() }).eq("id", caseId);

    const work = runResearch(admin, { caseId, userId, mode, statement, claims }, log);
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);
    else await work;

    return json({ case_id: caseId, stage: "verifying", mode }, 202);
  } catch (e) {
    log.error("decision-research handler error", { error: e });
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
