# CTRL Surface Map — Backend Depth (the complexity beneath the hood)

> Truth-map input for the CTRL Corpus. Read from REAL code in `C:/Users/krish/mm-ctrl/supabase/`.
> Scope: this is the **backend**, not a UI tab. It is the engine room that every frontend tab calls into.
> Founder mandate context: consolidate/dedupe WITHOUT losing features; 5-min one-handed mobile + command-center desktop. This map flags what MUST survive and what is duplicated/orphaned.

---

## what_it_is

The backend is **86 Supabase Edge Functions (Deno)** + **~116 migrations** defining **~90 tables**, on project `bkyuxvschuwngtcdhsyg`. Extensions in use: **pgvector, pgcrypto, pg_cron**. It is far heavier than the 5-tab frontend suggests: the app's real value lives here, in four genuinely sophisticated engines plus a sprawl of legacy/half-migrated subsystems.

The four engines that carry the value proposition (the nuance that MUST survive any redesign):

1. **Memory Web / personalization core** — a temperature-tiered, versioned, encryptable fact store (`user_memory`) with confidence + verification status, a pattern-detection layer (`user_patterns`), a decisions layer (`user_decisions`), and a **per-target context exporter** that emits tool-native artifacts (ChatGPT Custom GPT instructions+knowledge, Claude Project XML, `CLAUDE.md`, `.cursorrules`, Gemini system instruction) filtered by 14 use-cases. This is the "give your AI your brain" moat.
2. **Briefing v2 pipeline** — the most complex single flow. lens (importance ranking) → query planner → multi-provider fan-out (Perplexity / Tavily / Brave, 12s cap) → pgvector embed-dedupe + evidence scoring → curation → GPT-4o script → ElevenLabs audio. Every retained story carries the `lens_item_id` it matched ("evidence-based relevance"). Has its own negative-feedback learning loop (`briefing_lens_feedback`).
3. **Decision Engine** — a verification-looped pressure test: decompose a decision into claims → web-verify each load-bearing claim with real evidence → (Edge Pro) multi-model adversarial cross-examination → advise with a counter-case + a named "breakpoint assumption" → an hourly pg_cron WATCH loop (`decision-watch`) that re-verifies claims and raises `decision_alerts` that get **prepended into the next morning's briefing**. This cross-engine wiring is the crown jewel.
4. **Kit Engine** — class/cohort follow-up portal: redeem a code → 2-tap intake → compose every artifact in a class preset's manifest (deterministic templates + one polish call + the reused skill-export pipeline + scaffold ZIPs + a plan call) → email pack → nudges. Anonymous-JWT capable (students never make an account).

Supporting subsystems: Stripe billing ($49 diagnostic one-time / $29 Edge Pro sub), Skill Builder export, AI Leadership Index (privacy-preserving peer benchmarking with salted company identifiers + consent rules), the legacy **Leader/Assessment** stack, a dynamic cost-optimizing **model router**, an **AI response cache**, **rate limiting**, **fact guardrails**, and a **dormant attribution warehouse forwarder**.

---

## user_actions (what backend work the user triggers, by engine)

The user never "uses the backend" directly; these are the discrete user-initiated actions that fan out into the engines. Exhaustive per surface they originate from:

**Memory / personalization**
- Speak or paste raw text → `extract-user-context` (LLM extracts 5-15 durable facts, runs guardrails, rejects style-rules/negations/transient/third-party).
- Onboarding interview answers → `onboarding-interview`.
- Manually add / edit / verify / archive a fact (CRUD) → `memory-crud`.
- Confirm or correct an inferred fact (verification status hot/warm, confidence).
- Run "synthesize" to collapse/dedupe memory → `memory-synthesize`.
- Run pattern detection → `detect-patterns` (needs >=5 facts).
- Set memory privacy / encryption / temperature / budget → `memory-settings`, `memory-lifecycle`.
- Export "my AI context" → `memory-export` (pick a target tool + a use-case; gets a downloadable artifact set).
- Import a markdown brain dump → markdown source type ingest.

