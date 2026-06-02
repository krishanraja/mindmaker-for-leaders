# CTRL Decision Engine: Build-Ready Spec

Grounded against the live `mm-ctrl` codebase (Supabase project `bkyuxvschuwngtcdhsyg`).
Scope locked at gate: full looped version (synchronous engine + WATCH loop + Briefing alerts + Fireflies ingestion), built by extending the existing Decision Advisor. No new top-level pillar.

Hard rules carried in: no em dashes anywhere, light-mode skin, mobile-first, RLS on every table, migrations via the Management API (not `db push`), every touched edge function deployed and smoke-tested, no prod-affecting change without written approval at the gate.

---

## 1. What we are building, in one paragraph

A leader speaks a decision or business case. CTRL grounds it in the Memory Web (their profile, objectives, blockers, prior decisions), decomposes it into typed claims and assumptions, verifies each against real external evidence with citations, cross-examines the judgment calls across multiple models, and returns calibrated advice plus the strongest counter-case and the one assumption whose failure breaks the decision. Then it keeps the decision alive: a background WATCH loop re-verifies on a cadence, and when a load-bearing assumption breaks, the next Daily Briefing leads with it, in the user's own briefing voice. Nothing else on the market can do the last step, because nothing else holds the user's context the way the Memory Web does.

---

## 2. What already exists (reuse, do not rebuild)

| Capability | Where it lives | How the engine uses it |
|---|---|---|
| Evidence retrieval (query plan, fan-out, 12s cap) | `generate-briefing` + `_shared/briefing-lens.ts` | Lift the query-planner + provider fan-out into `decision-verify` |
| Multi-provider search (Perplexity, Tavily, Brave) | `generate-briefing` fan-out | Same providers, extended with Exa/NewsAPI/PDL/BuiltWith/Tranco |
| Embeddings + dedupe + relevance scoring | `_shared/briefing-scoring.ts` | Score retrieved evidence against each claim |
| User grounding (role, objectives, blockers, recentDecisions) | `_shared/user-context.ts` | Single grounding call for decompose + cross-examine |
| Model fallback chain | `_shared/model-router.ts` | Extend with Anthropic + Grok verifier votes |
| AI + embedding cache (24h / 7d) | `_shared/ai-cache.ts` | Cache atomic claim checks and embeddings |
| Timeout + retry on all external calls | `_shared/with-timeout.ts` | Wrap every new retriever and model call |
| Structured JSON logging (CI-gated) | `_shared/logger.ts` | All new functions log through this |
| Per-user rate limiting | `_shared/rateLimit.ts` | Gate decision runs per tier |
| Health / YMYL guardrails | `_shared/fact-guardrails.ts`, `guardrails-core.ts` | Keep advice in commercial-judgment scope, never overclaim |
| Attribution emit | `_shared/attribution-emit.ts` | Emit `activated` when first case is verified |
| Briefing lens already ingests decisions/objectives | `deterministicLens()` in `briefing-lens.ts` | Inject "assumption broke" as a pinned top-weight lens item |
| Edge Pro gating | `useEdgeSubscription.ts`, `EdgePaywall.tsx` | Gate WATCH loop + cross-exam + Fireflies |
| Drift concept (precedent) | `compute-drift`, `leader_drift_flags` | Pattern reference for assumption-break detection |
| Decision Advisor UI entry | `DecisionAdvisor.tsx`, `DecisionCapture.tsx` | Extend, do not replace |

The synchronous pass mirrors the proven Briefing pattern exactly: early-insert a preliminary row, run stages, frontend polls every 2 to 3 seconds and renders each stage as it lands (claims first, verdicts streaming in, advice last). This gives the instant feel without inventing a new streaming transport.

---

## 3. Data model (CTRL project `bkyuxvschuwngtcdhsyg`, `public` schema, RLS owner-only)

All tables: `user_id uuid not null references auth.users`, RLS `using (auth.uid() = user_id)`, service-role writes for WATCH and evidence steps. `CREATE TABLE IF NOT EXISTS` for idempotency per CLAUDE.md.

