# Intel · Methodology Models — The Higher-Order Operating Mental Models CTRL's Engine Must Embody

> Track: **THE HIGHER-ORDER OPERATING MENTAL MODELS.** Not features — the *mental models* CTRL's intelligence layer should *think in* and *apply to a leader's live situation*. Sourced from `doc-autonomous-business.md`, `doc-agentic-org-chart.md`, `doc-mindmaker-maven.md`, spot-checked against `_decks/Build_an_Autonomous_Business_v4.txt`, `_src/two-species-one-company.md`, `_decks/Build_Your_AI_s_Identity_and_Memory.txt` (the two deck txts were deduped out of `_src/` to `_decks/` on 2026-06-17). Cross-referenced against what the live app at `ctrl.themindmaker.ai` / `C:/Users/krish/mm-ctrl` actually computes (per `app-data-learning.md`, `app-decide.md`, `_SYNTHESIS.md`).
>
> **How to read each model:** (1) the model stated *precisely* in Krish's own terms, with the verbatim line; (2) **CTRL operationalizes it** — exactly what the engine should compute / surface / ask / watch for, named down to the table, edge function, or column where the wiring lives or should live; (3) **wired vs dormant** honesty, because the whole CTRL thesis is *data-realist, never faked* — the felt magic must be earned, not performed.
>
> The unifying claim: these are not 14 separate features. They are **one engine** that turns a leader from *operator → governor* by computing, for any live situation, "what is Labour (absorb it), what is the Handoff (escalate it as one call), what is Action (protect it for you) — and which next-decade skill should you build with the hour I just gave back."

---

## MODEL 0 — The master arc: Operator → Governor (the frame every other model serves)

**Precisely.** The leader's *job and identity* must change from operator (running the plays) to governor (running the board). *"They aren't executing the workflow anymore. They're governing it."* / *"Humans govern. Agents execute."* / *"You stay in the driver's seat. They do the driving."* The target end-state is concrete and numeric: *"I made about twenty decisions all day. The system made hundreds."* (`You: ~20 decisions. The system: hundreds of actions.`) — *"the equivalent of a five-person team,"* run as one person.

**CTRL operationalizes it.** This is CTRL's north-star ratio, not a slogan. The engine's job is to **maximize the leader's decision-leverage**: absorb the hundreds of actions, surface only the ~20 calls a human must make, and prove it did so. Concretely the home/mobile spine should be a **"ledger of the leader's living decisions"** (per `_SYNTHESIS.md` §6) — *not* five engines — driven by the Agatha morning-brief model: *"here is the one thing that needs you; the rest is handled."* Every surface should be auditable against the question *"is this a call only the human can make, or is CTRL making the leader do Labour?"* If it's Labour, CTRL should have absorbed it.

**Wired vs dormant.** The *capture* side is real (rich `user_memory`, a genuine Decide engine, a personalized briefing). The *governor experience* is **not yet assembled**: the app today is "five engines, everything-at-once," which is the operator UI, not the governor's board. The ~20-calls ledger is the unbuilt spine.

---

## MODEL 1 — Reclaim → Amplify → Re-architect (the Three Journeys readiness ladder)

**Precisely.** *"Give a leader an hour back, and they do one of three things with it."* (`doc-agentic-org-chart.md` §2.1)
- **Rung 01 · Reclaim — "Bank the time."** Anti-pattern: *"The board pack drafts in twenty minutes — and the three hours go straight back into the inbox."*
- **Rung 02 · Amplify — "Do more, faster."** *"Five strategic scenarios before a call instead of one; a week's decision reached in a day."*
- **Rung 03 · Re-architect — "Rebuild the role."** Does rung two, then *"collapses the workflow and swaps each brick for a skill the next decade rewards."* Builds *"the version of themselves still essential when AI does most of today's job."*
- *"WHERE MOST LEADERS STOP"* = rungs 1–2; *"WHERE THE FEW GRADUATE →"* = rung 3. *"DON'T JUST SPEND THE TIME · REINVEST IT."*

