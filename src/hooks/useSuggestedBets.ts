/**
 * useSuggestedBets
 *
 * Calls the `suggest-bets` edge function to fetch the candidate decisions
 * (open "bets") a leader likely faces, grounded strictly in their own captured
 * facts. Used by the onboarding "draft cockpit" step (chip-rail with
 * Keep / Swap / Not mine).
 *
 * Honest by construction: the edge function returns an empty `bets` array when
 * there is not enough real signal to ground a decision, so `bets.length === 0`
 * after a load is a valid, expected state (the UI shows the words-led empty
 * state rather than inventing bets).
 */

import { useState, useCallback } from 'react';
import { invokeEdgeFunction } from '@/lib/api';

export interface SuggestedBet {
  statement: string;
  rationale: string;
}

interface SuggestBetsResponse {
  bets: SuggestedBet[];
}

interface UseSuggestedBetsReturn {
  bets: SuggestedBet[];
  isLoading: boolean;
  /** True once a fetch has completed at least once (so callers can tell
   *  "not loaded yet" from "loaded, honestly empty"). */
  hasLoaded: boolean;
  error: string | null;
  /** Fetch (or re-fetch, for Swap) a fresh set of proposed bets. */
  suggest: () => Promise<SuggestedBet[]>;
}

export function useSuggestedBets(): UseSuggestedBetsReturn {
  const [bets, setBets] = useState<SuggestedBet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = useCallback(async (): Promise<SuggestedBet[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await invokeEdgeFunction<SuggestBetsResponse>(
        'suggest-bets',
        {},
        25_000,
      );
      const next = Array.isArray(result?.bets) ? result.bets : [];
      setBets(next);
      return next;
    } catch (err) {
      console.error('suggest-bets failed:', err);
      setError('Could not draft your cockpit just now.');
      setBets([]);
      return [];
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  return { bets, isLoading, hasLoaded, error, suggest };
}
