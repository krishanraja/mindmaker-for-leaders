/**
 * useCapabilitySignals - gathers the observed-behaviour signals the capability
 * ladder (src/lib/capabilityLadder.ts) derives from. Every signal already
 * exists in owner-scoped tables; this hook only counts, it never tracks.
 *
 * One react-query key (~5 cheap queries, 5 min staleTime) so the You tab and
 * Home share a single fetch. If round trips ever matter this collapses into
 * one RPC without touching callers - CapabilitySignals is the seam.
 */
import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { buildTrackRecordModel } from '@/components/track-record/trackRecordModel';
import { deriveCapability, type CapabilityRead, type CapabilitySignals } from '@/lib/capabilityLadder';
import type { TrackRecordRow } from '@/types/track-record';

// Several of these tables/RPCs post-date the generated types; same scoped cast
// as useMemoryEdges / useTrackRecord.
const db = supabase as unknown as SupabaseClient;

async function gatherSignals(userId: string): Promise<CapabilitySignals> {
  const [factsRes, casesRes, callsRes, trackRes, skillsRes, mcpRes, prefsRes] = await Promise.all([
    db
      .from('user_memory')
      .select('fact_key, fact_category, fact_label, fact_value, verification_status')
      .eq('user_id', userId)
      .eq('is_current', true)
      .limit(200),
    db.from('decision_cases').select('id, status').eq('user_id', userId).limit(200),
    db.from('decision_user_calls').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.rpc('get_track_record', { p_user_id: userId }),
    db
      .from('generated_artifacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('kind', 'skill'),
    db.rpc('list_mcp_tokens'),
    db.from('news_preferences').select('boosted_categories').eq('user_id', userId).maybeSingle(),
  ]);

  // Facts: brain presence (same role/sector inference as useCockpit), the
  // leader-checked count (verified or corrected), voice profile presence.
  let role: string | null = null;
  let hasSector = false;
  let verifiedFactCount = 0;
  let hasVoiceProfile = false;
  for (const f of (factsRes.data ?? []) as {
    fact_key: string;
    fact_category: string;
    fact_label: string | null;
    fact_value: string | null;
    verification_status: string | null;
  }[]) {
    const v = (f.fact_value || '').trim();
    const l = (f.fact_label || '').toLowerCase();
    if (v && !role && (l.includes('role') || l.includes('title') || f.fact_category === 'identity')) role = v;
    if (v && !hasSector && (l.includes('sector') || l.includes('industry') || f.fact_category === 'business')) {
      hasSector = true;
    }
    if (f.verification_status === 'verified' || f.verification_status === 'corrected') verifiedFactCount += 1;
    if (f.fact_key === 'ctrl_voice_profile') hasVoiceProfile = true;
  }

  const cases = (casesRes.data ?? []) as { id: string; status: string | null }[];
  const trackRows = (trackRes.data ?? []) as TrackRecordRow[];
  const track = buildTrackRecordModel(trackRows);
  const mcpTokens = Array.isArray(mcpRes.data) ? mcpRes.data : [];
  const boosted = (prefsRes.data?.boosted_categories ?? []) as string[];

  return {
    hasBrain: !!(role || hasSector),
    verifiedFactCount,
    hasVoiceProfile,
    decisionCount: cases.length,
    decidedCount: cases.filter((c) => c.status === 'decided').length,
    bankedCallCount: callsRes.count ?? 0,
    playedOutCount: track.totalBanked,
    scoredCallCount: track.calibration.scored,
    skillCount: skillsRes.count ?? 0,
    mcpConnected: mcpTokens.length > 0,
    feedTuned: boosted.length > 0,
    role,
  };
}

export function useCapabilitySignals(): {
  capability: CapabilityRead | null;
  signals: CapabilitySignals | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['capability-signals', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    // Counts, not truth-critical: never throw a surface over a failed count.
    queryFn: () => gatherSignals(user!.id).catch(() => null),
  });

  const signals = query.data ?? null;
  return {
    capability: signals ? deriveCapability(signals) : null,
    signals,
    loading: query.isLoading,
  };
}
