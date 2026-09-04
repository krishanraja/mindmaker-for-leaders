# CTRL — THE INTELLIGENCE LAYER BRIEF

> **The part of the Corpus the founder says decides the product.** Not features — the *intelligence behind the scenes*: the mental models, the encoded methodology, the unique "training", how the data lives and wires, the synthesis/verification pipeline, and the engineered feeling of magic kept honest. This is the answer to the only question that matters competitively: **why does CTRL produce results no other app can replicate?**
>
> Assembled 2026-06-12 from the six `intel-*` distillations (`intel-methodology-critical-thinking`, `-memory-identity`, `-models`, `-data-lifecycle`, `-synthesis-pipeline`, `-decision-pipeline`), grounded against the live repo `C:/Users/krish/mm-ctrl` and reconciled with `CTRL-CORPUS.md` + `_SYNTHESIS.md`. Every claim is named to a framework, table, function, or protocol. Status tags throughout: **LIVE** (wired in prod) · **PARTIAL** (built, half-wired) · **DORMANT** (built, unscheduled/uncalled) · **MISSING** (not built).
>
> The load-bearing honesty, carried from every source: **CTRL's intelligence is genuinely built and genuinely deep on the CAPTURE and VERIFICATION sides. The defensibility is real. But the LEARNING wires are cut** — `reference_count` is never written, three synthesis engines are never scheduled, decisions never write back to memory, v2 ships off-by-default. The moat is built and partly unplugged. **The job is to plug it in, not to invent it.**

---

## PART 1 — THE MOAT: WHY CTRL'S RESULTS ARE UNREPLICABLE

CTRL's defensibility is not any single engine. It is the **product of four compounding factors**, each individually copyable but collectively not: a prompt-only competitor can fake one, struggles with two, and cannot reproduce all four working together. Each pillar below is stated as a defensible claim, followed by the precise mechanism that backs it.

### Pillar 1 — Owned, compounding, portable context (the layer, not the model)
**Claim:** CTRL's answers are personal in a way no stateless chatbot can match, because they are computed against a *persistent, curated, owned* model of the leader — and that model gets cheaper and sharper every week it's used, while a competitor restarts from zero every session.
**Mechanism:** `user_memory` is a temperature-tiered fact graph (`fact_category ∈ {identity, business, objective, blocker, preference}`, `confidence_score`, `verification_status ∈ {inferred|verified|corrected|rejected}`, `temperature ∈ {hot|warm|cold}`, `reference_count`, `superseded_by`/`supersedes` versioning). Facts are captured through the most careful code in the app (`extract-user-context`: extract → validate → contradiction-detect → semantic-dedup → deterministic `fact-guardrails`), then *consumed* by every surface via `getUserContext` (six-table independent try/catch load) and `buildMemoryContext`. The methodology behind it (`memory-prompt-pack`) names the economics precisely: the **Amnesia Tax** ("your most expensive employee has amnesia; every Monday is its first day") and the flip — **"the context compounds, the one AI investment that gets cheaper every week."** "The code is replaceable. The context layer is the moat." Portability is real and shipped: `memory-context-builder` emits the same brain into ChatGPT / Claude / Gemini / Cursor / Claude Code / Markdown — "one brain behind every tool", owned and encrypted, not settings trapped in a platform.
**Why unreplicable:** a competitor can prompt a model; they cannot retroactively own years of a specific leader's curated, verified, versioned context. **The honesty caveat (the cut wire):** the *compounding* is currently unproven in-app because `reference_count`/`last_referenced_at` are never written and the lifecycle/synthesis crons never run — so the layer captures but does not visibly thicken. Pillar 1 is the strongest moat on paper and the one most starved of its own wiring.

