// enrich-decision: "Add what's missing" for a single decision claim.
//
// POST { claim_id }  ->  { added, verdict?, confidence? }
//
// Re-runs the engine's evidence retrieval for ONE claim (reuses verifyClaim ->
// gatherEvidence -> the adjudicator), inserts ONLY evidence rows we do not already
// hold (deduped by source_url against the claim's existing evidence), stamps each
// new row's reliability_tier honestly, and refreshes the claim verdict from the full
// (old + new) evidence set. Owner-scoped: the claim must belong to the caller.
//
// verify_jwt = true. The caller's JWT both authenticates and proves ownership: we
// resolve the claim through a user-scoped client (RLS returns it only if it is theirs).
// Service-role is used solely for the writes, which always re-assert user_id.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { verifyClaim } from "../decision-engine/verify.ts";
import { proposeReaction } from "../decision-engine/reaction.ts";
import { tierForEvidence } from "../decision-engine/reliability.ts";
import type { ClaimType, Evidence } from "../decision-engine/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("enrich-decision");
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) throw new Error("Database configuration error (unexpected project).");

    // Authenticate via the caller's JWT.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const claimId: string = (body.claim_id ?? "").toString().trim();
    if (!claimId) return json({ error: "claim_id required" }, 400);

    // Ownership: read the claim through the USER client so RLS returns it only if it is
    // the caller's. A miss => not theirs (or gone) => 404, never enrich someone else's.
    const { data: claim, error: claimErr } = await userClient
      .from("decision_claims")
      .select("id, decision_case_id, text, type, is_load_bearing")
      .eq("id", claimId)
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claim) return json({ error: "Claim not found" }, 404);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Existing evidence for the claim (for dedupe + the refreshed verdict's full set).
    const { data: existing } = await admin
      .from("decision_evidence")
      .select("id, source_url, excerpt")
      .eq("claim_id", claimId);
    const existingUrls = new Set(
      (existing ?? []).map((e) => (e.source_url ?? "").trim().toLowerCase()).filter(Boolean),
    );

    // Re-run retrieval + adjudication for this one claim. Assumption / forecast claims
    // are unverifiable by nature; verifyClaim returns no evidence for them (honest).
    const { verdict, evidence } = await verifyClaim({
      text: claim.text,
      type: claim.type as ClaimType,
      is_load_bearing: !!claim.is_load_bearing,
    });

    // Keep only genuinely new rows. Dedupe by source_url where present; for link-less
    // rows (e.g. the Perplexity synthesis) fall back to retriever+excerpt-head so the
    // same synthesis is not re-inserted on every enrich.
    const seenLinkless = new Set<string>();
    const fresh: Evidence[] = [];
    for (const e of evidence) {
      const url = (e.source_url ?? "").trim().toLowerCase();
      if (url) {
        if (existingUrls.has(url)) continue;
        existingUrls.add(url);
        fresh.push(e);
      } else {
        const k = `${e.retriever}:${(e.excerpt ?? "").slice(0, 60).toLowerCase()}`;
        const alreadyHeld = (existing ?? []).some(
          (x) => !x.source_url && (x.excerpt ?? "").slice(0, 60).toLowerCase() === (e.excerpt ?? "").slice(0, 60).toLowerCase(),
        );
        if (alreadyHeld || seenLinkless.has(k)) continue;
        seenLinkless.add(k);
        fresh.push(e);
      }
    }

    let added = 0;
    if (fresh.length) {
      const { error: insErr } = await admin.from("decision_evidence").insert(
        fresh.map((e) => ({
          claim_id: claimId,
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
      );
      if (insErr) throw insErr;
      added = fresh.length;
    }

    // Refresh the claim verdict only when this enrich actually adjudicated against
    // evidence (i.e. not an unverifiable assumption/forecast, where verifyClaim returns
    // no evidence and a fixed "unverifiable"/"unverified" verdict we must not overwrite
    // with false certainty). The verdict here is read off the full re-retrieved set.
    let refreshed: { verdict: string; confidence: number | null } | undefined;
    if (evidence.length > 0) {
      await admin
        .from("decision_claims")
        .update({
          verdict: verdict.verdict,
          confidence: verdict.confidence,
          rationale: verdict.rationale,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimId);
      refreshed = { verdict: verdict.verdict, confidence: verdict.confidence };

      // Re-distil the honest, gated hero magnitude from the now-fuller evidence set so
      // the stone/cockpit heroes stay in sync. Null => the hero leads with words (honest).
      try {
        const { data: ev } = await admin.from("decision_evidence").select("id, excerpt").eq("claim_id", claimId);
        const reaction = await proposeReaction(claim.text, (ev ?? []).map((e) => ({ id: e.id as string, excerpt: e.excerpt as string | null })));
        await admin
          .from("decision_claims")
          .update({
            reaction_value: reaction?.value ?? null,
            reaction_descriptor: reaction?.descriptor ?? null,
            reaction_kind: reaction?.kind ?? null,
            reaction_evidence_id: reaction?.evidence_id ?? null,
          })
          .eq("id", claimId);
      } catch (_re) {
        // never let reaction extraction break enrich; the verdict + evidence already landed
      }

      // Bump the case's last_verified_at so the WATCH loop's staleness clock resets.
      await admin
        .from("decision_cases")
        .update({ last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", claim.decision_case_id);
    }

    log.info("enrich complete", { claimId, added, verdict: refreshed?.verdict });
    return json({ added, verdict: refreshed?.verdict ?? null, confidence: refreshed?.confidence ?? null });
  } catch (e) {
    log.error("enrich-decision failed", { error: e });
    return json({ error: e instanceof Error ? e.message : "enrich failed" }, 500);
  }
});
