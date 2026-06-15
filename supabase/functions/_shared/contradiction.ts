// Contradiction-resolution policy (CTRL Brain delta 3, locked decision #2).
// Pure + deterministic so it is unit-testable in isolation; the extract-user-context write
// path calls it when its LLM pass detects a true contradiction between a new fact and an
// existing one. Strategy by category:
//   - mutable facts (preference / objective / blocker), not high-stakes -> RECENCY WINS:
//     the newer statement supersedes the old (retire it; the close_validity_on_retire trigger
//     closes its valid_until). Never launders into a green verdict; just supersedes.
//   - high-stakes OR permanent-identity facts (identity / business) -> ASK USER:
//     keep the existing "flag the new fact high-stakes for verification" behaviour.

export type ContradictionStrategy = 'recency' | 'ask_user';

export interface ContradictionResolution {
  strategy: ContradictionStrategy;
  retireExisting: boolean; // supersede the old fact (recency wins)
  flagNew: boolean;        // mark the new fact high-stakes for user verification (ask user)
}

const MUTABLE_CATEGORIES = new Set(['preference', 'objective', 'blocker']);

export function resolveContradiction(
  newCategory: string,
  newIsHighStakes: boolean,
): ContradictionResolution {
  // High-stakes, or a permanent identity/business fact: never auto-retire - ask the user.
  if (newIsHighStakes || !MUTABLE_CATEGORIES.has(newCategory)) {
    return { strategy: 'ask_user', retireExisting: false, flagNew: true };
  }
  // Mutable fact: the more recent statement wins; supersede the old one.
  return { strategy: 'recency', retireExisting: true, flagNew: false };
}
