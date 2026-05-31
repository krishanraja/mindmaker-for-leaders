# MindmakerOS Standards Spine (authored from CTRL)

Status: foundation authored 2026-05-30 from mm-ctrl (the most documented app). Last reviewed 2026-05-31. Unify the SYSTEM, never the SKIN. Each app themes these tokens differently and keeps its own palette, typography personality, motion flavor, voice, and density.

This document is the contract the other five apps (onalert, gutted, merciless, fractionl-circle, fractionl-pulse) import or mirror. CTRL is the reference implementation.

## 1. Semantic token contract (CSS variables, HSL triplets)

Owned per app in one base layer (in CTRL: `src/index.css`, the shadcn `@layer base`). Brand primitives live separately (in CTRL: `src/styles/tokens.css`). Do NOT define the same semantic token in two files (the 2026-05-30 audit found CTRL had `--background` and `--accent` diverging across two files; that is now resolved by giving `index.css` sole ownership of semantics).

Required semantic tokens (light + `.dark`):
- surface: `--background`, `--card`, `--popover` (+ `-foreground` each)
- text: `--foreground`, `--muted-foreground`
- accent: `--accent` (+ `-foreground`), `--ring`
- intent: `--primary`, `--secondary`, `--success`, `--destructive` (+ `-foreground` each)
- lines: `--border`, `--input`, `--muted`
- shape: `--radius`

Rule: every token referenced in `tailwind.config.ts` MUST be defined in the base layer for both modes. CTRL shipped with `--success` referenced but undefined (broken `bg-success`); that class of gap is now a build-time concern (see section 5).

## 2. Type, spacing, radius, elevation
- Spacing: 4px base scale (`--spacing-0-5` through `--spacing-20`).
- Radius: `--radius-sm` 6px through `--radius-2xl` 24px.
- Elevation: `--shadow-sm` through `--shadow-xl`.
- Type: one display face + one body face per app. CTRL uses Gobold Bold (`--font-display`) for hero headlines and Space Grotesk (via `.brand-ctrl` class) for the CTRL wordmark / brand typography, with Inter (`--font-primary`) for all body text. When describing CTRL to other apps in the fleet, treat Space Grotesk as the named display personality (what callers see) and Gobold as the hero accent; both coexist in CTRL's type stack.

## 3. Motion grammar
Ground truth lives in code (CTRL: `src/lib/motion.ts`), not in docs. Shared constants: durations 150/300/500ms, spring stiffness ~400, damping ~30, mass ~0.8, max movement 24px, max scale 1.05. Respect `prefers-reduced-motion`. Motion must communicate state, never decorate.

## 4. Data + AI conventions (shared)
- RLS on every user-scoped table; gate by the owning user, not by a foreign id that is not `auth.uid()` (CTRL audit found `leader_*` tables gating on `leader_id = auth.uid()` where `leader_id` is an app id, returning zero rows; fixed by joining via `leaders.user_id`).
- No service-role key client-side. Webhooks signature-verified + idempotent.
- AI router: stream by default, timeout every external call, exclude 4xx (auth/quota) from retry, cache where safe, log cost. CTRL shares `supabase/functions/_shared/with-timeout.ts` (`fetchWithTimeout` + `ProviderUnavailableError`) as the reference helper.

## 5. Floors (every app, every screen)
- All four states designed: loading, empty, error, success.
- Mobile-first, usable one-handed at 390px. Reduced motion respected. Accessibility floor met.
- Public pages return real content in initial HTML (view source proves it), with schema.org structured data, canonical URL, sitemap, robots, per-page OG.
- Build-time guard: fail the build if a referenced token is undefined, or if an em dash appears in source (house rule: no em dashes anywhere).

## 6. Fleet-commerce contract (shared)
- One UTM + source contract across all domains: `utm_source/medium/campaign/content/term` + `agent` + `campaign_id`. Capture first-touch on landing, persist through signup, stamp onto Stripe customer + checkout session metadata.
- One machine-readable product-truth source per app at `/.well-known/product.json` (CTRL reference shape includes icp, problem, magic_moment, pricing tiers, offers, ctas, attribution, guardrails).
- Lifecycle events (landed, signed_up, activated, purchased, refunded, churned) emit to the central MindmakerOS warehouse (`gojpffsrxybbpbdzzrvs`) via the OS-owned `ingest-attribution` function. Apps emit only; they never migrate warehouse tables and never hold the warehouse service-role key. The only warehouse credential an app holds is `ATTRIBUTION_INGEST_SECRET` (server-side).

## 7. What CTRL extracted vs what is still per-app
Extractable now: the token contract structure, the spacing/radius/shadow scales, the motion constants, the `with-timeout` AI helper, the attribution emit pattern (`_shared/attribution-emit.ts` + `track-event`), the `product.json` shape, the no-em-dash rule.
Bespoke to CTRL: the Vertex/OpenAI/static AI router, the briefing pipeline, the Skill export, the Memory Web visualization, the brand fonts and mint palette.

Next step (cross-repo, not done in the CTRL-only pass): publish the token + helper layer to a shared package or a copied `standards/` folder each app mirrors, and add the build-time token/em-dash guard to each repo's CI.
