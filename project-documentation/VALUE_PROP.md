# Value Propositions

**Last reconciled:** 2026-08-02.

> RECONCILIATION BANNER. The 2026-06-21 repositioning is confirmed current: **building the AI-native version of your business**, not "decision speed". This pass folded that correction into the body instead of leaving it as a banner over stale prose: the Leaders audience section's binding promise, Flywheel description, and Component Value Props were rewritten below. Two further corrections grounded in the code: (1) "Decision Advisor", "Meeting Prep", "Prompt Coach", "10X Skills & Patterns", "Stream of Consciousness", and "AI Literacy Diagnostic" are retired as standalone named tools (none exist in `src/` any more; `/diagnostic` is a bare redirect to `/dashboard`, and `MeetingPrepTab.tsx` / `PromptLibraryV2.tsx` are unimported dead code) - they were consolidated into the single decision engine (`/decision`, "weigh it") and Edge artifacts, and the component list below reflects that. (2) The Teams/Partners sections and the "Unified Positioning" binding-promise language were still "decision speed"; reframed to AI-native below (Bootcamp/Portfolio pricing bands and scope are unchanged, still TODO(founder) per section 5 of `AGENT_BRIEFING.md`). The product is globally DARK (not light). Edge Pro is $49/month (the decision tier; the daily briefing is free); building Automator skills is free for now.

Clear value propositions for each audience. The binding promise is: **build the AI-native version of your business** (reframe every call to its AI-native version, never stay general; the decision engine, the Memory Web substrate, and the Automator are how that happens day to day).

---

## Leaders Tool: Individual Executives (primary product)

### Core Value Proposition

**For**: Senior leaders who need to make their business AI-native and do not know where to start

**Who**: Already use AI daily but are bolting it onto a business that still runs the old way, and cannot yet see which workflows an agent should own, what their AI-native offer looks like, or how a specific call on their desk should change

**CTRL**: Is the instrument that reframes a leader's real decisions to their AI-native version and grounds them in evidence, built on a portable Memory Web substrate, a daily AI-native intelligence Briefing, and a voice-to-Agent-Skill builder

**That**: Takes any general-business call ("should I hire a VP of Sales?") and reframes it into the AI-native version ("should an agent own part of that motion first?"), pressure-tests it against live evidence, and hands back a board-ready decision memo; builds your context once from voice or text and exports it to any AI tool; delivers 3 minutes of audio every morning anchored to your real priorities, filtered to nine AI-native categories; and turns a workflow you already repeat every week into a downloadable, installable Claude Skill

**Unlike**: General business advisors and strategy decks (answer the general question, never the AI-native one), Custom GPTs (locked to one platform), manual system prompts (hours of work), news feeds (everyone gets the same stories), or generic macro / automation tools (no triage gate - they happily generate junk skills from any input)

**We**: Give you a decision engine that never lets a call stay general, a portable AI double that makes ChatGPT, Claude, Gemini, and every other tool instantly yours, a daily audio briefing filtered to what changes how you build/run an AI-native business, and a Skill Builder that converts one weekly workflow into permanent agent infrastructure you own

### The Flywheel

The North Star (see `NORTH_STAR.md`, founder-signed 2026-07-04) is the flywheel: a leader who both holds a real brain (5+ current facts in Memory) and has weighed a decision in the last 7 days, in the same week. The more you tell CTRL, the richer the Memory Web; the richer the Memory Web, the sharper the reframe and the weigh; the sharper the weigh, the more reason to come back and tell it more. Either half alone is not the product working: a rich brain that never drives a decision is a filing cabinet, and a decision with no brain behind it is a generic answer. This is not incremental improvement. It is a structural advantage that compounds week over week.

### Component Value Props

**Memory Web**
- "Build a living knowledge base about yourself by just talking."
- Every fact verified by you, encrypted at rest (AES-256-GCM), fully portable.
- The foundation of decision speed. AI that knows your world before you ask.

