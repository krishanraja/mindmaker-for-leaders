# CTRL: Sales Brief

**For outbound sales agents (human and AI). Read this before writing any email, post, or DM.**

**Last reconciled:** 2026-08-02.

> RECONCILIATION BANNER (read before using any line below). CTRL's positioning is **building the AI-native version of your business**. This pass resolved the prior banner's "kept for reference, do NOT use as-is" flag: the One-Liner, Problem, and Email Angle sections below have been rewritten to the AI-native positioning (not left as stale legacy prose under a warning). Two mechanical corrections grounded in the code: (1) "Decision Advisor", "Meeting Prep", "Prompt Coach", and "AI Literacy Diagnostic" are retired as standalone named tools (none exist in `src/`; `/diagnostic` is a bare redirect with no purchase UI behind it) - replaced below with the current decision engine and Edge artifacts. (2) "Three Honest Tests" is corrected to **Four Honest Tests** (the code added the fourth, VOICE-LOCK, on 2026-06-18; `supabase/functions/generate-skill-export/prompt.ts` is the live gate and names four). Visual fact: CTRL is globally DARK (ctrl-ds palette, emerald `#00D9B6`, the BrandLockup), never light / "Apple-white". Pricing fact: Edge Pro is $49/month (the decision tier; the daily briefing is free); the one-time diagnostic SKUs are flagged TODO(founder) below with the added evidence that there is currently no live purchase path for them in the app.

---

## The One-Liner

CTRL helps you build, orchestrate, productize, and take to market the AI-native version of your business. Start with a guided kit or a fast-capture decision, and the instrument does the rest: it reframes general-business calls into their AI-native version, pressure-tests them against live evidence, keeps a portable Memory Web of your context, reads you a daily AI-native briefing, and turns a weekly workflow into an installable agent skill.

TODO(founder): this is the working one-liner per `AGENT_BRIEFING.md` section 1, not yet locked as the final public tagline. The retired legacy one-liner ("CTRL builds a portable AI double of you in 2 minutes...") described a real mechanic (Memory Web + Export) but led with portability, not the AI-native reframe; do not use it as the lead hook.

---

## The Problem We Solve

Most businesses are using AI without becoming AI-native. Leaders bolt AI onto a business that still runs the old way: they buy a chat tool, put AI on a board deck, tell their team to "use AI more" - and the actual shape of the business (which workflows a human owns, how the org is wired, what the product is, how it goes to market) never changes. Meanwhile AI-native competitors rebuild those same things around agents and move faster by default.

The gap is not a setup gap. It is a transformation gap: not knowing the AI-native version of a given decision, and having no instrument that pulls the call there instead of leaving it general.

Underneath that gap sit two real, everyday taxes CTRL also eliminates:

**The zero-context tax.** Open ChatGPT. Re-explain who you are, what your company does, the decision on your desk. Do it again in Claude, again in Gemini, again tomorrow. The AI never remembers, so the output stays generic. CTRL's Memory Web pays this tax once and exports the context everywhere.

**The noise tax.** Newsletters and feeds serve everyone the same stories; leaders lose 30+ minutes a day skimming for what's relevant to their world, and the personalization is theatre. CTRL's daily Briefing replaces the scroll with 3 minutes of audio filtered to nine AI-native categories and anchored to a leader's real priorities.

**CTRL's job is the transformation gap, not just the taxes**: it reframes every real decision to its AI-native version and grounds the answer in evidence, so a leader leaves with a specific AI-native move, not a general opinion.

---

## How It Works

1. **Set the lens in about 20 seconds** - Tap your industry, your role, and a few interests to watch. No forms, no voice required to start.
2. **Weigh your first real decision** - CTRL hands you a role-tailored starter decision, or you bring your own: reframed to its AI-native version, decomposed, verified against live evidence, cross-examined, and closed with a board-ready memo.
3. **Build the Memory Web from there** - Talk or type naturally over time and CTRL extracts structured facts: identity, business context, objectives, blockers, decision patterns, preferences.
4. **Export to any AI tool** - One click. Your context is formatted for ChatGPT, Claude, Gemini, Cursor, or any LLM.
5. **Hear your world every morning** - A 3-minute audio briefing built from your active decisions, missions, watchlist, and declared interests, filtered to nine AI-native categories. Every story shows the specific profile item it's anchored to.
6. **Automate the repetitive ones** - Pick one workflow you do every week (board update, hiring sync, RFP triage). Talk through it for two minutes. CTRL hands you a downloadable Claude Skill that auto-triggers whenever your team's language matches.

