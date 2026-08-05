# CTRL by Mindmaker

> Build the AI-native version of your business.

CTRL is the tool for leaders building, orchestrating, productizing, and getting to market the **AI-native version of their business**. It is not a general business advisor. Every decision, headline, and nudge in the app pulls toward one question: how do you make your business more AI-native, here? When a leader brings a general-business call ("should I hire a VP of Sales?"), CTRL reframes it into its AI-native version ("before you hire, should an agent own part of that motion first, and what does the human role become?") and works it from there.

Production: **ctrl.themindmaker.ai**. Globally dark, instrument-grade UI (the `ctrl-ds` palette, emerald `#00D9B6`). Mobile-first and no-scroll: every key surface fits the viewport with one clear action per screen.

---

## Documentation

The deeper source of truth lives in [`project-documentation/`](./project-documentation/README.md). The two canonical product/build specs are:
- [`docs/MAIN-APP-POLISH-SPEC.md`](./docs/MAIN-APP-POLISH-SPEC.md) - the main-app standard: the AI-native North Star, the decision model, the news categories, the no-scroll/one-ask laws, the approachable-language rules.
- [`docs/KIT-REDESIGN-SPEC.md`](./docs/KIT-REDESIGN-SPEC.md) - the lesson-kit program.

For sales, marketing, and ops AI agents: start at [`project-documentation/README.md`](./project-documentation/README.md), then `SALES_BRIEF.md`, `ICP.md`, `VALUE_PROP.md`, `OUTCOMES.md`, `Master_Messaging_and_FAQ.md`. (Note: those sales docs are mid-reconciliation to the AI-native positioning; trust this README and the two specs above where they disagree.)

For developers: [`CLAUDE.md`](./CLAUDE.md) (workflow + the current architecture quick-reference), then `project-documentation/ARCHITECTURE.md`, `FEATURES.md`, `COMMON_ISSUES.md`.

---

## The two halves of the product

### 1. The lesson kits (`/kit`)
A leader finishes a Mindmaker lightning lesson, scans a code, and walks a guided, build-it-with-you kit. Four kits, each about one thing:
- **Vibe Coding** - a *solution*: teach any AI how you work and what has burned you, then ship one real build.
- **Autonomous Business** - a *process*: take one recurring workflow off your plate.
- **Agentic Org Chart** - the *company*: map divisions to tasks to handoffs, each tagged green (AI runs it) / amber (AI assists, you approve the handoff) / red (you only), with a ranked place to start.
- **Memory & Identity** - the *person*: make the AI know you across sessions, in your voice.

Each kit is strictly sequential (one action per screen), no-scroll on mobile, a native two-pane on desktop with a live "your kit is taking shape" panel, an honest build trace, and one branded, personalized hero PDF. See `docs/KIT-REDESIGN-SPEC.md`.

### 2. The main app (the leader's daily instrument)
Every authenticated surface is no-scroll on all devices, one ask per screen, and locked to the AI-native frame:
- **Home / cockpit** - a daily deck of "worth a look" headlines, AI-native only.
- **News deck** - nine AI-native news categories (model & capability, AI economics, tools & vendors, orchestration & agent reliability, AI-native product & GTM, governance, security & agent risk, org & talent, proof & adoption), each with a branded SVG motif. The briefing pipeline filters out anything that is not about deploying, building, or selling AI, and tags every story to a category.
- **Decision engine** (`/decision`) - pressure-tests a decision (decompose, verify against live evidence, cross-examine, advise), with an honest AI-native reframe shown as a banner.
- **Brain / Memory Web** (`/memory`) - your context as a four-world rope canvas that fills the frame, with zoom and pan; the substrate that makes any AI know your business.
- **Daily Briefing** (`/briefing`) - a short audio read of the AI world, tuned to your chosen AI-native categories.
- **Context Export** (`/context`) - your context, portable into ChatGPT, Claude, Gemini, Cursor, Claude Code, or raw markdown; plus the Automator, which turns something you do every week into an AI skill.
- **Compliance** (`/compliance`) - an honest, calm view of how your data is protected (no overclaiming of certifications).

---

## Active routes

| Route | Surface | Auth |
|---|---|---|
| `/` | Landing | No |
| `/auth`, `/auth/callback` | Auth (Email + Google OAuth) | No |
| `/build` | Skill Builder (full-page) | No |
| `/try` | Public "watch it work" demo | No |
| `/kit` (+ `/kit/me`, `/kit/me/intake`, `/kit/reading/:pageId`, `/kit/pdf[/:redemptionId]`) | The lesson-kit program | No (anonymous session) |
| `/dashboard` | Home hub (cockpit / memory) | Yes |
| `/memory` | Brain / Memory Web | Yes |
| `/context` | Context Export + Automator | Yes |
| `/briefing` | Daily Briefing | Yes |
| `/decision`, `/decision-map` | Decision engine + map | Yes |
| `/goals`, `/track-record` | Goals + track record | Yes |
| `/enrich` | Inbound enrich loop | Yes |
| `/agents` | Agents | Yes |
| `/settings`, `/compliance`, `/profile` | Settings, Compliance, Profile | Yes |

Legacy routes (`/today`, `/voice`, `/pulse`, `/diagnostic`) redirect to `/dashboard`; `/think` redirects to `/dashboard?view=edge`. (Source of truth: `src/router.tsx`.)

---

## Pricing

Pricing constants are canonical in `src/constants/billing.ts` (and the shared edge-pricing module); the app reads them, so trust the code over any doc. Edge Pro is a monthly subscription (`EDGE_PRO_PRICE_LABEL`); there is a paid AI-literacy diagnostic. TODO(founder): confirm the current full price list for the AI-native product before any sales doc quotes exact numbers.

---

## Design philosophy

- **Build the AI-native business** - never general business advice; reframe, never refuse.
- **Globally dark, instrument-grade** - the `ctrl-ds` palette, emerald `#00D9B6`, the `BrandLockup` (Mindmaker icon + `ctrl-logo` wordmark). Not light mode.
- **No-scroll, one ask per screen** - on every device.
- **Voice-first** where it fits; **honest in the renderer** (the quiet/empty state is intentional, never faked; confidence tracks evidence).
- **Approachable** - warm, first-timer-friendly language; no insider jargon presented cold; no em dashes.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript 5.5 + Vite 5.4 + Framer Motion |
| Routing | React Router 6 (`createBrowserRouter`, lazy routes) |
| Styling | Tailwind CSS + shadcn/ui (Radix), globally dark |
| State | React Context + TanStack Query |
| Backend | Supabase (PostgreSQL + Edge Functions, Deno runtime) |
| AI | Vertex AI (Gemini 2.0 Flash) primary, OpenAI GPT-4o fallback |
| Voice / Audio | OpenAI Whisper / ElevenLabs |
| Embeddings | OpenAI `text-embedding-3-small` (pgvector) |
| Auth / Payments / Email | Supabase Auth / Stripe / Resend |
| Tests | Vitest (unit) + Playwright (e2e) |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) |
| Node.js | `>=22 <24` |

For current edge-function / hook / migration counts and the live architecture, see `CLAUDE.md` (kept current).

---

## Local dev

```bash
npm install
npm run dev          # dev server
npm run test         # vitest
npm run test:e2e     # playwright
npm run build        # production build
```

Supabase deploy + migration conventions live in [`CLAUDE.md`](./CLAUDE.md). Frontend auto-deploys to Vercel on push to `main`; edge functions deploy via `supabase functions deploy <name>`; migrations apply via the Supabase Management API.

---

Built by Krish Raja. Live at **ctrl.themindmaker.ai**.
