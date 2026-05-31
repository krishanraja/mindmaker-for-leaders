# Decisions Log

Key architectural and product decisions with rationale.

**Last Updated:** 2026-05-31

---

## Decision 1: Single DB-Based Architecture
**Date**: Jan 2025
**Decision**: Delete V1 components, use only V2 (DB-based)
**Rationale**: Dual architecture caused stale UI, technical debt
**Trade-off**: Short-term migration work vs long-term maintainability
**Outcome**: ✅ Successful, cleaner codebase

## Decision 2: Reposition as AI Literacy
**Date**: Jan 2025
**Decision**: Drop "AI transformation", focus on "AI literacy for executive cognition"
**Rationale**: Better differentiation, resonates with senior leaders
**Trade-off**: Narrower positioning vs clearer value prop
**Outcome**: ✅ Stronger messaging

## Decision 3: Surface Tensions/Risks/Scenarios
**Date**: Jan 2025
**Decision**: Make cognitive work (tensions, risks, scenarios) primary UI content
**Rationale**: These are valuable, were hidden backstage
**Trade-off**: More complex UI vs showcasing actual value
**Outcome**: ✅ Differentiated from alternatives

## Decision 4: Use OpenAI + Vertex Fallback
**Date**: 2024
**Decision**: Primary OpenAI, fallback to Vertex AI
**Rationale**: OpenAI quality better, Vertex for redundancy
**Trade-off**: Dual integration complexity vs reliability
**Outcome**: ↩️ Superseded by Decision 16 (Jan 2026). Primary is now Vertex AI (Gemini 2.0 Flash); OpenAI GPT-4o retained as fallback. See Decision 16 for current state.

## Decision 5: Supabase Edge Functions
**Date**: 2024
**Decision**: Use Supabase Edge Functions (Deno) vs separate backend
**Rationale**: Faster deployment, integrated with DB
**Trade-off**: Vendor lock-in vs speed of development
**Outcome**: ✅ Appropriate for stage

## Decision 6: Paid Tier at $49
**Date**: 2024
**Decision**: Single payment $49 for full diagnostic
**Rationale**: Low enough for individual purchase, high enough to qualify leads
**Trade-off**: One-time vs subscription revenue
**Outcome**: ⚠️ TBD (early data)

## Decision 7: Voice Assessment Path
**Date**: 2024
**Decision**: Add voice alternative to quiz
**Rationale**: Executive preference for speaking vs typing
**Trade-off**: Development complexity vs accessibility
**Outcome**: ✅ Differentiator

## Decision 8: Anonymised Benchmarking
**Date**: 2024
**Decision**: Opt-in AI Leadership Index with anonymisation
**Rationale**: Aggregate insights valuable, privacy critical
**Trade-off**: Reduced sample size vs ethical data use
**Outcome**: ✅ GDPR-compliant

## Decision 9: No Chat Interface
**Date**: Jan 2025
**Decision**: Remove AI chat, focus on structured diagnostic
**Rationale**: Chat didn't add value, felt like ChatGPT clone
**Trade-off**: Less "AI-powered" feel vs clearer positioning
**Outcome**: ✅ Stronger differentiation

## Decision 10: Minimal Animation
**Date**: Jan 2025
**Decision**: Restrained animations, no gratuitous motion
**Rationale**: Senior aesthetic, avoid "quiz app" feel
**Trade-off**: Less flashy vs more professional
**Outcome**: ✅ Matches brand

## Decision 11: Remove Pre-Results Contact Form
**Date**: Dec 2024
**Decision**: Remove contact collection form before results, collect via unlock form on results page
**Rationale**: Reduce friction in assessment flow, let users see value first
**Trade-off**: Delayed contact capture vs better completion rates
**Outcome**: ⏳ In progress

## Decision 12: Remove All Toast Notifications
**Date**: Dec 2024
**Decision**: Remove toast notifications throughout the application
**Rationale**: Toasts interrupt user flow, create anxiety, require dismissal action. CEOs shouldn't need to swipe away notifications.
**Trade-off**: Less explicit feedback vs cleaner experience
**Outcome**: ✅ Implemented - using inline UI feedback instead

## Decision 13: Mobile Viewport-Fit Design
**Date**: Dec 2024
**Decision**: All input screens must fit within viewport without scrolling
**Rationale**: Executive users shouldn't need to scroll during data input phases - reduces anxiety and improves completion rates
**Trade-off**: Denser UI on mobile vs no-scroll guarantee
**Outcome**: ✅ Implemented - using h-[100dvh] and flex layouts

