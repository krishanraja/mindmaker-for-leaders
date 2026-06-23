/**
 * Shared user-context loader.
 *
 * The profile projection used by the briefing pipeline - pulled out of
 * generate-briefing/index.ts so the diagnostic function can reproduce the
 * exact inputs the generator saw, and so future briefing-adjacent tools
 * (kill-lens-item, feedback aggregator, etc.) don't have to re-implement
 * the same six-table load.
 *
 * Behaviour is 1:1 with the previous in-file implementation - any tweak
 * here affects both generation and diagnosis, which is the point.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { LensSource } from "./briefing-lens.ts";
import { createLogger } from "./logger.ts";

const log = createLogger("user-context");

/**
 * Resolve the leader record id(s) for an auth user. Some leader rows use
 * leaders.id == the auth uid, others use leaders.user_id, so check both.
 * Missions/scores/tensions all key off leader_id, not user_id, which is why
 * the old user_missions query (wrong table, wrong key) always came back empty.
 * Returns [] on any failure so callers degrade cleanly.
 */
export async function resolveLeaderIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("leaders")
      .select("id")
      .or(`id.eq.${userId},user_id.eq.${userId}`);
    return ((data as Array<{ id: string }> | null) ?? []).map((l) => l.id);
  } catch {
    return [];
  }
}

export interface UserContext {
  name: string;
  role: string;
  company: string;
  industry: string;
  teamSize: string;
  strengths: string[];
  weaknesses: string[];
  activeMissions: string[];
  recentDecisions: string[];
  confirmedPatterns: string[];
  watchingCompanies: string[];
  objectives: string[];
  blockers: string[];
  preferences: string[];
  learningStyle: string;
  feedbackPreferences: { preferredTags: string[]; preferredSources: string[] };
}

/**
 * Load the full user context projection used by generate-briefing.
 * Every sub-fetch is try/catch'd independently so one missing table
 * doesn't nuke the whole context.
 */
export async function getUserContext(
  supabase: SupabaseClient,
  userId: string,
  opts?: { collectTouchIds?: string[] },
): Promise<UserContext> {
  const ctx: UserContext = {
    name: "there",
    role: "executive",
    company: "",
    industry: "",
    teamSize: "",
    strengths: [],
    weaknesses: [],
    activeMissions: [],
    recentDecisions: [],
    confirmedPatterns: [],
    watchingCompanies: [],
    objectives: [],
    blockers: [],
    preferences: [],
    learningStyle: "",
    feedbackPreferences: { preferredTags: [], preferredSources: [] },
  };

  // Core identity + objectives + blockers + preferences from user_memory.
  try {
    const { data: facts } = await supabase
      .from("user_memory")
      .select("id, fact_key, fact_value, fact_category")
      .eq("user_id", userId)
      .eq("is_current", true)
      .in("fact_category", ["identity", "business", "objective", "blocker", "preference"])
      // Importance-first so the most load-bearing facts survive the budget cap (CTRL Brain
      // delta 4); confidence breaks ties. (Query-relevance/cosine has no consumer yet - there
      // is no query-time memory search - so the third signal is deferred to that feature.)
      .order("importance", { ascending: false, nullsFirst: false })
      .order("confidence_score", { ascending: false })
      .limit(40);

    if (facts) {
      for (const f of facts) {
        if (f.fact_key === "name" || f.fact_key === "first_name" || f.fact_key === "preferred_name") ctx.name = f.fact_value;
        if (f.fact_key === "role" || f.fact_key === "title" || f.fact_key === "job_title") ctx.role = f.fact_value;
        if (f.fact_key === "company_name" || f.fact_key === "company") ctx.company = f.fact_value;
        if (f.fact_key === "industry" || f.fact_key === "vertical") ctx.industry = f.fact_value;
        if (f.fact_key === "team_size") ctx.teamSize = f.fact_value;
        if (f.fact_category === "objective") ctx.objectives.push(f.fact_value);
        if (f.fact_category === "blocker") ctx.blockers.push(f.fact_value);
        if (f.fact_category === "preference") ctx.preferences.push(f.fact_value);
        if (opts?.collectTouchIds && f.id) opts.collectTouchIds.push(f.id);
      }
    }
  } catch (e) {
    log.warn("failed to fetch user memory", { error: e });
  }

  try {
    const { data: profile } = await supabase
      .from("edge_profiles")
      .select("strengths, weaknesses")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profile) {
      ctx.strengths = (profile.strengths || [])
        .slice(0, 3)
        .map((s: { label: string }) => s.label);
      ctx.weaknesses = (profile.weaknesses || [])
        .slice(0, 3)
        .map((w: { label: string }) => w.label);
    }
  } catch (e) {
    log.warn("failed to fetch edge profile", { error: e });
  }

  try {
    const leaderIds = await resolveLeaderIds(supabase, userId);
    if (leaderIds.length > 0) {
      const { data: missions } = await supabase
        .from("leader_missions")
        .select("mission_text")
        .in("leader_id", leaderIds)
        .eq("status", "active")
        .limit(3);

      if (missions) {
        ctx.activeMissions = (missions as Array<{ mission_text: string }>)
          .map((m) => m.mission_text)
          .filter(Boolean);
      }
    }
  } catch (e) {
    log.warn("failed to fetch missions", { error: e });
  }

  try {
    const { data: watchlist } = await supabase
      .from("user_memory")
      .select("id, fact_value")
      .eq("user_id", userId)
      .eq("fact_key", "watching_company")
      .eq("is_current", true);

    if (watchlist) {
      ctx.watchingCompanies = watchlist.map((w: { id: string; fact_value: string }) => {
        if (opts?.collectTouchIds && w.id) opts.collectTouchIds.push(w.id);
        return w.fact_value;
      });
    }
  } catch (e) {
    log.warn("failed to fetch watchlist", { error: e });
  }

  try {
    const { data: decisions } = await supabase
      .from("user_decisions")
      .select("decision_text")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5);

    if (decisions) {
      ctx.recentDecisions = decisions.map((d: { decision_text: string }) => d.decision_text);
    }
  } catch (e) {
    log.warn("failed to fetch decisions", { error: e });
  }

  try {
    const { data: patterns } = await supabase
      .from("user_patterns")
      .select("pattern_type, pattern_text")
      .eq("user_id", userId)
      .in("status", ["confirmed", "emerging"])
      .gte("confidence", 0.6)
      .order("confidence", { ascending: false })
      .limit(5);

    if (patterns) {
      ctx.confirmedPatterns = patterns.map(
        (p: { pattern_type: string; pattern_text: string }) => `[${p.pattern_type}] ${p.pattern_text}`,
      );
    }
  } catch (e) {
    log.warn("failed to fetch patterns", { error: e });
  }

  try {
    const { data: session } = await supabase
      .from("voice_sessions")
      .select("compass_tier")
      .eq("user_id", userId)
      .not("compass_tier", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session?.compass_tier) {
      ctx.learningStyle = session.compass_tier;
    }
  } catch (e) {
    log.warn("failed to fetch learning style", { error: e });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: feedback } = await supabase
      .from("briefing_feedback")
      .select("reaction, briefing_id")
      .gte("created_at", sevenDaysAgo)
      .eq("reaction", "useful");

    if (feedback && feedback.length > 0) {
      const briefingIds = [...new Set(feedback.map((f: { briefing_id: string }) => f.briefing_id))];
      const { data: briefings } = await supabase
        .from("briefings")
        .select("id, segments")
        .eq("user_id", userId)
        .in("id", briefingIds);

      if (briefings) {
        const tagCounts: Record<string, number> = {};
        const sourceCounts: Record<string, number> = {};
        for (const b of briefings) {
          const segments = b.segments as Array<{ framework_tag: string; source: string }>;
          if (!Array.isArray(segments)) continue;
          for (const seg of segments) {
            tagCounts[seg.framework_tag] = (tagCounts[seg.framework_tag] || 0) + 1;
            sourceCounts[seg.source] = (sourceCounts[seg.source] || 0) + 1;
          }
        }
        ctx.feedbackPreferences.preferredTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([tag]) => tag);
        ctx.feedbackPreferences.preferredSources = Object.entries(sourceCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([source]) => source);
      }
    }
  } catch (e) {
    log.warn("failed to fetch feedback preferences", { error: e });
  }

  return ctx;
}

