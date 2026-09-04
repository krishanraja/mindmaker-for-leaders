# Distillation — Vibe Coding Mastery for Commercial Leaders

**Source:** `C:/Users/krish/ctrl-corpus/_src/vibe-coding-mastery.md`
**Type:** Long-form thought-leadership corpus (advanced techniques + practitioner intelligence) Krish Raja delivers to commercial leaders / CEOs / founders on becoming AI-native builders.
**One-line:** The discipline of building software by *directing* AI rather than chatting with it — operationalized into a repeatable system a non-technical commercial leader can run.

---

## CORE THESES (the central arguments)

1. **"Vibe coding is not a conversation. It is an execution."** This is the keystone of the entire piece. The single biggest unlock for business leaders is the mental-model shift from *"chatting with an AI"* to *"directing a one-pass execution system."* The piece literally calls this "The Most Important Thing Nobody Tells You."

2. **Inputs matter more than outputs — because you cannot elegantly fix bad inputs after the fact, you can only pay twice.** A partial brief produces "partial, inconsistent, expensive-to-fix outputs." The metaphor: vibe coding is "a brief to a fast, confident contractor" — "what you say at the start of the session substantially determines the quality of what you get at the end."

3. **Context drift is the enemy, and it is mechanical, not random.** Every model has a finite context window (measured in tokens). As a session grows, "earlier instructions, constraints, and decisions get pushed out of the active window and effectively forgotten." The model then "re-introduces patterns it was told to avoid, contradicts architectural choices it made three tasks ago, or simply drift[s] into statistically probable (but contextually wrong) behavior." Critically: **"the context window fills faster than you think,"** because every message re-reads the entire history.

4. **The expert/amateur gap is not talent with language — it is context infrastructure.** "The gap between a casual vibe coder and an expert one is not talent with language — it is the quality of the *context infrastructure* they've built around their sessions." Experts "externalize the knowledge that casual users leave inside the conversation, where it degrades, drifts, and eventually gets lost."

5. **Discipline beats fluency.** "The commercial leaders who become genuinely expert at vibe coding are not distinguished by their tool fluency or their prompt creativity. They are distinguished by their **operational discipline**." The limiting factor is no longer the AI's capability — "it is the quality of what the human brings to each session."

6. **The commercial leader's irreplaceable contribution is domain knowledge.** "Knowing what the customer actually needs, knowing how the sales motion really works, knowing which information gets a salesperson to the next best action. No AI generates that." Every technique exists "in service of one goal: getting the AI to execute on your domain knowledge with the fidelity it deserves."

7. **The build-vs-buy calculus has structurally shifted for the ~$20M business.** "A $50/month SaaS that does 80% of what you need — but forces your process into its structure and requires 3 hours a week of workaround — now has a credible alternative: a vibe-coded tool that does 100% of exactly what you need, built in a weekend, maintained by prompts."

8. **The prototype has replaced the PRD as the *first* communication artefact.** "The PRD isn't dead. It just comes later." The new sequence puts a working, experienceable thing in front of people before any document — because the prototype "is more expressive, more quickly validated, and less subject to interpretation drift than any document."

9. **The compounding moat is a flywheel, not a tool.** The leader who has run the customer→prototype→validation→engineering cycle a dozen times "has built something no competitor can easily replicate: a direct, high-velocity connection between customer need and built reality."

---

## FRAMEWORKS (every named model, sequence, list, matrix — with components)

### A. The One-Pass Execution Mental Model
- Vibe coding ≠ chat. It is a **brief to a fast, confident contractor**.
- Chat is forgiving ("actually, ignore that"); vibe coding is not.
- Governing law: **"you can only pay twice"** if inputs are bad.
- Slogan: **"Small and complete beats large and incomplete every time."**

