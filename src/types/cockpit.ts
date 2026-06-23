// The mobile cockpit = home. Daily read (hero) + your bets board.
// Locked: docs design-log "Cockpit REPLACES the mobile home in v1" (Krish 2026-06-15).

// Honest signal-state per bet. We only assert what the data supports:
// an open alert => the bet moved (countered/explore); no alert => quiet.
// (VALIDATED/green needs a positive-signal classifier we don't have yet - never faked.)
export type BetState = 'countered' | 'explore' | 'quiet';

export interface CockpitBet {
  id: string;
  question: string; // the bet, in the leader's words
  state: BetState;
  freshness: string; // "cost moved 6d ago" | "no fresh signal"
}

// A soft (modelled) magnitude for the hero. Present ONLY when the pipeline has a
// real figure; until the reaction-number extraction backend lands, the hero leads
// with words (headline) and magnitude is undefined (clearest-unit-first + honesty).
export interface HeroMagnitude {
  value: string; // "~40%", "10x"
  label: string; // "cheaper to rent than build"
  kind: string; // soft-number mark: "est." | "modelled"
}

export type HeroKind = 'signal' | 'quiet' | 'cold';

export interface CockpitHero {
  kind: HeroKind;
  category?: string | null; // PRICING, COMPETITOR, ...
  headline: string; // the words read (always present)
  magnitude?: HeroMagnitude | null; // only where a real number is honest
  betId?: string | null;
  betQuestion?: string | null;
  betState?: BetState | null;
}

// A declared pain, surfaced as the contextual Edge upsell (pain -> Claude skill).
// Present only when the leader actually has a blocker on record (never invented).
export interface CockpitBlocker {
  id: string;
  label: string;
  value: string;
}

// ---- the "worth a look" deck (the new Home hero) -------------------------
// Locked 2026-06-17 (design-log): Home opens with a swipeable deck of a few
// "worth a look" cards - a MIX of broad AI news (from the briefing pipeline) +
// the leader's own signals (a decision moved, the brain learned). Plain
// language; swipe to skip / like to train the feed. Replaces the cryptic
// single hero. The pinned-decision deep-dive lives in the Decisions tab.
export type DeckCardKind = 'news' | 'signal';

// One of the nine locked AI-native news categories (src/types/newsCategory.ts).
// When present + valid it drives the headline card's branded motif directly;
// when absent the card classifies its own category from the text (the keyword
// fallback in resolveNewsCategory). NOTE: not populated server-side yet - see
// TODO(news-pipeline) in newsCategory.ts.
import type { NewsCategoryId } from './newsCategory';

// Artificial Analysis ground-truth attached to a model-about news card: an
// independent, numeric cross-check that validates the story. Enrichment only -
// never its own card.
export interface NewsBenchmark {
  model: string;
  intelligenceIndex: number | null;
  pricePer1m: number | null;
  rank: number | null;
}

export interface DeckCard {
  id: string;
  kind: DeckCardKind; // news = from the world (briefing); signal = from your world
  eyebrow: string; // "Worth a look" | "From your world"
  category?: NewsCategoryId | string | null; // one of the 9 category ids (news); free-text tolerated for older rows
  headline: string; // the plain, simple read
  say?: string | null; // one plain line of why-it-matters-to-you
  // a soft (modelled) or sourced figure, only when the source honestly has one
  magnitude?: { value: string; kind: 'sourced' | 'modelled' } | null;
  source?: string | null; // the publication, for the meta row (news only)
  // how many independent sources reported the story, e.g. "+2 sources" (news
  // only). The cross-verification trust signal; null when a single source.
  corroboration?: string | null;
  timeAgo?: string | null; // relative time, e.g. "2h ago" (news only)
  // a real, dated article link (live news cards). Tapping the card opens it.
  url?: string | null;
  // routing: a signal card may deep-link to the decision it refers to
  betId?: string | null;
  // independent Artificial Analysis benchmark cross-check, present only on news
  // cards that name a specific model it tracks (validates the story).
  benchmark?: NewsBenchmark | null;
}

// The session-adaptive Home state, derived off REAL data volume (never faked):
//  cold = a brand-new leader, no own briefing/signals yet (generic orientation deck)
//  warm = some personalization: interests tuned in, own signals woven
//  rich = a real briefing + 2+ own signals: dense triage
export type HomeState = 'cold' | 'warm' | 'rich';

export interface CockpitData {
  hero: CockpitHero;
  bets: CockpitBet[];
  liveCount: number;
  needsYouCount: number;
  deck: DeckCard[];
  topBlocker?: CockpitBlocker | null;
  // session state + own-signal volume, for the adaptive Home shell.
  homeState: HomeState;
  ownSignalCount: number;
}
