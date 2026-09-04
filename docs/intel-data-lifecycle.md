# CTRL Intelligence Track — How the Data Lives + The Learning Loop

> Confirmed from REAL code in `C:/Users/krish/mm-ctrl` (migrations + `src/` data layer + edge functions), 2026-06-12. This is the "intelligence behind the scenes" track: the memory substrate, the encryption + embedding plumbing, the parallel `user_*` vs `leader_*` stacks, and the LEARNING LOOP — what EXISTS, what is DORMANT/unwired, and the TARGET wiring that makes context demonstrably COMPOUND. The founder's verdict ("it never feels like it learns from me") is, at the code level, mostly TRUE and precisely explainable: **capture is genuinely sophisticated; the feedback wires are cut.**
>
> Project `bkyuxvschuwngtcdhsyg`. Extensions enabled: `pgvector`, `pgcrypto`, `pg_cron`. Prod `ctrl.themindmaker.ai`, DARK theme.

---

## 0. The one-sentence intelligence thesis

CTRL's moat is supposed to be a **temperature-tiered, self-curating knowledge graph of the user** (`user_memory`) that (a) captures durable facts with multi-stage LLM hygiene, (b) synthesizes them into behavioral patterns, (c) heats/cools facts by actual usage, and (d) feeds everything — briefings, decisions, exports — so the system visibly compounds. **The schema, the UI affordances, and three synthesis engines all exist. In production, the engines are unscheduled and the single usage-signal write (`reference_count`) is never emitted, so the graph never actually moves.** The magic is built but unplugged.

---

## 1. Where the data lives — the memory tables (exact columns)

### `user_memory` — the atomic fact store (the "Memory Web")
Defined in `20260114000000_create_user_memory.sql`, re-asserted in `20260314000000_ensure_user_memory.sql` (**defined twice** — drift hazard).

Columns that matter for intelligence:
- **Identity:** `fact_key` (e.g. `role`, `company_name`, `watching_company`), `fact_category` ENUM `fact_category` = `identity | business | objective | blocker | preference`, `fact_label` (human label), `fact_value` (the value), `fact_context` (the original transcript snippet that produced it — provenance).
- **Confidence/verification:** `confidence_score NUMERIC(3,2)` CHECK 0–1 default 0.5; `is_high_stakes BOOLEAN` (gates whether the user is asked to verify); `verification_status` ENUM = `inferred → verified | corrected | rejected` default `inferred`; `verified_at`.
- **Provenance:** `source_type` ENUM `memory_source_type` = `voice | form | linkedin | calendar | enrichment` + later `manual` + `system` (added via `ALTER TYPE` in encryption migration) + `markdown` (added `20260321000000`). `source_session_id`, `source_transcript_id`.
- **Temporal versioning:** `is_current BOOLEAN` (soft delete = `false`), `superseded_by` / `supersedes` (self-referencing FKs — a fact can supersede a prior fact).
- **Temperature/learning (added `20260306000000_memory_web_temperature.sql`):** `temperature TEXT` = `hot | warm | cold` default **`warm`**; `last_referenced_at TIMESTAMPTZ` default `now()`; `reference_count INTEGER` default 0; `archived_at TIMESTAMPTZ`; `tags TEXT[]`.
- **Encryption/retention (added `20260125000001_memory_encryption.sql`):** `encrypted_content TEXT` (comment: "AES-256-GCM encrypted fact_value and fact_context"), `encryption_version INTEGER` default 1, `retention_expires_at TIMESTAMPTZ`.
- **Training trace:** `training_material_version` (stamped at extraction, see §4), `fact_subtype`.

RLS: owner-scoped SELECT/INSERT/UPDATE on `auth.uid() = user_id` PLUS a `"Service role can manage all memory" FOR ALL USING(true)` policy.