**CTRL operationalizes it.** This is **the single most CTRL-relevant model** and the engine's organizing teleology. CTRL must (a) **infer which rung a leader is on** from behavior — does the saved time get reinvested, or banked? — and (b) **catch the reinvestment moment.** After any time-saving artifact lands (a `memory-export`, a generated briefing, a Decide verdict, an Edge board memo), the very next move CTRL surfaces should be a *rung-up nudge*, never the next inbox item. Mechanically: store a per-user `current_rung` signal; after each completed artifact, fire a "reinvest" prompt drawn from the brick→skill table (Model 4). The leader's rung is a first-class thing CTRL learns and protects.

**Wired vs dormant.** **Dormant — and it is the most important gap.** Per `_SYNTHESIS.md` T3: *"The app saves time (export, briefing) but never catches the reinvestment moment."* There is no `current_rung` concept and no reinvestment nudge in the code. The Kit's "automate the job you do MOST" and `/context`'s "amplify strengths / cover weaknesses" are *two halves* of this loop sitting in two walled-off surfaces. Building the rung-up catch is the highest-leverage embodiment of the whole worldview.

---

## MODEL 2 — Two Species, One Company (govern a second category of worker)

**Precisely.** The central reframe. *"AI agents are not software in the traditional sense. They are a different category of worker — with their own strengths, failure modes, motivations (by design), and appropriate org-chart positions."* *"You are not building a business with employees and software. You are building a business with two genuinely different species of worker."* Critically: *"Not a metaphor for effect. The orgs that draw it this way make materially different decisions about handoffs and headcount."* The two species **fail on opposite axes**: a human *"fatigues, harbors bias, is slow to replicate"*; an AI *"hallucinates, fails quietly at scale, is brittle outside its training distribution, cannot initiate."* You pair them *"because each catches exactly what the other gets wrong,"* not for redundancy.

**CTRL operationalizes it.** The engine must hold an explicit **two-species model of the user's own situation**: which work is going to the AI species (structured processing, first drafts, synthesis, triage) vs kept with the human species (high-stakes calls, novel situations, trust, moral accountability). This is the substrate of the Handoff Zone surface (Model 3). It also governs CTRL's *own* posture: CTRL is an AI-species worker, so it must **never grade its own homework** (Model 7) and must **prove state from real artifacts** (Model 8) — because it shares the AI species' failure mode of *"the confident green tick."* The two-species lens is what makes CTRL honest about its own limits in the UI.

**Wired vs dormant.** Conceptually present (the `is_high_stakes` flag on `user_memory`, the Decide engine's escalation logic), but **not surfaced as a coherent model** the leader can see and tune. The leader's handoff line (what they hand off vs keep) is not a stored, editable object.

---

## MODEL 3 — The Handoff is the Product / Hand-off · Share · Keep (Arendt's Labour · Work · Action)

**Precisely.** *"The failures don't cluster at the model. They cluster at the handoff."* / *"Optimise the boundary, not the agent."* / *"The boundary is the whole game."* The sorting device is **Hannah Arendt's Labour · Work · Action** (*The Human Condition*, 1958), used as *"a sorting device, not philosophy":*
- **HAND OFF → Labour** (necessity & repetition). *"AI absorbs it first."* — the 6am research sweep, first drafts, formatting, scheduling.
- **⇄ SHARE — the Handoff Zone — Work** (making durable things, in concert). *"Where most failures happen — design it."* AI drafts five → you pick one; AI flags → you decide; low confidence → escalates. *"Designed: an edge. Undesigned: a silent liability."*
- **← KEEP → Action** (beginning something new). *"Cannot be delegated."* — the angle you take; the call that risks trust; deciding what should exist.
- *"Every undesigned handoff is a liability."* / *"Redeploy, not replace."* / *"Not diminishment · clarification."*

**CTRL operationalizes it.** This is the **task-routing classifier at the heart of the engine.** For any item entering CTRL (an inbox thread, a market signal, a decision, a recurring workflow), CTRL should compute its Arendt class and act accordingly:
- **Labour →** CTRL just does it, invisibly (read, organise, draft, analyse) and reports *"Routine work handled. Not asking."*
- **Handoff Zone →** CTRL surfaces it as **one clean call** — the only place the human is asked — with the draft/options already prepared (AI did five, you pick one). This *is* the ~20-calls-a-day surface.
- **Action →** CTRL protects it: never decides it, but frames the sharper question and surfaces the counter-case so the human's call is sharper.

The engine should make the **handoff line itself a stored, leader-tunable, weekly-recalibrated object** (see Model 9), and treat *"every undesigned handoff"* as the thing to hunt for.

**Wired vs dormant.** The Decide engine's `CriticalCallStep` is the cleanest *live* instance of the Keep/Action discipline (it forces the human to make their own call before revealing CTRL's read, logged to `decision_user_calls`). The Labour-absorb side (auto-handle, "not asking") is **largely unbuilt** — CTRL today asks the leader to operate every surface rather than absorbing the Labour and queuing only the calls. The Arendt classifier as an explicit routing primitive does not exist.

