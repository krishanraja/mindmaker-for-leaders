import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canShowKill,
  chooseHoldOut,
  contentTokens,
  haltVerdict,
  makeRng,
  matchesExistingConstruct,
  MIN_PAIR_SEPARATION,
  minPairSeparation,
  namesIntendedDimension,
  OWN_EARLIEST_POSITION,
  pairSplitRate,
  planDeck,
  REPEAT_MIN_GAP,
  selfAgreement,
  SORT_BUDGET,
  splitRateForHalt,
  type PairInput,
  type PeerInput,
  type PlannedItem,
} from './sort-composition';
import {
  peerCorpusStatus,
  peerSamplesForSurface,
  PEER_SURFACES,
  peerSourceLabel,
} from './peer-corpus';
import {
  buildPairSystemPrompt,
  buildPairUserPrompt,
  composeContextLine,
  defaultContextLine,
  HANDRUN_PROMPT_2_RULES,
} from '../build-sort/prompt';

/**
 * The two invariants this file exists to pin are the two that fail silently.
 *
 * A pair whose halves sit next to each other reads as a comparison, and the
 * grade attaches to the comparison rather than to the standard. A hold-out that
 * splits a pair destroys the only property the pair design buys. Both look
 * completely fine in a database.
 */

// -- fixtures ---------------------------------------------------------------

function makePairs(constructs = SORT_BUDGET.constructs): PairInput[] {
  const out: PairInput[] = [];
  for (let c = 1; c <= constructs; c++) {
    for (let p = 1; p <= SORT_BUDGET.pairsPerConstruct; p++) {
      out.push({
        constructId: `construct-${c}`,
        pairIndex: p,
        satisfies: `satisfies c${c}.${p}`,
        violates: `violates c${c}.${p}`,
        intendedDimension: `one names a specific client fact, the other could be for anyone (c${c}.${p})`,
      });
    }
  }
  return out;
}

function makeOwn(n = SORT_BUDGET.own): string[] {
  return Array.from({ length: n }, (_, i) => `own artefact ${i + 1}`);
}

function makePeer(n = SORT_BUDGET.peer): PeerInput[] {
  return Array.from({ length: n }, (_, i) => ({
    body: `peer artefact ${i + 1}`,
    sourceLabel: `A Named Author ${i + 1} (public: https://example.com/${i + 1})`,
  }));
}

function canonicalDeck(seed = 1): PlannedItem[] {
  return planDeck({ pairs: makePairs(), own: makeOwn(), peer: makePeer(), rng: makeRng(seed) });
}

const uniqueItems = (items: PlannedItem[]) => items.filter((it) => !it.repeatOfKey);
const repeatItems = (items: PlannedItem[]) => items.filter((it) => it.repeatOfKey);

// -- budget -----------------------------------------------------------------

describe('SORT_BUDGET', () => {
  it('is the ruled budget, not the original spec one', () => {
    // CH-03: five constructs at two pairs, not ten at one.
    expect(SORT_BUDGET.constructs * SORT_BUDGET.pairsPerConstruct).toBe(SORT_BUDGET.pairs);
    expect(SORT_BUDGET.pairs * 2).toBe(SORT_BUDGET.synthesised);
    expect(SORT_BUDGET.synthesised + SORT_BUDGET.own + SORT_BUDGET.peer).toBe(SORT_BUDGET.unique);
    expect(SORT_BUDGET.unique + SORT_BUDGET.repeats).toBe(SORT_BUDGET.total);
    // CH-08: the accept side is guaranteed structurally, not by a threshold.
    expect(SORT_BUDGET.own).toBeGreaterThanOrEqual(6);
    // Hold-out is 3 whole pairs + 2 own + 2 peer = 10.
    const h = SORT_BUDGET.holdOut;
    expect(h.pairs * 2).toBe(h.pairItems);
    expect(h.pairItems + h.own + h.peer).toBe(h.items);
    expect(SORT_BUDGET.unique - h.items).toBe(SORT_BUDGET.training);
  });
});

// -- planDeck: pair separation ---------------------------------------------