Stored RPCs on this table (SECURITY DEFINER): `get_user_memory_context(p_user_id)` (returns verified+corrected OR confidence ≥ 0.7), `get_pending_verifications(p_user_id)` (high-stakes inferred, ordered by confidence, LIMIT 5), `verify_memory_fact(p_fact_id, p_new_value, p_is_correct)` (the proper status-transition path), and — critically — **`touch_memory_fact(p_fact_id)`** which does `reference_count = reference_count + 1, last_referenced_at = now()`. **This is the single learning-signal write, and nothing calls it (see §5).**

### Satellite tables
- **`user_patterns`** (`20260306000003`) — behavioral synthesis. `pattern_type` CHECK `preference | anti_preference | behavior | blindspot | strength`, `pattern_text`, `evidence_count` (default 1), `confidence DECIMAL(3,2)`, `status` CHECK `emerging | confirmed | deprecated` default `emerging`, `source_facts UUID[]` (links back to the `user_memory` rows that produced it), `first_observed_at` / `last_confirmed_at`. RPC `get_active_patterns`.
- **`user_decisions`** (`20260306000002`) — institutional decision journal. `decision_text`, `rationale`, `context_snapshot JSONB`, `status` `active | superseded | reversed`, `superseded_by` self-FK, `source` CHECK `manual | voice | check_in | mission | assessment`.
- **`user_memory_budget`** (`20260306000001`) — token accounting. `hot_token_count` / `hot_max_tokens` (default 4000) / `warm_token_count` / `warm_max_tokens` (default 8000) / `total_facts` / `last_cleanup_at`. RPC `get_or_create_memory_budget`.
- **`user_memory_settings`** — retention window + privacy/auto-capture toggles (drives `set_memory_retention_expiration` trigger that stamps `retention_expires_at = created_at + retention_days`).

---

## 2. The encryption story — application-layer AES-GCM, NOT pgcrypto

Important correction to assume-from-extensions: although `pgcrypto` is enabled, **`user_memory` encryption is NOT done in Postgres.** It is **Web Crypto API `AES-256-GCM`** inside the `memory-crud` edge function (`supabase/functions/memory-crud/index.ts`): `crypto.subtle.encrypt` with a derived key, writing `encrypted_content = JSON.stringify({ ciphertext, iv })` (both base64) + `encryption_version: 1`. There are `encrypt()` / `decrypt()` helpers and re-encrypt-on-update logic.

**But the live UI bypasses it.** The actually-used create hook `useCreateMemory` (in `src/hooks/useMemoryQueries.ts`, called by `AddMemorySheet`) does a **direct `supabase.from('user_memory').insert(...)`** — no `memory-crud`, so manually-added facts are written **unencrypted, with `verification_status: 'verified'`, `confidence_score: 1.0`**, skipping extraction/validation/dedup/guardrails entirely. The `memory-crud` HTTP wrappers (`fetchMemoryList`, `createMemory`, etc. at the top of `useMemoryQueries.ts`, calling `functions.invoke('memory-crud/list')`, `'memory-crud/create'`…) are **dead code shadowed by direct-table hooks** (`useMemoryList`, `useCreateMemory`, … all query the table directly). So the encryption engine and the encrypted column exist but are not on the live write path; `useComplianceStatus.ts` still reports `encryptionEnabled: true` citing the (unused) memory-crud function.

---

## 3. The pgvector story — in-memory cosine for memory dedup; real pgvector is for briefings

Two distinct embedding stories that are easy to conflate:
- **Memory dedup (`extract-user-context`):** semantic dedup uses **OpenAI `text-embedding-3-small`** computed at request time, with a **cosine-similarity comparison done in JavaScript** (`cosineSim(a,b)` over the returned vectors). It does NOT store an embedding column on `user_memory`; it embeds the new facts + existing fact texts (`"category: label = value"`), compares in-process, and uses the result to mark `semanticDuplicates` so a new phrasing UPDATES the existing fact (if higher confidence) rather than inserting a duplicate. This is the closest thing to "the graph reconciles itself," and it is real — but ephemeral (no persisted vector).
- **Real pgvector** lives in the **briefing v2** schema (`20260418000000_briefing_v2_pgvector_schema.sql`: `CREATE EXTENSION IF NOT EXISTS vector`) for news-story embed-dedupe + evidence scoring — a different subsystem entirely. So "pgvector embeddings" in CTRL = briefing relevance, not memory recall.

