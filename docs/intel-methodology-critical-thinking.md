# Intel Distillation — The Critical-Thinking Methodology CTRL Encodes

**Track:** THE CRITICAL-THINKING METHODOLOGY (the reasoning scaffolds that make CTRL *think* differently from a generic chatbot).
**Sources read in full:** `C:/Users/krish/ctrl-corpus/_src/critical-thinking.md` (76KB, 2106 lines — Krish's "LLM Critical Thinking & Advanced Reasoning Training Manual") + `C:/Users/krish/ctrl-corpus/_ingest/doc-critical-thinking.md` (the prior framework-level distillation).
**Grounded against live code:** `mm-ctrl/supabase/functions/decision-engine/{decompose,verify,crossexamine,advise}.ts`, `decision-watch/index.ts`, `synthesize-edge-profile/index.ts`, and `src/components/operator/decision/CriticalCallStep.tsx`.

> This file does NOT re-list the five frameworks at framework altitude (doc-critical-thinking.md already did that well). It goes one level deeper and answers the founder's actual question: **what is the encodable critical-thinking machinery, and HOW does each piece become a specific engine behaviour — a system-prompt rule, a synthesis step, a guardrail, or a UI moment — that no generic chatbot has?** Each item below is: NAME → the actual content/steps → ENCODES AS (the precise product behaviour, marked LIVE / PARTIAL / DORMANT against today's code).

---

## 0. THE ONE LOAD-BEARING DISTINCTION

A generic chatbot **answers**. CTRL is built to do five things a chatbot structurally does not:

1. **Decompose before it judges** — break the input into typed, falsifiable claims and only then reason about each. (Live in `decompose.ts`.)
2. **Verify before it asserts** — ground load-bearing claims against the web, and let confidence *track the evidence* rather than the fluency of the prose. (Live in `verify.ts` → `advise.ts`.)
3. **Argue against itself on purpose** — generate the strongest honest counter-case and the single breakpoint assumption, every time, not as a token gesture. (Live in `crossexamine.ts` + `advise.ts`.)
4. **Make the human reason first** — withhold the machine's verdict until the leader has made their own call on the load-bearing claim. (Live in `CriticalCallStep.tsx`.)
5. **Refuse to be the decider** — output is framed as "informed by AI analysis, not determined by it"; the human stays the final authority.

The manual's one-line thesis, verbatim: **"Decision quality depends on *how we think*, not just *what we know*."** And: **"LLMs are designed to generate plausible-sounding text, not necessarily true or well-reasoned text."** CTRL's whole differentiator is the machinery that closes the gap between *plausible-sounding* and *well-reasoned*. The "feeling of magic," kept honest, is the user watching a decision get **decomposed → verified → red-teamed → handed back to them with a confidence band**, instead of getting a confident paragraph. That sequence is the magic, and it is real, not faked.

---

## 1. THE MENTAL MODELS, AS ENGINE BEHAVIOURS

### M1 — Claim Decomposition + Typing (the reliability lever)
**Content:** Don't reason over a decision as a blob. Break it into 3–8 single, specific, *testable* statements and **type each one**: `factual` (checkable now), `market` (size/growth/pricing/competitor, checkable), `causal` (X→Y, partially checkable, often contested), `assumption` (taken as given, NOT web-verifiable), `forecast` (future projection, NOT web-verifiable). Mark `is_load_bearing = true` for any claim where, if false, the whole decision fails. The source comment names the principle exactly: *"This typing step is the biggest reliability lever: models classify reliably even where they adjudicate unreliably."*
**ENCODES AS (LIVE):** `decompose.ts` system prompt — "You do not judge whether the decision is good. You only decompose." This is the structural reason CTRL's Decide engine outperforms a chatbot: it separates *what is being claimed* from *whether to believe it*, and it knows which claims are even checkable (factual/market) versus which are bets (assumption/forecast). A chatbot collapses all of these into one confident answer; CTRL never lets an unverifiable forecast borrow the credibility of a verified fact.
**Maps to manual:** First-Principles "What is this problem *made of*?" + the CoT discipline of intermediate steps before the answer.