The result: every general call gets pulled to its AI-native version, and every AI interaction starts from your context, not from scratch.

---

## What Makes CTRL Different

### vs. Writing Custom Instructions by Hand
- CTRL extracts structure from natural speech - no prompt engineering
- Updates continuously as your context evolves
- Formats for 6+ AI tools automatically
- Saves hours per week and produces richer context than most people write manually

### vs. Custom GPTs / Claude Projects
- Portable. Not locked to one platform.
- Works across ChatGPT, Claude, Gemini, Cursor, Claude Code simultaneously
- Your context travels with you. Switch tools without losing depth.

### vs. Generic AI Training / Courses
- Not education. Infrastructure.
- Leaders don't need to learn prompt engineering. CTRL does it for them.
- Immediate value (a working decision engine and a Memory Web from the first session), not hours of coursework
- The goal isn't AI knowledge. The goal is the AI-native version of the business.

### vs. AI Consultants
- Self-serve. No dependency. No waiting for a deliverable.
- The leader owns their context data
- Cost: free to start vs. $15K+ consulting engagement
- Value in 2 minutes, not 2 months

### vs. Morning Briefs (Axios, Morning Brew, Techmeme, Feedly)
- Those are curated feeds - same stories for everyone, light reorder.
- CTRL builds a custom lens per user per briefing type per day, scores live headlines against it with embeddings, and writes audio in your register.
- Every segment shows "Anchored to: <your specific priority>" - auditable relevance, no black box.
- Bookmark to keep a beat. Ban to kill a topic. The system learns immediately.

### vs. AI Context Tools (Notion AI, Mem, Rewind)
- Those want access to your Slack, email, calendar, browser. Enterprise security review required.
- CTRL is self-contained. You talk to it. No integrations. No permissions. No IT.

---

## Key Features to Mention

### Memory Web
A living knowledge base about the leader, built from voice or text input, verified by the user, encrypted at rest (AES-256-GCM). Categories: identity, business, goals, challenges, decision patterns, preferences. This is the engine. Everything else runs on it.

### Context Export (the killer feature)
One-click export to:
- ChatGPT (custom instructions)
- Claude (conversation context)
- Gemini (formatted context)
- Cursor (.cursorrules)
- Claude Code (CLAUDE.md)
- Raw Markdown (anything)

Optimized per use case: meetings, decisions, email drafting, strategic planning, code review, general advisor, plus delegation and board-facing presets. Do not quote a specific count of use cases without checking `ExportUseCase` in `src/types/memory.ts` (it has grown past the six named here).

This is the moment a leader goes from generic AI to personalized AI. It takes one click.

### Daily Briefing v2 - evidence-based intelligence
A 3-minute audio briefing every morning, tuned to the one thing you care about: YOUR world.

Built on a seven-stage pipeline:
1. **Importance Lens** - ranks profile items that matter today for this briefing type (gpt-4o-mini, 24h cache)
2. **Query Planner** - turns the lens into 4-6 targeted news queries
3. **Provider Fan-out** - Perplexity + Tavily + Brave in parallel, 12s cap
4. **Embedding Dedupe + Scoring** - `text-embedding-3-small` + pgvector, cosine dedupe, score = similarity × lens weight
5. **Budget-Constrained Curation** - diversity + coverage rules within word budget
6. **Script Generation** - gpt-4o + your training material voice card
7. **Audio Synthesis** - ElevenLabs MP3, 3-4 minutes

Every retained segment carries `lens_item_id`, `relevance_score`, and `matched_profile_fact`. **Personalization is auditable, not asserted.**

Three controls that make it smarter every day:
- **Bookmark** a story → its anchor becomes a persistent beat
- **Ban** a topic → semantic kill (related topics die too, not just keyword matches). Writes a `-1.0` weight delta immediately.
- **Settings → Interests** → declare beats, track specific people/companies, exclude whole topics

Cold-start solved: 11 industries pre-seeded (creator economy, SaaS, healthcare, fintech, consulting, e-commerce, media, edtech, biotech, legal, generic). One tap to accept.

Persistent learning: the nightly aggregator (`sp_aggregate_briefing_feedback`, pg_cron 03:07 UTC) promotes any lens signature with 3+ thumbs-down to a persistent `-0.4` delta. Topics fade without manual policing.