**Context Export (the killer feature)**
- "One click. Every AI tool you use knows who you are."
- Works across ChatGPT, Claude, Gemini, Cursor, Claude Code, raw markdown.
- Optimized per use case (`ExportUseCase` in `src/types/memory.ts`): general, meeting, decision, code, email, strategy, delegation, board, plus more specialised Edge presets. TODO(founder)/tech-debt note: the "6 use cases" figure quoted under the prior positioning is stale (the type now lists more); do not quote a specific count without re-checking the code.
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
- **Building skills is free for now** - any authenticated leader (including anonymous Kit sessions) can run the full pipeline, with no per-month cap. Edge Pro gates unlimited decision weighs, the live MCP pull of your skills, and Edge artifacts, not the build (and not the daily briefing, which is free).
- **Voice-aware tone step**: the cascade's tone step is voice-aware. A cold pick writes the voice profile; a returning leader gets a "still sound like you?" confirmation; a paste-extract affordance lets them paste real writing so `extract-voice-profile` derives the 8 dimensions.
- **Voice Profile (captured via `VoiceStyleProfileSheet`, five recognition picks or a paste-extract power path)** locks every generated skill to the leader's actual voice - sign-off, sentence rhythm, hard rules, sample register. It is a single `ctrl_voice_profile` fact. The body carries a `## Voice and tone` section and a structured 8-dimension `voice-profile.md` reference file.
- **Four Honest Tests triage gate** (REPEATABLE / SPECIALISED / BOUNDED / VOICE-LOCK): if the input is really a Memory Web fact, a Custom Instruction, or a Saved Style, CTRL routes you to the right surface instead of generating a junk skill. VOICE-LOCK was added 2026-06-18 so bounded creative-output workflows ("draft LinkedIn posts in my voice") route correctly as `voice-lock` skills instead of being mistaken for universal style preferences.
- **Pain-anchored entry points** filtered to automatable workflows only (strategic blockers excluded): every recurring workflow in Edge view, every Memory Web blocker card, and every Briefing decision-trigger segment has a one-tap zap into the Automator pre-seeded with that pain.
- Quality gate (17/17) enforces 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections including a `## Learning loop`, valid name format, no fabricated voice samples, plus an advisory `body.voiceLockSurfaced` check. Skills you can actually deploy, not drafts you have to clean up.
- Five archetypes covered: decision-framework, voice-lock, reporting-engine, tool-integration, getting-started.

**Decision Engine (the weigh)**
- "One field. Talk it out or type it. CTRL reframes it, pressure-tests it, and shows you where it holds and where it breaks."
- No explainer wall, no setup: a single fast-capture input ("Weigh it", mic embedded) starts the pipeline - reframe to the AI-native version, decompose into claims, verify against live evidence, cross-examine.
- The result is a radial evidence spider (the decision at the centre, six AI-native forces spidering out, colour-coded by whether they hold up), one-line scored sources you can "Dig deeper" into for nested/countered evidence, and a board-ready one-page decision memo you copy out.
- Faster from question to a defensible answer than any conversation with a blank AI, and auditable the way the Briefing is: every claim shows its evidence, not just a verdict.

### Differentiation Matrix

| Alternative | What They Offer | What CTRL Offers Instead |
|-------------|----------------|----------------------|
| **ChatGPT Custom Instructions** | Manual context writing, locked to OpenAI, static | Auto-extracted context, portable to any AI, living |
| **Claude Projects** | Document upload for one workspace | Living Memory Web that works everywhere |
| **Writing System Prompts by Hand** | Hours of prompt engineering per tool | Talk naturally, structure extracted automatically. Works across all tools. |
| **Custom GPTs** | One-off bots for specific tasks | Universal context that accelerates every AI interaction |
| **AI Training Courses** | Hours of education before any value | A live decision engine and a Memory Web from the first session, not a syllabus. |
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

**Problem**: Most businesses use AI without becoming AI-native. Leaders bolt AI onto a business that still runs the old way; general-business calls get answered as general business with no AI-native angle; the repetitive workflows leaders run every week (board updates, hiring syncs, RFP triage) are re-typed from scratch every time; teams can't align on AI decisions; portfolios lack visibility into where AI-native transformation is stalling.

**Solution**: CTRL provides a decision engine that reframes every call to its AI-native version and grounds it in evidence, a portable AI context substrate (Memory Web + Export), an AI-native daily intelligence Briefing, and an Agent Skill Builder (voice-to-Claude-Skill) that turns a workflow into agent infrastructure the leader owns.

