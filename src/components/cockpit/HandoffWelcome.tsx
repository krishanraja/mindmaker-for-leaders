import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { handoffLensFor, handoffSignalSchema, type HandoffSignal } from './handoffLensModel';

// user_memory is not in the generated Supabase types; write through the
// untyped client like useInlineProfile does.
const db = supabase as unknown as SupabaseClient;

/**
 * The warm-handoff consumer (CTRL side of the portfolio hive mind).
 *
 * When a leader creates an account after public CTRL onboarding, the
 * URL carries `?h=<token>`. This resolves that consented, CATEGORISED signal
 * (an anxiety lane, never the raw q5) and stages a single honest confirmation:
 * "here's what I think is on your mind - want me to start there?" On yes, it
 * seeds ONE inferred blocker fact, so the feed and briefing start warm instead
 * of cold. Honours CTRL's honesty model: the fact is `inferred`, not `verified`,
 * and the leader confirms it before it lands. Self-dismissing, once per leader.
 */

const TOKEN_KEY = 'handoff_token';
const DONE_PREFIX = 'ctrl_handoff_done:';

type HandoffPhase = 'idle' | 'resolving' | 'ready';

function readToken(): string | null {
  try {
    const url = new URLSearchParams(window.location.search);
    return url.get('h') || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function completionKey(token: string): string {
  return `${DONE_PREFIX}${token}`;
}

function isComplete(token: string): boolean {
  try {
    return localStorage.getItem(completionKey(token)) === '1';
  } catch {
    return false;
  }
}

function removePendingToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export interface HandoffWelcomeState {
  phase: HandoffPhase;
  signal: HandoffSignal | null;
  saving: boolean;
  error: string | null;
  confirm: () => Promise<boolean>;
  dismiss: () => void;
}

/**
 * Resolve and persist the one-time onboarding handoff. Rendering stays in
 * FirstLens so this hook can fail open to the existing Home without mixing
 * network state into the visual component.
 */
export function useHandoffWelcome(onComplete?: () => void): HandoffWelcomeState {
  const { user } = useAuth();
  const [token] = useState<string | null>(() => readToken());
  const [phase, setPhase] = useState<HandoffPhase>(() => (token && !isComplete(token) ? 'resolving' : 'idle'));
  const [signal, setSignal] = useState<HandoffSignal | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setPhase('idle');
      return;
    }
    if (isComplete(token)) {
      removePendingToken();
      setPhase('idle');
      return;
    }
    if (!user?.id) return;

    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('resolve-handoff', {
          body: { token },
        });
        if (!active) return;
        if (!error && data?.ok) {
          if (data.signal) {
            const parsed = handoffSignalSchema.safeParse(data.signal);
            if (parsed.success) {
              setSignal(parsed.data);
              setPhase('ready');
              return;
            }
          }
          removePendingToken();
        }
        if (!error && data?.ok === false) removePendingToken();
        setPhase('idle');
      } catch {
        if (active) setPhase('idle');
      }
    })();
    return () => {
      active = false;
    };
  }, [token, user?.id]);

  const finish = useCallback(() => {
    if (!token) return;
    try {
      localStorage.setItem(completionKey(token), '1');
    } catch {
      /* private mode */
    }
    removePendingToken();
    setSignal(null);
    setError(null);
    setPhase('idle');
    onComplete?.();
  }, [onComplete, token]);

  const confirm = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !signal || saving) return false;
    setSaving(true);
    setError(null);
    const lens = handoffLensFor(signal);
    try {
      const confirmedContext = `Confirmed from CTRL onboarding (${signal.entryVariant ?? 'fork'}); lane ${signal.anxietyLane ?? 'unknown'}`;
      const facts = [
        {
          fact_key: 'handoff_focus', fact_category: 'blocker', fact_label: "What you're weighing",
          fact_value: lens.focusPhrase, fact_context: confirmedContext, verification_status: 'inferred', confidence_score: 0.75,
        },
        ...(signal.companyName || signal.companyDomain ? [{
          fact_key: 'company', fact_category: 'business', fact_label: 'Company',
          fact_value: signal.companyName ?? signal.companyDomain ?? '', fact_context: signal.companySummary ?? confirmedContext,
          verification_status: 'verified', confidence_score: 1,
        }] : []),
        ...(signal.roleTitle ? [{
          fact_key: 'role', fact_category: 'identity', fact_label: 'Role', fact_value: signal.roleTitle,
          fact_context: signal.companyName ? `At ${signal.companyName}. Confirmed during onboarding.` : confirmedContext,
          verification_status: 'verified', confidence_score: 1,
        }] : []),
        ...(signal.linkedinUrl ? [{
          fact_key: 'linkedin_url', fact_category: 'identity', fact_label: 'LinkedIn', fact_value: signal.linkedinUrl,
          fact_context: confirmedContext, verification_status: 'verified', confidence_score: 1,
        }] : []),
      ];

      for (const fact of facts) {
        const payload = {
          user_id: user.id,
          ...fact,
          source_type: 'enrichment',
          is_high_stakes: false,
          is_current: true,
        };
        const { data: existing, error: lookupError } = await db
          .from('user_memory')
          .select('id')
          .eq('user_id', user.id)
          .eq('fact_key', fact.fact_key)
          .eq('is_current', true)
          .limit(1)
          .maybeSingle();
        if (lookupError) throw lookupError;
        const write = existing?.id
          ? db.from('user_memory').update(payload).eq('id', existing.id).eq('user_id', user.id)
          : db.from('user_memory').insert(payload);
        const { error: writeError } = await write;
        if (writeError) throw writeError;
      }
    } catch {
      setError('I could not save that starting point. Try once more.');
      setSaving(false);
      return false;
    }
    setSaving(false);
    finish();
    return true;
  }, [finish, saving, signal, user?.id]);

  const dismiss = useCallback(() => {
    if (saving) return;
    finish();
  }, [finish, saving]);

  return useMemo(
    () => ({ phase, signal, saving, error, confirm, dismiss }),
    [confirm, dismiss, error, phase, saving, signal],
  );
}