```
decision_cases                          -- the living decision object
  id uuid pk, user_id, title, statement text,
  status text (active|decided|stale|archived) default 'active',
  decision_kind text (binary|directional|investment|hiring|gtm|other),
  source text (advisor|capture|voice|fireflies),
  stage text (decomposing|verifying|cross_examining|advising|complete|error),
  objective_fact_ids uuid[],            -- links to user_memory rows (fact_category='objective')
  user_decision_id uuid null,           -- optional link to Memory Web user_decisions
  recommendation text, counter_case text, breakpoint_assumption_id uuid null,
  confidence numeric(3,2),              -- overall calibrated confidence
  last_verified_at timestamptz, created_at, updated_at

decision_claims                          -- typed atomic units
  id uuid pk, decision_case_id fk, user_id,
  text text,
  type text (factual|market|causal|assumption|forecast),
  is_load_bearing boolean default false,
  verdict text (supported|contested|unverified|unverifiable|pending) default 'pending',
  confidence numeric(3,2),
  rationale text, created_at, updated_at

decision_evidence                        -- citations per claim
  id uuid pk, claim_id fk, user_id,
  source_url text, source_type text, source_title text, excerpt text,
  stance text (supports|refutes|neutral),
  retriever text (perplexity|exa|brave|tavily|newsapi|pdl|builtwith|tranco|memory),
  relevance_score numeric, retrieved_at timestamptz

decision_tensions                        -- contradictions surfaced
  id uuid pk, decision_case_id fk, user_id,
  kind text (vs_profile|vs_evidence|internal|model_disagreement),
  description text, severity text (low|medium|high),
  related_claim_ids uuid[], created_at

decision_alerts                          -- WATCH output, drives Briefing injection
  id uuid pk, decision_case_id fk, user_id, claim_id fk,
  kind text (assumption_broke|evidence_shifted|new_contradiction),
  headline text, detail text,
  status text (open|acknowledged|resolved) default 'open',
  surfaced_in_briefing_id uuid null, created_at, acknowledged_at

decision_events                          -- audit + attribution source
  id uuid pk, decision_case_id fk, user_id,
  type text (created|verified|advice_updated|assumption_broke|acknowledged),
  payload jsonb, occurred_at
```

`operator_advisor_sessions` and `leader_decision_captures` stay for backward compatibility. The new entry path writes a `decision_cases` row; legacy Q/A is preserved but not extended.

---

## 4. Edge functions (Deno, `supabase/functions/`)

All deploy via `supabase functions deploy <name>`; all wrapped in `with-timeout`, logged via `logger`, rate-limited via `rateLimit`. JSON outputs validated with Zod and `llm-quality-guardrails`.

### 4.1 `decision-engine` (orchestrator, synchronous, polled)
Mirrors `generate-briefing`. Auth, parse, early-insert `decision_cases` (stage='decomposing'), then drive the stages, updating `stage` so the frontend can render progressively. Returns case id immediately; client polls.

### 4.2 `decision-decompose`
- Model: Anthropic Claude (primary), Gemini fallback via `model-router`.
- Input: statement + `user-context.ts` grounding (role, objectives, blockers, recentDecisions).
- Output: array of typed claims (`factual|market|causal|assumption|forecast`), each flagged `is_load_bearing`. Writes `decision_claims`.
- This typing step is the single biggest reliability lever. Models are reliable at extraction and classification even where they are unreliable at adjudication.

### 4.3 `decision-verify` (the reliability core)
- Reuses the Briefing query planner + fan-out. Routes each claim by type to the right retrievers:
  - factual / market: Perplexity (grounded + citations), Exa (neural primary sources), Brave (breadth fallback), NewsAPI (recency on WATCH re-runs)
  - market firmographics: People Data Labs (headcount, funding, growth)
  - tech-stack claims: BuiltWith (concrete, falsifiable)
  - "X is a major player" popularity: Tranco
  - assumption / forecast: NOT web-verified; surfaced as "unverifiable by nature, validate manually"
- Embeds + scores evidence against the claim (`briefing-scoring.ts`). Writes `decision_evidence`.
- Sets verdict: `supported | contested | unverified | unverifiable`, with a calibrated confidence. **If no evidence retrieved, verdict is `unverified`, never `false`.** Abstention is a first-class output.
- Cheap atomic checks run on a low-cost model (DeepSeek or Gemini Flash) with `ai-cache`; frontier models reserved for synthesis and adversarial steps.