describe('planDeck: matched-pair separation', () => {
  it('never places the halves of a pair within 4 positions, across many seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const items = canonicalDeck(seed);
      expect(minPairSeparation(items)).toBeGreaterThanOrEqual(MIN_PAIR_SEPARATION);
    }
  });

  it('holds the separation for smaller decks too (4, 6 and 8 pairs)', () => {
    for (const constructs of [2, 3, 4]) {
      for (let seed = 1; seed <= 60; seed++) {
        const items = planDeck({
          pairs: makePairs(constructs),
          own: makeOwn(),
          peer: makePeer(),
          rng: makeRng(seed),
        });
        expect(minPairSeparation(items)).toBeGreaterThanOrEqual(MIN_PAIR_SEPARATION);
      }
    }
  });

  it('keeps every pair complete: two halves, one satisfies and one violates', () => {
    const items = uniqueItems(canonicalDeck(7));
    const byPair = new Map<string, PlannedItem[]>();
    for (const it of items) {
      if (!it.pairKey) continue;
      byPair.set(it.pairKey, [...(byPair.get(it.pairKey) ?? []), it]);
    }
    expect(byPair.size).toBe(SORT_BUDGET.pairs);
    for (const members of byPair.values()) {
      expect(members).toHaveLength(2);
      expect(members.map((m) => m.pairRole).sort()).toEqual(['satisfies', 'violates']);
      // The answer key rides the satisfies half only.
      const withKey = members.filter((m) => m.intendedDimension);
      expect(withKey).toHaveLength(1);
      expect(withKey[0].pairRole).toBe('satisfies');
    }
  });

  it('does not always lead with the satisfying half', () => {
    const leaders = new Set<string>();
    for (let seed = 1; seed <= 25; seed++) {
      const items = uniqueItems(canonicalDeck(seed)).filter((it) => it.pairKey);
      const byPair = new Map<string, PlannedItem[]>();
      for (const it of items) byPair.set(it.pairKey!, [...(byPair.get(it.pairKey!) ?? []), it]);
      for (const members of byPair.values()) {
        const first = [...members].sort((a, b) => a.position - b.position)[0];
        leaders.add(first.pairRole!);
      }
    }
    expect(leaders).toEqual(new Set(['satisfies', 'violates']));
  });
});

// -- planDeck: positions, own placement, determinism -------------------------

describe('planDeck: layout', () => {
  it('assigns 1..30 exactly once, then appends the repeats', () => {
    const items = canonicalDeck(11);
    expect(items).toHaveLength(SORT_BUDGET.total);
    const unique = uniqueItems(items).map((it) => it.position).sort((a, b) => a - b);
    expect(unique).toEqual(Array.from({ length: SORT_BUDGET.unique }, (_, i) => i + 1));
    expect(repeatItems(items).map((it) => it.position)).toEqual([31, 32, 33]);
  });

  it('never puts the person own work in the first three screens, and spreads it', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const own = canonicalDeck(seed).filter((it) => it.origin === 'own' && !it.repeatOfKey);
      expect(own).toHaveLength(SORT_BUDGET.own);
      for (const it of own) expect(it.position).toBeGreaterThanOrEqual(OWN_EARLIEST_POSITION);
      // Spread, not clumped: at least one own item lands in the back third, and
      // at least one lands before the kill gate can compute at screen 16.
      const positions = own.map((it) => it.position);
      expect(Math.max(...positions)).toBeGreaterThan(20);
      expect(Math.min(...positions)).toBeLessThan(16);
    }
  });

  it('is deterministic given the rng', () => {
    const a = canonicalDeck(42);
    const b = canonicalDeck(42);
    expect(b).toEqual(a);
    const c = canonicalDeck(43);
    expect(c.map((it) => it.key).join('|')).not.toBe(a.map((it) => it.key).join('|'));
  });

  it('degrades honestly when own artefacts or peer items are missing', () => {
    const items = planDeck({ pairs: makePairs(), own: makeOwn(2), peer: [], rng: makeRng(5) });
    const unique = uniqueItems(items);
    expect(unique).toHaveLength(SORT_BUDGET.synthesised + 2);
    expect(unique.filter((it) => it.origin === 'peer')).toHaveLength(0);
    expect(unique.filter((it) => it.origin === 'own')).toHaveLength(2);
    // No padding: nothing model-written is ever labelled 'own'.
    for (const it of unique.filter((it) => it.origin === 'own')) {
      expect(it.body.startsWith('own artefact')).toBe(true);
    }
    expect(minPairSeparation(items)).toBeGreaterThanOrEqual(MIN_PAIR_SEPARATION);
  });

  it('returns nothing for an empty input rather than inventing a deck', () => {
    expect(planDeck({ pairs: [], own: [], peer: [], rng: makeRng(1) })).toEqual([]);
  });
});

// -- planDeck: repeats (CH-12) ----------------------------------------------

