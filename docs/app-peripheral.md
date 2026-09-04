# CTRL App — Peripheral / Secondary Feature Inventory (truth map)

> Surface: every remaining `src/components/*` feature dir not covered by the primary-surface maps
> (Memory, Edge, Briefing, Decision, Goals, Kit, Settings, Landing-hero).
> Scope dirs: `assessment, benchmark, missions, provocation, voice, operator, diagnostic,
> compliance, analytics, action, ai-chat, results, progress, library, landing, onboarding, pulse`.
> Method: read the live router (`src/router.tsx`), traced every external importer of every file.
> Repo: `C:/Users/krish/mm-ctrl`. Dark theme (App.tsx `defaultTheme="dark"` — CLAUDE.md's "light mode" note is STALE).

---

## TL;DR — the single most important finding

**Roughly 70% of the files in these 17 directories are DEAD CODE.** They belong to an older
**"Assessment → Diagnostic → Results/Benchmark → Insights → Operator Prescription → Mission"**
funnel that has been fully superseded by the current Memory / Edge / Briefing / Decision model.
The legacy standalone routes (`/voice`, `/pulse`, `/diagnostic`, `/today`, `/think`) are now
**`<Navigate>` redirects to `/dashboard`** in `src/router.tsx`. The pages that hosted these
features (`Pulse.tsx`, `Diagnostic.tsx`, `Voice.tsx`, `Progress.tsx`, `Today.tsx`,
`Baseline.tsx`, `MissionCheckIn.tsx`, `MissionHistory.tsx`, `PromptCoach.tsx`, `Timeline.tsx`,
`WeeklyCheckin.tsx`, `DecisionCapture.tsx`) are **orphaned — not registered in the live router**.

What is genuinely LIVE from this set is small:
- **Missions** (`MissionsDashboard`) — rendered, but only inside `components/dashboard/` which is **itself dead** (see below). Net: effectively not reachable in the shipped app.
- **Voice → `TranscriptReviewPanel`** — the one widely-reused live voice atom.
- **Operator → `operator/decision/*`** — the live Decision/Pressure-Test surface (DecisionInboxCard, PressureTestPanel, decision-views, CriticalCallStep).
- **Library → `LibraryTab`** — live as a tab in `/memory` (MemoryCenter).
- **Onboarding → `OnboardingInterview`** (live in Dashboard first-run) + **`Coachmark`** (live in ContextExport).
- **Landing → `HeroSection`** (the only thing `/` renders) + **`CtrlLogo`** (used in every shell header).

Everything else in these dirs is dead or half-built. **Document precisely so nothing is lost on consolidation.**

---

## Live router reality (the gate for "does this surface exist")

`src/router.tsx` (the live one; `src/router/routes.tsx` is a dead Jun-2 duplicate, never imported).
Authed routes (all wear `DesktopShell` via `AuthedLayoutRoute`):
`/dashboard, /memory, /context, /briefing, /decision, /goals, /enrich, /settings, /compliance, /profile`.
Public: `/, /auth, /auth/callback, /booking, /build, /kit*`.
Redirects (legacy): `/today → /dashboard`, `/pulse → /dashboard`, `/voice → /dashboard`,
`/diagnostic → /dashboard`, `/think → /dashboard?view=edge`.

`/dashboard` renders `MobileMemoryDashboard` / `DesktopMemoryDashboard` (from `components/memory-web/`),
NOT `components/dashboard/`. **`components/dashboard/` is dead** — its `DesktopDashboard` /
`MobileDashboard` / `DashboardProvider` are only consumed by orphaned pages (`Today.tsx`) and never
rendered. This matters because it transitively kills several "imported" components below.

---

## Directory-by-directory inventory

### 1. `assessment/` — DEAD (legacy onboarding-quiz funnel)
- **what_it_is:** UI atoms for a multi-question leadership/AI-readiness assessment quiz (header, progress card, question card, a "save your results" gate, a deep-profile opt-in).
- **Files:** `AssessmentHeader.tsx`, `AssessmentProgressCard.tsx`, `AssessmentQuestionCard.tsx`, `DeepProfileOptIn.tsx`, `SaveResultsPrompt.tsx`.
- **Surfaces where:** Only imported by `components/UnifiedAssessment.tsx`, which itself has **zero external importers** → entire chain dead.
- **user_actions (historical):** answer multiple-choice questions, advance/back, opt into a deep profile, save results (email-gate / account prompt).
- **Status:** DEAD. Superseded by `OnboardingInterview` + Memory capture.

### 2. `benchmark/` — DEAD (results/peer-comparison funnel)
- **what_it_is:** Rich "executive benchmark report" sections: score card, executive summary, biggest-lever card, risk signals, leadership-dimension breakdown, org scenarios, upgrade banner, plus `generateQuickWins.ts` logic and `types.ts` (tierConfig, dimensionLabels). Has a barrel `index.ts`.
- **Files:** `BenchmarkScoreCard, BiggestLeverCard, ExecutiveSummary, LeadershipDimensionsSection, OrgScenariosSection, RiskSignalsSection, UpgradeBanner` + `generateQuickWins.ts`, `types.ts`, `index.ts`.
- **Surfaces where:** No external importers at all. DEAD.
- **Note:** Real, fairly complete report logic (quick-wins generator, tier config) that is now orphaned. Overlaps conceptually with Edge insight cards + Decision pressure-test. Candidate to mine for copy/logic, not to revive wholesale.

### 3. `missions/` — PARTIALLY LIVE in code, effectively unreachable
- **what_it_is:** A "first move → 1-4 week mission → check-in → complete/extend → momentum/history" accountability loop. `MissionsDashboard` (active mission card w/ progress bar, momentum badge, Complete/Extend/Get-help CTAs, completion-notes dialog, history link), `FirstMoveSelector` (2-step modal: pick ONE move, then choose check-in horizon), `AdaptivePrompts` (prompts that "evolve" based on completed-mission count + momentum, copy-to-clipboard).
- **Files:** `MissionsDashboard.tsx`, `FirstMoveSelector.tsx`, `AdaptivePrompts.tsx`. Hook: `src/hooks/useMissions.ts`. Tables: `missions`, `leader_prompt_sets`, `leader_assessments`.
- **Surfaces where:** `MissionsDashboard` → rendered in `components/dashboard/{desktop,mobile}/*Dashboard.tsx` (**DEAD shell**). `FirstMoveSelector` → `SingleScrollResults.tsx` (DEAD). `AdaptivePrompts` → `pages/Progress.tsx` (ORPHANED route). Sidebar nav lists `/missions/history` but **no such route exists** in the live router.
- **user_actions:** create mission from a "first move", pick 1/2/3/4-week horizon, mark complete (+ optional reflection notes), extend +7d, view history, "get help" → `/booking?source=mission-help`, copy evolved prompts.
- **complexity:** 3.
- **Status:** Live components, but mounted only inside dead/orphaned hosts → not reachable in the shipped app. This is the closest thing CTRL has to a *learning/accountability loop* and it has been orphaned — directly relevant to the founder's "never feels like it learns" complaint.

### 4. `provocation/` — DEAD
- **what_it_is:** `DailyProvocation.tsx` — a daily challenging question/prompt card with a "respond via voice" CTA.
- **Surfaces where:** Reads `useDashboard()` from the dead `DashboardProvider`; only path to it is the dead dashboard / `Today.tsx`. CTA navigates to `/voice` (now a redirect). DEAD.
- **Note:** There is a separate LIVE `components/dashboard/DailyProvocationCard.tsx` (different file) — also only used by the dead dashboard. Both are dead in practice.

### 5. `voice/` — MOSTLY DEAD; one live atom
- **what_it_is:** A large legacy voice-capture toolkit: full executive voice capture, compass module + results, ROI module, gated modal, waveform, recorder/player/progress/summary/orchestrator, and a transcript review panel.
- **Files & status:**
  - `TranscriptReviewPanel.tsx` — **LIVE & widely reused** (editable transcript with "show original (pre-cleanup)" disclosure; "Use this transcript"/Cancel). Imported by `briefing/CustomBriefingSheet`, `edge/DraftSheet`, `edge/SkillCaptureSheet`, `memory/VoiceMemoryCapture`, `memory-web/{Desktop,Mobile}MemoryDashboard`. This is the canonical "confirm what we heard" step.
  - `ExecutiveVoiceCapture.tsx` (18KB) — used only by `components/ExecutiveControlSurface.tsx`, which is itself **DEAD** → dead.
  - `AudioWaveform, CompassModule, CompassResults, GatedModal, RoiModule, VoiceCapture, VoiceOrchestrator, VoicePlayer, VoiceProgress, VoiceRecorder, VoiceSummary` — **all DEAD** (no live importers).
- **user_actions (historical, ExecutiveVoiceCapture/Compass/ROI):** record voice, watch waveform, review/edit transcript, answer "compass" orientation, compute an ROI estimate, hit a paywall gate.
- **Status:** The live voice *capture flow* now lives in `components/memory/VoiceMemoryCapture` + `ui/voice-input` + the `useVoice` hook, reusing only `TranscriptReviewPanel`. The old voice dir is a graveyard.

### 6. `operator/` — top-level DEAD; `operator/decision/*` LIVE
- **what_it_is (top-level, DEAD):** The "AI Operator" concept — an intake that profiles your business (`OperatorIntake.tsx`, 33KB: business lines, inbox volume, technical comfort slider, monthly budget, pain points, tool checkboxes, delivery preference, voice-first input) feeding a weekly **prescription** engine (`WeeklyPrescription.tsx`) and a `DecisionAdvisor.tsx`, surfaced via `OperatorDashboard.tsx`. Supporting atoms: `ModeSelector`, `DualPercentageSlider`, `ToolCheckboxGrid`, `VoiceFirstInput`. Tables: `operator_profiles`, `operator_prescriptions`.
  - **Surfaces where:** `OperatorDashboard` is explicitly called "the orphaned OperatorDashboard" in a code comment in `pages/DecisionPage.tsx`. None of these top-level files have live importers. **DEAD.**
  - **user_actions (historical):** complete a long business-profile intake (sliders, checkboxes, budget, pains, voice), generate a weekly prescription (decision + why + steps + time/cost estimate), mark prescription status, get decision advice.
- **what_it_is (`operator/decision/`, LIVE):** The current **Decision Engine / Pressure-Test** UI.
  - **Files:** `DecisionInboxCard.tsx` (LIVE in `memory-web/{Desktop,Mobile}MemoryDashboard` + `MobileDashboard`), `PressureTestPanel.tsx` (LIVE in `pages/DecisionPage` → `/decision`), `decision-views.tsx` (LIVE: `DecisionResult` + `CaptureView`, used by `OnboardingInterview`), `CriticalCallStep.tsx`.
  - **user_actions (LIVE):** capture a decision/statement (text or voice via `ui/voice-input`), run a pressure test, watch staged streaming (decompose → verify → cross-examine → advise), review claims/tensions/evidence, see decision inbox + open alerts.
  - **complexity:** 4 (this is one of the 5 heavy surfaces; decision capture overlaps Edge capture + Briefing decision-triggers).

### 7. `diagnostic/` — DEAD (legacy 5-Q quiz)
- **what_it_is:** A 5-question hardcoded AI-readiness quiz (`DiagnosticFlow.tsx`) → mock score/tier/percentile **generated with `Math.random()`** when the API doesn't return a baseline → `ResultsCard`. Atoms: `ProgressBar`, `QuestionCard`, `ResultsCard`, `BenchmarkInsightCard`.
- **Surfaces where:** Only `pages/Diagnostic.tsx` (ORPHANED; `/diagnostic` redirects to `/dashboard`). DEAD.
- **Note:** The randomized fake results are a credibility risk if ever re-exposed. Questions/options are good seed material for a real diagnostic.

### 8. `compliance/` — DEAD (the live `/compliance` page does NOT use this dir)
- **what_it_is:** `DataClassificationBadge`, `PrivacyPolicyBanner`, `TermsAcceptance` (terms-accept gate).
- **Surfaces where:** **Zero importers.** The live `/compliance` route (`pages/Compliance.tsx`) is entirely self-contained (uses `useComplianceStatus`, its own Shield/CheckCircle UI). DEAD.
- **Note:** History flags an earlier compliance *overclaiming* breach (SOC2/HIPAA) that was de-clawed. These atoms are leftovers from that surface.

### 9. `analytics/` — DEAD (internal/admin dashboard)
- **what_it_is:** `AnalyticsDashboard.tsx` — an internal metrics dashboard pulling Supabase/Stripe/Resend/Google-Sheets numbers (summary, time-series, conversion funnel, 7/30/90d range) via `src/utils/analytics.ts`.
- **Surfaces where:** No importers. DEAD. (Founder/admin tool, not a user surface.)
- **underused_data:** It *defines* a conversion-funnel + engagement view that nothing renders — the data exists but isn't shown anywhere.

### 10. `action/` — DEAD
- **what_it_is:** `WeeklyAction.tsx` — a "this week's action" card with a voice CTA.
- **Surfaces where:** Reads dead `useDashboard()`; CTA → `/voice` redirect. Only the dead dashboard / `Today.tsx` reach it. DEAD. (Note a separate LIVE `components/dashboard/WeeklyActionCard.tsx` exists but is also only in the dead dashboard.)

### 11. `ai-chat/` — DEAD (the old conversational assessment + insight engine)
- **what_it_is:** A heavy AI-conversation assessment + insight pipeline: `LLMInsightEngine.tsx` (33KB — generates typed `ExecutiveInsight`s: quick_win / strategic_opportunity / risk_mitigation / competitive_advantage with impact/effort/timeline/ROI/steps/metrics, sessionStorage-cached), `InsightEngine.tsx`, `ExecutiveAssessmentReport.tsx` (18KB), `AssessmentProgress.tsx`, `QuickSelectButtons.tsx`.
- **Surfaces where:** **Zero importers.** DEAD.
- **Note:** Substantial, sophisticated insight-generation logic now fully orphaned. Conceptually replaced by Edge insights + Decision advise. Mine for prompt/scoring logic.

### 12. `results/` — DEAD (results page sections w/ paywall gating)
- **what_it_is:** Result-page sections: `ResultsScoreCard`, `ResultsDimensionScores`, `ResultsKeyInsights`, `ResultsRiskPreview`, `ResultsLockedGate` (paywall), `ResultsUnlockedSections` (14KB: peer-comparison FOMO graph, tensions, risk signals, copy/download prompts, consent manager). Barrel `index.ts`.
- **Surfaces where:** No external importers (consumers `UnifiedResults`/`SingleScrollResults` are themselves dead). DEAD.
- **user_actions (historical):** view score + dimension breakdown, see locked vs unlocked sections, hit paywall, copy/download prompt sets, manage consent.
- **duplications:** prompt copy/download overlaps `AdaptivePrompts` and Library export.

### 13. `progress/` — DEAD (orphaned progress page)
- **what_it_is:** `PeerBenchmark.tsx` (where you rank vs peers) + `ProgressChart.tsx` (score-over-time chart).
- **Surfaces where:** Only `pages/Progress.tsx` (ORPHANED; not in router). DEAD.
- **underused_data:** time-series of the user's own scores/missions — exactly the "does it learn from me?" signal — is computed/charted here but never shown in the live app.

### 14. `library/` — LIVE
- **what_it_is:** `LibraryTab.tsx` — the artifact library. Lists every artifact CTRL has generated for the user (skill / draft / framework / export / briefing_custom), with per-kind icon+tone, inline markdown preview, copy, delete. Solves "artifacts vanish when the sheet closes." Hook: `useGeneratedArtifacts`.
- **Surfaces where:** **LIVE** as the "Library" tab in `pages/MemoryCenter.tsx` (`/memory`), alongside tabs `memories`, `privacy`, `data`.
- **user_actions:** tap a row to preview markdown, copy artifact, delete artifact.
- **complexity:** 2.
- **duplications:** This is the canonical "everything you've made" store — overlaps with the per-surface "export"/"download" buttons scattered across Edge (DraftSheet, SkillCaptureSheet), Briefing (CustomBriefingSheet), and old results. Strong consolidation anchor.

### 15. `landing/` — mostly DEAD; `HeroSection` + `CtrlLogo` LIVE
- **what_it_is:** Marketing landing assets + logos + a voice-demo entry.
- **Files & status:**
  - `HeroSection.tsx` (12KB, has a video-background test) — **LIVE**: the ONLY thing `pages/Landing.tsx` (`/`) renders.
  - `CtrlLogo.tsx` — **LIVE & ubiquitous** (DesktopShell, AppHeader, DesktopSidebar, KitPortalLayout, BuildLap).
  - `DesktopLanding.tsx` (28KB), `VoiceDemo.tsx` (16KB), `VoiceEntry.tsx`, `Logo.tsx`, `TrustIndicators.tsx` — **DEAD** (no external importers; Landing no longer branches by device to DesktopLanding).
- **user_actions (live):** hero CTA → sign up / book; (historical DesktopLanding/VoiceDemo had a try-the-voice demo + trust badges).

### 16. `onboarding/` — partially LIVE
- **what_it_is:** First-run guided setup.
- **Files & status:**
  - `OnboardingInterview.tsx` (25KB) — **LIVE**: rendered full-screen by `pages/Dashboard.tsx` on first run (offered, never enforced; banner "Set up your context in ~2 min"). Imports `operator/decision/decision-views` + `useGuidedCapture`.
  - `Coachmark.tsx` — **LIVE**: used by `pages/ContextExport.tsx` (`/context`) for inline tips.
  - `WelcomeTour.tsx` (the old passive 4-card tour) — **DEAD** (Dashboard comment: "the old passive 4-card tour is gone").
  - `ProgressBar.tsx` — DEAD.
- **user_actions (OnboardingInterview):** guided Q&A to seed memory/context, "Skip for now", capture facts → flips `mindmaker_onboarded`.
- **complexity:** 3.
- **duplications:** Onboarding captures the same kind of facts as Memory capture + the dead assessment/operator intakes — three overlapping "tell us about yourself" flows historically; only this one survives.

### 17. `pulse/` — DEAD (legacy strategic-pulse dashboard)
- **what_it_is:** `StrategicPulse.tsx` + `BaselineCard`, `TensionsCard`, `RiskSignalsCard` — a "strategic pulse" view (baseline score/tier/percentile + tensions + risk signals).
- **Surfaces where:** Only `pages/Pulse.tsx` (ORPHANED; `/pulse` redirects to `/dashboard`). DEAD.
- **Note:** `StrategicPulse` **hardcodes fallback data** (`score: 72, tier: "Advancing", percentile: 18`) and ships **empty `tensions`/`risks`** with `// Would come from edge function` comments → half-built. The tensions/risk-signal *concept* now lives in the Decision engine (`decision_tensions`, `decision_alerts`) and Edge.

---

## Cross-cutting findings

### Duplications (functionality repeated across surfaces)
- **Decision / pressure-test capture** appears in: live `operator/decision/*` (`/decision`), Edge capture, Briefing decision-triggers, AND the dead `operator/DecisionAdvisor` + `ai-chat` insight engine. Four historical homes for "help me make/stress-test a decision."
- **Prompt copy/download** repeats across `missions/AdaptivePrompts`, `results/ResultsUnlockedSections`, and Library export.
- **Score / baseline / percentile** is recomputed in `pulse/`, `diagnostic/`, `benchmark/`, `progress/`, `ai-chat/` — five dead representations of the same "your number vs peers."
- **"Tell us about you" intake** duplicated across `assessment/`, `operator/OperatorIntake`, and the live `onboarding/OnboardingInterview` + Memory capture.
- **Transcript review** is correctly centralized in the one live atom `voice/TranscriptReviewPanel` (good model for the rest).
- **Artifact storage**: `library/LibraryTab` is the canonical store; many surfaces still have their own ad-hoc download buttons.

### Underused data (captured but not fed back into personalization/learning)
- **Mission momentum + completion history** (`useMissions`, `missions` table) — the strongest "learns from you" signal in the app — is computed but only surfaced in dead hosts.
- **Score time-series** (`progress/ProgressChart`) — orphaned.
- **`AdaptivePrompts` evolution** logic (prompts change with mission count/momentum) — exactly the "it adapts to me" mechanic the founder wants — sits on an orphaned page.
- **Analytics conversion funnel / engagement** (`analytics/` + `utils/analytics.ts`) — computed, never rendered.
- **`leader_prompt_sets` / `leader_assessments` / `operator_profiles`** — rich profile data captured by dead intakes; not wired into current Memory/Edge personalization.

### Dead code / half-built / contradictions
- ~70% of files across these 17 dirs are dead. Whole dirs with zero live importers: `assessment, benchmark, compliance, analytics, ai-chat, results`. Effectively dead via dead hosts: `provocation, action, progress, pulse, diagnostic`, top-level `operator/*`, most of `voice/*`, most of `landing/*`, `onboarding/WelcomeTour`.
- `components/dashboard/` (the non-memory-web dashboard) is dead — but still imports `missions`, `action`, `provocation`, `operator/decision` → makes them *look* live in grep.
- `src/router/routes.tsx` is a dead duplicate of the live `src/router.tsx`.
- `diagnostic/DiagnosticFlow` and `pulse/StrategicPulse` ship **fake/random results** as fallback — credibility risk if revived.
- A nav entry points to `/missions/history` that **has no route**.
- CLAUDE.md says "light mode"; the app is **dark** (App.tsx).

### Consolidation implications (founder mandate: dedupe, don't lose features)
- **Salvage, don't delete blindly:** the *learning loop* (missions momentum + adaptive prompts + progress chart) is the antidote to "never feels like it learns" — it just needs re-homing into the live Memory/Edge spine, not rebuilding.
- **One decision home:** collapse the four decision-capture entry points into the live `operator/decision/*` surface.
- **One library/export home:** `LibraryTab` already exists — route every surface's export/download into it.
- **One intake:** `OnboardingInterview` + Memory capture is the survivor; retire the assessment/operator intakes but mine their question banks.
- **Mobile vs desktop:** almost none of these dead surfaces had a real bespoke mobile design — they used `sm:` breakpoints on a squeezed desktop layout (e.g. DiagnosticFlow, FirstMoveSelector `sm:max-w-lg`, results sections). The live survivors inherit the proper `memory-web` mobile (BottomNav + full-screen) / `DesktopShell` split, which is where real mobile/desktop bifurcation lives.
