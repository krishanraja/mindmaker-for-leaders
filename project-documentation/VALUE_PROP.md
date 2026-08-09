# Value Propositions

**Last reconciled:** 2026-08-09 (drift-check pass: the Kit program was RETIRED 2026-08-07, PR #355 - removed from the pricing table and CTA progression. The one-time diagnostic SKU question below is now RESOLVED, not TODO: `public/.well-known/product.json` (ratified 2026-08-04) states plainly they are dead and must not be quoted, and that Bootcamp/Portfolio advisory engagements must not be quoted for CTRL either - Mindmaker retired advisory business in July 2026.)

> RECONCILIATION BANNER. CTRL's positioning is now **building the AI-native version of your business** (product.json's shorter public tagline is "Your AI-native chief of staff"), not "decision speed". The feature-level value props below (Memory Web, Briefing, the Automator, the Decision engine) are accurate as MECHANICS, but the binding promise is no longer "decide faster"; it is "make your business more AI-native". The product is globally DARK (not light). Edge Pro is $49/month (grounded in `edge-pricing.ts`, the decision tier; the daily briefing is free); building Automator skills is FREE for now. Lead with the AI-native frame from `AGENT_BRIEFING.md` + `docs/MAIN-APP-POLISH-SPEC.md` + `product.json`. Separately, `product.json` (2026-08-04) ratified CTRL's ICP as AI-native founders / small-team CEOs, not the broader mid-market audience this file's "Teams"/"Partners" sections and price point table below still describe - see `ICP.md`'s banner for detail; TODO(founder): decide whether the Teams/Partners sections below (Bootcamp, Portfolio) still apply to CTRL at all given product.json says Mindmaker's advisory business is retired and must not be quoted for CTRL.

Clear value propositions for each audience. The binding promise is: **build the AI-native version of your business** (reframe every call to its AI-native version, never stay general).

---

## Leaders Tool: Individual Executives (primary product)

### Core Value Proposition

**For**: Senior leaders who use AI daily but lose time because every AI conversation starts from zero

**Who**: Are making dozens of decisions per week and cannot afford to re-explain their world to AI every single time

**CTRL**: Is a portable AI context platform with a daily evidence-based intelligence Briefing and a voice-to-Agent-Skill builder

**That**: Builds your AI double from two minutes of natural conversation, exports your full context to any AI tool, delivers 3 minutes of audio every morning anchored to your real priorities, and turns the workflows you already repeat every week into downloadable Claude Skills - so every interaction starts from depth, not from scratch

**Unlike**: Custom GPTs (locked to one platform), manual system prompts (hours of work), AI courses (theory, not speed), news feeds (everyone gets the same stories), or generic macro / automation tools (no triage gate - they happily generate junk skills from any input)

**We**: Give you a portable AI double that makes ChatGPT, Claude, Gemini, and every other tool instantly yours, plus built-in thinking tools, a daily audio briefing that already knows your world, and a Skill Builder that converts one weekly workflow into permanent agent infrastructure you own

### The Flywheel

The more you use CTRL, the richer your Memory Web becomes. The richer your Memory Web, the sharper every AI tool gets you to a decision and the more relevant your daily Briefing. The more relevant the Briefing, the more you bookmark and ban - which makes tomorrow's lens sharper still. Decision speed compounds. This is not incremental improvement. It is a structural advantage.

This narrative is now backed by an actual measured metric, not just a story: the founder-signed North Star (`NORTH_STAR.md`, 2026-07-04) defines a "flywheel user" as a leader who BOTH holds a real brain (5+ current facts) AND weighed a decision in the last 7 days, instrumented live in `north_star_flywheel`. Use the narrative above for prose; cite `NORTH_STAR.md` for the actual definition and numbers.

### Component Value Props

**Memory Web**
- "Build a living knowledge base about yourself by just talking."
- Every fact verified by you, encrypted at rest (AES-256-GCM), fully portable.
- The foundation of decision speed. AI that knows your world before you ask.

