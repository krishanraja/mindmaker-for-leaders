import { describe, it, expect } from 'vitest';
import {
  applyNextMoveToKickstart,
  deriveCapability,
  deriveStage,
  deriveNextMove,
  postureForStage,
  MIN_VERIFIED_FACTS,
  RICH_SCORED_CALLS,
  type CapabilitySignals,
} from '@/lib/capabilityLadder';
import type { DeckCard } from '@/types/cockpit';

/**
 * The ladder is the leader's honest progression read, so its contract is:
 * stages are earned only by observed behaviour (each boundary pinned here),
 * the next move always names the first unmet behaviour, evidence never lists
 * anything not actually done, and postureForStage stays behaviour-identical
 * to useCockpit's current rule so a later adoption cannot regress Home.
 */

const NONE: CapabilitySignals = {
  hasBrain: false,
  verifiedFactCount: 0,
  hasVoiceProfile: false,
  decisionCount: 0,
  decidedCount: 0,
  bankedCallCount: 0,
  playedOutCount: 0,
  scoredCallCount: 0,
  skillCount: 0,
  mcpConnected: false,
  feedTuned: false,
};

const CALIBRATING: CapabilitySignals = {
  ...NONE,
  hasBrain: true,
  decisionCount: 3,
  verifiedFactCount: MIN_VERIFIED_FACTS,
  bankedCallCount: 2,
  playedOutCount: 1,
  hasVoiceProfile: true,
};

describe('deriveStage boundaries', () => {
  it('is orienting with no brain, even with decisions', () => {
    expect(deriveStage({ ...NONE, decisionCount: 2 })).toBe('orienting');
  });

  it('is orienting with a brain but no decision ever', () => {
    expect(deriveStage({ ...NONE, hasBrain: true, verifiedFactCount: 10 })).toBe('orienting');
  });

  it('is operating once a real decision went through the engine', () => {
    expect(deriveStage({ ...NONE, hasBrain: true, decisionCount: 1 })).toBe('operating');
  });

  it('stays operating until a banked call AND an outcome AND checked facts exist', () => {
    expect(deriveStage({ ...CALIBRATING, bankedCallCount: 0 })).toBe('operating');
    expect(deriveStage({ ...CALIBRATING, playedOutCount: 0 })).toBe('operating');
    expect(deriveStage({ ...CALIBRATING, verifiedFactCount: MIN_VERIFIED_FACTS - 1 })).toBe('operating');
    expect(deriveStage(CALIBRATING)).toBe('calibrating');
  });

  it('compounds only with a rich scored record AND context working beyond CTRL', () => {
    const scored = { ...CALIBRATING, scoredCallCount: RICH_SCORED_CALLS };
    expect(deriveStage(scored)).toBe('calibrating'); // no skill, no MCP
    expect(deriveStage({ ...scored, skillCount: 1 })).toBe('compounding');
    expect(deriveStage({ ...scored, mcpConnected: true })).toBe('compounding');
    expect(deriveStage({ ...CALIBRATING, scoredCallCount: RICH_SCORED_CALLS - 1, skillCount: 1 })).toBe('calibrating');
  });
});

describe('deriveNextMove priority walk', () => {
  it('leads with the brain when nothing is known', () => {
    expect(deriveNextMove(NONE).route).toBe('/dashboard');
  });

  it('offers a role-tailored starter decision before anything else once known', () => {
    const move = deriveNextMove({ ...NONE, hasBrain: true, role: 'CFO' });
    expect(move.route).toBe('/decision');
    expect(move.prefill).toBeTruthy();
  });

  it('asks for fact checks before banked calls', () => {
    const move = deriveNextMove({ ...NONE, hasBrain: true, decisionCount: 1 });
    expect(move.route).toBe('/memory');
  });

  it('walks banked call -> outcome -> voice in order', () => {
    const base = { ...NONE, hasBrain: true, decisionCount: 1, verifiedFactCount: MIN_VERIFIED_FACTS };
    expect(deriveNextMove(base).label).toMatch(/your own call/i);
    expect(deriveNextMove({ ...base, bankedCallCount: 1 }).label).toMatch(/how it actually played out/i);
    expect(deriveNextMove({ ...base, bankedCallCount: 1, playedOutCount: 1 }).label).toMatch(/how you sound/i);
  });

  it('sends a compounding leader to maintenance, never a dead end', () => {
    const full: CapabilitySignals = {
      ...CALIBRATING,
      scoredCallCount: RICH_SCORED_CALLS,
      skillCount: 1,
      mcpConnected: true,
      feedTuned: true,
    };
    const move = deriveNextMove(full);
    expect(move.route).toBe('/decision');
    expect(move.label).toMatch(/resolving/i);
  });
});

