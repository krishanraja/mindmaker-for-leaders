# CTRL Project Documentation

**Master Index**

This folder is the deeper source of truth for CTRL. The two highest-authority documents in the whole repo are the canonical product/build specs in `docs/`, and the top-level `README.md`. Where any file in this folder disagrees with them, the spec and the root README win.

**Last reconciled:** 2026-07-19 (routine reconciliation pass). Every file in this folder was checked against the live code on this date; see each file's own "Last reconciled" line for its specific disposition.

---

## Read this first: the current product, in one paragraph

CTRL is the tool for leaders building, orchestrating, productizing, and getting to market **the AI-native version of their business.** It is NOT a general business advisor, and not a generic "clarity for leaders" product. Every decision, headline, and nudge pulls toward one question: how do you make your business more AI-native, here? When a leader brings a general-business call ("should I hire a VP of Sales?"), CTRL reframes it into its AI-native version ("before you hire, should an agent own part of that motion first, and what does the human role become?") and works it from there. It is globally dark, instrument-grade (the `ctrl-ds` palette, emerald `#00D9B6`, the `BrandLockup`). It is mobile-first and no-scroll: every key surface fits the viewport with one clear action per screen. Production: **ctrl.themindmaker.ai**.

The product has two halves:
1. **The lesson kits** (`/kit`): four guided build-it-with-you kits a leader walks after a Mindmaker lightning lesson. Vibe Coding = a solution, Autonomous Business = a process, Agentic Org Chart = the company, Memory & Identity = the person.
2. **The main app** (the daily instrument): the news deck, the decision engine, the Brain/Memory Web, the daily briefing, the context export + Automator, compliance.

### The canonical sources (trust these over everything else)

| Source | What it is | Authority |
|---|---|---|
| [`docs/KIT-REDESIGN-SPEC.md`](../docs/KIT-REDESIGN-SPEC.md) | The lesson-kit program, locked | Canonical |
| [`docs/MAIN-APP-POLISH-SPEC.md`](../docs/MAIN-APP-POLISH-SPEC.md) | The main-app standard (North Star, decision model, news categories, the no-scroll/one-ask laws, approachable language) | Canonical |
| [root `README.md`](../README.md) | Current truth, tone + facts | Canonical |
| [root `CLAUDE.md`](../CLAUDE.md) | Workflow + the live architecture quick-reference (kept current; trust its counts over this folder) | Canonical |
| `src/router.tsx` | The live route table | Code is truth |
| `src/constants/billing.ts` + `supabase/functions/_shared/edge-pricing.ts` | The live Edge Pro price | Code is truth |

> Reconciliation note (2026-06-21): the sales/positioning docs in this folder were written for an earlier positioning ("clarity for leaders", "portable AI double", "the zero-context tax", a light/Apple-quality look). They have been reconciled to the AI-native positioning and the globally-dark visual where the facts are settled, and any AI-native ICP/messaging/go-to-market detail that is NOT yet decided is flagged `TODO(founder)` rather than invented. Read them through the AI-native lens above. The product mechanics they describe (Memory Web, Briefing, the Automator/Skill Builder, the Decision Engine, the Kits) are real and still in the code; it is the FRAMING that moved to AI-native.

---

## Documentation Structure

### For sales, marketing, and ops AI agents (start here)
1. [AGENT_BRIEFING.md](./AGENT_BRIEFING.md) - the one-read briefing: positioning, ICP, value prop, messaging, outcomes, guardrails
2. [SALES_BRIEF.md](./SALES_BRIEF.md) - outbound brief (angles, objections, pricing, fit signals)
3. [ICP.md](./ICP.md) - who to target, who not to
4. [VALUE_PROP.md](./VALUE_PROP.md) - per-audience value props
5. [OUTCOMES.md](./OUTCOMES.md) - stage-by-stage outcomes
6. [Master_Messaging_and_FAQ.md](./Master_Messaging_and_FAQ.md) - founder narrative + master FAQ
7. [BRANDING.md](./BRANDING.md) - voice, tone, vocabulary

### For developers (start here)
1. [root `CLAUDE.md`](../CLAUDE.md) - workflow + the current architecture quick-reference
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - system architecture, data flow, edge functions
3. [FEATURES.md](./FEATURES.md) - feature inventory
4. [COMMON_ISSUES.md](./COMMON_ISSUES.md) - recurring bugs and pain points
5. Design tokens: the live dark `ctrl-ds` tokens are in the code (`src/styles/tokens.css`, `index.css`) and the cross-app contract is in [SPINE.md](./SPINE.md). (The old light [DESIGN_SYSTEM.md](./_archive/DESIGN_SYSTEM.md) is archived.)
6. [REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md) - rebuild instructions
7. [DECISIONS_LOG.md](./DECISIONS_LOG.md) - architectural + product decisions
8. [MASTER_INSTRUCTIONS.md](./MASTER_INSTRUCTIONS.md) - engineering principles + AI behavior