---

## MODEL 4 — Collapse, then Replace (the brick→skill swap — the engine of Rung 3)

**Precisely.** Rung 3 up close: *"Collapse the workflow. Replace each brick with a skill the next decade rewards."* The 5-row mapping, *"THE BRICK AI NOW ABSORBS → THE SKILL YOU BUILD WITH THE TIME"* (`doc-agentic-org-chart.md` §2.2):

| The brick AI now absorbs | → | The skill you build with the time |
|---|---|---|
| Writing the analysis | → | Framing the sharper question |
| Synthesising the data | → | Deciding under genuine ambiguity |
| Producing the first draft | → | Editorial taste and narrative |
| Status and coordination | → | Orchestrating a hybrid team |
| Recall and research | → | Trust and relationship capital |

*"At Mindmaker, I take leaders from rung one to rung three — deliberately, one brick at a time, before the 90% arrives."* / *"THE GRADUATION IS THE WORK."* Pairs with **the Five Bricks** decomposition (Capture → Process → Decide → Produce → Distribute) — *"collapse one brick at a time, never the whole wall."*

**CTRL operationalizes it.** This table is a **ready-made library of CTRL "next moves."** Every time CTRL absorbs a brick, it should immediately prompt the matched skill-swap: *"AI wrote the analysis — now frame the sharper question."* / *"AI produced the draft — your move is editorial taste: what's the one line that's actually you?"* Mechanically, tag each generated artifact with the brick it absorbed, and emit the paired skill-prompt as the reinvestment move (this is the *content* of the Model 1 rung-up nudge). Over time CTRL should track *which skills the leader is building* (the right column) as first-class goals, and coach toward Rung 3. The Five-Bricks lens is also CTRL's framework for helping a leader decompose any workflow they want to automate — *one brick at a time, never the whole wall.*

**Wired vs dormant.** **Dormant.** The Kit operationalizes "collapse the workflow" (pick the ONE job you do most → installed skill) but stops at automation; it never emits the *skill-swap* prompt. No artifact is tagged with its absorbed brick, and the right-column skills are not tracked as goals. This is the missing back-half of the Kit.

---

## MODEL 5 — The org inverts: Pyramid → Diamond / Lighter org · Heavier humans (the complexity tax)

**Precisely.** *"AI ABSORBS THE BASE · HUMANS MOVE UP."* The org shifts from a pyramid (wide base of executors) to a diamond (humans expand into a fat orchestration middle). Consequence — *the remaining human work gets harder, not lighter*: *"once the routine is gone, every hour a human keeps is high-judgement. Cognitive intensity rises. People feel more stretched in a leaner org, not less."* / *"'We removed the busywork' lands as relief on the slide and as pressure in the seat."* / *"FEWER TASKS · DENSER DECISIONS."* And **more autonomy means more management** (the complexity tax): *"Automation doesn't remove the friction. It moves it upward."* Failures become *"quiet ones that propagate across thousands of identical runs before anyone notices."* The difficulty *is the moat*: *"harder to run · harder to replicate."*

