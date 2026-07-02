import { describe, it, expect } from 'vitest';
import { buildRunningModel, RUNNING_STEP_COUNT, type RunningStage } from './decisionRunningModel';
import type { DecisionCase, DecisionClaim } from '@/hooks/useDecisionEngine';

const caseRow = (over: Partial<DecisionCase> = {}): DecisionCase => ({
  id: 'case-1',
  title: null,
  statement: 'Should we switch to DeepSeek V3?',
  stage: 'decomposing',
  decision_kind: null,
  recommendation: null,
  counter_case: null,
  breakpoint_assumption_id: null,
  validate_next: null,
  confidence: null,
  error_detail: null,
  last_verified_at: null,
  ...over,
});

const claim = (over: Partial<DecisionClaim> = {}): DecisionClaim => ({
  id: 'cl-1',
  text: 'DeepSeek V3 matches GPT-4o on coding benchmarks. And more detail here.',
  type: 'factual',
  is_load_bearing: false,
  dimension: 'capability',
  verdict: 'pending',
  confidence: null,
  rationale: null,
  reaction_value: null,
  reaction_descriptor: null,
  reaction_kind: null,
  reaction_evidence_id: null,
  ...over,
});

describe('buildRunningModel stage mapping', () => {
  it('maps every stage to a valid index and never a blank caption', () => {
    const stages: RunningStage[] = ['reading', 'decomposing', 'verifying', 'cross_examining', 'advising', 'complete', 'error'];
    for (const s of stages) {
      const m = buildRunningModel(s, null, []);
      expect(m.stageIndex).toBeGreaterThanOrEqual(0);
      expect(m.stageIndex).toBeLessThanOrEqual(RUNNING_STEP_COUNT);
      expect(m.headline.length).toBeGreaterThan(0);
      expect(m.detail.length).toBeGreaterThan(0);
    }
  });

  it("holds an unknown stage at the first light instead of going blank", () => {
    const m = buildRunningModel('someday_new' as RunningStage, null, []);
    expect(m.stageIndex).toBe(0);
    expect(m.headline.length).toBeGreaterThan(0);
  });

  it('advances through the strip in pipeline order', () => {
    const idx = (s: RunningStage) => buildRunningModel(s, null, []).stageIndex;
    expect(idx('reading')).toBeLessThan(idx('decomposing'));
    expect(idx('decomposing')).toBeLessThan(idx('verifying'));
    expect(idx('verifying')).toBeLessThan(idx('cross_examining'));
    expect(idx('cross_examining')).toBeLessThan(idx('advising'));
    expect(idx('advising')).toBeLessThan(idx('complete'));
  });
});

describe('buildRunningModel sharpened framing (honesty rules)', () => {
  it('is null until the engine writes a real title or reframe', () => {
    expect(buildRunningModel('decomposing', null, []).sharpened).toBeNull();
    expect(buildRunningModel('decomposing', caseRow(), []).sharpened).toBeNull();
    expect(buildRunningModel('decomposing', caseRow({ title: '   ' }), []).sharpened).toBeNull();
  });

  it('uses the title when it lands, falling back to the reframed statement', () => {
    expect(buildRunningModel('verifying', caseRow({ title: 'DeepSeek vs GPT-4o switch' }), []).sharpened)
      .toEqual({ title: 'DeepSeek vs GPT-4o switch', note: null });
    expect(buildRunningModel('verifying', caseRow({ reframed_statement: 'Reframed version' }), []).sharpened?.title)
      .toBe('Reframed version');
  });

  it('only carries the reframe note when the decision was actually reframed', () => {
    const withNote = caseRow({ title: 'T', reframed: true, reframe_note: 'I made it AI-native.' });
    expect(buildRunningModel('verifying', withNote, []).sharpened?.note).toBe('I made it AI-native.');
    const notReframed = caseRow({ title: 'T', reframed: false, reframe_note: 'stale note' });
    expect(buildRunningModel('verifying', notReframed, []).sharpened?.note).toBeNull();
  });
});

describe('buildRunningModel forces', () => {
  it('always returns the six fixed forces, unlit with no data', () => {
    const m = buildRunningModel('decomposing', null, []);
    expect(m.forces).toHaveLength(6);
    expect(m.forces.every((f) => !f.lit && f.label === null)).toBe(true);
    expect(m.forces.map((f) => f.key)).toContain('capability');
  });

  it('lights a force from force_labels and carries the specific label', () => {
    const m = buildRunningModel('decomposing', caseRow({ force_labels: { economics: 'Token cost' } }), []);
    const econ = m.forces.find((f) => f.key === 'economics')!;
    expect(econ.lit).toBe(true);
    expect(econ.label).toBe('Token cost');
    expect(m.forces.filter((f) => f.lit)).toHaveLength(1);
  });

  it('lights a force when a claim lands on its dimension (including type inference)', () => {
    const m = buildRunningModel('verifying', caseRow(), [
      claim({ dimension: 'timing' }),
      claim({ id: 'cl-2', dimension: null, type: 'market' }), // infers economics
    ]);
    expect(m.forces.find((f) => f.key === 'timing')?.lit).toBe(true);
    expect(m.forces.find((f) => f.key === 'economics')?.lit).toBe(true);
    expect(m.forces.find((f) => f.key === 'team')?.lit).toBe(false);
  });
});

describe('buildRunningModel claim lines + progress', () => {
  it('is empty and zero-count with no claims', () => {
    const m = buildRunningModel('decomposing', caseRow(), []);
    expect(m.claimLines).toEqual([]);
    expect(m.checkedCount).toBe(0);
    expect(m.totalClaims).toBe(0);
  });

  it('puts load-bearing claims first and caps the list', () => {
    const claims = [
      claim({ id: 'a' }),
      claim({ id: 'b', is_load_bearing: true }),
      claim({ id: 'c' }),
      claim({ id: 'd' }),
    ];
    const m = buildRunningModel('verifying', caseRow(), claims, 3);
    expect(m.claimLines).toHaveLength(3);
    expect(m.claimLines[0].id).toBe('b');
    expect(m.claimLines[0].loadBearing).toBe(true);
    expect(m.totalClaims).toBe(4);
  });

  it('distills each line to its first clause', () => {
    const m = buildRunningModel('verifying', caseRow(), [claim()]);
    expect(m.claimLines[0].text).toBe('DeepSeek V3 matches GPT-4o on coding benchmarks');
  });

  it('counts checked claims as those with a landed (non-pending) verdict', () => {
    const m = buildRunningModel('verifying', caseRow(), [
      claim({ id: 'a', verdict: 'supported' }),
      claim({ id: 'b', verdict: 'pending' }),
      claim({ id: 'c', verdict: 'contested' }),
    ]);
    expect(m.checkedCount).toBe(2);
    expect(m.totalClaims).toBe(3);
  });
});
