/**
 * Kit Engine visual + functional harness.
 *
 * Drives the local dev server through the entire student flow with the kit
 * network layer MOCKED (route interception of supabase functions.invoke and
 * postgrest), so every screen can be screenshotted and verified visually
 * before the backend is live. Mobile viewport (iPhone 13). Outputs PNGs to
 * scripts/_kitshots/ which are gitignored.
 *
 * Run: node scripts/kit-visual-harness.mjs [baseURL]
 */
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8083';
const OUT = path.join(process.cwd(), 'scripts', '_kitshots');
fs.mkdirSync(OUT, { recursive: true });

const REDEMPTION = {
  id: 'red_test_0001',
  user_id: 'anon_test_user',
  class_slug: 'vibe-coding',
  preset_version: '1.0.0',
  redeemed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  status: 'active',
  skill_quota: 3,
  skills_used: 0,
  delivery_email: null,
};

const ARTIFACTS = buildArtifacts();
let BUILD = {
  id: 'build_test_0001',
  user_id: 'anon_test_user',
  redemption_id: REDEMPTION.id,
  class_slug: 'vibe-coding',
  preset_version: '1.0.0',
  kind: 'initial',
  status: 'complete',
  intake: {},
  artifact_statuses: Object.fromEntries(
    ARTIFACTS.map((a) => [a.artifact_id, { status: 'done', kit_artifact_id: a.id }]),
  ),
  created_at: new Date().toISOString(),
};

