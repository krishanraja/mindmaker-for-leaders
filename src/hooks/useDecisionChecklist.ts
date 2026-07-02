import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/utils/edgeFunctionClient';

// decision_check_items is newer than the generated types; scope the looseness here (as useDecisionEngine does).
const db = supabase as unknown as SupabaseClient;

/** Normalized bullet text -> the stable per-item key (survives a re-advise that keeps the string). */
export const checkItemKey = (text: string) => text.trim().toLowerCase();

interface ChecklistState {
  /** item_key -> done. */
  checkState: Record<string, boolean>;
  doneCount: number;
  total: number;
  loaded: boolean;
  toggle: (itemText: string) => void;
  emailSummary: () => Promise<void>;
  emailing: boolean;
  emailSent: boolean;
  emailError: string | null;
}

/**
 * Persisted tick-state for a decision's "what to check next" bullets, plus the "email this to me"
 * send. The bullets are free-text strings on decision_cases.validate_next with no stable id, so the
 * row is keyed by the normalized bullet text (checkItemKey): a tick survives a re-advise that keeps
 * the same string, and a genuinely changed bullet is correctly a fresh, unchecked item.
 */
export function useDecisionChecklist(caseId: string | null, items: string[]): ChecklistState {
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Load existing tick-state for this case whenever the case changes.
  useEffect(() => {
    let active = true;
    setLoaded(false);
    setCheckState({});
    setEmailSent(false);
    setEmailError(null);
    if (!caseId) { setLoaded(true); return; }
    (async () => {
      const { data } = await db
        .from('decision_check_items')
        .select('item_key, done')
        .eq('decision_case_id', caseId);
      if (!active) return;
      const next: Record<string, boolean> = {};
      for (const r of (data ?? []) as Array<{ item_key: string; done: boolean }>) {
        next[r.item_key] = !!r.done;
      }
      setCheckState(next);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [caseId]);

  const toggle = useCallback((itemText: string) => {
    if (!caseId) return;
    const key = checkItemKey(itemText);
    const nextDone = !checkState[key];
    // Optimistic flip; roll back if the write fails.
    setCheckState((s) => ({ ...s, [key]: nextDone }));
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) { setCheckState((s) => ({ ...s, [key]: !nextDone })); return; }
      const { error } = await db
        .from('decision_check_items')
        .upsert(
          {
            user_id: userId,
            decision_case_id: caseId,
            item_key: key,
            item_text: itemText.slice(0, 500),
            done: nextDone,
            done_at: nextDone ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id,decision_case_id,item_key' },
        );
      if (error) setCheckState((s) => ({ ...s, [key]: !nextDone }));
    })();
  }, [caseId, checkState]);

  const emailSummary = useCallback(async () => {
    if (!caseId || emailing) return;
    setEmailing(true);
    setEmailError(null);
    setEmailSent(false);
    try {
      const { error } = await invokeEdgeFunction('send-decision-summary', { case_id: caseId });
      if (error) {
        setEmailError(error.message ?? 'Could not send the email.');
      } else {
        setEmailSent(true);
      }
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : 'Could not send the email.');
    } finally {
      setEmailing(false);
    }
  }, [caseId, emailing]);

  const doneCount = items.reduce((n, it) => (checkState[checkItemKey(it)] ? n + 1 : n), 0);

  return {
    checkState,
    doneCount,
    total: items.length,
    loaded,
    toggle,
    emailSummary,
    emailing,
    emailSent,
    emailError,
  };
}