### M2 — Evidence-Tracking Confidence (the anti-hallucination guardrail)
**Content:** The manual's sharpest rule: *"If confidence is high but reasoning weak, that's a red flag."* Confidence must be *caused by* evidence quality, not by linguistic fluency. The "King" thought experiment (European king ~70% / Arabian king <30% / chess piece <1%) is the teaching device for *why* a fluent answer is not a true one — the model emits the statistically dominant token, not the correct one. Confidence bands: **High (80%+)** grounded in clear data / similar to known cases; **Medium (50–80%)** judgment calls, alternatives exist; **Low (<50%)** novel, ambiguous, expert human input essential.
**ENCODES AS (LIVE):** `advise.ts` hard rule — *"Your confidence must track the evidence. If load-bearing claims are unverified or contested, your confidence must be low and you must say why."* The synthesis stage clamps `confidence` to [0,1] and **forces it down** when the cross-examination panel disagreed (`if (adversarial.disagreement) confidence must be lower`). The UI moment: every Decide verdict and every Edge identity read should carry an explicit band + named *sources of doubt*. This is the guardrail that makes CTRL trustworthy precisely where chatbots are most dangerous — high confidence on weak ground.
**Guardrail to add (PARTIAL):** make the confidence band a first-class, always-on UI element on EVERY AI output in the app (briefing, board memo, export), not just Decide. Today only Decide truly does this.

### M3 — The Mandatory Counter-Case + Breakpoint (built-in devil's advocate)
**Content:** Dialectical Tension, operationalized: thesis → antithesis → synthesis, but the engineering insight is to make the antithesis **non-optional and non-token**. The manual: *"Always include the strongest honest counter-case, not a token one."* And the single most distinctive move — name the **breakpoint**: "the single assumption or claim whose failure most breaks the decision."
**ENCODES AS (LIVE):** Two layers in code. (1) `crossexamine.ts` runs an explicit *adversarial red-team*: a "sharp, skeptical board member" whose "only job is to argue against the decision using the verified claims" and return `{ refutation, breakpoint_claim_index }`. (2) `advise.ts` returns `counter_case` + `breakpoint_claim_index` as required JSON fields — the output schema literally cannot omit the counter-argument. The UI moment: the verdict surfaces the counter-case and pins the one breakpoint assumption to watch. **This is the encoded form of "Play devil's advocate. What am I missing?" made structural rather than something the user must remember to ask.**
**Product rule to generalize (PARTIAL):** every CTRL output (not just Decide) should expose a first-class "strongest argument against this" / "what am I missing?" affordance, so premature convergence is *hard to do inside the app*.

### M4 — The Model Panel + Surfaced Disagreement (compare-LLM-outputs, automated)
**Content:** Manual Practice 5: ask multiple models the same question; *"divergence reveals where uncertainty lives."* Don't average it away — surface it.
**ENCODES AS (LIVE, Edge Pro):** `crossexamine.ts` runs a 4-model panel — `["claude", "gpt-4o", "gemini", "grok"]` — each judging the verified breakdown independently and returning `{ lean: support|oppose|uncertain, key_risk }`. When the leans split (some support, some oppose), `disagreement = true`, a `disagreementNote` is generated, and that disagreement is **fed forward as a confidence penalty** into `advise.ts`. The honest-magic point: a chatbot is one model's confident voice; CTRL shows the leader *where four independent reasoners diverge* and lowers its own conviction accordingly. Disagreement is treated as signal, not noise — the manual's "ambiguity as a resource."

