# CTRL: Clarity for Leaders

> Think out loud. See what emerges.

CTRL helps leaders voice their thoughts and organizes them into a **Memory Web** (your portable context that makes every AI smarter), an **Edge** profile (your leadership strengths amplified, weaknesses covered), **Context Exports** that make every AI tool you use instantly personal, and a **Daily Briefing** anchored to your real priorities.

**Build your portable AI double in 2 minutes. Hear 3 minutes of audio every morning that's actually about your world. Every AI tool you use already knows your context, goals, and thinking style.**

---

## Documentation

The canonical source of truth lives in [`project-documentation/`](./project-documentation/README.md). Start there for everything: features, architecture, sales briefs, ICP, outcomes, decisions, and history.

For sales & marketing AI agents:
- [project-documentation/SALES_BRIEF.md](./project-documentation/SALES_BRIEF.md)
- [project-documentation/ICP.md](./project-documentation/ICP.md)
- [project-documentation/VALUE_PROP.md](./project-documentation/VALUE_PROP.md)
- [project-documentation/OUTCOMES.md](./project-documentation/OUTCOMES.md)
- [project-documentation/Master_Messaging_and_FAQ.md](./project-documentation/Master_Messaging_and_FAQ.md)

For developers:
- [project-documentation/ARCHITECTURE.md](./project-documentation/ARCHITECTURE.md)
- [project-documentation/FEATURES.md](./project-documentation/FEATURES.md)
- [project-documentation/HISTORY.md](./project-documentation/HISTORY.md)
- [project-documentation/DECISIONS_LOG.md](./project-documentation/DECISIONS_LOG.md)
- [project-documentation/COMMON_ISSUES.md](./project-documentation/COMMON_ISSUES.md)
- [CLAUDE.md](./CLAUDE.md) - workflow conventions for Claude Code / agentic edits
- [CHANGELOG.md](./CHANGELOG.md)

---

## The Problem

Every leader uses AI. But every AI conversation starts from zero. You re-explain who you are, what your company does, what you're working on, every single time. The advice stays generic. Decision speed suffers.

Plus the **noise tax** - newsletters and feeds serve everyone the same content. 30+ minutes a day for two useful insights at best.

CTRL eliminates both, permanently.

## How It Works

1. **Voice a thought** - 2 minutes, no typing
2. **It organizes itself** - Memory Web extracts and verifies structured facts
3. **Export anywhere** - ChatGPT, Claude, Gemini, Cursor, Claude Code, raw markdown
4. **Hear your world** - 3-minute audio Briefing every morning, every story anchored to a specific priority on your desk
5. **Every decision gets faster** - Edge artifacts, Decision Advisor, Meeting Prep already know your context

---

## Core Features

### Memory Web
Your thoughts, organized. A living map of what you know, what you want, and how you think. Facts are categorized, verified by you, and encrypted at rest (AES-256-GCM).

### Edge - Leadership Amplifier
Your strengths sharpened, your weaknesses covered. Edge synthesizes your Memory Web and assessment data into a leadership profile, then offers AI-powered capabilities:
- **Sharpen** strengths: Systemize, Teach, Lean Into
- **Cover** weaknesses: Board Memos, Strategy Docs, Emails, Meeting Agendas, Templates, Frameworks
- Interactive strength/weakness pills with feedback loops
- Intelligence gap detection with guided resolution
- Edge Pro ($29/month) for unlimited artifact generation + email delivery

### Daily Briefing v2 - Evidence-based intelligence
Three minutes of audio every morning, tuned to the one thing that matters: your world.

- Every segment is **anchored** to something specific in your profile (the card literally shows "Anchored to: <your active decision>")
- **Bookmark** any story → its anchor becomes a persistent beat
- **Ban** any topic → kills it semantically (embeddings-based, not keyword)
- **Settings → Interests** → declare beats, track people/companies, exclude topics
- Cold-start solved: 11 industries pre-seeded with relevant starter beats
- Seven briefing types: Daily Brief, Macro Trends, Vendor Landscape, Competitive Intel, Boardroom Prep, AI Model Landscape, Custom Voice
- Persistent learning: explicit Bans (-1.0 immediately) + nightly aggregator (-0.4 after 3+ thumbs-down on same signature)

### Context Export - Your Context, Everywhere
One click to export your context to **any** AI tool:
- **ChatGPT** - Custom instructions
- **Claude** - Conversation context
- **Gemini** - Formatted context
- **Cursor** - `.cursorrules` file
- **Claude Code** - `CLAUDE.md` file
- **Raw Markdown** - Use anywhere

Optimized for: General Advisor, Meeting Prep, Decision Support, Code Review, Email Drafting, Strategic Planning.

### Thinking Tools
- **Decision Advisor** - Think through a decision with full context
- **Meeting Prep** - Walk in prepared
- **Team Brief** - Draft instructions for your team
- **Stream of Consciousness** - Speak freely. It organizes itself.

