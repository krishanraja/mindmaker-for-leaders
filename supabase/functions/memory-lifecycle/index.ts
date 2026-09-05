import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasExactServiceCredential } from "../_shared/service-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const corsJson = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Dual-mode auth: service-role { user_id } sweep mode OR user-JWT getUser() mode.
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRole = hasExactServiceCredential(authHeader, [serviceRoleKey]);

    let userId: string;
    let supabase;

    if (isServiceRole) {
      let bodyUserId: string | null = null;
      try { const b = await req.json(); if (b && typeof b.user_id === "string") bodyUserId = b.user_id; } catch { /* ignore */ }
      if (!bodyUserId) return corsJson({ error: "service-role call requires user_id" }, 400);
      userId = bodyUserId;
      supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
    } else {
      supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return corsJson({ error: "Unauthorized" }, 401);
      userId = user.id;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    let promoted = 0;
    let demoted = 0;
    let archived = 0;
    const superseded = 0;

    // 1. Promote to hot: warm facts referenced 3+ times in last 7 days
    const { data: promoteTargets } = await supabase
      .from("user_memory")
      .select("id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null)
      .eq("temperature", "warm")
      .gte("reference_count", 3)
      .gte("last_referenced_at", sevenDaysAgo);

    if (promoteTargets?.length) {
      const ids = promoteTargets.map((f: { id: string }) => f.id);
      await supabase
        .from("user_memory")
        .update({ temperature: "hot" })
        .in("id", ids);
      promoted = ids.length;
    }

    // 1b. Promote to hot: high-importance facts (the leader's core identity / bets) stay
    // hot even without references - critical while the touch/reference loop is sparse, so
    // the most load-bearing facts are always in context. (CTRL Brain delta 4.)
    const { data: importantTargets } = await supabase
      .from("user_memory")
      .select("id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null)
      .in("temperature", ["warm", "cold"])
      .gte("importance", 8);

    if (importantTargets?.length) {
      const ids = importantTargets.map((f: { id: string }) => f.id);
      await supabase
        .from("user_memory")
        .update({ temperature: "hot" })
        .in("id", ids);
      promoted += ids.length;
    }

    // 2. Demote hot -> warm: not referenced in 14 days. High-importance facts are
    // exempt (sticky hot) so they are never demoted purely for lack of recent touches.
    const { data: demoteHotTargets } = await supabase
      .from("user_memory")
      .select("id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null)
      .eq("temperature", "hot")
      .lt("last_referenced_at", fourteenDaysAgo)
      .or("importance.lt.8,importance.is.null");

    if (demoteHotTargets?.length) {
      const ids = demoteHotTargets.map((f: { id: string }) => f.id);
      await supabase
        .from("user_memory")
        .update({ temperature: "warm" })
        .in("id", ids);
      demoted += ids.length;
    }

    // 3. Demote warm -> cold: not referenced in 30 days
    const { data: demoteWarmTargets } = await supabase
      .from("user_memory")
      .select("id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null)
      .eq("temperature", "warm")
      .lt("last_referenced_at", thirtyDaysAgo)
      .or("importance.lt.8,importance.is.null");

    if (demoteWarmTargets?.length) {
      const ids = demoteWarmTargets.map((f: { id: string }) => f.id);
      await supabase
        .from("user_memory")
        .update({ temperature: "cold" })
        .in("id", ids);
      demoted += ids.length;
    }

    // 4. Archive: cold facts not referenced in 90 days
    const { data: archiveTargets } = await supabase
      .from("user_memory")
      .select("id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null)
      .eq("temperature", "cold")
      .lt("last_referenced_at", ninetyDaysAgo);

    if (archiveTargets?.length) {
      const ids = archiveTargets.map((f: { id: string }) => f.id);
      await supabase
        .from("user_memory")
        .update({ archived_at: now.toISOString() })
        .in("id", ids);
      archived = ids.length;
    }

    // 5. Recalculate budget
    const { data: hotFacts } = await supabase
      .from("user_memory")
      .select("fact_value")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null)
      .eq("temperature", "hot");

    const { data: warmFacts } = await supabase
      .from("user_memory")
      .select("fact_value")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null)
      .eq("temperature", "warm");

    const { data: allFacts } = await supabase
      .from("user_memory")
      .select("id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null);

    const hotTokens = (hotFacts || []).reduce((acc: number, f: { fact_value?: string | null }) => acc + Math.ceil((f.fact_value?.length || 0) / 4), 0);
    const warmTokens = (warmFacts || []).reduce((acc: number, f: { fact_value?: string | null }) => acc + Math.ceil((f.fact_value?.length || 0) / 4), 0);

    // Upsert budget
    await supabase
      .from("user_memory_budget")
      .upsert({
        user_id: userId,
        hot_token_count: hotTokens,
        warm_token_count: warmTokens,
        total_facts: (allFacts || []).length,
        last_cleanup_at: now.toISOString(),
      }, { onConflict: "user_id" });

    // 6. If hot budget exceeded, force-demote lowest-reference hot facts
    const budgetResult = await supabase
      .from("user_memory_budget")
      .select("hot_max_tokens")
      .eq("user_id", userId)
      .single();

    const hotMax = budgetResult.data?.hot_max_tokens || 4000;
    if (hotTokens > hotMax) {
      const { data: lowestHot } = await supabase
        .from("user_memory")
        .select("id")
        .eq("user_id", userId)
        .eq("is_current", true)
        .is("archived_at", null)
        .eq("temperature", "hot")
        .order("reference_count", { ascending: true })
        .limit(5);

      if (lowestHot?.length) {
        await supabase
          .from("user_memory")
          .update({ temperature: "warm" })
          .in("id", lowestHot.map((f: { id: string }) => f.id));
        demoted += lowestHot.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        promoted,
        demoted,
        archived,
        superseded,
        budget: { hot_tokens: hotTokens, warm_tokens: warmTokens },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