### M5 — Make-Your-Own-Call Gate (the upskilling discipline, anti-dependency)
**Content:** The manual's deepest warning is that AI over-reliance *atrophies the very skill leaders need* ("when professionals outsource reasoning to LLMs, they stop practicing reasoning skills, creating atrophy"). The antidote it prescribes is the Socratic method — make the human reason first. CTRL's keystone implementation of this is to **withhold the verdict** until the human commits a call.
**ENCODES AS (LIVE UI moment):** `CriticalCallStep.tsx` — *before* CTRL's read is revealed, the user must judge the breakpoint claim (else the first load-bearing claim) as "It holds / It does not / Not sure" plus optional reasoning ("Why? (optional, but the reps add up)"). The component doc says it plainly: *"CTRL's verdict is deliberately hidden here so the judgment is genuinely theirs."* Button copy: **"Lock in my call and see CTRL's read."** This is the single most important critical-thinking behaviour in the entire app — it is the one place the product makes the leader *sharper* rather than more dependent. It is "informed by AI, not determined by it" rendered as an actual interaction.
**The known gap (DORMANT downstream):** `recordCall()` writes the user's call to `decision_user_calls`, but per the synthesis spine the captured judgment is **dropped** — never compared back to CTRL's verdict, never fed into the memory/learning loop. The rep happens; the loop that would close it (you said it holds, CTRL + the web said it breaks — here's the gap) is unwired. Closing this is the highest-leverage critical-thinking upgrade available.

### M6 — Profile-Tension Detection (reflective equilibrium, automated against the leader's own context)
**Content:** Reflective Equilibrium (Rawls): a decision must stay coherent with stated values/objectives; "optimization of metrics at expense of integrity creates strategic incoherence." Generalized in CTRL to: a decision must not silently contradict *the leader's own stated objectives, blockers, and recent decisions*.
**ENCODES AS (LIVE):** `decompose.ts` emits `profile_tensions` — "contradictions between this decision and the leader's stated objectives, blockers, or recent decisions" with `severity: low|medium|high`. The context is pulled from the Memory Web (role, company, industry, objectives, blockers, recentDecisions, confirmedPatterns) and fed into the prompt. `advise.ts` then folds those tensions into the recommendation. This is reflective equilibrium running automatically: CTRL checks the new call against the leader's *own* prior principles and flags drift. A chatbot has no memory of what you told it last week; CTRL's edge is that the equilibrium check is against a persistent, owned context layer.
**To extend (PARTIAL):** the manual's explicit three resolution options — (a) adjust the decision, (b) refine the principle's interpretation, (c) accept genuine conflict and choose — should be the offered next-actions when a high-severity tension fires. And CTRL should *remember the leader's stated values/never-rules* as a first-class object to run equilibrium against (today it leans on objectives/blockers, not an explicit values layer).

### M7 — A/B Framing / Robustness-to-Framing (System-2 trigger)
**Content:** Framing effect (Tversky-Kahneman, Asian Disease Problem): "our preference for an option is often a quirk of presentation, not genuine superiority." The test: reframe positively AND negatively ("80% success" ⇄ "20% failure") and ask — **"Does the recommended choice remain robust to framing?"** Forces deliberate System-2 thinking.
**ENCODES AS (DORMANT — the clearest build gap in this track):** This is *not* yet a distinct engine step. It is latent — `crossexamine`/`advise` produce a counter-case, which partially covers it — but there is no explicit "show this recommendation in both frames, flag if the optimal choice flips" behaviour. **Encodable as:** a one-tap "flip the frame" affordance on any recommendation that re-renders the same data as upside/downside and explicitly flags when reframing changes the call. This is a cheap, high-magic UI moment that is pure encoded critical thinking and currently missing.

### M8 — Five Whys / First-Principles "strip the assumption" mode
**Content:** "Relentlessly ask 'Why?' to separate hard constraints from self-imposed assumptions." The red-flag phrase to detect: *"We're doing this because it's industry standard"* — treat that as a prompt to dig, not a reason. Rebuild from the fundamental need.
**ENCODES AS (DORMANT):** No explicit Five-Whys/first-principles affordance exists in the live app. The `assumption`-typed claims from `decompose.ts` are the raw material (CTRL already isolates the unvalidated assumptions). **Encodable as:** a "strip the assumption" mode on any assumption-typed claim — "you're treating this as given; what's the underlying need, and is the constraint real or inherited?" This turns the already-extracted assumptions into a Socratic drill rather than just a list.

### M9 — WOOP / Mental Contrasting as the goal primitive
**Content:** Oettingen's WOOP = **W**ish → **O**utcome (best-case) → **O**bstacle (the real barrier, named *before* committing) → **P**lan (mitigate, or decide it's not worth it). "Expectancy-dependent commitment": goals that survive the contrast deserve commitment; goals that don't should be *weakened or tabled* — and the app being willing to say "table it" is a feature.
**ENCODES AS (DORMANT in CTRL proper):** No WOOP goal-setting primitive in the live decision flow. CTRL has goal systems (`goals`, `leader_missions`) but they don't run the contrast. **Encodable as:** when a leader sets an objective, walk Wish→Outcome→Obstacle→Plan and output a feasibility probability + named obstacle + mitigation, with the courage to down-weight goals that fail the contrast. The manual's vivid warning to encode here: don't let outputs join *"the graveyard of stalled pilots"* — clarity without committed follow-through is worthless.