**Context Export (the killer feature)**
- "One click. Every AI tool you use knows who you are."
- Works across ChatGPT, Claude, Gemini, Cursor, Claude Code, raw markdown.
- Optimized for 6 use cases: meetings, decisions, email, strategy, code, general advisor.
- This is the moment generic AI becomes your AI.

**Daily Briefing - evidence-based, not engagement-based**
- "Three minutes a day that replace thirty minutes of scrolling. News filtered through the one thing that matters: your world."
- Not a feed. Not another digest. A personalised intelligence pass that reads your active decisions, missions, watchlist, and declared interests, then hands you 3-5 stories that move YOUR math.
- Every story is **anchored** to something specific in your profile. The card literally shows "Anchored to: <your active decision>". Auditable relevance. No black box.
- **Bookmark** to keep a beat. **Ban** to kill a topic - semantically (related topics die too, not just keyword matches). The next briefing learns immediately.
- Cold-start solved: industry-specific seed beats proposed on day one (11 industries pre-seeded).
- Audio-first (500-600 words, 3-4 minutes), listen on the way to your first meeting.
- Seven briefing types: Daily Brief, Macro Trends, Vendor Landscape, Competitive Intel, Boardroom Prep, AI Model Landscape, Custom Voice. The daily briefing is free, all types included.
- Persistent semantic learning: explicit Bans = -1.0 weight delta immediately; 3+ thumbs-downs on the same lens signature = -0.4 delta after the nightly aggregator runs (03:07 UTC). Topics fade without manual policing.

**Edge - Leadership Amplifier**
- "Your strengths sharpened, your weaknesses covered."
- AI synthesizes your Memory Web + assessment data into an actionable leadership profile: strengths to amplify (Sharpen) and weaknesses to compensate for (Cover).
- On-demand artifacts in your register: board memos, strategy docs, emails, meeting agendas, frameworks, templates.
- Edge Pro ($49/month) is the decision tier: unlimited decision weighs + a multi-model cross-examination of every decision + decision watch, plus unlimited artifact generation + drafting + email delivery + the live MCP pull of your built skills. (The daily briefing is free.)

**Automator (free for now: build skills with no quota and no paywall)**
- "Pick a recurring workflow, run a 5-step recognition cascade, get a Claude Skill that sounds like you."
- The output is a downloadable, agentskills.io-compliant ZIP. Drop it into `~/.claude/skills/` and forget it. The skill fires whenever a triggering phrase appears in Claude Code, Claude.ai, or Cursor.
- **Building skills is free for now** - any authenticated leader can run the full pipeline, with no per-month cap. Edge Pro gates unlimited decision weighs, the live MCP pull of your skills, and Edge artifacts, not the build (and not the daily briefing, which is free).
- **Voice-aware tone step**: the cascade's tone step is voice-aware. A cold pick writes the voice profile; a returning leader gets a "still sound like you?" confirmation; a paste-extract affordance lets them paste real writing so `extract-voice-profile` derives the 8 dimensions.
- **Voice Profile (captured via `VoiceStyleProfileSheet`, five recognition picks or a paste-extract power path)** locks every generated skill to the leader's actual voice - sign-off, sentence rhythm, hard rules, sample register. It is a single `ctrl_voice_profile` fact. The body carries a `## Voice and tone` section and a structured 8-dimension `voice-profile.md` reference file.
- **Four Honest Tests triage gate** (REPEATABLE / SPECIALISED / BOUNDED / VOICE-LOCK): if the input is really a Memory Web fact, a Custom Instruction, or a Saved Style, CTRL routes you to the right surface instead of generating a junk skill. VOICE-LOCK was added 2026-06-18 so bounded creative-output workflows ("draft LinkedIn posts in my voice") route correctly as `voice-lock` skills instead of being mistaken for universal style preferences.
- **Pain-anchored entry points** filtered to automatable workflows only (strategic blockers excluded): every recurring workflow in Edge view, every Memory Web blocker card, and every Briefing decision-trigger segment has a one-tap zap into the Automator pre-seeded with that pain.
- Quality gate (17/17) enforces 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections including a `## Learning loop`, valid name format, no fabricated voice samples, plus an advisory `body.voiceLockSurfaced` check. Skills you can actually deploy, not drafts you have to clean up.
- Five archetypes covered: decision-framework, voice-lock, reporting-engine, tool-integration, getting-started.

