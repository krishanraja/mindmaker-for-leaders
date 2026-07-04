import { useCallback, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// decision_cases is newer than the committed generated types; use an untyped
// client (same pattern as useDecisionEngine / useResolveDecision).
const db = supabase as unknown as SupabaseClient;

/**
 * Shared decision control-centre actions, so the active-decision cards (the
 * track-record "Active decisions" list, live inside PressureTestPanel's History
 * and on the standalone /track-record page) share ONE grammar with the rest of
 * the app rather than inventing new features:
 *
 *   - open      -> the existing door (load + pin the case in the Decisions tab).
 *                  Navigation is owned by the caller; this hook does not route.
 *   - archive   -> "stop" a decision: mirror the resolve write, setting
 *                  status='archived' + clearing the pin. 'archived' is already a
 *                  valid decision_cases status and is used server-side by
 *                  resolve_decision(); no new schema.
 *   - strengthen-> the existing useDecisionEngine.research('strengthen') door,
 *                  triggered after the case is opened (owned by the caller).
 *
 * This hook owns only the archive write (the one genuinely shared mutation).
 */
export function useDecisionActions() {
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const archive = useCallback(async (caseId: string): Promise<void> => {
    setArchivingId(caseId);
    try {
      const { error } = await db
        .from('decision_cases')
        .update({ status: 'archived', pinned_at: null })
        .eq('id', caseId);
      if (error) throw error;
    } finally {
      setArchivingId(null);
    }
  }, []);

  return { archive, archivingId };
}
