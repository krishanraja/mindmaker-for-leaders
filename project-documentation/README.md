# CTRL Project Documentation

**Master Index**

This folder is the canonical source of truth for the CTRL portable AI context platform. Everything else at the repo root has been removed in the 2026-04-26 docs refresh - if it's not in this folder or in the root `README.md` / `CLAUDE.md` / `CHANGELOG.md`, it was historical noise.

**Last Updated:** 2026-05-13
**Current Version:** v5.2 (Skill Builder + desktop UI redesign shipped on top of v5.1's audit-hardened base)

---

## Documentation Structure

### Sales & Outbound (start here for sales/marketing AI agents)
- [SALES_BRIEF.md](./SALES_BRIEF.md) - Outbound brief with email angles, objection handling, pricing, ICP fit signals
- [Master_Messaging_and_FAQ.md](./Master_Messaging_and_FAQ.md) - Founder narrative, enterprise pitch, master FAQ

### Strategic Foundation
- [PURPOSE.md](./PURPOSE.md) - Core mission and problem statement
- [ICP.md](./ICP.md) - Ideal customer profile: the research-grounded "Mindmaker" archetype, psychographics + skill gap, pains mapped to features, gap map, voice of customer, anti-ICP, buying triggers, app pricing anchors
- [VALUE_PROP.md](./VALUE_PROP.md) - Per-audience value props with differentiation matrices
- [OUTCOMES.md](./OUTCOMES.md) - Stage-by-stage outcomes with measurable KPIs

### Product & Features
- [FEATURES.md](./FEATURES.md) - Complete feature inventory (Memory Web, Context Export, Briefing v2, Edge, Diagnostic, Missions, AI Tools), settings tabs, audit track record, sales-anchor index
- [VISUAL_GUIDELINES.md](./VISUAL_GUIDELINES.md) - Visual design principles and examples

### Technical Foundation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture, data flow, edge function inventory, audit-hardening details
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Design tokens, components, and patterns
- [BRANDING.md](./BRANDING.md) - Brand voice, tone, and messaging guidelines

### Operational Knowledge
- [HISTORY.md](./HISTORY.md) - Phases 1-7. Includes the April 2026 audit hardening track record.
- [COMMON_ISSUES.md](./COMMON_ISSUES.md) - Recurring bugs, architectural pain points, audit-aftermath notes
- [DECISIONS_LOG.md](./DECISIONS_LOG.md) - 41 architectural and product decisions with rationale and outcomes
- [REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md) - Step-by-step rebuild instructions
- [MASTER_INSTRUCTIONS.md](./MASTER_INSTRUCTIONS.md) - Engineering principles and AI assistant behavior guidelines

---

## Quick Start for Sales / Marketing AI Agents

1. Read [SALES_BRIEF.md](./SALES_BRIEF.md) - every angle, every objection, every price point in one place
2. Read [ICP.md](./ICP.md) - who to target, who not to, what signals fit looks like
3. Read [VALUE_PROP.md](./VALUE_PROP.md) - feature-level differentiation and pricing matrix
4. Read [OUTCOMES.md](./OUTCOMES.md) - proof points and metrics for copy
5. Reference [BRANDING.md](./BRANDING.md) - voice, tone, vocabulary do/don'ts
6. Reference [Master_Messaging_and_FAQ.md](./Master_Messaging_and_FAQ.md) - founder positioning + closed-room objections

Each strategic doc ends with a **"Sales & Marketing Anchors"** section - pull from those for outbound copy, ad creatives, social posts, and landing-page sections.

## Quick Start for Developers

1. [PURPOSE.md](./PURPOSE.md) - what you're building and why
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - system design, data flow, edge functions
3. [FEATURES.md](./FEATURES.md) - what each feature does + sales anchors
4. [HISTORY.md](./HISTORY.md) - Phase 7 audit details (revenue/data/UX/reliability/observability/cleanup)
5. [DECISIONS_LOG.md](./DECISIONS_LOG.md) - 41 decisions with trade-offs
6. [COMMON_ISSUES.md](./COMMON_ISSUES.md) - known issues and resolutions
7. [REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md) - to set up a new instance
8. [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - UI tokens and patterns
9. Repo root [`CLAUDE.md`](../CLAUDE.md) - workflow + Supabase CLI conventions

---

## AI Reasoning Framework

All AI-generated insights are anchored in cognitive frameworks embedded in the `ai-generate` edge function.

### Five Core Cognitive Frameworks
1. **A/B Framing** - Reframe decisions to expose bias (positive vs negative framing)
2. **Dialectical Tension** - Thesis-antithesis-synthesis for balanced reasoning
3. **Mental Contrasting (WOOP)** - Goals, obstacles, and realistic planning
4. **Reflective Equilibrium** - Aligning decisions with organizational principles
5. **First-Principles Thinking** - Fundamental problem-solving, challenging assumptions

### AI Response Requirements
- Never provide generic advice disconnected from user's specific context
- Always tie insights to specific assessment data and user answers
- Apply appropriate cognitive framework based on decision type
- Present multiple perspectives before synthesizing recommendations
- Calibrate confidence levels to reasoning quality
- Challenge assumptions through Socratic questioning

---

## Current State (v5.2 - verified 2026-05-13)

### Product Positioning
- **Tagline**: "Clarity for Leaders"
- **Core Value**: Decision speed for leaders. Portable AI context that makes every AI tool personalised, an evidence-based daily briefing anchored to real priorities, and a Skill Builder that turns repetitive leader workflows into agentskills.io-compliant Claude Skills.
- **Time to Value**: 2 minutes to first export. 3 minutes a day for the Briefing. One voice description (~2-5 minutes) for a downloadable Agent Skill.

### Design Philosophy
- **Apple-like quality**: Executive-grade, 10/10 visual polish - extended in v5.2 with a desktop-native shell (sticky top bar + optional right rail + global Command Palette via Cmd/Ctrl+K)
- **Voice-first**: Talk naturally, structure extracted automatically
- **Mobile-first**: No-scroll experience on key authed surfaces, with a parallel desktop shell that is no longer stretched mobile markup
- **Light mode**: Warm off-white backgrounds, deep ink text, pure white cards

### Verified Repo Counts
| Item | Count |
|---|---|
| Supabase edge functions | 74 |
| React custom hooks | 51 |
| PostgreSQL migrations applied | 98 |
| Top-level page components | 25 |
| E2E specs (Playwright) | 6 |
| Unit/shared specs (Vitest) | 5 |
| Active routes | 11 (+ 5 legacy redirects to `/dashboard`) |
| Audit-week tracks shipped | 6 |

### Tech Stack
- **Frontend**: React 18.3.1, React Router 6.26.2, Vite 5.4, TypeScript 5.5, Framer Motion 12, TanStack React Query 5.56, Tailwind CSS, shadcn/ui (Radix UI), Zod
- **Backend**: Supabase (PostgreSQL + 74 Edge Functions, Deno runtime)
- **AI Primary**: Vertex AI (Gemini 2.0 Flash) via Google Cloud service account
- **AI Fallback**: OpenAI GPT-4o
- **Voice**: OpenAI Whisper
- **Embeddings**: OpenAI `text-embedding-3-small` (1536-dim, pgvector)
- **Audio**: ElevenLabs
- **Auth**: Supabase Auth (Email + Google OAuth)
- **Payments**: Stripe (signature-verified, idempotent)
- **Email**: Resend
- **Hosting**: Vercel (frontend), Supabase Cloud (backend)
- **DB extensions**: pgvector, pgcrypto, pg_cron
- **Node.js**: `>=22 <24`

### Core Features
- **Memory Web**: Voice-first context extraction with encrypted storage (default dashboard view); AES-256-GCM at rest
- **Edge**: Leadership amplifier - strengths sharpened, weaknesses covered with AI artifacts (Edge Pro $29/month)
- **Daily Briefing v2**: Evidence-based personalised intelligence with auditable anchoring. Seven-stage pipeline (lens → planner → fan-out → dedupe + scoring → curation → script → audio). Every segment carries `lens_item_id`, `relevance_score`, `matched_profile_fact`. Four-part learning loop: Interests, industry-aware seed beats (11 industries), persistent semantic kills, nightly aggregator via pg_cron at 03:07 UTC.
- **Context Export**: One-click export to ChatGPT, Claude, Gemini, Cursor, Claude Code, raw markdown
- **Skill Builder (Agent Skill Builder)** - Edge Pro: Voice-to-Agent-Skill pipeline that turns a leader's repetitive workflow into an agentskills.io-compliant ZIP they can drop into `~/.claude/skills/`. Three Honest Tests triage routes inputs that are really Memory Facts, Custom Instructions, or Saved Styles back to the right surface. Quality gate enforces 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections, valid name format. Pain-anchored entry points: chip row of blockers + active decisions on Edge view (`AutomatePainCard`), zap button on Memory Web blocker cards, zap button on Briefing `decision_trigger` segments. Five archetypes: decision-framework, voice-lock, reporting-engine, tool-integration, getting-started.
- **Guided First Experience**: 3-question onboarding delivering export in 2 minutes
- **Pattern Detection**: 10X skills, blind spots, behavioral preferences
- **AI Tools**: Decision Advisor, Meeting Prep, Prompt Coach, Stream of Consciousness
- **Diagnostic Assessment**: 10-minute AI literacy diagnostic ($49 unlock)
- **Missions System**: First Moves commitment tracking with check-ins
- **Progress Tracking**: Snapshots and drift detection over time
- **Command Palette** (desktop): Cmd/Ctrl+K opens a global launcher across authenticated routes. Pages opt into actions via custom `mm:capture-voice` and `mm:generate-briefing` window events.

### Pricing (Current)
| SKU | Price | What |
|---|---|---|
| Free / Core | $0 | Memory Web, Context Export, basic Briefing, Decision Advisor, Meeting Prep, Prompt Coach |
| Full Diagnostic | $49 one-time | Full tensions/risks/scenarios + thinking tools |
| Deep Context Upgrade | $29 one-time | Enhanced company-context enrichment |
| Diagnostic + Deep Context Bundle | $69 one-time | Both above (saves $10) |
| Edge Pro | $29/month | Unlimited Edge artifacts + all 7 briefing types + email delivery |
| Mindmaker Bootcamp | $15K-$50K | 4-hour exec sprint |
| Mindmaker Portfolio | $5K-$25K | Portfolio assessment |

---

## Terminology Standards

- **Memory Web** - Living knowledge base of facts about the leader
- **AI Double / Digital Clone** - The exportable context that represents the leader
- **Context Export** - Formatted output for AI tools
- **Skill Builder / Agent Skill Builder** - The voice-to-Agent-Skill pipeline. The output is an "Agent Skill" or just "Skill". Never call it a "macro", "automation script", or "workflow template" in customer-facing copy.
- **Agent Skill** - A downloadable, agentskills.io-compliant skill bundle (`SKILL.md` + references + test prompts + install guide) the leader drops into `~/.claude/skills/`. Triggers automatically when the leader's language matches.
- **Three Honest Tests** - The triage gate inside `generate-skill-export`. Inputs that fail it get routed to the right surface (Memory Web fact, Custom Instruction, Saved Style) instead of producing a junk skill.
- **Pain-anchored entry point** - Any UI surface (Edge `AutomatePainCard`, Memory blocker zap, Briefing `decision_trigger` zap) that hands the leader's already-declared pain to the Skill Builder via a `SkillSeed` so generation is grounded in their actual language.
- **10X Skills** - Strengths identified for amplification. Not to be confused with Agent Skills.
- **Blind Spots** - Gaps or risks surfaced by pattern detection
- **Diagnostic** - The assessment process (never "quiz" or "test")
- **Tensions** - Strategic gaps between current and desired state
- **Risk Signals** - Blind spots, waste, or theatre indicators
- **Thinking Tools** - Mental models and prompts (not "prompt library")
- **First Moves** - Prioritized next steps from diagnostic
- **Missions** - Active commitment to a First Move with check-in tracking
- **Memory Facts** - Individual verified data points in the Memory Web
- **Temperature** - Memory fact recency/relevance (hot/warm/cold)
- **Anchored to** - The exact phrase shown on every Briefing v2 segment, naming the profile fact that earned its slot
- **Auditable Relevance** - The product property: every recommendation can be traced to a specific profile fact
- **Zero-Context Tax** - The pain CTRL eliminates: re-explaining yourself to AI tools every session
- **Command Palette** - Desktop-only Cmd/Ctrl+K launcher (`CommandPaletteProvider`)

---

## Version Control

| Field | Value |
|-------|-------|
| Documentation last updated | 2026-05-13 |
| Current product version | v5.2 (Skill Builder + desktop UI redesign, on the v5.1 audit-hardened base) |
| Architecture version | Unified dashboard (Memory Web + Edge + Daily Briefing v2 + Skill Builder) with desktop-native shell |
| Design system version | v3.1 (Light mode, Apple-like, with desktop-native sidebar + sticky top bar + right rail + Command Palette) |
| AI primary model | Vertex AI (Gemini 2.0 Flash) |
| AI fallback model | OpenAI GPT-4o |
| Embedding model | OpenAI text-embedding-3-small (1536-dim, pgvector) |
| Edge functions | 74 |
| Database migrations | 98 |
| Database extensions | pgvector, pgcrypto, pg_cron |
| Active routes | 11 (+ legacy redirects) |
| Custom hooks | 51 |
| E2E specs / Vitest specs | 6 / 5 |
| Node.js requirement | >=22 <24 |
| Audit-week tracks shipped | 6 (revenue path, data path, UX, reliability, observability, cleanup) |