**Decision Advisor**
- "Ask a hard question. Get an answer that knows your context."
- No setup. No preamble. It reads your Memory Web and meets you where you are.
- Faster from question to clarity than any conversation with a blank AI.

**Meeting Prep**
- "Walk into every meeting already briefed, by AI that knows your priorities."
- Contextual briefs generated from your Memory Web in seconds.

**Prompt Coach**
- "Stop guessing what to type. CTRL makes your AI prompts sharp."
- Turns vague questions into precise, context-rich prompts automatically.

**10X Skills & Patterns**
- "AI surfaces your strengths to amplify and your blind spots to close."
- Pattern detection from your Memory Web data, not generic assessments.

**AI Literacy Diagnostic**
- "Know where you stand in 10 minutes. Not 10 hours of courses."
- Surfaces tensions, risk signals, and organizational scenarios specific to you.

### Differentiation Matrix

| Alternative | What They Offer | What CTRL Offers Instead |
|-------------|----------------|----------------------|
| **ChatGPT Custom Instructions** | Manual context writing, locked to OpenAI, static | Auto-extracted context, portable to any AI, living |
| **Claude Projects** | Document upload for one workspace | Living Memory Web that works everywhere |
| **Writing System Prompts by Hand** | Hours of prompt engineering per tool | 2 minutes of talking. Structure extracted automatically. Works across all tools. |
| **Custom GPTs** | One-off bots for specific tasks | Universal context that accelerates every AI interaction |
| **AI Training Courses** | Hours of education before any value | Immediate infrastructure. 2 minutes to first export. |
| **AI Consultants** | $15K+ engagement, creates dependency | Self-serve. Leader owns their data. No dependency. No delay. |
| **AI Context Tools (Notion AI, Mem, Rewind)** | Connect to Slack, email, calendar - require enterprise approvals, read your whole computer | Self-contained. You talk to it. No integrations. No permissions. No IT review. |
| **Morning Briefs (Axios, Morning Brew, Techmeme, Feedly)** | Same stories for everyone, light algorithmic reorder | Custom lens per user per briefing type per day. Every segment shows the specific profile fact it was anchored to. |
| **Macro / Automation / Skill-generation tools** | Generate something from any input, no validation | Four Honest Tests triage gate refuses to generate junk skills; quality gate validates output. agentskills.io-compliant ZIPs that drop into `~/.claude/skills/` and auto-trigger across Claude Code, Claude.ai, and Cursor. |
| **Doing Nothing** | Re-explain yourself to AI every time. Decisions slow. | Set it once. Works everywhere. Gets better over time. Decisions accelerate. |

### Why Leaders Choose CTRL

**Emotional Jobs**
- Stop feeling like AI is wasting your time
- Feel the difference when AI actually knows you. It hits different.
- Walk into every AI conversation with the confidence that the output will be relevant, specific, and fast
- Stop watching other leaders pull ahead while you're still setting up context

**Functional Jobs**
- Make every AI conversation personalized in one click
- Get from question to decision faster, with contextual support, not generic advice
- Export context to any tool without prompt engineering skills
- Reclaim the 30-60 minutes per day lost to AI context setup
- Reclaim 30+ minutes a day of news scrolling for a 3-minute audio briefing that's actually relevant

**Social Jobs**
- Be the leader who uses AI at a level others notice
- Share the approach with your team, not just the tool - the thinking
- Walk into board conversations with AI fluency, not AI anxiety
- Stay visibly ahead of leaders who use AI generically

---

## Teams Tool: Executive Bootcamp

### Core Value Proposition

**For**: Leadership teams facing AI decisions without shared frameworks

**Who**: Lose weeks to circular AI debates and misaligned pilots because the team has no common ground

**CTRL**: Is a 4-hour executive bootcamp

**That**: Aligns your team on AI decision criteria, surfaces hidden tensions, and produces a credible pilot charter - all in one session

**Unlike**: Generic offsite facilitators or vendor-driven "vision" sessions

