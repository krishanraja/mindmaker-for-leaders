import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'https://ctrl.themindmaker.ai';
const OUT = 'C:/Users/krish/audit/mm-ctrl/2026-07-04/evidence';
const [EMAIL, PW] = fs.readFileSync('C:/Users/krish/AppData/Local/Temp/claude/C--Users-krish/97888316-729a-4513-ab7a-843bcb59a1f4/scratchpad/verify_user.txt','utf8').trim().split(' ');
const log = (...a) => console.log(...a);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// 1. Public /pricing (logged out)
await page.goto(BASE+'/pricing', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(()=>{});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/21-pricing-public.png` });
log('21 pricing:', page.url());

// 2. Login
await page.goto(BASE+'/auth', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.locator('input[type="email"]').first().fill(EMAIL);
await page.locator('input[type="password"]').first().fill(PW);
await page.locator('input[type="password"]').first().press('Enter');
await page.waitForTimeout(7000);
log('after login:', page.url());

// 3. Dashboard: sidebar footer (clean) + collapsed More
await page.goto(BASE+'/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/22-sidebar-footer-nav.png` });
log('22 dashboard sidebar');

// 4. Expand More
const moreBtn = page.locator('button:has-text("More")').first();
await moreBtn.click().catch(e=>log('more click err', e.message));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/23-more-expanded.png` });
log('23 more expanded');

// 5. Decision result: reframe banner + upgrade nudge
await page.goto(BASE+'/decision', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.screenshot({ path: `${OUT}/24-decision-reframe-nudge.png` });
log('24 decision:', page.url());

// 6. Settings Edge Pro ($49)
await page.goto(BASE+'/settings', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/25-settings.png` });
log('25 settings');

await browser.close();
log('DONE');
