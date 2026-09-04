# CTRL Brain Architecture — the data structure that builds the brain

**Purpose (Krish, 2026-06-15):** the data & AI pipeline must do TWO things — surface the best outputs AND **structure the data so the brain compounds** (each capture/decision/signal makes tomorrow sharper, not just appends a row). This doc grounds the *AI Memory Systems* canonical reference against CTRL's ACTUAL Supabase schema (repo `mm-ctrl`, backend `bkyuxvschuwngtcdhsyg`) and specifies the concrete data-structure to get there.

**Source inputs:** `AI Memory Systems for Multi-Agent Architectures — The Canonical Reference (2025–2026).md` · `CTRL-MARKET-READ-SPEC.md` · `CTRL-DECISIONING-FRAMEWORK.md` · live repo schema map (migrations + edge functions, 2026-06-15).

**Architecture call (CONFIRMED, not poly-store):** implement the corpus *principles* inside the EXISTING Supabase stack (pgvector + new columns + a lineage edge table + an outcomes table + recursive-CTE graph traversal). NO Neo4j/Graphiti/Qdrant. The corpus itself endorses this: *"if you have Postgres, use pgvector"*, pgvector suffices < 500K items, and CTRL is a single-user-facing brain at far smaller scale. Graph/poly-store is an OS-fleet decision, separate from CTRL.

---

> ## IMPLEMENTATION STATUS (updated 2026-06-17), design mapped to shipped code
> The Brain Engine described in this spec is now LIVE in `mm-ctrl` (prod `ctrl.themindmaker.ai`, Supabase `bkyuxvschuwngtcdhsyg`). The build proceeded; Δ1-5 largely landed; honest residuals are tracked below. Cite real PRs, do not overstate.
>
> | Delta | Status | Shipped via |
> |---|---|---|
> | **Δ1** Importance at creation | **SHIPPED** | Brain Engine PRs #153-164; importance written at extraction |
> | **Δ2** Temporal validity windows | **SHIPPED** | PRs #153-164 + brain migrations `20260615*_brain_*`; evidence-tier / freshness work in the "limits" phases #187-189 |
> | **Δ3** Contradiction-at-write + resolution | **SHIPPED** | PRs #153-164 (write-time gate, close-on-supersede) |
> | **Δ4** Unified 3-signal retrieval score | **SHIPPED** | PRs #153-164; reliable reaction numbers + evidence tiers hardened in #187-189 |
> | **Δ5** Provenance / lineage DAG + outcomes (the keystone) | **SHIPPED (with residual)** | fact-to-fact edge graph via `20260616120000_memory_edges` + Strengthen/Fix RPCs + track-record depth in #187-189. **RESIDUAL:** brain-canvas **Strengthen/Fix actions are UI-disabled** (no backend RPC wired to the buttons yet); brain **edges are derived-not-stored** (computed at read time, not persisted). |
> | **Δ6** Multi-source clustering for the market read | **STATUS TBD, VERIFY** | Not confirmed shipped in the #187-189 limits phases; clustering primitive needs a code check against `decision_evidence` / `verify.ts` before claiming done. |
>
> **Honest residual gaps (always disclose):** brain canvas Strengthen/Fix are wired in the UI but the backing RPC is disabled; brain edges are derived (recomputed), not stored as first-class rows; number-heroes fall back to words-led when current data is thin. These are real and should not be hidden.
>
> Migrations to cite: `20260615*_brain_*`, `20260616120000_memory_edges`. The redesign that surfaces this brain (forced dark, ctrl. wordmark, four-world rope canvas) shipped in PR #186 (2026-06-16).

---

## 0. The one idea this is built around
> **Memory is not a retrieval problem; it is a behavioral-adaptation problem.** (corpus Part 15)

An agent — or a leader's brain — on day 100 is identical to day 1 unless retrieval is **outcome-weighted**: what proved right gets louder, what proved wrong gets quieter, contradictions resolve, stale facts decay. CTRL's promise ("it gets sharper / learns from you") IS this. The audit already found the loops were unwired; Phase 0 reconnected the plumbing (touch → reference_count → temperature). This doc specifies the **adaptation layer** that was still missing — the actual "brain-building."

