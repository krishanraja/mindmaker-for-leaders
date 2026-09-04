# Claude Code Skills & Permissions — distilled from the CTRL rebuild

This is an operating asset. Everything below is derived from what the CTRL redesign **actually did** (brain engine PRs #153-176, the numerical-first redesign, the QC harness, the cockpit go-live), including the footguns that cost real time and the operations the environment's classifier correctly blocked.

It has two parts:

- **PART A — Skills to synthesize.** Five recurring mechanics, each written as a drop-in `~/.claude/skills/<name>/SKILL.md`. Copy each block into its own file at the path noted.
- **PART B — Permissions to enable.** Concrete `settings.json` allow-rules that would have removed friction without compromising safety, split into "safe to auto-allow" and "keep gated."

Platform context these were forged on: **Windows 11 / PowerShell primary + a Git-Bash tool**, Vite + React 18 + TS + Tailwind + shadcn + Framer Motion on **Vercel**, **Supabase** backend (project ref `bkyuxvschuwngtcdhsyg`), 80+ Deno edge functions, migrations applied via the Supabase **Management API** (local migration history is out of sync — never `supabase db push`). Tokens live in `C:\Users\krish\.claude\secrets\TOKENS.md` (gitignored).

---

# PART A — Skills to synthesize

## A1. supabase-mgmt-api-migration

Path: `~/.claude/skills/supabase-mgmt-api-migration/SKILL.md`

```markdown
---
name: supabase-mgmt-api-migration
description: Apply SQL to a remote Supabase project via the Management API on Windows/Git-Bash using curl + a relative python-json scratch file, then verify, then clean up any seeded test rows to zero residue.
---

# supabase-mgmt-api-migration

## When to use
- Applying a migration / DDL / RPC / index / RLS policy to a remote Supabase
  project whose local migration history is out of sync (so `supabase db push`
  is unsafe — CTRL's was permanently out of sync).
- Running an ad-hoc verification query, a row-count probe, or a one-off data fix
  against the live project.
- You are on Windows (PowerShell primary, Git-Bash tool) where `$$` PL/pgSQL
  blocks get interpolated and `/tmp` paths break Windows Python.

## Inputs
- `PROJECT_REF` — e.g. `bkyuxvschuwngtcdhsyg` for CTRL.
- `SUPABASE_ACCESS_TOKEN` — the `sbp_...` management token. Read it from
  `C:\Users\krish\.claude\secrets\TOKENS.md`. NEVER inline it into a commit,
  PR, or any synced doc. Export it into the shell env, don't echo it.

## The hard-won mechanics (do exactly this)
1. **Use curl, not Python urllib.** On this environment Python's urllib gets
   Cloudflare-blocked (CF-1010) against `api.supabase.com`; curl works. Python
   is used ONLY to JSON-encode the SQL body, not to make the request.
2. **Write the scratch file RELATIVE to the cwd**, never `/tmp/...` — Windows
   Python can't resolve Git-Bash `/tmp`. Use `./_scratch_q.json` and delete it
   after.
3. **Never put `DO $$ ... $$` blocks in inline SQL** — PowerShell/string layers
   interpolate `$$`. Write each policy/statement as a separate plain statement,
   or keep the SQL inside a real `.sql` file and read it into the JSON encoder.
4. **Idempotency:** use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT
   EXISTS`, `ADD COLUMN IF NOT EXISTS`. RLS policies have no IF NOT EXISTS —
   query `pg_policies` first, or `DROP POLICY IF EXISTS` then `CREATE POLICY`.

## Steps

### 1. Encode + apply (Git-Bash)
```bash
REF=bkyuxvschuwngtcdhsyg
# SQL lives in a real file so $$ and quotes never hit a shell interpolation layer
cat > ./_mig.sql <<'SQL'
ALTER TABLE user_memory ADD COLUMN IF NOT EXISTS importance int;
CREATE INDEX IF NOT EXISTS idx_user_memory_importance ON user_memory (importance DESC);
SQL

# python ONLY json-encodes the file contents into {"query": "..."} — relative path, no /tmp
python -c "import json,sys; print(json.dumps({'query': open('./_mig.sql','r',encoding='utf-8').read()}))" > ./_scratch_q.json

curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data @./_scratch_q.json
```
PowerShell equivalent (if you must), per the project CLAUDE.md:
```powershell
$body = @{ query = (Get-Content ./_mig.sql -Raw) } | ConvertTo-Json -Compress
$headers = @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"; 'Content-Type'='application/json' }
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$REF/database/query" -Method POST -Headers $headers -Body $body
```

### 2. Verify the change (a SECOND query — this is the proof)
Never claim done off the apply call's 200. Query the catalog/data to confirm:
```bash
echo '{"query":"SELECT count(*) total, count(importance) have_importance FROM user_memory;"}' > ./_scratch_q.json
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" --data @./_scratch_q.json
```
For DDL: query `information_schema.columns` / `pg_indexes` / `pg_policies`. For a
data effect: count the affected rows and read a sample. Report **confirmed**
(I ran the verify query and saw N) vs **inferred**.

### 3. Seed → assert → clean up to ZERO residue
When you must prove a loop end-to-end with a fabricated row (e.g. CTRL's credit
loop: seed an outcome → `apply_outcome_to_brain` → assert importance moved →
restore), do it as a transaction-style sequence and **delete every seeded row +
restore every mutated value** before reporting. The CTRL `apply_outcome` proof
was "7 facts 7→8, 7 events, idempotent, exact restore — no fabricated data
left." Re-run the verify query after cleanup to confirm zero residue. Do this
ONLY on rows you created; never against arbitrary live user data.

### 4. Clean up scratch
`rm -f ./_mig.sql ./_scratch_q.json` and ensure they're gitignored.

## Footguns
- urllib → CF-1010 block; curl works. (CTRL confirmed.)
- `/tmp/...` scratch → Windows Python can't read it; use `./...`.
- `$$` PL/pgSQL → interpolated; split statements or read from a `.sql` file.
- Don't trust the apply 200 — the verify query is the proof.
```

---

## A2. qc-fixture-render-harness

Path: `~/.claude/skills/qc-fixture-render-harness/SKILL.md`

```markdown
---
name: qc-fixture-render-harness
description: Stand up a public unlinked /preview route that renders every presentational component across its full content-contract state range, screenshot it headless, and read the bands for cram/clip/overflow before any user sees it.
---

# qc-fixture-render-harness

## When to use
- Any surface with a look/feel, before wiring it to live data or shipping it.
- Verifying a component holds against the RANGE its slots can contain (min, MAX,
  every enum, empty/0-state, longest-realistic, unbroken token) — not one happy
  string.
- You want a fast self-verify loop that needs NO deploy and NO login (the route
  is public + renders fixtures, not user data).

## Prereq: split container from presentational
The component must take pure props (no data hooks inside). Container components
(data/hooks) wrap presentational ones (pure props). The harness only renders the
presentational layer fed by fixtures.

## Steps
1. **Add a public, unlinked `/preview` route** (not in nav, no auth guard). It
   imports each presentational surface and a `{label, props}[]` fixture list per
   surface that enumerates the full content inventory: min, MAX, each enum, the
   empty/0-state, longest-realistic text, an unbroken long token. CTRL's was a
   100-cell stress gallery (number-hero, recap-bar, chips/tiers, bet-rows,
   evidence-rows, stance-row, stone-states, cockpit-states, spine-counts).
2. **Run a local dev server** and screenshot localhost — no deploy:
   `npm run dev -- --port 5176` then headless-screenshot `http://localhost:5176/preview`.
3. **Screenshot headless, slice into bands, read each band.** Downscaled
   full-page shots HIDE cramping — zoom to high-DPI on the specific component and
   read the pixels (slice with PIL). Look for cram / clip / nowrap-ellipsis /
   overflow. Wrapping good; truncation bad.
4. **Fix at the component, re-screenshot, re-read.** Edit → screenshot localhost
   → read. Don't deploy to verify a surface.

## The two footguns that cost real time on CTRL (handle these or you waste hours)

### Footgun 1 — framer-motion entrance animations capture at opacity:0
Headless Chrome reports the page hidden, so framer-motion (and rAF entrance
animations) PAUSE — cards capture at `opacity:0` and look blank. `MotionConfig
reducedMotion` does NOT fix it (it settles transforms, not opacity).
**Fix:** give each harness-rendered component an additive `animated?` prop
(default `true`, so the app is unchanged). When `animated={false}`, pass
`initial={false}` to the motion elements so they render at their FINAL state.
The /preview fixtures render every component with `animated={false}`.

### Footgun 2 — "didn't render" vs "rendered invisible"
When a screenshot looks empty, **dump the DOM** (outerHTML of the surface) to
distinguish a render failure from an invisible-but-present render. Also: `file://`
CSS caching bites both headless Chrome AND a human reviewer, and a fresh
`--user-data-dir` does NOT bust it — when rendering a static HTML probe, **inline
the stylesheet** into a throwaway file so it's self-contained; when handing a
human a static deliverable, inline the CSS too.

## More footguns
- Back-to-back headless launches with sibling `--user-data-dir` collide and
  silently skip the shot, leaving a STALE png you then "verify." One probe per
  launch; confirm the png's size/mtime changed before reading it.
- A "misaligned" component is often shown at the WRONG WIDTH, not broken. Render
  at its real container width and compare to the approved mock before editing.
- Consolidating many components' CSS into one sheet → bare class names
  (`.q .t .top .body .num`) collide and overwrite. If a layout number doesn't
  match your model, MEASURE the pixels and suspect a colliding selector before
  tuning margins. Scope per component (CSS Modules / prefix).
```

---

## A3. live-verify-via-playwright-login

Path: `~/.claude/skills/live-verify-via-playwright-login/SKILL.md`

```markdown
---
name: live-verify-via-playwright-login
description: Drive a LOCAL Playwright/Chromium browser as a test user to verify user-JWT-gated runtime paths end-to-end (login → navigate → assert DOM/behaviour → screenshot). Credentials stay local, never a third-party cloud.
---

# live-verify-via-playwright-login

## When to use
- A change lives behind a user JWT (a gated edge function, a route that needs an
  active session, a flag-gated UI). The Management-API/service-role can't satisfy
  `getUser()`, so SQL self-verify can't reach it — you need a real session.
- You have been GIVEN a test login. This is the leash lever that collapses the
  "needs your sign-off" category: you self-close the gated paths instead of
  handing them to the founder. (CTRL: this unblocked verifying the cockpit
  go-live, the contest long-press, the brain runtime paths.)

## Why LOCAL Playwright specifically
Keep the credential off any third-party automation cloud. Drive local
Playwright/Chromium so the test-user password never leaves the machine. (Skyvern
and other hosted browsers were explicitly avoided for credentialed runtime
verification on CTRL for this reason; CTRL also noted prod edge CORS blocks
localhost, so authed runs sometimes need to hit the deployed origin, not :5173.)

## Credential handling
- Read the test login from `C:\Users\krish\.claude\secrets\TOKENS.md` (or wherever
  the founder placed it). Never inline it into a script that gets committed; pass
  via env vars. Flag chat-pasted creds for rotation afterward.

## Steps
1. Launch local Chromium (headed or headless) with Playwright. Use the
   **iPhone-13 device descriptor** when verifying the mobile surface — CTRL's
   cockpit shipped mobile-only, so the mobile viewport is what matters:
   ```js
   const { chromium, devices } = require('playwright');
   const browser = await chromium.launch();
   const ctx = await browser.newContext({ ...devices['iPhone 13'] });
   const page = await ctx.newPage();
   ```
2. **Login** as the test user (fill the auth form, submit, wait for the authed
   redirect). Assert you actually reached the authed state (a known authed DOM
   node), not just that the POST returned.
3. **Navigate** to the gated surface (e.g. `/dashboard` on mobile).
4. **Assert the DOM/behaviour that actually matters** — the specific element /
   text / state the change produces. CTRL's cockpit check asserted: 4-tab nav
   present, real bets board rendered, words-led hero, the "Automate a pain" Edge
   card live, the bet deep-link routed to `/decision-map?case=`.
5. **Screenshot** for the record, read the pixels at high DPI.
6. Report **confirmed** (asserted node X visible, behaviour Y observed) vs
   **inferred**. Don't trust ONE green — a passing run, a single screenshot, a
   "looks right" are not the same as the DOM state / stored row / pixels you
   actually needed to see.

## Footguns
- Service-role/Management tokens do NOT satisfy `getUser()` — you genuinely need
  the user JWT path; that's the whole point of this skill.
- Prod edge CORS may block `localhost` origins → run the authed browser against
  the deployed origin (or a preview deploy with the flag), not the vite dev URL.
- Verifying a flag-gated surface? Verify on a reachable env FIRST (preview deploy
  with the flag on), or flip on prod then be ready to roll back if off.
```

---

## A4. edge-function-deploy-and-verify

Path: `~/.claude/skills/edge-function-deploy-and-verify/SKILL.md`

```markdown
---
name: edge-function-deploy-and-verify
description: Deploy a Supabase edge function with the right JWT posture and verify it by invoking with correct auth — accounting for the deploy-is-more-lenient-than-deno-check caveat.
---

# edge-function-deploy-and-verify

## When to use
- You modified an edge function (Deno) and must deploy it. ALWAYS deploy after
  modifying any edge function — never leave it for the user.
- You're standing up a service endpoint (MCP/webhook/cron target) that should
  NOT require a Supabase user JWT.

## Steps
1. **Type-check locally first:** `deno check supabase/functions/<fn>/index.ts`.
   CAVEAT: `deno check` surfaces PRE-EXISTING repo errors that the deploy
   tolerates — CTRL had a standing `TS4114` in `_shared/with-timeout.ts` that
   `deno check` flags but deploy ships fine. Don't chase a pre-existing error
   that isn't in your diff; confirm it predates your change (git blame / it's not
   in a file you touched).
