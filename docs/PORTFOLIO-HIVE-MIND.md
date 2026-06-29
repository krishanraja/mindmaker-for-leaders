# Portfolio Hive Mind + Brand Cohesion

**Status:** brand layer + the load-bearing hive-mind core are LIVE in production (2026-06-29). This is the canonical record of the cross-product effort spanning the three sibling repos: **Make Your Mind Up** (`makeyourmindup`), **Mindmaker** (`mindmaker`), and **CTRL** (`mm-ctrl`). They share ONE Supabase project (`bkyuxvschuwngtcdhsyg`).

## North star: one operator, three rooms, one brain
The three products are not three brands; they are three rooms a leader walks through by readiness, over one shared intelligence:
- **Make Your Mind Up** = the front door (anonymous provocation; captures **anxiety** - q5 "the decision you keep not making", the entry door, the modality sliders).
- **Mindmaker** = the consulting room (high-touch advisory; captures **intent** - the diagnosed nervous decision + company dossier).
- **CTRL** = the cockpit (retained daily instrument; captures **behavior** - reactions, decisions, the compounding brain).

The anti-vanilla principle: **unify the body, never the personality.**
1. **Shared body (compute once, all drink):** the corroborated news pool, the Artificial-Analysis model index, the enrichment graph, the voice spec.
2. **Sovereign personality (never homogenized):** MYMU provokes, Mindmaker opines (cynical SIGNAL/NOISE/TAKE), CTRL personalizes. Each renders the shared body through its own lens.
3. **Cross-ladder learning (the hive mind):** each surface's unique signal sharpens the others.

## Brand cohesion (LIVE)
One portfolio signature: **emerald `#00D9B6` = `171 100% 43%`** (was per-product mint/emerald/none). Migrated as a SYSTEM with `emerald-deep #06746d` for AA text-on-light. Canonical contract: `mm-ctrl/standards/design-tokens.css` (the "MindmakerOS" token contract siblings mirror). Each product keeps its soul: CTRL dark cockpit, Mindmaker light room, MYMU rose/ember serif front door + the shared Mindmaker icon as the family endorsement. WCAG proof: `mindmaker/prototypes/brand-emerald-proof.{html,md}`.

## The hive-mind wires (what is LIVE)

### One pool, three surfaces (Hive A / A')
CTRL's corroborated `live_headlines_cache` (built by `live-headlines`, the crown-jewel pipeline) is now the portfolio's shared pool:
- **MYMU** `send-result-email` + `_shared/reads.ts` (`pickThreeReads`): the long-promised "three things to read" are delivered from the pool, ranked against the leader's q5.
- **Mindmaker** `get-ai-news` Plan A0: reads the pool first, maps the 9 lanes to Krish's editorial taxonomy; `/signal` (`Brief.tsx` + `useLiveBrief`) renders the corroborated WATCH/CALL cards with a "+N sources" chip (corroboration UNDER opinion) and KEEPS Krish's sovereign SKIP/TAKE editorial interleaved.
- **CTRL** Home/Briefing read it directly (pre-existing).

### Consent-gated warm handoff (Hive B)
The funnel DNA travels the ladder, consent-gated, raw q5 never leaving:
- **Produce:** MYMU fork offers an opt-in -> `track-fork` mints a `portfolio_handoff` row carrying only the CATEGORISED signal (an anxiety LANE from q5 via the shared ranker, the entry door, q2/q4, company domain, archetype) + returns a token appended as `?h=<token>`.
- **Store:** `portfolio_handoff` table (RLS on, service-role only, 7-day TTL; migration `makeyourmindup/.../20260629000000_portfolio_handoff.sql`).
- **Resolve:** CTRL `resolve-handoff` returns the signal + marks consumed.
- **Consume:** CTRL `HandoffWelcome` (on both Home views, token captured in `Landing.tsx`) stages one honest "here's what I think is on your mind - confirm?" and on yes seeds ONE `user_memory` blocker fact (`verification_status: 'inferred'`).

### The aggregate "State of the AI-Native Leader" (Hive D foundation)
`portfolio-pulse`: categorizes recent MYMU q5 answers into lanes server-side and returns ONLY the anonymized distribution (counts + shares, no PII, no raw q5). The cross-surface signal of what the cohort is grappling with. Internal-first; designed to tilt curation priors and later surface as a Mindmaker LIVE / Substack widget.

## Privacy model (decisions, honored)
- Anonymized **aggregate** signal flows freely (no PII): `portfolio-pulse`.
- **Per-person** signal crosses only on explicit consent at the fork: the handoff.
- The **raw q5 and any transcript NEVER travel** - only the categorized lane/shape does. Categorization always happens server-side.

## What remains (refinements on a live foundation)
- **D-wiring:** consume `portfolio-pulse` to tilt CTRL's curation priors (a small lift in `newsPriority.ts` for trending lanes); expose it as a public Substack/Mindmaker LIVE widget.
- **C - one enrichment service:** collapse MYMU `enrich-profile` and Mindmaker `enrich-company` (near-identical PDL/Apollo/Brandfetch/BuiltWith/Tranco/Exa/Perplexity/Brave/NewsAPI waterfalls) into one shared module.

## Deploy note
Edge functions in this environment deploy via the Supabase Management API multipart bundler (`POST /v1/projects/<ref>/functions/deploy?slug=<slug>` with `-F metadata=...` + `-F file=@...;filename=...`); the CLI is proxy-blocked and the MCP deploy is permission-gated here.
