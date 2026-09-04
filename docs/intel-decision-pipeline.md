# Intel — The Decision / Verification Engine (the crown jewel)

Track: THE INTELLIGENCE BEHIND THE SCENES. Traced end-to-end from the REAL repo (`C:/Users/krish/mm-ctrl`), reading the actual edge functions, hooks, migration, and the founder's own build spec. This is the engine the synthesis calls "the crown jewel": CTRL's `Decide` surface (`/decision`). It is the clearest in-app expression of the deck's "thought partner that sharpens judgment, not an oracle" — and the one place where verification, not vibes, is the product.

What makes it differentiated is NOT that it asks an LLM. It is the **methodology**: a decision is shredded into typed, falsifiable claims; each claim is grounded in *real retrieved evidence with citations* (never model memory); the LLM is only allowed to *adjudicate against text it was shown*; assumptions/forecasts are honestly marked unverifiable rather than faked; multiple independent models cross-examine and their *disagreement is preserved as a tension, not averaged away*; an adversarial red-team names the single breakpoint; and the whole thing is grounded in the leader's own Memory Web so it can flag where the decision contradicts their own stated objectives. That stack is the "feeling of magic kept honest."

---

## 1. THE PIPELINE, STAGE BY STAGE (real code)

Orchestrator: `supabase/functions/decision-engine/index.ts` (the 9-file module is the densest, most carefully-built function in the repo). Entry: `POST { statement, source }` → returns a `case_id` in a **202** immediately, then runs the pipeline in the background via `EdgeRuntime.waitUntil`, advancing `decision_cases.stage` so the frontend can poll and render each stage as it lands (the exact same streaming-by-polling pattern as the Briefing). Hook `useDecisionEngine` polls `decision_cases` + `decision_claims` + `decision_tensions` every **2 seconds** until `stage ∈ {complete, error}`, then loads `decision_evidence`.

The synchronous pass is `pipeline.ts → runPipeline()`, four stages:

**Stage 1 — DECOMPOSE** (`decompose.ts`, Claude Sonnet `claude-sonnet-4-6` primary, GPT-4o fallback via `reason()`):
- Grounds in the Memory Web first: `getUserContext(admin, userId)` from `_shared/user-context.ts` loads role/company/industry, **objectives**, **blockers**, **recent decisions** (`user_decisions`), **confirmed behavioural patterns** (`user_patterns`, confidence ≥ 0.6), watchlist, edge-profile strengths/weaknesses.
- Breaks the statement into **3–8 typed claims**, each typed as one of `factual | market | causal | assumption | forecast`, and each flagged `is_load_bearing` (= "if this is false, the whole decision fails"). The system prompt is explicit that this is *the biggest reliability lever*: "models classify reliably even where they adjudicate unreliably."
- Also emits **`profile_tensions`**: where the decision *contradicts the leader's own stated objectives/blockers/recent decisions* → written to `decision_tensions` (kind `vs_profile`). This is the Memory-Web moat made concrete; a generic LLM has no access to "this contradicts the upmarket bet you told me about last week."
- Also classifies `decision_kind` (binary/directional/investment/hiring/gtm/other) and a 3–6 word `title`.
- Defensive normalisation clamps invalid types→`factual`, caps 8 claims / 5 tensions, slices text lengths.

**Stage 2 — VERIFY each claim** (`verify.ts` + `retrievers.ts`; this is "the reliability core"). Claims verified with **bounded concurrency `mapLimit(claims, 4, …)`** (4 in flight):
- **Assumption / forecast claims are NOT web-verified.** They short-circuit to verdict `unverifiable` with a "validate this directly before relying on it" rationale. The code comment is blunt: *"Faking a verdict on an assumption is exactly the failure mode that destroys trust."*
- For `factual | market | causal`: `gatherEvidence(text, type)` fans out across retrievers (see §2). Evidence is written to `decision_evidence` with `retriever`, `source_url`, `source_title`, `excerpt`, `stance`, `relevance_score`.
- The **adjudicator** (`adjudicateCall` → `gpt-4o-mini`, JSON mode, cheap by design) reads ONLY the numbered retrieved snippets — system prompt: *"You must not use prior knowledge beyond the evidence provided."* — and returns a **4-state verdict** `supported | contested | unverified` + a calibrated confidence + per-evidence stance (`supports|refutes|neutral` applied back onto the evidence rows).
- **Abstention is first-class.** No evidence retrieved → `unverified` (confidence 0.2), NEVER "false." Adjudicator picks `unverified` → confidence hard-clamped ≤ 0.35. Adjudicator throws → keep the evidence, return `unverified` (never guess). This is the "data-realist, never faked" discipline in code.

