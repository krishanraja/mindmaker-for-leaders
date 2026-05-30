import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for mm-ctrl e2e tests.
 *
 * Specs live under `src/__tests__/e2e/`. Most existing specs (and the new
 * briefing-journey one) are `.skip`'d until the auth seed helper is wired
 * up - they're contracts in code form. Run `npm run test:e2e -- --headed`
 * locally against a running dev server (`npm run dev`) once seeded.
 *
 * Extend with `webServer` to auto-launch the dev server in CI when the
 * seed plumbing is in place.
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
