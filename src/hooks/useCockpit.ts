import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import { COLD_DECK } from '@/components/cockpit/coldDeck';
import type { BetState, CockpitBlocker, CockpitData, CockpitHero, DeckCard, HeroMagnitude, HomeState } from '@/types/cockpit';

const db = supabase as unknown as SupabaseClient;

// A briefing segment as the deck reads it (the curated, scored news item the
// briefing pipeline already produced). Read defensively from the jsonb column.
interface BriefingSeg {
  headline?: string;
  analysis?: string;
  framework_tag?: string | null;
  category?: string | null; // server-assigned news category (not populated yet)
  source?: string | null; // the publication, when the segment carries one
  time_ago?: string | null; // relative time, when the segment carries one
  magnitude?: { value?: string; kind?: 'sourced' | 'modelled' } | null;
}

// A real, dated, sourced article from the live-headlines edge function (Brave).
// This is what the Home deck now shows instead of cryptic curated lines.
interface LiveHeadline {
  id: string;
  headline: string;
  say: string | null;
  source: string | null;
  url: string;
  category: string | null;
  timeAgo: string | null;
}

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
export function useCockpit(): {
  data: CockpitData & { topBlocker: CockpitBlocker | null };
  loading: boolean;
  recordDeckReaction: (card: DeckCard, reaction: 'like' | 'dislike') => Promise<void>;
} {
  const { cases, alerts, loading } = useDecisionInbox();
  const [reactions, setReactions] = useState<ClaimReaction[]>([]);
  const [topBlocker, setTopBlocker] = useState<CockpitBlocker | null>(null);
  const [segments, setSegments] = useState<BriefingSeg[]>([]);
  const [liveHeadlines, setLiveHeadlines] = useState<LiveHeadline[]>([]);
  // Categories the leader has recently disliked on the deck -> down-weighted out
  // of the news half (the swipe trains the feed). Best-effort; empty on error.
  const [dislikedCats, setDislikedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await db
        .from('feedback')
        .select('feedback_text')
        .eq('user_id', user.id)
        .eq('page_context', 'cockpit-deck')
        .gte('created_at', since)
        .limit(200);
      if (cancelled || error || !data) return;
      const dis = new Set<string>();
      for (const row of data as { feedback_text: string }[]) {
        try {
          const p = JSON.parse(row.feedback_text) as { reaction?: string; category?: string };
          if (p.reaction === 'dislike' && p.category) dis.add(p.category);
        } catch { /* skip malformed */ }
      }
      setDislikedCats(dis);
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist a deck swipe (the like/dislike that trains the feed) to the feedback
  // table. Recorded as JSON so no new table/migration is needed; useCockpit reads
  // recent dislikes above to down-weight categories.
  const recordDeckReaction = useCallback(async (card: DeckCard, reaction: 'like' | 'dislike') => {
    if (reaction === 'dislike' && card.category) {
      setDislikedCats((prev) => new Set(prev).add(card.category!)); // optimistic
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await db.from('feedback').insert({
      user_id: user.id,
      user_email: user.email,
      feedback_text: JSON.stringify({ type: 'deck_reaction', card_kind: card.kind, category: card.category ?? null, headline: card.headline, reaction }),
      page_context: 'cockpit-deck',
      user_agent: navigator.userAgent,
    }).then(undefined, () => { /* best-effort */ });
  }, []);

  // Whether the leader has their OWN briefing yet (drives the cold/warm/rich
  // session state - personalization signal, not the deck content).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await db
        .from('briefings')
        .select('segments')
        .order('created_at', { ascending: false })
        .limit(1);
      if (cancelled || error) return;
      const row = (data as { segments?: BriefingSeg[] | null }[] | null)?.[0];
      setSegments(Array.isArray(row?.segments) ? row!.segments!.slice(0, 4) : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The deck's NEWS half: real, dated, sourced AI-native headlines (Brave via the
  // live-headlines fn, cached daily). This replaces the cryptic curated lines
  // with headlines the leader can actually open. Best-effort: on failure the deck
  // falls back to the bundled cold deck so Home is never empty.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('live-headlines');
        if (cancelled || error) return;
        const cards = (data as { cards?: LiveHeadline[] } | null)?.cards;
        if (Array.isArray(cards)) setLiveHeadlines(cards);
      } catch {
        /* keep empty -> the cold-deck fallback renders */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

    // ---- the "worth a look" deck: real live news + own signals (alerts) ----
    // The news half is now live, dated, sourced, openable headlines (Brave).
    const liveCards: DeckCard[] = liveHeadlines
      .filter((h) => h.headline && !(h.category && dislikedCats.has(h.category)))
      .map((h, i) => ({
        id: h.id || `live-${i}`,
        kind: 'news' as const,
        eyebrow: 'Worth a look',
        category: h.category ?? null,
        headline: h.headline.trim(),
        say: h.say ?? null,
        source: h.source ?? null,
        timeAgo: h.timeAgo ?? null,
        url: h.url ?? null,
      }));
    // Generic in-app deck only when the live feed is unavailable (offline/empty),
    // so Home is never blank.
    const generic = COLD_DECK.filter((c) => !(c.category && dislikedCats.has(c.category)));
    const newsCards: DeckCard[] = liveCards.length > 0 ? liveCards : generic;
    const signalCards: DeckCard[] = alerts
      .filter((a) => live.some((c) => c.id === a.decision_case_id))
      .slice(0, 3)
      .map((a) => {
        const bet = live.find((c) => c.id === a.decision_case_id);
        return {
          id: `sig-${a.id}`,
          kind: 'signal' as const,
          eyebrow: 'From your world',
          headline: a.headline,
          say: bet ? `On a call you are weighing: ${bet.title || bet.statement}` : 'A decision you are weighing just moved.',
          betId: a.decision_case_id,
        };
      });
    // interleave: lead with a personal signal when there is one, then alternate
    // news and signals so the deck feels both informed and personal. newsCards is
    // never empty (live headlines, or the cold-deck fallback), so Home is never blank.
    const woven: DeckCard[] = [];
    const maxLen = Math.max(newsCards.length, signalCards.length);
    for (let i = 0; i < maxLen; i++) {
      if (signalCards[i]) woven.push(signalCards[i]);
      if (newsCards[i]) woven.push(newsCards[i]);
    }
    const deck: DeckCard[] = woven;

    // Session-adaptive state, driven off REAL personalization volume (never
    // faked): the leader's OWN briefing + OWN signals. The live news half is the
    // industry read everyone gets, so it must NOT make a brand-new account look
    // "warm" - state keys off own-briefing, not the deck content.
    const ownSignals = signalCards.length;
    const hasOwnBriefing = segments.length > 0;
    let homeState: HomeState;
    if (!hasOwnBriefing && ownSignals === 0) homeState = 'cold';
    else if (hasOwnBriefing && ownSignals >= 2) homeState = 'rich';
    else homeState = 'warm';

    return {
      hero,
      bets,
      liveCount: bets.length,
      needsYouCount,
      deck: deck.slice(0, 7),
      homeState,
      ownSignalCount: ownSignals,
    };
  }, [cases, alerts, reactions, segments, liveHeadlines, dislikedCats]);

  return { data: { ...data, topBlocker }, loading, recordDeckReaction };
}
