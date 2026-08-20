# CTRL replication and release guide

Last reconciled: 2026-08-10

This is the operational guide for a fresh CTRL instance and for releasing the canonical production instance. Do not copy credentials from documentation or chat.

## Stack

- Node.js `>=22 <25`; Vercel production uses 24.x.
- React, TypeScript, Vite, Tailwind, Radix/shadcn.
- Supabase Auth, PostgreSQL, Storage, Edge Functions, Vault, pg_cron, pg_net, pgvector, and pgcrypto.
- Capability-specific AI providers. See the current architecture provider matrix; do not assume one global primary model.
- ElevenLabs for audio, Resend for email, Stripe for Edge Pro.
- Vercel for frontend deployment.

Recounted 2026-08-20: 113 Edge Function directories excluding `_shared`, 78 hook files, and 161 SQL migrations. Re-count before quoting.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Required frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or a modern Supabase publishable key

Never place service-role, secret, provider, email, payment, or cron credentials in `VITE_*` variables.

## Supabase setup

For a new project:

1. Link the CLI to the intended project.
2. Enable the extensions referenced by migrations.
3. Review migrations in order and apply them to a branch or disposable project first.
4. Apply the complete migration set.
5. Deploy only the functions needed by the release, using `supabase/config.toml` as the auth contract.
6. Set server-only provider secrets.
7. Run security and performance advisors.

The canonical production database has historical migration-ledger drift from changes applied outside the ledger. Do not run an unreviewed blanket `supabase db push` against it. For canonical production, preflight the target schema, execute reviewed additive migration files exactly, read back the resulting objects and policies, then record only the successfully applied versions.

## Server-only secrets

Core production capabilities use:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `RESEND_API_KEY`
- Stripe secrets used by the existing billing functions
- Search/news provider keys used by `live-headlines`

The Control Center bridge uses:

- `CONTROL_CENTER_URL`
- `CONTROL_CENTER_PUBLISHABLE_KEY`

The key must be publishable and constrained by Control Center RLS to reads. Never use a cross-project service-role key for this adapter.

## Vault-backed delivery cron

Migration `20260810220000_vault_backed_briefing_cron.sql` creates one random `ctrl_cron_secret` inside Supabase Vault and schedules:

- `live-headlines-prewarm` at 10:30 UTC
- `daily-briefing-email` at 12:00 UTC

Deployment tooling must read that value through an authenticated management session and set the matching Edge Function secret `CTRL_CRON_SECRET` without printing or persisting it. The functions receive it only in `X-CTRL-Cron-Secret`. Do not restore `app.supabase_service_role_key`.

Verify with value-free checks:

- one Vault secret named `ctrl_cron_secret`;
- two active jobs whose commands use `X-CTRL-Cron-Secret` and not the legacy setting;
- an Edge Function secret named `CTRL_CRON_SECRET`;
- a successful count-only `live-headlines?debug=1` probe;
- a fresh `live_headlines_cache` row after `force=1` prewarm.

## Function auth matrix

- User-scoped AI, memory, Blind Spot, briefing conversation, audio synthesis, cards, and decision summary require a signed-in user or explicit ownership check.
- Cron/webhook/public-onboarding functions disable platform JWT verification only when the handler performs custom authentication or exposes a deliberately public, validated contract.
- `live-headlines` implements auth in the handler so user JWTs and the Vault cron secret can coexist.
- Public inputs must validate, rate-limit where costly, and converge idempotently on retry.

## Control Center data boundary

Control Center is a source adapter inside `live-headlines`, not a second product or feed. Only source-backed, high-fit items enter the pool. The published article host remains the source identity. The adapter fails closed if either bridge setting is absent.

## Frontend release

Vercel is Git-connected. A merge to `main` creates the production deployment.

Canonical domains:

- `makeyourmindup.ai`
- `www.makeyourmindup.ai`

Retired domains should remain attached only as permanent redirects to the canonical host:

- `ctrl.themindmaker.ai` (retired redirect)
- `www.ctrl.themindmaker.ai` (retired redirect)

Do not move the canonical domain until the candidate deployment is READY and accepted. Keep the prior production deployment and pre-release commit recorded for rollback.

## Verification gates

Before merge:

```bash
npm run docs:check
npm run standards:check
npm run typecheck
npm test -- --run
npm run build
```

Also run changed-file ESLint, bundle every altered Edge Function, and inspect the Vercel preview at desktop, mobile, and 320px. Run `npm run test:e2e` against an active local server or an authorised preview through `E2E_BASE_URL`; report the current skipped authenticated specs until the auth seed helper is wired.

Production acceptance must prove:

- public onboarding, authentication boundary, and First Lens;
- Today hierarchy, premium category visuals, briefing control, and Settings access;
- briefing play/pause/read/talk-back behavior;
- Decide, Blind Spot confirmation, and Memory entry;
- no horizontal overflow, clipped visible copy, broken fonts, or sub-44px signature controls;
- public functions reject malformed input, cron-only handlers reject anonymous calls, and user-scoped handlers reject anonymous calls;
- Control Center contributes through the shared pool;
- scheduled prewarm creates a fresh cache;
- canonical host serves the release and retired host redirects;
- no new frontend, Edge Function, database, auth, or Vercel runtime errors.

## Rollback

- Frontend: revert the release merge on `main` and let Vercel deploy the revert.
- Edge Functions: redeploy the function set from the recorded pre-release commit.
- Additive schema: leave new tables and columns dormant unless a separately reviewed destructive rollback is necessary.
- Domain: move the canonical domains back only if the previous deployment is known-good and the production acceptance failure requires it.

A release is not complete until documentation describes the deployed state, not the intended state.