### 4.4 `decision-cross-examine`
- For causal claims and the final judgment: independent votes from Claude, Gemini, GPT-4o, and Grok (real-time/contrarian).
- Agreement raises confidence; disagreement is written as a `decision_tensions` row of kind `model_disagreement` rather than averaged away.
- Dedicated adversarial sub-prompt (Claude): refute the case using only the verified evidence, name the single assumption whose failure sinks it. Output sets `decision_cases.breakpoint_assumption_id`.

### 4.5 `decision-advise`
- Synthesis: calibrated recommendation, reasoning, the strongest counter-case, the breakpoint assumption, and "what to validate next." Streams via the early-insert + poll pattern (advice lands last).
- Runs `fact-guardrails` to keep scope to commercial judgment, never medical/legal/financial advice.
- Writes recommendation/counter_case/confidence to `decision_cases`, sets stage='complete', writes a `decision_events` row type='created', and (first case ever) emits `activated` via `attribution-emit`.

### 4.6 `decision-watch` (the loop, Edge Pro)
- Invoked by pg_cron (daily) and/or an n8n schedule. For each `active` case: re-run `decision-verify` on load-bearing claims only (cost control). On a verdict flip (supported to contested) or a confidence drop past a threshold, write a `decision_alerts` row (kind='assumption_broke') and a `decision_events` row.
- Idempotent: one open alert per (claim, kind) until acknowledged.

### 4.7 Briefing injection (extend, do not add a parallel pipeline)
- Extend `_shared/user-context.ts` to load open `decision_alerts`.
- Extend `deterministicLens()` in `briefing-lens.ts` to inject any unacknowledged alert as a pinned, top-weight lens item with framework tag `ASSUMPTION BREAK`.
- The existing script generator then phrases it in the user's briefing voice. On render, mark `decision_alerts.surfaced_in_briefing_id`. Acknowledgement (user taps "re-run the case") flips status and clears the pin.
- This is the magic moment, and it rides the pipeline that already leads with decisions.

### 4.8 `fireflies-sync` (input enrichment, Edge Pro, Phase C)
- Pull meeting transcripts (Fireflies API). Route through `extract-user-context` to add facts to the Memory Web, and flag decision-relevant passages as candidate case inputs ("in Tuesday's board call you committed to X, which contradicts this decision").

---

## 5. Model and data-source assignments (mapped to the API arsenal)

| Role | Primary | Backup / second vote | Notes |
|---|---|---|---|
| Decompose + type claims | Anthropic Claude | Gemini 2.0 Flash | Structured reasoning quality |
| Atomic factual checks (bulk) | Gemini Flash or DeepSeek | gpt-4o-mini | Cost control, cached |
| Grounded evidence + citations | Perplexity | Exa | Citations mandatory |
| Primary-source neural search | Exa | Brave | Research-grade sources |
| Recency (WATCH re-runs) | NewsAPI | Perplexity | "Has anything changed" |
| Firmographic verification | People Data Labs | Apollo | Market-size / company claims |
| Tech-stack verification | BuiltWith | n/a | Falsifiable, high trust |
| Popularity verification | Tranco | n/a | "top/major" claims |
| Cross-examination votes | Claude + Gemini + GPT-4o + Grok | n/a | Disagreement = tension |
| Adversarial red-team | Claude | n/a | Refute-only prompt |
| Synthesis / advise | gpt-4o | Claude | Streams last |
| Embeddings | OpenAI text-embedding-3-small | n/a | Reuse briefing-scoring |
| Page render / scrape (edge cases) | Browserless | Apify | Only when a cited source won't fetch |
| Meeting ingestion | Fireflies | n/a | Phase C input |

New Supabase secrets to set (via `supabase secrets set`): `ANTHROPIC_API_KEY`, `EXA_API_KEY`, `NEWSAPI_KEY`, `PDL_API_KEY`, `BUILTWITH_API_KEY`, `TRANCO_API_KEY`, `XAI_API_KEY` (Grok), `FIREFLIES_API_KEY`, plus `BROWSERLESS_API_KEY` if used. `PERPLEXITY`, `BRAVE`, `TAVILY`, `OPENAI`, Vertex are already configured for Briefing.

---

## 6. Reliability and trust mechanics (non-negotiable)