Seven briefing types: Daily Brief, Macro Trends, Vendor Landscape, Competitive Intel, Boardroom Prep, AI Model Landscape, Custom Voice. The daily briefing is free, all types included.

### Edge - Leadership Amplifier
AI synthesizes the user's Memory Web and assessment data into an actionable leadership profile:
- **Sharpen** strengths: Systemize, Teach, Lean Into
- **Cover** weaknesses: Board Memos, Strategy Docs, Emails, Meeting Agendas, Templates, Frameworks
- Interactive strength/weakness pills with feedback loops
- Intelligence gap detection with guided resolution

Edge Pro ($49/month) is the decision tier: unlimited decision weighs, a multi-model cross-examination of every decision, and decision watch, plus unlimited artifact generation, drafting, email delivery, and the live MCP pull of your built skills. (The daily briefing and Automator skill builds are free.)

### Agent Skill Builder / Automator (free for now)
Voice-to-Skill pipeline that converts one weekly workflow into a downloadable, agentskills.io-compliant Claude Skill the leader drops into `~/.claude/skills/`. Note: building skills is FREE for now (the Edge Pro gate on `generate-skill-export` was removed); Edge Pro gates unlimited decision weighs, the live MCP pull of your built skills, and Edge artifacts, not the build (the daily briefing is free).

- **Pain-anchored entry points everywhere**: tap a blocker in Edge view, tap the zap on a Memory Web blocker card, or tap the zap on a Briefing decision-trigger segment. The pain becomes the seed.
- **Four Honest Tests triage gate** (REPEATABLE / SPECIALISED / BOUNDED / VOICE-LOCK): if the input is really a Memory Web fact, a Custom Instruction, or a Saved Style, CTRL routes it to the right surface instead of generating a junk skill. This is the difference between "another macro tool" and "a triage system that respects your time."
- **Quality gate**: 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections - validated before you download.
- **Installs in three places**: Claude Code, Claude.ai, and Cursor (with copy-paste install instructions inside the preview sheet).

Two minutes describing a Monday-morning ritual is enough to build permanent agent infrastructure the leader owns. The Skill triggers automatically whenever the leader's team uses the same language. This is the third killer feature on `/context`, alongside Context Export and Custom Voice Export.

### Decision Engine (the weigh)
One fast-capture field, mic embedded. Talk it out or type it. CTRL reframes it to its AI-native version, decomposes it into claims, verifies each against live evidence, cross-examines, and shows the result as a radial evidence spider (the call at the centre, six AI-native forces around it, coloured by whether they hold up). One-line scored sources; "Dig deeper" unfolds the fuller excerpt and nested/countered evidence. Every completed weigh copies out as a board-ready, one-page decision memo. Resolving it later (it held up / it did not) is a quiet, honest closure step, not a scoreboard reset.

*Note: "Decision Advisor," "Meeting Prep," "Prompt Coach," and a standalone "AI Literacy Diagnostic" existed as separate named tools under the prior positioning. They are retired; the decision engine above and Edge artifacts (board memos, strategy docs, emails, meeting agendas) are the current surfaces that do this work. Do not reference the retired names in outbound.*

---

## Who This Is For

**Title:** C-suite, VPs, Senior Directors, Founders
**Company Size:** 50-5,000 employees (sweet spot 100-1,000)
**Industries:** Creator economy, SaaS, financial services, professional services, healthcare, e-commerce, media, edtech, biotech, legal, manufacturing
**Mindset:** Pragmatic, time-poor, skeptical of AI hype but know they need to move faster

**Pain Signals (top quotes that prove fit):**
- "I use ChatGPT but it doesn't know anything about me"
- "I spend 10 minutes setting up context every time I use AI"
- "AI gives me generic advice that doesn't apply to my situation"
- "I know AI could help me decide faster but I don't have time to figure out how"
- "My competitors seem to be moving faster with AI than we are"
- "I cancelled three newsletters this month and still feel behind"
- Board or investor pressure around AI adoption and decision velocity

---

## Who This Is NOT For

- Technical AI roles (ML engineers, data scientists) - they need implementation tools
- Individual contributors - wrong scope
- Companies wanting someone to implement AI for them - we build the AI-native instrument, not the implementation team
- AI enthusiasts who want depth on model architecture
- Buyers requiring SOC 2 / vendor security review for an individual purchase - drive them to enterprise/Sprint
- Buyers demanding Slack/email/calendar integration - wrong product, redirect