## Decision 14: Monotonic Progress Bar
**Date**: Dec 2024
**Decision**: Progress bar must only move forward, never regress
**Rationale**: Regressing progress bars feel unprofessional and create uncertainty
**Trade-off**: Progress may not be 100% accurate vs professional feel
**Outcome**: ✅ Implemented - using displayProgress state with Math.max

## Decision 15: Results Value Before Unlock
**Date**: Dec 2024
**Decision**: Show dimension scores and risk signals before requiring account creation
**Rationale**: Users need to see value before being asked to unlock - increases conversion
**Trade-off**: Give away some value vs higher unlock rates
**Outcome**: ✅ Implemented - unlock form collapsed by default

## Decision 16: Vertex AI as Primary LLM
**Date**: Jan 2026
**Decision**: Switch primary AI model from OpenAI GPT-4o to Vertex AI (Gemini 2.0 Flash)
**Rationale**: Lower cost per request, competitive quality, Google Cloud integration. OpenAI retained as fallback.
**Trade-off**: Google Cloud dependency vs cost reduction and redundancy
**Outcome**: ✅ Implemented - 3-tier fallback (Vertex → OpenAI → static)

## Decision 17: Single ai-generate Function
**Date**: Jan 2026
**Decision**: Consolidate individual generation functions (insights, prompts, tensions, risks, scenarios) into a single `ai-generate` edge function
**Rationale**: Reduced latency (one LLM call vs five), lower cost, simpler orchestration
**Trade-off**: Larger single function vs simpler pipeline
**Outcome**: ✅ Implemented - one comprehensive generation call

## Decision 18: Memory Center with Voice-First
**Date**: Jan 2026
**Decision**: Build voice-first Memory Center for persistent leader context
**Rationale**: Executives prefer speaking over typing; persistent context enables increasingly personalised AI interactions
**Trade-off**: Development complexity vs long-term personalisation quality
**Outcome**: ✅ Implemented - encrypted storage, fact verification, privacy controls

## Decision 19: Missions System (First Moves Tracking)
**Date**: Feb 2026
**Decision**: Add Missions system for tracking commitment to diagnostic First Moves
**Rationale**: Assessment value diminishes without follow-through; missions create accountability
**Trade-off**: Ongoing engagement complexity vs retention and impact
**Outcome**: ✅ Implemented - commit, check-in, complete flow

## Decision 20: Progress Snapshots & Drift Detection
**Date**: Feb 2026
**Decision**: Implement progress tracking with periodic snapshots and drift scoring
**Rationale**: Leaders need to see how their AI literacy evolves over time
**Trade-off**: Additional data storage and computation vs demonstrable growth
**Outcome**: ✅ Implemented - snapshot generation, drift computation

## Decision 21: Lazy Loading All Pages
**Date**: Feb 2026
**Decision**: Lazy-load all 20 pages using React.lazy() with Suspense boundaries
**Rationale**: Improve initial load performance; most users only visit a few pages per session
**Trade-off**: Slight delay on first page navigation vs faster initial load
**Outcome**: ✅ Implemented in src/router.tsx

## Decision 22: Memory Encryption at Rest
**Date**: Jan 2026
**Decision**: Encrypt all memory content at rest using AES-256-GCM
**Rationale**: Memory contains sensitive business context; encryption is non-negotiable for executive trust
**Trade-off**: Performance overhead of encryption/decryption vs data security
**Outcome**: ✅ Implemented - server-side only, never client-side decryption

## Decision 23: Cognitive Frameworks in AI Prompts
**Date**: Jan 2026
**Decision**: Embed five cognitive frameworks (A/B Framing, Dialectical, WOOP, Reflective Equilibrium, First Principles) directly into ai-generate prompts
**Rationale**: Ensures AI outputs are grounded in established reasoning frameworks, not generic advice
**Trade-off**: Longer prompts and token usage vs higher quality, differentiated insights
**Outcome**: ✅ Implemented - all AI-generated content applies frameworks

## Decision 24: Rebrand from Mindmaker to CTRL
**Date**: Mar 2026
**Decision**: Rename the product from "Mindmaker" to "CTRL" across all user-facing surfaces
**Rationale**: CTRL positions the product around decision speed and executive control over AI strategy, aligning with the core value proposition of helping leaders take command of their AI-era leadership
**Trade-off**: Brand recognition reset vs stronger, more differentiated positioning
**Outcome**: ✅ Implemented

