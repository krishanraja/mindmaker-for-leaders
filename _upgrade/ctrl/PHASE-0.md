# CTRL (mm-ctrl) — Phase 0: Sync + Recon

Date: 2026-05-30. Status: COMPLETE, no code changes. Branch: `main` @ `63aeee3` (clean, fresh).
Method: 6 structured readers (Sonnet) over distinct subsystems + 1 synthesis pass (Opus), then targeted read-only prod verification against `bkyuxvschuwngtcdhsyg`.

---

## 0. Setup verification

- Repo already cloned at `C:\Users\krish\MindmakerOS-Apps\mm-ctrl`. NOT re-cloned (SETUP step 3). Remote `krishanraja/mm-ctrl`, clean tree, `main` fast-forwarded (already up to date).
- Access confirmed (all HTTP 200): GitHub (`krishanraja`, scope `repo` only, no `workflow` scope), Vercel (project `prj_YnVti…` = `mm-ctrl`), Supabase Mgmt API (`bkyuxvschuwngtcdhsyg` = "Mindmaker AI", us-east-2, ACTIVE_HEALTHY).
- Toolchain gap: local runtime is Node v25.5.0; repo requires `>=22 <24` (`.nvmrc` decodes to `22`). No nvm/fnm/volta installed, `node_modules` absent. Baseline `npm install`/typecheck/lint/build deferred to Phase 2 start (no code changes in Phase 0). Resolving this (install Node 22) is a system change held for the gate.

---

## 1. Confirmed Section 3 row (corrected)

CTRL (mm-ctrl). Live: **ctrl.themindmaker.ai** (NOT leaders.themindmaker.ai).
What it is: portable AI-context platform for senior leaders. Builds a Memory Web (structured, encrypted "AI double") from ~2 min of voice/text, one-click Context Export to any LLM (ChatGPT, Claude, Gemini, Cursor, Claude Code), a daily ~3-min evidence-based audio briefing anchored to the user's real priorities, and (Edge Pro) an agentskills.io-compliant Claude Skill generated from a weekly workflow.
ICP: C-suite / VP / Founder at 50-5,000 employees (sweet spot 100-1,000), English-speaking, already using AI daily but getting generic output.
Magic moment: one-click **Context Export** (the first AI response that is unmistakably about THEM, not generic). Secondary: an installed, auto-triggering Claude Skill in the user's own voice (Edge Pro).
Stack: Vite + React 18 + TS on Vercel (SPA, blank-first-paint, single catch-all rewrite, no SSR/prerender); Supabase (Postgres + pgvector + pgcrypto + pg_net; 74 Deno edge functions; 99 migration files); AI router Vertex Gemini 2.0 Flash primary / GPT-4o fallback / static tertiary; ElevenLabs TTS; Stripe (single `mindmaker_llc` account); Resend email.

Pricing (corrected): Free/Core $0; Full Diagnostic $49 one-time; Deep Context $29 one-time; Bundle $69 one-time; **Edge Pro $9/month**; Bootcamp $15K-$50K; Portfolio $5K-$25K.

---

## 2. Live issues (highest stakes first)

1. **Edge Pro price mismatch is LIVE.** UI renders "$29/mo" (`src/constants/billing.ts:7` `EDGE_PRO_PRICE_USD = 29`, shown in `EdgePaywall.tsx:90`), but Stripe actually charges 900 cents = **$9.00** (`supabase/functions/create-edge-subscription/index.ts:11`), and every marketing doc says $9. The UI overstates price 3.2x. One-line fix, but it pollutes any future revenue attribution.
2. **Possible entitlement write-hole (UNVERIFIED, gated).** Siblings Merciless and Pulse both shipped with free users able to self-grant Pro via an over-permissive RLS UPDATE policy. CTRL's entitlement lives in `edge_subscriptions` (prod RLS=true) and there is a `user_roles` table (role enum). The decisive check (can a user write their own `edge_subscriptions` / `user_roles` row?) was BLOCKED by the prod-read permission boundary. THIS IS THE #1 THING TO VERIFY ON PROD-READ APPROVAL.
3. **Functional RLS bug (verified in migrations, dead surface).** `leader_missions`, `leader_progress_snapshots`, `leader_check_ins` (migrations `20260223*`) use `USING (leader_id = auth.uid())` where `leader_id` is an FK to `leaders.id` (an app UUID), not `auth.users.id`. The policy returns zero rows for every user, so the post-assessment mission / check-in surface is silently dead. Owner column confirmed in prod: `leaders.user_id` exists. Fix: join via `leaders.user_id = auth.uid()`.
4. **`tts_config` + `tts_quality_snapshots` have RLS DISABLED in prod (verified).** Any authenticated user can read/write provider config + voice_id. Low severity, defence-in-depth hole.
5. **`resend-webhook` has no HMAC signature verification** (spoofable). `payment_intent.payment_failed` in `stripe-webhook` is a `console.log` with no table write / alert / retry.
6. **Diagnostic upgrade price IDs may be placeholders.** `create-diagnostic-payment/index.ts:19-20` still carry `TODO: Replace with actual Stripe price ID` for deep_context ($29) and bundle ($69). Verify in Stripe before trusting those two paid tiers as live.

