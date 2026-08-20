# Decisions Log

Status: Reference

Key architectural and product decisions with rationale.

**Last reconciled:** 2026-08-20 (Decision 85 makes outward copy affirmational and sets the disclosure ladder; Decisions 82 to 84 hold the personal frame structurally).

> This is an append-only decision record. IDs are unique and never reused. Earlier framing may be superseded by a later decision; the current product and architecture sources are [`docs/current/`](../docs/current/README.md). Dated outcomes record what was true at that decision point, not the current release state.

---

## Decision 72: The Briefing Is One Premium Door with One Optional Learning Loop (2026-08-10)
**Date**: 2026-08-10
**Decision**: Make the audio briefing a signature one-click product surface. The header control shows honest briefing state, duration or progress, and opens or generates the real briefing without an intermediate workflow. The responsive briefing uses a 462px desktop drawer and a near-full-height mobile sheet, keeps playback and talk-back primary, and collapses detailed segment notes by default. At most one real pending memory verification appears per meaningful session. A correction can be spoken or typed, is mirrored back before persistence, and is written through the existing verified-memory path only after explicit confirmation, with a short undo window. Settings remains permanently reachable and exposes the existing privacy, memory, transcript, delivery, and tuning controls.
**Rationale**: The product serves overwhelmed leaders. Backend sophistication should appear as a calm, high-quality instrument rather than more destinations, forms, or duplicate training surfaces. Briefing playback earns the primary visual treatment; conversation and one high-value clarification enrich CTRL without interrupting consumption or turning the product into profile administration.
**Trade-off**: Lower-priority transcript detail and memory management are progressively disclosed, and the product asks fewer questions, in exchange for a clearer daily habit, higher trust, and cleaner signals when the user does contribute judgment.
**Founder lock**: Krish approved the fitted briefing direction, selected typography Option E, and then said `go` to port the approved interaction into the product.
**Outcome**: The real product shell now includes the premium briefing control and responsive sheet, existing briefing conversation pipeline, one-question verified-memory loop, permanent Settings access, and product-wide Option E tokens. Browser verification passed at 1280x720, 390x844, and 320x568 with zero horizontal overflow, 44px actions, keyboard Escape and focus restoration, correction proposal, keep, and undo states. Targeted ESLint, typecheck with zero current errors, focused conversation tests, standards, the 2,782-module production build, and 3/3 prerender routes pass. Commit, preview deployment, and production remain separate gates.

---

## Decision 71: CTRL Uses One Segoe Family for Its Human-Facing Voice (2026-08-10)
**Date**: 2026-08-10
**Decision**: Adopt Option E from `TYPOGRAPHY-COMBINATIONS-v1`. Use `Segoe UI Variable Display` for headings and display statements, and `Segoe UI Variable Text` for body copy, navigation, inputs and actions. These are optical cuts of one family, so hierarchy comes from scale, weight and spacing rather than a competing typeface. Reserve the system-mono token for evidence, state, timestamps and compact metadata. Keep the CTRL wordmark as a brand-mark exception. Existing Make Your Mind Up typography utility names remain migration aliases but resolve to this selected canon.
**Rationale**: The founder rejected both a serif and sans pairing and an all-serif system because the page felt visually divided or strange. Option E keeps the warmth and clarity of the preferred briefing treatment without asking two unrelated families to coexist. The display and text cuts provide enough hierarchy while preserving one visual grammar from onboarding through the briefing and into CTRL.
**Trade-off**: Less overt editorial contrast in exchange for stronger coherence, more reliable wrapping, broader native rendering, and a simpler system to carry across every surface.
**Founder lock**: After reviewing six controlled combinations with identical copy, spacing, color and hierarchy, Krish replied `e`.
**Outcome**: `BRIEFING-PULSE-v1` and the canonical product tokens now use the selected system. Browser verification passed at 1440x900, 1280x720, 390x844 and 320x568 with zero horizontal overflow, 44px actions, coherent dynamic memory states and empty console logs. Standards, production build and prerender pass. Commit, deployment and production remain separate gates.
**Supersedes**: Decision 70. Its reopened review note remains the historical record of why the serif canon was rejected.

---

## Decision 70: CTRL Uses the Editorial Serif as Its Complete Human Voice (2026-08-10)
**Date**: 2026-08-10
**Decision**: Lock one semantic typography hierarchy across Make Your Mind Up and CTRL. Georgia is the editorial voice for questions, explanations, recommendations, reflections, proposed memories and conversational actions. Inter/system sans is reserved for operational chrome such as navigation, Settings and utility controls. SF Mono or the system-mono token is reserved for evidence, state, timestamps and compact metadata. Do not use the serif as a headline accent directly paired with sans inside the same advisory thought.
**Rationale**: The warm serif in the audio briefing carried the human, curious quality the founder wanted to preserve from Make Your Mind Up. A headline-only application made it look pasted onto an Inter interface. Giving the serif ownership of the complete human voice makes the product feel intentional and continuous, while the sans and mono families retain clear operational jobs.
**Trade-off**: Tighter semantic discipline and less freedom to mix type for decoration, in exchange for a recognizable CTRL voice that stays coherent across onboarding, briefings, decisions and reflection.
**Founder lock**: Krish said, "I still feel like the fonts you used in the audio briefing 'your judgement stays in the loop' was a nice aesthetic, can you make that the canon?" He rejected the first headline-only pairing because the fonts did not work together visually; the locked rule therefore applies the serif to the full human-language surface, not headings alone.
**Outcome**: Canonical tokens and utility aliases are defined in `src/index.css`; `BRIEFING-PULSE-v1` applies the rule across the First Lens and audio briefing. Production build and prerender pass. Full app-surface adoption belongs to the implementation pass; commit, deployment and production remain separate gates.
**REOPENED REVIEW NOTE**: The founder rejected the full-serif application immediately after rendered review: "no, now it all looks weird. the entire font system looks totally off." Decision 70 is therefore not operative and no typography canon is currently locked. The provisional product tokens were removed. `TYPOGRAPHY-COMBINATIONS-v1` now presents six controlled systems for selection; the eventual founder choice must supersede this decision explicitly.

---

## Decision 69: The First CTRL Landing Proves the Make Your Mind Up Handoff with One Personal Lens (2026-08-10)
**Date**: 2026-08-10
**Decision**: Lock `HOME-FIRST-LENS-v3` as the first authenticated Home state after the public Make Your Mind Up flow. The state shows one premium relationship visual, reflects only the consented handoff fields (`q2`, `q4`, `anxietyLane`, and `archetypeTitle`), asks for one-tap confirmation, and offers one relevant starter decision. The user's raw delayed-decision sentence remains private and does not cross the handoff. Once confirmed or dismissed, the stable Home returns to its normal daily state.
**Rationale**: The clearer Attention Tape hierarchy was directionally right, but a text-first feed made the transition feel like a downgrade from personal reflection to an RSS reader. The stabilized CTRL visual language earns its place when it proves interpretation, not when it decorates equal-weight cards. The first landing should make the user feel that CTRL understood the useful shape of what they shared and immediately put it to work.
**Trade-off**: A distinct one-time Home state and a reusable lens renderer to maintain vs forcing the normal returning-user feed to carry an onboarding job it cannot honestly perform.
**Founder lock**: Krish reviewed the rendered desktop and mobile revision on 2026-08-10 and responded, "looks great".
**Outcome**: Approved for local implementation and preview verification. Production release remains a separate gate.

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
**Outcome**: ✅ Improved uptime

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
**Outcome**: ✅ 7 e2e specs live (`src/__tests__/e2e/`; the starter six plus `desktop-zero-scroll` added in Phase 10). Vitest unit coverage remains light by design.

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

1. **Pricing corrections**: Edge Pro repriced to $29/month (was $9). Full Diagnostic confirmed at $49. Deep Context Upgrade at $29. Bundle at $69. Stripe products and all documentation updated to reflect these figures. Existing $9 subscribers are grandfathered; all new checkouts are at $29. (Follow-on note, 2026-07-04: Edge Pro later moved to $49/month and the positioning shifted. The daily briefing, the Automator, Memory, Voice, and the Kit program are now free, and Edge Pro is the decision tier. See Decision 60.)