### AI Literacy Diagnostic
10-minute assessment covering Strategic Vision, Experimentation Culture, Delegation & Automation, Data & Decision Quality, Team Capability, and Governance. Surfaces tensions, risk signals, and organizational scenarios. $49 to unlock the full report.

### Missions & Progress
Commit to action items from your diagnostic. Track progress through check-ins. Adaptive prompts adjust based on your momentum.

---

## Pricing

| SKU | Price | What |
|---|---|---|
| Free / Core | $0 | Memory Web, Context Export, basic Briefing, AI tools |
| Full Diagnostic | $49 one-time | Tensions, risks, scenarios, full thinking tools |
| Deep Context Upgrade | $29 one-time | Enhanced company-context enrichment |
| Diagnostic + Deep Context Bundle | $69 one-time | Both above (saves $10) |
| Edge Pro | $29/month | Unlimited Edge artifacts + 7 briefing types |

---

## Design Philosophy

- **Apple-like quality** - Executive-grade, 10/10 visual polish
- **Voice-first** - Talk naturally, structure handled
- **Mobile-first** - Immersive, no-scroll experience on every key page
- **Light mode** - Warm off-white backgrounds, deep ink text, pure white cards
- **Auditable relevance** - Every Briefing segment proves its relevance with a specific profile fact

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3.1, TypeScript 5.5, Vite 5.4, Framer Motion 12 |
| Routing | React Router 6.26.2 (lazy-loaded routes) |
| Styling | Tailwind CSS, shadcn/ui (Radix UI) |
| State | React Context, TanStack Query 5.56 |
| Backend | Supabase (PostgreSQL + 80 Edge Functions, Deno runtime) |
| AI Primary | Vertex AI (Gemini 2.0 Flash) via Google Cloud service account |
| AI Fallback | OpenAI GPT-4o |
| Voice | OpenAI Whisper |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim, pgvector) |
| Audio | ElevenLabs |
| Auth | Supabase Auth (Email + Google OAuth) |
| Payments | Stripe (signature-verified, idempotent) |
| Email | Resend |
| DB extensions | pgvector, pgcrypto, pg_cron |
| Tests | Vitest (unit + shared, 6 specs), Playwright (e2e, 7 specs) |
| Hosting | Vercel (frontend), Supabase Cloud (backend) |
| Node.js | `>=22 <24` |

### Verified counts (2026-06-09)
- 80 Supabase edge functions
- 59 React custom hooks
- 110 PostgreSQL migrations applied
- 29 top-level page components
- 15 active routes (+ 5 legacy redirects)
- 6 audit-week tracks shipped (revenue path, data path, UX, reliability, observability, cleanup)
- Phase 8 shipped: Agent Skill Builder (voice-to-Claude-Skill, Edge Pro) + world-class desktop UI redesign with Cmd/Ctrl+K Command Palette + pain-anchored Skill entry points
- Phase 9 shipped: Decision Engine (verification-looped pressure-testing: decompose → verify → cross-examine → advise, hourly WATCH re-verification) + flag-gated Briefing streaming + cross-tenant RLS hardening
- Phase 10 shipped: every authenticated surface unified onto `DesktopShell`, viewport-pinned zero-scroll desktop, Goals tracking (`/goals`), and the inbound Enrich loop (`/enrich`)

---

## Architecture (high level)

The app uses a **unified dashboard** architecture. The Dashboard page (`/dashboard`) is the primary hub, rendering either the Memory Web view (default) or the Edge view (`?view=edge`). Desktop uses a persistent sidebar; mobile uses a bottom navigation bar.

### Active Routes

| Route | Page | Auth |
|-------|------|------|
| `/` | Landing | No |
| `/auth` | Auth (Email + Google OAuth) | No |
| `/auth/callback` | OAuth redirect handler | No |
| `/booking` | Booking | No |
| `/build` | Build Lap (Agent Skill Builder full-page flow) | No |
| `/dashboard` | Dashboard hub (Memory Web view by default; `?view=edge` for Edge) | Yes |
| `/memory` | Memory Center | Yes |
| `/context` | Context Export | Yes |
| `/briefing` | Daily Briefing page | Yes |
| `/decision` | Decision Engine pressure-test (decompose → verify → cross-examine → advise) | Yes |
| `/goals` | Goals tracking (horizon-grouped goals + status) | Yes |
| `/enrich` | Inbound Enrich loop ("borrow your own AI": copy a prompt, paste the answer back) | Yes |
| `/settings` | Settings | Yes |
| `/compliance` | Compliance | Yes |
| `/profile` | Profile | Yes |

Legacy routes (`/today`, `/voice`, `/pulse`, `/diagnostic`) redirect to `/dashboard`; `/think` redirects to `/dashboard?view=edge`.

