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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'What if you did not need to hold all of this in your head?',
    );
    await expect(page.getByText('About three minutes. No account needed.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    if (process.env.E2E_CAPTURE_DIR) {
      await page.screenshot({ path: `${process.env.E2E_CAPTURE_DIR}/ctrl-onboarding-intro.png`, fullPage: true });
    }

    await page.getByRole('button', { name: 'Start with what is on my mind' }).click();
    await expect(page.getByLabel('Step 1 of 6')).toBeVisible();
    await page.getByRole('button', { name: 'Skip' }).click();

    const firstRange = page.locator('input[type="range"]');
    await firstRange.fill('72');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: /Thinking\. The deep work/ }).click();

    const secondRange = page.locator('input[type="range"]');
    await secondRange.fill('68');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: /A hybrid\. Humans and agents/ }).click();

    await page.getByRole('textbox').fill('Whether to rebuild our operating model around AI agents');
    await page.getByRole('button', { name: 'Show me what you see' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(generatedResult.archetype_title);
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
});
