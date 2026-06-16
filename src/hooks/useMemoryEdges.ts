import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

/**
 * useMemoryEdges - the honest fact-to-fact rope layer for the Memory Web.
 *
 * Reads the real `memory_edges` rows (is_active only) for the current user and
 * exposes the three hands the bond reader + canvas act with:
 *   deriveEdges()      -> invokes the memory-edges-derive function (LLM proposes
 *                         only justified relationships, replaces source='inferred'
 *                         edges) then refetches. Never fabricates a relationship.
 *   strengthenFact(id) -> strengthen_memory_fact RPC (the leader vouches: bumps
 *                         confidence, marks verified) then refetches.
 *   fixFact(id)        -> fix_memory_fact RPC (the leader flags it wrong: disputes
 *                         the fact + deactivates its edges) then refetches.
 *
 * The `memory_edges` table + the two RPCs are newer than the committed generated
 * types, so we reach them through an untyped client (the row shape is enforced by
 * the MemoryEdge interface below). This mirrors useDecisionEngine's scoped cast.
 */
const db = supabase as unknown as SupabaseClient;

export type EdgeRelation = 'depends_on' | 'supports' | 'tension' | 'informs' | 'relates';
export type EdgeSource = 'inferred' | 'user';

export interface MemoryEdge {
  id: string;
  user_id: string;
  from_fact_id: string;
  to_fact_id: string;
  relation: EdgeRelation;
  strength: number;
  rationale: string | null;
  source: EdgeSource;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useMemoryEdges() {
  const { user } = useAuth();
  const [edges, setEdges] = useState<MemoryEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [deriving, setDeriving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setEdges([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: queryError } = await db
        .from('memory_edges')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('strength', { ascending: false });
      // The table may not exist yet (migration not applied). Treat that as an
      // empty edge set rather than a hard failure, so the canvas still renders
      // its fact-to-world ropes. A genuine RLS/network error still surfaces.
      if (queryError) {
        const code = (queryError as { code?: string }).code;
        if (code === '42P01') {
          setEdges([]);
          setError(null);
        } else {
          throw queryError;
        }
      } else {
        setEdges((data ?? []) as MemoryEdge[]);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load memory edges:', err);
      setError(err instanceof Error ? err : new Error('Failed to load memory edges'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /**
   * Re-derive the inferred fact-to-fact edges for the current user, then
   * refetch. Idempotent server-side (replaces source='inferred' edges; never
   * touches source='user' edges). Returns the count the function reports.
   */
  const deriveEdges = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;
    setDeriving(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('memory-edges-derive', {
        body: {},
      });
      if (invokeError) throw invokeError;
      await refetch();
      return typeof data?.edges === 'number' ? data.edges : 0;
    } catch (err) {
      console.error('Failed to derive memory edges:', err);
      setError(err instanceof Error ? err : new Error('Failed to derive memory edges'));
      throw err;
    } finally {
      setDeriving(false);
    }
  }, [user?.id, refetch]);

  /**
   * The leader vouches for a fact (honest "you confirmed this"): bumps
   * confidence_score and marks it verified via the strengthen_memory_fact RPC.
   */
  const strengthenFact = useCallback(async (factId: string): Promise<void> => {
    if (!user?.id) return;
    const { error: rpcError } = await db.rpc('strengthen_memory_fact', { p_fact_id: factId });
    if (rpcError) throw rpcError;
    await refetch();
  }, [user?.id, refetch]);

  /**
   * The leader flags a fact wrong (honest "you flagged this wrong"): disputes
   * the fact, drops it from the current set, and deactivates its edges via the
   * fix_memory_fact RPC.
   */
  const fixFact = useCallback(async (factId: string): Promise<void> => {
    if (!user?.id) return;
    const { error: rpcError } = await db.rpc('fix_memory_fact', { p_fact_id: factId });
    if (rpcError) throw rpcError;
    await refetch();
  }, [user?.id, refetch]);

  return { edges, loading, deriving, error, refetch, deriveEdges, strengthenFact, fixFact };
}
