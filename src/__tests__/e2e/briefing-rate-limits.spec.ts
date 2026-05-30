/**
 * E2E contract: briefing rate limits + force-regen cooldown.
 *
 * The audit's P1-1 added per-user rate limits to the most expensive edge
 * functions; P0-7 added a 1/min force-regen cooldown so a double-tapped
 * "Refresh stories" doesn't burn two parallel pipelines.
 *
 * This spec drives the edge functions directly with a real auth token.
 * Skipped until the seed user + an authed Supabase fetch helper are in
 * place. The contract:
 *   1. 12 rapid generate-briefing calls succeed; the 13th in the same
 *      window returns 429 with retry_after_ms.
 *   2. Two rapid force=true calls within 60s for the same (user, date,
 *      type) return 429 + cooldown:true on the second; existing briefing
 *      id is returned so the UI can reuse it.
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.E2E_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY;
const USER_EMAIL = process.env.E2E_TEST_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD;

async function authedClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('env not set');
  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  await c.auth.signInWithPassword({ email: USER_EMAIL!, password: USER_PASSWORD! });
  return c;
}

test.describe.skip('Briefing rate limits + force-regen cooldown', () => {
  test('13th call in 60s returns 429 with retry_after_ms', async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip(true, 'E2E_SUPABASE_URL/ANON_KEY not set');
    }
    const c = await authedClient();
    const responses = [];
    for (let i = 0; i < 13; i++) {
      const r = await c.functions.invoke('generate-briefing', {
        body: { briefing_type: 'default' },
      });
      responses.push(r);
    }
    // First 12 should not be rate-limited (some may already_exist; that's
    // a different success state - we care about the absence of 429s).
    const first12 = responses.slice(0, 12);
    for (const r of first12) {
      expect((r.data as { error?: string })?.error).not.toBe('rate_limited');
    }
    // 13th hits the limit.
    const last = responses[12];
    expect((last.data as { error?: string })?.error).toBe('rate_limited');
    expect((last.data as { retry_after_ms?: number })?.retry_after_ms).toBeGreaterThan(0);
  });

  test('Second force-regen within 60s returns 429 cooldown:true', async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip(true, 'E2E_SUPABASE_URL/ANON_KEY not set');
    }
    const c = await authedClient();
    // Ensure a briefing exists for today first.
    await c.functions.invoke('generate-briefing', { body: { briefing_type: 'default' } });
    // First force=true is allowed.
    const a = await c.functions.invoke('generate-briefing', {
      body: { briefing_type: 'default', force: true },
    });
    expect((a.data as { briefing_id?: string })?.briefing_id).toBeTruthy();
    // Second force=true within the cooldown returns 429 cooldown:true.
    const b = await c.functions.invoke('generate-briefing', {
      body: { briefing_type: 'default', force: true },
    });
    expect((b.data as { cooldown?: boolean })?.cooldown).toBe(true);
    expect((b.data as { briefing_id?: string })?.briefing_id).toBeTruthy();
  });
});
