/**
 * briefing-diagnose Edge Function
 *
 * Answers "why did this user get these headlines?" in one call. Reproduces the
 * exact profile + lens the v2 generator would build, surfaces the last
 * briefing for side-by-side comparison, and summarises recent feedback stats.
 *
 * Auth: the authenticated user may only diagnose themselves. Service-role
 * access is not exposed here - if admin diagnosis is needed later, add a
 * separate endpoint guarded by a role check.
 *
 * Read-only: no writes of any kind. Safe to call on demand.
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserContext, loadLensSource, resolveLeaderIds } from "../_shared/user-context.ts";
import { buildImportanceLens, planQueries, type LensItem, type PlannedQuery } from "../_shared/briefing-lens.ts";
import { loadTrainingForUser } from "../_shared/training-loader.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DiagnoseFeedback {
  window_days: number;
  useful_count: number;
  not_useful_count: number;
  top_useful_lens_items: Array<{ lens_item_id: string; count: number }>;
  top_not_useful_lens_items: Array<{ lens_item_id: string; count: number }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Optional query params.
    const url = new URL(req.url);
    const briefingType = url.searchParams.get("briefing_type") || "default";
    const feedbackWindowDays = Math.min(60, Math.max(1, Number(url.searchParams.get("feedback_window_days")) || 14));

    // 1. Profile + lens source.
    // read-only diagnostic: do NOT touch reference_count
    const userCtx = await getUserContext(supabase, user.id);
    const lensSource = await loadLensSource(supabase, user.id, userCtx);

    // Pull mission + decision IDs with the full shape so the caller can
    // trace lens ref_ids back to rows.
    const diagLeaderIds = await resolveLeaderIds(supabase, user.id);
    const diagLeaderFilter = diagLeaderIds.length ? diagLeaderIds : ["00000000-0000-0000-0000-000000000000"];
    const [{ data: missions }, { data: decisions }] = await Promise.all([
      supabase.from("leader_missions").select("id").in("leader_id", diagLeaderFilter).eq("status", "active").limit(3),
      supabase.from("user_decisions").select("id, decision_text").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(5),
    ]);

    // 2. Build the lens (same code path as generation). Now returns items +
    //    user-declared excludes.
    let lens: LensItem[] = [];
    let excludes: string[] = [];
    let queries: PlannedQuery[] = [];
    const training = await loadTrainingForUser(supabase, user.id).catch(() => undefined);
    try {
      const result = await buildImportanceLens(supabase, openaiKey, lensSource, briefingType);
      lens = result.items;
      excludes = result.excludes;
    } catch (e) {
      console.warn("diagnose: lens build failed:", e instanceof Error ? e.message : e);
    }
    try {
      if (lens.length > 0) {
        queries = await planQueries(openaiKey, lens, training, briefingType, undefined);
      }
    } catch (e) {
      console.warn("diagnose: query plan failed:", e instanceof Error ? e.message : e);
    }

    // 2b. Pull the user's declared interests for side-by-side visibility.
    const { data: interestsRaw } = await supabase
      .from("briefing_interests")
      .select("id, kind, text, weight, source, is_active, created_at")
      .eq("user_id", user.id)
      .order("kind", { ascending: true })
      .order("created_at", { ascending: true });
    const interests = interestsRaw ?? [];

    // 3. Last briefing for this user (any type - lets the caller see both
    //    default and custom briefings and compare against the lens).
    const { data: lastBriefing } = await supabase
      .from("briefings")
      .select("id, briefing_date, briefing_type, schema_version, segments, audio_url, context_snapshot")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Recent feedback summary.
    const windowStart = new Date(Date.now() - feedbackWindowDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: feedbackRows } = await supabase
      .from("briefing_feedback")
      .select("reaction, lens_item_id, briefing_id")
      .gte("created_at", windowStart);

    const feedback: DiagnoseFeedback = {
      window_days: feedbackWindowDays,
      useful_count: 0,
      not_useful_count: 0,
      top_useful_lens_items: [],
      top_not_useful_lens_items: [],
    };

    if (feedbackRows) {
      // Restrict to this user's briefings only.
      const briefingIds = [...new Set(feedbackRows.map((r: { briefing_id: string }) => r.briefing_id))];
      let ownBriefingIds = new Set<string>();
      if (briefingIds.length > 0) {
        const { data: owned } = await supabase
          .from("briefings")
          .select("id")
          .eq("user_id", user.id)
          .in("id", briefingIds);
        ownBriefingIds = new Set(((owned as Array<{ id: string }> | null) ?? []).map((b) => b.id));
      }

      const usefulByLens: Record<string, number> = {};
      const notUsefulByLens: Record<string, number> = {};

      for (const row of feedbackRows as Array<{ reaction: string; lens_item_id: string | null; briefing_id: string }>) {
        if (!ownBriefingIds.has(row.briefing_id)) continue;
        if (row.reaction === "useful") {
          feedback.useful_count++;
          if (row.lens_item_id) usefulByLens[row.lens_item_id] = (usefulByLens[row.lens_item_id] || 0) + 1;
        } else if (row.reaction === "not_useful") {
          feedback.not_useful_count++;
          if (row.lens_item_id) notUsefulByLens[row.lens_item_id] = (notUsefulByLens[row.lens_item_id] || 0) + 1;
        }
      }

      feedback.top_useful_lens_items = Object.entries(usefulByLens)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lens_item_id, count]) => ({ lens_item_id, count }));
      feedback.top_not_useful_lens_items = Object.entries(notUsefulByLens)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lens_item_id, count]) => ({ lens_item_id, count }));
    }

    const response = {
      user_id: user.id,
      briefing_type: briefingType,
      profile: {
        name: userCtx.name,
        role: userCtx.role,
        company: userCtx.company,
        industry: userCtx.industry,
        team_size: userCtx.teamSize,
        learning_style: userCtx.learningStyle,
        strengths: userCtx.strengths,
        weaknesses: userCtx.weaknesses,
        missions: ((missions as Array<{ id: string; title: string }> | null) ?? []),
        decisions: ((decisions as Array<{ id: string; decision_text: string }> | null) ?? []).map(
          (d) => ({ id: d.id, text: d.decision_text }),
        ),
        objectives: userCtx.objectives,
        blockers: userCtx.blockers,
        preferences: userCtx.preferences,
        watchlist: userCtx.watchingCompanies,
        patterns: userCtx.confirmedPatterns,
        feedback_preferences: userCtx.feedbackPreferences,
      },
      interests,
      lens,
      excludes,
      planned_queries: queries,
      last_briefing: lastBriefing ?? null,
      recent_feedback: feedback,
      training_material_version: training?.version ?? null,
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("briefing-diagnose error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
