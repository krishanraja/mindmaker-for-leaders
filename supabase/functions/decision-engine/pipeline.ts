// Orchestrates the synchronous pass: decompose -> verify -> advise.
// Writes rows as it progresses and advances decision_cases.stage so the
// frontend can render each stage as it lands (mirrors the briefing pattern).
// Runs with a service-role client so background writes survive the response.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Logger } from "../_shared/logger.ts";
import type { UserContext } from "../_shared/user-context.ts";
import { decompose } from "./decompose.ts";
import { verifyClaim } from "./verify.ts";
import { prewarmAaIndex } from "./retrievers.ts";
import { advise, type AdversarialInput } from "./advise.ts";
import { reframeToAiNative } from "./reframe.ts";
import { crossExamine } from "./crossexamine.ts";
import { type EvidenceLite } from "../_shared/reaction-extraction.ts";
import { tierForEvidence } from "./reliability.ts";
import type { ClaimVerdict, ExtractedClaim } from "./types.ts";

export interface PipelineParams {
  caseId: string;
  userId: string;
  statement: string;
  ctx: UserContext;
  objectiveFactIds: string[];
  isPro: boolean;
}

/** Run async callbacks with bounded concurrency. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) break;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runPipeline(admin: SupabaseClient, params: PipelineParams, log: Logger): Promise<void> {
  const { caseId, userId, statement, ctx, objectiveFactIds, isPro } = params;
  const started = Date.now();

  try {
    // Warm the Artificial Analysis leaderboard now, so it is ready (and fetched
    // in isolation, not racing the verify storm) by the time claims need the
    // model-benchmark cross-check. Fire-and-forget; the memo holds the result.
    prewarmAaIndex();

    // --- Stage 0: AI-native reframe ----------------------------------------
    // CTRL only pressure-tests the AI-native version of a decision. If the
    // submitted statement is already AI-native it passes through unchanged; if
    // it is general business it is reframed into its AI-native version, and the
    // rest of the pipeline reasons on the reframed statement. The reframe is
    // surfaced honestly: we persist BOTH the original (decision_cases.statement,
    // already stored at insert) and the reframed statement + a note. Nothing is
    // silently swapped.
    const reframe = await reframeToAiNative(statement);
    const effectiveStatement = reframe.effectiveStatement;
    if (reframe.reframed) {
      await admin
        .from("decision_cases")
        .update({
          reframed: true,
          reframed_statement: reframe.effectiveStatement,
          reframe_note: reframe.reframeNote,
          lifecycle_stage: reframe.lifecycleStage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId);
      log.info("decision reframed to AI-native", { userId, lifecycle: reframe.lifecycleStage });
    } else if (reframe.lifecycleStage) {
      await admin
        .from("decision_cases")
        .update({ lifecycle_stage: reframe.lifecycleStage, updated_at: new Date().toISOString() })
        .eq("id", caseId);
    }

    // --- Stage 1: decompose -------------------------------------------------
    const decomposed = await decompose(effectiveStatement, ctx);

    await admin
      .from("decision_cases")
      .update({
        title: decomposed.title,
        decision_kind: decomposed.decision_kind,
        objective_fact_ids: objectiveFactIds,
        stage: "verifying",
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    // Insert claims (batch; PostgREST preserves input order on return).
    const claimRows = decomposed.claims.map((c) => ({
      decision_case_id: caseId,
      user_id: userId,
      text: c.text,
      type: c.type,
      is_load_bearing: c.is_load_bearing,
      verdict: "pending",
    }));
    const { data: insertedClaims, error: claimErr } = await admin
      .from("decision_claims")
      .insert(claimRows)
      .select("id, text, type, is_load_bearing");
    if (claimErr) throw new Error(`claim insert failed: ${claimErr.message}`);
    const claims = insertedClaims ?? [];

    // Profile tensions from decompose.
    if (decomposed.profile_tensions.length) {
      await admin.from("decision_tensions").insert(
        decomposed.profile_tensions.map((t) => ({
          decision_case_id: caseId,
          user_id: userId,
          kind: "vs_profile",
          description: t.description,
          severity: t.severity,
        })),
      );
    }

    // Ensure the Artificial Analysis index is resolved BEFORE the concurrent
    // verify storm, so its fetch never has to race ~16 simultaneous retriever
    // calls (which intermittently timed it out). Prewarm started at pipeline
    // entry, so this usually returns instantly. Best-effort.
    await prewarmAaIndex().catch(() => {});

    // --- Stage 2: verify each claim ----------------------------------------
    const verified = await mapLimit(claims, 4, async (row) => {
      const claim: ExtractedClaim = { text: row.text, type: row.type, is_load_bearing: row.is_load_bearing };
      const { verdict, evidence } = await verifyClaim(claim);

      // Insert evidence and capture the persisted ids so a SOURCED reaction can
      // point reaction_evidence_id at the exact row its number was lifted from.
      // PostgREST preserves input order on return, so the ids line up 1:1.
      let evidenceLite: EvidenceLite[] = [];
      if (evidence.length) {
        const { data: insertedEvidence, error: evErr } = await admin
          .from("decision_evidence")
          .insert(
            evidence.map((e) => ({
              claim_id: row.id,
              user_id: userId,
              source_url: e.source_url,
              source_type: e.retriever,
              source_title: e.source_title,
              excerpt: e.excerpt,
              stance: e.stance,
              retriever: e.retriever,
              relevance_score: e.relevance_score,
              reliability_tier: tierForEvidence(e),
            })),
          )
          .select("id, excerpt");
        // Surface insert failures instead of swallowing them: a single bad row
        // (e.g. a retriever value outside the CHECK constraint) rejects the whole
        // batch, which previously dropped a claim's evidence silently.
        if (evErr) log.error("evidence insert failed", { claimId: row.id, error: evErr.message });
        evidenceLite = (insertedEvidence ?? evidence.map((e) => ({ id: null, excerpt: e.excerpt }))).map(
          (e: { id?: string | null; excerpt?: string | null }) => ({ id: e.id ?? null, excerpt: e.excerpt ?? null }),
        );
      }

      await admin
        .from("decision_claims")
        .update({
          verdict: verdict.verdict,
          confidence: verdict.confidence,
          rationale: verdict.rationale,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      return { claimId: row.id, claim, verdict, evidenceLite };
    });

    const verifiedForJudging = verified.map((v) => ({ claim: v.claim, verdict: v.verdict as ClaimVerdict }));

    // --- Stage 3: cross-examine (Edge Pro only) ----------------------------
    let adversarial: AdversarialInput | undefined;
    let adversarialBreakpointIndex = -1;
    if (isPro) {
      await admin.from("decision_cases").update({ stage: "cross_examining", updated_at: new Date().toISOString() }).eq("id", caseId);
      try {
        const xex = await crossExamine(effectiveStatement, ctx, verifiedForJudging);
        adversarial = {
          refutation: xex.adversarial?.refutation ?? null,
          panelRisks: xex.panel.map((p) => `${p.model}: ${p.key_risk}`).filter((s) => s.length > 6),
          disagreement: xex.disagreement,
        };
        adversarialBreakpointIndex = xex.adversarial?.breakpoint_claim_index ?? -1;
        if (xex.disagreement && xex.disagreementNote) {
          await admin.from("decision_tensions").insert({
            decision_case_id: caseId,
            user_id: userId,
            kind: "model_disagreement",
            description: xex.disagreementNote,
            severity: "medium",
          });
        }
      } catch (e) {
        log.warn("cross-examine failed, continuing without it", { userId, error: e });
      }
    }

    await admin.from("decision_cases").update({ stage: "advising", updated_at: new Date().toISOString() }).eq("id", caseId);

    // --- Stage 4: advise ----------------------------------------------------
    const tensionDescriptions = decomposed.profile_tensions.map((t) => t.description);
    const adviseResult = await advise(effectiveStatement, ctx, verifiedForJudging, tensionDescriptions, adversarial);

    const breakpointIndex =
      adviseResult.breakpoint_claim_index >= 0 ? adviseResult.breakpoint_claim_index : adversarialBreakpointIndex;
    const breakpointId =
      breakpointIndex >= 0 && breakpointIndex < verified.length ? verified[breakpointIndex].claimId : null;

    await admin
      .from("decision_cases")
      .update({
        recommendation: adviseResult.recommendation,
        counter_case: adviseResult.counter_case,
        breakpoint_assumption_id: breakpointId,
        validate_next: adviseResult.validate_next,
        confidence: adviseResult.confidence,
        stage: "complete",
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    await admin.from("decision_events").insert({
      decision_case_id: caseId,
      user_id: userId,
      type: "created",
      payload: {
        claim_count: claims.length,
        confidence: adviseResult.confidence,
        validate_next: adviseResult.validate_next,
        duration_ms: Date.now() - started,
      },
    });

    log.info("decision pipeline complete", { userId, duration_ms: Date.now() - started, claim_count: claims.length });

    // --- Stage 5: hero reaction numbers (decoupled, own wall-clock) ---------
    // Dispatch the reaction LLM pass to a SEPARATE decision-reactions invocation so
    // it runs in its own time budget instead of racing this pipeline's wall-clock
    // after the heavy retrieval (which was starving the inline pass). Fully fenced:
    // any failure here NEVER touches the verdicts. The honesty gate still lives in
    // proposeReaction -> gateReaction inside that function; a null reaction leaves
    // the claim words-led (the correct, honest default).
    try {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const baseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      if (serviceKey && baseUrl) {
        await fetch(`${baseUrl}/functions/v1/decision-reactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ case_id: caseId }),
        });
      }
    } catch (re) {
      log.warn("reaction dispatch failed, claims remain words-led", { userId, error: re });
    }
  } catch (e) {
    log.error("decision pipeline failed", { userId, error: e });
    await admin
      .from("decision_cases")
      .update({
        stage: "error",
        error_detail: e instanceof Error ? e.message.slice(0, 400) : "unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);
  }
}
