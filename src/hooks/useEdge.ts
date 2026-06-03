import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type {
  EdgeProfile,
  EdgeStrength,
  EdgeWeakness,
  IntelligenceGap,
  EdgeAction,
  FeedbackType,
} from '@/types/edge';

export function useEdge() {
  const [profile, setProfile] = useState<EdgeProfile | null>(null);
  const [recentActions, setRecentActions] = useState<EdgeAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Fetch edge profile
      const { data: profileData } = await supabase
        .from('edge_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData as unknown as EdgeProfile);
      }

      // Fetch recent actions
      const { data: actionData } = await supabase
        .from('edge_actions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActions((actionData || []) as unknown as EdgeAction[]);
    } catch (err) {
      console.error('Failed to load edge profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Trigger profile synthesis
  const synthesize = useCallback(async () => {
    if (!user?.id) return;
    setIsSynthesizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('synthesize-edge-profile');
      if (error) throw error;
      await refresh();
      return data;
    } catch (err) {
      console.error('Failed to synthesize edge profile:', err);
    } finally {
      setIsSynthesizing(false);
    }
  }, [user?.id, refresh]);

  // Auto-synthesize once: a returning leader who already has memory but no Edge
  // profile should watch their verdict build silently, not get re-asked the
  // three onboarding questions. Guarded so it never loops or re-bills, and only
  // fires when there is enough memory for a meaningful profile.
  const autoSynthRef = useRef(false);
  useEffect(() => {
    if (isLoading || isSynthesizing || profile || autoSynthRef.current || !user?.id) return;
    autoSynthRef.current = true;
    (async () => {
      const { count } = await supabase
        .from('user_memory')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if ((count ?? 0) >= 3) {
        await synthesize();
      }
    })();
  }, [isLoading, isSynthesizing, profile, user?.id, synthesize]);

  // Submit feedback on a strength/weakness
  const submitFeedback = useCallback(
    async (feedbackType: FeedbackType, targetKey: string) => {
      if (!user?.id) return;
      try {
        await supabase.from('edge_feedback').insert({
          user_id: user.id,
          feedback_type: feedbackType,
          target_key: targetKey,
        });
        // Re-synthesize after feedback to update profile
        await synthesize();
      } catch (err) {
        console.error('Failed to submit edge feedback:', err);
      }
    },
    [user?.id, synthesize],
  );

  // Rate a generated action
  const rateAction = useCallback(
    async (actionId: string, rating: number) => {
      if (!user?.id) return;
      await supabase
        .from('edge_actions')
        .update({ user_rating: rating })
        .eq('id', actionId)
        .eq('user_id', user.id);
      await refresh();
    },
    [user?.id, refresh],
  );

  // Mark action as used (copied, exported, sent)
  const markActionUsed = useCallback(
    async (actionId: string) => {
      if (!user?.id) return;
      await supabase
        .from('edge_actions')
        .update({ was_used: true })
        .eq('id', actionId)
        .eq('user_id', user.id);
    },
    [user?.id],
  );

  // Derived state
  const hasProfile = !!profile && (profile.strengths.length > 0 || profile.weaknesses.length > 0);
  const topGap = profile?.intelligence_gaps?.[0] || null;
  const strengths = (profile?.strengths || []) as EdgeStrength[];
  const weaknesses = (profile?.weaknesses || []) as EdgeWeakness[];
  const intelligenceGaps = (profile?.intelligence_gaps || []) as IntelligenceGap[];

  return {
    profile,
    strengths,
    weaknesses,
    intelligenceGaps,
    topGap,
    hasProfile,
    recentActions,
    isLoading,
    isSynthesizing,
    refresh,
    synthesize,
    submitFeedback,
    rateAction,
    markActionUsed,
  };
}