/**
 * Build the LensSource projection used by buildImportanceLens.
 * Needs real mission/decision IDs so lens items reference real rows  - 
 * pass them in from the caller, which has them on hand from the same
 * generate-briefing query.
 */
export function toLensSource(
  userId: string,
  userCtx: UserContext,
  missionIds: string[],
  decisionIds: string[],
): LensSource {
  return {
    userId,
    name: userCtx.name,
    role: userCtx.role,
    company: userCtx.company,
    industry: userCtx.industry,
    objectives: userCtx.objectives.map((text) => ({ text })),
    blockers: userCtx.blockers.map((text) => ({ text })),
    missions: userCtx.activeMissions.map((title, i) => ({ id: missionIds[i] ?? `m_${i}`, title })),
    decisions: userCtx.recentDecisions.map((text, i) => ({ id: decisionIds[i] ?? `d_${i}`, text })),
    watchingCompanies: userCtx.watchingCompanies,
    patterns: userCtx.confirmedPatterns.map((text) => ({ type: "pattern", text, confidence: 0.8 })),
  };
}

/**
 * Convenience for callers who already have the full context and just need a
 * LensSource. Fetches the mission and decision IDs in parallel.
 */
export async function loadLensSource(
  supabase: SupabaseClient,
  userId: string,
  userCtx: UserContext,
): Promise<LensSource> {
  const leaderIds = await resolveLeaderIds(supabase, userId);
  const leaderFilter = leaderIds.length ? leaderIds : ["00000000-0000-0000-0000-000000000000"];
  const [{ data: missions }, { data: decisions }] = await Promise.all([
    supabase.from("leader_missions").select("id").in("leader_id", leaderFilter).eq("status", "active").limit(3),
    supabase.from("user_decisions").select("id, decision_text").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(5),
  ]);
  const missionIds = ((missions as Array<{ id: string }> | null) ?? []).map((m) => m.id);
  const decisionIds = ((decisions as Array<{ id: string }> | null) ?? []).map((d) => d.id);
  return toLensSource(userId, userCtx, missionIds, decisionIds);
}