**Stage 3 — CROSS-EXAMINE** (`crossexamine.ts`, **Edge Pro only**, two independent checks):
1. **Multi-model panel.** A panel of FOUR distinct models — `PANEL = ["claude", "gpt-4o", "gemini", "grok"]` — each independently judges the *verified claim breakdown* (not the raw statement), returning `lean ∈ {support|oppose|uncertain}` + `key_risk`. Run via `Promise.allSettled` so any model failing just drops from the panel. **If the panel splits** (`support` AND `oppose` both present) → a `decision_tensions` row of kind `model_disagreement` is written and the note instructs the synthesizer to lower confidence. The disagreement is *surfaced, not averaged away* — this is the explicit anti-"ask one LLM" design.
2. **Adversarial red-team** (Claude via `reason()`): a "sharp, skeptical board member" prompt whose *only* job is to argue AGAINST the decision using only the verified claims, and to name the single `breakpoint_claim_index` whose failure most breaks it.

**Stage 4 — ADVISE** (`advise.ts`, the synthesis; Claude primary, GPT-4o fallback):
- Inputs: the statement, leader context, the full verified claim breakdown (each `[i] (type) [LOAD-BEARING] text → verdict (confidence). rationale`), the profile tensions, and the adversarial block (red-team refutation + panel risks + the disagreement flag).
- Outputs exactly: `recommendation` (calibrated, 2–4 sentences), `counter_case` ("the strongest honest argument against," explicitly *not a token one*), `breakpoint_claim_index`, overall `confidence`, and `validate_next[]` ("concrete things to validate before committing").
- Hard rules in the system prompt: confidence MUST track the evidence ("if load-bearing claims are unverified or contested, your confidence must be low and you must say why"); commercial/strategic judgment ONLY, never medical/legal/financial-investment advice (the YMYL guardrail); "write the way a sharp operator talks"; no em dashes.
- The breakpoint claim id is resolved (`adviseResult.breakpoint_claim_index`, falling back to the cross-exam's index) → `decision_cases.breakpoint_assumption_id`. A `decision_events` row type `created` is written (claim count, confidence, validate_next, duration_ms) — this is also the attribution warehouse source.

**The user-facing reveal sequence** (`PressureTestPanel.tsx` + `CriticalCallStep.tsx`): once complete, BEFORE the recommendation is shown, the UI **forces the user to make their OWN call** on the breakpoint (or first load-bearing) claim: "It holds / It does not / Not sure" + optional reasoning, logged to `decision_user_calls` via `useDecisionCall.recordCall`. CTRL's verdict is *deliberately hidden* at this step "so the judgment is genuinely theirs." This is the deck's "sharpen judgment, don't outsource it" made into a real interaction (the critical-evaluation rep). Fail-open: a save error never traps the user.

---

## 2. THE DATA PIPELINE / RETRIEVER ARSENAL (the part nothing else replicates)

`retrievers.ts → gatherEvidence(query, type)` — the multi-source verification fan-out. Every retriever runs independently via `Promise.allSettled` (one failing provider never sinks the gather), all wrapped in `_shared/with-timeout.ts` (per-provider timeouts 10–15s). Output deduped by URL, capped at 16 evidence rows.

**Always-on breadth providers (every checkable claim):**
- **Perplexity** (`sonar` model) — grounded fact-checking synthesis + citations; the system prompt forces it to "state plainly if evidence is thin or absent." The synthesis paragraph + up to 4 cited URLs become evidence rows. (This is the richest single source; dedupe keeps it first.)
- **Exa** (`/search`, `type:auto`, text contents) — neural primary-source search; the only retriever that returns a native `relevance_score`.
- **Brave Search** — breadth/recency web fallback.

**Type- and entity-routed retrievers (the differentiation):**
- `factual | market` → **NewsAPI** (recency).
- a bare domain detected in the claim (`extractDomain`) → **BuiltWith** (concrete, falsifiable tech-stack: "detected technologies on X") + **Tranco** (popularity rank — verifies "X is a major/top player" against a real ranked list, no key needed).
- `market` + a named company (`extractCompany`) → **People Data Labs** (firmographics: headcount, industry, size band, founded year).

So a claim like "competitor Acme.io is a top-100 SaaS running on Snowflake with ~500 employees" gets checked against Tranco's rank list, BuiltWith's actual detected stack, AND PDL's headcount simultaneously — each a falsifiable, dated, cited row. **That is the moat vs a generic LLM answer: typed claims routed to the right *falsifiable* data source, every verdict backed by a dated `decision_evidence` row a leader can show a board** ("the audit trail" — spec §6.6).

The retriever ENUM in the schema also lists `tavily` and `memory`, and the spec promised embedding-rerank scoring (`briefing-scoring.ts`) — see §5 (not all wired).

---

## 3. THE WATCH / RE-VERIFY LOOP (what makes a decision a LIVING object)

`supabase/functions/decision-watch/index.ts` — *"This is what makes a decision a living object instead of a one-shot answer."*
- Service-role-only (verifies `role === "service_role"` from the JWT); intended to be invoked by pg_cron hourly.
- Selects `active` + `complete` cases whose `last_verified_at` is null or older than **24h** (`STALE_HOURS`), oldest first. Hard budget caps: **2 cases** and **6 claim re-verifications** per run (so each invocation stays inside the edge runtime budget; hourly runs drain the backlog).
- Re-verifies ONLY the **load-bearing, web-checkable** claims (`is_load_bearing = true AND type IN factual/market/causal`) by calling the *exact same* `verifyClaim()` the live engine uses.
- **Alert predicate:** raise an alert only if a claim that *was* `supported` is now `contested`/`unverified` (`wasSolid && nowWeak`) OR confidence dropped from ≥0.6 to <0.4 (`confDropped`). Kind = `assumption_broke` (now contested) or `evidence_shifted`.
- **Idempotent:** skips if an open alert already exists for that (claim, kind). Writes `decision_alerts` + a `decision_events` row.

**How an alert reaches the user — the magic moment** (`_shared/decision-alerts.ts → prependDecisionAlerts`, called by `generate-briefing`):
- On the next Daily Briefing generation, up to 3 open alerts are **prepended as a leading `decision_alert` segment AND spoken as a preamble** on the audio script: *"Before today's news, a heads up from your decision watch. An assumption behind '{title}' just weakened… You may want to re-run that decision in CTRL. Now, your briefing."* Deterministic (doesn't re-prompt the script model), never throws into the caller, marks `surfaced_in_briefing_id`.
- In-app, `useDecisionInbox` surfaces open alerts as an `AlertBanner` with a "re-run the case" action; acknowledging flips status to `acknowledged`.

This loop is what the deck means by "the same mistake doesn't survive" and "living decisions" — CTRL keeps watching the assumptions you bet on and tells you, in your own briefing voice, when one moves.

---

## 4. CALIBRATION HARNESS (why the verdicts can be trusted)

`decision-eval` (admin/service-role only) runs the REAL `verifyClaim()` on ONE claim per call (budget control); `scripts/eval-decision-engine.mjs` orchestrates a labeled set held in `decision_eval_cases` (gold verdicts across all 5 claim types) and computes verdict accuracy + calibration. The founder's spec (§6) sets a **hard launch gate: expected calibration error < 0.1** ("when the engine says 80% it is right ~80% of the time") — "an overconfident decision tool is worse than none." Smoke scripts exist: `smoke-decision-engine.mjs`, `smoke-decision-engine-phaseb.mjs`, `smoke-decision-watch.mjs`. This eval discipline — testing the exact live code path against known answers — is itself a differentiator vs a chatbot.

---

## 5. WHAT IS REAL vs DORMANT (verified in code)

**REAL and wired (Phase A + B shipped):**
- Decompose → verify (Perplexity/Exa/Brave + NewsAPI/PDL/BuiltWith/Tranco) → cross-examine (4-model panel + adversarial) → advise. All present and coded.
- 4-state verdicts + honest abstention + confidence clamps. Real.
- Profile-tension grounding against the Memory Web. Real.
- Edge Pro gating: free = base pipeline, **3 cases / rolling 30 days** (`FREE_MONTHLY_LIMIT`); Pro (`edge_subscriptions.status ∈ active|past_due`) = cross-examination + unlimited. Real.
- `CriticalCallStep` forced-call gate + `decision_user_calls` capture. Real and wired into `PressureTestPanel`.
- Briefing injection of alerts (`prependDecisionAlerts`) is wired into `generate-briefing`.
- Schema: 7 tables, all RLS owner-scoped, children carry `user_id` (flat `auth.uid()` checks). Solid.

**DORMANT / not-yet-wired (the honest gaps):**
- **The WATCH cron is not scheduled.** `decision-watch` is fully built and references pg_cron in its header comment, but **NO migration / SQL registers a `cron.schedule` for it** (grep across `supabase/migrations` and the whole repo finds it only in docs/CHANGELOG, never in a `net.http_post` cron registration). So the "living decision" loop does not actually fire in prod unless a cron was added out-of-band. This is the single biggest gap between the promise and the running system.
- **The captured user judgment is dropped.** `decision_user_calls` is written by `CriticalCallStep`, but **nothing reads it** — `advise.ts`/`pipeline.ts` never consume it, and it never writes back into the Memory Web. The "upskilling rep" is logged and forgotten (synthesis T4/T2 confirmed in code).
- **No decision→memory writeback.** The engine *reads* `user_memory` for grounding (the only `user_memory` reference in the module is the read at `index.ts:62`), but a completed decision, its breakpoint, or its outcome never writes back to `user_memory`/`user_patterns`/`user_decisions`. The decision does not make the memory thicker — the app's central "it learns from me" failure.
- **Alternative ingestion sources are schema-only.** `source` allows `capture | voice | fireflies`, but **no function invokes `decision-engine`** with them (the only repo reference outside the decision-* trio is a code *comment* in `kit-compose`). The hook always sends `source: 'advisor'`. **Fireflies meeting-ingestion (`fireflies-sync`, spec Phase C 4.8) is unbuilt** — the "in Tuesday's board call you committed to X, which contradicts this decision" magic does not exist.
- **Spec promises not in the live verify path:** no `ai-cache` on atomic claim checks (spec 4.3/§5); **Tavily** is in the retriever enum but never implemented; embedding-rerank scoring against each claim (`briefing-scoring.ts`, spec 4.3) is NOT applied — `relevance_score` is populated only by Exa's native score, otherwise null. Adjudication runs on `gpt-4o-mini` (spec floated DeepSeek/Gemini-Flash).
- **Desktop reachability:** Decide is mobile-bottom-nav only; `/decision` is absent from the desktop rail AND the Cmd/K palette (synthesis §1) — a flagship engine hidden on desktop.

---

## 6. THE REALISTIC TARGET (founder's correction — do not over-promise the loop)

The founder is explicit: **do NOT assume users will let CTRL "watch" in the background and faithfully report back.** The WATCH-loop-into-briefing story is the ideal, but the realistic, defensible version is humbler and honest:
- **Best realistic case = ask on the NEXT RETURN whether the decision resolved.** When the leader comes back, CTRL surfaces "you pressure-tested '{title}' — did it resolve? how did it go?" and folds that answer back into memory — rather than depending on an always-on cron quietly re-verifying and a daily-briefing the user may never open. The living-decision value should survive *even if the cron never runs and the briefing is never read.*
- Concretely that means: (a) **wire the return-ask** (surface incomplete `decision_cases` on next session, capture the outcome, write it back to memory) as the dependable spine; (b) treat `decision-watch` + briefing-alerts as the *upside* layer, contingent on the user actually engaging with the briefing; (c) **close the learning loop that is already half-built** — consume `decision_user_calls`, write the decision outcome and breakpoint back into `user_memory`/`user_patterns`, so the memory visibly thickens from each decision (the thing the whole vision rests on and the current engine does not do).
- Honesty framing for marketing: the magic is *real verification with a real audit trail and real adversarial cross-examination grounded in your own context* — sell THAT (the methodology), not an over-claimed "it watches everything and warns you" that the running system does not yet reliably deliver.

---

## 7. THE ONE-LINE DIFFERENTIATION (for the corpus)

CTRL's Decide engine is not "ask an LLM about my decision." It is a **verification methodology**: decompose into typed falsifiable claims → ground each in real cited evidence from the right falsifiable source (never model memory; abstain honestly on assumptions) → cross-examine across four independent models and *keep their disagreement as a visible tension* → red-team to name the single breakpoint → advise with calibrated confidence, the strongest honest counter-case, and a validate-before-you-commit list — all grounded in the leader's own Memory Web so it can flag where the decision fights their own stated goals, and all backed by a dated evidence trail a leader can defend to a board. The magic, kept honest, is **earned conviction from shown work** — "I help you make your mind up."