2. **Security RLS fixes**: `leader_missions`, `leader_check_ins`, and `leader_progress_snapshots` now gate via `leaders.user_id` (join to the `leaders` table) rather than bare `leader_id`, closing a horizontal-access vector. `tts_config` RLS enabled. `resend-webhook` edge function now validates Resend webhook signatures before processing.

3. **Attribution emit path**: UTM params (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `agent`, `campaign_id`) captured first-touch on landing, persisted to `localStorage`, written into `auth.users.user_metadata` at signup, stamped onto Stripe checkout session metadata, and emitted as lifecycle events to the central MindmakerOS warehouse (`gojpffsrxybbpbdzzrvs`). The warehouse emit is dormant until `WAREHOUSE_INGEST_URL` is set; the wiring is live.

4. **Runtime product-truth source**: `https://ctrl.themindmaker.ai/.well-known/product.json` is now live as a machine-readable JSON document containing canonical pricing, ICP, and offer data. The MindmakerOS agent fleet fetches this endpoint rather than relying on static doc snapshots. This is the single source of truth for any agent that quotes CTRL pricing.

5. **Public-surface prerender**: Landing page and public routes are pre-rendered at build time (Vite SSR pass) so crawlers and AI agents scraping the domain see fully-rendered HTML. The `/.well-known/product.json` file is served as a standalone static artifact.

**Rationale**: Shipping these five workstreams together ensures internal consistency: the Stripe price, the product-truth JSON, the documentation, and the attribution wiring all point to the same figures on the same day. Staggering them would create a window where, for example, the product.json quoted $29 but the Stripe checkout still showed $9.
**Trade-off**: Larger coordinated release is harder to roll back than individual PRs. Mitigated by Stripe's grandfathering (no subscriber is harmed) and the dormant nature of the warehouse emit.
**Outcome**: ✅ Live on 2026-05-30. Pricing, security, attribution, product-truth, and prerender all consistent.

## Decision 43: Kit Engine - Preset-Driven Class Follow-Up Portal (claude/kit-engine, PR #141, 2026-06-10)
**Date**: 2026-06-10
**Decision**: Ship the Kit Engine - a class follow-up portal a student reaches by scanning a QR after a Mindmaker live class, entering a session code with no login, answering a short 6-question intake, and receiving a personalised pack of installable artifacts. The kit page doubles as a journey page (7-day plan, "I shipped it", regenerate-with-feedback, context-capsule paste-back), with day-3 / day-7 email nudges. It replaces the static Google Docs follow-up that got 0% adoption. Success metric: the 7-day ship rate. Six load-bearing decisions:

1. **One preset-driven engine, not per-class code.** The runtime, data model, and UI are shared; the only thing that differs between classes is a preset in `supabase/functions/_shared/kit-presets/`, cross-imported by both the Deno edge runtime and the Vite client (same pattern as `_shared/edge-pricing.ts`). The DB stores only `class_slug` + `preset_version`. Adding a class is a new preset folder + a registry entry + one `kit_codes` row - not new code. Ships with two presets: `vibe-coding` (Vibe Coding Field Kit) and `autonomous-business` (Autonomous Business Pack).

2. **Anon-first, no-login entry.** Code entry starts an anonymous Supabase session (`ensureAnonSession`); the student gets their whole pack before being asked for anything. Email is asked once, at the "send my pack" moment, and `upgradeAnonymousSession` upgrades the account in place. Because an anonymous session has a real `auth.uid()` with role `authenticated`, owner-scoped RLS on the four student-facing kit tables works with no special anon policies.

3. **Base64-in-DB, not a Storage bucket.** Kit ZIPs are stored inline as base64 on the `kit_artifacts` row, not in a Supabase Storage bucket. Object-level RLS policies on `storage.objects` cannot be created via the Supabase Management API (the role does not own the relation), so a bucket would sit outside the way the rest of the schema is provisioned and secured. The artifacts are small and the row persists for the life of the redemption, so the pack stays downloadable forever. Same pattern as `free-skill-export`.

4. **Reuse the proven `generate-skill-export` pipeline.** `kit-compose` imports `generate-skill-export`'s prompt / quality-gate / zip modules exactly the way `free-skill-export` does, rather than standing up a parallel pipeline. The changes to existing code were additive only: the `track-event` event list was extended and one advisory quality-gate check (a "learning loop" section) was added. Almost no surgery on shipped code.

5. **30-day pass + 3-build quota, then Edge Pro at $29.** Redeeming a code grants a 30-day pass and a quota of 3 net-new builds on `kit_redemptions`, guarded by atomic `SECURITY DEFINER` RPCs (`redeem_kit_code` row-locks the code to survive a whole class redeeming at once and is idempotent; `consume_kit_skill` decrements the quota). The Edge Pro upsell ($29/month, canonical `_shared/edge-pricing.ts`) appears only post-trust - quota hit, pass expiry, or regenerate-after-expiry - and never gates what was already delivered. The funnel is free class → personal kit → Edge Pro / Workshop / Cohort. (Follow-on note, 2026-07-04: Edge Pro is now $49/month; see Decision 60.)

6. **Deploy the backend live, hold the routes behind the merge.** The six tables, the RPCs, the cron job, and all five edge functions were deployed against the production Supabase project and verified end to end on both presets (redeem, intake, real-LLM compose, ZIP download, journey, ship) before the four `/kit*` routes shipped. The deliberate split lets the go-live be a frontend merge, not a risky big-bang where backend and routes flip on at the same moment.

**Rationale**: The static Google Docs follow-up got 0% adoption - a link in an email nobody opened. A no-login portal the student reaches with a QR while still in the room, that hands back something they install and a 7-day plan to ship it, is the difference between a follow-up that's read and one that's used. The preset model keeps the cost of every future class near zero. Reusing the `/build` pipeline and the base64-in-DB pattern kept the engine almost entirely additive on top of code that was already hardened and live.
**Trade-off**: Preset content lives in code, so a new class still needs a (tiny) deploy rather than a pure DB edit. Base64-in-DB caps practical artifact size (fine here; the artifacts are small). Anon-first means an abandoned intake leaves an orphan anonymous session until cleanup.
**Outcome**: ✅ Backend deployed and verified live end to end on both presets against the production Supabase project; routes shipped behind the PR #141 merge on 2026-06-10. A long-kit-page mobile clipping bug (the portal not owning its own scroll under the app shell's `overflow: hidden`) was found and fixed during testing.

## Decision 44: Forced-Dark Instrument Cockpit - RETIRES the Light-Mode Brand (PR #186, 2026-06-16)
**Date**: 2026-06-16
**Decision**: Make the app globally forced dark and ship the ctrl-ds instrument design system as the only mode. `index.html` carries `class="dark"`; primary is emerald `#00D9B6` (`--primary 171 100% 43%`); the emerald "ctrl." wordmark replaces the old green Mindmaker logo everywhere. Rebuilt the mobile cockpit, decision spine, StoneRead, the brain four-world rope canvas, capture, and onboarding against the new system.

