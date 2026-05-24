# CTRL: Sales Brief

**For outbound sales agents (human and AI). Read this before writing any email, post, or DM.**

**Last Updated:** 2026-05-24

---

## The One-Liner

CTRL builds a portable AI double of you in 2 minutes. Every AI tool you use — ChatGPT, Claude, Gemini — instantly knows your context, your goals, and how you think. Plus a 3-minute daily audio briefing tuned to YOUR world. Plus a Skill Builder that turns one weekly workflow into a Claude Skill you drop into `~/.claude/skills/` and forget. You decide faster. Full stop.

---

## The Problem We Solve

Leaders are slow with AI. Not because they lack tools. Because every tool lacks them.

Open ChatGPT. Re-explain who you are. Re-explain what your company does. Re-explain the decision on your desk. Do it again in Claude. Again in Gemini. Again tomorrow. The AI never remembers. The output stays generic. The decision waits.

This is the **zero-context tax**. Every leader pays it, multiple times per day, across every AI tool they touch. It turns AI — which should be a speed multiplier — into a speed drag.

The leaders who are actually faster with AI have figured out one thing: give the AI your context up front. But doing that manually across multiple tools takes hours of prompt engineering most leaders will never do.

There's a second tax: the **noise tax**. Newsletters and feeds serve everyone the same stories. Leaders waste 30+ minutes a day skimming for the 2-3 stories that actually matter to their world. The personalization is theatre.

**CTRL eliminates the zero-context tax in 2 minutes. And replaces 30 minutes of scrolling with 3 minutes of audio.**

---

## How It Works

1. **Talk naturally** — Describe your work, goals, challenges, how you think. Voice or text. Two minutes.
2. **CTRL builds your Memory Web** — AI extracts structured facts about you: identity, business context, objectives, blockers, decision patterns, preferences.
3. **Export to any AI tool** — One click. Your context is formatted for ChatGPT, Claude, Gemini, Cursor, or any LLM.
4. **Hear your world every morning** — A 3-minute audio briefing built from your active decisions, missions, watchlist, and declared interests. Every story shows the specific profile item it's anchored to.
5. **Automate the repetitive ones** — Pick one workflow you do every week (board update, hiring sync, RFP triage). Talk through it for two minutes. CTRL hands you a downloadable Claude Skill that auto-triggers whenever your team's language matches.
6. **Every AI interaction starts from you** — From the first word. No re-explaining. The AI knows your world.

The result: faster from question to decision. Every time. Across every tool.

---

## What Makes CTRL Different

### vs. Writing Custom Instructions by Hand
- CTRL extracts structure from natural speech — no prompt engineering
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
- Immediate value (2 minutes to first export), not hours of coursework
- The goal isn't AI knowledge. The goal is decision speed.

### vs. AI Consultants
- Self-serve. No dependency. No waiting for a deliverable.
- The leader owns their context data
- Cost: free to start vs. $15K+ consulting engagement
- Value in 2 minutes, not 2 months

### vs. Morning Briefs (Axios, Morning Brew, Techmeme, Feedly)
- Those are curated feeds — same stories for everyone, light reorder.
- CTRL builds a custom lens per user per briefing type per day, scores live headlines against it with embeddings, and writes audio in your register.
- Every segment shows "Anchored to: <your specific priority>" — auditable relevance, no black box.
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

Optimized for specific use cases: Meeting Prep, Decision Support, Email Drafting, Strategic Planning, Code Review, General Advisor.

This is the moment a leader goes from generic AI to personalized AI. It takes one click.

### Daily Briefing v2 — evidence-based intelligence
A 3-minute audio briefing every morning, tuned to the one thing you care about: YOUR world.

