import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function lines(rel) {
  return read(rel).split(/\r?\n/).length;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'coverage'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function repoPath(full) {
  return relative(root, full).replaceAll('\\', '/');
}

function isHistorical(rel, body) {
  return rel.startsWith('docs/history/')
    || rel.startsWith('project-documentation/_archive/')
    || /historical (?:record|reference|only|product|architecture|feature|engineering|ctrl|main-app)/i.test(body.slice(0, 700))
    || /Status:\s*RETIRED/i.test(body.slice(0, 700));
}

function checkLocalLinks() {
  const roots = ['README.md', 'CLAUDE.md'];
  for (const dir of ['docs', 'project-documentation']) {
    roots.push(...walk(join(root, dir)).filter((file) => extname(file) === '.md').map(repoPath));
  }

  let checked = 0;
  for (const rel of [...new Set(roots)]) {
    const body = read(rel);
    if (isHistorical(rel, body)) continue;
    checked += 1;
    const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
    for (const match of body.matchAll(linkPattern)) {
      let target = match[1].trim();
      if (!target || /^(?:https?:|mailto:|tel:|data:|#)/i.test(target)) continue;
      if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
      target = target.split('#')[0].split('?')[0];
      if (!target) continue;
      try {
        target = decodeURIComponent(target);
      } catch {
        fail(`${rel}: malformed link target ${match[1]}`);
        continue;
      }
      const absolute = resolve(root, dirname(rel), target);
      if (!existsSync(absolute)) fail(`${rel}: broken local link ${match[1]}`);
    }
  }
  notes.push(`local links checked in ${checked} current/reference Markdown files`);
}

function checkMetadataAndBudgets() {
  const currentDocs = readdirSync(join(root, 'docs/current'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => `docs/current/${name}`);
  const agentDocs = readdirSync(join(root, 'docs/agent-instructions'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => `docs/agent-instructions/${name}`);

  for (const rel of currentDocs) {
    const body = read(rel);
    if (!/^Status:\s*Current/m.test(body)) fail(`${rel}: missing Status: Current`);
    if (!/^Owner:/m.test(body)) fail(`${rel}: missing owner`);
    if (!/^Last verified:/m.test(body)) fail(`${rel}: missing verification date`);
    if (lines(rel) > 260) fail(`${rel}: exceeds 260-line current-doc budget`);
  }

  for (const rel of agentDocs) {
    const body = read(rel);
    if (!/^Status:\s*Current/m.test(body)) fail(`${rel}: missing Status: Current`);
    if (!/^Last verified:/m.test(body)) fail(`${rel}: missing verification date`);
    if (lines(rel) > 180) fail(`${rel}: exceeds 180-line agent-guide budget`);
  }

  if (lines('CLAUDE.md') > 50) fail('CLAUDE.md: root agent instructions must remain under 50 lines');
  if (lines('README.md') > 180) fail('README.md: root onboarding guide must remain under 180 lines');
  if (lines('project-documentation/README.md') > 140) fail('project-documentation/README.md: index must remain under 140 lines');
}

function countFiles(rel, predicate = () => true) {
  return readdirSync(join(root, rel), { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name)).length;
}

function countDirectories(rel, predicate = () => true) {
  return readdirSync(join(root, rel), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && predicate(entry.name)).length;
}

function checkInventory() {
  const inventory = {
    edge: countDirectories('supabase/functions', (name) => name !== '_shared'),
    hooks: countFiles('src/hooks', (name) => /\.(?:ts|tsx)$/.test(name)),
    migrations: countFiles('supabase/migrations', (name) => name.endsWith('.sql')),
  };

  const quotedIn = [
    'docs/current/architecture.md',
    'docs/current/release-state.md',
    'project-documentation/README.md',
    'project-documentation/REPLICATION_GUIDE.md',
  ];
  for (const rel of quotedIn) {
    const body = read(rel);
    const expected = [
      [`${inventory.edge} Edge Function directories`, 'Edge Function count'],
      [`${inventory.hooks} hook files`, 'hook count'],
      [`${inventory.migrations} SQL migration`, 'migration count'],
    ];
    for (const [needle, label] of expected) {
      if (!body.includes(needle)) fail(`${rel}: ${label} does not match repository inventory`);
    }
  }
  notes.push(`inventory ${inventory.edge} Edge Functions, ${inventory.hooks} hooks, ${inventory.migrations} migrations`);
}

function checkDecisionIds() {
  const body = read('project-documentation/DECISIONS_LOG.md');
  const ids = [...body.matchAll(/^## Decision (\d+):/gm)].map((match) => Number(match[1]));
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) fail(`DECISIONS_LOG.md: duplicate decision IDs ${duplicates.join(', ')}`);
  const max = Math.max(...ids);
  if (!body.match(new RegExp(`Last reconciled:[^\\n]*Decision ${max}`))) {
    fail('DECISIONS_LOG.md: last-reconciled marker does not reference the highest decision ID');
  }
  notes.push(`${ids.length} unique decision IDs, highest ${max}`);
}

function checkRoutes() {
  const router = read('src/router.tsx');
  const documented = read('docs/current/features.md');
  const routes = [...router.matchAll(/path:\s*['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter((route) => route !== '*');
  for (const route of routes) {
    if (!documented.includes(`\`${route}\``)) fail(`docs/current/features.md: missing router path ${route}`);
  }
  notes.push(`${routes.length} router paths represented in current feature inventory`);
}

function checkPricing() {
  const product = JSON.parse(read('public/.well-known/product.json'));
  const pricingSource = read('supabase/functions/_shared/edge-pricing.ts');
  const centsMatch = pricingSource.match(/EDGE_PRO_UNIT_AMOUNT_CENTS\s*=\s*(\d+)/);
  const pro = product.pricing?.tiers?.find((tier) => tier.id === 'edge_pro');
  if (!centsMatch || !pro) {
    fail('pricing: could not read Edge Pro owner sources');
    return;
  }
  const cents = Number(centsMatch[1]);
  if (Number(pro.amount) * 100 !== cents) fail('pricing: product.json and edge-pricing.ts disagree');
  notes.push(`Edge Pro pricing consistent at ${cents} cents`);
}

function checkKnownDrift() {
  const currentPaths = [
    'README.md',
    'CLAUDE.md',
    ...readdirSync(join(root, 'docs/current')).filter((name) => name.endsWith('.md')).map((name) => `docs/current/${name}`),
    ...readdirSync(join(root, 'docs/agent-instructions')).filter((name) => name.endsWith('.md')).map((name) => `docs/agent-instructions/${name}`),
    'project-documentation/README.md',
    'project-documentation/REPLICATION_GUIDE.md',
    'project-documentation/compliance/SUBPROCESSORS.md',
    'project-documentation/compliance/ROPA.md',
    'project-documentation/compliance/PRIVACY_POLICY.md',
    'project-documentation/compliance/DATA_RETENTION_POLICY.md',
  ];

  for (const rel of currentPaths) {
    const body = read(rel);
    if (/Vertex AI[^\n]{0,100}primary[^\n]{0,100}OpenAI[^\n]{0,100}fallback/i.test(body)
      || /Google Vertex\/Gemini primary/i.test(body)) {
      fail(`${rel}: stale global Vertex-primary/OpenAI-fallback claim`);
    }
    if (/Commit, preview deployment, and production remain/i.test(body)) {
      fail(`${rel}: stale pending-release language in current path`);
    }
    if (/current release overlay/i.test(body)) fail(`${rel}: overlay pattern is forbidden in current docs`);

    for (const line of body.split(/\r?\n/)) {
      if (/supabase db push/i.test(line) && !/(never|do not|unreviewed|blanket)/i.test(line)) {
        fail(`${rel}: unsafe production db-push guidance`);
      }
      if (/ctrl\.themindmaker\.ai/i.test(line) && !/(retired|former|redirect)/i.test(line)) {
        fail(`${rel}: former host is not labelled as retired or redirected`);
      }
    }
  }
}

checkLocalLinks();
checkMetadataAndBudgets();
checkInventory();
checkDecisionIds();
checkRoutes();
checkPricing();
checkKnownDrift();

if (failures.length) {
  console.error(`Documentation check failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

for (const note of notes) console.log(`ok: ${note}`);
console.log('Documentation check passed');
