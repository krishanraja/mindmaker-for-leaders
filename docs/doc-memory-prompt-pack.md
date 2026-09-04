# Distillation — Mindmaker "Memory, Identity & Self-Correction Prompt Pack"

**Source:** `C:/Users/krish/ctrl-corpus/_src/memory-prompt-pack.pdf`
**Author/brand:** MINDMAKER — Krish Raja — "MAVEN — 2026"
**Format:** A 3-page "Live Build-Along — Take-Home Kit" handout. The take-home companion to a live workshop where attendees build three files alongside Krish. Footer on every page: "MINDMAKER — THE PROMPT PACK." Closing tagline: **"MINDMAKER — HELPING YOU MAKE YOUR MIND UP."**
**One-line essence:** A do-it-tonight kit that turns a generic chatbot into "a specific person on your team" by building three plain-text files in order — `identity.md`, `memory.md`, and a `self-correct footer` — each ending in a pass/fail test. CTRL is positioned as the place these three files live: "private, encrypted, portable, and still yours when you change tools, jobs, or companies."

---

## CORE THESES

1. **The same model is a different employee once it reads the right file first.** The central, repeated claim: you don't need a better model, you need to give the model context. *"The same model behaves like a different employee once it reads the result first."* / *"makes you behave like a specific person on my team, not a generic assistant."*

2. **Three layers, built in a fixed order, each one building on the last.** Identity → Memory → Self-correction. *"Build the three files in order. Each one builds on the last."* / *"Identity, then memory, then self-correction. Each file references the one before it."* You can't skip ahead; memory references identity, the self-correct footer is appended to both.

3. **The prompts interview you — they don't ask you to fill in blanks.** This is the signature mechanic of the whole pack. *"The prompts do not ask you to fill in blanks. They interview you, one question at a time, and write the file from your answers."* The AI asks ONE question at a time, never batches, and **refuses vague answers**. *"Specific in, specific out."*

4. **Every layer is done only when its test passes — not when you feel finished.** *"You are done with a layer when its test passes."* Each of the three layers ships with a concrete pass/fail test ("TEST IT, DONE WHEN…", "the before/after test", "test the loop"). The bar is behavioural and observable, not aspirational.

5. **The cold-start tax is real and quantifiable.** Running a task on a cold chat vs. a loaded one exposes the cost you've been silently paying. *"The gap between those two answers is the tax you have been paying."* / Memory exists "So Monday stops being its first day."

6. **A correction must become a rule, or the mistake recurs.** Self-correction is *required, not optional*. *"It turns every correction into a rule the system keeps, required, not optional."* / *"The same mistake does not get to happen twice."* And critically: **"Never let a worker grade its own homework."**

7. **Fix the class, not the instance.** The single most repeated structural idea in the pack. A rule must kill *the whole class* of a mistake, not the one instance. *"write a rule that kills the whole class of that mistake, not just the single instance."* Worked example: *Instance: "do not misspell Lauren." Class: "confirm proper nouns against what I gave you before using them."*

8. **Plain text you own beats settings trapped in a platform.** The files are plain text precisely so they're portable across Claude, ChatGPT and Gemini — "they answer from the same brain." And ownership is the moral: *"still yours when you change tools, jobs, or companies."*

9. **The manual paste step is the bug CTRL exists to remove.** The pack is honest that the DIY version has friction — you have to manually paste the new rule into your file. *"You cannot edit the file from inside a chat window, and that manual step is exactly what a persistent context layer automates."* This is the explicit product wedge for CTRL.

---

## FRAMEWORKS (named models, sequences, lists — verbatim components)

### Framework A — "The Three Files" / "What You Will Build" (the core stack)
Built in strict order; each builds on the last; each has a one-line reason-for-being:
1. **`identity.md`** (Identity, LAYER 01) — *"So it stops answering like a stranger."*
2. **`memory.md`** (Memory, LAYER 02) — *"So Monday stops being its first day."*
3. **`self-correct footer`** (Self-correction, LAYER 03) — *"So a mistake dies the first time you catch it."*

### Framework B — "How To Use" (3 operating rules for the whole pack)
1. **Build in order** — "Identity, then memory, then self-correction. Each file references the one before it."
2. **Let it interview you** — "Each prompt makes the AI ask one question at a time and refuse vague answers. Answer honestly. Specific in, specific out."
3. **Run the test** — "Each layer ends with a test prompt. If it passes, the layer is live. Then move on."

