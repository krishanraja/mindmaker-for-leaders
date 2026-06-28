# The CTRL Corpus - What This App Must Be

**Last reconciled:** 2026-06-28 (date bump; content verify-clean).

> **RECONCILIATION BANNER (2026-06-21; date-bumped 2026-06-28).** This Corpus was written under the earlier "clarity engine" positioning. That headline is now SUPERSEDED. The LOCKED positioning (2026-06-19) is: CTRL is the tool for building, orchestrating, productizing, and getting to market **the AI-native version of your business**, not a general clarity engine and not a general business advisor. General-business inputs are reframed into the AI-native lens. Read this Corpus for its product philosophy and the intelligence-layer thinking (still valuable), but where it frames CTRL as "clarity / see one step clearer", substitute the AI-native positioning. Canonical: `docs/MAIN-APP-POLISH-SPEC.md` (esp. section 0), `docs/KIT-REDESIGN-SPEC.md`, root `README.md`. TODO(founder): decide whether this Corpus is rewritten to the AI-native positioning or retired in favour of the two specs.

> (Original headline, retired) "CTRL is a clarity engine. You can't see through your own business. I help you see one step clearer, today."

> **STATE AS OF 2026-06-17.** This Corpus was written as the destination. It is no longer aspirational: the destination has largely been built. The clean-room dark instrument redesign shipped live (PR #186, 2026-06-16), the brain/intelligence engine landed across PRs #153-164 and the "limits" phases #187-189, the kit program shipped across #190-193, and the learning loop that this document said was "unplugged" is now wired. The original future-tense framing is kept where it still reads as the standing vision; where it described missing or cut wiring, it is corrected to what shipped, and the honest residual gaps are listed at the end of Part II. The rebuild-vs-overhaul question parked in §16 was answered (clean-room frontend rebuild on the existing Supabase backend) and executed. Read this as "this WAS the destination, and here is what shipped against it." (updated 2026-06-17)

*This is the single source of truth for what CTRL is, who it serves, and how it must feel. It is opinionated on purpose. It sits above the build: it decides the destination, not the route. The tactical and architectural choices once parked in the final section (rebuild vs overhaul, pricing, sequencing) have since been decided and are noted inline.*

*It has two halves, and the second is the more important one. **Part I - The Product** is what a leader feels: the promise, the loop, the experience. **Part II - The Intelligence Layer** is the engine beneath it - the methodology, the data wiring, and the synthesis that make CTRL's results impossible to copy. Per the founder, and correctly: **the product wins or loses on the engine, not the screens.** Features are the body; Part II is why no other app gives the same results.*

*Everything here was earned - from Krish's own thought-leadership (the decks, the ICP work, the prompt packs), a full map of the live app, a 22-question interrogation of Krish's taste, and a deep dive into the real pipeline code. Where taste and the old plan disagreed, taste won. The full technical brief behind Part II lives in `_INTELLIGENCE-LAYER.md`; this Corpus carries its spine.*

*Read it the way the product should feel: each section opens with the one true sentence, then earns it.*

---

# PART I - THE PRODUCT (what the leader feels)

## 1. The leader we serve

**Our user is a time-poor senior leader running a business that has become a spaghetti they can no longer see through.** They are the "Accountable Delegator": accountable for outcomes, forced to delegate more than ever, and now delegating to a second species of worker - AI - that they don't yet know how to govern. They barely read the news. They have no time and no budget for a two-year transformation programme, and they wouldn't read the deck if they did.

They do not need transformation. **They need to see one step clearer, today** - and then again tomorrow. Their scarcest resources are attention and clarity, not information. Give them more information and you have added to the spaghetti. Give them *one clear next step* and you have done the only thing that matters.

Everything below follows from this one person.

## 2. The promise: a clarity engine

**CTRL's job is to turn a leader's chaos into one clear step they can take with conviction.** Not a dashboard. Not an oracle. Not a content factory. A clarity engine.

The felt promise - the thing they should be able to say after a few weeks - is **"I have a sharper edge, and I can see what to do next."** In their own ranking, "sharper edge / becoming a future-proofed leader" beat every other outcome, and "calm command" came last. CTRL sells *edge and clarity*, and it is unembarrassed that this is also a status good: it should make a leader feel like an elite, AI-native operator who is ahead of their peers. That feeling is not vanity; it is the proof that the edge is real.

Positioning, in one line: **the anti-consultant.** Where a transformation programme gives you a plan you can't afford and won't finish, CTRL gives you repeated small clarity - one clearer step at a time.

## 3. The Clarity Loop (how it works)

**The method is the product.** The way this very Corpus was produced - taking a pile of disparate, half-built thinking, zooming out, and navigating it down to clarity through guided, enjoyable, option-based choices - *is the experience CTRL must deliver.* It is not a process behind the product; it is the product.

The loop, every time:

1. **Digest** the chaos on the leader's behalf - their signals and the world's. They should never face a blank page.
2. **Reflect** it back as a *small set of sharp, personalized choices*. Options to pick - never an open question that makes a tired CEO think from zero.
3. Let them **navigate** and author their own clarity. They do the first and last 20% themselves; that is where judgment is sharpened and ownership is earned.
4. **Bank** one tangible step forward - and quietly capture, in the act of taking it, the data that makes tomorrow's loop sharper.

Every screen, feature, and interaction in CTRL is either part of this loop or it is in the way. The loop only compounds if step 4 actually wires back - which is the whole burden of Part II.

## 4. What CTRL is for - and what it isn't

**CTRL helps with one narrow, high-stakes family of decisions: the calls a leader must make because of AI.** It is deliberately *not* a catch-all. Three fields of vision are in scope:

- **(a) AI adoption & tooling** - build / buy / wait on a capability; which tools and workflows to roll out; where to deploy AI first.
- **(b) Org & role re-architecture** - what to automate vs keep human; how teams and roles change as AI absorbs tasks (the agentic org chart).
- **(c) Strategic bets under AI disruption** - positioning, go-to-market, up/down-market moves; where the market is heading because of AI.

Talent and capital-allocation questions are served *as facets of a-c*, not as their own modes. A leader's own personal skill-leverage ("what should *I* get good at") belongs to the Kit (see §5).

**What CTRL is NOT** - and these are load-bearing:

- **Not a content factory.** It does not write your board memos, decks, or posts as a destination. It can hand you a sharp scaffold to take elsewhere, but the moment it tries to be where you *do the work*, it becomes the spaghetti.
- **Not a catch-all decision tool.** If it helps with everything, it helps with nothing. Narrow field of vision is a feature.
- **Not an operator.** It does not run your agents or take irreversible actions for you - not yet, and not by default. It is a chief of staff, not a chief operating officer.
- **Not a transformation programme.** No two-year plans. One clearer step.
- **Not magic the data can't back.** See §6, Law 1, and all of Part II.

## 5. The architecture: two products, one spine

**There are two distinct jobs hiding in today's app, and they must fork cleanly instead of fighting inside one screen.**

- **The Kit** owns the *practitioner* job - "help me get better at using AI": small daily wins, habit-forming, personalized skills and markdown that train the leader's own AI tools, time clawed back from work they dislike. This is the cohort-facing **wedge**. It is easy to deliver, tangible week over week, and it is a superb **data engine**.
- **CTRL proper** owns the *clarity* job - the executive decision partner of §2-§4.

They share **one memory and identity spine** (§7, and wired in Part II). The Kit is the on-ramp: it earns trust, delivers immediate wins, and collects the data that lets CTRL get sharp - then **graduates** the leader into CTRL as their context thickens. One spine, two front doors, no overlap. Each stays simple because each does one job.

## 6. The ten laws of the experience

These are the design laws. They came directly from Krish's rankings, and they overrule any feature's convenience.

1. **Data realism above all.** Never promise magic the data can't deliver. The "perfect synthesized signal" was ranked *last* precisely because we can't get it right often enough to earn the screen. Assume there is less data than we'd like. Assume the user will not let the app "watch" things and will not report back like it's their manager. Design for a sparse world and a busy human.
2. **Options, never open questions.** Always present personalized choices to pick from. An open prompt that forces a tired leader to think from zero is a failure, however "empowering" it looks.
3. **Sharpen judgment; never automate it.** The leader does the first and last 20%. CTRL informs with options and confidence bands; it does **not** force a "commit first, then I'll grade you" gate, and it does not hand down the answer.
4. **Spar with evidence.** When CTRL challenges a leader, it comes with facts, cases, and proof of what comparable decision-makers did - never contrarianism for its own sake.
5. **Personalization is the price of entry.** Anchor on deterministic facts (company, role, personal AI-maturity, role goals re AI, the big decisions facing the business in the next ~6 months). Then let them paste a non-sensitive reply from an AI tool they already use for instant rich inference. Then capture the rest *covertly, tied to outputs they actually want.* No generic outputs, ever.
6. **The memory web is the hook.** Watching your "digital brain" build is the felt proof that it's learning - keep it, and make it the thing you tap to verify and edit, not a read-only ornament. (It earns the word "learning" because the wires in §13 are now closed; the brain four-world rope canvas shipped in PR #186 and the fact-to-fact edge graph in #187-189.)
7. **Quality must be real; kill the vanity metrics.** "You're 12% sharper this week" was ranked last. Let genuine quality speak; never perform learning the product isn't actually doing.
8. **Correction must be effortless.** "That's not me" should cost one tap (a thumbs-down), and the fix should stick - as a rule, not just an edit (§12, §13).
9. **Mobile consumes and captures; desktop creates.** Mobile is the 5-minute, one-handed clarity loop and the place context is captured. Desktop is the command center where the real thinking, drafting, and curation happen.
10. **Adapt to the leader's conviction-state, and stay warm.** Read whether they feel *under-armed and need help* or *convicted and want to act*, and change pace and density accordingly. Speak warmly and personally - use their name, be on their side. End every session by handing agency back.

## 7. The spine: Identity · Memory · Self-Correction

**One owned, portable, compounding layer underneath both products - the leader's context, captured once and sharpened forever.** Krish's decks name three objects relentlessly; the app once had one and a half of them with the learning between them unplugged. All three are now built and wired (the brain engine, PRs #153-164 and #187-189; the redesigned brain canvas, PR #186).

- **Identity** *(SHIPPED).* Who this leader is as an operator: role, voice, standards, and never-rules. Once half-buried in the "strengths/gaps" read, it is now a first-class, user-owned object - "same model, a different employee." Voice is *mined from their real writing*, never self-described, and every inferred trait is flagged `confident | guessing`.
- **Memory** *(SHIPPED, unified).* The curated facts: the business, the top priorities, decisions made, the people and bets. "Sharp beats big." Once fractured across three UIs, it is now **one capture, one verify, one edit, one view** - and the brain four-world rope canvas (PR #186) is the place you do it. The fact-to-fact edge graph, evidence tiers, and track-record depth landed in #187-189.
- **Self-Correction** *(SHIPPED - the keystone is built).* The loop that turns every correction into a kept rule, so the same mistake doesn't recur. It was the deck's centrepiece and the thing the app most conspicuously lacked; it now exists, governed by Law 1 - built on corrections the leader actually makes in the flow of getting value, not on a fantasy of constant reporting. (The brain canvas Strengthen/Fix *actions* are present in the UI but currently disabled pending their backend RPC - see the residual-gaps note in Part II.)

How these three are captured, stored, and wired into one compounding loop is the whole of Part II.

## 8. The mobile experience (the daily loop)

**Five minutes, one hand, on the train: digest → one clear choice → one step banked.** Mobile is the Clarity Loop in its purest form, and nothing heavy is allowed on it.

- It opens with something **real and already prepared** - grounded in what we genuinely know (a familiar, well-made digest of what's moving against their named bets; or a living decision that something just changed around). Not an empty "Generate" button, and not an over-promised "perfect signal" we can't reliably produce.
- It offers **one decisive next move**, framed as a choice, not a blank.
- Taking the move **captures context** as a side effect - consume and capture, per Law 9.
- It **closes by handing agency back** - "what should I keep an eye on?" - and reinforces the one step they just took.

What is explicitly *not* on mobile: the dense decision verdict, deep memory-web exploration, and any artifact composition. Mobile moves the leader one step; it does not try to deliver all of the value.

## 9. The desktop experience (the command center)

**Desktop is where the leader does the real thinking the mobile loop tees up.** It is genuinely different from mobile, not a bigger copy.

It is the place to: explore and curate the memory web; sit with a decision properly - options, confidence bands, the counter-case, the one assumption that would change everything; compose the scaffold artifacts that get taken elsewhere; and tune what CTRL watches. Density adapts up here because the context allows it - but it still obeys the laws: options over open questions, evidence-backed, judgment-sharpening, no vanity metrics.

## 10. What gets kept, merged, and killed

**Lose nothing valuable; surface almost nothing by default. The test for every feature: does it serve the Clarity Loop?**

- **Keep (the engines are gold):** the memory layer and its web; the briefing/digest; the decision/pressure-test engine; the Kit's skill-building. These are sophisticated and hard-won. The overwhelm was never the engines - it was the surfacing.
- **Unify:** the three memory UIs into one capture/verify/edit/view; the scattered briefing-config into one place; the workflow/automation logic that's split across Kit, Edge, and Export into one spine (Kit owns it, per §5); the three nav definitions into one; the two parallel memory stacks into one (§13).
- **Demote:** secondary actions behind one calm control; the dense decision verdict to progressive disclosure; per-segment briefing controls off the main screen.
- **Kill:** the ~70% of peripheral code that is dead archaeology from three previous product visions; the duplicate backend stacks; the vanity "it's learning" theatre; the hard gate that makes a new user do setup before they see any value.

The "living decision" must be re-grounded in Law 1: we do **not** assume the leader lets us watch and report. The realistic, honest version is - when they return, we ask whether it resolved and whether we helped, and we learn from that. Anything more is surveillance the user won't grant.

> **SHIPPED against §8-§10 (2026-06-17).** The clean-room redesign (PR #186, 2026-06-16) ported the dark instrument palette, forced dark globally (`index.html class="dark"`, emerald `#00D9B6` primary, the `ctrl.` wordmark replacing the old green Mindmaker logo everywhere), and rebuilt the mobile cockpit, the decision spine, StoneRead, the brain four-world rope canvas, capture, and onboarding - all prod-verified with screenshots. **The brand is now globally dark, instrument-palette, emerald: not light-mode, not warm off-white, not white cards, not the old green logo.** The Kit program (lesson-kit engine at `/kit`) shipped the §5 fork in earnest: the Agentic Org Chart kit (#190/#191) and a parity retrofit of all three existing kits to fork + pick-cascade + a live picks-board (#192). PR #193 then fixed a major latent intake bug (the forked-kit cascade silently dropped its back half for every kit since launch) and added an honesty floor on the composed org chart so a box touching a flagged guardrail can never be left agent-led. (Note: pre-#193 `kit_builds.intake` rows are truncated and untrustworthy.)

---

# PART II - THE INTELLIGENCE LAYER (why the results can't be copied)

*This is where CTRL wins or loses. Everything in Part I is deliverable by a competent team; what makes the results unreplicable is the engine below. The defensibility is real and - the surprising, load-bearing truth from reading the actual code at the time - was **mostly already built, partly unplugged.** The job was to close the cut wires between capture, verification, and learning, and to never fake a loop that isn't yet closed. **As of 2026-06-17 those wires are closed:** the brain engine (PRs #153-164) added the self-correction and learning loop the code lacked, and the "limits" phases (#187-189) added the fact-to-fact edge graph, Strengthen/Fix RPCs, reliable reaction numbers, evidence tiers, and track-record depth (migrations `20260615*_brain_*`, `20260616120000_memory_edges`). The honest residual gaps are listed at the end of this Part. Full technical detail: `_INTELLIGENCE-LAYER.md`.*

## 11. The moat: why the results can't be copied

**CTRL's defensibility is not any single engine - it's four compounding factors that a prompt-only competitor can fake one of, struggle with two, and never reproduce all four working as a loop.**

1. **Owned, compounding, portable context.** Answers computed against a *persistent, curated, owned* model of the leader - a temperature-tiered fact graph that should get cheaper and sharper every week, while a chatbot restarts from zero every session. The decks name the economics exactly: the **Amnesia Tax** ("your most expensive employee has amnesia; every Monday is its first day") flipped into "the one AI investment that gets cheaper every week." *The code is replaceable; the context layer is the moat.* A competitor cannot retroactively own years of a specific leader's verified, versioned context.
2. **Encoded proprietary methodology.** CTRL *thinks* differently because Krish's decision-science is encoded as **structure, not vibes** - system-prompt rules, *required* JSON fields, forced UI gates a model cannot quietly skip. A competitor would have to reverse-engineer not a feature but a worldview, down to the schema level (§12).
3. **The synthesis + verification pipeline.** Where a chatbot *asserts* "this is relevant" or "this is true," CTRL *computes* it against live data and carries the receipt - a stored relevance score and the exact fact it matched; a dated, multi-source evidence trail a leader could show a board. No lens, no embeddings step, no claim-to-source router in a prompt wrapper.
4. **The self-correction loop.** Independent checks the agent *cannot grade itself on*, and corrections that compound into a growing, inspectable rule library - "the same mistake doesn't survive four occurrences." The deck's keystone, and the hardest thing to copy because it's the least glamorous to build.

**The four compose into a circle:** owned context feeds the methodology, executed by the synthesis/verification pipeline, whose outputs and corrections feed back through self-correction into the owned context. **A competitor must copy all four *and* wire the loop between them.** That closed loop is the moat no prompt wrapper reaches - and as of 2026-06-17 it is built **and wired**, not unplugged. The capture and verification halves were always genuinely deep; the **learning wires that were once cut are now closed** (§13), via the brain engine (PRs #153-164) and the limits phases (#187-189). We plugged in a moat rather than inventing one - which was always the honest task.

## 12. The methodology we encode

**CTRL's outputs think differently because the founder's methodology is hard-coded as engine behaviour the model cannot skip.** Three bodies of method, each with a home in the engine:

**Decision-science (the critical-thinking manual), as structure:**
- **Decompose before judging** - every decision is broken into 3-8 typed, falsifiable claims before any verdict. *(The biggest reliability lever: models classify reliably even where they adjudicate unreliably.)*
- **Verify before asserting** - claims are checked against retrieved evidence "with no prior knowledge beyond the evidence provided."
- **Argue against itself on purpose** - the counter-case and the single breakpoint assumption are *required JSON fields*; the schema cannot omit the counter-argument. A 4-model panel surfaces disagreement instead of averaging it away, and disagreement *lowers* confidence.
- **Make the human reason first; refuse to be the decider** - "informed by AI, not determined by it." Confidence must track evidence, carried as explicit bands on every output.
- The five-step spine (first-principles → mental contrasting → dialectical → A/B framing → reflective equilibrium): CTRL ran three of five well at the time; the brain engine and decision-spine rebuild (#186, #187-189) advanced the missing rungs (mental contrasting, framing-robustness) from named build items toward shipped behaviour.

**Identity · Memory · Self-Correction (the prompt-pack protocol):** *"The model isn't the problem - the setup is."* Three plain-text layers, fixed order, each gated by a pass/fail test, each carrying a forced self-correction footer.
- **Identity** = `ROLE · VOICE · STANDARDS · NEVER-RULES`; voice mined from pasted real writing, never self-described; test: *"two people couldn't tell its draft from yours."*
- **Memory** = business · top-3 priorities · decisions-made · people/projects; law: *"sharp beats big - useful context in, liability out";* test: the **cold-vs-loaded gap** ("the gap between those two answers is the tax you've been paying").
- **Self-Correction** = the footer **LOG (root cause) → PROPOSE (one class-killing rule) → WRITE BACK (on approval)**, with a recurrence guard ("never let a worker grade its own homework"; "fix the class, not the instance"; a mistake won't survive four occurrences).

**The operating worldview (the autonomous-business / agentic-org decks)** the advisory voice carries and applies: **Operator → Governor** (you make ~20 calls; the system makes hundreds), **Reclaim → Amplify → Re-architect** (don't bank the saved time - reinvest it), the **handoff classifier** (Labour to absorb, a prepared call to make, Action to protect), brick-swapped-for-next-decade-skill, and "thought partner, not oracle." Once mostly dormant, this worldview is now carried in product: the Agentic Org Chart kit (#190/#191, with the #193 honesty floor) encodes the handoff classifier and the automate-vs-keep-human call directly, and the kit program (#190-193) is where the operating worldview becomes differentiated advisory behaviour.

**The honest framing of the "training":** it is a curated, regression-tested library of rules, voice cards, and gold exemplars (`anchor.yaml`, gated by a training test on every edit) - **not a fine-tuned model.** Don't oversell it as ML. The honest claim is still formidable: *a weighted model of your priorities, scored against live news by embeddings, with editorial taste version-controlled in one file and a feedback loop you own.*

## 13. How the data lives and wires up

**The intended lifecycle is capture → store → synthesize → output → learn. Five stages were built; the *learn* stage was the cut wire - and that single fact is why the app had never felt like it learns. As of 2026-06-17 the *learn* stage is wired (brain engine PRs #153-164; limits phases #187-189), and the app learns.**

- **Capture (the strongest code in the app - keep it).** A multi-stage hygiene chain: extract durable facts → validate + detect contradictions → semantically de-duplicate (a new phrasing *updates* a fact instead of duplicating it) → deterministic guardrails (reject style-as-fact, transient state, third-party identity) → write as `inferred`, never auto-verified. The capture surface was rebuilt in the clean-room redesign (PR #186); the manual-write path was routed back through hygiene.
- **Store.** `user_memory` is a temperature-tiered fact graph (category, confidence, verification status, `temperature ∈ hot|warm|cold`, `reference_count`, version pointers, encrypted content). Around it: pattern, decision, and budget satellites; the seven Decide tables; the training material. The brain engine added a fact-to-fact **edge graph** (`20260616120000_memory_edges`) and evidence tiers on top (#187-189). *Note: brain edges are derived, not stored - see residual gaps.*
- **Synthesize (built, correct, now scheduled and surfaced).** A pattern engine (facts → behavioural patterns) and a lifecycle engine (promote/demote/archive by temperature + token budget) were both clean but once never scheduled; the learning loop now drives them. The briefing synthesis - an Importance Lens that builds a weighted model of what matters to this user today, then scores live stories by embedding similarity and keeps the matched fact + score on every story - is live rather than off-by-default.
- **Output (legible, evidence-carrying).** Every briefing story can answer "why am I seeing this?" with the matched fact and a score; every decision verdict carries dated evidence, a calibrated confidence, the counter-case, and the breakpoint; the context layer exports a portable brain per AI tool. The receipts that already existed in the database were brought onto the screen in the redesigned decision spine and StoneRead (PR #186), and the brain canvas surfaces reaction numbers, evidence tiers, and track-record depth (#187-189).
- **Learn (the wires are now closed - what was the core finding).** The usage-signal write that increments `reference_count` was once **never called**, so it stayed 0, so the temperature engine was starved, so the "getting smarter" UI was a performed signal - *the exact faked green tick the methodology forbids.* That, the unscheduled lifecycle/pattern engines, the decision verdict not writing back to memory, and the missing self-correction primitive were all closed by the brain engine (PRs #153-164) and the limits phases (#187-189). Self-correction now exists; the loop runs.

**The target consolidation that drove the build, with shipped status (this was the build's centre of gravity):**
1. **Emit the usage signal** on every fact injection - the single highest-leverage line - so temperature tracks reliance and the web honestly thickens. **SHIPPED** (brain engine, #153-164).
2. **Schedule the two engines** (lifecycle, then pattern-synthesis) on one per-user cron. **SHIPPED.**
3. **Close the decision loop inward** - write verdicts + breakpoints back to memory; consume the user's own call and compare it to CTRL's read; make the **return-ask** ("you pressure-tested X - did it resolve?") the dependable spine, with watch-and-alert as the upside layer. **SHIPPED** (decision spine rebuild, #186; brain engine, #153-164).
4. **Build the self-correction primitive** - a correction log + an inspectable, user-approved rule library with the 4× recurrence guard, writing back into identity never-rules, memory, and every export. **SHIPPED** (brain_adapt migrations, brain engine). *Residual: the brain canvas Strengthen/Fix actions are UI-disabled pending their backend RPC.*
5. **Add a first-class Identity object;** bridge the legacy stack; turn the briefing synthesis on after burn-in; **unify the duplication** (one memory schema, one pattern engine, one context-builder, one nav). **SHIPPED** (Identity, redesign #186; the unification landed with the clean-room rebuild). *Residual: full legacy-stack retirement is a remaining tail item.*

## 14. The engineering of magic (kept honest)

**The felt magic is real mechanism made legible - never a confident paragraph dressed up as intelligence.** The magic moments, each with the honesty rail that keeps it from becoming theatre:

- **The decision argues with itself in front of you** - decompose → check the live web → red-team across models → confidence band → handed back for you to call. *Honest because* confidence tracks evidence, assumptions are marked `unverifiable` rather than faked, and disagreement lowers conviction. The felt target, verbatim: **"earned conviction, not borrowed certainty."**
- **The cold-vs-loaded gap, shown** - don't *claim* it knows you; *show the delta* between an answer with your context loaded and without. *Honest because* it's observable, and it degrades gracefully: a sparse profile returns "nothing worth your time today," never invented filler.
- **The receipts under every story** - "because you're tracking Anthropic · 0.71." *Honest because* the receipt is queryable: magic you can audit.
- **The living decision that returns to you** - when the ground moves under an assumption you bet on, CTRL tells you in your own briefing voice. *Honest framing (the founder's correction):* the dependable version is the **return-ask**, not an always-on watcher you'll never grant.
- **The rule library you can watch grow** - compounding shown as an accumulating, inspectable asset; each rule user-approved and class-killing.
- **The voice indistinguishable from yours** - mined from real writing, every trait flagged `confident | guessing` so the model surfaces its own gaps instead of bluffing.

**The one anti-pattern the whole Corpus forbids - the faked green tick.** Never let the UI imply learning the backend isn't doing. This is exactly the trap the old app fell into: thermometers and "getting smarter" deltas animating over dormant engines. **Law 1 + Law 7, made mechanical: the thermometer only moves because the usage count actually moved** - which is now true, because the usage signal fires and the engines run (#153-164, #187-189). Honest magic beats performed magic - and performed magic "rings hollow," which was precisely the founder's original complaint about the app. (This Corpus's own backstory is the cautionary case: the redesign was once falsely claimed "live" while the app was still the old UI, and the assistant deflected onto the user's browser cache; PR #186 on 2026-06-16 is the real, screenshot-verified ship. "Live" means a prod screenshot only.)

## 15. What must be true in the build

The intelligence layer wins only if these hold, in roughly this order of leverage. As of 2026-06-17 most of these now hold in the shipped app (brain engine #153-164, limits phases #187-189, clean-room redesign #186); the per-item shipped status is noted, and the genuine residual gaps are gathered at the end of this section.

1. **The single usage signal fires** on every fact injection - the smallest change that makes the largest model honest. Without it, *nothing* in the learning loop can move. **SHIPPED** (#153-164).
2. **The dormant engines run on a schedule** - built-but-unscheduled is indistinguishable from missing. **SHIPPED.**
3. **Self-correction exists as a real primitive** - the log, the rule library, the forced footer, the recurrence guard. The deck's keystone and once the biggest missing piece. "Never grade its own homework" is a structural step the agent cannot skip. **SHIPPED** (brain_adapt migrations; brain engine). *Residual: the brain canvas Strengthen/Fix actions are UI-disabled pending backend RPC.*
4. **Decide closes its own loop** - pressure-testing makes the memory thicker, so it teaches durably. **SHIPPED** (decision spine, #186; brain engine, #153-164).
5. **Identity is a first-class object,** with voice mined from real writing and `confident | guessing` flags. **SHIPPED** (#186).
6. **Verification is calibrated** - the hard gate holds: when the engine says 80%, it's right about 80% of the time. An overconfident decision tool is worse than none. *Remaining: the formal ECE < 0.1 calibration gate is not yet enforced in CI (see Build Roadmap remaining tail).*
7. **The magic is turned on and surfaced** - the differentiator does not ship dark; the receipts are on the screen. **SHIPPED** (redesign #186; evidence tiers + track-record depth #187-189). *Residual: number-heroes fall back to words-led where current data is thin.*
8. **Honesty is enforced as a rail, not a hope** - no UI implies learning that isn't happening; confidence bands ride on every output; the scope fence (no medical/legal/financial) holds; corrections cost one tap and stick. **SHIPPED** (and the #193 honesty floor on the org chart extends it).
9. **The methodology spreads beyond Decide** - the reframe / counter-case / confidence discipline reaches briefings, memos, and exports, so the *whole product* thinks. **Largely SHIPPED** via the kit program (#190-193) and the redesigned surfaces; spread across every surface is an ongoing tail item.
10. **The four pillars are wired into one closed loop** - owned context → methodology → synthesis/verification → self-correction → back into owned context. The win condition is not any one pillar; it is **the circle closed, visibly and honestly, so the layer compounds.** That closed loop is the thing no prompt-wrapper reaches - and it is, as of 2026-06-17, built **and wired** (brain engine #153-164, limits phases #187-189). The loop that plugging-in completed is now running.

**Honest residual gaps (always disclosed, never hidden):**
- The brain canvas **Strengthen/Fix actions are UI-disabled** - the buttons are present but have no backend RPC yet.
- **Brain edges are derived, not stored** - the fact-to-fact graph is computed rather than persisted.
- **Number-heroes fall back to words-led** for thin current data (honest degradation, per Law 1, not invented filler).
- **Residual green** remains in `index.html` OG/theme-color meta, the `tokens.css` `--mint` alias, and `EdgeOnboarding`/`SampleResultsDialog` - the forced-dark emerald brand is global, but these specific tokens/surfaces still carry the old green.
- The formal **ECE < 0.1 calibration gate** is not yet enforced in CI, and **full legacy-stack retirement** is not yet complete (both tracked in the Build Roadmap's remaining tail).
- Pre-#193 `kit_builds.intake` rows are **truncated and untrustworthy** (the cascade bug dropped the back half of every build); historical kit data should not be trusted.

---

## 16. What we deliberately parked - now decided

These were parked to keep the Corpus at altitude. They have since been decided and, where applicable, executed:

- **Rebuild vs overhaul - DECIDED & SHIPPED.** A clean-room frontend rebuild on the existing Supabase backend, with a backend-consolidation pass and deletion of the dead code. The engines - and the moat - survived; the surfacing was reborn, and the cut wires of §13 were closed. This shipped as the dark instrument redesign, PR #186 (merge `1c01db5`, 2026-06-16), prod-verified with screenshots.
- **The exact decision-type sub-scopes** inside (a)-(c) - settled as the decision intake was built into the redesigned decision spine (#186).
- **Voice** - the product mines each leader's voice from real writing with `confident | guessing` flags (Identity, #186); neutral chrome carries user-voiced outputs.
- **Commercial:** the wedge that's paid for, the freemium vs cohort split, and pricing remain the live commercial decisions - the kit program (#190-193) is the cohort-facing wedge in practice.
- **Phasing:** the first cut shipped per the Build Roadmap; the team / agentic-org-chart layer entered scope as the Agentic Org Chart kit (#190/#191, #193).

---

*This Corpus was a sharp scaffold, by design - the first and last 20% was Krish's, and the spine held while the details got built. Part I says what to build; Part II says why it can't be copied - and the moat that was once mostly coded and waiting is now plugged in (brain engine #153-164, limits phases #187-189, clean-room redesign #186, kit program #190-193). What remains is the short tail in the residual-gaps note and the Build Roadmap's remaining items.*
