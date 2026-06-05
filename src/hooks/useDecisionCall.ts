import { useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

// decision_user_calls is newer than the committed generated types; use an
// untyped client (same pattern as useDecisionEngine / useGoals).
const db = supabase as unknown as SupabaseClient;

export type UserCall = 'accept' | 'reject' | 'unsure';

export interface DecisionUserCall {
  id: string;
  decision_case_id: string;
  claim_id: string | null;
  call: UserCall;
  reasoning: string | null;
  created_at: string;
}

/**
 * Records and reads the user's own call on a decision's load-bearing claim.
 * This is the critical-evaluation rep: the judgment is logged before CTRL's
 * recommendation is accepted, so the user practises evaluating rather than
 * outsourcing.
 */
export function useDecisionCall() {
  const { user } = useAuth();

  const getCallsForCase = useCallback(async (caseId: string): Promise<DecisionUserCall[]> => {
    try {
      const { data } = await db
        .from('decision_user_calls')
        .select('*')
        .eq('decision_case_id', caseId);
      return (data as DecisionUserCall[]) ?? [];
    } catch {
      return [];
    }
  }, []);

  const recordCall = useCallback(
    async (caseId: string, claimId: string | null, call: UserCall, reasoning?: string): Promise<void> => {
      if (!user?.id) return;
      await db.from('decision_user_calls').insert({
        user_id: user.id,
        decision_case_id: caseId,
        claim_id: claimId,
        call,
        reasoning: reasoning?.trim() || null,
      });
    },
    [user?.id],
  );

  return { getCallsForCase, recordCall };
}
