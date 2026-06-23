import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as SupabaseClient;

export interface PinnedDecision {
  id: string;
  title: string | null;
  statement: string;
  reframed_statement: string | null;
}

// Words too common to signal that a headline is about the pinned decision.
const STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'you', 'our', 'are',
  'will', 'can', 'has', 'have', 'was', 'were', 'their', 'them', 'they', 'about', 'over', 'than',
  'how', 'why', 'what', 'when', 'who', 'which', 'should', 'could', 'would', 'into', 'onto',
  'a', 'an', 'to', 'of', 'in', 'on', 'at', 'or', 'is', 'it', 'be', 'as', 'by', 'we', 'us',
  'more', 'most', 'less', 'new', 'now', 'get', 'got', 'use', 'using', 'make', 'making',
  'ai', 'tech', 'company', 'business', 'product', 'team', 'market', 'data',
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9+.-]{2,}/g) ?? []).filter((w) => !STOP.has(w));
}

/**
 * The ONE pinned decision for the current user (enforced single-pin: the row
 * where pinned_at is not null). Exposes a lightweight relevance test so news
 * cards can quietly flag a headline that touches the pinned decision, and a
 * pin() action (the pin_decision RPC atomically moves the pin).
 */
export function usePinnedDecision() {
  const [pinned, setPinned] = useState<PinnedDecision | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) { setPinned(null); setKeywords([]); setLoading(false); return; }

    const { data: rows } = await db
      .from('decision_cases')
      .select('id, title, statement, reframed_statement')
      .eq('user_id', user.id)
      .not('pinned_at', 'is', null)
      .limit(1);
    const p = (rows?.[0] ?? null) as PinnedDecision | null;
    setPinned(p);

    if (p) {
      const { data: claimRows } = await db
        .from('decision_claims')
        .select('text')
        .eq('decision_case_id', p.id)
        .eq('is_load_bearing', true)
        .limit(12);
      const claimText = ((claimRows ?? []) as { text: string }[]).map((c) => c.text).join(' ');
      const subject = `${p.title ?? ''} ${p.statement} ${p.reframed_statement ?? ''} ${claimText}`;
      setKeywords([...new Set(tokenize(subject))]);
    } else {
      setKeywords([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const pin = useCallback(async (caseId: string) => {
    await db.rpc('pin_decision', { p_case_id: caseId });
    await refresh();
  }, [refresh]);

  // True when a headline shares at least two significant words with the pinned
  // decision's subject - enough signal to surface a quiet "relevant" chip
  // without false positives from a single shared common word.
  const matchesHeadline = useCallback((text: string): boolean => {
    if (keywords.length === 0 || !text) return false;
    const toks = new Set(tokenize(text));
    let hits = 0;
    for (const k of keywords) {
      if (toks.has(k)) { hits += 1; if (hits >= 2) return true; }
    }
    return false;
  }, [keywords]);

  return { pinned, loading, pin, matchesHeadline, refresh };
}