### Framework C — The Identity Interview: 4 areas the AI must cover (LAYER 01)
The build prompt makes the AI interview you across **four named areas**, one question at a time, refusing generic answers:
- **VOICE** — "Ask me to paste 2 or 3 things I actually wrote recently: an email, a Slack message, a post. Read the text. Infer how I sound: sentence length, how I open and close, the words I reach for, the words that never appear. Tell me what you inferred, and flag where you are confident versus guessing."
- **STANDARDS** — "Ask me what 'good' looks like before you hand me anything. Make me name the bar ('a point of view, not a summary'). Probe until it is testable."
- **NEVER** — "Ask me about the last 2 or 3 times an AI gave me something I deleted or rewrote. For each one, write a rule that kills the whole class of that mistake, not just the single instance."
- **MISSING** — "Tell me what you still do not know that would change how you work for me, and ask for it."

The identity build prompt is a **3-step sequence**: Step 1 = ask what role to play ("my head of content, my chief of staff, my analyst"), wait for the answer. Step 2 = interview across the four areas, never batch, refuse generic. Step 3 = "write a tight identity.md from my answers, not your assumptions. Keep it short. Then write your next reply fully in character so I can feel the difference."
Generic answers it must refuse, by name: **"professional", "clear", "data-driven".**

### Framework D — The Memory build: a 4-step interrogation (LAYER 02)
Prompt opens: *"# Turn my brain-dump into a tight memory file. Interrogate it first."* Input: "[paste 5 to 10 lines: what you do, who you serve, what is true right now]."
- **Step 1 — Interrogate the dump:** "ask me up to 5 questions. Ask about whatever is vague, missing, or reads like marketing copy instead of what is actually true. One question at a time."
- **Step 2 — Pressure-test priorities:** "if I could move only one of these this month, which one, and what would visibly change if it worked? Keep the ones that survive the question."
- **Step 3 — Surface settled decisions:** "Ask me which calls I keep relitigating, a decision I have already made but my team or I keep reopening. Capture those so they stop coming back."
- **Step 4 — Organise what survives.**

### Framework E — The 4 (sometimes 5) memory.md sections
The fixed schema for `memory.md`:
- **BUSINESS:** "who I am, what we do, who we serve"
- **PRIORITIES:** "the top 3 things that matter right now"
- **DECISIONS MADE:** "settled calls, so they do not get relitigated"
- **PEOPLE AND PROJECTS:** "recurring names and the shorthand I use"
- (Optional 5th) — "If something that matters to how I work does not fit these four, propose a fifth section and tell me why. Otherwise stay at four."
Constraints: "Keep the whole thing under one page. Cut anything not reusable. Flag anything I should not store for privacy, and tell me why."

### Framework F — "STORE THIS / NEVER STORE THIS" (the memory hygiene matrix)
A two-column do/don't table:
- **STORE THIS (+):** Who you are, what the business does, who it serves. / Rolling priorities, the three things that matter now. / Decisions already made. / Recurring people, projects, and your shorthand.
- **NEVER STORE THIS (✗):** Passwords, keys, "anything that is a breach waiting to happen." / Other people's private data you would not want quoted back. / Half-thoughts and noise that bloat the file. / "Anything you would hate to see in an export."
Governing rule: *"Keep it sharp, not a junk drawer. Never store anything you would be uncomfortable seeing in an export."*

### Framework G — The Self-Correction Footer: 3 numbered steps (LAYER 03)
Appended to the bottom of BOTH `identity.md` and `memory.md`. *"Run this on any failure or correction, before anything else:"*
1. **LOG** "what broke and the root cause, not just the symptom."
2. **PROPOSE** "one rule that prevents the whole class of this mistake, not the single instance." (Worked example: *Instance: "do not misspell Lauren." Class: "confirm proper nouns against what I gave you before using them."*)
3. **Show me the exact line to add to memory.md. I paste it in.** ("You cannot edit the file from inside a chat window, and that manual step is exactly what a persistent context layer automates.")
Hard gate: *"Never mark a task complete without running this check first. The same mistake does not get to happen twice."*

### Framework H — The three layer-tests (the proof mechanics)
- **Identity test ("TEST IT, DONE WHEN"):** "Ask it the same boring question you always ask ('draft a reply to this', 'give me three angles'). Run it with the file and without. You are done when you stop editing its answer back into your voice, it takes a point of view without being asked, and it cleanly refuses anything on your NEVER list."
- **Memory test ("the before/after test — RUN BOTH, COMPARE"):** RUN 1 (cold) = brand-new chat, no memory, ask "[one task you do every week]". RUN 2 (loaded) = paste memory.md at top, ask the exact same thing. "Loaded should skip the questions, hit your priorities, and pick up where you left off." (Privacy note: "strip names and numbers before pasting it into a tool you do not control.")
- **Self-correction test ("test the loop — BREAK IT ON PURPOSE"):** Feed it a real mistake — "[describe one: wrong tone, skipped a step, invented a fact]" — and make it run the footer. **DONE WHEN:** "It logs the cause, not the symptom. It proposes a rule that covers the whole class. The rule lands in your memory file. Next week, the same mistake is gone."

