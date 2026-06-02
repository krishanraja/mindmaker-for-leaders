/**
 * E2E contract: sparse-profile guardrail.
 *
 * The audit's P0-2-derivative on the input side: a leader with too little
 * structured signal (interests + missions + decisions < 5) should NOT see
 * a generic briefing - the backend returns a structured
 * `{error: "profile_too_sparse"}` payload and the frontend renders an
 * amber onboarding card instead of empty headlines.
 *
 * Skipped until the auth seed plumbing exists. See briefing-journey.spec
 * for the same pattern.
 */

import { test, expect } from '@playwright/test';

const SPARSE_USER_EMAIL = process.env.E2E_SPARSE_USER_EMAIL ?? 'e2e-sparse@example.com';
const SPARSE_USER_PASSWORD = process.env.E2E_SPARSE_USER_PASSWORD ?? 'e2e-fixture-password';

test.describe.skip('Briefing - sparse-profile guardrail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[placeholder="Email address"]', SPARSE_USER_EMAIL);
    await page.fill('input[placeholder*="Password"]', SPARSE_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
  });

  test('User with <5 combined signal sees the amber CTA, not a briefing', async ({ page }) => {
    await page.goto('/briefing');

    // Click whatever generate CTA is shown, if any.
    const generate = page.locator('button:has-text("Generate today\'s briefing")');
    if (await generate.count()) {
      await generate.click();
    }

    // The frontend should surface the sparse-profile state directly when
    // the backend returns 200 + {error: "profile_too_sparse"}.
    await expect(
      page.locator('text=A little more signal, and your briefing lands'),
    ).toBeVisible({ timeout: 10_000 });

    // Add interests CTA wires to the InterestsSheet.
    await page.click('button:has-text("Add interests")');
    await expect(page.locator('text=Topics you care about')).toBeVisible();
  });

  test('After enriching profile to ≥5 signals, briefing generates normally', async ({ page }) => {
    await page.goto('/dashboard?section=briefing-interests');
    // Add 3 beats and 2 entities so positive + missions + decisions ≥ 5.
    for (const topic of ['AI infra', 'enterprise SaaS', 'developer tools']) {
      await page.fill('input[placeholder="Add a topic"]', topic);
      await page.click('button:has(svg.lucide-plus)');
    }
    for (const entity of ['Anthropic', 'OpenAI']) {
      await page.fill('input[placeholder="Add a person or company"]', entity);
      await page.click('button:has(svg.lucide-plus)');
    }
    await page.goto('/briefing');
    const generate = page.locator('button:has-text("Generate today\'s briefing")');
    if (await generate.count()) await generate.click();
    // The amber sparse card must be gone; segments visible.
    await expect(page.locator('text=A little more signal')).not.toBeVisible();
  });
});
