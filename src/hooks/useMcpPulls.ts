import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useMcpPulls - has anything actually pulled this skill?
 *
 * The Library used to be able to say a skill existed and nothing else. "Live in
 * your agent" was never a fact it held: a download is a file leaving CTRL, and
 * an install happens somewhere CTRL cannot see. So the only honest source for
 * install state is evidence that something on the other side asked for it, and
 * that is exactly what `mcp_pulls` records (CH-01b): one row per read call to
 * the MCP server, written with the service role, readable only by the owner.
 *
 * The rule this hook exists to keep: no pull row, no claim. A skill with no
 * rows is not "not installed" either, because a leader may have installed the
 * ZIP by hand and never wired MCP. What is known is what was observed, and the
 * surface says exactly that much.
 */

export interface PullSummary {
  /** Rows seen for this skill. */
  count: number;
  /** ISO timestamp of the most recent pull. */
  lastAt: string | null;
}

interface PullRow {
  tool: string;
  skill_name: string | null;
  artifact_id: string | null;
  called_at: string;
}

export interface UseMcpPulls {
  loading: boolean;
  /** Keyed by artifact id, for skills pulled after artifact_id was recorded. */
  byArtifactId: Record<string, PullSummary>;
  /** Keyed by skill name, the fallback when a row carries no artifact id. */
  byName: Record<string, PullSummary>;
  /** The summary for one skill, or null when nothing has pulled it. */
  forSkill: (artifactId: string, name: string) => PullSummary | null;
  refetch: () => Promise<void>;
}

const EMPTY: Record<string, PullSummary> = {};

function add(map: Record<string, PullSummary>, key: string, at: string) {
  const current = map[key];
  if (!current) {
    map[key] = { count: 1, lastAt: at };
    return;
  }
  current.count += 1;
  if (!current.lastAt || at > current.lastAt) current.lastAt = at;
}

export function useMcpPulls(limit = 500): UseMcpPulls {
  const [loading, setLoading] = useState(true);
  const [byArtifactId, setByArtifactId] = useState<Record<string, PullSummary>>(EMPTY);
  const [byName, setByName] = useState<Record<string, PullSummary>>(EMPTY);

  const fetchPulls = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setByArtifactId(EMPTY);
        setByName(EMPTY);
        return;
      }
      // Scoped cast, same as useStandard / useCapabilitySignals: mcp_pulls
      // post-dates the generated types.
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              order: (c: string, o: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: PullRow[] | null; error: unknown }>;
              };
            };
          };
        };
      })
        .from("mcp_pulls")
        .select("tool, skill_name, artifact_id, called_at")
        .eq("user_id", user.id)
        .order("called_at", { ascending: false })
        .limit(limit);

      if (error || !data) {
        setByArtifactId(EMPTY);
        setByName(EMPTY);
        return;
      }

      const ids: Record<string, PullSummary> = {};
      const names: Record<string, PullSummary> = {};
      for (const row of data) {
        // list_skills names no skill, so it says nothing about any one of them.
        if (row.tool === "list_skills") continue;
        if (row.artifact_id) add(ids, row.artifact_id, row.called_at);
        if (row.skill_name) add(names, row.skill_name.toLowerCase(), row.called_at);
      }
      setByArtifactId(ids);
      setByName(names);
    } catch {
      // A leader who has never wired an agent is the normal state, not an error.
      setByArtifactId(EMPTY);
      setByName(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void fetchPulls();
  }, [fetchPulls]);

  const forSkill = useCallback(
    (artifactId: string, name: string): PullSummary | null =>
      byArtifactId[artifactId] ?? byName[(name ?? "").toLowerCase()] ?? null,
    [byArtifactId, byName],
  );

  return { loading, byArtifactId, byName, forSkill, refetch: fetchPulls };
}