describe('planDeck: repeat probes', () => {
  it('appends 3 repeats, each at least 8 positions after the item it repeats', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const items = canonicalDeck(seed);
      const repeats = repeatItems(items);
      expect(repeats).toHaveLength(SORT_BUDGET.repeats);
      const byKey = new Map(items.map((it) => [it.key, it]));
      for (const r of repeats) {
        const source = byKey.get(r.repeatOfKey!);
        expect(source).toBeDefined();
        expect(r.repeatOfPosition).toBe(source!.position);
        expect(r.position - source!.position).toBeGreaterThanOrEqual(REPEAT_MIN_GAP);
        expect(r.body).toBe(source!.body);
        // A repeat must never land a third grade on a pair.
        expect(r.pairKey).toBeNull();
        expect(r.pairRole).toBeNull();
        expect(r.constructId).toBeNull();
        expect(r.intendedDimension).toBeNull();
      }
      // Three distinct sources, drawn from the opening stretch.
      const sources = repeats.map((r) => r.repeatOfKey);
      expect(new Set(sources).size).toBe(sources.length);
      for (const r of repeats) expect(r.repeatOfPosition!).toBeLessThanOrEqual(10);
    }
  });
});

// -- chooseHoldOut ----------------------------------------------------------

describe('chooseHoldOut', () => {
  it('is exactly 10 items in the 3 pairs + 2 own + 2 peer shape', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const items = canonicalDeck(seed);
      const selection = chooseHoldOut(items);
      expect(selection.heldOutIds).toHaveLength(SORT_BUDGET.holdOut.items);
      expect(selection.pairs).toBe(SORT_BUDGET.holdOut.pairs);
      expect(selection.own).toBe(SORT_BUDGET.holdOut.own);
      expect(selection.peer).toBe(SORT_BUDGET.holdOut.peer);

      const held = new Set(selection.heldOutIds);
      const byKey = new Map(items.map((it) => [it.key, it]));
      const origins = selection.heldOutIds.map((id) => byKey.get(id)!.origin);
      expect(origins.filter((o) => o === 'synthesised')).toHaveLength(SORT_BUDGET.holdOut.pairItems);
      expect(origins.filter((o) => o === 'own')).toHaveLength(SORT_BUDGET.holdOut.own);
      expect(origins.filter((o) => o === 'peer')).toHaveLength(SORT_BUDGET.holdOut.peer);
      expect(held.size).toBe(selection.heldOutIds.length);
    }
  });

  it('never splits a pair: both halves are held out or neither is', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const items = canonicalDeck(seed);
      const held = new Set(chooseHoldOut(items).heldOutIds);
      const byPair = new Map<string, PlannedItem[]>();
      for (const it of uniqueItems(items)) {
        if (!it.pairKey) continue;
        byPair.set(it.pairKey, [...(byPair.get(it.pairKey) ?? []), it]);
      }
      for (const members of byPair.values()) {
        const inHoldOut = members.filter((m) => held.has(m.key)).length;
        expect([0, 2]).toContain(inHoldOut);
      }
    }
  });

  it('never holds out a repeat probe', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const items = canonicalDeck(seed);
      const held = new Set(chooseHoldOut(items).heldOutIds);
      for (const r of repeatItems(items)) expect(held.has(r.key)).toBe(false);
    }
  });

  it('leaves 20 training items under the canonical budget', () => {
    const items = canonicalDeck(3);
    const held = new Set(chooseHoldOut(items).heldOutIds);
    const training = uniqueItems(items).filter((it) => !held.has(it.key));
    expect(training).toHaveLength(SORT_BUDGET.training);
  });

  it('scales down rather than over-selecting when a class is short', () => {
    const items = planDeck({ pairs: makePairs(1), own: makeOwn(1), peer: makePeer(1), rng: makeRng(9) });
    const selection = chooseHoldOut(items);
    expect(selection.pairs).toBeLessThanOrEqual(2);
    expect(selection.own).toBe(1);
    expect(selection.peer).toBe(1);
    expect(selection.heldOutIds.length).toBe(selection.pairs * 2 + 2);
  });
});

// -- pairSplitRate (CH-09) --------------------------------------------------