### B. The One-Pass Planning Disciplines (4 named habits)
1. **The Interview-First Protocol** — Before opening any building tool, use a *separate* AI conversation to interview yourself. Ask Claude/ChatGPT to pose clarifying questions "one at a time, 15–20 questions" to reveal what you haven't specified. Surfaces contradictions in your own thinking before they become contradictions in the output.
2. **The PRD-First Workflow** — Write a Product Requirements Document *before* opening a tool — "Not for the AI's benefit initially — for your own clarity." PRD covers: what the app does, who it serves, core user flows, data handled, constraints, and the definition of "done" per feature. "When this document is solid, the AI stops guessing and becomes much more precise." The PRD = source of truth + context document, referenced at the start of every session.
3. **One Task, One Conversation** — "Every new thing you're doing, start a new conversation. The moment you find yourself saying 'next,' 'also,' or 'while you're at it,' that's your cue to start a fresh session." Each session gets: (a) context document, (b) the single task for that session, (c) acceptance criteria.
4. **Small Slices, Complete Briefs** — Build in "tiny slices" (one endpoint, one component, one user flow) but make each slice's brief complete before execution. "Never ask AI to build the whole app."

### C. The Context-Engineering Stack (the "context infrastructure")
The four artefact types that externalize knowledge out of the chat:

