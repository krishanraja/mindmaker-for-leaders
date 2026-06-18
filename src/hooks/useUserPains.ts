import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SkillSeed } from "@/types/skill";

/**
 * useUserPains
 *
 * Pulls the leader's recent unresolved "pains" so any surface that lets them
 * automate one (Edge view card, SkillCaptureSheet picker) can render the same
 * chip list. A pain is one of:
 *   - a user_memory fact with fact_category='blocker'
 *   - an active row in user_decisions
 *
 * Filtered to automatable items only by default. The Automator surface is for
 * bounded weekly procedures, not strategic-level work - surfacing "Retention
 * Challenge" or "Board alignment" as a skill seed produces low-quality skills
 * and confuses the user. Pass `includeAll: true` to bypass for the legacy
 * pickers that want every pain.
 *
 * Returned as a flat SkillSeed[] so callers just hand it straight to the
 * skill builder's route state. Quiet on errors - this is auxiliary surface
 * and should never block the page rendering.
 */

const AUTOMATABLE_RE =
  /\b(every|each|weekly|monthly|always|recurring|whenever|after every|after each|i have to|i need to|i keep|drafting|writing|sending|preparing|reviewing|updating|reporting)\b/i;

const STRATEGIC_RE =
  /\b(retention|hiring|culture|strategy|vision|fundraising|board dynamics|moral|team morale|burnout|alignment|positioning|mission|north star|pricing strategy)\b/i;

function isAutomatable(text: string): boolean {
  if (!text) return false;
  if (STRATEGIC_RE.test(text)) return false;
  return AUTOMATABLE_RE.test(text);
}

export interface UseUserPainsOptions {
  limit?: number;
  includeAll?: boolean;
}

export function useUserPains(options: UseUserPainsOptions | number = {}) {
  const { limit, includeAll } = normaliseOptions(options);
  const [pains, setPains] = useState<SkillSeed[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPains = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPains([]);
        return;
      }

      // Over-fetch (3x the requested cap) so the filter can shed strategic
      // items and still hit the limit when the user has a healthy mix.
      const fetchLimit = includeAll ? limit : Math.max(limit * 3, 15);

      const [blockersResult, decisionsResult] = await Promise.all([
        supabase
          .from("user_memory")
          .select("id, fact_value, fact_label, verification_status, created_at")
          .eq("user_id", user.id)
          .eq("fact_category", "blocker")
          .eq("is_current", true)
          .neq("verification_status", "rejected")
          .order("created_at", { ascending: false })
          .limit(fetchLimit),
        supabase
          .from("user_decisions")
          .select("id, decision_text, created_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(fetchLimit),
      ]);

      const blockerSeeds: SkillSeed[] = (blockersResult.data ?? [])
        .filter((b) => includeAll || isAutomatable(`${b.fact_label ?? ""} ${b.fact_value ?? ""}`))
        .map((b) => ({
          kind: "blocker",
          text: b.fact_value,
          fact_id: b.id,
          label: b.fact_label || truncate(b.fact_value, 36),
        }));

      const decisionSeeds: SkillSeed[] = (decisionsResult.data ?? [])
        .filter((d) => includeAll || isAutomatable(d.decision_text))
        .map((d) => ({
          kind: "decision",
          text: d.decision_text,
          decision_id: d.id,
          label: truncate(d.decision_text, 36),
        }));

      // Interleave blockers + decisions so neither dominates when both exist.
      const merged: SkillSeed[] = [];
      const maxLen = Math.max(blockerSeeds.length, decisionSeeds.length);
      for (let i = 0; i < maxLen; i++) {
        if (blockerSeeds[i]) merged.push(blockerSeeds[i]);
        if (decisionSeeds[i]) merged.push(decisionSeeds[i]);
      }

      setPains(merged.slice(0, limit));
    } catch (err) {
      console.warn("useUserPains: fetch failed", err);
      setPains([]);
    } finally {
      setLoading(false);
    }
  }, [limit, includeAll]);

  useEffect(() => {
    fetchPains();
  }, [fetchPains]);

  return { pains, loading, refetch: fetchPains };
}

function normaliseOptions(input: UseUserPainsOptions | number): {
  limit: number;
  includeAll: boolean;
} {
  if (typeof input === "number") {
    return { limit: input, includeAll: false };
  }
  return { limit: input.limit ?? 5, includeAll: input.includeAll ?? false };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "...";
}
