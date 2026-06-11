import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPreset } from "@/content/kits";
import type { KitPreset } from "@/content/kits";
import type { KitRedemptionRow } from "@/lib/kit";

// Kit tables are newer than the committed generated types; the row interface
// enforces the shape (same pattern as useGoals / useDecisionEngine).
const db = supabase as unknown as SupabaseClient;

export interface UseKitRedemption {
  /** Latest redemption for the current session user, or null. */
  redemption: KitRedemptionRow | null;
  /** Preset matching the redemption's class, resolved client-side. */
  preset: KitPreset | null;
  /** True until both auth and the redemption select have settled. */
  isLoading: boolean;
  isExpired: boolean;
  buildsRemaining: number;
  passEndsAt: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads the session user's latest kit redemption (RLS scopes the select to
 * their own rows) and derives the pass state the portal pages key off.
 */
export function useKitRedemption(): UseKitRedemption {
  const { isLoading: authLoading, hasSession } = useAuth();
  const [redemption, setRedemption] = useState<KitRedemptionRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!hasSession) {
      setRedemption(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await db
        .from("kit_redemptions")
        .select("*")
        .order("redeemed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRedemption((data as KitRedemptionRow | null) ?? null);
    } catch {
      setRedemption(null);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, hasSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const preset = redemption ? getPreset(redemption.class_slug) : null;
  const isExpired =
    !!redemption &&
    (redemption.status !== "active" ||
      (!!redemption.expires_at && new Date(redemption.expires_at).getTime() < Date.now()));
  const buildsRemaining = redemption
    ? Math.max(0, redemption.skill_quota - redemption.skills_used)
    : 0;

  return {
    redemption,
    preset,
    isLoading: authLoading || isLoading,
    isExpired,
    buildsRemaining,
    passEndsAt: redemption?.expires_at ?? null,
    refresh,
  };
}