### Strategic foundation
- [PURPOSE.md](./PURPOSE.md) - mission + problem statement
- [SPINE.md](./SPINE.md) - the cross-app MindmakerOS standards spine (CTRL is the reference implementation)
- [CTRL-CORPUS.md](./CTRL-CORPUS.md) - the opinionated single source of truth for what CTRL must be
- [CTRL-BUILD-ROADMAP.md](./CTRL-BUILD-ROADMAP.md) - the build plan toward the Corpus (a dated historical build record; read its reconciliation banner before trusting any "outstanding" item)
- [NORTH_STAR.md](./NORTH_STAR.md) - the founder-signed moat metric (the "flywheel": a real brain + a recent decision weigh)

### Compliance
- [compliance/README.md](./compliance/README.md) - the compliance pack index (privacy policy, ROPA, subprocessor register, DSAR runbook, retention policy, incident response, information security policy, SOC 2/ISO 27001 roadmap, control matrix)

### History (kept for the record)
- [HISTORY.md](./HISTORY.md) - the build phases
- [DECISIONS_LOG.md](./DECISIONS_LOG.md) - architectural + product decisions (also linked under Developers below)
- See also [`_archive/`](./_archive/) for superseded docs kept for history

---

## Quick Start for Sales / Marketing AI Agents

1. Read [AGENT_BRIEFING.md](./AGENT_BRIEFING.md) - positioning, ICP, value prop, messaging, outcomes, guardrails in one place
2. Read [SALES_BRIEF.md](./SALES_BRIEF.md), [ICP.md](./ICP.md), [VALUE_PROP.md](./VALUE_PROP.md), [OUTCOMES.md](./OUTCOMES.md)
3. Reference [BRANDING.md](./BRANDING.md) and [Master_Messaging_and_FAQ.md](./Master_Messaging_and_FAQ.md)

Lead with the AI-native positioning. Where a doc still carries an old "decision speed / portable double" hook, prefer the AI-native frame from the canonical sources above.

## Quick Start for Developers

1. [root `CLAUDE.md`](../CLAUDE.md) - workflow + live architecture
2. [ARCHITECTURE.md](./ARCHITECTURE.md), [FEATURES.md](./FEATURES.md), [COMMON_ISSUES.md](./COMMON_ISSUES.md)
3. Design tokens: the live dark `ctrl-ds` tokens are in the code (`src/styles/tokens.css`, `index.css`) + the cross-app contract in [SPINE.md](./SPINE.md) (the old light [DESIGN_SYSTEM.md](./_archive/DESIGN_SYSTEM.md) is archived)
4. [REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md) to set up a new instance

---

## Current State (reconciled 2026-07-19)

### Product Positioning (LOCKED)
- **What CTRL is**: the tool for building, orchestrating, productizing, and getting to market the AI-native version of your business.
- **The reframe rule**: general-business inputs are never refused and never answered as-is; they are reframed into the AI-native version of the decision (see `docs/MAIN-APP-POLISH-SPEC.md` section 0).
- **Tagline**: "Build the AI-native version of your business." (The old "Clarity for Leaders" is retired.) TODO(founder): confirm the final public tagline.

### Design Philosophy
- **Globally dark, instrument-grade**: the `ctrl-ds` palette, emerald `#00D9B6` primary (`--primary 171 100% 43%`), the `BrandLockup` (Mindmaker icon + `ctrl-logo` wordmark). This is NOT light mode, NOT "warm off-white", NOT white cards. `index.html` carries `class="dark"`.
- **No-scroll, one ask per screen** on every device.
- **Voice-first** where it fits; **honest in the renderer** (the quiet/empty state is intentional, never faked; confidence tracks evidence).
- **Approachable, first-timer language**. No insider jargon presented cold. No em dashes.

### The two halves
- **Lesson kits** (`/kit`): four kits (Vibe Coding / Autonomous Business / Agentic Org Chart / Memory & Identity). Each is strictly sequential (one action per screen), no-scroll on mobile, a native two-pane on desktop with a live "your kit is taking shape" panel, an honest build trace, a reveal wizard, and one branded personalized hero PDF. Canonical: `docs/KIT-REDESIGN-SPEC.md`.
- **Main app**: every authed surface is no-scroll on all devices + one ask per screen + AI-native. The news deck uses nine AI-native category motifs with an AI-native-filtered/tagged briefing pipeline. The decision engine reframes to the AI-native lens. The Brain/Memory Web is a four-world rope canvas that fills the frame with zoom. Canonical: `docs/MAIN-APP-POLISH-SPEC.md`.

### Active routes (source of truth: `src/router.tsx`)

