import { useMemo } from 'react';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import type { BetState, CockpitData, CockpitHero } from '@/types/cockpit';

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

  const data = useMemo<CockpitData>(() => {
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
        magnitude: null, // reaction-number backend not wired yet -> words lead
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
  }, [cases, alerts]);

  return { data, loading };
}