---

## Pricing

| Tier | Price | What you get |
|------|-------|--------------|
| **Free / Core** | $0 | Memory Web, Context Export, the decision engine (3 weighs/month), daily Briefing, Automator skill builds (unlimited, free for now), Edge profile preview |
| **Edge Pro** | $49/month | Unlimited decision weighs + multi-model cross-examination + decision watch, unlimited Edge artifacts, drafting, email delivery, the live MCP pull of your built skills, Custom Voice Export |
| **Bootcamp** (Teams) | $15K-$50K | 4-hour exec sprint + pilot charter |
| **Portfolio** (Partners) | $5K-$25K | Heatmap + offer pack |

**TODO(founder):** Full Diagnostic ($49 one-time), Deep Context Upgrade ($29 one-time), and the Bundle ($69) are still wired in Stripe but `/diagnostic` has no live purchase UI in the app today (bare redirect to `/dashboard`). Do not quote them until a founder confirms the UI is coming back or the SKUs are retired.

---

## Proof Points

- **A single decision engine weigh** produces a reframed call, verified evidence, and a board-ready memo - no separate consultant deliverable needed to leave the session with something usable
- **3-minute daily audio briefing** with auditable anchoring on every segment
- **Voice available throughout** (Memory Web capture, the decision capture mic, the Automator) - leaders don't need to type or learn anything to use the core loop
- **Globally dark, instrument-grade design** - the ctrl-ds palette, emerald `#00D9B6`, no-scroll one-ask surfaces, built to put in front of CEOs (NOT light mode / "Apple-white")
- **Self-contained** - no Slack/email/calendar access, no enterprise security review
- **Encrypted at rest** (AES-256-GCM); user controls retention; data never trains any AI model
- **Portable** - not locked to any AI provider or platform
- **80 edge functions, 59 hooks, 110 migrations live** (2026-06-09 count per `CLAUDE.md`, re-count pending; still not a prototype)
- **Audit weeks 1-6 shipped** (revenue path, data path, UX, reliability, observability, cleanup): timeouts + retries on external APIs, mandatory Stripe signature verification + idempotency, structured edge-function logger, e2e test contracts
- **Built by Krish Raja** - operator experience: Microsoft (2010), MD at Captify ($0→$12M ARR), data revenue at Nine Entertainment ($9M→$61M). Now CEO of Mindmaker, running a multi-agent OS that automates the output of a 30-person team.
- Context export produces richer, more structured prompts than most leaders write by hand in an hour

---

## Email Angle Ideas

### The "AI-Native Version" Angle
The leaders pulling ahead with AI aren't using better tools. They've stopped answering "should I hire" and "should we raise prices" as general business questions and started asking what the AI-native version of that call is. CTRL is built to force that reframe every time, then ground the answer in evidence. Same decisions. Different question. Different outcome.

### The "Zero-Context Tax" Angle
Every time you open ChatGPT and re-explain who you are, you're paying the zero-context tax. Multiply that across every AI tool, every day. CTRL's Memory Web pays it once and exports your context everywhere. Your AI tools know you from the first word.

### The "Portable Context, AI-Native Judgment" Angle
What if every AI tool you used already knew your business, your goals, your decision style, and every hard call you brought it came back reframed to its AI-native version? CTRL builds that Memory Web from natural conversation, exports it to ChatGPT, Claude, Gemini, and Cursor, and runs your real decisions through a reframe-and-verify engine. Switch tools freely. Your context and your judgment both follow.

### The "Stop Setting Up, Start Deciding" Angle
Most leaders spend 5-10 minutes per AI session setting up context. That's 30-60 minutes a day. CTRL's Memory Web replaces the daily re-explaining with a one-time build that keeps deepening as you talk to it. The math is simple. The first weighed decision is immediate.

### The "Your Competitor Is Building It, You're Still Buying It" Angle
Somewhere, a leader in your space is rebuilding a workflow around an agent while you're still deciding which AI subscription to expense. CTRL is where you decide what the AI-native version of your business should be, and pull every call toward it. The question is how long you want to wait.

### The "Infrastructure, Not Education" Angle
You don't need another AI course. You don't need to learn prompt engineering. You need an instrument that pulls your real decisions toward their AI-native version and gives every AI tool you already use your full context. CTRL is that instrument.

