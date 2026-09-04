# CTRL Surface Map: Data Model & Learning Loop

> Honest current-state truth map of the data substrate that is supposed to make CTRL "learn from everything." This is the back-of-house surface that feeds every other tab (Briefing, Decide/Edge, Context export, Goals). It is NOT a single screen; it is the spine. The founder's verdict ("it never feels like it learns from the user") is, in this surface, mostly TRUE and explainable from the code: capture is rich, reuse is partial, and the closed feedback loops are almost all unwired.

Repo: `C:/Users/krish/mm-ctrl` (React + Vite + TS + Supabase, project `bkyuxvschuwngtcdhsyg`, DARK theme). Production: `ctrl.themindmaker.ai`.

---

## what_it_is

The data + learning layer is the substrate under all five tabs. It has two jobs:
1. **Capture** durable facts about the user (the "Memory Web").
2. **Reuse** that memory to personalize everything (briefings, decisions, exports, enrichment) and visibly get smarter over time.

The intended model (from `src/types/memory.ts`) is a tiered, self-curating knowledge graph:
- **`user_memory`** — atomic facts. Each has `fact_category` (identity / business / objective / blocker / preference), `confidence_score`, `verification_status` (inferred → verified / corrected / rejected), `source_type` (voice / form / linkedin / calendar / enrichment / markdown), `is_high_stakes`, `is_current`, and three "learning" columns: `temperature` (hot / warm / cold), `reference_count`, `last_referenced_at`.
- **`user_patterns`** — behavioral patterns (preference / anti_preference / behavior / blindspot / strength) synthesized from facts, with `confidence`, `evidence_count`, `status` (emerging / confirmed / deprecated).
- **`user_decisions`** — decision journal (active / superseded / reversed), with `source` (manual / voice / check_in / mission / assessment).
- **`user_memory_budget`** / **`user_memory_settings`** — token budget + privacy/retention prefs.

The promise the UI makes (MemoryCenter: "Everything your AI knows about you", a "% verified" pill, a "X hot / Y warm" thermometer, a `health_score`, a `GettingSmarterDelta` of "new facts/patterns/decisions since last visit") is a learning-system promise. The plumbing behind that promise is only partly connected.

### The single biggest finding: TWO parallel, barely-bridged data stacks

There are two complete, overlapping user-data lineages in the codebase, and they do not feed each other:

| | MODERN stack ("Memory Web") | LEGACY stack ("Leader/Assessment") |
|---|---|---|
| Fact store | `user_memory` | `leaders` (wide columns) + `assessment_events` |
| Patterns | `user_patterns` (via `memory-synthesize`) | `leader_patterns` (via `detect-patterns`) |
| Reflections | (none) | `leader_reflections` |
| Scores | (none) | `leader_assessments` + `leader_dimension_scores` |
| Pattern engine | `memory-synthesize/index.ts` | `detect-patterns/index.ts` |
| Context builder | `_shared/memory-context-builder.ts` + `_shared/user-context.ts` | `_shared/context-builder.ts` (`buildLLMContext`) |

`detect-patterns` writes `leader_patterns` from `leader_reflections`; `memory-synthesize` writes `user_patterns` from `user_memory`. They are **two implementations of the same feature** that never reconcile. The diagnostic/assessment flow writes the legacy stack (`leaders`, `leader_assessments`, `leader_dimension_scores`, `assessment_events`) and there is **no bridge** that promotes assessment results into `user_memory` (grep for `user_memory` in `create-leader-assessment`, `ai-assessment-chat`, `compass-analyze`, `onboarding-interview` returns nothing). So the richest first-touch capture the user does — the diagnostic — is invisible to the Memory Web that powers personalization. `WorkContextTab.tsx` even maintains a hand-written `FACT_TO_LEADER` map to paper over the split, syncing a handful of `user_memory` keys back into `leaders` columns one-way.

---

## user_actions (exhaustive, every discrete capture/curation action across the surface)

