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
 * Returned as a flat SkillSeed[] so callers just hand it straight to the
 * skill builder's route state. Quiet on errors - this is auxiliary surface
 * and should never block the page rendering.
 */
export function useUserPains(limit: number = 5) {
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

      const [blockersResult, decisionsResult] = await Promise.all([
        supabase
          .from("user_memory")
          .select("id, fact_value, fact_label, verification_status, created_at")
          .eq("user_id", user.id)
          .eq("fact_category", "blocker")
          .eq("is_current", true)
          .neq("verification_status", "rejected")
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("user_decisions")
          .select("id, decision_text, created_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);

      const blockerSeeds: SkillSeed[] = (blockersResult.data ?? []).map((b) => ({
        kind: "blocker",
        text: b.fact_value,
        fact_id: b.id,
        label: b.fact_label || truncate(b.fact_value, 36),
      }));

      const decisionSeeds: SkillSeed[] = (decisionsResult.data ?? []).map((d) => ({
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
  }, [limit]);

  useEffect(() => {
    fetchPains();
  }, [fetchPains]);

  return { pains, loading, refetch: fetchPains };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "...";
}