1. **The CLAUDE.md / Cursor Rules File — "Your Project Constitution"**
   - A persistent project-level instruction file loaded into every session. (`CLAUDE.md` in Claude Code, `.cursorrules` in Cursor, `.windsurfrules` in Windsurf.)
   - Without it the AI "falls back on the most statistically probable patterns from its training data — which may have nothing to do with your stack, your conventions, or your architecture."
   - **Template sections for a non-technical leader:**
     - `PROJECT OVERVIEW` (what it does in 2–3 sentences, who it's for, what success looks like)
     - `ARCHITECTURE DECISIONS ALREADY MADE` (database, auth, hosting, API integrations)
     - `RULES THAT MUST NEVER BE BROKEN` (e.g. "No customer PII outside the app database," "All API keys in environment variables, never in code," "No changes to the payments flow without explicit approval," "All database changes must be reversible")
     - `NAMING & STYLE CONVENTIONS`
     - `KNOWN DECISIONS AND WHY` ("This prevents the AI from 'helpfully' un-doing past decisions")
   - Get it wrong → "AI spaghetti code." Get it right → "Claude operates like a senior engineer who read your entire wiki."

2. **Skills Files — Reusable Prompt Components**
   - A pre-written, reusable prompt fragment encoding a capability/standard/pattern used repeatedly. Examples named in the doc:
     - **The Reporting Skill** (dashboard viz standards: colour palette, chart types, refresh rate, null-state handling)
     - **The CRM Integration Skill** (HubSpot API structure + field mappings)
     - **The Speaker Briefing Skill** (bio format, session overview template, logistics, Q&A guidance — "Apply these standards to all twenty briefings simultaneously")
     - **The Security Checklist Skill** ("verify: [the 6 most common AI-generated code vulnerabilities relevant to this project]")
   - Skills are **composable** — "chain them correctly together and get the AI to look at whatever combination you feel is right for that task." This is "the real way you get your taste turned into an output that matches what you wanted."

3. **Architecture Files — Your Single Source of Truth** (encode *what has been built*)
   - The "truth file" / "saves me" file. Named files for commercial leaders:
     - `platform-model.md` — entities + relationships (customers, accounts, deals, contacts, campaigns)
     - `api-spec.md` — external systems connected + integrations
     - `data-dictionary.md` — exact field names and meanings per source
     - `task-list.md` — current state: built / in progress / next
   - Discipline (from "a senior engineer who has audited 120+ vibe-coded projects"): **"Multiple focused files work much better than one massive document."** Segment by purpose; reference the right combination per task.

4. **Design Systems — Visual Consistency Without a Designer**
   - One-page file specifying: primary/secondary colours (hex), typography (font family, heading sizes, body size), component library ("always use Shadcn components, never invent new UI patterns"), spacing/grid conventions, icon set.
   - Paste into every UI session → "visual consistency compounds over time instead of degrading."

### D. The Four Commercial Use Cases
1. **The Sales Intelligence Dashboard** (the $20M media sales example) — surfaces portfolio health, competitor activity tracker, **next-best-action recommendations** (rule-based: *"hasn't been contacted in 21 days + contract renewal in 90 days = call today"*), market trend digest. Real precedent: a HubSpot-connected "Sales Champions Leaderboard" with hot streaks, a live ticker, a "ring the bell" deal-close celebration, one-click drill-down — built in **one hour**. Build approach: one session per layer (CRM+data model → portfolio health → competitor tracker → next-best-action logic), never all at once.
2. **The Product Leader's Prototype-First Feedback Loop** — the 7-step workflow (below).
3. **Internal Operations at the $20M Business** — replace spreadsheet-as-system-of-record: custom CRM dashboard, automated reporting pipeline, PTO tracker w/ approval workflow, vendor contract manager w/ renewal alerts, onboarding checklist. Community truth: "$20M businesses are building inventory trackers, quotation generators, CRM dashboards."
4. **The Commercial Leader as Product Specification Author** — vibe coding a prototype = "writing a specification in the most legible format possible: a working artefact." Engineering then spends "two days reverse-engineering the data model from a working prototype" instead of two sprints on requirements + wireframing.

### E. The Prototype-First Workflow (7 precise steps)
1. Gather customer feedback (interviews, NPS comments, support tickets, sales call notes)
2. Identify the highest-frequency unmet need
3. Use a planning AI conversation to draft the core user flow
4. Vibe code a prototype of *only that flow* — not the whole product
5. Show it to **three customers before showing it to the engineering team**
6. Incorporate customer feedback in a second vibe coding session
7. Bring it to engineering as the spec — "this is what they need and this is the user-validated version of it"

(Old process: Idea → Lengthy PRD → Debate → Build. New process: Idea → Brainstorm with AI → Vibe Code Prototype → Team experiences it → Refine → PRD → Build.)

### F. Alternating Chat Mode vs Execute Mode ("a superpower")
- **Chat/Plan Mode**: low-reasoning, conversational — brainstorm, explore, clarify, "get the AI to generate a numbered step-by-step plan" / "a numerical plan based on various different tasks and have those tasks numbered."
- **Execute Mode**: switch modes or start a fresh session — "let's work on task one, let's work on task two." 
- Rule: **never mix these modes in the same session.**

### G. The "Debug Voice" Technique
- Ask the AI to **diagnose before solving**: *"Why is this breaking?"* not *"Fix this bug."* Surfaces root cause instead of a masking patch.
- Names the failure mode: **"patching AI patches"** — fixes-for-fixes, "three layers deep," the #1 source of accelerating technical debt.

### H. "Start Fresh When" Checklist (6 triggers)
- Conversation over 30–40 messages
- AI repeating itself or contradicting an earlier statement
- Starting a distinctly different feature/component
- AI suggests a solution that contradicts a prior architectural decision
- You catch yourself saying *"no, I already told you that..."*
- You're about to paste a large new file or data source
> "Starting fresh with a clean context document is *always* faster than trying to repair a drifted session."

### I. The Spec-Driven Agent Workflow (the advanced move, 5 steps)
1. Feed the AI core concept + constraints
2. Ask it to produce spec docs (not code): `platform-model.md`, `api-spec.md`, `database.md`, `frontend.md`, `auth.md`, `task-list.md`
3. Review each — request changes, identify gaps, "ask the AI to audit its own spec for completeness"
4. Only once solid, execute task-by-task — each with goals, acceptance criteria, deliverables, dependency order
5. AI tests each component against the spec before marking it complete
> Result: task lists spanning 5–10 hours, "95–98% in line with expectations."

### J. "The Moment You're in Too Deep" — Warning Signs (5)
- You can't explain what the code does, only what you asked the tool to make
- You're using AI to explain code that AI wrote
- You've stopped testing because "AI will catch it"
- You're patching AI patches — three layers deep
- You can't answer "what happens when someone tries to do [edge case]?"
> Corrective action: not abandonment — "engage a developer for a structured code audit before the next deployment." (Precedent: a startup got "163 pages of vulnerabilities... including 15 rated severe.")

### K. Token Discipline (treat tokens like budget)
- Mid-tier model (Claude Sonnet, GPT-4.5) for execution; heavy reasoning models (Claude Opus, o3) for planning/architecture only
- Keep context doc outside the chat; paste only relevant sections
- Commit to Git at the end of every session
- Break large files into smaller focused documents

### L. The Commercial Leader's Vibe Coding Operating System (the capstone system)
- **The Pre-Build Ritual (Non-Negotiable):** (1) Is the brief complete? (2) Is the PRD current? (3) Which skills files are relevant? (4) What are the acceptance criteria?
- **The Session Operating Discipline:** open with context doc → specify single task + acceptance criteria → Chat/Plan mode first if ambiguous → switch to Execute mode → test against acceptance criteria → commit + update architecture file → **close the session, do not continue into the next task in the same conversation.**
- **The Weekly Maintenance Habit (30 min):** update PRD → update architecture file → audit running tools (owner? still used? upstream data changed?) → "Flag any tool that now touches data it wasn't originally designed to handle."
- **The Product Leadership Flywheel (7 stages):** customer feedback → pattern identification → rapid prototype (1–4 hrs, shared with 3 customers before internal review) → customer validation → engineering handoff (prototype + feedback = spec) → engineering builds → repeat ("5–10x faster than the traditional PRD-first process").

### M. The Business-Specific Prompt Library (named, reusable prompt scaffolds)
- **For Dashboard Builds** — role + org type + JTBD; PRIMARY METRICS (visible on load) / SECONDARY METRICS (one click away); DATA SOURCES; ACCESS RULES; DESIGN (mobile-responsive, <3s load, design-system ref, null states); ACCEPTANCE CRITERIA (3–5 testable things).
- **For Prototype Briefs (Customer-Validated Feature)** — exact customer quotes; USER STORY ("As a [user], I want to [action] so that [outcome]"); CORE FLOW (the only thing that must work); NOT IN SCOPE; SUCCESS CRITERIA ("complete the core flow in under [time] without any instructions").
- **For Document/Report Batch Processing (the Speaker Briefing Problem)** — UNIFORM STANDARDS applied to all N; identical OUTPUT FORMAT; QUALITY CHECK before output; *all inputs + all standards + format specified before a single output.*
- **For the Weekly Architecture Update** — CHANGES MADE; KNOWN RISKS IDENTIFIED; update only routes/endpoints, data model, integrations, known risks; "Do not change anything else."

---

## LEADER BELIEFS (what the AI-native leader must DO / THINK / FEEL / STOP doing)

**Must THINK:**
- Treat the AI as a fast, confident contractor receiving a brief — not a chat partner.
- Believe that inputs > outputs, and that a vague start guarantees expensive rework.
- Understand context drift mechanically (it is the token window filling, not the AI being "dumb").
- Know your domain knowledge is the irreplaceable input — the AI supplies fidelity, you supply truth.

**Must DO:**
- Interview yourself (15–20 questions) before building.
- Write a PRD for your own clarity before opening any tool.
- Maintain externalized context: a Constitution file, skills files, architecture/truth files, a design system.
- Build in small, *fully-briefed* slices — one task, one conversation.
- Separate planning from execution; generate a numbered plan, then execute it task-by-task.
- Ask "Why is this breaking?" before "Fix this."
- Start a fresh session at the first sign of drift; carry a clean handoff doc.
- Commit to Git every session; run a 30-minute weekly maintenance ritual.
- Put a working prototype in front of 3 customers before engineering ever sees it.
- Treat tokens like budget; pick the right-tier model for the job.

**Must FEEL:**
- Discipline as the source of advantage, not friction — "the structured context infrastructure they maintain... will produce outputs that consistently match intent."
- Confidence that a weekend of work pays "dividends across the full engineering cycle."
- Comfort owning the spec — the leader is now the most legible author of what to build.

**Must STOP doing:**
- Stop "chatting" your way to a build (exploring + executing in one tangled conversation).
- Stop submitting partial briefs and correcting mid-stream (causes context drift + manual reconciliation).
- Stop saying "next," "also," "while you're at it" — that's the cue to start fresh.
- Stop patching AI patches — fix the root cause.
- Stop trusting blind ("you've stopped testing because 'AI will catch it'").
- Stop forcing your process into a rigid SaaS when a bespoke tool fits 100%.
- Stop leading with a document when a prototype communicates better.

---

## PRODUCT IMPLICATIONS FOR CTRL (concrete)

CTRL is for time-poor CEOs/founders making decisions. This source is the most directly *operational* of Krish's material — it's a literal operating system for a leader directing AI. CTRL should *be* that operating system for decisions the way this doc is for builds.

**Features / flows CTRL should make effortless:**
1. **One-pass briefing, not chat.** CTRL's decision/briefing flow should embody "this is an execution, not a conversation." Force/guide the leader to give a *complete* brief up front (the app gathers everything before it acts), rather than a back-and-forth that drifts. Mirror the "Interview-First Protocol": CTRL asks one clarifying question at a time to surface what the leader hasn't specified, then executes once.
2. **A persistent "Constitution" per leader.** CTRL should hold a CLAUDE.md-equivalent: the leader's standing context — what they're building, what success looks like, rules that must never be broken, decisions already made and *why*. This is exactly the "context infrastructure" thesis: externalize the leader's standing truth so CTRL never falls back on generic, statistically-probable advice.
3. **Skills/playbooks the leader can chain.** Reusable, composable decision components (a "next-best-action" rule, a reporting standard, a security checklist) the leader can attach to a decision — "chain them correctly together... get your taste turned into an output that matches what you wanted."
4. **Architecture/truth file = the leader's living state.** CTRL should maintain the leader's "truth file": current objectives, entities (deals, accounts, people), known risks, what's in flight, what's next — segmented into focused views, not one wall of text ("multiple focused files work much better than one massive document").
5. **Next-best-action as a first-class object.** The doc's exact rule — *"hasn't been contacted in 21 days + contract renewal in 90 days = call today"* — is the model for CTRL's "what's the next step." CTRL should synthesize the leader's state into one decisive next action, not a list.
6. **Plan-mode vs Execute-mode separation.** CTRL could offer an explicit "think this through with me" mode (generate a numbered plan) distinct from a "do it / commit" mode — never tangling deliberation and execution.
7. **Drift detection + clean handoff.** CTRL should recognize the "Start Fresh When" triggers (going in circles, contradicting a prior decision, "I already told you that") and offer a clean reset that *carries forward a summary* — never losing the leader's locked-in decisions.
8. **"Why is this breaking?" diagnosis before fix.** When a decision/plan stalls, CTRL should diagnose root cause first, not paper over with a patch. Avoid "patching AI patches."

**What the app should LEARN and REMEMBER about the leader:**
- Their Constitution: rules that must never be broken, decisions made + the reasons (so CTRL never "helpfully un-does" them).
- Their domain knowledge — "what the customer actually needs, how the sales motion really works" — because that's the input no AI can generate.
- Their standards/taste (skills files) so outputs match intent without re-explaining.
- The current state of their world (truth file) so every new session is "familiar with the key details" and never re-asks.
- Their cues and patterns over time, so CTRL prompts the weekly maintenance ritual and flags when something now "touches data it wasn't originally designed to handle."

**What "the next step" looks like for a leader (in CTRL terms):**
A single, decisive, rule-derived action — "call today," "send the proposal," "kill this" — surfaced from the leader's living state, never a 15-minute manual compilation. The doc's whole sales-dashboard ROI ("converting information-gathering time to selling time") is CTRL's promise: convert decision-prep time to decision time.

**What the app should make effortless (the underlying promise):**
- Going from a vague intention to a fully-specified, executable decision in one pass.
- Never losing context across sessions / days.
- Turning the leader's domain knowledge into action "with the fidelity it deserves."

---

## VOICE NOTES (Krish's voice — phrases, metaphors, framing, tone)

**Signature lines / aphorisms (use verbatim or near-verbatim):**
- "Vibe coding is not a conversation. It is an execution."
- "Inputs matter more than outputs, because you cannot elegantly fix bad inputs after the fact — you can only pay twice."
- "Small and complete beats large and incomplete every time."
- "The PRD isn't dead. It just comes later."
- "Claude operates like a senior engineer who read your entire wiki." (vs "AI spaghetti code")
- "The moment you find yourself saying 'next,' 'also,' or 'while you're at it,' that's your cue to start a fresh session."
- "Why is this breaking?" — not "Fix this bug."
- "Getting the AI to execute on your domain knowledge with the fidelity it deserves."

**Recurring metaphors / analogies:**
- **The contractor brief** — vibe coding is "a brief to a fast, confident contractor"; a partial brief = a half-briefed team member sent off and recalled.
- **The operations manual vs the daily verbal briefing** — "The verbal briefing degrades with each iteration. The manual is stable, reusable, and improves with each project."
- **The Constitution** — the project instruction file as a governing constitution for the AI agent.
- **The truth file / "it saves me"** — the architecture file as the thing you reach for when something breaks.
- **Tokens as currency / budget** — "Manage Them Like Budget."
- **"Pay twice"** — the cost of bad inputs.
- **The flywheel** — customer→prototype→validation as a compounding, hard-to-replicate moat.

**Framing & tone:**
- **Practitioner-sourced, hard-won.** Heavy use of "The things the tutorials don't tell you," "The Things Nobody Tells You," "Hard-Won Lessons," "after burning tokens, breaking things, and building through failure." Tone is a seasoned operator letting you in on the real mechanics.
- **Operational, checklist-driven, ritualized.** "Non-Negotiable," "The Pre-Build Ritual," "The Weekly Maintenance Habit," numbered disciplines. Krish builds *systems*, not tips.
- **Commercially anchored.** Always pulls back to ROI, the $20M business, "selling time," "build vs buy," "compounding advantage." Speaks to leaders in their P&L language.
- **Empowering but disciplined.** The leader is capable of far more than they think — *if* they bring discipline. Confidence + rigor, never hype.
- **Demystifying.** Takes opaque AI behavior (context drift, token burn) and makes it mechanical and manageable.

---

## ICP SIGNALS (who this leader is)

- **Who:** Commercial leaders — sales directors, product directors/leaders, operations managers, founders — typically at a **~$20M business without a large engineering function.** Non-technical or "not a real dev." Time-poor decision-makers.
- **What they struggle with:**
  - Manual workflows "killing productivity" — 40-tab spreadsheets, copy-paste reports, chasing PTO by email.
  - Salespeople arriving "under-informed," burning 15 minutes of manual compilation before each call.
  - "Ten meetings with your product team to convince them verbally" of an abstract idea.
  - SaaS that does 80% but "forces your process into its structure" + 3 hrs/week of workaround.
  - Drift, rework, token burn, and technical debt when they vibe code without discipline.
  - Not knowing *when* a build has become a liability (the "in too deep" signs).
- **What they value:**
  - Speed-to-value: tools "built in a weekend," dashboards "built in one hour," cycles "5–10x faster."
  - Control / bespoke fit: "adjust the [tool] based on your business instead of forcing your process into a fixed system."
  - Converting prep time into productive time (information-gathering → selling; document-debate → building).
  - Reliability and "outputs that consistently match intent."
  - A defensible, compounding advantage no competitor can easily replicate.
  - Their own irreplaceable domain knowledge being the hero of the process.
