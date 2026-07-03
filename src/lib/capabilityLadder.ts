/**
 * capabilityLadder - where this leader actually is on the road to running
 * their business AI-native, derived purely from behaviours CTRL has already
 * observed. No new tracking, no points, no streaks: every stage is earned by
 * real observed behaviour (facts verified, decisions weighed, calls banked,
 * outcomes recorded, context put to work), and the output always names the
 * ONE next behaviour that compounds.
 *
 * The four stages compress the evidence-based operator model (AI avoider ->
 * dabbler -> assisted -> operator -> leader of teams -> business builder)
 * into the in-app journey CTRL can honestly see:
 *
 *   orienting   - I am still learning who you are, or you have not weighed
 *                 a real decision yet
 *   operating   - you put real decisions through the engine
 *   calibrating - you make your own call first and record how things play
 *                 out, so your judgment is being scored against reality
 *   compounding - your track record has a defensible pattern AND your
 *                 context works for you outside CTRL (a built skill or a
 *                 live agent connection)
 *
 * Pure + deterministic (same pattern as newsPriority / trackRecordModel) so
 * the thresholds are unit-testable in isolation. Signals arrive via
 * useCapabilitySignals; posture derivation stays in useCockpit (see
 * postureForStage below for the seam).
 */

import { pickStarterDecision } from '@/lib/starterDecisions';

export interface CapabilitySignals {
  /** Role or industry facts exist (the brain knows who they are). */
  hasBrain: boolean;
  /** user_memory rows the leader confirmed or corrected (is_current). */
  verifiedFactCount: number;
  hasVoiceProfile: boolean;
  /** decision_cases ever created. */
  decisionCount: number;
  /** decision_cases resolved (status = decided). */
  decidedCount: number;
  /** Commit-first calls recorded (decision_user_calls). */
  bankedCallCount: number;
  /** Resolved outcomes on the track record (played_out set). */
  playedOutCount: number;
  /** Calls scored gut-vs-ground (trackRecordModel calibration.scored). */
  scoredCallCount: number;
  /** Built skills (generated_artifacts kind = skill). */
  skillCount: number;
  /** A live MCP token exists (their own agent pulls their context). */
  mcpConnected: boolean;
  /** Tuned the feed (boosted lanes chosen). */
  feedTuned: boolean;
  /** Role fact value, only for tailoring the starter-decision prefill. */
  role?: string | null;
}

export type CapabilityStage = 'orienting' | 'operating' | 'calibrating' | 'compounding';

export interface CapabilityNextMove {
  label: string;
  route: string;
  prefill?: string;
}

export interface CapabilityRead {
  stage: CapabilityStage;
  /** 1-based position for a quiet progress read; STAGE_ORDER.length total. */
  stageIndex: number;
  /** Short display name, e.g. "Calibrating". */
  stageLabel: string;
  /** One chief-of-staff sentence on what this stage means. */
  stageLine: string;
  /** ONLY behaviours actually observed - honest, never aspirational. */
  evidence: string[];
  /** The single next behaviour that moves the leader forward. */
  nextMove: CapabilityNextMove;
}

export const STAGE_ORDER: CapabilityStage[] = ['orienting', 'operating', 'calibrating', 'compounding'];

// Thresholds, named so the stage boundaries are auditable + testable.
export const MIN_VERIFIED_FACTS = 3; // calibrating requires a brain you have actually checked
export const RICH_SCORED_CALLS = 4; // mirrors trackRecordModel's rich threshold

const STAGE_META: Record<CapabilityStage, { label: string; line: string }> = {
  orienting: {
    label: 'Getting oriented',
    line: 'We are getting started - the more I know, the sharper every read gets.',
  },
  operating: {
    label: 'Operating',
    line: 'You put real decisions through the engine instead of just reading about AI.',
  },
  calibrating: {
    label: 'Calibrating',
    line: 'You call it first and record how it plays out, so your judgment is scored against reality.',
  },
  compounding: {
    label: 'Compounding',
    line: 'Your track record has a real pattern and your context now works for you beyond CTRL.',
  },
};

