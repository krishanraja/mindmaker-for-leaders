import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  BriefingInterest,
  BriefingInterestKind,
  BriefingInterestSource,
} from '@/types/briefing';

interface UseBriefingInterestsState {
  beats: BriefingInterest[];
  entities: BriefingInterest[];
  excludes: BriefingInterest[];
  all: BriefingInterest[];
  loading: boolean;
  error: string | null;
}

interface AddOptions {
  source?: BriefingInterestSource;
  weight?: number;
}

/**
 * CRUD hook for user-declared briefing interests. Owned by the authenticated
 * user (RLS enforces this server-side); the hook is a thin wrapper around
 * the briefing_interests table so components don't duplicate query logic.
 */
export function useBriefingInterests() {
  const [state, setState] = useState<UseBriefingInterestsState>({
    beats: [],
    entities: [],
    excludes: [],
    all: [],
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ beats: [], entities: [], excludes: [], all: [], loading: false, error: null });
        return;
      }
      const { data, error } = await supabase
        .from('briefing_interests')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const all = (data ?? []) as BriefingInterest[];
      setState({
        beats: all.filter((i) => i.kind === 'beat'),
        entities: all.filter((i) => i.kind === 'entity'),
        excludes: all.filter((i) => i.kind === 'exclude'),
        all,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const add = useCallback(
    async (kind: BriefingInterestKind, text: string, opts: AddOptions = {}): Promise<BriefingInterest | null> => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        // Idempotency: if the same (kind, text) is already active, do nothing.
        const existing = state.all.find(
          (i) => i.kind === kind && i.text.trim().toLowerCase() === trimmed.toLowerCase(),
        );
        if (existing) return existing;

        const { data, error } = await supabase
          .from('briefing_interests')
          .insert({
            user_id: user.id,
            kind,
            text: trimmed,
            weight: opts.weight ?? 1.0,
            source: opts.source ?? 'manual',
            is_active: true,
          })
          .select('*')
          .single();
        if (error) throw error;
        const row = data as BriefingInterest;
        await refetch();
        return row;
      } catch (err) {
        console.error('briefing_interests add failed:', err);
        setState((s) => ({ ...s, error: (err as Error).message }));
        return null;
      }
    },
    [state.all, refetch],
  );

  // Soft delete - marks is_active=false so feedback history remains traceable.
  const remove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('briefing_interests')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await refetch();
    } catch (err) {
      console.error('briefing_interests remove failed:', err);
      setState((s) => ({ ...s, error: (err as Error).message }));
    }
  }, [refetch]);

  return { ...state, add, remove, refetch };
}