**CTRL operationalizes it.** The engine must **plan the leader's day for density, not relief.** If every retained hour is high-judgement, CTRL's job is to *protect attention for those hours* — cluster the ~20 calls, defend deep-work blocks (9–12 in the day-in-the-life), and never fragment the day with low-stakes pings. The honest copy follows: CTRL should never oversell relief; it should name that the work it leaves the leader is the *dense* work, and make that work survivable. Operationally this argues for: a single batched "calls queue" (not scattered notifications), confidence-banded auto-handling of the routine (Model 6), and a felt rhythm of *"approve 8 queued things in 15 minutes, then 3 hours of uninterrupted deep work."*

**Wired vs dormant.** **Dormant as a design principle.** The current app is the opposite — *"every tab asks several complex things at once"* — which *adds* cognitive load rather than concentrating it. There is no day-planning / attention-protection layer.

---

## MODEL 6 — Big-G / Little-g + the Internal/External boundary (confidence-banded governance)

**Precisely.** Two interlocking governance models.
- **Internal/External boundary** (the safety contract): *"Internal is free. External is gated."* INTERNAL — fully autonomous: read files, organise data, draft content, query systems, run analysis. EXTERNAL — approval required: send emails, post publicly, make commitments, spend money, sign anything. *"The boundary isn't a limit on the system. It's what makes it safe to let run."* / *"Speed of automation, safety of judgment."*
- **Big-G / Little-g governance:** **Big G — guardrails** — *"ethical red lines and compliance as executable policy, not overrideable by any agent. Audit trails on every consequential call."* **Little g — agility** — *"day-to-day calls delegated within confidence bands. Escalate only when confidence drops. Errors are learning events."*

