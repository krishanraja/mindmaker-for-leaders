/**
 * E2E: Kit Engine redeem-to-kit happy path (the class follow-up portal).
 *
 * The contract this spec encodes:
 *   1. A stranger with a session code lands on /kit?code=... and an anonymous
 *      session is created automatically; no email, no password, no gate.
 *   2. The code redeems (idempotently) and the student lands in the intake
 *      wizard with the class branding visible.
 *   3. Intake completes via taps + typing (voice is skipped in CI), which
 *      starts a compose build.
 *   4. The composing screen shows per-artifact progress AND the context-pull
 *      prompt with a copy button (the wait is the first action).
 *   5. The kit page reveals the generated first skill with a working ZIP
 *      download, the 7-day plan checklist, and the artifact cards.
 *   6. Checking a journey day persists; "I shipped it" records the event.
 *   7. A dead code shows the honest expiry screen with the Maven exit and
 *      the free /build exit, never a dead end.
 *
 * Seed requirement (service role, before running):
 *   INSERT INTO kit_codes (code, class_slug, label, skill_quota, pass_days)
 *   VALUES ('VIBE-E2E', 'vibe-coding', 'e2e fixture', 3, 30);
 * And for contract 7 an expired one:
 *   INSERT INTO kit_codes (code, class_slug, label, expires_at)
 *   VALUES ('VIBE-DEAD', 'vibe-coding', 'e2e expired fixture', now() - interval '1 day');
 *
 * Composition makes real LLM calls; run locally against dev with secrets
 * configured. Skip mode is on by default (same convention as the other
 * specs) until the seed plumbing exists in CI.
 *
 * To run interactively:
 *   1. npm run dev   (in another terminal)
 *   2. npx playwright test src/__tests__/e2e/kit-redeem-journey.spec.ts --headed
 */

import { test, expect } from '@playwright/test';

const KIT_CODE = process.env.E2E_KIT_CODE ?? 'VIBE-E2E';
const DEAD_CODE = process.env.E2E_KIT_DEAD_CODE ?? 'VIBE-DEAD';

test.describe.skip('Kit Engine - redeem to kit happy path', () => {
  test('1-5. Code to downloaded kit without an account', async ({ page }) => {
    test.setTimeout(5 * 60 * 1000); // composition makes real LLM calls

    // 1. Land with the code in the URL; anonymous session boots itself.
    await page.goto(`/kit?code=${KIT_CODE}`);

    // Class branding appears before/while the redeem resolves.
    await expect(page.locator('text=Vibe Coding')).toBeVisible({ timeout: 15000 });

    // 2. Redeem completes and the intake wizard opens.
    await page.waitForURL('**/kit/me/intake', { timeout: 30000 });

    // 3. Walk the wizard with taps + typed text (no voice in CI).
    // Q role: tap the first option card.
    await page.locator('[data-testid="intake-option"]').first().click();
    // Q grind: switch to typing and describe a workflow.
    await page.locator('text=Type instead').click();
    await page
      .locator('textarea')
      .first()
      .fill(
        'Every Monday I pull numbers from three dashboards, paste them into a deck, and write a summary for my team. It takes about two hours and I do it every single week.',
      );
    await page.locator('button:has-text("Continue")').click();
    // Remaining chips questions: tap first option until the wizard finishes.
    for (let i = 0; i < 6; i++) {
      const option = page.locator('[data-testid="intake-option"]').first();
      if (await option.count()) {
        await option.click();
        const cont = page.locator('button:has-text("Continue")');
        if (await cont.count()) await cont.click().catch(() => {});
      } else {
        break;
      }
    }

    // 4. Composing: progress + the context-pull prompt are both on screen.
    await page.waitForURL('**/kit/me', { timeout: 30000 });
    await expect(page.locator('text=/give your AI its homework/i')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('button:has-text("Copy")').first()).toBeVisible();

    // 5. The reveal: skill name hero + ZIP download + plan checklist.
    await expect(page.locator('[data-testid="kit-reveal"]')).toBeVisible({ timeout: 4 * 60 * 1000 });
    const download = page.waitForEvent('download');
    await page.locator('button:has-text("Download")').first().click();
    expect((await download).suggestedFilename()).toMatch(/\.zip$/);
    await expect(page.locator('[data-testid="journey-day"]').first()).toBeVisible();
  });

  test('6. Journey day checks persist and shipped records', async ({ page }) => {
    await page.goto('/kit/me');
    const day1 = page.locator('[data-testid="journey-day"]').first();
    await day1.locator('input[type="checkbox"], [role="checkbox"]').first().click();
    await page.reload();
    await expect(
      page
        .locator('[data-testid="journey-day"]')
        .first()
        .locator('input[type="checkbox"], [role="checkbox"]')
        .first(),
    ).toBeChecked();

    await page.locator('button:has-text("I shipped it")').click();
    await page.locator('button:has-text("Log it")').click();
    await expect(page.locator('text=/you shipped/i')).toBeVisible({ timeout: 15000 });
  });

  test('7. Dead code degrades honestly with two exits', async ({ page }) => {
    await page.goto(`/kit?code=${DEAD_CODE}`);
    await expect(page.locator('text=/code has ended/i')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=/catch the next class/i')).toBeVisible();
    await expect(page.locator('text=/free kit/i')).toBeVisible();
  });
});
