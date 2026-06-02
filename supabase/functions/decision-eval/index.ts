// decision-eval: admin-only single-claim verifier for the calibration harness.
// Runs the real verifyClaim() on ONE claim per invocation (keeping each call
// well inside the edge runtime's CPU/wall budget). The eval script orchestrates
// the full set and computes accuracy + calibration. This measures the exact
// code path the live engine uses.
//
// Auth: requires a service_role JWT (gateway verifies the signature).
// Body: { claim_text: string, claim_type: "factual|market|causal|assumption|forecast" }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyClaim } from "../decision-engine/verify.ts";
import type { ClaimType } from "../decision-engine/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function roleFromJwt(bearer: string): string | null {
  try {
    let payload = bearer.split(".")[1];
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    return JSON.parse(atob(payload)).role ?? null;
  } catch (_e) {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (roleFromJwt(bearer) !== "service_role") return json({ error: "Forbidden" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    const claim_text: string = (body.claim_text ?? "").toString();
    const claim_type = body.claim_type as ClaimType;
    if (!claim_text || !claim_type) return json({ error: "claim_text and claim_type required" }, 400);

    const { verdict, evidence } = await verifyClaim({ text: claim_text, type: claim_type, is_load_bearing: false });
    return json({
      predicted: verdict.verdict,
      confidence: verdict.confidence,
      rationale: verdict.rationale,
      evidence_count: evidence.length,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "verify failed" }, 500);
  }
});