1. Decompose before verify. Never adjudicate the whole statement.
2. Ground every check in retrieved evidence, never model memory. No evidence means `unverified`, not `false`.
3. Calibrated abstention is a feature. Verdicts are 4-state plus confidence band, never bare true/false.
4. Multi-model cross-exam; disagreement is surfaced as a tension, not averaged.
5. Always an adversarial pass; always name the breakpoint assumption.
6. Full audit trail: every verdict links to dated evidence rows. A leader defending a board decision can show the work.
7. YMYL boundary: commercial judgment only, enforced by `fact-guardrails`.

**Eval gate before launch:** build a labeled set of ~150 known-answer claims across the five types. Measure verdict accuracy and confidence calibration (target expected calibration error under 0.1; when the engine says 80 percent it is right about 80 percent of the time). An overconfident decision tool is worse than none. Store in an internal `decision_eval_cases` table; run via a script in `scripts/`. This is the riskiest part and is treated as a hard gate, not a nice-to-have.

---

## 7. Surface (extend Decision Advisor)

- `DecisionAdvisor.tsx`: add a "Pressure test" mode. Same voice/text entry, new staged result view (claims with verdict chips and clickable citations, tensions, recommendation, counter-case, breakpoint assumption, "validate next" list). Reuse the Briefing card poll pattern.
- New light component set under `src/components/operator/decision/` for the staged result, verdict chips, and evidence drawer. Light-mode skin, mobile-first, all four states (loading via staged poll, empty, error with no dead ends, success).
- A "watching" affordance on completed cases (Edge Pro): shows last verified time and any open alerts; links from the Briefing alert.
- `useDecisionEngine.ts` hook: kicks off `decision-engine`, polls the case, exposes stages.
- Edge Pro gating: free tier gets the synchronous one-shot on a limited number of cases; WATCH loop, multi-model cross-exam, and Fireflies are Edge Pro. Justifies the $29/month for the exec ICP.

---

## 8. Phasing (each independently shippable, each behind a feature flag)

- **Phase A (synchronous core):** tables, `decision-engine` + `decision-decompose` + `decision-verify` (Perplexity + Exa + Brave) + single-model `decision-advise`, staged UI, eval harness + calibration gate. Ships the pressure test behind a flag, Edge Pro gated.
- **Phase B (judgment depth + breadth):** `decision-cross-examine` (4-model), adversarial red-team, remaining retrievers (NewsAPI, PDL, BuiltWith, Tranco), tensions UI. Living `decision_cases` persistence and history.
- **Phase C (the loop + magic):** `decision-watch` (pg_cron + n8n), Briefing injection via `user-context` + `deterministicLens` extension, `fireflies-sync`. This is where it becomes the best version of itself.

---

## 9. Deploy and verify discipline (per CLAUDE.md)

- Migrations applied via the Management API against `bkyuxvschuwngtcdhsyg`, idempotent, RLS verified, no `db push`. Tested on the live project only after gate approval (no separate branch DB documented; treat any apply as production-affecting and gate it).
- Every edge function deployed via `supabase functions deploy` and smoke-tested for its contract before being called "done." A function that builds but 500s is not done.
- Each PR: green typecheck, build, and lint-diff. Branch `upgrade/ctrl/decision-engine-phase-<a|b|c>`. Never push main.
- Live mobile verification at 390px before ship: full pressure-test journey, then a WATCH alert surfacing in a real Briefing.

---

## 10. Open decisions for the gate

1. Migration safety: there is no documented non-prod CTRL database. Applying these tables touches production Postgres. Approve a one-time apply of the additive, RLS-on, `IF NOT EXISTS` schema, or stand up a shadow project first?
2. WATCH orchestration: pg_cron (in-Supabase, already used for briefing aggregation) versus n8n (fleet-native, observable in the OS). Recommend pg_cron for Phase C core, n8n only if you want fleet visibility.
3. Cost ceiling per decision run: multi-model cross-exam plus 5-plus retrievers per claim is the expensive path. Set a per-run token/spend cap and a claims-per-case cap.
4. Fireflies scope: ingest all meetings, or only ones the user tags? Privacy and noise both argue for tagged-only at first.
5. Edge Pro line: confirm the free/paid split above (free = limited one-shot; paid = loop + cross-exam + Fireflies).
