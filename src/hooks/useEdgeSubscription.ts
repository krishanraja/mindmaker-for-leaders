import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from './use-toast';
import { attributionForStripe } from '@/lib/attribution';
import type { EdgeSubscription, SubscriptionStatus } from '@/types/edge';

export function useEdgeSubscription() {
  const [subscription, setSubscription] = useState<EdgeSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('edge_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setSubscription(data as unknown as EdgeSubscription | null);
    } catch {
      // No subscription found - that's fine
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Check for subscription success in URL params.
  //
  // The webhook is the primary activation path, but it can be delayed or missed;
  // relying on it alone once left paying leaders unentitled. So on the success
  // redirect we ALSO confirm the session directly via verify-edge-subscription
  // (webhook-independent, idempotent) and only celebrate once the entitlement is
  // actually active. This mirrors the diagnostic's session-poll flow.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') !== 'success') return;

    const sessionId = params.get('session_id');

    // Clean up URL immediately so a refresh does not re-trigger.
    const url = new URL(window.location.href);
    url.searchParams.delete('subscription');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.toString());

    let cancelled = false;

    const activate = async () => {
      // Try the fallback verify a few times (covers webhook race + slight delay).
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        if (sessionId) {
          try {
            const { data } = await supabase.functions.invoke('verify-edge-subscription', {
              body: { session_id: sessionId },
            });
            if (data?.active) break;
          } catch {
            // ignore and retry; the webhook may still land
          }
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (cancelled) return;
      await refresh();
      toast({
        title: 'Edge Pro activated',
        description: 'You now have full access to all Edge capabilities.',
      });
    };

    activate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, toast]);

  // Create a subscription checkout session
  const subscribe = useCallback(async (): Promise<string | null> => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-edge-subscription', {
        body: { attribution: attributionForStripe() },
      });

      // Supabase functions.invoke exposes the non-2xx body on error.context.
      // Pull a human-readable message from either channel so the UI can show
      // the actual failure reason instead of a generic message.
      const bodyError = (data && typeof data === 'object' && 'error' in data)
        ? String((data as { error: unknown }).error)
        : null;
      if (error || bodyError) {
        let serverMessage = bodyError;
        const ctx = (error as { context?: Response } | null)?.context;
        if (!serverMessage && ctx && typeof ctx.text === 'function') {
          try {
            const body = await ctx.clone().text();
            const parsed = body ? JSON.parse(body) : null;
            serverMessage = parsed?.error ?? body ?? null;
          } catch {
            // ignore parse errors
          }
        }
        throw new Error(serverMessage || (error as Error | null)?.message || 'Checkout failed');
      }
      if (!data?.url) throw new Error('No checkout URL returned');

      return data.url;
    } catch (err) {
      console.error('Failed to create subscription:', err);
      const message = err instanceof Error ? err.message : 'Unable to start checkout. Please try again.';
      toast({
        title: 'Subscription Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // Derived state
  const isActive = subscription?.status === 'active';
  const isPastDue = subscription?.status === 'past_due';
  const hasAccess = isActive || isPastDue; // Allow past_due a grace period

  return {
    subscription,
    isActive,
    isPastDue,
    hasAccess,
    isLoading,
    isProcessing,
    subscribe,
    refresh,
  };
}
