# MindmakerOS Standards Spine

Authored from CTRL (mm-ctrl), the most documented app, on 2026-05-30. This folder is the portable, framework-agnostic system the six apps share. Unify the SYSTEM, never the SKIN: each app themes the tokens differently and keeps its own palette, typography personality, motion flavor, voice, and density.

The five sibling repos (onalert, gutted, merciless, fractionl-circle, fractionl-pulse) adopt this by copying or mirroring these files. CTRL is the reference implementation; nothing here imports app-specific code.

## Contents
- `design-tokens.css` - the semantic token contract (light + dark) plus brand primitives. Each app overrides the brand primitive values and keeps the semantic names. Every token a Tailwind theme references must be defined here for both modes.
- `motion.ts` - framework-agnostic motion constants (durations, spring, limits). Wire into Framer Motion (or any engine) per app. Motion must communicate state, never decorate. Respect `prefers-reduced-motion`.
- `product-truth.schema.json` - JSON Schema for the public `/.well-known/product.json` the fleet sells from. Validate each app's product.json against this.
- `check-standards.mjs` - build-time guard. Fails the build on (a) any em dash in source or docs (house rule: no em dashes anywhere) and (b) any required semantic token missing from the app's base CSS. CTRL runs it in `prebuild`.

## Reference helpers (live in CTRL, copy per app)
- AI router timeout helper: `supabase/functions/_shared/with-timeout.ts` (`fetchWithTimeout` + `ProviderUnavailableError`; retries 5xx once, never 4xx; hard AbortController timeout). Stream by default where the UX benefits; exclude 4xx auth/quota from retry; log cost.
- Attribution emit (dormant until warehouse env set): `supabase/functions/_shared/attribution-emit.ts` + the public `track-event` function + the client `src/lib/attribution.ts` first-touch capture. Apps emit only; they never migrate the warehouse and never hold its service-role key. The only warehouse credential an app holds is `ATTRIBUTION_INGEST_SECRET`.

## Adoption checklist (per sibling repo)
1. Copy `design-tokens.css`, retheme the brand primitives, keep the semantic names. Ensure dark mode is defined.
2. Copy `motion.ts`; map constants into the app's motion layer.
3. Publish `/.well-known/product.json` validating against `product-truth.schema.json`.
4. Copy the `with-timeout` and `attribution-emit` helpers; wire UTM capture -> signup metadata -> Stripe metadata -> warehouse emit.
5. Add `check-standards.mjs` to `prebuild` so the build fails on em dashes and undefined tokens.
6. Floors on every screen: loading, empty, error, success; mobile-first usable at 390px; reduced motion respected; public pages return real content in initial HTML with structured data, sitemap, robots, per-page OG.
