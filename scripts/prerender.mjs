// Post-build: inject server-rendered HTML for the public marketing routes into
// per-route index.html files, so crawlers and LLM fetchers get real content (not an
// empty SPA shell). Resilient: any failure is logged and skipped - the SPA still ships.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = 'dist';
const SSR_ENTRY = path.resolve('.prerender/entry-prerender.js');

async function main() {
  const templatePath = path.join(DIST, 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.warn('[prerender] no dist/index.html; skipping');
    return;
  }
  if (!fs.existsSync(SSR_ENTRY)) {
    console.warn('[prerender] no SSR bundle; skipping');
    return;
  }
  const template = fs.readFileSync(templatePath, 'utf-8');
  const { render, ROUTE_PATHS } = await import(pathToFileURL(SSR_ENTRY).href);

  // Swap the existing visually-hidden crawler block (<main class="ctrl-seo">) for the
  // route's real rendered content, per route. Crawlers/LLMs get route-specific HTML;
  // humans still see the boot splash then the live React app (which replaces #root).
  const SEO_BLOCK = /<main class="ctrl-seo">[\s\S]*?<\/main>/;
  if (!SEO_BLOCK.test(template)) {
    console.warn('[prerender] ctrl-seo block not found in template; skipping');
    return;
  }
  let ok = 0;
  for (const url of ROUTE_PATHS) {
    try {
      const html = render(url);
      if (!html) continue;
      const page = template.replace(SEO_BLOCK, `<main class="ctrl-seo">${html}</main>`);
      const outDir = url === '/' ? DIST : path.join(DIST, url.replace(/^\//, ''));
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), page);
      console.log(`[prerender] ${url} -> ${path.join(outDir, 'index.html')} (${html.length} chars)`);
      ok++;
    } catch (e) {
      console.warn(`[prerender] ${url} failed (skipped):`, e?.message ?? e);
    }
  }
  console.log(`[prerender] done: ${ok}/${ROUTE_PATHS.length} routes`);
}

main().catch((e) => {
  console.warn('[prerender] aborted (SPA still ships):', e?.message ?? e);
});
