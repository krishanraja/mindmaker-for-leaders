import { describe, it, expect } from 'vitest';
import {
  applyCorrectionDamping,
  buildCorrectionPromptBlock,
  type CorrectionSignal,
} from './correction-guard';

/**
 * The correction loop's hard guarantee: once a leader corrects, rejects, or
 * disputes a fact, the extractor can never silently re-land the ruled-out
 * value (drop), and any other value arriving on that key goes back through
 * verification (damp + high-stakes). These tests pin that contract; the
 * prompt block is best-effort steering and only its shape is asserted.
 */

const corrected: CorrectionSignal = {
  factKey: 'role',
  factLabel: 'Your Role',
  priorValue: 'CTO',
  newValue: 'VP Engineering',
  kind: 'user_corrected',
};

const rejected: CorrectionSignal = {
  factKey: 'main_blocker',
  factLabel: 'Main Blocker',
  priorValue: 'lack of budget',
  newValue: null,
  kind: 'user_rejected',
};

function fact(overrides: Partial<{ fact_key: string; fact_value: string; confidence_score: number; is_high_stakes: boolean }>) {
  return {
    fact_key: 'role',
    fact_value: 'CTO',
    confidence_score: 0.9,
    is_high_stakes: false,
    ...overrides,
  };
}

describe('applyCorrectionDamping', () => {
  it('drops a re-extraction of the exact ruled-out value (case-insensitive)', () => {
    const { kept, dropped } = applyCorrectionDamping([fact({ fact_value: 'cto' })], [corrected]);
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].fact_key).toBe('role');
  });

  it('drops a re-extraction of a rejected value', () => {
    const { kept, dropped } = applyCorrectionDamping(
      [fact({ fact_key: 'main_blocker', fact_value: 'Lack of budget' })],
      [rejected],
    );
    expect(kept).toHaveLength(0);
    expect(dropped[0].fact_key).toBe('main_blocker');
  });

  it('keeps a fact untouched when it matches the corrected truth', () => {
    const { kept, dropped } = applyCorrectionDamping(
      [fact({ fact_value: 'VP Engineering' })],
      [corrected],
    );
    expect(dropped).toHaveLength(0);
    expect(kept[0].confidence_score).toBe(0.9);
    expect(kept[0].is_high_stakes).toBe(false);
  });

  it('damps + flags a different value on a corrected key so it re-verifies', () => {
    const { kept } = applyCorrectionDamping([fact({ fact_value: 'Head of Platform' })], [corrected]);
    expect(kept).toHaveLength(1);
    expect(kept[0].confidence_score).toBeCloseTo(0.35);
    expect(kept[0].is_high_stakes).toBe(true);
  });

  it('never damps below the floor', () => {
    const { kept } = applyCorrectionDamping(
      [fact({ fact_key: 'main_blocker', fact_value: 'slow hiring', confidence_score: 0.35 })],
      [rejected],
    );
    expect(kept[0].confidence_score).toBe(0.3);
  });

  it('leaves facts on untouched keys alone', () => {
    const untouched = fact({ fact_key: 'company_name', fact_value: 'Acme' });
    const { kept, dropped } = applyCorrectionDamping([untouched], [corrected, rejected]);
    expect(dropped).toHaveLength(0);
    expect(kept[0]).toEqual(untouched);
  });

  it('uses only the newest correction per key (input arrives newest-first)', () => {
    const older: CorrectionSignal = { ...corrected, priorValue: 'Head of Eng', newValue: 'CTO' };
    // newest says NOT CTO; the older event said CTO was the truth - newest wins
    const { kept, dropped } = applyCorrectionDamping([fact({ fact_value: 'CTO' })], [corrected, older]);
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(1);
  });
});

describe('buildCorrectionPromptBlock', () => {
  it('returns empty string with no corrections', () => {
    expect(buildCorrectionPromptBlock([])).toBe('');
  });

  it('names the ruled-out value and the correction for corrected facts', () => {
    const block = buildCorrectionPromptBlock([corrected]);
    expect(block).toContain('PRIOR CORRECTIONS BY THIS USER');
    expect(block).toContain('NOT "CTO"');
    expect(block).toContain('corrected this to "VP Engineering"');
  });

  it('marks rejected facts without inventing a replacement value', () => {
    const block = buildCorrectionPromptBlock([rejected]);
    expect(block).toContain('NOT "lack of budget"');
    expect(block).toContain('rejected');
    expect(block).not.toContain('corrected this to');
  });
});