---

## 4. Capture — the strongest part of the intelligence (the hygiene pipeline)

`extract-user-context/index.ts` (~681 lines) is the keystone and the most careful code in the app. Multi-stage:
1. **Extract** facts from voice/text (OpenAI, JSON-mode), 5–15 durable facts.
2. **Validate** pass (fact-check) + **contradiction detection** (LLM).
3. **Semantic dedup** (embeddings + in-JS cosine, §3) → produces `existingKeys` + `semanticDuplicates`.
4. **Deterministic guardrails** (`_shared/fact-guardrails.ts`): rejects style/typography rules-as-facts, negations, transient statements, third-party identity; stamps `training_material_version = guardrailTrainingVersion` on every row.
5. **Write:** new facts insert as `verification_status: 'inferred'` (never auto-verified); exact-key OR semantic-duplicate matches **UPDATE in place only if new `confidence_score` is higher AND existing is still `inferred`** (a genuine intra-capture refinement loop). Hard `user_id` assertion before insert (post-compliance-breach defense-in-depth).
6. **Fire-and-forget triggers:** `synthesize-edge-profile` (if an `edge_profile` exists) and `infer-briefing-interests` (if any fact landed). These are the only auto-chained writes.

This is why the corpus should say capture quality is NOT the problem. The hallucination/negation/third-party guards are mature. **Reuse and feedback are where it dies.**

---

## 5. The learning loop — what EXISTS, what is DORMANT (the core finding)

### The intended loop (per schema + UI promises)
`capture fact → use fact (briefing/decision/export) → touch_memory_fact bumps reference_count/last_referenced_at → memory-lifecycle promotes hot/demotes/archives by usage → memory-synthesize rolls facts into user_patterns → patterns + hot facts re-injected into next briefing/decision → user verifies/corrects → confidence reweights`. The UI sells exactly this: MemoryCenter's "% verified" pill, "X hot / Y warm" thermometer, `health_score`, and `GettingSmarterDelta` ("new facts/patterns/decisions since last visit"); plus `src/components/mobile/LearningEngineSheet.tsx` literally visualizes this loop.

### What is built and correct in isolation
- **`memory-lifecycle/index.ts`** is a clean 4-rule temperature engine + budget recompute: promote warm→hot (reference_count ≥ 3 AND referenced in last 7d); demote hot→warm (not referenced 14d); warm→cold (30d); archive cold (90d); recompute `hot_token_count`/`warm_token_count` (`ceil(len/4)`); force-demote lowest-`reference_count` hot facts if over `hot_max_tokens`.
- **`memory-synthesize/index.ts`** reads hot+warm `user_memory` (needs ≥ 5 facts) → `gpt-4o` JSON → writes **`user_patterns`**, fuzzy-merging into existing patterns (bumps `evidence_count`, raises `confidence`, flips `emerging→confirmed` at confidence > 0.8 AND evidence > 3).
- **`_shared/memory-context-builder.ts`** `buildMemoryContext` reads hot (always) + warm facts **`ORDER BY last_referenced_at DESC`**, trims to `maxTokens` (default 4000), emits per-tool artifacts. It CONSUMES the temperature signal correctly.
- **`_shared/user-context.ts`** `getUserContext` is the real personalization read for briefing + decision: pulls identity/objectives/blockers/preferences from `user_memory` (top 40 by confidence), `user_patterns` (confirmed+emerging, confidence ≥ 0.6), `user_decisions` (active), watchlist (`watching_company`), missions, edge strengths/weaknesses, and `feedbackPreferences`.