### M10 — Question Transformation (the highest dialectical move)
**Content:** The most advanced move in the manual: don't answer "How do we solve X?" — surface the hidden assumptions *inside X* and re-ask a deeper question. *"Often the question itself contains hidden assumptions."* (AERIS's core, e.g. reframing "How do we become AI-first?" into "AI-optimized for strategic advantage in specific domains.")
**ENCODES AS (DORMANT):** Not present as a behaviour. **Encodable as (use sparingly, high-value):** a CTRL move that occasionally says, in effect, *"the real question isn't X, it's Y"* — surfacing the assumption baked into the leader's framing. This is the most "intelligent-feeling" behaviour in the whole manual and is entirely absent today. Guardrail: deploy rarely and only when a genuine hidden assumption exists, or it becomes annoying-clever.

---

## 2. THE TWO STANDING GUARDRAILS (always on, system-prompt level)

These are not per-feature; they are the constitutional rules every CTRL reasoning prompt should carry:

**G1 — Domain humility / scope fence.** `advise.ts`: *"Commercial and strategic judgment only. Never give medical, legal, or financial-investment advice. If the decision strays into those, say so and recommend a qualified professional."* This is the manual's "Domain-Specific Skepticism" (Practice 2) encoded as a hard refusal. The deeper version: the manual says *outside your expertise apply EVEN HIGHER scrutiny* — so CTRL should eventually scale how hard it pushes verification based on whether the topic is inside or outside the leader's known expertise (a thing it could learn and remember).

**G2 — Assume-hallucination-until-verified.** Manual Practice 1: *"Treat all LLM outputs as potentially false until independently verified."* Encoded as the architecture itself: the Decide engine does not assert load-bearing claims without running `verify.ts` against web sources first, and the WATCH loop (`decision-watch`, hourly pg_cron) **re-verifies load-bearing claims over time** and raises `decision_alerts` when an assumption shifts — i.e., the verification never fully ends. A high-stakes output should be labellable *"draft analysis, requires verification"* with the manual's 6-step verification workflow (get analysis → devil's-advocate → cite sources → check logic A→B → human-expert check → **decide informed by, not determined by**).

---

## 3. THE LIVING-DECISION LOOP (critical thinking that doesn't expire)

The manual frames verification as a *workflow*, not a one-shot. CTRL's most distinctive encoding of this is **`decision-watch`**: an hourly cron that re-runs verification on the load-bearing claims of past decisions and raises idempotent alerts into the Daily Briefing ("an assumption changed / +N more → review the decision"). This is critical thinking with a half-life: the breakpoint assumption CTRL named at decision time becomes the thing it *keeps watching*. No chatbot does this — it has no persistence and no notion that yesterday's verified claim might be false today. This is the cross-wire that makes CTRL feel alive and honest: the magic is that it comes back and tells you when the ground moved.

---

## 4. THE INTEGRATED 5-STEP SPINE (the canonical sequence to embody)

The manual's "Integrated Decision Process" is the order CTRL's Decide flow should embody end-to-end:
1. **First-Principles** — identify the real goal / strip assumptions (M8) → maps to `decompose.ts` claim-typing.
2. **Mental Contrasting (WOOP)** — feasibility + named obstacle (M9) → currently the gap.
3. **Dialectical Reasoning** — counter-case + breakpoint + panel (M3, M4) → `crossexamine.ts`.
4. **A/B Framing** — robustness to framing (M7) → currently the gap.
5. **Reflective Equilibrium** — coherence with the leader's values/objectives (M6) → `decompose.ts` profile_tensions.
→ Result the manual promises: *"strategic clarity on complex issues no single technique could provide alone."* CTRL today runs 1, 3, 5 well; 2 and 4 are the missing rungs.

