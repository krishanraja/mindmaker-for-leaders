# CTRL Brain — Build Plan

**From:** `CTRL-BRAIN-ARCHITECTURE.md` (6 deltas, all decisions LOCKED 2026-06-15). **Target:** `mm-ctrl` repo + Supabase `bkyuxvschuwngtcdhsyg`. **Stack:** Postgres + pgvector + edge functions (Deno). No new infra.

**Apply discipline (from the project runbook):** SQL via **Management API / `apply_migration`** (NOT `db push`); edge fns via `supabase functions deploy`; migrations land in `supabase/migrations/` with the repo's timestamp convention. Each phase = its own PR, behind a flag where it touches a live surface. Verify on a throwaway dev branch before prod (seed ≥5 facts + 1 decision, run the loop, prove the assertion) per the Phase 0 pattern.

---

> ## BUILD STATUS (updated 2026-06-17), shipped
> P1 and P2 of this plan are **SHIPPED LIVE** in `mm-ctrl` (prod `ctrl.themindmaker.ai`). The Brain Engine landed in PRs #153-164; the "limits" hardening phases (fact-to-fact edge graph, Strengthen/Fix RPCs, reliable reaction numbers, evidence tiers, track-record depth) landed in PRs #187-189; brain migrations are `20260615*_brain_*` and `20260616120000_memory_edges`. The dark redesign that surfaces this brain (forced dark, ctrl. wordmark, four-world rope canvas) shipped in PR #186.
> - **P1 (Δ1-Δ4), SHIPPED** via `20260615*_brain_*` + PRs #153-164 (importance, temporal validity, contradiction-at-write, unified 3-signal score); evidence tiers / reliable numbers hardened in #187-189.
> - **P2 (Δ5), SHIPPED, with one residual** via `20260616120000_memory_edges` + #187-189 (fact-to-fact edge graph, Strengthen/Fix RPCs, track-record depth). **RESIDUAL:** the brain-canvas **Strengthen/Fix actions are UI-disabled** (the buttons render but no backend RPC is wired to them yet); brain **edges are derived-not-stored** (computed at read time).
> - **P3 (Δ6 clustering), STATUS TBD, VERIFY:** not confirmed in the #187-189 limits phases; check `decision_evidence` / `verify.ts` for a real clustering primitive before marking done.
> - **§0 live-data realism, RESOLVED/OBSOLETE** (see below); the build proceeded with honest-quiet defaults, so it was never a gate.

---

## §0. ~~FIRST, live-data realism~~ RESOLVED / OBSOLETE (2026-06-17)
> **No longer a prerequisite.** This was a cold-start-design-only check; the Brain Engine shipped (PRs #153-164, #187-189) with honest-quiet defaults, so it never gated the build. Query retained below for reference only.

Tells us if the brain is cold-start-empty in prod (drives cold-start handling). Run against `bkyuxvschuwngtcdhsyg`:
```sql
select
  (select count(*) from user_memory where is_current)                as current_facts,
  (select count(*) from user_memory where reference_count > 0)       as touched_facts,
  (select count(*) from user_memory where verification_status='verified') as verified_facts,
  (select count(distinct user_id) from user_memory)                  as users_with_memory,
  (select count(*) from user_patterns)                              as patterns,
  (select count(*) from decision_cases)                             as decision_cases,
  (select count(*) from decision_claims where is_load_bearing)      as load_bearing_claims,
  (select count(*) from decision_user_calls)                        as user_calls,
  (select count(*) from decision_alerts)                            as alerts,
  (select round(avg(reference_count),1) from user_memory where reference_count>0) as avg_refcount;
```
*(In-session tip: Krish can prefix a shell/psql call with `!` to drop the output straight into chat.)* If counts are near-zero, P1/P2 must ship "honest-quiet" defaults; if populated, we backfill `importance`/`valid_from` for existing rows.

---

## §1. PHASE P1 — Foundation (honest + fresh). Low risk: columns + wiring.  ·  [x] SHIPPED (`20260615*_brain_*` + PRs #153-164)

### P1.1 Importance at creation (Δ1)  ·  [x] shipped
- **Migration:** `alter table user_memory add column importance smallint check (importance between 1 and 10);` (nullable; backfill existing → derive from `is_high_stakes`/`confidence` in a one-off pass).
- **Edge:** `extract-user-context` — the extraction LLM already returns structured facts; add an `importance` field to the schema + prompt ("rate 1–10 how load-bearing this is to who they are / their big calls"). Write it on insert. For SIGNALS, map the decision framework's `load_bearing_score`→ same 1–10 scale (one helper `toImportance()`).
- **Verify:** new facts have non-null importance; distribution isn't all-5s (prompt is discriminating).

### P1.2 Temporal validity (Δ2)  ·  [x] shipped
- **Migration:** `alter table user_memory add column valid_from timestamptz default now(), add column valid_until timestamptz;` same on `decision_claims`, `decision_evidence`. Index `(user_id, valid_until)`.
- **Logic:** on supersession (existing `superseded_by` path in `extract-user-context` dedup + memory-crud), set the loser's `valid_until = now()` (Graphiti close-don't-delete) in ADDITION to `is_current=false`. Category-keyed default horizons in a small `MEMORY_HORIZONS` map (identity→null/forever; objective/blocker→90d; preference→180d; tactical/priority→~21d; market-read→category decay from `CTRL-MARKET-READ-SPEC`).
- **Edge:** retrieval everywhere filters `where (valid_until is null or valid_until > now())` for "currently true"; keep the closed rows for "what was true at T" + history.
- **Verify:** supersede a fact → old row keeps a closed `valid_until`; an expired tactical fact drops from the live read but is still queryable historically.