## Decision 25: Rebuild Briefing Personalization Around an Evidence-Based Lens (v2)
**Date**: Apr 2026
**Decision**: Replace the v1 briefing pipeline (flattened profile → templated queries → race-and-keep-one provider → LLM ranker-narrator) with a seven-stage evidence-based pipeline where every retained segment carries a `lens_item_id`, a `relevance_score`, and the specific `matched_profile_fact` that justifies inclusion.
**Rationale**: v1 asserted personalization in prose but couldn't prove it. A creator-economy user's briefing ran four consecutive off-topic stories (geopolitics, CIO100, fintech VC) because the LLM had nothing to anchor against. Auditable relevance is both a product feature (users see why each story was surfaced) and an engineering feature (the diagnose endpoint answers "why did this happen?" in one call).
**Trade-off**: Added 3 LLM hops + one embedding batch call per briefing (~5-8s more on cache miss) vs personalization that is legible, debuggable, and learnable.
**Outcome**: ✅ Shipped behind `BRIEFING_V2_ENABLED_DEFAULT` flag + per-user opt-in. ai_landscape briefings stay on v1 (they use synthetic headlines from AA benchmark data).

## Decision 26: Add pgvector for Embedding-Based Relevance (not LLM-asserted)
**Date**: Apr 2026
**Decision**: Enable the pgvector extension; embed candidate headlines and lens items with `text-embedding-3-small` (batched); score via cosine similarity × lens weight.
**Rationale**: Considered staying LLM-only (ask gpt-4o-mini to rank each candidate against each lens item), but that's opaque, slow at 50+ candidates, and doesn't compose well with dedupe. Embeddings give us real evidence (cosine score persisted on every segment), fast enough to do 45+ candidates in a single API call, and enable the semantic exclude filter ("kill geopolitics" = drop anything cosine >= 0.80).
**Trade-off**: New DB extension + ongoing embedding API cost (~$0.02 per 1M tokens, negligible at scale) vs opaque LLM-only ranking.
**Outcome**: ✅ pgvector enabled on remote; lens-item embeddings cached in `ai_response_cache` (7d TTL); candidate embeddings computed inline per briefing.

## Decision 27: First-Class `briefing_interests` Table, NOT user_memory Overload
**Date**: Apr 2026
**Decision**: Create a dedicated `briefing_interests` table for user-declared beats / entities / excludes rather than overloading `user_memory` with another `fact_category`.
**Rationale**: Interests are declared preferences with their own UX (Settings tab + inline Add buttons), lifecycle (soft-delete, source provenance: manual / seed_accepted / feedback_promoted), and weight semantics (1.0 with LLM floor at 0.8). `user_memory` is for AI-extracted facts with a different validation story. Mixing the two would complicate both systems.
**Trade-off**: One more table + CRUD surface vs clean separation of "things the AI extracted" from "things the user declared."
**Outcome**: ✅ Shipped with RLS self-only policies. Interests seed the lens at the top, outranking inferred signals.

## Decision 28: Signature-Based Persistent Negative Feedback (not lens-item-id)
**Date**: Apr 2026
**Decision**: Key `briefing_lens_feedback` on SHA-256 of `bucket|normalized_text`, NOT on the ephemeral `lens_item_id` that shows up on segments.
**Rationale**: Lens items are regenerated every day - `decision_0` today is a different decision tomorrow. Keying on the id means feedback evaporates overnight. Keying on the content signature means a user who Bans "geopolitics" keeps it banned forever, even as the lens rebuilds. The `bucket` coarsens lens types (decisions / missions / objectives / blockers all bucket to `goal`) so related profile items share fate.
**Trade-off**: Slightly more CPU per lens build (SHA-256 per item, batched via Promise.all) vs persistent, predictable user control.
**Outcome**: ✅ Applied in both cold and cached lens paths so kills take effect within one regeneration.

## Decision 29: In-Database Aggregator (plpgsql + pg_cron), Not HTTP Cron
**Date**: Apr 2026
**Decision**: Implement the nightly feedback aggregation as `sp_aggregate_briefing_feedback` plpgsql + a pg_cron schedule, rather than calling the `briefing-aggregate-feedback` edge function via `net.http_post`.
**Rationale**: The HTTP path requires storing the service-role JWT in Postgres (vault or a setting), adding blast-radius. The SQL function runs as `SECURITY DEFINER postgres`, owns its own query plan, and never touches a token. Faster (no HTTP roundtrip), simpler ops (one less secret), safer (no exposed key). The edge function stays for admin/ad-hoc invocation.
**Trade-off**: Maintained logic in two places (plpgsql + TypeScript) vs no service-role token exposure.
**Outcome**: ✅ Scheduled at 03:07 UTC daily. Dry-run on deploy returned zero buckets as expected (no v2 feedback in the wild yet).

