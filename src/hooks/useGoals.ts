import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Goal, GoalHorizon, GoalStatus } from '@/types/goals';

// The goals table is newer than the committed generated types. Access it
// through an untyped client; the Goal interface enforces the row shape. This
// mirrors useDecisionEngine, which scopes the looseness to the hook rather
// than regenerating a drifted live schema that breaks unrelated modules.
const db = supabase as unknown as SupabaseClient;

export interface NewGoal {
  title: string;
  detail?: string;
  horizon?: GoalHorizon;
  target_date?: string | null;
}

export type GoalPatch = Partial<
  Pick<Goal, 'title' | 'detail' | 'status' | 'horizon' | 'priority' | 'progress' | 'target_date'>
>;

/**
 * Read/write layer over the unified goals table. Other spine surfaces
 * (decisions, missions, briefing) read goals through this hook so there is one
 * source of truth.
 */
export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      setGoals([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: fetchError } = await db
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setGoals((data as Goal[]) ?? []);
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createGoal = useCallback(
    async (input: NewGoal) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error: insErr } = await db
        .from('goals')
        .insert({
          user_id: user.id,
          title: input.title.trim(),
          detail: input.detail?.trim() || null,
          horizon: input.horizon ?? 'quarter',
          target_date: input.target_date ?? null,
          source: 'manual',
        })
        .select()
        .single();
      if (insErr) throw insErr;
      setGoals((prev) => [data as Goal, ...prev]);
      return data as Goal;
    },
    [user?.id],
  );

  const updateGoal = useCallback(async (id: string, patch: GoalPatch) => {
    const { data, error: updErr } = await db
      .from('goals')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (updErr) throw updErr;
    setGoals((prev) => prev.map((g) => (g.id === id ? (data as Goal) : g)));
    return data as Goal;
  }, []);

  const setStatus = useCallback(
    (id: string, status: GoalStatus) => updateGoal(id, { status }),
    [updateGoal],
  );

  const deleteGoal = useCallback(async (id: string) => {
    const { error: delErr } = await db.from('goals').delete().eq('id', id);
    if (delErr) throw delErr;
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const activeGoals = goals.filter((g) => g.status === 'active');

  return {
    goals,
    activeGoals,
    loading,
    error,
    refetch,
    createGoal,
    updateGoal,
    setStatus,
    deleteGoal,
  };
}
