# Kit Redesign Spec

> **Historical only.** The Kit product was retired on 2026-08-07. `/kit*` permanently redirects to `/try`, and the former UI/routes are deleted. Do not build this draft. It remains solely as design provenance.

Status: RETIRED. No implementation is planned.

Author note: this replaces the assumptions baked into the current kit flow. The current reveal page (`KitHome.tsx`) stacks ~10 competing actions into one long scroll (Send My Pack, Set My Voice, I Shipped It, Copy x N, Tune, Paste Homework, the 7-day plan, artifact groups, the dashboard bridge). The intake is mostly sequential already; everything after the build is a dumping ground, the homework prompt flashes past during the loading spinner so it can never be done, and outputs ship generic enough to need a "Tune" button and offer copy buttons for text that was never personalized.

---

## 1. The four kits, locked

Each kit is about a different *thing*. This is the differentiation that was blurred before. Keeping these four purposes crisp is what stops the kits from collapsing into each other.

| Kit | It is about | The user's job | The one output it exists to produce |
|---|---|---|---|
| **Vibe Coding** | a **solution** (one problem, one build) | teach the AI who you are, how you like to work, what has burned you before, and the one thing you want to build, then ship it | a personalized build kit: the AI works *your* way and the build is fully briefed |
| **Autonomous Business** | a **process** (one recurring workflow) | take one repeating job off your plate by day 7 | a first automation: one workflow decomposed, with the autonomy line drawn and a build path |
| **Agentic Org Chart** | the **company** | pick a division, drill to its tasks, find the handoffs, mark where AI runs free / is supervised / never touches, get a ranked place to start | a branded org chart color-coded by autonomy, with the first agents to stand up |
| **Memory & Identity** | the **person** (you) | narrow the AI's field of view to specific sessions and make it know *you* across them | an AI identity pack: who the AI is when it works with you, in your voice, with a self-correction loop |

The quadrant in one word each: **Solution / Process / Company / Person.**

---

## 2. Universal architecture

All four kits share one spine. Design the spine once, specialize per kit.

### 2.0 Humanity first (the law under all the others)

Every screen is a moment with a real person, not a form. They may be anxious about AI, behind where they wish they were, or burned by it before. Vibe Coding literally asks for their past pains; Memory & Identity asks who they are. Handing those to a machine is a vulnerable thing to do, and the flow has to earn it. Considerate is not decoration here, it is the product.

- **Talk to the person, not the dataset.** Reflect answers back with warmth, especially the vulnerable ones. A past pain is acknowledged and walled off ("that one's brutal, we'll make sure it can't happen again"), not silently stored.
- **Never make them feel behind or judged.** Maturity and level questions are framed so the honest answer is the safe answer ("honest beats aspirational, the kit adapts either way"). No question implies a right answer they are failing.
- **Calm, plain, second-person voice.** Sharp writing, kind tone. No hype, no jargon, no exclamation spam, no em dashes.
- **Minimalism is kindness, not just style.** One decision per screen lowers the load for someone already stretched. The no-scroll rule exists to protect them from overwhelm, not only to look clean.
- **Earn every tap.** Each step shows the person why it helps *them*, not why the engine wants it.
- **Celebrate truthfully.** The reveal and the ship moments are real, proportionate wins, never manufactured confetti.
- **Protect their effort.** If a build fails, the safety net catches them (the email fallback already exists). They never lose what they gave us, and they never hit a dead end.

This law sits above the mechanics below. When a copy choice and a clean data choice conflict, the human wins.

### 2.1 The knowledge bank (what grows, step by step)

Every kit is, underneath, building a typed model of the user that accretes one field per step. Call it the **knowledge bank**. Two laws govern it:

1. **Each step collects exactly one class of data.** One screen, one field, one decision.
2. **Each step is conditioned on the bank so far.** Step N+1's questions and options are a pure function of fields collected in steps 1..N. This is already partly true in the code (the `showIf` adaptive branching and the `chartFeed` matrices); we make it the explicit contract.

The output is a **deterministic projection of the completed bank** through the processing pipeline below. Nothing in the output is invented; everything traces to a captured field.

This is what the founder asked to see justified at every stage: for each step we state *what* we collect, *why*, *what it unlocks next*, and *how the bank evolves*. Those tables are in the per-kit sections.