**Differentiation**: We don't teach AI. We don't implement AI. We are the instrument that pulls every real decision toward its AI-native version and proves the reframe with evidence, not a vendor pitch.

**Outcome**: The AI-native version of the business, one decision at a time. Sharper AI output. Less waste. More control. A compounding advantage that the flywheel metric (Memory + weighed decisions, same week) makes measurable.

### What Varies By Audience

| Dimension | Leaders | Teams | Partners |
|-----------|---------|-------|----------|
| **Primary Need** | Build the AI-native version of the business, one decision at a time, on a portable AI context substrate | Team alignment on AI-native decisions | Portfolio-wide visibility into AI-native transformation |
| **Time to Value** | Minutes (profile setup) to first weighed decision | 4 hours | 2 weeks |
| **Key Output** | Memory Web + Exports + Briefing + weighed decisions | Pilot charter | Heatmap + offer pack |
| **Core Action** | Tell it your world, weigh a decision, build the substrate | Workshop, align, commit | Assess, prioritize, intervene |
| **Buyer** | Self-funded | Exec team sponsor | Partner/firm |
| **Price Point** | Free / $49/mo Edge Pro (decision tier); one-time diagnostic SKUs TODO(founder), see Pricing table below | $15K-$50K | $5K-$25K |

### Shared Anti-Positioning

**We Are Not**:
- A general business advisor
- AI implementation consultants
- Tool vendors or resellers
- Generic executive education
- Another AI wrapper locked to one platform
- A news aggregator that ranks by engagement

**We Are**:
- The instrument for building the AI-native version of your business, one decision at a time
- Portable AI context infrastructure that works everywhere
- Self-contained - no integrations, no plugins, no enterprise security reviews
- Voice-first, zero-learning-curve, executive-grade
- Auditable: every decision claim and every Briefing segment can be traced to specific evidence or a specific profile fact
- Focused on one thing: pulling every real decision toward its AI-native version

---

## Pricing & Packaging (current)

| SKU | Price | What's included | Best for |
|-----|-------|-----------------|----------|
| **Free / Core** | $0 | Memory Web (read-write), **Voice Profile capture**, Context Export (all 6 tools), the decision engine (3 weighs/month), Edge profile (preview), Kit access, daily personalised Briefing, **Automator skill builds + exports (free for now, no quota)**. Kit side-door students from `/kit` graduate here. | Every new leader. The "land" in land-and-expand. |
| **Edge Pro** | $49/month | The **decision tier**: unlimited decision weighs + a multi-model cross-examination of every decision + decision watch, plus the **live MCP pull of your built skills (`list_skills` / `get_skill`)**, unlimited Edge artifacts (board memos, strategy docs, emails, agendas), drafting, email delivery, Custom Voice Export, MCP agent access. (The daily briefing is free, not gated here.) | Leaders who treat the decision engine as part of their weekly cadence |
| **Bootcamp** | $15K-$50K | 4-hour executive sprint + pilot charter + provocation report | Exec teams |
| **Portfolio** | $5K-$25K | Heatmap + offer pack across portfolio companies | VCs / PE / consultants |

**One-time diagnostic SKUs, TODO(founder)**: Full Diagnostic ($49), Deep Context Upgrade ($29), and the Bundle ($69) are still wired in Stripe (`create-diagnostic-payment`), but `/diagnostic` in the app is currently a bare redirect to `/dashboard` with no purchase UI behind it, so there is no live path for a leader to buy these today. Do not lead with them in outbound until a founder confirms whether the UI returns or the SKUs are retired.

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
- **CTA progression**: Free signup (or Kit redemption → side-door upgrade) → ~20-second profile setup (industry, role, interests) → role-tailored starter decision → seed beats accepted → first Briefing (free) → first decision weigh (3 free/month) → free Automator skill (no quota) → Edge Pro upsell (unlimited decision weighs + cross-examination + decision watch + live MCP skills pull + Edge artifacts + Custom Voice Export). The one-time Diagnostic SKUs are not currently in this path (see TODO above).