**Briefing**
- Add / remove / toggle **briefing interests** (beats, entities, excludes) → `briefing-interests` table; infer from profile → `infer-briefing-interests`; accept suggested → `suggested_briefing_interests`.
- Pick a **briefing type** (default / macro_trends / vendor_landscape / competitive_intel / boardroom_prep / team_update / ai_landscape / custom_voice — 5 are Pro-only) and optional custom context.
- Generate briefing → `generate-briefing` (the 2,067-line pipeline) → poll → `synthesize-briefing` for audio.
- Thumbs up/down a briefing segment → `briefing-feedback` → `briefing-aggregate-feedback` (aggregates into negative lens weight deltas).
- **Kill a lens item** (never show me this again) → `briefing-kill-lens-item` (writes a -1.0 `briefing_lens_feedback` delta).
- "Why did I get this?" diagnose → `briefing-diagnose`.
- Set notification prefs / daily send time → `upsert-notification-prefs`; receive daily email via `send-daily-briefing` (pg_cron).

**Decision Engine**
- Submit a decision/business case to pressure-test (source: advisor / capture / voice / fireflies) → `decision-engine` (background pipeline, frontend polls stages).
- Capture a decision (lighter) → `submit-decision-capture` / `decision-user-calls`.
- View case → claims → evidence → tensions → recommendation + breakpoint assumption + validate-next.
- Receive `decision_alerts` when a watched assumption weakens (surfaced inside the briefing).

**Kit**
- Redeem a class code → `kit-redeem`.
- Answer 2-tap intake → `kit-compose` (initial).
- Regenerate artifacts with feedback (unlimited on active pass) / request a net-new skill (consumes quota) → `kit-compose`.
- Paste a "capsule" from class → `kit-capsule-ingest`.
- Get the pack emailed → `send-kit-pack`; receive nudges → `send-kit-nudges` (pg_cron).

**Skill Builder / Enrich / Index / Billing / Account**
- Build an agent skill (voice/text → triage → JSON extraction → quality gate → agentskills.io ZIP) → `generate-skill-export` (Edge Pro) / `free-skill-export`.
- Enrich company context → `enrich-company-context`; meeting prep → `generate-meeting-prep`.
- Join AI Leadership Index → `populate-index-participant` (+ consent → `upsert-sharing-consent`), get peer snippets → `get-peer-snippets`.
- Weekly check-in / reflection / mission check-in → `submit-weekly-checkin`, `submit-reflection`, `send-mission-check-in`.
- Pay $49 diagnostic → `create-diagnostic-payment` → `verify-diagnostic-payment`; subscribe to Edge Pro $29 → `create-edge-subscription`; manage billing → `create-billing-portal-session`; webhooks → `stripe-webhook`.
- Delete account (GDPR) → `delete-account`; auto-purge → `cleanup-expired-data` (cron).

---

## key_files

**Crown-jewel shared logic (`supabase/functions/_shared/`)**
- `memory-context-builder.ts` (24KB) — per-target export formatters + 14 use-case filters + token budgeting. **The personalization moat.**
- `briefing-lens.ts` (24KB) — importance lens + query planner + interest weighting + negative-feedback deltas + industry query-bias guardrails.
- `briefing-scoring.ts`, `briefing-curation.ts`, `lens-signature.ts` — the rest of the briefing v2 spine.
- `decision-alerts.ts` — wires Decision Engine alerts into the briefing (cross-engine glue).
- `user-context.ts` — single `getUserContext` used by briefing + decision engine (the grounding read).
- `context-builder.ts`, `memory-context-builder.ts`, `user-context.ts` — **THREE overlapping context-assembly modules** (see duplications).
- `model-router.ts` + `aa-cache.ts` + `aa-types.ts` + `artificial-analysis.ts` — dynamic cheapest-model-meeting-quality router (gated by `MODEL_ROUTING_ENABLED`, default off → falls back to hardcoded).
- `llm-fallback.ts`, `openai-utils.ts` — OpenAI→Gemini fallback (OpenAI billing has been exhausted historically; Gemini carries skill/plan).
- `fact-guardrails.ts`, `guardrails-core.ts`, `llm-quality-guardrails.ts` — extraction + output guardrails (typography rules, banned phrases, no em dashes).
- `ai-cache.ts` / `ai-usage.ts` / `rate-limit.ts` (+ `rateLimit.ts` + `rate-limiting.ts` — **three rate-limit files**), `with-timeout.ts`, `logger.ts`, `attribution-emit.ts` (dormant warehouse forwarder).
- `training-loader.ts` / `training-schema.ts` — global `training_material` (watchlist, hot-signal taxonomy, voice cards) that tunes briefing behavior via YAML-ish config.