### Pillar 2 — Encoded proprietary methodology (the founder's thinking, as engine behaviour)
**Claim:** CTRL *thinks* differently from a chatbot because Krish's own decision-science and operating methodology is encoded as structural engine behaviour — system-prompt rules, required JSON fields, forced UI gates — not as vibes a model might or might not honour.
**Mechanism:** Five reasoning disciplines a chatbot structurally does not do are hard-coded into the Decide engine: **decompose before judging** (`decompose.ts`: "You do not judge whether the decision is good. You only decompose."), **verify before asserting** (`verify.ts`: adjudicator may use "no prior knowledge beyond the evidence provided"), **argue against itself on purpose** (`crossexamine.ts` adversarial red-team + `advise.ts` required `counter_case`/`breakpoint_claim_index` JSON fields — the schema *cannot omit the counter-argument*), **make the human reason first** (`CriticalCallStep.tsx` withholds the verdict until the leader commits a call), and **refuse to be the decider** ("informed by AI analysis, not determined by it"). On top sits the editorial methodology in `training/anchor.yaml` (voice_card, do/dont phrase banks, `hot_signal_taxonomy`, structural rubrics, gold exemplars) — regression-tested by `npm run test:training` on every edit.
**Why unreplicable:** the methodology is specific and authored (the critical-thinking manual, the memory-prompt-pack, the two-species/agentic-org decks). A competitor would have to reverse-engineer not a feature but a *worldview* and then encode it down to the JSON-schema and forced-gate level. **Honesty caveat:** the encoding is deep in Decide and the briefing, thin everywhere else; several named models (A/B framing, Five Whys, WOOP, question transformation) are DORMANT.

### Pillar 3 — The synthesis + verification pipeline (relevance and truth as *numbers with receipts*, not asserted prose)
**Claim:** Where a chatbot *asserts* "this is relevant to you" / "this claim is true," CTRL *computes* it against live data and carries the evidence — a stored score and the exact fact it matched — so every output is auditable, not vibes.
**Mechanism, two pipelines:**
- **Briefing v2** (`runV2Pipeline`): the **Importance Lens** (`briefing-lens.ts`) builds an *explicit ranked, weighted* model of what matters to this user for this briefing type today (lens item types `decision|mission|watchlist|blocker|objective|pattern|interest_beat|interest_entity`, per-type deterministic weight tables); queries are planned per-lens-item; candidates are embedded and `dedupeAndScore` (`briefing-scoring.ts`) computes `relevance_score = max over lens items of cosine(candidate, lens_item) × weight` and stores the winning `matched_lens_item_id` on every retained story. Relevance stops being LLM prose and becomes **a number plus the profile fact it matched.**
- **Decide** (`decision-engine`): typed claims → routed to the *right falsifiable source* (Perplexity/Exa/Brave breadth; NewsAPI for recency; **BuiltWith** for tech-stack; **Tranco** for "is X a top player"; **PDL** for firmographics) → adjudicated against retrieved text only → 4-state verdict (`supported|contested|unverified` + honest `unverifiable` for assumptions/forecasts) with a calibrated confidence and a dated `decision_evidence` row a leader can show a board.
**Why unreplicable:** a prompt-only competitor cannot produce a stored relevance number, a matched-fact receipt, or a dated multi-source evidence trail — they have no lens, no embeddings step, no typed-claim-to-falsifiable-source router. **Honesty caveat:** v2 ships **off by default** (`BRIEFING_V2_ENABLED_DEFAULT="false"`) — the headline differentiator is dark for most users; and the cross-examine panel is Edge-Pro-only.

### Pillar 4 — The self-correction loop (the engine that *cannot grade its own homework*)
**Claim:** CTRL's verification posture is structural, not optional — independent checks the agent cannot skip — and corrections are designed to compound into a growing, inspectable rule library, so "the same mistake doesn't survive four occurrences." This is the deck's keystone and the deepest moat: it is "the layer that never makes the launch posts" and is the hardest thing to copy because it's the least glamorous to build.
**Mechanism (methodology, from `memory-prompt-pack`):** the three governing axioms — **"Never let a worker grade its own homework"** (proven by the Felix scar: an agent shipped an empty export, reported success, the dashboard glowed green), **"The same mistake does not get to happen twice,"** **"Fix the class, not the instance"** (Instance: "do not misspell Lauren" → Class: "confirm proper nouns against what I gave you before using them"). The literal protocol is the **self-correction footer**: LOG (root cause, not symptom) → PROPOSE (one class-killing rule) → WRITE BACK (append to memory, on user approval). Quantified bars: **4× = a mistake won't survive four occurrences · 1 week = a silent failure won't survive a week · 167 rules = each a lesson learned once.** CTRL's *live* expression of "never grade its own homework" is genuinely the Decide verification loop (the agent's claims are checked against independent web evidence it can't fake) and `decision-watch` re-verifying assumptions over time.
**Why unreplicable:** this is the half of the build that is "harder to run, harder to replicate" — the auditor layer, the forced reflection, the recurrence guard. **Honesty caveat (the biggest gap):** the self-correction loop **does not exist as a product primitive** — there is no `correction_log`/`correction_rules` table, no forced footer on task completion, no recurrence guard. This is simultaneously the deepest moat and the single most important MISSING build.