---

## 1. What CTRL already has (grounded in the repo)
Strong foundation — more than expected:
- **`user_memory`** (rich): `reference_count`, `last_referenced_at`, `content_changed_at` (touch-immune synthesis gate), `temperature` (hot/warm/cold), `confidence_score`, `verification_status` (inferred→verified→corrected→rejected), `is_current`/`supersedes`/`superseded_by` (point-in-time versioning), `source_type`/`source_session_id` (provenance), `encrypted_content` (AES-256-GCM, Phase 0). pgvector embeddings + semantic dedup (0.85).
- **`user_patterns`** — learned meta-patterns with `evidence_count`, `confidence`, `status` (emerging/confirmed/deprecated), `source_facts[]`.
- **Decision engine** — `decision_cases` (`objective_fact_ids[]`, `breakpoint_assumption_id`, `confidence`, `last_verified_at`), `decision_claims` (`is_load_bearing`, `verdict`, `confidence`), `decision_evidence` (`retriever`, `relevance_score`, `stance`, `source_url`), `decision_tensions` (contradiction output), `decision_alerts` (assumption_broke/evidence_shifted), `decision_events` (immutable log), `decision_user_calls` (commit-first Agree/Disagree/Unsure).
- **Loops wired:** `touch_memory_facts()` RPC; `memory-lifecycle` temperature tiering; `memory-sweep` nightly (content_changed_at gated); `decision-watch` hourly re-verification → alerts; `briefing-scoring` (SOURCE_AUTHORITY tiers + cosine dedup + relevance score); `extract-user-context` write path (extract → validate → LLM contradiction check → guardrails → semantic dedup → encrypt → store).

**Verdict:** CTRL has the *substrate* (facts, decisions, versioning, provenance fields, an event log, commit-first calls) but the data does NOT yet **adapt from outcomes**, **age out**, or **trace causally**. The brain stores and retrieves; it doesn't yet get sharper.

---

## 2. The 6 deltas that make the data build the brain
Mapped to the corpus pattern → CTRL change → the product surface it powers.

### Δ1 — Importance at creation (the cheap permanent win)
- **Corpus:** an LLM-assigned poignancy/importance score written ONCE at creation costs one call and permanently improves retrieval; "underrated, almost free." Distinct from `confidence` (truth) — importance = how load-bearing/strategic.
- **CTRL today:** only `confidence_score` + a binary `is_high_stakes`. No importance dimension.
- **Δ:** add `user_memory.importance smallint` (1–10), set by the extraction LLM at write. Same for signals (the market-read already has `load_bearing_score` in spec — wire it through). 
- **Powers:** triage on the cockpit (what surfaces), the 3-signal score (Δ4).

### Δ2 — Temporal validity windows (freshness, honesty, ghost-fact kill)
- **Corpus:** the state of the art = `valid_from`/`valid_until` per fact ("what was true at time T"); Graphiti *closes* `valid_until` on superseded facts rather than deleting. Stale memory served with confidence is the #1 production risk.
- **CTRL today:** `is_current`/`superseded_by` give point-in-time versioning but NO validity interval → a "Q3 priority" or a 6-month-old market read is served as eternally true.
- **Δ:** add `valid_from timestamptz` (default created_at) + `valid_until timestamptz null` to `user_memory` and `decision_claims`/`decision_evidence`. On supersession, close the old fact's `valid_until` instead of only flipping `is_current`. Category-aware default horizons (an identity fact ≈ forever; a tactical priority ≈ weeks; a market read ≈ category decay from the market-read spec).
- **Powers:** **the "feels fresh/real/live" requirement** directly — reads carry an age and decay honestly; the cockpit can grey-out/expire; "what did I believe when I made this call" becomes answerable.

