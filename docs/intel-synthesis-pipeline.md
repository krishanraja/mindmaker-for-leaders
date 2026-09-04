# Intel Track: The Synthesis / Briefing Pipeline That Makes Magic

**Source of truth:** real repo `C:/Users/krish/mm-ctrl`, read 2026-06-12. Not docs, not memory — the actual Deno edge code.

**One-line claim being tested:** "CTRL produces a briefing no other app can replicate because it scores live news against an explicit, weighted model of *what matters to you today*, carries the evidence of every match, and learns from your thumbs." This is **mostly real and well-engineered — but the version that makes the magic (v2) ships OFF by default.** That single env flag is the gap between the marketing claim and what a given user actually receives.

---

## 1. The two pipelines: v1 (live) vs v2 (the magic, gated off)

`generate-briefing/index.ts` (2067 lines) contains BOTH pipelines. The handler chooses at runtime:

```
v2EnvDefault = (Deno.env.get("BRIEFING_V2_ENABLED_DEFAULT") ?? "false") === "true"   // line 1828
→ overridden by per-user user_memory row fact_key='briefing_v2_enabled'              // line 1835
→ overridden by request body briefing_version: 1|2                                    // line 1842
if (v2Enabled && briefingType !== "ai_landscape") runV2Pipeline(...)                  // line 1845
```

**The default is `false`.** Unless an env var is set or a user is hand-flipped via a `user_memory` row, every briefing runs **v1** — the weaker pipeline. The differentiator (v2) is real, shipped, tested, and **dark for most users.** This is the single most important finding in this track.

### v1 (the fallback that's actually live for most)
"Spray news, then ask an LLM to pick what's relevant." Flow:
1. `getUserContext()` → flat profile projection (role/company/industry/missions/decisions/objectives/blockers/watchlist/patterns).
2. `buildPerplexityPrompt()` stuffs the *entire* profile into ONE giant Perplexity system prompt (lines 62-124) — "RELEVANCE TEST - every story MUST connect to..." — and hopes the model obeys.
3. Race three providers in parallel (`Promise.any`): Perplexity `sonar` / Tavily+OpenAI curate / Brave+OpenAI curate (lines 1885-1940). First non-empty wins.
4. `curateHeadlines()` — second GPT-4o-mini pass, "ruthless news editor," cut to top 6-8 (lines 595-662).
5. `generateBriefingScript()` — GPT-4o(-mini) writes segments + 500-600-word audio script (lines 708-944).
6. **Relevance is LLM-*asserted* prose** (`relevance_reason`) — there is no measured score. The model says "this is relevant to you" and you trust it. This is the failure mode that "put biomedical headlines on a technology leader's briefing" (the comment that motivated v2, lines 1716-1720).

### v2 (`runV2Pipeline`, lines 1313-1514): evidence-based relevance — THE MAGIC
Six explicit stages, each with a deterministic fallback so one slow provider can't kill the brief. This is the real moat. Detailed below.

---

## 2. The v2 magic, stage by stage (the part to sell)

