# CTRL Spine build (2026-06-05)

The "spine" is the core recurring product loop that turns a first-time visitor into a
returning operator who builds, decides, and sharpens inside CTRL:

  land -> free build lap (anonymous) -> kit + save (account) -> goals tracked as one
  source of truth -> recurring loop with critical-evaluation reps on real decisions.

This document is the contract for that build. It records the five resolved decisions
and the concrete, codebase-grounded scope of each phase so the work survives an
ephemeral container and is reviewable.

## Resolved decisions (2026-06-05)

1. Goals primitive: a NEW unified `goals` table is the single source of truth. Goals are
   backfilled from the existing scattered sources; new writes go to `goals`. (Heaviest
   phase: migration + backfill + read/write surface + additive links.)
2. Account creation moment: at kit delivery, optional. Deliver the win first, then offer
   "save this to keep building". The kit is never gated behind signup.
3. Critical-evaluation challenge bar: force a user call only on load-bearing claims,
   reusing the exact `decision-watch` predicate (`is_load_bearing = true AND type IN
   ('factual','market','causal')`). Always show the work; force the call only when a claim
   carries the decision.
4. Free-tier compute envelope: a generous soft per-user daily cap. Never hard-block
   mid-task; log overages so real demand is visible before pricing is designed.
5. Dark mode: full parity. Light is the default and the product; dark must stay correct on
   every surface. New UI uses semantic tokens only (the prebuild guard enforces that every
   referenced token is defined in `src/index.css` for both themes), so new work is
   dark-correct by construction. Existing surfaces still need a human dark QA pass.

## Current-state map (grounded)

- Goals data today: `leader_missions` (RLS `leader_id = auth.uid()`),
  `user_business_context.primary_goals` TEXT[] and `current_challenges` TEXT[],
  `user_memory` rows where `fact_category = 'objective'`, `user_decisions`, and
  `decision_cases.objective_fact_ids` uuid[]. No table named `goals` exists.
- Kit flow: `/context` (ContextExport.tsx -> SkillCaptureSheet -> useSkillExport ->
  `generate-skill-export` edge function -> JSZip ZIP). `/context` is inside
  `AuthedLayoutRoute` (RequireAuth), so it requires auth today.
- Auth: `src/lib/authMachine.ts` singleton + `src/hooks/useAuth.ts`. Anonymous auth is
  already used (OperatorIntake, EmailCaptureForm, QuickVoiceEntry) and the machine exposes
  `createAnonymousSession()` and `upgradeAnonymousSession()`. Routes gated by
  `src/components/auth/RequireAuth.tsx`.
- Decision engine: stages decompose -> verify -> cross_examine -> advise (background via
  EdgeRuntime.waitUntil; frontend polls). `decision_claims.is_load_bearing` set at
  decompose; `decision_cases.breakpoint_assumption_id` marks the decisive claim. Hooks
  `useDecisionEngine`, `useDecisionInbox`; UI in
  `src/components/operator/decision/` (decision-views.tsx, PressureTestPanel.tsx).
- AI spend: `ai_usage_audit` table exists (user_id, function_name, provider, model,
  tokens, latency, status, metadata, created_at) but is UNUSED. `rate_limits` +
  `check_rate_limit()` already gate request frequency. `edge_subscriptions` gates Edge Pro.
  Each function decodes the JWT inline for `auth.getUser()`; there is no shared auth helper.

## Phases

### B2 - Unified goals table (foundation, ships first and alone)

- Migration `goals` table: id, user_id (FK auth.users, cascade), title, detail, status
  ('active'|'achieved'|'paused'|'dropped'), horizon ('now'|'quarter'|'year'|'north_star'),
  priority int, source ('manual'|'business_context'|'memory'|'decision'|'mission'|'voice'),
  source_ref text (for idempotent backfill), progress numeric(3,2), target_date date,
  created_at, updated_at. RLS owner-scoped (`auth.uid() = user_id`) for ALL. Indexes on
  (user_id, status) and (user_id, horizon). updated_at trigger.
- Backfill (idempotent, NOT EXISTS guarded): from `user_business_context.primary_goals`
  (unnest) and `user_memory` objectives (is_current rows).
- Additive links (nullable, non-breaking): `goal_ids uuid[]` on `decision_cases`,
  `goal_id uuid` on `leader_missions`. No rewrite of the live decision/briefing pipelines
  in this phase; legacy arrays remain readable during transition.
- Frontend: `src/types/goals.ts`, `src/hooks/useGoals.ts` (react-query CRUD, modeled on
  useMissions), and a minimal read surface.
- Deploy: migration applied via Supabase Management API (additive + idempotent). Build
  verified with `npm run build`.

### B4/B7 - Free-tier compute soft cap + usage logging

- New `supabase/functions/_shared/ai-usage.ts`: `recordAiUsage(...)` (best-effort insert
  into `ai_usage_audit`, never throws), `getDailyUsage(...)`, `checkDailySoftCap(...)`
  (returns over/used/limit, logs an overage event, NEVER blocks). Soft cap is a generous
  constant (a few full runs/user/day).
- Wire into representative paid functions (the build-lap `generate-skill-export` and a
  decision-path function) as strictly additive, try/catch-guarded logging. The live
  `generate-briefing` revenue path is left untouched in this pass.
- Deploy: new helper is safe; modified functions are additive/guarded.

### B5 - Free anonymous build lap + account at kit delivery

- New PUBLIC route `/build` (outside RequireAuth). Ensures an anonymous session on entry
  (`authMachine.createAnonymousSession`), runs the kit-capture flow, delivers the kit, then
  offers optional account creation (`upgradeAnonymousSession`) to save and keep building.
- Reuses `useSkillExport` + `generate-skill-export`. No change to the authed `/context`.
- Build verified. The anon -> account upgrade and download UX need a human browser QA pass.

### B6 - Critical-evaluation muscle (force the call on load-bearing claims)

- Migration `decision_user_calls`: id, user_id, decision_case_id, claim_id (nullable),
  call ('accept'|'reject'|'unsure'), reasoning text, created_at. RLS owner-scoped.
- Frontend: a "Make the call" step that, on a completed case, surfaces only load-bearing
  claims (the breakpoint claim first) and records the user's own judgment before the
  engine's recommendation is accepted. Added as an opt-in step, not a rewrite of the
  existing decision UI.
- Build verified. The forced-call UX needs a human browser QA pass.

## Deploy and verification policy

- Migrations: additive + idempotent only (CREATE TABLE/INDEX IF NOT EXISTS; backfill
  NOT EXISTS guarded). Applied via the Management API.
- Edge functions: new functions and additive/guarded changes only. The live briefing
  revenue pipeline is not modified in this pass.
- Frontend: built locally to verify compilation; pushed to the feature branch. Production
  promotion happens on merge, not from the branch.
- Honesty: anything that genuinely needs an authenticated browser or mobile session
  (dark-parity sweep on existing surfaces, the build-lap and forced-call UX) is reported as
  needing human QA rather than claimed as verified.