## Decision 30: Mandatory Stripe Webhook Signature Verification + Idempotency Table
**Date**: Apr 2026 (Audit Week 1, PR #93)
**Decision**: Reject any Stripe webhook payload that does not validate against `STRIPE_WEBHOOK_SECRET`. Persist a row in a new `stripe_events_processed` table (PK = Stripe event id) for every successfully handled event; on replay, recognise and skip.
**Rationale**: Without signature verification, a leaked endpoint URL is a replay vector. Without idempotency, a webhook retried by Stripe (which is normal) can double-fulfill an entitlement upgrade. Both are silent revenue/trust bugs that surface at audit time.
**Trade-off**: One extra table + per-event row insert vs a buyer-trust risk we cannot afford.
**Outcome**: ✅ Shipped. E2E test `tests/stripe-webhook-idempotency.spec.ts` locks the contract.

## Decision 31: Codified Storage Bucket Policy for `ctrl-briefings`
**Date**: Apr 2026 (Audit Week 2, PR #94)
**Decision**: All briefing audio artifacts live in a dedicated `ctrl-briefings` Supabase Storage bucket with explicit object-level policies aligned to the `briefings` table RLS. No more shared/public bucket reliance.
**Rationale**: The previous implicit policy left an edge case where a stale audio URL could be re-fetched after the briefing row was deleted. Codifying the bucket prevents the data-after-deletion vector.
**Trade-off**: One more migration + ops awareness vs ambiguity around audio artifact lifecycle.
**Outcome**: ✅ Shipped via `20260424000001_ctrl_briefings_bucket.sql`.

## Decision 32: End-to-End Account Deletion (No Soft-Delete Hack)
**Date**: Apr 2026 (Audit Week 2, PR #94)
**Decision**: When a user deletes their account, remove all owned rows: Memory Web facts, briefings, audio artifacts, decisions, missions, assessments, dimension scores, insights, prompts, tensions, risk signals, scenarios, first moves, check-ins, progress snapshots, briefing interests, briefing feedback, briefing lens feedback, edge profiles, edge actions, edge feedback, edge subscriptions, index participant data. Audit Week 2 also closes the assessment data leak.
**Rationale**: "You own your data" cannot be a marketing line if a deletion leaves orphaned rows. Buyers asking about GDPR/CCPA equivalence get a verifiable answer.
**Trade-off**: Larger deletion path + more carefully ordered FK cleanup vs an honest privacy story.
**Outcome**: ✅ Shipped. E2E test `tests/account-deletion.spec.ts` verifies it end-to-end.

## Decision 33: `with-timeout` for Every External API Call
**Date**: Apr 2026 (Audit Week 4, PR #99)
**Decision**: Introduce `supabase/functions/_shared/with-timeout.ts` (with tests). Every call to Vertex AI, OpenAI, ElevenLabs, Perplexity, Tavily, Brave, Resend, and Stripe must wrap in this primitive: explicit timeout + bounded retry contract.
**Rationale**: A slow upstream (especially Perplexity) used to mean a 60-second briefing generation. Worst-case is now bounded.
**Trade-off**: Slightly more code per call vs predictable wall-clock behaviour.
**Outcome**: ✅ Shipped. Provider fan-out also gets a 12-second `Promise.allSettled` cap on top.

## Decision 34: Structured JSON Logger + CI Gate Against `console.log`
**Date**: Apr 2026 (Audit Week 5, PR #97)
**Decision**: All edge-function logging goes through `_shared/logger.ts` which emits `{ ts, level, fn, msg, userId, duration_ms, error }` JSON. CI fails any new edge-function code that uses raw `console.log` / `console.error`.
**Rationale**: Without structured logs, supporting an executive customer at 9pm means grepping unstructured strings. Per-user, per-function, per-duration querying is now trivial in Supabase logs.
**Trade-off**: One-time migration of existing logs vs a permanent observability dividend.
**Outcome**: ✅ Shipped. CI gate live.

## Decision 35: Lint Pragma: Block New Regressions, Accept ~1600 Existing Warnings
**Date**: Apr 2026 (Audit Week 6, PR #100, #101)
**Decision**: Treat the existing ~1600 ESLint warnings as accepted technical debt. CI runs ESLint only on PR-changed files, so new violations block but the historical surface doesn't ratchet to a green-field standard overnight.
**Rationale**: A "fix all 1600" sprint would dwarf the audit value. Blocking new regressions captures 95% of the upside without the rewrite.
**Trade-off**: Imperfect baseline vs shippable progress.
**Outcome**: ✅ Shipped. Reviewable in `.github/workflows/ci.yml`.

## Decision 36: AI Response Cache Table for Lens + Embedding Reuse
**Date**: Apr 2026 (Audit Week 6, PR #101)
**Decision**: A dedicated `ai_response_cache` table (`prompt_hash`, `model`, `response`, `expires_at`) backs the briefing lens cache (24h) and lens-item embedding cache (7d).
**Rationale**: Without caching, every briefing generation re-runs the lens reweight (gpt-4o-mini, ~1.5s) and re-embeds the lens items (text-embedding-3-small). At 100+ users a day this is a noticeable cost and latency hit.
**Trade-off**: One more table to manage vs ~1.5s per briefing + non-trivial embedding cost savings.
**Outcome**: ✅ Shipped via `20260426000001_create_ai_response_cache.sql`.

## Decision 37: E2E Tests First on Highest-Risk Paths (Not Coverage Maxing)
**Date**: Apr 2026 (Audit Week 6)
**Decision**: Write Playwright e2e specs that prove the riskiest contracts (auth journeys, briefing journey, briefing rate limits, sparse profile, account deletion, stripe webhook idempotency) before chasing broad unit-test coverage.
**Rationale**: 80% unit-test coverage on a feature that doesn't exist in production is theatre. 6 e2e specs that prove the parts of the product a leader would notice are bug-free is real.
**Trade-off**: Some breadth deferred vs tested confidence in the parts that matter.
**Outcome**: ✅ 6 e2e specs live (`tests/`). Vitest unit coverage remains light by design.

## Decision 38: Three Honest Tests Triage Gate Before Skill Generation
**Date**: May 2026 (Phase 8, PR #103)
**Decision**: The Skill Builder runs an LLM-driven triage gate BEFORE extraction. If the input is really a Memory Web fact, a Custom Instruction, or a Saved Style, we return `{ triage: { passed: false, result, reasoning } }` with no skill, route the leader to the right surface, and still log the attempt in `skill_exports` for analytics.
**Rationale**: Generic "AI workflow / automation / skill generator" tools generate something from any input. That destroys trust the first time a leader feeds them a one-off fact and gets back a malformed pseudo-skill. The triage gate is a respect-for-time signal: CTRL refuses to produce junk and tells the leader exactly where their input belongs instead. This is also the line that separates "another macro tool" from "a triage-aware piece of agent infrastructure" in the sales narrative.
**Trade-off**: ~2x LLM token cost per generation (triage call + extraction call combined, even though we currently run them in one JSON-mode call). One extra unhappy path (triage-failed UI) to design.
**Outcome**: ✅ Triage routing live. The "Three Honest Tests" phrase is now an asset in sales copy (see `SALES_BRIEF.md` "Triage You Can Trust" angle).

## Decision 39: agentskills.io ZIP Output, Not Saved Prompts
**Date**: May 2026 (Phase 8, PR #103)
**Decision**: The Skill Builder output is an agentskills.io-compliant ZIP (single root folder, `SKILL.md` + `references/` + `01-test-prompts.txt` + `02-maintenance-card.txt` + `03-install-guide.txt`) the leader drops into `~/.claude/skills/`. NOT a "save this prompt to your library" affordance.
**Rationale**: A saved prompt is dead context (the leader has to remember to paste it). An installed Agent Skill auto-triggers whenever the team's language matches, across Claude Code, Claude.ai, and Cursor. The leverage compounds without the leader doing anything. This also positions CTRL as a generator of real agent infrastructure, not a fancier prompt library.
**Trade-off**: Higher implementation cost (ZIP packaging, install guides per tool, quality gate to ensure the output is actually agent-deployable). The user has to know how to install a Claude Skill (we mitigate with the install guide inside every ZIP).
**Outcome**: ✅ Live. Differentiator vs. "saved prompts" tools is sharp and pitchable.

## Decision 40: Pain-Anchored Entry Points (Not a Standalone /context Trip)
**Date**: May 2026 (Phase 8, PR #105)
**Decision**: Surface "automate this" entry points on every page where a pain shows up: Edge view `AutomatePainCard` chip row of blockers + active decisions, zap button on Memory Web blocker cards, zap button on Briefing `decision_trigger` segments. Each entry point hands a `SkillSeed` via `location.state` to `/context`, which auto-opens `SkillCaptureSheet` pre-anchored.
**Rationale**: Discovery is a feature. A Skill Builder buried as the third card on `/context` would be used once a quarter. Entry points on every page where the pain shows up make it a weekly reflex. The seed also grounds extraction in the leader's actual pain language so the trigger phrases match how their team actually talks, not an LLM's abstract reconstruction.
**Trade-off**: Three new UI surfaces to maintain. Need a hook (`useUserPains`) that aggregates pains from Memory Web + decisions.
**Outcome**: ✅ Live. Sales narrative gained "pain-anchored" as a phrase and a proof point.

## Decision 41: Desktop-Native Shell with Command Palette
**Date**: May 2026 (Phase 8, PR #104)
**Decision**: Replace the stretched-mobile desktop layout with a unified desktop-native shell: `AuthedLayoutRoute` wrapping authenticated routes in `CommandPaletteProvider`, Cmd/Ctrl+K Command Palette, sticky top bar with page eyebrow + title + actions, optional right rail, refined sidebar with user footer + keyboard hints. Pages opt into palette actions via custom `mm:capture-voice` and `mm:generate-briefing` window events.
**Rationale**: Executive buyers judge desktop polish. The product was being demoed on desktop in every sales call, and the stretched-mobile feel undercut the premium positioning. Cmd+K is also the most pitchable desktop affordance in modern productivity software.
**Trade-off**: Mobile and desktop paths are now genuinely different (mobile preserved unchanged on Landing, Briefing, Dashboard). Higher maintenance cost.
**Outcome**: ✅ Live. The desktop demo experience now matches the rest of the product's premium bar.

## Decision 42: CTRL Six-App Rebuild (upgrade/ctrl/rebuild, 2026-05-30)
**Date**: 2026-05-30
**Decision**: Ship a coordinated rebuild across pricing, security, attribution, product-truth, and public-surface in a single release rather than separate incremental PRs. Five workstreams landed together:

1. **Pricing corrections**: Edge Pro repriced to $29/month (was $9). Full Diagnostic confirmed at $49. Deep Context Upgrade at $29. Bundle at $69. Stripe products and all documentation updated to reflect these figures. Existing $9 subscribers are grandfathered; all new checkouts are at $29.

2. **Security RLS fixes**: `leader_missions`, `leader_check_ins`, and `leader_progress_snapshots` now gate via `leaders.user_id` (join to the `leaders` table) rather than bare `leader_id`, closing a horizontal-access vector. `tts_config` RLS enabled. `resend-webhook` edge function now validates Resend webhook signatures before processing.

3. **Attribution emit path**: UTM params (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `agent`, `campaign_id`) captured first-touch on landing, persisted to `localStorage`, written into `auth.users.user_metadata` at signup, stamped onto Stripe checkout session metadata, and emitted as lifecycle events to the central MindmakerOS warehouse (`gojpffsrxybbpbdzzrvs`). The warehouse emit is dormant until `WAREHOUSE_INGEST_URL` is set; the wiring is live.

4. **Runtime product-truth source**: `https://ctrl.themindmaker.ai/.well-known/product.json` is now live as a machine-readable JSON document containing canonical pricing, ICP, and offer data. The MindmakerOS agent fleet fetches this endpoint rather than relying on static doc snapshots. This is the single source of truth for any agent that quotes CTRL pricing.

5. **Public-surface prerender**: Landing page and public routes are pre-rendered at build time (Vite SSR pass) so crawlers and AI agents scraping the domain see fully-rendered HTML. The `/.well-known/product.json` file is served as a standalone static artifact.

**Rationale**: Shipping these five workstreams together ensures internal consistency: the Stripe price, the product-truth JSON, the documentation, and the attribution wiring all point to the same figures on the same day. Staggering them would create a window where, for example, the product.json quoted $29 but the Stripe checkout still showed $9.
**Trade-off**: Larger coordinated release is harder to roll back than individual PRs. Mitigated by Stripe's grandfathering (no subscriber is harmed) and the dormant nature of the warehouse emit.
**Outcome**: ✅ Live on 2026-05-30. Pricing, security, attribution, product-truth, and prerender all consistent.
