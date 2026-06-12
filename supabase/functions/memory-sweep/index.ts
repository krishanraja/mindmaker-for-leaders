// memory-sweep: the nightly memory-learning orchestrator. Iterates a capped batch of
// active users (most-stale-synthesis first) and, in order, runs memory-lifecycle (free,
// always) then memory-synthesize (paid, gated on a touch-immune content-change signal).
// This is what finally schedules the two dormant engines.
//
// Invoked by pg_cron via net.http_post with a service_role bearer (same pattern as
// decision-watch / send-daily-briefing). Cron-only: rejects anything that is not a
// service_role bearer with 403. Per-user work is wrapped in try/catch so one user's
// failure never aborts the sweep.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIFECYCLE_MAX = 25; // hard cap on lifecycle POSTs per run (edge budget)
const SYNTH_MAX = 15; // hard cap on paid synthesize POSTs per run

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

interface SweepRow {
  user_id: string;
  last_fact_change: string | null;
  last_synth: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const log = createLogger("memory-sweep");
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const sweepSecret = Deno.env.get("MEMORY_SWEEP_SECRET") ?? "";
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const okCaller = (!!bearer && ((!!sweepSecret && bearer === sweepSecret) || (!!svcKey && bearer === svcKey))) || roleFromJwt(bearer) === "service_role";
  if (!okCaller) return json({ error: "Forbidden" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Internal POST bearer = the service-role key (itself a signed JWT whose payload
  // role === "service_role", so each engine's roleFromJwt takes sweep mode).
  const post = (fn: string, userId: string) =>
    fetch(`${supabaseUrl}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

  try {
    const { data: batch, error: batchError } = await admin.rpc("get_memory_sweep_batch", { p_limit: 25 });
    if (batchError) {
      log.error("batch query failed", { error: batchError });
      return json({ error: batchError.message }, 500);
    }

    const rows = (batch ?? []) as SweepRow[];

    let usersProcessed = 0;
    let lifecycleOk = 0;
    let synthOk = 0;
    let synthSkipped = 0;
    let errors = 0;
    let lifecycleCount = 0;
    let synthCount = 0;

    for (const row of rows) {
      const userId = row.user_id;
      try {
        usersProcessed++;

        // (a) Lifecycle - free, always (until the per-run cap is hit).
        if (lifecycleCount < LIFECYCLE_MAX) {
          lifecycleCount++;
          const lcRes = await post("memory-lifecycle", userId);
          if (lcRes.ok) {
            lifecycleOk++;
          } else {
            errors++;
            log.warn("lifecycle failed", { userId, status: lcRes.status });
          }
          await lcRes.text().catch(() => {});
        }

        // (b) Gate synthesize on the touch-immune content-change signal.
        const lastSynth = row.last_synth ? Date.parse(row.last_synth) : null;
        const lastFactChange = row.last_fact_change ? Date.parse(row.last_fact_change) : null;
        const synthDue = lastSynth === null ||
          (lastFactChange !== null && lastFactChange > lastSynth);

        if (synthDue && synthCount < SYNTH_MAX) {
          synthCount++;
          const synthRes = await post("memory-synthesize", userId);
          let synthBody: { success?: boolean; skipped?: string } = {};
          try { synthBody = await synthRes.json(); } catch { /* ignore */ }

          if (synthRes.ok && synthBody.success === true && synthBody.skipped !== "openai_quota") {
            // (c) Real synth success (incl. sub-threshold no-op) - stamp the watermark.
            synthOk++;
            const { error: stampError } = await admin
              .from("user_memory_budget")
              .update({ last_synthesized_at: new Date().toISOString() })
              .eq("user_id", userId);
            if (stampError) log.warn("watermark stamp failed", { userId, error: stampError });
          } else if (synthBody.skipped === "openai_quota") {
            // Quota-skip: do NOT stamp; this user retries next night.
            synthSkipped++;
            log.info("synth skipped (openai quota)", { userId });
          } else {
            synthSkipped++;
            errors++;
            log.warn("synth failed", { userId, status: synthRes.status });
          }
        } else if (synthDue) {
          // Due but the per-run synth cap is exhausted; drains next night.
          synthSkipped++;
        }
      } catch (e) {
        errors++;
        log.warn("user sweep failed", { userId, error: e });
      }
    }

    const summary = {
      users_processed: usersProcessed,
      lifecycle_ok: lifecycleOk,
      synth_ok: synthOk,
      synth_skipped: synthSkipped,
      errors,
    };
    log.info("sweep complete", summary);
    return json(summary);
  } catch (e) {
    log.error("sweep failed", { error: e });
    return json({ error: e instanceof Error ? e.message : "sweep failed" }, 500);
  }
});
