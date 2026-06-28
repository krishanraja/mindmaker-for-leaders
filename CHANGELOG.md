# Changelog

All notable changes to this project. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) with phase-grouped entries.

For the full design narrative behind each phase, see [`project-documentation/HISTORY.md`](./project-documentation/HISTORY.md).

---

## [7.6] - 2026-06-28 - Phase 23: Unified Engine, Briefing, Decisions Lifecycle, Brain Improvements, Globe, Loading Alignment

### Added
- **"Build Your AI Chief of Staff" kit** (PRs #282-#283): a fifth lesson kit at `/kit` - the decision-engine kit. Output is a chief-of-staff setup for the leader. Includes a live path leaderboard (follow-up PR #283).
- **Globe loader** (PRs #285, #287): the Home news-loading skeleton is replaced by a rotating Earth `cobe` globe. Caption sits inside the globe; breathing effect; smooth fade in/out.
- **Self-recursive feedback** (PR #279): deck heart/skip reactions persist to the curation engine, gradually shifting the personalized Home pool.
- **Decision research flows** (PR #280): a completed decision surfaces actionable next-step research flows.
- **Unified brain accessor** (PR #275): one `BrainProfile` read from a single accessor; all Home/Briefing/Automator brain-read silos removed.
- **Curation engine** (PR #276): one transparent `CurationScore` governs both Home headlines and Briefing segments (shared pool floor; leader-specific queries ceiling).
- **Profile-aware Home feed** (PR #277): Home reads from the one engine + one brain accessor (gated off by default via feature flag).
- **Briefing convergence** (PR #278): Briefing reads from the one brain via a unified gate (flag-gated, default off).
- **Decommission silos** (PR #281): one unified brain-inputs view replaces the previously siloed input tabs.
- **Decisions Now/History toggle in mobile top nav** (PR #286): toggle moved from the decision content area into the mobile top bar.
- **Loading + Home/Briefing/Tune alignment** (PR #293, LIVE): `GlobeLoader` rotates `src/components/system/loadingLines.ts` (evergreen AI-fluency one-liners + 3 durable trend lines + leader's last-loaded real headlines, cached via `cacheHeadlines`), cross-faded (single static line under reduced-motion). `useNewsPreferences` converted to a module-level shared store (`useSyncExternalStore`) so a `NewsPreferencesSheet` save propagates immediately to `useCockpit`. New `rankPersonalized` in `src/lib/newsPriority.ts` re-ranks the server pool by lifting chosen lanes on the server's POSITION (never re-sorting by generic score, which would undo personalization). Briefing now merges today's `live_headlines_cache` candidates into the provider fan-out behind `BRIEFING_SOURCE_SHARED_POOL`. `generate-briefing` redeployed (v72). Flags flipped ON: `BRIEFING_V2_ENABLED_DEFAULT=true`, `BRIEFING_USE_BRAIN_PROFILE=true`, `BRIEFING_SOURCE_SHARED_POOL=true`.

### Changed
- **Briefing: dead-simple, Play-first** (PRs #270-#271): rebuilt as a single-tap, no-scroll, zero-jargon surface. One tap plays the briefing. Audio plays reliably on all devices.
- **Decisions: one tab for the whole lifecycle** (PRs #272-#273): pin -> enrich -> resolve -> history is one unified tab; no separate History/Checked silos.
- **Decisions shelf + Memory header declutter** (PR #284): Decisions shelf calmer; Memory Center header no longer cramped on mobile.
- **UI cluster polish** (PR #274): per-tab navbar refinement, decision-tab flicker fix, audio-player clearance.
- **Brain graph: fade in + two-step tap + bigger targets + neighbour tappability** (PRs #290-#292): graph fades in on load; mobile tap is two-step (first = peek, second = open bond reader); peek node has a larger tap target; neighbour nodes remain tappable while a node is peeked.

### Fixed
- **Black-screen-of-death from stale-chunk reload guard** (PR #288): bounded one-shot counter prevents the guard from double-firing on a new deploy.
- **Landing auth flash** (PR #289): authenticated users no longer see a ghost marketing hero flash before redirect.

---

## [7.5] - 2026-06-22 - Phase 22: Backend Resilience Standardization

### Changed
- **All external API calls bounded** (PRs #265-#267): every external call in edge functions now routes through `_shared/with-timeout.ts` or `AbortSignal.timeout`. The briefing OpenAI calls, v2 pipeline, and Artificial Analysis fetchers are all bounded.
- **Structured logging standardized**: new code uses `_shared/logger.ts` (`createLogger(fn)`) over raw `console.*`.

---

## [7.4] - 2026-06-22 - Phase 21: Plain Language + Fewer Doors

### Changed
- **Vocabulary cleanup** (PRs #261-#264): UI copy renamed (internal identifiers unchanged): bond -> connection, calibration -> track record, deliverable -> "something you do over and over", pressure test -> weigh/check, Beats -> Topics.
- **`AiTermHint`** (`src/components/system/AiTermHint.tsx`): popover for genuine AI/industry terms only (orchestration, agents, inference). News-category `meaning` in `newsCategory.ts` is the single source of truth, surfaced on card chips via `AiTermHint`. Never used for app vocabulary.
- **Fewer doors**: every entry screen leads with ONE primary action; extras sit behind a quiet disclosure or "More". Automator Step 1 cleaned up. Settings collapsed from 8 tabs to 4 groups (You / Briefing / Privacy & data / Account).

---

## [7.3] - 2026-06-22 - Phase 20: CTRL 2028 Radical-Focus Refactor

Live-verified on the real authed prod app; 8/8 QA gates pass.

### Added
- **`HomeFeed.tsx` + `DesktopHomeView.tsx`** (PR #237): replace BOTH the mobile cockpit home AND the legacy desktop `DesktopMemoryDashboard`. ONE unified model: browsable headlines (mobile swipe-feed / desktop rail) + the 3 doors. Empty-Home bug fixed via `coldDeck.ts` (generic AI-native headlines, never empty). New loading primitive `src/components/system/SkeletonCard.tsx` (+ `SkeletonBar` / `LoadingCaption`).
- **`DecisionBoard`, `DecisionCapture`, `DecisionOrb`, `DecisionRunning`, `DecisionResultView`** (PR #241): one calm board + ONE fast-capture input (mic embedded). Explainer wall, Record button, chips, floating FAB killed. Running state is a branded orb + 4-step pipeline wired to the real `useDecisionEngine` stages.
- **`BrainGraph.tsx` + `BrainCanvas.tsx` + `brainGraphModel.ts`** (PR #240): graph centered at every size (hub-anchored, half-extents per axis, aspect-corrected via ResizeObserver, `preserveAspectRatio=xMidYMid meet`). Mobile: tapped-node bond reader (`BondReader`) is a bottom DRAWER over the full canvas; old inline `max-h-[44%]` panel removed. Desktop: slide-in right rail.
- **`BrandedAppLoader.tsx`** (PR #238): replaces raw spinners in Suspense, `RequireAuth`, and `InitializationLoader`. `resolveDisplayName` in `cockpitGreeting.ts` replaces raw email-id greeting.
- **`TrackRecord` (You tab)** (PR #239): 0/0/0 scoreboards gone. Cold = promise, warm = honest first pattern (never a deflating 0/N), rich = earned calibration record. All from real data.

### Changed
- **`DesktopShell` primary nav** (PR #238): 4 tabs (Home / Decisions / Brain / You) matching mobile `BottomNav`; rest demoted to More/Account. `BottomNav` flag-gated: `cockpitNav` (4-tab) when `VITE_COCKPIT_ENABLED=true`, `legacyNav` (6-tab) when off.
- **`CockpitHome`, `CockpitStreamRow`, `CockpitDeck` deleted** (PR #237): replaced by `HomeFeed`.

### Fixed
- **Empty Home bug**: `coldDeck.ts` floor means Home is never blank before the first briefing generates.
- **Brain graph upper-left clustering**: hub-anchored centering + aspect-correction on every resize.

### Verified counts at end of phase
- 8/8 QA gates pass on real authed prod surface (QA account `ctrl-qa-1782077550632@example.com`).

---

## [7.2] - 2026-06-21 - Phase 19: CTRL System Coherence Campaign

### Added
- **`PageTransition.tsx`** (desktop, PR #230): cross-fades only content keyed by pathname; chrome is persistent.
- **`MobilePageTransition.tsx`** (PR #232): same cross-fade for mobile.
- **`MobileFrame.tsx`** (PR #232): shared mobile shell (persistent `AppHeader` + bounded no-scroll `<main>` + pinned `BottomNav`), applied to DecisionPage / Compliance / BriefingPage / ContextExport / Goals / TrackRecord / MemoryCenter / DecisionMap / EnrichPage / CockpitView.
- **New components**: `CockpitHero`, `CockpitStreamRow`, `cockpitGreeting.ts`.

### Changed
- **Home rebuilt as "one adaptive thing"** (PR #228): `CockpitView` is ONE composed grid (header / hero / nav). `CockpitHome` shows ONE hero + a small secondary peek + an in-place "rest of what I'm tracking" reveal + a quiet briefing/weigh/build rail. **The old `CockpitDeck` swipe deck was deleted.** Heart/skip reactions preserved on the hero.
- **Chief-of-staff voice across tabs** (PR #229): every tab retitled to the advisory first-person voice. Copy only; legal/honesty text untouched.
- **Desktop sidebar active-nav glow** (PR #230): shared `layoutId` matches mobile `BottomNav`.
- **Design-token unification** (PR #231): hardcoded hex moved onto `ctrl-ds` tokens (exact literals kept as CSS fallbacks); one radius / one padding / one `hover:bg-secondary/50` scale.

---

## [7.1] - 2026-06-20 - Phase 18: Main App Polish + AI-Native Enforcement

### Added
- **Decision Stage 0: AI-native reframe** (PR #216): `decision-engine` runs a reframe stage before decompose. Additive `decision_cases` columns: `reframed`, `reframed_statement`, `reframe_note`, `lifecycle_stage` (original `statement` always kept). A banner surfaces the reframe.
- **9 AI-native news category motifs** (PR #215): branded SVG motifs per category (`CategoryMotif`, `src/types/newsCategory.ts`). IDs: model / economics / tools / orchestration / product / governance / security / org / proof. `NewsHeadlineCard` rebuilt. `generate-briefing` AI-native-filters + category-tags every story.
- **Brain canvas squash fix** (PR #217): aspect-aware viewBox + fractional world positions + visible zoom controls (minScale 0.5) + rail-only-on-select. Replaces the hardcoded `760x520` landscape viewBox that letterboxed into portrait containers.

### Changed
- **No-scroll one-ask sweep** (PRs #218-#222): every main surface is no-scroll on all devices + one ask per screen. Presumptuous copy rewritten warm + first-timer-friendly + AI-native.
- **Briefing interests** updated to the 9 AI-native categories (replaces free-text beats/entities/excludes from Phase 6).

---

## [7.0] - 2026-06-19 - Phase 17: Kit Redesign - All 4 Kits Live

All 4 kits fully redesigned, implemented, and live-verified on prod. Canonical: `docs/KIT-REDESIGN-SPEC.md`.

### Added
- **`KitRevealWizard`**: reveal -> what's-inside -> voice -> keep-it -> plan -> ship. Replaces the old `KitHome` reveal-scroll.
- **`KitBuildTrace`**: honest build trace driven by real `kit_builds.artifact_statuses`, no faked latency.
- **`KitWhatsInside`**: two buttons only (Download / Copy) per artifact; no walls of text on screen.
- **Hero PDF per kit** (print-styled `/kit/pdf`, `src/lib/kitPdf.ts` + `src/pages/kit/KitPdf.tsx`): platform-agnostic content; instructions name the user's chosen tool.
- **`kitPrimitives.tsx`**: shared brand primitives for the kit surfaces.
- **`kit-compose` redeployed** so presets and frontend align.

### Changed
- **All 4 kits**: strictly sequential (one action per screen), no-scroll on mobile, native two-pane on desktop with a live "your kit is taking shape" panel, honest build trace, reveal wizard, one branded hero PDF.
- **Old `KitHome` reveal-scroll + `HomeworkCard` retired**.

---

## [6.4] - 2026-06-17 - Phase 16: Skill Builder Intake + Harness Upgrade

### Added
- **`extract-voice-profile` edge function**: paste real writing -> derive 8 voice dimensions in one LLM pass. Anonymous-session safe; raw text is not stored.
- **`VoiceStyleProfileSheet`**: 5 recognition picks OR the paste-extract power path.
- **Unified `ctrl_voice_profile` fact** (`user_memory` `fact_category` 'preference', `fact_subtype` 'communication_style'). New files: `src/hooks/useVoiceProfile.ts`, `src/types/voiceProfile.ts`, `src/components/kit/KitVoiceProfileCard.tsx`, `src/lib/automatablePain.ts`.
- **`AutomatorScaffold.tsx`**: desktop two-pane "your skill is taking shape" builder (max-w-4xl; mobile unchanged).
- **Layered skill output**: `mcp-context` gained `list_skills` + `get_skill` (Edge Pro gated); `LibraryTab` gained "Connect these to your agent" MCP banner + per-item Download(.md). Three output destinations live: library + MCP + download.

### Changed
- **Skill Builder is FREE for now**: the Edge Pro gate on `generate-skill-export` removed. Any authenticated user (including anonymous kit sessions) can build skills. Deleted `AutomatorTierBanner`, `useSkillBuildAccess`, `constants/skillTier.ts`, `_shared/skill-tier.ts`.
- **`generate-skill-export` prompt tightened**: boundedness check, four Honest Tests (Test 4 = voice-lock), VOICE_PROFILE injection, ban on fabricated voice samples, structured 8-dimension `voice-profile.md`, required `## Learning loop` section. Quality gate now 16/16.
- **Automator tone step is voice-aware**: cold pick writes the profile (`toneToVoiceProfile`); returning leader gets "still sound like you?" confirmation; paste-extract affordance opens sheet in paste mode.
- **Voice save enum bug fixed**: `verification_status: 'confirmed'` (invalid, silently 400-ing) -> `'verified'`.

---

## [6.3] - 2026-06-17 - Phase 15: Home / Decision Map / Automator UX Redesign

All four PRs merged to main and prod-verified by screenshot on `ctrl.themindmaker.ai`.

### Added
- **`CockpitDeck.tsx`**: swipeable "worth a look" deck (AI news + own signals; swipe heart = more-like-this, skip = dismiss; peeking stack + dots).
- **`BrandLockup.tsx`**: Mindmaker icon + `ctrl-logo.png` wordmark. Used in mobile `AppHeader`, `DesktopShell` rail, memory-web `DesktopSidebar`, legacy `Sidebar`. Replaced the generated "ctrl." text.
- **Automator components** (PR #199): `src/components/automator/{AutomatorFlow, AutomatorSuggestions, AutomatorCascade, AutomatorSkillReady, automatorModel}` + `src/hooks/useSkillSuggestions.ts`. Three screens: Suggestions (brain-mined recurring deliverables) -> Cascade (~5-step pick-cascade) -> Skill ready (Run it now + Export + library peek).
- **`DeckCard` / `DeckCardKind` types** + `deck` field on `CockpitData`.

### Changed
- **Home rebuilt** (PR #197): removed cryptic "strongest signal" hero and AI-bets wall. Time-aware greeting + "worth a look" deck + 3 value actions (Play my briefing / Run a decision / Build a skill). Bets moved to Decisions.
- **Decision Map rebuilt** (PR #198): ONE pinned decision hero (descriptive status, never a recommendation) + connector rail of considerations. `ContestLongPress` scroll-popup killed; replaced by "Flag it" inside opened stone + footer.
- **`/context` default is now the Automator** (PR #199). Old `SkillCaptureSheet` / `SkillPreviewSheet` are dead code.
- **Deck trains the feed** (PR #200): swipe writes `deck_reaction` JSON row to `feedback` table; `useCockpit` down-weights disliked news categories.

---

## [6.2] - 2026-06-17 - Phase 14: Kit Program - Agentic Org Chart + Parity + Bug Fix

### Added
- **Agentic Org Chart kit** (PRs #190-#191): tasks tagged green (AI runs it) / amber (AI assists, you approve) / red (you only). With the autonomy line drawn and a ranked place to start.
- **Honesty floor on composed org chart** (PR #193): a box touching a flagged guardrail can never be left agent-led. Hard constraint in the compose step.

### Changed
- **Parity retrofit** (PR #192): all three pre-existing kits updated to the fork + pick-cascade + live picks-board model.

### Fixed
- **CRITICAL cascade bug** (PR #193): the forked-kit intake silently dropped the back half of every kit's cascade since launch. A stale closure over `steps.length` in `goNext` stopped the advance early. Fixed by reading live refs. **All `kit_builds.intake` rows written before PR #193 are TRUNCATED and untrustworthy.**

---

## [6.1] - 2026-06-16 - Phase 13: Brain Engine + Limits Edge-Graph

### Added
- **Fact-to-fact edge graph**: facts connected by edges, rendered as the four-world rope canvas. Evidence tiers and track-record depth per fact.
- **`Strengthen` / `Fix` RPCs**: backend RPCs exist but canvas actions are UI-disabled (no backend RPC wired yet - buttons are present but inert).
- **Migrations**: `20260615*_brain_*` and `20260616120000_memory_edges`.

### Honest residuals
- Brain edges are derived-not-stored (computed at read time; not persisted as first-class rows).
- Number-heroes fall back to words-led when current data is thin.

---

## [6.0] - 2026-06-16 - Phase 12: Forced-Dark Instrument Cockpit

**Major visual overhaul. The light-mode design system is fully retired.**

### Changed
- **Globally forced dark**: `index.html` ships `class="dark"`; no light mode.
- **`ctrl-ds` instrument palette**: emerald `#00D9B6` as primary (`--primary 171 100% 43%`).
- **Emerald `ctrl.` wordmark**: replaces the old green Mindmaker logo everywhere.
- **Rebuilt surfaces**: mobile cockpit, decision spine, StoneRead, brain four-world rope canvas, capture, onboarding. Prod-verified by screenshot.

### Residuals
- `index.html` OG/theme-color meta tags, `tokens.css` `--mint` alias, `EdgeOnboarding`, `SampleResultsDialog` still carry residual green (tracked, not asserted as resolved).

---

## [5.5] - 2026-06-10 - Phase 11: Kit Engine Portal

### Added
- **5 new edge functions**: `kit-redeem`, `kit-compose`, `kit-capsule-ingest`, `send-kit-pack`, `send-kit-nudges`. Total: 85.
- **6 new tables**: `kit_codes`, `kit_redemptions`, `kit_builds`, `kit_artifacts`, `kit_journey_events`, `kit_nudges`. All RLS owner-scoped.
- **3 new hooks**: `useKitRedemption`, `useKitBuild`, `useKitArtifacts`. Total: 62.
- **4 new public routes**: `/kit`, `/kit/me`, `/kit/me/intake`, `/kit/reading/:pageId`.
- **1 shared preset module**: `_shared/kit-presets/` (initial presets: `vibe-coding`, `autonomous-business`).
- **1 pg_cron job**: `kit-nudges-email` (7-day post-build nudge email).
- **4 new migrations**. Total: 114.

### Architecture
- Anon-first identity: `ensureAnonSession` + `upgradeAnonymousSession` (anonymous account upgrades in-place at email capture; same `auth.uid()` throughout).
- Artifact ZIPs stored inline as base64 on `kit_artifacts.zip_base64` (no Storage bucket; avoids Management-API-inaccessible Storage RLS).
- Background compose via `EdgeRuntime.waitUntil`; `kit_builds` row is the progress UX (client polls `artifact_statuses`).
- Atomic `redeem_kit_code` + `consume_kit_skill` RPCs (`SECURITY DEFINER`, no anon execute grant).

### Verified
- End-to-end on prod against both initial presets: redeem, intake, real-LLM compose, ZIP download, journey, ship.

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
