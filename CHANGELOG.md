# Changelog

All notable changes to this project. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) with phase-grouped entries.

For the full design narrative behind each phase, see [`project-documentation/HISTORY.md`](./project-documentation/HISTORY.md).

---

## [Released] - 2026-08-11 - Blind Spot trusted-advisor instrument

### Added

- One CTRL Blind Spot instrument with a private-state label, short mechanism-level read, visible evidence strength, exact dated anchors, tension map, one 15-minute experiment, one-tap correction, and bounded voice or text advisor.
- Structured `BlindSpotCandidateV2` qualification, candidate signing, evidence fingerprint suppression, source ownership and freshness reload, and confirmation support adjudication.
- Additive owner-scoped evidence-link, experiment, and rejection tables plus atomic, idempotent confirmation and experiment-outcome functions.
- Due Blind Spot experiment check-ins in the existing briefing learning slot.
- Public `/preview?surface=blind-spot` fixtures for the complete state range and responsive contract coverage at four approved viewports.

### Changed

- Thin evidence now produces an honest tension question instead of a Blind Spot claim.
- The model selects source IDs; the server owns displayed excerpts, labels, dates, independence checks, and content limits.
- Rejection ends the session and suppresses the same evidence combination until its inputs change. Immediate alternative generation is removed.

### Verified

- 870 Vitest tests pass across 53 files, including 16 focused Blind Spot logic and component tests.
- 37 Blind Spot Playwright checks pass inside the shared production shells at 1440x900, 1280x720, 390x844, and 320x568.
- Typecheck reports zero new diagnostics against the existing baseline.
- Standards, documentation checks, changed-file lint, the 2,789-module production build, and 3/3 prerender routes pass.
- The pgTAP database contract is present and its setup syntax was corrected before merge. Local execution remains unavailable while Docker Desktop is stopped; the remote management connector is read-only for synthetic inserts.
- PR #366 merged to `main` at `0f20baf2437667c3719c94f1c16d04bb08b42023`. Supabase migration and Edge Function v3 readbacks pass, Vercel production is READY, and all 37 Blind Spot checks pass on the canonical production host.

---

## [Unreleased] - 2026-08-10 - Documentation authority and drift gate

### Added

- A six-document current set under `docs/current/` for product, architecture, features, release state, documentation standards, and navigation.
- Four task-specific agent guides under `docs/agent-instructions/`.
- `npm run docs:check`, with CI enforcement for local links, metadata, inventory counts, route coverage, decision IDs, pricing consistency, size budgets, and known contradictory claims.

### Changed

- Rebuilt the root README as a new-engineer and operator entry point.
- Reduced `CLAUDE.md` to universal instructions and progressive links; preserved the former release journal under `docs/history/`.
- Reclassified phase architecture, feature, delivery, corpus, kit, and polish records as historical instead of placing current overlays above stale bodies.
- Corrected capability-specific AI-provider documentation across architecture, privacy, retention, the ROPA, the subprocessor register, and `.env.example`.
- Renumbered the duplicated August decision block to preserve unique append-only IDs.
- Added documentation verification to the release guide and CI.

### Verified

- Documentation links, metadata, counts, routes, decision IDs, pricing, and known drift checks pass.
- Standards and changed-file ESLint pass. Typecheck reports 221 baseline diagnostics and zero new diagnostics. The full Vitest suite, production build, and 3/3 prerender routes pass.

---

## [Unreleased] - 2026-07-04 - Settings audit: one-door tuning, decisions control-centre, design-system sweep

> **Why.** The Settings surface had drifted from the rest of the app: an "amateur" design system next to the polished Home/Decisions language, a DUPLICATE briefing tuner (the Home "Tune what pops up" sheet wrote `news_preferences`; a separate Settings → Interests panel wrote `briefing_interests`, so tuning in one never showed in the other), a track-record row that navigated behind the still-open settings drawer, and cliché AI-speak ("Watching how it lands", "That is the point"). Fixed holistically against five principles, one door / one of everything, the polished card language everywhere, plain copy, solid pinned footers, interactions that actually work, never patched one-by-one.

