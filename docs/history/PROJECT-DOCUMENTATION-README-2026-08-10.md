# Historical project-documentation index

> Historical record only. Start at [`../current/README.md`](../current/README.md).

Last reconciled: 2026-08-10

CTRL is one product at `makeyourmindup.ai`. Make Your Mind Up is the warm, one-question-at-a-time front door; CTRL is the daily decision-support system behind it. The product is for overwhelmed founders and small-team CEOs who are actively building the AI-native version of their business. It should feel calm and human at the surface while curation, memory, evidence, delivery, and AI orchestration stay sophisticated underneath.

## Source-of-truth order

1. Running code, production schema, and `src/router.tsx`.
2. Root [`README.md`](../README.md), [`CLAUDE.md`](../CLAUDE.md), and `public/.well-known/product.json`.
3. [`APP-DELIVERY-STATE.md`](./APP-DELIVERY-STATE.md) for the current release state.
4. [`DECISIONS_LOG.md`](./DECISIONS_LOG.md) for settled product and architecture decisions.
5. [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`FEATURES.md`](./FEATURES.md), and [`REPLICATION_GUIDE.md`](./REPLICATION_GUIDE.md) for technical operation.
6. [`HISTORY.md`](./HISTORY.md) and explicitly historical sections for provenance only.

If prose disagrees with code or the production readback, code and measured production state win.

## Current product

The primary navigation is Today, Decide, Blind spot, and Memory. The audio briefing is a signature control available from Today and as a dedicated surface. Settings is always reachable. Context export, compliance, profile, and the harness chain (`/sort`, `/review`, `/proposals`) remain subordinate utilities, not competing products.

- Public onboarding captures judgement without a dashboard or account requirement.
- First Lens turns that intake into an immediate, premium post-handoff payoff.
- Today shows one useful next move and a small, visually distinctive AI-native read.
- Decide weighs one real call against live evidence and keeps the final judgement with the leader.
- Blind Spot offers one tentative reflection grounded in independent facts and saves nothing until confirmation.
- Memory keeps portable context, corrections, and provenance.
- The briefing can be read, heard, and talked back to in the same warm voice.
- No-login delivery can send the same ranked intelligence by email and audio.

The former Kit and Automator/Skill Builder are not primary products. `/kit*` redirects to `/try`. Skill generation and MCP artifacts may remain as nested backend harnesses where they support portability, but the user-facing development surface is Blind Spot.

## Brand and interaction laws

- Product name: CTRL.
- Canonical domain: `makeyourmindup.ai`.
- Retired domain: `ctrl.themindmaker.ai`, redirected to the canonical host.
- Typography: Segoe UI Variable Display and Text as optical cuts of one family; mono only for compact metadata.
- Visual language: dark, premium, instrument-like, with stable category motifs and restrained emerald accents.
- One primary ask at a time. No horizontal overflow. No clipped meaning. Minimum 44px signature controls.
- Plain language, no em dashes, no fabricated urgency, proof, or confidence.

## Live architecture snapshot

Recounted 2026-08-10: 113 Edge Function directories excluding `_shared`, 78 hook files, and 158 SQL migrations. Counts are descriptive, not contracts; re-count the repository before quoting them.

The production flow is:

`Make Your Mind Up intake -> consented handoff -> CTRL profile and First Lens -> shared curation pool -> per-user ranking -> Today / audio briefing / no-login delivery -> reactions and corrections -> richer profile`

Control Center contributes to the shared pool through a publishable key constrained by read-only RLS. It is not a second feed. Daily prewarm and delivery are pg_cron jobs authenticated by a Vault-generated shared secret. Public writes are idempotent and consent-gated; user-scoped AI and paid-audio paths require ownership.

## Documentation map

- [`AGENT_BRIEFING.md`](./AGENT_BRIEFING.md): current one-read product and go-to-market brief.
- [`ICP.md`](./ICP.md), [`VALUE_PROP.md`](./VALUE_PROP.md), [`OUTCOMES.md`](./OUTCOMES.md): current commercial framing.
- [`BRANDING.md`](./BRANDING.md): current brand, voice, typography, and domain rules.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): system boundaries and data flow.
- [`FEATURES.md`](./FEATURES.md): current feature inventory and retired surfaces.
- [`REPLICATION_GUIDE.md`](./REPLICATION_GUIDE.md): environment, deployment, and verification.
- [`MASTER_INSTRUCTIONS.md`](./MASTER_INSTRUCTIONS.md): permanent engineering and UX laws.
- [`HISTORY.md`](./HISTORY.md): chronological record; not current product guidance.
- [`CTRL-BUILD-ROADMAP.md`](./CTRL-BUILD-ROADMAP.md): historical roadmap; not a backlog.

## Release rule

A release is complete only when code is on `main`, required Supabase migrations and functions are deployed, Vercel production is READY, canonical and retired domains behave correctly, and live acceptance plus documentation match the deployed state.