**Engine orchestrators**
- `decision-engine/{index,pipeline,decompose,verify,crossexamine,advise,retrievers,llm,types}.ts` — the verification loop, cleanly modularized.
- `generate-briefing/index.ts` (2,067 lines — the single heaviest file) + `synthesize-briefing/`.
- `kit-compose/index.ts` (860 lines) + `_shared/kit-presets/`.
- `extract-user-context/index.ts` (681 lines), `detect-patterns/`, `memory-synthesize/`, `memory-crud/`, `memory-export/`.

**Schema (representative migrations)**
- `20260114000000_create_user_memory.sql` + `20260314000000_ensure_user_memory.sql` (memory core, **defined twice**).
- `20260306000003_user_patterns.sql`, `20260306000002_user_decisions.sql`, `20260306000001_memory_budget.sql`, `20260125000001_memory_encryption.sql`.
- `20260602000000_decision_engine.sql` (7 decision tables) + `20260605140000_decision_user_calls.sql`.
- `20260401000000_create_briefings.sql`, `20260419000000_briefing_interests.sql`, `20260419000002_briefing_lens_feedback.sql`, `20260418000000_briefing_v2_pgvector_schema.sql`, `20260419000001_industry_beat_library.sql`.
- `20260610000000_kit_engine.sql` (6 kit tables).
- `20260323000000_create_edge.sql` (edge_profiles/actions/feedback/subscriptions).
- `20251108164332_*.sql` (AI Leadership Index: salted identifiers, consent, snapshots, velocity, roi_actuals, adoption_momentum, referrals).
- Legacy leader stack: `20251119111446_*.sql` (leaders + 7 leader_* assessment tables), `20251216193000_add_leader_loop_tables.sql`, `20260110131601_create_ai_confidante_tables.sql` (leader_reflections/leader_patterns/leader_prompt_history).

**Frontend hooks that bind to these engines (`src/hooks/`)** — 60+ hooks; the load-bearing ones: `useUserMemory`/`useMemoryWeb`/`useMemoryQueries`, `useMemoryExport`, `useBriefing`/`useBriefingInterests`/`useBriefingStreamPreview`/`useKillLensItem`, `useDecisionEngine`/`useDecisionInbox`/`useDecisionCall`/`useDecisions`, `useGoals`/`useMissions` (**two goal systems**), `useKitBuild`/`useKitArtifacts`/`useKitRedemption`, `useEdge`/`useEdgeSubscription`, `useSkillExport`.

---

## mobile_treatment

The **backend is platform-agnostic** — it serves JSON/202-poll the same to both. But its architecture is what makes a 5-min one-handed mobile experience POSSIBLE, and also what currently makes mobile heavy:

- **Async-poll pattern (mobile-friendly):** the two heaviest engines (`decision-engine`, `kit-compose`) and the briefing return **202 immediately + run in the background via `EdgeRuntime.waitUntil`**, while the client polls a status column (`decision_cases.stage`, `kit_builds.artifact_statuses`, briefing streaming). This is exactly the right shape for flaky mobile networks and a one-handed flow — the heavy work survives a backgrounded tab.
- **Token budgeting:** `buildMemoryContext` enforces a `maxTokens` budget (default 4000) trimming warm facts first — small payloads suit mobile.
- **Where mobile suffers:** the backend exposes a **huge surface of discrete actions** (interests CRUD, lens kills, briefing types, fact verify/archive, 14 export use-cases, decision sources). None of that complexity is collapsed server-side; the frontend has to render it all, so mobile currently inherits a squeezed command-center, not a sequenced flow. The backend offers no "one call that does the right next thing" endpoint — there is no server-driven next-action / guided-step API. Consolidation should add a thin orchestration endpoint (e.g. "today" / "next") so mobile can render one decision at a time instead of all five engines' controls.

---

## desktop_treatment

Same backend; desktop is where the breadth is meant to shine as a command center. The backend already supports a command-center read model: `getUserContext` + the lens give a single grounded snapshot, and `decision_alerts` are designed to be aggregated into one feed. But the backend **does not** provide a unified "dashboard aggregate" endpoint — the desktop has to issue many independent reads (memory, patterns, decisions, briefings, missions, goals, edge, kit) and stitch them client-side. A consolidation win is a single server aggregate that the desktop right-rail / command palette can hydrate from.

---

## complexity_1to5

