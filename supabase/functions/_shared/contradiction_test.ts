import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { resolveContradiction } from './contradiction.ts';

Deno.test('mutable, low-stakes -> recency wins (supersede old)', () => {
  for (const cat of ['preference', 'objective', 'blocker']) {
    const r = resolveContradiction(cat, false);
    assertEquals(r.strategy, 'recency');
    assertEquals(r.retireExisting, true);
    assertEquals(r.flagNew, false);
  }
});

Deno.test('high-stakes mutable -> ask user (never auto-retire)', () => {
  const r = resolveContradiction('objective', true);
  assertEquals(r.strategy, 'ask_user');
  assertEquals(r.retireExisting, false);
  assertEquals(r.flagNew, true);
});

Deno.test('identity / business -> ask user', () => {
  for (const cat of ['identity', 'business']) {
    const r = resolveContradiction(cat, false);
    assertEquals(r.strategy, 'ask_user');
    assertEquals(r.retireExisting, false);
    assertEquals(r.flagNew, true);
  }
});

Deno.test('unknown category -> ask user (safe default, never auto-retire)', () => {
  const r = resolveContradiction('something_new', false);
  assertEquals(r.retireExisting, false);
  assertEquals(r.strategy, 'ask_user');
});
