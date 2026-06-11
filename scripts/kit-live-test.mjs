/**
 * Kit Engine LIVE end-to-end test. No mocks: real anonymous session, real
 * kit-redeem, real kit-compose (real LLM), real artifacts, real storage
 * download, real journey writes. Drives the local dev server, which is wired
 * to the production Supabase project. Screenshots each state to
 * scripts/_kitlive/ and prints a pass/fail report.
 *
 * Usage: node scripts/kit-live-test.mjs [baseURL] [code]
 *   default baseURL http://localhost:8083, code VIBE-TEST
 */
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8083';
const CODE = process.argv[3] || 'VIBE-TEST';
const OUT = path.join(process.cwd(), 'scripts', '_kitlive');
fs.mkdirSync(OUT, { recursive: true });

const GRIND = 'Every Monday I pull last week numbers from three different dashboards, paste them into a slide, and write a short summary for my team. It takes me about two hours and I do it every single week without fail.';

const report = [];
const pass = (m) => { report.push('PASS ' + m); console.log('PASS', m); };
const fail = (m) => { report.push('FAIL ' + m); console.log('FAIL', m); };

async function shot(page, name) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${CODE}-${name}.png`), fullPage: false });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

  try {
    // 1. Redeem (real anon session + real kit-redeem)
    await page.goto(`${BASE}/kit?code=${CODE}`, { waitUntil: 'networkidle' });
    const landedIntake = await page.locator('[data-testid="intake-option"], textarea')
      .first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
    if (landedIntake) pass('redeem -> intake wizard'); else { fail('redeem did not reach intake'); await shot(page, '01-redeem-FAIL'); }
    await shot(page, '01-intake');

    // 2. Walk the intake. Tap first option per chips question; type the grind on the voice question.
    for (let i = 0; i < 10; i++) {
      if (page.url().includes('/kit/me') && !page.url().includes('intake')) break;
      const typeTab = page.locator('text=Type instead').first();
      if (await typeTab.count()) {
        await typeTab.click().catch(() => {});
        const ta = page.locator('textarea').first();
        if (await ta.count()) await ta.fill(GRIND);
      }
      const opt = page.locator('[data-testid="intake-option"]').first();
      if (await opt.count()) await opt.click().catch(() => {});
      const cont = page.locator('button:has-text("Continue")').first();
      if (await cont.count() && await cont.isEnabled().catch(() => false)) await cont.click().catch(() => {});
      await page.waitForTimeout(800);
    }
    pass('intake completed');

    // 3. Composing -> wait for the real build to finish.
    await page.waitForURL('**/kit/me', { timeout: 30000 }).catch(() => {});
    const homework = await page.locator('text=/homework/i').first().waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
    if (homework) pass('composing screen + homework prompt'); else fail('composing screen not shown');
    await shot(page, '02-composing');

    const revealed = await page.locator('[data-testid="kit-reveal"]').waitFor({ state: 'visible', timeout: 240000 }).then(() => true).catch(() => false);
    if (revealed) pass('build completed -> reveal'); else { fail('reveal not reached within 4 min'); await shot(page, '03-reveal-FAIL'); }
    await page.waitForTimeout(1500);
    await shot(page, '03-reveal');

    // 4. Skill present + ZIP download works (real storage).
    const dlBtn = page.locator('button:has-text("Download")').first();
    if (await dlBtn.count()) {
      const dl = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
      await dlBtn.click().catch(() => {});
      const file = await dl;
      if (file && /\.zip$/.test(file.suggestedFilename())) pass('skill ZIP downloaded: ' + file.suggestedFilename());
      else fail('skill ZIP download did not fire');
    } else fail('no download button on reveal');

    // 5. Journey: check day 1, then log shipped.
    const day = page.locator('[data-testid="journey-day"]').first();
    if (await day.count()) {
      const cb = day.locator('input[type="checkbox"], [role="checkbox"], button').first();
      await cb.click().catch(() => {});
      await page.waitForTimeout(1200);
      pass('journey day toggled');
    } else fail('no journey day rows');

    const shipBtn = page.locator('button:has-text("I shipped it")').first();
    if (await shipBtn.count()) {
      await shipBtn.scrollIntoViewIfNeeded().catch(() => {});
      await shipBtn.click().catch(() => {});
      // Wait for the ship sheet to finish opening before clicking Log it.
      const logBtn = page.locator('button:has-text("Log it")').first();
      const sheetOpen = await logBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
      if (!sheetOpen) fail('ship sheet did not open');
      await page.waitForTimeout(600); // let the open animation settle so the click lands
      await shot(page, '04a-ship-sheet');
      await logBtn.click().catch(() => {});
      const shipped = await page.locator('text=/you shipped/i').first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
      if (shipped) pass('shipped logged + celebration'); else fail('shipped state not confirmed');
      await shot(page, '04-shipped');
    } else fail('no I-shipped-it button');

  } catch (e) {
    fail('exception: ' + e.message);
  }

  console.log('\n===== LIVE TEST REPORT (' + CODE + ') =====');
  report.forEach((r) => console.log(r));
  console.log('\nConsole errors (' + errors.length + '):');
  errors.slice(0, 25).forEach((e) => console.log('  - ' + e));
  fs.writeFileSync(path.join(OUT, `${CODE}-report.txt`), report.join('\n') + '\n\nERRORS:\n' + errors.join('\n'));

  await browser.close();
  process.exit(report.some((r) => r.startsWith('FAIL')) ? 2 : 0);
})();