### Stage 0 — Context assembly (`_shared/user-context.ts`)
`getUserContext()` does a **six-table independent-try/catch load** so one missing table never nukes the brief:
- `user_memory` (is_current=true, categories identity/business/objective/blocker/preference, top 40 by confidence) → name, role, company, industry, objectives[], blockers[], preferences[]
- `edge_profiles` → strengths[]/weaknesses[] (the leader's blind spots, from the Edge assessment)
- `leader_missions` via `resolveLeaderIds()` (checks BOTH `leaders.id == uid` AND `leaders.user_id == uid` — the bug that made the old `user_missions` query always return empty, lines 17-37)
- `user_memory` watching_company rows → watchlist
- `user_decisions` (status=active, last 5) → "decisions on their desk"
- `user_patterns` (confirmed/emerging, confidence ≥ 0.6) → behavioral patterns
- `voice_sessions.compass_tier` → `learningStyle` (drives tone; see §5)
- `briefing_feedback` (last 7d, reaction=useful) → joined back to past briefings' segments to compute **preferredTags / preferredSources** — a closed feedback loop into the context itself.

`toLensSource()` converts this into the `LensSource` the lens stage consumes, wiring REAL mission/decision row IDs in so lens items point at auditable rows.

### Stage 1 — The Importance Lens (`_shared/briefing-lens.ts`, `buildImportanceLens`)
**This is the core abstraction and the single most differentiated idea in the codebase.** Instead of flattening the profile into one prompt, it produces an explicit **ranked, weighted list of what matters to THIS user for THIS briefing type TODAY.** Lens item types: `decision | mission | watchlist | blocker | objective | pattern | interest_beat | interest_entity`.

How a lens is built:
1. `loadInterests()` — user's *declared* `briefing_interests` (kind = beat / entity / exclude). Beats+entities become **weight-1.0** lens items; excludes go to a separate post-filter list.
2. `deterministicLens()` — hand-tuned per-briefing-type weight tables (lines 210-219). E.g. `competitive_intel` weights watchlist 1.0, `boardroom_prep` weights mission 1.0, `macro_trends` weights objective 1.0. **This is the bespoke methodology** — each briefing "lens" looks at the same profile through a different prioritization.
3. `loadLensFeedbackDeltas()` + `applyFeedbackDeltas()` — persisted **negative** feedback (explicit kill = -1.0, aggregated thumbs-down = -0.4) is applied BEFORE the LLM ever sees the items, keyed by a SHA-256 `lens_item_signature`. Items that fall ≤0 are dropped. Killed topics never resurface.
4. LLM reweight (gpt-4o-mini, temp 0.1, JSON mode) reorders/reweights — but **may not invent items, may not change ids, and may not demote `interest_*` items below the 0.8 floor** (INTEREST_WEIGHT_FLOOR). The LLM is constrained polish on top of a deterministic spine.
5. **Cached 24h** keyed on (user, briefing_type, date, **profile_signature**) — a same-day profile change busts the cache; fresh interests + kills always overlay the cache immediately (`mergeInterestsIntoCached`).

`INTEREST_WEIGHT_FLOOR` + the kill mechanism = "**the user is in control of their own relevance model.**" That's a genuinely ownable, demoable story.

### Stage 2 — Query Planner (`planQueries`)
Turns the top-6 lens items into **4-6 targeted web-search queries, each tagged with its `target_lens_item_id`.** Biased toward `training_material.hot_signal_taxonomy.must_include`, away from `drop`. **Industry-scoping guardrail** (`industryQueryBias`, lines 527-570) is the explicit fix for the biomedical-on-a-tech-CEO drift: a tech leader's queries are forced inside {SaaS, enterprise software, AI infra, dev tools, cloud} and away from {biomedical, clinical trial, pharma}. Falls back to deterministic per-item query templates if no LLM.

### Stage 3 — Provider fan-out (`v2FetchAll`, hard 12s wall-clock cap)
Each planned query is fanned to Perplexity (one batched Sonar call — it's slow), Tavily, and Brave **in parallel**, each per-provider call wrapped in 8s `withTimeout` + `Promise.allSettled`, the whole thing raced against a 12s cap (`Promise.race` with a setTimeout-resolves-empty, lines 1274-1288). **One slow/broken provider can never block the brief** — red-team guidance baked into code. Candidates carry `{title, source, snippet, provider}`.

### Stage 4 — Embed + dedupe + score (`_shared/briefing-scoring.ts`, `dedupeAndScore`) — THE QUANTIFIED MAGIC
This is where "relevance" stops being LLM vibes and becomes a number:
1. **Batched** embedding of all candidates + all excludes in ONE `text-embedding-3-small` call (never loop). Lens-item embeddings cached 7d in `ai_response_cache` (stable across briefing types within a day).
2. **Exclude filter:** drop any candidate with cosine ≥ 0.80 (`BRIEFING_EXCLUDE_THRESHOLD`) to ANY user-declared exclude — more aggressive than dedupe on purpose ("never show me geopolitics" kills borderline geopolitics too).
3. **Semantic dedupe:** cosine ≥ 0.87 (`BRIEFING_DEDUPE_THRESHOLD`) → keep the higher `SOURCE_AUTHORITY` (Bloomberg/FT/WSJ/Reuters=5 … Web=1), ties to earlier provider. Replaces the old 50-char-prefix string-match that missed reworded duplicates.
4. **Score:** each survivor's `relevance_score = max over lens items of cos_sim(candidate, lens_item) × lens_item.weight`, and the winning lens item id is stored as `matched_lens_item_id`.
5. **Relevance floor:** drop anything below `BRIEFING_MIN_RELEVANCE` = 0.30 so curation can't pad "pick N" with weak filler.

So every retained story carries **a number AND the exact profile fact it matched.** That is the literal "evidence" in evidence-based relevance — and it's the thing no prompt-only competitor can reproduce.

### Stage 5 — Budget-constrained curation (`_shared/briefing-curation.ts`, `curateSegments`)
- Segment count comes from `training_material.structural_rubric[type].word_budget / 100` clamped 3-6 (`segmentCountFromBudget`) — not a hardcoded "keep 6-8".
- gpt-4o-mini (JSON mode) picks **UP TO** N, "returning fewer is correct if the pool is thin" — a deliberately short brief over filler.
- Hard constraints in the prompt: every segment must cite a lens_item_id; **diversity** (no 3× same lens item if lens ≥3); **coverage** (span top-3 lens items); copy the matched lens text into `matched_profile_fact`.
- `enforceDiversity()` caps same-lens picks at 2 server-side. Deterministic fallback (`deterministicPick`) picks best-per-lens-item then fills.
- Output segments carry `{lens_item_id, relevance_score, matched_profile_fact}` — the three fields v1 never captured.

### Stage 6 — Script + voice (`generateBriefingScript`, shared by v1 and v2)
- **Early-insert pattern:** a preliminary `briefings` row (script_text=NULL, raw segments) is written first so the frontend shows headlines while the script polishes; a final UPDATE lands the narrative. Stale-incomplete rows (script null, age >5m) are auto-recovered on next visit (lines 1635-1658).
- The script prompt injects the **training material** as XML blocks (see §3): voice_card, do/dont phrases, typography rules, the per-type structural rubric, ONE gold exemplar, and a `self_check_gate`. Plus optional per-user `user_briefing_directives` ("apply AFTER house rules").
- Cohort tone directive from `learningStyle` (§5). Per-type "purpose block." Headlines forced to sentence-case, <12 words, verb-or-"Your"-led, no corporate-noun fluff — enforced server-side by `normalizeHeadline()` so a generic "Understanding Key Trends…" can never reach the leader (a voice *floor*, not just a prompt request).
- Post-process: `applyTypographyRules` + `stripBannedPhrases` from training (em-dash kill etc.).

### Stage 7 — Decision-alert prepend (`_shared/decision-alerts.ts`)
Before news, open `decision_alerts` (from the hourly `decision-watch` WATCH loop) are **deterministically** prepended as a leading "DECISION ALERT" segment + spoken preamble ("Before today's news, a heads up from your decision watch…"). Even on a sparse-profile day the brief is built *just* to carry an open alert (lines 1737-1785). This is a real magic moment: the app proactively tells you an assumption behind a past decision weakened overnight.

### Audio (`synthesize-briefing`) — user-triggered
TTS is **not** auto-run; the frontend calls synth only on "Generate audio" to avoid spend on read-not-listened briefs. (Honest cost discipline, not a faked feature.)

---

## 3. The "unique training" — `training/anchor.yaml` → `training_material` table

The voice/methodology is a **single authored YAML** (`training/anchor.yaml`, version 1, scope global), loaded via `_shared/training-loader.ts` (60s cache, global + optional per-user overlay merge, hard-coded FALLBACK skeleton if the DB row is missing). It is the one source of truth for:
- **voice_card** (adjectives direct/crisp/high-signal/observant/unfussy; anti: breathless/salesy/hedgy; register "executive peer, not assistant")
- **do/dont phrase banks** ("Heads up." / "Net:" vs banned "dive deep", "game-changer", "it's worth noting")
- **typography_rules** (em/en dash forbidden — the house no-em-dash rule, enforced in code)
- **extraction_rejects** (regex taxonomy that stops the memory extractor from storing meta-instructions/style-rules/transient-state/third-party-identity as "facts" — this is why the profile stays clean, consumed by `fact-guardrails.ts`)
- **hot_signal_taxonomy** (must_include: benchmark moves >5pts, >$100M rounds, model releases from named labs, >15% price changes; drop: sub-C-suite moves, <$20M rounds, unsourced speculation) — drives the query planner AND curation
- **structural_rubric** per type (word budgets 220/280/240, tolerances)
- **briefing_exemplars** (gold-standard outputs per type — the few-shot anchor)
- **watchlist** defaults (OpenAI, Anthropic, DeepMind… Altman, Amodei…)
- **export_voice_cards** (per-target packaging for the Memory export, §4)
- **evaluation_corpus** — regression-tested by `npm run test:training` on every YAML edit.

**Tuning the product's brain is a YAML edit + a test run, not a redeploy.** That's the real "training" story — opinionated editorial taste, version-controlled, regression-gated. Honest framing: it's a curated rules+exemplars corpus, not a fine-tuned model. Don't oversell it as ML.

---

## 4. Three different "context-builders" — disambiguation (the prompt asked about all three)

They are NOT three versions of one thing; they serve different surfaces:

| Module | Powers | What it produces |
|---|---|---|
| `_shared/user-context.ts` (`getUserContext`) | **The briefing** | Flat `UserContext` projection + `toLensSource` for the lens. THE briefing input. |
| `_shared/memory-context-builder.ts` (`buildMemoryContext`) | **Memory export** (`/memory` → "Export my context") | Per-target artefacts: ChatGPT (instructions+knowledge), Claude Project (XML), CLAUDE.md, .cursorrules, Gemini (sys+context), universal MD. Use-case filters (meeting/decision/code/board…), hot/warm fact temperature, token budget. This is the "take your brain to any AI tool" product surface. |
| `_shared/context-builder.ts` (`buildLLMContext`) | **The assessment/quiz layer** (`leaders`, `assessment_events`, `leader_dimension_scores`) | LLMContext for assessment_analyzer / portfolio_analyzer / session_synthesizer. **Legacy `any`-typed, `console.warn` emoji debug, reads `leaders`/`assessment_events` — the older Mindmaker-assessment lineage, NOT the briefing path.** Largely orthogonal to the magic. |

The briefing magic is `user-context.ts` + the lens/scoring/curation trio. `memory-context-builder.ts` is the *other* magic (portable context). `context-builder.ts` is the legacy assessment plumbing.

---

## 5. Personalization knobs that genuinely differentiate (data-backed)

1. **Per-briefing-type weight tables** (lens) — same profile, 8 different prioritizations. Real, deterministic, demoable.
2. **`learningStyle` → tone** (`buildCohortToneDirective`): compass_tier (leading/advancing/establishing/emerging or strategic_visionary/pragmatic_executor/…) changes whether the brief leads with implications, actions, numbers, or team-impact. Sourced from the Edge assessment's `voice_sessions.compass_tier`.
3. **Declared interests** (weight-1.0, 0.8 floor) + **excludes** (semantic 0.80 filter) + **kills** (signature-keyed -1.0) = a user-owned relevance model.
4. **Feedback loop, two places:** (a) `feedbackPreferences` (preferred tags/sources) flow back into v1 curation; (b) `briefing_lens_feedback` deltas reshape the v2 lens. `briefing-diagnose` + `briefing-aggregate-feedback` close it.
5. **Matched-fact transparency:** every v2 segment can answer "why am I seeing this?" with the exact profile fact + score. `briefing-diagnose` exposes the whole lens/queries/feedback read-only ("why did I get these headlines?"). **This is the honesty mechanism that lets you market magic without faking it** — the receipts are queryable.

---

## 6. What is dormant, faked, or weak (data-realist)

- **v2 is OFF by default** (`BRIEFING_V2_ENABLED_DEFAULT` → `"false"`). The headline differentiator only runs for env-flipped or hand-opted-in users. *The magic is built and dark.* **Highest-leverage fix: turn it on (after a burn-in) for the whole base.**
- **`STATIC_FALLBACK`** (lines 582-591) — 8 hardcoded fake headlines ("Claude 4 outperforms GPT-5…") served when ALL providers fail in v1. It's flagged `used_fallback: true` (honest in the payload) but a user could receive stale invented news on a bad-provider day. v2 instead returns an honest empty "no new stories worth your time today" state (lines 1410-1422) — strictly better behavior. Another reason to default v2 on.
- **`ai_landscape` briefings are synthetic** — generated from Artificial Analysis benchmark rows (`generateAILandscapeHeadlines`), not live news. Legitimate (real benchmark data) but they bypass the lens entirely and stay on v1 by design.
- **Sparse-profile guardrail** (depth <5 = interests+missions+decisions): returns a `profile_too_sparse` onboarding signal instead of a generic brief. Good — but means the magic is **invisible until the user has fed it ≥5 signals.** Onboarding must front-load this or the first brief underwhelms.
- **`context-builder.ts` is legacy/untyped** (`any` everywhere, reads `leaders`/`assessment_events`) — not wired into the briefing; carries assessment-era debt.
- **The lens LLM reweight is best-effort** — on any failure it silently falls to the deterministic lens. Quality degrades gracefully but invisibly; no signal to the user that they got the cheaper path.
- **`hashPrompt` is a weak 32-bit non-crypto hash** (`ai-cache.ts`) — fine for cache keys, but collisions are theoretically possible across users' lens cache. Low risk; worth noting since cache values include embeddings.

---

## 7. How it SHOULD wire (only magic the data can back)

1. **Flip v2 to default-on** after a short burn-in. Everything downstream of this is the actual product. The single biggest lever.
2. **Surface the receipts in the UI.** Each segment already carries `matched_profile_fact` + `relevance_score`. Show "Because you're tracking [watchlist:Anthropic] · 0.71" under each story. This *is* the magic made legible — and it's free, the data already exists. Honesty becomes the feature.
3. **Make sparse-profile onboarding the magic-unlock moment**, not a dead-end: convert `profile_too_sparse` into a 60-second "add 5 signals → watch your first real brief assemble" flow. The depth gate is correct; the UX around it is the conversion risk.
4. **Kill `STATIC_FALLBACK` on v2** (already done — empty honest state). Ensure v1 retirement so no user ever gets invented headlines.
5. **Close the loop louder:** the thumbs already reshape the lens (`briefing_lens_feedback`). Tell the user "Got it — you'll see less of [killed topic]." Make the learning visible; an invisible learning loop reads as no learning.
6. **Promote `briefing-diagnose` to a user-facing "Why these?" panel.** It already reproduces the exact lens/queries/feedback read-only. It's an audit tool today; it's a trust-and-magic surface tomorrow.
7. **Don't claim fine-tuned ML.** The honest, still-impressive claim: "a weighted model of your priorities, scored against live news by embeddings, with editorial taste version-controlled in one file and a feedback loop you control." That's defensible and true.

---

## 8. Differentiation summary — what no prompt-only competitor can copy

- An **explicit, weighted, per-briefing-type lens** over a six-table profile (not a prompt dump).
- **Embedding-scored relevance with a stored number + matched fact per story** (auditable, not asserted).
- A **user-owned relevance model**: declared interests (floored), semantic excludes, signature-keyed kills, all applied before the LLM.
- **Editorial taste as a regression-tested YAML corpus** (voice, must-include/drop taxonomy, rubrics, exemplars) — tunable without deploy.
- A **feedback loop that mutates the lens weights**, plus a read-only diagnose endpoint that explains every choice.
- **Proactive decision-watch alerts** woven into the morning brief.

The moat is real. The risk is that it's **shipped dark** (v2 default-off) and **un-surfaced** (the receipts exist in the DB but not on screen). Turning it on and making it legible — not building anything new — is the magic.

---

### Key file map (absolute paths)
- `C:/Users/krish/mm-ctrl/supabase/functions/generate-briefing/index.ts` — both pipelines + handler + v2 orchestrator (`runV2Pipeline` line 1313)
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/user-context.ts` — briefing context loader + `toLensSource`
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/briefing-lens.ts` — Stage 1 lens + Stage 2 query planner + industry bias
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/briefing-scoring.ts` — Stage 4 embed/dedupe/score (the quantified relevance)
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/briefing-curation.ts` — Stage 5 budget-constrained picker
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/training-loader.ts` + `C:/Users/krish/mm-ctrl/training/anchor.yaml` — the "training" corpus
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/memory-context-builder.ts` — the OTHER magic (portable per-tool export)
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/context-builder.ts` — LEGACY assessment plumbing (not the briefing)
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/decision-alerts.ts` — proactive alert prepend
- `C:/Users/krish/mm-ctrl/supabase/functions/briefing-diagnose/index.ts` — "why these headlines?" read-only audit
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/ai-cache.ts` — lens/embedding cache (note weak `hashPrompt`)
- `C:/Users/krish/mm-ctrl/supabase/functions/_shared/model-router.ts` — dynamic cheapest-meets-quality model selection (AA benchmarks)
