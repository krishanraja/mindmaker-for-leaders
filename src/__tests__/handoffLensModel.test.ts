import { describe, expect, it } from 'vitest';
import { handoffLensFor, handoffSignalSchema } from '@/components/cockpit/handoffLensModel';

describe('handoffLensFor', () => {
  it('reconstructs the approved orchestration lens from consented handoff fields', () => {
    const lens = handoffLensFor({
      q2: 'do',
      q4: 'hybrid',
      anxietyLane: 'orchestration',
    });

    expect(lens.headline).toBe('Wire agents into the work. Keep judgment human.');
    expect(lens.interpretation).toContain('doing over watching');
    expect(lens.interpretation).toContain('a hybrid company over a fully autonomous one');
    expect(lens.focusPhrase).toContain('agents wired into');
    expect(lens.starterDecision).toMatch(/take work off my team/i);
  });

  it('changes the lens and starter decision for economics without inventing raw decision text', () => {
    const lens = handoffLensFor({
      q2: 'think',
      q4: 'leaner',
      anxietyLane: 'economics',
      archetypeTitle: 'A title that must not become a fabricated decision',
    });

    expect(lens.laneLabel).toBe('AI economics');
    expect(lens.interpretation).toContain('more space to think');
    expect(lens.interpretation).toContain('a deliberately leaner company');
    expect(lens.starterDecision).toMatch(/build our own AI agents/i);
    expect(lens.interpretation).not.toContain('A title that must not become');
  });

  it('degrades to an honest generic lens when optional fields are absent', () => {
    const lens = handoffLensFor({});

    expect(lens.laneLabel).toBe('Your starting lens');
    expect(lens.headline).toContain('Keep judgment human');
    expect(lens.interpretation).toContain('a company where AI has an earned role');
  });

  it('rejects malformed network payloads before the renderer sees them', () => {
    expect(handoffSignalSchema.safeParse({ q2: { unsafe: true }, q4: 'hybrid' }).success).toBe(false);
    expect(handoffSignalSchema.safeParse({ q2: null, q4: 'hybrid', anxietyLane: null }).success).toBe(true);
  });
});