---

## 5. THE FELT OUTCOME (honest magic, target state)

Every simulated dialogue in the manual ends the same way: the executive says **"I feel confident about the decision now"** / "this reflects our principles, not just the AI's suggestion." The target felt-state is named precisely: **earned conviction, not borrowed certainty.** The synthesis spine calls it "earned conviction and calm command."

The engineered feeling of magic, kept data-realist:
- **The magic is the sequence, shown:** decompose → verify against the live web → red-team → confidence band → handed back to you to call. The user *watches their decision get pressure-tested by something that argues with itself and checks the web*. That is irreproducible by a chatbot and it is true.
- **Honesty is the magic's guarantor:** confidence tracks evidence; the counter-case is non-token; disagreement lowers conviction instead of being smoothed away; scope is fenced; and a green tick is never shown without the verified artifact behind it. The manual's discipline IS the honesty rail — magic that never overclaims.
- **The anti-magic to avoid:** a confident paragraph with no decomposition, no verification, no counter-case, no band — i.e., a chatbot wearing CTRL's skin. The manual is an explicit inoculation against shipping that.

---

## 6. ENCODABLE CHECKLIST (name → behaviour → status)

| Mental model | Engine behaviour | Where | Status |
|---|---|---|---|
| Claim decomposition + typing | classify before judging; isolate unverifiable bets | `decompose.ts` | LIVE |
| Evidence-tracking confidence | confidence must track verdicts; clamp + penalize on disagreement | `advise.ts` | LIVE (Decide only) |
| Mandatory counter-case + breakpoint | required JSON fields; adversarial red-team | `crossexamine.ts`, `advise.ts` | LIVE |
| Model panel + surfaced disagreement | 4-model vote; divergence → confidence penalty | `crossexamine.ts` | LIVE (Edge Pro) |
| Make-your-own-call gate | withhold verdict; capture user's call first | `CriticalCallStep.tsx` | LIVE (capture); loop DORMANT |
| Profile-tension / reflective equilibrium | flag contradictions vs leader's objectives/blockers | `decompose.ts` | LIVE; values-layer + 3 resolutions PARTIAL |
| Standing guardrails (scope fence, assume-hallucination) | hard refusal + verify-before-assert + WATCH re-verify | `advise.ts`, `verify.ts`, `decision-watch` | LIVE |
| A/B framing robustness | flip-the-frame, flag if optimal choice flips | — | DORMANT |
| Five Whys / strip-the-assumption | Socratic drill on assumption-typed claims | — | DORMANT |
| WOOP goal primitive | Wish→Outcome→Obstacle→Plan + feasibility, willing to table | — | DORMANT |
| Question transformation | "the real question isn't X, it's Y" | — | DORMANT |
| Confidence band on EVERY output | always-on UI band + sources of doubt app-wide | — | PARTIAL (Decide only) |
| Close the make-your-own-call loop | compare user call vs CTRL read; write back to memory | — | DORMANT (highest leverage) |

---

## 7. VOICE NOTES FOR THE ENGINE (verbatim, for prompts/copy)
- "Decision quality depends on how we think, not just what we know."
- "Your confidence must track the evidence." / "If confidence is high but reasoning weak, that's a red flag."
- "Always include the strongest honest counter-case, not a token one."
- Name "the single assumption or claim whose failure most breaks the decision" = the **breakpoint**.
- "Informed by AI analysis, not determined by it." / "Maintain human judgment as the final decision authority."
- "Assume all LLM outputs are potentially false until independently verified."
- "Does the recommended choice remain robust to framing?"
- "We're doing this because it's industry standard" = a red flag, not a reason.
- The "graveyard of stalled pilots" — clarity without follow-through.
- "Write the way a sharp operator talks." / "No em dashes. No filler." (already a hard rule in `advise.ts`.)
- The felt target: "I feel confident about the decision now" = **earned conviction, not borrowed certainty.**