**We**: Give you a structured sprint that produces alignment and commitments, not decks and wish lists. Your team leaves deciding faster together.

### Component Value Props

**Pre-Work Assessment**
- "Start the workshop already knowing where tensions hide and where speed is being lost."

**7-Segment Structure**
- "Cover cognitive baseline to pilot charter in one session. No filler."

**Pilot Charter Output**
- "Leave with a charter, not a slide deck. Decisions made, not deferred."

**Provocation Report**
- "Get the uncomfortable questions your board will ask, before they ask them."

### Differentiation Matrix

| Alternative | What They Offer | What CTRL Offers Instead |
|-------------|----------------|----------------------|
| **Strategy Consulting Firms** | 3-month projects, 200-slide decks | 4-hour sprint, 20-page charter, decisions made that day |
| **Generic Offsite Facilitators** | Team building and brainstorming | AI-specific decision frameworks that accelerate post-session |
| **AI Vendors** | Product demos and "vision" pitches | Vendor-neutral clarity. Your decisions, not their roadmap. |
| **Internal Planning Meetings** | Circular debates with no resolution | Structured process. Tensions surfaced. Commitments made. |
| **AI Training Providers** | Multi-day programs before any output | Focused strategy sprint. Pilot charter in hand by end of day. |

---

## Partners Tool: Portfolio Assessment

### Core Value Proposition

**For**: VCs, PE firms, and consultants managing portfolios of companies

**Who**: Lack consistent visibility into where AI decision speed is being lost across the portfolio

**CTRL**: Is a portfolio assessment platform

**That**: Maps AI readiness across companies, identifies where leadership decision speed is suffering, and prioritizes interventions that unlock velocity

**Unlike**: Ad-hoc assessments or generic portfolio reviews

**We**: Give you a repeatable framework that demonstrates value-add and shows exactly where to intervene for maximum impact on portfolio decision quality

### Differentiation Matrix

| Alternative | What They Offer | What CTRL Offers Instead |
|-------------|----------------|----------------------|
| **Portfolio Surveys** | Self-reported data with no validation | Structured diagnostic with benchmarking against decision speed metrics |
| **Ad-hoc Consulting** | Different approach per company | Consistent framework. Comparable results. Portfolio-wide visibility. |
| **Internal Reviews** | Time-intensive one-on-ones | Scalable assessment. Results in days, not months. |
| **Vendor Pitches** | Biased toward vendor solutions | Vendor-neutral literacy assessment focused on leadership decision quality |

---

## Unified Positioning

### What Binds All Three

**Problem**: Leaders use AI but every conversation starts from zero. This kills decision speed. The repetitive workflows leaders run every week (board updates, hiring syncs, RFP triage) are re-typed from scratch every time. Teams can't align on AI decisions. Portfolios lack visibility into where velocity is being lost.

**Solution**: CTRL provides portable AI context (Memory Web + Export), evidence-based daily intelligence (Briefing v2), a leadership amplifier (Edge), an Agent Skill Builder (voice-to-Claude-Skill), and structured thinking tools that eliminate the zero-context tax and accelerate the path from question to decision.

**Differentiation**: We don't teach AI. We don't implement AI. We make every AI tool a leader already uses dramatically faster to value by automating context - and we prove the relevance with auditable anchors.

**Outcome**: Faster decisions. Sharper AI output. Less waste. More control. Compounding advantage over time.

### What Varies By Audience

| Dimension | Leaders | Teams | Partners |
|-----------|---------|-------|----------|
| **Primary Need** | Decision speed via portable AI context + auditable daily briefing | Team alignment on AI decisions | Portfolio-wide decision velocity visibility |
| **Time to Value** | 2 minutes | 4 hours | 2 weeks |
| **Key Output** | Memory Web + Exports + Briefing | Pilot charter | Heatmap + offer pack |
| **Core Action** | Talk, export, decide faster | Workshop, align, commit | Assess, prioritize, intervene |
| **Buyer** | Self-funded | Exec team sponsor | Partner/firm |
| **Price Point** | Free / $49/mo Edge Pro (two tiers only; the Diagnostic/bundle SKUs and the Teams/Partners price points to the right are dead for CTRL per `product.json`) | ~~$15K-$50K~~ (dead - Mindmaker retired advisory business July 2026) | ~~$5K-$25K~~ (dead - same) |