This surface is touched from ~17 components/pages. The discrete things a user is asked to do that write/curate this data:

**Capture (write facts):**
1. **Voice capture** — `VoiceMemoryCapture`, floating voice FAB, `/voice`, Dashboard voice → transcript → `extract-user-context` (OpenAI extracts 5-15 facts).
2. **Type a free-text "brain dump"** — `useMemoryWeb.submitInput()` / `AddMemorySheet` → same `extract-user-context`.
3. **Add a single fact manually** — `AddMemorySheet` (category, label, value, context) → `useCreateMemory` (inserts straight as `verification_status: 'verified'`, `source_type: 'manual'`).
4. **Import a markdown file** — `useMarkdownImport` / `ExportImportPanel` → facts with `source_type: 'markdown'`.
5. **Onboarding interview** — `OnboardingInterview` / `onboarding-interview` edge fn (conversational intake).
6. **Edge onboarding** — `EdgeOnboarding.tsx` (separate capture path into memory).
7. **Diagnostic / Baseline assessment** — `Baseline.tsx`, `Diagnostic.tsx`, `create-leader-assessment` (writes LEGACY stack only; see split above).
8. **Weekly check-in / reflection / mission check-in** — `submit-weekly-checkin`, `submit-reflection` (writes `leader_reflections`), `MissionCheckIn`.
9. **Decision capture** — `DecisionCapture.tsx`, `submit-decision-capture`, plus `useDecisions.addDecision()` (writes `user_decisions`).
10. **Enrich / company context** — `EnrichPage`, `enrich-company-context`, `extract-user-context` with `source_type: 'enrichment'`.
11. **Kit intake** — `KitHome.tsx` (kit preset Q&A → memory).

**Curation (verify/correct/manage):**
12. **Verify a pending fact** — `VerificationBanner` → `VerificationSwipeStack` (swipe to confirm/reject), `FactVerificationCard`, `quickVerify`. Calls `verify_memory_fact` RPC.
13. **Correct a fact** — edit value during verification or in `MemoryDetailSheet`.
14. **Reject a fact** — swipe-reject or `rejectFact`.
15. **Edit a fact** — `MemoryDetailSheet` / `EditableField` (`editFact`).
16. **Delete a fact** — soft delete (`is_current=false`), single or **bulk** (`useBulkDeleteMemory` by category/source/date or delete-all).
17. **Confirm / dismiss a pattern** — `useMemoryWeb.confirmPattern / dismissPattern` (desktop dashboard).
18. **Supersede / reverse a decision** — `useDecisions` / `useMemoryWeb`.
19. **Tune privacy/retention** — `PrivacyControlsPanel`, `PrivacyDataTab`, `useMemorySettings` (auto-capture on/off, retention window).
20. **Export memory to an AI tool** — `/context` (`ContextExport`), `useMemoryExport` → `memory-export` (formats: chatgpt / claude / gemini / cursor / claude-code / markdown; use-cases: meeting / decision / code / writing_persona / strategic_advisor / decision_journal …).
21. **Import/Export raw data** — JSON / CSV (`useMemoryQueries` export/import, `ExportImportPanel`).
22. **Clear local cache** — `useClearLocalCache`.
23. **Edit work context** — `WorkContextTab` (Settings) re-edits the same `user_memory` facts via a *different* UI, and one-way-syncs to `leaders`.
24. **Edit briefing interests/directives** — `BriefingInterestsTab` / `BriefingDirectivesTab` (Settings) curate briefing personalization config that overlaps memory.

That is ~24 distinct capture/curation actions spread across voice FAB, three dashboards, a dedicated Memory page, four Settings tabs, the diagnostic, onboarding, check-ins, decision capture, enrich, and kit. **No single "this is where you teach CTRL about you" surface exists** — it is smeared everywhere, which is itself a major contributor to "it never feels like it learns."

---

## key_files

