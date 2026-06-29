import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { NewsCategoryId } from '@/types/newsCategory';

// The cohort-anxiety prior for the news re-rank.
//
// `portfolio-pulse` returns the anonymised distribution of what leaders across
// the portfolio are grappling with (their MYMU q5 anxieties, categorised into
// the nine lanes). This surfaces the strongest couple of lanes as a GENTLE prior
// for a leader who has not tuned their own feed yet (the generic shared pool):
// "what your peers are wrestling with this week" nudges similar-importance
// stories up, never overriding a personal choice (see newsPriority.ts).
//
// Volume-guarded: below MIN_VOLUME the aggregate is noise, so we apply nothing.
// Empty set = the ranker is an exact identity, so this is safe before MYMU has
// real traffic.

const MIN_VOLUME = 8;
const TOP_N = 2;

interface PulseLane {
  lane: string;
  count: number;
}

export function usePortfolioPulse(): ReadonlySet<NewsCategoryId> {
  const [lanes, setLanes] = useState<ReadonlySet<NewsCategoryId>>(() => new Set());
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('portfolio-pulse');
        if (error || !data?.ok || (data.total ?? 0) < MIN_VOLUME) return;
        const top = (data.lanes as PulseLane[]).slice(0, TOP_N).map((l) => l.lane);
        if (active) setLanes(new Set(top as NewsCategoryId[]));
      } catch {
        // silent: no cohort signal just means the feed ranks as it did before
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return lanes;
}
