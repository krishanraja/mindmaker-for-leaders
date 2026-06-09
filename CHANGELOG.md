# Changelog

All notable changes to this project. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) with phase-grouped entries.

For the full design narrative behind each phase, see [`project-documentation/HISTORY.md`](./project-documentation/HISTORY.md).

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
