/**
 * Real-time Generation Progress Tracking
 * 
 * Purpose: Uses Supabase Realtime subscriptions to track generation_status updates
 * Dependencies: Supabase client, sonner toast
 * 
 * Returns: { phases, isComplete, hasErrors, currentPhase, completedCount, totalCount, progressPercentage }
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface GenerationPhase {
  name: string;
  key: keyof GenerationStatus;
  status: 'pending' | 'in-progress' | 'complete' | 'failed';
  duration?: number;
  error?: string;
}

export interface GenerationStatus {
  insights_generated: boolean;
  prompts_generated: boolean;
  risks_computed: boolean;
  tensions_computed: boolean;
  scenarios_generated: boolean;
  first_moves_generated: boolean;
  last_updated: string | null;
  error_log: Array<{ phase: string; error: string; timestamp: string }>;
}

const PHASES: Array<{ name: string; key: keyof GenerationStatus }> = [
  { name: 'Analyzing your responses', key: 'insights_generated' },
  { name: 'Generating your prompt library', key: 'prompts_generated' },
  { name: 'Computing risk signals', key: 'risks_computed' },
  { name: 'Identifying tensions', key: 'tensions_computed' },
  { name: 'Deriving org scenarios', key: 'scenarios_generated' },
  { name: 'Creating first moves', key: 'first_moves_generated' },
];

const TIMEOUT_MS = 180000; // 3 minutes per phase (increased to accommodate 116s Gemini responses)

export function useGenerationProgress(assessmentId: string) {
  const [phases, setPhases] = useState<GenerationPhase[]>(
    PHASES.map(p => ({ ...p, status: 'pending' as const }))
  );
  const [isComplete, setIsComplete] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [phaseStartTimes, setPhaseStartTimes] = useState<Record<string, number>>({});
  const errorToastShown = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Update phases based on generation status
  const updatePhasesFromStatus = (status: any) => {
    const now = Date.now();
    
    const updatedPhases = PHASES.map((phase) => {
      const isComplete = status[phase.key] === true;
      const hasError = status.error_log?.some(
        (e: any) => e.phase === phase.key
      );

      // Track when phase started
      if (!isComplete && !hasError) {
        setPhaseStartTimes(prev => {
          if (!prev[phase.key]) {
            return { ...prev, [phase.key]: now };
          }
          return prev;
        });
      }

      // Check for timeout
      const phaseStartTime = phaseStartTimes[phase.key];
      const isTimedOut = phaseStartTime && (now - phaseStartTime) > TIMEOUT_MS;

      let phaseStatus: 'pending' | 'in-progress' | 'complete' | 'failed' = 'pending';
      let phaseError: string | undefined;

      if (hasError) {
        phaseStatus = 'failed';
        phaseError = status.error_log.find((e: any) => e.phase === phase.key)?.error;
      } else if (isTimedOut) {
        phaseStatus = 'failed';
        phaseError = 'Generation timed out after 3 minutes';
      } else if (isComplete) {
        phaseStatus = 'complete';
      } else if (status.last_updated) {
        phaseStatus = 'in-progress';
      }

      return {
        ...phase,
        status: phaseStatus,
        error: phaseError
      };
    });
    
    setPhases(updatedPhases);

    // Check if all complete
    const allComplete = updatedPhases.every(p => p.status === 'complete');
    setIsComplete(allComplete);

    // Check for errors and show toast
    const anyErrors = status.error_log && status.error_log.length > 0;
    setHasErrors(anyErrors);

    // Show error toast once if there are errors
    if (anyErrors && !errorToastShown.current) {
      errorToastShown.current = true;
      const latestError = status.error_log[status.error_log.length - 1];
      toast.error('Generation Issue', {
        description: `Phase "${latestError.phase}" encountered an issue. Results may be partial.`,
        duration: 5000
      });
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!assessmentId) return;

    let mounted = true;

    // Initial fetch
    const fetchInitialStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('leader_assessments')
          .select('generation_status')
          .eq('id', assessmentId)
          .single();

        if (error) {
          console.error('❌ Failed to fetch generation status:', error);
          return;
        }

        if (mounted && data?.generation_status) {
          updatePhasesFromStatus(data.generation_status);
        }
      } catch (error) {
        console.error('❌ Error fetching initial status:', error);
      }
    };

    fetchInitialStatus();

    // Set up realtime subscription
    const channel = supabase
      .channel(`generation-progress:${assessmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leader_assessments',
          filter: `id=eq.${assessmentId}`,
        },
        (payload) => {
          if (mounted && payload.new.generation_status) {
            console.log('📡 Realtime update received for generation_status');
            updatePhasesFromStatus(payload.new.generation_status);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to generation progress updates:', assessmentId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error');
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [assessmentId]);

  return {
    phases,
    isComplete,
    hasErrors,
    currentPhase: phases.find(p => p.status === 'in-progress')?.name,
    completedCount: phases.filter(p => p.status === 'complete').length,
    totalCount: phases.length,
    progressPercentage: Math.round(
      (phases.filter(p => p.status === 'complete').length / phases.length) * 100
    )
  };
}
