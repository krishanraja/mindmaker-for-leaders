#!/usr/bin/env node
/**
 * Re-ingest training/anchor.yaml into the production training_material table.
 *
 * The active global row predates the third-party pseudonymisation work, and
 * loadGlobalTraining prefers the stored row over the in-code fallback, so the
 * widened third_party_identity reject stays inert until this runs.
 *
 * The service role key is fetched at runtime from the management API and never
 * written to disk or printed.
 *
 * Usage: node scripts/ingest-training.mjs
 * Requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.
 */
import { readFileSync } from 'node:fs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error('SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required');
  process.exit(2);
}

const keysRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!keysRes.ok) {
  console.error(`could not read api keys: HTTP ${keysRes.status}`);
  process.exit(1);
}
const keys = await keysRes.json();
// The project carries both the modern sb_secret_ key and the legacy JWT. Which
// one the function runtime holds in SUPABASE_SERVICE_ROLE_KEY depends on when
// the project was migrated, so try the modern one first and fall back.
const candidates = [
  keys.find((k) => k.type === 'secret' && k.secret_jwt_template?.role === 'service_role')?.api_key,
  keys.find((k) => k.name === 'service_role')?.api_key,
].filter(Boolean);
if (candidates.length === 0) {
  console.error(`no service role key found; names seen: ${keys.map((k) => k.name).join(', ')}`);
  process.exit(1);
}

const body = readFileSync('training/anchor.yaml', 'utf8');
console.log(`posting training/anchor.yaml (${body.length} bytes)`);

let res, text;
for (const [i, key] of candidates.entries()) {
  res = await fetch(`https://${ref}.supabase.co/functions/v1/ingest-training-material`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'yaml', body, scope: 'global' }),
  });
  text = await res.text();
  console.log(`candidate ${i + 1}/${candidates.length}: HTTP ${res.status}`);
  if (res.ok) break;
}
console.log(text.slice(0, 600));
process.exit(res?.ok ? 0 : 1);
