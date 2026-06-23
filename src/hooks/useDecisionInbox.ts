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

/**
 * The living decision inbox: recent decision cases plus any open watch alerts.
 * Powers the desktop command-centre rail and the in-app "an assumption broke"
 * moment. Acknowledging an alert clears it without losing the case.
 */
export function useDecisionInbox() {
  const [cases, setCases] = useState<DecisionCaseSummary[]>([]);
  const [alerts, setAlerts] = useState<OpenAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: caseRows }, { data: alertRows }] = await Promise.all([
      db.from('decision_cases').select('id, title, statement, stage, status, decision_kind, confidence, created_at, last_verified_at, pinned_at').order('created_at', { ascending: false }).limit(20),
      db.from('decision_alerts').select('id, decision_case_id, headline, detail, kind').eq('status', 'open').order('created_at', { ascending: false }),
    ]);
    setCases((caseRows ?? []) as DecisionCaseSummary[]);
    setAlerts((alertRows ?? []) as OpenAlert[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const acknowledge = useCallback(async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    await db.from('decision_alerts').update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() }).eq('id', alertId);
  }, []);

  return { cases, alerts, loading, refresh, acknowledge };
}