Built on a seven-stage pipeline:
1. **Importance Lens** — ranks profile items that matter today for this briefing type (gpt-4o-mini, 24h cache)
2. **Query Planner** — turns the lens into 4-6 targeted news queries
3. **Provider Fan-out** — Perplexity + Tavily + Brave in parallel, 12s cap
4. **Embedding Dedupe + Scoring** — `text-embedding-3-small` + pgvector, cosine dedupe, score = similarity × lens weight
5. **Budget-Constrained Curation** — diversity + coverage rules within word budget
6. **Script Generation** — gpt-4o + your training material voice card
7. **Audio Synthesis** — ElevenLabs MP3, 3-4 minutes

Every retained segment carries `lens_item_id`, `relevance_score`, and `matched_profile_fact`. **Personalization is auditable, not asserted.**

Three controls that make it smarter every day:
- **Bookmark** a story → its anchor becomes a persistent beat
- **Ban** a topic → semantic kill (related topics die too, not just keyword matches). Writes a `-1.0` weight delta immediately.
- **Settings → Interests** → declare beats, track specific people/companies, exclude whole topics

Cold-start solved: 11 industries pre-seeded (creator economy, SaaS, healthcare, fintech, consulting, e-commerce, media, edtech, biotech, legal, generic). One tap to accept.

Persistent learning: the nightly aggregator (`sp_aggregate_briefing_feedback`, pg_cron 03:07 UTC) promotes any lens signature with 3+ thumbs-down to a persistent `-0.4` delta. Topics fade without manual policing.

Seven briefing types: Daily Brief, Macro Trends, Vendor Landscape, Competitive Intel, Boardroom Prep, AI Model Landscape, Custom Voice. Pro tier unlocks the specialised ones.

### Edge — Leadership Amplifier
AI synthesizes the user's Memory Web and assessment data into an actionable leadership profile:
- **Sharpen** strengths: Systemize, Teach, Lean Into
- **Cover** weaknesses: Board Memos, Strategy Docs, Emails, Meeting Agendas, Templates, Frameworks
- Interactive strength/weakness pills with feedback loops
- Intelligence gap detection with guided resolution

Edge Pro ($9/month) unlocks unlimited artifact generation, email delivery, all 7 briefing types, **and unlimited Agent Skill Builder generation**.

### Agent Skill Builder (Edge Pro)
Voice-to-Skill pipeline that converts one weekly workflow into a downloadable, agentskills.io-compliant Claude Skill the leader drops into `~/.claude/skills/`.

- **Pain-anchored entry points everywhere**: tap the voice CTA in Edge view, tap the zap on a Memory Web blocker card, or tap the zap on a Briefing decision-trigger segment. The pain becomes the seed.
- **Three Honest Tests triage gate**: if the input is really a Memory Web fact, a Custom Instruction, or a Saved Style, CTRL routes it to the right surface instead of generating a junk skill. This is the difference between "another macro tool" and "a triage system that respects your time."
- **Quality gate**: 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections — validated before you download.
- **Installs across Claude.ai, Claude Code, and Cursor**: the install guide inside the preview sheet leads with the Claude.ai path (3 steps + a direct deeplink to your Skills settings). Developer paths (Claude Code, Cursor) are one tap away under "Other install options".

Two minutes describing a Monday-morning ritual is enough to build permanent agent infrastructure the leader owns. The Skill triggers automatically whenever the leader's team uses the same language. This is the third killer feature on `/context`, alongside Context Export and Custom Voice Export.

### Decision Advisor
AI that already knows your context helps you think through hard calls. No setup. No preamble. Ask the question, get an answer that accounts for your business, your constraints, your priorities.

### Meeting Prep
Contextual briefs generated from your Memory Web. Walk into every meeting already briefed.

### Prompt Coach
Turns vague prompts into precise, context-rich ones. Leaders don't need to learn prompting. CTRL handles it.

### Stream of Consciousness
Just talk. CTRL extracts what matters and adds it to your Memory Web. The more you talk, the sharper your AI double becomes.

### 10X Skills Map
AI identifies strengths to amplify and blind spots to close. Personalized pattern detection from your Memory Web, not a generic assessment.

### AI Literacy Diagnostic
10-minute assessment that maps where the leader stands across 6 dimensions. Surfaces tensions, risk signals, and strategic blind spots specific to their situation.

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