describe('deriveCapability read', () => {
  it('never lists unearned evidence', () => {
    const read = deriveCapability(NONE);
    expect(read.evidence).toHaveLength(0);
    expect(read.stageIndex).toBe(1);
  });

  it('lists only observed behaviours, strongest first', () => {
    const read = deriveCapability(CALIBRATING);
    expect(read.stage).toBe('calibrating');
    expect(read.evidence[0]).toMatch(/resolved with a real outcome/);
    expect(read.evidence).not.toContain('your own agent pulls your context live');
  });

  it('contains no em dashes anywhere (house style)', () => {
    const read = deriveCapability(CALIBRATING);
    const all = [read.stageLabel, read.stageLine, read.nextMove.label, ...read.evidence].join(' ');
    expect(all).not.toMatch(/[\u2014\u2013]/);
  });
});

describe('applyNextMoveToKickstart', () => {
  const kickstart: DeckCard = {
    id: 'kickstart-decision',
    kind: 'kickstart',
    eyebrow: 'Start here',
    headline: 'Where should AI take work off my team first?',
    say: 'Weigh your first real decision.',
    route: '/decision',
    prefill: 'Where should AI take work off my team first?',
  };
  const news: DeckCard = { id: 'n1', kind: 'news', headline: 'A model shipped' } as DeckCard;

  it('leaves the deck untouched when the next move is a decision weigh', () => {
    const capability = deriveCapability({ ...CALIBRATING, bankedCallCount: 0 }); // next: own call -> /decision
    const deck = [kickstart, news];
    expect(applyNextMoveToKickstart(deck, capability)).toBe(deck);
  });

  it('leaves the deck untouched with no capability read or no kickstart', () => {
    expect(applyNextMoveToKickstart([kickstart], null)).toEqual([kickstart]);
    const capability = deriveCapability({ ...CALIBRATING, hasVoiceProfile: false }); // next: voice -> /context
    const newsOnly = [news];
    expect(applyNextMoveToKickstart(newsOnly, capability)).toBe(newsOnly);
  });

  it('carries an elsewhere-move onto the kickstart card without touching news', () => {
    const capability = deriveCapability({ ...CALIBRATING, hasVoiceProfile: false }); // next: voice -> /context
    const out = applyNextMoveToKickstart([kickstart, news], capability);
    expect(out[0].kind).toBe('kickstart');
    expect(out[0].route).toBe('/context');
    expect(out[0].eyebrow).toBe('Your next move');
    expect(out[0].headline).toMatch(/how you sound/i);
    expect(out[1]).toBe(news);
  });

  it('never routes the card back to Home', () => {
    const capability = deriveCapability(NONE); // next: introduce yourself -> /dashboard
    const deck = [kickstart, news];
    expect(applyNextMoveToKickstart(deck, capability)).toBe(deck);
  });
});

describe('postureForStage stays behaviour-identical to the current cockpit rule', () => {
  it('matches bets.length > 0 && !dormant for every combination', () => {
    for (const stage of ['orienting', 'operating', 'calibrating', 'compounding'] as const) {
      for (const hasLiveBets of [true, false]) {
        for (const dormant of [true, false]) {
          const current = hasLiveBets && !dormant ? 'partner' : 'guide';
          expect(postureForStage(stage, hasLiveBets, dormant)).toBe(current);
        }
      }
    }
  });
});
