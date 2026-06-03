# Claude Code Instructions

## Git & PR Workflow

- `gh` CLI is authenticated and works. Use it for PRs, merges, and GitHub operations.
- Create a branch, push, create the PR with `gh pr create`, and merge with `gh pr merge --merge --delete-branch`. Handle the full cycle; never leave manual steps for the user.
- Never push directly to main; always go through a PR branch.
- After merging, switch back to main and pull.
- Clean up: delete screenshot/test artifacts before committing. Add transient files to `.gitignore`.

## Supabase Deployment

- Supabase CLI (`supabase`) is installed and the project is linked to `bkyuxvschuwngtcdhsyg`.
- **Edge functions**: Deploy with `supabase functions deploy <function-name>`. Always deploy after modifying any edge function; do not leave this for the user.
- **Database migrations**: The local migration history is out of sync with remote. Do NOT use `supabase db push`. Instead, run SQL directly via the Supabase Management API:
  ```powershell
  $body = @{ query = "YOUR SQL HERE" } | ConvertTo-Json -Compress
  $headers = @{ 'apikey' = $env:SUPABASE_ACCESS_TOKEN; 'Authorization' = "Bearer $env:SUPABASE_ACCESS_TOKEN"; 'Content-Type' = 'application/json' }
  Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/bkyuxvschuwngtcdhsyg/database/query' -Method POST -Headers $headers -Body $body
  ```
  The Supabase access token is in the user rules (starts with `sbp_`). Never commit it to source.
  Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for idempotency. For RLS policies (no IF NOT EXISTS), query `pg_policies` first or accept that duplicates will error harmlessly.
- **Secrets**: Rotate via Supabase Dashboard. If a secret needs setting programmatically, use `supabase secrets set KEY=VALUE`.
- Always apply migrations and deploy functions yourself. Never tell the user to do it manually.

## Shell (PowerShell on Windows)

- No `&&` chaining; use `;` or separate commands.
- No heredocs (`<<'EOF'`); use simple `-m "message"` for git commits.
- No `tail`/`head` Unix commands; use `Select-Object -Last N` or read the file.
- `$$` in strings gets interpolated; avoid PL/pgSQL `DO $$ ... $$` blocks in inline SQL. Use separate policy creation statements instead.

## Project

- This is a **Vite + React 18 + TypeScript** app with **Supabase** backend
- Styled with **Tailwind CSS** and **shadcn/ui** components
- Animations via **Framer Motion**
- Edge functions live in `supabase/functions/` (Deno runtime)
- Router: React Router v6 with `createBrowserRouter` and lazy loading (`src/router.tsx`)
- Run `npm run build` to verify changes compile
- Node.js requirement: `>=22 <24`

## Architecture Quick Reference

- **Dashboard** (`/dashboard`) is the main hub - shows Memory Web (default) or Edge (`?view=edge`)
- Desktop: world-class desktop shell with `DesktopSidebar`, sticky top bar, optional right rail, and global Command Palette (Cmd/Ctrl+K). Authenticated routes wrapped by `AuthedLayoutRoute` / `CommandPaletteProvider`.
- Mobile: bottom nav (`BottomNav`) + full-screen views, floating voice FAB
- Legacy routes (`/today`, `/voice`, `/pulse`, `/diagnostic`, `/think`) all redirect to `/dashboard`
- AI: Vertex AI Gemini 2.0 Flash primary, OpenAI GPT-4o fallback, static tertiary
- **79 edge functions** in `supabase/functions/` (verified 2026-06-03; latest: the `decision-engine` / `decision-eval` / `decision-watch` trio)
- **57 custom hooks** in `src/hooks/`
- **105 migrations** applied via Supabase Management API
- DB extensions in use: pgvector, pgcrypto, pg_cron
- Briefing v2 pipeline: lens → planner → fan-out (Perplexity/Tavily/Brave, 12s cap) → embed dedupe + score → curate → script (gpt-4o) → audio (ElevenLabs)
- Skill Builder pipeline (`/context` step 1, Edge Pro gated): voice/text → Three Honest Tests triage → OpenAI JSON-mode extraction → quality gate → agentskills.io-compliant ZIP download. Pain-anchored entry points (Edge view `AutomatePainCard`, Memory blocker zap, Briefing decision_trigger zap) pass a `SkillSeed` via location state and pre-open `SkillCaptureSheet`.
- Decision Engine pipeline (`decision-engine`): POST a statement (source: advisor/capture/voice/fireflies) → decompose → verify (web-grounded claims) → cross-examine → advise, run in the background via `EdgeRuntime.waitUntil` while the frontend polls `decision_cases` + `decision_claims` per `stage` (mirrors the briefing streaming pattern). `decision-watch` is an hourly pg_cron WATCH loop that re-verifies load-bearing claims and raises idempotent `decision_alerts` (surfaced in the Daily Briefing); `decision-eval` is the admin-only single-claim calibration harness. Tables (all RLS owner-scoped): `decision_cases`, `decision_claims`, `decision_evidence`, `decision_tensions`, `decision_alerts`, `decision_events`, `decision_eval_cases`. Hooks: `useDecisionEngine` (run + poll), `useDecisionInbox` (case list + open alerts).
- All external API calls wrapped via `_shared/with-timeout.ts`. Structured logs via `_shared/logger.ts`. Stripe webhooks signature-verified + idempotent.

## Key Conventions

- No em dashes in any copy - use hyphens, semicolons, or parentheses
- Light mode design: warm off-white backgrounds, deep ink text, pure white cards
- Mobile-first, no-scroll pattern on key pages
- Voice-first interaction where applicable
- Production URL: `ctrl.themindmaker.ai` (not leaders.themindmaker.ai)