function buildArtifacts() {
  const mk = (artifact_id, title, content_type, body, metadata = {}, part = null) => ({
    id: `art_${artifact_id}`,
    redemption_id: REDEMPTION.id,
    artifact_id,
    version: 1,
    is_current: true,
    title,
    content_type,
    body,
    storage_path: content_type === 'zip' ? `anon/red/${artifact_id}.zip` : null,
    metadata: { part, description: `What to do with ${title}.`, ...metadata },
    created_at: new Date().toISOString(),
  });
  return [
    mk('first-skill', 'monday-numbers-roundup', 'zip', '# monday-numbers-roundup\n\nThe skill body.', {
      part: 'Brief + Build',
      skill: {
        name: 'monday-numbers-roundup',
        description: 'Turns three dashboard exports into a written Monday update for your team.',
        test_prompts: ['Here are this week dashboard exports, write my Monday update.'],
      },
      zip_filename: 'monday-numbers-roundup.zip',
    }, 'Brief + Build'),
    mk('leverage-audit', 'Your leverage audit', 'markdown',
      '## Your leverage audit\n\nYour Monday roundup scores high on frequency (weekly) and low on judgment.\n\n**Build this first:** the Monday numbers roundup. It is the smallest weekly task that an AI can fully own.',
      {}, 'Spot + Spec'),
    mk('seven-day-plan', 'Your 7-day plan', 'json', JSON.stringify({
      days: [
        { day: 1, title: 'Install', action: 'Install monday-numbers-roundup and run test prompt 1.', minutes: 15 },
        { day: 2, title: 'Real input', action: 'Run it on this week real dashboard exports.', minutes: 15 },
        { day: 3, title: 'Context pull', action: 'Run the context pull prompt and keep the output.', minutes: 10 },
        { day: 4, title: 'Tighten', action: 'Fix the one thing that felt off.', minutes: 20 },
        { day: 5, title: 'Show one human', action: 'Show the update to a teammate.', minutes: 10 },
        { day: 6, title: 'Fix their note', action: 'Apply the one piece of feedback that matters.', minutes: 20 },
        { day: 7, title: 'Ship it scrappy', action: 'Use it for real and log it here.', minutes: 15 },
      ],
    }), {}, 'Verify + Govern'),
    mk('personal-map', 'Your map', 'json', JSON.stringify({
      stage: 'first-builds', firstBuild: 'Monday numbers roundup', tool: 'Claude',
      tier: 'with review', path: 'Install, run on real input, show one human, ship by day 7.',
    }), {}, null),
    mk('five-part-brief', 'Your five-part brief', 'markdown',
      '## Your five-part brief\n\n**Goal:** [FILL IN: the one outcome]\n\n**Context:** You pull from three dashboards every Monday.\n\n**Format:** A short written update.\n\n**Constraints:** Under 200 words.\n\n**Acceptance:** A teammate reads it and needs no follow-up.', {}, 'Brief + Build'),
    mk('spec-interviewer', 'The spec interviewer', 'markdown',
      '## The spec interviewer\n\nPaste this into Claude:\n\n> Interview me one question at a time, 15 questions, then write a one-page spec.', {}, 'Spot + Spec'),
    mk('session-scripts', 'Session scripts', 'markdown',
      '## Session scripts\n\n**Plan mode opener:** Give me a numbered plan first. Do not execute yet.', {}, 'Brief + Build'),
    mk('context-capsule', 'The context capsule', 'markdown',
      '## The context capsule\n\nAsk your AI to summarise everything it knows about you under fixed headings, then paste it back here.', {}, 'Brief + Build'),
  ];
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: 'anon_test_user', aud: 'authenticated', role: 'authenticated',
    is_anonymous: true, email: null, phone: '', app_metadata: { provider: 'anonymous' },
    user_metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    identities: [],
  };
  const jwt = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: user.id, role: 'authenticated', aud: 'authenticated', is_anonymous: true, exp: now + 3600, iat: now, session_id: 'sess_test' })}.sig`;
  return {
    access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
    refresh_token: 'refresh_test_token', user,
  };
}

async function installMocks(page, state) {
  // Anonymous auth: return a valid-looking session so the app boots past the
  // splash. signInAnonymously POSTs /auth/v1/signup; getUser GETs /auth/v1/user.
  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url();
    const session = fakeSession();
    if (url.includes('/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) });
    }
    if (url.includes('/logout')) {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
  });

  await page.route('**/functions/v1/**', async (route) => {
    const url = route.request().url();
    const name = url.split('/functions/v1/')[1].split('?')[0];
    const body = safeJson(route.request().postData());
    if (name === 'kit-redeem') {
      if ((body.code || '').toUpperCase().includes('DEAD')) {
        return route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ error: 'This class code has ended. Codes live for a few weeks after each session.', result: 'expired', class_slug: 'vibe-coding', maven_url: 'https://maven.com/mindmaker' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: 'ok', redemption: REDEMPTION }) });
    }
    if (name === 'kit-compose') {
      // Composing in progress (the page polls kit_builds for status).
      state.build = { ...BUILD, status: 'running', artifact_statuses: Object.fromEntries(ARTIFACTS.map((a, i) => [a.artifact_id, { status: i < 2 ? 'done' : i === 2 ? 'running' : 'queued' }])) };
      return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ build_id: BUILD.id }) });
    }
    if (name === 'send-kit-pack') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    if (name === 'kit-capsule-ingest') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, facts_extracted: 6, facts_stored: 5, suggest_regenerate: true }) });
    }
    if (name === 'track-event') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // Postgrest reads. .maybeSingle()/.single() send an Accept header asking for
  // a single object; PostgREST then returns an object (or 406), not an array.
  // Emulate that so client code that expects a single row behaves correctly.
  await page.route('**/rest/v1/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const table = url.split('/rest/v1/')[1].split('?')[0];
    const method = req.method();
    const wantsObject = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    const send = (rows, extraHeaders = {}) => {
      const headers = { 'content-type': 'application/json', ...extraHeaders };
      if (wantsObject) {
        if (!rows.length) return route.fulfill({ status: 406, headers, body: JSON.stringify({ message: 'no rows' }) });
        return route.fulfill({ status: 200, headers, body: JSON.stringify(rows[0]) });
      }
      return route.fulfill({ status: 200, headers, body: JSON.stringify(rows) });
    };
    if (method !== 'GET') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    if (table === 'kit_redemptions') return send([REDEMPTION]);
    if (table === 'kit_builds') return send(state.build ? [state.build] : []);
    if (table === 'kit_artifacts') return send(ARTIFACTS);
    if (table === 'kit_journey_events') return send(state.journey || []);
    if (table === 'user_memory') return send([], { 'content-range': '0-8/9' });
    return send([]);
  });
}

function safeJson(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }

async function waitForContent(page, selector, timeout = 10000) {
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

async function shot(page, name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log('shot', name);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const state = { build: null, journey: [] };
  await installMocks(page, state);

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

  // Warm the app once so the boot splash is not captured on the first real shot.
  await page.goto(`${BASE}/kit`, { waitUntil: 'networkidle' });
  await waitForContent(page, 'input[aria-label="Class code"]', 12000);

  // 1. Manual entry front door (no code)
  await page.goto(`${BASE}/kit`, { waitUntil: 'networkidle' });
  await waitForContent(page, 'input[aria-label="Class code"]', 12000);
  await shot(page, '01-frontdoor-manual');

  // 2. Optimistic branding + auto redeem (code in URL) -> lands in intake
  await page.goto(`${BASE}/kit?code=VIBE-TEST`, { waitUntil: 'networkidle' });
  const intakeReady = await waitForContent(page, '[data-testid="intake-option"], textarea', 15000);
  await shot(page, '02-redeem-to-intake');

  // 3. Walk the intake wizard
  if (intakeReady) {
    for (let i = 0; i < 8; i++) {
      await shot(page, `03-intake-step-${i}`);
      const typeTab = page.locator('text=Type instead').first();
      if (await typeTab.count()) {
        await typeTab.click().catch(() => {});
        const ta = page.locator('textarea').first();
        if (await ta.count()) await ta.fill('Every Monday I pull numbers from three dashboards into one written update for my team. It takes two hours and I do it weekly.');
      }
      const opt = page.locator('[data-testid="intake-option"]').first();
      if (await opt.count()) await opt.click().catch(() => {});
      const cont = page.locator('button:has-text("Continue")').first();
      if (await cont.count()) await cont.click().catch(() => {});
      await page.waitForTimeout(700);
      if (page.url().includes('/kit/me') && !page.url().includes('intake')) break;
    }
  }
  await page.waitForTimeout(600);
  await shot(page, '04-after-intake');

  // 4. Composing state (force a running build), homework card visible
  state.build = { ...BUILD, status: 'running', artifact_statuses: Object.fromEntries(ARTIFACTS.map((a, i) => [a.artifact_id, { status: i < 3 ? 'done' : i === 3 ? 'running' : 'queued' }])) };
  await page.goto(`${BASE}/kit/me`, { waitUntil: 'networkidle' });
  await waitForContent(page, 'text=/homework/i', 12000);
  await shot(page, '05-composing-homework');

  // 5. Kit ready reveal
  state.build = BUILD;
  await page.goto(`${BASE}/kit/me`, { waitUntil: 'networkidle' });
  await waitForContent(page, 'text=/Download/i', 12000);
  await page.waitForTimeout(1400);
  const dom = await page.evaluate(() => {
    const t = document.body.innerText.toLowerCase();
    const has = (s) => t.includes(s.toLowerCase());
    return {
      docHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
      innerH: window.innerHeight,
      sections: {
        skill: has('monday-numbers-roundup'), install: has('how to install'),
        map: has('first build') || has('with review'), sendPack: has('send me my kit') || has('send my'),
        plan: has('day 1') || has('7-day') || has('seven-day'), ship: has('shipped') || has('ship it'),
        artifacts: has('spot + spec') || has('verify + govern') || has('leverage audit'),
        capsule: has('capsule'), footer: has('pass active') || has('viewable'),
      },
    };
  });
  console.log('REVEAL DOM', JSON.stringify(dom));
  await shot(page, '06-reveal');

  // Scroll the portal's inner <main> (the app shell is overflow:hidden at the
  // document level, so the page scrolls inside main, not the window).
  const scrollMain = (frac) => page.evaluate((f) => {
    const m = document.querySelector('main');
    if (m) m.scrollTop = m.scrollHeight * f;
  }, frac);
  const mainScroll = await page.evaluate(() => {
    const m = document.querySelector('main');
    return m ? { scrollHeight: m.scrollHeight, clientHeight: m.clientHeight } : null;
  });
  console.log('MAIN SCROLL', JSON.stringify(mainScroll));
  await scrollMain(0.33); await shot(page, '07-kit-mid1');
  await scrollMain(0.66); await shot(page, '08-kit-mid2');
  await scrollMain(1); await shot(page, '09-kit-bottom');

  // 6. Dead code screen
  await page.goto(`${BASE}/kit?code=VIBE-DEAD`, { waitUntil: 'networkidle' });
  await waitForContent(page, 'text=/code has ended/i', 12000);
  await shot(page, '10-dead-code');

  console.log('\nCONSOLE ERRORS (' + errors.length + '):');
  errors.slice(0, 40).forEach((e) => console.log('  - ' + e));

  await browser.close();
})().catch((e) => { console.error('HARNESS FAIL', e); process.exit(1); });
