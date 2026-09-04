# INTEL — The Identity / Memory / Self-Correction Methodology (the proprietary "it knows me and gets sharper" engine)

> **Track:** The intelligence behind the scenes — the actual, named methodology that produces "it knows me and gets sharper." Distilled from the canonical source `C:/Users/krish/ctrl-corpus/_src/memory-prompt-pack.pdf` (read in full, all 3 pages, both extracted renderings), cross-read against `_ingest/doc-memory-prompt-pack.md`, `_ingest/doc-ai-identity-memory.md`, the live in-code expression `mm-ctrl/supabase/functions/_shared/kit-presets/memory-identity/preset.ts` (+ `prompts.ts`, `templates.ts`), and the real DB schema (`user_memory`, `user_patterns`, `user_decisions`).
>
> **Why this is the file that decides the product:** CTRL's defensibility is NOT the Memory Web UI, the briefing, or the export formats. It is THIS METHODOLOGY — a specific, sequenced, test-gated protocol for building an owned context layer, and a specific self-correction loop that "never lets a worker grade its own homework." The deck and the pack ARE a product spec. The honest finding (carried from `_SYNTHESIS.md` and `app-data-learning.md`): the live app *looks* like it runs this methodology but in production the learning loops are unwired. The magic is real, the engine is built, the wires are cut. The job is to wire the methodology in, not invent a new one.

---

## 0. THE ONE-LINE METHODOLOGY

> **Three plain-text files, built in a fixed order, each gated by a pass/fail test, each appended with a forced self-correction footer, so the same model behaves like a specific managed employee that compounds instead of resetting.**

Spine slogan: **"THE MODEL ISN'T THE PROBLEM · THE SETUP IS."**
The three layers, always in this order, each building on the last:

| # | Layer | File | Reason-for-being (verbatim) | What it fixes |
|---|---|---|---|---|
| 01 | **Identity** | `identity.md` | "So it stops answering like a stranger." | No role / no standards / no lines → averages, hedges, writes like everyone |
| 02 | **Memory** | `memory.md` | "So Monday stops being its first day." | Goldfish memory; you re-brief from zero every session (the Amnesia Tax) |
| 03 | **Self-correction** | `self-correct footer` (appended to BOTH files) | "So a mistake dies the first time you catch it." | Repeats corrected mistakes forever; you pay the Teaching Tax twice |

Build rule: **"You are done with a layer when its test passes"** — progress is gated on an observable behaviour, NOT on a completion percentage.
Signature mechanic across all three: **the prompts interview you, one question at a time, and refuse vague answers.** "Specific in, specific out." You never fill in a blank template.

---

## 1. THE IDENTITY SCHEMA (Layer 01) — "FOUR PARTS · NOTHING MORE"

An identity file is **four answers written down once**. The deck names it `ROLE · VOICE · STANDARDS · NEVER-RULES`. This is the proprietary identity schema:

| Field | Question it answers | What "good" looks like | The refusal rule |
|---|---|---|---|
| **ROLE** | *Who it is* — job title + scope | "You are my head of content / chief of staff / analyst" | NOT "you are a helpful assistant" |
| **VOICE** | *How it sounds* — tone, rhythm, words used, words banned | "Three lines beats three paragraphs." Inferred from real writing, not described | Confidence-flagged: AI states what it inferred + where it's "confident versus guessing" |
| **STANDARDS** | *What good looks like* — the bar it checks its own work against before handing anything over | "A point of view, not a summary." **Must be testable** | Probe until testable; refuse "professional / clear / data-driven" |
| **NEVER-RULES** | *The lines it won't cross* — 3–5 hard rules, "no matter how the prompt is phrased" | Each rule **kills a whole class** of mistake, derived from things you actually deleted/rewrote | — |