**Types / contracts**
- `src/types/memory.ts` — the whole memory contract (facts, patterns, decisions, temperature, export formats, stats, `GettingSmarterDelta`).
- `src/types/briefing.ts`, `src/types/goals.ts`, `src/types/edge.ts`, `src/types/diagnostic.ts`, `src/types/profile.ts`, `src/types/memory-settings.ts`.
- `src/integrations/supabase/client.ts` (hardcoded anon key + project-id assertion), `src/integrations/supabase/types.ts` (151 KB generated schema).

**Hooks (client data layer)**
- `src/hooks/useUserMemory.ts` — extract/verify/reject, `getMemoryContext()` (client-side formatter, used by some surfaces).
- `src/hooks/useMemoryWeb.ts` — the rich web: facts+patterns+decisions+budget+stats+delta, health score, CRUD, `submitInput`.
- `src/hooks/useMemoryQueries.ts` — React Query CRUD (optimistic), settings, import/export, **dead `memory-crud` HTTP wrappers** (see notes).
- `src/hooks/useMemoryExport.ts`, `useDecisions.ts`, `useDecisionEngine.ts`, `useDecisionInbox.ts`, `useUserState.ts`, `useProfileBasics.ts`, `useUserPains.ts`, `useWatchlist.ts`, `useVerificationFlow.ts`, `useBriefingInterests.ts`, `useSuggestedInterests.ts`.

**Edge functions — capture/curate**
- `supabase/functions/extract-user-context/index.ts` — the keystone. OpenAI extraction + a second validation LLM pass + LLM contradiction detection + embedding-based semantic dedup + deterministic guardrails (`_shared/fact-guardrails.ts`). Triggers fire-and-forget `synthesize-edge-profile` and `infer-briefing-interests`.
- `memory-crud/index.ts`, `memory-settings/index.ts`, `memory-export/index.ts`, `generate-custom-export/index.ts`, `onboarding-interview/index.ts`, `submit-decision-capture/index.ts`, `submit-reflection/index.ts`, `swap-profile-data/index.ts`, `delete-account/index.ts`.

**Edge functions — synthesis / lifecycle (the "learning" engines)**
- `supabase/functions/memory-synthesize/index.ts` — facts → `user_patterns`.
- `supabase/functions/detect-patterns/index.ts` — `leader_reflections` → `leader_patterns` (parallel/legacy).
- `supabase/functions/memory-lifecycle/index.ts` — temperature promote/demote/archive + budget recompute.
- `supabase/functions/batch-compute-drift/index.ts`, `compute-drift/index.ts`.

**Shared reuse layer (where memory becomes personalization)**
- `supabase/functions/_shared/user-context.ts` — `getUserContext()`, the 7-table projection consumed by briefing + decision engine. **The real personalization read path.**
- `supabase/functions/_shared/memory-context-builder.ts` — `buildMemoryContext()`, per-AI-tool export formatter (ChatGPT/Claude/Cursor/Gemini/CLAUDE.md/.cursorrules).
- `supabase/functions/_shared/context-builder.ts` — `buildLLMContext()`, the legacy assessment-analyzer projection (reads `leaders`/`assessment_events`/`leader_dimension_scores` + a thin `user_memory` read).
- `supabase/functions/_shared/fact-guardrails.ts`, `_shared/training-loader.ts`.

**Attribution / warehouse emit**
- `src/lib/track.ts`, `src/lib/attribution.ts` — client lifecycle emitter.
- `supabase/functions/track-event/index.ts` — public proxy → `_shared/attribution-emit.ts` (`forwardToWarehouse`) + `audience_contacts` insert.

**UI surfaces**
- `src/pages/MemoryCenter.tsx` (tabs: All Facts / Library / Privacy / Data), `Dashboard.tsx` (Memory Web default view), `ContextExport.tsx`, `Profile.tsx`, `Settings.tsx`, `DecisionCapture.tsx`, `DecisionPage.tsx`, `EnrichPage.tsx`, `Goals.tsx`.
- `src/components/memory/*` (12 components), `src/components/memory-web/{DesktopMemoryDashboard,MobileMemoryDashboard,GuidedFirstExperience,BottomNav,AppHeader}.tsx`, `src/components/settings/{WorkContextTab,BriefingInterestsTab,BriefingDirectivesTab,PrivacyDataTab,ManifestoTab}.tsx`, `src/components/mobile/LearningEngineSheet.tsx`.