**5 — overwhelming.** 86 edge functions, ~90 tables, 116 migrations, pgvector+pg_cron, four independent multi-stage AI pipelines, a model router, three rate-limit implementations, three context-builders, two parallel memory schemas, two goal systems, and a large legacy assessment stack still wired in. The four core engines are individually excellent and well-modularized; the overwhelm is from **accreted duplication and an un-retired legacy layer**, not from the engines themselves.

---

## duplications

Backend-internal overlaps that map directly to the founder's "features duplicated across multiple UIs" complaint:

1. **TWO memory/personalization schemas running in parallel.** The modern `user_memory` / `user_patterns` / `user_decisions` stack (Memory Web) AND the legacy `leader_reflections` / `leader_patterns` / `leader_prompt_history` (AI Confidante) stack. **Pattern detection exists twice:** `detect-patterns` writes `user_patterns` from `user_memory`; a separate path writes `leader_patterns` from `leader_reflections` (`memory-synthesize` reads `leader_reflections`). Same concept, two tables, two LLM prompts, two confidence schemes.
2. **THREE context-assembly modules:** `_shared/context-builder.ts` (profile/events/insights, legacy assessment world), `_shared/memory-context-builder.ts` (export artifacts), `_shared/user-context.ts` (briefing + decision grounding). Overlapping "load the user's facts" logic three ways.
3. **TWO goal/objective systems:** `goals` table (`useGoals`, 2026-06) AND `leader_missions` / `leader_weekly_actions` (`useMissions`). Objectives also live as `fact_category='objective'` rows in `user_memory`. So "what is this user trying to do" is stored in **three** places (goals, missions, memory objectives) and the briefing lens reads from all of them.
4. **Decision capture exists at three depths:** full `decision-engine` (verify-loop), `submit-decision-capture` (lightweight), `decision_user_calls` / `useDecisionCall`, plus `leader_decision_captures` (legacy). Memory also stores `user_decisions`. Heavy overlap between "log a decision" and "pressure-test a decision."
5. **THREE rate-limit modules** (`rate-limit.ts`, `rateLimit.ts`, `rate-limiting.ts`) + multiple rate-limit tables (`rate_limits`, `rate_limit_logs`) — same job, three impls.
6. **`user_memory` defined by two migrations** (`create_user_memory` + `ensure_user_memory`); `consent_audit` and `security_audit_log` each created in two migrations; `data_audit_log` / `ai_usage_audit` created in both `20260110111745` and `20260602000000`; `ai_response_cache` created in two migrations.
7. **Export overlaps the Memory Web's purpose:** `memory-export`, `generate-custom-export`, `generate-team-instructions`, `generate-skill-export`, `free-skill-export`, `kit-compose` all turn the same fact store into downloadable artifacts via overlapping formatting code. The kit explicitly **re-uses** generate-skill-export's prompt/quality-gate/zip modules (good), but the broader export surface is fragmented across 6 functions.
8. **Two confirmation/email stacks:** `send-confirmation-email` (+ `_templates`), `send-diagnostic-email`, `send-edge-test-email`, `send-booking-notification`, `send-advisory-sprint-notification`, plus Resend webhook — many near-identical Resend senders.

---

## underused_data (captured but not fed back into learning/personalization)

The founder's "it never feels like it learns from me" is structurally true: capture is rich, the feedback loops are narrow and mostly one-directional.

- **Briefing engagement is barely a learning signal.** Thumbs/kills feed `briefing_lens_feedback` (good, the one real loop), but **which segments the user actually listened to / read / acted on is not captured back into `user_memory` or `user_patterns`.** The briefing never strengthens a fact's confidence or temperature.
- **Decision outcomes never close the loop.** `decision_cases` capture recommendation + breakpoint assumption + validate-next, but there is **no "what actually happened" write-back** — outcomes don't become `user_patterns` (e.g. "this leader over-trusts demand assumptions"). `decision-watch` re-verifies external claims, not the user's realized results.
- **`fact_extraction_log`** records every extraction attempt/rejection but is not mined to improve the extractor or surface "you keep telling me X."
- **`user_memory.last_referenced_at` exists** (used for ordering) but there is no decay/promotion job that moves cold facts warm→hot based on actual usage; temperature is mostly set at write time.
- **`velocity_events`, `adoption_momentum`, `roi_actuals`** (AI Leadership Index) capture behavioral/ROI telemetry that never personalizes the user's own briefing or decision advice — it only feeds peer benchmarking.
- **`leader_reflections.extracted_themes`** are computed then only used for naive substring matching in `detect-patterns`; not embedded, not linked to `user_memory`.
- **`kit_journey_events`** richly logs the kit funnel but is for attribution, not for learning the user's tooling preferences back into Memory Web (the initial kit compose seeds memory once, then stops).
- **The dormant attribution warehouse** (`attribution-emit.ts`) would capture the full landed→purchased→churned funnel but no-ops until `WAREHOUSE_INGEST_URL`/`ATTRIBUTION_INGEST_SECRET` are set — so cross-app attribution data is currently uncaptured.
- **Voice / `voice_instrumentation` / `voice_sessions`** capture interaction telemetry not fed back into personalization.

