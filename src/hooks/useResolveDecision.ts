import { useCallback, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { PlayedOut } from '@/types/track-record';

// resolve_decision / record_decision_outcome aren't in the committed generated
// types; use an untyped client (same pattern as useTrackRecord / useDecisionEngine).
const db = supabase as unknown as SupabaseClient;

// PostgREST codes for "the function does not exist" (schema cache miss / undefined
// function) - the only errors the legacy fallback below is allowed to absorb.
const MISSING_FN_CODES = new Set(['PGRST202', '42883']);

/**
 * Resolve a decision - the closing move of the lifecycle. The leader says how it
 * played out and (optionally) leaves a one-line conclusion, then the decision
 * drops out of the active rotation and into History.
 *
 * ONE atomic RPC (resolve_decision, migration 20260702130000): the outcome insert
 * and the status='decided' + pin-clear flip commit or roll back together, with the
 * brain harvest best-effort inside the function. Real failures THROW so the caller
 * can tell the leader the truth instead of silently leaving the decision open.
 *
 * Fallback: if the RPC is missing in this environment (migration not applied yet),
 * do the legacy two writes in the SAFER order - status flip first (the leader's
 * intent is "close it"), then the outcome record best-effort.
 */
export function useResolveDecision() {
  const [resolving, setResolving] = useState(false);

  const resolve = useCallback(
    async (caseId: string, playedOut: PlayedOut, conclusion?: string): Promise<void> => {
      setResolving(true);
      try {
        const note = conclusion?.trim() || null;
        const { error: rpcErr } = await db.rpc('resolve_decision', {
          p_decision_case_id: caseId,
          p_played_out: playedOut,
          p_note: note,
        });
        if (!rpcErr) return;
        if (!MISSING_FN_CODES.has(rpcErr.code ?? '')) throw rpcErr;

        // Legacy path (RPC not deployed): close first, then record best-effort.
        const { error: updErr } = await db
          .from('decision_cases')
          .update({ status: 'decided', pinned_at: null })
          .eq('id', caseId);
        if (updErr) throw updErr;
        const { error: outcomeErr } = await db.rpc('record_decision_outcome', {
          p_decision_case_id: caseId,
          p_played_out: playedOut,
          p_note: note,
          p_source: 'resolve',
        });
        if (outcomeErr) console.error('resolve: outcome record failed (decision still closed)', outcomeErr);
      } finally {
        setResolving(false);
      }
    },
    [],
  );

  return { resolve, resolving };
}
