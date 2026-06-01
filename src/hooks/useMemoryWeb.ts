import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type {
  MemoryWebFact,
  UserPattern,
  UserDecision,
  MemoryWebStats,
  MemoryBudget,
  GettingSmarterDelta,
  Temperature,
  FactCategory,
} from '@/types/memory';

/**
 * A fact counts as verified ONLY if the user has explicitly confirmed or
 * corrected it. Null / undefined / unknown values are treated as inferred.
 * This prevents the "100% verified" bug when verification_status is absent
 * or the column has drifted to a default.
 */
function isVerified(status: unknown): boolean {
  return status === 'verified' || status === 'corrected';
}

function calculateHealthScore(
  facts: MemoryWebFact[],
  patterns: UserPattern[],
  decisions: UserDecision[],
): number {
  if (facts.length === 0) return 0;
  let score = 0;
  score += Math.min(20, facts.length * 2);
  const verified = facts.filter((f) => isVerified(f.verification_status));
  score += Math.round((verified.length / facts.length) * 25);
  score += Math.min(20, patterns.length * 4);
  score += Math.min(15, decisions.length * 5);
  const categories = new Set(facts.map((f) => f.fact_category));
  score += categories.size * 4;
  return Math.min(100, score);
}

export function useMemoryWeb() {
  const [facts, setFacts] = useState<MemoryWebFact[]>([]);
  const [patterns, setPatterns] = useState<UserPattern[]>([]);
  const [decisions, setDecisions] = useState<UserDecision[]>([]);
  const [budget, setBudget] = useState<MemoryBudget | null>(null);
  const [stats, setStats] = useState<MemoryWebStats | null>(null);
  const [delta, setDelta] = useState<GettingSmarterDelta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all current facts
      // Try with archived_at filter first; if the column doesn't exist yet
      // (migration not applied), fall back to querying without it.
      let factData: unknown[] | null = null;
      const baseQuery = () =>
        supabase
          .from('user_memory')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_current', true)
          .order('created_at', { ascending: false });

      const withArchived = await baseQuery().is('archived_at', null);
      if (withArchived.error) {
        // archived_at column likely missing - query without it. supabase-js
        // returns query failures in .error (it does not throw), so if the
        // fallback ALSO errors this is a genuine load failure (500/RLS/network),
        // not a missing column. Throw it so the error state surfaces instead of
        // silently rendering an empty Memory Web.
        const fallback = await baseQuery();
        if (fallback.error) throw fallback.error;
        factData = fallback.data;
      } else {
        factData = withArchived.data;
      }

      const allFacts = ((factData || []) as unknown as MemoryWebFact[]).map((f) => ({
        ...f,
        temperature: (f.temperature || 'warm') as Temperature,
        reference_count: f.reference_count || 0,
        last_referenced_at: f.last_referenced_at || f.created_at,
        tags: f.tags || [],
      }));
      setFacts(allFacts);

      // Fetch patterns (table may not exist yet)
      const patternResult = await supabase
        .from('user_patterns')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'deprecated')
        .order('confidence', { ascending: false });
      const allPatterns = (patternResult.data || []) as unknown as UserPattern[];
      if (!patternResult.error) setPatterns(allPatterns);

      // Fetch decisions (table may not exist yet)
      const decisionResult = await supabase
        .from('user_decisions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      const allDecisions = (decisionResult.data || []) as unknown as UserDecision[];
      if (!decisionResult.error) setDecisions(allDecisions);

      // Fetch budget (table may not exist yet)
      const budgetResult = await supabase
        .from('user_memory_budget')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!budgetResult.error && budgetResult.data) setBudget(budgetResult.data as unknown as MemoryBudget);

      // Calculate stats - null-safe: any unknown / missing status is inferred.
      const verified = allFacts.filter((f) => isVerified(f.verification_status));
      const tempDist: Record<Temperature, number> = { hot: 0, warm: 0, cold: 0 };
      const catDist: Record<string, number> = {};
      for (const f of allFacts) {
        tempDist[f.temperature] = (tempDist[f.temperature] || 0) + 1;
        catDist[f.fact_category] = (catDist[f.fact_category] || 0) + 1;
      }

      setStats({
        total_facts: allFacts.length,
        verified_count: verified.length,
        verified_rate: allFacts.length > 0 ? Math.round((verified.length / allFacts.length) * 100) : 0,
        temperature_distribution: tempDist,
        category_distribution: catDist as Record<FactCategory, number>,
        health_score: calculateHealthScore(allFacts, allPatterns, allDecisions),
        patterns_count: allPatterns.length,
        decisions_count: allDecisions.length,
      });

      // Calculate delta
      const lastVisit = localStorage.getItem('mindmaker_last_visit');
      const sinceDate = lastVisit || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      setDelta({
        new_facts: allFacts.filter((f) => f.created_at > sinceDate).length,
        new_patterns: allPatterns.filter((p) => p.created_at > sinceDate).length,
        new_decisions: allDecisions.filter((d) => d.created_at > sinceDate).length,
        period: lastVisit ? 'since last visit' : 'this week',
      });
      localStorage.setItem('mindmaker_last_visit', new Date().toISOString());
    } catch (err) {
      console.error('Failed to load memory web:', err);
      setError(err instanceof Error ? err : new Error('Failed to load memory web'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // --- Action methods for desktop CRUD ---

  const editFact = useCallback(
    async (id: string, updates: Partial<Pick<MemoryWebFact, 'fact_value' | 'fact_label' | 'fact_context'>>) => {
      if (!user?.id) return;
      await supabase.from('user_memory').update(updates).eq('id', id).eq('user_id', user.id);
      await refresh();
    },
    [user?.id, refresh],
  );

  const deleteFact = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await supabase.from('user_memory').update({ is_current: false }).eq('id', id).eq('user_id', user.id);
      await refresh();
    },
    [user?.id, refresh],
  );

  const verifyFact = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await supabase
        .from('user_memory')
        .update({ verification_status: 'verified', verified_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
      await refresh();
    },
    [user?.id, refresh],
  );

  const confirmPattern = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await supabase
        .from('user_patterns')
        .update({ status: 'confirmed', last_confirmed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
      await refresh();
    },
    [user?.id, refresh],
  );

  const dismissPattern = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await supabase.from('user_patterns').update({ status: 'deprecated' }).eq('id', id).eq('user_id', user.id);
      await refresh();
    },
    [user?.id, refresh],
  );

  const supersedeDecision = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await supabase.from('user_decisions').update({ status: 'superseded' }).eq('id', id).eq('user_id', user.id);
      await refresh();
    },
    [user?.id, refresh],
  );

  const reverseDecision = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await supabase.from('user_decisions').update({ status: 'reversed' }).eq('id', id).eq('user_id', user.id);
      await refresh();
    },
    [user?.id, refresh],
  );

  const submitInput = useCallback(
    async (text: string): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) return { success: false, error: 'Not authenticated' };
      try {
        const { data, error: fnError } = await supabase.functions.invoke('extract-user-context', { body: { transcript: text } });
        if (fnError) throw fnError;
        await refresh();
        const factCount = data?.stored_count ?? data?.pending_verifications?.length ?? 0;
        return { success: true, error: factCount === 0 ? 'No facts could be extracted. Try being more specific.' : undefined };
      } catch (err) {
        console.error('Failed to submit input:', err);
        return { success: false, error: 'Could not process your input. Please try again.' };
      }
    },
    [user?.id, refresh],
  );

  return {
    facts,
    patterns,
    decisions,
    budget,
    stats,
    delta,
    isLoading,
    error,
    refresh,
    hotFacts: facts.filter((f) => f.temperature === 'hot'),
    warmFacts: facts.filter((f) => f.temperature === 'warm'),
    editFact,
    deleteFact,
    verifyFact,
    confirmPattern,
    dismissPattern,
    supersedeDecision,
    reverseDecision,
    submitInput,
  };
}