2. **Deploy with the project ref** (the CLI is NOT pre-linked on this box — pass
   `--project-ref`; `SUPABASE_ACCESS_TOKEN` must be the `sbp_` token):
   ```bash
   supabase functions deploy <fn> --project-ref bkyuxvschuwngtcdhsyg
   ```
3. **Choose JWT posture deliberately:**
   - Service / machine endpoints (MCP server, webhook receiver, cron target):
     `--no-verify-jwt`, and enforce your OWN auth inside (CTRL's `mcp-context`
     deployed `--no-verify-jwt` and gated on a hashed `mcp_token` + active
     Edge-Pro subscription as the real security boundary).
   - User-facing functions: keep JWT verification ON.
4. **Verify by INVOKING with the right auth**, not by assuming the deploy
   worked:
   - Service endpoint → curl it with the expected header/token and assert the
     response shape.
   - User-gated function → you can't self-invoke without a user JWT (service-role
     won't satisfy `getUser()`); either extract the new logic into a PURE
     `deno test`-able helper and test that (verifies the logic; the auth wrapper
     is untouched = low risk), or hand the in-app spot-check to the founder, or
     use live-verify-via-playwright-login. CTRL used "extract pure helper + deno
     test + founder spot-check" for live write-path changes.
5. Report confirmed vs inferred. Deploying an UNVERIFIED change to a live write
   path violates the 100% bar — say so and pick a verify route.