**CTRL operationalizes it.** The engine needs an explicit **autonomy line the leader sets**: *what CTRL does alone / what it drafts for approval / what it never touches.* Three controls (per `doc-mindmaker-maven.md`'s Safe-to-Ship line). Mechanically: **Big-G** = the leader's stored red-lines / never-rules (the "Never store" / "rules it must never break" of the Identity layer) — non-overrideable, with an audit trail on consequential moves; CTRL must refuse to cross them even if asked. **Little-g** = a **confidence band**: CTRL acts autonomously inside the band and **escalates only when confidence drops** — and when it's wrong, the error becomes a learning event (feeds Model 7). Anything *external, expensive, or irreversible* waits for one explicit human approval — *"a hard stop on what leaves the building."* Lead with this to disarm the *"what if it emails a client?"* fear.

**Wired vs dormant.** Partly modeled: `user_memory` carries `is_high_stakes`, and the Decide engine carries calibrated confidence. But there is **no leader-facing autonomy-line control surface**, no stored never-rules as executable guardrails, and the "act inside the band / escalate on drop" loop is not generalized beyond Decide. The Big-G audit trail does not exist as a product primitive.

---

## MODEL 7 — Never let a worker grade its own homework (the four-tier audit panel + forced reflection)

**Precisely.** *"A stuck human goes quiet. A stuck AI reports a confident green tick. It fails confidently."* The scar: *"At 3am it told me everything was fine"* while 90% was silently dead for three days. The doctrine: *"never let a worker grade its own homework — the auditor reads the real artifact,"* run as a **four-tier panel** (TRUTH = claims vs source; STANDARDS = codified voice/pillars; AESTHETICS = does it look good; COMPLETENESS = reads the real artifact, catches the false-green). And **forced reflection** — the `on_failure` block (log what broke → propose the preventing rule → on approval, append to `MEMORY.md`), which produced **167 rules**, e.g. Felix's Rule #142: *"verify row-count > 0 before marking any export complete."* The **Three Learning Promises**: *"the same mistake doesn't survive four occurrences"* · *"the same silent failure doesn't survive a week"* · *"the same closed call doesn't reopen."*

**CTRL operationalizes it.** Two things. (1) **CTRL audits its own output** against the panel before surfacing — especially TRUTH (the Decide engine's claim-by-claim web verification *is* this, made real) and STANDARDS (does this sound like the leader, per the voice layer). (2) **The Self-Correction loop** — this is the deck's keystone and CTRL's missing third layer: when the leader corrects CTRL (*"this isn't me," "that fact is wrong," "that's not my call"*), the correction must be **captured → grouped → written back as a kept rule**, so *"the same mistake doesn't survive four occurrences."* CTRL should *visibly retire* a repeated mistake — the felt proof that it learns. The verification posture also means CTRL must **prove state from the real artifact** (Model 8), never report a confident green tick about itself.

**Wired vs dormant.** Split. **Wired:** the Decide engine genuinely verifies claims against web evidence (TRUTH tier, real), and `briefing-aggregate-feedback` is the one working behavioral loop. **Dormant / missing:** the **Self-Correction loop does not exist as a product primitive** (`_SYNTHESIS.md` T1 calls this *"the biggest vision/reality gap"*). Verification outcomes update one row but never aggregate into per-user priors or kept rules; corrections teach the system nothing durable. There is no `on_failure`-style "the same mistake doesn't survive four occurrences" mechanism in-app.

---

## MODEL 8 — Observability over capability (prove state from the real artifact; the system learns from its own mistakes)

**Precisely.** *"The hard problem is observability, not capability."* The companion: a real business *"learns from its own mistakes — that's what makes it a business, not a script,"* and *"better by week ten beats clever on day one."* Monitoring must *"read real output, not status reports / not the workflow's claim about itself,"* with **same-hour alerts** — *"you hear about a break the same hour, not three silent weeks later."*

**CTRL operationalizes it.** Two embodiments. (1) **CTRL surfaces "what actually happened"** — the row written, the email queued, the claim verified — never a decorative green tick. The danger to design against (per `app-data-learning.md`) is exactly this: the app *looks* like it learns (thermometers, "getting smarter" deltas, `LearningEngineSheet`) while the loops are unwired — a **performed** green tick, which is precisely the failure this model forbids. *Data-realist, never faked* means CTRL's "it's learning" signals must be **true**: a thermometer that moves only when a real `reference_count` increment fired. (2) **The WATCH loop** (`decision-watch`) is the live expression — it re-verifies load-bearing claims behind past decisions hourly and raises `decision_alerts` *the moment evidence shifts*, surfacing *"an assumption changed → review the decision."* That is observability of the leader's own decisions, made real.

**Wired vs dormant.** **The crux of CTRL's honesty problem.** The Decide WATCH loop is the *intended* live instance (though `app-decide.md`/`app-data-learning.md` flag the hourly cron as unverified in-repo). The broader memory-learning observability is **performed but not real**: `reference_count`/`last_referenced_at` are *never written*, `memory-lifecycle`/`memory-synthesize` are *never scheduled*, so the "X hot / getting smarter" UI is currently a **faked green tick** — the exact thing this model condemns. The cheapest fix (per the data map): write `reference_count` from `getUserContext`/`buildMemoryContext` so the temperature engine finally has a true signal.

---

## MODEL 9 — The boundary won't hold still — recalibrate the handoff line weekly (Kasparov's centaurs)

**Precisely.** *"The handoff line you draw today is already moving."* / *"The durable skill is recalibrating it. I redraw mine weekly."* The centaur arc: Kasparov's human+machine centaurs beat solo grandmasters and solo machines → then *"two amateurs with three computers beat the centaurs by out-orchestrating them"* → then AI overtook centaurs entirely. *"The lesson isn't the current split. It's that the durable skill is recalibrating it."* / *"The hybrid model is a waypoint, not an equilibrium."* / *"THE WINNER IS THE BEST CONDUCTOR, NOT THE BEST PLAYER."* / *"The chart is a design practice, not a destination."*

**CTRL operationalizes it.** The leader's **handoff line is a living, weekly-revisited setting, not a one-time config.** CTRL should: (a) store the current line (what's handed off / shared / kept); (b) **prompt periodic recalibration** — a weekly "redraw the line" ritual that asks *what graduated from Keep to Share this week? what can now be handed off entirely?*; (c) treat the whole product as a **recurring practice surface, not a setup wizard you finish once.** This makes CTRL the muscle for continuous recalibration — the durable skill the deck says actually wins. It also reframes CTRL's relationship with the user: a partner that helps them out-orchestrate, not a tool they configure and forget. *("Set it and forget it is a lie.")*

**Wired vs dormant.** **Dormant.** No stored handoff line, no weekly recalibration ritual. The app is structured as a set of tools to operate, not a practice surface that revisits the leader's boundary. This is a clean, high-signal thing to build.

---

## MODEL 10 — Sharp beats big (the small, sharp team; curated memory)

**Precisely.** Two faces of one idea. The **economic/strategic** face: *"The same force that's cutting entry-level jobs is handing a small, sharp team the output of a huge one. The question is which side of that you're on."* (Cursor: $3.3M rev/employee; Swan AI: 4 people, $1.5M+/mo pipeline; one person, 8 ventures.) The **data/memory** face (`SHARP BEATS BIG`, `ai-identity-memory.txt` slide 14): *"Memory works when it's curated, not when it's a junk drawer."* STORE: who you are, what the business does/serves; your rolling priorities — the three that matter now; decisions already made (so they don't get relitigated); recurring people/projects + your shorthand. NEVER STORE: passwords/keys; others' private data; half-thoughts and noise that *"bloat the file and dull the signal";* anything you'd be uncomfortable seeing in an export. *"USEFUL CONTEXT IN · LIABILITY OUT."*

**CTRL operationalizes it.** Memory is a **curated edge, not a junk drawer** — CTRL must own a **capture-and-prune rhythm** (`memory-lifecycle`: promote/demote/archive on temperature + recompute budget) so the context stays sharp as it grows; *more* is not the goal, *signal* is. CTRL should actively help draw the **privacy line** (*"what to store, what to never store"* — `user_memory_settings`, encrypted at rest), separating useful context from liability, with an export-safe guarantee. The strategic face is CTRL's *positioning*: it exists to put one person on the right side of "sharp beats big" — the output of a huge team, run sharp. The **three rolling priorities** are a first-class object the engine should always know and weigh everything against.

**Wired vs dormant.** The schema is there (`temperature`, `reference_count`, `user_memory_budget`, `user_memory_settings`, privacy controls, careful guardrails in `extract-user-context`). But the **prune rhythm is dormant** — `memory-lifecycle` is never scheduled, so nothing actually promotes/demotes/archives; memory can drift toward the junk drawer the model warns against. The "three rolling priorities" exist only implicitly (objectives smeared across `user_memory` and two goal systems), not as a clean, always-weighed object.

---

## MODEL 11 — The amnesia tax → context compounds (the one investment that gets cheaper every week)

**Precisely.** *"Your most expensive employee has amnesia."* / *"the memory of a goldfish — every Monday is its first day."* The tax: *"You re-brief a stranger every single morning… that re-typing is a tax you pay daily and never notice."* The fix is the **Onboarding Documents** (IDENTITY.md = who the agent is; USER.md = how you work and what you hate; MEMORY.md = what persists; daily-notes/; skills/ = "do this when that"), *"plain text, Markdown, yours — works with any model, survives any platform change."* *"The code is replaceable. The context layer is the moat."* And the economics flip: *"the context compounds — the one AI investment that gets cheaper every week you use it,"* portable wealth *"yours when you change tools, jobs, or companies."* *"Three tools. One brain behind all of them."*

**CTRL operationalizes it.** This *is* CTRL's product thesis — the **Identity · Memory · Self-Correction** layer, owned and portable. The engine's job is to **end Monday-morning amnesia**: capture once, and every AI tool (`memory-export` → ChatGPT/Claude/Gemini/Cursor/Claude Code/Markdown) loads *the same brain*. The model demands CTRL treat the context layer as the **moat** — plain files the leader owns, encrypted, not settings trapped in a platform — and prove the *compounding*: the memory should visibly thicken week over week, and the same fact should get *used more* (not retyped). The "ask the same question in three tools, get the same answer" demo is the magic-moment to engineer (honestly).

**Wired vs dormant.** **Wired:** portable export across six AI targets is real and strong; capture (`extract-user-context`: extract → validate → contradiction-detect → semantic dedup → guardrails) is genuinely careful. **Dormant:** the *compounding* the model promises — *"gets cheaper every week"* — is unproven in-app because the learning loops are unwired (Model 8). The layer captures but does not visibly *thicken*; the moat is built but not seen to grow.

---

## MODEL 12 — The new economics: intelligence is priced per task, not per seat (the AI P&L)

**Precisely.** *"Software was priced per seat, tidy and predictable. Intelligence is priced per task, and an agentic workflow fires ten to thirty tasks per interaction, so two people on the same licence can differ in cost a thousandfold."* (Token prices −98%, enterprise AI bills +320%; Uber reportedly torched its 2026 AI coding budget by April.) The teaching framework is the **AI P&L** + **Model Routing by cost**: *"Most steps are decisioning, not reasoning. Stop billing a frontier model for formatting"* — classify/route (fast·cheap), extract/structure (workhorse), **the hard call (frontier · only here)**, draft in your voice (mid·creative), format/validate (fast·cheap). Routing *"roughly halved my own fleet costs without degrading the work."*

**CTRL operationalizes it.** CTRL itself should **embody cost-intelligent routing** as an operating discipline (spend the frontier model only on "the hard call"; cheap models for classify/extract/format) — both to keep its own unit economics sane and to *model the behavior it teaches.* For the leader, the engine can carry their **AI P&L assumptions** (model-tiering / routing preferences, spend thresholds) as stored context, and watch for **runaway-spend patterns** — *"flag a runaway workflow the same day, not at month end"* (the same-hour-alert posture of Model 8, pointed at cost). The board one-pager (*"what AI costs you, what it returns, what you're recommending"*) is a natural Edge artifact.

**Wired vs dormant.** Routing is partly real in the app's pipelines (e.g., multi-stage extraction uses gpt-4o for the hard step, gpt-4o-mini for fact-check/contradiction; some pipelines have Gemini fallbacks). But there is **no leader-facing AI P&L / spend-watch** object, and the memory pipeline is hard-OpenAI with no fallback — a fragility the cost model itself warns against.

---

## MODEL 13 — The cost arrives before the payback / the roles the system hires itself (emergent roles + the ladder problem)

**Precisely.** *"The roles nobody budgeted for show up before the savings do."* — Agent Manager, Context Architect, AI Behaviour Auditor, Escalation Specialist, Forward Deployed Engineer (*"the actual bottleneck"*), Prompt Orchestrator. The system-emergent version: *"My fleet effectively hired its own auditor… half the ops pod now exists to check the other half. The newest, most valuable role in my business is one no plan called for."* / *"The roles that emerge from the system tell you more than the roles you planned."* And **the ladder problem**: *"You automate the entry roles — which is how seniors were made… the cut that pays back fastest is the one that starves your future bench."* / *"YOU CAN'T SKIP THE LADDER AND KEEP THE SENIORS."*

**CTRL operationalizes it.** A higher-order *watch-item* engine for leaders, not a daily surface. CTRL can help a leader **see the costs that arrive before payback** (new oversight roles, the auditor layer) and **watch the ladder** — flag when an automation decision quietly defunds the human apprenticeship path. More immediately, this model justifies CTRL's *own* internal design discipline: CTRL's value compounds because it is *harder to run* (the auditor/Self-Correction layer is half the work), and that difficulty is the moat. For the leader, the four open questions (apprenticeship paths, who-watches-the-watchers, governance-as-code accountability, boundary-drift speed) are leader-level worries CTRL could surface or reflect on over time.

**Wired vs dormant.** **Dormant / aspirational.** This is strategy-advisory territory, not a built surface. No org-design or ladder-watch features exist; this is a model CTRL's *advisory voice* should carry, not yet a computed thing.

---

## MODEL 14 — A thought partner that sharpens judgment, not an oracle (informed by AI, not determined by it)

**Precisely.** Pulled from the through-line and `critical-thinking`: the app must *protect the leader's reasoning muscle* — Socratic, devil's-advocate, confidence-banded, *"informed by AI, not determined by it."* The decks' practice: surface **the strongest counter-case + the single breakpoint assumption + a "validate before you commit" list**, and *make the leader make the call.* This is the antidote to "answer machine." Pairs with the **decision frameworks for hard calls** (A/B framing, dialectical tension, mental contrasting, first principles, reflective) and *"finding the decision under the decision."*

**CTRL operationalizes it.** The **Decide engine is this model made real**: name a real call → decompose into claims → web-verify each → cross-examine (multi-model red-team) → advise with a calibrated recommendation, the strongest counter-case, the one breakpoint assumption, and a validate-before-you-commit list — *and the `CriticalCallStep` forces the leader to make their own call first.* The model demands this discipline spread *everywhere* CTRL vends an output (board memos, briefings, exports), not just Decide: always carry the reframe, the counter-case, the confidence band. And — per Model 7 — the leader's own call (`decision_user_calls`) and the verdict should **become memory**, so reps compound.

**Wired vs dormant.** **Wired (and CTRL's crown jewel):** the Decide pipeline + `CriticalCallStep` + WATCH loop are genuinely the embodiment of judgment-over-oracle. **Dormant:** (a) the captured judgment is *dropped* — `decision_user_calls` and `decision-engine` verdicts never write back to `user_decisions`/`user_patterns`/memory (`_SYNTHESIS.md` T4: *"even there the captured judgment is dropped"*); (b) everywhere *outside* Decide, the app vends outputs without the counter-case/confidence discipline. Closing both is how CTRL becomes a judgment-sharpener end-to-end.

---

## SYNTHESIS — how these models compose into ONE engine, and the honest scorecard

**The one-paragraph engine.** For any live situation a leader brings, CTRL should: **classify it by Arendt** (Labour → absorb silently, "not asking"; Handoff → surface as one clean prepared call; Action → protect and sharpen) [Models 3, 0]; act **inside a leader-set confidence band**, gated hard on anything external/expensive/irreversible, never crossing a stored never-rule [Model 6]; **verify its own work against the panel** and **prove state from the real artifact**, never a faked green tick [Models 7, 8]; draw from a **curated, compounding, portable memory** that ends the amnesia tax and stays sharp-not-bloated [Models 10, 11]; and — the teleological heart — after every hour it gives back, **catch the reinvestment moment** and push the leader up the ladder Reclaim → Amplify → Re-architect by emitting the matched **brick→skill swap** [Models 1, 4], while treating the **handoff line as a weekly-recalibrated practice** [Model 9]. The felt outcome: the leader governs ~20 calls a day while the system runs hundreds — *"sharp beats big,"* calm command, earned conviction [Models 0, 2, 5, 10, 14].

**The honest scorecard (data-realist, never faked):**
- **Genuinely wired (the magic is earnable today):** Decide pressure-test + `CriticalCallStep` + WATCH loop (Models 3/7/8/14); portable cross-tool export (Model 11); careful capture in `extract-user-context` (Models 10/11); briefing negative-feedback loop (Model 7, the one real behavioral loop); partial cost-routing in pipelines (Model 12).
- **Built-but-dormant (the wires aren't connected — the #1 source of "it never feels like it learns"):** `reference_count`/`last_referenced_at` never written; `memory-lifecycle`/`memory-synthesize`/`detect-patterns` never scheduled; decision verdicts and `decision_user_calls` never become memory; assessment never bridged into `user_memory`. The temperature/"getting smarter" UI is currently a **performed** signal — the exact faked green tick Model 8 forbids.
- **Missing primitives (the highest-leverage builds, in priority order):** (1) the **Self-Correction loop** (capture→group→write-back kept rule) — the deck's keystone, T1's "biggest gap" [Model 7]; (2) the **Rung-up / reinvestment catch** + **brick→skill** emitter [Models 1, 4]; (3) the **Arendt task-router + ~20-calls ledger** that turns the app from operator-UI into governor-board [Models 0, 3]; (4) the **leader-tunable handoff line + weekly recalibration ritual** [Models 9, 6]; (5) the **autonomy-line / Big-G never-rules** control surface [Model 6].
- **The cheapest honesty fix:** write `reference_count`/`last_referenced_at` from `getUserContext`/`buildMemoryContext` so the temperature engine finally has a *true* signal — turning the faked "it learns" into a real one (Model 8). That single write-back is the smallest change that makes the largest model honest.