### The Identity capture protocol (the interview, verbatim structure)
The build prompt is a **3-step sequence** and the AI is told **"Do not write the file yet."**
- **Step 1 — Ask the role.** "Ask me what role you should play... Wait for my answer before you go on."
- **Step 2 — Interview, one question at a time, never batch, refuse generic.** "If an answer is generic ('professional', 'clear', 'data-driven'), refuse it. Show me why it is generic and make me give you a concrete example instead." Cover **four areas**:
  - **VOICE** → "Ask me to paste 2 or 3 things I actually wrote recently: an email, a Slack message, a post. Read the text. Infer how I sound: sentence length, how I open and close, the words I reach for, **the words that never appear**. Tell me what you inferred, and **flag where you are confident versus guessing**." (Voice is *mined from real artifacts*, never self-described — this is the keystone capture move.)
  - **STANDARDS** → "Make me name the bar... Probe until it is testable."
  - **NEVER** → "Ask me about the last 2 or 3 times an AI gave me something I deleted or rewrote. For each one, write a rule that **kills the whole class** of that mistake, not just the single instance."
  - **MISSING** → "Tell me what you still do not know that would change how you work for me, and ask for it." (The model surfaces its own coverage gaps.)
- **Step 3 — Write the file from MY answers, not your assumptions. Keep it short. Then reply fully in character so I can feel the difference."**

### The Identity test ("TEST IT · DONE WHEN")
Run the same boring question (e.g. "draft a reply to this" / "give me three angles") **with the file and without**. **DONE WHEN:**
- "You stop editing its answer back into your voice."
- "It takes a point of view without being asked."
- "It cleanly refuses anything on your NEVER list."
- (Deck addendum) "Two people couldn't tell its draft from yours." If you *can* tell the two runs apart, "the file is too vague — tighten the voice and the never-rules until you can."

The managed-worker behaviour signature: **"Decides, drafts, then asks — in that order."** (Before/after demo: BEFORE hedges and waits for more instructions; AFTER says "Three angles. I'd ship the second... Here it is, drafted.")

---

## 2. THE MEMORY SCHEMA (Layer 02) — "SHARP BEATS BIG"

