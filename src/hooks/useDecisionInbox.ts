import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Stage } from '@/hooks/useDecisionEngine';

const db = supabase as unknown as SupabaseClient;

export interface DecisionCaseSummary {
  id: string;
  title: string | null;
  statement: string;
  stage: Stage;
  status: string;
  decision_kind: string | null;
  confidence: number | null;
  created_at: string;
  last_verified_at: string | null;
  pinned_at: string | null;
}

export interface OpenAlert {
  id: string;
  decision_case_id: string;
  headline: string;
  detail: string | null;
  kind: string;
}

// Session-scoped cache (module singleton, survives route unmount/remount) so a
// return to a surface that reads the inbox paints its last data INSTANTLY and
// refreshes quietly in the background - no loading flash, no re-triggered Home
// globe. Cleared on a full page reload (e.g. auth change), which is the right scope.
let inboxCache: { cases: DecisionCaseSummary[]; alerts: OpenAlert[] } | null = null;

/**
 * The living decision inbox: recent decision cases plus any open watch alerts.
 * Powers the desktop command-centre rail and the in-app "an assumption broke"
 * moment. Acknowledging an alert clears it without losing the case.
 */
export function useDecisionInbox() {
  const [cases, setCases] = useState<DecisionCaseSummary[]>(() => inboxCache?.cases ?? []);
  const [alerts, setAlerts] = useState<OpenAlert[]>(() => inboxCache?.alerts ?? []);
  // Warm cache -> not loading (show cached, refresh in background); cold -> loading.
  const [loading, setLoading] = useState(() => inboxCache === null);

  const refresh = useCallback(async () => {
    const [{ data: caseRows }, { data: alertRows }] = await Promise.all([
      db.from('decision_cases').select('id, title, statement, stage, status, decision_kind, confidence, created_at, last_verified_at, pinned_at').order('created_at', { ascending: false }).limit(20),
      db.from('decision_alerts').select('id, decision_case_id, headline, detail, kind').eq('status', 'open').order('created_at', { ascending: false }),
    ]);
    const nextCases = (caseRows ?? []) as DecisionCaseSummary[];
    const nextAlerts = (alertRows ?? []) as OpenAlert[];
    inboxCache = { cases: nextCases, alerts: nextAlerts };
    setCases(nextCases);
    setAlerts(nextAlerts);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const acknowledge = useCallback(async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    await db.from('decision_alerts').update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() }).eq('id', alertId);
  }, []);

  return { cases, alerts, loading, refresh, acknowledge };
}
