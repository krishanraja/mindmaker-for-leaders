import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import type { BetState, CockpitBlocker, CockpitData, CockpitHero, HeroMagnitude } from '@/types/cockpit';

const db = supabase as unknown as SupabaseClient;

// A claim's stored reaction (the honest, gated magnitude). null fields => words lead.
interface ClaimReaction {
  decision_case_id: string;
  is_load_bearing: boolean;
  reaction_value: string | null;
  reaction_descriptor: string | null;
  reaction_kind: 'sourced' | 'modelled' | null;
}

// Map a stored reaction to the hero magnitude. A sourced figure stands clean;
// only a modelled one carries the 'est.' mark (sanctity).
function toMagnitude(r: ClaimReaction | undefined): HeroMagnitude | null {
  if (!r || !r.reaction_value || !r.reaction_descriptor) return null;
  return { value: r.reaction_value, label: r.reaction_descriptor, kind: r.reaction_kind === 'modelled' ? 'est.' : '' };
}

// Honest mapping of an open watch-alert to a bet state. We only assert what the
// alert kind supports; an absent alert is QUIET. VALIDATED/green is never faked.
function stateFromAlertKind(kind: string | undefined): BetState {
  if (!kind) return 'quiet';
  if (kind === 'evidence_shifted') return 'explore';
  // assumption_broke | new_contradiction | anything else that fired => the bet was countered
  return 'countered';
}

/**
 * The mobile cockpit's data: the bets board (decision cases) + the day's hero
 * (the strongest open watch-alert). The hero leads with WORDS until the
 * reaction-number extraction backend supplies an honest magnitude - so it never
 * fabricates a figure (clearest-unit-first + honesty).
 */
export function useCockpit(): { data: CockpitData; loading: boolean } {
  const { cases, alerts, loading } = useDecisionInbox();
  const [reactions, setReactions] = useState<ClaimReaction[]>([]);
  const [topBlocker, setTopBlocker] = useState<CockpitBlocker | null>(null);

  // The contextual Edge pain-card: the leader's highest-importance blocker (if any).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await db
        .from('user_memory')
        .select('id, fact_label, fact_value')
        .eq('fact_category', 'blocker')
        .eq('is_current', true)
        .order('importance', { ascending: false, nullsFirst: false })
        .limit(1);
      if (cancelled || error) return;
      const row = (data as { id: string; fact_label: string; fact_value: string }[] | null)?.[0];
      setTopBlocker(row ? { id: row.id, label: row.fact_label, value: row.fact_value } : null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pull the gated reactions for the live cases (the hero's magnitude, when honest).
  const liveIds = useMemo(() => cases.filter((c) => c.status === 'active').map((c) => c.id), [cases]);
  const liveKey = liveIds.join(',');
  useEffect(() => {
    if (!liveIds.length) {
      setReactions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await db
        .from('decision_claims')
        .select('decision_case_id, is_load_bearing, reaction_value, reaction_descriptor, reaction_kind')
        .in('decision_case_id', liveIds)
        .not('reaction_value', 'is', null);
      if (!cancelled && !error) setReactions((data as ClaimReaction[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
    // liveKey captures the set of live case ids without re-running on array identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

  const data = useMemo<CockpitData>(() => {
    // a bet's hero magnitude = its strongest load-bearing claim's reaction
    const reactionByCase = new Map<string, ClaimReaction>();
    for (const r of reactions) {
      const cur = reactionByCase.get(r.decision_case_id);
      if (!cur || (r.is_load_bearing && !cur.is_load_bearing)) reactionByCase.set(r.decision_case_id, r);
    }
    // index the strongest (most recent) open alert per case
    const alertByCase = new Map<string, (typeof alerts)[number]>();
    for (const a of alerts) {
      if (!alertByCase.has(a.decision_case_id)) alertByCase.set(a.decision_case_id, a);
    }

    const live = cases.filter((c) => c.status === 'active');
    const bets = live.map((c) => {
      const alert = alertByCase.get(c.id);
      const state = stateFromAlertKind(alert?.kind);
      return {
        id: c.id,
        question: c.title || c.statement,
        state,
        freshness: alert ? 'needs your read' : 'no fresh signal',
      };
    });

    const needsYouCount = bets.filter((b) => b.state !== 'quiet').length;

    // hero = the strongest open alert hitting a live bet; else quiet; else cold.
    const topAlert = alerts.find((a) => live.some((c) => c.id === a.decision_case_id));
    let hero: CockpitHero;
    if (topAlert) {
      const bet = live.find((c) => c.id === topAlert.decision_case_id);
      hero = {
        kind: 'signal',
        category: null,
        headline: topAlert.headline,
        // honest magnitude when the pipeline supplied one; else words lead (the headline)
        magnitude: toMagnitude(reactionByCase.get(topAlert.decision_case_id)),
        betId: topAlert.decision_case_id,
        betQuestion: bet ? bet.title || bet.statement : null,
        betState: stateFromAlertKind(topAlert.kind),
      };
    } else if (bets.length > 0) {
      hero = { kind: 'quiet', headline: 'Nothing moved on your bets today.' };
    } else {
      hero = { kind: 'cold', headline: 'No live bets yet. Pressure-test a decision and it lands here.' };
    }

    return { hero, bets, liveCount: bets.length, needsYouCount };
  }, [cases, alerts, reactions]);

  return { data: { ...data, topBlocker }, loading };
}
