// Starter decisions any leader is likely weighing, lightly tailored by role.
// One shared source so the Decision Map empty state, the Home guidance kickstart,
// and the re-activation nudge email all propose the SAME on-topic first calls
// (no divergent hard-coded copies). Always AI-native, always real decisions a
// leader can actually weigh in one tap from a blank page.

const BUILD = 'Should we build our own AI agents, or buy off the shelf?';
const OFFLOAD = 'Where should AI take work off my team first?';
const VENDOR = 'Which AI vendor should we standardise the company on?';

export const STARTER_DECISIONS: readonly string[] = [BUILD, OFFLOAD, VENDOR];

/**
 * Order the starters by fit to the leader's role (read from the brain). The set
 * is unchanged - every option is on-topic for any leader - only the lead shifts
 * so the most relevant call is offered first. Generic order when role is unknown.
 */
export function starterDecisionsFor(role?: string | null): string[] {
  const r = (role ?? '').toLowerCase();
  let lead = OFFLOAD;
  if (/cto|engineer|technolog|developer|\bdev\b|product|\bcpo\b/.test(r)) lead = BUILD;
  else if (/cfo|financ|coo|operat|\bops\b|procure/.test(r)) lead = VENDOR;
  else if (/ceo|founder|owner|chief executive/.test(r)) lead = OFFLOAD;
  const rest = STARTER_DECISIONS.filter((s) => s !== lead);
  return [lead, ...rest];
}

/** The single best-fit starter decision for a leader (the lead of the ordered set). */
export function pickStarterDecision(role?: string | null): string {
  return starterDecisionsFor(role)[0];
}