### Added
- **Reusable feed/briefing tuning panel.** `src/components/cockpit/NewsPreferencesPanel.tsx`, the "Tune what pops up" picker body (priorities + scan bias + a people/companies + never-show watchlist), now the SINGLE door: wrapped by `NewsPreferencesSheet` (Home "Tune feed" drawer) and rendered directly in Settings → Interests (desktop Briefing tab + mobile section). The watchlist reuses `useBriefingInterests`/`briefing_interests`, so the server daily-briefing lens keeps its named-entity + exclude targeting.
- **Active-decision control-centre.** `src/hooks/useDecisionActions.ts` (archive write, mirrors `useResolveDecision`) + Open / Strengthen / Archive on the active `AgedCallRow`, each wired to an EXISTING door (`useDecisionEngine.load`+pin via a `PressureTestPanel` `openCaseId`/`strengthen` deep-link honoured by `DecisionPage`; the existing `research('strengthen')`; a `status='archived'` update). No new features.
- **Main-app design primitives.** `src/components/system/surface.tsx`, `Surface`, `Eyebrow`, `SettingRow`, and a SOLID `SheetFooterBar` (the counterpart to `kitPrimitives.tsx`, on the dark ctrl-ds tokens).

### Changed
- **One scoring system surfaced everywhere.** The capability analysis (`CapabilityHeader` / `capabilityLadder` / `useCapabilitySignals`) now also renders in the Decisions → History embed (was standalone-page only); no parallel scorer added.
- **Track-record door fix.** `SettingsList` closes the settings sheet before navigating to `/track-record` (the global drawer used to cover the page); the row is now "Tune your feed" and uses the `SettingRow` primitive.
- **Copy cull.** "Watching how it lands" → "Active decision"; "That is the point" / "How they are turning out" / "Still playing out" / "keep an eye" / "keep watching" rewritten plain across `AgedCallRow`, `TrackRecordView`, `DecisionResultView`, `resolveFlow`, `ResolveDecisionSheet`, `decision-views`, `KickstartCard`. Legal/honesty text untouched; no em dashes.
- **Settings design sweep.** Solid pinned footers (the transparent `NewsPreferencesSheet` "Done" bar); off-token `emerald-600`/`amber-600` (dark-mode contrast bugs) → `text-accent`/`amber-500`; emoji (`PrivacyDataTab`) and `✓`/`-` glyphs (`EdgeProTab`) → lucide icons; raw greys + a hardcoded `#00D9B6` button (`EditableField`) → tokens; card radii unified to `rounded-2xl`.

### Removed
- **`BriefingInterestsTab`** (`src/components/settings/BriefingInterestsTab.tsx`), the duplicate tuner, folded into `NewsPreferencesPanel`.
- The dead **Notifications** settings row (it led to a no-op placeholder panel).

**Verified:** typecheck 0 new errors, 337 unit tests pass, production build + prerender green, lint clean on touched files.

---

## [Unreleased] - 2026-06-29 - Unified onboarding → decisions → engagement loop (PR #298)

> **Why.** Entry and re-entry had drifted into patchwork: a legacy 40-minute voice onboarding gated behind a `VITE_COCKPIT_ENABLED` fork (with older Memory dashboards as the other branch), a loose onboarding→first-decision handoff, and a cold-start trap where re-engagement only armed for leaders who already had decisions AND opted into daily email. A leader who set CTRL up but never weighed a decision - or who lapsed - got zero pull-back. Resolved by adapting the whole experience to the leader's lifecycle state (and to the device mindset). Canonical: `docs/CTRL-SYSTEM-SPEC.md` section 8.

### Added
- **Lifecycle-state spine.** `useCockpit` derives `userState` (new/dormant/active/power, off real timestamps + a 14-day dormancy window) → a `posture` (`guide` vs `partner`) on `CockpitData` (`src/types/cockpit.ts`). Posture + device context drive Home's lead and copy (mobile = on-the-go quick read; desktop = deep work).
- **Lightweight inline onboarding.** `InlineProfileSetup` (`src/components/cockpit/onboarding/`) + `useInlineProfile` capture industry + role into `user_memory` and interests via the reused `SeedBeatsPrompt`, rendered in the Home feed zone. No interview, no navigate-away.
- **First/next-decision kickstart.** `KickstartCard` leads the guide-posture Home with a real, role-tailored starter decision (`src/lib/starterDecisions.ts`), routed to `/decision` pre-filled (`DeckCard.route`/`prefill`; `DecisionPage` also reads `?prefill=`). Unit-tested (`src/__tests__/starterDecisions.test.ts`).
- **Reactivation engagement.** `supabase/functions/send-reactivation-nudge` + daily `reactivation-nudge` pg_cron (13:00 UTC) email NEW (never-weighed) and DORMANT (>14d) leaders into a first/next decision, de-duped on `leader_notification_prefs.reactivation_nudge_sent_at` (30-day re-arm), batch-capped. Migrations `20260629120000_reactivation_nudge.sql` + `20260629120100_reactivation_nudge_cron.sql`; smoke `scripts/smoke-reactivation-nudge.mjs`.

