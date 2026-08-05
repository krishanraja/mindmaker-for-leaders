/**
 * E2E contract: account deletion (GDPR Art. 17).
 *
 * The audit's P0-3 closed the silent-failure bug where assessment cleanup
 * filtered on a column that didn't exist (`owner_user_id`), leaving rows
 * orphaned, and added Storage purge for the user's audio briefings.
 *
 * This spec covers:
 *   1. Successful deletion returns 200 with `success: true` and an empty
 *      `errors` array. A populated `errors` array means a table (or the
 *      auth user) survived, which is a failed erasure, not a warning.
 *   2. After deletion, querying any of the user's tables as the same
 *      session (now invalidated) returns no rows.
 *   3. The user's storage prefix in `ctrl-briefings` and `documents` is
 *      empty.
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.E2E_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const TEST_DELETABLE_USER_ID = process.env.E2E_DELETABLE_USER_ID;
const TEST_USER_EMAIL = process.env.E2E_DELETABLE_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.E2E_DELETABLE_USER_PASSWORD;

// Needs a live Supabase stack plus a pre-seeded throwaway user; set
// E2E_SUPABASE_URL, E2E_SUPABASE_SERVICE_ROLE_KEY, E2E_DELETABLE_USER_ID,
// E2E_DELETABLE_USER_EMAIL and E2E_DELETABLE_USER_PASSWORD, then drop the
// .skip to run it.
test.describe.skip('Account deletion - full erasure', () => {
  test('Deletes DB rows AND storage objects for a seeded user', async ({ page }) => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TEST_DELETABLE_USER_ID) {
      test.skip(true, 'E2E env vars not set');
    }

    // Sign the user in via UI so we have a real auth header for the
    // delete-account function call.
    await page.goto('/signin');
    await page.fill('input[placeholder="Email address"]', TEST_USER_EMAIL!);
    await page.fill('input[placeholder*="Password"]', TEST_USER_PASSWORD!);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // Trigger deletion via Settings → Account → Sign out / delete flow.
    await page.goto('/dashboard?section=privacy');
    await page.click('button:has-text("Delete account")');
    await page.fill('input[placeholder*="email"]', TEST_USER_EMAIL!);
    const deletionResponse = page.waitForResponse((r) =>
      r.url().includes('/functions/v1/delete-account'),
    );
    await page.click('button:has-text("Delete forever")');

    // The function returns success:true even when individual table or auth
    // deletes failed, listing them in `errors`. Partial erasure fails here.
    const deletionBody = await (await deletionResponse).json();
    expect(deletionBody.error, 'delete-account error field').toBeFalsy();
    expect(deletionBody.errors ?? [], 'per-table deletion errors').toEqual([]);
    expect(deletionBody.success, 'delete-account success flag').toBe(true);

    // Verify with service-role client that nothing remains.
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const tables = [
      'leaders', 'user_memory', 'user_decisions', 'leader_missions',
      'briefings', 'briefing_interests', 'suggested_briefing_interests',
    ];
    for (const table of tables) {
      const { count, error } = await admin
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', TEST_DELETABLE_USER_ID!);
      expect(error, `${table} query`).toBeNull();
      expect(count, `${table} should be empty post-deletion`).toBe(0);
    }

    // Storage objects under the user's UUID prefix should be gone.
    for (const bucket of ['ctrl-briefings', 'documents']) {
      const { data } = await admin.storage.from(bucket).list(TEST_DELETABLE_USER_ID!);
      expect(data, `${bucket} prefix listing`).toBeDefined();
      expect((data ?? []).length, `${bucket} prefix should be empty`).toBe(0);
    }

    // Auth user record should also be gone (auth.admin.deleteUser).
    const { data: u, error: uErr } = await admin.auth.admin.getUserById(TEST_DELETABLE_USER_ID!);
    expect(u?.user, 'auth user should be deleted').toBeNull();
    expect(uErr, 'expected user-not-found error').toBeTruthy();
  });
});
