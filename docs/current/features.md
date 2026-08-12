# CTRL features

Status: Current
Owner: Mindmaker
Last verified: 2026-08-11 against application baseline `0f20baf2437667c3719c94f1c16d04bb08b42023`, `src/router.tsx`, plan constants, and production Blind Spot fixtures

This inventory distinguishes the user-facing product from supporting and nested harnesses. It does not treat every route or Edge Function as a feature.

## Primary capabilities

| Capability | What the user gets | Main route | Tier |
|---|---|---|---|
| Today and First Lens | A small, premium set of ranked AI signals and one useful next move | `/dashboard` | Free |
| Daily briefing | A short personal read and listen, with grounded talk-back | `/briefing` and Today control | Free |
| Decide | An AI-native reframe, verified claims, tensions, and advice | `/decision` | 3 per month free; unlimited Pro |
| Blind Spot | One private mechanism-level read, exact evidence anchors, a small experiment, and bounded advisor talk-back | `/blind-spot` | Free |
| Memory | Structured, corrected, portable context through Graph, All facts, and Library | `/memory` | Free |
| Settings and privacy | Delivery, interests, memory, transcript, data, and account controls | `/settings`, `/compliance`, `/profile` | Free |

Entitlements are defined by [`src/constants/planMatrix.ts`](../../src/constants/planMatrix.ts). Price is defined by [`supabase/functions/_shared/edge-pricing.ts`](../../supabase/functions/_shared/edge-pricing.ts).

## Supporting capabilities

- Public one-question onboarding and future-memory result, with a progressive Make Your Mind Up to CTRL visual handoff across the six questions.
- Optional one-field company recognition from a work email or LinkedIn URL. It resolves a bounded company dossier, checks fresh company-specific news, shows source strength and linked evidence, and offers one quiet correction before the confirmed context follows the leader into CTRL.
- Consented handoff into authenticated context and First Lens.
- Nine AI-native news categories with stable visual motifs.
- Shared-source clustering, corroboration, category balance, and role-aware ranking.
- One feed-tuning control reused by Today and Settings.
- Email and audio delivery without a dashboard visit.
- No-login briefings use confirmed company signals first and fill remaining space from the same shared curation pool rather than creating a company-news feed.
- Context export for use in ChatGPT, Claude, Gemini, Cursor, and Claude Code.
- Decision watch, outcomes, track record, and map.
- Memory correction lineage, verification, encryption, expiry settings, and export.
- Privacy, retention, import, and data export are configured from the single Settings surface; Memory does not duplicate those controls.
- Blind Spot evidence qualification, rejection suppression, one active experiment, and a due briefing check-in.
- Billing, account deletion, consent, and compliance controls.
- Loading, stale-chunk, network, and retry recovery paths.

## Edge Pro

Edge Pro deepens decision support. It adds unlimited decision weighs, multi-model cross-examination, decision watch, generated artifacts, live MCP access, and artifact email delivery. Memory, Blind Spot, and the daily briefing remain useful on Free.

## Nested harnesses

Nested harnesses support a specific job or portability outcome. They must not become competing top-level products.

| Harness | Route or boundary | Role |
|---|---|---|
| Context export | `/context` | Portable context copy or file |
| Decision map and track record | `/decision-map`, `/track-record` | Deeper evidence and outcome views |
| Goals and enrichment | `/goals`, `/enrich` | Supporting context and follow-through |
| Check, review, proposals | `/sort`, `/review`, `/proposals` | Observation and learning chain, URL-reachable but not primary navigation |
| Agents | `/agents` | Public MCP/context explanation |
| Public demo | `/try` | Pre-login shaped example |
| Upgrade | `/upgrade`; public `/pricing` rewrite | Plan comparison and checkout entry |
| Preview | `/preview` | Unlinked deterministic QA fixtures |
| Skill and MCP generation | Backend functions and exports | Portability substrate only |

## Route inventory

### Public

`/`, `/auth`, `/auth/callback`, `/preview`, `/agents`, `/try`, `/download`, and `/upgrade`.

`/build` redirects to `/`. `/download` is feature-flagged. Vercel rewrites public `/pricing` to the static pricing page.

### Authenticated

`/dashboard`, `/memory`, `/context`, `/briefing`, `/decision`, `/blind-spot`, `/goals`, `/track-record`, `/decision-map`, `/enrich`, `/sort`, `/review`, `/proposals`, `/settings`, `/compliance`, and `/profile`.

### Legacy redirects

`/today`, `/pulse`, `/voice`, and `/diagnostic` redirect to `/dashboard`. `/think` redirects to `/dashboard?view=edge`. Vercel permanently redirects `/kit` and `/kit/*` to `/try`.

## Explicitly retired or demoted

- The lesson-kit collection and `/kit` product flow.
- Automator or Skill Builder as a primary leadership-development destination.
- Multiple dashboard variants or a second onboarding interview.
- Context Export as a primary navigation tab.
- Generic business advice that has no AI-native reframe.
- Duplicate tuning controls or separate briefing feeds.

Historical code may remain where a nested harness still uses it. Presence in source does not promote it back into the product.

## Feature acceptance

A feature is complete only when the route and auth boundary are correct, the empty and failure states are honest, data persists idempotently, desktop and mobile fit, keyboard and touch paths work, the relevant provider or integration is actively exercised, and this inventory still describes the product without qualification.
