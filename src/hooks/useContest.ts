import { useCallback, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { ContestKind, ContestResult, ContestTarget } from '@/types/contest';

// The generated types don't yet include submit_contest; cast for the rpc call.
const db = supabase as unknown as SupabaseClient;

// app version (from Vite env) so operational reports carry build context.
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

export function useContest() {
  const [submitting, setSubmitting] = useState(false);

  const submitContest = useCallback(
    async (target: ContestTarget, kind: ContestKind, note?: string): Promise<ContestResult> => {
      setSubmitting(true);
      try {
        const { data, error } = await db.rpc('submit_contest', {
          p_kind: kind,
          p_target_type: target.target_type ?? null,
          p_target_id: target.target_id ?? null,
          p_surface: target.surface ?? null,
          p_element: target.element ?? null,
          p_note: note?.trim() ? note.trim() : null,
          p_context: { app_version: APP_VERSION },
        });
        if (error) throw error;
        return data as ContestResult;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { submitContest, submitting };
}
