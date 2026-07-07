import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import type { PlayedOut, TrackRecordRow } from '@/types/track-record';

// The generated types don't yet include the brain RPCs; cast for the rpc calls.
const db = supabase as unknown as SupabaseClient;

// Session-scoped cache (module singleton, keyed by user) so a second mount of the
// track record (e.g. the Decisions tab AND its track-record header button on the
// same screen) paints instantly and does not double-fetch. Cleared on reload.
let trackRecordCache: { userId: string; records: TrackRecordRow[] } | null = null;

export function useTrackRecord() {
  const { user } = useAuth();
  const cacheHit = trackRecordCache && user?.id ? trackRecordCache.userId === user.id : false;
  const [records, setRecords] = useState<TrackRecordRow[]>(() => (cacheHit ? trackRecordCache!.records : []));
  const [loading, setLoading] = useState(!cacheHit);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!user?.id) {
      trackRecordCache = null;
      setRecords([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: fetchError } = await db.rpc('get_track_record', { p_user_id: user.id });
      if (fetchError) throw fetchError;
      const rows = (data as TrackRecordRow[]) ?? [];
      trackRecordCache = { userId: user.id, records: rows };
      setRecords(rows);
      setError(null);
    } catch (err) {
      console.error('Error fetching track record:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // The harvest: record how a decision played out. The RPC fires apply_outcome_to_brain
  // immediately, so the brain sharpens on the spot; we refetch to reflect the new state.
  const recordOutcome = useCallback(
    async (decisionCaseId: string, playedOut: PlayedOut, processQuality?: number) => {
      const { error: err } = await db.rpc('record_decision_outcome', {
        p_decision_case_id: decisionCaseId,
        p_played_out: playedOut,
        p_process_quality: processQuality ?? null,
        p_source: 'thumbs',
      });
      if (err) throw err;
      await refetch();
    },
    [refetch],
  );

  return { records, loading, error, refetch, recordOutcome };
}