---

## notes

- **The four engines are the genuinely valuable complexity to PRESERVE.** Specifically: (a) the evidence-based briefing lens with its negative-feedback deltas and industry guardrails; (b) the decision verify-loop with web-grounded claims, the named breakpoint assumption, and the `decision-watch`→briefing-alert cross-wiring; (c) the per-target memory exporter (the only thing in the app that turns "your brain" into tool-native config); (d) the kit compose orchestrator's deterministic-template + reused-pipeline architecture. None of these should be flattened in a redesign.
- **`MODEL_ROUTING_ENABLED` is off by default** → the sophisticated cost-optimizing `model-router.ts` is effectively dormant; the app rides hardcoded fallbacks (gpt-4o / gpt-4o-mini) + the Gemini fallback. Real but unused complexity.
- **OpenAI billing has historically been exhausted** (per memory); `llm-fallback.ts` routes skill/plan to Gemini. Several functions still call OpenAI directly (`detect-patterns` uses raw `gpt-4o`, `memory-synthesize` raw `gpt-4o-mini`) WITHOUT the fallback wrapper — these silently fail when OpenAI is down.
- **CLAUDE.md says "Light mode design / warm off-white"; the live app is DARK** (per project memory — CLAUDE.md is stale). It also says "80 edge functions / 110 migrations"; actual is **86 functions / 116 migrations**. The doc undercounts the backend.
- **Legacy/orphaned-feeling subsystems still in the tree:** the whole `leader_*` assessment stack (leaders, leader_assessments, leader_dimension_scores, leader_tensions, leader_risk_signals, leader_org_scenarios, leader_first_moves, leader_prompt_sets), `operator_*` tables (operator_profiles/prescriptions/advisor_sessions + `operator-decision-advisor`), AI Leadership Index (a large privacy-engineered subsystem — salted identifiers, consent rules, publication rules), `aa-*` model-router infra, `prompt_library_profiles`, `meeting_prep_sessions`, `sharpen-analyze`/`prompt-coach`/`compass-analyze`/`roi-estimate` standalone tools. Each represents a once-built feature surface that the 5-tab UI may or may not still expose.
- **Pages confirm legacy redirect sprawl:** `src/pages/` still contains Today.tsx, Voice.tsx, Pulse.tsx, Think.tsx, Diagnostic.tsx, Baseline.tsx, Timeline.tsx, Progress.tsx, MissionCheckIn.tsx, MissionHistory.tsx, WeeklyCheckin.tsx, PromptCoach.tsx — many are legacy routes that redirect to `/dashboard`, but their backing tables/functions are still live.
- **pg_cron jobs are sparse and load-bearing:** only two cron migrations exist (`daily_briefing_trigger`, `kit_nudge_cron`) plus `decision-watch` (hourly) and `cleanup-expired-data`. The "autonomous" feel depends on very few scheduled jobs.
- **Security posture is mature where it matters:** every engine writes are RLS owner-scoped; Stripe webhooks are signature-verified + idempotent (`stripe_events_processed`); the decision-engine and memory-synthesize both hard-assert `EXPECTED_PROJECT_ID` to refuse running against the wrong database; memory has encryption + a budget + an audit log. The compliance breach fixed earlier (cross-tenant PII) shows this was retrofitted, not native.
- **Consolidation guidance for the rebuild:** the highest-leverage backend dedupe is (1) collapse `leader_patterns`/`leader_reflections` into `user_memory`/`user_patterns`; (2) unify goals/missions/memory-objectives into one objective store the lens reads; (3) collapse the three context-builders and three rate-limiters; (4) add a single server-side "next action" + "dashboard aggregate" endpoint so mobile can sequence and desktop can hydrate one call; (5) add the missing learning write-backs (briefing engagement and decision outcomes → memory confidence/patterns) so the app finally "learns from the user."
