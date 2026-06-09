/**
 * E2E: Desktop fit-to-viewport (zero page-scroll) invariant.
 *
 * Contract this spec encodes:
 *   The WINDOW never scrolls on any authenticated desktop surface, at any
 *   supported desktop viewport. The app is pinned to the viewport via the
 *   shared --mobile-vh (100dvh) var in DesktopShell; all overflow lives in
 *   internal hidden-scrollbar regions, never on <html>/<body>.
 *
 * Why a test and not just CSS: it is easy for a future page to drop the
 * `flex-1 min-h-0 overflow-y-auto` wrapper and reintroduce a body scrollbar
 * (or, worse, silently clip content under the global `overflow:hidden`).
 * This asserts the structural guarantee holds end to end.
 *
 * Run against a build of the branch under test (NOT prod), e.g.:
 *   1. vercel env pull .env            (or otherwise provide VITE_SUPABASE_*)
 *   2. npm run build && npm run preview (serves dist on :4173)
 *   3. E2E_BASE_URL=http://localhost:4173 npx playwright test \
 *        src/__tests__/e2e/desktop-zero-scroll.spec.ts --headed
 *
 * Auth: signs up a throwaway account (the project runs with autoconfirm on
 * for QA). Skips automatically unless E2E_BASE_URL is set so a bare
 * `npm run test:e2e` stays green without backend credentials.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL;

// Desktop matrix: standard widths plus a deliberately SHORT height (680px) to
// catch content that only overflows on laptops / half-height windows.
const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x680 (short)', width: 1366, height: 680 },
];

// Every authenticated surface that wears the DesktopShell.
const ROUTES = [
  { path: '/dashboard', label: 'Memory Web' },
  { path: '/dashboard?view=edge', label: 'Edge' },
  { path: '/memory', label: 'Memory Browser' },
  { path: '/context', label: 'Export' },
  { path: '/briefing', label: 'Briefing' },
  { path: '/decision', label: 'Decide' },
  { path: '/settings', label: 'Settings' },
  { path: '/compliance', label: 'Compliance' },
];

const PASSWORD = 'CtrlZeroScroll!1';

async function signUp(page: Page) {
  const email = `test-${Date.now()}@test.com`;
  await page.goto('/auth');
  // Reveal the sign-up form.
  await page.getByRole('button', { name: /sign up/i }).first().click();
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 30_000 });
}

/** True page-scroll lives on the scrolling element (html/body), never a child. */
async function pageScrollOverflowPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    return el.scrollHeight - el.clientHeight;
  });
}

test.describe(BASE_URL ? 'Desktop zero-scroll invariant' : 'Desktop zero-scroll invariant (skipped: set E2E_BASE_URL)', () => {
  test.skip(!BASE_URL, 'Set E2E_BASE_URL to a build of the branch under test.');

  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${route.label} @ ${vp.name} has no page scroll`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route.path);
        // Let lazy chunks + first data paint settle.
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(600);

        // The desktop sidebar (chrome) must be present and pinned.
        await expect(page.locator('aside').first()).toBeVisible();

        // Allow 1px for sub-pixel rounding; anything more is a real scrollbar.
        const overflow = await pageScrollOverflowPx(page);
        expect(overflow, `page overflow on ${route.path} @ ${vp.name}`).toBeLessThanOrEqual(1);
      });
    }
  }
});