---

## 3. Subsystem findings

### AI pipelines (biggest reliability + latency lever)
- **Streaming is entirely absent.** `streamOpenAI` (`_shared/openai-utils.ts:220-289`) is dead code, never imported. All 14+ AI functions block and return full JSON. Violates the Section 4 "stream by default" rule.
- **Timeouts inconsistent.** Only `generate-briefing` / `synthesize-briefing` use the shared `fetchWithTimeout` + `ProviderUnavailableError`. 15+ functions (`extract-user-context`, `memory-synthesize`, `synthesize-edge-profile`, `onboarding-interview`, `edge-generate`, `ai-generate`, `infer-briefing-interests`) call bare `fetch()` with no timeout and no AbortController (hang until Supabase's 60s wall-clock kill).
- **Retry masks misconfig.** `ai-generate/tryVertexAI` (lines 538-622) retries on ALL errors with no status gate, so a 401 bad-key or 429 quota silently retries then falls through to OpenAI, hiding the failure. Violates "exclude 4xx auth/quota from retry."
- The 30s silent briefing wait IS the magic-moment friction. Streaming the fan-out converts dead-wait into the wow moment.

### Data model
- 99 migration files, ~91 tables. Strong RLS posture overall, with the specific exceptions in section 2.
- **Prod drift is real:** the 4 "ghost" tables (`ai_insights_generated`, `engagement_analytics`, `lead_qualifications`, `lead_qualification_scores`) and `public.users` exist in PROD (verified) but have no `CREATE TABLE` in any repo migration. So referencing functions do not error, but the repo migrations are not a faithful prod mirror. CLAUDE.md confirms local history is out of sync; `db push` is not used.
- DB extensions: pgvector, pgcrypto, pg_net (pg_cron noted in docs but no `cron.schedule` found in migrations).

### Frontend + journey
- Router: React Router v6 `createBrowserRouter` + lazy loading (`src/router.tsx`). Authed routes wrapped by `AuthedLayoutRoute` + `CommandPaletteProvider`. Legacy routes redirect to `/dashboard`.
- **Public surface = blank-first-paint.** `index.html` body is exactly `<div id="root"></div>` + module script. Single Vercel catch-all rewrite. A fleet/PR-agent or LLM crawler pointed at any route sees an empty shell behind a 100ms `InitializationLoader` + first-session `SplashScreen` (2-3 blocking layers).
- **No service worker.** Installable PWA (manifest + icons present) but blank offline.
- State coverage mostly good; gaps: no visible error state if the Memory Web supabase query fails silently; no explicit error card on a failed briefing generation; `BriefingSheet` iterates an empty segments array silently; `RequireAuth` shows plain "Loading..." text.
- Mobile-first confirmed: breakpoint 768px, 44pt touch targets, safe-area utilities, thumb-reachable FAB and bottom sheets. Usable one-handed at 390px.

### Commerce + attribution
- Single Stripe account: `mindmaker_llc` (global Mindmaker key, no dedicated CTRL key). `stripe-webhook` is signature-verified + idempotent (`stripe_events_processed`).
- **Attribution contract (5c) is 0% implemented.** Zero `utm_*` anywhere in `src/` or `supabase/`. Nothing written to `auth.users` metadata, nothing stamped to Stripe customer/subscription/session metadata.
- **Warehouse read-back (5d) is 0% implemented.** Repo grep for `gojpffsrxybbpbdzzrvs` and `ingest-attribution` returns zero matches. No lifecycle events reach the shared warehouse.
- **No `marketing_consent`** column on `leaders`/`profiles` (the existing `consentToInsights` is for AI insight generation, not marketing). Must be added before any free-tier re-engagement (5f).
- Content feeds (5e): briefings are generated and stored but not exposed as a fetchable public feed.
- **No runtime product-truth source (5b).** No `/.well-known`, no `/api/product*`, no public pricing JSON. Fleet must be git-seeded and will drift on every price/feature change.

### Design system / spine readiness
- **HIGH readiness** to be the first repo to author the shared spine (most-documented app in the fleet, 9 substantive docs).
- Blocker: **two divergent token systems.** `src/styles/tokens.css` (mint accent `158 82% 73%`) vs `src/index.css` (shadcn base, accent `158 64% 40%`, wins at runtime). `--success` referenced in `tailwind.config.ts` but defined nowhere (broken token). `tokens.css` `.dark{}` is empty; dark mode lives only in `index.css`. Motion docs stale vs `src/lib/motion.ts` ground truth. Est. 1-2 days reconciliation before tokens/motion are genuinely shareable.

---

## 4. 5X vision headlines (unbounded, to be scoped at the Phase 1 gate)

1. **Streaming everything** (magic-moment first): live transcript / headline-by-headline briefing assembly, streaming Skill Builder with live quality-gate badges, optimistic writes. Turn the 30s dead-wait into the wow.
2. **Landing-page live voice demo:** unauthenticated user speaks one sentence on the hero, sees fact-nodes appear in a mini Memory Web, sign-up gates the save. Compresses value proof from ~8 steps to ~2.
3. **Cross-app context broadcast:** one tap copies optimized context to ChatGPT + Claude + Cursor + Gemini with a live green checklist.
4. **Live AI-Double status indicator** (iOS Live Activities style): ambient ring of context completeness + freshness, pulse when a new fact was extracted.
5. **Briefing evidence trail as interactive proof:** tap a segment to see exactly which memory fact / decision triggered it, with inline "kill this signal / update this fact."
6. **Voice-first intent-routing FAB:** speak a decision / blocker / briefing topic, real-time intent chip routes it to the right table.
7. **Decision Velocity dashboard** + **peer percentile ambient card** (data already exists in `decisions` and `index_participant_data`).
8. **Post-briefing memory capture prompt** + **haptic chapter markers** (`haptics.light()` already exists).

---

## 5. Recommendations

### 5a — SPA rendering: PRERENDER PUBLIC ROUTES AT BUILD (option 1)
Prerender `/` (Landing), `/booking`, a new static `/pricing`, and `/.well-known/product.json`. Keeps the existing Vite SPA and single Vercel catch-all intact (prerendered HTML served for those paths, SPA hydrates on top), no Next.js migration, unblocks crawler/unfurl/agent visibility and the 5b product-truth need. Lower effort-to-leverage than a split SSR marketing site (multi-day re-arch, overkill for ~3 routes) or a Vercel edge prerender layer (runtime infra, still no real body content). Aligns with the sibling decisions (Merciless/Pulse locked Vite SSG/prerender + edge OG).

### 5d — Read-back: AGREE, central warehouse
Emit CTRL lifecycle events to the shared MindmakerOS warehouse (`gojpffsrxybbpbdzzrvs`) via the single `ingest-attribution` edge function. Greenfield (zero existing matches), cross-app rollups are the whole point, matches how the fleet is already wired. Capture `utm_*` + referrer on first landing, persist through signup into `auth.users` metadata, stamp into Stripe customer + checkout-session metadata at both `create-edge-subscription` and `create-diagnostic-payment`, and POST `landed/signed_up/activated/purchased` to ingest after the existing idempotent webhook insert. Aligns with sibling locked decisions.

---

## 6. Completeness / what is still thin
- Prod-vs-migration drift only partially verified (read-only prod query was permission-gated after 2 queries). The entitlement write-policy check (#2 above) is the critical open item.
- Runtime behavior unobserved: no live browser pass yet (splash duration, the $29 label rendering, a real briefing generating, error states triggered). Phase 1 should open with a live mobile pass.
- `handle_new_user()` references `public.users` (exists in prod) but the trigger path was not traced end to end.
- Non-AI edge functions (the 6 Stripe fns beyond headers, `nudge-briefing`, `sync-to-google-sheets` internals) only lightly characterized.

---

## 7. Open gate questions
See the batched gate. Summary: (Q1) approve read-only prod verification to finish the entitlement-write-hole + drift check; (Q2) confirm 5a prerender approach; (Q3) pricing truth ($9 canonical, fix UI; are $29/$69 upgrades live?); (Q4) Phase 1 scope, planning-only vs also greenlight a small live-fix PR (billing $9, tts RLS, leader_* RLS). Central warehouse (5d) proceeding as recommended unless objected. Stripe account confirmed `mindmaker_llc`.
