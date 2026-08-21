#!/usr/bin/env node
/**
 * Deploy one Edge Function through the Supabase Management API.
 *
 * The Supabase CLI cannot reach api.supabase.com from this environment (its Go
 * HTTP client fails with TransportError behind the agent proxy), but Node and
 * curl traverse it fine. This does what the CLI does: walk the relative import
 * graph from the entrypoint, bundle those files, and POST them as multipart.
 *
 * Paths are kept relative to supabase/functions/ so that `../_shared/x.ts`
 * imports resolve inside the bundle exactly as they do on disk.
 *
 * Usage: node scripts/deploy-edge-function.mjs <slug> [--dry]
 * Requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in the environment.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

const ROOT = 'supabase/functions';
const slug = process.argv[2];
const dry = process.argv.includes('--dry');
if (!slug) {
  console.error('usage: deploy-edge-function.mjs <slug> [--dry]');
  process.exit(2);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error('SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required');
  process.exit(2);
}

/** Transitive closure of relative .ts imports from an entrypoint. */
function collect(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const p = stack.pop();
    if (seen.has(p) || !existsSync(p)) continue;
    seen.add(p);
    const text = readFileSync(p, 'utf8');
    const re = /from\s+["'](\.\.?\/[^"']+\.ts)["']/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      stack.push(normalize(join(dirname(p), m[1])));
    }
  }
  return [...seen];
}

const entry = `${ROOT}/${slug}/index.ts`;
if (!existsSync(entry)) {
  console.error(`no entrypoint at ${entry}`);
  process.exit(2);
}

const files = collect(entry).map((p) => ({ abs: p, rel: relative(ROOT, p) }));
const entryRel = relative(ROOT, entry);

// verify_jwt must match supabase/config.toml, never be guessed. A function
// declared verify_jwt = false enforces its own contract internally; flipping it
// on would break cron and webhook callers.
const config = existsSync('supabase/config.toml') ? readFileSync('supabase/config.toml', 'utf8') : '';
const block = new RegExp(`\\[functions\\.${slug}\\][^\\[]*`, 'm').exec(config);
const verifyJwt = block ? !/verify_jwt\s*=\s*false/.test(block[0]) : true;

console.log(`${slug}: ${files.length} files, verify_jwt=${verifyJwt}`);
for (const f of files) console.log(`   ${f.rel}`);
if (dry) process.exit(0);

const form = new FormData();
form.append(
  'metadata',
  new Blob([JSON.stringify({ name: slug, entrypoint_path: entryRel, verify_jwt: verifyJwt })], {
    type: 'application/json',
  }),
);
for (const f of files) {
  form.append('file', new Blob([readFileSync(f.abs)], { type: 'application/typescript' }), f.rel);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/functions/deploy?slug=${encodeURIComponent(slug)}`,
  { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
);
const body = await res.text();
if (!res.ok) {
  console.error(`FAILED ${slug}: HTTP ${res.status} ${body.slice(0, 400)}`);
  process.exit(1);
}
let version = '?';
try {
  version = JSON.parse(body).version ?? '?';
} catch {
  /* the API returned a non-JSON success body; the readback check is authoritative */
}
console.log(`OK ${slug} -> version ${version}`);
