import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { zipFilenameFromArtifact, type KitArtifactRow } from "@/lib/kit";

// Kit tables are newer than the committed generated types; the row interface
// enforces the shape (same pattern as useGoals / useDecisionEngine).
const db = supabase as unknown as SupabaseClient;

export interface UseKitArtifacts {
  artifacts: KitArtifactRow[];
  /** Current artifacts keyed by their preset artifact id. */
  byArtifactId: Record<string, KitArtifactRow>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Downloads a ZIP artifact from storage. Resolves false on failure. */
  download: (artifact: KitArtifactRow) => Promise<boolean>;
  /** Copies a text artifact body to the clipboard. Resolves false on failure. */
  copy: (artifact: KitArtifactRow) => Promise<boolean>;
}

/** Current (is_current) artifacts for a redemption, plus download/copy helpers. */
export function useKitArtifacts(redemptionId: string | null): UseKitArtifacts {
  const [artifacts, setArtifacts] = useState<KitArtifactRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!redemptionId) {
      setArtifacts([]);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await db
        .from("kit_artifacts")
        .select("*")
        .eq("redemption_id", redemptionId)
        .eq("is_current", true)
        .order("created_at", { ascending: true });
      setArtifacts((data as KitArtifactRow[] | null) ?? []);
    } catch {
      // Keep the last known artifacts; a transient error should not blank the kit.
    } finally {
      setIsLoading(false);
    }
  }, [redemptionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const byArtifactId = useMemo(() => {
    const map: Record<string, KitArtifactRow> = {};
    for (const artifact of artifacts) map[artifact.artifact_id] = artifact;
    return map;
  }, [artifacts]);

  const download = useCallback(async (artifact: KitArtifactRow): Promise<boolean> => {
    if (!artifact.storage_path) return false;
    try {
      const { data, error } = await supabase.storage
        .from("kit-artifacts")
        .download(artifact.storage_path);
      if (error || !data) return false;
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = zipFilenameFromArtifact(artifact);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  const copy = useCallback(async (artifact: KitArtifactRow): Promise<boolean> => {
    if (!artifact.body) return false;
    try {
      await navigator.clipboard.writeText(artifact.body);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { artifacts, byArtifactId, isLoading, refresh, download, copy };
}