Public: `/`, `/auth`, `/auth/callback`, `/booking`, `/build`, `/kit` (+ `/kit/me`, `/kit/me/intake`, `/kit/reading/:pageId`, `/kit/pdf[/:redemptionId]`), `/try`, `/agents`, `/preview` (dev/QC fixture harness, unlinked), `/download` (feature-flagged public email-capture landing for the CTRL starter kit, `FF.publicCapture`, PR #333, 2026-07-07), `/upgrade` (the interactive pricing page with the live Stripe subscribe button, PR #331, 2026-07-04).

`/pricing` is **not** a React route: `vercel.json` rewrites it to a static `public/pricing.html` SEO/crawler page (same $49 two-tier positioning, no subscribe button). Send anyone who needs to actually check out to `/upgrade`, not `/pricing`.

Authenticated (all wear the `DesktopShell`): `/dashboard`, `/memory`, `/context`, `/briefing`, `/decision`, `/goals`, `/track-record`, `/decision-map`, `/enrich`, `/settings`, `/compliance`, `/profile`.

Legacy redirects: `/today` `/pulse` `/voice` `/diagnostic` -> `/dashboard`; `/think` -> `/dashboard?view=edge`.

### Repo counts
Verified by direct count on 2026-07-19: **104 Supabase edge functions**, **78 custom hooks** in `src/hooks/`, **148 PostgreSQL migrations**. These will drift again as soon as the next PR lands; trust a fresh count (or `CLAUDE.md`, when it's current) over this line.

### Tech Stack
React 18 + TypeScript 5.5 + Vite 5.4 + Framer Motion; React Router 6 (`createBrowserRouter`, lazy); Tailwind + shadcn/ui (Radix), globally dark; React Context + TanStack Query; Supabase (PostgreSQL + Edge Functions, Deno); Vertex AI (Gemini 2.0 Flash) primary, OpenAI GPT-4o fallback; OpenAI Whisper / ElevenLabs; OpenAI `text-embedding-3-small` (pgvector); Supabase Auth / Stripe / Resend; PostHog product analytics (client-side, shipped on a feature branch 2026-07-18, not yet merged to `main`); Vitest + Playwright; Vercel + Supabase Cloud; Node `>=22 <24`. DB extensions: pgvector, pgcrypto, pg_cron.

### Pricing
The only firmly-grounded price is **Edge Pro**, a monthly subscription whose amount is canonical in `supabase/functions/_shared/edge-pricing.ts` (`EDGE_PRO_UNIT_AMOUNT_CENTS = 4900`, i.e. `$49/mo`) and surfaced via `src/constants/billing.ts`. Edge Pro is the decision tier (unlimited decision weighs + cross-examination + decision watch + Edge artifacts + the live MCP pull of your skills); the daily briefing, the Automator, Memory, and Voice are free. The app reads the code, so trust the code over any doc. The price itself hasn't moved since the last reconciliation, but the **surface** has (2026-07-04, PR #331): `/pricing` is now a static SEO page with no checkout, and the live subscribe flow moved to `/upgrade` (see Routes above). There is also a paid AI-literacy diagnostic and a deep-context upgrade still wired in the Stripe edge functions (`create-diagnostic-payment`: Full Diagnostic $49, Deep Context $29, Bundle $69). TODO(founder): confirm whether those one-time diagnostic SKUs survive the AI-native repositioning, and the full price list, before any sales doc quotes exact numbers.

### North Star
A founder-signed "flywheel" moat metric shipped 2026-07-04: leaders who hold a real brain (5+ current `user_memory` facts) AND weighed a decision in the last 7 days. Instrumented in migration `20260704120000_north_star_flywheel.sql` (a live view, a daily-snapshot table, and a daily pg_cron job). Full detail: [NORTH_STAR.md](./NORTH_STAR.md).

---

## Terminology (reconciled)

- **AI-native version of your business** - the thing CTRL helps you build; the lens above every surface.
- **The reframe** - turning a general-business input into its AI-native version (never refuse, never stay general).
- **The kits** - the four `/kit` lesson kits (Vibe Coding / Autonomous Business / Agentic Org Chart / Memory & Identity).
- **The autonomy line** (Agentic Org Chart) - green (AI runs it) / amber (AI assists, you approve the handoff) / red (you only), plus the handoffs and a ranked place to start.
- **Memory Web / Brain** - the leader's context as a four-world rope canvas; the substrate that makes any AI know the business.
- **Automator / Skill Builder** - the `/context` flow that turns a recurring deliverable into an agentskills.io-compliant skill. Building skills is free for now (the Edge Pro gate was removed).
- **Decision engine** - pressure-tests a decision (decompose, verify against live evidence, cross-examine, advise) with an honest AI-native reframe.
- **Anchored to** - the phrase on every briefing segment naming the profile fact that earned its slot.
- **Honest renderer** - the empty/cold-start state is intentional and welcoming, never faked; confidence tracks evidence.
