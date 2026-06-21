# CTRL Project Documentation

**Master Index**

This folder is the canonical source of truth for the CTRL portable AI context platform. Everything else at the repo root has been removed in the 2026-04-26 docs refresh - if it's not in this folder or in the root `README.md` / `CLAUDE.md` / `CHANGELOG.md`, it was historical noise.

**Last Updated:** 2026-06-21
**Current Version:** Main App Polish / AI-Native Enforcement (PRs #214-221, prod-verified 2026-06-19/21) + Kit Email Branding (PR #213) + Kit Redesign sequential one-action-per-screen wizard (PRs #206-212, prod-verified 2026-06-19: `/kit/pdf` hero PDF, `KitRevealWizard`, `KitBuildTrace`, `KitWhatsInside` two-buttons-only, `kitPrimitives`). This sits on top of the Skill Builder intake + harness upgrade (PR #204, 2026-06-17): free-for-now builder, no-fabricated-samples voice profile + required learning-loop, unified `ctrl_voice_profile` / `extract-voice-profile`, voice-aware Automator + desktop two-pane, layered library + MCP + download output. Below that: the Home / Decision-Map / Automator UX redesign (PRs #197-200, prod-verified 2026-06-17), the dark `ctrl-ds` palette globally forced dark + emerald `ctrl.` wordmark / brand lockup (PR #186, merge 1c01db5, 2026-06-16, prod-verified), the Brain engine (PRs #153-164, "limits" phases #187-189), and the 4-Kit Program (PRs #190-193 + #206-212). Succeeds the v5.4 DesktopShell unification + Goals + Enrich loop, the v5.3 Decision Engine, and the v5.2 Skill Builder.

---

## Documentation Structure

### Sales & Outbound (start here for sales/marketing AI agents)
- [SALES_BRIEF.md](./SALES_BRIEF.md) - Outbound brief with email angles, objection handling, pricing, ICP fit signals
- [Master_Messaging_and_FAQ.md](./Master_Messaging_and_FAQ.md) - Founder narrative, enterprise pitch, master FAQ
- [AGENT_BRIEFING.md](./AGENT_BRIEFING.md) - One-read briefing for Mindmaker OS fleet agents to sell, market, and represent CTRL with zero extra context

### Strategic Foundation
- [CTRL-CORPUS.md](./CTRL-CORPUS.md) - The opinionated single source of truth for what CTRL must be (the clarity-engine destination, above the build)
- [CTRL-BUILD-ROADMAP.md](./CTRL-BUILD-ROADMAP.md) - The route to the Corpus; value-and-proof-sequenced build plan (clean-room frontend rebuild on the existing Supabase backend, learn-loop first)
- [PURPOSE.md](./PURPOSE.md) - Core mission and problem statement
- [ICP.md](./ICP.md) - Ideal customer profile + anti-ICP + buying triggers + pricing anchors
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
- [HISTORY.md](./HISTORY.md) - Phases 1-19. Includes the April 2026 audit hardening track record, the Brain engine, the Kit Program (Phases 11+14), the forced-dark redesign (Phase 12, PR #186), the Skill Builder intake + harness upgrade (Phase 16, PR #204), the Kit Redesign sequential wizard (Phase 17, PRs #206-212), Kit Email Branding (Phase 18, PR #213), and Main App Polish / AI-Native Enforcement (Phase 19, PRs #214-221).
- [COMMON_ISSUES.md](./COMMON_ISSUES.md) - Recurring bugs, architectural pain points, audit-aftermath notes
- [DECISIONS_LOG.md](./DECISIONS_LOG.md) - 58 architectural and product decisions with rationale and outcomes
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
4. [HISTORY.md](./HISTORY.md) - Phases 1-19, including the Phase 7 audit details, the Brain engine, the Kit Program, the Phase 12 forced-dark redesign, the Phase 16 Skill Builder intake + harness upgrade, the Phase 17 Kit Redesign sequential wizard, Phase 18 Kit Email Branding, and Phase 19 Main App Polish / AI-Native Enforcement
5. [DECISIONS_LOG.md](./DECISIONS_LOG.md) - 58 decisions with trade-offs
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

## Current State (post-redesign - updated 2026-06-17)

### Product Positioning
- **Tagline**: "Clarity for Leaders"
- **Core Value**: Decision speed for leaders. Portable AI context that makes every AI tool personalised, an evidence-based daily briefing anchored to real priorities, and a Skill Builder that turns repetitive leader workflows into agentskills.io-compliant Claude Skills.
- **Time to Value**: 2 minutes to first export. 3 minutes a day for the Briefing. One voice description (~2-5 minutes) for a downloadable Agent Skill.

### Design Philosophy
- **Apple-like quality**: Executive-grade, 10/10 visual polish - extended in v5.2 with a desktop-native shell (sticky top bar + optional right rail + global Command Palette via Cmd/Ctrl+K)
- **Voice-first**: Talk naturally, structure extracted automatically
- **Mobile-first**: No-scroll experience on key authed surfaces, with a parallel desktop shell that is no longer stretched mobile markup
- **Forced dark, instrument cockpit**: Globally forced dark (`index.html` carries `class="dark"`), the `ctrl-ds` instrument palette, emerald `#00D9B6` primary (`--primary 171 100% 43%`), and the emerald `ctrl.` wordmark in place of the old green Mindmaker logo. Shipped live in PR #186 (merge 1c01db5, 2026-06-16, prod-verified with screenshots). This is NOT light mode, NOT warm off-white, NOT white cards, NOT the green logo. Honest residual green still lives in `index.html` OG / theme-color meta, the `tokens.css` `--mint` alias, and the EdgeOnboarding / SampleResultsDialog surfaces.

### Repo Counts (edge functions re-counted 2026-06-21; others as of 2026-06-09 pending re-count)

Edge functions were re-counted 2026-06-21: 93 functions confirmed. Other counts are lower bounds from 2026-06-09 and predate Phases 12-19.

| Item | Count |
|---|---|
| Supabase edge functions | 93 (re-counted 2026-06-21) |
| React custom hooks | 59+ (lower bound, as of 2026-06-09; added since: `useKitRedemption`, `useKitBuild`, `useKitArtifacts`) |
| PostgreSQL migrations applied | 110+ (lower bound, as of 2026-06-09; added since: `20260615*_brain_*`, `20260616120000_memory_edges`) |
| Top-level page components | 29+ (added: `KitPdf.tsx`, `DecisionMap.tsx`) |
| E2E specs (Playwright) | 7 |
| Unit/shared specs (Vitest) | 6 |
| Active routes | 16+ (+ 5 legacy redirects); `/kit/pdf` added Phase 17 |
| Audit-week tracks shipped | 6 |

### Tech Stack
- **Frontend**: React 18.3.1, React Router 6.26.2, Vite 5.4, TypeScript 5.5, Framer Motion 12, TanStack React Query 5.56, Tailwind CSS, shadcn/ui (Radix UI), Zod
- **Backend**: Supabase (PostgreSQL + 80 Edge Functions, Deno runtime)
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
- **Skill Builder (Agent Skill Builder)** - **free for now since PR #204** (the Edge Pro gate on `generate-skill-export` was removed; any authenticated user, including anonymous kit sessions, can build skills): turns a leader's recurring deliverable into an agentskills.io-compliant Agent Skill ZIP they can drop into `~/.claude/skills/`. As of 2026-06-17 (PR #199, merge 24f7d15) the `/context` UI is the **Automator deliverable flow**: Suggestions (concrete recurring deliverables mined from the brain - blockers + decisions - with a "why we picked this" + a warm "your peers are using this" framing grounded in role + company, never a fabricated cohort count or a vague "Hiring Challenge"; optional "Add your company site" enrich) -> a recognition pick-cascade (reuses the kit engine; the voice step shows real samples to pick) -> Skill ready (Run it now downloads the skill, Export as markdown, "Your skills" library peek). PR #204 tightened the `generate-skill-export` pipeline (no longer untouched): boundedness check, FOUR Honest Tests (Test 4 = voice-lock), a self-identified VOICE_PROFILE injected, fabricated voice samples forbidden, a structured 8-dimension `voice-profile.md`, a required `## Learning loop` section (quality gate now 16/16). Triage still routes inputs that are really Memory Facts, Custom Instructions, or Saved Styles back to the right surface; five archetypes (decision-framework, voice-lock, reporting-engine, tool-integration, getting-started). A unified `ctrl_voice_profile` (one `user_memory` fact) is captured by `VoiceStyleProfileSheet` (5 recognition picks OR a paste-extract power path via the new `extract-voice-profile` edge fn), surfaced into skills by `_shared/memory-context-builder.ts`, and the Automator tone step is voice-aware with a desktop two-pane (`AutomatorScaffold`). Output is layered: library + a live MCP pull (`mcp-context` `list_skills` / `get_skill`, Edge-Pro gated) + per-item download. Pain-anchored entry points still seed it (now shown to everyone, no `isPaidUser` branching): `AutomatePainCard` on Edge view, zap on Memory blocker cards, zap on Briefing `decision_trigger` segments. (The old `SkillCaptureSheet` / `SkillPreviewSheet` are now dead code.)
- **Guided First Experience**: 3-question onboarding delivering export in 2 minutes
- **Pattern Detection**: 10X skills, blind spots, behavioral preferences
- **AI Tools**: Decision Advisor, Meeting Prep, Prompt Coach, Stream of Consciousness
- **Diagnostic Assessment**: 10-minute AI literacy diagnostic ($49 unlock)
- **Missions System**: First Moves commitment tracking with check-ins
- **Progress Tracking**: Snapshots and drift detection over time
- **Decision Engine** (`/decision`): Verification-looped pressure-testing for a decision or business case. A statement is decomposed → verified (web-grounded claims) → cross-examined → advised, running in the background via `EdgeRuntime.waitUntil` while the frontend polls `decision_cases` per `stage` (mirrors the briefing streaming pattern). An hourly pg_cron WATCH loop (`decision-watch`) re-verifies load-bearing claims and raises idempotent `decision_alerts` surfaced in the Daily Briefing, so a decision is a living object rather than a one-shot answer.
- **Goals** (`/goals`): Horizon-grouped goal tracking (active / paused / done) sourced from voice, diagnostic, and decisions.
- **Enrich loop** (`/enrich`): Inbound "borrow your own AI" loop - copy one prompt, run it in ChatGPT or Claude, paste the answer back, and CTRL learns in two minutes what would take weeks to tell it.
- **Command Palette** (desktop): Cmd/Ctrl+K opens a global launcher across authenticated routes. Pages opt into actions via custom `mm:capture-voice` and `mm:generate-briefing` window events.
- **Unified desktop shell**: Every authenticated surface wears the same `DesktopShell` (sidebar + sticky top bar + optional right rail), viewport-pinned so the window never scrolls; phones fall back to the mobile header + bottom nav.
- **Brain engine** (PRs #153-164, "limits" phases #187-189): a fact-to-fact edge graph over the Memory Web with evidence tiers, track-record depth, and reliable reaction numbers, surfaced as the four-world rope canvas in the redesign. Migrations `20260615*_brain_*` + `20260616120000_memory_edges`. Honest gaps: the canvas Strengthen/Fix actions are UI-disabled (no backend RPC wired yet); brain edges are derived-not-stored; number-heroes fall back to words-led when current data is thin.
- **Kit Program** (`/kit`): the lesson-kit engine. Four kits, each forkable with a pick-cascade and a live picks-board, including the Agentic Org Chart kit (PRs #190/#191) and a parity retrofit of the three prior kits (PR #192). PR #193 (merge 090dda2, 2026-06-17) fixed a latent bug where the forked-kit intake silently dropped the back half of every cascade (guardrails/grind/involves/maturity were never captured) and added an honesty floor so a box touching a flagged guardrail can never be left agent-led. Pre-#193 `kit_builds.intake` rows are TRUNCATED and untrustworthy.
- **Redesigned surfaces** (PR #186, merge 1c01db5, 2026-06-16, prod-verified): forced-dark `ctrl-ds` instrument palette + emerald `ctrl.` wordmark, with a rebuilt mobile cockpit, decision spine, StoneRead reader, brain four-world rope canvas, capture flow, and onboarding.
- **Home / Decision-Map / Automator UX redesign** (PRs #197-200, prod-verified 2026-06-17): the latest layer on top of PR #186. Home (behind `VITE_COCKPIT_ENABLED`, PR #197 merge 7b5f0ef) dropped the cryptic "strongest signal" hero and the wall of AI-bets (bets moved to the Decisions case-picker) for a plain time-aware greeting, the swipeable "worth a look" deck (broad AI news from the briefing pipeline mixed with the leader's own `decision_alerts`; heart = more-like-this, skip = dismiss), and 3 value actions (Play my briefing, Run a decision, Build a skill). The Decision Map (PR #198 merge 33fb818) became one pinned decision with a descriptive "where it stands" status (never a recommendation) + a "Change" affordance, considerations on a connector rail, evidence one tap deeper, and a quiet "Flag it" replacing the long-press "something wrong?" scroll-popup. The Automator (PR #199 merge 24f7d15) is the new `/context` flow (see Skill Builder above). Follow-ups (PR #200 merge 387af84) added desktop brand-lockup placements and made the deck like/dislike persist and train the feed (stored in the feedback table, no new migration). Honest residuals: old `SkillCaptureSheet` / `SkillPreviewSheet` are dead code; "Run it now" downloads the skill (no in-app runner yet); the deck's news half needs a briefing to exist (else a calm caught-up state).

### Pricing (Current - authoritative source: `docs/PRICING.md`)
| SKU | Price | What |
|---|---|---|
| Free / Core | $0 | Memory Web, Context Export, Voice Profile, Kit program, Automator skill builds + exports, Guided First Experience, basic Decision Advisor + Meeting Prep + Prompt Coach |
| Full Diagnostic | $49 one-time | Full tensions/risks/scenarios + thinking tools |
| Deep Context Upgrade | $29 one-time | Enhanced company-context enrichment |
| Diagnostic + Deep Context Bundle | $69 one-time | Both above (saves $10) |
| Edge Pro | $29/month | Daily personalised briefing (all 7 types), Edge artifacts (board memos, strategy docs, emails, meeting agendas), email delivery, live MCP skills pull, Decision Engine (verify + cross-examine + watch) |
| Mindmaker Bootcamp | $15K-$50K | 4-hour exec sprint |
| Mindmaker Portfolio | $5K-$25K | Portfolio assessment |

---

## Terminology Standards

- **Memory Web** - Living knowledge base of facts about the leader
- **AI Double / Digital Clone** - The exportable context that represents the leader
- **Context Export** - Formatted output for AI tools
- **Skill Builder / Agent Skill Builder** - The voice-to-Agent-Skill pipeline. The output is an "Agent Skill" or just "Skill". Never call it a "macro", "automation script", or "workflow template" in customer-facing copy.
- **Agent Skill** - A downloadable, agentskills.io-compliant skill bundle (`SKILL.md` + references + test prompts + install guide) the leader drops into `~/.claude/skills/`. Triggers automatically when the leader's language matches.
- **Four Honest Tests** - The triage gate inside `generate-skill-export` (four tests since PR #204: Test 4 = voice-lock / consistent creative output). Inputs that fail get routed to the right surface (Memory Web fact, Custom Instruction, Saved Style, or voice-lock preference) instead of producing a junk skill.
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
| Documentation last updated | 2026-06-21 |
| Current product version | Main App Polish / AI-Native Enforcement (PRs #214-221, prod-verified 2026-06-19/21) + Kit Email Branding (PR #213) + Kit Redesign sequential wizard (PRs #206-212, prod-verified 2026-06-19) on top of the Skill Builder intake + harness upgrade (PR #204, prod-deployed 2026-06-17: free-for-now, Four Honest Tests, unified voice profile, layered output) + Home/Decision-Map/Automator UX redesign (PRs #197-200) + forced-dark instrument cockpit (PR #186, 2026-06-16) |
| Architecture version | Unified dashboard (Memory Web + Edge + Daily Briefing v2 + Skill Builder/Automator + Decision Engine + Brain engine + Kit Program) with a swipeable cockpit Home deck (`VITE_COCKPIT_ENABLED`), a single-pinned-decision Decision Map, desktop-native shell on every authenticated surface, and AI-native enforcement across all surfaces |
| Design system version | Forced dark, `ctrl-ds` instrument palette (emerald #00D9B6 primary, emerald `ctrl.` wordmark and Mindmaker icon `BrandLockup`), Apple-like, with desktop-native sidebar + sticky top bar + right rail + Command Palette + viewport-pinned zero-scroll |
| AI primary model | Vertex AI (Gemini 2.0 Flash) |
| AI fallback model | OpenAI GPT-4o |
| Embedding model | OpenAI text-embedding-3-small (1536-dim, pgvector) |
| Edge functions | 93 (re-counted 2026-06-21) |
| Database migrations | 110+ (lower bound as of 2026-06-09; added since: `20260615*_brain_*`, `20260616120000_memory_edges`) |
| Database extensions | pgvector, pgcrypto, pg_cron |
| Active routes | 16+ (+ 5 legacy redirects); `/kit/pdf` added Phase 17 |
| Custom hooks | 59+ (lower bound as of 2026-06-09; added since: `useKitRedemption`, `useKitBuild`, `useKitArtifacts`) |
| E2E specs / Vitest specs | 7 / 6 |
| Node.js requirement | >=22 <24 |
| Audit-week tracks shipped | 6 (revenue path, data path, UX, reliability, observability, cleanup) |
| Phases documented | 1-19 |
