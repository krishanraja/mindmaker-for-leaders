#!/usr/bin/env node
/**
 * MindmakerOS standards guard (runs in prebuild).
 *
 * Fails the build (exit 1) on:
 *   1. Any em dash (U+2014) in source or docs. House rule: no em dashes anywhere.
 *   2. Any required semantic token missing from src/index.css (the base layer),
 *      for example a token referenced by tailwind.config.ts but never defined
 *      (the broken --success class that shipped before the 2026-05-30 rebuild).
 *
 * Run directly: node standards/check-standards.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "project-documentation", "standards", "supabase/functions"];
const SCAN_ROOT_FILES = ["index.html", "README.md", "CHANGELOG.md"];
const TEXT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".md", ".html", ".json", ".txt"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "dist-ssr", ".temp", "_upgrade"]);

const EM_DASH = String.fromCharCode(0x2014); // U+2014, avoid a literal in source
const REQUIRED_TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground",
  "muted", "muted-foreground", "accent", "accent-foreground",
  "success", "success-foreground", "destructive", "destructive-foreground",
  "border", "input", "ring",
];

let violations = [];

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(p);
    } else if (TEXT_EXTS.has(extname(entry))) {
      let s;
      try { s = readFileSync(p, "utf8"); } catch { continue; }
      if (s.includes(EM_DASH)) {
        const n = s.split(EM_DASH).length - 1;
        violations.push(`em-dash x${n}: ${p}`);
      }
    }
  }
}

// 1. em-dash scan
for (const d of SCAN_DIRS) walk(join(ROOT, d));
for (const f of SCAN_ROOT_FILES) {
  const p = join(ROOT, f);
  if (existsSync(p) && readFileSync(p, "utf8").includes(EM_DASH)) {
    violations.push(`em-dash: ${f}`);
  }
}

// 2. required token check against src/index.css
const cssPath = join(ROOT, "src", "index.css");
if (existsSync(cssPath)) {
  const css = readFileSync(cssPath, "utf8");
  for (const t of REQUIRED_TOKENS) {
    if (!new RegExp(`--${t}\\s*:`).test(css)) {
      violations.push(`missing token: --${t} not defined in src/index.css`);
    }
  }
} else {
  violations.push("src/index.css not found (cannot verify tokens)");
}

if (violations.length) {
  console.error("\n[standards] FAILED with " + violations.length + " violation(s):");
  for (const v of violations.slice(0, 50)) console.error("  - " + v);
  if (violations.length > 50) console.error(`  ...and ${violations.length - 50} more`);
  console.error("\nHouse rules: no em dashes anywhere; every required semantic token must be defined.\n");
  process.exit(1);
}
console.log("[standards] OK: no em dashes, all required tokens defined.");
