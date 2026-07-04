import { describe, it, expect } from 'vitest';
import {
  isAiNativeDecision,
  classifyDecision,
  templatedReframe,
  LIFECYCLE_STAGES,
} from './decision-ai-native';

/**
 * The AI-native lock + the honest reframe are the auditable core of the decision
 * engine's re-scope (docs/MAIN-APP-POLISH-SPEC.md section 0). These assertions
 * pin the two contract cases the spec calls out:
 *   - an already-AI-native decision ("switch our agent to a cheaper model")
 *     passes through unchanged and is classified AI-native, and
 *   - a general-business decision ("hire a VP of Sales") is flagged for reframe
 *     and, because that shape is deterministic/templated, produces an AI-native
 *     restatement.
 *
 * The live LLM reframe (reframe.ts) is NOT exercised here; these tests pin the
 * deterministic backstop that guarantees a general decision can never slip
 * through and an AI-native one is never needlessly reframed.
 */
describe('decision AI-native lock', () => {
  it('passes an already-AI-native decision through unchanged', () => {
    const s = 'We should switch our highest-volume agent to a cheaper model now that quality has closed the gap.';
    expect(isAiNativeDecision(s)).toBe(true);
    const c = classifyDecision(s);
    expect(c.aiNative).toBe(true);
    expect(c.needsReframe).toBe(false);
    expect(c.templated).toBeNull();
  });

  it('keeps the other seed examples AI-native', () => {
    expect(isAiNativeDecision('We should stand up an agent to handle tier-1 support before hiring more reps.')).toBe(true);
    expect(isAiNativeDecision('We should productize our internal AI research workflow as a paid feature.')).toBe(true);
  });

  it('flags a general-business hire for reframe and produces an AI-native restatement', () => {
    const s = 'Should we hire a VP of Sales?';
    expect(isAiNativeDecision(s)).toBe(false);
    const c = classifyDecision(s);
    expect(c.aiNative).toBe(false);
    expect(c.needsReframe).toBe(true);
    expect(c.templated).not.toBeNull();
    // The templated reframe is AI-native (pulls the leader to the agent/sales-motion lens).
    expect(c.templated!.reframed.toLowerCase()).toContain('agent');
    expect(isAiNativeDecision(c.templated!.reframed)).toBe(true);
    expect(c.templated!.stage).toBe('orchestrate');
  });
});

describe('templatedReframe (deterministic, spec shapes)', () => {
  const cases: Array<[string, string]> = [
    ['Should we raise prices next quarter?', 'productize'],
    ['Should we move upmarket to enterprise?', 'productize'],
    ['We need to cut costs across the board.', 'build'],
    ['Should we restructure the org?', 'orchestrate'],
    ['Should we hire a VP of Sales now?', 'orchestrate'],
  ];
  it.each(cases)('reframes %s -> AI-native (%s)', (text, stage) => {
    const r = templatedReframe(text);
    expect(r).not.toBeNull();
    expect(r!.stage).toBe(stage);
    expect((LIFECYCLE_STAGES as readonly string[]).includes(r!.stage)).toBe(true);
    // The restatement itself must be AI-native (never another general statement).
    expect(isAiNativeDecision(r!.reframed)).toBe(true);
  });

  it('returns null for an already-AI-native statement (no template needed)', () => {
    expect(templatedReframe('We should switch our agent to a cheaper model.')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(templatedReframe('')).toBeNull();
    expect(templatedReframe(null)).toBeNull();
    expect(templatedReframe(undefined)).toBeNull();
  });

  it('flags a general decision with no known shape for reframe but no template', () => {
    // No template shape matches, but it is still general business -> needsReframe,
    // templated null (the LLM reframe stage owns the restatement).
    const c = classifyDecision('Should we sponsor a conference booth this year?');
    expect(c.aiNative).toBe(false);
    expect(c.needsReframe).toBe(true);
    expect(c.templated).toBeNull();
  });
});

describe('isAiNativeDecision edge cases', () => {
  it('rejects empty / whitespace', () => {
    expect(isAiNativeDecision('')).toBe(false);
    expect(isAiNativeDecision('   ')).toBe(false);
    expect(isAiNativeDecision(null)).toBe(false);
  });
  it('accepts decisions about building agents / automation', () => {
    expect(isAiNativeDecision('Should we automate onboarding with an LLM workflow?')).toBe(true);
    expect(isAiNativeDecision('Should we deploy a copilot inside the support tool?')).toBe(true);
  });
});

describe('human-agent false positives (the reframe under-trigger fix)', () => {
  // Regression: the bare word "agent(s)" is a strong AI signal, but when it means
  // PEOPLE ("support agents", "sales agents") it wrongly classified a general
  // headcount decision as already-AI-native, so it skipped the reframe it needed
  // (audit finding F4: "Should we hire two more support agents?" showed no reframe).
  const humanAgentGeneral = [
    'Should we hire two more support agents to handle ticket volume?',
    'Do we need more customer service agents this quarter?',
    'Should we bring on additional call center agents?',
    'We are thinking about hiring more sales agents.',
  ];
  it.each(humanAgentGeneral)('treats human-agent decision as general, not AI-native: %s', (s) => {
    expect(isAiNativeDecision(s)).toBe(false);
    expect(classifyDecision(s).needsReframe).toBe(true);
  });

  it('the exact audit case reframes to the AI-native headcount lens', () => {
    const c = classifyDecision('Should we hire two more support agents to handle ticket volume?');
    expect(c.aiNative).toBe(false);
    expect(c.needsReframe).toBe(true);
    expect(c.templated).not.toBeNull();
    expect(c.templated!.stage).toBe('orchestrate');
    expect(isAiNativeDecision(c.templated!.reframed)).toBe(true);
  });

  it('still recognises genuine AI-agent decisions (no over-correction)', () => {
    expect(isAiNativeDecision('Should we build an AI agent to handle tier-1 support?')).toBe(true);
    expect(isAiNativeDecision('Should we stand up an agent to deflect support tickets?')).toBe(true);
    expect(isAiNativeDecision('Should we deploy an autonomous agent for onboarding?')).toBe(true);
    expect(isAiNativeDecision('Is our multi-agent orchestration reliable enough to ship?')).toBe(true);
  });
});
