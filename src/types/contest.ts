// "Contest this" - the leader can always overrule, and the brain learns.
// Locked rule: docs design-log "Contest this" (Krish 2026-06-15).

// The three kinds, picked in the sheet. Visual/functional are operational bug
// reports; factual is a product/brain signal honored live.
export type ContestKind = 'visual' | 'functional' | 'factual';

export type ContestTargetType = 'decision_claim' | 'memory_fact' | 'market_read' | 'ui_element';

// What is being contested - auto-captured by the long-press so the user barely types.
export interface ContestTarget {
  target_type: ContestTargetType;
  target_id?: string | null;
  surface?: string; // route the user is on
  element?: string; // human label of the contested element
}

export interface ContestResult {
  report_id: string;
  honored: boolean; // a live brain effect was applied (factual on own decision claim)
  verdict: string | null; // the claim's new verdict when honored ('contested')
}

export const CONTEST_KINDS: { value: ContestKind; label: string; hint: string }[] = [
  { value: 'factual', label: 'This is wrong', hint: 'A claim, number or fact is off' },
  { value: 'visual', label: 'Looks wrong', hint: 'A visual or layout glitch' },
  { value: 'functional', label: "Didn't work", hint: 'Something is broken or errored' },
];

// Only a factual contest on a verifiable claim can be honored live + fed to the brain.
export function canHonorLive(kind: ContestKind, target: ContestTarget | null): boolean {
  return kind === 'factual' && target?.target_type === 'decision_claim' && !!target.target_id;
}