- Technical AI roles (ML engineers, data scientists) — they need implementation tools
- Individual contributors — wrong scope
- Companies wanting someone to implement AI for them — we build decision speed, not systems
- AI enthusiasts who want depth on model architecture
- Buyers requiring SOC 2 / vendor security review for an individual purchase — drive them to enterprise/Sprint
- Buyers demanding Slack/email/calendar integration — wrong product, redirect

---

## Pricing

| Tier | Price | What you get |
|------|-------|--------------|
| **Free / Core** | $0 | Memory Web, Context Export, Onboarding, Daily Briefing (basic), Decision Advisor, Meeting Prep, Prompt Coach, Edge profile preview |
| **Full Diagnostic** | $49 one-time | Full tensions/risks/scenarios, complete thinking tools library |
| **Deep Context Upgrade** | $29 one-time | Enhanced company-context enrichment |
| **Diagnostic + Deep Context Bundle** | $69 one-time | Both above. Saves $10. The default upsell. |
| **Edge Pro** | $9/month | Unlimited Edge artifacts, all 7 briefing types, email delivery, unlimited Agent Skill Builder generation, Custom Voice Export |
| **Bootcamp** (Teams) | $15K-$50K | 4-hour exec sprint + pilot charter |
| **Portfolio** (Partners) | $5K-$25K | Heatmap + offer pack |

---

## Proof Points

- **2 minutes to first export** (onboarding is 3 guided voice questions)
- **3-minute daily audio briefing** with auditable anchoring on every segment
- **Voice-first design** — leaders don't need to type or learn anything
- **Apple-like executive-grade design** — built to put in front of CEOs
- **Self-contained** — no Slack/email/calendar access, no enterprise security review
- **Encrypted at rest** (AES-256-GCM); user controls retention; data never trains any AI model
- **Portable** — not locked to any AI provider or platform
- **74 edge functions, 53 hooks, 99 migrations live** — this is not a prototype
- **Audit weeks 1-6 shipped** (revenue path, data path, UX, reliability, observability, cleanup): timeouts + retries on external APIs, mandatory Stripe signature verification + idempotency, structured edge-function logger, e2e test contracts
- **Built by Krish Raja** — operator experience: Microsoft (2010), MD at Captify ($0→$12M ARR), data revenue at Nine Entertainment ($9M→$61M). Now CEO of Mindmaker, running a multi-agent OS that automates the output of a 30-person team.
- Context export produces richer, more structured prompts than most leaders write by hand in an hour

---

## Email Angle Ideas

### The "Decision Speed" Angle
The leaders pulling ahead with AI aren't using better tools. They're deciding faster because their AI already knows their context. CTRL gives every AI tool you use your full context in one click. Faster input. Faster output. Faster decisions.

### The "Zero-Context Tax" Angle
Every time you open ChatGPT and re-explain who you are, you're paying the zero-context tax. Multiply that across every AI tool, every day. CTRL eliminates it in 2 minutes. Your AI tools know you from the first word.

### The "Portable AI Double" Angle
What if every AI tool you used already knew your business, your goals, your decision style? Not one tool — all of them. CTRL builds a portable AI double from 2 minutes of conversation. It works across ChatGPT, Claude, Gemini, Cursor. Switch tools freely. Your context follows.

### The "2 Minutes vs. 2 Hours" Angle
Most leaders spend 5-10 minutes per AI session setting up context. That's 30-60 minutes a day. CTRL replaces all of it with a one-time, 2-minute voice conversation. The math is simple. The impact is immediate.

### The "Your Competitor Is Faster" Angle
Somewhere, a leader in your space is making AI-assisted decisions in seconds because their AI already knows their world. That leader built their context once and it works everywhere. CTRL is how they did it. The question is how long you want to wait.

### The "Infrastructure, Not Education" Angle
You don't need another AI course. You don't need to learn prompt engineering. You need infrastructure that makes every AI tool you already use work like it was built for you. CTRL is that infrastructure. Two minutes. One click. Done.

