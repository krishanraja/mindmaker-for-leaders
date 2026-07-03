import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import { useNewsPreferences } from '@/hooks/useNewsPreferences';
import { usePortfolioPulse } from '@/hooks/usePortfolioPulse';
import { rankByPreferences, rankPersonalized } from '@/lib/newsPriority';
import { isOffLensHeadline } from '@/lib/newsLens';
import { markHomeReady } from '@/lib/bootGate';
import { roleFitByCategory } from '@/lib/roleArchetype';
import { COLD_DECK } from '@/components/cockpit/coldDeck';
import { reserveForCategories } from '@/components/cockpit/laneReserve';
import { cacheHeadlines } from '@/components/system/loadingLines';
import { pickStarterDecision } from '@/lib/starterDecisions';
import type { NewsCategoryId } from '@/types/newsCategory';
import type { BetState, CockpitBlocker, CockpitData, CockpitHero, DeckCard, HeroMagnitude, HomeState, UserLifecycleState, UserPosture } from '@/types/cockpit';

const db = supabase as unknown as SupabaseClient;

// A leader with history but no activity in this many days reads as DORMANT - led
// back in with the guide posture (a re-kickstart), not treated as a power user.
const DORMANT_AFTER_DAYS = 14;

// Normalize a headline into a dedup key: lowercase, strip punctuation + outlet
// suffixes, collapse whitespace, keep the first ~10 significant words. So two
// near-identical headlines (different outlet, trailing " | Source", minor
// punctuation) collapse to the same key and never both appear in the deck.
function normalizeHeadlineKey(headline: string | null | undefined): string {
  if (!headline) return '';
  return headline
    .toLowerCase()
    .replace(/\s*[|\u2013\u2014-]\s*[^|\u2013\u2014-]{1,30}$/u, '') // drop a trailing " | outlet" tail
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 10)
    .join(' ');
}

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
  pov?: string | null; // opinionated lens-driven take (only when the lens is on)
  source: string | null;
  corroboration?: string | null; // "+2 sources" when multiple outlets agree
  url: string;
  category: string | null;
  timeAgo: string | null;
  score?: number | null; // server importance, for client re-ranking by prefs
  sourceCount?: number | null; // corroboration depth (used by the "big moves" bias)
  benchmark?: {
    model: string;
    intelligenceIndex: number | null;
    pricePer1m: number | null;
    rank: number | null;
  } | null;
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
  /** Re-pull the brain-dependent data (gate, identity, briefing, headlines).
      Called after the inline onboarding saves facts, so Home clears the gate
      and flips out of the NEW state without a full reload. */
  reload: () => void;
} {
  const { cases, alerts, loading: inboxLoading, refresh: refreshInbox } = useDecisionInbox();
  // Bumped by `reload()` to re-run the brain-dependent fetches below.
  const [reloadKey, setReloadKey] = useState(0);
  const { preferences } = useNewsPreferences();
  // The cohort-anxiety prior (portfolio hive mind): the lanes the wider set of
  // leaders is grappling with right now, used as a GENTLE tie-breaker for a leader
  // who has not tuned their own feed yet. Volume-guarded + empty-safe (identity).
  const zeitgeist = usePortfolioPulse();
  const [reactions, setReactions] = useState<ClaimReaction[]>([]);
  const [topBlocker, setTopBlocker] = useState<CockpitBlocker | null>(null);
  const [segments, setSegments] = useState<BriefingSeg[]>([]);
  // When the leader's latest briefing was generated (ms epoch) - a dormancy
  // signal. null = no briefing on record.
  const [briefedAt, setBriefedAt] = useState<number | null>(null);
  const [liveHeadlines, setLiveHeadlines] = useState<LiveHeadline[]>([]);
  // Whether the live-headlines fetch has settled (resolved OR errored). We keep
  // the skeleton up until it has, so Home does not flash the bundled cold deck
  // first and then swap to the real live cards (the "flashes content then
  // reloads" glitch). The cold deck remains the fallback only when the fetch
  // genuinely fails.
  const [headlinesSettled, setHeadlinesSettled] = useState(false);
  // Whether the server already personalized the feed (scored it against the
  // brain). When true the client must NOT re-rank - the order is authoritative.
  const [serverPersonalized, setServerPersonalized] = useState(false);
  // Profile gate: the server asked the leader to complete their brain first.
  const [needsProfile, setNeedsProfile] = useState(false);
  const [missingProfile, setMissingProfile] = useState<string[]>([]);
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

  // The leader's role + sector, inferred from facts they already gave us (never
  // re-asked), so the feed can score lanes by suitability to THEIR job/business
  // (src/lib/roleArchetype.ts). Best-effort; neutral fit on any miss.
  const [roleSector, setRoleSector] = useState<{ role: string | null; sector: string | null }>({ role: null, sector: null });
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await db
        .from('user_memory')
        .select('fact_category, fact_label, fact_value')
        .eq('user_id', user.id)
        .in('fact_category', ['identity', 'business'])
        .eq('is_current', true)
        .limit(20);
      if (cancelled || error || !data) return;
      let role: string | null = null;
      let sector: string | null = null;
      for (const f of data as { fact_category: string; fact_label: string; fact_value: string }[]) {
        const v = (f.fact_value || '').trim();
        if (!v) continue;
        const l = (f.fact_label || '').toLowerCase();
        if (!role && (l.includes('role') || l.includes('title') || f.fact_category === 'identity')) role = v;
        if (!sector && (l.includes('sector') || l.includes('industry') || f.fact_category === 'business')) sector = v;
      }
      if (!cancelled) setRoleSector({ role, sector });
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

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
        .select('segments, created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      if (cancelled || error) return;
      const row = (data as { segments?: BriefingSeg[] | null; created_at?: string | null }[] | null)?.[0];
      setSegments(Array.isArray(row?.segments) ? row!.segments!.slice(0, 4) : []);
      const ts = row?.created_at ? Date.parse(row.created_at) : NaN;
      setBriefedAt(Number.isNaN(ts) ? null : ts);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // The deck's NEWS half: real, dated, sourced AI-native headlines (Brave via the
  // live-headlines fn, cached daily). This replaces the cryptic curated lines
  // with headlines the leader can actually open. Best-effort: on failure the deck
  // falls back to the bundled cold deck so Home is never empty.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('live-headlines');
        if (cancelled) return;
        if (!error) {
          const res = data as { cards?: LiveHeadline[]; status?: string; missing?: string[]; personalized?: boolean } | null;
          if (res?.status === 'needs_profile') {
            // Below the profile gate: Home will prompt to unlock instead of
            // showing headlines. Keep the deck empty.
            setNeedsProfile(true);
            setMissingProfile(Array.isArray(res.missing) ? res.missing : []);
            setLiveHeadlines([]);
          } else {
            setNeedsProfile(false);
            setServerPersonalized(res?.personalized === true);
            const cards = res?.cards;
            if (Array.isArray(cards)) {
              setLiveHeadlines(cards);
              // Stash the real headlines so the NEXT load's GlobeLoader can
              // preview them in its rotation (loadingLines.ts).
              cacheHeadlines(cards.map((c) => c.headline).filter(Boolean));
            }
          }
        }
      } catch {
        /* keep empty -> the cold-deck fallback renders */
      } finally {
        // Settled (success OR failure): release the skeleton. On failure the
        // cold-deck fallback renders, so Home is still never blank.
        if (!cancelled) setHeadlinesSettled(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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
    // The shared headline pool (live-headlines) is re-ranked into THIS leader's
    // feed by their selected priorities (lifted lanes + scan bias) before it is
    // mapped to cards, so the most relevant stories lead. Neutral prefs leave the
    // server's world-importance order intact.
    // When the server already scored the feed against the brain, its order is
    // authoritative - the client must not re-rank (that would fight the engine).
    // Only the generic shared pool gets the local preference re-rank.
    const filtered = liveHeadlines.filter(
      (h) =>
        h.headline &&
        !(h.category && dislikedCats.has(h.category)) &&
        // Defensive off-lens drop (mirrors the server gate) so a pre-change
        // cached row can't surface bio/science/crypto news for the rest of today.
        !isOffLensHeadline(`${h.headline} ${h.say ?? ''}`),
    );
    // Suitability of each lane to THIS leader's job + business (role archetype +
    // industry), inferred from facts we already hold. Sharpens the order within
    // a chosen lane (a CFO's economics over product; a CTO's tools over model).
    const fit = roleFitByCategory(roleSector.role, roleSector.sector);
    // Tune re-ranks the deck so a chosen lane LEADS (dominates, not a gentle
    // lift), the scan bias orders within, and role fit breaks the rest. On the
    // generic shared pool we rank over the server importance score; on an
    // already-personalized feed we keep the server order as the spine. Neutral
    // prefs leave either order untouched.
    const ranked = serverPersonalized
      ? rankPersonalized(filtered, preferences, fit, zeitgeist)
      : rankByPreferences(filtered, preferences, fit, zeitgeist);
    const liveCards: DeckCard[] = ranked.map((h, i) => ({
      id: h.id || `live-${i}`,
      kind: 'news' as const,
      eyebrow: 'Worth a look',
      category: h.category ?? null,
      headline: h.headline.trim(),
      say: h.say ?? null,
      pov: h.pov ?? null,
      source: h.source ?? null,
      corroboration: h.corroboration ?? null,
      timeAgo: h.timeAgo ?? null,
      url: h.url ?? null,
      benchmark: h.benchmark ?? null,
    }));
    // Generic in-app deck only when the live feed is unavailable (offline/empty),
    // so Home is never blank. EXCEPT below the profile gate: then the deck is
    // deliberately empty so Home shows the "unlock" prompt rather than headlines.
    const generic = COLD_DECK.filter((c) => !(c.category && dislikedCats.has(c.category)));
    const newsCards: DeckCard[] = needsProfile ? [] : liveCards.length > 0 ? liveCards : generic;

    // Home is a CURATED, PERSONALIZED NEWS FEED - real-world headlines, never
    // dialogue about the leader's own decisions. Watch-alerts ("an assumption
    // just weakened") are NOT headlines; they live in the Decisions tab and are
    // never cards here. So the deck is news only, with a defensive de-dup so a
    // near-identical headline can never appear twice (clustering runs
    // server-side; this is the belt-and-braces guarantee against duplicates).
    const seenKeys = new Set<string>();
    const deck: DeckCard[] = [];
    for (const c of newsCards) {
      const key = normalizeHeadlineKey(c.headline) || c.url || c.id;
      if (key && seenKeys.has(key)) continue;
      if (key) seenKeys.add(key);
      deck.push(c);
    }

    // Filter-forward with a GUARANTEED FLOOR OF 3. When the leader narrows to a
    // lane, show that lane PURE - "I picked economics, so my feed is economics".
    // If the live pool is thin in that lane that day, top up with ON-TOPIC
    // evergreen reserve cards (ordered by role fit), never off-topic filler, so
    // the lane always reaches >=3. An empty lane falls back to the reserve too
    // (so it is still on-topic, not the generic feed).
    const LANE_MIN = 3;
    let shown = deck;
    if (preferences.boosted.length > 0) {
      const boostedSet = new Set<string>(preferences.boosted);
      const realLane = deck.filter((c) => c.category != null && boostedSet.has(c.category));
      if (realLane.length >= LANE_MIN) {
        shown = realLane; // pure, already role-ordered
      } else {
        // Top up on-topic from the reserve, skipping anything already shown.
        const usedKeys = new Set(realLane.map((c) => normalizeHeadlineKey(c.headline) || c.url || c.id));
        const backfill = reserveForCategories(
          preferences.boosted as NewsCategoryId[],
          fit,
          LANE_MIN - realLane.length,
          (c) => usedKeys.has(normalizeHeadlineKey(c.headline) || c.url || c.id),
        );
        shown = [...realLane, ...backfill];
        // Safety net: if the reserve somehow could not fill it, top up with the
        // best of the rest so the feed is never below the floor.
        if (shown.length < LANE_MIN) {
          const rest = deck.filter((c) => !(c.category != null && boostedSet.has(c.category)));
          shown = [...shown, ...rest].slice(0, LANE_MIN);
        }
      }
    }

    // Personalization VOLUME still drives the adaptive copy (it is real, not
    // faked, and not shown as cards): how much of the leader's own world is live.
    const ownSignals = new Set(
      alerts.filter((a) => live.some((c) => c.id === a.decision_case_id)).map((a) => a.decision_case_id),
    ).size;
    const hasOwnBriefing = segments.length > 0;
    let homeState: HomeState;
    if (!hasOwnBriefing && ownSignals === 0) homeState = 'cold';
    else if (hasOwnBriefing && ownSignals >= 2) homeState = 'rich';
    else homeState = 'warm';

    // ---- lifecycle state + posture (the founder's adaptive spine) ----
    // A real brain = the leader has told us their role/sector (the identity facts
    // the feed personalizes on). History = a brain, a briefing, or any decision.
    const hasBrain = !!(roleSector.role || roleSector.sector);
    const hasHistory = hasBrain || hasOwnBriefing || cases.length > 0;
    // lastActiveAt = the most recent real touch we can see client-side (newest
    // decision OR newest briefing). null when there is simply no activity yet.
    const newestCaseAt = cases.reduce<number>((max, c) => {
      const t = c.created_at ? Date.parse(c.created_at) : NaN;
      return Number.isNaN(t) ? max : Math.max(max, t);
    }, 0);
    const lastActiveAt = Math.max(newestCaseAt, briefedAt ?? 0) || null;
    const dormant =
      hasHistory &&
      lastActiveAt != null &&
      Date.now() - lastActiveAt > DORMANT_AFTER_DAYS * 24 * 3600 * 1000;

    let userState: UserLifecycleState;
    if (!hasBrain && cases.length === 0) userState = 'new';
    else if (dormant) userState = 'dormant';
    else if (homeState === 'rich') userState = 'power';
    else userState = 'active';

    // Posture: lead with a kickstart whenever there is no live decision in play
    // (NEW, just-onboarded-but-not-yet-weighed, or DORMANT). Only a leader who is
    // actively moving decisions AND not lapsed gets the partner posture.
    const posture: UserPosture = bets.length > 0 && !dormant ? 'partner' : 'guide';

    // In the guide posture, the Home LEAD is a kickstart: a real first/next
    // decision to weigh, tailored to the leader's role, routed into the engine
    // with a prefill. It is never a news headline (the deck stays pure news);
    // it rides on TOP of the deck as deck[0]. Dormant leaders get a re-kickstart.
    const starter = pickStarterDecision(roleSector.role);
    const kickstart: DeckCard | null =
      posture === 'guide'
        ? {
            id: 'kickstart-decision',
            kind: 'kickstart',
            eyebrow: userState === 'dormant' ? 'Pick your thinking back up' : 'Start here',
            headline: starter,
            say:
              userState === 'dormant'
                ? "It's been a while. Weigh a fresh call and I'll watch it for you as the ground shifts."
                : "Weigh your first real decision. I'll stress-test it against the evidence, not just agree with you.",
            route: '/decision',
            prefill: starter,
          }
        : null;
    const deckOut = kickstart ? [kickstart, ...shown.slice(0, 7)] : shown.slice(0, 8);

    return {
      hero,
      bets,
      liveCount: bets.length,
      needsYouCount,
      deck: deckOut,
      homeState,
      ownSignalCount: ownSignals,
      userState,
      posture,
      leaderRole: roleSector.role,
      leaderSector: roleSector.sector,
    };
  }, [cases, alerts, reactions, segments, briefedAt, liveHeadlines, dislikedCats, preferences, zeitgeist, serverPersonalized, needsProfile, roleSector]);

  // Hold the skeleton until BOTH the decision inbox and the first live-headlines
  // fetch have settled, so Home renders its real deck once instead of flashing
  // the cold deck and then swapping (the glitchy reload feel).
  const loading = inboxLoading || !headlinesSettled;

  // On a cold Home landing, release the boot splash overlay only once this first
  // load has settled, so the full app load is icon+wheel -> content with no
  // globe loader in between (src/lib/bootGate.ts). No-op after the first load.
  useEffect(() => {
    if (!loading) markHomeReady();
  }, [loading]);

  const reload = useCallback(() => {
    setHeadlinesSettled(false);
    setReloadKey((k) => k + 1);
    void refreshInbox();
  }, [refreshInbox]);

  return { data: { ...data, topBlocker, needsProfile, missingProfile }, loading, recordDeckReaction, reload };
}
