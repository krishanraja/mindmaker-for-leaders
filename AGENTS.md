# AGENTS.md

Developer/agent operating notes for this repo. For the product architecture and
Supabase/deploy conventions, `CLAUDE.md` is the current source of truth; `README.md`
has the standard `npm` commands. This file only records durable, non-obvious setup
and run caveats.

## Cursor Cloud specific instructions

The update script already runs `npm install` on VM startup, so dependencies are in
place. Standard commands live in `README.md` (`npm run dev|test|build|lint|typecheck`);
notes below are only the non-obvious bits.

### Running the app

- This is a single Vite + React 18 + TypeScript app (not a monorepo) with a Supabase
  (Deno edge functions) backend. Frontend only: `npm run dev`.
- The dev server listens on **port 8080** (set in `vite.config.ts`), not Vite's default
  5173.
- No `.env` is needed to run the frontend. `src/integrations/supabase/client.ts` has a
  hardcoded fallback to the **remote** production Supabase project
  (`bkyuxvschuwngtcdhsyg`) and its public anon key, so auth, the decision engine,
  briefings, etc. work against the deployed cloud backend out of the box. There is no
  local Postgres/Docker/`supabase start` step for normal frontend work; edge functions
  run on Supabase Cloud.
- Because the backend is the shared production project, actions taken in dev (sign-ups,
  anonymous sessions, decision runs) write to real cloud data. The public `/try` page
  runs the real decision engine via an anonymous session and is the safest end-to-end
  smoke test (no account needed).

### Rollup native bindings

- `postinstall` runs `scripts/patch-rollup.cjs`, which patches Rollup to fall back to
  `@rollup/wasm-node` when the native binary is unavailable in this environment. `dev`,
  `build`, and `preview` also pass `ROLLUP_DISABLE_NATIVE=1` (via `cross-env`). If a
  build fails with a Rollup native-binding error, re-run `npm install` so the patch is
  reapplied.

### Checks / CI gates (mirror `.github/workflows/ci.yml`)

- `node standards/check-standards.mjs` - fast, dependency-free gate (no em dashes; all
  required tokens defined). Also runs on `prebuild`, so `npm run build` will fail on a
  standards violation.
- `npm run typecheck` - baseline-gated (`scripts/typecheck-ci.mjs` against
  `scripts/typecheck-baseline.json`). Plain `tsc --noEmit` is a no-op here (the solution
  `tsconfig.json` has `files: []`). Only *new* type errors fail; the repo carries a
  large pre-existing baseline.
- Lint: CI lints **only PR-changed files** (`--max-warnings=0`). A repo-wide `eslint .`
  reports hundreds of pre-existing errors/warnings (mostly `any`-typed Stripe/Supabase
  responses) - that is known baseline debt, not a regression.
- `npx vitest run` - unit suite (pure helpers + edge-function `_shared` logic). Fast and
  hermetic (no network).

### E2E (Playwright)

- `npm run test:e2e` (`playwright.config.ts`) defaults its base URL to
  `http://localhost:5173`. When running against `npm run dev`, set
  `E2E_BASE_URL=http://localhost:8080` first, and start the dev server yourself.