### The "Daily Briefing" Angle
Every leader wants a curated news feed. Most vendors give them a firehose tagged with keywords. CTRL does something different: it reads your ACTUAL priorities — the decision on your desk, the companies on your watchlist, the beats you said you care about — and hands you 3-5 stories every morning with "Anchored to: <your priority>" on each one. You see exactly why every headline made the cut. Tap Bookmark to keep a beat. Tap Ban to kill a topic. Your briefing gets sharper every day you use it. Three minutes, audio, done.

### The "Auditable AI" Angle
Leaders are getting tired of mystery algorithms. ChatGPT, LinkedIn, everywhere — "here's what we think you want, trust us." CTRL flips it. Every briefing story shows the specific profile item it was anchored to. Every killed topic was killed by you, on purpose, and you can see the history. It's AI personalization where the leader stays in control of the logic. That matters more every quarter.

### The "No Integrations" Angle
Most AI context tools want access to your Slack, email, calendar, and browser. That means enterprise security reviews, IT approvals, and someone else reading your data. CTRL takes a different approach: you just talk to it. No integrations. No plugins. No permissions. Your context is built from what you choose to share — nothing else. The most private AI double you can build.

### The "Edge Pro Upgrade" Angle (for active free users)
You've built your Memory Web. You've exported to Claude. Now skip the blank page entirely. Edge Pro generates board memos, strategy docs, emails, and meeting agendas in your register, anytime, for $9/month. Less than a coffee. More leverage than your last consulting hour. Plus unlimited Agent Skill Builder generation — turn the workflows you already repeat every week into Claude Skills that fire automatically.

### The "Stop Repeating Yourself" Angle (Skill Builder)
Every leader has 3-5 workflows they do every week. The Monday board update. The Friday hiring sync. The RFP triage. The investor update. Every time, blank page, full context, full instructions. CTRL takes one of them at a time and turns it into a Claude Skill in 2 minutes of voice. Drop the ZIP into `~/.claude/skills/`. The skill auto-fires the moment your team's language matches. You stop repeating yourself. Your leverage compounds.

### The "Triage You Can Trust" Angle
Most "AI workflow" tools generate something whether your input was a real workflow or not. CTRL is the opposite. The Skill Builder runs Three Honest Tests before extracting anything: is this a repeatable workflow, or just a fact, a tone preference, or a writing style? If it's not a workflow, CTRL tells you, routes you to the right surface, and doesn't generate junk. Respect for your time, baked in.

---

## Objection Handling

**"I already use ChatGPT/Claude"**
Good. CTRL makes them dramatically better. Right now, those tools start every conversation knowing nothing about you. CTRL gives them your full context before you type a word. Same tools. Faster to useful output. Faster to decisions.

**"I don't have time"**
Three questions. Two minutes. Voice. That's it. Faster than writing custom instructions in ChatGPT for one tool, and this works across all of them. The time investment is trivial. The time savings compound daily.

**"What about data privacy?"**
CTRL is self-contained. It doesn't connect to your Slack, email, calendar, or any other tool. No enterprise security approvals needed. No background scanning. You talk to it — that's it. All data encrypted at rest (AES-256-GCM). You control what's stored, what's exported, and what's deleted. Your context never trains any AI model. You own your data completely. Stripe webhooks are signature-verified and idempotent (Audit Week 1, shipped 2026-04). Account deletion is end-to-end (Audit Week 2).

**"We already have an AI strategy"**
CTRL isn't a strategy. It's infrastructure. It makes whatever AI strategy you have execute faster by giving every leader on your team personalized AI from day one. Strategy is the plan. CTRL is the accelerant.

**"What's the ROI?"**
Conservative math: every leader spends 30-60 minutes per day on AI context setup. CTRL eliminates that entirely. Add 30 minutes a day saved on news scrolling via the Briefing. That's an hour a day. At a $300/hour fully-loaded leader rate, that's $1,500+/week. Edge Pro is $9/month. The math is not subtle. But the real ROI is decision quality: AI output built on rich, structured context is fundamentally better than output from a blank prompt.