### The "Daily Briefing" Angle
Every leader wants a curated news feed. Most vendors give them a firehose tagged with keywords. CTRL does something different: it reads your ACTUAL priorities - the decision on your desk, the companies on your watchlist, the beats you said you care about - and hands you 3-5 stories every morning with "Anchored to: <your priority>" on each one. You see exactly why every headline made the cut. Tap Bookmark to keep a beat. Tap Ban to kill a topic. Your briefing gets sharper every day you use it. Three minutes, audio, done.

### The "Auditable AI" Angle
Leaders are getting tired of mystery algorithms. ChatGPT, LinkedIn, everywhere - "here's what we think you want, trust us." CTRL flips it. Every briefing story shows the specific profile item it was anchored to. Every killed topic was killed by you, on purpose, and you can see the history. It's AI personalization where the leader stays in control of the logic. That matters more every quarter.

### The "No Integrations" Angle
Most AI context tools want access to your Slack, email, calendar, and browser. That means enterprise security reviews, IT approvals, and someone else reading your data. CTRL takes a different approach: you just talk to it. No integrations. No plugins. No permissions. Your context is built from what you choose to share - nothing else. The most private AI double you can build.

### The "Edge Pro Upgrade" Angle (for active free users)
You've built your Memory Web. You've exported to Claude. Now stop rationing your hardest calls. Edge Pro removes the 3-weighs-a-month cap: unlimited decision weighs, a second model that cross-examines every call, and decision watch that alerts you when a load-bearing assumption weakens, for $49/month. Plus board memos, strategy docs, emails, and meeting agendas in your register, anytime, and the live pull of your built skills into any AI. More leverage than your last consulting hour.

### The "Stop Repeating Yourself" Angle (Skill Builder)
Every leader has 3-5 workflows they do every week. The Monday board update. The Friday hiring sync. The RFP triage. The investor update. Every time, blank page, full context, full instructions. CTRL takes one of them at a time and turns it into a Claude Skill in 2 minutes of voice. Drop the ZIP into `~/.claude/skills/`. The skill auto-fires the moment your team's language matches. You stop repeating yourself. Your leverage compounds.

### The "Triage You Can Trust" Angle
Most "AI workflow" tools generate something whether your input was a real workflow or not. CTRL is the opposite. The Skill Builder runs Four Honest Tests before extracting anything: is this a repeatable workflow, a bounded and specialised one, a voice-locked creative output, or just a fact, a tone preference, or a writing style? If it's not a workflow, CTRL tells you, routes you to the right surface, and doesn't generate junk. Respect for your time, baked in.

---

## Objection Handling

**"I already use ChatGPT/Claude"**
Good. CTRL makes them dramatically better. Right now, those tools start every conversation knowing nothing about you. CTRL gives them your full context before you type a word. Same tools. Faster to useful output. Faster to decisions.

**"I don't have time"**
Two taps for industry and role, a few taps for what to watch. About 20 seconds, no voice required to start. You're already looking at a real decision to weigh. Building the Memory Web happens through natural conversation after that, at your pace. Faster than writing custom instructions in ChatGPT for one tool, and it works across all of them.

**"What about data privacy?"**
CTRL is self-contained. It doesn't connect to your Slack, email, calendar, or any other tool. No enterprise security approvals needed. No background scanning. You talk to it - that's it. All data encrypted at rest (AES-256-GCM). You control what's stored, what's exported, and what's deleted. Your context never trains any AI model. You own your data completely. Stripe webhooks are signature-verified and idempotent (Audit Week 1, shipped 2026-04). Account deletion is end-to-end (Audit Week 2).

**"We already have an AI strategy"**
CTRL isn't a strategy deck. It's the instrument that turns the strategy into specific AI-native moves: a workflow taken off your plate, the autonomy line drawn on your org chart, the first agent stood up. It also makes whatever AI tools you already use personalized from day one. Strategy is the plan. CTRL is where the plan meets a specific decision.

**"What's the ROI?"**
Illustrative math, not a measured result: every leader spends 30-60 minutes per day on AI context setup; the Briefing is built to save roughly another 30 minutes a day of news scrolling. At a $300/hour fully-loaded leader rate, an hour a day back is worth real money against a $49/month Edge Pro subscription. The real case, though, is decision quality: a reframed, evidence-verified decision with a memo you can hand to your board is a different artifact than a blank-prompt answer.

