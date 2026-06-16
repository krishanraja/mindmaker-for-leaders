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

export interface CockpitData {
  hero: CockpitHero;
  bets: CockpitBet[];
  liveCount: number;
  needsYouCount: number;
  topBlocker?: CockpitBlocker | null;
}
