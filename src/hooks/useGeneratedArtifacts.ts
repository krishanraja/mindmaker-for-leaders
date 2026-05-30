import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ArtifactKind, GeneratedArtifact } from "@/types/artifact";

/**
 * useGeneratedArtifacts
 *
 * Reads the leader's generated artifacts (skills, drafts, frameworks, exports,
 * custom briefings) for the Library tab on /memory. Quiet on errors - if the
 * table doesn't exist yet (migration not applied), we treat it as empty
 * rather than crashing the page.
 */
export function useGeneratedArtifacts(kind?: ArtifactKind, limit: number = 50) {
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArtifacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setArtifacts([]);
        return;
      }

      // Cast to Record<string, never> so the typed client doesn't complain
      // about a table it hasn't seen yet (until types are regenerated post-
      // migration). Runtime works fine; queries hit the table by name.
      const query = (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              order: (
                c: string,
                opts: { ascending: boolean },
              ) => { limit: (n: number) => Promise<{ data: GeneratedArtifact[] | null; error: unknown }> };
              eq?: (c: string, v: string) => {
                order: (c: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{ data: GeneratedArtifact[] | null; error: unknown }>;
                };
              };
            };
          };
        };
      })
        .from("generated_artifacts")
        .select("id, user_id, kind, name, body, metadata, created_at")
        .eq("user_id", user.id);

      const filtered = kind
        ? (query as unknown as { eq: (c: string, v: string) => unknown }).eq(
            "kind",
            kind,
          )
        : query;

      const { data, error } = await (
        filtered as {
          order: (
            c: string,
            opts: { ascending: boolean },
          ) => { limit: (n: number) => Promise<{ data: GeneratedArtifact[] | null; error: unknown }> };
        }
      )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        // Table missing or RLS denied - log once at warn and return empty.
        console.warn("useGeneratedArtifacts: fetch failed", error);
        setArtifacts([]);
        return;
      }

      setArtifacts(data ?? []);
    } catch (err) {
      console.warn("useGeneratedArtifacts: fetch failed", err);
      setArtifacts([]);
    } finally {
      setLoading(false);
    }
  }, [kind, limit]);

  const remove = useCallback(
    async (id: string) => {
      const { error } = await (
        supabase as unknown as {
          from: (t: string) => {
            delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
          };
        }
      )
        .from("generated_artifacts")
        .delete()
        .eq("id", id);
      if (error) {
        console.warn("useGeneratedArtifacts: delete failed", error);
        return false;
      }
      setArtifacts((prev) => prev.filter((a) => a.id !== id));
      return true;
    },
    [],
  );

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  return { artifacts, loading, refetch: fetchArtifacts, remove };
}
