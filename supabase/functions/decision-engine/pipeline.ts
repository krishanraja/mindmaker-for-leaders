// Orchestrates the synchronous pass: decompose -> verify -> advise.
// Writes rows as it progresses and advances decision_cases.stage so the
// frontend can render each stage as it lands (mirrors the briefing pattern).
// Runs with a service-role client so background writes survive the response.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Logger } from "../_shared/logger.ts";
import type { UserContext } from "../_shared/user-context.ts";
import { decompose } from "./decompose.ts";
import { verifyClaim } from "./verify.ts";
import { advise, type AdversarialInput } from "./advise.ts";
import { crossExamine } from "./crossexamine.ts";
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
    // --- Stage 1: decompose -------------------------------------------------
    const decomposed = await decompose(statement, ctx);

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

    // --- Stage 2: verify each claim ----------------------------------------
    const verified = await mapLimit(claims, 4, async (row) => {
      const claim: ExtractedClaim = { text: row.text, type: row.type, is_load_bearing: row.is_load_bearing };
      const { verdict, evidence } = await verifyClaim(claim);

      if (evidence.length) {
        await admin.from("decision_evidence").insert(
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
          })),
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

      return { claimId: row.id, claim, verdict };
    });

    const verifiedForJudging = verified.map((v) => ({ claim: v.claim, verdict: v.verdict as ClaimVerdict }));

    // --- Stage 3: cross-examine (Edge Pro only) ----------------------------
    let adversarial: AdversarialInput | undefined;
    let adversarialBreakpointIndex = -1;
    if (isPro) {
      await admin.from("decision_cases").update({ stage: "cross_examining", updated_at: new Date().toISOString() }).eq("id", caseId);
      try {
        const xex = await crossExamine(statement, ctx, verifiedForJudging);
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
    const adviseResult = await advise(statement, ctx, verifiedForJudging, tensionDescriptions, adversarial);

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
