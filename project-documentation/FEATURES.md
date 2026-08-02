# Features

Complete feature inventory.

**Last reconciled:** 2026-08-02 (full reconciliation pass; closes out the 2026-06-16 through 2026-06-21 banner debt into body prose and adds everything shipped 2026-06-22 through 2026-08-01).

> **Positioning (LOCKED 2026-06-19)**: CTRL is the tool for building, orchestrating, productizing, and getting to market **the AI-native version of your business**, not a general business advisor. The feature mechanics below are accurate; read them through that lens. Canonical: `docs/MAIN-APP-POLISH-SPEC.md`, `docs/KIT-REDESIGN-SPEC.md`, `docs/CTRL-SYSTEM-SPEC.md`, `docs/CURATION-SYSTEM-SPEC.md`, `project-documentation/NORTH_STAR.md`, root `README.md`.

> **For sales/marketing AI agents**: pull feature mechanics from here, but the binding promise and hooks come from `AGENT_BRIEFING.md` (AI-native), not the older sales-anchor callouts below. Some sales anchors still carry the retired "decision speed / portable double" framing; prefer the AI-native frame.

> **North Star (2026-07-04, PR #330, founder-signed):** the single product-health number is **"flywheel leaders"** - leaders who both hold a real brain (>=5 current `user_memory` facts) AND weighed a decision in the last 7 days. Canonical doc: `project-documentation/NORTH_STAR.md` (not edited by this pass; read it for the metric definition and the migration `20260704120000_north_star_flywheel.sql` that instruments it). Any product-health/KPI discussion elsewhere in this doc should defer to that number rather than inventing a different one.

> **Open TODO(founder) items surfaced by this pass:** (1) the Missions / Progress / Weekly Check-ins systems below have no page or route left in `src/pages/` or `src/router.tsx` - the tables, hooks, and edge functions are still live in the codebase but unreachable from the app; confirm whether this is an intentional deprecation or an accidental page removal. (2) `kit_builds.intake` rows written before PR #193 remain truncated (unchanged from the prior reconciliation; still true).

---

## Repo at a glance (counts verified 2026-08-02, direct filesystem count)

- **104 Supabase edge functions** (Deno runtime, excluding `_shared/`; counted directly from `supabase/functions/` on 2026-08-02), spanning briefing, memory, decision engine, AI generation, billing, diagnostic, email/notifications, enrichment, and the Kit Engine, plus shared modules
- **78 React hooks** under `src/hooks/` (counted directly on 2026-08-02)
- **148 PostgreSQL migrations** in `supabase/migrations/` (counted directly on 2026-08-02)
- **PostgreSQL extensions in use**: pgvector, pgcrypto, pg_cron
- **6 audit-week tracks shipped** (PR #93-#101): revenue path, data path, UX, reliability, observability, cleanup. See `HISTORY.md` Phase 7.
- **Brand redesign shipped LIVE** (PR #186, merge 1c01db5, 2026-06-16): globally forced dark, `ctrl-ds` instrument palette, emerald `#00D9B6`, the emerald `ctrl.` wordmark; rebuilt mobile cockpit, decision spine, StoneRead, brain four-world rope canvas, capture, onboarding. Prod-verified with screenshots. See **Redesign** below.
- **Desktop UI redesign shipped** (PR #104, Phase 8; extended through Phase 10, PR #130-#139): every authenticated surface now wears the same `DesktopShell` (sticky top bar with page eyebrow + title + actions, optional right rail, Cmd/Ctrl+K Command Palette), viewport-pinned so the window never scrolls. No more stretched mobile markup on desktop.
- **CI gates blocking on PRs**: typecheck (tsc --noEmit), full Vite build, ESLint on PR diff, and (since PR #327-ish, `4e78f2c`) a Vitest job that wires in the decision-engine eval gate
- **Tests**: 29 Vitest unit/shared spec files (counted directly on 2026-08-02, up from the 6 last counted 2026-06-21; the growth is mostly decision-engine pure-model tests) + 8 Playwright e2e specs in `src/__tests__/e2e/` (auth-journeys, briefing-journey, briefing-rate-limits, sparse-profile, account-deletion, stripe-webhook-idempotency, desktop-zero-scroll, kit-redeem-journey)

---

## Redesign (shipped LIVE 2026-06-16, PR #186)

The current look and feel of CTRL. Shipped to `main` (merge 1c01db5) and prod-verified at `ctrl.themindmaker.ai` with screenshots of the actual surfaces.

**What changed:**
- **Globally forced dark.** No light mode. `index.html` ships `class="dark"`.
- **`ctrl-ds` instrument palette** with emerald `#00D9B6` as the primary accent (`--primary 171 100% 43%`).
- **The emerald `ctrl.` wordmark** everywhere, replacing the old green Mindmaker logo.
- **Rebuilt surfaces:** mobile cockpit, decision spine, StoneRead (full-screen reading), the brain four-world rope canvas, capture, and onboarding.

**Honest gaps (disclose, don't hide):**
- **Residual green not yet purged:** `index.html` OG / `theme-color` meta tags, the `--mint` token alias in `tokens.css`, and `EdgeOnboarding` / `SampleResultsDialog` still carry residual green.

> **Backstory:** the redesign was at one earlier point falsely claimed "live" while prod was still the old UI, and the cause was deflected onto the user's cache. That was a trust breach. PR #186 is the real ship, prod-verified by screenshot. "Live" means a prod screenshot only; "it's still old" is ground truth.

**Sales Anchor - Redesign**: "An instrument panel for decisions, not a dashboard. Forced-dark, emerald, built to be read at a glance under pressure."

---

## Home: the unified 2028 cockpit (current model; supersedes the 2026-06-17 redesign below)

Home (`/dashboard`) is now ONE state-adaptive surface, not a fork. The `VITE_COCKPIT_ENABLED` flag, the legacy `Mobile/DesktopMemoryDashboard`, and the swipeable `CockpitDeck` described in the "2026-06-17 redesign" subsection below were all **deleted** in the "radical focus" refactor (PRs #234-241, 2026-06-22) and the follow-on onboarding/decisions/engagement loop (PR #298, 2026-06-29). `src/pages/Dashboard.tsx` renders exactly one thing per device: mobile gets `CockpitView` (`src/components/cockpit/CockpitView.tsx`), desktop gets `DesktopHomeView.tsx`; `?view=edge` still renders the Edge leadership amplifier on the same shell.

**Lifecycle-adaptive posture:** `useCockpit` derives a `userState` (new / dormant / active / power, off real timestamps + a 14-day dormancy window) and maps it to a `posture` on `CockpitData`:
- **`guide`** - for NEW leaders, DORMANT leaders, or anyone with no live decision. Home leads with guidance and a kickstart.
- **`partner`** - for active leaders. Home leads with decisiveness and evidence.

**Onboarding is now lightweight and inline**, not a gate. `InlineProfileSetup` (`src/components/cockpit/onboarding/InlineProfileSetup.tsx`, driven by `useInlineProfile`) captures industry + role straight to `user_memory`, plus interests via the reused `SeedBeatsPrompt`, rendered directly inside the Home feed zone (`HomeFeed`) for NEW leaders. The old 40-minute voice `OnboardingInterview` and its supporting `onboarding/steps/*` were deleted.

**The feed:** `HomeFeed.tsx` (mobile) / `DesktopHomeView.tsx` (desktop) render the browsable headline stream - `CockpitHero` shows the top-ranked card, `CockpitStreamRow`/the desktop rail shows the rest, and a bundled `coldDeck.ts` of generic AI-native headlines guarantees Home is never empty even before any personalization exists. Own-signal `decision_alerts` are woven into the same ranked stream (deduped one-per-decision, labelled "Your decision", never a generic news-category chip). Cards are glance-only with a tap-to-read sheet (`CardReadSheet.tsx`) that gives an LLM-personalized read of the story; every card renders at one exact height. Home also surfaces structural **"shift" cards** (`TrendCard.tsx`) - trend detection alongside the headlines, not just individual stories.

**Kickstart:** in the `guide` posture, Home leads with a `KickstartCard` (`src/components/cockpit/KickstartCard.tsx`) - a real, role-tailored starter decision (`src/lib/starterDecisions.ts`) routed to `/decision` with the statement pre-filled (`DeckCard.route`/`prefill`; `DecisionPage` also reads `?prefill=` for the reactivation-nudge email link, which cannot set router state).

**Re-engagement:** `supabase/functions/send-reactivation-nudge` (daily `pg_cron`, 13:00 UTC, `verify_jwt=false`) emails NEW (never-weighed) and DORMANT (lapsed >14 days) leaders, de-duped on `leader_notification_prefs.reactivation_nudge_sent_at` (30-day re-arm), batch-capped, lifecycle-driven (separate from the `daily_briefing` opt-in).

**Value actions and brand:** the 3 value actions (Play my briefing -> `/briefing`, Run a decision -> `/decision`, Build a skill -> `/context`) and the `BrandLockup` (Mindmaker icon + `ctrl-logo.png` wordmark) persist from the earlier redesign, described below.

Canonical: `docs/CTRL-SYSTEM-SPEC.md` sections 6 and 8.

---

## Home / Decision Map / Automator UX Redesign (shipped LIVE 2026-06-17, PRs #197-200; Home subsection superseded above)

The latest layer on top of the PR #186 brand redesign at the time it shipped. A founder review of live prod found three surfaces that looked finished but did not feel right: Home did not say "I'm back", its "strongest signal" hero was cryptic and the AI-bets read as a wall of sameness; the Decision Map read as unrelated cards with a "something wrong?" drawer popping on every scroll; and the Automator suggested a vague, uncodifiable "Hiring Challenge". A mock-driven rebuild locked all three to the `ctrl-ds` design floor and shipped them to `main`, prod-verified by screenshot at `ctrl.themindmaker.ai`.

### Home (PR #197, merge 7b5f0ef) - HISTORICAL, see the section above for the current model

The mobile cockpit Home, at the time behind `VITE_COCKPIT_ENABLED` (flag since deleted).

**Removed at the time:** the cryptic "strongest signal" hero and the wall of identical AI-bets. Bets no longer live on Home; they moved into the Decisions case-picker.

**Shipped at the time (superseded by the "radical focus" Home rebuild above):**
- A plain, time-aware greeting (no cryptic hero) - still true today.
- The swipeable **"worth a look" deck** (`CockpitDeck`) - since DELETED and replaced by the browsable `HomeFeed`/`DesktopHomeView` stream described above.
- **3 value actions:** Play my briefing (-> `/briefing`), Run a decision (-> `/decision`), Build a skill (-> `/context`) - still true today.
- Plain language throughout (e.g. "We found developments you might want to look at") - still true today.
- A new brand lockup (Mindmaker icon + `ctrl-logo`) replaced the generated "ctrl." text in the header - still true today.

### Decision Map (PR #198, merge 33fb818)

`/decision-map` remains a live route, distinct from `/decision` (the decision-weighing engine, rebuilt separately - see **Decision Engine** below). **One pinned decision** (star eyebrow + statement + a DESCRIPTIVE "where it stands" status derived from the tally, e.g. Holding / Checking / Contested - never a recommendation), with a "Change" affordance to swap which decision is pinned. Considerations sit on a connector **rail** (`ConsiderationStone`); evidence is one tap deeper (`StoneRead`/`StoneDeeper`).

The long-press "something wrong?" scroll-popup was **killed**; in its place a quiet "Flag it" lives inside the opened stone and in the footer. Empty state: role / sector-seeded starter decisions (`starterDecisionsFor`), one tap to Decide prefilled.

### Automator (PR #199, merge 24f7d15)

The retention hook: turn a recurring deliverable into a reusable skill. Three screens:

1. **Suggestions** - concrete recurring DELIVERABLES mined from the brain (blockers + decisions), each with a "why we picked this" and a "pulled from your brain" badge; role / sector fallback when the brain is thin; a clean inline "Something else" (not a native prompt). It NEVER proposes a vague "Hiring Challenge".
2. **Cascade** - a roughly 5-step all-recognition pick-cascade reusing the kit engine. The voice step shows real samples to PICK from, never "describe your tone".
3. **Skill ready** - "Built your way" chips + Run it now + Export as markdown + a "Your skills" library peek.

The Automator feeds the `generate-skill-export` pipeline (see the intake + harness upgrade note below; the pipeline's prompt was tightened in PR #204 and the Edge Pro gate removed).

> **Intake + harness upgrade (PR #204):** the Skill Builder is now **free for now** (the Edge Pro gate on `generate-skill-export` was removed, so any authenticated user, including anonymous kit sessions, can build skills). The pipeline prompt was tightened (boundedness check, the FOUR Honest Tests with Test 4 = voice-lock, an injected self-identified VOICE_PROFILE, a ban on fabricated voice samples, a structured 8-dimension `voice-profile.md`, and a required `## Learning loop` section; quality gate now 16/16). A unified `ctrl_voice_profile` (one `user_memory` fact) is captured by `VoiceStyleProfileSheet` (5 recognition picks OR a paste-extract power path via the new `extract-voice-profile` edge fn), surfaced into generated skills, and used by the harness. The Automator tone step is voice-aware (a cold pick writes the profile; a returning leader gets a "still sound like you?" confirmation; a paste-extract affordance), `AutomatorScaffold` adds a desktop two-pane "your skill is taking shape" builder (mobile unchanged), Suggestions warm-starts with a "your peers are using this" voice grounded in role + company profile (never a fabricated cohort count), and the output is layered across library + MCP (`mcp-context` gained `list_skills` + `get_skill`, a live agent pull) + per-item download. See the **Agent Skill Builder** section below.

### Follow-ups (PR #200, merge 387af84)

- Desktop brand lockup placements - still true today.
- Deck like / dislike persisted and trained the feed at the time. The swipeable deck itself is gone (see the Home section above), but the reaction plumbing survives: `useCockpit.recordDeckReaction` is still the entry point, now called from the hero card, and the curation system (`docs/CURATION-SYSTEM-SPEC.md`) is the current, much more developed version of "the feed learns from you" (Tune lanes, role fit, guaranteed floor - see the **Curation system** note in the header banners of this doc).

**Honest residuals (disclose, don't hide):**
- The old `SkillCaptureSheet` / `SkillPreviewSheet` are still dead code (unimported).
- "Run it now" downloads the skill; there is no in-app skill-runner yet.
- Home no longer depends on a briefing existing for content (`coldDeck.ts` guarantees a non-empty feed); the news-briefing dependency described here at the time no longer applies.

**Sales Anchor - Home / Decision Map / Automator**: "Open CTRL and it feels like coming back to your desk: a plain greeting, a feed of what's worth a look, and one tap to your briefing, a decision, or a new skill. The decision you care about is pinned with where it stands, not a verdict. And one recurring deliverable becomes a skill you own."

---

## Brain Engine (PRs #153-164; "limits" phases #187-189; brain graph rebuilt PR #240; correction loop PR #321)

CTRL's memory rendered as a connected graph: the leader's facts wired to each other, with reaction signals, evidence tiers, and a track record.

**What shipped:**
- **Fact-to-fact edge graph** - facts connected by edges, rendered by `BrainGraph.tsx` + `BrainCanvas.tsx` (rebuilt PR #240 on `brainGraphModel.ts` `computeViewBox`: hub-anchored, aspect-corrected to the live canvas ratio every render, fixing the earlier upper-left-clustering squash).
- **Strengthen / Fix RPCs are LIVE (PR #321, 2026-07-03)** - `strengthen_memory_fact` (bumps confidence + marks verified) and `fix_memory_fact` (disputes the fact and drops its links) are real backend RPCs, wired end-to-end through `BondReader.tsx` (`onStrengthen`/`onFix` props) from `MemoryCenter.tsx` (`handleStrengthenBond`/`handleFixBond`). These were UI-disabled buttons before PR #321; they are not anymore.
- **Real correction loop (PR #321)** - `verify_memory_fact` / `fix_memory_fact` log `user_corrected` / `user_rejected` / `user_disputed` events to `memory_events` with the prior value (migration `20260703090000`). `extract-user-context` (v45) is correction-aware via `_shared/correction-guard.ts`: corrections ride the extraction prompt, and a deterministic damping pass drops re-extraction of a value the leader already ruled out (this also fixed a bug where a rejected fact could silently re-insert because `is_current=false` left it in the dedup set). The verify swipe flow (`VerificationSwipeStack.tsx`) shows a "Fixed. I noted what I got wrong - I won't infer that again." confirmation beat.
- **`memory-edges-derive` now has a caller** - previously a dormant edge function, it now fires after each successful capture in `useMemoryWeb.submitInput`.
- **Reliable reaction numbers** - reaction counts on facts now computed reliably.
- **Evidence tiers** - each fact carries an evidence tier.
- **Track-record depth** - the brain shows the track record behind a fact over time.

**Migrations:** `20260615*_brain_*`, `20260616120000_memory_edges`, `20260703090000` (correction events).

**Honest gaps (disclose, never hide):**
- **Brain edges are derived, not stored** - the graph is computed at read time, not persisted as rows.
- **Number-heroes fall back to words-led on thin current data** - when there is not enough current data for a numeric hero stat, the UI shows a words-led presentation instead of a misleading number.

**Sales Anchor - Brain**: "Your context isn't a list, it's a wired map. See which of your facts hold each other up, and which are running on thin evidence. Tell it what it got wrong and it stops inferring that again."

---

## Leaders Tool: Individual AI Literacy Diagnostic

### Entry & Assessment

**Landing Page** (`HeroSection.tsx`)
- Executive-grade design on the forced-dark `ctrl-ds` instrument palette
- Subtle video background (12% opacity)
- Centered card on the dark surface (NOT a white card) with generous padding
- Emerald `ctrl.` wordmark
- Plain-language value proposition
- Single "Start diagnostic" CTA
- Trust indicators (checkmarks, muted text)
- No quiz/gamification language
- 10-minute time expectation set
- No-scroll on mobile

**Assessment Flow** (`UnifiedAssessment.tsx`)
- Quiz path: 20 Likert-scale questions across 6 dimensions
- Voice path: Compass module (5 questions) + ROI module
- Deep profile questionnaire: 13 contextual questions
- Contact collection: Name, email, company, role
- Progress tracking throughout

**Dimensions Assessed**
1. Strategic Vision
2. Experimentation Culture
3. Delegation & Automation
4. Data & Decision Quality
5. Team Capability
6. Governance & Ethics

### Results & Insights

**Overview Tab** (`LeadershipBenchmarkV2.tsx`)
- AI Literacy Diagnostic score (0-100)
- Tier classification (Emerging/Establishing/Advancing/Leading)
- Radar chart showing 6 dimension scores
- Peer comparison bubble chart (anonymised cohort data)
- Percentile ranking
- Dimension-specific scores and tiers

**Tensions Tab** (`TensionsView.tsx`)
- **Strategic Tensions**: Gaps between current and desired state
- **Risk Signals**: Shadow AI, skills gaps, ROI leakage, decision friction
- **Org Scenarios**: 3-5 year structural change projections
- Priority ranking for each item
- Plain-language descriptions tied to assessment data

**Tools Tab** (`PromptLibraryV2.tsx`)
- Personalised thinking tools (mental models + prompts)
- 3-8 tool categories based on diagnostic results
- Each category includes:
  - What it's for
  - When to use
  - How to use
  - 2-5 specific prompts
- Copy all tools functionality
- Download as text file

**Privacy Tab** (`ConsentManager.tsx`)
- AI Leadership Index consent management
- Data usage transparency
- Opt-in/opt-out controls
- Consent audit trail

### Data Architecture

**Tables Used**
- `leaders`: Profile data
- `leader_assessments`: Assessment records and metadata
- `leader_dimension_scores`: Dimension-specific scores
- `leader_insights`: Generated insights (edge, risk, next move)
- `leader_first_moves`: Actionable next steps
- `leader_prompt_sets`: Personalised thinking tools
- `leader_tensions`: Strategic gaps
- `leader_risk_signals`: Blind spots and waste indicators
- `leader_org_scenarios`: Future state projections
- `assessment_events`: Granular Q&A log
- `assessment_behavioral_adjustments`: Deep profile influence on scores
- `index_participant_data`: Anonymised benchmark data

**Edge Functions**
- `create-leader-assessment`: Creates assessment record and initial scores
- `ai-generate`: Central AI generation function (Vertex AI primary, OpenAI fallback) - produces insights, prompts, tensions, risks, scenarios, and first moves in a single call
- `populate-index-participant`: Anonymised benchmark contribution

### Free vs Paid

**Free Tier** (Default)
- Full diagnostic assessment
- Overview tab with benchmark scores
- Limited prompts (2 categories)
- Basic tensions view

**Paid Tiers** (Stripe-managed, signature-verified, idempotent)
- **Full Diagnostic** ($49 one-time): full tensions/risks/scenarios, complete prompt library (3-8 categories), priority ranking, downloadable reports.
- **Deep Context Upgrade** ($29 one-time): enhanced company context enrichment.
- **Full Diagnostic + Deep Context Bundle** ($69 one-time, saves $10): both above. Default upsell.

**Sales Anchor - Diagnostic**: "10 minutes. Six dimensions. The provocation report your board will ask you about. $49 (cheaper than the slide deck a consultant would write to ask you the same questions)."

---

## Edge: Leadership Amplifier

A major new feature that synthesizes the user's Memory Web and assessment data into an actionable leadership profile.

### Overview

Edge analyzes everything CTRL knows about a leader and surfaces:
- **Strengths** to sharpen (with interactive pills and confidence scores)
- **Weaknesses** to cover (with AI-generated artifacts)
- **Intelligence gaps** to fill (guided resolution prompts)

### Components (11 files in `src/components/edge/`)

**EdgeView** (`EdgeView.tsx`) - Main view orchestrator
- Loads edge profile via `useEdge` hook
- Shows onboarding for first-time users (`EdgeOnboarding`)
- Displays strength/weakness pills with feedback loops
- Pro teaser cards for paid capabilities
- Intelligence gap cards with resolution prompts

**EdgeProfileCard** (`EdgeProfileCard.tsx`)
- Summary card showing profile synthesis state
- Re-synthesize button
- Last synthesized timestamp

**StrengthPill / GapPill** (`StrengthPill.tsx`, `GapPill.tsx`)
- Interactive pill components for strengths and intelligence gaps
- Tap to expand details
- Confidence scores and evidence

**EdgePaywall** (`EdgePaywall.tsx`)
- Pro tier upgrade wall
- Sample artifact previews (Board Memo, Strategy Doc, Email, Meeting Agenda, Framework)
- Stripe subscription integration via `useEdgeSubscription`

**DraftSheet / ArtifactPreview** (`DraftSheet.tsx`, `ArtifactPreview.tsx`)
- Bottom sheet for artifact generation
- Real-time generation progress
- Markdown rendering of generated content

**SmartProbeCard** (`SmartProbeCard.tsx`)
- Guided intelligence gap resolution
- Voice capture or text input
- Resolution types: voice_capture, diagnostic, md_upload, quick_confirm

### Capabilities

**Sharpen (amplify strengths):**
| Capability | Description |
|-----------|-------------|
| `systemize` | Turn instinct into repeatable frameworks |
| `teach` | Create docs to share how you think |
| `lean_into` | Find missions that leverage the strength |

**Cover (compensate for weaknesses):**
| Capability | Description |
|-----------|-------------|
| `board_memo` | Draft polished board memos |
| `strategy_doc` | Build strategy documents with context |
| `email` | Draft emails in your communication style |
| `meeting_agenda` | Prepare meeting agendas with context |
| `template` | Pre-filled templates with your facts |

### Data Architecture

**Tables:**
- `edge_profiles` - Synthesized strength/weakness profiles
- `edge_actions` - Generated artifacts and their metadata
- `edge_feedback` - User feedback on strength/weakness accuracy
- `edge_subscriptions` - Stripe subscription state for Pro tier

**Edge Functions:**
- `synthesize-edge-profile` - AI synthesis of user data into edge profile
- `edge-generate` - Generate artifacts (memos, docs, emails, etc.)
- `create-edge-subscription` - Stripe subscription creation
- `deliver-edge-artifact` - Email delivery of artifacts

**Hooks:**
- `useEdge` - Profile data, synthesis trigger, feedback submission
- `useEdgeSubscription` - Subscription state and access checks

### Free vs Pro

**Free:**
- Full strength/weakness profile
- Intelligence gap detection
- Feedback loops
- Limited artifact previews (samples only)

**Edge Pro** ($49/month, Stripe subscription) - the decision tier:
- **Unlimited decision weighs** (the free tier gives 3 weighs a month; Edge Pro removes the cap)
- **A multi-model cross-examination of every decision** (a second, independent pass that argues against the first)
- **Decision watch** (alerts when a load-bearing assumption weakens)
- **Edge artifacts** (unlimited): board memos, strategy docs, emails, agendas
- Drafting + framework generation
- Email delivery via `deliver-edge-artifact`
- All capability types
- **Live MCP pull of your built skills** into any AI (`mcp-context` `list_skills` / `get_skill`)
- **Agent Skill Builder** (`generate-skill-export`): the Skill Builder. **NOTE (PR #204): the Skill Builder is now FREE for now - the Edge Pro gate was removed, so any authenticated user (including anonymous kit sessions) can build skills; it is no longer an Edge Pro entitlement.** As of the 2026-06-17 UX redesign (PR #199) the `/context` entry is the **Automator deliverable flow** - Suggestions (recurring deliverables mined from the brain) -> a recognition pick-cascade -> Skill ready (Run it now + Export as markdown + a "Your skills" library peek). It feeds the `generate-skill-export` pipeline and produces a Skill downloadable into `~/.claude/skills/`. Edge Pro still gates the live MCP skills pull (`mcp-context` `list_skills` / `get_skill`). See **Home / Decision Map / Automator UX Redesign** above.
- Custom Voice Export (`generate-custom-export`)
- Subscription management UI via `create-billing-portal-session`
- Stripe webhook idempotency table (`stripe_events_processed`) prevents double-charges (Audit Week 1)

**Sales Anchor - Edge Pro**: "$49/month. The decision tier. Unlimited decision weighs, a second model that cross-examines every call, and an alert when a load-bearing assumption weakens. Plus board memos, strategy docs, and meeting agendas in your register, on demand, and the live pull of your built skills into any AI."

---

## Unified Dashboard (`/dashboard`)

The Dashboard is the main authenticated hub. `src/pages/Dashboard.tsx` renders exactly one of two views based on the `view` query parameter: the cockpit **Home** (default) or the **Edge** view (`?view=edge`). There is no third "Memory Web dashboard" view anymore - see the **Home: the unified 2028 cockpit** section above for the current model. Memory itself lives at the dedicated `/memory` page (**Memory Center**, below).

### Navigation

**Desktop** (`src/components/layout/DesktopShell.tsx`, the current live nav; craft+growth polish PR #329, 2026-07-04):
- A dense collapsible rail (220px), brand lockup at top
- **Primary spine, 3 items** (deliberately matches mobile's 3-tab order): Home, Decisions, Memory. Track record is folded into Decisions as a Now|History toggle rather than being a 4th primary tab.
- **Secondary items** (one click away via a "More" disclosure, not removed, just demoted): Edge, Briefing, Track record (kept as its own route for deep links even though it also lives inside Decisions), Export, Goals, Decision Map.
- **Account items**: Profile, Compliance, Settings.
- `memory-web/DesktopSidebar.tsx` (the older fixed 264px sidebar with 4 items: Home, Edge, Memory Web, Export to AI) is **dead code** - not imported by any live page; `DesktopShell`'s rail above is what actually renders.

**Mobile** (`memory-web/BottomNav.tsx`):
- The single 3-tab cockpit nav: Home, Decisions, Memory (same order/icons as desktop's primary spine, per `docs/CTRL-SYSTEM-SPEC.md`). The legacy 6-tab fork and the `VITE_COCKPIT_ENABLED` flag it depended on were both retired.
- AppHeader at top (brand lockup)
- Backdrop blur effect

### Edge View

Shows the Edge leadership amplifier (see **Edge: Leadership Amplifier** above for details). Same shell (mobile: `AppHeader` + `BottomNav`; desktop: `DesktopShell`).

### Dead code still in the tree (not imported anywhere; disclose, don't hide)

`src/components/dashboard/mobile/` (`MobileDashboard.tsx`, `HeroStatusCard.tsx`, `PriorityCardStack.tsx`, `VoiceButton.tsx`, `Sheet.tsx`, `ActionQueueSheet.tsx`, `StrategicPulseSheet.tsx`) and `src/components/dashboard/desktop/` (`DesktopDashboard.tsx`, `Sidebar.tsx`, `Panel.tsx`) are pre-Memory-Web dashboard components with no remaining import into any live page or route - verified by grep, not asserted. `dashboard/WeeklyActionCard.tsx` / `dashboard/DailyProvocationCard.tsx` and `pulse/StrategicPulse.tsx` are similarly unreferenced outside their own subtree. None of these render on `ctrl.themindmaker.ai` today. `GuidedFirstExperience.tsx` (the old 3-question onboarding component referenced in earlier versions of this doc) no longer exists in the repo at all - it was removed, not just orphaned; onboarding today is `InlineProfileSetup` (see the Home section above).

**Legacy redirect routes (still live, in `src/router.tsx`):**
- `/today` → `/dashboard`
- `/voice` → `/dashboard`
- `/pulse` → `/dashboard`
- `/diagnostic` → `/dashboard`
- `/think` → `/dashboard?view=edge`

---

## Memory Center

### Overview

Voice-first context extraction system that builds a persistent knowledge base about each leader, enabling increasingly personalised AI interactions over time.

**Page**: `/memory` (auth required)

### Features

**Voice-First Fact Extraction** (`VoiceMemoryCapture.tsx`)
- Record voice input about context, goals, blockers
- OpenAI Whisper transcription via `voice-transcribe` edge function
- AI extracts structured facts via `extract-user-context` edge function
- Facts categorised: identity, business, objective, blocker, preference
- Confidence scoring (0-1) on each extracted fact

**Fact Verification** (`FactVerificationCard.tsx`, `VerificationSwipeStack.tsx`, `VerificationBanner.tsx`, `VerificationCompletionScreen.tsx`)
- Facts displayed with confidence indicators
- User can verify, correct, or reject each fact
- Verification statuses: inferred, verified, corrected, rejected
- Sources tracked: voice, form, linkedin, calendar, enrichment
- **Real correction loop (PR #321, 2026-07-03):** verifying/correcting/rejecting a fact logs a `user_corrected` / `user_rejected` / `user_disputed` event to `memory_events` with the prior value, so the correction is not just a status flip - it changes what the AI infers next. `extract-user-context` reads this via `_shared/correction-guard.ts` and will not silently re-extract a value the leader already ruled out. The swipe flow surfaces a plain confirmation: "Fixed. I noted what I got wrong - I won't infer that again."
- **Strengthen / Fix on the brain graph are the same mechanism, live** - see **Brain Engine** above (`strengthen_memory_fact` / `fix_memory_fact`, wired through `BondReader.tsx`).

**Memory Management** (`MemoryList.tsx`, `MemoryItemCard.tsx`, `MemoryPill.tsx`)
- Browse all stored memory facts
- Add facts manually via `AddMemorySheet.tsx`
- View detail via `MemoryDetailSheet.tsx`
- Delete or modify facts

**Context file, one click** (`ContextFileButton.tsx`, PR #321)
- One-clicks `my-ai-context.md` via `useMemoryExport`. Was previously buried inside the Context Export wizard as a "Raw Markdown" option; now a first-class pill on the Memory Center's meta line and a row on `/context` Step 1.

**Privacy Controls** (`PrivacyControlsPanel.tsx`)
- Enable/disable memory collection
- Enable/disable auto-extraction from voice
- Set retention period (days)
- All settings managed via `memory-settings` edge function

**Data Export/Import** (`ExportImportPanel.tsx`)
- Export all memory data
- Import from external sources
- Data portability compliance

**Security**
- Content encrypted at rest using AES-256-GCM
- Encryption key stored in `MEMORY_ENCRYPTION_KEY` env var
- Decryption only in edge functions, never client-side
- RLS prevents cross-user access

### Data Architecture

**Tables Used**
- `user_memory`: Fact storage with encryption
- `user_memory_settings`: Privacy configuration

**Edge Functions**
- `memory-crud`: Create, read, update, delete memory facts
- `memory-settings`: Privacy settings management
- `extract-user-context`: AI fact extraction from voice
- `enrich-company-context`: Company context enrichment

### Components (`src/components/memory/`, 13 files + `index.ts`, counted 2026-08-02)
- `MemoryList.tsx`, `AddMemorySheet.tsx`, `MemoryDetailSheet.tsx`
- `MemoryItemCard.tsx`, `MemoryPill.tsx`, `FactVerificationCard.tsx`
- `PrivacyControlsPanel.tsx`, `ExportImportPanel.tsx`, `MemoryErrorBoundary.tsx`
- `ContextFileButton.tsx` (PR #321)
- `VerificationSwipeStack.tsx`, `VerificationBanner.tsx`, `VerificationCompletionScreen.tsx` (the current verify flow; `VoiceMemoryCapture.tsx` referenced by earlier drafts of this doc is not present in the current tree - TODO(founder): confirm whether voice capture now lives elsewhere, e.g. folded into the global capture flow)

### Hooks
- `useMemoryQueries.ts`: React Query integration for memory CRUD
- `useUserMemory.ts`: Memory state management

---

## Context Export: Portable AI Context

### Overview

The headline differentiator: export your Memory Web as formatted context to any AI tool. One click to make ChatGPT, Claude, Gemini, Cursor, or any LLM instantly personalized.

**Page**: `/context-export` (auth required)

### Export Formats (6)

| Format | Target | Instructions |
|--------|--------|-------------|
| **ChatGPT** | OpenAI ChatGPT | Go to Settings > Personalization > Custom Instructions |
| **Claude** | Anthropic Claude | Paste at beginning of first message in new conversation |
| **Gemini** | Google Gemini | Paste as first message with "Context about me:" prefix |
| **Cursor** | Cursor IDE | Save as .cursorrules in project root |
| **Claude Code** | Claude Code CLI | Save as CLAUDE.md in project root |
| **Raw Markdown** | Any tool | Use anywhere that accepts markdown |

### Export Use Cases (6)

| Use Case | Optimized For |
|----------|--------------|
| **General Advisor** | All-purpose context for any AI conversation |
| **Meeting Prep** | Context optimized for preparing for meetings |
| **Decision Support** | Focus on goals, blockers, and decision history |
| **Code Review** | Technical preferences and project context |
| **Email Drafting** | Communication style and relationship context |
| **Strategic Planning** | Business context, objectives, and patterns |

### Features

- Format + use case selection matrix
- Real-time preview of generated context
- Token count display ("X tokens | Last updated [date]")
- One-click copy to clipboard
- Download as .md file
- Per-format instruction banners
- Quick export shortcut from dashboard header

### Data Architecture

**Edge Functions**
- `memory-export`: Generates formatted context from Memory Web, respecting privacy settings and token budgets

**Hooks**
- `useMemoryExport.ts`: Export generation, format selection, and clipboard integration

---

## Agent Skill Builder: Voice-to-Skill Pipeline (free for now since PR #204)

### Overview

Turns a repetitive leader workflow into a downloadable, **agentskills.io-compliant** Agent Skill the leader drops into `~/.claude/skills/`. The leader describes (voice or text) one thing they do at least weekly. CTRL extracts the trigger, the steps, the format constraints, and packages it as a ZIP that auto-triggers in Claude Code / Claude.ai / Cursor whenever their language matches.

This is the third surface on the Context Export page (`/context`). Two minutes describing a Monday-morning ritual is enough to generate a permanent piece of agent infrastructure the leader owns.

> **UI updated 2026-06-17 (PR #199, merge 24f7d15):** the `/context` capture UI is now the **Automator deliverable flow** (Suggestions -> recognition pick-cascade -> Skill ready), not the old voice/text capture sheet. The Automator mines concrete recurring deliverables from the brain (blockers + decisions, with role / sector fallback), runs a roughly 5-step all-recognition cascade reusing the kit engine, and lands on Skill ready with Run it now + Export as markdown + a "Your skills" library peek. The old `SkillCaptureSheet` and `SkillPreviewSheet` (described later in this section) are now dead code, retained only for reference. See **Home / Decision Map / Automator UX Redesign** above.

> **Intake + harness upgrade (PR #204):** (1) **Free for now** - the Edge Pro gate on `generate-skill-export` was removed; any authenticated user, including anonymous kit sessions, can build skills. (2) The pipeline is **no longer untouched**: the prompt now checks boundedness first, runs the FOUR Honest Tests (Test 4 = voice-lock / consistent creative output), injects a self-identified VOICE_PROFILE, FORBIDS fabricated voice samples (reproduce the leader's real sample verbatim, else describe the register, never invent a quote), renders a structured 8-dimension `voice-profile.md`, and requires a `## Learning loop` section. The quality gate now passes 16/16 (the learning-loop check was previously failing). (3) A **unified voice profile** (`ctrl_voice_profile`, one `user_memory` fact, `fact_category` 'preference' / `fact_subtype` 'communication_style') is captured by `VoiceStyleProfileSheet` via 5 recognition picks OR a paste-extract power path backed by the new `extract-voice-profile` edge fn (paste real writing -> 8 voice dimensions in one LLM pass; anonymous-session safe, never stores raw text), surfaced into generated skills by `_shared/memory-context-builder.ts`, and used by the harness. The Automator tone step is voice-aware (a cold pick writes the profile; a returning leader gets a "still sound like you?" confirmation; a paste-extract affordance opens the sheet in paste mode), and `AutomatorScaffold` adds a desktop two-pane "your skill is taking shape" builder (widened to max-w-4xl; mobile unchanged). (4) Suggestions warm-start with a confident "your peers are using this" voice grounded in role + company profile (sector, plus a best-effort `company_context` / Apollo industry read), never a fabricated cohort count; an optional "Add your company site" affordance fires `enrich-company-context` then re-mines. (5) **Layered output**: library (home) + MCP (a live agent pull via `mcp-context`'s new `list_skills` / `get_skill`, read-scope, Edge-Pro gated) + per-item download (`LibraryTab` gained a "Connect these to your agent" MCP banner + Download(.md)).

**Pages / surfaces:**
- `/context`: the Automator deliverable flow (PR #199); free for now (PR #204)
- Edge view (`/dashboard?view=edge`): `AutomatePainCard` chip row of declared blockers + active decisions
- Memory Web blocker cards: zap button on each blocker
- Briefing: zap button on every `decision_trigger` segment (v1 + v2)

These pain-anchored entry points hand the user's already-declared pain to the Skill Builder via a `SkillSeed` and navigate to `/context`. The LLM grounds extraction in the leader's actual words instead of inventing an abstract trigger.

### The Pipeline (shipped May 2026)

Seven stages, all running inside `generate-skill-export/index.ts`:

| Stage | What it does | Model / Tool |
|---|---|---|
| 1. Access | Any authenticated user, including anonymous kit sessions. (PR #204 REMOVED the prior Edge Pro gate; the freemium-ladder WIP was stripped.) | Postgres |
| 2. Context build | Pull Memory Web facts + edge profile strengths/weaknesses + the unified `ctrl_voice_profile` for grounding | `buildMemoryContext` (3000 token budget) |
| 3. Boundedness + Four Honest Tests triage | Check boundedness first, then run the FOUR Honest Tests (Test 4 = voice-lock / consistent creative output) to decide whether the input is really a skill, a Memory Web fact, a Custom Instruction, or a Saved Style. Triage failures route the input to the right surface and are still logged in `skill_exports`. (PR #204 tightened this from three tests to four.) | OpenAI JSON mode (gpt-4o), temperature 0.3 |
| 4. Extraction | Generate skill name, description, body, references, test prompts, gotchas, archetype; inject a self-identified VOICE_PROFILE, forbid fabricated voice samples, render a structured 8-dimension `voice-profile.md` (PR #204) | OpenAI JSON mode |
| 5. Quality gate | Validate 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections (incl. `## Learning loop`), no bare MUST/NEVER, valid name format. Now passes 16/16 (the learning-loop check was previously failing; PR #204). | `runQualityGate` (deterministic) |
| 6. ZIP assembly | Build the agentskills.io standard bundle: single root folder, `SKILL.md` + `references/` + `01-test-prompts.txt` + `02-maintenance-card.txt` + `03-install-guide.txt` | `buildSkillZip` (Deno + JSZip) |
| 7. Persist | Insert into `skill_exports` (one row per attempt, including failed triage), return base64 ZIP inline | Supabase service role |

The Honest Tests triage (four tests since PR #204; Test 4 = voice-lock / consistent creative output) is the value-prop differentiator: when a leader describes a one-time fact ("I worked at Microsoft in 2010"), CTRL routes that to Memory Web rather than generating a useless skill. When they describe a tone preference ("I always write in plain English"), it routes to Custom Instructions. Skills only get generated when the input is a repeatable, triggerable workflow.

### Skill Archetypes

Every generated skill is tagged with one of five archetypes (used for analytics and for tuning future routing):

- **decision-framework**: recurring decision templates (e.g. RFP triage, hire/no-hire)
- **voice-lock**: exec writing patterns that must hold across many outputs (e.g. board update voice)
- **reporting-engine**: periodic structured reports (e.g. weekly hiring sync, investor update)
- **tool-integration**: workflows that bridge external systems
- **getting-started**: onboarding / first-touch skills

### Pain-Anchored Entry Points

Skill creation is a reflex on the page where the pain shows up, not a standalone trip to `/context`:

| Entry point | Component | Seed kind |
|---|---|---|
| Edge view chip row | `AutomatePainCard` | `blocker` or `decision` |
| Memory Web blocker card | Zap button on `MemoryItemCard` | `blocker` |
| Briefing decision-trigger segment | Zap button on `BriefingCard` and `SegmentCard` | `briefing_segment` |
| Curated examples (cold-start fallback) | `SkillCaptureSheet` chips | `example` |

The seed flows: entry point → `useNavigate('/context', { state: { skillSeed } })` → `ContextExport` page detects and auto-opens `SkillCaptureSheet` with a pre-filled scaffold. The user only adds the steps they follow today; the leading pain is already there.

### The SkillCaptureSheet (mobile bottom sheet / desktop dialog) [dead code as of PR #199, 2026-06-17 - replaced by the Automator flow; kept for reference]

- Voice mode (default when no seed): up to 5 minutes of recording, OpenAI Whisper transcript, optional review/edit before submit
- Text mode (default when arriving with a seed): pre-filled scaffold built from the seed text
- Pain picker chip row when no seed is provided (pulls top 5 from `useUserPains`)
- Curated example chips fallback when the leader has no declared pains yet (Monday board update, Weekly hiring sync, RFP triage, Investor update)
- 20-character minimum on the description

### The SkillPreviewSheet [dead code as of PR #199, 2026-06-17 - replaced by the Automator "Skill ready" screen; kept for reference]

- Skill description and archetype
- Big Download CTA (decodes the base64 ZIP into a Blob in-browser)
- Quality gate checklist (passed / total, per-check detail)
- Test prompts with copy buttons (the leader pastes these into Claude to verify the skill triggers)
- Install guide accordion: Claude Code (`~/.claude/skills/`), Claude.ai (uploaded skills), Cursor

### Triage Routing

When the triage gate decides the input isn't a skill, the response is:

```
{ triage: { passed: false, result: "memory_fact" | "custom_instruction" | "saved_style", reasoning: "..." } }
```

The UI surfaces the routing decision so the leader knows exactly what to do with their input. No skill is generated. The attempt is still logged in `skill_exports` so we can learn from the misses without re-running the LLM.

### Data Architecture

**Table** (`20260508000000_create_skill_exports.sql`):

```
skill_exports
├── id (PK, uuid)
├── user_id (FK auth.users, ON DELETE CASCADE)
├── skill_name (TEXT)
├── description (TEXT)
├── transcript (TEXT): original input, kept for analytics
├── triage_result (TEXT: 'skill' | 'custom_instruction' | 'memory_fact' | 'saved_style' | 'failed')
├── body_content (TEXT, null on failed triage)
├── references_json (JSONB)
├── test_prompts (TEXT[])
├── quality_gate (JSONB): full checklist result
├── archetype (TEXT): one of the 5 archetypes above
├── version (INT): supports skill iteration
├── zip_path (TEXT): null today; reserved for future Storage upload + shareable links
└── created_at (TIMESTAMPTZ)
```

RLS: owner-read, owner-insert. Indexed on `user_id` and `created_at DESC`.

**Edge Functions:**
- `generate-skill-export`: the whole pipeline. **Free for now since PR #204** (the Edge Pro gate was removed; open to any authenticated user, including anonymous kit sessions). 4 internal files: `index.ts`, `prompt.ts` (system + user prompts encoding the triage rules + extraction rules, tightened in PR #204), `quality-gate.ts` (deterministic validator), `zip.ts` (agentskills.io packager).
- `extract-voice-profile` (PR #204): paste real writing -> derive the 8 voice dimensions in one LLM pass; anonymous-session safe; does not store raw text. Backs the paste-extract power path in `VoiceStyleProfileSheet`.

**Hooks:**
- `useSkillExport`: wraps the edge function. Manages full lifecycle: call, parse, decode the base64 ZIP into a downloadable Blob.
- `useUserPains`: returns the top N blockers + active decisions from the leader's Memory Web for seeding entry points.
- `useVoiceProfile` (PR #204): CRUD for the unified `ctrl_voice_profile` fact (save enum bug fixed: `verification_status` 'confirmed' -> 'verified', which had been silently 400-ing).

**Components** (`src/components/edge/` + `src/components/memory-web/` + `src/components/automator/` + `src/components/kit/`):
- `SkillExportCard`: entry-point card on `/context`
- `VoiceStyleProfileSheet`: captures the unified voice profile (5 recognition picks OR paste-extract power path) (PR #204)
- `AutomatorScaffold`: desktop two-pane "your skill is taking shape" builder beside the flow; mobile unchanged (PR #204)
- `KitVoiceProfileCard`: per-kit voice carry-over copy (PR #204)
- `SkillCaptureSheet`: voice/text capture, bottom sheet on mobile, dialog on desktop (DEAD CODE)
- `SkillPreviewSheet`: preview + download CTA + install guide (DEAD CODE)
- `SkillQualityGate`: quality checklist display
- `SkillInstallGuide`: per-tool install instructions
- `AutomatePainCard`: pain-anchored entry chip row (PR #204: pain chips now show for everyone, no `isPaidUser` branching)

### Access (free for now since PR #204)

The Edge Pro gate on the Skill Builder was REMOVED in PR #204: any authenticated user, including anonymous kit sessions, can build skills, and the freemium-ladder WIP (`AutomatorTierBanner`, `useSkillBuildAccess`, `constants/skillTier.ts`, `_shared/skill-tier.ts`) was stripped. Edge Pro still gates the live MCP skills pull (`mcp-context` `list_skills` / `get_skill`) like the rest of that server. `AutomatePainCard` pain chips now show for everyone with no `isPaidUser` branching.

**Sales Anchor - Skill Builder**: "Describe one weekly workflow out loud. CTRL hands you a Claude Skill that auto-triggers whenever your team's language matches. Two minutes of speaking. Permanent leverage. Drop it in `~/.claude/skills/` and forget it."

---

## Kit Engine: Class Follow-Up Portal

### Overview

The portal a student lands on after a Mindmaker live class. They scan a QR on the way out, enter a session code (no login), answer a short intake, and CTRL composes a personalised pack of installable artifacts tuned to what they came to the class to do. The same page then becomes their journey page: a 7-day plan to work through, a place to mark "I shipped it", and a way to regenerate the pack with feedback or paste new context back in.

This replaces the static Google Docs follow-up that every class used to send. Those got 0% adoption - a link in an email that nobody opened. The Kit Engine turns the follow-up into something the student actually installs and uses, and gives CTRL a real success metric to optimise: the **7-day ship rate** (did the student ship the thing the class was about, within a week).

The engine is also the front door to the full CTRL app. Intake answers seed the student's Memory Web, and a bridge card links to `/dashboard` once they hand over an email.

Shipped as PR #141 (branch `claude/kit-engine`), 2026-06-10, with two presets. It grew to four documented kits and survived a major intake-cascade bug fix in PR #193; a 5th preset exists in the current codebase - see "The Kit Program" below.

> **DATA TRUST WARNING (2026-06-17):** any `kit_builds.intake` row written **before PR #193** (merge 090dda2, 2026-06-17) is **TRUNCATED and untrustworthy.** A latent cascade bug silently dropped the back half of every kit's pick-cascade for all users since launch, so those rows never captured the later intake steps (for the org-chart kit: `guardrails`, `grind`, `involves`, `maturity` were never recorded). Do not use pre-#193 kit intake data for analysis or personalisation backfills.

**Pages / surfaces (outside the authed app shell):**
- `/kit` - code entry. Starts an anonymous Supabase session, redeems the code, lands the student in the portal.
- `/kit/me` - the kit + journey home: pack of artifacts, 7-day plan checklist, "I shipped it" celebration, regenerate-with-feedback, context-capsule paste-back.
- `/kit/me/intake` - the 6-question intake (voice or taps).
- `/kit/reading/:pageId` - full-screen reader for a single artifact.

### The Student Flow

1. **Scan + code** - student scans the QR at the end of the class, lands on `/kit`, enters the session code. No account, no password. An anonymous session is created via `ensureAnonSession`.
2. **Intake** - 6 short questions, answerable by voice or by tapping options. Captures what they're building, where they're stuck, and what "shipped" looks like for them.
3. **Compose** - `kit-compose` runs in the background and builds the pack. The build row is the progress UX: the client polls it and watches each artifact flip from pending to ready.
4. **Pack** - the student gets their artifacts. They read, copy, and download what they need.
5. **Send my pack** - the one moment email is asked for. Handing over an email sends the pack and upgrades the anonymous account (`upgradeAnonymousSession`), so the student can come back to the same kit later.
6. **Journey** - the page becomes a 7-day plan. The student checks off steps, hits "I shipped it" when they ship, regenerates with feedback if the pack missed, or pastes new context back in to sharpen it.

### The Artifacts

The pack is a set of installable artifacts, not a document. Each artifact is markdown or JSON inline, or a downloadable ZIP (stored inline on the artifact row as base64). The pack stays downloadable for the life of the redemption - the student can come back weeks later and the artifacts are still there.

Artifacts are composed per student from their intake answers, grounded in the class preset. A "learning loop" section is part of every pack (an advisory quality-gate check ensures it's present), so the artifacts teach the student how to keep improving the thing after the class, not just hand them a one-off output.

### The Preset Model

One engine, many class presets. A preset is the only thing that differs between classes - the runtime, the data model, and the UI are shared.

- Presets live in `supabase/functions/_shared/kit-presets/` and are imported by **both** the Deno edge runtime and the Vite client (the same cross-import pattern as `_shared/edge-pricing.ts`).
- The database stores only `class_slug` + `preset_version`. The preset content lives in code.
- **Adding a new class is not new code.** It's a new preset folder, a registry entry, and one `kit_codes` row.

### The Kit Program (documented as 4 kits through 2026-06-17; a 5th preset exists in code, found in this pass)

The engine shipped **four kits** on the fork + pick-cascade + live-picks-board model:

1. **Vibe Coding Field Kit** (`vibe-coding`) - original.
2. **Autonomous Business Pack** (`autonomous-business`) - original.
3. **Memory & Identity Prompt Pack** (`memory-identity`, code MEMORY-JUN26) - original.
4. **Agentic Org Chart** kit - added in PRs #190 / #191. Composes an org chart of agent-led vs human-led boxes from the student's intake cascade.

**Not previously documented: a 5th preset, "Build Your AI Chief of Staff" (`chief-of-staff`), exists in `supabase/functions/_shared/kit-presets/chief-of-staff/` and is registered in the preset index.** Unlike the other four (which each build an artifact), this one is a diagnostic: a linear one-chip-per-screen intake feeds a deterministic scorer (`scoring.ts`) that recommends one of seven "rungs" for building a personal AI chief of staff, with the LLM only warming up prose, not the recommendation logic itself. It has its own unit tests. TODO(founder): confirm whether this preset is live (has a redeemable `kit_codes` row) or shipped-in-code-but-not-yet-launched.

**Parity retrofit (PR #192):** all three pre-existing kits were brought up to the model the org-chart kit introduced:
- **Fork** - a kit forks per student.
- **Pick-cascade** - a sequence of pick steps where each pick narrows the next.
- **Live picks-board** - the student's running picks are shown back to them as they go.

**PR #193 (merge 090dda2, 2026-06-17) - two fixes, both prod-verified:**
1. **Cascade bug fix (the latent bug above).** A deferred single-select auto-advance closed over a stale `steps.length`, so the cascade stopped early and the back half of every intake was dropped for all users since launch. Fixed by reading live refs in `goNext`. (Consequence: pre-#193 `kit_builds.intake` rows are truncated - see the DATA TRUST WARNING above.)
2. **Honesty floor on the composed org chart.** A box that touches a flagged guardrail can **never** be left agent-led. This is a hard floor in compose, not advice: if the student flagged a guardrail on something a box touches, that box is forced human-led.

**Sales Anchor - Agentic Org Chart kit**: "Walk out of class with a real org chart of what your agents run and what stays human, with the lines you flagged as no-go locked human-led. Not a worksheet, a decision."

> **PR #204 kit notes:** the 4 kit intakes were audited and confirmed already at recognition parity (100% recognition picks, forked adaptive cascade, two-pane desktop). `AutomatePainCard` pain chips now show for everyone (free, no `isPaidUser` branching), and a new `KitVoiceProfileCard` shows per-kit voice carry-over copy from the unified `ctrl_voice_profile`.

### Entitlement & Quota

Redeeming a code grants a **30-day pass** plus a **skill quota of 3 net-new builds**. The pass and quota live on the `kit_redemptions` row. Two atomic RPCs guard the entitlement:

- `redeem_kit_code` - row-locks the code so a whole class redeeming at the same moment can't race it. Idempotent: a student re-entering their code lands back in their existing kit, not a duplicate.
- `consume_kit_skill` - decrements the quota atomically on each net-new build.

Both are `SECURITY DEFINER` with no anon/authenticated execute grant - they run on the student's behalf from the edge layer, never directly from the client.

### Journey + Nudges

The kit page doubles as a journey page:
- **7-day plan** - a checklist the student works through over the week after the class.
- **"I shipped it"** - a celebration moment when the student ships, the event the success metric keys on.
- **Regenerate with feedback** - the student says what the pack missed and CTRL recomposes.
- **Context-capsule paste-back** - the student pastes new context (a doc, a transcript, a brief). It's untrusted input, so it's fenced through the existing `extract-user-context` fact machinery via `kit-capsule-ingest` rather than trusted raw.

Every journey action is appended to `kit_journey_events` (append-only log).

**Email nudges** land on day 3 and day 7, sent by the `send-kit-nudges` cron sweep. Students who already shipped are skipped - the nudge is help, not noise. Sends are deduped through the `kit_nudges` ledger so nobody gets the same nudge twice.

### Where It Sits Commercially

The Kit Engine is the top of the funnel, not a paid surface in itself. It is free at the point of a Mindmaker live class and exists to prove value before any ask:

```
free class  →  personal kit (free, anonymous)  →  Edge Pro / Workshop / Cohort
```

The Edge Pro upsell ($49/month, canonical `_shared/edge-pricing.ts`) appears only **post-trust** - after the quota is hit, after the 30-day pass expires, or when a student tries to regenerate after expiry. It never gates what was already delivered: the pack the student earned in class stays theirs. The bridge card into `/dashboard` (shown after email capture) is the path from a single class kit into the full CTRL product.

**Sales Anchor - Kit Engine**: "Scan a QR on the way out of class. No login. Answer six questions. Walk out with a personalised pack you actually install, a 7-day plan to ship it, and nudges that stop the moment you do. The follow-up that replaces the Google Doc nobody opened."

---

## Daily Briefing: Personalised Intelligence with an Evidence-Based Lens

The most sophisticated component of the Leaders tool. Produces a 500-600 word audio briefing every morning, tuned to what this specific leader cares about today. Built on an evidence-based relevance pipeline (v2) that can prove, story by story, why every headline earned its place in front of you.

**Pages / surfaces:**
- `/dashboard` - inline briefing card with expandable segments and quick actions
- `BriefingSheet` - full-screen slide-up with audio player and segment details
- `BriefingPage.tsx` - deep-link view for a specific briefing

### The Pipeline (v2, merged April 2026)

Seven stages, all running inside `generate-briefing/index.ts`:

| Stage | What it does | Model / Tool |
|---|---|---|
| 1. Importance Lens | Ranks the profile items that matter TODAY for THIS briefing type | gpt-4o-mini (structured JSON), 24h cache |
| 2. Query Planner | Turns the lens into 4-6 targeted news queries | gpt-4o-mini |
| 3. Provider Fan-out | Perplexity + Tavily + Brave in parallel, 12s wall-clock cap | `Promise.allSettled` |
| 4. Embedding Dedupe + Scoring | Cosine dedupe, user-exclude filter, relevance scoring | `text-embedding-3-small` (batched), pgvector |
| 5. Budget-Constrained Curation | Picks final segments within word budget with diversity + coverage rules | gpt-4o-mini |
| 6. Script Generation | Writes the audio script using training_material voice + rubric | gpt-4o |
| 7. Audio Synthesis | Generates the MP3 | ElevenLabs (`synthesize-briefing` fire-and-forget) |

Every retained segment carries three evidence fields v1 never captured:
- `lens_item_id` - which lens item this story matched
- `relevance_score` - cosine similarity * lens weight
- `matched_profile_fact` - the quoted text from the user's profile that justifies the story

Routed behind a per-user flag - `user_memory.briefing_v2_enabled`, or the `BRIEFING_V2_ENABLED_DEFAULT` env var. `ai_landscape` briefings stay on v1 (they use synthetic headlines from live AA benchmark data, not live news).

### Briefing Types

| Type | Intent | Pro only? |
|---|---|---|
| `default` ("Daily Brief") | Top stories for your world | No |
| `macro_trends` | Big shifts in AI / markets / regulation | No |
| `vendor_landscape` | Launches, pricing, vendor moves | Yes |
| `competitive_intel` | What your watchlist is doing | Yes |
| `boardroom_prep` | Trends and data for exec presentations | Yes |
| `ai_landscape` | Live benchmarks on models that matter | Yes |
| `custom_voice` | User describes what they need | Yes |

### Briefing Interests (user-declared preferences)

A first-class surface that overrides inferred signals. Three kinds:

- **Beats** - topics you want covered (e.g. "creator monetization", "AI pricing"). Become lens items with weight 1.0. LLM cannot demote them below 0.8.
- **People & Companies** - named entities to track (e.g. "MrBeast", "OpenAI"). Also weight 1.0.
- **Don't show me** - topics to permanently kill. Post-filters the candidate pool - any story within 0.80 cosine of an exclude never surfaces.

**UI:**
- Settings → Interests tab (position 3, after Account + Work)
- Inline `SeedBeatsPrompt` on the dashboard for cold-start users
- Inline Bookmark button on every v2 segment (pins the `matched_profile_fact` as a beat)
- Inline Ban button (records a persistent kill - see below)

**Data:** `briefing_interests` table, RLS-guarded to owner, soft-delete via `is_active`.

### Industry-Aware Seed Beats

Solves the new-user cold-start. Before a user has declared anything, the `SeedBeatsPrompt` proposes a relevant starter set of beats and entities keyed to their declared industry.

**Library (`industry_beat_library` table):**
- 11 industries seeded: `creator_economy`, `saas`, `healthcare`, `finance_fintech`, `consulting_professional_services`, `ecommerce_retail`, `media_publishing`, `education_edtech`, `biotech_life_sciences`, `legal_services`, `generic`
- Each row: 6-8 curated beats + 4-7 recommended entities + fuzzy-match aliases
- Editable via SQL without redeploy (content ops friendly)

**Resolution:** fuzzy match on user's `industry` fact; longest-alias wins; `generic` fallback. Pre-filters anything the user already added or excluded. Taps write `briefing_interests` rows with `source='seed_accepted'`.

### Persistent Semantic Feedback Loop

Promotes thumbs-down from a per-segment reaction into a durable signal that reshapes the lens. Signatures are SHA-256 of `bucket|normalized_text`, so feedback persists across daily lens regenerations.

**Two sources, both stored in `briefing_lens_feedback`:**

1. **Explicit kill** (`source='kill'`, delta = -1.0) - user taps the Ban icon on any v2 segment. Takes effect on the next generation.
2. **Aggregated thumbs-down** (`source='not_useful_aggregate'`, delta = -0.4) - nightly `pg_cron` job (`briefing-aggregate-feedback-nightly`, 03:07 UTC) promotes any lens signature that has accumulated 3+ not_useful reactions in the last 30 days.

`applyFeedbackDeltas` runs in both the cold build path and the cached-lens path, so kills don't need to wait for the 24h lens cache to expire.

**Kill UI:** Ban icon on `SegmentCard` and on `BriefingCard`'s inline segments, hidden on interest-type items (users remove their own interests from the Settings tab instead).

### Feedback That Does Something

Thumbs-up / thumbs-down now capture:
- `lens_item_id` - what the segment was anchored to
- `dwell_ms` - how long the user kept the segment open before reacting
- `replayed` - whether they replayed the audio

This is the substrate the aggregator reads from.

### Segment UI (v2)

Every v2 segment on the dashboard shows:
1. Framework tag badge (SIGNAL / DECISION TRIGGER / KRISH'S TAKE)
2. Headline (rewritten through the leader's lens, 8-16 words)
3. `Anchored to: <lens item>` chip - the evidence
4. Thumbs-up / thumbs-down (feedback)
5. Bookmark (pin the anchor as a persistent beat)
6. Ban (kill the lens signature)
7. Source badge

### Preliminary Insert Pattern

`generate-briefing` writes an EARLY briefing row as soon as raw headlines are scored, so the frontend can show results while curation + script generation run in the background. The frontend polls every 3s; the preliminary row has `script_text = null` and empty `analysis` / `relevance_reason` fields that fill in when curation completes.

### Data Architecture

**Tables**
- `briefings` - one row per briefing (`schema_version = 2` for v2 rows); carries `segments JSONB[]`, `context_snapshot` (lens + queries + excludes), `audio_url`
- `briefing_feedback` - per-segment reactions with v2 fields (`lens_item_id`, `dwell_ms`, `replayed`)
- `briefing_interests` - user-declared beats / entities / excludes
- `industry_beat_library` - reference data for cold-start seeds
- `briefing_lens_feedback` - persistent negative deltas per lens signature
- `ai_response_cache` - lens cache + lens-item embedding cache
- `training_material` - YAML voice guide (structural_rubric, hot_signal_taxonomy, exemplars, watchlist)

**Extensions:** pgvector (for embeddings), pgcrypto (for signature hashing), pg_cron (for the nightly aggregator).

**Edge Functions**
- `generate-briefing` - main pipeline (both v1 + v2 paths)
- `synthesize-briefing` - ElevenLabs audio synthesis
- `briefing-diagnose` - read-only diagnostic: returns profile + lens + last briefing + feedback stats for the authenticated user
- `get-industry-seeds` - returns industry-specific beat / entity suggestions
- `briefing-kill-lens-item` - records an explicit kill
- `briefing-aggregate-feedback` - admin / cron entrypoint (the nightly schedule uses a SQL function `sp_aggregate_briefing_feedback` so no service-role key is needed)

**Shared modules** (`_shared/`)
- `briefing-lens.ts` - Stages 1 + 2 (lens + query planner)
- `briefing-scoring.ts` - Stage 4 (embeddings + dedupe + scoring + exclude filter)
- `briefing-curation.ts` - Stage 5 (budget-constrained picker)
- `user-context.ts` - profile projection (shared with diagnose)
- `lens-signature.ts` - SHA-256 signature of `(type, text)` for stable feedback keying
- `training-loader.ts`, `ai-cache.ts`, `model-router.ts`, `rateLimit.ts` - reused infra

**Frontend hooks**
- `useBriefing` - briefing fetch + polling
- `useBriefingInterests` - CRUD for the Interests tab
- `useIndustrySeeds` - cold-start suggestions
- `useKillLensItem` - kill action wrapper

### Pipeline Flags / Env Vars

- `BRIEFING_V2_ENABLED_DEFAULT` - global default for v2 routing (`false` to stay on v1)
- `BRIEFING_DEDUPE_THRESHOLD` - cosine threshold for headline dedupe (default 0.87)
- `BRIEFING_EXCLUDE_THRESHOLD` - cosine threshold for user-exclude post-filter (default 0.80)

### Reliability hardening (Audit Week 4)

The briefing pipeline ships with concrete reliability primitives:
- **`with-timeout` utility** (`supabase/functions/_shared/with-timeout.ts`, tested) wraps every external API call with explicit timeouts and retries.
- **Provider fan-out** uses `Promise.allSettled` with a 12-second wall-clock cap so a single slow provider can't block the briefing.
- **Audio failure UX**: if synthesis fails, the briefing card still shows segments + script. The MP3 is fire-and-forget and degrades gracefully.
- **Rate limits** on `generate-briefing` (Audit Week 1) prevent abuse and runaway cost.
- **Onboarding stall recovery** for users who started a briefing then closed the app.

### Observability (Audit Week 5)

- **Structured edge-function logger** (`supabase/functions/_shared/logger.ts`) emits JSON logs with `ts`, `level`, `fn`, `msg`, `userId`, `duration_ms`, `error`. Searchable in Supabase logs.
- **CI gate** prevents `console.log` regressions in edge functions.
- **`with-timeout` test coverage** validates retry + timeout behaviour.

**Sales Anchor - Daily Briefing**: "Three minutes a day that replace thirty minutes of scrolling. Every story shows the specific profile fact it was anchored to. Bookmark to keep a beat. Ban to kill a topic semantically. Your briefing gets sharper every day."

---

## Guided First Experience (Onboarding) - RETIRED, replaced by InlineProfileSetup

> **STATUS (verified 2026-08-02):** `GuidedFirstExperience.tsx` no longer exists anywhere in the repo, and `src/components/onboarding/` now contains only `Coachmark.tsx` - the 8-step voice-question flow described below was deleted as part of the unified onboarding -> decisions -> engagement loop (PR #298, 2026-06-29; see the **Home: the unified 2028 cockpit** section above). Onboarding today is `InlineProfileSetup` (industry + role captured direct to `user_memory`, plus interests via `SeedBeatsPrompt`), rendered inline inside the Home feed for new leaders - not a separate gated flow, and not voice-only. The description below is kept for historical reference only; do not present it as current.

### Flow (historical)

1. **Welcome** - "Let's build your AI double" (icon + CTA)
2. **Intro** - Shows 3 pillars: Memory Web, 10X Skills Map, Master Prompts
3. **Question 1: Identity** - "Tell me about yourself" (voice or text)
4. **Question 2: Work** - "Tell me about your work" (voice or text)
5. **Question 3: Goals** - "What are you working toward?" (voice or text)
6. **Processing** - Transcription, fact extraction, Memory Web building (animated)
7. **Value Moment** - "Your AI double knows X things about you" + live preview of exportable context + copy to clipboard
8. **Complete** - "Your digital clone is live", redirects to Dashboard

### Key Design Decisions (historical)

- Voice-first with text alternatives on every question
- Animated waveform during recording
- Progress bars (3 areas) at top
- Each question has area icon, title, prompt, hint
- Fact verification step lets user accept/reject extracted facts
- Value moment shows actual exportable context, proving immediate value

---

## Pattern Detection & 10X Skills

> **STATUS (verified 2026-08-02):** the "Strengths to 10X" / "Blind Spots" card labels described below no longer appear anywhere in the current UI (verified by grep). The backing table (`user_patterns`) and edge function (`detect-patterns`) are still live and still read/written by `useMemoryWeb.ts` (patterns feed into an internal health-score calculation), but the dedicated 3-column dashboard display described below does not currently render on any page. TODO(founder): confirm whether patterns are meant to resurface elsewhere (e.g. folded into the Brain graph or Track Record) or this is now backend-only signal.

### Overview

AI analyzes the Memory Web to surface patterns: strengths to amplify, blind spots to address, and behavioral preferences. Historically displayed on the dashboard in a dedicated card layout (see status note above for current reality).

### Pattern Types

| Type | Description | Dashboard Section |
|------|-------------|-------------------|
| **strength** | Strengths to 10X - capabilities to amplify | "Strengths to 10X" card |
| **blind_spot** | Gaps or risks to address | "Blind Spots" card |
| **preference** | Working style and approach preferences | "Behaviors & Preferences" card |
| **behavior** | Recurring behavioral patterns | "Behaviors & Preferences" card |
| **anti_preference** | Things the user avoids or dislikes | "Behaviors & Preferences" card |

### Features

- Confidence scoring (0-1) on each pattern
- Patterns derived from Memory Web facts
- Auto-updated as Memory Web grows
- Up to 4 patterns displayed per section on dashboard

### Data Architecture

**Tables Used**
- `user_patterns`: Pattern storage with type, label, description, confidence

**Edge Functions**
- `detect-patterns`: AI pattern detection from Memory Web facts

---

## Decision Engine: weighing a decision (`/decision`)

The flagship decision-support surface, not documented in earlier versions of this file even though it is one of the app's 3 primary desktop/mobile nav tabs. Reached from Home's "Run a decision" action, a `KickstartCard`, the Decision Map's "Decide" prefill, or directly at `/decision`.

### The pipeline

POST a statement -> `decision-engine` runs it through a background pipeline (`EdgeRuntime.waitUntil`) while the frontend polls `decision_cases` + `decision_claims` + `decision_tensions` every 2s until the stage is terminal:

1. **Reframe (Stage 0, PR #216, hardened PR #328)** - classifies whether the statement is already AI-native; if it is general business, reframes it into the AI-native version of the SAME decision (LLM-driven, with a deterministic `templatedReframe` fallback so nothing silently passes through unreframed). Both the original statement and the reframe are carried; the UI surfaces the reframe as a quiet banner only when a reframe actually happened. As of PR #328 the reframe is surfaced consistently and the pipeline's text output is sanitized (`_shared/sanitize.ts` `stripEmDashes`, among other cleanups).
2. **Decompose** - breaks the statement into claims tagged to one of six AI-native "forces" (Dimension).
3. **Verify** - web-grounded evidence retrieval per claim, plus an Artificial Analysis retriever (`retrievers.ts` `searchArtificialAnalysis`) that attaches real model-benchmark standing as primary-tier evidence when a claim names a specific model.
4. **Cross-examine** - a second, independent pass that argues against the first.
5. **Advise** - the final call: verdict, confidence, where it holds, where it breaks, a watch line, and a "what to check next" list.

**Reliability (PR #328, 2026-07-04):** an eval gate (`supabase/functions/decision-engine/eval/`, golden-set-driven) is wired into CI via a Vitest job (`4e78f2c`) that runs the sanitizer + reframe-consistency checks on every PR, alongside the existing typecheck/build/lint gates.

### The UI (rebuilt as a "radial force spider", PRs #308-320, late June/early July 2026)

`src/components/operator/decision/` (orchestrated by `PressureTestPanel.tsx`):
- **`DecisionCapture.tsx`** - the cold-start ask: one calm text field with ghost-text example copy, a mic affordance embedded in the field footer (not a separate button) that records + transcribes + appends, and a single "Weigh it" CTA.
- **`DecisionOrb.tsx`** - the branded "pressure-testing" running state: concentric counter-rotating rings around a breathing core (not a generic spinner).
- **`DecisionBoard.tsx`** - the warm state: live pressure-tests as calm cards (a Ready card shows its trust read; an in-flight one shows a working pill + a quiet status line) above a fast-capture bar.
- **`DecisionSpider.tsx`** / **`decisionSpiderModel.ts`** - the same six AI-native forces spider out around the decision at FIXED positions every time (so the shape is learnable), each captioned with THIS decision's specific concern (from the engine's `force_labels`) and colour-coded by health (green holds / amber shaky / grey only-you-can-call). Centering math is ported from the brain graph's `computeViewBox`.
- **`DecisionResultView.tsx`** - the call, one screen: a verdict pill + trust read + trust bar, a two-column "where it HOLDS" (emerald) / "where it BREAKS" (amber) derived honestly from the real claim verdicts (never fabricated), a watch line, and two actions (open Decisions / bank this call). Full depth (every claim + its evidence) is one tap away in a sheet so the main screen never grows past the viewport.
- **`EvidenceList.tsx`** - the shared "what this is based on" renderer: AI-only evidence, ONE line per source (not a raw article dump), grouped into "supports" / "counters" / "context", each row carrying a single 0-100 trust ring (freshness + reliability + corroboration, server-scored). Tap to interrogate: fuller excerpt, score breakdown, link out. Evidence can be nested/countered.
- **`DecisionAnatomy.tsx`** - the deeper research actions sheet, entered via **"Dig deeper"** (renamed from the earlier "Take it further" copy).
- **`decisionMemo.ts`** (PR #321) - every completed weigh copies as a board-ready one-page markdown memo (pure + unit-tested); quiet Copy rows on `DecisionResultView` and `DecisionAnatomy`. Honest by construction: no options/alternatives section is fabricated, since the engine stores no alternatives.
- **`useDecisionChecklist.ts`** + `send-decision-summary` edge function - the "what to check next" bullets get persisted tick-state (keyed by normalized bullet text, so a tick survives a re-advise that keeps the same string) and an "email this to me" action that sends a branded checklist email pointing at `https://ctrl.themindmaker.ai/decision`.
- **`resolveFlow.ts`** / **`DecisionResolvedMoment.tsx`** / **`ResolveDecisionSheet.tsx`** - an honest resolve/closure flow: marking a decision resolved writes a `PlayedOut` outcome, closure copy is keyed to how it played out (win / logged honestly / parked), and a resolved decision stays closed across navigation (the next-active-case picker explicitly excludes the just-resolved id, even against a stale pre-refresh list).

### Data Architecture

**Tables** (all RLS owner-scoped): `decision_cases` (carries `reframed`/`reframed_statement`/`reframe_note`/`lifecycle_stage` alongside the original `statement`), `decision_claims`, `decision_evidence` (`retriever` CHECK includes `artificialanalysis`), `decision_tensions`, `decision_alerts`, `decision_events`, `decision_eval_cases`, `decision_check_items` (the persisted checklist tick-state), `decision_user_calls`.

**Edge Functions:** `decision-engine` (the pipeline above), `decision-watch` (hourly `pg_cron` WATCH loop that re-verifies load-bearing claims and raises idempotent `decision_alerts`), `decision-eval` (admin-only single-claim calibration harness), `decision-reactions`, `decision-research`, `send-decision-summary` (the checklist email).

**Hooks:** `useDecisionEngine` (run + poll), `useDecisionInbox` (case list + open alerts), `useDecisionCall`, `useDecisionActions` (open/strengthen/archive an active case from the Track Record surface - see **Capability & Track Record** below), `useDecisionChecklist`, `useResolveDecision`, `usePinnedDecision`.

**Sales Anchor - Decision Engine**: "Ask a hard question. Watch it get decomposed into the forces that actually determine it, verified against real evidence (including live model-benchmark data when a claim names a model), and cross-examined by a second pass that argues against the first. Get a call with where it holds and where it breaks, a checklist of what to verify next, and a board-ready memo you can copy in one tap."

---

## Capability Ladder & Track Record (`/track-record`, PR #321 for the ladder)

The "You" surface. Two related but distinct things live here:

**Track Record** (`src/components/track-record/`, `useTrackRecord.ts`) - the leader's decision history: `TrackRecordView.tsx`, `AgedCallRow.tsx` (per the settings audit, PR set 2026-07-04, these rows now read "Active decision" with real Open / Strengthen / Archive actions wired through `useDecisionActions` to existing doors - open deep-links `PressureTestPanel` via `openCaseId`, strengthen re-runs `research('strengthen')`, archive writes `status='archived'` mirroring `useResolveDecision`; none of the three is a new feature, they reuse existing plumbing), `CalibrationSummary.tsx`, `DecisionCard.tsx`. The old 0/0/0 scoreboards were removed: cold state is a promise, warm state is an honest first pattern (never a deflating "0/N"), rich state is an earned calibration record - all derived from real data.

**Capability Ladder** (`src/lib/capabilityLadder.ts`, PR #321, pure + unit-tested) - derives an EARNED 4-stage progression from observed behaviour only, never XP or streaks:
1. **orienting** - still learning who the leader is, or no real decision weighed yet
2. **operating** - real decisions are going through the engine
3. **calibrating** - the leader records how calls played out, so judgment is being scored against reality
4. **compounding** - the track record shows a defensible pattern AND context works outside CTRL (a built skill or a live agent connection)

Surfaced via `useCapabilitySignals` (shared react-query, no new tracking infrastructure) and `CapabilityHeader.tsx`, which tops the You/Track Record surface. When the ladder's next move lives outside the weigher, it feeds Home's kickstart slot (`applyNextMoveToKickstart`). `postureForStage` is a behaviour-identical seam that could later drive `useCockpit`'s guide/partner posture directly from capability stage rather than lifecycle recency; today the two intentionally coexist (lifecycle `userState` = engagement recency, capability stage = earned behaviour).

**Data:** derived from `decision_cases` / `decision_check_items` / `user_memory` / `ctrl_voice_profile` / MCP-connection facts already described elsewhere in this doc - no new tables.

**Sales Anchor - Track Record**: "CTRL doesn't hand you a badge for logging in. It watches whether your calls actually held up, and tells you honestly which stage of AI-native operating you're actually in."

---

## Legacy Decision Tracking (`user_decisions`, `useDecisions.ts`)

A separate, much simpler decision-logging table that predates the Decision Engine above. `useDecisions.ts` still exists in `src/hooks/` and `user_decisions` still exists as a table (status: active, superseded), but `useDecisions` is not imported by any component in the current tree (verified by grep) - it is dead code, not a live surface. The decision-weighing surface for a leader today is the Decision Engine (`/decision`) above.

---

## Memory Web Dashboard (RETIRED - kept here only so a stale claim isn't repeated elsewhere)

Earlier versions of this doc described a separate "AI Double Health Card" / animated health score / "Getting Smarter" dashboard as the `/memory` hub. That component set does not exist in the current `src/pages/MemoryCenter.tsx` (verified by grep - no health score, no "Getting Smarter" copy, no `GettingSmarterBanner` import). The current Memory Center is the fact list + verification + Brain graph surfaces described in **Memory Center** and **Brain Engine** above. This section is intentionally left empty of feature claims rather than guessing what replaced the removed visuals; TODO(founder) if a health-score-style summary is wanted back.

---

## Missions System (First Moves)

> **STATUS (verified 2026-08-02): no route or page currently mounts this UI.** `FirstMoveSelector.tsx`, `MissionsDashboard.tsx`, `MissionCheckIn.tsx`, and `MissionHistory.tsx` do not exist anywhere in `src/pages/` or `src/components/missions/` today, and `src/router.tsx` has no route for them. The `leader_missions` / `leader_check_ins` tables, `useMissions.ts` / `useCheckIns.ts` hooks, and the `send-mission-check-in` edge function are all still present and technically live, but unreachable from the app. TODO(founder): confirm whether this is an intentional deprecation (the feature description below is retained for historical reference) or a page that was removed by accident.

### Overview

After completing the diagnostic, leaders receive 3 prioritised "First Moves" - concrete next steps. The Missions system allows leaders to commit to a First Move, track progress through check-ins, and measure completion.

### Features

**First Move Selection** (`FirstMoveSelector.tsx`)
- Displays 3 AI-generated first moves from diagnostic
- Each move has content and priority ranking
- Leader selects one to commit as active mission

**Mission Dashboard** (`MissionsDashboard.tsx`)
- Active mission display with status
- Mission statuses: active, completed, skipped, extended
- Quick access to check-in

**Mission Check-In** (`MissionCheckIn.tsx` page)
- Structured reflection on mission progress
- Text and voice input support
- AI-generated response to reflection
- Check-in history

**Mission History** (`MissionHistory.tsx` page)
- View all past missions
- Status tracking (completed, skipped, extended)
- Timeline of check-ins per mission

### Data Architecture

**Tables Used**
- `leader_first_moves`: AI-generated first moves (3 per assessment)
- `leader_missions`: Active mission commitments
- `leader_check_ins`: Check-in reflections and AI responses

**Edge Functions**
- `send-mission-check-in`: Check-in reminder notifications

### Hooks
- `useMissions.ts`: Missions CRUD and state management

---

## Progress Tracking

> **STATUS (verified 2026-08-02): no route or page currently mounts this UI.** `Progress.tsx` and `Baseline.tsx` do not exist in `src/pages/` today, and there is no route for them in `src/router.tsx`. The `leader_progress_snapshots` table and the `generate-progress-snapshot` / `compute-drift` / `batch-compute-drift` / `update-adoption-momentum` edge functions are still present and technically live, but unreachable from the app. TODO(founder): confirm intentional deprecation vs. accidental page removal (same open question as Missions System above).

### Overview

Tracks leader progress over time through periodic snapshots and drift detection, measuring how AI literacy evolves after the initial diagnostic.

### Features

**Progress Snapshots** (`Progress.tsx` page)
- Periodic captures of current state
- Comparison against baseline assessment
- Visual trajectory display

**Drift Detection**
- Measures change from baseline scores
- Identifies areas of improvement or regression
- Generates drift score

**Adoption Momentum**
- Tracks engagement patterns
- Measures tool usage frequency
- Identifies momentum trends

### Data Architecture

**Tables Used**
- `leader_progress_snapshots`: Point-in-time captures

**Edge Functions**
- `generate-progress-snapshot`: Generate snapshot data
- `compute-drift`: Calculate drift from baseline
- `batch-compute-drift`: Batch drift computation
- `update-adoption-momentum`: Momentum tracking

### Hooks
- `useProgress.ts`: Progress data queries

---

## Weekly Check-ins

> **STATUS (verified 2026-08-02): no route or page currently mounts this UI.** `WeeklyCheckin.tsx` does not exist in `src/pages/` today, and `/check-in` is not a route in `src/router.tsx`. `submit-weekly-checkin`, `send-weekly-checkin-reminder`, and `generate-weekly-prescription` edge functions are still present and technically live, but unreachable from the app. TODO(founder): same open question as Missions System / Progress Tracking above.

### Overview

Structured weekly reflections that help leaders maintain engagement with their AI literacy development.

**Page**: `/check-in` (auth required)

### Features

- Weekly structured reflection prompts
- Text and voice input
- AI-generated responses and recommendations
- Check-in history and streaks

### Data Architecture

**Edge Functions**
- `submit-weekly-checkin`: Process check-in submission
- `send-weekly-checkin-reminder`: Reminder notifications
- `generate-weekly-prescription`: Weekly prescription content

### Hooks
- `useCheckIns.ts`: Check-in queries and state

---

## Operator Tools

### Overview

AI-powered tools for day-to-day leadership decision-making, available after completing the diagnostic.

> **STATUS (verified 2026-08-02):** the edge functions below all still exist and are deployed, but `PromptCoach.tsx` and the old `DecisionCapture.tsx` operator pages no longer exist in `src/pages/`, none of these functions has a route in `src/router.tsx`, and their only frontend caller (`MeetingPrepTab.tsx`, plus the `get-daily-prompt` / `get-or-generate-weekly-action` wrappers in `src/lib/api.ts`) is itself unimported by any live component (confirmed by grep - the only references left are in `src/__tests__/api.test.ts`). `operator-decision-advisor` predates and is distinct from the Decision Engine documented above (`/decision`), which is the live decision-support surface. This entire section is orphaned backend code, not a reachable feature. TODO(founder): confirm intentional deprecation vs. planned-but-unfinished re-integration.

### Features

**Decision Advisor** (`operator-decision-advisor`)
- AI-powered decision analysis
- Contextualised to user's assessment data and memory
- Applies cognitive frameworks

**Meeting Prep** (`generate-meeting-prep`)
- AI-generated meeting preparation content
- Tailored to user's context and objectives

**Prompt Coach** (`prompt-coach`)
- Interactive prompt coaching
- Teaches effective AI prompting techniques

**Sharpen Analysis** (`sharpen-analyze`)
- Skill improvement analysis
- Targeted development recommendations

**Daily Prompt** (`get-daily-prompt`)
- Daily provocative prompt generation
- Tied to user's tensions and context

**Weekly Action** (`get-or-generate-weekly-action`)
- Weekly action item generation
- Contextualised to current mission and progress

---

## Teams Tool: Executive Bootcamp Platform

### Pre-Work & Planning

**Intake Form** (`exec_intakes` table)
- Company context and strategic objectives
- AI maturity baseline
- Participant roster
- Preferred dates and logistics
- Workshop customisation preferences

**Bootcamp Planning** (`bootcamp_plans` table)
- Agenda configuration (7 segments)
- Cognitive baseline data
- Risk tolerance assessment
- Strategic goals 2026
- Required pre-work assignment
- Simulation snapshots

**Executive Pulse** (`exec_pulses` table)
- Pre-workshop individual assessments
- 4 scores: Awareness, Application, Governance, Trust
- Pulse responses JSON
- Profile linking

### Workshop Segments (7-Part Flow)

**Segment 1: Mirror** (Cognitive Baseline)
- Individual AI readiness snapshot
- Current state assessment
- Team comparison view

**Segment 2: Time Machine** (Bottleneck Mapping)
- Sticky note bottleneck submissions
- Spatial clustering on canvas
- Drag-and-drop prioritisation
- Export bottleneck map

**Segment 3: Crystal Ball** (AI Myth Busting)
- Common AI misconceptions
- Evidence-based reframing
- Team discussion facilitation

**Segment 4: Rewrite** (Effortless Map)
- Three lanes: Protect, Automate, Elevate
- Constraint inversion exercise
- Voting and prioritisation
- Sponsor assignment

**Segment 5: Huddle** (Synthesis Generation)
- AI-generated summary of workshop themes
- Priority actions identification
- Key concepts capture
- Tension mapping

**Segment 6: Draft** (Pilot Charter)
- Structured pilot definition
- Success criteria
- Resource allocation
- Timeline and milestones
- Governance model

**Segment 7: Provocation** (Provocation Report)
- What's really at stake
- Uncomfortable questions
- Structural implications
- Board-ready executive summary

### Facilitator Dashboard

**Workshop Session Management** (`workshop_sessions` table)
- Live segment tracking
- Participant count
- Timer controls per segment
- Real-time submission monitoring
- QR code generation for mobile participants

**Activity Session Management** (`activity_sessions` table)
- Per-activity QR codes
- Submission tracking
- Data aggregation
- Export capabilities

### Data Architecture

**Tables Used**
- `exec_intakes`: Pre-workshop intake data
- `bootcamp_plans`: Workshop configuration and planning
- `exec_pulses`: Individual pre-work assessments
- `workshop_sessions`: Live workshop state
- `activity_sessions`: Per-activity state
- `bottleneck_submissions`: Time Machine sticky notes
- `effortless_map_items`: Rewrite exercise data
- `huddle_synthesis`: AI-generated workshop summary
- `decision_frameworks`: Captured team frameworks

**Edge Functions**
- `send-booking-notification`: Intake confirmation email
- `send-advisory-sprint-notification`: Workshop prep email

---

## Partners Tool: Portfolio Assessment

### Partner Setup

**Partner Intake**
- Firm name and type (VC/PE/Consulting)
- Portfolio size and stage focus
- Assessment goals
- Contact details

### Portfolio Scoring

**Individual Company Entry**
- Company name and stage
- Industry and size
- AI maturity signals (binary or 1-5 scale)
- Contact person
- Notes

**Bulk Import**
- CSV upload for portfolio data
- Validation and error handling
- Batch processing

**Scoring Dimensions**
- Leadership alignment
- Experimentation culture
- Data readiness
- Team capability
- Governance maturity

### Portfolio View

**Heatmap Visualisation**
- Company rows × Dimension columns
- Colour-coded readiness levels
- Sortable and filterable
- Click-through to company detail

**Prioritisation**
- Aggregate scores per company
- Risk flagging
- Intervention priority queue
- Co-delivery opportunity identification

**Offer Pack Generation**
- Portfolio-wide AI literacy package
- Tiered pricing options
- Delivery timeline
- Resource requirements

### Data Architecture

**Tables Used**
- `partner_profiles`: Partner firm data
- `portfolio_companies`: Company inventory
- `portfolio_assessments`: Company-level scores
- `partner_offer_packs`: Generated packages

**Edge Functions**
- Portfolio scoring computation
- Offer pack generation
- Heatmap data aggregation

---

## Shared Features (Cross-Tool)

### Authentication & User Management
- Email/password auth via Supabase
- Google OAuth option
- Password reset flow
- Profile management

### AI Integration
- Vertex AI (Gemini 2.0 Flash) as primary generation model
- OpenAI GPT-4o as fallback
- OpenAI Whisper for voice transcription
- Structured output validation via Zod schemas
- Cognitive frameworks embedded in AI prompts
- AI response caching and rate limiting

### Data Privacy & Consent
- GDPR-compliant consent management
- Data anonymisation for benchmarking
- Audit trail for consent changes
- Opt-out mechanisms

### Email Notifications
- Assessment completion confirmation
- Workshop booking confirmation
- Advisory sprint notifications
- Diagnostic report delivery

### Payment Processing
- Stripe integration (mindmaker_llc account), signature-verified webhooks, idempotent event processing
- One-time payments: Full Diagnostic ($49), Deep Context Upgrade ($29), Diagnostic + Deep Context Bundle ($69)
- Subscription: Edge Pro ($49/month) - canonical single source of truth is `supabase/functions/_shared/edge-pricing.ts` (`EDGE_PRO_UNIT_AMOUNT_CENTS = 4900`), cross-imported by both the Deno edge runtime and the Vite client so pricing can never drift between frontend and backend
- Payment verification and receipt generation
- UTM attribution stamped onto Stripe session metadata at checkout
- **Upgrade routing is split (PR #331, 2026-07-04):** `/upgrade` (`src/pages/Pricing.tsx`) is the interactive in-app React page with a live checkout button, reached from in-app CTAs (e.g. the decision-peak upgrade prompt added in PR #329). `/pricing` is a separate static SEO landing page (`public/pricing.html`) that `vercel.json` rewrites requests to; it is kept in sync with `/upgrade`'s pricing manually, not generated from the same source, so a drift check is a manual step, not automated.
- **KNOWN STALE, found during this pass:** `public/.well-known/product.json` - the machine-readable "ground truth" endpoint `AI agents are told to fetch for pricing (see ARCHITECTURE.md "Runtime Product-Truth Source") - still lists Edge Pro at $29/mo, not the current $49/mo. This is a live production file, not just a doc; it was not fixed by this pass since this pass is scoped to FEATURES.md/ARCHITECTURE.md only. TODO(founder): update it.

### Analytics & Benchmarking
- Anonymised aggregate scoring (AI Leadership Index)
- Cohort comparison (by role, industry, company size)
- Quarterly index snapshots
- Momentum tracking
- **Product analytics (2026-07-18, `43ecd6c`):** PostHog, added as a plain inline `<script>` in `index.html` (no npm dependency), tagging every event with `product: 'mm_ctrl'` so it shares a PostHog project across the wider Mindmaker product surface without collisions.
- **North Star metric (PR #330, 2026-07-04):** the product-health number leadership actually watches is "flywheel leaders" (>=5 current `user_memory` facts AND a decision weighed in the last 7 days), instrumented by migration `20260704120000_north_star_flywheel.sql`. Canonical: `project-documentation/NORTH_STAR.md`.

### Export & Sharing
- PDF export of diagnostic results
- Text file download of prompts
- Referral code generation
- Social sharing (coming soon)

---

## Mobile-First Architecture

### No-Scroll Mobile Experience

**Requirements**
- Every page fits viewport on mobile
- Fixed headers and navigation
- Scrollable content areas only
- Proper viewport handling with `--mobile-vh`

**Implementation Pattern**
```tsx
<div className="h-[var(--mobile-vh)] overflow-hidden flex flex-col">
  <header className="flex-shrink-0">
    {/* Fixed header */}
  </header>
  <main className="flex-1 overflow-y-auto">
    {/* Scrollable content */}
  </main>
  <nav className="flex-shrink-0">
    {/* Fixed bottom nav */}
  </nav>
</div>
```

### Touch Targets
- Minimum 44x44px for all interactive elements
- Generous padding on buttons
- Adequate spacing between tap targets

### Safe Areas
- Account for notches (top safe area)
- Account for home indicators (bottom safe area)
- Use `env(safe-area-inset-*)` CSS functions

---

## Animation & Motion

### Motion Library
- Framer Motion for all animations
- Consistent spring physics (stiffness: 400, damping: 35)
- Shared animation variants in `src/lib/motion.ts`

### Animation Types
- `fadeIn`: Opacity transitions
- `slideUp`: Vertical entrance animations
- `scaleIn`: Scale transitions
- `pageTransition`: Full page transitions
- `cardEntrance`: Card-specific animations

### Principles
- Fast, not slow (200-350ms)
- Smooth, not bouncy
- Subtle, not dramatic
- Respect reduced motion preferences

---

## Audit Track Record (April 2026)

CTRL shipped six thematic audit weeks closing technical debt and hardening the product for executive use. Sales/marketing AI agents can cite these as **proof of operational maturity**: this is not a prototype, it's a hardened production platform.

| Week | Theme | Headline Outcomes |
|------|-------|-------------------|
| 1 (PR #93) | **Revenue path** | Mandatory Stripe webhook signature verification; webhook idempotency table (`stripe_events_processed`); briefing rate limits; create/verify diagnostic payment hardened; Edge Pro subscription path validated |
| 2 (PR #94) | **Data path** | Closed assessment data leak; codified storage bucket policy (`ctrl-briefings`); end-to-end account deletion; RLS audit |
| 3 (PR #95) | **UX** | Killed onboarding gate; fixed NorthStar stub; voice permission recovery; killed surveillance copy; removed all "coming soon" placeholders for unimplemented affordances |
| 4 (PR #99) | **Reliability** | Timeouts + retries on all external APIs (`with-timeout` utility, tested); audio failure UX; onboarding stall recovery |
| 5 (PR #97) | **Observability** | Structured edge-function JSON logger (`_shared/logger.ts`); CI gate against `console.log` regressions; tests for `with-timeout` |
| 6 (PR #98, #100, #101) | **Cleanup** | P2 backlog closure; stale-incomplete recovery; e2e contract starter (auth, briefing, account-deletion, stripe-idempotency, sparse-profile, briefing-rate-limits); AI response cache; lint cleanup |
| 2026-05-30 rebuild | **Pricing + Security + Attribution + Public Surface** | Edge Pro repriced to $29/month (from $9); Full Diagnostic confirmed at $49; RLS fixes on `leader_missions`, `leader_check_ins`, `leader_progress_snapshots`, `tts_config`; `resend-webhook` signature verification; UTM attribution emit path wired (dormant until env set); `/.well-known/product.json` product-truth endpoint live; public-surface prerender added for SEO and agent-readability |

### Verifiable proof points for buyers

- Stripe webhook handler validates signatures and dedupes events - buyers concerned about double-charges or webhook spoofing can audit `supabase/functions/stripe-webhook/`
- E2E test `tests/stripe-webhook-idempotency.spec.ts` proves it
- E2E test `tests/account-deletion.spec.ts` proves account deletion is end-to-end
- E2E test `tests/briefing-rate-limits.spec.ts` proves rate limiting is enforced
- E2E test `tests/sparse-profile.spec.ts` proves the briefing pipeline gracefully handles new/empty profiles

---

## Settings - what users actually control

Settings sheet (`src/components/settings/`) tabs in current order:

1. **AccountTab** - name, email, password, sign-out, delete account (end-to-end)
2. **WorkContextTab** - role, company, industry, company size (drives briefing seeds + AI context)
3. **Tune your feed** (`NewsPreferencesPanel`) - the SINGLE door for feed/briefing tuning: priority lanes + scan bias (`news_preferences`) plus a people/companies-to-watch + never-show watchlist (`briefing_interests`). The exact same panel as Home's "Tune feed" drawer, so a tune shows everywhere. (Replaced the old standalone `BriefingInterestsTab`, retired 2026-07-04.)
4. **BriefingDirectivesTab** - set briefing type defaults, voice, schedule
5. **EdgeProTab** - Edge Pro subscription state, billing portal, capability list
6. **PreferencesTab** - display/theme/audio preferences
7. **PrivacyDataTab** - data retention, export, deletion, consent flags
8. **ManifestoTab** - the founder's positioning (legible to users; explains what we're not)

(The Track record row navigates to `/track-record`; the previously-dead Notifications row was removed. The daily-briefing email toggle lives in PreferencesTab.)

**Sales Anchor - Settings**: "Every setting is a lever the leader controls - what gets stored, what gets killed, what gets generated. No mystery dial behind the scenes."

---

## Sales-anchor index (for AI agents)

A condensed list of one-liners pullable for outbound. Each tied to a real shipped feature:

- **Memory Web**: "Talk for two minutes. Get a portable AI double that works in every AI tool."
- **Context Export**: "One click. ChatGPT, Claude, Gemini, Cursor, Claude Code. All of them. Yours."
- **Skill Builder (Agent Skill Builder)**: "Describe one weekly workflow out loud. CTRL hands you a Claude Skill that auto-triggers whenever your team's language matches. Permanent leverage from two minutes of speaking."
- **Home / Decision Engine / Automator**: "Open CTRL and it feels like coming back to your desk: a plain greeting, a feed of what's worth a look, one tap to your briefing, a decision, or a new skill. Weigh a decision and watch it decomposed into the forces that actually determine it, verified and cross-examined, with a memo you can copy straight to your board."
- **Decision Engine**: "Ask a hard question. Get a call with where it holds and where it breaks, backed by real evidence, not a black box."
- **Kit Engine**: "Scan a QR after class. No login. Six questions. A personalised pack you install, a 7-day plan to ship it, and nudges that stop when you do."
- **Daily Briefing v2**: "Three minutes of audio. Every story anchored to a specific priority on your desk. No mystery algorithm."
- **Edge - Sharpen/Cover**: "Your strengths systemized. Your weaknesses covered. Board memos and strategy docs in your register, on demand."
- ~~**Decision Advisor**: "Ask a hard question. Get an answer that already knows your context."~~ (the underlying `operator-decision-advisor` tool is orphaned backend code as of 2026-08-02 - see **Operator Tools** status note above; use the **Decision Engine** anchor instead)
- ~~**Meeting Prep**: "Walk in briefed by an AI that knows your team, your priorities, and your last decision."~~ (the underlying `generate-meeting-prep` function is orphaned backend code as of 2026-08-02 - see **Operator Tools** status note above; do not use this anchor until it is reconnected to a live surface)
- **Diagnostic**: "10 minutes. Six dimensions. The questions your board will ask you. $49."
- **Edge Pro**: "$49/month. The decision tier: unlimited decision weighs, a second model that cross-examines every call, and decision watch. Plus board memos and strategy docs in your register, and the live pull of your skills into any AI."
- **Privacy**: "No Slack. No email. No calendar. You talk to it. That's the whole connection."
- **Auditable AI**: "Every Briefing segment shows the profile fact that earned it the slot. No black box."
- **Hardened production**: "6 audit weeks shipped. Stripe sig + idempotency. End-to-end deletion. Structured logging. E2E tests."
- **Desktop polish (v5.2)**: "Cmd+K opens a global launcher. Sticky top bar, right rail for context, sidebar with keyboard hints. Built like a desktop product, not stretched mobile."
- **Triage you can trust**: "Skill Builder won't generate a junk skill. The Three Honest Tests gate routes Memory Facts, Custom Instructions, and Saved Styles to the right surface instead."
