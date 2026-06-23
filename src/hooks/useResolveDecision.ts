import { useCallback, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { PlayedOut } from '@/types/track-record';

// record_decision_outcome / the status update aren't in the committed generated
// types; use an untyped client (same pattern as useTrackRecord / useDecisionEngine).
const db = supabase as unknown as SupabaseClient;

/**
 * Resolve a decision - the closing move of the lifecycle. The leader says how it
 * played out and (optionally) leaves a one-line conclusion, then the decision
 * drops out of the active rotation and into History.
 *
 * Two writes, in order:
 *   1. record_decision_outcome() - records the outcome in decision_outcomes AND
 *      fires apply_outcome_to_brain() so the brain sharpens on the spot (reused
 *      as-is from the Track Record harvest; see migration 20260615050000).
 *   2. mark the case status='decided' + clear pinned_at, so it leaves the active
 *      slot and shows under History. RLS (decision_cases_owner, FOR ALL) lets the
 *      owner do this directly - no extra RPC needed.
 *
 * We pass resolution = null rather than fabricating a 'proceed' the leader never
 * chose (honest-by-construction). process_quality is left null too - resolving is
 * two taps, not a survey.
 */
export function useResolveDecision() {
  const [resolving, setResolving] = useState(false);

  const resolve = useCallback(
    async (caseId: string, playedOut: PlayedOut, conclusion?: string): Promise<void> => {
      setResolving(true);
      try {
        const { error: rpcErr } = await db.rpc('record_decision_outcome', {
          p_decision_case_id: caseId,
          p_played_out: playedOut,
          p_note: conclusion?.trim() || null,
          p_source: 'resolve',
        });
        if (rpcErr) throw rpcErr;

        const { error: updErr } = await db
          .from('decision_cases')
          .update({ status: 'decided', pinned_at: null })
          .eq('id', caseId);
        if (updErr) throw updErr;
      } finally {
        setResolving(false);
      }
    },
    [],
  );

  return { resolve, resolving };
}
