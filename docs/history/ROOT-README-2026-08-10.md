# Historical CTRL root README

Status: Historical

> Historical record only. This was the repository entry point before the current documentation refactor. Start at [`../../README.md`](../../README.md).

> A quieter way through AI.

CTRL is a calm, personal AI briefing and decision partner for leaders with too much to hold in their heads. It learns their judgement through Make Your Mind Up's one-question-at-a-time onboarding, watches the AI world through that lens, weighs one real decision against live evidence, and gently surfaces blind spots. The interface stays intentionally small; the curation, memory, evidence, and delivery systems do the heavy lifting behind it.

Production: **makeyourmindup.ai**. The product is CTRL; the old `ctrl.themindmaker.ai` host is retired. The public front door keeps Make Your Mind Up's warm, one-question-at-a-time interaction language, while the authenticated product stays a focused daily instrument.

---

## Documentation

The deeper source of truth lives in [`project-documentation/`](./project-documentation/README.md). The canonical product/build specs are:
- [`docs/CTRL-SYSTEM-SPEC.md`](./docs/CTRL-SYSTEM-SPEC.md) - the product, data, evidence, memory, and decision rules.
- [`docs/MAIN-APP-POLISH-SPEC.md`](./docs/MAIN-APP-POLISH-SPEC.md) - the interface standard: the AI-native North Star, no-scroll/one-ask laws, and approachable language.

For sales, marketing, and ops AI agents: start at [`project-documentation/README.md`](./project-documentation/README.md), then `SALES_BRIEF.md`, `ICP.md`, `VALUE_PROP.md`, `OUTCOMES.md`, and `Master_Messaging_and_FAQ.md`.

For developers: [`CLAUDE.md`](./CLAUDE.md) (workflow + the current architecture quick-reference), then `project-documentation/ARCHITECTURE.md`, `FEATURES.md`, `COMMON_ISSUES.md`.

---

## One product, nested harnesses

### 1. Make Your Mind Up entry (`/`)
One calm question at a time creates a useful starting lens before an account is required. The handoff carries only consented, bounded fields into CTRL. It never copies the user's raw private sentence into the authenticated product.

### 2. CTRL daily instrument
Today, Decide, Blind Spot, Memory, and the audio briefing are the product. Settings and deeper harnesses stay reachable without becoming competing destinations. The lesson-kit product is retired; `/kit*` permanently redirects to `/try`. Review/build routes such as `/sort` remain subordinate harnesses for a specific job.

The leader-facing instrument is intentionally small:
Every authenticated surface is no-scroll on all devices, one ask per screen, and locked to the AI-native frame:
- **Today / First Lens** - one useful next move and a small, premium set of AI-native signals from the shared pool.
- **News deck** - nine AI-native news categories (model & capability, AI economics, tools & vendors, orchestration & agent reliability, AI-native product & GTM, governance, security & agent risk, org & talent, proof & adoption), each with a branded SVG motif. The briefing pipeline filters out anything that is not about deploying, building, or selling AI, and tags every story to a category.
- **Decision engine** (`/decision`) - pressure-tests a decision (decompose, verify against live evidence, cross-examine, advise), with an honest AI-native reframe shown as a banner.
- **Brain / Memory Web** (`/memory`) - your context as a four-world rope canvas that fills the frame, with zoom and pan; the substrate that makes any AI know your business.
- **Daily Briefing** (`/briefing`) - a short audio read of the AI world, tuned to your chosen AI-native categories, with grounded spoken follow-up.
- **Blind Spot** (`/blind-spot`) - one tentative, evidence-backed reflection at a time. Nothing is saved as a pattern until the leader confirms it.
- **Context Export** (`/context`) - a legacy deep link for portable context. It is deliberately absent from primary navigation.
- **Compliance** (`/compliance`) - an honest, calm view of how your data is protected (no overclaiming of certifications).

### One curation and learning spine

- Make Your Mind Up onboarding writes the starting context and a short-lived handoff.
- Control Center can contribute high-fit, source-backed curation through the optional server-only bridge.
- Those inputs join CTRL's existing corroborated shared pool. There is no second feed or second briefing engine.
- The leader's explicit facts, interests, feedback, and confirmed reflections re-rank that pool through the unified brain profile.
- Home, in-app audio, email, and future delivery channels consume the same ranked truth. Channel logic does not duplicate curation.
- Retryable writes are database-convergent: subscriptions, handoffs, active interests, confirmed blind spots, and daily delivery claims do not duplicate on retries.

---

## Active routes

| Route | Surface | Auth |
|---|---|---|
| `/` | Landing | No |
| `/auth`, `/auth/callback` | Auth (Email + Google OAuth) | No |
| `/build` | Redirect to the public CTRL starting point | No |
| `/try` | Public "watch it work" demo | No |
| `/kit`, `/kit/*` | Permanent redirect to `/try` | No |
| `/dashboard` | Today / First Lens | Yes |
| `/memory` | Brain / Memory Web | Yes |
| `/blind-spot` | Grounded leadership reflection | Yes |
| `/context` | One-click context copy or download | Yes |
| `/briefing` | Daily Briefing | Yes |
| `/decision`, `/decision-map` | Decision engine + map | Yes |
| `/goals`, `/track-record` | Goals + track record | Yes |
| `/enrich` | Inbound enrich loop | Yes |
| `/agents` | Agents | No |
| `/settings`, `/compliance`, `/profile` | Settings, Compliance, Profile | Yes |

Legacy routes (`/today`, `/voice`, `/pulse`, `/diagnostic`) redirect to `/dashboard`; `/think` redirects to `/dashboard?view=edge`. (Source of truth: `src/router.tsx`.)

---

## Pricing

There are two self-serve tiers. Free includes Memory, Blind Spot, the personalised daily briefing, and three decision weighs each month. Edge Pro is $49 per month and adds unlimited weighs, multi-model cross-examination, decision watch, generated artifacts, and live MCP access. `supabase/functions/_shared/edge-pricing.ts` is the canonical amount and `src/constants/planMatrix.ts` is the canonical capability matrix.

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
| Node.js | `>=22 <25` (Vercel production uses 24.x) |

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

The optional Control Center adapter is disabled unless both `CONTROL_CENTER_URL` and `CONTROL_CENTER_PUBLISHABLE_KEY` are present in the CTRL Edge Function secrets. The source key is publishable and the Control Center table is RLS read-only for anonymous callers, but it stays server-injected so the cross-system boundary remains explicit. Never expose either as a `VITE_*` variable.

The `live-headlines-prewarm` and `daily-briefing-email` jobs authenticate with a random `ctrl_cron_secret` stored in Supabase Vault and mirrored as the `CTRL_CRON_SECRET` Edge Function secret. The migration creates and schedules the Vault side; deployment tooling must synchronize the value without printing or persisting it. Do not restore the retired `app.supabase_service_role_key` Postgres setting.

---

Built by Krish Raja. Live at **makeyourmindup.ai**.
