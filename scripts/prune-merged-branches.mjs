#!/usr/bin/env node
/**
 * Delete remote branches whose pull request was merged. Dry run by default.
 *
 *   node scripts/prune-merged-branches.mjs           # show the plan, change nothing
 *   node scripts/prune-merged-branches.mjs --apply   # actually delete
 *
 * Why this exists rather than `git branch --merged`: main's history was
 * rewritten at some point, so most of the old branches share NO common ancestor
 * with it. Every ancestry-based test (merge-base, --merged, a three-dot diff)
 * reports "not merged" for work that is demonstrably in main, which would make
 * an ancestry-driven prune either useless or dangerous. A merged pull request is
 * the one signal that survives a history rewrite, so that is what this asks.
 *
 * The safe-by-default rules, in order:
 *   - main is never touched.
 *   - A branch with an OPEN pull request is never touched.
 *   - A branch with NO pull request at all is never touched. Unknown provenance
 *     is a reason to keep something, not a reason to delete it.
 *   - Everything else needs a merged PR to qualify, and the PR number is printed
 *     beside it so the plan can be checked before --apply.
 *
 * Requires the gh CLI, authenticated (`gh auth status`).
 */
import { execFileSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');
const REPO = process.env.PRUNE_REPO ?? 'krishanraja/mm-ctrl';
const PROTECTED = new Set(['main', 'master', 'HEAD']);

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

function ghJson(path) {
  return JSON.parse(sh('gh', ['api', '--paginate', '--slurp', path]));
}

console.log(`repo: ${REPO}`);
console.log(APPLY ? 'mode: APPLY (branches will be deleted)\n' : 'mode: dry run (nothing will be deleted)\n');

// Every pull request ever, in one pass. --slurp gives an array of pages.
const pages = ghJson(`repos/${REPO}/pulls?state=all&per_page=100`);
const prs = pages.flat();

const mergedBy = new Map(); // branch -> PR number
const openBy = new Map();
for (const pr of prs) {
  const ref = pr.head?.ref;
  if (!ref) continue;
  if (pr.state === 'open') openBy.set(ref, pr.number);
  else if (pr.merged_at) if (!mergedBy.has(ref)) mergedBy.set(ref, pr.number);
}

const branchPages = ghJson(`repos/${REPO}/branches?per_page=100`);
const branches = branchPages.flat().map((b) => b.name).filter((n) => !PROTECTED.has(n));

const toDelete = [];
const keep = [];
for (const b of branches) {
  if (openBy.has(b)) keep.push([b, `open PR #${openBy.get(b)}`]);
  else if (mergedBy.has(b)) toDelete.push([b, mergedBy.get(b)]);
  else keep.push([b, 'no pull request found']);
}

console.log(`${branches.length} branches, ${toDelete.length} with a merged PR, ${keep.length} kept\n`);

console.log('KEEPING:');
for (const [b, why] of keep.sort()) console.log(`  ${b}  (${why})`);

console.log(`\n${APPLY ? 'DELETING' : 'WOULD DELETE'}:`);
let done = 0;
let failed = 0;
for (const [b, pr] of toDelete.sort()) {
  if (!APPLY) {
    console.log(`  ${b}  (merged in #${pr})`);
    continue;
  }
  try {
    sh('gh', ['api', '-X', 'DELETE', `repos/${REPO}/git/refs/heads/${b}`]);
    console.log(`  deleted ${b}  (merged in #${pr})`);
    done++;
  } catch (e) {
    console.log(`  FAILED  ${b}: ${String(e.message ?? e).split('\n')[0]}`);
    failed++;
  }
}

if (APPLY) console.log(`\ndeleted ${done}, failed ${failed}, kept ${keep.length}`);
else console.log(`\nRe-run with --apply to delete these ${toDelete.length}.`);
