import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isTerminalBuildStatus, type KitBuildRow } from "@/lib/kit";

// Kit tables are newer than the committed generated types; the row interface
// enforces the shape (same pattern as useGoals / useDecisionEngine).
const db = supabase as unknown as SupabaseClient;

const POLL_MS = 2000;

export interface UseKitBuild {
  build: KitBuildRow | null;
  /** True while the build is being polled (not yet terminal). */
  isPolling: boolean;
}

/**
 * Polls a kit build every 2s until it reaches a terminal status
 * (complete | partial | failed). If the row is not visible to this session
 * (stale id from a lost anonymous session) polling stops with build null so
 * the caller can fall back to a latest-build lookup.
 */
export function useKitBuild(buildId: string | null): UseKitBuild {
  const [build, setBuild] = useState<KitBuildRow | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!buildId) {
      setBuild(null);
      setIsPolling(false);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    setBuild(null);
    setIsPolling(true);

    const tick = async () => {
      let row: KitBuildRow | null = null;
      let failedFetch = false;
      try {
        const { data, error } = await db
          .from("kit_builds")
          .select("*")
          .eq("id", buildId)
          .maybeSingle();
        if (error) failedFetch = true;
        row = (data as KitBuildRow | null) ?? null;
      } catch {
        failedFetch = true;
      }
      if (cancelled) return;

      if (row) {
        setBuild(row);
        if (isTerminalBuildStatus(row.status)) {
          setIsPolling(false);
          return;
        }
      } else if (!failedFetch) {
        // Genuinely missing (not a transient error): stop polling.
        setIsPolling(false);
        return;
      }
      timer = window.setTimeout(() => void tick(), POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [buildId]);

  return { build, isPolling };
}

/** One-shot fetch of a build by id (returns null when invisible/missing). */
export async function fetchKitBuild(buildId: string): Promise<KitBuildRow | null> {
  try {
    const { data } = await db.from("kit_builds").select("*").eq("id", buildId).maybeSingle();
    return (data as KitBuildRow | null) ?? null;
  } catch {
    return null;
  }
}

/** Latest build for a redemption, newest first. */
export async function fetchLatestKitBuild(redemptionId: string): Promise<KitBuildRow | null> {
  try {
    const { data } = await db
      .from("kit_builds")
      .select("*")
      .eq("redemption_id", redemptionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as KitBuildRow | null) ?? null;
  } catch {
    return null;
  }
}