**SUPERSEDES the light-mode design decision.** Every prior decision and history note that asserts a "light mode" brand (warm off-white #faf9f7 / #faf9f7 backgrounds, deep ink text, pure white cards, the green Mindmaker logo) is hereby RETIRED. As of PR #186 the live app is NOT light mode, NOT warm off-white, NOT white cards, NOT the green logo. Any document still asserting that brand is wrong and should be corrected when next touched. (Specifically: the Phase 4 "light mode color system" design-system note in HISTORY.md and the old "Light mode design" line in the repo CLAUDE.md Key Conventions are both superseded by this decision; the CLAUDE.md line has been corrected to the forced-dark instrument brand.)

**Rationale**: The light brand had drifted and no longer read as an executive-grade instrument. The dark ctrl-ds palette with the emerald accent and the `ctrl.` wordmark gives the product a single, coherent, instrument-panel identity.
**Trade-off**: One forced mode (no light fallback) and a one-time rebuild of the core surfaces vs a coherent, single brand that cannot drift back into the old look.
**Honest caveats**: Residual green still lives in `index.html` OG / theme-color meta, the `tokens.css` `--mint` alias, and in `EdgeOnboarding` / `SampleResultsDialog`; these leftover references have not all been swept even though the live default everywhere a user goes is the forced-dark instrument brand.
**Honest backstory (recorded deliberately)**: This redesign was at one point falsely claimed "live" while production still served the old UI, and the founder's "it's still old" was deflected onto their browser cache. That was a trust breach. PR #186 (merge 1c01db5, 2026-06-16) is the real ship and was prod-verified with screenshots of the actual production surfaces before being called done. See Decision 47 and the HISTORY.md post-mortems.
**Outcome**: ✅ Live and prod-verified with screenshots, 2026-06-16. Globally dark, ctrl-ds instrument palette, emerald `ctrl.` wordmark.

## Decision 45: Brain Engine - Fact Graph with Derived Edges and Disabled Actions (PRs #153-164, #187-189)
**Date**: Jun 2026
**Decision**: Build the Brain engine on top of the Memory Web: facts become nodes in a four-world rope canvas, with a fact-to-fact edge graph, evidence tiers, reliable reaction numbers, and track-record depth ("limits" phases #187-189 on top of the brain canvas #153-164). Add `Strengthen` / `Fix` RPCs and migrations `20260615*_brain_*` + `20260616120000_memory_edges`.

**Rationale**: A flat fact pool can't show a leader where their AI double's knowledge reinforces itself, contradicts itself, or runs thin. Modelling facts as a graph with evidence tiers and a track record makes the brain's confidence honest and inspectable rather than asserted.
**Trade-off**: A graph view + evidence tiers + track-record depth is more surface to build and reason about than a flat list, accepted because the inspectability is the point.
**Honest caveats (must be disclosed, never hidden)**:
- The brain canvas `Strengthen` / `Fix` actions are **UI-disabled**: the buttons render but no backend RPC is wired behind them yet. They must not be presented as working.
- Brain edges are **derived, not stored**: fact-to-fact relationships are computed on read, not persisted as first-class rows. Deliberate current state, not a finished durable graph.
- **Number-heroes fall back to words-led** for thin current data: when there isn't enough current data to stand behind a numeric hero, the surface falls back to a words-led presentation rather than asserting a number it can't support.
**Outcome**: ✅ Shipped. Facts are a graph with edges, evidence tiers, and track-record depth, with the honest fallbacks and disabled actions noted above.

## Decision 46: Org-Chart Honesty Floor - A Flagged-Guardrail Box Can Never Be Agent-Led (PR #193, 2026-06-17)
**Date**: 2026-06-17
**Decision**: Add an honesty floor to the composed Agentic Org Chart: any box that touches a flagged guardrail can never be left agent-led in the composed output. This is a hard constraint on the composition itself, not a softer constraint on copy.

**Rationale**: The org-chart kit composes a recommendation for how much of each role can be agent-led. If a role touches a guardrail the leader flagged (something they explicitly said must stay human-governed), composing it as agent-led would be the kind of overstated, can't-stand-behind-it recommendation the product exists to refuse. The honesty floor encodes "lock the honesty of the signal before you ship the recommendation" directly into the composer.
**Trade-off**: The composer is slightly less aggressive about recommending automation (a guardrail box is held back from agent-led even where the rest of the signal points that way) vs a recommendation the leader can trust.
**Outcome**: ✅ Shipped in PR #193 (merge 090dda2) and prod-verified, 2026-06-17.

## Decision 47: Record the Kit-Intake Cascade Bug and the Redesign Trust Breach as Learnings (PR #193 / PR #186)
**Date**: 2026-06-17
**Decision**: Record two failures as durable learnings in the decisions log (not only in commit history), so the lessons survive.

**Learning A - the kit-intake cascade bug (fixed in PR #193, merge 090dda2).** From the forked-kit intake's launch until PR #193, the intake silently dropped the back half of EVERY kit's cascade for ALL users. A deferred single-select auto-advance closed over a stale `steps.length`, so once the cascade grew steps the auto-advance ran past the end and stopped early. Every org-chart build in `kit_builds` captured only `[boxes, pathway, profile, timeSink]`; `guardrails`, `grind`, `involves`, and `maturity` were never captured. Nothing errored, so it stayed hidden until the data was audited. Fixed by reading live refs (current step list + index) in `goNext` instead of a closed-over length.
- **The rule**: a `setTimeout` / deferred callback that closes over a length or list captured at setup time is a stale-closure trap; read live refs in the deferred path. A silent data-truncation bug is worse than a loud crash, because the corrupted data looks plausible.
- **Data caveat**: pre-#193 `kit_builds.intake` rows are TRUNCATED and must not be trusted.

**Learning B - the redesign trust breach (real ship in PR #186).** The forced-dark redesign was falsely claimed "live" while production still served the old UI, and the founder's "it's still old" was deflected onto their browser cache. That was a trust breach.
- **The rule**: "live" means a real production screenshot of the actual surface, never an assertion and never a cache excuse; treat "it's still old" as ground truth every time; verify your own work before calling it done. Lock the honesty of the signal before you ship.

**Outcome**: ✅ Recorded. Both are also written up as post-mortems in HISTORY.md.

## Decision 48: Home Is a Read-Back ("worth a look" deck) + 3 Value Actions, Not a Cryptic Signal Hero (PR #197, merge 7b5f0ef, 2026-06-17)
**Date**: 2026-06-17
**Decision**: Rebuild the mobile cockpit Home (behind `VITE_COCKPIT_ENABLED`) as a plain, time-aware greeting + the swipeable "worth a look" deck (`CockpitDeck`) + 3 value actions (Play my briefing -> `/briefing`, Run a decision -> `/decision`, Build a skill -> `/context`). Remove the cryptic "strongest signal" hero and the wall of identical AI-bets; the bets move to the Decisions case-picker.
**Rationale**: A founder review of live prod found Home did not feel like "I'm back": the single "strongest signal" hero read as cryptic and the AI-bets were a wall of sameness. A leader returning to the app needs a calm read-back of what's worth looking at and a small number of obvious next actions, not a jargon-heavy hero and a homogeneous bets wall. Bets belong where a leader is actually deciding (Decisions), not on the landing surface.
**Trade-off**: A rebuilt Home surface plus new deck plumbing vs a landing experience that reads as "I'm back" and routes the leader to the three things that matter. Bets are now one tap further away (in Decisions) for anyone who wanted them on Home.
**Outcome**: ✅ Shipped behind `VITE_COCKPIT_ENABLED` and prod-verified by screenshot. New `src/components/cockpit/CockpitDeck.tsx` + rewritten `CockpitHome.tsx`; `DeckCard` / `DeckCardKind` types + a `deck` field on `src/types/cockpit.ts`; `useCockpit` assembles the deck with no new backend.

## Decision 49: The Deck Is a Mix of Broad AI News + the Leader's Own Signals, and the Swipe Trains the Feed (PRs #197, #200)
**Date**: 2026-06-17
**Decision**: The "worth a look" deck mixes broad AI news (from the briefing pipeline's curated segments) with the leader's own signals (`decision_alerts`). Swipe heart = more-like-this, swipe skip = dismiss. The swipe persists and trains the feed: a swipe writes a `deck_reaction` JSON row to the existing `feedback` table (`page_context` `'cockpit-deck'`, no new migration), and `useCockpit` reads 30 days of dislikes and down-weights those news categories out of future decks.
**Rationale**: A deck of only the leader's own signals is thin, and a deck of only broad news is generic; mixing the two gives a read-back that is both relevant and fresh. The swipe is a natural, single-gesture training signal, so the feed should learn from it rather than treating it as throwaway. Reusing the existing `feedback` table (no new migration) keeps this as feed-training, NOT gratuitous on-page data collection - the only thing captured is the reaction that improves the next deck.
**Trade-off**: Reading 30 days of dislikes on each assembly + a category down-weight pass vs a deck that visibly improves the more the leader uses it. Reusing `feedback` overloads that table's purpose slightly vs avoiding a new migration.
**Outcome**: ✅ Deck mix shipped in PR #197 (merge 7b5f0ef); persisted training shipped in PR #200 (merge 387af84). Prod-verified by screenshot.

## Decision 50: Decision Map Is ONE Pinned Decision with Considerations on a Rail; Long-Press Contest Killed for a Quiet Flag (PR #198, merge 33fb818, 2026-06-17)
**Date**: 2026-06-17
**Decision**: Rebuild `src/pages/DecisionMap.tsx` around ONE pinned decision hero (star eyebrow + the decision statement + a "Change" affordance to swap it) with its considerations hanging off a connector rail and evidence one tap deeper (reusing `StoneRead` / `StoneDeeper`, unchanged). The "where it stands" status is descriptive, derived from the consideration tally (e.g. "Holding", "Checking", "Contested"), and is NEVER a recommendation. Kill the long-press `ContestLongPress` scroll-popup drawer and replace it with a quiet "Flag it" inside the opened stone plus a footer affordance (uses `useContestActions.openContest`). Empty state seeds role/sector starter decisions from `user_memory` identity/role; one tap navigates to Decide prefilled (`initialStatement` threaded through `DecisionPage` -> `PressureTestPanel`).
**Rationale**: The founder review found the map read as unrelated cards with a "something wrong?" drawer that popped on every scroll. A single pinned decision with considerations on a rail makes the structure legible (these considerations belong to this decision) instead of a pile of disconnected cards. A descriptive status is honest - the product must not dress up a tally as a recommendation it cannot stand behind. The scroll-popup drawer was an interruption; a quiet flag inside the stone keeps contest available without hijacking the scroll. Seeding starter decisions by role means an empty map is a first step, not a dead end.
**Trade-off**: One pinned decision at a time (the rest are reached via "Change") vs a clear, single-subject map. Reworking the contest gesture vs an interaction that no longer fights the user's scroll.
**Outcome**: ✅ Shipped and prod-verified by screenshot. Evidence reader and `useContestActions` reused unchanged.

## Decision 51: Automator Skill Unit Is a Recurring DELIVERABLE Built via an All-Recognition Pick-Cascade, Replacing the Vague "Hiring Challenge" (PR #199, merge 24f7d15, 2026-06-17)
**Date**: 2026-06-17
**Decision**: Make the Automator the default flow on `/context` (`ContextExport` modified) and define its skill unit as a concrete recurring deliverable, not an abstract challenge. Three screens: (1) Suggestions = recurring deliverables mined from the brain (`user_memory` blockers + decisions) with a "why we picked this" line and a "pulled from your brain" badge, a role/sector curated fallback when the brain is thin, and a clean inline "Something else" input (not a native `window.prompt`); never the vague "Hiring Challenge". (2) Cascade = a ~5-step all-recognition pick-cascade (how you do it now / inputs / voice / structure / guardrails) that shows real samples to PICK and never asks the leader to "describe your tone", reusing the kit cascade pattern. (3) Skill ready = "Built your way" chips + Run it now + Export as markdown + a "Your skills" library peek. `automatorModel.composeTranscript` maps the picks into a transcript for the existing `generate-skill-export` edge function (untouched).
**Rationale**: This is the retention hook - turning a recurring deliverable into a reusable skill is the thing that brings a leader back. The founder review found the old Automator suggested a vague, uncodifiable "Hiring Challenge"; a skill must be built from something concrete the leader actually produces on a recurring basis, mined from their own brain (with a role/sector fallback so the surface is never empty). An all-recognition cascade (pick, don't describe) is far lower-effort and higher-fidelity than asking a leader to articulate their tone or process from scratch; showing real samples to pick from is the same recognition-over-recall principle as the kit cascade. Reusing the untouched `generate-skill-export` function keeps the change additive.
**Trade-off**: A new three-screen flow + new hook (`useSkillSuggestions`) and components vs a retention hook grounded in real recurring work. The old `SkillCaptureSheet` / `SkillPreviewSheet` are now unimported dead code (left in place). "Run it now" downloads the skill; there is no in-app skill-runner yet.
**Outcome**: ✅ Shipped as the default `/context` flow and prod-verified by screenshot. New `src/components/automator/{AutomatorFlow,AutomatorSuggestions,AutomatorCascade,AutomatorSkillReady,automatorModel}` + `src/hooks/useSkillSuggestions.ts`.

## Decision 52: Brand Mark Is the Mindmaker Icon + ctrl-logo Lockup (BrandLockup), Replacing the Generated "ctrl." Text (PRs #197, #200)
**Date**: 2026-06-17
**Decision**: Replace the generated "ctrl." text wordmark with a `BrandLockup` (`src/components/landing/BrandLockup.tsx`) that pairs the Mindmaker icon (`mindmaker-icon.png`) with the `ctrl-logo.png` wordmark, on both mobile and desktop. Mobile lands in PR #197 (cockpit header); desktop lands in PR #200 (`DesktopShell` + memory-web `DesktopSidebar` + legacy dashboard `Sidebar`).
**Rationale**: The generated "ctrl." text was a placeholder-grade brand mark; an actual icon + wordmark lockup reads as an executive-grade product and keeps the brand consistent across every surface a leader sees. Putting the lockup behind a single `BrandLockup` component means the mark is defined once and reused on mobile and desktop rather than re-rendered ad hoc per shell.
**Trade-off**: A shared component to maintain plus image assets shipped in the bundle vs a consistent, real brand lockup everywhere instead of generated text.
**Outcome**: ✅ Mobile shipped in PR #197 (merge 7b5f0ef); desktop shipped in PR #200 (merge 387af84). Prod-verified by screenshot on `ctrl.themindmaker.ai`.

## Decision 53: Skill Builder Is Free For Now (Edge Pro Gate Removed) (PR #204, 2026-06-17)
**Date**: 2026-06-17
**Decision**: Remove the Edge Pro gate on `generate-skill-export` so any authenticated user, including anonymous kit sessions, can build skills. Strip the in-flight freemium-ladder WIP (`AutomatorTierBanner`, `useSkillBuildAccess`, `constants/skillTier.ts`, `_shared/skill-tier.ts`).
**Rationale**: The Skill Builder is the retention hook; gating it behind Edge Pro put the highest-leverage "aha" behind a paywall before a leader had felt the value, and the half-built freemium ladder added complexity without earning it. Letting everyone build a skill first (and gating the live MCP pull, not the build) prioritises proving value over capturing it early.
**Trade-off**: Forgoing direct Skill-Builder paywall revenue for now vs a wider top of funnel and a cleaner codebase; Edge Pro still gates the live MCP skills pull.
**Outcome**: ✅ Live. `generate-skill-export` deployed to prod open to any authenticated user; freemium-ladder code deleted.

## Decision 54: Unified Voice Profile + No Fabricated Voice Samples (PR #204, 2026-06-17)
**Date**: 2026-06-17
**Decision**: Store the leader's writing voice as a single `ctrl_voice_profile` fact in `user_memory` (`fact_category` 'preference', `fact_subtype` 'communication_style'), captured by `VoiceStyleProfileSheet` via 5 recognition picks OR a paste-extract power path (the new `extract-voice-profile` edge fn: paste real writing -> 8 voice dimensions in one LLM pass, anonymous-safe, no raw-text storage). Surface it into generated skills via `_shared/memory-context-builder.ts` and use it in the harness. The `generate-skill-export` prompt now injects a self-identified VOICE_PROFILE and FORBIDS fabricated voice samples: reproduce the leader's real sample verbatim, else describe the register, never invent a quote; the skill renders a structured 8-dimension `voice-profile.md`.
**Rationale**: Voice was inconsistent and re-asked per surface, and the harness could invent a quote the leader never wrote - exactly the kind of overstated, can't-stand-behind-it output the product exists to refuse. One source of truth for voice, derivable from real writing, plus a hard ban on fabricated samples, makes the voice honest and reusable. (A latent enum bug, `verification_status: 'confirmed'`, had been silently 400-ing every voice save; corrected to `'verified'`.)
**Trade-off**: A new fact shape, sheet, hook, types, and an extra edge function vs honest, reusable voice grounding instead of per-surface re-asks and invented samples.
**Outcome**: ✅ Live. Unified fact captured + surfaced + used; save enum bug fixed; deployed to prod.

## Decision 55: Every Generated Skill Requires a Learning-Loop Section (PR #204, 2026-06-17)
**Date**: 2026-06-17
**Decision**: Require a `## Learning loop` section in every generated skill, enforced by the quality gate. The `generate-skill-export` prompt now evaluates boundedness first, then runs the FOUR Honest Tests (Test 4 = voice-lock / consistent creative output). The quality gate now passes 16/16 (the learning-loop check was previously failing).
**Rationale**: A skill that only hands back a one-off output is a dead artifact; a learning-loop section teaches the leader how to keep improving the thing the skill produces, the same principle the Kit Engine packs already encode. Requiring it (not just suggesting it) is what makes it real. Checking boundedness before triage stops the harness wasting an extraction pass on an unbounded ask.
**Trade-off**: A stricter gate (skills must carry a learning loop) and a slightly longer prompt vs skills that compound rather than expire.
**Outcome**: ✅ Live. Quality gate 16/16; prompt tightened and deployed.

## Decision 56: Layered Skill Output - Library + Live MCP Pull + Download (PR #204, 2026-06-17)
**Date**: 2026-06-17
**Decision**: Make a built skill reach the leader three ways: the library (home), a live MCP pull, and per-item download. The `mcp-context` MCP server gained `list_skills` + `get_skill` (read scope, Edge-Pro gated like the rest of that server) so the leader's own agent pulls their built CTRL skills live; `src/components/library/LibraryTab.tsx` gained a "Connect these to your agent" MCP banner + a per-item Download(.md).
**Rationale**: A skill that only lives in the app is leverage the leader has to remember to go and get. Exposing skills over MCP means the leader's own agent pulls them live; a per-item download covers the offline / paste-into-tooling path. The three destinations together make the output portable instead of trapped in one surface.
**Trade-off**: Two new MCP tools + a library banner / download affordance to maintain vs skill output that is actually portable. The live MCP pull is the Edge-Pro-gated layer (the build itself is free).
**Outcome**: ✅ Live. `mcp-context` redeployed with `list_skills` / `get_skill`; LibraryTab banner + Download(.md) shipped.

## Decision 57: Warm-Start Suggestions Use "Your Peers Are Using This" Grounded in Role + Company, Never a Fabricated Cohort Count (PR #204, 2026-06-17)
**Date**: 2026-06-17
**Decision**: `useSkillSuggestions` leads curated deliverables with a confident "your peers are using this" voice grounded in role + company profile (sector, plus a best-effort `company_context` / Apollo industry read), and NEVER a fabricated cohort count; mined candidates keep their own grounded reason. The Automator suggestions screen gains an optional "Add your company site" affordance that fires `enrich-company-context` then re-mines.
**Rationale**: A confident, peer-anchored framing makes a cold suggestion feel earned, but only if it is honest - inventing a number ("used by 312 CEOs") is the kind of fabricated proof the product must refuse. Grounding the framing in the leader's real role + company (and offering to enrich it from their site) keeps the confidence without inventing data.
**Trade-off**: A best-effort company read + an enrich affordance vs warm, grounded suggestions instead of either a cold list or a fabricated cohort.
**Outcome**: ✅ Live. Warm-start framing + optional company-site enrich shipped.

## Decision 58: Kit Artifacts Stay in the Branded Voice, Not the Student's Voice (PR #204, 2026-06-17)
**Date**: 2026-06-17
**Decision**: Keep kit-pack artifacts in the branded (Mindmaker / CTRL) voice rather than rewriting them into the student's own voice. The unified voice profile carries over for the leader's OWN built skills (and `KitVoiceProfileCard` shows per-kit voice carry-over copy), but the class pack itself stays in the program's voice. The 4 kit intakes were audited and confirmed already at recognition parity (100% recognition picks, forked adaptive cascade, two-pane desktop). `AutomatePainCard` pain chips now show for everyone (no `isPaidUser` branching).
**Rationale**: A class follow-up pack is a branded teaching artifact; rewriting it into the student's voice would weaken its authority and muddy what the program said versus what the student would say. The voice profile belongs on the leader's own skills, where their voice is the point, not on the curriculum they were handed.
**Trade-off**: Two voice contexts to hold straight (branded for kit packs, the leader's own for their built skills) vs kit packs that keep their teaching authority while personal skills still sound like the leader.
**Outcome**: ✅ Live. Kit packs stay branded; voice carry-over surfaced per-kit via `KitVoiceProfileCard`; kit intakes confirmed at recognition parity.

## Decision 59: Onboarding → Decisions → Engagement Is One State-Adaptive Loop, Not Three Doors (PR #298, 2026-06-29)
**Date**: 2026-06-29
**Decision**: Collapse the entry and re-entry paths into a single loop driven by the leader's lifecycle state. `useCockpit` derives `userState` (new/dormant/active/power) → a `posture` (`guide` vs `partner`) on `CockpitData`. A `guide`-posture leader (new, dormant, or with no live decision) gets guidance + a `KickstartCard` that routes a real role-tailored starter decision (`src/lib/starterDecisions.ts`) into the engine pre-filled; a `partner`-posture leader gets fast triage. Onboarding became lightweight + inline (`InlineProfileSetup` + `useInlineProfile` writing industry/role to `user_memory` + interests via the reused `SeedBeatsPrompt`), rendered in the Home feed zone. A new `send-reactivation-nudge` edge function + daily cron emails NEW and DORMANT leaders into a first/next decision, de-duped on `leader_notification_prefs.reactivation_nudge_sent_at`. The legacy 40-minute voice `OnboardingInterview` (+ `DraftCockpit`, the `onboarding/steps/*` forms, `useOnboardingInterview`, the dead `useGuidedCapture` machine, `WelcomeTour`, `ProgressBar`), the `VITE_COCKPIT_ENABLED` fork, `legacyNav`, and both legacy `Mobile/DesktopMemoryDashboard` were DELETED. `EdgeOnboarding` was kept (still used by EdgeView).
**Rationale**: The three areas had drifted into patchwork. A newcomer's first experience hinged on a flag and a heavy voice interview; the onboarding→first-decision handoff was loose; and - worst - re-engagement (`decision-watch` → `send-daily-briefing`) only fired for a leader who ALREADY had decisions and had opted into daily email, so a leader who set CTRL up but never weighed a decision, or who lapsed, got zero pull-back forever. The cold-start trap closed only for the people who least needed it. Adapting posture to lifecycle state (and copy/lead to device mindset - mobile on-the-go, desktop deep-work) makes one continuous loop: lead a new/dormant leader in with one real decision, bring them back if they drift, and step out of the way once they're active.
**Trade-off**: A new lifecycle-state model + a reactivation cron + an inline onboarding component, plus deleting a large legacy surface (one home, no rollback fork), vs a single coherent loop with no duplicate homes and re-engagement that arms for every leader. Chose the clean collapse over keeping the flag as a rollback path, because the flag fork was itself the patchwork.
**Outcome**: ✅ Live. Typecheck/build green, 225 unit tests pass; reactivation fn deployed + dry-run verified + cron armed; live authed Playwright walk on desktop/tablet/mobile (fresh cold user) confirmed cold-start → inline onboarding → kickstart-led feed → `/decision` prefilled, with device-context copy. Backend (column, edge fn, cron) shipped to prod ahead of the frontend merge (additive, no dependency).

## Decision 60: Edge Pro to $49/month and Repositioned as the Decision Tier (Briefing Now Free) (2026-07-04)
**Date**: 2026-07-04
**Decision**: Move Edge Pro from $29/month to **$49/month** (canonical constant `EDGE_PRO_UNIT_AMOUNT_CENTS = 4900` in `supabase/functions/_shared/edge-pricing.ts`, surfaced via `src/constants/billing.ts`) and reposition the tier. Edge Pro is now **the decision tier, not the briefing tier**. The daily personalised briefing, the Automator (unlimited skill builds), Memory, Voice, and the Kit program are all **free**; the decision engine gives **3 free weighs per month** on the free tier. Edge Pro's value is: unlimited decision weighs, a multi-model cross-examination of every decision, decision watch (alerts when a load-bearing assumption weakens), Edge artifacts (board memos, strategy docs, emails, agendas), drafting, email delivery, and the live MCP pull of your built skills into any AI (`list_skills` / `get_skill`).
**Rationale**: The daily briefing, the Automator, Memory, and Voice are the daily habit and the on-ramp, so a leader should feel CTRL working for them every day without paying. Edge Pro earns its price on the one surface where depth compounds and general tools cannot follow: the decision engine. Pricing against that value ($49/month) rather than against the habit, while giving every leader a real taste of the engine (3 full weighs a month), is the honest demonstration that the paid depth is real. This SUPERSEDES the $29/month figure and the "Edge Pro gates the daily briefing / all briefing types" framing from Decision 42 (2026-05-30); the briefing is now free.
**Trade-off**: A higher monthly price against a narrower, deeper promise (the decision engine) vs a lower price that bundled the now-free briefing. Existing $9 and $29 subscribers are grandfathered; the $9 figure is never quoted publicly.
**Outcome**: ✅ Canonical in code (`EDGE_PRO_UNIT_AMOUNT_CENTS = 4900`) and in `docs/PRICING.md`; forward-facing docs swept to $49/month and the decision-tier positioning.

## Decision 61: Memory Corrections Persist as Signals, the Extractor Never Re-Infers a Rejected Value (2026-07-03)
**Date**: 2026-07-03
**Decision**: `verify_memory_fact`/`fix_memory_fact` now log `user_corrected`/`user_rejected`/`user_disputed` events into `memory_events` carrying the prior value (migration `20260703090000`), and `extract-user-context` is correction-aware via `_shared/correction-guard.ts`: recent corrections ride the extraction prompt, and a deterministic damping pass drops re-extractions of ruled-out values.
**Rationale**: The correction loop was a destructive overwrite, not a real loop - and worse, rejected facts left the dedup set once `is_current=false`, so they could silently re-insert on the next extraction pass. A leader correcting CTRL should see it stick.
**Trade-off**: A damping pass to maintain vs an extractor that keeps re-asserting facts the leader already ruled out.
**Outcome**: ✅ Live. Verify swipe flow shows an "I noted what I got wrong" beat after a correction; unit-tested.

## Decision 62: Every Completed Weigh Produces a Board-Ready One-Page Memo (2026-07-03)
**Date**: 2026-07-03
**Decision**: `buildDecisionMemo` (pure, unit-tested) assembles the real stored decision output - question, AI-native reframe, the call with confidence, what checks out / what's shaky, the breakpoint, the case against, tensions, validate-next, and a per-claim evidence appendix - into copyable markdown. No options section is fabricated; nullable fields on older rows are skipped rather than invented.
**Rationale**: A finished decision was locked in-app with no way to carry it to a board or a colleague. Assembling only from real stored fields (never inventing an options section the engine doesn't produce) keeps the export honest.
**Trade-off**: A pure formatting layer to maintain vs decisions that stay trapped in the app.
**Outcome**: ✅ Live. Quiet "Copy the memo" affordance on the result screen and the decision anatomy shelf.

## Decision 63: An Earned Capability Ladder Replaces Engagement-Only Progression (2026-07-03)
**Decision**: `src/lib/capabilityLadder.ts` derives four earned stages (getting oriented -> operating -> calibrating -> compounding) from observed behaviour only (facts checked, decisions weighed, commit-first calls, resolved outcomes, skills built, live MCP pull) - never points, streaks, or badges. `postureForStage` is exported as a behaviour-identical seam for later posture adoption.
**Rationale**: The app never composed its own signals into "where is this leader on the road to running AI-native." An honest progression beats an engagement gimmick, and a cold/thin-data state should say where the leader is rather than show a deflating 0/N.
**Trade-off**: A single shared scorer (`useCapabilitySignals`, no new tracking) to build and keep synced across the You tab and the Decisions -> History embed, vs a real earned-progress signal instead of vanity metrics.
**Outcome**: ✅ Live. Unit-tested; `CapabilityHeader` renders across all three data-richness states.

## Decision 64: Rebuild the Decisions Tab as a Radial Force Spider (2026-07-01)
**Date**: 2026-07-01
**Decision**: Replace the vertical claim "ladder" with a radial diagnostic: the decision anchored at the centre (confidence gauge), six fixed AI-native forces (Capability / Economics / Risk / Build-vs-buy / Team / Timing) spidering out at fixed positions, each captioned with the decision's specific concern and colour-coded by health.
**Rationale**: A ladder reads as a list to scroll, not a shape to read at a glance. A fixed radial layout lets a leader see where a decision is strong or weak in one look, and tap a force to interrogate it.
**Trade-off**: A new pure layout model (`decisionSpiderModel.ts`) + a ported radial SVG canvas vs a materially better at-a-glance diagnostic; old untagged claims are inferred into a force so nothing breaks.
**Outcome**: ✅ Live. A bundled demo decision renders in the empty state; old decisions degrade gracefully.

## Decision 65: Repair the Edge Pro Money Path (Async Webhook + a Webhook-Independent Fallback) (2026-07-04)
**Date**: 2026-07-04
**Decision**: Fix `stripe-webhook`'s use of the synchronous `constructEvent` (which throws in Supabase's async-only Web Crypto runtime, silently failing every signature verification) by switching to `constructEventAsync`, and add `verify-edge-subscription` (session-poll, idempotent, ownership-scoped) as a fallback so a delayed or missed webhook can no longer leave a paying leader unentitled.
**Rationale**: An audit found the Edge Pro purchase path had never once activated a subscription in production - the single most severe finding of that pass, since it means the paid tier could take a leader's money without ever unlocking it.
**Trade-off**: A second activation path to maintain vs a checkout flow that actually works.
**Outcome**: ✅ Live. Verified end to end with a signed synthetic webhook event; the entitlement row activates and the idempotency store records the event.

## Decision 66: Fix the Decision-Engine Reframe Under-Trigger, Sanitize LLM Output, Add an Eval Gate (2026-07-04)
**Date**: 2026-07-04
**Decision**: The AI-native classifier was counting the bare word "agent(s)" as an AI signal, so "hire two more support agents" (human agents) was mistaken for an already-AI-native decision and skipped the reframe it needed; added a human-agent guard. Also added `_shared/sanitize.ts` to strip em/en dashes from all model-generated user-facing text (the no-em-dash rule was enforced on source but not on LLM output), and wired a vitest job into CI as the decision-engine eval gate.
**Rationale**: These were trust-and-magic bugs found in a live audit: a decision that should have been reframed silently wasn't, and a generated recommendation could ship a banned character. Both erode the product's core promise (the reframe) and its house style rule.
**Trade-off**: A masking guard + an output sanitizer + a CI gate to maintain vs a decision engine that reliably reframes and never regresses on style.
**Outcome**: ✅ Live. Verified: "hire two more support agents" now reframes correctly; CI vitest job wired in.

## Decision 67: Instrument the North Star as a Measured Flywheel Metric (2026-07-04, founder-signed)
**Date**: 2026-07-04
**Decision**: The repo had no written, measured North Star (an audit finding). Founder-signed: the moat metric is the flywheel - a leader counts as a flywheel user the week they BOTH hold a real brain (5+ current facts in `user_memory`) AND weigh at least one decision. Instrumented via migration `20260704120000_north_star_flywheel.sql` (`north_star_flywheel` view, `north_star_daily` table + `snapshot_north_star()`, a daily pg_cron).
**Rationale**: Without a measured North Star, every other metric in this log and in OUTCOMES.md was a proxy with no way to tell if the product was actually compounding for a leader. The flywheel definition ties directly to the product's core mechanic (context in, judgment out) rather than an engagement vanity number.
**Trade-off**: A new schema object + daily cron to maintain vs an actual, falsifiable measure of whether the product works. Documented in `NORTH_STAR.md`.
**Outcome**: ✅ Live. Verified live at ship time: 10 brain-rich, 1 active decider, 6 weekly-active (baseline).

## Decision 68: Settings Sweep - One Door for Feed/Briefing Tuning, an Active-Decision Control Centre, a Design-System Cleanup (2026-07-04)
**Date**: 2026-07-04
**Decision**: Split `NewsPreferencesSheet` into a reusable `NewsPreferencesPanel` rendered both by the Home tuning drawer and directly in Settings, so a tune in one place shows in both (they previously wrote to two different tables and never synced); gave the track-record "active decision" cards Open/Strengthen/Archive wired to existing doors; fixed the track-record settings row navigating behind the still-open settings drawer; cleaned cliché AI-speak copy and off-token colours/emoji across Settings.
**Rationale**: Settings had drifted from the rest of the app's polish and had a genuine functional bug (two tuning UIs, two tables, no sync).
**Trade-off**: A shared panel component + new design primitives (`Surface`/`Eyebrow`/`SettingRow`/`SheetFooterBar`) to build vs eliminating a duplicate-source-of-truth bug and a broken navigation.
**Outcome**: ✅ Live. Typecheck 0 new errors, 337 unit tests pass, build + prerender green.

## Decision 73: One Product, One Domain, One Warm Front Door (2026-08-10)
**Date**: 2026-08-10
**Decision**: CTRL is the product; Make Your Mind Up is its warm public onboarding experience; `makeyourmindup.ai` is the canonical domain. The former CTRL hostname permanently redirects to it.
**Rationale**: Two names and two destinations made the user reconstruct the product boundary immediately after an intentionally simple intake. The data and experience are one journey.
**Trade-off**: Retire the separate onboarding product identity and move its domain versus preserve two independently legible products that duplicate context and navigation.
**Outcome**: Implemented across metadata, public copy, handoff, documentation, and the production cutover.

## Decision 74: First Lens Is the Onboarding Payoff; Blind Spot Replaces Skill Builder as the Promoted Development Surface (2026-08-10)
**Date**: 2026-08-10
**Decision**: A consented handoff lands on one premium First Lens and one useful first decision. Blind Spot becomes the promoted leadership-development experience. The Kit is retired and skill-building remains only as nested portability machinery where still useful.
**Rationale**: Overwhelmed leaders should not finish a calm onboarding flow and meet a feature grid, setup project, or workflow builder. One grounded reflection compounds judgement without asking the leader to design the tool.
**Trade-off**: Remove promotional surface area for already-built machinery versus preserve more visible features that make the product harder to understand.
**Outcome**: First Lens, Blind Spot, navigation, routes, copy, and plan matrix aligned. `/kit*` redirects to `/try`.

## Decision 75: One Curated Pool, with Control Center as a Read-Only Source Adapter (2026-08-10)
**Date**: 2026-08-10
**Decision**: Control Center contributes high-fit, source-backed items inside `live-headlines`; it does not create another feed. The bridge uses a publishable key constrained by read-only RLS, never a cross-project service-role key.
**Rationale**: CTRL already has ranking, clustering, provenance, category motifs, personalization, audio, and feedback. Duplicating any of those around Control Center would create competing truth and UI.
**Trade-off**: A deliberately narrow adapter and fail-closed boundary versus privileged server access and a broader but riskier integration.
**Outcome**: Production probe gathered 267 items, retained 211 AI-native items, and included 11 Control Center items. A forced prewarm produced a fresh 10-card cache.

## Decision 76: Audio Is a Conversational Product Surface, Not a Play Button (2026-08-10)
**Date**: 2026-08-10
**Decision**: The briefing has a premium persistent control, read and listen states, human error recovery, and spoken or typed follow-up answered from the current briefing with citations and voice response.
**Rationale**: Audio is the lowest-friction way for a busy leader to receive value. Treating it as plain text in the header undersold a signature capability and broke the human feeling inherited from Make Your Mind Up.
**Trade-off**: More state, accessibility, TTS, and ownership contracts to maintain versus a briefing users can genuinely converse with.
**Outcome**: Shipped with ownership checks on paid synthesis, rate limits, signed URL reuse, and responsive verified states.

## Decision 77: Delivery Must Converge on Retry and Cron Must Not Depend on a Hidden Service-Role Setting (2026-08-10)
**Date**: 2026-08-10
**Decision**: Normalize and deduplicate subscriptions and interests; claim emails and daily deliveries atomically; reuse audio; serialize Blind Spot confirmation; and authenticate pg_cron through a Vault-generated shared secret mirrored to Edge Function secrets.
**Rationale**: No-login delivery is a core product mode. Retries, concurrent tabs, and scheduler overlap cannot create duplicate sends or learning records. Production inspection also proved the legacy Postgres service-role setting was absent, leaving the old scheduler unable to authenticate.
**Trade-off**: More explicit claims, indexes, RPCs, and secret synchronization versus silent duplicate delivery or a scheduler that only appears armed.
**Outcome**: Additive migrations and fifteen reviewed functions deployed. Two repaired jobs are active, the Vault and Edge secret are synchronized, and live contract checks pass.

## Decision 78: Option E Is Applied Across the Product (2026-08-10)
**Date**: 2026-08-10
**Decision**: Operationalise Decision 71 across active product, pricing, email, generated share cards, prototypes, and design tokens. Use Segoe UI Variable Display and Text as optical cuts of one family. Reserve mono for compact evidence metadata.
**Rationale**: Mixed display, body, and monospace families made briefing questions, navigation, and learning prompts feel assembled rather than designed. One optical family preserves the human display character without visual conflict.
**Trade-off**: Give up more visibly eclectic font pairings versus a coherent, native, fast-loading product system.
**Outcome**: Applied across active app, pricing, email, generated share cards, prototypes, and design tokens.

## Decision 79: Blind Spot Is a Private Evidence Instrument, Not an AI Diagnosis (2026-08-11)
**Date**: 2026-08-11
**Decision**: Replace the long Make Your Mind Up result card with one CTRL trusted-advisor instrument. It leads with `Between us`, one direct `My read` headline of eight words or fewer, visible evidence strength, exact dated anchors, one tension relationship, one 15-minute experiment, `Not quite`, and a bounded voice or text advisor. A pattern requires one current verified intention and two independent recurrence records. Anything thinner is a tension, not a diagnosis. Confirmation reloads and requalifies every owner-scoped source before one atomic pattern, evidence-link, and experiment write. Rejection stores only a reason and evidence fingerprint and suppresses the unchanged read. The experiment returns once through the existing briefing learning slot; Memory remains the only history surface.
**Rationale**: The old surface was text-heavy, visually disconnected from CTRL, overly polite, and weak about why it had reached its conclusion. The product needs the candour of a trusted private advisor while making its evidence boundary obvious. Backend sophistication should create confidence and follow-through without adding another dashboard, score, or workflow.
**Trade-off**: More qualification, signing, ownership, persistence, expiry, and fixture machinery behind one screen in exchange for a simpler front end, honest evidence claims, safe correction, and one learning loop instead of duplicate features.
**Founder lock**: Krish explicitly approved `BLIND-SPOT-INSTRUMENT-v1` on 2026-08-11.
**Outcome**: Live from PR #366 at production source revision `0f20baf2437667c3719c94f1c16d04bb08b42023`. The migration and Edge Function v3 are deployed with owner-scoped RLS, service-role-only mutation RPCs, and JWT enforcement. The full 37-case Blind Spot suite passes on `makeyourmindup.ai` across the four approved viewports.

## Decision 80: Commercial Agents Use One Current Authority and Stop at the Action Boundary (2026-08-11)
**Date**: 2026-08-11
**Decision**: Consolidate the buyer, offer, proof, messaging, objections, and claim rules in `docs/current/commercial.md`, with `public/.well-known/product.json` as its machine-readable companion. Autonomous marketing and sales agents may research, qualify, plan, draft, and generate attributed links from those sources. Drafting never authorizes sending, publishing, discounts, contracts, or external system changes. Volatile facts are reverified at action time, unsupported proof is omitted, and superseded commercial files are historical only.
**Rationale**: A large set of plausible commercial briefs had become a hidden source of false confidence. They contradicted shipped Blind Spot evidence, overstated encryption and setup time, promised a precise Decision Watch cadence, and made a global claim about separate Mindmaker services. An agent needs less source material, clearer precedence, and an explicit authority boundary to be commercially useful without inventing certainty.
**Trade-off**: Retire several familiar briefs from the current authority path and require action-time verification for volatile claims in exchange for one coherent product story, defensible evidence, and safer autonomous operation.
**Outcome**: Current documentation, machine truth, agent instructions, public LLM guidance, indexes, and automated drift checks are aligned around the same contract.

## Decision 81: Company Recognition Is the Onboarding Payoff, Not Hidden Homework (2026-08-11)
**Date**: 2026-08-11
**Decision**: Restore the public onboarding's company-recognition moment as one truthful CTRL instrument. One optional field accepts a work email or LinkedIn profile. The backend resolves person and company context, checks fresh company-specific signals, deterministically rejects mismatches, clusters corroborating coverage, and returns at most three linked signals with visible source strength. The loading state names work in progress but claims no provider success. The result offers one primary `Yes, this is my world` action and one quiet correction. Only the confirmed, server-held dossier crosses the idempotent handoff into Memory. No-login result and daily briefings use those company signals before filling from the single shared curation pool.
**Rationale**: A generic future-memory result removed the surprising usefulness that made Make Your Mind Up feel intelligent. The oversized static loading mark also advertised waiting without revealing meaningful progress. The product should earn recognition through fresh, inspectable evidence while staying lighter than a profile form or research dashboard.
**Trade-off**: More provider orchestration, qualification, privacy documentation, failure handling, and handoff fields behind the same simple screen in exchange for a stronger first-value moment and materially better downstream context.
**Founder override**: Krish explicitly instructed autonomous implementation through merge after reviewing the diagnosis and desired magical company-recognition direction. This instruction is the scoped material-design approval for the release; no invented provider success, speculative company match, or unconfirmed Memory write is permitted.
**Outcome**: Live from PR #369 at production source revision `b5770194b4646302f47e36655e389f7ec2eb43f8`. The additive migration is recorded remotely as `20260812020209`; all six Edge Functions are ACTIVE at their released versions; the exact-SHA Vercel deployment is READY; and the four synthetic production onboarding journeys pass on `makeyourmindup.ai` across mobile, 320px, desktop, and reduced motion.

## Decision 82: CTRL Is a Private Thinking Instrument for One Person (2026-08-20)
**Date**: 2026-08-20
**Decision**: Hold CTRL's shape structurally rather than by positioning. Four boundaries become product contract: one person and one account with no seats, invites, or shared workspaces; no admin console, SSO, or company directory; no meeting recording; and the governing engineering rule that if an IT administrator has to approve it, we do not build it. That rule excludes Google Workspace, Microsoft Graph, workspace-level Slack, calendar read scopes, and anything with an admin consent screen. Delivery reaches the leader only through paths they control alone: email, downloads, clipboard, `.ics`, and read-only MCP running inside their own client. A team-access request is redirected to a Mindmaker engagement, never answered with seats.
**Rationale**: The enterprise conversation is triggered by the data class a user pours into the product, not by who pays for it. The moment a leader voices an unannounced acquisition, a churn number, or a judgement about a named colleague, CTRL holds confidential company information and third-party personal data, and their employment contract and IT policy bite regardless of marketing. A solo build cannot win a procurement process, and attempting enterprise-ready-lite legitimises the frame it is trying to escape. The absence of what enterprise needs is the only durable answer.
**Trade-off**: Permanently caps CTRL's account expansion and forecloses the integration surface most competitors lead with, in exchange for a product that never enters a procurement cycle and a category sentence a general counsel can accept without joining the call.
**Founder lock**: Krish selected the full product scope including the medium items on 2026-08-20, and separately ruled that outward copy carries no exclusion lists or negative framing.
**Outcome**: Boundaries written into `docs/current/product.md` and into a new `non_goals` block in `public/.well-known/product.json`. Not yet deployed; production remains a separate gate.

## Decision 83: Retention, Billing, and the Ops Sync Match What the Product Claims (2026-08-20)
**Date**: 2026-08-20
**Decision**: Close three gaps between shipped claims and shipped behaviour. Schedule `cleanup-expired-data` as the daily `retention-cleanup` pg_cron job and require the Vault-held `ctrl_cron_secret` or the service role key before it runs, since the endpoint previously accepted an unauthenticated POST that could force a retention sweep. Cancel any active Stripe subscription inside `delete-account` before the table cascade, without letting a billing failure block the erasure. Narrow the Google Sheets ops sync to aggregate counts and distributions, so one row is one metric and never one person.
**Rationale**: Settings offered a 30 or 90 day retention choice and the machinery behind it was complete and correct, but no schedule ever invoked it, so "memories older than N days will be automatically deleted" was false on the live surface. Account deletion left the Stripe subscription running, so a user who asked to be forgotten kept being charged and only a manual operator step fixed it. The ops sync exported full name, email, company, role, phone, and free-text business context for an operational convenience. A product whose case rests on trust cannot carry claims that outrun its code.
**Trade-off**: The ops sheet stops being a lead list and becomes a metrics surface, and the retention job now deletes data that previously survived by accident, in exchange for three claims that are true when a buyer checks them.
**Outcome**: `supabase/migrations/20260820120000_retention_cleanup_cron.sql`, the auth gate in `cleanup-expired-data`, the cancellation step in `delete-account`, and aggregate-only formatters in `sync-to-google-sheets`. ROPA activity L, the subprocessor register, and the data retention policy are reconciled. Migration not yet applied to production.

## Decision 84: Memory Holds Personal Data About Its User and Nobody Else (2026-08-20)
**Date**: 2026-08-20
**Decision**: Refuse another person's name at the Memory boundary. The extraction prompt instructs the model to refer to third parties by role and to skip any fact whose subject is not the speaker. A new pure `pseudonymiseThirdParties` transform in `guardrails-core.ts` runs before the reject pass on both write paths, rewriting a named person adjacent to a role into the role. The `third_party_identity` reject is widened to drop a fact whose subject is a bare named third party. A service-role `backfill-pseudonymise` function applies the same transform to rows already stored, re-encrypting the shadow payload so the removed name does not survive in ciphertext. Add a session-scoped off the record mode that writes nothing durable and says so, and a Blind Spot burn that deletes a confirmed pattern, its evidence links, and its experiment while keeping only the content-free anchor fingerprint.
**Rationale**: A leader who says "my CFO is not up to this" hands CTRL personal data about someone who does not know the product exists and cannot exercise any right over it. That was the cleanest legal exposure in the product and the largest part of any general-counsel conversation. Blind Spot separately stored a named, dated, evidenced record of a leader's weaknesses for the life of the account, and rejection only ever suppressed a candidate that had not been saved; the existence of the artifact was the threat, and there was no way to remove it. The guardrail layer was reject-only, so pseudonymisation required a real transform stage rather than a new rule.
**Trade-off**: More machinery on the write path, a backfill that rewrites stored rows, and a burn that lets a leader delete evidence a future read might have used, in exchange for a defensible answer about whose personal data is held and a Blind Spot a leader is not afraid to confirm.
**Outcome**: Shipped in `_shared/guardrails-core.ts`, `_shared/training-schema.ts`, `_shared/training-loader.ts`, `training/anchor.yaml`, `extract-user-context`, `memory-crud`, `blind-spot`, the new `backfill-pseudonymise` function, `supabase/migrations/20260820130000_blind_spot_burn.sql`, and `OffTheRecordContext`. Twenty-seven cases pass in `src/__tests__/training.test.ts`. The claim that CTRL holds personal data about its user and nobody else may not be published until the backfill is verified in production.

## Decision 85: Outward Copy Is Affirmational, and Disclosure Answers at the Altitude Asked (2026-08-20)
**Date**: 2026-08-20
**Decision**: Adopt one disclosure principle across every commercial surface: answer the question that was asked, at the altitude it was asked, then return to the value. Never pre-empt a trust topic, never evade one asked directly, always land back on value. Publish Tier 1 answers and the notebook test at `/faq`; keep Tier 2 and Tier 3, including the incident account and the security-questionnaire exit, in `docs/current/commercial.md` for use on request. Reorder `/trust` to open on the controls in place, keeping every absence, the incident, and the DPA gap on the page below. Public copy carries no exclusion list and no negative framing; the anti-consultant lines are retired because they collide with the engagement redirect.
**Rationale**: A pre-emptive disclosure opens a thread that then has to be held, and raising SOC 2 or a subprocessor register before a buyer does signals that we think it is a problem. A buyer who has to ask twice, though, stops believing the first answer, so evasion costs more than disclosure. Precise positive qualification filters exactly as hard as a list of exclusions and reads as confidence rather than defensiveness. The privacy of the product is a benefit and the reason a leader would use CTRL rather than a shared doc, so it belongs in the pitch rather than in a policy page.
**Trade-off**: Less pre-emptive reassurance for a security-minded visitor who never asks, in exchange for a front door that sells the product and a complete honest answer for anyone who digs.
**Founder lock**: Krish ruled on 2026-08-20 that outward copy is affirmational only with no exclusion block, that `/trust` is kept and reordered rather than removed, and that public copy is edited additively rather than rewritten.
**Outcome**: New `public/faq.html` with its `vercel.json` rewrite and sitemap entry, reordered `public/trust.html`, additive changes in `publicCopy.ts` rendered through `PublicFooter`, personal-email and personal-card lines at signup and checkout, public-information naming on the onboarding recognition card, and the ladder recorded in `docs/current/commercial.md` and `docs/agent-instructions/marketing-sales.md`.
