#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';

const root = process.cwd();
const manifestText = await readFile(join(root, 'supabase/containment/manifest.json'), 'utf8');
const manifest = JSON.parse(manifestText);
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const expectedByTemplate = {
  'templates/retired-410.ts': {
    status: 410,
    body: { ok: false, code: 'function_retired', retryable: false },
  },
  'templates/unavailable-503.ts': {
    status: 503,
    body: { ok: false, code: 'containment_active', retryable: false },
  },
  'templates/webhook-unavailable-503.ts': {
    status: 503,
    body: { ok: false, code: 'containment_active', retryable: true },
  },
  'templates/forbidden-403.ts': {
    status: 403,
    body: { ok: false, code: 'access_contained', retryable: false },
  },
  'templates/track-fork-neutral.ts': {
    status: 200,
    body: { ok: true, handoff: null, contained: true },
  },
  'templates/track-event-noop.ts': {
    status: 202,
    body: { ok: true, accepted: false, recorded: false, contained: true },
  },
  'templates/detect-trends-empty.ts': {
    status: 200,
    body: { trends: [], enabled: false, source: 'containment', written: false },
  },
  'templates/portfolio-pulse-empty.ts': {
    status: 200,
    body: { ok: true, since: null, total: 0, lanes: [], source: 'containment' },
  },
};

const forbiddenSourcePatterns = [
  [/(?:Deno|process)\.env\b/, 'environment access'],
  [/\bfetch\s*\(/, 'outbound network access'],
  [/\bcreateClient\b/, 'database client creation'],
  [/\.(?:from|rpc)\s*\(/, 'database operation'],
  [/\bimport\s+(?:[({*]|[A-Za-z_$])/, 'runtime import'],
  [/req\.(?:json|text|formData|arrayBuffer|blob)\s*\(/, 'request body consumption'],
  [/console\./, 'request logging'],
  [/(?:SERVICE_ROLE|SECRET_KEY|API_KEY|PRIVATE_KEY)/, 'secret-bearing identifier'],
];

function loadHandler(source, label) {
  let handler = null;
  const deno = {
    serve(candidate) {
      assert(typeof candidate === 'function', `${label}: Deno.serve needs one function`);
      assert(handler === null, `${label}: registered more than one handler`);
      handler = candidate;
    },
  };
  const evaluate = new Function('Deno', 'Request', 'Response', 'Headers', `"use strict";\n${source}`);
  evaluate(deno, Request, Response, Headers);
  assert(handler !== null, `${label}: no handler registered`);
  return handler;
}

function assertSubset(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    assert(JSON.stringify(actual[key]) === JSON.stringify(value), `${label}: body field ${key} differs`);
  }
}

const templateCache = new Map();
for (const entry of manifest.functions.filter((item) => item.template)) {
  const expected = expectedByTemplate[entry.template];
  assert(expected, `${entry.name}: unknown template ${entry.template}`);
  assert(expected.status === entry.expected_status, `${entry.name}: manifest status differs from template`);

  const sourcePath = normalize(join(root, 'supabase/containment', entry.template));
  let loaded = templateCache.get(sourcePath);
  if (!loaded) {
    const source = await readFile(sourcePath, 'utf8');
    for (const [pattern, description] of forbiddenSourcePatterns) {
      assert(!pattern.test(source), `${entry.template}: contains ${description}`);
    }
    loaded = { source, handler: loadHandler(source, entry.template) };
    templateCache.set(sourcePath, loaded);
  }

  const request = new Request(`https://example.invalid/functions/v1/${entry.name}`, { method: 'POST' });
  const response = await loaded.handler(request);
  assert(response.status === expected.status, `${entry.name}: unexpected status ${response.status}`);
  assert(response.headers.get('content-type') === 'application/json; charset=utf-8', `${entry.name}: content type`);
  assert(response.headers.get('cache-control') === 'no-store', `${entry.name}: cache control`);
  assert(response.headers.get('x-content-type-options') === 'nosniff', `${entry.name}: nosniff`);
  assert(response.headers.get('access-control-allow-origin') === '*', `${entry.name}: CORS origin`);
  if (entry.template === 'templates/webhook-unavailable-503.ts') {
    assert(response.headers.get('retry-after') === '3600', `${entry.name}: retry-after`);
  }
  assertSubset(await response.json(), expected.body, entry.name);

  const options = await loaded.handler(new Request(request.url, { method: 'OPTIONS' }));
  assert(options.status === 204, `${entry.name}: OPTIONS status`);
  assert(options.headers.get('access-control-allow-headers')?.includes('authorization'), `${entry.name}: OPTIONS headers`);
}

console.log(JSON.stringify({
  ok: true,
  functions: manifest.functions.length,
  contained_functions: manifest.functions.filter((item) => item.template).length,
  templates: templateCache.size,
  manifest_sha256: sha256(manifestText),
}, null, 2));
