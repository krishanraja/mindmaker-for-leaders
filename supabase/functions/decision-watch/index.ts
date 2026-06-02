// decision-watch: the WATCH loop. Re-verifies the load-bearing, web-checkable
// claims behind active decisions on a schedule. When a verdict flips or
// confidence drops materially, it raises a decision_alert (idempotent) which the
// Daily Briefing then surfaces. This is what makes a decision a living object
// instead of a one-shot answer.
//
// Invoked by pg_cron via net.http_post with a service_role bearer (same pattern
// as the existing google-sheets-sync cron). Processes a small capped batch per
// run so each invocation stays well inside the edge runtime budget; hourly runs
// drain the backlog.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { verifyClaim } from "../decision-engine/verify.ts";
import type { ClaimType } from "../decision-engine/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CASES = 2; // cases per run
const MAX_CLAIMS = 6; // hard cap on re-verifications per run (edge budget)
const STALE_HOURS = 24;

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const log = createLogger("decision-watch");
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (roleFromJwt(bearer) !== "service_role") return json({ error: "Forbidden" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const staleBefore = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();
    const { data: cases } = await admin
      .from("decision_cases")
      .select("id, user_id, title")
      .eq("status", "active")
      .eq("stage", "complete")
      .or(`last_verified_at.is.null,last_verified_at.lt.${staleBefore}`)
      .order("last_verified_at", { ascending: true, nullsFirst: true })
      .limit(MAX_CASES);

    let claimsChecked = 0;
    let alertsCreated = 0;

    for (const c of cases ?? []) {
      if (claimsChecked >= MAX_CLAIMS) break;

      const { data: claims } = await admin
        .from("decision_claims")
        .select("id, text, type, verdict, confidence, is_load_bearing")
        .eq("decision_case_id", c.id)
        .eq("is_load_bearing", true)
        .in("type", ["factual", "market", "causal"])
        .limit(MAX_CLAIMS - claimsChecked);

      for (const claim of claims ?? []) {
        if (claimsChecked >= MAX_CLAIMS) break;
        claimsChecked++;

        const before = { verdict: claim.verdict as string, confidence: claim.confidence as number | null };
        const { verdict } = await verifyClaim({ text: claim.text, type: claim.type as ClaimType, is_load_bearing: true });

        // Update the claim to the fresh verdict.
        await admin
          .from("decision_claims")
          .update({ verdict: verdict.verdict, confidence: verdict.confidence, rationale: verdict.rationale, updated_at: new Date().toISOString() })
          .eq("id", claim.id);

        // Alert-worthy change?
        const wasSolid = before.verdict === "supported";
        const nowWeak = verdict.verdict === "contested" || verdict.verdict === "unverified";
        const confDropped = before.confidence != null && before.confidence >= 0.6 && verdict.confidence != null && verdict.confidence < 0.4;
        if (!((wasSolid && nowWeak) || confDropped)) continue;

        const kind = wasSolid && verdict.verdict === "contested" ? "assumption_broke" : "evidence_shifted";

        // Idempotency: skip if an open alert already exists for this claim+kind.
        const { data: existing } = await admin
          .from("decision_alerts")
          .select("id")
          .eq("claim_id", claim.id)
          .eq("kind", kind)
          .eq("status", "open")
          .limit(1);
        if (existing && existing.length) continue;

        const headline = `An assumption behind "${c.title ?? "your decision"}" just weakened`;
        const detail = `"${claim.text}" was ${before.verdict}, now ${verdict.verdict}. ${verdict.rationale}`;

        await admin.from("decision_alerts").insert({
          decision_case_id: c.id,
          user_id: c.user_id,
          claim_id: claim.id,
          kind,
          headline,
          detail: detail.slice(0, 600),
          status: "open",
        });
        await admin.from("decision_events").insert({
          decision_case_id: c.id,
          user_id: c.user_id,
          type: "assumption_broke",
          payload: { claim_id: claim.id, from: before, to: { verdict: verdict.verdict, confidence: verdict.confidence } },
        });
        alertsCreated++;
      }

      await admin.from("decision_cases").update({ last_verified_at: new Date().toISOString() }).eq("id", c.id);
    }

    log.info("watch run complete", { cases: cases?.length ?? 0, claimsChecked, alertsCreated });
    return json({ cases: cases?.length ?? 0, claims_checked: claimsChecked, alerts_created: alertsCreated });
  } catch (e) {
    log.error("watch run failed", { error: e });
    return json({ error: e instanceof Error ? e.message : "watch failed" }, 500);
  }
});
