# Architecture

Complete system architecture and data flow documentation.

**Last reconciled:** 2026-08-02 (full reconciliation pass; closes out the 2026-06-16 through 2026-06-21 banner debt into body prose and adds everything shipped 2026-06-22 through 2026-08-01).

> **Positioning (LOCKED 2026-06-19)**: CTRL is the tool for building, orchestrating, productizing, and getting to market **the AI-native version of your business**, not a general business advisor. General-business inputs are reframed into the AI-native lens. The canonical product/build specs are `docs/MAIN-APP-POLISH-SPEC.md` (the main app), `docs/KIT-REDESIGN-SPEC.md` (the lesson kits), `docs/CTRL-SYSTEM-SPEC.md` (the 2028 design language + the onboarding/decisions/engagement loop), `docs/CURATION-SYSTEM-SPEC.md` (Home/Tune/Briefing), and `project-documentation/NORTH_STAR.md` (the flywheel metric); trust those + the root `README.md` + `CLAUDE.md` over this doc where they disagree.

> **North Star (2026-07-04, PR #330, founder-signed):** the single product-health number is **"flywheel leaders"** - a leader who holds a real brain (>=5 current `user_memory` facts) AND weighed a decision in the last 7 days, instrumented by migration `20260704120000_north_star_flywheel.sql`. Canonical: `project-documentation/NORTH_STAR.md`.

> **Curation system (2026-06-28, PRs #287, #293-296; LIVE)**: the Home news feed, the Tune controls, the role/business scoring, the loading globe, and the audio Briefing are ONE system over ONE brain. Canonical, crystal-clear methodology + architecture: **`docs/CURATION-SYSTEM-SPEC.md`** (read it before any Home-feed / Tune / briefing-curation work). Headline mechanics: a chosen Tune lane DOMINATES the feed (`newsPriority.ts` `BOOST_BLOCK`, uncapped) ordered by role-archetype + industry fit (`roleArchetype.ts`, inferred from facts already held, no new questions), with a guaranteed on-topic floor of 3 (`laneReserve.ts`); Tune applies live through a single shared picker (`NewsPreferencesPanel`, used by both Home's drawer and Settings -> Interests, 2026-07-04 settings audit); and the Briefing draws from the same `live_headlines_cache` pool + carries the tuning into its lens.

> **Brand + redesign (2026-06-16, PR #186 merge 1c01db5)**: CTRL is **globally forced dark** (`index.html` ships `class="dark"`), on the `ctrl-ds` instrument palette with emerald `#00D9B6` as primary (`--primary 171 100% 43%`), and the emerald `ctrl.` wordmark replacing the old green Mindmaker logo everywhere. See the **Redesign** section below.

> **Brain engine (PRs #153-164; "limits" phases #187-189; graph rebuilt PR #240; correction loop + Strengthen/Fix went LIVE PR #321)**: fact-to-fact edge graph, reliable reaction numbers, evidence tiers, track-record depth, and (since 2026-07-03) a real correction loop and live Strengthen/Fix RPCs wired end-to-end. Migrations `20260615*_brain_*`, `20260616120000_memory_edges`, `20260703090000`. See the **Brain Engine** section below.

> **Kit program (5 presets at `/kit` as of 2026-08-02; 4 documented through 2026-06-17)**: Agentic Org Chart kit (PRs #190/#191); parity retrofit of all 3 existing kits to fork + pick-cascade + live picks-board (#192); PR #193 (merge 090dda2, 2026-06-17) fixed a latent cascade bug that silently dropped the back half of every kit's intake since launch, plus added an honesty floor to the composed org chart. **Pre-#193 `kit_builds.intake` rows are TRUNCATED and untrustworthy.** A 5th preset, `chief-of-staff`, exists in the codebase but was not documented in any earlier version of this file - see the **Kit Engine** section below.

> **UX redesign (2026-06-17, PRs #197-200), superseded 2026-06-22 by the "radical focus" refactor (PRs #234-241) and the onboarding/decisions/engagement loop (PR #298, 2026-06-29)**: the mobile cockpit Home, the Decision Map, and the Automator (Skill Builder entry) were rebuilt in June, and a `BrandLockup` replaced the generated `ctrl.` text. Home itself has since moved twice more: the swipeable `CockpitDeck` from PR #197 was deleted and replaced by the browsable `HomeFeed`/`DesktopHomeView` stream (PR #237), and the `VITE_COCKPIT_ENABLED` flag plus the legacy `Mobile/DesktopMemoryDashboard` and the voice `OnboardingInterview` were deleted entirely (PR #298) in favour of ONE state-adaptive cockpit. See the **UX Redesign** section below, which now documents the CURRENT model, not just the June snapshot.

> **Decisions tab rebuilt as a "radial force spider" (PRs #308-320, late June/early July 2026)**: `/decision` (weighing a decision) is a fully rebuilt UI (`DecisionCapture` / `DecisionOrb` / `DecisionBoard` / `DecisionSpider` / `DecisionResultView`) over the same `decision-engine` pipeline, now with a reframe-consistency + output-sanitization + CI eval gate (PR #328), a decision memo, a persisted checklist with email delivery, and an honest resolve/closure flow (PR #321 and later). See the new **Decision Engine** section below - this did not exist in the prior reconciliation pass.

> **Settings / one-door dedup (2026-07-04)**: `NewsPreferencesPanel` is now the single shared picker for feed/briefing tuning, used by both Home's drawer and Settings -> Interests (previously two separate tables/UIs). Track-record "Active decision" cards now have real Open/Strengthen/Archive actions. New shared UI primitives in `src/components/system/surface.tsx`.

> **Billing (PRs #326/#331, 2026-07-04)**: Edge Pro is $49/month, single source of truth `supabase/functions/_shared/edge-pricing.ts` (`EDGE_PRO_UNIT_AMOUNT_CENTS = 4900`). `/upgrade` (`src/pages/Pricing.tsx`) is the interactive in-app checkout page; `/pricing` is a separate static SEO page (`public/pricing.html`) that `vercel.json` rewrites to, kept in sync manually.

> **Verified counts (2026-08-02, counted directly from the filesystem, not estimated)**: 104 edge functions (excluding `_shared/`), 78 hooks, 148 migrations, 8 e2e specs, 29 Vitest unit/shared spec files, pgvector + pgcrypto + pg_cron extensions enabled.

---

## System Overview

**Stack**:
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI Primary**: Vertex AI (Gemini 2.0 Flash) via Google Cloud service account
- **AI Fallback**: OpenAI GPT-4o
- **Voice**: OpenAI Whisper API for voice-to-text
- **Payments**: Stripe
- **Email**: Resend
- **Hosting**: Vercel (frontend), Supabase Cloud (backend)

**Architecture Type**: Serverless full-stack with edge functions

---

## Redesign (2026-06-16, PR #186 merge 1c01db5)

The current visual system. Shipped live and prod-verified with screenshots.

**Brand + theme:**
- **Globally forced dark.** `index.html` ships `class="dark"` on the root; there is no light mode. Any reference in older docs to light mode, warm off-white backgrounds, or pure-white cards is wrong and has been corrected.
- **`ctrl-ds` instrument palette.** A dark instrument-panel design system. Emerald is the accent: `--primary 171 100% 43%` (`#00D9B6`).
- **The emerald `ctrl.` wordmark** replaces the old green Mindmaker logo everywhere (sidebar, landing, kit portal, etc.). `CtrlLogo.tsx` renders it.

**Surfaces rebuilt in the redesign:**
- **Mobile cockpit** - the primary mobile authed surface, rebuilt on the dark instrument palette.
- **Decision spine** - the decision flow rebuilt as a vertical "spine".
- **StoneRead** - the full-screen reading surface.
- **Brain four-world rope canvas** - the brain visualization (see Brain Engine section), rendered as a rope canvas across four "worlds".
- **Capture** - the capture flow.
- **Onboarding** - the first-run experience.

**Honest residual green (not yet fully purged):** `index.html` OG / `theme-color` meta tags, the `--mint` token alias in `tokens.css`, and `EdgeOnboarding` / `SampleResultsDialog` still carry residual green. These are known and tracked, not asserted as resolved.

> **Backstory (so the trust breach is on record):** the redesign was at one earlier point falsely claimed "live" while the app was still serving the old UI, and the cause was deflected onto the user's browser cache. That was a trust breach. PR #186 is the real ship: prod screenshots of the actual surfaces, not a claim. "Live" means a prod screenshot of `ctrl.themindmaker.ai`, never "it should be deployed", and "it's still old" is taken as ground truth.

---

## UX Redesign (2026-06-17, PRs #197-200; Home subsection superseded by the current model documented first below)

The latest layer on top of the PR #186 redesign at the time it shipped. Home, the Decision Map, and the Automator (the Skill Builder entry on `/context`) were rebuilt, plus a shared brand mark. All merged to main and prod-verified on `ctrl.themindmaker.ai`. **Home has moved twice more since**; the current model is described first, then the June 2026 snapshot is kept for historical continuity.

### Current Home model (2026-08-02; supersedes "Cockpit Home" below)

`src/pages/Dashboard.tsx` renders exactly one Home per device - no flag, no fork. Mobile renders `CockpitView` (`src/components/cockpit/CockpitView.tsx`); desktop renders `DesktopHomeView.tsx`; `?view=edge` still renders the Edge leadership amplifier on the same shell.

- **Lifecycle-adaptive posture:** `useCockpit` derives `userState` (new/dormant/active/power, 14-day dormancy window) -> `posture` (`guide` for new/dormant/no-live-decision, `partner` for active leaders) on `CockpitData`.
- **The feed:** `HomeFeed.tsx` (mobile) / `DesktopHomeView.tsx` (desktop) render a browsable headline stream - `CockpitHero.tsx` for the top card, a stream row / rail for the rest, own-signal `decision_alerts` woven in (deduped one-per-decision), a bundled `coldDeck.ts` guaranteeing Home is never empty, structural "shift" cards (`TrendCard.tsx`), and a tap-to-read sheet (`CardReadSheet.tsx`) for an LLM-personalized read. The earlier swipeable `CockpitDeck.tsx` (described below) was deleted.
- **Onboarding is inline, not a gate:** `InlineProfileSetup` (`src/components/cockpit/onboarding/InlineProfileSetup.tsx`, `useInlineProfile.ts`) captures industry/role to `user_memory` + interests via `SeedBeatsPrompt`, rendered inside `HomeFeed` for NEW leaders. The old `OnboardingInterview` voice flow and its `onboarding/steps/*` were deleted; `GuidedFirstExperience.tsx` no longer exists in the repo.
- **Kickstart:** in the `guide` posture, Home leads with `KickstartCard.tsx`, a role-tailored starter decision (`src/lib/starterDecisions.ts`) routed to `/decision` pre-filled.
- **Re-engagement:** `supabase/functions/send-reactivation-nudge` (daily `pg_cron`, 13:00 UTC) emails NEW/DORMANT leaders, de-duped via `leader_notification_prefs.reactivation_nudge_sent_at` (30-day re-arm).
- `useCockpit.recordDeckReaction` survives from the deck era and is now called from the hero card; the curation system (`docs/CURATION-SYSTEM-SPEC.md`) is the current, more developed version of "the feed learns from you."

Canonical: `docs/CTRL-SYSTEM-SPEC.md` sections 6 and 8.

### Cockpit Home (PR #197, merge 7b5f0ef) - HISTORICAL SNAPSHOT, superseded above

The mobile cockpit Home, at the time behind `VITE_COCKPIT_ENABLED` (flag since deleted). `CockpitHome.tsx` (since deleted) was rewritten at the time.

- **Removed at the time:** the cryptic "strongest signal" hero and the wall of identical AI-bets. Bets moved off Home.
- **Added at the time (later itself replaced):** a time-aware greeting (still true today) + a swipeable **"worth a look" deck** (`src/components/cockpit/CockpitDeck.tsx`, since DELETED and replaced by the `HomeFeed`/`DesktopHomeView` stream above) + 3 value actions (still true today: Play my briefing to `/briefing`, Run a decision to `/decision`, Build a skill to `/context`).
- **The deck** mixed broad AI news (from the briefing pipeline's curated `briefings.segments`) and the leader's own signals (`decision_alerts` via `useDecisionInbox`). Swipe heart = more-like-this, skip = dismiss; it rendered a peeking stack + dots.
- **`useCockpit` (`src/hooks/useCockpit.ts`)** still returns `recordDeckReaction`, now called from the hero card rather than a swipe deck.
- **Types (`src/types/cockpit.ts`):** the `DeckCard` / `DeckCardKind` types persist and are reused by the current `HomeFeed` model.

### Brand lockup (PR #197; desktop placements PR #200, merge 387af84)

`src/components/landing/BrandLockup.tsx` is the Mindmaker icon (`mindmaker-icon.png`) + the `ctrl-logo.png` wordmark, replacing the generated `ctrl.` text. Used in the mobile `AppHeader` and `DesktopShell`'s primary rail. `memory-web/DesktopSidebar.tsx` and the legacy `dashboard/desktop/Sidebar.tsx` also carry the lockup but are themselves dead code as of 2026-08-02 - neither is imported by any live page (verified by grep); `DesktopShell`'s own rail (`src/components/layout/DesktopShell.tsx`) is what actually renders on desktop today. See the **Navigation** subsection under Routing below.

### Decision Map (PR #198, merge 33fb818)

`src/pages/DecisionMap.tsx` was rebuilt:

- **ONE pinned decision hero** - star eyebrow + statement + a DESCRIPTIVE status derived from the consideration tally (never a recommendation) + a "Change" affordance.
- **Considerations hang off a connector RAIL**; evidence is one tap deeper (reuses `StoneRead` / `StoneDeeper`).
- **The long-press contest scroll-popup (`ContestLongPress`) was killed** in favour of a quiet "Flag it" in the opened stone + footer, using `useContestActions.openContest`.
- **Empty state:** role/sector-seeded starter decisions (from `user_memory` identity/role), one tap to Decide prefilled. The prefill is threaded `DecisionPage` to `PressureTestPanel` via an `initialStatement` prop.

### Automator (Skill Builder entry, PR #199, merge 24f7d15)

The Automator is now the **default flow on `/context`** (`ContextExport` modified). New components `src/components/automator/{AutomatorFlow,AutomatorSuggestions,AutomatorCascade,AutomatorSkillReady,automatorModel}.tsx/ts` and a new hook `src/hooks/useSkillSuggestions.ts`. Flow:

1. **SUGGESTIONS** - concrete recurring DELIVERABLES mined from the brain (`user_memory` blockers + decisions) with a "why we picked this" + a "pulled from your brain" badge; role/sector curated fallback; inline "Something else" input (NOT `window.prompt`).
2. **CASCADE** - a ~5-step all-recognition pick-cascade reusing the kit cascade pattern; the voice step shows real samples to PICK.
3. **SKILL READY** - "Built your way" chips + Run it now + Export markdown + a "Your skills" library peek.

`automatorModel.composeTranscript` maps the picks into a transcript for the `generate-skill-export` edge function. The old `SkillCaptureSheet` / `SkillPreviewSheet` are now unimported **dead code**.

> **Intake + harness upgrade (PR #204): see the "Skill Builder + Voice Profile Upgrade" section below.** The Skill Builder is now FREE for now (the Edge Pro gate on `generate-skill-export` was removed; any authenticated user, including anonymous kit sessions, can build skills). `generate-skill-export`'s prompt is no longer untouched: it now checks boundedness, runs the FOUR Honest Tests, injects a self-identified VOICE_PROFILE, forbids fabricated voice samples, renders a structured 8-dimension `voice-profile.md`, and requires a `## Learning loop` section (quality gate now 16/16). A unified `ctrl_voice_profile` fact in `user_memory` is captured by `VoiceStyleProfileSheet`, derivable from pasted writing via the new `extract-voice-profile` edge fn, and surfaced into generated skills by `_shared/memory-context-builder.ts`. The Automator tone step is voice-aware and `AutomatorScaffold` adds a desktop two-pane builder; `mcp-context` gained `list_skills` + `get_skill`.

### Deck persistence + feed-training (PR #200, merge 387af84) - mechanism survives, UI does not

A swipe wrote a `deck_reaction` JSON row to the existing `feedback` table (`page_context` 'cockpit-deck', no new migration). `useCockpit` still reads 30 days of dislikes and down-weights those news categories, now triggered from the hero card rather than a swipe deck; the much more developed version of "the feed learns from you" is the curation system (`docs/CURATION-SYSTEM-SPEC.md`: Tune lanes, role fit, guaranteed floor).

**Honest residuals:** the old `SkillCaptureSheet` / `SkillPreviewSheet` are dead code; "Run it now" downloads the skill (no in-app skill-runner yet); Home no longer depends on a briefing existing for content (`coldDeck.ts` guarantees a non-empty feed).

---

## Brain Engine (PRs #153-164; "limits" phases #187-189; graph rebuilt PR #240; correction loop + live Strengthen/Fix PR #321)

The Brain is CTRL's memory-as-a-graph layer: the leader's facts connected to each other, with reaction signals, evidence tiers, and a track record.

**What shipped:**
- **Fact-to-fact edge graph.** Facts are connected by edges. Rendered by `BrainGraph.tsx` + `BrainCanvas.tsx` (`brainGraphModel.ts` `computeViewBox`: hub-anchored, half-extents per axis, aspect-corrected to the live canvas ratio every render via `ResizeObserver`, `preserveAspectRatio=xMidYMid meet` - PR #240 fixed the earlier upper-left-clustering squash from a hardcoded landscape viewBox).
- **Strengthen / Fix RPCs are LIVE end-to-end (PR #321, 2026-07-03).** `strengthen_memory_fact` and `fix_memory_fact` are real backend RPCs, wired through `BondReader.tsx`'s `onStrengthen`/`onFix` props from `MemoryCenter.tsx`. These were UI-disabled buttons before PR #321.
- **Real correction loop (PR #321).** `verify_memory_fact` / `fix_memory_fact` log `user_corrected` / `user_rejected` / `user_disputed` events to `memory_events` with the prior value (migration `20260703090000`). `extract-user-context` (v45) is correction-aware via `_shared/correction-guard.ts`: corrections ride the extraction prompt, and a deterministic damping pass drops re-extraction of a ruled-out value (also fixed a bug where a rejected fact could re-insert because `is_current=false` left it in the dedup set).
- **`memory-edges-derive` now has a caller.** Previously a dormant edge function, it now fires after each successful capture in `useMemoryWeb.submitInput`.
- **Reliable reaction numbers.** Reaction counts on facts are now computed reliably (the "limits" phases hardened the numbers).
- **Evidence tiers.** Facts carry an evidence tier.
- **Track-record depth.** The brain shows the track record behind a fact over time.

**Migrations:** `20260615*_brain_*`, `20260616120000_memory_edges`, `20260703090000` (correction events).

**Honest gaps (disclose, never hide):**
- **Brain edges are derived, not stored.** The edge graph is computed at read time, not persisted as rows.
- **Number-heroes fall back to words-led on thin current data.** When a leader does not yet have enough current data for a numeric hero stat, the UI falls back to a words-led presentation rather than showing a misleading number.

---

## Frontend Architecture

### Directory Structure

> **This tree was substantially corrected on 2026-08-02.** Several directories/files described in earlier versions of this doc as current (`memory-web/MobileMemoryDashboard.tsx`, `memory-web/DesktopMemoryDashboard.tsx`, `memory-web/GuidedFirstExperience.tsx`, `cockpit/CockpitHome.tsx`, `cockpit/CockpitDeck.tsx`, `memory-web/SkillExportCard.tsx`, `memory-web/GettingSmarterBanner.tsx`, `memory-web/MemoryHealthViz.tsx`/`CategoryChart.tsx`/`IntelligencePanel.tsx`/`RecentFactsFeed.tsx`) no longer exist in the repo at all - verified by `find`/`ls`, not asserted from memory. `dashboard/desktop/` and `dashboard/mobile/` still exist as files but are dead code (unimported by any live page).

```
src/
├── components/
│   ├── ui/                    # shadcn components (DO NOT EDIT)
│   ├── auth/                  # Authentication flows (AuthProvider, RequireAuth)
│   ├── voice/                 # Voice assessment components
│   ├── landing/               # Landing page components
│   │   ├── HeroSection.tsx    # Landing page hero with video background
│   │   ├── CtrlLogo.tsx       # Renders the emerald `ctrl.` wordmark (superseded by BrandLockup in app headers/sidebars)
│   │   ├── BrandLockup.tsx    # App brand mark: Mindmaker icon (mindmaker-icon.png) + ctrl-logo.png wordmark
│   │   └── TrustIndicators.tsx
│   ├── dashboard/             # Legacy pre-cockpit dashboard hub - MOSTLY DEAD CODE as of 2026-08-02
│   │   ├── DashboardProvider.tsx, HeroStatusCard.tsx, WeeklyActionCard.tsx, DailyProvocationCard.tsx, PatternInsight.tsx, BriefingCard.tsx, DailyProvocation.tsx
│   │   ├── desktop/            # DEAD CODE: DesktopDashboard.tsx, Sidebar.tsx, Panel.tsx - not imported by any live page
│   │   └── mobile/             # DEAD CODE: MobileDashboard.tsx, HeroStatusCard.tsx, PriorityCardStack.tsx, VoiceButton.tsx, Sheet.tsx, ActionQueueSheet.tsx, StrategicPulseSheet.tsx - not imported by any live page
│   ├── memory-web/            # Brain graph + shared app chrome (nav, header) - NOT a "Memory Web dashboard" anymore
│   │   ├── AppHeader.tsx, BottomNav.tsx  # mobile chrome: BottomNav is the 3-tab cockpit nav (Home/Decisions/Memory)
│   │   ├── DesktopSidebar.tsx  # DEAD CODE: not imported by any live page; DesktopShell's own rail is what renders (see Routing below)
│   │   ├── BrainGraph.tsx, BrainCanvas.tsx, brainGraphModel.ts, worldModel.ts  # the Brain graph (PR #240 rebuild; see Brain Engine above)
│   │   ├── BondReader.tsx      # tapped-node reader: Confirm / Strengthen / Fix, both LIVE (PR #321)
│   │   ├── BetsRail.tsx, DesktopSignalHero.tsx, MemoryWebVisualization.tsx, PatternInsightCard.tsx
│   │   └── index.ts
│   ├── cockpit/                # Home: the unified 2028 cockpit (device-native, no VITE_COCKPIT_ENABLED fork)
│   │   ├── CockpitView.tsx     # mobile Home orchestrator (renders HomeFeed etc.)
│   │   ├── DesktopHomeView.tsx # desktop Home orchestrator
│   │   ├── HomeFeed.tsx        # the browsable headline stream (mobile)
│   │   ├── CockpitHero.tsx     # top-ranked card + peek + reveal
│   │   ├── CardReadSheet.tsx   # tap-to-read LLM-personalized sheet
│   │   ├── TrendCard.tsx       # structural "shift" cards
│   │   ├── KickstartCard.tsx   # role-tailored starter decision (guide posture)
│   │   ├── NewsHeadlineCard.tsx, CategoryMotif.tsx, HeroSparkline.tsx, HandoffWelcome.tsx
│   │   ├── NewsPreferencesPanel.tsx  # shared Tune picker body (used by Home's drawer AND Settings -> Interests)
│   │   ├── NewsPreferencesSheet.tsx  # Home's drawer shell around the panel
│   │   ├── TuneFeedButton.tsx, cockpitGreeting.ts, coldDeck.ts, laneReserve.ts
│   │   └── onboarding/
│   │       └── InlineProfileSetup.tsx  # inline lightweight onboarding (industry/role -> user_memory + interests)
│   ├── automator/             # Automator: default Skill Builder flow on /context (PR #199)
│   │   ├── AutomatorFlow.tsx      # Suggestions -> cascade -> skill-ready orchestrator
│   │   ├── AutomatorSuggestions.tsx  # Brain-mined deliverable suggestions ("pulled from your brain" badge) + inline "Something else"
│   │   ├── AutomatorCascade.tsx   # ~5-step all-recognition pick-cascade (reuses the kit cascade pattern)
│   │   ├── AutomatorSkillReady.tsx   # "Built your way" chips + Run it now + Export markdown + "Your skills" peek
│   │   ├── AutomatorScaffold.tsx  # Desktop two-pane: live "your skill is taking shape" panel beside the flow
│   │   └── automatorModel.ts      # composeTranscript maps picks into a transcript for generate-skill-export
│   ├── operator/
│   │   └── decision/          # The Decision Engine UI ("radial force spider" rebuild, PRs #308-320) - see Decision Engine section
│   │       ├── PressureTestPanel.tsx  # orchestrator, mounted by DecisionPage
│   │       ├── DecisionCapture.tsx, DecisionOrb.tsx, DecisionBoard.tsx, DecisionSpider.tsx, decisionSpiderModel.ts
│   │       ├── DecisionResultView.tsx, DecisionAnatomy.tsx, EvidenceList.tsx, evidenceGrouping.ts
│   │       ├── decisionMemo.ts    # board-ready one-page markdown memo (PR #321, pure + tested)
│   │       ├── resolveFlow.ts, DecisionResolvedMoment.tsx, ResolveDecisionSheet.tsx  # honest resolve/closure
│   │       ├── ForceDrawer.tsx, DecisionInboxCard.tsx, CriticalCallStep.tsx, decisionParts.ts, decisionRunningModel.ts
│   │       └── DecisionDemo.tsx, demoDecision.ts  # demo/preview data
│   ├── decision-map/           # /decision-map (distinct from /decision above)
│   │   └── ConsiderationStone.tsx, StoneRead.tsx, StoneDeeper.tsx
│   ├── track-record/           # /track-record (the You surface)
│   │   ├── TrackRecordView.tsx, TrackRecordDrawer.tsx, TrackRecordSkeleton.tsx, TrackRecordHeaderButton.tsx
│   │   ├── AgedCallRow.tsx     # "Active decision" cards with Open/Strengthen/Archive (settings audit, 2026-07-04)
│   │   ├── CalibrationSummary.tsx, DecisionCard.tsx
│   │   ├── CapabilityHeader.tsx  # tops the surface; reads src/lib/capabilityLadder.ts (PR #321)
│   │   └── trackRecordModel.ts, trackRecordMotifs.tsx
│   ├── system/                 # Shared main-app design primitives (settings audit, 2026-07-04)
│   │   ├── surface.tsx         # Surface / Eyebrow / SettingRow / solid SheetFooterBar
│   │   ├── AiTermHint.tsx      # popover demystifying AI/industry terms (never app vocabulary)
│   │   ├── BrandedAppLoader.tsx, GlobeLoader.tsx, SkeletonCard.tsx, loadingLines.ts
│   ├── edge/                  # Edge: Leadership Amplifier + Skill Builder UI
│   │   ├── EdgeView.tsx           # Main Edge view (strengths/weaknesses/gaps)
│   │   ├── EdgeProfileCard.tsx    # Profile summary card
│   │   ├── EdgeOnboarding.tsx     # First-time Edge experience
│   │   ├── EdgePaywall.tsx        # Pro tier paywall with sample artifacts
│   │   ├── StrengthPill.tsx       # Interactive strength pills
│   │   ├── GapPill.tsx            # Intelligence gap pills
│   │   ├── SmartProbeCard.tsx     # Guided gap resolution
│   │   ├── DraftSheet.tsx         # Artifact preview/generation sheet
│   │   ├── ArtifactPreview.tsx    # Generated artifact display
│   │   ├── FeedbackButtons.tsx    # Strength/weakness feedback
│   │   ├── SendToInboxButton.tsx  # Email delivery
│   │   ├── AutomatePainCard.tsx   # Skill Builder pain-anchored entry chip row
│   │   ├── VoiceStyleProfileSheet.tsx  # Captures the unified ctrl_voice_profile (moved here from memory-web/)
│   │   ├── SkillCaptureSheet.tsx  # DEAD CODE (PR #199): superseded by the Automator flow
│   │   ├── SkillPreviewSheet.tsx  # DEAD CODE (PR #199): superseded by AutomatorSkillReady
│   │   ├── SkillQualityGate.tsx   # Quality checklist display
│   │   └── SkillInstallGuide.tsx  # Per-tool install instructions (Claude Code / Claude.ai / Cursor)
│   ├── memory/                # Memory Center components (13 files + index.ts, counted 2026-08-02)
│   │   ├── MemoryList.tsx, AddMemorySheet.tsx, MemoryDetailSheet.tsx
│   │   ├── MemoryItemCard.tsx, MemoryPill.tsx, FactVerificationCard.tsx
│   │   ├── VerificationSwipeStack.tsx, VerificationBanner.tsx, VerificationCompletionScreen.tsx  # the current verify + correction-loop flow (PR #321)
│   │   ├── ContextFileButton.tsx  # one-click my-ai-context.md (PR #321)
│   │   ├── PrivacyControlsPanel.tsx, ExportImportPanel.tsx, MemoryErrorBoundary.tsx
│   ├── missions/, progress/, onboarding/ (Coachmark.tsx only)  # missions/ and progress/ are effectively orphaned - no page mounts them (see Missions System / Progress Tracking status notes in FEATURES.md)
│   ├── settings/              # Settings components (AccountTab, WorkContextTab, EdgeProTab, PreferencesTab, PrivacyDataTab, ManifestoTab, BriefingDirectivesTab)
│   ├── sharpen/                # Sharpen analysis components: CopyablePrompt.tsx, InsightCard.tsx, LoadingState.tsx, VoiceInput.tsx
│   ├── team-instructions/     # Team instruction generation
│   ├── briefing/, export/, library/, kit/, contest/, layout/, share/, compliance/, dev/
│   ├── UnifiedAssessment.tsx, UnifiedResults.tsx, LeadershipBenchmarkV2.tsx, PromptLibraryV2.tsx, TensionsView.tsx, ConsentManager.tsx, SingleScrollResults.tsx, AssessmentHistory.tsx, BenchmarkComparison.tsx, PeerBubbleChart.tsx, PeerComparisonMobile.tsx, MomentumDashboard.tsx, ErrorBoundary.tsx
│   └── [Other components]
├── contexts/
│   ├── AppStateContext.tsx    # Global app state management
│   ├── AssessmentContext.tsx  # Assessment flow state
│   └── ContestProvider.tsx    # "Flag it" contest actions (Decision Map)
├── hooks/                     # 78 custom hooks (counted 2026-08-02, up from 59 on 2026-06-09; alphabetical list in src/hooks/)
│   ├── useAuth.ts, useDevice.ts, useUserState.ts, useMediaQuery.ts, use-mobile.tsx, use-toast.ts, useLongPress.ts, useOffline.ts, useVisualViewport.ts, useZoomPan.ts
│   ├── useEdge.ts, useEdgeSubscription.ts   # Edge profile data + Edge Pro subscription state
│   ├── useSkillExport.ts, useSkillSuggestions.ts, useVoiceProfile.ts, useUserPains.ts, useRevealOnMount.ts  # Skill Builder / Automator
│   ├── useCockpit.ts          # Home data: userState -> posture, feed assembly, recordDeckReaction
│   ├── useInlineProfile.ts    # inline onboarding (PR #298)
│   ├── useMemoryQueries.ts, useMemoryWeb.ts, useMemoryExport.ts, useUserMemory.ts, useMemoryEdges.ts, useMarkdownImport.ts, useVerificationFlow.ts
│   ├── useDecisionEngine.ts, useDecisionInbox.ts, useDecisionCall.ts, useDecisionChecklist.ts, useDecisionActions.ts, useResolveDecision.ts, usePinnedDecision.ts, useDecisions.ts (legacy, unused)
│   ├── useCapabilitySignals.ts  # feeds the Capability Ladder (PR #321)
│   ├── useTrackRecord.ts, useGoals.ts, useContest.ts
│   ├── useBriefing.ts, useBriefingCategories.ts, useBriefingInterests.ts, useBriefingStreamPreview.ts, useBriefingVoiceCommands.ts, useIndustrySeeds.ts, useKillLensItem.ts
│   ├── useNewsPreferences.ts  # module-level shared store (single door for Tune, 2026-07-04)
│   ├── useKitRedemption.ts, useKitBuild.ts, useKitArtifacts.ts, useIntakeFlow.ts
│   ├── useGeneratedArtifacts.ts, useProfileBasics.ts, useOnceFlag.ts, useWatchlist.ts, useMcpTokens.ts, useModelRecommendation.ts, usePortfolioPulse.ts, useSuggestedBets.ts, useSuggestedInterests.ts, useCardForYou.ts
│   ├── useComplianceStatus.ts, useExportRecommendations.ts, useLeadQualification.ts, usePayment.ts
│   ├── useTeamInstructions.ts, useTodaysTension.ts, useGenerationProgress.ts, useExecutiveInsights.ts
│   ├── useMissions.ts, useCheckIns.ts, useProgress.ts  # orphaned - no page mounts the UI these back (see FEATURES.md status notes)
│   ├── useStructuredAssessment.ts, useRealtimeAssessment.ts, useAILiteracyAssessment.ts, useAssessmentBenchmarks.ts
│   └── useVoice.ts, useVoiceInput.ts, useAudioCapture.ts
├── lib/
│   ├── motion.ts               # Animation utilities (Framer Motion)
│   ├── capabilityLadder.ts     # PR #321: pure, unit-tested 4-stage progression model
│   ├── starterDecisions.ts     # role-tailored kickstart decisions
│   ├── newsPriority.ts, roleArchetype.ts  # curation system ranking (docs/CURATION-SYSTEM-SPEC.md)
├── utils/
│   ├── runAssessment.ts, orchestrateAssessmentV2.ts, aggregateLeaderResults.ts, pipelineGuards.ts, edgeFunctionClient.ts, mobileViewport.ts, audioRecorder.ts
│   └── [Other utilities]
├── types/
│   ├── pipeline.ts, profile.ts, voice.ts, diagnostic.ts, edge.ts, memory.ts, memory-settings.ts, missions.ts
│   ├── cockpit.ts              # Home types: DeckCard / DeckCardKind, deck + userState/posture fields on CockpitData
│   ├── voiceProfile.ts, video-background.ts, newsCategory.ts, track-record.ts
├── data/
│   ├── compassQuestions.ts, secondaryQuestions.ts, sharpenSystemPrompt.ts
├── integrations/
│   └── supabase/
│       ├── client.ts           # Supabase client
│       └── types.ts            # Generated DB types (READ-ONLY)
├── pages/                      # page files (counted 2026-08-02: 23 top-level + 5 under pages/kit/)
│   ├── Landing.tsx (/), Auth.tsx (/auth), AuthCallback.tsx (/auth/callback)
│   ├── Dashboard.tsx           # /dashboard - cockpit Home or Edge, device-native (see Home section above)
│   ├── MemoryCenter.tsx (/memory), ContextExport.tsx (/context), BriefingPage.tsx (/briefing)
│   ├── DecisionPage.tsx (/decision), DecisionMap.tsx (/decision-map), TrackRecord.tsx (/track-record), Goals.tsx (/goals)
│   ├── EnrichPage.tsx (/enrich), BuildLap.tsx (/build), Settings.tsx (/settings), Compliance.tsx (/compliance), Profile.tsx (/profile), Booking.tsx (/booking)
│   ├── Agents.tsx (/agents), Try.tsx (/try), CaptureLanding.tsx (/download, flag-gated), Pricing.tsx (/upgrade), Preview.tsx (/preview, unlinked dev harness)
│   ├── kit/KitRedeem.tsx (/kit), kit/KitHome.tsx (/kit/me), kit/KitIntake.tsx (/kit/me/intake), kit/KitReading.tsx (/kit/reading/:pageId), kit/KitPdf.tsx (/kit/pdf, /kit/pdf/:redemptionId)
│   ├── NotFound.tsx (* fallback)
│   └── Timeline.tsx            # ORPHANED: file exists, no route in src/router.tsx (verified 2026-08-02)
│
│   **Pages referenced by earlier versions of this doc that NO LONGER EXIST**: Diagnostic.tsx, Voice.tsx, Pulse.tsx, Today.tsx, Think.tsx (the `/today` `/voice` `/pulse` `/diagnostic` `/think` routes are `<Navigate>` redirects defined directly in `src/router.tsx`, not separate page files), WeeklyCheckin.tsx, MissionCheckIn.tsx, MissionHistory.tsx, Progress.tsx, Baseline.tsx, DecisionCapture.tsx, PromptCoach.tsx.
├── styles/                    # Design tokens & styles
├── __tests__/                 # Test files (29 spec files + e2e/ subdirectory, counted 2026-08-02)
└── index.css                  # Design system
```

### State Management

**Global State** (AppStateContext + AssessmentContext):
- Current assessment data
- Contact information
- Session ID
- Completion status
- App-wide state flags

**Local State**:
- Component-specific UI state
- Form inputs
- Loading states

**Server State** (via Supabase + TanStack React Query):
- Assessment results
- User profile
- Historical assessments
- Memory data
- Missions and check-ins

### Routing

Using React Router v6 with `createBrowserRouter` and lazy loading (defined in `src/router.tsx`). Table verified directly against `src/router.tsx` on 2026-08-02 - the previous version of this table was missing 8 live routes.

**Public routes:**

| Route | Page | Notes |
|-------|------|-------|
| `/` | Landing | Video background hero, forced-dark CTRL branding |
| `/auth` | Auth | Email + Google OAuth |
| `/auth/callback` | AuthCallback | OAuth redirect handler |
| `/booking` | Booking | External booking |
| `/build` | BuildLap | Agent Skill Builder full-page flow |
| `/kit` | kit/KitRedeem | Class follow-up portal code entry (anonymous session) |
| `/preview` | Preview | Dev/QC fixture-render harness, unlinked, public so it can be screenshot without auth |
| `/agents` | Agents | Agent-native marketing page: the read-only Memory Web MCP offering |
| `/try` | Try | Pre-login magic moment: a canned but real-shaped pressure-test demo |
| `/download` | CaptureLanding (via `CaptureLandingGate`) | Public email-capture landing page, gated behind `FF.publicCapture()`; degrades to `NotFound` when the flag is off |
| `/upgrade` | Pricing | Interactive in-app upgrade surface with a live checkout button. `/pricing` is the separate static SEO page (`public/pricing.html`, `vercel.json` rewrite) kept in sync manually - see the Billing banner at the top of this doc |
| `/kit/me` | kit/KitHome | Kit + journey home (anonymous, upgrades on email capture) |
| `/kit/me/intake` | kit/KitIntake | 6-question intake (voice or taps) |
| `/kit/reading/:pageId` | kit/KitReading | Full-screen reader for a single artifact |
| `/kit/pdf`, `/kit/pdf/:redemptionId` | kit/KitPdf | The print-styled hero PDF; unlinked, opened by the reveal's "Download PDF"; self-resolves the current redemption when no id is given |

The `/kit*` routes are the Kit Engine portal (Phase 11). They live **outside** the authed app shell - no `AuthedLayoutRoute`, no sidebar, no Command Palette. They run on an anonymous Supabase session (a real `auth.uid()` with role `authenticated`), and the portal owns its own scroll via `KitPortalLayout` (see Kit Engine section below).

**Authenticated routes** (wrapped by `AuthedLayoutRoute`, each individually by `RequireAuth`):

| Route | Page | Notes |
|-------|------|-------|
| `/dashboard` | Dashboard | The unified 2028 Home (cockpit), device-native; `?view=edge` renders the Edge leadership amplifier on the same shell |
| `/think` | `<Navigate to="/dashboard?view=edge">` | Redirect, not a page |
| `/memory` | MemoryCenter | Memory Center + Brain graph |
| `/context` | ContextExport | Automator / Skill Builder / Context Export |
| `/briefing` | BriefingPage | Daily Briefing v2 |
| `/decision` | DecisionPage | Decision Engine: weigh a decision (decompose -> verify -> cross-examine -> advise); reads router state (`prefill`/`openCaseId`/`strengthen`) or a `?prefill=` query param |
| `/goals` | Goals | Horizon-grouped goal tracking |
| `/track-record` | TrackRecord | The You surface: decision history + Capability Ladder |
| `/decision-map` | DecisionMap | The pinned-decision hero + connector rail |
| `/enrich` | EnrichPage | Inbound "borrow your own AI" enrichment loop |
| `/settings` | Settings | User preferences (4 collapsed groups: You / Briefing / Privacy & data / Account) |
| `/compliance` | Compliance | Compliance / audit center |
| `/profile` | Profile | User profile |

**Legacy redirects (still live, defined directly in `src/router.tsx`, not separate page files):**

| Route | Redirects To |
|-------|-------------|
| `/today` | `/dashboard` |
| `/pulse` | `/dashboard` |
| `/voice` | `/dashboard` |
| `/diagnostic` | `/dashboard` |
| `*` | `NotFound` page (not a redirect to `/`) |

All active pages are lazy-loaded with `React.lazy()`, wrapped in `<Suspense>`, and wrapped again in a retry helper (`lazyWithRetry`) that auto-reloads once on a stale-chunk 404 after a deploy, then falls back to a branded recoverable "Reload" screen rather than a blank page.

**Navigation (verified against `src/components/layout/DesktopShell.tsx` and `src/components/memory-web/BottomNav.tsx`, 2026-08-02 - corrects the prior claim of a fixed 4-item `DesktopSidebar`, which is dead code):**
- **Desktop**: `DesktopShell`'s collapsible rail (220px). Primary spine, 3 items matching mobile: Home, Decisions, Memory (Track record is folded into Decisions as a Now|History toggle, craft+growth polish PR #329). Secondary (one click via "More"): Edge, Briefing, Track record, Export, Goals, Decision Map. Account: Profile, Compliance, Settings.
- **Mobile**: `memory-web/BottomNav.tsx`, 3 tabs (Home, Decisions, Memory), same order/icons as desktop.

### Desktop Shell

Authenticated routes wrap in `AuthedLayoutRoute` which mounts `CommandPaletteProvider` plus a sticky top bar with page eyebrow + title + actions, and supports an optional right rail that pages opt into.

- **Command Palette** (`Cmd/Ctrl + K`): Pages opt into actions via two custom window events:
  - `mm:capture-voice`: fired from the palette to open the active page's voice capture flow
  - `mm:generate-briefing`: fired to kick off a briefing generation from anywhere
- **Right rail (opt-in)**: Briefing surfaces (interests, suggestions, weekly history), Export wizard (step progress, current selection, contextual pro tip).
- **Landing page (desktop)**: bold asymmetric hero with animated Memory Web preview, sticky top nav with section anchors, multi-section scroll (how it works, three pillars, briefing teaser, privacy), final CTA. Mobile preserves the swipeable three-card experience.

The shell exists to make the product feel like a desktop-native tool, not stretched mobile markup.

---

## Component Architecture

### Core UI Components

#### Button Component (`src/components/ui/button.tsx`)

**Variants:**
- `default`: Primary action (emerald `--primary` fill on the dark surface)
- `outline`: Secondary action (transparent, bordered)
- `ghost`: Tertiary action (transparent, hover background)
- `hero`: Large primary CTA (for landing page)
- `cta`: Accent-colored action

**Sizes:**
- `sm`: h-9
- `default`: h-10
- `lg`: h-11
- `xl`: h-14, text-base

**Critical Requirements:**
- All variants must have `border-0` explicitly
- Smooth transitions (200ms)
- Proper hover states
- Accessible focus states

#### Card Component (`src/components/ui/card.tsx`)

**Structure:**
- `Card`: Base container (dark `ctrl-ds` surface, rounded-3xl, elevation via border + subtle shadow)
- `CardHeader`: Title section (p-8 pb-6, space-y-3)
- `CardContent`: Main content (p-8 pt-4)
- `CardTitle`: Heading (text-xl, font-bold)

**Styling:**
- Background: dark `ctrl-ds` card surface (NOT white; the app is globally forced dark)
- Border: Subtle (border/40)
- Shadow: Soft, on-dark
- Padding: Generous (p-8 minimum)

### Landing Page Components

#### HeroSection (`src/components/landing/HeroSection.tsx`)

**Layout:**
- Full viewport height: `h-[var(--mobile-vh)]`
- Centered content card
- Video background (subtle)
- No scroll on mobile

**Content Card:**
- Max width: `max-w-2xl`
- Padding: `p-8 sm:p-12 md:p-16 lg:p-20`
- Background: dark `ctrl-ds` surface (the app is globally forced dark; not a white card)
- Border radius: `rounded-3xl`
- Shadow: `shadow-lg`

**Elements:**
1. Logo: Top-left, minimal spacing
2. Headline: Large, bold, tight leading
3. Underline animation: SVG path, animated draw
4. Description: Large, readable, muted color
5. CTA Buttons: Primary + Secondary, large, rounded
6. Trust indicators: Small checkmarks, muted text

**Animations:**
- Fade in on mount (staggered delays)
- Slide up for card
- SVG underline draw animation

### Dashboard Components

#### MobileDashboard (`src/components/dashboard/mobile/MobileDashboard.tsx`)

**Layout:**
- Full viewport height
- Fixed header
- Scrollable content area
- Fixed bottom navigation
- Floating voice button

**Structure:**
```
┌─────────────────┐
│ Header (fixed)  │
├─────────────────┤
│                 │
│ Content (scroll)│
│                 │
├─────────────────┤
│ BottomNav       │
└─────────────────┘
     [VoiceBtn]
```

#### BottomNav (`src/components/dashboard/mobile/BottomNav.tsx`)

**Specifications:**
- Fixed bottom
- Height: `h-20`
- Background: `bg-background/98` with backdrop blur
- Border: Top border, subtle
- Shadow: Subtle top shadow
- Items: 4 navigation items
- Active state: `text-primary bg-primary/10`

#### Sheet Component (`src/components/dashboard/mobile/Sheet.tsx`)

**Specifications:**
- Bottom sheet pattern
- Heights: small (40vh), medium (60vh), large (85vh)
- Backdrop: `bg-black/40` with blur
- Animation: Spring physics (stiffness: 400, damping: 35)
- Handle: Top drag indicator
- Rounded top corners: `rounded-t-3xl`

---

## Page Specifications

### Landing Page (`/`)

**Requirements:**
- No scroll on mobile
- Video background (subtle)
- Centered card on the dark `ctrl-ds` surface (not a white card)
- Large, readable typography
- Clear CTAs
- Trust indicators below

### Dashboard (`/dashboard`) - Main Hub

The Dashboard is the primary authenticated view, `src/pages/Dashboard.tsx`. It renders exactly one of two things based on the `view` query parameter - there is no third "Memory Web dashboard" view, and no `VITE_COCKPIT_ENABLED` fork (both retired PR #298):

**Default (Home / the cockpit):**
- Mobile: `CockpitView` (device-native swipe/stream feed)
- Desktop: `DesktopHomeView` (device-native rail)
- Lifecycle-adaptive: NEW/DORMANT/no-live-decision leaders get the `guide` posture (inline onboarding + `KickstartCard`); active leaders get `partner` posture
- Full detail in the **Home: the unified 2028 cockpit** section (top of this doc) and `docs/CTRL-SYSTEM-SPEC.md` sections 6 and 8

**Edge view (`?view=edge`):**
- Lazy-loaded `EdgeView` component
- Same shell as Home (mobile: `AppHeader` + `BottomNav`; desktop: `DesktopShell`)
- Shows leadership profile: strengths (interactive pills), weaknesses, intelligence gaps
- Pro tier paywall for premium artifact generation (board memos, strategy docs, emails)
- Feedback loops for strength/weakness confirmation

**Desktop Layout (current rail, see Routing above):**
```
┌──────────┬──────────────────────┐
│ Rail     │                      │
│ (220px)  │   Main Content       │
│          │                      │
│ Home     │                      │
│ Decisions│                      │
│ Memory   │                      │
│ (More...)│                      │
└──────────┴──────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────┐
│ AppHeader       │
├─────────────────┤
│                 │
│ Content (scroll)│
│                 │
├─────────────────┤
│ BottomNav (3)   │
└─────────────────┘
```

### Memory Center (`/memory`)

**Features:**
- Voice-first fact extraction
- Fact verification cards with confidence scores
- Privacy controls panel
- Export/import panel
- Error boundary wrapper

### Context Export (`/context`)

**Features:**
- One-click export to 6 AI tools (ChatGPT, Claude, Gemini, Cursor, Claude Code, Raw Markdown)
- Use case-specific formatting (General Advisor, Meeting Prep, Decision Support, etc.)
- Copy to clipboard or download

---

## Backend Architecture

### Database Schema

**Core Tables**:

```
leaders
├── id (PK)
├── email (unique)
├── full_name
├── company_name
├── role_title
├── industry
├── company_size
└── created_at

leader_assessments
├── id (PK)
├── leader_id (FK → leaders)
├── session_id
├── source ('quiz' | 'voice')
├── benchmark_score (0-100)
├── benchmark_tier (emerging | establishing | advancing | leading)
├── learning_style
├── generation_status (JSON)
└── created_at

leader_dimension_scores
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── dimension_key (strategic_vision | experimentation | delegation | data_quality | team_capability | governance)
├── score_numeric (0-100)
├── dimension_tier
└── explanation

leader_insights
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── your_edge (text)
├── your_risk (text)
├── your_next_move (text)
└── dimension_insights (JSON)

leader_prompt_sets
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── category_key
├── title
├── description
├── what_its_for
├── when_to_use
├── how_to_use
├── prompts_json (JSON array)
└── priority_rank

leader_tensions
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── dimension_key
├── summary_line
└── priority_rank

leader_risk_signals
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── risk_key (shadow_ai | skills_gap | roi_leakage | decision_friction)
├── level (low | medium | high)
├── description
└── priority_rank

leader_org_scenarios
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── scenario_key
├── summary
└── priority_rank

leader_first_moves
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── move_number (1, 2, 3)
├── content (text)
└── created_at

leader_missions
├── id (PK)
├── leader_id (FK → leaders)
├── assessment_id (FK → leader_assessments)
├── first_move_id (FK → leader_first_moves)
├── status (active | completed | skipped | extended)
├── started_at
├── completed_at
└── created_at

leader_check_ins
├── id (PK)
├── leader_id (FK → leaders)
├── mission_id (FK → leader_missions)
├── reflection_text
├── ai_response (text)
├── voice_url (text)
└── created_at

leader_progress_snapshots
├── id (PK)
├── leader_id (FK → leaders)
├── snapshot_data (JSON)
├── drift_score
└── created_at

user_memory
├── id (PK)
├── user_id (FK)
├── fact_category (identity | business | objective | blocker | preference)
├── fact_text
├── confidence (0-1)
├── source (voice | form | linkedin | calendar | enrichment)
├── verification_status (inferred | verified | corrected | rejected)
├── encrypted_content (bytea)
└── created_at

user_memory_settings
├── id (PK)
├── user_id (FK)
├── memory_enabled (boolean)
├── auto_extract (boolean)
├── retention_days (integer)
└── updated_at

assessment_events
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── profile_id (FK → leaders)
├── session_id
├── tool_name ('quiz' | 'deep_profile' | 'voice')
├── event_type ('question_answered')
├── question_id
├── question_text
├── raw_input (user's answer)
├── structured_values (JSON)
└── created_at

assessment_behavioral_adjustments
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── experimentation_weight
├── delegation_weight
├── time_optimization
├── stakeholder_complexity
├── raw_inputs (JSON)
└── adjustment_rationale (JSON)

index_participant_data
├── id (PK)
├── user_id
├── session_id
├── company_identifier_hash (anonymised)
├── role_title
├── industry
├── company_size
├── readiness_score
├── tier
├── dimension_scores (JSON)
├── consent_flags (JSON)
└── completed_at

briefings
├── id (PK, UUID)
├── user_id (FK → auth.users)
├── briefing_date (DATE)
├── briefing_type (default | macro_trends | vendor_landscape | competitive_intel | boardroom_prep | team_update | ai_landscape | custom_voice)
├── script_text (nullable - filled after preliminary insert)
├── segments (JSONB array of BriefingSegment)
├── audio_url, audio_duration_seconds
├── context_snapshot (JSONB - v2 stores lens + queries + excludes here)
├── news_sources (JSONB)
├── generation_model
├── custom_context, voice_note_url
├── is_pro_only (BOOL)
├── schema_version (INT, 1 = legacy, 2 = evidence-based lens pipeline)
└── created_at
  - UNIQUE (user_id, briefing_date, briefing_type) except for custom_voice

briefing_feedback
├── id (PK), briefing_id (FK), segment_index
├── reaction (useful | not_useful | save)
├── lens_item_id (v2 - which lens item the segment matched)
├── dwell_ms (v2 - time user kept segment open)
├── replayed (v2 - did they replay the audio)
└── created_at

briefing_interests                      -- user-declared preferences
├── id (PK), user_id (FK)
├── kind (beat | entity | exclude)
├── text, weight
├── source (manual | seed_accepted | feedback_promoted)
├── is_active, created_at, updated_at
  - RLS to owner; soft-delete via is_active

industry_beat_library                   -- reference data for cold-start seeds
├── id (PK), industry_key (UNIQUE), label
├── aliases (TEXT[], lowercase substrings for fuzzy match)
├── beats (JSONB: [{label}])
├── entities (JSONB: [{label}])
├── is_active, updated_at
  - 11 rows seeded; RLS read-only to authenticated

briefing_lens_feedback                  -- persistent negative weight deltas
├── id (PK), user_id (FK)
├── lens_item_signature (SHA-256 of "bucket|normalized_text")
├── lens_item_type, lens_item_text
├── weight_delta (NUMERIC, always negative)
├── source (kill | not_useful_aggregate)
├── evidence_count (INT - how many reactions contributed)
├── is_active, created_at, updated_at
  - UNIQUE (user_id, signature, source); writes via edge functions only

ai_response_cache                       -- generic AI + embedding cache
├── prompt_hash, model
├── response (JSONB)
├── expires_at
  - Used by lens cache (24h) and lens-item embedding cache (7d)

training_material                       -- YAML voice guide, single source of truth
├── scope (global | cohort | user), user_id (optional), version
├── body_raw (TEXT YAML), body_parsed (JSONB)
└── is_active

skill_exports                           -- Skill Builder log (Phase 8)
├── id (PK, uuid), user_id (FK auth.users, ON DELETE CASCADE)
├── skill_name, description, transcript
├── triage_result ('skill' | 'custom_instruction' | 'memory_fact' | 'saved_style' | 'failed')
├── body_content, references_json (JSONB), test_prompts (TEXT[])
├── quality_gate (JSONB), archetype, version (default 1)
├── zip_path (reserved for future Storage upload), created_at
  - One row per generation attempt, including failed-triage cases
  - RLS: owner-read + owner-insert
  - Indexed on user_id and created_at DESC

decision_cases                          -- Decision Engine (not documented in earlier versions of this doc; added 2026-08-02)
├── id (PK, uuid), user_id (FK auth.users)
├── statement (original leader input), reframed (BOOL), reframed_statement, reframe_note, lifecycle_stage (build|orchestrate|productize|gtm|substrate, nullable)
├── stage (decomposing|verifying|cross_examining|advising|complete|error, polled every 2s by the frontend)
├── confidence, verdict, force_labels (JSONB), status (active|archived|decided), pinned_at
├── played_out, resolved_at (the honest resolve/closure flow, PR #321-era migrations)
└── created_at, updated_at
  - RLS: owner-scoped

decision_claims                         -- one row per decomposed claim, tagged to a Dimension/force
decision_evidence                       -- retriever CHECK includes 'artificialanalysis' (migration 20260623133000)
decision_tensions                       -- cross-examination tensions between claims
decision_alerts                         -- raised by decision-watch's hourly WATCH loop; idempotent
decision_events                         -- pipeline event log
decision_eval_cases                     -- admin-only calibration golden set
decision_check_items                    -- migration 20260702120000: persisted "what to check next" tick-state, keyed by normalized bullet text (checkItemKey), not a stable per-item id
decision_user_calls                     -- migration 20260605140000: the leader's own banked call, distinct from the engine's verdict
  - All decision_* tables RLS owner-scoped. See the **Decision Engine** feature section in FEATURES.md for the full pipeline (reframe -> decompose -> verify -> cross-examine -> advise) and the rebuilt "radial force spider" UI (PRs #308-320).

memory_events                           -- migration 20260703090000: the correction loop (PR #321)
├── id (PK, uuid), user_id (FK), fact_id (FK user_memory)
├── event_type ('user_corrected' | 'user_rejected' | 'user_disputed')
├── prior_value (JSONB - what the fact said before the correction)
└── created_at
  - RLS: owner-scoped. Read by `_shared/correction-guard.ts` in `extract-user-context` so a ruled-out value is not silently re-extracted.

kit_codes                               -- Kit Engine class codes (Phase 11)
├── id (PK, uuid), code (UNIQUE)
├── class_slug, preset_version
├── label, is_active, created_at
  - Service-role only. RLS enabled with ZERO policies so codes are never client-enumerable.
  - Redemption reads it via the redeem_kit_code RPC (SECURITY DEFINER), never directly.

kit_redemptions                         -- the 30-day pass + skill quota
├── id (PK, uuid), user_id (FK auth.users)
├── code_id (FK kit_codes), class_slug, preset_version
├── expires_at (30-day pass), skills_remaining (default 3 net-new builds)
├── shipped_at (set when the student hits "I shipped it"), created_at
  - RLS: owner-scoped (anonymous session has a real auth.uid())
  - UNIQUE (user_id, code_id) - re-entering a code lands the same redemption

kit_builds                              -- one row per compose run; the row IS the progress UX
├── id (PK, uuid), redemption_id (FK), user_id (FK auth.users)
├── status (pending | running | partial | done | failed)
├── artifact_statuses (JSONB - per-artifact status, polled by the client)
├── feedback (text, set on regenerate-with-feedback), created_at
  - RLS: owner-scoped. Polled every few seconds by the client during compose.

kit_artifacts                           -- system of record for the pack
├── id (PK, uuid), build_id (FK), redemption_id (FK), user_id (FK auth.users)
├── kind, title, format ('markdown' | 'json' | 'zip')
├── content_md (TEXT), content_json (JSONB)
├── zip_base64 (TEXT - ZIPs stored inline as base64, not in a Storage bucket)
├── version (INT), is_current (BOOL), created_at
  - RLS: owner-scoped. Versioned; is_current flags the live artifact.
  - Persists for the life of the redemption, so the pack stays downloadable.

kit_journey_events                      -- append-only journey log
├── id (PK, uuid), redemption_id (FK), user_id (FK auth.users)
├── event_type (intake_completed | build_started | artifact_viewed | step_checked | shipped | regenerated | capsule_ingested | ...)
├── payload (JSONB), created_at
  - RLS: owner-scoped. Append-only.

kit_nudges                              -- day-3 / day-7 send-dedupe ledger
├── id (PK, uuid), redemption_id (FK), user_id
├── nudge_kind (day_3 | day_7), sent_at
  - Service-role only. UNIQUE (redemption_id, nudge_kind) so a nudge sends once.
```

**Kit Engine RLS note:** all six tables have RLS enabled. `kit_codes` and `kit_nudges` are service-role only (`kit_codes` has zero policies so codes can't be enumerated). The four student-facing tables are owner-scoped. This works for anonymous students because an anonymous Supabase session carries a real `auth.uid()` with role `authenticated`, so owner-scoped RLS holds exactly as it does for a logged-in user.

**Kit Engine atomic RPCs:**
- `redeem_kit_code` - `SECURITY DEFINER`, no anon/authenticated execute grant. Row-locks the `kit_codes` row so a whole class redeeming simultaneously can't race it. Idempotent: a re-entered code returns the existing redemption.
- `consume_kit_skill` - `SECURITY DEFINER`, no anon/authenticated execute grant. Atomically decrements `kit_redemptions.skills_remaining` on each net-new build.

**Kit Engine schedule:** day-3 / day-7 nudge `pg_cron` job `kit-nudges-email` invokes the `send-kit-nudges` sweep.

**PostgreSQL Extensions (required):**
- `pgvector` - embedding storage + cosine operators (briefing scoring)
- `pgcrypto` - `digest('sha256', ...)` for lens signatures
- `pg_cron` - nightly feedback aggregator schedule

### Edge Functions

**Location**: `supabase/functions/`

**Total**: 104 edge functions in `supabase/functions/` (excluding `_shared/`; counted directly from the filesystem on 2026-08-02 - the individual numbered lists below were assembled incrementally across many PRs and their numbering has drifted out of sequence in places; treat the numbers as historical labels, not a live count). The Briefing subsystem (Phase 6) added seven functions (`generate-briefing`, `synthesize-briefing`, `briefing-diagnose`, `get-industry-seeds`, `briefing-kill-lens-item`, `briefing-aggregate-feedback`, `infer-briefing-interests`, `nudge-briefing`) plus shared modules (`briefing-lens`, `briefing-scoring`, `briefing-curation`, `user-context`, `lens-signature`, `with-timeout`, `logger`). Phase 8 added one function (`generate-skill-export`, four internal files) backing the Skill Builder pipeline. Phase 9 added the Decision Engine trio (`decision-engine` orchestrator, `decision-watch` hourly WATCH loop, `decision-eval` admin calibration harness) plus the unauthenticated `track-event` attribution proxy (deployed `--no-verify-jwt`). Phase 11 added five functions (`kit-redeem`, `kit-compose`, `kit-capsule-ingest`, `send-kit-pack`, `send-kit-nudges`) backing the Kit Engine portal, plus the shared `_shared/kit-presets/` registry. PR #204 added one function (`extract-voice-profile`). Since then (2026-06-22 through 2026-08-01, not previously documented): `decision-reactions`, `decision-research`, `send-decision-summary` (Decision Engine, see the new Decision Engine Subsystem subsection below), `send-reactivation-nudge` (daily cron re-engagement, PR #298), and further growth in the memory/briefing/kit subsystems bringing the total from 85 to 104. See **Decision Engine Subsystem** below for what shipped there specifically.

**Production hardening (Audit Weeks 1-6, April 2026):**
- All external API calls now wrapped with `_shared/with-timeout.ts` (timeouts + retries, tested)
- All edge functions emit structured JSON logs via `_shared/logger.ts` (CI gate against `console.log` regressions)
- Stripe webhook signature verification + idempotency via `stripe_events_processed` table
- Briefing rate limits enforced via `_shared/rateLimit.ts`
- Account deletion is end-to-end (deletes Memory Web, briefings, audio artifacts, decisions, missions, assessments)
- E2E tests cover the highest-risk paths: auth journeys, briefing journey, briefing rate limits, sparse profile, account deletion, stripe webhook idempotency

#### Core Assessment Functions

1. **create-leader-assessment** - Creates assessment record, calculates scores, applies behavioral adjustments
2. **ai-generate** - Central AI generation function (Vertex AI primary, OpenAI fallback, static tertiary). Produces all AI content: insights, prompts, tensions, risks, scenarios, first moves. Applies cognitive frameworks.
3. **compass-analyze** - Analyzes voice transcripts from Compass module
4. **roi-estimate** - Extracts ROI data from voice transcripts
5. **populate-index-participant** - Anonymises and stores benchmark data

#### Memory & Context Functions

6. **memory-crud** - Create, read, update, delete memory facts
7. **memory-settings** - Memory privacy settings management
8. **extract-user-context** - Extract context from voice input
9. **enrich-company-context** - Enrich company data from external sources

#### Missions & Progress Functions

10. **send-mission-check-in** - Send check-in reminder notifications
11. **generate-progress-snapshot** - Generate progress snapshot data
12. **compute-drift** - Compute drift from baseline assessment
13. **batch-compute-drift** - Batch drift computation
14. **update-adoption-momentum** - Track adoption momentum metrics

#### Operator & Intelligence Functions

15. **operator-decision-advisor** - AI-powered decision advisory
16. **generate-meeting-prep** - AI meeting preparation content
17. **prompt-coach** - Prompt coaching assistance
18. **sharpen-analyze** - Sharpen analysis for skill improvement
19. **detect-patterns** - Pattern detection across assessments
20. **get-daily-prompt** - Daily provocative prompt generation
21. **get-or-generate-weekly-action** - Weekly action item generation
22. **generate-weekly-prescription** - Weekly prescription content
23. **get-peer-snippets** - Anonymised peer comparison data

#### Communication Functions

24. **send-confirmation-email** - Assessment completion confirmation
25. **send-diagnostic-email** - Diagnostic report delivery
26. **send-booking-notification** - Workshop booking confirmation
27. **send-advisory-sprint-notification** - Advisory sprint notification
28. **send-weekly-checkin-reminder** - Weekly check-in reminders
29. **send-feedback** - User feedback submission
30. **resend-webhook** - Resend email webhook handler

#### Payment Functions

31. **create-diagnostic-payment** - Create Stripe payment intent
32. **verify-diagnostic-payment** - Verify payment completion
33. **stripe-webhook** - Stripe webhook handler
34. **create-stripe-prices** - Stripe price configuration

#### Data & Integration Functions

35. **sync-to-google-sheets** - Sync leads to Google Sheets
36. **batch-process-pending-syncs** - Batch sync processing
37. **generate-quarterly-index** - Quarterly AI Leadership Index
38. **claim-history** - Claim assessment history for authenticated users

#### User Preference Functions

39. **upsert-notification-prefs** - Notification preferences
40. **upsert-sharing-consent** - Data sharing consent

#### Voice & Interaction Functions

41. **voice-transcribe** - OpenAI Whisper transcription
42. **ai-assessment-chat** - AI assessment chat
43. **submit-reflection** - Submit reflection responses
44. **submit-decision-capture** - Capture decision data
45. **submit-weekly-checkin** - Submit weekly check-in

#### Edge Functions (Leadership Amplifier)

46. **synthesize-edge-profile** - Synthesize strengths/weaknesses from Memory Web + assessment data
47. **edge-generate** - Generate Edge artifacts (board memos, strategy docs, emails, frameworks)
48. **create-edge-subscription** - Create Edge Pro Stripe subscription
49. **deliver-edge-artifact** - Deliver generated artifact via email

#### Daily Briefing Subsystem (v2 pipeline, evidence-based lens)

54. **generate-briefing** - Main orchestrator. Routes to v1 (legacy) or v2 (evidence-based) based on flag. v2 runs lens → query planner → provider fan-out (Perplexity/Tavily/Brave, 12s cap) → embedding dedupe + scoring + exclude filter → budget-constrained curation → script generation → audio synthesis trigger.
55. **synthesize-briefing** - ElevenLabs MP3 synthesis, fire-and-forget from `generate-briefing`.
56. **briefing-diagnose** - Read-only diagnostic endpoint. Returns `{ profile, interests, lens, excludes, planned_queries, last_briefing, recent_feedback }` for the authenticated user. Used to answer "why did this user get these headlines?"
57. **get-industry-seeds** - Returns industry-specific beats + entities from `industry_beat_library`. Fuzzy-matches on user's `industry` fact (longest alias wins), falls back to `generic`. Pre-filters anything already in the user's interests.
58. **briefing-kill-lens-item** - Records an explicit "don't show me stories like this" signal. Accepts `(briefing_id, lens_item_id)` or `(lens_item_type, lens_item_text)`. Upserts `briefing_lens_feedback` with `weight_delta = -1.0`.
59. **briefing-aggregate-feedback** - Admin/cron HTTP entrypoint (requires service-role JWT). Scans recent `briefing_feedback` rows, groups by lens signature, promotes anything >= 3 thumbs-down to a persistent `-0.4` delta. Nightly schedule is actually implemented as `sp_aggregate_briefing_feedback` (plpgsql) + pg_cron so no service-role key is stored in Postgres.

#### Memory Lifecycle Functions

50. **memory-lifecycle** - Memory fact aging and cleanup
51. **memory-synthesize** - Memory pattern synthesis
52. **memory-settings** - Memory privacy and budget settings

#### Additional Functions

53. **enrich-company-context** - Enrich company data for contextual AI responses

#### Skill Builder Subsystem (Phase 8, May 2026)

60. **generate-skill-export**: Voice-to-Agent-Skill pipeline. **Free for now since PR #204** (the Edge Pro gate was removed: any authenticated user, including anonymous kit sessions, can build skills). Internal modules:
    - `index.ts`: orchestrator: memory context build, triage LLM call, quality-gate validation, ZIP packaging, `skill_exports` insert. (No longer runs an Edge Pro gate as of PR #204.)
    - `prompt.ts`: **tightened in PR #204** (no longer untouched). System + user prompts now check boundedness first, then run the FOUR Honest Tests (Test 4 = voice-lock / consistent creative output), inject a self-identified VOICE_PROFILE, forbid fabricated voice samples (reproduce the leader's real sample verbatim, else describe the register, never invent a quote), render a structured 8-dimension `voice-profile.md`, and require a `## Learning loop` section. Still encodes the triage + extraction rules and forwards the optional `SkillSeed` (kind + text) so extraction grounds in the leader's actual pain language.
    - `quality-gate.ts`: deterministic validator (5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections, no bare MUST/NEVER, valid name format, `## Learning loop` section present). Returns `{ checks: [...], summary: { passed, total } }`. As of PR #204 the gate passes **16/16** (the learning-loop check was previously failing). Only the name-format check is a hard fail; everything else is advisory and surfaced to the user.
    - `zip.ts`: agentskills.io-compliant packager. Single root folder, `SKILL.md` + `references/` (incl. a structured 8-dimension `voice-profile.md`) + `01-test-prompts.txt` + `02-maintenance-card.txt` + `03-install-guide.txt`. Returns base64 + byte length.

    Triage routing: when the input is really a Memory Fact / Custom Instruction / Saved Style, the function returns `{ triage: { passed: false, result, reasoning } }` (200 OK, no skill). The attempt is still logged in `skill_exports` with `triage_result` set accordingly so we can learn from misses without re-running the LLM.

61. **extract-voice-profile** (PR #204): paste real writing -> derive the 8 voice dimensions in one LLM pass. Anonymous-session safe; does NOT store the raw pasted text. Backs the paste-extract power path in `VoiceStyleProfileSheet`. The result is saved as the unified `ctrl_voice_profile` fact in `user_memory` (`fact_category` 'preference', `fact_subtype` 'communication_style'); `_shared/memory-context-builder.ts` surfaces it into generated skills, and the harness uses it.

The `mcp-context` MCP server gained two read-scope, Edge-Pro-gated tools in PR #204: **`list_skills`** + **`get_skill`**, so a leader's own agent pulls their built CTRL skills live. Combined with the `library/LibraryTab.tsx` "Connect these to your agent" MCP banner + per-item Download(.md), the three skill output destinations are now real: library (home) + MCP (live agent pull) + download.

#### Decision Engine Subsystem (not documented in earlier versions of this doc; added 2026-08-02)

The flagship decision-support pipeline. See `docs/CTRL-SYSTEM-SPEC.md` and the **Decision Engine** section of `FEATURES.md` for the full model; this is the backend inventory.

- **`decision-engine`** - the orchestrator. Runs in the background via `EdgeRuntime.waitUntil`: Stage 0 reframe (`reframe.ts`, AI-native classification + reframe, sanitized output as of PR #328) -> `decompose.ts` -> `verify.ts` (web-grounded claim evidence, plus `retrievers.ts` `searchArtificialAnalysis` for model-benchmark claims) -> `crossexamine.ts` -> `advise.ts`. `reliability.ts` + `reliability.test.ts` back the PR #328 hardening (reframe consistency, output sanitization). `eval/` (`golden-set.json` + `README.md`) is the calibration gate, wired into CI via a Vitest job (`4e78f2c`).
- **`decision-watch`** - hourly `pg_cron` WATCH loop; re-verifies load-bearing claims and raises idempotent `decision_alerts`.
- **`decision-eval`** - admin-only single-claim calibration harness.
- **`decision-reactions`** - reaction capture on decision cases (not documented previously).
- **`decision-research`** - the "Dig deeper" / strengthen research actions invoked from `DecisionAnatomy.tsx`.
- **`send-decision-summary`** - the "email this to me" checklist send: composes a branded HTML email (shares the kit email shell) with the decision framing, the call, what would change it, and the "what to check next" checklist (ticked items shown done), and mails it to the authenticated leader via Resend. The button always points at the hardcoded canonical host `https://ctrl.themindmaker.ai/decision`, never an unset/misconfigured `APP_URL`.

#### Re-engagement (PR #298, 2026-06-29; not documented in earlier versions of this doc)

- **`send-reactivation-nudge`** - daily `pg_cron` job (13:00 UTC, `verify_jwt=false`). Emails NEW (never-weighed-a-decision) and DORMANT (lapsed >14 days) leaders, de-duped on `leader_notification_prefs.reactivation_nudge_sent_at` (30-day re-arm), batch-capped. Lifecycle-driven, separate from the `daily_briefing` opt-in.

#### Kit Engine Subsystem (Phase 11, June 2026)

Five new edge functions back the class follow-up portal. They reuse the proven anonymous pipeline from `/build`: `kit-compose` imports `generate-skill-export`'s prompt / quality-gate / zip modules exactly the way `free-skill-export` does. The surgery on existing code was additive only - the `track-event` event list was extended and one advisory quality-gate check (for a "learning loop" section) was added. No existing pipeline behaviour changed.

61. **kit-redeem** - atomic, idempotent code redemption. Calls the `redeem_kit_code` RPC, starts/links the anonymous session's redemption, returns the kit state. Rate limited per-user, never per-IP (a venue shares one network, so per-IP would throttle the whole class).
62. **kit-compose** - background orchestrator via `EdgeRuntime.waitUntil`. Composes the pack from the student's intake + the class preset. Writes a `kit_builds` row up front (the row is the progress UX the client polls) and flips `artifact_statuses` as each artifact lands. **Partial-failure policy:** ships whatever artifacts succeed rather than failing the whole pack. Max 3 LLM calls: skill + batched polish + 7-day plan.
63. **kit-capsule-ingest** - context-capsule paste-back. Untrusted student-pasted text is fenced through the existing `extract-user-context` fact machinery rather than trusted raw, then folded into the redemption's context for regeneration.
64. **send-kit-pack** - emails the pack at the "send my pack" moment (the one point email is asked for).
65. **send-kit-nudges** - cron sweep for the day-3 / day-7 nudges. Skips any student who has already shipped (`kit_redemptions.shipped_at` set). Dedupes sends through the `kit_nudges` ledger. Driven by the `kit-nudges-email` pg_cron job.

**Kit Engine preset registry** (`supabase/functions/_shared/kit-presets/`): one shared module imported by **both** the Deno edge runtime (`kit-compose`) and the Vite client - the same cross-import pattern as `_shared/edge-pricing.ts`. The DB stores only `class_slug` + `preset_version`; all preset content (the artifact set, the intake questions, the 7-day plan shape) lives in code. Adding a new class is a new preset folder + a registry entry + one `kit_codes` row, not new code. Ships with two presets: `vibe-coding` (Vibe Coding Field Kit) and `autonomous-business` (Autonomous Business Pack).

**Shared Modules** (`supabase/functions/_shared/`):
- `context-builder.ts` / `memory-context-builder.ts`: LLM context construction
- `user-context.ts`: Profile projection (shared between briefing pipeline + diagnose endpoint)
- `briefing-lens.ts`: Importance lens (Stage 1+2 of v2 pipeline)
- `briefing-scoring.ts`: Embedding dedupe + scoring + exclude filter (Stage 4)
- `briefing-curation.ts`: Budget-constrained segment picker (Stage 5)
- `lens-signature.ts`: SHA-256 signature for stable feedback keying
- `training-loader.ts`: YAML voice guide loader (training_material table)
- `ai-cache.ts`: Generic AI + embedding response cache (24h lens cache, 7d embedding cache, backed by `ai_response_cache` table)
- `model-router.ts`: Vertex AI primary, OpenAI GPT-4o fallback, static tertiary
- `rateLimit.ts` / `rate-limiting.ts`: Per-user rate limiting (briefing rate-limit shipped Audit Week 1)
- `with-timeout.ts`: Timeout + retry wrapper for all external API calls (Audit Week 4)
- `logger.ts`: Structured JSON edge-function logger (Audit Week 5)
- `llm-quality-guardrails.ts`: LLM output validation
- `storage-utils.ts`: Supabase Storage helpers (`ctrl-briefings` bucket policy codified Audit Week 2)
- `email-utils.ts`: Resend email sending
- `validate-database.ts`: DB validation helpers
- `edge-pricing.ts`: canonical Edge Pro price ($49/month), cross-imported by Deno edge runtime + Vite client
- `kit-presets/`: Kit Engine class presets (Phase 11), cross-imported by `kit-compose` + Vite client the same way as `edge-pricing.ts`. The DB stores only `class_slug` + `preset_version`; preset content lives here. Ships with `vibe-coding` and `autonomous-business`.

---

## Data Flow

### Assessment Creation Flow

```
User completes assessment
         ↓
UnifiedAssessment.tsx collects data
         ↓
runAssessment.ts invoked
         ↓
1. Validate inputs (pipelineGuards.ts)
2. Calculate scores + behavioral adjustments
3. Call create-leader-assessment edge function
4. Store dimension scores
         ↓
Call ai-generate edge function:
├─ Plan A: Vertex AI (Gemini 2.0 Flash)
├─ Plan B: OpenAI GPT-4o
└─ Plan C: Static fallback content
         ↓
ai-generate produces all content:
├─ Personalised insights (edge, risk, next move)
├─ Thinking tools (prompt library)
├─ Strategic tensions
├─ Risk signals
├─ Org scenarios
└─ First moves (3 prioritised actions)
         ↓
Store results in respective tables
         ↓
Store assessment events (Q&A log)
         ↓
Store behavioral adjustments
         ↓
Store anonymised index data (if consent)
         ↓
Return assessmentId to UI
         ↓
Navigate to UnifiedResults.tsx
```

### Results Display Flow

```
UnifiedResults.tsx mounts
         ↓
aggregateLeaderResults() fetches data
         ↓
Queries:
├─ leader_assessments (for metadata)
├─ leader_dimension_scores (for scores)
├─ leader_insights (for edge/risk/move)
├─ leader_prompt_sets (for thinking tools)
├─ leader_tensions (for tensions)
├─ leader_risk_signals (for risks)
├─ leader_org_scenarios (for scenarios)
└─ leader_first_moves (for next steps)
         ↓
Aggregates into single result object
         ↓
Passes to tab components:
├─ LeadershipBenchmarkV2 (Overview)
├─ TensionsView (Tensions)
└─ PromptLibraryV2 (Tools)
         ↓
Components render data
```

### Voice Assessment Flow

```
User records voice responses
         ↓
VoiceOrchestrator.tsx manages flow
         ↓
1. CompassModule: 5 questions → transcripts
2. RoiModule: ROI estimation → transcripts
         ↓
Call compass-analyze edge function
   ↓
   OpenAI analyzes transcripts → scores, tier, focus areas
         ↓
Call roi-estimate edge function
   ↓
   OpenAI extracts ROI data → time saved, cost saved
         ↓
mapVoiceToAssessment() converts to V2 format
         ↓
DeepProfileQuestionnaire collects context
         ↓
runAssessment() with source='voice'
         ↓
[Same flow as quiz assessment]
```

### Memory Center Flow

```
User opens Memory Center (/memory)
         ↓
useMemoryQueries() fetches existing facts
         ↓
Voice-first input:
├─ VoiceMemoryCapture records speech
├─ voice-transcribe edge function transcribes
├─ extract-user-context extracts structured facts
└─ memory-crud stores encrypted facts
         ↓
Fact verification:
├─ Facts shown with confidence scores
├─ User verifies/corrects/rejects
├─ Verification status updated
         ↓
Privacy controls:
├─ memory-settings edge function
├─ Enable/disable auto-extraction
├─ Set retention period
└─ Export/import data
```

### Daily Briefing Flow (v2, evidence-based lens)

```
Dashboard mounts / user taps regenerate
         ↓
useBriefing hook invokes generate-briefing edge function
         ↓
generate-briefing:
  1. Auth + parse body (briefing_type, force, custom_context)
  2. Check v2 flag: request body > user_memory opt-in > env default
  3. Load user context (_shared/user-context.ts)
         ↓
  If v2:
  4. Build importance lens (_shared/briefing-lens.ts)
     ├─ loadInterests() → beats/entities/excludes
     ├─ deterministicLens() → weighted items from decisions/missions/objectives/watchlist
     ├─ Combine (interests prepended, weight 1.0, floor 0.8)
     ├─ Apply negative feedback deltas (briefing_lens_feedback)
     └─ LLM reweight (gpt-4o-mini, 24h cache, key = user+briefing_type+date+sig)
  5. Plan queries (gpt-4o-mini) from lens + training_material hot_signal_taxonomy
  6. Fan out to providers in parallel (Promise.allSettled, 12s cap)
     ├─ Perplexity (single call covering all queries)
     ├─ Tavily (per-query)
     └─ Brave (per-query)
  7. Embed + dedupe + score (_shared/briefing-scoring.ts)
     ├─ Single batched OpenAI embeddings call (candidates + excludes)
     ├─ Cosine-based exclude filter (drop near user excludes)
     ├─ Cosine dedupe (authority as tiebreaker)
     └─ Score each survivor against each lens item
  8. EARLY INSERT preliminary briefing row (frontend polls every 3s)
  9. Curate final segments (_shared/briefing-curation.ts)
     ├─ Read word_budget from training_material.structural_rubric
     ├─ gpt-4o-mini picks segments with diversity + coverage constraints
     └─ Returns segments with lens_item_id, relevance_score, matched_profile_fact
 10. Generate script (gpt-4o + training_material voice card + rubric + exemplars)
 11. Update briefing row with final segments + script
 12. Fire-and-forget synthesize-briefing (ElevenLabs MP3)
         ↓
Frontend polling picks up segments + audio_url
         ↓
BriefingCard renders inline with:
  - Framework tag + headline
  - "Anchored to: <lens item text>" chip
  - Bookmark (pin anchor as beat) / Ban (kill lens signature) buttons
  - Thumbs up/down with dwell_ms + lens_item_id capture
         ↓
Segments playable via BriefingSheet (full-screen slide-up)
         ↓
SeedBeatsPrompt shows above briefing if user has < 3 declared interests
```

**Learning loop:** every thumbs-down captures `lens_item_id`; the nightly `sp_aggregate_briefing_feedback` plpgsql function (scheduled via pg_cron at 03:07 UTC) promotes any signature with 3+ negatives to a persistent `-0.4` delta in `briefing_lens_feedback`. Explicit kills via the Ban button write `-1.0` immediately. `applyFeedbackDeltas` is invoked in both the cold and cached lens paths of `buildImportanceLens` so kills take effect without waiting for the 24h lens cache to expire.

### Missions Flow

```
After assessment, First Moves displayed
         ↓
FirstMoveSelector.tsx presents 3 moves
         ↓
User commits to a mission
         ↓
leader_missions record created (status: active)
         ↓
Periodic check-ins:
├─ MissionCheckIn.tsx captures reflection
├─ AI generates response
├─ leader_check_ins record created
         ↓
Progress tracking:
├─ generate-progress-snapshot captures state
├─ compute-drift measures change from baseline
├─ Progress.tsx displays trajectory
         ↓
Mission completion:
├─ Status updated to completed/skipped/extended
├─ MissionHistory.tsx shows all missions
```

---

## AI Integration

### LLM Architecture

**Primary**: Vertex AI (Gemini 2.0 Flash) via Google Cloud service account with OAuth token caching
**Fallback**: OpenAI GPT-4o

**Call Pattern** (in `ai-generate/index.ts`):
```typescript
// Plan A: Vertex AI
try {
  response = await tryVertexAI(context, prompt);
  generationSource = 'vertex-ai';
} catch (error) {
  // Plan B: OpenAI
  try {
    response = await tryOpenAI(context, prompt);
    generationSource = 'openai';
  } catch (error) {
    // Plan C: Static fallback
    response = getStaticFallback(scores, tier);
    generationSource = 'fallback';
  }
}
```

**Model Configuration:**
- Temperature: 0.7
- Max tokens: 4000
- Response format: JSON object with structured output

### Cognitive Framework Integration

The `ai-generate` function embeds five cognitive frameworks directly into prompts:

1. **A/B Framing**: Forces alternative perspectives on each recommendation
2. **Dialectical Reasoning**: Thesis-antithesis-synthesis for balanced insights
3. **Mental Contrasting (WOOP)**: Goals, obstacles, realistic planning
4. **Reflective Equilibrium**: Aligning with organizational principles
5. **First-Principles Thinking**: Breaking down assumptions

### Structured Outputs

Using Zod schemas for validation. Validation ensures required fields, correct types, min/max lengths, and enum value constraints.

### Quality Guardrails

- `_shared/llm-quality-guardrails.ts`: Output validation and filtering
- `_shared/ai-cache.ts`: Response caching for repeated patterns
- `_shared/rate-limit.ts`: Per-user rate limiting

---

## Pipeline Guarantees

### Type Safety

**Input Contracts** (`pipeline.ts`):
```typescript
interface PipelineSafeResponse<T> {
  success: boolean;
  data: T;
  generationSource: 'vertex-ai' | 'openai' | 'gemini' | 'fallback' | 'none';
  durationMs: number;
  error?: string;
}
```

### Fallback Strategies

**LLM Failures**:
1. Try Vertex AI (Gemini 2.0 Flash)
2. If fails, try OpenAI GPT-4o
3. If both fail, use generic fallbacks

**DB Failures**:
- Log error, return empty arrays, UI shows graceful message

---

## Authentication & Security

### Auth Flow

Using Supabase Auth:
1. User signs up with email/password or Google OAuth
2. Supabase creates user record
3. Frontend stores session in local storage
4. All edge function calls include auth token
5. Edge functions validate token via Supabase client

### Row-Level Security (RLS)

All user-facing tables have RLS policies:
- `leaders`, `leader_assessments`, `leader_insights`, `leader_prompt_sets`, etc.
- `leader_missions`, `leader_check_ins`: Own data only
- `user_memory`, `user_memory_settings`: Own data only

### Memory Encryption

- Content encrypted at rest using AES-256-GCM
- Encryption key in `MEMORY_ENCRYPTION_KEY` env var
- Decryption only in edge functions, never client-side

### RLS Security Fixes (2026-05-30)

Three tables were missing proper user-scoped RLS policies prior to the 2026-05-30 rebuild; all three are now fixed:

- `leader_missions`: policies now gate on `leaders.user_id` (via join to the `leaders` table), not just `leader_id`
- `leader_check_ins`: same pattern as `leader_missions`
- `leader_progress_snapshots`: same pattern
- `tts_config`: RLS was disabled; now enabled with read-only access for authenticated users
- `resend-webhook` edge function: now validates the Resend webhook signature before processing any payload

These changes close a class of horizontal-access bugs where one authenticated user could, in theory, read another user's mission, check-in, or snapshot rows if they knew the row ID.

---

## Attribution Emit Path (2026-05-30)

Captures first-touch marketing attribution end-to-end, from landing URL through to the central MindmakerOS warehouse.

```
Landing page load
        |
        v
Client captures UTM params on first touch:
  utm_source, utm_medium, utm_campaign,
  utm_content, utm_term, agent, campaign_id
        |
        v
Params persisted to localStorage (first-touch wins, not overwritten)
        |
        v
Signup / OAuth: params written into auth.users user_metadata
        |
        v
Stripe checkout: params stamped onto session metadata
        |
        v
Stripe webhook handler reads metadata, emits lifecycle event
  to the central MindmakerOS warehouse
  (Supabase project: gojpffsrxybbpbdzzrvs)
        |
        v
Warehouse ingest (dormant until WAREHOUSE_INGEST_URL env var is set)
```

**Key design notes:**

- First-touch attribution is preserved even if the user visits multiple times before signing up
- The emit is fire-and-forget; a missing or down warehouse endpoint does not break the checkout flow
- The warehouse env var (`WAREHOUSE_INGEST_URL`) is deliberately not set in production yet; the wiring is in place and activates when the var is set

---

## Product Analytics (2026-07-18, `43ecd6c`; not documented in earlier versions of this doc)

PostHog is wired into `index.html` as a plain inline `<script>` (no npm dependency, no separate SDK wrapper) - `window.posthog.init(...)` against `api_host: 'https://us.i.posthog.com'`, then `window.posthog.register({ product: 'mm_ctrl' })` so every event carries a `product` super-property. This lets CTRL share a PostHog project with the wider Mindmaker product surface without event collisions, while keeping the integration a two-line addition rather than a new dependency. Distinct from the `track-event` attribution proxy above (first-touch UTM/campaign attribution to the MindmakerOS warehouse) - PostHog is general product analytics, the attribution path is marketing-attribution-specific.

---

## Runtime Product-Truth Source (2026-05-30)

`https://ctrl.themindmaker.ai/.well-known/product.json`

A machine-readable JSON document served at this well-known path. It is the single authoritative source of pricing, ICP, and offer data for the entire MindmakerOS agent fleet. Any agent that needs to quote CTRL pricing or describe the offer fetches this endpoint rather than reading from training data.

**Served by**: a Vercel static route (or edge function) returning a pre-rendered JSON payload.

**Contents (canonical):**

```json
{
  "product": "CTRL",
  "url": "https://ctrl.themindmaker.ai",
  "pricing": {
    "free": "$0",
    "full_diagnostic": "$49 one-time",
    "deep_context_upgrade": "$29 one-time",
    "diagnostic_deep_context_bundle": "$69 one-time",
    "edge_pro": "$49/month",
    "bootcamp_teams": "$15K-$50K",
    "portfolio_partners": "$5K-$25K"
  },
  "icp": "C-suite / VP / Founder, 50-5000 employees, English-speaking, already using AI daily",
  "magic_moment": "one-click Context Export: first AI response unmistakably about them, not generic"
}
```

Agents must treat this endpoint as the ground truth and ignore any conflicting figures in static documentation.

> **KNOWN STALE (found during this 2026-08-02 pass, not fixed here - this file is docs-only and does not touch `public/`):** the live file at `public/.well-known/product.json` still lists `edge_pro` at **$29/mo** (and its own `guardrails` array says "never quote $9 (legacy grandfathered price)", itself now out of date) plus `"last_updated": "2026-05-30"`. The actual current Edge Pro price is **$49/month** (`supabase/functions/_shared/edge-pricing.ts`, PRs #326/#331, 2026-07-04). Since this endpoint is explicitly the machine-readable ground truth AI agents are told to trust over static docs, a stale price here is a live, production-serving inconsistency, not just a documentation gap. TODO(founder): update `public/.well-known/product.json`'s `pricing.tiers[edge_pro].amount` to 49 and its `guardrails` line, and bump `last_updated`.

---

## Public-Surface Prerender (2026-05-30)

The CTRL landing page (`/`) and any other public routes are pre-rendered at build time (or via Vercel's edge prerendering) to ensure:

1. **SEO**: Crawlers see fully-rendered HTML with correct meta tags, OG images, and structured data without executing client-side JavaScript
2. **Agent-readable surfaces**: AI agents scraping `ctrl.themindmaker.ai` for product context get complete HTML rather than a blank SPA shell
3. **Performance**: First Contentful Paint is not blocked on the React bundle

**Implementation**: Vite SSR prerender pass generates static HTML for public routes at build time. The `/.well-known/product.json` endpoint is served as a standalone static file, not part of the React app.

---

## Kit Engine Portal (Phase 11, 2026-06-10)

The Kit Engine is CTRL's class follow-up portal. It is a standalone, forced-dark, mobile-first surface (same `ctrl-ds` dark instrument palette as the rest of the app) that lives **outside** the authed app shell on four public routes (`/kit`, `/kit/me`, `/kit/me/intake`, `/kit/reading/:pageId`). It is also a bridge into the full CTRL app: intake answers seed the student's Memory Web, and a bridge card links to `/dashboard` after email capture.

> **Updated 2026-06-17, re-verified 2026-08-02:** the kit program grew to four documented kits (Agentic Org Chart added, all three prior kits retrofit to fork + pick-cascade) and PR #193 fixed a latent cascade bug plus added an honesty floor. A 5th preset (`chief-of-staff`) exists in the codebase, undocumented until this pass. The current program is documented in the **Kit Engine** section below; the description here covers the original Phase 11 portal architecture, which still holds.

### Anon-first identity

Code entry on `/kit` starts an anonymous Supabase session via `ensureAnonSession`. The student answers the intake and gets their pack with no login. Email is asked once, at the "send my pack" moment, and `upgradeAnonymousSession` upgrades the anonymous account in place so the student keeps the same `auth.uid()` (and therefore the same redemption, builds, and artifacts) after they convert.

Because an anonymous session carries a real `auth.uid()` with role `authenticated`, the owner-scoped RLS on the four student-facing kit tables works exactly as it does for a logged-in user. No special anon policies were needed.

### Reuse of the proven pipeline

`kit-compose` reuses the anonymous `/build` pipeline rather than a new one: it imports `generate-skill-export`'s prompt / quality-gate / zip modules exactly the way `free-skill-export` does. The only changes to existing code were additive - the `track-event` event list gained the kit events, and one advisory quality-gate check (for a "learning loop" section in the pack) was added. No existing pipeline behaviour changed.

### Why ZIPs are base64 in the DB, not a Storage bucket

Kit artifact ZIPs are stored inline as base64 on the `kit_artifacts` row (`zip_base64`), not in a Supabase Storage bucket. Two reasons:

1. **Storage RLS can't be provisioned the way the rest of the schema is.** Object-level RLS policies on `storage.objects` cannot be created via the Supabase Management API - the role used does not own that relation. Keeping artifacts in a normal table keeps them under the same owner-scoped RLS as everything else in the schema, provisioned the same way.
2. **The artifacts are small**, and the row persists for the life of the redemption, so the pack stays downloadable indefinitely.

This is the same pattern `free-skill-export` already uses for its skill ZIPs.

### Portal owns its own scroll

The app shell sets `html` / `body` / `#root` to `overflow: hidden` (the no-scroll pattern used across CTRL). The kit page is long, so `KitPortalLayout` is a fixed-height flex column with a single scrollable `main`, mirroring the mobile no-scroll layout pattern documented above. A bug where the long kit page was clipped at one viewport on mobile was found and fixed during testing.

### Background compose + progress

`kit-compose` runs via `EdgeRuntime.waitUntil`. It writes a `kit_builds` row first; that row **is** the progress UX - the client polls it and watches `artifact_statuses` flip per artifact. Compose ships whatever artifacts succeed (partial-failure policy) and caps at 3 LLM calls (skill + batched polish + 7-day plan).

### Entitlement

Redeeming grants a 30-day pass + a 3-net-new-build quota on `kit_redemptions`, guarded by the atomic `redeem_kit_code` (row-locks the code against a simultaneous-class race; idempotent) and `consume_kit_skill` RPCs, both `SECURITY DEFINER` with no anon/authenticated execute grant. The Edge Pro upsell ($49/month, canonical `_shared/edge-pricing.ts`) shows only post-trust (quota hit, pass expiry, regenerate-after-expiry) and never gates what was already delivered.

### Verification

Verified live end to end against the production Supabase project on the original two presets (`vibe-coding`, `autonomous-business`) before merge: redeem, intake, real-LLM compose, ZIP download, journey, ship.

---

## Kit Engine (5-kit program as of 2026-08-02, was documented as 4 through 2026-06-17)

The Phase 11 portal (above) was a 2-preset engine. The kit program grew into a 4-kit program (below), and **a 5th preset exists in the current codebase that was not documented in any earlier version of this file**: `supabase/functions/_shared/kit-presets/chief-of-staff/` (registered in `kit-presets/index.ts`).

**The five kit presets (`supabase/functions/_shared/kit-presets/`):**
1. **Vibe Coding Field Kit** (`vibe-coding`) - original.
2. **Autonomous Business Pack** (`autonomous-business`) - original.
3. **Memory & Identity Prompt Pack** (`memory-identity`, code MEMORY-JUN26) - original.
4. **Agentic Org Chart** kit - added in PRs #190 / #191. Composes an org chart of agent-led vs human-led boxes from the student's intake.
5. **Build Your AI Chief of Staff** (`chief-of-staff`) - the only DECISION kit (the other four build an artifact; this one diagnoses). A linear intake (one chip question per screen, no self/business fork) feeds a deterministic scorer (`scoring.ts`, described in its own header comment as "a verbatim port of [a] field guide's Section 10") that recommends one of seven "rungs" for building a personal AI chief of staff; the LLM only warms up the prose (`prompts.ts`), the recommendation/ranking/guardrails are computed deterministically. Backed by its own unit tests (`preset.test.ts`, `scoring.test.ts`). TODO(founder): confirm whether this preset has a live `kit_codes` row (is actually redeemable today) or is shipped-in-code-but-not-yet-launched - that is DB state this doc cannot verify from source alone.

**Parity retrofit (PR #192):** all three pre-existing kits were retrofit to the same model the org-chart kit introduced - **fork** (a kit can be forked per student), **pick-cascade** (a sequence of pick steps where each pick narrows the next), and a **live picks-board** (the running picks are shown back to the student as they go).

**PR #193 (merge 090dda2, 2026-06-17) - two fixes, both prod-verified:**

1. **The cascade bug (latent since kit launch).** The forked-kit intake silently dropped the back half of every kit's pick-cascade for **all** users. A deferred single-select auto-advance closed over a stale `steps.length`, so the cascade stopped early. For the org-chart kit specifically, every build in `kit_builds` only ever captured `[boxes, pathway, profile, timeSink]` - the later steps `guardrails`, `grind`, `involves`, and `maturity` were **never captured**. Fixed by reading live refs in `goNext` instead of the stale closed-over length.
   - **Consequence for the data:** every `kit_builds.intake` row written **before** PR #193 is **TRUNCATED and untrustworthy** - the back-half answers were never recorded. Do not trust historical kit intake data for analysis.
2. **The honesty floor on the composed org chart.** A box that touches a flagged guardrail can now **never** be left agent-led. This is a hard floor in the compose step, not advice - if the student flagged a guardrail on something a box touches, that box is forced human-led.

**Honesty/method note:** the cascade bug is a textbook stale-closure-over-`length` defect (the same class of bug as the stale-`setTimeout`-closure lessons elsewhere in this codebase). The fix and the honesty floor both encode the project method: lock the rule (what must never happen) before composing, and disclose the truncated historical data rather than hiding it.

---

## Deployment

### Frontend

**Build**: `npm run build`
**Hosting**: Vercel (auto-deployed on git push)

### Backend

**Edge Functions**: Deployed via Supabase CLI
**Database Migrations**: `supabase/migrations/` (148 files, counted 2026-08-02). The local migration history is out of sync with remote, so `supabase db push` is NOT used (per `CLAUDE.md`); migrations are applied by running SQL directly via the Supabase Management API against project `bkyuxvschuwngtcdhsyg`.

### Environment Variables

**Frontend (Vercel)**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Backend (Supabase Secrets)**:
- `OPENAI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_KEY` (Vertex AI)
- `MEMORY_ENCRYPTION_KEY`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_SHEETS_CREDENTIALS`

---

## Testing

### Current State

**Vitest** (`vitest.config.ts`): 29 unit/shared spec files (counted directly 2026-08-02, up from 6 on 2026-06-21). Representative, not exhaustive:
- `src/__tests__/api.test.ts`, `authMachine.test.ts`, `renderMarkdown.test.ts`, `training.test.ts`
- `src/__tests__/capabilityLadder.test.ts`, `cardForYou.test.ts`, `newsPriority.test.ts`, `roleArchetype.test.ts`, `starterDecisions.test.ts`, `trendCard.test.ts` (curation system + capability ladder + home)
- `src/components/operator/decision/{decisionMemo,decisionParts,decisionRunningModel,decisionSpiderModel,evidenceGrouping,resolveFlow}.test.ts` (Decision Engine UI models - the bulk of the growth since 2026-06-21)
- `supabase/functions/decision-engine/reliability.test.ts`, `supabase/functions/_shared/{decision-ai-native,correction-guard,sanitize,brain-profile,news-ai-native,news-cluster,news-sources,news-trends,personalization-core,with-timeout}.test.ts`
- `supabase/functions/_shared/kit-presets/chief-of-staff/{preset,scoring}.test.ts`

**Playwright** (`playwright.config.ts`, `testDir: src/__tests__/e2e`): 8 e2e specs (counted directly 2026-08-02):
- `src/__tests__/e2e/auth-journeys.spec.ts`
- `src/__tests__/e2e/briefing-journey.spec.ts`
- `src/__tests__/e2e/briefing-rate-limits.spec.ts`
- `src/__tests__/e2e/sparse-profile.spec.ts`
- `src/__tests__/e2e/account-deletion.spec.ts`
- `src/__tests__/e2e/stripe-webhook-idempotency.spec.ts`
- `src/__tests__/e2e/desktop-zero-scroll.spec.ts` (Phase 10: asserts the desktop shell never scrolls the window)
- `src/__tests__/e2e/kit-redeem-journey.spec.ts` (not previously documented)

**CI gates** (`.github/workflows/ci.yml`): four blocking checks per PR (a Vitest job was added, `4e78f2c`, wiring in the decision-engine eval gate - the third gate below is new since the prior reconciliation):
1. Typecheck (`tsc --noEmit`)
2. Full Vite build
3. `npx vitest run` (all 29 spec files, including the decision-engine sanitizer/reframe-consistency checks)
4. ESLint on PR diff (~1600 pre-existing warnings accepted as technical debt; new lint regressions blocked)

**Manual Testing Checklist**:
- [ ] Quiz assessment completes successfully
- [ ] Voice assessment completes successfully
- [ ] Results display correctly (Overview, Tensions, Tools)
- [ ] Free tier shows limited content
- [ ] Paid upgrade flow works
- [ ] Memory Center: create, read, update, delete, verify/correct/reject a fact
- [ ] Decision Engine: weigh a decision end to end, checklist email, resolve/close
- [ ] Mobile responsive, no-scroll on mobile pages

(The prior checklist's "First Moves display and mission commitment works", "Progress: snapshots generate correctly", and "Weekly Check-in: submission and AI response" items were dropped from this list because those UI surfaces no longer exist - see the Missions System / Progress Tracking / Weekly Check-ins status notes in `FEATURES.md`.)

---

## Dependencies

### Core Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "@supabase/supabase-js": "^2.50.3",
  "@tanstack/react-query": "^5.56.2",
  "framer-motion": "^12.24.10",
  "tailwindcss": "^3.4.19",
  "lucide-react": "^0.462.0",
  "zod": "^3.23.8",
  "typescript": "^5.5.3",
  "vite": "^5.4.1"
}
```

### Constraints

- **No backend code execution**: Only edge functions (Deno runtime)
- **Node.js requirement**: >=22 <24
- **LLM rate limits**: Vertex AI quotas, OpenAI tier limits
- **AI API costs**: ~$0.01-0.02 per assessment (Vertex AI primary)
