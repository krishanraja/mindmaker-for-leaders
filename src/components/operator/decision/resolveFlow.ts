/**
 * resolveFlow - the pure logic behind the post-resolve moment. Kept out of the
 * panel component so the two behaviors that used to be buggy are pinned by unit
 * tests: which decision opens next (never the one just resolved, even when the
 * inbox list is stale), and the closure copy (chief-of-staff voice, no em dashes).
 */
import type { PlayedOut } from '@/types/track-record';
import type { DecisionCaseSummary } from '@/hooks/useDecisionInbox';

/**
 * The next decision to open after one leaves the rotation. Excludes the resolved
 * case defensively (the caller's list may still be a pre-refresh snapshot that
 * contains it), prefers the pinned case, else the newest. Null when none remain.
 */
export function nextActiveCase(
  cases: DecisionCaseSummary[],
  excludeId: string | null,
): DecisionCaseSummary | null {
  const remaining = cases.filter((c) => c.id !== excludeId);
  if (remaining.length === 0) return null;
  return remaining.find((c) => c.pinned_at) ?? remaining[0];
}

/** The closure-beat copy, keyed to how the leader said it played out. */
export function resolvedMomentCopy(playedOut: PlayedOut, resolvedCount: number): {
  headline: string;
  sub: string;
  record: string | null;
} {
  const sub = playedOut === 'true'
    ? 'A win on the record. I keep score on how your calls age.'
    : playedOut === 'false'
      ? 'Logged honestly. The record is what makes the next call sharper.'
      : 'Parked for now. I will flag it if the ground shifts.';
  return {
    headline: 'Closed. Into your history.',
    sub,
    record: resolvedCount > 0
      ? `That's ${resolvedCount} ${resolvedCount === 1 ? 'call' : 'calls'} on your record.`
      : null,
  };
}