### Shared Anti-Positioning

**We Are Not**:
- AI implementation consultants
- Tool vendors or resellers
- Generic executive education
- Another AI wrapper locked to one platform
- A news aggregator that ranks by engagement

**We Are**:
- The decision-speed layer for leaders who use AI
- Portable AI context infrastructure that works everywhere
- Self-contained - no integrations, no plugins, no enterprise security reviews
- Voice-first, zero-learning-curve, executive-grade
- Auditable: every recommendation, every Briefing segment, can be traced to a specific profile fact
- Focused on one thing: leaders deciding faster with AI

---

## Pricing & Packaging (current)

| SKU | Price | What's included | Best for |
|-----|-------|-----------------|----------|
| **Free / Core** | $0 | Memory Web (read-write), **Voice Profile capture**, Context Export (all 6 tools), Onboarding, basic Daily Briefing, Decision Advisor, Meeting Prep, Prompt Coach, Edge profile (preview), **Automator skill builds + exports (free for now, no quota)**. | Every new leader. The "land" in land-and-expand. |
| **Edge Pro** | $49/month | The **decision engine**: unlimited decision weighs + a multi-model cross-examination of every decision + decision watch, plus the **live MCP pull of your built skills (`list_skills` / `get_skill`)**, unlimited Edge artifacts (board memos, strategy docs, emails, agendas), drafting, email delivery, Custom Voice Export, MCP agent access. (The daily briefing is free, not gated here.) | Leaders who treat AI as part of their weekly cadence |

**Dead, do not quote for CTRL** (per `product.json`'s guardrails): Full Diagnostic ($49 one-time), Deep Context Upgrade ($29 one-time), Diagnostic + Deep Context Bundle ($69 one-time), Bootcamp ($15K-$50K), Portfolio ($5K-$25K). Kit access was RETIRED 2026-08-07 (PR #355) and is no longer part of the Free tier.

---

## Sales & Marketing Anchors (for AI agents)

Pick the right hook for the audience and channel:

- **For "I already use ChatGPT" objection**: "CTRL makes ChatGPT (and Claude, and Gemini) dramatically better. Same tools, your context, faster to useful output."
- **For privacy-conscious audiences**: "No integrations. Self-contained. You talk to it. No IT review needed."
- **For exhausted-by-AI-content audiences**: "Most AI tools want to read your inbox. CTRL just listens. That's the whole product."
- **For information-overload audiences**: "Cancel three newsletters. We replace them with 3 minutes of audio that's actually about you."
- **For boardroom-pressure audiences**: "Walk into your next board meeting fluent in your AI strategy. Or be the one being briefed."
- **For peer-comparison audiences**: "Somewhere, a leader in your space is making AI-assisted decisions in seconds because their AI already knows their world. CTRL is how."
- **For builder/operator audiences**: "Built by Krish Raja - 16 years monetizing emerging tech, $0 → $12M ARR at Captify, $9M → $61M data revenue at Nine. The tool he wished existed when running real P&Ls."
- **For Claude / Cursor / Claude Code power users**: "CTRL is the first tool that turns your weekly leader workflows into agentskills.io-compliant Skills you drop into `~/.claude/skills/`. Two minutes of voice. Permanent leverage. Triage gate refuses to generate junk."
- **For "automation fatigue" audiences**: "Most automation tools generate something whether your input was a real workflow or not. CTRL's Four Honest Tests triage gate refuses to generate a skill from a fact, a tone preference, or a writing style. The respect for your time is the product."
- **CTA progression**: Free signup → Voice Profile → free Automator skill (no quota) → seed beats accepted → first Briefing (free) → first decision weigh (3 free/month) → Edge Pro upsell (unlimited decision weighs + cross-examination + decision watch + live MCP skills pull + Edge artifacts + Custom Voice Export). The Kit redemption side-door and the Diagnostic upsell step are both retired/dead; do not use them in outbound.