### Framework I — "Make It Stick" — the weekly cadence (TONIGHT / THIS WEEK / FRIDAY)
- **TONIGHT:** "Finish all three files on one real task."
- **THIS WEEK:** "Run every chat with identity.md and memory.md loaded."
- **FRIDAY:** "Log your first three corrections as rules."

---

## LEADER BELIEFS (what Krish believes an AI-native leader must DO / THINK / FEEL / STOP doing)

**DO:**
- Build the foundation tonight, on one real task — not someday, not in theory. "Finish all three files on one real task."
- Make the AI interview you instead of you filling in a template. Answer its questions honestly, one at a time.
- Name the bar for "good" and make it *testable* before accepting any work ("a point of view, not a summary").
- Turn every correction into a written rule that lands in your memory file. Log corrections weekly ("Log your first three corrections as rules").
- Run every chat with your identity and memory loaded — make it the default, not an occasional ritual.
- Own your context as plain text you control and can take with you.

**THINK:**
- The gap between a cold answer and a loaded answer is a tax you've been paying — measure it.
- Fix the *class*, never the instance. One good rule kills a whole category of failure.
- Settled decisions should stop coming back; relitigating made calls is waste to be engineered out.
- "Specific in, specific out" — vagueness in equals slop out.
- A worker should never grade its own homework — correction must be structural, not self-attested.

**FEEL:**
- The visceral relief of the model "feeling like a different employee" / a real teammate vs. a stranger.
- The satisfaction of *stopping* — "you stop editing its answer back into your voice."
- Confidence that "the same mistake does not get to happen twice."
- Security/ownership: your context is "still yours when you change tools, jobs, or companies."

**STOP doing:**
- Stop accepting generic adjectives as standards — refuse "professional", "clear", "data-driven."
- Stop re-explaining your business at the top of every chat (kill the cold-start tax).
- Stop editing the AI's output back into your own voice.
- Stop relitigating decisions you've already made.
- Stop storing junk — no "junk drawer," no half-thoughts, no breach-waiting-to-happen secrets.
- Stop letting the same mistake recur because the fix never became a rule.
- Stop trusting a worker to grade its own homework.

---

## PRODUCT IMPLICATIONS FOR CTRL

CTRL is named explicitly in the handout — twice — as the home for this system. The pack is, in effect, a product spec written as a workshop.

**The product premise (verbatim positioning of CTRL):**
- *"On CTRL it is one encrypted, portable layer you own, not settings trapped inside a platform."*
- *"Keep these three files as plain text you own, or load them into CTRL: private, encrypted, portable, and still yours when you change tools, jobs, or companies. Lifetime access is included with the workshop."*
- The self-correction friction is the named wedge: the manual paste step "is exactly what a persistent context layer automates."

**What CTRL should make effortless (the features this implies):**
1. **A guided, one-question-at-a-time interview engine** — not forms, not blank templates. CTRL should *interview* the leader to build their identity/memory, refuse vague answers, and flag confident-vs-guessing inferences. This is the signature UX from the pack: "ask one question at a time and refuse vague answers."
2. **Three first-class artifacts the user owns:** Identity, Memory, and a Self-Correction layer — built in order, each referencing the prior. CTRL should ship these as the spine of onboarding.
3. **Voice capture from real writing** — let the leader paste 2–3 real things they wrote; CTRL infers sentence length, openings/closings, the words they reach for, the words that never appear; and reports what it inferred + its confidence.
4. **A structured memory store with the fixed schema** — BUSINESS / PRIORITIES (top 3) / DECISIONS MADE / PEOPLE & PROJECTS, with an optional proposed 5th section. Enforce "under one page" / "keep it sharp, not a junk drawer."
5. **Automatic self-correction that closes the loop with zero manual paste.** When the AI fails, CTRL logs root cause, proposes one *class-killing* rule, and writes it into memory automatically — the thing the DIY pack admits a chat window can't do. **"Never let a worker grade its own homework"** → CTRL should gate task-completion behind a self-correction check.
6. **The before/after / cold-vs-loaded proof, surfaced in-product** — show the leader the "tax" they were paying: a cold answer vs. a loaded answer, side by side. Make the value legible.
7. **Privacy guardrails built in** — flag/refuse storing passwords, keys, others' private data, "anything you would hate to see in an export." Strip names/numbers before any external tool. Encryption is part of the promise ("one encrypted, portable layer you own").
8. **Portability as a feature, not a footnote** — the same context should drive Claude, ChatGPT and Gemini "from the same brain," and travel with the user across tools/jobs/companies.
9. **A weekly cadence / habit loop** — TONIGHT (build), THIS WEEK (run loaded every time), FRIDAY (log three corrections as rules). CTRL can operationalise this as nudges and a "corrections logged this week" surface.

