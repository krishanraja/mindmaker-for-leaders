/**
 * E2E: Canonical CEO journey for the audio briefing.
 *
 * This is the single most important user-facing flow in the product.
 * The contract this spec encodes (from PRs #92–#98):
 *   1. New user lands on /dashboard immediately, no full-screen onboarding gate.
 *   2. The opt-in onboarding banner is visible and dismissible.
 *   3. After dismissal, user navigates to the briefing surface.
 *   4. With ≥3 declared interests, an explicit "Generate today's briefing"
 *      CTA is rendered. Clicking it generates the briefing exactly once.
 *   5. After headlines arrive, "Generate audio" is a SEPARATE explicit
 *      action. Audio synthesis does not auto-fire.
 *   6. Hard-refreshing the page does NOT trigger regeneration - the briefing
 *      is read from the existing row.
 *   7. Logging out and back in: same - no regeneration.
 *
 * Run with `npm run test:e2e`. Requires a running dev server (Vite) and a
 * Supabase test project with a known user. The auth setup helper at
 * tests/auth.setup.ts (TODO) seeds those credentials. Until that helper
 * exists this spec is a contract document - the assertions are real but
 * the seed/teardown plumbing must be added before it can run on CI.
 *
 * To run the spec interactively against your local dev server (with manual
 * sign-in):
 *   1. npm run dev   (in another terminal)
 *   2. npx playwright test src/__tests__/e2e/briefing-journey.spec.ts --headed
 *
 * Skip mode is on by default so a `npm run test:e2e` doesn't fail without
 * the seed step. Remove `.skip` once the auth.setup is wired.
 */

import { test, expect } from '@playwright/test';

const TEST_USER_EMAIL = process.env.E2E_TEST_USER_EMAIL ?? 'e2e-briefing@example.com';
const TEST_USER_PASSWORD = process.env.E2E_TEST_USER_PASSWORD ?? 'e2e-fixture-password';

test.describe.skip('Briefing - canonical CEO journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[placeholder="Email address"]', TEST_USER_EMAIL);
    await page.fill('input[placeholder*="Password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
  });

  test('1. Lands on dashboard immediately, no full-screen onboarding gate', async ({ page }) => {
    // The dashboard chrome is always visible. The OnboardingInterview
    // component (which used to take over the screen) is not.
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Welcome to Control')).not.toBeVisible();
  });

  test('2. Onboarding banner is opt-in and dismissible', async ({ page }) => {
    // The thin top banner offers Set up + dismiss.
    const banner = page.locator('text=Set up your context in about a minute');
    if (await banner.count()) {
      await expect(banner).toBeVisible();
      await page.click('button[aria-label="Dismiss"]');
      await expect(banner).not.toBeVisible();
    }
  });

  test('3. Generate today\'s briefing is explicit; refresh does not regenerate', async ({ page }) => {
    await page.goto('/briefing');

    // If a briefing already exists for today, the "Generate today's briefing"
    // CTA must NOT be visible - we land directly on the BriefingCard.
    // The contract: refreshing should never call generate-briefing.
    const generateRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/functions/v1/generate-briefing')) {
        generateRequests.push(req.url());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Existing-briefing user: zero generate calls on refresh.
    expect(generateRequests).toHaveLength(0);
  });

  test('4. Generate audio is a separate explicit action', async ({ page }) => {
    await page.goto('/briefing');
    const synthRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/functions/v1/synthesize-briefing')) {
        synthRequests.push(req.url());
      }
    });

    // Just opening the briefing page must not trigger synthesis.
    await page.waitForLoadState('networkidle');
    expect(synthRequests).toHaveLength(0);

    // The Generate audio button is explicitly clickable when no audio exists.
    const generateAudio = page.locator('button:has-text("Generate audio")');
    if (await generateAudio.count()) {
      await generateAudio.click();
      await page.waitForLoadState('networkidle');
      expect(synthRequests.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('5. Sign out then sign back in: no briefing regeneration', async ({ page }) => {
    await page.goto('/dashboard?section=account');
    await page.click('button:has-text("Sign out")');
    await page.waitForURL('**/signin', { timeout: 5000 }).catch(() => {});

    // Sign back in via the beforeEach pattern
    await page.fill('input[placeholder="Email address"]', TEST_USER_EMAIL);
    await page.fill('input[placeholder*="Password"]', TEST_USER_PASSWORD);

    const generateRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/functions/v1/generate-briefing')) {
        generateRequests.push(req.url());
      }
    });

    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    await page.goto('/briefing');
    await page.waitForLoadState('networkidle');

    // Re-login + briefing visit → still no generate call (existing briefing
    // for the day is read from the row).
    expect(generateRequests).toHaveLength(0);
  });
});
