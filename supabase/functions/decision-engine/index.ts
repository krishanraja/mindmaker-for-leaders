// decision-engine: orchestrator for the verification-looped Decision Engine.
//
// POST { statement: string, source?: "advisor"|"capture"|"voice" }
//   -> { case_id }  (202-style: returns immediately, pipeline runs in background)
//
// The synchronous pass (decompose -> verify -> advise) runs via
// EdgeRuntime.waitUntil so the response is instant and the frontend polls the
// decision_cases row + claims as each stage lands.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { getUserContext } from "../_shared/user-context.ts";
import { runPipeline } from "./pipeline.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPECTED_PROJECT_ID = "bkyuxvschuwngtcdhsyg";

// EdgeRuntime is a Supabase runtime global; declared for the type checker.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const log = createLogger("decision-engine");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl.includes(EXPECTED_PROJECT_ID)) throw new Error("Database configuration error (unexpected project).");

    // Auth via the caller's JWT.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const statement: string = (body.statement ?? "").toString().trim();
    const source: string = ["advisor", "capture", "voice", "fireflies"].includes(body.source) ? body.source : "advisor";
    if (statement.length < 8) return json({ error: "Provide a decision or business case to pressure-test (at least a sentence)." }, 400);
    if (statement.length > 4000) return json({ error: "Statement too long. Keep it under 4000 characters." }, 400);

    // Service-role client for background writes (survives the response, bypasses RLS,
    // always stamps user_id explicitly).
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Ground in the Memory Web.
    const ctx = await getUserContext(admin, userId);
    const { data: objFacts } = await admin
      .from("user_memory")
      .select("id")
      .eq("user_id", userId)
      .eq("fact_category", "objective")
      .eq("is_current", true)
      .limit(20);
    const objectiveFactIds = (objFacts ?? []).map((r: { id: string }) => r.id);

    // Create the living case row immediately.
    const { data: created, error: caseErr } = await admin
      .from("decision_cases")
      .insert({ user_id: userId, statement, source, status: "active", stage: "decomposing" })
      .select("id")
      .single();
    if (caseErr || !created) throw new Error(`case insert failed: ${caseErr?.message ?? "unknown"}`);

    const caseId = created.id as string;
    const pipeline = runPipeline(admin, { caseId, userId, statement, ctx, objectiveFactIds }, log.withContext({ caseId }));

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(pipeline);
    } else {
      // Local / fallback: await so the work still completes.
      await pipeline;
    }

    return json({ case_id: caseId, stage: "decomposing" }, 202);
  } catch (e) {
    log.error("decision-engine handler error", { error: e });
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