describe('pairSplitRate', () => {
  const grade = (pairId: string, pairRole: 'satisfies' | 'violates', verdict: 'send' | 'would_not_send' | 'skip') =>
    ({ pairId, pairRole, verdict } as const);

  it('counts a split only when the satisfier was sent and the violator was not', () => {
    const result = pairSplitRate([
      grade('p1', 'satisfies', 'send'),
      grade('p1', 'violates', 'would_not_send'), // split
      grade('p2', 'satisfies', 'would_not_send'),
      grade('p2', 'violates', 'would_not_send'), // both rejected, no split
      grade('p3', 'satisfies', 'send'),
      grade('p3', 'violates', 'send'), // both sent, no split
      grade('p4', 'satisfies', 'would_not_send'),
      grade('p4', 'violates', 'send'), // inverted, no split
    ]);
    expect(result).toEqual({ split: 1, total: 4, rate: 0.25 });
  });

  it('excludes a pair from the denominator when either half was skipped', () => {
    const result = pairSplitRate([
      grade('p1', 'satisfies', 'send'),
      grade('p1', 'violates', 'would_not_send'),
      grade('p2', 'satisfies', 'send'),
      grade('p2', 'violates', 'skip'), // skip removes the pair entirely
      grade('p3', 'satisfies', 'skip'),
      grade('p3', 'violates', 'would_not_send'),
    ]);
    expect(result).toEqual({ split: 1, total: 1, rate: 1 });
  });

  it('excludes a half-graded pair', () => {
    expect(pairSplitRate([grade('p1', 'satisfies', 'send')])).toEqual({ split: 0, total: 0, rate: 0 });
  });

  it('ignores rows with no pair (own, peer and repeat items)', () => {
    const result = pairSplitRate([
      { pairId: null, pairRole: null, verdict: 'send' },
      { pairId: 'p1', pairRole: null, verdict: 'send' },
      grade('p2', 'satisfies', 'send'),
      grade('p2', 'violates', 'would_not_send'),
    ]);
    expect(result).toEqual({ split: 1, total: 1, rate: 1 });
  });

  it('reaches 7 of 10 for a generator that isolates dimensions', () => {
    const grades = [] as ReturnType<typeof grade>[];
    for (let i = 0; i < 10; i++) {
      const splits = i < 7;
      grades.push(grade(`p${i}`, 'satisfies', 'send'));
      grades.push(grade(`p${i}`, 'violates', splits ? 'would_not_send' : 'send'));
    }
    const result = pairSplitRate(grades);
    expect(result).toEqual({ split: 7, total: 10, rate: 0.7 });
    expect(haltVerdict(result.rate)).toBe('proceed');
  });

  it('splitRateForHalt returns null until enough pairs are scoreable', () => {
    const thin = [
      grade('p1', 'satisfies', 'send'),
      grade('p1', 'violates', 'would_not_send'),
    ];
    expect(splitRateForHalt(thin)).toBeNull();
    expect(haltVerdict(splitRateForHalt(thin))).toBe('proceed_flagged');
  });
});

describe('haltVerdict thresholds (CH-09, provisional)', () => {
  it('is proceed at and above 0.7', () => {
    expect(haltVerdict(0.7)).toBe('proceed');
    expect(haltVerdict(0.71)).toBe('proceed');
    expect(haltVerdict(1)).toBe('proceed');
  });
  it('is proceed_flagged from 0.4 up to but not including 0.7', () => {
    expect(haltVerdict(0.4)).toBe('proceed_flagged');
    expect(haltVerdict(0.5)).toBe('proceed_flagged');
    expect(haltVerdict(0.6999)).toBe('proceed_flagged');
  });
  it('halts below 0.4', () => {
    expect(haltVerdict(0.3999)).toBe('halt');
    expect(haltVerdict(0)).toBe('halt');
  });
  it('treats insufficient data as flagged, never as a pass', () => {
    expect(haltVerdict(null)).toBe('proceed_flagged');
    expect(haltVerdict(NaN)).toBe('proceed_flagged');
  });
});

// -- selfAgreement (CH-12) --------------------------------------------------

describe('selfAgreement', () => {
  it('counts a match when the repeat verdict equals the first verdict', () => {
    const result = selfAgreement([
      { itemId: 'a', verdict: 'send' },
      { itemId: 'b', verdict: 'would_not_send' },
      { itemId: 'c', verdict: 'send' },
      { itemId: 'r1', repeatOfItemId: 'a', verdict: 'send' },
      { itemId: 'r2', repeatOfItemId: 'b', verdict: 'send' },
      { itemId: 'r3', repeatOfItemId: 'c', verdict: 'send' },
    ]);
    expect(result).toEqual({ matched: 2, total: 3 });
  });

  it('excludes a probe when either showing was skipped', () => {
    const result = selfAgreement([
      { itemId: 'a', verdict: 'skip' },
      { itemId: 'b', verdict: 'send' },
      { itemId: 'r1', repeatOfItemId: 'a', verdict: 'send' },
      { itemId: 'r2', repeatOfItemId: 'b', verdict: 'skip' },
    ]);
    expect(result).toEqual({ matched: 0, total: 0 });
  });

  it('ignores a probe whose original has not been graded', () => {
    expect(selfAgreement([{ itemId: 'r1', repeatOfItemId: 'missing', verdict: 'send' }]))
      .toEqual({ matched: 0, total: 0 });
  });
});