### P1.3 Contradiction-at-write + resolution (Δ3)  ·  [x] shipped
- **Edge:** `extract-user-context` already does an LLM contradiction pass — harden into a deterministic gate: before insert, ANN-recall same-category facts (cosine > 0.80); if an opposing-direction match exists, apply a resolution keyed by `fact_category`:
  - preference/objective → **recency wins** (close old `valid_until`)
  - is_high_stakes → **ask user** (queue to pending-verifications, don't auto-resolve)
  - explicit correction → **confidence wins**
  - else → **preserve both + flag** (write a memory event).
- **Migration (optional):** reuse `decision_tensions` shape or add a lightweight `memory_events` (or fold into the existing event pattern) recording `{fact_id, kind:'contradiction_resolved', strategy, loser_id, payload}`.
- **Verify:** insert a fact that opposes an existing one → exactly one stays live, the resolution is recorded, no two contradictory `verified` facts coexist.

### P1.4 Unified 3-signal score (Δ4)  ·  [x] shipped (reaction numbers + evidence tiers hardened in #187-189)
- **Shared helper** (`_shared/memory-score.ts`): `score = α·cosine + β·exp(−λ·age_hours) + γ·(importance/10)` with α≈0.6, β≈0.2, γ≈0.2, λ tuned so ~30d half-life. **Guard the MemoryBank precedence bug** (reinforcement must not invert — more references/recency → HIGHER score). Age uses `last_referenced_at`.
- **Refactor:** `briefing-scoring.ts` (today relevance-only) + decision-engine memory retrieval to call the shared scorer. Reconcile the market-read 6-dim rubric to consume the same importance/recency inputs (one source of truth).
- **Verify:** a fact touched last week outranks one touched 100× two years ago at equal relevance; ranking is stable + explainable.

**P1 exit:** brain is honest (no contradictions, no ghost-facts) and fresh (validity windows). Satisfies the **adversarial-honesty** + part of the **freshness** test gates.

---

## §2. PHASE P2 — The keystone: outcome-weighted adaptation (Δ5). The differentiator.  ·  [x] SHIPPED, with one residual (`20260616120000_memory_edges` + PRs #187-189)

> **Residual (honest):** the brain-canvas **Strengthen/Fix actions are UI-disabled** (the buttons render but no backend RPC is wired to them yet); brain **edges are derived-not-stored** (recomputed at read time, not persisted as first-class rows). Wiring those actions to a live RPC is the open follow-up.

### P2.1 The lineage DAG  ·  [x] shipped (fact-to-fact edge graph; edges derived-not-stored)
- **Migration `memory_links`:** `{id uuid pk, user_id uuid, from_type text, from_id uuid, to_type text, to_id uuid, edge_type text check (edge_type in ('caused_by','supported_by','contradicts','derived_from')), weight numeric default 1.0, created_at timestamptz default now()}`; indexes on `(user_id, from_type, from_id)` and `(user_id, to_type, to_id)`.
- **Backfill + wire:** populate edges from the existing `decision_cases.objective_fact_ids[]` and `decision_evidence`→claim links; going forward, the decision-engine writes typed weighted edges as it decomposes/verifies (decision→claim `supported_by`, claim→evidence `supported_by`, evidence→memory `derived_from`, tension→facts `contradicts`). Keep `objective_fact_ids[]` as a denormalized cache; `memory_links` is the source of truth.
- **Traversal:** recursive CTE helper `lineage_of(decision_id, max_depth=5)` → "why was X decided" in <10ms.

### P2.2 Decision outcomes  ·  [x] shipped (track-record depth in #187-189)
- **Migration `decision_outcomes`:** `{id, user_id, decision_case_id, resolution text check in ('proceed','hold','reopen'), played_out text check in ('true','false','too_early') null, process_quality smallint check 1..5, outcome_note text, source text, judged_at timestamptz default now()}`.
- **Harvest (per locked decision #2 — no grading chore):** outcomes are written by signals we ALREADY get —
  - a `decision_alert` of kind `assumption_broke` firing on a decision the user had marked Proceed → an implicit `played_out='false'` candidate;
  - a thumbs-up on a Recently-Done call (existing feedback UI) → `process_quality` signal;
  - an optional, dismissable next-login "did this resolve?" on a decision past its watch horizon.

### P2.3 The credit-propagation loop (the brain getting sharper)  ·  [x] shipped (Strengthen/Fix RPCs in #187-189; see residual: canvas action buttons UI-disabled)
- **New scheduled fn `brain-adapt`** (nightly, after `memory-sweep`): for each new `decision_outcome`, walk `memory_links` backward (MemQ-style credit decay `(γλ)^depth`) and **AUTO-adjust `importance`** of the contributing facts (locked #3: importance auto, confidence gated). A fact that fed decisions that played out well → importance ↑; fed broken assumptions → importance ↓ (toward dead-zone). Confidence changes only proposed, applied only if they clear the multi-source promotion bar (no whiplash).
- **Calibration signal:** accumulate the commit-first `decision_user_calls` vs the evidence verdict + outcome → the gut-vs-ground delta over time = the **Calibration Mirror** data (additive D); surfaces inside the **Track-Record** (additive A).
- **Verify (the vertical-slice gate):** seed one real bet → user commits a stance → evidence verdict → bank → an alert/outcome lands → `brain-adapt` runs → the fact that fed it visibly changes importance, AND the track-record reflects the call. **Prove day-100 ≠ day-1 on one bet.**

**P2 exit:** the Self-Correction keystone is live; the brain adapts from outcomes. Satisfies the **builds-the-brain** + **end-to-end vertical-slice** gates.

---

## §3. PHASE P3 — Multi-source clustering (Δ6). The one new algorithm.  ·  [ ] STATUS TBD, VERIFY (not confirmed in #187-189; check `decision_evidence` / `verify.ts` for a real clustering primitive before marking done)
- **New `_shared/cluster.ts`:** over a claim's `decision_evidence` (and briefing candidates), group by semantic similarity → compute **independent-source count** + **max source tier** (reuse `SOURCE_AUTHORITY` + the market-read 5-tier band) → emit ONE corroborated read + a confidence that's a function of corroboration, **capped by the worst trust-haircut badge** (ten vendor blogs can't make "Holds"). Require ≥2 independent sources, ≥1 at tier ≤ 2 for a confident read.
- **Migration `evidence_clusters`** (or a JSON column on the claim): persist `{claim_id, read_text, reaction_number, confidence, source_ids[], independent_count, max_tier}` for click-out + the numerical-first surface.
- **Edge:** decision-engine `verify.ts` + the briefing path call the clusterer instead of per-item verdicts.
- **Verify:** 3 corroborating sources → confident narrow read; 1 thin source → wide-band "Thin"; conflicting sources → contested, surfaced not hidden. Powers the **numerical-first** single source-backed number + the **freshness/live** feel end-to-end.

**P3 exit:** the market read is a real synthesis. Closes the **freshness/real/live** gate.

---

## §4. Cross-cutting (fold in across phases)
- **Recency-decayed reference score:** stop treating `reference_count` as monotonic-only; the P1.4 scorer already decays by `last_referenced_at` — ensure `memory-lifecycle`/temperature use the decayed score, not the raw count.
- **Dead-zone:** facts with zero retrieval in 30d (category-tuned) get importance down-weighted before the 90d archive (extends `memory-lifecycle`).
- **No-fake honesty in render:** every surface shows the read's age (`valid_from`) + decays/greys honestly past `valid_until` (ties to the numerical-first + "feels live" design law).
- **Keep documenting** in `_BUILD-PROCESS-PLAYBOOK.md`.

---

## §5. Sequencing summary
P1 (columns+wiring, low risk, honest+fresh) → P2 (the keystone, the vertical-slice gate) → P3 (the clustering algorithm). **As of 2026-06-17: P1 and P2 are SHIPPED** (P1 via `20260615*_brain_*` + PRs #153-164; P2 via `20260616120000_memory_edges` + #187-189), with the residual that the brain-canvas Strengthen/Fix actions are UI-disabled and edges are derived-not-stored. **P3 (Δ6 clustering) is STATUS TBD, verify against the code before claiming done.** P2 delivered "builds the brain"; the dark redesign that surfaces it shipped in PR #186. The §0 live-data check turned out to gate nothing (build proceeded with honest-quiet defaults).