**What "the next step for a leader" looks like inside CTRL:** finish one layer, run its test, see it pass, move to the next. Progress is gated on a passed test ("If it passes, the layer is live. Then move on."), not on completion percentage. The "done when" criteria are observable behaviours CTRL can detect: you stopped editing its output, it took a point of view unprompted, it refused a NEVER-list item, the rule landed in your file, next week the mistake was gone.

**What CTRL should learn and remember about the leader:**
- Their **voice** (sentence length, how they open/close, words they reach for, words that never appear).
- Their **standard for "good"** (their testable bar).
- Their **NEVER list** (classes of output they delete/rewrite).
- Their **business** (who they are, what they do, who they serve).
- Their **rolling top-3 priorities** ("if I could move only one this month…").
- Their **settled decisions** (so they stop being relitigated).
- Their **people, projects and shorthand** (recurring names).
- Their **corrections-turned-rules**, accumulating over time.

---

## VOICE NOTES (Krish's actual language, for speaking in his voice)

**Recurring framing / signature lines:**
- "So it stops answering like a stranger."
- "So Monday stops being its first day."
- "So a mistake dies the first time you catch it."
- "Specific in, specific out."
- "Never let a worker grade its own homework."
- "The same mistake does not get to happen twice."
- "The gap between those two answers is the tax you have been paying."
- "the same model behaves like a different employee once it reads the result first."
- "a point of view, not a summary."
- "Keep it sharp, not a junk drawer."
- "anything that is a breach waiting to happen."
- "anything you would hate to see in an export."
- "still yours when you change tools, jobs, or companies."
- Brand tagline: **"MINDMAKER — HELPING YOU MAKE YOUR MIND UP."**

**Metaphors & analogies he reaches for:**
- The AI as an **employee / teammate** — "a specific person on my team," "a different employee," "my head of content, my chief of staff, my analyst," "Never let a worker grade its own homework."
- **Stranger vs. someone who knows you** — "stops answering like a stranger."
- **Monday / the first day** — context so the system isn't perpetually new ("Monday stops being its first day").
- **Tax** — the cost of operating without context.
- **Class vs. instance** — the spelling-of-Lauren example.
- **Junk drawer** — what a memory file must not become.
- **Grading your own homework** — why self-correction must be external/structural.
- **Mistakes that "die" / don't "get to happen twice"** — corrections as kills.

**Tone & style:**
- Short, declarative, imperative sentences. Lots of second person ("you," "your," "make me," "ask me").
- Action-dated cadence in caps: TONIGHT / THIS WEEK / FRIDAY, DONE WHEN, RUN BOTH COMPARE, BREAK IT ON PURPOSE, PASTE INTO CLAUDE.
- Plain-spoken, anti-jargon, anti-corporate-filler — he actively *names and refuses* corporate vagueness ("professional", "clear", "data-driven").
- Test-driven and outcome-led: every claim is tied to an observable result you can check.
- Confident, slightly contrarian, builder-energy. Practical over theoretical: "You will not write this from a blank page."
- Honest about friction (admits the manual paste step) — credibility through candor, then turns the limitation into the product pitch.

---

## ICP SIGNALS (who this leader is)

- A **time-poor operator/founder/CEO** who already uses AI tools daily (Claude-first, but also ChatGPT and Gemini) and is frustrated they answer "like a stranger."
- Someone who **writes a lot in their own voice** (emails, Slack, posts) and is tired of **editing the AI's output back into their voice**.
- A **decision-maker with a team** — references "my team or I keep reopening" decisions; roles named are "head of content, chief of staff, analyst." They delegate and they relitigate.
- They **value specificity, standards, and a point of view** over summaries and generic polish; they have a clear sense of what "good" looks like even if they haven't articulated the bar.
- They **struggle with:** the cold-start tax (re-explaining themselves every session), generic/slop output, repeated mistakes, relitigated decisions, and AI that won't take a stance.
- They **value:** ownership and portability ("still yours when you change tools, jobs, or companies"), privacy/encryption, and getting it done *tonight on a real task* rather than in theory.
- They are **hands-on enough to paste prompts and build files**, but want the friction removed — the ideal CTRL customer is exactly the person who did this manually in the workshop and now wants it automated and persistent.
- Workshop/maven context implies a **premium, education-led buyer** ("Lifetime access is included with the workshop") who invests in leveling up how they work with AI.

---

## NOTES ON SOURCE FIDELITY
- This is a tight 3-page handout (~1,500 words); I have quoted it close to exhaustively above. The cover page's stylized headline renders garbled in raw extraction ("SIdeelfn-tCitoyr,reMcetmioonry &") because the design overlaps "Identity, Memory & Self-Correction" — that title is the canonical name of the kit.
- Every prompt block ("identity.md — the build prompt", "memory.md — the build prompt", "the self-correct footer") is reproduced verbatim in the frameworks above and is paste-ready.