// -- the kill gate (CH-03 / CH-08) ------------------------------------------

describe('canShowKill', () => {
  it('stays shut before screen 16 even when both sides are already there', () => {
    expect(canShowKill({ gradedCount: 15, trainingAccepts: 6, trainingRejects: 6 })).toBe(false);
    expect(canShowKill({ gradedCount: 16, trainingAccepts: 6, trainingRejects: 6 })).toBe(true);
  });
  it('stays shut until 4 accepts and 4 rejects exist among training items', () => {
    expect(canShowKill({ gradedCount: 20, trainingAccepts: 3, trainingRejects: 12 })).toBe(false);
    expect(canShowKill({ gradedCount: 20, trainingAccepts: 12, trainingRejects: 3 })).toBe(false);
    expect(canShowKill({ gradedCount: 20, trainingAccepts: 4, trainingRejects: 4 })).toBe(true);
  });
});

// -- text matching (CH-09 open answers, CH-10 emergent constructs) -----------

describe('namesIntendedDimension', () => {
  const key = 'one names a specific client fact, the other could be for anyone';

  it('accepts an answer that names the same dimension in the person own words', () => {
    expect(namesIntendedDimension('one is specific about the client, the other could be anyone', key)).toBe(true);
  });
  it('rejects an answer that names a different dimension', () => {
    expect(namesIntendedDimension('one is much shorter and punchier', key)).toBe(false);
  });
  it('rejects an empty or contentless answer', () => {
    expect(namesIntendedDimension('', key)).toBe(false);
    expect(namesIntendedDimension('not sure', key)).toBe(false);
    expect(namesIntendedDimension('the difference between them', key)).toBe(false);
  });
  it('is false when there is no key to match against', () => {
    expect(namesIntendedDimension('anything at all', '')).toBe(false);
  });
});

describe('matchesExistingConstruct (CH-10)', () => {
  const constructs = [
    { id: 'c1', emergentPole: 'names a specific client fact rather than generic praise' },
    { id: 'c2', emergentPole: 'states the next action and who owns it' },
  ];

  it('matches a why line that restates an existing construct', () => {
    expect(matchesExistingConstruct('too generic, names no specific client fact', constructs)?.id).toBe('c1');
    expect(matchesExistingConstruct('never states the next action', constructs)?.id).toBe('c2');
  });

  it('returns null for a genuinely new dimension, so it can become a candidate', () => {
    expect(matchesExistingConstruct('it buries the number three paragraphs down', constructs)).toBeNull();
    expect(matchesExistingConstruct('sounds like a press release', constructs)).toBeNull();
  });

  it('returns null for an empty or contentless why line', () => {
    expect(matchesExistingConstruct('', constructs)).toBeNull();
    expect(matchesExistingConstruct('no', constructs)).toBeNull();
  });

  it('returns null when nothing exists to match against', () => {
    expect(matchesExistingConstruct('anything', [])).toBeNull();
  });

  it('tokenises to content words only', () => {
    expect([...contentTokens('It is about the specific client fact')].sort())
      .toEqual(['client', 'fact', 'specific']);
  });
});

// -- peer corpus (CH-11) ----------------------------------------------------

