#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync('supabase/containment/manifest.json', 'utf8'));
const errors = [];
const names = new Set();

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

for (const target of collectTypeScriptFiles(join('supabase', 'functions'))) {
  const current = readFileSync(target, 'utf8');
  if (/\broleFromJwt\s*\(/.test(current)) {
    errors.push(`${target}: JWT payload roles must never be trusted as authentication`);
  }
  if (/JSON\.parse\s*\(\s*atob\s*\(/.test(current)) {
    errors.push(`${target}: decoded JWT payload text must never authorize a request`);
  }
}

for (const entry of manifest.functions) {
  if (names.has(entry.name)) errors.push(`duplicate manifest function: ${entry.name}`);
  names.add(entry.name);

  const target = join('supabase', 'functions', entry.name, 'index.ts');
  const current = readFileSync(target, 'utf8');
  if (entry.template) {
    const expected = readFileSync(join('supabase', 'containment', entry.template), 'utf8');
    if (current !== expected) errors.push(`${entry.name}: source differs from ${entry.template}`);
  }

  for (const marker of entry.forbidden_source_markers ?? []) {
    if (current.includes(marker)) errors.push(`${entry.name}: forbidden source marker remains: ${marker}`);
  }
  for (const marker of entry.required_source_markers ?? []) {
    if (!current.includes(marker)) errors.push(`${entry.name}: required source marker missing: ${marker}`);
  }
}

const config = readFileSync('supabase/config.toml', 'utf8');
for (const entry of manifest.functions) {
  const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(
    `^\\[functions\\.${escaped}\\]\\s*\\r?\\n([\\s\\S]*?)(?=^\\[|(?![\\s\\S]))`,
    'm',
  ).exec(config);
  if (!match) {
    errors.push(`${entry.name}: no explicit config.toml block`);
    continue;
  }
  const jwtSetting = /verify_jwt\s*=\s*(true|false)/.exec(match[1]);
  if (!jwtSetting) {
    errors.push(`${entry.name}: config.toml must state verify_jwt = true or false`);
    continue;
  }
  const configured = jwtSetting[1] === 'true';
  if (configured !== entry.verify_jwt) {
    errors.push(`${entry.name}: verify_jwt config=${configured} manifest=${entry.verify_jwt}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`verified ${manifest.functions.length} trust-containment contracts`);
