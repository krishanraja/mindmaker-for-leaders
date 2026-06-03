/**
 * useUserMemory Hook
 * Manages user memory state, extraction, and verification
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type {
  UserMemoryFact,
  PendingVerification,
  ExtractionResult,
  MemoryContext,
  MemorySourceType
} from '@/types/memory';

interface UseUserMemoryReturn {
  // State
  memory: UserMemoryFact[];
  pendingVerifications: PendingVerification[];
  isLoading: boolean;
  isExtracting: boolean;
  error: string | null;
  
  // Actions
  extractFromTranscript: (transcript: string, sessionId?: string, sourceType?: MemorySourceType) => Promise<ExtractionResult>;
  verifyFact: (factId: string, newValue?: string) => Promise<boolean>;
  rejectFact: (factId: string) => Promise<boolean>;
  refreshMemory: () => Promise<void>;
  getMemoryContext: () => MemoryContext;
  clearPendingVerifications: () => void;
}

export function useUserMemory(): UseUserMemoryReturn {
  const { user } = useAuth();
  const [memory, setMemory] = useState<UserMemoryFact[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's memory on mount and when user changes
  // Returns the pending verifications array so callers can snapshot it.
  const refreshMemory = useCallback(async (): Promise<PendingVerification[]> => {
    if (!user?.id) {
      setMemory([]);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .order('fact_category')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMemory((data as UserMemoryFact[]) || []);

      // Also fetch pending verifications
      const { data: pending } = await supabase
        .rpc('get_pending_verifications', { p_user_id: user.id });

      const pendingList = (pending as PendingVerification[]) || [];
      setPendingVerifications(pendingList);
      return pendingList;
    } catch (err) {
      console.error('Error fetching memory:', err);
      setError('Failed to load your profile data');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshMemory();
  }, [refreshMemory]);

  // Extract facts from a transcript
  const extractFromTranscript = useCallback(async (
    transcript: string,
    sessionId?: string,
    sourceType?: MemorySourceType
  ): Promise<ExtractionResult> => {
    setIsExtracting(true);
    setError(null);

    try {
      // The first capture sometimes hits a transient FunctionsFetchError
      // (cold start or a flaky network). Retry with backoff so a leader's
      // first words are never silently dropped. A real function error (it ran
      // and returned non-2xx) is not retried.
      const delays = [0, 700, 1800];
      let data: unknown = null;
      let extractError: unknown = null;
      for (let attempt = 0; attempt < delays.length; attempt++) {
        if (delays[attempt]) await new Promise((r) => setTimeout(r, delays[attempt]));
        const res = await supabase.functions.invoke('extract-user-context', {
          body: { transcript, session_id: sessionId, source_type: sourceType },
        });
        if (!res.error) {
          data = res.data;
          extractError = null;
          break;
        }
        extractError = res.error;
        const name = (res.error as { name?: string })?.name ?? '';
        if (name !== 'FunctionsFetchError') break; // only retry transport failures
      }

      if (extractError) throw extractError;

      const result = data as ExtractionResult;

      // Update pending verifications if we got new ones
      if (result.pending_verifications?.length > 0) {
        setPendingVerifications(result.pending_verifications);
      }

      // Refresh memory to get newly stored facts
      if (user?.id) {
        await refreshMemory();
      }

      return result;
    } catch (err) {
      console.error('Error extracting context:', err);
      setError('That did not send. Tap to try again.');
      return {
        success: false,
        pending_verifications: [],
        error: 'Extraction failed',
      };
    } finally {
      setIsExtracting(false);
    }
  }, [user?.id, refreshMemory]);

  // Verify a fact (confirm as correct)
  const verifyFact = useCallback(async (
    factId: string, 
    newValue?: string
  ): Promise<boolean> => {
    try {
      const { data, error: verifyError } = await supabase
        .rpc('verify_memory_fact', {
          p_fact_id: factId,
          p_new_value: newValue || null,
          p_is_correct: true,
        });

      if (verifyError) throw verifyError;

      // Remove from pending verifications (local update only; full refresh on flow close)
      setPendingVerifications(prev => prev.filter(p => p.id !== factId));

      return true;
    } catch (err) {
      console.error('Error verifying fact:', err);
      setError('Failed to save verification');
      return false;
    }
  }, []);

  // Reject a fact (mark as incorrect)
  const rejectFact = useCallback(async (factId: string): Promise<boolean> => {
    try {
      const { error: rejectError } = await supabase
        .rpc('verify_memory_fact', {
          p_fact_id: factId,
          p_new_value: null,
          p_is_correct: false,
        });

      if (rejectError) throw rejectError;

      // Remove from pending verifications (local update only; full refresh on flow close)
      setPendingVerifications(prev => prev.filter(p => p.id !== factId));

      return true;
    } catch (err) {
      console.error('Error rejecting fact:', err);
      setError('Failed to reject fact');
      return false;
    }
  }, []);

  // Get formatted memory context for LLM
  const getMemoryContext = useCallback((): MemoryContext => {
    const verified = memory.filter(
      m => m.verification_status === 'verified' || m.verification_status === 'corrected'
    );
    const inferred = memory.filter(
      m => m.verification_status === 'inferred' && m.confidence_score >= 0.7
    );

    let formatted = '';

    if (verified.length > 0) {
      formatted += '=== USER MEMORY (Verified) ===\n';
      verified.forEach(fact => {
        formatted += `${fact.fact_label}: ${fact.fact_value}\n`;
      });
      formatted += '\n';
    }

    if (inferred.length > 0) {
      formatted += '=== USER MEMORY (Inferred, High Confidence) ===\n';
      inferred.forEach(fact => {
        formatted += `${fact.fact_label}: ${fact.fact_value}\n`;
      });
    }

    return { verified, inferred, formatted };
  }, [memory]);

  // Clear pending verifications (dismiss without action)
  const clearPendingVerifications = useCallback(() => {
    setPendingVerifications([]);
  }, []);

  return {
    memory,
    pendingVerifications,
    isLoading,
    isExtracting,
    error,
    extractFromTranscript,
    verifyFact,
    rejectFact,
    refreshMemory,
    getMemoryContext,
    clearPendingVerifications,
  };
}