### Directory Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── auth/            # AuthProvider, RequireAuth
│   ├── landing/         # HeroSection, CtrlLogo, TrustIndicators
│   ├── dashboard/       # Dashboard hub
│   ├── memory-web/      # Memory Web views, sidebars, guided experience
│   ├── edge/            # EdgeView, profile card, paywall, pills, draft sheet
│   ├── voice/           # Voice capture
│   ├── memory/          # Memory management
│   ├── onboarding/      # Guided first experience
│   ├── missions/        # Missions tracking
│   ├── settings/        # Account, WorkContext, BriefingInterests, BriefingDirectives, EdgePro, Preferences, PrivacyData, Manifesto
│   ├── sharpen/         # Sharpen tool
│   ├── ai-chat/         # AI interaction
│   ├── diagnostic/      # Assessment components
│   └── ... (operator, progress, provocation, pulse, team-instructions, etc.)
├── hooks/               # 59 custom React hooks (incl. useSkillExport, useGoals, useDecisionEngine, useDecisionInbox)
├── pages/               # 29 page components (many are legacy redirects)
├── contexts/            # AppState, Assessment, Auth, Theme
├── types/               # TypeScript types
├── utils/               # Utilities
├── router.tsx           # React Router v6 with createBrowserRouter
└── integrations/        # External service clients (Supabase)

supabase/
├── functions/           # 80 edge functions (Deno runtime)
│   ├── _shared/         # logger, with-timeout, ai-cache, rate-limit, briefing-lens/scoring/curation, model-router, training-loader, etc.
│   ├── generate-briefing/        # Briefing v2 orchestrator
│   ├── synthesize-briefing/      # ElevenLabs MP3 synthesis
│   ├── briefing-diagnose/        # Read-only "why these stories?" endpoint
│   ├── briefing-kill-lens-item/  # Explicit Ban
│   ├── briefing-aggregate-feedback/  # Aggregator (HTTP entrypoint)
│   ├── infer-briefing-interests/
│   ├── nudge-briefing/
│   ├── ai-generate/              # Vertex primary, OpenAI fallback, static tertiary
│   ├── memory-crud/, memory-export/, memory-lifecycle/, memory-settings/, memory-synthesize/
│   ├── edge-generate/            # Edge artifact generation
│   ├── generate-skill-export/    # Agent Skill Builder pipeline (Edge Pro): triage gate -> LLM -> quality gate -> ZIP (Phase 8)
│   ├── deliver-edge-artifact/    # Email delivery (Pro)
│   ├── create-edge-subscription/, create-billing-portal-session/
│   ├── stripe-webhook/           # Signature-verified, idempotent
│   ├── voice-transcribe/         # Whisper
│   ├── decision-engine/, decision-eval/, decision-watch/  # Decision Engine pipeline + WATCH loop + eval harness (Phase 9)
│   ├── track-event/              # Unauthenticated attribution emit proxy (Phase 9)
│   └── ... (80 total)
├── migrations/          # 110 PostgreSQL migrations (incl. 20260602 decision_engine, 20260605 create_goals)
├── email-templates/     # Auth email templates
└── config.toml
```

---

## Production Hardening (April 2026 audit cycle)

The product survived a six-week audit-track program. Each week landed as its own PR with a clear thematic boundary:

| Week | Theme | What shipped |
|------|-------|--------------|
| 1 | Revenue path | Mandatory Stripe webhook signature verification + idempotency table; briefing rate limits |
| 2 | Data path | Closed assessment data leak; codified storage bucket; end-to-end account deletion |
| 3 | UX | Killed onboarding gate; voice permission recovery; killed surveillance copy; removed all "coming soon" placeholders |
| 4 | Reliability | `with-timeout` utility wrapping all external API calls (tested); audio failure UX; onboarding stall recovery |
| 5 | Observability | Structured edge-function JSON logger; CI gate against `console.log` regressions |
| 6 | Cleanup + e2e | P2 backlog; 6 e2e specs covering riskiest paths; AI response cache; lint cleanup |

E2E specs (Playwright) covering the highest-risk paths, in `src/__tests__/e2e/`:
- `auth-journeys.spec.ts`
- `briefing-journey.spec.ts`
- `briefing-rate-limits.spec.ts`
- `sparse-profile.spec.ts`
- `account-deletion.spec.ts`
- `stripe-webhook-idempotency.spec.ts`
- `desktop-zero-scroll.spec.ts` (Phase 10: proves the desktop shell never scrolls the window)

---

## Local Dev

```bash
# install
npm install

# dev server
npm run dev

# tests
npm run test           # vitest watch
npm run test:coverage  # vitest with coverage
npm run test:e2e       # playwright

# build
npm run build
```

Supabase deployment conventions live in [`CLAUDE.md`](./CLAUDE.md).

---

## Deployment

- **Frontend**: Auto-deploys to Vercel on push to main
- **Edge Functions**: Deployed via Supabase CLI (`supabase functions deploy <name>`)
- **Database**: Migrations applied via the Supabase Management API (see `CLAUDE.md` for the canonical PowerShell snippet)

---

## Production URL

`ctrl.themindmaker.ai`

Built by [Krish Raja](https://ctrl.themindmaker.ai). Deployed on [Vercel](https://vercel.com) and [Supabase](https://supabase.com).
