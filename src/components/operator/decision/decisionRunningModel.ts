/**
 * decisionRunningModel - the pure, React-free model behind the live "weighing"
 * show (DecisionRunning). Maps the REAL engine state (stage + the decision_cases
 * row + the decision_claims rows as they land) into exactly what the screen may
 * show. Nothing here is invented: the sharpened title only appears when the
 * reframe row exists, a force only lights when the engine labelled it or a claim
 * landed on it, and every claim line is a real decision_claims row with its live
 * verdict. Kept pure so the honesty rules are unit-tested.
 */

import type { DecisionCase, DecisionClaim, Dimension, Stage, Verdict } from '@/hooks/useDecisionEngine';
import { FORCE_META, claimDimension } from './decisionSpiderModel';
import { firstClause } from './decisionParts';

// 'reading' = the kickoff invoke is genuinely in flight (engine.starting): the
// case row does not exist yet, so the honest label is "taking in your words".
export type RunningStage = Stage | 'reading';

export interface RunningForce {
  key: Dimension;
  name: string;
  /** This decision's specific concern (force_labels), when the engine wrote one. */
  label: string | null;
  /** Lit once the engine has touched this force: a label or a landed claim. */
  lit: boolean;
}

export interface RunningClaimLine {
  id: string;
  text: string;
  verdict: Verdict;
  loadBearing: boolean;
}

export interface RunningModel {
  /** 0..4 across reading/decomposing -> verifying -> cross_examining -> advising; 5 = complete. */
  stageIndex: number;
  headline: string;
  detail: string;
  /** The engine's sharpened framing - only when the real title/reframe row landed. */
  sharpened: { title: string; note: string | null } | null;
  forces: RunningForce[];
  claimLines: RunningClaimLine[];
  /** Honest progress: claims whose verify verdict has landed vs all claims so far. */
  checkedCount: number;
  totalClaims: number;
}

// Stage -> the strip index. 'reading' and 'decomposing' share the first light
// (the case row appears within the first poll); complete lands past the end so
// every dot reads done; error holds at the weigh step (the error view takes over).
const STAGE_INDEX: Record<RunningStage, number> = {
  reading: 0,
  decomposing: 1,
  verifying: 2,
  cross_examining: 3,
  advising: 4,
  complete: 5,
  error: 4,
};

export const RUNNING_STEP_COUNT = 5;

const STAGE_COPY: Record<RunningStage, { headline: string; detail: string }> = {
  reading: { headline: 'Pausing on your words', detail: 'Taking in exactly what you said before I touch it.' },
  decomposing: { headline: 'Breaking it into the points it rests on', detail: 'Every decision stands on a few claims. I am finding yours.' },
  verifying: { headline: 'Checking each point against real sources', detail: 'Real evidence, not guesses. Watch the verdicts land.' },
  cross_examining: { headline: 'Arguing both sides', detail: 'Testing where your case is strong and where it is weak.' },
  advising: { headline: 'Weighing it up for you', detail: 'Turning the evidence into an honest answer.' },
  complete: { headline: 'Weighed', detail: 'Here is how your decision holds up.' },
  error: { headline: 'Weighing it up for you', detail: 'Turning the evidence into an honest answer.' },
};

export function buildRunningModel(
  stage: RunningStage,
  decisionCase: DecisionCase | null,
  claims: DecisionClaim[],
  maxLines = 5,
): RunningModel {
  const stageIndex = STAGE_INDEX[stage] ?? 0;
  const copy = STAGE_COPY[stage] ?? STAGE_COPY.reading;

  // The sharpened framing, only when the engine really wrote one. Prefer the
  // short title; fall back to the reframed statement. The note rides along so
  // the UI can say WHY it sharpened (AI-native reframe).
  const title = decisionCase?.title?.trim() || decisionCase?.reframed_statement?.trim() || '';
  const sharpened = title
    ? { title, note: decisionCase?.reframed ? decisionCase?.reframe_note?.trim() || null : null }
    : null;

  const dimsWithClaims = new Set<Dimension>(claims.map((c) => claimDimension(c)));
  const forces: RunningForce[] = FORCE_META.map((meta) => {
    const label = decisionCase?.force_labels?.[meta.key]?.trim() || null;
    return { key: meta.key, name: meta.name, label, lit: Boolean(label) || dimsWithClaims.has(meta.key) };
  });

  const claimLines: RunningClaimLine[] = [...claims]
    .sort((a, b) => Number(b.is_load_bearing) - Number(a.is_load_bearing))
    .slice(0, Math.max(0, maxLines))
    .map((c) => ({ id: c.id, text: firstClause(c.text, 90), verdict: c.verdict, loadBearing: c.is_load_bearing }));

  return {
    stageIndex,
    headline: copy.headline,
    detail: copy.detail,
    sharpened,
    forces,
    claimLines,
    checkedCount: claims.filter((c) => c.verdict !== 'pending').length,
    totalClaims: claims.length,
  };
}