**How the four compose:** owned context (P1) feeds the methodology (P2), which is executed by the synthesis/verification pipeline (P3), whose outputs and corrections feed back through the self-correction loop (P4) into the owned context — closing the circle so the layer compounds. **A competitor must copy all four AND wire the loop between them.** That loop, fully closed, is the moat no prompt wrapper reaches.

---

## PART 2 — THE METHODOLOGY CTRL ENCODES (named protocols → exactly where each lives)

This is the catalogue of every named mental model / protocol in the corpus, with the precise engine location each occupies (system prompt / synthesis step / guardrail / data model / UI moment) and its honest status. Grouped by the three methodology tracks.

### 2A — Critical-thinking scaffolds (from the LLM Critical Thinking manual)
*Thesis: "Decision quality depends on how we think, not just what we know." The differentiator is the machinery that closes the gap between plausible-sounding and well-reasoned.*

| Model | Content | Lives in (engine location) | Status |
|---|---|---|---|
| **M1 · Claim Decomposition + Typing** | Break decision into 3-8 typed falsifiable claims (`factual|market|causal|assumption|forecast`), flag `is_load_bearing`. "The biggest reliability lever: models classify reliably even where they adjudicate unreliably." | **System prompt** of `decompose.ts` | LIVE |
| **M2 · Evidence-Tracking Confidence** | "Your confidence must track the evidence. If confidence is high but reasoning weak, that's a red flag." Bands: High 80%+ / Medium 50-80% / Low <50%. | **Guardrail** in `advise.ts` (clamps confidence, forces it down on panel disagreement) | LIVE in Decide; PARTIAL app-wide (not on briefing/memo/export) |
| **M3 · Mandatory Counter-Case + Breakpoint** | "Always include the strongest honest counter-case, not a token one." Name the single breakpoint assumption whose failure most breaks the decision. | **Required JSON fields** in `advise.ts` (`counter_case`, `breakpoint_claim_index`) + **synthesis step** `crossexamine.ts` adversarial red-team | LIVE |
| **M4 · Model Panel + Surfaced Disagreement** | Ask 4 models the same thing; "divergence reveals where uncertainty lives" — surface it, don't average. | **Synthesis step** `crossexamine.ts` (`PANEL=["claude","gpt-4o","gemini","grok"]`; split → `model_disagreement` tension → confidence penalty fed to `advise.ts`) | LIVE (Edge Pro only) |
| **M5 · Make-Your-Own-Call Gate** | Withhold the verdict until the human commits a judgment first — the anti-dependency, upskilling rep. | **UI moment** `CriticalCallStep.tsx` ("Lock in my call and see CTRL's read"); writes `decision_user_calls` | LIVE (capture); loop DORMANT (call is dropped, never compared back) |
| **M6 · Profile-Tension / Reflective Equilibrium** | Flag where a decision contradicts the leader's own stated objectives/blockers/recent decisions. | **Synthesis step + data model**: `decompose.ts` emits `profile_tensions` (kind `vs_profile`) grounded in `getUserContext` | LIVE; values-layer + 3 resolution options PARTIAL |
| **M7 · A/B Framing Robustness** | Reframe positively and negatively; "does the recommended choice remain robust to framing?" | — (latent in counter-case only) | DORMANT — clean UI moment to add ("flip the frame") |
| **M8 · Five Whys / Strip-the-Assumption** | Separate hard constraints from inherited assumptions; "industry standard" = a red flag, not a reason. | — (raw material is the `assumption`-typed claims) | DORMANT |
| **M9 · WOOP / Mental Contrasting** | Wish→Outcome→Obstacle→Plan; willing to *table* goals that fail the contrast (avoid "the graveyard of stalled pilots"). | — (goal systems exist but don't run the contrast) | DORMANT |
| **M10 · Question Transformation** | "The real question isn't X, it's Y" — surface the assumption baked into the framing. | — | DORMANT (highest "intelligent-feeling", use sparingly) |
| **G1 · Domain humility / scope fence** | "Commercial and strategic judgment only. Never medical, legal, financial-investment." | **Standing system-prompt guardrail** in `advise.ts` | LIVE |
| **G2 · Assume-hallucination-until-verified** | "Treat all LLM outputs as potentially false until independently verified." | **Architecture**: verify-before-assert (`verify.ts`) + `decision-watch` re-verify loop | LIVE (watch cron not in-repo) |

**The 5-step spine to embody end-to-end** (the manual's "Integrated Decision Process"): First-Principles (M1/M8) → Mental Contrasting (M9) → Dialectical (M3/M4) → A/B Framing (M7) → Reflective Equilibrium (M6). **CTRL runs 1, 3, 5 well; 2 and 4 are the missing rungs.**

### 2B — Identity / Memory / Self-Correction protocols (the "it knows me and gets sharper" engine)
*Spine slogan: "THE MODEL ISN'T THE PROBLEM · THE SETUP IS." Three plain-text layers, built in fixed order, each gated by a pass/fail test, each carrying a forced self-correction footer.*

- **Layer 01 · IDENTITY** — schema `ROLE · VOICE · STANDARDS · NEVER-RULES`. **Capture protocol** = a 3-step interview that refuses generic answers ("if an answer is generic — 'professional', 'clear', 'data-driven' — refuse it"). The keystone move: **VOICE is mined from 2-3 pasted real artifacts, never self-described**, with every trait flagged `confident | guessing`. **Test:** "two people couldn't tell its draft from yours." **Lives in:** the Kit's `memory-identity/jobFileBuildPrompt`; **MISSING in-app** as a first-class onboarding layer and a `user_identity` table.
- **Layer 02 · MEMORY** — schema = four headings (BUSINESS · PRIORITIES top-3 · DECISIONS MADE · PEOPLE AND PROJECTS). Curation law: **"SHARP BEATS BIG · USEFUL CONTEXT IN · LIABILITY OUT."** **Capture protocol** = a 4-step interrogation (interrogate the dump → pressure-test priorities with "move only one this month, what visibly changes" → mine settled decisions by asking "what do you keep relitigating" → organise under one page, privacy-flagged). **Test:** COLD vs LOADED — "the gap between those two answers is the tax you've been paying." **Lives in:** `extract-user-context` (the hygiene chain is genuinely strong) + `user_memory` data model; the *interrogation* and the *priority forcing-function* are MISSING in front of capture.
- **Layer 03 · SELF-CORRECTION** — the **footer** (LOG root cause → PROPOSE class-killing rule → WRITE BACK on approval), the recurrence guard (force a rule at 4× without an active rule), the "never grade its own homework" axiom. **Lives in:** the Decide verification loop is the live expression of the axiom; the actual `correction_log`/`correction_rules` tables and the forced footer are **MISSING** — this is the deck's keystone and the #1 build.
- **Cadence/hygiene protocol:** TONIGHT/THIS WEEK/FRIDAY weekly homework + the Friday hygiene pass (kit `weeklyHygienePrompt`); the compounding timeline Week1→Month3→Month12 ("STOP RE-TEACHING · START BANKING"). The economic frame that makes it non-optional: the **Teaching Tax** — "every correction you let vanish is a lesson you'll pay for again next week."

### 2C — Higher-order operating models (the worldview CTRL's advisory voice carries)
*One engine that turns a leader operator → governor: classify every situation as Labour (absorb), Handoff (one prepared call), or Action (protect), and after every hour given back, catch the reinvestment moment.*

| # | Model | Verbatim anchor | CTRL operationalizes as | Status |
|---|---|---|---|---|
| 0 | **Operator → Governor** | "You: ~20 decisions. The system: hundreds." | North-star ratio; the ~20-calls "ledger of living decisions" spine | DORMANT (spine unbuilt) |
| 1 | **Reclaim → Amplify → Re-architect** | "Don't just spend the time · reinvest it." | Infer `current_rung`; after each saved-time artifact, fire a rung-up nudge | DORMANT (the most important gap) |
| 2 | **Two Species, One Company** | "A different category of worker… fail on opposite axes." | Hold an explicit human/AI split of the user's work; governs CTRL's own honesty | PARTIAL (`is_high_stakes` flag) |
| 3 | **The Handoff is the Product (Arendt: Labour·Work·Action)** | "Optimise the boundary, not the agent." | The task-routing classifier at the engine's heart | PARTIAL (`CriticalCallStep` = the Keep/Action instance; Labour-absorb unbuilt) |
| 4 | **Collapse, then Replace (brick→skill)** | "Replace each brick with a skill the next decade rewards." | Tag each artifact with the brick it absorbed; emit the matched skill-swap prompt | DORMANT |
| 5 | **Pyramid → Diamond (complexity tax)** | "Fewer tasks · denser decisions." | Plan the day for density, not relief: batch the calls, defend deep-work | DORMANT |
| 6 | **Big-G / Little-g + Internal/External** | "Internal is free. External is gated." | Leader-set autonomy line + non-overridable never-rules + confidence-band action | PARTIAL (no control surface) |
| 7 | **Never grade its own homework (4-tier audit + reflection)** | "A stuck AI reports a confident green tick." | CTRL audits own output (TRUTH=Decide verify) + the self-correction loop | Split: Decide WIRED, loop MISSING |
| 8 | **Observability over capability** | "Read real output, not status reports." Same-hour alerts. | Surface "what actually happened"; the `decision-watch` loop | Split: WATCH intended-live; memory observability FAKED today |
| 9 | **Recalibrate the handoff line weekly (Kasparov's centaurs)** | "The hybrid model is a waypoint, not an equilibrium." | A weekly "redraw the line" ritual; product as practice surface not setup wizard | DORMANT |
| 10 | **Sharp beats big** | "Memory works when curated, not a junk drawer." | The capture-and-prune rhythm (`memory-lifecycle`) + the 3 rolling priorities as a first-class object | PARTIAL (prune rhythm dormant) |
| 11 | **Amnesia tax → context compounds** | "The one AI investment that gets cheaper every week." | End Monday-morning amnesia; prove the layer thickens | PARTIAL (export wired; compounding unproven) |
| 12 | **Intelligence priced per task (the AI P&L)** | "Stop billing a frontier model for formatting." | Cost-intelligent model routing (`model-router.ts`); leader spend-watch | PARTIAL (routing partly real; no spend-watch) |
| 13 | **Cost arrives before payback / the ladder problem** | "You can't skip the ladder and keep the seniors." | Advisory watch-item; justifies CTRL's own auditor-layer cost | DORMANT/aspirational |
| 14 | **Thought partner, not oracle** | "Informed by AI, not determined by it." | The Decide engine made real; spread the discipline to every output | WIRED in Decide; DORMANT elsewhere |

---

## PART 3 — HOW THE DATA LIVES & WIRES UP

The real lifecycle, with concrete tables/functions/embeddings — and the TARGET consolidation that makes the wiring legible. The intended loop is: **capture → store → synthesize → output → learn.** Five of these stages are built; the *learn* stage is the cut wire.

### 3.1 — CAPTURE (the strongest part — keep it)
`extract-user-context/index.ts` (~681 lines) is the most careful code in the app. Multi-stage: **Extract** (OpenAI JSON-mode, 5-15 durable facts) → **Validate** (fact-check) + **Contradiction-detect** (LLM) → **Semantic dedup** (OpenAI `text-embedding-3-small` + **in-JS cosine** `cosineSim(a,b)`, ephemeral, no stored vector — a new phrasing UPDATES an existing fact rather than inserting a dupe) → **Deterministic guardrails** (`fact-guardrails.ts` rejects style-rules-as-facts, negations, transient state, third-party identity; stamps `training_material_version`) → **Write** (new facts insert as `verification_status:'inferred'`, never auto-verified; refines in place only if new confidence is higher AND existing is still `inferred`). Fire-and-forget chains `synthesize-edge-profile` + `infer-briefing-interests`.
**The capture leak to fix:** the live "Add memory" hook `useCreateMemory` does a **direct `supabase.from('user_memory').insert`** — bypassing extraction/validation/dedup/guardrails *and* the AES-256-GCM encryption in `memory-crud` — writing manual facts unencrypted at `confidence 1.0, verified`. The `memory-crud` HTTP wrappers are dead code shadowed by direct-table hooks. (Encryption is Web Crypto AES-GCM in the `memory-crud` edge fn, NOT pgcrypto despite the extension; the live UI bypasses it, while `useComplianceStatus` still reports `encryptionEnabled: true`.)

### 3.2 — STORE (where the data lives — exact shape)
```
user_memory  -- the atomic fact store / "Memory Web"  (defined TWICE: 20260114 + 20260314 — drift hazard)
  fact_key, fact_category[identity|business|objective|blocker|preference],
  fact_label, fact_value, fact_context (provenance snippet),
  confidence_score NUMERIC(3,2)[0..1]=0.5, is_high_stakes,
  verification_status[inferred|verified|corrected|rejected]=inferred, verified_at,
  source_type[voice|form|linkedin|calendar|enrichment|manual|system|markdown],
  is_current, superseded_by→self, supersedes→self,   -- temporal versioning
  temperature[hot|warm|cold]=warm, last_referenced_at, reference_count=0, archived_at, tags[],  -- LEARNING signal
  encrypted_content (AES-256-GCM {ciphertext,iv}), encryption_version, retention_expires_at
  RPCs: get_user_memory_context, get_pending_verifications, verify_memory_fact,
        touch_memory_fact (reference_count++ , last_referenced_at=now)  ← NEVER CALLED · the cut wire

user_patterns   ← written by memory-synthesize [UNSCHEDULED]
  pattern_type[preference|anti_preference|behavior|blindspot|strength], pattern_text,
  evidence_count, confidence, status[emerging|confirmed|deprecated], source_facts UUID[]
user_decisions  ← decision-engine does NOT write here (it only READS user_memory)
  decision_text, rationale, context_snapshot JSONB, status[active|superseded|reversed], source[...]
user_memory_budget   ← recomputed by memory-lifecycle [UNSCHEDULED]  (hot_max 4000 / warm_max 8000 tokens)
user_memory_settings → trigger stamps retention_expires_at

decision_cases / decision_claims / decision_evidence / decision_tensions / decision_user_calls /
  decision_alerts / decision_events   -- the Decide engine's 7 RLS-owner-scoped tables
briefing_* (+ pgvector in briefing v2 for story embed-dedupe; ai_response_cache for lens/embedding cache)
training_material  ← loaded from training/anchor.yaml via training-loader (the "unique training")

LEGACY PARALLEL (does NOT reconcile): leaders / assessment_events / leader_reflections.extracted_themes /
  leader_patterns ← detect-patterns [DEAD on client] / leader_assessments / leader_dimension_scores
```
**Embeddings, disambiguated:** memory dedup = `text-embedding-3-small` + ephemeral in-JS cosine (no stored vector). Real **pgvector** lives only in briefing v2 (story embed-dedupe + relevance scoring). Two distinct stories, easy to conflate.

### 3.3 — SYNTHESIZE (built, in isolation, correct — but unscheduled)
- `memory-synthesize` reads hot+warm `user_memory` (≥5 facts) → gpt-4o → writes `user_patterns`, fuzzy-merging (bumps `evidence_count`, flips `emerging→confirmed` at confidence>0.8 AND evidence>3). **NOT scheduled, NOT called.**
- `memory-lifecycle` is a clean 4-rule temperature engine: promote warm→hot (ref_count≥3 + used in 7d); demote hot→warm (14d idle); warm→cold (30d); archive cold (90d); recompute token budget. **NOT scheduled.** (Even if it ran, it's starved by the missing `reference_count` write.)
- Briefing synthesis (the magic): **v2** Importance Lens → query planner → 12s-capped provider fan-out → embed/dedupe/score → budget-constrained curation → script+voice → decision-alert prepend. Every retained story carries `relevance_score` + `matched_lens_item_id`. **Ships OFF by default.**

### 3.4 — OUTPUT (legible, evidence-carrying)
Every briefing segment can answer "why am I seeing this?" with the matched fact + score; `briefing-diagnose` reproduces the whole lens/queries/feedback read-only. Every decision verdict carries dated `decision_evidence` rows, a calibrated confidence, the counter-case, and the named breakpoint. `memory-context-builder` emits the portable per-tool export. **The receipts already exist in the DB; they are mostly not surfaced on screen.**

### 3.5 — LEARN (the cut wires — the core finding, confirmed by grep)
1. **`touch_memory_fact` is NEVER called.** `getUserContext`/`buildMemoryContext` READ facts but never touch them → `reference_count` stays 0, `last_referenced_at` stays create-time forever → the temperature engine has no input → the "X hot / getting smarter" UI is a **performed signal** (the exact faked green tick the methodology forbids). **This single missing write is the clearest mechanical reason "it never feels like it learns."**
2. **`memory-lifecycle` not scheduled.** Promotion/demotion/archival never runs.
3. **`memory-synthesize` not scheduled.** `user_patterns` empty for real users; the pattern panel is permanently blank.
4. **Decision verdicts + `decision_user_calls` never write back** to `user_memory`/`user_patterns`/`user_decisions`. The crown jewel teaches the durable graph nothing.
5. **Assessment results never bridge into `user_memory`.** The richest first-touch self-knowledge is invisible to personalization.
6. **The self-correction loop has no home table** (`correction_log`/`correction_rules` MISSING).
7. **Only two crons in-repo:** `daily-briefing-email` (`0 12 * * *`) and the kit nudge. **No `cron.schedule` for `decision-watch`/lifecycle/synthesize in-repo** (caveat: SQL is applied via the Management API out-of-band, so a cron *could* exist in prod — but zero in-repo evidence).

### 3.6 — TARGET CONSOLIDATION (the cheapest path to honest compounding, by leverage)
1. **Emit the usage signal** — call `touch_memory_fact` from `getUserContext`/`buildMemoryContext` whenever a fact is injected. *The single highest-leverage line in the codebase.*
2. **Schedule the three dormant engines on one cron** (chain off the daily-briefing cron, per-user): `memory-lifecycle` → `memory-synthesize`. Now temperature tracks reliance and patterns populate.
3. **Close the decision loop inward** — write each verdict + breakpoint to `user_decisions`, and on outcome to a `user_pattern`; consume `decision_user_calls` (compare the user's call vs CTRL's read). Add the **return-ask** (surface incomplete cases on next session) as the dependable spine, with `decision-watch`+briefing-alerts as the upside layer.
4. **Build the Self-Correction primitive** — `correction_log` (CAPTURE: symptom + non-null `root_cause`) + `correction_rules` (GROUP+WRITE-BACK: `rule_text`, `mistake_class`, `recurrence_count`, `status`, `written_back_to[]`), user-approved, with the 4× recurrence guard, writing back into identity never-rules + memory + every export.
5. **Add the `user_identity` object** (ROLE/VOICE/STANDARDS/NEVER-RULES; VOICE mined from pasted writing with `confident|guessing` flags).
6. **Bridge the legacy stack** — promote diagnostic scores + `leader_reflections` themes into `user_memory`/`user_patterns`; retire `detect-patterns`/`leader_patterns` into `memory-synthesize`.
7. **Flip briefing v2 default-on** after burn-in; route manual creates back through hygiene+encryption.
8. **Unify the duplication** — one memory schema, one pattern engine, one context-builder family, one nav config (today: 3 verify UIs, 3 editors, 3 context-builders, 3 nav defs, two parallel `user_*`/`leader_*` stacks).

---

## PART 4 — THE ENGINEERING OF MAGIC (kept honest, data-realist, never faked)

The felt magic is real mechanism made legible. Each magic moment below names what *produces* the feeling and the honesty rail that keeps it from becoming theatre.

1. **The decision gets pressure-tested in front of you.** Decompose → verify against the live web → red-team across four models → confidence band → handed back to you to call. The user *watches their decision argue with itself and check the web.* **Honest because:** confidence tracks evidence; assumptions are honestly marked `unverifiable` not faked; disagreement *lowers* conviction instead of being smoothed away; every verdict has a dated evidence row. The felt target, named verbatim: **"earned conviction, not borrowed certainty."**

2. **The COLD-vs-LOADED gap, shown.** Don't *claim* intelligence — *show the delta* between an answer with the memory loaded and without. "The gap between those two answers is the tax you've been paying." **Honest because:** it's an observable behaviour, not a vibe — and it degrades gracefully (sparse-profile returns an honest "no stories worth your time today" / a `profile_too_sparse` onboarding signal, not invented filler).

3. **The receipts under every story.** "Because you're tracking [watchlist:Anthropic] · 0.71." Every v2 segment already carries `matched_profile_fact` + `relevance_score`; surfacing them turns honesty into the feature. **Honest because:** the receipts are queryable (`briefing-diagnose`) — magic you can audit.

4. **The living decision that comes back to you.** `decision-watch` re-verifies the assumptions you bet on and, when the ground moves, tells you *in your own briefing voice* ("an assumption behind '{title}' just weakened"). No chatbot does this — it has no persistence. **Honest framing (founder's correction):** do NOT over-promise an always-on watcher. The dependable version is the **return-ask** ("you pressure-tested X — did it resolve?"); the cron+briefing-alert is the upside layer.

5. **The rule library you can see growing.** "167 rules, each a lesson learned once." Compounding shown as an accumulating, inspectable asset — the visible proof of P4. **Honest because:** each rule is user-approved and kills a *class*, with an audit trail of the instances it generalises.

6. **The voice that's indistinguishable from yours.** Identity VOICE mined from real pasted writing, gated by the test "two people couldn't tell its draft from yours." **Honest because:** every inferred trait is flagged `confident | guessing` — the model surfaces its own coverage gaps rather than bluffing.

**The one anti-pattern the whole corpus forbids — the Felix scar / the faked green tick:** never let the UI *imply* learning the backend isn't doing. This is exactly the trap the live app fell into — thermometers, health-scores, `GettingSmarterDelta`, `LearningEngineSheet` animating over dormant engines. **The data-realist law (Corpus Law 1 + Law 7): the thermometer only moves because `reference_count` actually moved.** New facts can "land hot at the centre" as an onboarding affordance, but it becomes theatre the moment it isn't backed by a real `touch`/lifecycle. Honest magic > performed magic — and the performed kind "rings hollow," which is precisely the founder's complaint.

**What honest magic is NOT:** a confident paragraph with no decomposition, no verification, no counter-case, no band — a chatbot wearing CTRL's skin. **Don't oversell as ML:** the "training" is a curated, regression-tested rules+exemplars YAML (`anchor.yaml`), not a fine-tuned model. The honest, still-impressive claim: "a weighted model of your priorities, scored against live news by embeddings, with editorial taste version-controlled in one file and a feedback loop you control."

---

## PART 5 — WHAT MUST BE TRUE IN THE BUILD FOR THIS TO WIN

The intelligence layer wins only if these are true. Ordered by leverage.

1. **The single usage signal fires.** `touch_memory_fact` is called on every fact injection. Without this one write, *nothing* in the learning loop can move and every "it learns" signal is a lie. **This is the smallest change that makes the largest model honest.** Non-negotiable, do first.

2. **The three dormant engines run on a schedule.** `memory-lifecycle` + `memory-synthesize` (and the decision-watch cron, if relied on) are actually scheduled — so temperature tracks reliance, patterns populate, and the graph demonstrably moves. A built-but-unscheduled engine is indistinguishable from a missing one.

3. **The Self-Correction loop exists as a real primitive.** `correction_log` + `correction_rules`, the forced footer on task completion (LOG→PROPOSE→WRITE-BACK), the 4× recurrence guard, user-approved rules that write back into identity/memory/exports. This is the deck's keystone and the deepest moat; it is currently the biggest MISSING piece. "Never let a worker grade its own homework" must be a *structural step the agent cannot skip*, not a habit.

4. **Decide closes its own loop.** Verdicts + breakpoints write back to `user_decisions`; `decision_user_calls` is consumed and compared to CTRL's read; the return-ask captures outcomes into memory. The crown jewel must make the memory *thicker*, or pressure-testing teaches nothing durable.

5. **Identity is a first-class object** (`user_identity`: ROLE/VOICE/STANDARDS/NEVER-RULES), with VOICE mined from pasted writing and `confident|guessing` flags — not scattered across `user_memory` rows and the Edge read.

6. **The verification methodology is real and calibrated.** The hard launch gate holds: **expected calibration error < 0.1** ("when the engine says 80%, it's right ~80% of the time") — an overconfident decision tool is worse than none. Verdicts cite real evidence; assumptions abstain honestly; the eval harness (`decision-eval` + `eval-decision-engine.mjs` against `decision_eval_cases`) gates releases.

7. **The magic is turned ON and surfaced.** Briefing v2 default-on after burn-in; the `matched_profile_fact`+score receipts surfaced under every story; `briefing-diagnose` promoted to a "why these?" panel. The differentiator must not ship dark.

8. **Honesty is enforced as a rail, not a hope.** No UI implies learning the backend isn't doing (kill the vanity thermometers until they're backed; "12% sharper" stays dead). Confidence bands carry on *every* output, not just Decide. Scope fence (no medical/legal/financial) holds. Corrections cost one tap and stick (Corpus Law 8).

9. **The methodology spreads beyond Decide.** The reframe / counter-case / confidence-band discipline (M2/M3) and the encoded operating models (reinvestment catch, handoff classifier, weekly recalibration) reach briefings, memos, and exports — so the whole product *thinks*, not just the one engine.

10. **The four moat pillars are wired into one closed loop.** Owned context → methodology → synthesis/verification → self-correction → back into owned context. The win condition is not any single pillar; it is the **circle closed**, visibly and honestly, so the layer compounds. That closed loop is the thing no prompt-wrapper competitor can reach — and it is, today, *built and unplugged*. Plugging it in is the build.

---

*This brief is the intelligence-layer spine of the CTRL Corpus. The defensibility is already designed and largely built; the founder's instinct is right that this — not features — decides the product. The single most important sentence: **the moat is real and mostly already coded; the job is to close the cut wires between capture, verification, and learning, and never to fake the loops not yet closed.***