**"Is this just a fancy prompt template?"**
No. Prompt templates are static and generic. CTRL builds a living, structured knowledge base about you from natural conversation, formats it for each specific AI platform, and evolves as your context changes. It's the difference between a form letter and a briefing document written by someone who knows you.

**"I already get too many newsletters"**
This isn't a newsletter. Newsletters are written for everyone. The Daily Briefing is generated for YOU, every morning, from YOUR active decisions and declared interests, filtered against fresh news with embeddings. Every story shows the specific anchor it matched (your decision, your watchlist, your beat). You can Bookmark or Ban any topic with one tap and the system learns immediately. It replaces three newsletters plus 30 minutes of scrolling with 3 minutes of audio that's actually relevant.

**"How is this different from Feedly / Techmeme / morning briefs?"**
Those are curated feeds. They serve everyone the same stories and hope one's relevant. CTRL reads your active decisions, missions, watchlist, and declared beats, generates a custom lens per user per briefing type per day, scores live headlines against it with embeddings, then writes audio in your register. Every segment shows "Anchored to: <your specific priority>" - you can literally audit the relevance. No feed does that.

**"Our leaders aren't technical enough for this"**
That's exactly who this is for. Tap-based setup, no prompt engineering, no technical skills, voice available wherever it helps (the decision capture mic, Memory Web conversations, the Automator). If a leader can pick their industry and role and describe a decision out loud, they can use CTRL.

**"Will my data train an AI model?"**
No. Your Memory Web is yours. It's encrypted at rest, never used as training data for any provider, and you can delete it permanently at any time (the account deletion flow is end-to-end - Audit Week 2 closure).

**"Is the briefing accurate?"**
Auditable. Every segment shows the specific profile fact and the cosine relevance score that earned it the slot. If you disagree, Ban it - it dies semantically (related topics die too) and the kill persists forever. There is no black box.

**"What's the difference between Skill Builder and a macro / automation tool / GPT?"**
Three things. (1) **Triage first**: the Four Honest Tests gate refuses to generate a skill when your input is really a fact, a tone preference, a style, or bounded creative output that belongs to a voice-lock skill instead. Most tools generate junk; CTRL refuses. (2) **agentskills.io-compliant**: the output is a ZIP that drops straight into `~/.claude/skills/` and auto-triggers in Claude Code, Claude.ai, and Cursor - it is real agent infrastructure, not a saved prompt. (3) **Pain-anchored entry points**: you don't need to remember to use the Skill Builder. Every blocker on Edge, every Memory Web blocker card, every Briefing decision-trigger segment has a one-tap zap that hands the pain straight into the pipeline.

**"Will Skill Builder replace my Claude Custom Instructions?"**
No, and that's the point. The triage gate decides what your input actually is. If it's a workflow → Skill. If it's a tone/voice/style preference → it routes you to Custom Instructions. If it's a fact about you → it routes you to Memory Web. CTRL stays in its lane and points you at the right tool for the other lanes.

**"How do I install an Agent Skill?"**
Download the ZIP from the preview sheet. The bundle includes a `03-install-guide.txt` with copy-paste instructions for Claude Code (`~/.claude/skills/<skill-name>/`), Claude.ai (upload via the Skills UI), and Cursor. There's also a `01-test-prompts.txt` of phrases that should auto-trigger the skill so you can verify it works in 60 seconds.

---

## Key URLs

- **Product**: ctrl.themindmaker.ai
- **Booking**: Calendly integration for strategy calls (linked in product footer)

---

## Brand Voice Reminders

- Professional, not corporate
- Confident, not arrogant
- Direct, not salesy
- No hype, no FOMO, no buzzwords
- Short sentences. Active voice. Specific outcomes.
- Lead with "the AI-native version of your business" (the positioning). The old "decision speed" hook is retired.
- "Memory Web" not "database" or "profile"
- "AI double" not "AI assistant" or "AI agent"
- "Thinking tools" not "prompt library"
- "Agent Skill" or "Skill" not "macro", "automation script", or "workflow template"
- "Four Honest Tests" - use this phrase to explain why CTRL refuses to generate junk skills (not "Three Honest Tests"; VOICE-LOCK was added 2026-06-18)
- "Pain-anchored" - use when explaining the entry points on Edge / Memory / Briefing
- "Zero-context tax" - use this phrase, it lands
- "Auditable relevance" - use when discussing the Briefing
- Every claim should make someone want to write an email