## Footguns
- `deno check` is stricter than deploy — don't get blocked by pre-existing debt
  outside your diff.
- service-role ≠ user JWT for `getUser()`-gated paths.
```

---

## A5. spa-cache-and-deploy-hardening

Path: `~/.claude/skills/spa-cache-and-deploy-hardening/SKILL.md`

```markdown
---
name: spa-cache-and-deploy-hardening
description: Diagnose and fix "old UI survives a hard refresh" (CDN caching the app shell, not the browser), and safely flip a Vercel env flag + redeploy via the API and verify the live header.
---

# spa-cache-and-deploy-hardening

## When to use
- After a deploy the OLD UI persists even through a browser hard-refresh.
- You need to flip a Vercel prod env flag (e.g. CTRL's `VITE_COCKPIT_ENABLED`)
  and confirm it actually took.

## Diagnosis: it's the CDN, not the browser
"Old UI survives a hard refresh" = a CDN/edge is caching the app **shell**
(`index.html`), which survives a *browser* hard-refresh because the stale copy is
served from the edge, not the user's cache. Don't chase the user's browser.
(Distinct from CTRL's "old UI on desktop login" which was BY DESIGN — the
redesign shipped mobile-only; always check whether stale-UI is a cache bug or a
surface that was never redesigned, before fixing caches.)

## Fix at the origin: vercel.json headers
- `no-store` the HTML shell so the entry document is always fresh.
- `immutable` + long max-age the content-hashed `/assets/*` (safe — the hash in
  the filename changes on every build).
```json
{
  "headers": [
    { "source": "/", "headers": [{ "key": "Cache-Control", "value": "no-store, must-revalidate" }] },
    { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-store, must-revalidate" }] },
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }
  ]
}
```

## Flip a prod flag + redeploy via the Vercel API, then VERIFY
1. Read the Vercel token (`vcp_...`) from `C:\Users\krish\.claude\secrets\TOKENS.md`.
2. Set/update the env var via the Vercel API (env upsert), then trigger a prod
   redeploy via the API (CTRL set `VITE_COCKPIT_ENABLED=true` env + redeploy via
   API). A Vite `VITE_*` flag is build-time baked — you MUST redeploy for it to
   take; flipping the env without a rebuild does nothing.
3. **Verify the flag took on the LIVE site**, don't assume:
   - Check the live response header for the shell:
     `curl -sI https://ctrl.themindmaker.ai/ | grep -i cache-control`
     and confirm `no-store` on the shell.
   - Verify the flag-gated behaviour itself via live-verify-via-playwright-login
     against the deployed origin.
   - For a flag flip, verify FIRST on a reachable env (preview deploy with the
     flag), or be ready to roll back if it's wrong. "verified" stays literal.
4. Flag chat-pasted `vcp_` tokens for rotation afterward.

## Footguns
- `VITE_*` flags are baked at build time — redeploy or it's a no-op.
- A browser hard-refresh does NOT bust an edge/CDN cache; fix the origin headers.
- Distinguish a cache bug from a surface that simply wasn't redesigned yet.
```

---

# PART B — Permissions to enable

These are `settings.json` allow-rules (use `~/.claude/settings.json` for global, or the project `.claude/settings.json`). The goal: auto-allow the mechanical, reversible, self-verifiable loop steps that ran dozens of times on CTRL, while keeping the genuinely dangerous prod ops gated — exactly the ones the environment's classifier correctly blocked during this project.

## B1. Safe to auto-allow

Add under `permissions.allow`. Each is reversible, verifiable, or read-only — the friction they remove was paid every single PR on CTRL.

```jsonc
{
  "permissions": {
    "allow": [
      // --- Read the secrets registry (read-only; required for every token-bearing op) ---
      "Read(//c/Users/krish/.claude/secrets/TOKENS.md)",

      // --- Supabase Management API: apply migration + verify query (the core backend loop) ---
      // Scoped to the one project ref so it can't hit arbitrary projects.
      "Bash(curl:*api.supabase.com/v1/projects/bkyuxvschuwngtcdhsyg/database/query*)",

      // --- Edge function deploy (always-after-edit; reversible by redeploy) ---
      "Bash(supabase functions deploy:*)",
      "Bash(deno check:*)",
      "Bash(deno test:*)",

      // --- Local verify loop: dev server, builds, Playwright, headless screenshots ---
      "Bash(npm run dev:*)",
      "Bash(npm run build:*)",
      "Bash(npx playwright:*)",
      "Bash(node:*)",            // local verify scripts (Playwright drivers, PIL-via-node, probes)

      // --- The PR cycle (CTRL ran branch→push→PR→merge dozens of times; main is protected) ---
      "Bash(git checkout:*)", "Bash(git branch:*)", "Bash(git add:*)",
      "Bash(git commit:*)", "Bash(git push:*)", "Bash(git pull:*)",
      "Bash(gh pr create:*)", "Bash(gh pr merge:*)", "Bash(gh pr view:*)",
      "Bash(gh pr checks:*)", "Bash(gh run:*)",

      // --- Scratch cleanup (zero-residue discipline) ---
      "Bash(rm:*_scratch_*)", "Bash(rm:*_mig.sql)"
    ]
  }
}
```

| Rule | One-line justification |
|---|---|
| `Read(TOKENS.md)` | Every token-bearing op needs it; reading a local gitignored file is safe and was a constant prompt. |
| `curl ...projects/<ref>/database/query*` | The core backend mechanic, run every PR; scoped to the single CTRL project ref so it can't reach others. |
| `supabase functions deploy` | Mandated after every edge edit; reversible by redeploy. |
| `deno check` / `deno test` | Read-only type-check + local tests; the self-verify backbone for write-path logic. |
| `npm run dev` / `npm run build` | Local-only; the fast edit→screenshot→read loop and the compile gate. |
| `npx playwright` / `node` | Local browser-driven verification and probe scripts; credentials stay on-box. |
| `git *` + `gh pr/run *` | The full branch→PR→merge cycle; main is branch-protected (needs green checks) so merge can't bypass CI. |
| `rm *_scratch_* / *_mig.sql` | Enforces the zero-residue cleanup step without a prompt per file. |

Note on safety of `gh pr merge`: it is only safe to auto-allow **because main is protected and requires green checks** (CTRL confirmed: "main protected, needs green checks, no review required, merge keeps main==prod"). If a repo's main is NOT protected, move `gh pr merge` to the gated list.

## B2. Keep gated (confirm-required)

These are the operations the environment's classifier blocked during CTRL — correctly. Do NOT add allow-rules for them; if anything, pin them with `permissions.deny` / `ask` so they always surface. **Do not route around a denial** — surface what you were trying to do and why, and let the founder decide.

```jsonc
{
  "permissions": {
    "ask": [
      // Broad/mass prod mutations — any UPDATE/DELETE without a tight WHERE on rows you didn't create
      "Bash(curl:*api.supabase.com*database/query*)"   // (only the broad pattern; the scoped verify pattern above is narrower and wins)
    ],
    "deny": [
      // Reaching into a credential / service-role MASTER key store via the Management API
      // (CTRL: the credential-store scan was correctly BLOCKED by the classifier)
    ]
  }
}
```

| Operation kept gated | Why it stays gated |
|---|---|
| **Fetching a service-role / MASTER key from the Management API** (the credential-store scan) | The classifier blocked this on CTRL and that was correct. A leaked service-role key bypasses all RLS for every tenant. The founder pastes a scoped token when needed; the agent should never self-fetch the master key. |
| **Broad / mass prod `UPDATE` or `DELETE`** (no tight WHERE, or touching rows the agent didn't create) | Irreversible at scale against real user data. CTRL's rule: you drive *verifiable backend you can prove*, but mass mutation is "anything irreversible to real users" — the founder's by right. |
| **Seeding fabricated rows into the PRODUCTION database** (beyond a self-cleaned seed→assert→restore on your OWN rows) | A faked row that escapes cleanup pollutes the brain/warehouse and corrupts downstream signals. The classifier blocked fabricated-row seeding on CTRL. The only sanctioned form is the transactional seed→assert→**restore to zero residue** in skill A1, on rows you created. |
| **Flipping a prod flag for ALL users without a verify step** (e.g. `VITE_COCKPIT_ENABLED=true` on prod with no prior check) | This is the go-live decision — the founder's by right unless pre-authorized. Even when pre-authorized ("OK to flip once verified"), "verified" stays literal: flip only after a real confirm on a reachable env, and be ready to roll back. CTRL flipped the cockpit flag ONLY after Krish explicitly authorized it + provided a test login to verify. |
| **Credential rotation, outward sends, anything irreversible to real users** | Side effects that leave the sandbox. Always queued to the founder, never guessed. |

**The standing rule:** auto-allow the loop that builds and proves work (migrate→verify→deploy→test→PR→merge, all reversible/self-verifiable); keep gated the small set of ops that touch master credentials, mutate prod broadly, fabricate prod data, or go live for everyone. When a gated op blocks you, report the intent and the block — don't work around it.
```

---

*Companion to BUILD-PARTNER-PLAYBOOK.md (the operating method), _DESIGN-LOG.md (locked rules per surface), and _STATE.md (the live ledger). Install the five skills above into `~/.claude/skills/` and merge PART B into settings.json to automate the mechanics of the playbook's verification loop.*