### What is DORMANT / unwired (the cut wires — confirmed by grep)
1. **`touch_memory_fact` is NEVER called.** Grep across all edge functions + client: `touch_memory_fact` appears only in its own migration. `getUserContext` and `buildMemoryContext` READ facts but never touch them; the only other `reference_count` writes are seed defaults (`src/lib/seedFacts.ts: reference_count: 0`). **So `reference_count` stays 0 and `last_referenced_at` stays the create time forever.** The temperature engine has no input signal → every fact dies at its seed temperature (new facts seed `warm`; the UI shows new ones as `hot` purely client-side via `toWebFact`). This single missing write is the clearest mechanical reason "it never feels like it learns."
2. **`memory-lifecycle` is not scheduled and not invoked.** No `cron.schedule` in `supabase/migrations/` references it; no client `functions.invoke('memory-lifecycle')` exists. Promotion/demotion/archival never runs. (Even if it ran, #1 starves it.)
3. **`memory-synthesize` is not scheduled and not invoked.** No cron, no client call. `user_patterns` only populates if someone manually hits the function → the pattern panel, `patterns_count`, and the patterns `getUserContext` injects are empty for real users.
4. **`detect-patterns` (the legacy twin) is dead on the client.** It has a wrapper `api.detectPatterns()` at `src/lib/api.ts:199-207` but **nothing calls that wrapper** (grep `detectPatterns` returns only the definition); no cron either.
5. **Only TWO cron jobs exist in-repo:** `daily-briefing-email` (`20260605000000_daily_briefing_trigger.sql`, `0 12 * * *` → `send-daily-briefing`) and the kit nudge cron (`20260610000003`). **There is NO `cron.schedule` for `decision-watch`** despite CLAUDE.md describing an "hourly pg_cron WATCH loop" — not in `migrations/`. Caveat: the team applies SQL via the Management API out-of-band, so a cron could exist in prod off-repo; but there is zero in-repo evidence for the lifecycle/synthesize/detect-patterns/decision-watch crons.

---

## 6. The parallel stacks — TWO complete user-data lineages that don't reconcile

| | MODERN ("Memory Web") | LEGACY ("Leader / AI Confidante") |
|---|---|---|
| Fact store | `user_memory` | `leaders` (wide columns) + `assessment_events` |
| Patterns table | **`user_patterns`** | **`leader_patterns`** |
| Pattern engine | `memory-synthesize` (reads `user_memory`, gpt-4o) | `detect-patterns` (reads `leader_reflections`, gpt-4o-mini) |
| Reflections | (none) | `leader_reflections.extracted_themes` |
| Scores | (none) | `leader_assessments` + `leader_dimension_scores` |
| Context builder | `_shared/user-context.ts` + `_shared/memory-context-builder.ts` | `_shared/context-builder.ts` (`buildLLMContext`) |

**Precise disambiguation (corrects an earlier ambiguity):** `detect-patterns/index.ts` reads `leader_reflections` (keyed `user_id`, last 30d, needs ≥ 3) and writes **`leader_patterns`** (`pattern_type` `avoidance|strength|blind_spot`, `evidence_reflection_ids`, naive substring theme-match). `memory-synthesize` reads `user_memory` and writes `user_patterns`. They are **two implementations of "find this person's patterns," over different source tables, into different destination tables, with different type taxonomies, never reconciled.**

The diagnostic/assessment flow (`create-leader-assessment`, `Baseline.tsx`, `Diagnostic.tsx`) writes ONLY the legacy stack; there is **no bridge promoting assessment results into `user_memory`** (grep `user_memory` in those functions = nothing). So the richest first-touch self-knowledge the user produces is invisible to the graph that powers personalization. `WorkContextTab.tsx` papers over the split with a hand-written `FACT_TO_LEADER` map that one-way-syncs a few `user_memory` keys into `leaders` columns.

---

## 7. The cross-engine crown jewel — the ONE compounding loop that's real (decision → briefing)

`_shared/decision-alerts.ts` `prependDecisionAlerts(...)` is wired into `generate-briefing/index.ts` at three call sites (lines 1486, 1760, 2027). When `decision-watch` re-verifies a load-bearing claim and finds an assumption weakened, it writes a `decision_alerts` row; the next morning's briefing prepends those open alerts as a leading `framework_tag: "decision_alert"` segment AND a spoken preamble ("an assumption behind your decision just weakened"), then marks them surfaced. **This is genuine cross-engine compounding and the strongest "it's thinking about me" moment in the app.** Caveat: it only fires if `decision-watch` runs, and its cron isn't in-repo (§5.5). And it is one-directional outward: `decision-engine` only READS `user_memory` (grounds on objective facts at `index.ts:62`) and writes verdicts to `decision_cases`/`decision_claims` — it **never writes its conclusions back into `user_decisions`, `user_patterns`, or `user_memory`**, so pressure-testing teaches the durable graph nothing.

---

## 8. The other real loop — briefing negative feedback (narrow but working)

`briefing-aggregate-feedback/index.ts` is the only behavior→model loop that demonstrably works: it scans `briefing_feedback` `not_useful` reactions over 30d, groups by `(user_id, lens_item_signature)` via `computeLensSignature`, and once a signature hits 3 negatives upserts a `weight_delta = -0.4` row into `briefing_lens_feedback`. `getUserContext` separately derives `feedbackPreferences` (preferred framework_tags + sources) from `useful` reactions in the last 7d. **Both are real, but scoped to briefing lens weighting only** — they never touch a fact's `confidence`, `temperature`, or a `user_pattern`, so they make the briefing smarter without making the *memory* feel smarter. (It runs inline from `generate-briefing` per its header comment; no dedicated cron in-repo.)

---

## 9. TARGET wiring — the cheapest path to "it demonstrably compounds"

Ordered by leverage-to-effort (all confirmed against current gaps above):

1. **Emit the usage signal.** Call `touch_memory_fact(fact_id)` (or batch-bump) from `getUserContext` and `buildMemoryContext` whenever a fact is actually injected into a briefing/decision/export. This is one write the whole temperature engine is starving for; without it nothing else in the loop can move. **Single highest-leverage line in the codebase.**
2. **Schedule the three dormant engines on ONE cron** (or chain them off the existing daily-briefing cron, per-user): `memory-lifecycle` (re-temperature) → `memory-synthesize` (facts→patterns). Now `user_patterns` populates and hot/warm/cold actually tracks reliance.
3. **Close the decision loop inward:** after `decision-engine` advises, write the verdict + named breakpoint assumption into `user_decisions` (source `voice`/`capture`) and, on outcome, into a `user_pattern` ("over-trusts demand assumptions"). Pressure-testing then compounds.
4. **Bridge the legacy stack in:** promote diagnostic dimension scores/tiers + `leader_reflections` themes into `user_memory`/`user_patterns` so first-touch self-knowledge personalizes everything; retire `detect-patterns`/`leader_patterns` into `memory-synthesize`/`user_patterns`.
5. **Reweight extraction from verification:** aggregate `verification_status` corrections/rejections into per-user priors that tune future extraction confidence + guardrails (today the ground-truth signal updates one row and dies).
6. **Put manual creates back through hygiene:** route `useCreateMemory` through the validate/dedup path (or at least encrypt + start them `inferred`) so the most trustworthy-looking facts stop bypassing the quality machinery.

**Net:** the same features, one source of truth, and a loop that closes — turning the currently-decorative thermometer/health-score/`GettingSmarterDelta` into honest, data-real evidence the system is learning. The "feeling of magic" here is earned by making `reference_count` move; faking it (client-side `toWebFact` heat) is what currently rings hollow.

---

## 10. Honest-magic guardrails (data-realist, never faked) — what's already right to keep

- New facts visibly "land hot at the centre" (`toWebFact`) — fine as an onboarding affordance, but must become BACKED by real `touch`/lifecycle once #9.1 ships, or it's theatre.
- Seeds (`seedFacts.ts`) are **display-only** (empty `user_id`, `temperature: 'cold'`, `SEED_TAG`, never persisted) — an honest "the canvas is alive" cue that doesn't pollute the real graph. Good pattern.
- Every retained briefing story carries its matched `lens_item_id` ("evidence-based relevance") and decision claims carry web evidence — the app's magic is grounded, not asserted. Memory should inherit the same standard: show *why* a fact is hot (it was used N times in your last M briefings), not a decorative pulse.

---

## Schema returned (for the corpus index)

```
user_memory(
  id, user_id,
  fact_key, fact_category[identity|business|objective|blocker|preference],
  fact_label, fact_value, fact_context,
  confidence_score NUMERIC(3,2)[0..1], is_high_stakes,
  verification_status[inferred|verified|corrected|rejected], verified_at,
  source_type[voice|form|linkedin|calendar|enrichment|manual|system|markdown],
  source_session_id, source_transcript_id, training_material_version, fact_subtype,
  is_current, superseded_by→user_memory, supersedes→user_memory,
  temperature[hot|warm|cold]=warm, last_referenced_at, reference_count=0, archived_at, tags[],
  encrypted_content(AES-256-GCM {ciphertext,iv}), encryption_version, retention_expires_at,
  created_at, updated_at )
  RPCs: get_user_memory_context, get_pending_verifications, verify_memory_fact,
        touch_memory_fact[UNCALLED], get_memory_by_temperature, cleanup_expired_memories, export_user_memory

user_patterns(id,user_id, pattern_type[preference|anti_preference|behavior|blindspot|strength],
  pattern_text, evidence_count, confidence DECIMAL(3,2),
  status[emerging|confirmed|deprecated], source_facts UUID[], first_observed_at, last_confirmed_at, created_at)
  ← written by memory-synthesize[UNSCHEDULED]

user_decisions(id,user_id, decision_text, rationale, context_snapshot JSONB,
  status[active|superseded|reversed], superseded_by→user_decisions,
  source[manual|voice|check_in|mission|assessment], created_at, updated_at)
  ← decision-engine does NOT write here

user_memory_budget(user_id UNIQUE, hot_token_count, hot_max_tokens=4000,
  warm_token_count, warm_max_tokens=8000, total_facts, last_cleanup_at, last_audit_at)
  ← recomputed by memory-lifecycle[UNSCHEDULED]

user_memory_settings(retention_days, privacy/auto-capture toggles)  → trigger sets retention_expires_at

LEGACY PARALLEL: leaders / assessment_events / leader_reflections.extracted_themes /
  leader_patterns[pattern_type avoidance|strength|blind_spot] ← detect-patterns[DEAD on client] /
  leader_assessments / leader_dimension_scores   — NO bridge into user_memory

LEARNING ENGINES: memory-lifecycle(temp promote/demote/archive + budget)[UNSCHEDULED] ·
  memory-synthesize(facts→user_patterns)[UNSCHEDULED] · detect-patterns(reflections→leader_patterns)[DEAD] ·
  touch_memory_fact(reference_count++)[NEVER CALLED ← the cut wire]
WORKING LOOPS: briefing-aggregate-feedback(not_useful×3 → briefing_lens_feedback -0.4) ·
  decision-watch → decision_alerts → prependDecisionAlerts → morning briefing  [cron not in-repo]
CRON IN-REPO: daily-briefing-email (0 12 * * *), kit-nudge — that's it.
EMBEDDINGS: memory dedup = OpenAI text-embedding-3-small + in-JS cosine (ephemeral, no stored vector);
  real pgvector = briefing v2 only.
ENCRYPTION: AES-256-GCM via Web Crypto in memory-crud edge fn (NOT pgcrypto); live UI bypasses it.
```
