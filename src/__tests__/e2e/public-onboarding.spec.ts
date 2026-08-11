import { expect, test } from '@playwright/test';

const generatedResult = {
  archetype_title: 'The operator running humans and agents as one team.',
  twelve_months:
    'A year from now, the call on your operating model is made. The repeatable middle moves without waiting for you, while you stay close to the choices that shape the company. Your week has room to think, and your team knows where human judgement still matters.',
  three_years:
    'Three years from now, humans and agents work as one team. The system carries the drag and gives you a clearer view of where your judgement changes the outcome.',
};

test.describe('Public CTRL onboarding', () => {
  test('moves from one calm question to a useful result and consented handoff', async ({ page }) => {
    const functionCalls: string[] = [];
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/rest/v1/cannes_responses*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/0' },
        body: '[]',
      });
    });
    await page.route('**/functions/v1/**', async (route) => {
      const functionName = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      functionCalls.push(functionName);
      if (functionName === 'generate-result') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(generatedResult) });
        return;
      }
      if (functionName === 'track-fork') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, handoff: '11111111-1111-4111-8111-111111111111' }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/CTRL/);
    const onboardingSurface = page.locator('main[data-onboarding-step]');
    const observedProgress: number[] = [];
    const recordBrandProgress = async (expectedStep: string, expectedProgress: string) => {
      await expect(onboardingSurface).toHaveAttribute('data-onboarding-step', expectedStep);
      await expect(onboardingSurface).toHaveAttribute('data-brand-progress', expectedProgress);
      observedProgress.push(Number(expectedProgress));
    };
    await recordBrandProgress('intro', '0.00');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'What if you did not need to hold all of this in your head?',
    );
    await expect(page.getByText('About three minutes. No account needed.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    if (process.env.E2E_CAPTURE_DIR) {
      await page.screenshot({ path: `${process.env.E2E_CAPTURE_DIR}/ctrl-onboarding-intro.png`, fullPage: true });
    }

    await page.getByRole('button', { name: 'Start with what is on my mind' }).click();
    await recordBrandProgress('identity', '0.14');
    await expect(page.getByLabel('Step 1 of 6')).toBeVisible();
    await page.getByRole('button', { name: 'Skip' }).click();
    await recordBrandProgress('week', '0.30');

    const firstRange = page.locator('input[type="range"]');
    await firstRange.fill('72');
    await page.getByRole('button', { name: 'Next' }).click();
    await recordBrandProgress('extra', '0.46');
    await expect(page.getByRole('heading', { name: 'If you had one extra version of yourself, what would they spend their time on?' })).toBeVisible();
    if (process.env.E2E_CAPTURE_DIR) {
      await page.screenshot({ path: `${process.env.E2E_CAPTURE_DIR}/ctrl-onboarding-midpoint.png`, fullPage: true });
    }
    await page.getByRole('button', { name: /Thinking\. The deep work/ }).click();
    await recordBrandProgress('ai', '0.62');

    const secondRange = page.locator('input[type="range"]');
    await secondRange.fill('68');
    await page.getByRole('button', { name: 'Next' }).click();
    await recordBrandProgress('future', '0.78');
    await page.getByRole('button', { name: /A hybrid\. Humans and agents/ }).click();
    await recordBrandProgress('decision', '0.90');
    await expect(page.getByRole('heading', { name: "What's the one decision you keep not making?" })).toBeVisible();
    if (process.env.E2E_CAPTURE_DIR) {
      await page.screenshot({ path: `${process.env.E2E_CAPTURE_DIR}/ctrl-onboarding-decision.png`, fullPage: true });
    }

    await page.getByRole('textbox').fill('Whether to rebuild our operating model around AI agents');
    await page.getByRole('button', { name: 'Show me what you see' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(generatedResult.archetype_title);
    await recordBrandProgress('result', '1.00');
    expect(observedProgress).toEqual([...observedProgress].sort((a, b) => a - b));
    await expect(page.locator('[data-brand-progress="1.00"] img')).toHaveCSS('opacity', '1');
    await expect(onboardingSurface).toHaveCSS('background-color', 'rgb(8, 9, 12)');
    await expect(page.getByText('One email each morning, with audio. No login needed. One click to stop.')).toBeVisible();
    await expect(page.getByText('Blind spots surfaced gently, when they matter')).toBeVisible();
    if (process.env.E2E_CAPTURE_DIR) {
      await page.screenshot({ path: `${process.env.E2E_CAPTURE_DIR}/ctrl-onboarding-result.png`, fullPage: true });
    }

    await page.getByPlaceholder('Where should the morning brief go?').fill('leader@example.com');
    await page.getByRole('button', { name: 'Start it' }).click();
    await expect(page.getByRole('button', { name: 'Briefing on' })).toBeVisible();
    await expect.poll(() => functionCalls.filter((name) => name === 'subscribe-briefing')).toHaveLength(1);
    await expect.poll(() => functionCalls.filter((name) => name === 'send-result-email')).toHaveLength(1);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.getByRole('button', { name: 'Let CTRL start here' }).click();
    await expect(page).toHaveURL(/\/auth\?mode=signup&h=11111111-1111-4111-8111-111111111111$/);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('handoff_token'))).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(functionCalls.filter((name) => name === 'track-fork')).toHaveLength(1);
    expect(consoleErrors).toEqual([]);
  });

  test('removes decorative transition motion when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.locator('main[data-onboarding-step]')).toHaveCSS('transition-duration', '0s');
    await expect(page.getByRole('img', { name: 'Mindmaker CTRL' })).toHaveAttribute('data-brand-progress', '0.00');
  });

  test('keeps the complete handoff usable at the 320px fallback', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.route('**/rest/v1/cannes_responses*', async (route) => {
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/functions/v1/**', async (route) => {
      const functionName = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(functionName === 'generate-result' ? generatedResult : { ok: true }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Start with what is on my mind' }).click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.locator('input[type="range"]').fill('72');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: /Thinking\. The deep work/ }).click();
    await page.locator('input[type="range"]').fill('68');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: /A hybrid\. Humans and agents/ }).click();
    await page.getByRole('textbox').fill('Whether to rebuild our operating model around AI agents');
    await page.getByRole('button', { name: 'Show me what you see' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(generatedResult.archetype_title);
    await expect(page.locator('main[data-onboarding-step]')).toHaveAttribute('data-brand-progress', '1.00');
    const primaryAction = page.getByRole('button', { name: 'Let CTRL start here' });
    await primaryAction.scrollIntoViewIfNeeded();
    const actionBox = await primaryAction.boundingBox();
    expect(actionBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    if (process.env.E2E_CAPTURE_DIR) {
      await page.screenshot({ path: `${process.env.E2E_CAPTURE_DIR}/ctrl-onboarding-result-320.png`, fullPage: true });
    }
  });

  test('keeps the public invitation calm on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const startButton = page.getByRole('button', { name: 'Start with what is on my mind' });
    await page.keyboard.press('Tab');
    await expect(startButton).toBeFocused();
    expect(await startButton.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'I already use CTRL' })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    if (process.env.E2E_CAPTURE_DIR) {
      await page.screenshot({ path: `${process.env.E2E_CAPTURE_DIR}/ctrl-onboarding-intro-desktop.png`, fullPage: true });
    }
  });
});
