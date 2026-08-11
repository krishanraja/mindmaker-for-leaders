# Architecture

Complete system architecture and data flow documentation.

**Last reconciled:** 2026-08-10.

> **Current release overlay. This supersedes conflicting historical detail below.** CTRL is one product at `makeyourmindup.ai`; Make Your Mind Up is its public intake, not a second application. Recounted at this release: **113 Edge Function directories** excluding `_shared`, **78 hook files**, and **158 SQL migrations**. The primary runtime chain is `public intake -> consented handoff -> First Lens -> shared curation pool -> per-user rank -> Today / briefing / delivery -> reactions and corrections -> memory`. Control Center enters the existing shared pool through a publishable key constrained by read-only RLS. Daily prewarm and email delivery use a Vault-generated shared secret, not the absent legacy Postgres service-role setting. The fifteen release-critical functions have explicit JWT/custom-auth contracts; paid audio synthesis also verifies briefing ownership. The Kit is retired. Automator/Skill Builder is not a primary surface; Blind Spot is the leadership-development experience. Sections below remain a deep historical reference and are not a current product map where they disagree with this overlay, the root README, or code.

> **Positioning (LOCKED 2026-06-19)**: CTRL is the tool for building, orchestrating, productizing, and getting to market **the AI-native version of your business**, not a general business advisor. General-business inputs are reframed into the AI-native lens. The canonical product/build specs are `docs/MAIN-APP-POLISH-SPEC.md` (the main app) and `docs/KIT-REDESIGN-SPEC.md` (the lesson kits); trust those + the root `README.md` + `CLAUDE.md` over this doc where they disagree. This file is technically current on the dark redesign, the brain engine, the routes, and the kit engine plumbing; the LATEST layer it predates in prose is the kit redesign (PRs #206-212) and the main-app polish (PRs #215-222: the AI-native decision reframe, the 9 AI-native news category motifs + AI-native-filtered briefing pipeline, the brain-canvas squash fix, and the no-scroll/one-ask sweep). For those, see the two specs and `CLAUDE.md`. The counts below have been re-counted as of 2026-07-26 (see next note).

> **Post-2026-06-21 layers this doc still narrates only in outline (full detail in `CLAUDE.md`'s Architecture Quick Reference):** the CTRL 2028 radical-focus refactor (PRs #234-241) replaced `CockpitHome.tsx`/`CockpitDeck.tsx` with `HomeFeed.tsx` + `DesktopHomeView.tsx` and deleted the `VITE_COCKPIT_ENABLED` fork entirely (both `CockpitDeck` and the flag are gone, not just superseded); the unified onboarding->decisions->engagement loop (PR #298); evidence-corpus sharpening (PR #321: real correction loop, decision memo, live MCP-gated brain actions, capability ladder); the settings audit / one-door tuning (PR #325); the Decisions tab rebuilt as a radial force spider (PR replacing the claim "ladder"); the Edge Pro money-path repair + $49/decision-tier reposition (PRs #326-327); the decision-engine reframe/sanitize/eval-gate hardening (PR #328); the North Star flywheel instrumentation (PR #330, see `NORTH_STAR.md`); the craft+growth pass adding the static `/pricing` page + collapsible desktop nav (PR #329), later corrected and split so `/pricing` is the static SEO page and `/upgrade` is the live checkout (PR #331); news "shift"/trend cards (PR #332); the `/download` public capture page (PR #333); Home card glance/tap-to-read rework (PRs #322-324, #334); and PostHog product analytics (added directly to `index.html`, 2026-07-18).

> **Curation system (2026-06-28, PRs #287, #293-296; LIVE)**: the Home news deck, the Tune controls, the role/business scoring, the loading globe, and the audio Briefing are ONE system over ONE brain. Canonical, crystal-clear methodology + architecture: **`docs/CURATION-SYSTEM-SPEC.md`** (read it before any Home-feed / Tune / briefing-curation work). Headline mechanics: a chosen Tune lane DOMINATES the feed (`newsPriority.ts` `BOOST_BLOCK`, uncapped) ordered by role-archetype + industry fit (`roleArchetype.ts`, inferred from facts already held, no new questions), with a guaranteed on-topic floor of 3 (`laneReserve.ts`); Tune applies live (shared `useNewsPreferences` store); and the Briefing draws from the same `live_headlines_cache` pool + carries the tuning into its lens (flags `BRIEFING_V2_ENABLED_DEFAULT` / `BRIEFING_USE_BRAIN_PROFILE` / `BRIEFING_SOURCE_SHARED_POOL` all ON). The three main areas' purpose/objectives/outcomes live in `docs/CTRL-SYSTEM-SPEC.md` section 7.
>
> **Brand + redesign (2026-06-16, PR #186 merge 1c01db5)**: CTRL is now **globally forced dark** (`index.html` ships `class="dark"`), on the `ctrl-ds` instrument palette with emerald `#00D9B6` as primary (`--primary 171 100% 43%`), and the emerald `ctrl.` wordmark replacing the old green Mindmaker logo everywhere. It is NOT light-mode, NOT warm off-white, NOT white cards, NOT the green logo. Any older assertion in this doc to that effect has been corrected inline. See the **Redesign** section below. The redesign rebuilt the mobile cockpit, decision spine, StoneRead, the brain four-world rope canvas, capture, and onboarding, all prod-verified with screenshots.
>
> **Brain engine (PRs #153-164; "limits" phases #187-189)**: fact-to-fact edge graph, Strengthen/Fix RPCs, reliable reaction numbers, evidence tiers, track-record depth. Migrations `20260615*_brain_*` + `20260616120000_memory_edges`. See the **Brain Engine** section below. Honest gaps: Strengthen/Fix canvas actions are UI-disabled (no backend RPC); brain edges are derived-not-stored; number-heroes fall back to words-led on thin current data.
>
> **Kit program (4 kits at `/kit`)** - **RETIRED 2026-08-07 (PR #355): the Kit is gone; `/kit*` 301s to `/try`.** Everything below is history: Agentic Org Chart kit (PRs #190/#191); parity retrofit of all 3 existing kits to fork + pick-cascade + live picks-board (#192); PR #193 (merge 090dda2, 2026-06-17) fixed a latent cascade bug that silently dropped the back half of every kit's intake since launch, plus added an honesty floor to the composed org chart. **Pre-#193 `kit_builds.intake` rows are TRUNCATED and untrustworthy.** See the rewritten **Kit Engine** section below.
>
> **UX redesign (2026-06-17, PRs #197-200; latest layer on top of everything above; all merged to main + prod-verified on `ctrl.themindmaker.ai`)**: the mobile cockpit Home, the Decision Map, and the Automator (Skill Builder entry) were rebuilt, and a `BrandLockup` (Mindmaker icon + `ctrl-logo.png` wordmark) replaced the generated `ctrl.` text in headers/sidebars. Home now leads with a time-aware greeting + a swipeable "worth a look" deck (`CockpitDeck`) + 3 value actions (the cryptic "strongest signal" hero and the wall of AI-bets were removed; bets moved off Home). The Decision Map is now ONE pinned-decision hero with a descriptive (never recommended) status + a connector rail of considerations; the long-press contest scroll-popup was killed in favour of a quiet "Flag it". The `/context` default is now the Automator flow (brain-mined deliverable suggestions to a recognition pick-cascade to skill-ready export); the old `SkillCaptureSheet` / `SkillPreviewSheet` are now dead code. See the **UX Redesign** section below; the Skill Builder description further down has been corrected to match.
>
> **Unified onboarding → decisions → engagement loop (2026-06-29, PR #298; LIVE)**: the cockpit is now the ONE home and the `VITE_COCKPIT_ENABLED` flag is RETIRED, so any reference below to "cockpit Home (behind `VITE_COCKPIT_ENABLED`)", to `MobileMemoryDashboard` / `DesktopMemoryDashboard`, or to the voice `OnboardingInterview` is HISTORICAL - those were deleted. Entry/re-entry is now state-adaptive: `useCockpit` derives a `userState` (new/dormant/active/power) → a `posture` (`guide` vs `partner`) on `CockpitData`; onboarding is lightweight + inline (`InlineProfileSetup` writing industry/role to `user_memory` + interests via `SeedBeatsPrompt`); the guide posture leads Home with a `KickstartCard` routing a role-tailored starter (`src/lib/starterDecisions.ts`) into `/decision` pre-filled; and `send-reactivation-nudge` (daily cron) re-engages NEW and DORMANT leaders. `BottomNav` is the single 3-tab cockpit nav. Canonical: `docs/CTRL-SYSTEM-SPEC.md` section 8.
>
> **Verified counts (as of 2026-06-09)**: 7 e2e specs, 6 vitest specs, pgvector + pgcrypto + pg_cron extensions enabled, 6 audit-week tracks shipped (revenue path, data path, UX, reliability, observability, cleanup), Phase 8 shipped (Skill Builder + desktop UI redesign + pain-anchored entry points), Phase 9 shipped (Decision Engine + flag-gated Briefing streaming + cross-tenant RLS hardening), Phase 10 shipped (every authenticated surface unified onto `DesktopShell`, viewport-pinned zero-scroll, Goals + Enrich loop).
>
> **Phase 11 additions (2026-06-10, PR #141)**: Kit Engine class follow-up portal. +5 edge functions (`kit-redeem`, `kit-compose`, `kit-capsule-ingest`, `send-kit-pack`, `send-kit-nudges`), +6 tables (`kit_codes`, `kit_redemptions`, `kit_builds`, `kit_artifacts`, `kit_journey_events`, `kit_nudges`), +3 hooks (`useKitRedemption`, `useKitBuild`, `useKitArtifacts`), +4 public routes (`/kit`, `/kit/me`, `/kit/me/intake`, `/kit/reading/:pageId`), +1 shared preset module (`_shared/kit-presets/`), +1 pg_cron job (`kit-nudges-email`).
>
> **Re-counted 2026-08-10: 113 Edge Function directories** in `supabase/functions/` excluding `_shared`, **158 SQL migrations**, and **78 hook files**. Re-count before quoting; counts are descriptive, not contracts.

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

## UX Redesign (2026-06-17, PRs #197-200)

The latest layer on top of the PR #186 redesign. Home, the Decision Map, and the Automator (the Skill Builder entry on `/context`) were rebuilt, plus a shared brand mark. All merged to main and prod-verified on `ctrl.themindmaker.ai`.

### Cockpit Home (PR #197, merge 7b5f0ef)

The mobile cockpit Home (behind `VITE_COCKPIT_ENABLED`) was rebuilt. `CockpitHome.tsx` was rewritten.

- **Removed:** the cryptic "strongest signal" hero and the wall of identical AI-bets. Bets moved off Home.
- **Added:** a time-aware greeting + a swipeable **"worth a look" deck** (new component `src/components/cockpit/CockpitDeck.tsx`) + 3 value actions (Play my briefing to `/briefing`, Run a decision to `/decision`, Build a skill to `/context`).
- **The deck** mixes broad AI news (from the briefing pipeline's curated `briefings.segments`) and the leader's own signals (`decision_alerts` via `useDecisionInbox`). Swipe heart = more-like-this, skip = dismiss; it renders a peeking stack + dots.
- **`useCockpit` (`src/hooks/useCockpit.ts`)** now also returns `recordDeckReaction` and assembles the deck by interleaving news segments + own-signal alerts, sliced to 5, with disliked categories down-weighted (no new backend table).
- **Types (`src/types/cockpit.ts`):** new `DeckCard` / `DeckCardKind` types and a `deck` field on `CockpitData`.

### Brand lockup (PR #197; desktop placements PR #200, merge 387af84)

`src/components/landing/BrandLockup.tsx` is the Mindmaker icon (`mindmaker-icon.png`) + the `ctrl-logo.png` wordmark, replacing the generated `ctrl.` text. Used in the mobile `AppHeader`, `DesktopShell`'s `DesktopRail`, the memory-web `DesktopSidebar`, and the legacy dashboard/desktop `Sidebar` (the desktop placements landed in follow-up PR #200).

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

### Deck persistence + feed-training (PR #200, merge 387af84)

A swipe writes a `deck_reaction` JSON row to the existing `feedback` table (`page_context` 'cockpit-deck', no new migration). `useCockpit` reads 30 days of dislikes and down-weights those news categories.

**Honest residuals:** the old `SkillCaptureSheet` / `SkillPreviewSheet` are dead code; "Run it now" downloads the skill (no in-app skill-runner yet); the deck's news half depends on a briefing existing.

---

## Brain Engine (PRs #153-164; "limits" phases #187-189)

The Brain is CTRL's memory-as-a-graph layer: the leader's facts connected to each other, with reaction signals, evidence tiers, and a track record.

**What shipped:**
- **Fact-to-fact edge graph.** Facts are connected by edges (e.g. a fact supports, tensions with, or follows from another). Rendered as the four-world rope canvas (see Redesign).
- **Strengthen / Fix RPCs.** Backend RPCs intended to strengthen or fix a fact / edge.
- **Reliable reaction numbers.** Reaction counts on facts are now computed reliably (the "limits" phases hardened the numbers).
- **Evidence tiers.** Facts carry an evidence tier.
- **Track-record depth.** The brain shows the track record behind a fact over time.

**Migrations:** `20260615*_brain_*` and `20260616120000_memory_edges`.

**Honest gaps (disclose, never hide):**
- The **Strengthen / Fix actions on the brain canvas are UI-disabled** - the buttons exist but there is no backend RPC wired behind them yet.
- **Brain edges are derived, not stored.** The edge graph is computed at read time, not persisted as rows. ("verified storage model pending re-check" if this changes.)
- **Number-heroes fall back to words-led on thin current data.** When a leader does not yet have enough current data for a numeric hero stat, the UI falls back to a words-led presentation rather than showing a misleading number.

---

## Frontend Architecture

### Directory Structure

```
src/
├── components/
│   ├── ui/                    # shadcn components (DO NOT EDIT)
│   ├── auth/                  # Authentication flows (AuthProvider, RequireAuth)
│   ├── voice/                 # Voice assessment components
│   ├── landing/               # Landing page components
│   │   ├── HeroSection.tsx    # Landing page hero with video background
│   │   ├── CtrlLogo.tsx       # Renders the emerald `ctrl.` wordmark (now superseded by BrandLockup in app headers/sidebars)
│   │   ├── BrandLockup.tsx    # App brand mark: Mindmaker icon (mindmaker-icon.png) + ctrl-logo.png wordmark; replaced the generated `ctrl.` text (PR #197; desktop placements #200)
│   │   └── TrustIndicators.tsx
│   ├── dashboard/             # Dashboard hub (renders Memory Web or Edge)
│   │   ├── DashboardProvider.tsx  # Dashboard data context
│   │   ├── HeroStatusCard.tsx
│   │   ├── WeeklyActionCard.tsx
│   │   ├── DailyProvocationCard.tsx
│   │   ├── PatternInsight.tsx
│   │   ├── desktop/
│   │   │   ├── DesktopDashboard.tsx  # Sidebar + content grid
│   │   │   ├── Sidebar.tsx           # Legacy sidebar (pre-Memory Web)
│   │   │   └── Panel.tsx
│   │   └── mobile/
│   │       ├── MobileDashboard.tsx
│   │       ├── BottomNav.tsx
│   │       ├── VoiceButton.tsx
│   │       ├── VoiceFAB.tsx
│   │       ├── Sheet.tsx
│   │       ├── HeroStatusCard.tsx
│   │       ├── PriorityCardStack.tsx
│   │       ├── ActionQueueSheet.tsx
│   │       └── StrategicPulseSheet.tsx
│   ├── memory-web/            # Memory Web dashboard (primary dashboard view)
│   │   ├── MobileMemoryDashboard.tsx
│   │   ├── DesktopMemoryDashboard.tsx
│   │   ├── DesktopSidebar.tsx     # Primary desktop nav (Home, Edge, Memory Web, Export)
│   │   ├── BottomNav.tsx          # Primary mobile nav (Home, Edge, Memory, Export)
│   │   ├── AppHeader.tsx
│   │   ├── GuidedFirstExperience.tsx  # Onboarding for new users
│   │   ├── MemoryWebVisualization.tsx
│   │   ├── MemoryHealthViz.tsx
│   │   ├── MemoryPulseBar.tsx
│   │   ├── CategoryChart.tsx
│   │   ├── IntelligencePanel.tsx
│   │   ├── RecentFactsFeed.tsx
│   │   ├── PatternInsightCard.tsx
│   │   ├── SkillExportCard.tsx    # /context Step 1 entry-point card for the Skill Builder (free for now since PR #204; was Edge Pro gated) (v5.2)
│   │   ├── VoiceStyleProfileSheet.tsx  # Captures the unified ctrl_voice_profile: 5 recognition picks OR a paste-extract power path (PR #204)
│   │   └── GettingSmarterBanner.tsx
│   ├── cockpit/               # Home feed (the one Home for mobile + desktop; VITE_COCKPIT_ENABLED flag was retired)
│   │   ├── HomeFeed.tsx            # Home model: browsable headlines + own-signal alerts + 3 doors, replaces the deleted CockpitHome/CockpitDeck (CTRL 2028 refactor, PRs #234-241)
│   │   └── DesktopHomeView.tsx     # Desktop rail rendering of the same Home model
│   ├── automator/             # Automator: default Skill Builder flow on /context (PR #199)
│   │   ├── AutomatorFlow.tsx      # Suggestions -> cascade -> skill-ready orchestrator
│   │   ├── AutomatorSuggestions.tsx  # Brain-mined deliverable suggestions ("pulled from your brain" badge) + inline "Something else"
│   │   ├── AutomatorCascade.tsx   # ~5-step all-recognition pick-cascade (reuses the kit cascade pattern)
│   │   ├── AutomatorSkillReady.tsx   # "Built your way" chips + Run it now + Export markdown + "Your skills" peek
│   │   ├── AutomatorScaffold.tsx  # Desktop two-pane: live "your skill is taking shape" panel beside the flow; widened max-w-4xl, mobile unchanged (PR #204)
│   │   └── automatorModel.ts      # composeTranscript maps picks into a transcript for generate-skill-export
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
│   │   ├── AutomatePainCard.tsx   # Skill Builder pain-anchored entry chip row (v5.2)
│   │   ├── SkillCaptureSheet.tsx  # DEAD CODE (PR #199): voice/text capture, no longer imported; superseded by the Automator flow
│   │   ├── SkillPreviewSheet.tsx  # DEAD CODE (PR #199): skill preview + ZIP download, no longer imported; superseded by AutomatorSkillReady
│   │   ├── SkillQualityGate.tsx   # Quality checklist display (v5.2)
│   │   └── SkillInstallGuide.tsx  # Per-tool install instructions (Claude Code / Claude.ai / Cursor) (v5.2)
│   ├── action/                # Weekly action components
│   ├── ai-chat/               # AI chat components
│   ├── analytics/             # Analytics components
│   ├── diagnostic/            # Diagnostic-specific components
│   ├── insight/               # Insight display components
│   ├── memory/                # Memory Center components (11 files)
│   │   ├── MemoryList.tsx
│   │   ├── AddMemorySheet.tsx
│   │   ├── MemoryDetailSheet.tsx
│   │   ├── MemoryItemCard.tsx
│   │   ├── MemoryPill.tsx
│   │   ├── FactVerificationCard.tsx
│   │   ├── VoiceMemoryCapture.tsx
│   │   ├── PrivacyControlsPanel.tsx
│   │   ├── ExportImportPanel.tsx
│   │   └── MemoryErrorBoundary.tsx
│   ├── missions/              # Missions system components
│   │   ├── FirstMoveSelector.tsx
│   │   └── MissionsDashboard.tsx
│   ├── mobile/
│   │   └── MobileLayout.tsx   # Mobile viewport wrapper
│   ├── onboarding/            # Onboarding flow components
│   ├── operator/              # Operator tools components
│   ├── progress/              # Progress tracking components
│   ├── provocation/
│   │   └── DailyProvocation.tsx
│   ├── pulse/
│   │   └── StrategicPulse.tsx
│   ├── settings/              # Settings components
│   ├── sharpen/               # Sharpen analysis components
│   │   ├── CopyablePrompt.tsx
│   │   ├── InsightCard.tsx
│   │   ├── LoadingState.tsx
│   │   └── VoiceInput.tsx
│   ├── team-instructions/     # Team instruction generation
│   ├── UnifiedAssessment.tsx  # Quiz + voice assessment orchestrator
│   ├── UnifiedResults.tsx     # Results page with tabs
│   ├── LeadershipBenchmarkV2.tsx  # Overview tab
│   ├── PromptLibraryV2.tsx    # Tools tab
│   ├── TensionsView.tsx       # Tensions tab
│   ├── ConsentManager.tsx     # Privacy/consent tab
│   ├── SingleScrollResults.tsx # Single-page results view
│   ├── AssessmentHistory.tsx  # Past assessments
│   ├── BenchmarkComparison.tsx
│   ├── PeerBubbleChart.tsx
│   ├── PeerComparisonMobile.tsx
│   ├── MomentumDashboard.tsx
│   ├── ErrorBoundary.tsx
│   └── [Other components]
├── contexts/
│   ├── AppStateContext.tsx    # Global app state management
│   └── AssessmentContext.tsx  # Assessment flow state
├── hooks/                     # 78 hook files (re-counted 2026-08-10)
│   ├── useStructuredAssessment.ts
│   ├── useRealtimeAssessment.ts
│   ├── useAILiteracyAssessment.ts
│   ├── useUserState.ts
│   ├── useAuth.ts
│   ├── useDevice.ts
│   ├── useEdge.ts             # Edge profile data + synthesis
│   ├── useEdgeSubscription.ts # Edge Pro subscription state
│   ├── useSkillExport.ts      # Skill Builder pipeline (v5.2): wraps generate-skill-export, decodes base64 ZIP into a Blob
│   ├── useSkillSuggestions.ts # Automator suggestions: brain-mined deliverables (user_memory blockers + decisions) + role/sector fallback (PR #199); warm-start "your peers are using this" voice grounded in role + company profile, optional "Add your company site" -> enrich-company-context re-mine (PR #204)
│   ├── useVoiceProfile.ts     # Unified ctrl_voice_profile fact CRUD (user_memory preference / communication_style); save enum bug fixed 'confirmed' -> 'verified' (PR #204)
│   ├── useCockpit.ts          # Cockpit Home data; returns recordDeckReaction + assembles the "worth a look" deck (interleave + dislike down-weight) (PRs #197/#200)
│   ├── useUserPains.ts        # Top blockers + active decisions, drives pain-anchored entry points (v5.2)
│   ├── useRevealOnMount.ts    # Smooth reveal helper for below-the-fold components (v5.2)
│   ├── useMemoryQueries.ts    # Memory Center queries
│   ├── useMemoryWeb.ts        # Memory Web dashboard data
│   ├── useMemoryExport.ts     # Context export logic
│   ├── useUserMemory.ts       # Memory state management
│   ├── useGuidedCapture.ts    # Onboarding guided capture flow
│   ├── useMarkdownImport.ts   # Markdown file import
│   ├── useMissions.ts         # Missions system
│   ├── useCheckIns.ts         # Check-in system
│   ├── useProgress.ts         # Progress tracking
│   ├── useDecisions.ts        # Decision capture
│   ├── useTeamInstructions.ts # Team instruction generation
│   ├── useTodaysTension.ts
│   ├── useGenerationProgress.ts
│   ├── useExecutiveInsights.ts
│   ├── useLeadQualification.ts
│   ├── usePayment.ts
│   ├── useVoice.ts
│   ├── useVoiceInput.ts
│   ├── useMediaQuery.ts
│   ├── use-mobile.tsx
│   ├── useLongPress.ts
│   ├── useOffline.ts
│   ├── useOfflineDetection.ts
│   └── use-toast.ts
├── lib/
│   └── motion.ts              # Animation utilities (Framer Motion)
├── utils/
│   ├── runAssessment.ts             # Main assessment orchestrator
│   ├── orchestrateAssessmentV2.ts   # V2 orchestration logic
│   ├── aggregateLeaderResults.ts    # Data aggregation for UI
│   ├── pipelineGuards.ts           # Input validation
│   ├── edgeFunctionClient.ts       # Edge function wrapper
│   ├── mobileViewport.ts           # Viewport handling
│   └── [Other utilities]
├── types/
│   ├── pipeline.ts            # Core type contracts
│   ├── profile.ts             # Profile types
│   ├── voice.ts               # Voice assessment types
│   ├── diagnostic.ts          # Diagnostic types
│   ├── edge.ts                # Edge types (strengths, weaknesses, capabilities, subscriptions)
│   ├── memory.ts              # Memory system types
│   ├── memory-settings.ts     # Memory privacy settings types
│   ├── missions.ts            # Missions system types
│   ├── cockpit.ts             # Cockpit Home types; DeckCard / DeckCardKind + a `deck` field on CockpitData (PR #197)
│   ├── voiceProfile.ts        # Unified 8-dimension voice profile types (PR #204)
│   └── video-background.ts    # Video background types
├── data/
│   ├── compassQuestions.ts    # Compass assessment questions
│   ├── secondaryQuestions.ts  # Secondary assessment questions
│   └── sharpenSystemPrompt.ts # Sharpen AI system prompt
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client
│       └── types.ts           # Generated DB types (READ-ONLY)
├── pages/                     # current as of 2026-07-26; the legacy pages this tree used to list (Diagnostic/Voice/Pulse/Today/Think/WeeklyCheckin/MissionCheckIn/MissionHistory/Progress/Baseline/DecisionCapture/PromptCoach/Timeline) no longer exist as page files - the corresponding legacy routes are plain <Navigate> redirects with no backing component
│   ├── Landing.tsx            # Landing page (/)
│   ├── Auth.tsx               # Authentication (/auth)
│   ├── AuthCallback.tsx       # OAuth callback (/auth/callback)
│   ├── Dashboard.tsx          # **Main hub** (/dashboard) - cockpit-only Home
│   ├── MemoryCenter.tsx       # Memory Center (/memory)
│   ├── ContextExport.tsx      # Context Export / Automator (/context)
│   ├── BriefingPage.tsx       # Daily Briefing v2 (/briefing)
│   ├── DecisionPage.tsx       # Decision Engine pressure-test (/decision)
│   ├── DecisionMap.tsx        # Decision Map (/decision-map)
│   ├── TrackRecord.tsx        # Track record / capability ladder (/track-record)
│   ├── Goals.tsx              # Goals tracking (/goals)
│   ├── EnrichPage.tsx         # Inbound Enrich loop (/enrich)
│   ├── BuildLap.tsx           # Agent Skill Builder full-page flow (/build)
│   ├── Settings.tsx           # User settings (/settings)
│   ├── Compliance.tsx         # Compliance center (/compliance)
│   ├── Profile.tsx            # User profile (/profile)
│   ├── Booking.tsx            # Workshop booking (/booking)
│   ├── Pricing.tsx            # Interactive Edge Pro checkout (/upgrade); static SEO twin served at /pricing via a vercel.json rewrite to public/pricing.html
│   ├── Agents.tsx             # Public /agents surface
│   ├── Try.tsx                # Public /try surface
│   ├── CaptureLanding.tsx     # Feature-flagged public email-capture page (/download)
│   ├── Preview.tsx            # Dev/QC fixture harness (/preview, unlinked)
│   └── NotFound.tsx           # 404 page
├── styles/                    # Design tokens & styles
├── __tests__/                 # Test files
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

Using React Router v6 with `createBrowserRouter` and lazy loading (defined in `src/router.tsx`).

**Active Routes:**

| Route | Page | Auth | Notes |
|-------|------|------|-------|
| `/` | Landing | No | Video background hero, forced-dark CTRL branding with the emerald `ctrl.` wordmark |
| `/auth` | Auth | No | Email + Google OAuth |
| `/auth/callback` | AuthCallback | No | OAuth redirect handler |
| `/booking` | Booking | No | External booking |
| `/build` | BuildLap | No | Agent Skill Builder full-page flow |
| `/dashboard` | Dashboard (Memory Web) | Yes | Default view - Memory Web with guided first experience |
| `/dashboard?view=edge` | Dashboard (Edge) | Yes | Edge leadership amplifier |
| `/memory` | MemoryCenter | Yes | Detailed memory management |
| `/context` | ContextExport | Yes | Export to AI tools |
| `/briefing` | BriefingPage | Yes | Daily Briefing v2 |
| `/decision` | DecisionPage | Yes | Decision Engine pressure-test (decompose → verify → cross-examine → advise) |
| `/goals` | Goals | Yes | Horizon-grouped goal tracking |
| `/track-record` | TrackRecord | Yes | Track record + earned capability ladder |
| `/decision-map` | DecisionMap | Yes | One pinned-decision hero + connector rail |
| `/enrich` | EnrichPage | Yes | Inbound "borrow your own AI" enrichment loop |
| `/settings` | Settings | Yes | User preferences |
| `/compliance` | Compliance | Yes | Compliance / audit center |
| `/profile` | Profile | Yes | User profile |
| `/preview` | Preview | No | Dev/QC fixture harness, unlinked |
| `/agents` | Agents | No | Public surface |
| `/try` | Try | No | Public surface |
| `/download` | CaptureLanding | No | Feature-flagged (`FF.publicCapture`) public email-capture page; degrades to `NotFound` when the flag is off |
| `/upgrade` | Pricing | No | Interactive Edge Pro checkout (live subscribe button) |
| `/pricing` | (static `public/pricing.html`) | No | Static SEO pricing page, served via a `vercel.json` rewrite, not a React route |
| `/kit` | KitEntry | No | Class follow-up portal code entry (anonymous session) |
| `/kit/me` | KitHome | No | Kit + journey home (anonymous, upgrades on email capture) |
| `/kit/me/intake` | KitIntake | No | 6-question intake (voice or taps) |
| `/kit/reading/:pageId` | KitReading | No | Full-screen reader for a single artifact |
| `/kit/pdf`, `/kit/pdf/:redemptionId` | KitPdf | No | Print-styled branded hero PDF route per kit |

The four `/kit*` routes are the Kit Engine portal (Phase 11). They live **outside** the authed app shell - no `AuthedLayoutRoute`, no sidebar, no Command Palette. They run on an anonymous Supabase session (a real `auth.uid()` with role `authenticated`), and the portal owns its own scroll via `KitPortalLayout` (see Kit Engine section below).

**Legacy Redirects (all redirect to `/dashboard`):**

| Route | Redirects To |
|-------|-------------|
| `/today` | `/dashboard` |
| `/pulse` | `/dashboard` |
| `/voice` | `/dashboard` |
| `/diagnostic` | `/dashboard` (the diagnostic assessment flow it used to serve, and the one-time Full Diagnostic/Deep Context/Bundle Stripe SKUs it led to, are not reachable from any live route today) |
| `/think` | `/dashboard?view=edge` |
| `*` | `/` |

All active pages are lazy-loaded with `React.lazy()` and wrapped in `<Suspense>` boundaries.

**Navigation:**
- **Desktop**: Fixed left sidebar (264px) - `memory-web/DesktopSidebar.tsx` with the emerald `ctrl.` wordmark, 4 nav items (Home, Edge, Memory Web, Export to AI), settings, sign out, user footer + keyboard hints (v5.2)
- **Mobile**: Bottom nav bar - `memory-web/BottomNav.tsx` with 4 tabs (Home, Edge, Memory, Export)

### Desktop Shell (v5.2)

Authenticated routes wrap in `AuthedLayoutRoute` which mounts `CommandPaletteProvider` plus a sticky top bar with page eyebrow + title + actions, and supports an optional right rail that pages opt into.

- **Command Palette** (`Cmd/Ctrl + K`): Pages opt into actions via two custom window events:
  - `mm:capture-voice`: fired from the palette to open the active page's voice capture flow
  - `mm:generate-briefing`: fired to kick off a briefing generation from anywhere
- **Right rail (opt-in)**: Briefing surfaces (interests, suggestions, weekly history), Export wizard (step progress, current selection, contextual pro tip), Memory Web dashboard (today's briefing slot, quick actions, coverage bars, activity).
- **Landing page (desktop)**: bold asymmetric hero with animated Memory Web preview, sticky top nav with section anchors, multi-section scroll (how it works, three pillars, briefing teaser, privacy), final CTA. Mobile preserves the swipeable three-card experience.

The shell exists to make the product feel like a desktop-native tool, not stretched mobile markup. This was Phase 8's UX answer to "executive buyers judge by surface polish."

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

The Dashboard is the primary authenticated view. It renders one of two views based on the `view` query parameter:

**Default (Memory Web view):**
- Desktop: `DesktopMemoryDashboard` with `DesktopSidebar` (264px fixed left)
- Mobile: `MobileMemoryDashboard` with `BottomNav` (4 tabs) and `AppHeader`
- First-time users see `GuidedFirstExperience` (3-question onboarding delivering first export in 2 minutes)
- Returning users see Memory Web visualization, health metrics, recent facts feed, pattern insights

**Edge view (`?view=edge`):**
- Lazy-loaded `EdgeView` component
- Same sidebar/nav shell as Memory Web
- Shows leadership profile: strengths (interactive pills), weaknesses, intelligence gaps
- Pro tier paywall for premium artifact generation (board memos, strategy docs, emails)
- Feedback loops for strength/weakness confirmation

**Desktop Layout:**
```
┌──────────┬──────────────────────┐
│ Sidebar  │                      │
│ (264px)  │   Main Content       │
│          │   (max-w-4xl)        │
│ Home     │                      │
│ Edge     │                      │
│ Memory   │                      │
│ Export   │                      │
│          │                      │
│ Settings │                      │
│ Sign Out │                      │
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
│ BottomNav (4)   │
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

**Total**: 113 Edge Function directories in `supabase/functions/` excluding `_shared` as of 2026-08-10. Re-count the tree for a current total. The narrative below records when subsystems were added; it is historical, not a list of promoted user-facing features.

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

## Runtime Product-Truth Source (2026-05-30)

`https://makeyourmindup.ai/.well-known/product.json`

A machine-readable JSON document served at this well-known path. It is the single authoritative source of pricing, ICP, and offer data for the entire MindmakerOS agent fleet. Any agent that needs to quote CTRL pricing or describe the offer fetches this endpoint rather than reading from training data.

**Served by**: a Vercel static route (or edge function) returning a pre-rendered JSON payload.

**Contents (canonical):**

```json
{
  "product": "CTRL",
  "url": "https://makeyourmindup.ai",
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

---

## Public-Surface Prerender (2026-05-30)

The CTRL landing page (`/`) and any other public routes are pre-rendered at build time (or via Vercel's edge prerendering) to ensure:

1. **SEO**: Crawlers see fully-rendered HTML with correct meta tags, OG images, and structured data without executing client-side JavaScript
2. **Agent-readable surfaces**: AI agents scraping `makeyourmindup.ai` for product context get complete HTML rather than a blank SPA shell
3. **Performance**: First Contentful Paint is not blocked on the React bundle

**Implementation**: Vite SSR prerender pass generates static HTML for public routes at build time. The `/.well-known/product.json` endpoint is served as a standalone static file, not part of the React app.

---

## Kit Engine Portal (Phase 11, 2026-06-10)

The Kit Engine is CTRL's class follow-up portal. It is a standalone, forced-dark, mobile-first surface (same `ctrl-ds` dark instrument palette as the rest of the app) that lives **outside** the authed app shell on four public routes (`/kit`, `/kit/me`, `/kit/me/intake`, `/kit/reading/:pageId`). It is also a bridge into the full CTRL app: intake answers seed the student's Memory Web, and a bridge card links to `/dashboard` after email capture.

> **Updated 2026-06-17:** the kit program has since grown to **four kits** (Agentic Org Chart added, all three prior kits retrofit to fork + pick-cascade) and PR #193 fixed a latent cascade bug plus added an honesty floor. The current 4-kit program is documented in the **Kit Engine (4-kit program)** section below; the description here covers the original Phase 11 portal architecture, which still holds.

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

## Kit Engine (4-kit program, 2026-06-16/17)

The Phase 11 portal (above) was a 2-preset engine. The kit program has since grown into a **4-kit program** and survived a significant bug fix. Both prod-verified.

**The four kits (lesson-kit engine at `/kit`):**
1. **Vibe Coding Field Kit** (`vibe-coding`) - original.
2. **Autonomous Business Pack** (`autonomous-business`) - original.
3. **Memory & Identity Prompt Pack** (`memory-identity`, code MEMORY-JUN26) - original.
4. **Agentic Org Chart** kit - added in PRs #190 / #191. Composes an org chart of agent-led vs human-led boxes from the student's intake.

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
**Database Migrations**: `supabase/migrations/`, applied via `supabase db push`

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

**Vitest** (`vitest.config.ts`): 6 unit/shared specs:
- `src/__tests__/api.test.ts`
- `src/__tests__/authMachine.test.ts`
- `src/__tests__/renderMarkdown.test.ts`
- `src/__tests__/training.test.ts`
- `src/__tests__/HeroSection.video.test.tsx`
- `supabase/functions/_shared/with-timeout.test.ts`

**Playwright** (`playwright.config.ts`, `testDir: src/__tests__/e2e`): 7 e2e specs:
- `src/__tests__/e2e/auth-journeys.spec.ts`
- `src/__tests__/e2e/briefing-journey.spec.ts`
- `src/__tests__/e2e/briefing-rate-limits.spec.ts`
- `src/__tests__/e2e/sparse-profile.spec.ts`
- `src/__tests__/e2e/account-deletion.spec.ts`
- `src/__tests__/e2e/stripe-webhook-idempotency.spec.ts`
- `src/__tests__/e2e/desktop-zero-scroll.spec.ts` (Phase 10: asserts the desktop shell never scrolls the window)

**CI gates** (`.github/workflows/ci.yml`): three blocking checks per PR:
1. Typecheck (`tsc --noEmit`)
2. Full Vite build
3. ESLint on PR diff (~1600 pre-existing warnings accepted as technical debt; new lint regressions blocked)


**Manual Testing Checklist**:
- [ ] Quiz assessment completes successfully
- [ ] Voice assessment completes successfully
- [ ] Results display correctly (Overview, Tensions, Tools)
- [ ] First Moves display and mission commitment works
- [ ] Free tier shows limited content
- [ ] Paid upgrade flow works
- [ ] Memory Center: create, read, update, delete, voice capture
- [ ] Missions: commit, check-in, complete flow
- [ ] Progress: snapshots generate correctly
- [ ] Weekly Check-in: submission and AI response
- [ ] Mobile responsive, no-scroll on mobile pages

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
  "framer-motion": "^11.x",
  "tailwindcss": "^3.4.11",
  "lucide-react": "^0.462.0",
  "zod": "^3.23.8",
  "typescript": "^5.5.3",
  "vite": "^5.4.1"
}
```

### Constraints

- **No backend code execution**: Only edge functions (Deno runtime)
- **Node.js requirement**: >=22 <25; Vercel production uses 24.x
- **LLM rate limits**: Vertex AI quotas, OpenAI tier limits
- **AI API costs**: ~$0.01-0.02 per assessment (Vertex AI primary)
