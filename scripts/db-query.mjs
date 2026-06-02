// Apply SQL to the CTRL Supabase project via the Management API.
// Usage:
//   node scripts/db-query.mjs --file path/to.sql
//   node scripts/db-query.mjs --sql "select 1"
// Requires SUPABASE_ACCESS_TOKEN in env (the sbp_ token).
import { readFileSync } from 'node:fs';

const PROJECT_REF = 'bkyuxvschuwngtcdhsyg';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const args = process.argv.slice(2);
let query = '';
const fileIdx = args.indexOf('--file');
const sqlIdx = args.indexOf('--sql');
if (fileIdx !== -1) query = readFileSync(args[fileIdx + 1], 'utf8');
else if (sqlIdx !== -1) query = args[sqlIdx + 1];
else {
  console.error('Provide --file <path> or --sql "<query>"');
  process.exit(1);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  }
);

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}:`, text);
  process.exit(1);
}
console.log(text);
