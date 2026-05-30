# CTRL rebuild — continuation / backlog closeout (2026-05-30)

Follows the main rebuild (PR #111, merged to main, prod live-verified). This pass closed the safely-completable backlog within mm-ctrl scope.

## Completed in this pass
- Standards spine package `standards/` (Section 4): `design-tokens.css` (reconciled semantic contract, light + dark), `motion.ts` (motion constants), `product-truth.schema.json` (the product.json schema), `README.md` (per-repo adoption guide), and `check-standards.mjs` (build guard). The sibling repos copy or mirror these (they are out of scope this session).
- Build-time guard wired into `prebuild`: fails the build on any em dash in source/docs or any required semantic token undefined in `src/index.css`. Verified passing on the full repo (`npm run build` runs `[standards] OK` then builds).
- n8n double-count: investigated read-only and CLEARED. The `Stripe | mm-ctrl | Revenue Alert` workflow (fTn3a8wAGm6zFWfO) only alerts (Telegram), logs to `workflow_runs`, and upserts the OS warehouse `customers` table. It does not touch CTRL `edge_subscriptions` or `leader_assessments`, which the CTRL `stripe-webhook` owns. Disjoint write targets, no double-count. Coordination note recorded in the OS handoff (reconcile `attribution.events` with the n8n `customers` attribution when the warehouse goes live).

## Deliberately NOT built this pass (needs a human-in-the-loop QA pass, not blind changes)
These were documented as 5X backlog. They are not shipped because they cannot be verified headlessly and would risk the live revenue magic-moment pipeline if shipped unverified. Each needs a real authenticated browser session (Phase 5 mobile verification) before going live.

- AI response streaming for the briefing. `generate-briefing` is ~1938 lines and is the live magic-moment + revenue pipeline. A `streamOpenAI` helper already exists in `_shared/openai-utils.ts` (currently unused). Streaming should be added with a non-streaming fallback and validated against real briefing generation before flipping on. Build-ready, not shipped blind.
- Full 5X UI (streaming briefing assembly view, landing live-voice demo, cross-app context broadcast, interactive briefing evidence trail). Additive UI, but each needs visual + interaction QA at 390px. Specs are in PHASE-0 (5X seeds) and the audit.
- Full per-route React SSG. The current build-time content injection already returns real content + JSON-LD in initial HTML (DoD met). A full SSG (e.g. vite-react-ssg) is a re-architecture worth doing only if marketing routes grow.

## Still requires the user / OS (cannot be done from this session)
- `RESEND_WEBHOOK_SECRET`: set from the Resend dashboard to enforce signature verification (currently fail-open).
- `WAREHOUSE_INGEST_URL` + `ATTRIBUTION_INGEST_SECRET`: set by the OS session to activate the dormant attribution emit. See `Downloads/app OS summaries/Ctrl.md`.
- Decide whether to migrate the grandfathered $9 Edge Pro cohort to $29.
