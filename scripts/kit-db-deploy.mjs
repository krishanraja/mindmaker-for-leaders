/**
 * Kit Engine DB deploy: applies the 4 kit migrations in order, then seeds the
 * test codes, via the Supabase Management API. Idempotent (IF NOT EXISTS /
 * ON CONFLICT). Self-contained node fetch so it works the same on Windows.
 *
 * Usage: node scripts/kit-db-deploy.mjs <sbp_token>
 *   (or set SUPABASE_ACCESS_TOKEN in the environment)
 */
import fs from 'node:fs';

const TOKEN = process.argv[2] || process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT = 'bkyuxvschuwngtcdhsyg';
if (!TOKEN) { console.error('Missing sbp token (argv[2] or SUPABASE_ACCESS_TOKEN)'); process.exit(1); }

const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

async function runSql(label, sql) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (mm-ctrl-deploy)',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`FAIL ${label}: ${res.status} ${text.slice(0, 400)}`);
    return false;
  }
  console.log(`ok   ${label}`);
  return true;
}

const MIGRATIONS = [
  'supabase/migrations/20260610000000_kit_engine.sql',
  'supabase/migrations/20260610000001_kit_artifacts_bucket.sql',
  'supabase/migrations/20260610000002_kit_memory_sources.sql',
  'supabase/migrations/20260610000003_kit_nudge_cron.sql',
];

const SEED = `
INSERT INTO public.kit_codes (code, class_slug, label, skill_quota, pass_days, max_redemptions)
VALUES
  ('VIBE-TEST',     'vibe-coding',         'internal test code', 3, 30, 200),
  ('AUTONOMY-TEST', 'autonomous-business', 'internal test code', 3, 30, 200)
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.kit_codes (code, class_slug, label, expires_at)
VALUES ('VIBE-DEAD', 'vibe-coding', 'expired fixture', now() - interval '1 day')
ON CONFLICT (code) DO NOTHING;`;

const main = async () => {
  for (const path of MIGRATIONS) {
    const sql = fs.readFileSync(path, 'utf8');
    const ok = await runSql(path.split('/').pop(), sql);
    // enum ADD VALUE (0002) and cron (0003) can partially apply on rerun; keep going.
    if (!ok && !path.includes('0002') && !path.includes('0003')) {
      console.error('Stopping: a structural migration failed.');
      process.exit(1);
    }
  }
  await runSql('seed test codes', SEED);
  // Verify.
  const verify = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (mm-ctrl-deploy)' },
    body: JSON.stringify({ query: "SELECT code, class_slug, is_active FROM public.kit_codes ORDER BY code;" }),
  });
  console.log('\nSeeded codes:', await verify.text());
};
main();