export function deriveStage(s: CapabilitySignals): CapabilityStage {
  if (!s.hasBrain || s.decisionCount === 0) return 'orienting';
  const calibrating =
    s.bankedCallCount >= 1 && s.playedOutCount >= 1 && s.verifiedFactCount >= MIN_VERIFIED_FACTS;
  if (!calibrating) return 'operating';
  const compounding = s.scoredCallCount >= RICH_SCORED_CALLS && (s.skillCount >= 1 || s.mcpConnected);
  return compounding ? 'compounding' : 'calibrating';
}

// The one next behaviour, walked in a fixed priority order: earn the current
// stage's missing behaviour first, then reach for the next stage.
export function deriveNextMove(s: CapabilitySignals): CapabilityNextMove {
  if (!s.hasBrain) {
    return { label: 'Introduce yourself on Home - 30 seconds, and everything gets personal', route: '/dashboard' };
  }
  if (s.decisionCount === 0) {
    return {
      label: 'Weigh your first real decision - I will check it against live evidence',
      route: '/decision',
      prefill: pickStarterDecision(s.role),
    };
  }
  if (s.verifiedFactCount < MIN_VERIFIED_FACTS) {
    return { label: 'Check a few things I think I know about you - corrections make me sharper', route: '/memory' };
  }
  if (s.bankedCallCount === 0) {
    return { label: 'Next weigh, make your own call before you see mine - that builds your track record', route: '/decision' };
  }
  if (s.playedOutCount === 0) {
    return { label: 'Close the loop on a decision - tell me how it actually played out', route: '/decision' };
  }
  if (!s.hasVoiceProfile) {
    return { label: 'Teach me how you sound, so everything I write for you is in your voice', route: '/context' };
  }
  if (s.scoredCallCount < RICH_SCORED_CALLS) {
    return { label: 'Keep weighing real calls - at four scored, your track record earns its trend', route: '/decision' };
  }
  if (s.skillCount === 0 && !s.mcpConnected) {
    return { label: 'Put your context to work - build a skill or plug your own agent into your brain', route: '/context' };
  }
  if (!s.feedTuned) {
    return { label: 'Tune your feed so the daily read leans where your business does', route: '/dashboard' };
  }
  return { label: 'Keep resolving decisions as they play out - that is what compounds', route: '/decision' };
}

// Honest observed-behaviour receipts, most meaningful first, capped by the caller.
export function deriveEvidence(s: CapabilitySignals): string[] {
  const out: string[] = [];
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  if (s.scoredCallCount > 0) {
    out.push(`${s.scoredCallCount} ${plural(s.scoredCallCount, 'call', 'calls')} scored against the evidence`);
  }
  if (s.playedOutCount > 0) {
    out.push(`${s.playedOutCount} ${plural(s.playedOutCount, 'decision', 'decisions')} resolved with a real outcome`);
  }
  if (s.decisionCount > 0) {
    out.push(`${s.decisionCount} ${plural(s.decisionCount, 'decision', 'decisions')} weighed`);
  }
  if (s.verifiedFactCount > 0) {
    out.push(`${s.verifiedFactCount} ${plural(s.verifiedFactCount, 'fact', 'facts')} about you checked by you`);
  }
  if (s.hasVoiceProfile) out.push('your voice profile is in place');
  if (s.skillCount > 0) out.push(`${s.skillCount} ${plural(s.skillCount, 'skill', 'skills')} built from how you work`);
  if (s.mcpConnected) out.push('your own agent pulls your context live');
  return out;
}

export function deriveCapability(s: CapabilitySignals): CapabilityRead {
  const stage = deriveStage(s);
  const meta = STAGE_META[stage];
  return {
    stage,
    stageIndex: STAGE_ORDER.indexOf(stage) + 1,
    stageLabel: meta.label,
    stageLine: meta.line,
    evidence: deriveEvidence(s),
    nextMove: deriveNextMove(s),
  };
}

/**
 * The posture seam: useCockpit's current rule is
 *   posture = bets.length > 0 && !dormant ? 'partner' : 'guide'
 * This export is behaviour-identical today (unit-proven) and takes the stage
 * so a later PR can let capability refine posture without changing callers.
 */
export function postureForStage(
  _stage: CapabilityStage,
  hasLiveBets: boolean,
  dormant: boolean,
): 'guide' | 'partner' {
  return hasLiveBets && !dormant ? 'partner' : 'guide';
}