A curated context file the AI reads at the **start of every session**. Curation rule: **"Keep it sharp, not a junk drawer."** / **"USEFUL CONTEXT IN · LIABILITY OUT."** Fixed schema = **four headings** (a proposed fifth only if something genuinely doesn't fit):

| Section | Contents (verbatim) |
|---|---|
| **BUSINESS** | "who I am, what we do, who we serve" |
| **PRIORITIES** | "the top 3 things that matter right now" |
| **DECISIONS MADE** | "settled calls, so they do not get relitigated" |
| **PEOPLE AND PROJECTS** | "recurring names and the shorthand I use" |
| *(optional 5th)* | "If something that matters to how I work does not fit these four, propose a fifth section and tell me why. Otherwise stay at four." |

Hard constraints: **"Keep the whole thing under one page. Cut anything not reusable. Flag anything I should not store for privacy, and tell me why."**

### What counts as a GOOD memory — the "STORE THIS / NEVER STORE THIS" hygiene matrix
This is the proprietary definition of memory quality. **Sharp beats big.**

| STORE THIS (+) | NEVER STORE THIS (✗) |
|---|---|
| Who you are, what the business does, who it serves | Passwords, keys, "anything that is a breach waiting to happen" |
| Rolling priorities, the three things that matter now | Other people's private data you wouldn't want quoted back |
| Decisions already made | "Half-thoughts and noise that bloat the file and dull the signal" |
| Recurring people, projects, and your shorthand | "Anything you would hate to see in an export" |

Governing line: *"Never store anything you would be uncomfortable seeing in an export."*

### The Memory capture protocol — a 4-step interrogation (NOT a form)
Build prompt opens: **"# Turn my brain-dump into a tight memory file. Interrogate it first."** Input = "[paste 5 to 10 lines: what you do, who you serve, what is true right now]." The model then runs four steps:
- **Step 1 — Interrogate the dump:** "ask me up to **5 questions**. Ask about whatever is vague, missing, or **reads like marketing copy instead of what is actually true**. One question at a time." (Marketing-copy detection is the distinctive quality filter.)
- **Step 2 — Pressure-test priorities:** "if I could move only one of these this month, which one, and **what would visibly change if it worked**? Keep the ones that survive the question." (Priorities must survive a one-thing-this-month forcing function.)
- **Step 3 — Surface settled decisions:** "Ask me which calls I keep relitigating, a decision I have already made but my team or I keep reopening. Capture those so they stop coming back." (DECISIONS MADE is mined by asking *what you keep reopening*.)
- **Step 4 — Organise what survives** into the four sections, under one page, privacy-flagged.

### The Memory test — "the before / after test" (COLD vs LOADED)
- **RUN 1 (cold):** brand-new chat, no memory, ask "[one task you do every week]."
- **RUN 2 (loaded):** paste `memory.md` at top, ask the *exact same thing*.
- **"The gap between those two answers is the tax you have been paying."** Loaded should "skip the questions, hit your priorities, and pick up where you left off."
- Privacy note: "strip names and numbers before pasting it into a tool you do not control."

Portability is an explicit property: "the same `memory.md` drops into Claude, ChatGPT and Gemini and they answer from the same brain. On CTRL it is one encrypted, portable layer you own, not settings trapped inside a platform."

---

## 3. THE SELF-CORRECTION PROTOCOL (Layer 03) — the keystone, the moat

This is the single most important and most defensible part of the whole methodology, and the part the deck admits "took the most patience and never makes the launch posts." It is **forced, not optional**, and it is appended to the bottom of BOTH `identity.md` AND `memory.md` (and, in the live kit, the job file and the skill).

### The governing law (three verbatim axioms)
1. **"Never let a worker grade its own homework."** Correction can't depend on the agent noticing. It has to be **wired in as a step it cannot skip.** (Proven by the Felix scar story — see §3.4.)
2. **"The same mistake does not get to happen twice."** A correction must become a *rule the system keeps* — "required, not optional."
3. **"Fix the class, not the instance."** The single most-repeated structural idea in the entire pack.

### 3.1 — The "fix the class, not the instance" rule (the heart of it)
A correction is worthless if it only patches the one occurrence. Every proposed rule must **kill the whole class** of mistake. The canonical worked example, verbatim:
> **Instance:** "do not misspell Lauren."
> **Class:** "confirm proper nouns against what I gave you before using them."

This is the difference between a band-aid and a generalised guardrail. It is what makes the rule library compound (each rule prevents a *category* of future failure, so you reach 167 rules "without writing 167 post-mortems at midnight").

### 3.2 — The self-correction footer (the literal protocol, 3 numbered steps)
> **# SELF-CORRECTION. Run this on any failure or correction, before anything else:**
> 1. **LOG** what broke and the root cause, **not just the symptom**.
> 2. **PROPOSE** one rule that prevents the whole class of this mistake, not the single instance. *(Instance: "do not misspell Lauren." Class: "confirm proper nouns against what I gave you before using them.")*
> 3. **Show me the exact line to add to `memory.md`. I paste it in.** "You cannot edit the file from inside a chat window, and that manual step is exactly what a persistent context layer automates."
>
> **Hard gate:** "Never mark a task complete without running this check first."

### 3.3 — The deck's three-verb restatement: CAPTURE → GROUP → WRITE BACK
The deck names the mechanism as a 3-step loop (`"FORCED, NOT OPTIONAL"`):
- **STEP 1 · CAPTURE** — "Log what broke and why." "When you correct it, the correction gets written down — not waved away in chat."
- **STEP 2 · GROUP** — "Turn it into one rule." "Propose the rule that prevents the whole class of mistake, not just this instance." (This is the class-abstraction step — the GROUP verb literally means *generalise the instance into its class*.)
- **STEP 3 · WRITE BACK** — "Append it to the brief." "On approval, it joins memory. Next time the agent wakes up, it already knows."
Tagline: **"EACH RULE · A LESSON IT NEVER RELEARNS."**

### 3.4 — Why it must be STRUCTURAL, not willpower (the Felix scar)
The proof that the loop can't depend on the agent noticing:
> "An agent shipped an empty export and reported success. Felix marked the job complete. The data was gone — a pagination change upstream — and the dashboard glowed green. Nobody asked it to check the row count, so it didn't. That's the most dangerous failure there is: the quiet one, at scale, that looks fine until it doesn't."

The rule that falls out: **"Never let a worker grade its own homework. Correction can't depend on the agent noticing. It has to be wired in as a step it cannot skip."** Mantras: **"Discipline fails · structure holds,"** **"FAILURES FAIL QUIETLY · DESIGN FOR IT,"** **"A BUILD BEHAVIOUR · NOT A HABIT."** (This is the exact thesis behind CTRL's Decision Engine verification loop — see §6.)

### 3.5 — The recurrence rule (the quantified bar)
From the deck's headline metrics, the self-correction loop has hard, *observable* recurrence thresholds — this is the "gets sharper" turned into numbers:
- **4× — "A MISTAKE WON'T SURVIVE":** the same mistake does not survive four occurrences. (After 4 recurrences of a class, a rule MUST exist that kills it.)
- **1 wk — "A SILENT FAILURE WON'T SURVIVE":** a quiet/undetected failure is caught and ruled-out within a week (the weekly hygiene pass closes this — §4).
- **167 — "RULES, EACH A LESSON LEARNED ONCE":** the accumulating rule library is the visible asset of compounding.

### The Self-Correction test — "test the loop · BREAK IT ON PURPOSE"
Feed it a real mistake ("[wrong tone, skipped a step, invented a fact]") and make it run the footer. **DONE WHEN:**
- "It logs the cause, not the symptom."
- "It proposes a rule that covers the whole class."
- "The rule lands in your memory file."
- "You ask again next week — the mistake is gone."

---

## 4. THE CADENCE / HYGIENE PROTOCOL (how it compounds over time)

The methodology is not one-shot; it has a maintenance loop that keeps the files sharp instead of stale. Two cadences:

**The weekly homework cadence (TONIGHT / THIS WEEK / FRIDAY):**
- **TONIGHT:** "Finish all three files on one real task."
- **THIS WEEK:** "Run every chat with `identity.md` and `memory.md` loaded." (Make loaded the default, not a ritual.)
- **FRIDAY:** "Log your first three corrections as rules." (The weekly *bank-your-lessons* ritual.)

**The Friday weekly hygiene pass** (from the live `memory-identity` kit, `weeklyHygienePrompt`): the AI audits the context files and tightens them. Inside the make-it-a-skill seed, the hygiene loop is codified as a non-negotiable **"Learning loop"** section the generated skill must contain:
- On every run, append a dated entry to `BUILD_LOG.md`: what was done, what failed/felt off, and one rule it would add.
- Once a week, run a self-review: read `BUILD_LOG.md`, summarise what keeps going wrong, propose updates to `LESSONS.md`.
- At the start of every session, **read `LESSONS.md` before doing anything else.**
- "The self-correction rule is non-negotiable: never mark a task complete without logging the root cause of any mistake and proposing one rule that prevents the whole class of it."

**The compounding timeline** (Week 1 → Month 3 → Month 12): "It sounds like you and remembers the basics" → "It pre-empts your priorities and stops making the old mistakes" → "It's a coherent worker carrying a year of context — the thing competitors are still retyping from scratch." Slogan: **"STOP RE-TEACHING · START BANKING."**

**The economic frame that makes the cadence non-optional:** the *Teaching Tax* — "the time AI saves you is not a refund. It's the salary you pay in teaching... The saved time is the tuition. Stop pocketing it. Every correction you let vanish is a lesson you'll pay for again next week. Capture it once and it's free forever." This is the *why* behind the FRIDAY ritual.

---

## 5. THE CONCRETE DATA MODEL THIS METHODOLOGY IMPLIES

The three-file methodology maps cleanly onto a relational schema. CTRL already has most of the tables (from `mm-ctrl`); the methodology tells us what they SHOULD hold and which loops must be wired. Below is the model the methodology *demands*, mapped to the live schema (`user_memory`, `user_patterns`, `user_decisions` — confirmed in migrations `20260306000002/3` and `src/types/memory.ts`).

### 5.1 — Identity layer → `user_identity` (the one object the deck has that the app lacks as a first-class table)
The methodology's Identity file is FOUR structured fields. Today CTRL scatters this across `user_memory` rows of `fact_category='identity'` + the Edge "AI identity read." The methodology says it should be a **single owned object**:

```
user_identity (1 row per user)
  role            text         -- ROLE: job title + scope ("my head of content")
  voice           jsonb        -- VOICE: { sentence_length, openings, closings,
                               --   words_reached_for[], words_never_appear[],
                               --   confidence_per_trait, source_artifacts[] }
  standards       text[]       -- STANDARDS: testable bars ("a point of view, not a summary")
  never_rules     text[]       -- NEVER-RULES: 3-5 class-killing hard lines
  voice_evidence  jsonb        -- the 2-3 real artifacts voice was mined from
  inferred_vs_stated jsonb     -- per-trait "confident vs guessing" flags
  missing_gaps    text[]       -- what the model still doesn't know (the MISSING area)
```
*Key methodology constraint the schema must enforce:* VOICE is **mined from pasted real writing**, never free-typed; every trait carries a `confident | guessing` flag (the "flag where you are confident versus guessing" rule → trust calibration in the UI).

### 5.2 — Memory layer → `user_memory` (already exists; methodology defines the GOOD-memory predicate)
Live shape (`user_memory`): `fact_label, fact_value, fact_context, fact_category ∈ {identity, business, objective, blocker, preference}, verification_status ∈ {inferred, verified, corrected, rejected}, confidence_score, temperature ∈ {hot, warm, cold}, reference_count, last_referenced_at, source_type, is_high_stakes, is_current`.

Methodology mapping of the four sections onto `fact_category`:
| memory.md section | `fact_category` | Methodology rule on it |
|---|---|---|
| BUSINESS | `business` / `identity` | who/what/who-we-serve |
| PRIORITIES (top 3) | `objective` | **capped at 3**; must survive "move only one this month / what visibly changes" |
| DECISIONS MADE | → `user_decisions` (`active/superseded/reversed`) | mined from "what you keep relitigating"; written so they "stop coming back" |
| PEOPLE AND PROJECTS | `business` + shorthand | recurring names + the user's shorthand |

**The "sharp beats big" predicate, as data:** a good memory row is (a) reusable, (b) not marketing copy, (c) not a half-thought, (d) not a privacy liability. This is exactly what the live `extract-user-context` guardrail chain *already does* (extract → validate → contradiction-detect → embedding dedup → deterministic `fact-guardrails`) — the methodology validates that pipeline and adds the **under-one-page / cut-anything-not-reusable budget** (already modelled as `user_memory_budget`). The privacy "NEVER STORE" list = a hard pre-write classifier (passwords/keys/others'-PII/export-shame) → maps to the existing privacy flag + `user_memory_settings`.

### 5.3 — Self-correction layer → `correction_rules` (the table the methodology demands that CTRL DOES NOT have)
This is the **biggest gap**. The deck's keystone — capture→group→write-back — has no home table in `mm-ctrl` (`app-data-learning.md` confirms: "Self-Correction loop... NOT built"). The methodology specifies its exact shape:

```
correction_log (one row per caught mistake — the CAPTURE step)
  user_id
  symptom          text     -- what the user saw go wrong
  root_cause       text     -- LOG: the cause, not the symptom (REQUIRED, non-null)
  source_task      text     -- where it happened (briefing / decision / draft / export)
  mistake_class_id uuid     -- FK → correction_rules (the GROUP step links here)
  occurred_at      timestamptz

correction_rules (the GROUP + WRITE-BACK step — the compounding asset)
  user_id
  rule_text        text     -- the class-killing rule ("confirm proper nouns...")
  mistake_class    text     -- the abstracted class label
  instance_examples text[]  -- the instances this rule generalises (for the audit trail)
  recurrence_count int      -- how many times the class fired BEFORE the rule existed
  status           enum     -- proposed | approved | active
  written_back_to  text[]   -- which files/objects carry it (identity, memory, skill...)
  created_at, approved_at
```
Wiring rules the methodology mandates:
- A rule is **proposed by the model but approved by the user** ("On my approval, APPEND" / "I paste it in") — never auto-grades itself. This is the schema-level expression of "never let a worker grade its own homework."
- The **recurrence guard**: when a `mistake_class` reaches the **4×** threshold without an `active` rule, the system MUST force a rule proposal (the "a mistake won't survive 4 occurrences" metric becomes a constraint/trigger).
- Approved rules **write back** into the identity never_rules and/or memory facts (the WRITE-BACK step), and into every exported artifact — so "next time the agent wakes up, it already knows."
- This table IS the user-facing "167 rules" library — the visible proof of compounding.

### 5.4 — Patterns as the synthesis tier (already exists: `user_patterns`)
`user_patterns` (`type ∈ {preference, anti_preference, behavior, blindspot, strength}, confidence, evidence_count, status ∈ {emerging, confirmed, deprecated}`) is the methodology's "GROUP across many facts" tier — the same generalisation move as self-correction, applied to capture instead of correction. The methodology says these must be *fed and surfaced*, not left dormant (today `memory-synthesize` is never scheduled — see §7).

---

## 6. HOW EACH PROTOCOL WIRES INTO CTRL'S PIPELINE

| Methodology protocol | Wires into (existing CTRL component) | Current state | What "wired" means |
|---|---|---|---|
| **Identity interview** (4 areas, one-Q-at-a-time, refuse generic) | `onboarding-interview` edge fn + Edge "AI identity read" (`synthesize-edge-profile`) | Edge read exists; the *guided, refusing interview* is the Kit's `jobFileBuildPrompt` but not the app onboarding | Make Identity a first-class onboarding layer that interviews, refuses "professional/clear/data-driven", mines voice from pasted writing, flags confident-vs-guessing |
| **Voice-from-writing capture** | (not built in app; lives only in `my-voice.md` kit prompt) | **MISSING in-app** | New capture: paste 2-3 artifacts → extract sentence length / openings / closings / words-reached-for / words-never-appear → `user_identity.voice` |
| **Memory interrogation** (5 Qs, marketing-copy filter, priority forcing-function, settled-decisions mining) | `extract-user-context` (extract→validate→contradiction→dedup→guardrails) + `AddMemorySheet` | Strong extraction; missing the *interrogation* and the "move only one this month" forcing-function | Add the 4-step interrogation in front of capture; route PRIORITIES through the top-3 cap and the forcing-function; mine DECISIONS MADE → `user_decisions` |
| **"Sharp beats big" / NEVER-STORE** | `fact-guardrails.ts` + `user_memory_budget` + `user_memory_settings` privacy | Guardrails real; budget exists | Enforce under-one-page budget + the privacy NEVER-STORE classifier as a hard pre-write gate |
| **COLD vs LOADED proof** | nothing surfaces it | **MISSING** | Build the before/after moment in-product so the user *feels the tax* (named in `_SYNTHESIS.md` §"demonstrate the compounding") |
| **Self-correction footer** (LOG→PROPOSE→WRITE-BACK) | `correction_log` + `correction_rules` (NEW) | **NOT BUILT** | The missing third layer; the highest-leverage build |
| **"Never grade its own homework"** | **the Decision Engine verification loop** (`decision-engine` → decompose → web-verify → cross-examine; `decision-watch` hourly re-verify) | Built and is the app's strongest expression of the principle | The Decision Engine IS this axiom made real — independent verification the agent can't skip. Generalise it: every task-completion runs the footer check first |
| **Reference-count / temperature** ("gets sharper on what you actually rely on") | `user_memory.reference_count/last_referenced_at` + `memory-lifecycle` (promote/demote/archive) | **DORMANT — never written, never scheduled** (see §7) | Write `reference_count`/`last_referenced_at` from `getUserContext`/`buildMemoryContext` on every use → the cheapest path to "it learns" |
| **Fact → pattern synthesis** | `memory-synthesize` → `user_patterns` | **DORMANT — never scheduled/called** | Schedule it; surface patterns; wire confirm/dismiss handlers (exist in `useMemoryWeb`, no UI) |
| **Weekly hygiene / FRIDAY ritual** | (kit `weeklyHygienePrompt`; no in-app cron) | In-kit only | A weekly job that runs the hygiene pass + forces the "log 3 corrections as rules" ritual |
| **Portability** (one layer → Claude/ChatGPT/Gemini) | `memory-export` / `memory-context-builder` (6 formats × 14 use-cases) + Library | Strong | Already the most-shipped part; the identity + correction_rules must export too |

---

## 7. THE HONEST GAP (carry forward — this is the product-deciding finding)

The methodology is fully specified and the *capture* side is genuinely sophisticated (`extract-user-context` is the strongest surface in the app). But the loops that produce "it gets sharper" are **built and unwired** (confirmed in `app-data-learning.md` §underused_data and `_SYNTHESIS.md`):

1. **`reference_count` / `last_referenced_at` are NEVER WRITTEN.** Nothing increments them when a fact is used. The temperature engine has no input → the "X hot" thermometer is decorative. **This single missing write-back is the clearest reason the system never visibly adapts.**
2. **`memory-lifecycle` (promote/demote/archive) is NOT scheduled and NOT called.** The whole hot/warm/cold decay subsystem is dormant.
3. **`memory-synthesize` (fact → `user_patterns`) is NOT scheduled and NOT called.** The pattern panel is permanently empty for most users.
4. **The self-correction loop has NO home table and is NOT built.** The deck's keystone — the actual moat — is the one layer missing from the live app. There is no `correction_log`/`correction_rules`, no forced footer on task completion, no recurrence guard.
5. **Decision Engine verdicts never write back to memory.** The app's best expression of "never grade its own homework" (the verification loop) teaches the memory nothing durable.
6. **Assessment results never enter `user_memory`.** The richest self-knowledge the user produces is invisible to personalization.

**The product-deciding implication:** CTRL does not need a better methodology — it already owns a sharp, named, defensible one (this file). It needs to **wire the methodology it already specifies**: build the Identity object + the self-correction `correction_rules` table, and connect the four dormant write-backs (reference_count, lifecycle cron, synthesize cron, decision→memory). The magic ("it knows me and gets sharper") is honest the moment those wires close — and only then.

---

## 8. THE DATA-REALIST MAGIC PRINCIPLE (keep it honest, never faked)

The methodology is explicitly anti-fake. The "feeling of magic" comes from real mechanism, surfaced legibly:
- **Magic = the COLD vs LOADED gap made visible.** "The gap between those two answers is the tax you have been paying." Don't claim intelligence; *show the delta*.
- **Magic = "it took a point of view without being asked"** — an observable behaviour, gated by a test, not a vibe.
- **Magic = the rule library you can see growing** ("167 rules, each a lesson learned once"). Compounding is shown as an accumulating, inspectable asset.
- **The anti-pattern the methodology forbids:** the green dashboard hiding an empty export (the Felix scar). A loop you can't see "isn't a loop." Never let the UI *imply* learning the backend isn't doing — which is exactly the trap the live app fell into (the thermometers/health-scores/"getting smarter" deltas over dormant engines). **Honest magic = the thermometer only moves because `reference_count` actually moved.**

Slogans to carry into product copy: *"THE MODEL ISN'T THE PROBLEM · THE SETUP IS." · "SAME MODEL · DIFFERENT EMPLOYEE." · "SHARP BEATS BIG." · "WRITE IT ONCE · READ IT EVERY SESSION." · "STOP RE-TEACHING · START BANKING." · "Never let a worker grade its own homework." · "The same mistake does not get to happen twice."*