**"Is this just a fancy prompt template?"**
No. Prompt templates are static and generic. CTRL builds a living, structured knowledge base about you from natural conversation, formats it for each specific AI platform, and evolves as your context changes. It's the difference between a form letter and a briefing document written by someone who knows you.

**"I already get too many newsletters"**
This isn't a newsletter. Newsletters are written for everyone. The Daily Briefing is generated for YOU, every morning, from YOUR active decisions and declared interests, filtered against fresh news with embeddings. Every story shows the specific anchor it matched (your decision, your watchlist, your beat). You can Bookmark or Ban any topic with one tap and the system learns immediately. It replaces three newsletters plus 30 minutes of scrolling with 3 minutes of audio that's actually relevant.

**"How is this different from Feedly / Techmeme / morning briefs?"**
Those are curated feeds. They serve everyone the same stories and hope one's relevant. CTRL reads your active decisions, missions, watchlist, and declared beats, generates a custom lens per user per briefing type per day, scores live headlines against it with embeddings, then writes audio in your register. Every segment shows "Anchored to: <your specific priority>" — you can literally audit the relevance. No feed does that.

**"Our leaders aren't technical enough for this"**
That's exactly who this is for. Voice-first. No typing required. No prompt engineering. No technical skills. If a leader can answer three questions about their work out loud, they can use CTRL. Two minutes to a working AI double.

**"Will my data train an AI model?"**
No. Your Memory Web is yours. It's encrypted at rest, never used as training data for any provider, and you can delete it permanently at any time (the account deletion flow is end-to-end — Audit Week 2 closure).

**"Is the briefing accurate?"**
Auditable. Every segment shows the specific profile fact and the cosine relevance score that earned it the slot. If you disagree, Ban it — it dies semantically (related topics die too) and the kill persists forever. There is no black box.

**"What's the difference between Skill Builder and a macro / automation tool / GPT?"**
Three things. (1) **Triage first**: the Three Honest Tests gate refuses to generate a skill when your input is really a fact, a tone preference, or a style. Most tools generate junk; CTRL refuses. (2) **agentskills.io-compliant**: the output is a ZIP that drops straight into `~/.claude/skills/` and auto-triggers in Claude Code, Claude.ai, and Cursor — it is real agent infrastructure, not a saved prompt. (3) **Pain-anchored entry points**: you don't need to remember to use the Skill Builder. Every blocker on Edge, every Memory Web blocker card, every Briefing decision-trigger segment has a one-tap zap that hands the pain straight into the pipeline.

**"Will Skill Builder replace my Claude Custom Instructions?"**
No, and that's the point. The triage gate decides what your input actually is. If it's a workflow → Skill. If it's a tone/voice/style preference → it routes you to Custom Instructions. If it's a fact about you → it routes you to Memory Web. CTRL stays in its lane and points you at the right tool for the other lanes.

**"How do I install an Agent Skill?"**
Download the ZIP from the preview sheet. The install guide inside leads with Claude.ai: three inline steps plus a direct deeplink to your Skills settings page. If you use Claude Code or Cursor, tap "Other install options" for copy-paste instructions for those tools. There's also a `01-test-prompts.txt` of phrases that should auto-trigger the skill so you can verify it works in 60 seconds.

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
- "Decision speed" not "AI transformation"
- "Memory Web" not "database" or "profile"
- "AI double" not "AI assistant" or "AI agent"
- "Thinking tools" not "prompt library"
- "Agent Skill" or "Skill" not "macro", "automation script", or "workflow template"
- "Three Honest Tests" — use this phrase to explain why CTRL refuses to generate junk skills
- "Pain-anchored" — use when explaining the entry points on Edge / Memory / Briefing
- "Zero-context tax" — use this phrase, it lands
- "Auditable relevance" — use when discussing the Briefing
- Every claim should make someone want to write an email
