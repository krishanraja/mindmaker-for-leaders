import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { gateReaction, numericCore, findInEvidence, reactionKindMark } from './reaction-extraction.ts';

Deno.test('numericCore pulls the comma-stripped number from short values', () => {
  assertEquals(numericCore('~40%'), '40');
  assertEquals(numericCore('10x'), '10');
  assertEquals(numericCore('$2.5M'), '2.5');
  assertEquals(numericCore('3,200'), '3200');
  assertEquals(numericCore('matched'), null); // no number => words lead
});

Deno.test('SOURCED: a number that appears in an evidence excerpt is accepted + cited', () => {
  const ev = [
    { id: 'e1', excerpt: 'Frontier token prices fell roughly 40% over the quarter.' },
    { id: 'e2', excerpt: 'A vendor blog with no figures.' },
  ];
  const r = gateReaction({ value: '~40%', descriptor: 'cheaper to rent than build' }, ev);
  assertEquals(r, { value: '~40%', descriptor: 'cheaper to rent than build', kind: 'sourced', evidence_id: 'e1' });
});

Deno.test('INVENTION: a number in no excerpt and not flagged modelled is REJECTED', () => {
  const ev = [{ id: 'e1', excerpt: 'Costs came down a lot this year.' }];
  assertEquals(gateReaction({ value: '10x', descriptor: 'cheaper' }, ev), null);
});

Deno.test('MODELLED: a derivation on a quantitatively-grounded claim is accepted, marked est.', () => {
  // evidence carries figures ($3 vs $0.30) the 10x is derived from, but not "10" verbatim
  const ev = [{ id: 'e1', excerpt: 'Build runs about $3 per 1k tokens; renting is $0.30.' }];
  const r = gateReaction({ value: '10x', descriptor: 'cheaper to rent', modelled: true }, ev);
  assertEquals(r?.kind, 'modelled');
  assertEquals(r?.evidence_id, null);
  assertEquals(reactionKindMark('modelled'), 'est.');
  assertEquals(reactionKindMark('sourced'), '');
});

Deno.test('MODELLED guard: a derivation on a purely-qualitative claim is REJECTED', () => {
  const ev = [{ id: 'e1', excerpt: 'Renting is cheaper now; no figures given at all.' }];
  assertEquals(gateReaction({ value: '10x', descriptor: 'cheaper to rent', modelled: true }, ev), null);
});

Deno.test('BUDGET: an over-long value is rejected (hero number is a glance)', () => {
  const ev = [{ id: 'e1', excerpt: 'The figure 1234567890 appears here.' }];
  assertEquals(gateReaction({ value: '1234567890', descriptor: 'too long' }, ev), null);
});

Deno.test('NO NUMBER: a wordy value is rejected (the surface leads with words instead)', () => {
  const ev = [{ id: 'e1', excerpt: 'matched the frontier' }];
  assertEquals(gateReaction({ value: 'matched', descriptor: 'the frontier' }, ev), null);
});

Deno.test('findInEvidence ignores url-less / excerpt-less rows', () => {
  const ev = [{ id: 'e1', excerpt: null }, { id: 'e2', excerpt: 'up 40% this quarter' }];
  assertEquals(findInEvidence('40%', ev)?.id, 'e2');
});