### Changed
- `Dashboard.tsx` is now cockpit-only (the one home, device-native). `BottomNav` is the single 3-tab cockpit nav.

### Removed
- The `VITE_COCKPIT_ENABLED` fork, `legacyNav`, and both legacy `Mobile/DesktopMemoryDashboard`.
- The voice onboarding tree: `OnboardingInterview`, `DraftCockpit`, `onboarding/steps/*`, `useOnboardingInterview`, the dead `useGuidedCapture` state machine, `WelcomeTour`, `ProgressBar`. (`EdgeOnboarding` kept - still used by EdgeView.)

### Verified
- Typecheck clean (0 new errors; deletions cleared 10 stale baseline errors), Vite build green, 225/225 unit tests pass. Reactivation fn deployed + dry-run verified + cron armed. Live authed Playwright walk on desktop / tablet / mobile (fresh cold user): cold-start → inline onboarding → kickstart-led feed → `/decision` prefilled.

---

## [5.4] - 2026-06-09 - Phase 10: Desktop Shell Unification + Goals + Enrich Loop

### Added
- **Goals** (PRs #130-#135): horizon-grouped goal tracking (active / paused / done) sourced from voice, diagnostic, and decisions. New page `Goals.tsx` (`/goals`), hook `useGoals`, migration `20260605120000_create_goals.sql`. Wears the unified `DesktopShell` on desktop, mobile header + bottom nav on phones.
- **Enrich loop** (`/enrich`, `EnrichPage`): the inbound "borrow your own AI" loop - the leader copies one prompt, runs it in ChatGPT or Claude, and pastes the answer back, so CTRL learns in two minutes what would take weeks to tell it.
- **Daily Briefing pg_cron trigger** (`20260605000000_daily_briefing_trigger.sql`): scheduled trigger feeding the daily briefing pipeline.
- **AI usage cost tracking** (`20260605130000_ai_usage_cost.sql`) and **per-user decision-call metering** (`20260605140000_decision_user_calls.sql`, hook `useDecisionCall`).
- **`desktop-zero-scroll` e2e spec** (`src/__tests__/e2e/desktop-zero-scroll.spec.ts`, PR #138): asserts the desktop shell pins the app to the viewport and never scrolls the window.

### Changed
- **DesktopShell unification** (PRs #130-#139): every authenticated surface (Dashboard, Memory, Context, Briefing, Decision, Goals, Enrich, Settings, Compliance, Profile) now wears the same `DesktopShell` (sidebar + sticky top bar + optional right rail) instead of stretched mobile markup, and the app is viewport-pinned so the window never scrolls. `DecisionPage` is mounted directly rather than reached only via the orphaned OperatorDashboard.
- **Memory polish** (PRs #136-#137): desktop loading skeleton; import-dedup 406 fix + `useMemoryQueries` lint cleanup.

### Security
- **Leaders RLS hardening** (`20260609120000_fix_leaders_rls_auth_users.sql`, PR #136): fixed a leaders-table RLS 403 so reads/writes are correctly owner-scoped against `auth.users`.

### Verified counts at end of phase
- 80 edge functions
- 59 hooks
- 110 migrations
- 6 Vitest specs + 7 Playwright e2e specs
- 15 active routes (+ 5 legacy redirects)

---

## [5.3] - 2026-06 - Phase 9: Decision Engine + Briefing Streaming + Tenant Hardening

### Added
- **Decision Engine** (PRs #122, #124): verification-looped pressure-testing for decisions and business cases. New edge function `decision-engine` orchestrates a decompose → verify → cross-examine → advise pipeline that runs in the background via `EdgeRuntime.waitUntil` and advances `decision_cases.stage`, so the frontend renders each stage as it lands (mirrors the briefing streaming pattern). `decision-watch` is an hourly pg_cron WATCH loop that re-verifies the load-bearing, web-checkable claims behind active decisions and raises an idempotent `decision_alert` when a verdict flips or confidence drops materially (surfaced in the Daily Briefing) - making a decision a living object instead of a one-shot answer. `decision-eval` is an admin-only single-claim calibration harness exercising the exact live verify path. New tables `decision_cases`, `decision_claims`, `decision_evidence`, `decision_tensions`, `decision_alerts`, `decision_events`, `decision_eval_cases` (all RLS owner-scoped). New hooks `useDecisionEngine` (run + poll a case) and `useDecisionInbox` (case list + open alerts). Migration `20260602000000_decision_engine.sql`.
- **Briefing streaming v2** (PRs #117-#120): flag-gated (`FF.briefingStream`, `?ff_stream=1`) streaming preview. `generate-briefing` early-inserts candidate headlines (null `script_text`) before curation, and `useBriefingStreamPreview` + `StreamingBriefingPreview` poll and surface preliminary segments while the briefing generates. Adds the `src/lib/flags.ts` feature-flag layer, a landing `VoiceDemo`, and an export `BroadcastBar`.
- **Attribution lifecycle tracking** (2026-05-30): new public edge function `track-event` - an unauthenticated emit proxy for client lifecycle events (`landed` | `signed_up` | `activated`) that forwards to the central warehouse via the server-held `ATTRIBUTION_INGEST_SECRET` (no secret on the client). Dormant (forwards no-op) until the warehouse env is configured; deployed with `--no-verify-jwt`.
- **Self-serve onboarding** (PR #126): replaced the `OnboardingWizard` with a `WelcomeTour` + `Coachmark` flow; new `useOnceFlag` hook for show-once gating.
- **Generated artifacts** (2026-05-13): migration `20260513000000_generated_artifacts.sql` + hook `useGeneratedArtifacts`; new hook `useProfileBasics`.

### Security
- **Cross-tenant RLS leak hotfix** (PR #125, `20260601230000_fix_cross_tenant_rls_leak.sql`): closed a cross-tenant read path; applied to prod 2026-06-02 via the Management API and recorded in migration history so it matches the live database.
- **Audit infrastructure** (PR #125, `20260602000000_create_audit_infrastructure.sql`): audit tables for SOC 2 (CC7.2) and GDPR (Art. 30) backing the `/compliance` page and `delete-account`.
- **System-table write hardening** (PR #125, `20260602000100_scope_system_table_writes.sql`): closed `ALL` / `USING(true)` write-holes on shared system tables previously granted to `public`.
- **Leader + TTS RLS fixes** (`20260530120000_fix_leader_rls_and_tts_rls.sql`, applied to prod 2026-05-30 via the Management API).

### Changed
- **Rebuild + QA hardening pass** (PRs #111-#116, 2026-05-30): batched correctness and RLS fixes from the `upgrade/ctrl/rebuild` line of work (the RLS migration above came out of this effort).
- **Marketing consent** (`20260530130000_add_marketing_consent.sql`): added marketing-consent tracking.
- **Edge Pro price drift fix** (PR #109): corrected stale $9/month references after the move to $29/month (existing subscribers grandfathered).

### Verified counts at end of phase
- 79 edge functions
- 57 hooks
- 105 migrations
- 5 Vitest specs + 6 Playwright e2e specs

---

## [5.2] - 2026-05 - Phase 8: Agent Skill Builder + World-Class Desktop Redesign

### Added
- **Agent Skill Builder** (PR #103): new edge function `generate-skill-export` (Edge Pro gated) implementing the full voice-to-Skill pipeline. Three Honest Tests triage gate routes Memory Facts / Custom Instructions / Saved Styles to the right surface instead of generating junk. Quality gate enforces 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections, valid name format. ZIP packaging follows the agentskills.io standard (`SKILL.md` + `references/` + test prompts + install guide). New `skill_exports` table with RLS + per-user log. Frontend: `SkillExportCard` on `/context` Step 1, `SkillCaptureSheet` (voice/text), `SkillPreviewSheet` (download + quality checklist + install guide for Claude Code / Claude.ai / Cursor). New hook `useSkillExport`.
- **World-class desktop UI redesign** (PR #104): unified desktop-native shell. New `AuthedLayoutRoute` wrapping authenticated routes in `CommandPaletteProvider`. Cmd/Ctrl+K Command Palette. Sticky top bar with page eyebrow + title + actions. Optional right rail. Refined sidebar with user footer + keyboard hints. Landing, Dashboard, Briefing, Export wizard all reworked. Mobile paths preserved. Pages opt into command-palette actions via custom `mm:capture-voice` and `mm:generate-briefing` window events.
- **Pain-anchored Skill entry points** (PR #105): `AutomatePainCard` on Edge view (chip row of blockers + active decisions), zap button on Memory Web blocker cards, zap button on Briefing `decision_trigger` segments (v1 + v2). Each entry point hands a `SkillSeed` via `location.state` to `/context`, which auto-opens `SkillCaptureSheet` pre-anchored. New hook `useUserPains` returns top blockers + active decisions for seeding.
- **Contrast + scroll polish** (PR #106): solid /15 tints + visible borders on warm pills + Skill Builder seed banner / pain picker. Dashboard Edge mobile scroller clears the floating mic FAB. Save/restore dashboard scroll position around `SkillCaptureSheet`. New hook `useRevealOnMount` for smooth below-the-fold reveals.

### Changed
- **Edge Pro** ($9/month at time of release) now also includes unlimited Agent Skill Builder generation + Custom Voice Export. No price change at time of release. (Edge Pro moved to $29/month on 2026-05-30; existing $9 subscribers are grandfathered.)
- `/context` Step 1: `SkillExportCard` promoted above the Custom Voice card; "Custom via Voice" renamed to "Custom context export" (was misleadingly claiming to produce a skill).
- `generate-skill-export` accepts optional `seed { kind, text }` in body; prompt grounds extraction in the leader's actual pain language when present.

### Verified counts at end of phase
- 74 edge functions
- 51 hooks
- 98 migrations
- 5 Vitest specs + 6 Playwright e2e specs

---

## [5.1] - 2026-04 - Phase 7: Six-Week Audit Hardening

The product survived six thematic audit weeks, each shipped as its own PR with a clear boundary.

### Added
- **Audit Week 1 - Revenue path** (PR #93): Mandatory Stripe webhook signature verification. New `stripe_events_processed` table for webhook idempotency. Briefing rate limits via `_shared/rateLimit.ts`. E2E test `tests/stripe-webhook-idempotency.spec.ts`.
- **Audit Week 2 - Data path** (PR #94): Closed assessment data leak. Codified `ctrl-briefings` storage bucket policy. End-to-end account deletion (Memory Web + briefings + audio + decisions + missions + assessments + all subordinate rows). E2E test `tests/account-deletion.spec.ts`.
- **Audit Week 3 - UX** (PR #95): Killed onboarding gate. Fixed NorthStar stub. Voice permission recovery. Killed surveillance copy. Removed all "coming soon" placeholders for unimplemented affordances.
- **Audit Week 4 - Reliability** (PR #99): New `_shared/with-timeout.ts` utility (with vitest coverage) wrapping every external API call. Audio failure UX so briefing card still renders if synthesis fails. Onboarding stall recovery.
- **Audit Week 5 - Observability** (PR #97): Structured edge-function JSON logger at `_shared/logger.ts`. CI gate prevents `console.log` regressions.
- **Audit Week 6 - Cleanup + e2e** (PR #98, #100, #101): P2 backlog closure. 5 more e2e specs (auth, briefing journey, briefing rate limits, sparse profile + the two from earlier weeks). New `ai_response_cache` table for lens + embedding caching. Lint cleanup.

### Changed
- All edge-function logging migrated to structured JSON via `_shared/logger.ts`
- All external API calls (Vertex, OpenAI, ElevenLabs, Perplexity, Tavily, Brave, Resend, Stripe) now wrap in `with-timeout`
- `briefing_v2_enabled` opt-in flag honored across cold and cached lens paths

### Verified counts at end of phase
- 74 edge functions
- 48 hooks
- 97 migrations
- 6 Vitest specs + 6 Playwright e2e specs

---

## [5.0] - 2026-04 - Phase 6: Briefing v2 (Evidence-Based Relevance Pipeline)

### Added
- **Seven-stage briefing pipeline**: importance lens → query planner → multi-provider fan-out (Perplexity + Tavily + Brave, 12s cap) → embedding dedupe + scoring (`text-embedding-3-small` + pgvector) → budget-constrained curation → script generation (gpt-4o) → audio synthesis (ElevenLabs)
- Every retained segment carries `lens_item_id`, `relevance_score`, `matched_profile_fact` - auditable relevance, not asserted relevance
- `briefing-diagnose` edge function: read-only "why these stories?" endpoint
- `briefing_interests` table - user-declared beats / entities / excludes (Settings → Interests tab + inline Add buttons)
- `industry_beat_library` table - 11 industries pre-seeded (creator economy, SaaS, healthcare, finance/fintech, consulting, e-commerce/retail, media/publishing, edtech, biotech, legal, generic) with 6-8 beats × 4-7 entities each
- `briefing_lens_feedback` table - persistent semantic negative feedback. Explicit Ban writes -1.0 delta immediately. Aggregator (`sp_aggregate_briefing_feedback` plpgsql + pg_cron at 03:07 UTC) promotes 3+ thumbs-down on same signature to -0.4 delta.
- `briefing_v2_enabled` per-user opt-in flag + `BRIEFING_V2_ENABLED_DEFAULT` env var
- pgvector + pgcrypto + pg_cron extensions enabled

### Changed
- `briefings` table extended: `schema_version`, `segments` JSONB, `context_snapshot` JSONB
- `briefing_feedback` extended with `lens_item_id`, `dwell_ms`, `replayed`
- Briefing card on dashboard hoisted `SeedBeatsPrompt` above the briefing, added Bookmark + Ban + "Anchored to:" chips inline (PR #88)

---

## [4.1] - 2026-03 - Mindmaker → CTRL Rebrand

### Changed
- Product renamed from **Mindmaker** to **CTRL: Clarity for Leaders** across all user-facing surfaces
- Production URL: `ctrl.themindmaker.ai`

---

## [4.0] - 2026-02 to 2026-03 - Memory Web, Context Export, Portable AI Double

### Added
- **Memory Web**: voice-first context extraction with encrypted storage (AES-256-GCM)
- **Context Export**: one-click export to ChatGPT, Claude, Gemini, Cursor, Claude Code, raw markdown
- **Guided First Experience**: 3-question onboarding delivering exportable context in 2 minutes
- **Pattern Detection**: 10X skills, blind spots, behavioral preferences from Memory Web
- **AI Tools Hub**: Decision Advisor, Meeting Prep, Prompt Coach, Stream of Consciousness
- **Edge** leadership amplifier: strengths sharpened, weaknesses covered with on-demand artifacts
- **Edge Pro** ($9/month at time of release; moved to $29/month on 2026-05-30): unlimited artifact generation + email delivery
- **Diagnostic Upgrade** ($49 one-time) + **Deep Context Upgrade** ($29) + **Bundle** ($69)
- 45+ edge functions (up from ~20), 30+ hooks
- Memory encryption (AES-256-GCM) end-to-end
- Google OAuth alongside email auth

---

## [3.0] - 2026-01 - V3 Complete Rebuild (Apple-like Executive Design)

### Changed
- Complete visual rebuild to match executive-grade Apple-like aesthetic
- Light mode design system (warm off-white #faf9f7, deep ink #0e1a2b, pure white cards)
- No-scroll mobile experience on all key authed pages
- Framer Motion animations throughout (spring physics: stiffness 400, damping 35)
- Mobile viewport handling via `--mobile-vh` CSS variable + safe-area insets

### Added
- OpenAI Whisper integration for voice transcription
- Vertex AI (Gemini 2.0 Flash) as primary LLM, OpenAI GPT-4o as fallback
- Bottom-sheet pattern for mobile overlays
- Floating voice FAB on dashboard
- Cognitive frameworks embedded in `ai-generate` prompts (A/B Framing, Dialectical, WOOP, Reflective Equilibrium, First Principles)

### Removed
- All toast notifications (replaced with inline UI feedback)
- V1 components and dual-architecture conditional rendering
- Quiz/gamification language and emojis from copy

---

## [2.x] - 2024 to early 2025 - AI Literacy Repositioning

### Changed
- Repositioned from "AI transformation" to "AI literacy for executive cognition"
- Surfaced tensions, risks, and scenarios as primary results UI (no longer hidden)
- Renamed "Prompt Library" to "Thinking Tools"
- Removed contact-collection form before results; collect via unlock form on results page
- Monotonic progress bar (never regresses)
- Mobile viewport-fit input screens (no scrolling during data input)

---

## [1.x] - 2024 - AI Leadership Benchmark (original)

### Initial release
- Quiz-based assessment
- AI Leadership Benchmark scoring
- Prompt library generation
- Voice assessment path added later in 2024
- Deep profile questionnaire