### 2.2 The six processing layers (intake to output)

The gap between a user's raw taps and a world-class output that any AI tool on any platform cannot fail to follow is six explicit layers. Stability comes from each layer being narrow and checkable.

1. **Capture.** Structured intake only. Enums and chip-picks, never free-text blobs, except the one homework paste. Determinism in, determinism out. A captured field is always one of a known set.
2. **Normalize.** Raw picks map to canonical entities. "Invoicing", "send invoices", "billing" all resolve to one canonical workflow node. (Already done via `chartFeed` + the adaptive matrices; we formalize it.)
3. **Enrich.** The homework paste (what the user's AI already knows about them) plus optional domain enrichment merge into the bank. This is where "knows you" depth comes from. The enrichment is parsed into the same typed fields, never appended as a raw blob.
4. **Synthesize.** The LLM fills a **governed mould**, never freestyles. The output schema is fixed; the model only fills named slots from bank fields. (Build-partner law: AI fills a contract, the system owns the chassis.)
5. **Verify.** The synthesized output is checked against a contract before a human sees it: every slot filled, zero unresolved placeholders (`[FILL IN]` etc.), zero platform-specific assumptions ("in Claude you...", removed), and every instruction carries an acceptance check. A failed verify silently regenerates; it never surfaces a broken artifact. This layer is the "impossible for any AI tool to not follow it" guarantee.
6. **Render.** The branded hero PDF, plus the training-file ZIP, plus the on-screen two-button affordances. No walls of text on screen; the text lives behind the buttons.

### 2.3 The output contract: "any AI tool, any platform, cannot fail to follow it"

This is the founder's stability bar, made concrete. Every output artifact (the hero PDF and every markdown training file) obeys:

- **Platform-agnostic content, tool-specific instructions.** The kit content is "your personalized AI training files for any platform", never "this is for Claude." But every copy-paste or install instruction names the user's own most-used tool, the one they pick at the tool step (for example "paste this into ChatGPT"), never a hardcoded default. Never tell a person to paste into a tool they did not choose. If they pick "not sure yet", fall back to the neutral "your AI". The tool shapes the instructions only, never the content.
- **Self-contained.** No artifact references another file the user does not have. No unresolved placeholders. If a value is missing from the bank, the artifact does not claim it.
- **Self-verifying.** Every instruction block ends with a "you have done this correctly when..." acceptance line. An AI executing the file can check its own work.
- **Single source of truth.** Each fact about the user lives in exactly one file (the identity file). Other files reference the behavior, not re-state the fact, so there is nothing to drift.

### 2.4 The output model (what the user actually gets)

One shape across all four kits:

- **One hero output.** A beautiful, branded, stunning **PDF**, deeply personalized, the star. This is the "start here" document. It is the thing worth screenshotting.
- **The training files.** The supporting markdown files (identity file, brief, job file, etc.) packaged as a **ZIP with an instructions README**.
- **Two buttons, everywhere. Never a wall of text.** For any individual file the user might use, exactly two affordances: **Download** and **Copy** (copy = paste straight into your AI tool now). The full text never renders on screen by default.
- **Profile-gated persistence.** If the user **creates a profile**, everything saves there and is downloadable on demand, forever. If they do not, they can have it **emailed** to them as the ZIP (hero PDF + markdown files + instructions). Either path, they leave with everything.
- **Tune is an escape hatch.** Outputs are personalized by default so tuning is rarely needed, but each output keeps a quiet "not right? redo" for when the engine misses. Tune is never a primary action.

### 2.4.1 How outputs are produced: a base-harness library, customized per user

The hero output and the training files are not generated cold from a prompt each time. Each kit draws from a library of vetted base harnesses, one per output type (a vibe-coding build harness, an org-chart agent-brief harness, a memory job-file harness, and so on). The kit retrieves the right base harness and customizes it from the knowledge bank, filling the named slots, never rewriting the chassis. This is the "AI fills a governed mould, never freestyles" law (section 2.2, synthesize) made concrete: the harness is the mould.

Why this matters: starting from a vetted, complete harness and personalizing it is far more stable than trusting a cold generation to come out whole. It is what makes the "any AI on any platform cannot fail to follow it" bar (section 2.3) achievable, because completeness and the embedded acceptance checks live in the harness, not in the luck of one generation. It also lets the library improve over time without re-prompting from zero: fix the harness once, every future kit inherits it.

The harnesses are versioned and hosted in a library. MCPmarket is the candidate host (the org already has a skills/toolkits surface there; today it holds one stub skill, so this is greenfield). This is the intended mechanism for the first-skill and training-file outputs, to be designed properly when we build the first-skill artifact in the port. It is not a prerequisite to start the flow.

### 2.5 The universal sequential flow (the wizard spine)

One action per screen. No scroll on mobile, every screen (reuse the existing `h-screen-safe` / `overscroll-contain` frame). The user advances; they never hunt.

1. **Redeem.** Enter or scan the code. Kit identity appears. (Exists, keep.)
2. **Intake.** One question per screen, adaptive. (Mostly exists, keep and tighten per kit.) Each screen is one bank field.
3. **Homework (new placement, before the build).** One screen: "Before we build, pull in what your AI already knows about you." Copy the prompt, run it in your tool, paste the answer back. This is the Enrich layer made visible, and it is now a deliberate step the user can actually do, not a card behind a spinner. Skippable, but framed as the thing that makes the kit sharp.
4. **Build.** One calm, honest screen that shows the decomposed work being done for them, the build trace (section 2.6), instead of a blank spinner or a dump of cards. No actions compete with it.
5. **Reveal.** One screen: the hero PDF, presented beautifully. Two buttons: Download and Copy (or Open). This is the star; nothing else shares the screen.
6. **Post-build action screens, each its own screen, advance through, all skippable:**
   - **Voice.** "Make it sound like you." (May be pre-filled from the homework.)
   - **Keep it.** "Save to your profile" (create profile) or "Email me everything" (the ZIP).
   - **The plan.** The 7-day or 90-day plan as a single interactive checklist screen.
   - **Ship.** "I shipped it", one celebratory screen, then the door to the next kit.

The current `KitHome` reveal-as-scroll is retired. Its contents become these one-action screens.

### 2.6 The build trace (show the thinking)

The build is the one unavoidable wait. Instead of a blank spinner, give the person a small, honest window into the decomposed work happening for them: the harnesses firing, the requests going out, the answers coming back. It does two jobs at once. It reassures (something real is happening, and it is about *me*), and it quietly proves the quality behind the output without a word of marketing.

- **Radically minimal.** One calm line at a time, or a short resolving stack. No chrome, no percentage bars, no progress theater. Each line names a real stage in plain human language and resolves to a quiet check.
- **Honest, not decorative** (build-partner law: honesty lives in the renderer). Each trace line maps to a real backend stage. The `kit-compose` build already reports per-artifact status (`artifact_statuses`) and the front end already polls it (`useKitBuild`, every 2s). The trace is driven by those real transitions, not a fixed timer. A deterministic stage may flash by; we never invent latency to look busy.
- **Human labels, not jargon.** The six processing layers (section 2.2) surface as plain lines: "Reading your picks", "Pulling in what your AI already knows about you", "Drafting your [hero output]", "Drawing the autonomy lines" (org chart) or "Writing your voice into it" (memory), "Checking every line is followable on any tool", "Putting your kit together". The Verify layer is named on purpose, because it is the quality promise made visible.
- **Time-boxed.** If the real work finishes fast, the trace finishes fast. We do not pad. If a stage runs long, its line honestly says it is still working rather than stalling silently. Target the whole thing under roughly 10 to 15 seconds; anything longer is already covered by the safety net and the email fallback.
- **One thread of attention.** The trace owns the screen alone (the sequential law). Nothing else competes with it, and the moment it completes it hands straight to the reveal.

The tone of the trace lines follows the humanity law (section 2.0): it should feel like a careful colleague narrating their work for you, calm and specific, not a loading bar pretending to be busy.

### 2.7 Desktop is the primary surface (native, not a centered phone)

Vibe coders work at a desk, and so do most people scoping a business or building an identity. Desktop is where this lives, and it must feel like a native desktop app, not a phone column stranded in a sea of whitespace. One responsive product: mobile-first in discipline, desktop-first in where it lives.

- **The one-action discipline still holds.** The action pane presents exactly one decision at a time, on desktop as on mobile. We never trade focus for density.
- **The horizontal space earns its keep with a living panel.** Desktop is a calm two-pane. Left: the current single action (eyebrow, headline, the one input or pick set, the nav). Right: "your kit is taking shape", a panel that accretes the knowledge bank as the person answers, their name and role, how they like to work, their pains turned into guardrails, their build, their tool. It is never empty; it fills as they go. This both uses the space and makes the "we are building this around you" promise literal and visible.
- **The build trace goes cinematic in that right panel**, calm and full-size, while the left holds a quiet "building" headline. The reveal brings the hero PDF to center stage at full size, not a thumbnail.
- **Mobile is unchanged**: the strict single-column, no-scroll flow. The two-pane collapses to the single action pane below roughly 900px; the living panel's content is what the mobile reflect-backs and previews already convey inline.
- **Chrome that feels like an app.** A real top bar (wordmark, class, a slim progress spine), a generous but bounded content width (around 1100px), and the light kit palette full-bleed. No browser-tab-in-a-modal feeling.

This is the surface most people will judge the product on. It should look like something they would happily build alongside all day.

---

## 3. Vibe Coding (the solution)

Persona: someone experimenting with vibe coding who wants to level up. They want the AI to know them, their preferences, their past pains, and what they want to build. The kit's job is to make any AI tool work *their* way on *one* real build.

Today's intake leans on "where does your time go / what is repetitive", which is process-flavored and overlaps Autonomous Business. We re-center it on **you, your preferences, your past pains, your build.**

### 3.1 Knowledge bank + per-step justification

| Step | Field collected | Why we ask | What it unlocks next | Bank after this step |
|---|---|---|---|---|
| 1 | **Who you build for** (self / work) | sets the whole frame and vocabulary | swaps role options and examples downstream | `{ audience }` |
| 2 | **Identity** (name, what you do) | the AI's first fact about you | personalizes every file's header and the brief's framing | `+ { name, role }` |
| 3 | **How you like to work** (preferences: explain-as-you-go vs just-do-it, small steps vs big leaps, ask-first vs act) | this is the differentiator: the AI's *working style with you* | becomes the behavior contract in the identity file | `+ { workStyle }` |
| 4 | **What has burned you** (past pains: lost context, code would not run, scope crept, AI forgot the plan) | turns scar tissue into guardrails | becomes the "avoid these" rules and the acceptance checklist | `+ { pains }` |
| 5 | **The one build** (what you want to ship) | the solution this kit exists to brief | becomes the build brief's subject | `+ { build }` |
| 6 | **Your tool + level** | install wording + plan difficulty | sets platform-agnostic framing and the 7-day pace | `+ { tool, level }` |
| 7 | **Homework** (what your AI already knows about you) | enriches identity + preferences with real history | merges into `workStyle` and `pains` with evidence | `+ { history }` |

### 3.2 Homework prompt purpose
Pull the user's real working history out of their existing AI so the identity file is grounded, not guessed. The paste is parsed into the same `workStyle` / `pains` fields, raising their confidence.

### 3.3 Hero PDF: "Your Vibe Coding Operating Kit"
- Who you are and how you work, so any AI works your way (from steps 2 to 4 + homework).
- The one build, fully briefed as a spec with acceptance criteria (so any tool can execute it).
- The 7-day ship path, day 1 is tonight.

### 3.4 Training-file ZIP
`about-me.md`, `how-i-work.md` (the working-style behavior contract), `this-build-brief.md` (the spec), `7-day-plan.md`, plus `README.md` install instructions. First-skill ZIP stays as the installable skill.

### 3.5 Post-build screens
Voice, Keep-it, Plan, Ship (universal spine).

---

## 4. Autonomous Business (the process)

Take one recurring workflow off your plate by day 7, built from the user's own history.

### 4.1 Knowledge bank + per-step justification

| Step | Field | Why | Unlocks | Bank |
|---|---|---|---|---|
| 1 | **Who for** (self / business) | frame + vocabulary | swaps function lists | `{ audience }` |
| 2 | **Business identity** (sector, role) | grounds every example | tailors the function options | `+ { sector, role }` |
| 3 | **Functions on repeat** (multi) | the candidate processes | feeds the time-sink pick | `+ { functions }` |
| 4 | **Biggest time-sink** (one) | the process to automate | feeds the workflow + steps | `+ { focusProcess }` |
| 5 | **What it involves** (steps, multi) | the decomposition | becomes the automation's step list | `+ { steps }` |
| 6 | **Hours/week + revenue proximity** | impact + priority | ranks and justifies the choice | `+ { hours, revenue }` |
| 7 | **AI maturity** | how ambitious the automation can be | sets autonomy ceiling | `+ { maturity }` |
| 8 | **Tool** | install wording | platform-agnostic framing | `+ { tool }` |
| 9 | **What leaves the building** (guardrails) | the autonomy line | marks which steps stay human | `+ { guardrails }` |
| 10 | **Homework** | real history of the process | grounds the step list | `+ { history }` |

### 4.2 Hero PDF: "Your First Automation"
The one workflow, decomposed into steps, each step tagged AI-owns / AI-assists / you-only, the build path to get it running by day 7, and the guardrails.

### 4.3 ZIP
`the-process.md`, `automation-brief.md` (with acceptance criteria), `guardrails.md`, the scaffold ZIP, `7-day-plan.md`, `README.md`.

---

## 5. Agentic Org Chart (the company)

The founder's explicit map: look at a specific division, drill to its tasks, find the handoffs, mark the grey areas (full autonomy / supervised / never), and turn it into a ranked list of where to start building the agentic org.

### 5.1 Knowledge bank + per-step justification

| Step | Field | Why | Unlocks | Bank |
|---|---|---|---|---|
| 1 | **Who for** (self / business) | frame | swaps function lists | `{ audience }` |
| 2 | **Business identity** (sector, role) | grounds the chart | tailors functions | `+ { sector, role }` |
| 3 | **Functions / divisions** (multi) | the boxes of the chart | feeds the focus pick | `+ { divisions }` |
| 4 | **Where time burns most** (one division) | the division to drill into first | feeds the task list | `+ { focusDivision }` |
| 5 | **The grind there** (the workflow) | the work inside the division | feeds the tasks | `+ { grind }` |
| 6 | **What it involves** (tasks, multi) | the task-level units to tag | each becomes a chart node to color | `+ { tasks }` |
| 7 | **AI maturity** | realistic autonomy ceiling | sets default tags | `+ { maturity }` |
| 8 | **Guardrails** (never without a human) | the red line | forces tasks touching a guardrail to non-autonomous | `+ { guardrails }` |
| 9 | **Homework** | how the work really flows | sharpens task list + handoffs | `+ { history }` |

### 5.2 The autonomy model (the founder's three-way + handoffs)
Every task node is tagged one of three, and the **handoffs** (seams where work passes between a human and an agent) are marked explicitly because that is where trust breaks:

- **Green: AI runs it.** Full autonomy, no human in the loop.
- **Amber: AI assists, you approve the handoff.** Supervised; the handoff is the checkpoint.
- **Red: you only.** Never AI. Anything touching a guardrail is forced here (honesty floor, already in code from PR #193).

### 5.3 Hero PDF: "Your Agentic Org Chart"
The branded chart, nodes color-coded green/amber/red, handoffs drawn as the seams, plus a **ranked list of the first 1 to 3 agents to stand up and why**, plus the 90-day expansion path across the chart.

### 5.4 ZIP
`org-chart.md` (the structure as text), `where-to-start.md` (ranked, with reasons), `first-agent-brief.md` (acceptance criteria), `90-day-plan.md`, `README.md`. The live `OrgChartView` stays as the on-screen render; the PDF is the takeaway.

---

## 6. Memory & Identity (the person)

Building memory and identity so the AI knows *you*: narrow its field of view to specific sessions and personalize it. This is the richest identity model of the four, and the most "training files for any platform."

### 6.1 Knowledge bank + per-step justification

| Step | Field | Why | Unlocks | Bank |
|---|---|---|---|---|
| 1 | **Who for** (you / small team) | frame | swaps hat vs role vocabulary | `{ audience }` |
| 2 | **Identity** (name, what you do) | the core fact | header of every file | `+ { name, role }` |
| 3 | **The job to hold** (which part of your work the AI runs first) | the narrowed field of view: not "be my everything", but "in this kind of session you are X" | becomes the job file's role | `+ { job }` |
| 4 | **What that job covers** (tasks, multi) | the scope = the field-of-view boundary | becomes the job file's scope and the self-correction targets | `+ { scope }` |
| 5 | **Tool** | install wording | platform-agnostic framing | `+ { tool }` |
| 6 | **Voice** (how you write) | central here: the AI sounds like you | becomes `my-voice.md` and tone in the job file | `+ { voice }` |
| 7 | **Never store** (privacy guardrail) | the hard line on what the operator holds | becomes the keep/never rules | `+ { neverStore }` |
| 8 | **Homework** (your real chat history) | mines who you actually are from sessions | grounds identity + voice with evidence | `+ { history }` |

### 6.2 Hero PDF: "Your AI Identity Pack"
Who the AI is when it works with you (job + scope = the narrowed field of view), how you sound (voice), what it must never store, and the self-correction loop that kills its own mistakes.

### 6.3 ZIP
`about-me.md`, `my-voice.md`, `the-job.md` (role + scope), `keep-and-never.md`, `self-correct-footer.md`, the first-skill ZIP, `weekly-hygiene.md`, `README.md`. Single-source-of-truth: every fact lives in `about-me.md`; other files reference behavior.

---

## 7. What changes in the code (build scope preview)

Not built yet; this is the surface map so the founder can see the size.

- **`KitIntake.tsx`**: unify on one adaptive one-question-per-screen engine for all four kits (today there are two shapes, linear and forked). Add the **homework step** as the final intake screen, before submit.
- **`HomeworkCard.tsx`**: promote from a card behind the loading spinner to a full intake screen with its own copy/paste/continue. Fixes the flash bug by removing it from the composing phase entirely.
- **`KitHome.tsx`**: retire the long reveal scroll. Replace with a **post-build wizard** of one-action screens (reveal, voice, keep-it, plan, ship). New small router-or-state machine inside `/kit/me`.
- **New: the build trace component** (section 2.6). A radically minimal live-stage view driven by the real `artifact_statuses` transitions from `useKitBuild`, replacing the composing spinner. Honest stage-to-line mapping, human copy.
- **Humanity copy pass** (section 2.0) across every kit screen: reflect-backs on the vulnerable answers, judgment-free maturity framing, calm second-person voice. This is a content sweep, not just structure.
- **New: hero PDF renderer.** A branded, personalized PDF per kit (the star output). Likely a print-styled route screenshotted to PDF, or a client PDF lib. Decision pending (section 8).
- **Output affordance**: collapse every artifact's on-screen text wall to the **two-button** pattern (Download / Copy). Keep Tune as a quiet per-output escape hatch.
- **Persistence**: profile-save path vs email-the-ZIP path. The email + ZIP path largely exists (`SendPackCard`); the profile-save path needs the "create a profile" branch.
- **Copy/narrative sweep**: strip "for Claude" framing everywhere; reframe as "your AI training files for any platform."
- **Presets**: re-center the Vibe Coding intake on preferences + past pains (section 3.1); keep the other three presets' fields, add the explicit per-step justification and the formalized normalize map.

---

## 8. Decisions (LOCKED 2026-06-19, founder approved all recommendations)

1. **Hero PDF rendering: LOCKED to the print-styled web route to PDF.** Cheap, on-brand, deterministic, stays in the design system. No heavy PDF pipeline.
2. **Profile vs email: LOCKED to email as the zero-friction default.** Profile is an upsell shown once, never pushed.
3. **Vibe Coding re-centering: LOCKED.** Rewrite the intake around preferences (step 3) and past pains (step 4) per section 3.1.
4. **Unified intake engine: LOCKED to consolidate now.** The forked org-chart intake folds into the shared one-question-per-screen engine so all four behave identically.
5. **Build-trace fidelity: LOCKED to the honest hybrid.** Instant layers (Capture, Normalize) show as a brief pre-roll, a beat each; the genuinely async stages (per-artifact Synthesize, then Verify) are driven by real `artifact_statuses` status. No purely cosmetic timed sequence.

## 9. Build order

Vibe Coding first, as the reference flow. Mock-driven: build the surfaces, screenshot them headless via a `/preview` fixture harness, founder reacts, lock, then implement for real on a branch and prove it live before replicating the pattern to Autonomous Business, Agentic Org Chart, and Memory & Identity.
