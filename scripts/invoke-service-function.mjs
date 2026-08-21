#!/usr/bin/env node
/**
 * Invoke a service-role-only Edge Function against production.
 *
 * Exists because the Supabase CLI cannot reach the API from this environment.
 * The service role key is fetched at runtime from the management API and is
 * never written to disk or printed.
 *
 * Usage: node scripts/invoke-service-function.mjs <slug> '<json body>'
 * Requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.
 */
const slug = process.argv[2];
const bodyArg = process.argv[3] ?? '{}';
if (!slug) {
  console.error('usage: invoke-service-function.mjs <slug> [json-body]');
  process.exit(2);
}

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
const candidates = [
  keys.find((k) => k.type === 'secret' && k.secret_jwt_template?.role === 'service_role')?.api_key,
  keys.find((k) => k.name === 'service_role')?.api_key,
].filter(Boolean);

let res, text;
for (const key of candidates) {
  res = await fetch(`https://${ref}.supabase.co/functions/v1/${slug}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: bodyArg,
  });
  text = await res.text();
  if (res.ok) break;
}
console.log(`HTTP ${res?.status}`);
console.log(text);
process.exit(res?.ok ? 0 : 1);
