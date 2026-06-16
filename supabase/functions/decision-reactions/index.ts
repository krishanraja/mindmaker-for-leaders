// decision-reactions: compute + store the honest hero magnitude (reaction number)
// for a decision case's claims, DECOUPLED from the main decision-engine pipeline so
// the reaction LLM pass runs in its own wall-clock budget instead of racing the
// pipeline's after the heavy web retrieval.
//
// POST { case_id }  ->  { case_id, claims, targets, updated }
//
// Service-role only (the pipeline self-call and any backfill present the service
// key; ordinary users never have it). The honesty gate lives in proposeReaction ->
// gateReaction: a number surfaces ONLY if sourced (verbatim in evidence) or an
// explicit modelled estimate; otherwise null and the claim stays words-led.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { proposeReaction } from "../decision-engine/reaction.ts";
import { hasNumericEvidence, type EvidenceLite } from "../_shared/reaction-extraction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const log = createLogger("decision-reactions");
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) return json({ error: "Database configuration error." }, 500);

  // Service-role only.
  const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!serviceKey || auth !== serviceKey) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const caseId: string = (body.case_id ?? "").toString();
  if (!caseId) return json({ error: "case_id required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const { data: claims, error: cErr } = await admin
      .from("decision_claims")
      .select("id, text, is_load_bearing")
      .eq("decision_case_id", caseId);
    if (cErr) throw cErr;
    if (!claims?.length) return json({ case_id: caseId, claims: 0, targets: 0, updated: 0 });

    let targets = 0;
    let updated = 0;
    for (const c of claims) {
      const { data: ev } = await admin
        .from("decision_evidence")
        .select("id, excerpt")
        .eq("claim_id", c.id);
      const evidenceLite: EvidenceLite[] = (ev ?? []).map((e) => ({ id: e.id, excerpt: e.excerpt }));
      if (!evidenceLite.length) continue;
      // Only worth proposing where there is something honest to source from.
      if (!(c.is_load_bearing || hasNumericEvidence(evidenceLite))) continue;
      targets++;
      try {
        const reaction = await proposeReaction(c.text, evidenceLite);
        if (!reaction) continue; // gate returned null -> hero stays words-led (honest)
        await admin
          .from("decision_claims")
          .update({
            reaction_value: reaction.value,
            reaction_descriptor: reaction.descriptor,
            reaction_kind: reaction.kind,
            reaction_evidence_id: reaction.evidence_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", c.id);
        updated++;
      } catch (re) {
        log.warn("reaction failed for claim, leaving words-led", { claimId: c.id, error: String(re) });
      }
    }
    log.info("reactions computed", { caseId, claims: claims.length, targets, updated });
    return json({ case_id: caseId, claims: claims.length, targets, updated });
  } catch (e) {
    log.error("decision-reactions failed", { caseId, error: String(e) });
    return json({ error: String(e) }, 500);
  }
});