### Δ3 — Contradiction detection at write, with a resolution hierarchy (highest-leverage)
- **Corpus:** "the single highest-leverage improvement available, almost no team does it." Before storing, recall similar memories (cosine > 0.80); if an opposing-direction match exists, resolve via: recency-wins / confidence-wins / provenance-weighted / ask-user / preserve-both. Close `valid_until` on the loser, keep history.
- **CTRL today:** `extract-user-context` DOES an LLM contradiction pass + `decision_tensions` captures decision-level contradictions — good, but ad hoc, not a structured/enforced resolution, and not recorded as a first-class event.
- **Δ:** formalize the write-time check into a deterministic gate: cosine>0.80 + opposing direction → apply a resolution strategy keyed by `fact_category` (preferences→recency; high-stakes→ask-user; corrections→confidence) → close the loser's `valid_until` + write a `decision_event`-style memory event recording the resolution. (This is mostly *wiring discipline* over existing pieces, not new infra.)
- **Powers:** honest brain (no two-green-contradictions); the cardinal "never fake a settled answer" law; feeds the Calibration Mirror.

### Δ4 — One unified 3-signal retrieval score (replace the relevance-only ranking)
- **Corpus:** the production-standard generative-agents formula: **Score = α·relevance + β·recency + γ·importance**, recency = exponential decay `e^(−λ·age)`. (Beware the MemoryBank precedence bug — don't invert reinforcement.)
- **CTRL today:** `briefing-scoring` ranks on **relevance only**; recency lives separately as temperature tiering; importance doesn't exist. Three signals exist but aren't composed into one rank.
- **Δ:** a single scoring function (a SQL/edge helper) used everywhere memory + signals are ranked: `α·cosine + β·exp(−λ·age_hours) + γ·(importance/10)`. The market-read 6-dim rubric is the richer signal-side variant; reconcile both to ONE place (the corpus's "one source of truth" rule).
- **Powers:** every surface (cockpit hero, decision map, briefing) ranks by the same honest composite; recency-weighting means a fact touched 100× two years ago no longer outranks one touched last week.

### Δ5 — Provenance / lineage DAG + decision outcomes (THE keystone — Self-Correction)
- **Corpus:** MemQ propagates credit backward through a **provenance DAG** (which memories were retrieved when each decision was made), updating memory Q-values by outcome; W3C-PROV lineage = "why was X decided", 100% traceable. This is the *unsolved* frontier and the corpus's headline recommendation.
- **CTRL today:** `objective_fact_ids[]` is an unordered, unweighted array; `decision_evidence` doesn't link back to the memory fact; `decision_user_calls` are stored but NEVER fed back to memory scoring; there is no decision *outcome* record. The credit loop is open at both ends.
- **Δ — two new structures:**
  1. **`memory_links`** (the edge table / DAG): `{id, user_id, from_type, from_id, to_type, to_id, edge_type, weight, created_at}` where `edge_type ∈ {caused_by, supported_by, contradicts, derived_from}`. Replaces the bare `objective_fact_ids[]` with weighted, typed, traversable edges (decision → claim → evidence → memory). Traverse with recursive CTEs (corpus: depth 3–5 hops < 10ms on indexed graphs — trivially Postgres-native at CTRL scale).
  2. **`decision_outcomes`**: `{id, user_id, decision_case_id, resolution (proceed/hold/reopen), played_out (true/false/too_early/null), process_quality smallint, outcome_note, judged_at}` — judged on PROCESS not luck (the decision-vs-outcome scaffold). 
- **The loop:** when an outcome lands (or a `decision_alert` fires, or a user thumbs a Recently-Done call), propagate credit along `memory_links` (MemQ-style `(γλ)^depth` decay) to bump/cut the `importance`/`confidence` of the facts that fed it. **This is the moment day-100 ≠ day-1.**
- **Powers:** the **Self-Correction keystone** (was missing), the **Decision Track-Record** (additive A), the **Calibration Mirror** (additive D), "quote your own call back," and the auditable "why did CTRL say this."

### Δ6 — Multi-source clustering for the market read (the ONE big build, confirmed)
- **Corpus:** corroboration matters — Graph-RAG hits 94% vs 58% vector-only on comparative queries; a read should require ≥2 *independent* sources, ≥1 at a reputable tier; "3 sources agree" must score differently from "1 source."
- **CTRL today:** `decision_evidence` records `retriever` + `relevance_score` + `stance` per item, but there's **no clustering** — verdicts are effectively per-item, not "these N together imply X." This is exactly the gap the market-read spec named as the one big build.
- **Δ:** a clustering/corroboration primitive over `decision_evidence` (and the briefing candidates): group by claim + semantic similarity → count independent sources + max tier → emit ONE corroborated read + a confidence that's a function of corroboration (capped by the worst trust-haircut badge). Persist the cluster + its source set for click-out.
- **Powers:** the numerical-first surface (a single source-backed reaction NUMBER), honest confidence, the "synthesis not one headline" promise.

---

## 3. Phasing (build order — each ships value, none needs new infra)
- **P1 — Foundation (cheap, high-leverage, mostly columns + wiring):** Δ1 importance-at-creation · Δ2 temporal-validity columns + close-on-supersede · Δ3 formalize contradiction-at-write + resolution · Δ4 unify the 3-signal score. *Low risk, immediately makes the brain honest + fresh.*
- **P2 — The keystone (the differentiator):** Δ5 `memory_links` DAG + `decision_outcomes` + the outcome→credit-propagation loop. *This is "builds the brain." Wire the existing thumbs-up / decision_user_calls / decision_alerts as the outcome signals.*
- **P3 — The big build:** Δ6 multi-source clustering primitive. *The one genuinely new algorithm; powers the numerical-first read.*
- **Cross-cutting (fold in as we go):** recency-decayed reference scoring (not monotonic count) · dead-zone down-weight (zero-retrieval in N days) · `valid_until` honesty in every render.

This sequence also satisfies the standing pre-build test gates (`_BUILD-PROCESS-PLAYBOOK.md` §5): temporal validity + clustering = the **freshness/live** test; outcome loop = the **builds-the-brain** test; contradiction-at-write = **adversarial honesty**; the one-bet vertical slice exercises Δ5 end-to-end.

---

## 4. Decisions — RESOLVED (Krish, 2026-06-15: "happy with your leans")
1. **Importance source — LOCKED:** LLM poignancy (1–10) at extraction for MEMORY facts; reuse `load_bearing_score` for SIGNALS; reconciled into ONE 1–10 scale.
2. **Outcome capture — LOCKED:** HARVEST outcomes from signals we already get — a `decision_alert` firing = an implicit outcome; a thumbs-up on a Recently-Done call; an optional next-login "did it resolve?" prompt. Do NOT ask users to grade decisions (data-realism law).
3. **Credit loop strength — LOCKED:** an outcome AUTO-adjusts a fact's `importance`; `confidence` changes are GATED behind the same multi-source bar a promotion needs (no whiplash, per the decisioning framework).
4. **Forgetting — LOCKED:** category-keyed decay + dead-zone down-weight; archive at 30d zero-retrieval default, tuned per `fact_category` (identity ≈ never; tactical ≈ weeks).
5. **Live-data verification, RESOLVED (2026-06-17):** this was a cold-start-design-only check (MCP couldn't reach `bkyuxvschuwngtcdhsyg`, a different org). The build proceeded regardless: the Brain Engine shipped (PRs #153-164, limits phases #187-189) with honest-quiet defaults, so the row-count query was no longer a gate. Closed as moot; the engine is live and tolerant of a cold start by design.

---

## 5. What this is NOT
- Not a new database / not Graphiti / not a graph DB. Postgres + pgvector + a couple of tables + recursive CTEs.
- Not multi-agent memory sharing (CTRL is one leader's brain; the corpus's Part 6 venture-scoping is an OS-fleet concern, parked).
- Not a rewrite of the decision engine — it EXTENDS it (links, outcomes, clustering) on the existing tables.
