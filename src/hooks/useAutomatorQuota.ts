import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTier } from "./useTier";

/**
 * useAutomatorQuota
 *
 * Reads the leader's monthly Automator skill quota from automator_usage.
 * Free tier: 1 export per calendar month (UTC). Edge Pro: unlimited (returns
 * Infinity for `limit`, true for `canExport`, no DB read).
 *
 * Used by the Automator UI (AutomatePainCard, AutomatorFlow) so the chrome
 * shows the right state - "1 free Automator skill this month" -> button to
 * use it -> upgrade card once used. The edge function enforces the same cap
 * server-side; this hook is a UI affordance, not the source of truth.
 */

export const FREE_MONTHLY_AUTOMATOR_EXPORTS = 1;

export interface UseAutomatorQuotaResult {
  used: number;
  limit: number;
  remaining: number;
  canExport: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useAutomatorQuota(): UseAutomatorQuotaResult {
  const { tier, loading: tierLoading } = useTier();
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (tier === "edge_pro") {
      setUsed(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUsed(0);
        return;
      }
      const monthKey = new Date().toISOString().slice(0, 7);
      const { data, error } = await supabase
        .from("automator_usage")
        .select("exports_used")
        .eq("user_id", user.id)
        .eq("month", monthKey)
        .maybeSingle();
      if (error) {
        console.warn("useAutomatorQuota: fetch failed", error);
        setUsed(0);
        return;
      }
      setUsed(((data?.exports_used as number) ?? 0) | 0);
    } catch (err) {
      console.warn("useAutomatorQuota: threw", err);
      setUsed(0);
    } finally {
      setLoading(false);
    }
  }, [tier]);

  useEffect(() => {
    if (!tierLoading) void fetchUsage();
  }, [fetchUsage, tierLoading]);

  if (tier === "edge_pro") {
    return {
      used: 0,
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      canExport: true,
      loading: tierLoading,
      refetch: fetchUsage,
    };
  }

  const limit = FREE_MONTHLY_AUTOMATOR_EXPORTS;
  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    canExport: remaining > 0,
    loading: loading || tierLoading,
    refetch: fetchUsage,
  };
}