---

## mobile_treatment

Real, dedicated mobile design — not a squeezed desktop. `useDevice()/useIsMobile` branches everywhere.
- `MemoryCenter.tsx` renders a fully separate mobile tree: `h-screen-safe` no-scroll frame, `AppHeader`, a compact one-line stats strip ("`N facts · X% verified · Y hot · Z warm`"), a fixed `BottomNav`, safe-area insets. Desktop renders inside `DesktopShell` with an action bar instead.
- Verification is mobile-native: `VerificationSwipeStack` (Tinder-style swipe confirm/reject), `BottomSheet`, `AddMemorySheet`, `MemoryDetailSheet` as bottom sheets.
- Dedicated `MobileMemoryDashboard.tsx` vs `DesktopMemoryDashboard.tsx`.
- `src/components/mobile/LearningEngineSheet.tsx` is a mobile "learning engine" surface — but see notes: it visualizes a loop the backend does not actually run.
- Voice-first capture (FAB / `VoiceMemoryCapture`) is the primary mobile input.

Mobile is genuinely good at *capture and verification* in one hand. What it cannot show honestly is *learning*, because the learning (patterns/temperature) is not being computed (see underused_data).

## desktop_treatment

`DesktopShell` (sticky top bar, `DesktopSidebar`, optional right rail, global Command Palette Cmd/Ctrl+K). Memory renders as `DesktopMemoryDashboard` with inline CRUD (edit/delete/verify facts, confirm/dismiss patterns, supersede/reverse decisions), a stats header (facts count, verified-rate pill, hot/warm thermometer), and a 4-tab MemoryCenter (All Facts / Library / Privacy / Data). Export-to-AI and Import are top-bar actions. This is the "command center" treatment — dense, multi-action, everything-at-once, which matches the founder's "every tab asks several complex things at once" complaint.

---

## complexity_1to5

**5 / 5 (overwhelming).** Justification:
- One conceptual thing ("what CTRL knows about you") is captured through ~11 different entry points and curated through ~13 more, across 17 components and 4 Settings tabs.
- Two parallel data stacks (modern `user_*` vs legacy `leader_*`/assessment) with overlapping pattern engines and overlapping context builders.
- The UI exposes high-cognitive-load machinery to the end user: temperature (hot/warm/cold), confidence scores, verification states, token budgets, health scores, 6 export formats × 14 use-cases. That is a database admin console, not a "5-minute one-handed" experience.
- Multiple half-wired learning subsystems (synthesis, lifecycle, drift, patterns) that the UI implies are running.

---

## duplications (overlap with OTHER surfaces)

1. **Pattern detection is implemented twice.** `memory-synthesize` (`user_patterns` from `user_memory`) vs `detect-patterns` (`leader_patterns` from `leader_reflections`). Same feature, two tables, never reconciled.
2. **Context/personalization builders implemented twice.** `_shared/user-context.ts` (`getUserContext`, modern, used by Briefing + Decision) vs `_shared/context-builder.ts` (`buildLLMContext`, legacy assessment). Plus a third client-side formatter in `useUserMemory.getMemoryContext()`.
3. **Memory EDITING exists in 4+ places:** MemoryCenter (`MemoryDetailSheet`/`AddMemorySheet`), Dashboard memory web, Settings `WorkContextTab`, and the verification flow — each with its own UI for the same `user_memory` rows. `WorkContextTab` additionally duplicates the data into `leaders` columns via a hand-maintained `FACT_TO_LEADER` map.
4. **Briefing personalization config overlaps memory:** `BriefingInterestsTab` + `BriefingDirectivesTab` + `infer-briefing-interests` (auto-triggered from extraction) curate interests that are conceptually "preferences" already living in `user_memory`. Three surfaces shape the same notion of "what I care about."
5. **Decision capture vs Decision Engine:** `user_decisions` (journal, `useDecisions`) and `decision_cases`/`decision_claims` (pressure-test engine) are two separate decision data models. The Decision Engine READS `user_memory` objectives but does NOT write its verdict back into `user_decisions` — so a pressure-tested decision and a journaled decision never become the same record.
6. **Export overlaps:** `memory-export` (formatted AI context) and `useMemoryQueries` raw JSON/CSV export and `generate-custom-export` are three export paths over the same data.
7. **Profile basics duplication:** `useProfileBasics`, `useUserPains`, `useWatchlist` each read/write slivers of `user_memory` with bespoke key conventions (`watching_company`, etc.), overlapping the generic fact CRUD.

