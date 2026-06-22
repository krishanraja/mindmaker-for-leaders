#!/usr/bin/env node
/**
 * Baseline-gated typecheck for CI.
 *
 * Why this exists: the repo's `build` (vite/esbuild) does NOT run `tsc`, and the
 * solution `tsconfig.json` has `files: []`, so a plain `tsc --noEmit` checks
 * nothing. That is how a "used but never imported" bug (TrendingUp in
 * TrackRecordView) shipped to production - the crash only surfaced at runtime.
 *
 * A full `tsc -p tsconfig.app.json` surfaces ~430 PRE-EXISTING errors (years of
 * accumulated debt). Failing CI on all of them would block every PR forever, so
 * - exactly like the repo's lint-changed job - we gate on a BASELINE: the build
 * fails only when a NEW type error appears that is not already in
 * scripts/typecheck-baseline.json. New code must be clean; the old debt is a
 * separate cleanup track.
 *
 * Errors are keyed by file + TS code + message (NOT line/column), so ordinary
 * edits that shift line numbers never trip a false positive; a genuinely new
 * error (new file, new message - e.g. "Cannot find name 'TrendingUp'") is caught.
 *
 * Usage:
 *   node scripts/typecheck-ci.mjs            # gate: exit 1 if new errors appear
 *   node scripts/typecheck-ci.mjs --update   # regenerate the baseline
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(root, 'scripts', 'typecheck-baseline.json');
const update = process.argv.includes('--update');

const ERROR_RE = /^(.+?\.tsx?)\((\d+),(\d+)\): error (TS\d+): (.+)$/;

function runTsc() {
  const res = spawnSync(
    'npx',
    ['tsc', '--noEmit', '-p', 'tsconfig.app.json'],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  return `${res.stdout || ''}\n${res.stderr || ''}`;
}

// Key an error stably: file + code + message (drop line/col so line shifts do
// not register as new errors). Collapsing identical messages in one file is
// acceptable - a NEW class of error still produces a new key.
function keysFrom(output) {
  const keys = new Set();
  for (const line of output.split('\n')) {
    const m = ERROR_RE.exec(line.trim());
    if (!m) continue;
    const [, file, , , code, message] = m;
    keys.add(`${file.replace(/\\/g, '/')}\t${code}\t${message.trim()}`);
  }
  return keys;
}

const output = runTsc();
const current = keysFrom(output);

if (update) {
  const sorted = [...current].sort();
  writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`[typecheck] baseline written: ${sorted.length} known errors -> scripts/typecheck-baseline.json`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error('[typecheck] no baseline found. Run: node scripts/typecheck-ci.mjs --update');
  process.exit(1);
}

const baseline = new Set(JSON.parse(readFileSync(BASELINE, 'utf8')));
const introduced = [...current].filter((k) => !baseline.has(k));
const fixed = [...baseline].filter((k) => !current.has(k));

console.log(`[typecheck] current=${current.size} baseline=${baseline.size} new=${introduced.length} fixed=${fixed.length}`);

if (introduced.length > 0) {
  console.error('\n[typecheck] NEW type errors introduced (not in baseline):\n');
  for (const k of introduced) {
    const [file, code, message] = k.split('\t');
    console.error(`  ${file}: ${code} ${message}`);
  }
  console.error('\nFix these, or if intentional, refresh the baseline with: npm run typecheck:update');
  process.exit(1);
}

if (fixed.length > 0) {
  console.log(`[typecheck] nice - ${fixed.length} baseline error(s) no longer present. Run npm run typecheck:update to shrink the baseline.`);
}
console.log('[typecheck] OK: no new type errors.');
process.exit(0);
