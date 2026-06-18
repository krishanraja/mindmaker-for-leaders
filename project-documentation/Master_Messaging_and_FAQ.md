# CTRL & Mindmaker Master Messaging & FAQ
*Core Source of Truth for Product Marketing, Sales, Content, and Outbound*

**Last Updated:** 2026-06-09

---

**Goal:** This document is the central brain for the CTRL product (the portable context layer for leaders) and the Mindmaker operating brand (Krish Raja's commercial entity). It synthesizes the operator history, the psychological pain of the enterprise buyer, the specific "Aha" moments of the products, and the core philosophies of the business.

---

## PART 1: THE CORE NARRATIVE & IDENTITY (WHO IS KRISH?)

**The One-Liner:**
Technical strategist. 16 years monetizing emerging tech at scale.

**The Credential Pivot (For Outbound & Sales):**
"I started coding at Microsoft and spent my career running product strategy. I was always the one asked to build the 'what's next' revenue stream. Now I build autonomous business systems."

**The Proof Points (Never boastful, always factual context):**
- **The Foundation:** Built the first global automated media campaigns at Microsoft in 2010.
- **The Scale:** Scaled Captify APAC from $0 to $12M ARR as MD (P&L owner), leading a team of 18 with 22% EBITDA.
- **The Enterprise Transformation:** Took Nine Entertainment's data revenue from $9M to $61M.
- **The Current Reality:** CEO of Mindmaker, running a custom multi-agent OS (v3) that automates the output of a 30-person team. Building the future live.

**The Positioning vs. The Market:**
I am not an advisor. I am an operator, a CEO, and a systems builder. I do not sell 40-slide research decks. I provide live, operational training tailored to your business goals while I build the systems in the room with you.

---

## PART 2: THE CORE PAIN & THE REALITY GAP

**The Symptom (What they do):**
Executives are learning AI "from a distance." They are putting AI on board decks and forcing themselves to talk the talk to inspire their teams, but they are not in the tools. They are outsourcing the actual mechanics to their IT or RevOps teams.

**The Underlying Anxiety (What they feel):**
- **The Boardroom Fear:** The visceral terror of looking dumb in a board meeting because they cannot actually execute the strategy they just presented.
- **The Competitor Threat:** The knowledge that AI-native competitors will move faster by default. Once an AI-enabled business hits its stride, a legacy business cannot pivot fast enough to catch up.
- **The Vendor Paralysis:** The fear of wasting millions of dollars on the wrong vendor because they lack the technical literacy to evaluate them properly.

**The Enemy (The 6-Figure Consultant Trap):**
The big consultancies (McKinsey, BCG, Deloitte) are selling 6-figure decks built by lifelong researchers. They cannot see the future because they do not build it. They research it. Leaders don't need research; they need operational certainty from someone who has run a P&L and actually codes the systems.

**The Core Belief:**
"If you don't learn AI, it will just learn you. AI learned to speak English, but we have to learn to speak AI. You don't have to be a coder, but the time is gone where you can outsource this stuff."

---

## PART 3: THE CTRL APP (THE PORTABLE CONTEXT LAYER)

**What is CTRL?**
A portable AI memory web. A private, fundamental brain that sits underneath tools like Cursor, Claude, or ChatGPT. It organizes, verifies, and retains your specific context permanently. Plus a daily 3-minute audio briefing built from your real priorities, where every segment is anchored to a specific profile fact. Plus an Agent Skill Builder that converts one weekly leader workflow into a downloadable, agentskills.io-compliant Claude Skill the leader drops into `~/.claude/skills/` and forgets - it auto-triggers whenever the team's language matches.

**The "Aha" Moment (The Origin Story):**
The moment people tried to export their memories from ChatGPT to Claude and realized they were hallucinated, inaccurate, or trapped. AI models will constantly change. Vendor lock-in is a massive risk. Your context and memories are too precious to rent. You need a layer of controlled trust over a technology that hallucinates.

**The Pitch to Individuals (Track 1 Outbound):**
Every time you test a new model or open Cursor, you start from zero. You spend cycles re-explaining your architecture. CTRL fixes this friction. Stop renting your brain to walled gardens and build a compounding advantage.

**The Pitch to Enterprise (The Trojan Horse):**
We give CTRL away free for the core experience (Memory Web, Context Export, basic Briefing). Once leaders use it and map their context, it inevitably exposes the reality gap in their organization - their tech might be strong, but their governance or commercial positioning is broken. That realization sells the Mindmaker Sprint.

**The CTRL stack at a glance (today):**
- React 18 + TypeScript + Vite + Tailwind + shadcn/ui front-end. Desktop ships a unified desktop-native shell (sticky top bar + optional right rail + Cmd/Ctrl+K Command Palette) instead of stretched mobile markup.
- Supabase backend: PostgreSQL with pgvector + pgcrypto + pg_cron, **80 edge functions** (Deno, incl. `generate-skill-export` and the `decision-engine` trio), **59 React hooks**, **110 migrations** applied
- AI: Vertex AI (Gemini 2.0 Flash) primary, OpenAI GPT-4o fallback, OpenAI Whisper for voice, ElevenLabs for audio, OpenAI `text-embedding-3-small` for the briefing pipeline
- Payments: Stripe (signature-verified, idempotent webhooks)
- Email: Resend
- Hosting: Vercel front-end, Supabase Cloud backend
- Audit-hardened: 6 thematic audit weeks shipped covering revenue path, data path, UX, reliability, observability, and cleanup
- Phase 8 (May 2026): Agent Skill Builder + world-class desktop redesign + pain-anchored Skill entry points on Edge / Memory / Briefing

---

## PART 4: MINDMAKER SPRINTS (THE BUSINESS MOMENT)

**What it is:**
High-leverage, 1:1 operational sprints.
- **Enterprise Sprints (1-Day):** Embedded commercial strategy, positioning, and board-ready decision frameworks. $15K-$50K depending on scope.
- **Builder/Orchestrator Sprints (4-Week):** Resolving build-vs-buy friction, mapping deployment sequences, and locking in architecture.

**The "Aha" Moment (The Outcome):**
It is NOT an AI moment. It is a **Business Moment**.
At the end of the sprint, the leader walks away with the ability to stand on a stage, look their board in the eye, inspire their team, and make faster decisions with absolute confidence. They transition from "learning AI from a distance" to walking the walk.

**The Output:**
One decision. One trade-off analysis. One commitment. Working systems and a 90-day execution plan. No fluff.

---

## PART 5: PRICING ANCHORS

| SKU | Price | Audience |
|---|---|---|
| CTRL Free | $0 | Every leader. The land in land-and-expand. Includes read-write Memory Web, Voice Profile capture, Kit access, and **Automator skill builds + exports (free for now, no quota)**. The Kit-side-door entry path (anonymous students from `/kit`) graduates into this tier. |
| Full Diagnostic | $49 one-time | Leaders who want a one-shot deep audit |
| Deep Context Upgrade | $29 one-time | Pre-meeting / strategy sprint prep |
| Diagnostic + Deep Context Bundle | $69 one-time (saves $10) | Default upsell after Memory Web is built |
| Edge Pro | $29/month | Active leaders who treat AI as part of weekly cadence. Daily briefing, decision engine, the **live MCP pull of your built skills (`list_skills` / `get_skill`)**, unlimited Edge artifacts, all 7 briefing types, email delivery, Custom Voice Export, MCP agent access. (Building Automator skills is free for now, not gated here.) |
| Mindmaker Enterprise Sprint | $15K-$50K | Exec teams |
| Mindmaker Portfolio Engagement | $5K-$25K | VC / PE / consulting partners |

Full plan matrix: see `docs/PRICING.md` and the `PlanMatrix` block in the Edge Pro settings tab.

---

## PART 6: MASTER FAQ & OBJECTION HANDLING

**Q: Why shouldn't we just hire a major consultancy to build our AI strategy?**
A: Big consultancies sell you 6-figure decks built by lifelong researchers. I am an operator and a CEO. I have scaled businesses from $0 to $12M ARR, and today I run my own autonomous AI company. I don't give you research; I give you live operational training and working systems tailored to your revenue goals.

**Q: Why shouldn't we just delegate AI to our IT or RevOps teams?**
A: The previous era of SaaS was designed to be used by humans, so IT could manage it. Agentic AI is designed to replace human workflows, which changes the entire organizational structure. If you separate the business acumen from the AI decision-making, your strategy will fail. You cannot outsource your vision.

**Q: We are already subscribing to ChatGPT Enterprise. Isn't that enough?**
A: Buying ChatGPT Enterprise is not an AI strategy; it is a software subscription. It leaves you vulnerable to vendor lock-in and traps your company's context in a walled garden. You need a portable context layer (CTRL) and an orchestrated system that works across models.

**Q: How do we know which vendors to choose? The market is moving too fast.**
A: That is exactly the friction my sprints resolve. You are paralyzed by the fear of wasting millions on the wrong vendor. We cut through the noise, lock in an architecture, and give you the confidence to commit to a direction so your team can actually start shipping.

**Q: What is the most sensitive question you get asked in closed rooms?**
A: "How do I identify who I should replace in my business versus who I should empower?" It is the unspoken reality of AI deployment, and navigating it requires someone who has managed P&Ls and led teams through digital transformations, not just an engineer.

**Q: What is the Builder Economy?**
A: The Creator Economy allowed everyone to broadcast. The Builder Economy means everyone will build. People will "vibe code" software, and it will change the paradigm of work entirely. Mindmaker is built to arm the leaders of this new economy.

**Q: Is CTRL secure for executive use?**
A: Yes. Memory Web content is encrypted at rest (AES-256-GCM), decrypted only inside edge functions and never client-side. Stripe webhooks are signature-verified and idempotent. Account deletion is end-to-end. Briefing rate limits are enforced. There is no Slack, email, or calendar integration - the data flow is exactly what you spoke or typed, nothing else.

**Q: How is the Briefing different from a newsletter or Feedly?**
A: Newsletters serve everyone the same content. Feedly is a tag-and-rank UI on top of RSS. CTRL builds a custom **lens** per user per briefing type per day from your active decisions, missions, watchlist, and declared interests, scores live headlines against it with embeddings, then writes audio in your register. Every segment shows "Anchored to: <your specific priority>" - auditable relevance. Bookmark to pin a beat. Ban to semantically kill a topic forever. The lens learns from a nightly aggregator that promotes 3+ thumbs-down on the same signature into a persistent `-0.4` weight delta.

**Q: What about model lock-in? You mention OpenAI and Vertex AI.**
A: We use Vertex AI (Gemini 2.0 Flash) as primary and OpenAI GPT-4o as fallback inside the AI generation pipeline - this is hidden infrastructure, not a buyer commitment. The user-facing value is **portable context**: your Memory Web exports to ChatGPT, Claude, Gemini, Cursor, Claude Code, or raw markdown. The leader is never locked into our model choices. They take their context anywhere.

**Q: Can I delete everything if I leave?**
A: Yes. Account deletion removes Memory Web facts, briefings, audio artifacts, decisions, missions, assessments, and Skill Builder exports. Audit Week 2 closed an assessment-data leak and codified the storage bucket policy. Your data does not train any AI model. Your data is yours.

**Q: What is the Agent Skill Builder and why should I care?**
A: It is the **Automator**, the default flow on `/context`. The leader picks a recurring deliverable CTRL mined from their brain, runs a 5-step recognition cascade (how / inputs / structure / tone / guardrails, where the tone step is voice-aware), and CTRL hands them a downloadable, agentskills.io-compliant Claude Skill (a `SKILL.md` plus references, test prompts, and an install guide, packaged as a ZIP). Building skills is free for now, with no quota, for every leader including anonymous Kit sessions. Two minutes of picking, permanent agent infrastructure they own.

**Q: Why isn't the Skill Builder just another "AI macro" tool?**
A: Four reasons. (1) The **Four Honest Tests** triage gate (REPEATABLE / SPECIALISED / BOUNDED / VOICE-LOCK) refuses to generate a skill when the input is really a Memory Web fact, a Custom Instruction, or a Saved Style - it routes the leader to the right surface instead. Most tools generate junk; CTRL refuses. (2) The **Voice Profile** captured by `VoiceStyleProfileSheet` (five recognition picks or a paste-extract power path) flows into every generated skill as a single `ctrl_voice_profile` fact, producing a `## Voice and tone` section + a structured 8-dimension `voice-profile.md` reference that locks the output to the leader's actual voice. Generic AI prose is replaced with their sign-off, sentence rhythm, hard rules, and sample register, and the harness never fabricates a voice sample. (3) The output is agentskills.io-compliant, not a saved prompt - real agent infrastructure that works in Claude Code, Claude.ai, and Cursor. (4) Pain-anchored entry points filtered to **automatable** items only (strategic blockers like "Retention Challenge" are filtered out): every recurring workflow on Edge, every Memory Web blocker card, every Briefing decision-trigger segment has a one-tap zap into the Automator pre-seeded with that pain.

**Q: Where does Skill Builder fit in the Edge Pro upsell?**
A: Edge Pro is $29/month (moved from $9 on 2026-05-30; existing subscribers are grandfathered). Building Automator skills is **free for now**, with no per-month quota and no paywall, so every leader experiences the full pipeline without payment. Edge Pro instead gates the daily briefing, the **live MCP pull of your built skills (`list_skills` / `get_skill`)**, Edge artifacts, plus the decision engine, all 7 briefing types, email delivery, and Custom Voice Export. The free Automator build is the front-door trust-builder; the paid surfaces are what comes after. The Kit side door (anonymous students from `/kit`) lands in the free tier directly via `upgradeAnonymousSession()`, removing the auth-and-pay wall between class and first build.

**Q: How do students enter for free without a credit card?**
A: The Kit program at `/kit` is fully public. A student scans the class QR, redeems a code, and operates inside an anonymous Supabase session - no signup required. Their intake answers, Memory Web facts, voice profile and kit_redemptions are all keyed to the anonymous `user_id`. When they tap "Save my profile" inside `KitHome`, `upgradeAnonymousSession(email, password)` converts the anonymous account into a named CTRL Free user without losing any data (`auth.uid()` is preserved across the upgrade). They land at `/dashboard?welcome=free` with read-write Memory Web, their captured voice profile, and the Automator ready to build skills for free (no quota).