describe('peer corpus', () => {
  it('never returns a sample without a named author and a checkable public URL', () => {
    for (const surface of PEER_SURFACES) {
      for (const sample of peerSamplesForSurface(surface)) {
        expect(sample.author.trim().length).toBeGreaterThan(0);
        expect(sample.source_url).toMatch(/^https?:\/\//);
        expect(sample.body.trim().length).toBeGreaterThan(0);
        expect(peerSourceLabel(sample)).toContain(sample.source_url);
      }
    }
  });

  it('returns nothing for an unsupported surface rather than borrowing another one', () => {
    expect(peerSamplesForSurface('sales decks')).toEqual([]);
    expect(peerCorpusStatus('sales decks').resolvedSurface).toBeNull();
  });

  it('resolves surface aliases onto the right shelf', () => {
    expect(peerCorpusStatus('Client Status Emails').resolvedSurface).toBe('client updates');
    expect(peerCorpusStatus('investor updates').resolvedSurface).toBe('board updates');
  });

  it('reports the shortfall so a run can record it instead of padding', () => {
    const status = peerCorpusStatus('client updates');
    expect(status.available + status.shortfall).toBeGreaterThanOrEqual(status.target);
    expect(status.awaitingCuration).toBe(status.available === 0);
  });
});

// -- PROMPT 2 drift guard ---------------------------------------------------

function repoFile(relative: string): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, relative);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`could not find ${relative} from ${process.cwd()}`);
}

describe('PROMPT 2 drift guard', () => {
  const doc = readFileSync(repoFile('docs/PHASE-0.5-HANDRUN.md'), 'utf8');

  it('carries the hand-run pair prompt character for character', () => {
    // The hand run only measures the shipped generator if the shipped generator
    // sends the same words. Byte identity, both directions.
    expect(doc).toContain(HANDRUN_PROMPT_2_RULES);

    const step2 = doc.slice(doc.indexOf('## Step 2'));
    const afterFence = step2.slice(step2.indexOf('```') + 3);
    const block = afterFence.slice(0, afterFence.indexOf('```'));
    expect(block.trim().startsWith(HANDRUN_PROMPT_2_RULES)).toBe(true);
  });

  it('ships the rules block at the head of the system prompt', () => {
    const prompt = buildPairSystemPrompt();
    expect(prompt.startsWith(HANDRUN_PROMPT_2_RULES)).toBe(true);
    expect(prompt).toContain('"pairs"');
    expect(prompt).toContain('intended_dimension');
  });

  it('reproduces the doc three input labels in the user prompt', () => {
    const user = buildPairUserPrompt({
      surface: 'client status emails',
      context: 'A three line context block.',
      constructs: [{ id: 'c1', emergentPole: 'names a specific client fact', quotes: ['I hate generic updates'] }],
    });
    expect(user).toContain('SURFACE: client status emails');
    expect(user).toContain('CONTEXT: A three line context block.');
    expect(user).toContain('CONSTRUCTS:');
    expect(user).toContain('construct_id: c1');
    expect(user).toContain('QUOTE: "I hate generic updates"');
  });

  it('keeps the doc one-rule promise: no em dashes in the shipped prompt', () => {
    expect(buildPairSystemPrompt()).not.toContain('\u2014');
  });

  it('builds the CONTEXT block from facts held, and invents nothing when none are', () => {
    const filled = composeContextLine(
      { company: 'Northbridge', role: 'Head of Delivery', industry: 'professional services' },
      'client updates',
    );
    expect(filled).toContain('Northbridge');
    expect(filled).toContain('Head of Delivery');
    expect(filled).toContain('professional services');

    const empty = composeContextLine({}, 'client updates');
    expect(empty).toBe(defaultContextLine('client updates'));
    expect(empty).toContain('do not have their company details on file');
  });
});

describe("hold-out slack against the release floor", () => {
  it("holds out more items than the release floor needs", async () => {
    // Verified requires VERIFIED_MIN_HELD_OUT graded held-out items. Holding
    // out exactly that many makes the label unreachable as soon as a leader
    // skips one screen, which is an accident rather than a high bar. The gap
    // is the number of skips a measured claim can survive.
    const { VERIFIED_MIN_HELD_OUT } = await import("./discrimination.ts");
    expect(SORT_BUDGET.holdOut.items).toBeGreaterThan(VERIFIED_MIN_HELD_OUT);
  });

  it("holds out whole pairs, so the pair design survives the split", () => {
    expect(SORT_BUDGET.holdOut.pairItems).toBe(SORT_BUDGET.holdOut.pairs * 2);
    expect(
      SORT_BUDGET.holdOut.pairItems + SORT_BUDGET.holdOut.own + SORT_BUDGET.holdOut.peer,
    ).toBe(SORT_BUDGET.holdOut.items);
  });

  it("leaves enough training items for the discrimination test to run", () => {
    // The test needs 4 accepted and 4 rejected among probe-applicable items.
    expect(SORT_BUDGET.training).toBeGreaterThanOrEqual(16);
    expect(SORT_BUDGET.training + SORT_BUDGET.holdOut.items).toBe(SORT_BUDGET.unique);
  });
});
