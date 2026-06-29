import { useCallback, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as SupabaseClient;

export interface InlineProfileInput {
  industry?: string;
  role?: string;
}

/**
 * The lightweight inline-onboarding write path. Captures the two gate-critical
 * identity facts (industry + role) DIRECTLY into `user_memory` - no LLM
 * extraction, no 40-minute interview. RLS is owner-scoped, so a plain
 * authenticated upsert is safe and instant.
 *
 * The fact_keys + categories are exactly what BOTH the server profile gate
 * (`brain-profile.ts` computeCompleteness, via `getUserContext`) and the client
 * role/sector inference (`useCockpit`) read:
 *   industry -> fact_key 'industry', category 'business'
 *   role     -> fact_key 'role',     category 'identity'
 * They are written verification_status='verified' (the leader declared them) so
 * they count immediately. Prior current rows for the same key are superseded
 * (the table's temporal-versioning model), never duplicated.
 *
 * After the facts land, `infer-briefing-interests` is fired best-effort so the
 * ≥3-interest half of the gate often clears with no further taps.
 */
export function useInlineProfile() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveFacts = useCallback(async (input: InlineProfileInput): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const industry = input.industry?.trim();
      const role = input.role?.trim();
      const rows: Array<{ fact_key: string; fact_category: string; fact_label: string; fact_value: string }> = [];
      if (industry) rows.push({ fact_key: 'industry', fact_category: 'business', fact_label: 'Industry', fact_value: industry });
      if (role) rows.push({ fact_key: 'role', fact_category: 'identity', fact_label: 'Your role', fact_value: role });
      if (rows.length === 0) return true;

      const keys = rows.map((r) => r.fact_key);
      // Supersede any existing current rows for these keys (temporal versioning),
      // so we replace rather than stack duplicates.
      await db
        .from('user_memory')
        .update({ is_current: false })
        .eq('user_id', user.id)
        .eq('is_current', true)
        .in('fact_key', keys);

      const { error: insErr } = await db.from('user_memory').insert(
        rows.map((r) => ({
          ...r,
          user_id: user.id,
          source_type: 'form',
          verification_status: 'verified',
          confidence_score: 1.0,
          is_current: true,
        })),
      );
      if (insErr) throw insErr;

      // Auto-seed interests from the now-known industry/role so the gate's
      // interest floor often clears without extra taps. Best-effort, fire-and-forget.
      void supabase.functions.invoke('infer-briefing-interests').then(undefined, () => { /* best-effort */ });

      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { saveFacts, saving, error };
}