---

## underused_data (captured/capturable but NOT fed back into learning)

This is the core of "it never feels like it learns." The capture side is genuinely sophisticated; the feedback side is starved.

1. **`reference_count` / `last_referenced_at` are never written.** Grep across all edge functions + client: only `memory-lifecycle` READS them (to promote/demote) and `memory-context-builder` ORDERS by them. **No code path increments `reference_count` or stamps `last_referenced_at` when a fact is actually used** in a briefing, decision, or export. Consequence: every fact stays at its seeded default temperature forever; the hot/warm/cold engine has no input signal; the "X hot" pill the user sees is essentially decorative. This is the single clearest reason the system never visibly adapts to what the user actually relies on.
2. **`memory-lifecycle` is not scheduled and not called.** No cron migration invokes it (only `send-daily-briefing` and `send-kit-nudges` are cron'd), and no client code calls it. Promotion/demotion/archival therefore never runs in production. Combined with #1, the entire temperature/decay subsystem is dormant.
3. **`memory-synthesize` (fact → pattern) is not scheduled and not called.** No cron, no client invocation. So `user_patterns` only ever populates if someone manually hits the function. The Memory Web's pattern panel, the "patterns_count" stat, and the `getUserContext` patterns it injects into briefings are, for most users, permanently empty.
4. **`detect-patterns` is dead on the client.** It has a wrapper in `src/lib/api.ts` (line 207) but **nothing calls that wrapper**; no cron either. `leader_reflections` collected via weekly check-ins/reflections never become `leader_patterns`.
5. **Drift (`compute-drift` / `batch-compute-drift`) is uncscheduled** — assessment-score-over-time signal is captured but not surfaced or looped back.
6. **Verification outcomes don't reweight extraction.** When a user rejects/corrects a fact, that ground-truth signal updates that one row but is not aggregated to tune future extraction confidence, guardrails, or per-user priors. (`training_material_version` is stamped but the reverse loop is global/manual, not per-user.)
7. **Decision Engine verdicts are not memory.** `decision-engine` reads objectives from `user_memory` but writes only to `decision_cases`/`decision_claims`. Its conclusions, tensions, and verified claims never become `user_decisions`, `user_patterns`, or facts — so pressure-testing a decision teaches the system nothing durable.
8. **Assessment results never enter the Memory Web.** Diagnostic dimension scores, tiers, and reflections live in the legacy stack and are never promoted into `user_memory`, so the most structured self-knowledge the user produces does not personalize Briefing/Decide/Export.
9. **Briefing engagement is the ONE real loop — and it's the exception that proves the rule.** `briefing-aggregate-feedback` turns `not_useful` reactions into `briefing_lens_feedback` weight deltas (and `getUserContext` derives `feedbackPreferences` from `useful` reactions). This works and is the only place the app demonstrably learns from behavior. But it is scoped to briefing lens weighting only; it does not touch facts, patterns, or temperature, so it doesn't make the *memory* feel smarter.
10. **Attribution/warehouse emit carries no in-app behavioral signal.** `track-event` forwards only marketing-funnel lifecycle events (landed / signed_up / activated + kit funnel) to the external MindmakerOS warehouse for sales/marketing attribution. It is explicitly dormant unless warehouse env is set. None of it returns into the user's personalization. (Correct by design — but worth noting the only "telemetry" the app emits is for revenue attribution, not for learning.)

---

## notes (dead code, half-built, contradictions)

- **Half-built learning loop is the headline.** The schema, the UI (stats, deltas, thermometer, `LearningEngineSheet`, health score), and three engines (synthesize, lifecycle, detect-patterns) all exist and all imply an active, self-improving memory. In production none of the three engines is scheduled or invoked, and the reference-count signal they depend on is never written. The system LOOKS like it learns and is built to learn, but the wires between "user does things" and "memory adapts" are not connected. This precisely matches the founder's "never feels like it learns."
- **Dead `memory-crud` HTTP wrappers.** `useMemoryQueries.ts` contains `fetchMemoryList`, `fetchMemoryItem`, `createMemory`, `updateMemory`, etc. that call the `memory-crud` edge function with broken patterns (e.g. `functions.invoke('memory-crud/list', { method: 'GET' })` and an unused duplicate invoke). The actually-used hooks bypass these and query Supabase directly. The edge-function CRUD layer is effectively dead code shadowed by direct-table access.
- **Contradiction between CLAUDE.md and reality:** CLAUDE.md describes a `decision-watch` hourly pg_cron loop, but no `cron.schedule` for it exists in `supabase/migrations/` (only daily-briefing and kit-nudge crons are present). Either the cron lives outside the repo (applied via Management API per the team's out-of-sync migration workflow) or it is not running. Same caveat applies to memory-lifecycle/synthesize: absence in `migrations/` does not 100% prove absence in prod given the documented "migration history out of sync; apply SQL via Management API" workflow — but there is no in-repo evidence any of the learning crons exist, and no client trigger either.
- **`extract-user-context` is the strongest part of the surface.** Multi-stage: extract (gpt-4o) → validate (gpt-4o-mini fact-check) → contradiction-detect (gpt-4o-mini) → embedding semantic dedup (text-embedding-3-small) → deterministic guardrails. It is genuinely careful about hallucination, negation, third-party identity, and typography-rule-as-fact. Capture quality is not the problem; reuse and feedback are.
- **OpenAI-only dependency, no Gemini fallback in the memory pipeline.** Unlike the briefing/skill pipelines (which have Gemini fallbacks per memory notes), `extract-user-context`, `memory-synthesize`, and `detect-patterns` are hard OpenAI. With the team's documented OpenAI billing exhaustion, capture can silently 502 (the hook retries only transport errors, not function errors).
- **Two `verifyFact` paths with different semantics:** `useUserMemory.verifyFact` calls the `verify_memory_fact` RPC (proper status transition); `useMemoryWeb.verifyFact` does a direct table `update({verification_status:'verified'})`. They can drift.
- **Manual facts skip the entire learning pipeline:** `useCreateMemory` inserts directly as `verified` with no extraction/validation/dedup/guardrails, so the most trustworthy-looking facts bypass the system's quality machinery.
- **`is_current` soft-delete + `archived_at` are inconsistently applied.** `useMemoryWeb` defensively falls back when `archived_at` is missing, implying schema/migration drift between environments.
- **Consolidation opportunity (for the rebuild brief):** collapse the two stacks into one (`user_memory` as the single fact store; bridge assessment + reflections + decision verdicts INTO it), wire the three dormant engines on a single cron, and — critically — write `reference_count`/`last_referenced_at` from `getUserContext`/`buildMemoryContext` so the temperature engine finally has a signal. That single write-back is the cheapest path to "it learns." Replace the 4 editing surfaces + 4 Settings tabs with one capture/curation surface; keep swipe-verify on mobile, dense console on desktop. Net effect: same features, one source of truth, a loop that actually closes.
