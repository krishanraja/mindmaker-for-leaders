# CTRL by Mindmaker

Status: Current

> A quieter way through AI.

CTRL is a calm AI briefing and decision partner for founders and small-team CEOs building the AI-native version of their business. Make Your Mind Up is its warm, one-question-at-a-time intake. The interface stays small while curation, memory, evidence, delivery, and AI orchestration do the heavy lifting.

Production: [makeyourmindup.ai](https://makeyourmindup.ai)
Product: CTRL
Repository: `krishanraja/mm-ctrl`
Last verified: 2026-08-30 against production readback through 2026-08-21

## Start here

| Need | Document |
|---|---|
| Product, user, and experience | [`docs/current/product.md`](./docs/current/product.md) |
| Marketing, sales, buyer, and claims | [`docs/current/commercial.md`](./docs/current/commercial.md) |
| System and data flow | [`docs/current/architecture.md`](./docs/current/architecture.md) |
| Live, nested, and retired capabilities | [`docs/current/features.md`](./docs/current/features.md) |
| Production baseline and known debt | [`docs/current/release-state.md`](./docs/current/release-state.md) |
| Setup, release, and rollback | [`project-documentation/REPLICATION_GUIDE.md`](./project-documentation/REPLICATION_GUIDE.md) |
| Coding-agent instructions | [`CLAUDE.md`](./CLAUDE.md) |
| Complete documentation map | [`docs/current/README.md`](./docs/current/README.md) |

Executable code and authoritative environment readback outrank prose. When behavior changes, update the current document in the same pull request.

## Read this before touching the backend

The Supabase project is **shared**. CTRL runs alongside other Mindmaker surfaces in project `bkyuxvschuwngtcdhsyg`, which carries 178 deployed Edge Functions of which CTRL accounts for 115. A function you can see in the dashboard may belong to another product, and the database has tables and cron jobs this repository does not own.

Two rules follow. Only the directories under `supabase/functions/` are yours to change. And every one of them is live, including the ones with no caller anywhere in this repository, because they are triggered by cron, by an external webhook, or by a link in an email. See [architecture](./docs/current/architecture.md#the-supabase-project-is-shared).

## Product in one loop

```text
one-question intake
  -> optional company recognition and fresh evidence
  -> one-click confirmation or correction
  -> consented context
  -> First Lens
  -> shared corroborated AI pool
  -> personal ranking and briefing
  -> decision weighed against evidence
  -> explicit confirmation or correction
  -> stronger memory
```

Today, Decide, Blind Spot, Memory, Briefing, and Settings are the primary product. Context export and deeper review/build chains remain nested harnesses. The lesson-kit product is retired and `/kit*` redirects to `/try`.

## Architecture at a glance

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript 5.5, Vite 5.4, React Router 6 |
| UI | Tailwind CSS, Radix primitives via shadcn, Framer Motion, `ctrl-ds` tokens |
| Client data | TanStack Query, React Context, Supabase client |
| Backend | Supabase PostgreSQL, Auth, Storage, Edge Functions, Vault, pg_cron |
| AI | Capability-specific OpenAI, Anthropic, Gemini, and Grok paths |
| Voice | OpenAI transcription, Gemini fallback, ElevenLabs speech |
| Identity and evidence | PDL and Brandfetch for optional onboarding resolution; Perplexity, Tavily, Brave, Jina, NewsAPI.org, Exa, Artificial Analysis, RSS, GDELT, Hacker News |
| Billing and email | Stripe and Resend |
| Hosting | Vercel frontend and Supabase Cloud backend |

There is no truthful single global “primary AI provider.” See the capability matrix in the [current architecture](./docs/current/architecture.md#ai-and-external-provider-routing).

## Local development

### Prerequisites

- Node.js `>=22 <25`
- npm
- A local `.env.local` with publishable frontend values
- Supabase access only for work that crosses the backend boundary

### Install and run

PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

macOS or Linux:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Minimum browser variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`

Never expose service-role, provider, payment, email, encryption, or cron secrets through `VITE_*` variables.

## Verification

```bash
npm run docs:check
npm run standards:check
npm run typecheck
npm test -- --run
npm run build
npm run test:e2e     # requires a running local or preview target
```

Use focused tests while iterating, then run the applicable full gates. Start `npm run dev` in another terminal or set `E2E_BASE_URL` to the authorised preview before Playwright. Most authenticated specs remain skipped until the documented auth seed helper is wired. Typecheck and changed-file lint are baseline-scoped because the repository carries disclosed historical debt. New or worsened diagnostics fail the gate.

## Release safety

- Frontend releases flow through a pull request to `main`; Vercel is Git-connected.
- Edge Functions deploy independently and must preserve the auth contract in `supabase/config.toml`.
- Canonical production has historical migration-ledger drift, so the ledger cannot tell you what is applied. Verify by object readback instead, per [release state](./docs/current/release-state.md#applied-migration-state-and-why-the-ledger-is-not-the-answer). Never run a blanket production `supabase db push`.
- Scheduled prewarm and delivery use a Vault-backed cron secret, not a database service-role setting.
- The Control Center bridge is a read-only source adapter inside the shared curation pool, not a second feed.
- A release is not verified until the source revision, deployment revision, canonical host, and real user path agree.

Follow the exact process in the [replication and release guide](./project-documentation/REPLICATION_GUIDE.md).

## Documentation governance

Current documents carry status, owner, and verification metadata. Dated roadmaps, delivery traces, old specs, and release journals are retained as history but do not compete with the current set. Run `npm run docs:check` to validate links, counts, decision IDs, pricing consistency, and known drift traps.

Built by Krish Raja.
