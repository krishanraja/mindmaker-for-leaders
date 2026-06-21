# History

Evolution of CTRL (originally Mindmaker) and major product pivots.

**Last Updated:** 2026-06-21

---

## Timeline

### Phase 1: AI Leadership Benchmark (Original)
**Period**: Early 2024
**Positioning**: "AI-led transformation" platform
**Features**:
- Quiz-based assessment
- AI Leadership Benchmark scoring
- Prompt library generation
- Generic AI coaching

**Issues**:
- Felt like "ChatGPT quiz wrapper"
- Unclear differentiation from free tools
- Hype-driven messaging alienated senior leaders
- No clear business model

---

### Phase 2: Dual Architecture Addition
**Period**: Mid 2024
**Changes**:
- Added V2 components alongside V1
- Created `LeadershipBenchmarkV2.tsx`, `PromptLibraryV2.tsx`
- Added voice assessment path
- Introduced deep profile questionnaire

**Issues**:
- Two architectures coexisting (prop-based vs DB-based)
- Conditional rendering caused stale UI
- Inconsistent user experience
- Technical debt accumulated

---

### Phase 3: AI Literacy Repositioning
**Period**: January 2025
**Changes**:
- Repositioned as "AI literacy for executive cognition"
- Removed V1 components entirely
- Unified architecture (DB-based only)
- Reframed copy (removed quiz/gamification language)
- Surfaced tensions, risks, scenarios
- Renamed "Prompt Library" to "Thinking Tools"

**Outcomes**:
- Single, coherent architecture
- Senior, professional tone
- Clear differentiation from alternatives
- Anti-fragile pipeline guarantees

---

### Phase 4: V3 Complete Rebuild (Current)
**Period**: January 2026
**Positioning**: "Apple-like, executive-grade AI literacy tool"

**Trigger**: User feedback indicated the application had become visually unacceptable:
> "This has become one of the WORST looking apps I've ever seen... I cannot put this in front of my dog let alone an enterprise CEO."

**Key Requirements**:
1. **Design System**: Match previous iteration (light mode, off-white backgrounds, ink text)
2. **Apple-Like Quality**: Must look like an Apple product - 10/10 visual quality
3. **Video Background**: Subtle overlay (12% opacity, desaturated)
4. **No-Scroll Mobile**: ENTIRE app must be no-scroll on mobile
5. **Executive Framer Motion**: Beautiful, world-class animations everywhere
6. **Adaptive Design**: Must work perfectly on all devices

**Technical Changes**:
- OpenAI Whisper integration for voice transcription
- OpenAI GPT-4o/GPT-4o-mini for insights
- Google Gemini as fallback
- Supabase Edge Functions (Deno)
- React with Framer Motion
- Tailwind CSS / Shadcn UI
- Mobile viewport utilities for no-scroll experience

**Design System Overhaul**:
- Light mode color system (warm off-white #faf9f7, deep ink #0e1a2b)
- Apple-like shadows (subtle, multi-layer)
- Generous spacing (p-8 sm:p-12 md:p-16 lg:p-20)
- Rounded corners (rounded-3xl for cards, rounded-2xl for buttons)
- System font stack (San Francisco, Segoe UI)

**Component Architecture**:
- Mobile dashboard with fixed header, scrollable content, bottom nav
- Bottom sheet pattern for overlays
- Floating voice button
- Hero status cards
- Priority card stacks

**Animation System**:
- Framer Motion throughout
- Spring physics (stiffness: 400, damping: 35)
- Fast animations (200-350ms)
- Subtle movements (24px max)
- SVG underline draw animations

**Mobile-First Architecture**:
- `--mobile-vh` CSS variable for accurate viewport
- No-scroll pattern for all pages
- Safe area insets for notches/home indicators
- Touch targets minimum 44x44px

**Outcomes**:
- Executive-grade visual quality
- Consistent Apple-like aesthetic
- No-scroll mobile experience
- Voice-first, mobile-first design
- Comprehensive motion system

---

### Phase 5: Memory Web & Portable AI Context + CTRL Rebrand
**Period**: February-March 2026
**Positioning**: "Clarity for Leaders" (rebranded from Mindmaker to CTRL)

**Trigger**: Recognition that the real value isn't the diagnostic. It's making every AI tool a leader uses dramatically better through portable context.

**Key Features Added**:
- **Memory Web**: Voice-first context extraction building a living knowledge base
- **Context Export**: One-click export to ChatGPT, Claude, Gemini, Cursor, Claude Code
- **Guided First Experience**: 3-question onboarding that delivers exportable context in 2 minutes
- **Pattern Detection**: AI surfaces strengths, blind spots, and behavioral preferences
- **Decision Tracking**: Records captured through Decision Advisor
- **AI Tools Hub (Think page)**: Decision Advisor, Meeting Prep, Prompt Coach, Stream of Consciousness
- **10X Skills Map**: Strength amplification and gap identification
- **Memory Health Dashboard**: AI Double health score, coverage visualization, fact grid

**Technical Changes**:
- 45+ Edge Functions (up from ~20)
- 30+ custom hooks
- Memory encryption (AES-256-GCM)
- Token-aware context building with budget management
- Memory lifecycle management (temperature system: hot/warm/cold)
- Google OAuth added alongside email auth
- Text input alternatives to all voice-only components

**Key Copy/Positioning**:
- Headline: "Talk. We learn. Every AI gets smarter."
- Subheadline: "Narrate your world and CTRL builds your personal Memory Web"
- CTA: "Get Started Free - 2 minutes to your first export"

**Outcomes**:
- Product shifted from assessment tool to context platform
- Immediate value delivery (2 min to first export vs. 10 min diagnostic)
- Portable context as primary differentiator
- Voice-first as interaction paradigm, not just an alternative input

---

## Major Pivots

### Pivot 1: From Implementation to Literacy
**Before**: "We help you implement AI in your organisation"
**After**: "We help you develop AI literacy to make better decisions"
**Rationale**: Leaders need mental models, not tools

### Pivot 2: From Quiz to Diagnostic
**Before**: "Take our AI leadership quiz!"
**After**: "Complete a 10-minute diagnostic"
**Rationale**: Senior leaders don't take quizzes

### Pivot 3: From Scores to Tensions
**Before**: Hero metric was benchmark score (0-100)
**After**: Hero content is tensions, risks, scenarios
**Rationale**: Leaders need to see gaps, not grades

### Pivot 4: From Prompts to Mental Models
**Before**: "Get AI prompts to use"
**After**: "Get thinking tools for daily decisions"
**Rationale**: Context matters more than templates

### Pivot 5: From Functional to Executive-Grade
**Before**: Functional but visually inconsistent
**After**: Apple-like, 10/10 visual quality
**Rationale**: CEOs judge products by appearance; visual quality signals credibility

### Pivot 6: From Scroll to No-Scroll
**Before**: Standard scrolling pages
**After**: Viewport-fit, no-scroll mobile experience
**Rationale**: Executive users expect polished, contained experiences

### Pivot 7: From Assessment to Portable AI Context
**Before**: "Take a 10-minute AI literacy diagnostic"
**After**: "Build a portable AI double in 2 minutes that makes every AI tool better"
**Rationale**: The real value is personalized AI interactions across all tools, not a one-time assessment score

### Pivot 8: From AI Tool to AI Infrastructure
**Before**: CTRL as another AI tool to learn
**After**: CTRL as the layer that makes every AI tool you already use better
**Rationale**: Leaders don't want another tool. They want their existing tools to work better.

### Pivot 9: From Mindmaker to CTRL
**Before**: "Mindmaker" - broad, abstract name suggesting AI mindset
**After**: "CTRL" - sharp, action-oriented name positioning around decision speed for leaders
**Rationale**: The rebrand to CTRL reflects the product's core value: giving leaders clarity and control over decisions in an AI-augmented world. "Clarity for Leaders" as tagline.

---

## Key Learnings

1. **Positioning is everything**: "AI literacy" resonates, "AI transformation" doesn't
2. **Senior UX matters**: Emojis and gamification alienate executives
3. **Architecture debt compounds**: Dual architecture caused cascading issues
4. **AI must be backstage**: Show outcomes, not "AI-powered" labels
5. **Evidence over generic**: Tie insights to specific user answers
6. **Visual quality is credibility**: CEOs judge products by appearance
7. **Mobile-first is mandatory**: Most executives check tools on mobile
8. **No-scroll is premium**: Contained experiences feel more polished
9. **Animations must be subtle**: Executive tools need restraint, not flash
10. **Design system consistency**: Every pixel matters at the executive level

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | Early 2024 | Initial AI Leadership Benchmark |
| 2.0 | Mid 2024 | Dual architecture with V2 components |
| 2.1 | Jan 2025 | AI Literacy repositioning, unified architecture |
| 3.0 | Jan 2026 | Complete rebuild with Apple-like design system |
| 4.0 | Feb-Mar 2026 | Memory Web, Context Export, Portable AI Double |
| 4.1 | Mar 2026 | Rebrand from Mindmaker to CTRL: "Clarity for Leaders" |
| 5.0 | Apr 2026 | Briefing v2: evidence-based relevance lens + pgvector + four-part learning loop (Interests, industry seeds, explicit kill, nightly aggregator) |
| 5.1 | Apr 2026 | Phase 7 - six audit-week tracks shipped: revenue path, data path, UX, reliability, observability, cleanup. Hardened production platform. |
| 5.2 | May 2026 | Phase 8 - Agent Skill Builder (voice-to-Claude-Skill pipeline, Edge Pro), world-class desktop UI redesign with Command Palette, pain-anchored Skill entry points on Edge / Memory / Briefing. |
| 5.3 | Jun 2026 | Phase 9 - Decision Engine (decompose → verify → cross-examine → advise, hourly WATCH re-verification), flag-gated Briefing streaming, cross-tenant RLS hotfix + audit infrastructure. |
| 5.4 | Jun 2026 | Phase 10 - every authenticated surface unified onto `DesktopShell` (viewport-pinned, zero-scroll), Goals tracking (`/goals`), inbound Enrich loop (`/enrich`), leaders RLS fix. |
| 5.5 | Jun 2026 | Phase 11 - Kit Engine: preset-driven class follow-up portal. No-login QR entry, anonymous compose, installable artifact packs, 7-day journey + ship metric, day-3/7 nudges. Replaces the 0%-adoption Google Docs follow-up. |
| 6.0 | Jun 2026 | Phase 12 - Redesign / forced-dark cockpit (PR #186, merge 1c01db5, 2026-06-16). Globally forced dark (index.html class="dark"), ctrl-ds instrument palette, emerald #00D9B6 primary, emerald "ctrl." wordmark replacing the old green Mindmaker logo everywhere. Rebuilt mobile cockpit, decision spine, StoneRead, brain four-world rope canvas, capture, onboarding. Prod-verified with screenshots. (Honest backstory: it had earlier been falsely claimed "live" while the app was still the old UI - #186 is the real ship.) |
| 6.1 | Jun 2026 | Phase 13 - Brain engine + limits edge-graph (PRs #153-164, #187-189). Fact-to-fact edge graph, Strengthen/Fix RPCs, reliable reaction numbers, evidence tiers, track-record depth. Migrations 20260615*_brain_* + 20260616120000_memory_edges. |
| 6.2 | Jun 2026 | Phase 14 - Kit Program: Agentic Org Chart kit (#190/#191), parity retrofit of all 3 existing kits to fork + pick-cascade + live picks-board (#192), PR #193 (merge 090dda2, 2026-06-17): cascade-bug fix (forked-kit intake silently dropped the back half of every kit's cascade since launch) + honesty floor on the composed org chart. |
| 6.3 | Jun 2026 | Phase 15 - Home / Decision Map / Automator UX redesign (PRs #197-200, 2026-06-17). Founder review of live prod rebuilt three surfaces against the ctrl-ds design floor: mobile Home is now a time-aware greeting + the swipeable "worth a look" deck + 3 value actions (bets moved to Decisions) (#197, merge 7b5f0ef); the Decision Map is one pinned decision with considerations on a rail (#198, merge 33fb818); the Automator turns a recurring deliverable into a reusable skill via an all-recognition pick-cascade (#199, merge 24f7d15); brand lockup + persisted deck-training follow-ups (#200, merge 387af84). |
| 6.4 | Jun 2026 | Phase 16 - Skill Builder intake + harness upgrade (PR #204, 2026-06-17). Skill Builder is now FREE for now (Edge Pro gate on `generate-skill-export` removed; freemium-ladder WIP stripped). `generate-skill-export` prompt tightened: boundedness check + FOUR Honest Tests (Test 4 = voice-lock), self-identified VOICE_PROFILE injected, fabricated voice samples forbidden, structured 8-dimension `voice-profile.md`, required `## Learning loop` section (quality gate now 16/16). New `extract-voice-profile` edge fn (paste writing -> 8 voice dimensions; anonymous-safe, no raw-text storage). Unified `ctrl_voice_profile` fact captured by `VoiceStyleProfileSheet`, surfaced via `_shared/memory-context-builder.ts` (voice-save enum bug fixed 'confirmed' -> 'verified'). Voice-aware Automator tone step + desktop two-pane `AutomatorScaffold`. Layered output: library + MCP (`mcp-context` `list_skills` / `get_skill`) + download. Warm-start peer suggestions grounded in role + company. 3 edge fns deployed to prod; no DB migrations. |
| 6.5 | Jun 2026 | Phase 17 - Kit Redesign (PRs #206-212, 2026-06-19, prod-verified). All 4 kits rebuilt under the law: strictly sequential, one action per screen, no-scroll on mobile, desktop-primary two-pane, humanity-first reflect-backs, outputs via two buttons only (Download / Copy), platform-agnostic (never hardcodes Claude). New flow: redeem -> adaptive intake cascade -> homework step (paste-your-AI context, folds into `kit-compose` via `memoryContext`) -> KitBuildTrace (driven by real `artifact_statuses`, no faked latency) -> KitRevealWizard (reveal -> what's-inside -> voice -> keep-it -> plan -> ship) -> hero PDF (`/kit/pdf`, `src/lib/kitPdf.ts`). `KitWhatsInside` = two buttons only. `src/components/kit/kitPrimitives.tsx` = shared brand primitives. Old `KitHome` reveal-scroll + `HomeworkCard` retired. All 4 kits live-verified on prod. |
| 6.6 | Jun 2026 | Phase 18 - Kit Email Branding (PR #213, 2026-06-19). `send-kit-pack` + `send-kit-nudges` now render Mindmaker-branded templates: Mindmaker icon + Inter + app-aligned hero consistent with the `ctrl-ds` palette. |
| 6.7 | Jun 2026 | Phase 19 - Main App Polish / AI-Native Enforcement (PRs #214-221, 2026-06-19/21, prod-verified). AI-native north star locked: every decision, headline, nudge, and suggestion is about making the business more AI-native; general-business inputs are reframed, never refused (PR #216). News deck cards gained one branded category motif image per news category (PR #215). No-scroll / one-ask law enforced across briefing, decision, goals, memory, context, settings, and profile surfaces (PRs #218-221). All surfaces conform: one action per screen on mobile, no window scroll on desktop. |

---

## Phase 6: Evidence-Based Briefing Pipeline (April 2026)

### Context

By Q1 2026 the Daily Briefing existed but was generic: a user profile got flattened into a single prompt, three news providers were raced (two always discarded), and an LLM was asked to both rank and narrate. Personalization was *asserted* in prose (`relevance_reason`) but never tied back to any specific profile fact. A creator-economy user's briefing shipped five wildly off-target headlines (data breach costs, geopolitical tensions, CIO100 Conference, African fintech VC) - a concrete failure case that exposed the systemic gap.

### The Rebuild

Replaced the entire personalisation path with an **evidence-based relevance pipeline**:

1. **Importance Lens** - explicit ranked profile items per (user, briefing_type, date), with cached LLM reweight
2. **Query Planner** - lens → targeted news queries
3. **Provider Merge** - Perplexity + Tavily + Brave in parallel with a 12s wall-clock cap
4. **Embedding Dedupe + Scoring** - pgvector + `text-embedding-3-small` (batched), cosine dedupe, relevance = `cos_sim × lens_weight`
5. **Budget-Constrained Curation** - word budget from training material, diversity and coverage rules
6. **Script Generation** - unchanged, kept the training_material voice pattern
7. **Audio Synthesis** - unchanged

Every segment now carries `lens_item_id`, `relevance_score`, and `matched_profile_fact`. Personalization went from prose-asserted to auditable.

### Four-Item Learning Loop

The pipeline alone wasn't enough; the profile itself was the bottleneck. Shipped four follow-on items:

1. **Diagnose** - `briefing-diagnose` edge function answers "why did this user get these headlines?" in one call.
2. **Briefing Interests** - new table + Settings tab; users declare beats (topics), entities (people/companies), excludes (never-show). Beats and entities prepend the lens at weight 1.0, clamped above 0.8 by the LLM reweight. Excludes post-filter the candidate pool within 0.80 cosine.
3. **Industry-aware seed beats** - `industry_beat_library` seeded with 11 industries × ~8 beats × ~5 entities; `SeedBeatsPrompt` proposes relevant seeds on cold-start via fuzzy-match on the user's declared industry. One tap to accept.
4. **Persistent semantic negative feedback** - explicit Ban button (writes `-1.0` delta) + nightly aggregator (`sp_aggregate_briefing_feedback` + pg_cron, 03:07 UTC) that promotes any lens signature with 3+ thumbs-down to a persistent `-0.4` delta. Signatures keyed on SHA-256 of `bucket|normalized_text` so feedback survives daily lens regeneration.

### UI Surfacing

Initially the new loop landed in `BriefingSheet` (the full-screen slide-up) and in the Settings tab. Users mostly interacted with the inline `BriefingCard` on the dashboard, which rendered segments with its own compact markup and missed the new affordances. A follow-up patch hoisted `SeedBeatsPrompt` onto the dashboard directly above the briefing card, added inline Bookmark + Ban + "Anchored to:" chips to `BriefingCard`'s segment rows, and promoted the Interests tab to position 3 in Settings.

### PRs

- PR #87 (merged 2026-04-19) - v2 pipeline + four items + cron
- PR #88 (merged 2026-04-19) - surfacing fix for the dashboard card

### Migrations Applied

- `20260418000000_briefing_v2_pgvector_schema` - pgvector extension, `briefings.schema_version`, `briefing_feedback` extension (`lens_item_id`, `dwell_ms`, `replayed`)
- `20260419000000_briefing_interests` - new table + RLS
- `20260419000001_industry_beat_library` - new table + seed data (11 industries)
- `20260419000002_briefing_lens_feedback` - new table
- `20260419000003_briefing_aggregate_feedback_cron` - SQL aggregator function + pg_cron schedule

---

## Phase 7: Six-Week Audit Hardening (April 2026)

### Context

By mid-April 2026, the product surface area had grown to 74 edge functions, 48 hooks, 97 migrations, and a multi-stage briefing pipeline. The shape was right; the edges were not all clean. A six-week audit-track program was committed, each week landing as its own PR with a clear thematic boundary.

### Week 1 - Revenue Path (PR #93, merged 2026-04-21)

**Shipped:**
- Mandatory Stripe webhook signature verification on `stripe-webhook` edge function. Unsigned/badly-signed payloads now reject with 400.
- Webhook idempotency via new `stripe_events_processed` table - replays of the same event ID are recognised and skipped.
- Briefing rate limits enforced via `_shared/rateLimit.ts` to prevent abuse and runaway cost.
- E2E test `tests/stripe-webhook-idempotency.spec.ts` proves the contract.

**Why it mattered:** A leaked or replayed Stripe webhook could double-charge a Pro subscriber. This is the kind of issue that surfaces at audit time and damages trust with executive buyers.

### Week 2 - Data Path (PR #94, merged 2026-04-22)

**Shipped:**
- Closed an assessment-data leak (specific issue redacted from public docs).
- Codified the storage bucket policy for `ctrl-briefings` (audio artifacts now have explicit RLS-aligned object policies).
- Completed end-to-end account deletion: removes Memory Web, briefings, audio artifacts, decisions, missions, assessments - verified in `tests/account-deletion.spec.ts`.

**Why it mattered:** Privacy claims must be backed by code. "Self-contained, encrypted at rest, fully deletable" is a sales anchor; this week made it provably true.

### Week 3 - UX (PR #95, merged 2026-04-22)

**Shipped:**
- Killed the onboarding gate that was blocking returning users on the dashboard.
- Fixed the NorthStar stub on the home view.
- Voice permission recovery flow when a user denies microphone access then changes their mind.
- Removed surveillance-y copy across the app.
- Removed every "coming soon" placeholder for unimplemented affordances. The product no longer advertises what it can't do.

**Why it mattered:** The product is sold to executives. Anything that feels half-finished erodes the premium positioning.

### Week 4 - Reliability (PR #99, merged 2026-04-23)

**Shipped:**
- New `_shared/with-timeout.ts` utility (with vitest coverage). Every external API call (Vertex, OpenAI, ElevenLabs, Perplexity, Tavily, Brave, Resend, Stripe) now wraps in a timeout + retry contract.
- Audio failure UX - if synthesis fails, the briefing card still shows segments + script.
- Onboarding stall recovery - users who closed the app mid-onboarding can resume cleanly.

**Why it mattered:** A 3-minute briefing that hangs for 60 seconds because Perplexity is slow is a credibility hit. The 12-second wall-clock cap on provider fan-out + per-call timeouts means worst-case behaviour is bounded.

### Week 5 - Observability (PR #97, merged 2026-04-23)

**Shipped:**
- Structured edge-function logger at `_shared/logger.ts`. JSON output: `{ ts, level, fn, msg, userId, duration_ms, error }`. Searchable in Supabase logs.
- CI gate prevents `console.log` regressions in edge functions.
- Tests for `with-timeout` to lock the retry contract.

**Why it mattered:** When a leader emails saying "my briefing is broken," we can find the request in seconds, see the exact failure path, and fix it the same day.

### Week 6 - Cleanup + e2e starter (PR #98, #100, #101, merged 2026-04-24 → 2026-04-26)

**Shipped:**
- P2 backlog closure across UX, copy, and minor inconsistencies.
- E2E test contract starter: 6 Playwright specs covering the highest-risk paths (auth, briefing journey, briefing rate limits, sparse profile, account deletion, stripe idempotency).
- New `ai_response_cache` table + 4 more end-to-end contracts.
- Lint cleanup (kept ~1600 pre-existing warnings as accepted debt; new violations now blocked at CI).

**Why it mattered:** The remaining "I'll fix it later" items had been later for too long. Closing them out cleared the runway for the next product expansion.

### Outcomes from Phase 7

- 6 thematic PRs merged in April 2026
- 6 e2e specs covering the riskiest user paths
- 0 known revenue-path bugs
- 0 known data-leak vectors
- Structured logs in production, queryable per user / function / duration
- This is the version sales/marketing AI agents can confidently sell - not "we plan to harden it" but "the audit is shipped and the tests prove it."

---

## Phase 8: Agent Skill Builder + Desktop Redesign (May 2026)

### Context

By the end of Phase 7 the product was hardened but still single-loop: Memory Web feeds Context Export, Context Export feeds AI tools, AI tools accelerate decisions. The Briefing closed the daily loop. But the *weekly* loop - the leader's recurring rituals (Monday board update, Friday hiring sync, monthly investor update, RFP triage) - was still re-typed from a blank prompt every time, even by leaders with a rich Memory Web. The next leverage move was obvious: convert one weekly workflow into a permanent, downloadable Claude Skill the leader installs once and forgets.

Separately, the desktop experience had drifted into "stretched mobile markup" and started to feel below the executive-grade bar set by the rest of the product. Executive buyers judge by surface polish, and the desktop shell was the surface most demoed in sales calls.

Phase 8 shipped both: the Agent Skill Builder and a desktop UI redesign.

### Sub-track 1 - Agent Skill Builder (PR #103, merged 2026-05-04)

**What shipped:**

- New edge function `generate-skill-export` (Edge Pro gated) implementing the full pipeline: Edge Pro gate → memory context build (3000 tokens) → triage LLM call (Three Honest Tests) → quality-gate validation → ZIP packaging → `skill_exports` insert.
- The Three Honest Tests triage gate decides whether the input is really a skill, a Memory Web fact, a Custom Instruction, or a Saved Style. Triage failures route the input to the right surface and are still logged in `skill_exports` for analytics.
- Quality gate enforces: 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections, no bare MUST/NEVER, valid name format. Only the name-format check is a hard fail; everything else is advisory and surfaced to the user.
- ZIP packaging follows the **agentskills.io standard**: single root folder, `SKILL.md` + `references/` + `01-test-prompts.txt` + `02-maintenance-card.txt` + `03-install-guide.txt`.
- New `skill_exports` table (migration `20260508000000_create_skill_exports.sql`): per-user log of every generation attempt including failed-triage cases, with RLS, archetype tagging, and quality-gate snapshot.
- Frontend: `SkillExportCard` on Step 1 of `/context` (promoted above the Custom Voice card), `SkillCaptureSheet` (voice up to 5 min or text, 20-char minimum, mobile bottom sheet / desktop dialog), `SkillPreviewSheet` (description, download CTA, quality-gate checklist, test prompts with copy buttons, install guide accordion for Claude Code / Claude.ai / Cursor, collapsible SKILL.md preview).
- New hook `useSkillExport` wraps the edge function and decodes the base64 ZIP into a downloadable Blob.

**Why it mattered:** The product moved from "make every AI conversation faster" to "make every AI conversation faster AND turn your weekly rituals into permanent agent infrastructure." The Three Honest Tests gate was the differentiator vs. generic macro / automation tools: most generate something from any input; CTRL refuses to generate junk and routes the leader to the right surface instead.

### Sub-track 2 - World-Class Desktop Redesign (PR #104, merged 2026-05-06)

**What shipped:**

Desktop now uses a unified, desktop-native shell instead of stretched mobile markup. New primitives:

- **`AuthedLayoutRoute`** wraps authenticated routes in `CommandPaletteProvider`.
- **Command Palette** - global Cmd/Ctrl+K launcher. Pages opt into actions via custom `mm:capture-voice` and `mm:generate-briefing` window events.
- **Refined sidebar** with user footer + keyboard hints.
- **Sticky top bar** with page eyebrow + title + actions.
- **Optional right rail** for context that pages opt into.

Pages reworked:

- **Landing** - bold asymmetric hero with animated Memory Web preview, sticky top nav with section anchors, multi-section scroll (how it works, three pillars, briefing teaser, privacy), final CTA. Mobile keeps the swipeable three-card experience.
- **Dashboard (Memory Web)** - three-pane layout: rail nav, main canvas with big visualization + denser 3/4-column facts grid + pattern columns, right rail with today's briefing slot, quick actions, coverage bars, activity.
- **Briefing** - brand-new desktop layout with hero player area, voice-steer bar, custom briefings strip, and a side rail for interests, suggestions, and weekly history. Mobile path preserved.
- **Export wizard** - side rail shows step progress, current selection, and a contextual pro tip; wider main column for breathing room.

**Why it mattered:** Executive buyers judge desktop polish; this closed the gap.

### Sub-track 3 - Pain-Anchored Skill Entry Points (PR #105, merged 2026-05-09)

**What shipped:**

Skill creation became a reflex on the page where the pain shows up, not a generic trip to `/context`:

- **`AutomatePainCard`** on Edge view - chip row of declared blockers + active decisions.
- **Zap button** on Memory Web blocker cards.
- **Zap button** on `BriefingCard` `decision_trigger` segments (v1 + v2).

All four entry points hand a `SkillSeed` (`{ kind, text }`) to the Skill Builder via `location.state` to `/context`, which auto-opens `SkillCaptureSheet` pre-anchored. The LLM grounds extraction in the leader's actual words.

Sheet upgrades:
- Pain picker chip row when no seed is provided (top 5 from `useUserPains`).
- Curated example chips fallback when the leader has no declared pains yet (Monday board update, Weekly hiring sync, RFP triage, Investor update).
- Seed banner + pre-filled scaffold so the user only fills in the steps.

Edge function changes:
- Accept optional `seed { kind, text }` in body and forward to the LLM prompt.
- Prompt anchors extraction in the seed pain when present so the trigger language matches the leader's actual words instead of an abstract trigger.

Discovery + copy fixes:
- `SkillExportCard` CTA: "Create Agent Skill" → "Automate a weekly pain".
- `/context` Step 1: `SkillExportCard` promoted above the Custom Voice card.
- "Custom via Voice" renamed to "Custom context export" (was misleadingly claiming to produce a skill).

New hook: **`useUserPains`** returns the top N blockers + active decisions from the leader's Memory Web for seeding entry points.

**Why it mattered:** Discoverability is a feature. A Skill Builder buried on `/context` would have been used once a quarter; entry points on every page where the pain shows up make it a weekly habit.

### Sub-track 4 - Contrast + Scroll Polish (PR #106, merged 2026-05-11)

**What shipped:**

- Solid /15 tints and visible borders on `GapPill`, `StrengthPill`, `AutomatePainCard` chips, and `SkillCaptureSheet` seed banner + pain picker so warm pills are legible in both modes.
- Dropped `text-foreground` from the active-seed banner so seed text inherits the orange/blue/emerald tone and stops rendering white on tan in dark mode.
- `pb-44` + `data-edge-scroll` on the Dashboard Edge mobile scroller so the quick-action row clears the floating mic FAB.
- Save and restore dashboard scroll position around `SkillCaptureSheet` so closing the sheet doesn't leave the page in an unrelated spot.
- Pinned the Pro teaser preview to `h-24` with absolute children so its 5-second content swap stops nudging surrounding layout.
- New hook **`useRevealOnMount`** smoothly reveals `SmartProbeCard` and `AutomatePainCard` when they mount below the fold.

**Why it mattered:** The Skill Builder UX surfaced contrast and scroll-restoration issues that existed pre-Phase-8 but weren't visible until the warm pill ecosystem expanded.

### Outcomes from Phase 8

- 4 PRs merged: #103 (Skill Builder), #104 (desktop redesign), #105 (pain-anchored entry points), #106 (contrast + scroll polish)
- 1 new edge function (`generate-skill-export`, 4 internal files, 1035 LOC)
- 3 new hooks (`useSkillExport`, `useUserPains`, `useRevealOnMount`) - total now 51
- 1 new migration (`20260508000000_create_skill_exports.sql`) - total now 98
- 5 new components in `src/components/edge/` for the Skill Builder UX + 1 in `src/components/memory-web/`
- Desktop now feels like a desktop product, not stretched mobile markup


---

## Phase 9: Decision Engine + Briefing Streaming + Tenant Hardening (June 2026)

### Context

By the end of Phase 8, CTRL could capture context, export it, brief on it, and turn rituals into Skills. The one thing it could not do was *pressure-test a decision* and keep watching it. A leader's hardest moments are not "what do I know" but "is this call right, and is it still right next week." That is the gap Phase 9 closed.

### Sub-track 1 - Decision Engine (PRs #122, #124)

A new edge function `decision-engine` orchestrates a four-stage pipeline - decompose → verify (web-grounded claims) → cross-examine → advise - that runs in the background via `EdgeRuntime.waitUntil` and advances `decision_cases.stage`, so the frontend renders each stage as it lands (the same streaming pattern the Briefing uses). `decision-watch` is an hourly pg_cron WATCH loop that re-verifies the load-bearing, web-checkable claims behind active decisions and raises an idempotent `decision_alert` when a verdict flips or confidence drops materially (surfaced in the Daily Briefing) - making a decision a living object instead of a one-shot answer. `decision-eval` is an admin-only single-claim calibration harness that exercises the exact live verify path. Seven new RLS owner-scoped tables (`decision_cases`, `decision_claims`, `decision_evidence`, `decision_tensions`, `decision_alerts`, `decision_events`, `decision_eval_cases`) and two hooks (`useDecisionEngine`, `useDecisionInbox`). Surfaced at `/decision` via `PressureTestPanel`. Migration `20260602000000_decision_engine.sql`.

### Sub-track 2 - Briefing streaming v2 (PRs #117-#120)

Flag-gated (`FF.briefingStream`, `?ff_stream=1`) streaming preview. `generate-briefing` early-inserts candidate headlines (null `script_text`) before curation, and `useBriefingStreamPreview` + `StreamingBriefingPreview` poll and surface preliminary segments while the briefing generates. Adds the `src/lib/flags.ts` feature-flag layer, a landing `VoiceDemo`, and an export `BroadcastBar`.

### Sub-track 3 - Tenant hardening (PR #125)

Closed a cross-tenant read path (`20260601230000_fix_cross_tenant_rls_leak.sql`, applied to prod 2026-06-02), added audit infrastructure for SOC 2 (CC7.2) / GDPR (Art. 30) (`20260602000000_create_audit_infrastructure.sql`) backing the `/compliance` page and `delete-account`, and closed `ALL` / `USING(true)` write-holes on shared system tables (`20260602000100_scope_system_table_writes.sql`).

### Also shipped

- **Attribution lifecycle tracking** (`track-event`): an unauthenticated emit proxy for client lifecycle events (`landed` | `signed_up` | `activated`) that forwards to the central warehouse via the server-held `ATTRIBUTION_INGEST_SECRET`; dormant until the warehouse env is configured; deployed `--no-verify-jwt`.
- **Self-serve onboarding** (PR #126): replaced the `OnboardingWizard` with a `WelcomeTour` + `Coachmark` flow; new `useOnceFlag` hook.

---

## Phase 10: Desktop Shell Unification + Goals + Enrich Loop (June 2026)

### Context

The Phase 8 desktop redesign proved the `DesktopShell` pattern on the core surfaces, but several routes were still stretched mobile markup, and the window could scroll on desktop - the one thing an executive-grade shell should never do. Phase 10 finished the job and added two long-pending capture loops.

### What shipped (PRs #130-#139)

- **DesktopShell everywhere**: Dashboard, Memory, Context, Briefing, Decision, Goals, Enrich, Settings, Compliance, and Profile now all wear the same shell (sidebar + sticky top bar + optional right rail), and the app is viewport-pinned so the window never scrolls. `DecisionPage` is mounted directly rather than reached only through the orphaned OperatorDashboard. A new `desktop-zero-scroll` Playwright spec guards the no-scroll contract.
- **Goals** (`/goals`, hook `useGoals`, migration `20260605120000_create_goals.sql`): horizon-grouped goal tracking (active / paused / done) sourced from voice, diagnostic, and decisions.
- **Enrich loop** (`/enrich`): the inbound "borrow your own AI" loop - copy one prompt, run it in ChatGPT or Claude, paste the answer back, and CTRL learns in two minutes what would take weeks to tell it.
- **Plumbing**: daily-briefing pg_cron trigger, AI usage cost tracking, per-user decision-call metering, a Memory desktop loading skeleton, an import-dedup 406 fix, and a leaders-table RLS fix (`20260609120000_fix_leaders_rls_auth_users.sql`).

### Outcomes from Phase 10

- 4 new active routes (`/build`, `/decision`, `/goals`, `/enrich`) wired into the unified shell
- 1 new e2e spec (`desktop-zero-scroll`) - total now 7
- Counts at end of phase: 80 edge functions, 59 hooks, 110 migrations, 6 Vitest + 7 Playwright specs
- Desktop is now uniformly viewport-pinned; no authenticated surface scrolls the window
- Edge Pro upsell strengthened materially: the same $9/month now includes unlimited Agent Skill Builder generation alongside the existing Edge artifacts + 7 briefing types + Custom Voice Export. No price change. (Historical note: Edge Pro moved to $29/month on 2026-05-30; existing $9 subscribers are grandfathered. All new checkouts are $29/mo.)

---

## Phase 11: Kit Engine - Class Follow-Up Portal (claude/kit-engine, PR #141, 2026-06-10)

### Context

Mindmaker runs live classes (Vibe Coding, Autonomous Business, and more to come). Every class ended the same way: a static Google Doc follow-up emailed to the room. Adoption was 0%. A link in an email nobody opened isn't a follow-up - it's a dead end, and there was no metric on the other side of it to even measure the loss.

The product already had the pieces to do better. The anonymous `/build` pipeline composed real artifacts. The `generate-skill-export` modules (prompt, quality gate, ZIP packaging) were hardened and live. Phase 11 assembled those pieces into a follow-up the student actually reaches and uses: scan a QR on the way out of class, enter a session code with no login, answer six quick questions, and walk out with a personalised pack and a 7-day plan to ship the thing the class was about. The metric on the other side is the **7-day ship rate**.

### What Was Built

**One engine, many class presets.** The runtime, the six-table data model, and the portal UI are shared. The only thing that differs per class is a preset in `supabase/functions/_shared/kit-presets/`, cross-imported by both the Deno edge runtime and the Vite client (the same pattern as `_shared/edge-pricing.ts`). The DB stores only `class_slug` + `preset_version`. Adding a class is a new preset folder + a registry entry + one `kit_codes` row - not new code. Shipped with two presets: `vibe-coding` (Vibe Coding Field Kit) and `autonomous-business` (Autonomous Business Pack).

**Anon-first, no-login portal.** Code entry on `/kit` starts an anonymous Supabase session via `ensureAnonSession`. The student answers the intake and gets the full pack before being asked for anything. Email is asked once, at the "send my pack" moment, and `upgradeAnonymousSession` upgrades the account in place. Anonymous sessions carry a real `auth.uid()` with role `authenticated`, so owner-scoped RLS holds with no special anon policies. The portal lives outside the authed app shell on four public routes: `/kit`, `/kit/me`, `/kit/me/intake`, `/kit/reading/:pageId`.

**Six tables, RLS on all.** `kit_codes` (service-role only; RLS enabled with zero policies so codes can't be enumerated), `kit_redemptions` (30-day pass + 3-net-new-build quota), `kit_builds` (one row per compose run; the row IS the progress UX, polled by the client via per-artifact `artifact_statuses`), `kit_artifacts` (system of record; versioned, `is_current`, ZIPs stored inline as base64), `kit_journey_events` (append-only journey log), `kit_nudges` (send-dedupe ledger, service-role only). Two atomic `SECURITY DEFINER` RPCs - `redeem_kit_code` (row-locks the code to survive a whole class redeeming at once; idempotent) and `consume_kit_skill` (decrements the quota) - with no anon/authenticated execute grant.

**Five new edge functions.** `kit-redeem` (atomic, idempotent, rate limited per-user not per-IP since a venue shares one network), `kit-compose` (background orchestrator via `EdgeRuntime.waitUntil`; partial-failure policy ships whatever artifacts succeed; max 3 LLM calls - skill + batched polish + 7-day plan), `kit-capsule-ingest` (untrusted paste-back fenced through the existing `extract-user-context` fact machinery), `send-kit-pack`, and `send-kit-nudges` (cron sweep that skips students who already shipped). A `kit-nudges-email` pg_cron job drives the day-3 / day-7 nudges.

**Reuse, not rebuild.** `kit-compose` imports `generate-skill-export`'s prompt / quality-gate / zip modules exactly the way `free-skill-export` does. The changes to existing code were additive only: the `track-event` event list was extended, and one advisory quality-gate check (for a "learning loop" section in the pack) was added.

**The journey page.** The kit page doubles as a journey page: a 7-day plan checklist, an "I shipped it" celebration (the event the success metric keys on), regenerate-with-feedback, and context-capsule paste-back. It is also a bridge into the full CTRL app - intake answers seed the student's Memory Web, and a bridge card links to `/dashboard` after email capture.

### Key Decisions (see DECISIONS_LOG.md Decision 43)

- ZIPs stored inline as base64 on the artifact row, not in a Storage bucket: object-level RLS on `storage.objects` can't be created via the Supabase Management API (the role doesn't own the relation), the artifacts are small, and the row persists for the life of the redemption so the pack stays downloadable forever. Same pattern as `free-skill-export`.
- Edge Pro upsell ($29/month, canonical `_shared/edge-pricing.ts`) shown only post-trust (quota hit, pass expiry, regenerate-after-expiry); never gates what was already delivered.
- Backend deployed live and verified before the routes shipped, so go-live was a frontend merge rather than a big-bang flip.

### A Bug Found in Testing

The app shell sets `html` / `body` / `#root` to `overflow: hidden` (the no-scroll pattern). The long kit page was clipped at one viewport on mobile because it didn't own its own scroll. Fixed by making `KitPortalLayout` a fixed-height flex column with a single scrollable `main`.

### Outcomes

- Static Google Docs follow-up (0% adoption) replaced with a no-login portal the student reaches via QR while still in the room
- +6 tables, +5 edge functions, +4 public routes, +1 shared preset module, +1 pg_cron job
- 2 class presets live (`vibe-coding`, `autonomous-business`); a third class is a preset folder + registry entry + one row away
- Verified live end to end against the production Supabase project on both presets - redeem, intake, real-LLM compose, ZIP download, journey, ship - before merge
- A real success metric on the follow-up for the first time: the 7-day ship rate

---

## Phase 12: Redesign - Forced-Dark Instrument Cockpit (PR #186, merge 1c01db5, 2026-06-16)

### Context

The product's visual brand had drifted. Earlier phases describe a "light mode" design system (warm off-white #faf9f7, deep ink, pure white cards, the green Mindmaker logo). That brand is now retired. Phase 12 ported a dark "instrument" design system and made it the only mode the app runs in.

### The Honest Backstory (the trust breach)

This redesign was, at one point, falsely claimed to be "live" while the production app was still serving the old UI. When the founder reported the app still looked old, the assistant deflected onto the founder's browser cache instead of treating "it's still old" as ground truth. That was a trust breach, and it is recorded here deliberately so the lesson is not lost: "live" means a real production screenshot of the actual surface, never an assertion, never a cache excuse, and the user's "it's still old" is always ground truth. See the post-mortem below.

PR #186 (merge 1c01db5, 2026-06-16) is the real ship. It was prod-verified with screenshots of the actual production surfaces before being called done.

### What Shipped

- **Globally forced dark.** `index.html` carries `class="dark"`; there is no light mode to fall back to.
- **ctrl-ds instrument palette.** A dark instrument-panel design system replaces the old warm light system. Primary is emerald `#00D9B6` (`--primary 171 100% 43%`).
- **Emerald "ctrl." wordmark** replaces the old green Mindmaker logo everywhere.
- **Rebuilt surfaces:** mobile cockpit, decision spine, StoneRead, the brain four-world rope canvas, capture, and onboarding were all rebuilt against the new system.
- Prod-verified with screenshots across the rebuilt surfaces.

### Honest Remaining Gaps (do not hide these)

- Residual green still lives in `index.html` OG / theme-color meta, the `tokens.css` `--mint` alias, and in `EdgeOnboarding` / `SampleResultsDialog`. The forced-dark instrument brand is the live default everywhere a user actually goes, but these leftover references have not all been swept.
- Earlier docs in this repo (and the repo CLAUDE.md "Key Conventions") historically asserted the old light-mode brand. Any such assertion is wrong as of this phase and is being corrected as docs are touched.

### Outcome

The app is now globally dark, on the ctrl-ds instrument palette, with the emerald `ctrl.` wordmark. It is NOT light mode, NOT warm off-white, NOT white cards, NOT the green Mindmaker logo.

---

## Phase 13: Brain Engine + Limits Edge-Graph (PRs #153-164, #187-189)

### Context

The Memory Web stored facts but treated them as a flat pool. The leader could not see how one fact reinforced or contradicted another, and there was no honest signal of how well-supported any given fact actually was. Phase 13 built the Brain engine: facts become nodes in a graph, with edges between them, evidence tiers, and a track record.

### What Shipped

- **Brain engine** (PRs #153-164): the four-world rope canvas and the underlying fact graph.
- **"Limits" phases** (PRs #187-189): a fact-to-fact edge graph, `Strengthen` / `Fix` RPCs, reliable reaction numbers, evidence tiers, and track-record depth. The "limits" framing is about showing the leader where the brain's knowledge is thin or contradicted, not just what it claims to know.
- **Migrations:** `20260615*_brain_*` and `20260616120000_memory_edges`.

### Honest Remaining Gaps (do not hide these)

- The brain canvas `Strengthen` / `Fix` actions are **UI-disabled**: the buttons exist but there is no backend RPC wired behind them yet. They must not be presented as working.
- Brain edges are **derived, not stored**: the fact-to-fact relationships are computed on read rather than persisted as first-class rows. This is a deliberate current state, not a finished durable graph.
- **Number-heroes fall back to words-led** for thin current data: when there is not enough current data to support a numeric hero, the surface falls back to a words-led presentation rather than asserting a number it cannot stand behind.

### Outcome

Facts are now a graph with edges, evidence tiers, and track-record depth, with honest fallbacks where the data is thin and honestly-disabled actions where the backend is not yet wired.

---

## Phase 14: Kit Program - Org-Chart Kit, Parity Retrofit, Cascade-Bug Fix + Honesty Floor

### Context

Phase 11 shipped the Kit Engine (one preset-driven runtime, two presets). Phase 14 grew the program: a new Agentic Org Chart kit, a parity retrofit so every existing kit gained the newer fork + pick-cascade + live picks-board flow, and then a fix for a latent bug that had been silently corrupting every kit build since launch.

### What Shipped

- **Agentic Org Chart kit** (PRs #190, #191): a new kit whose output is a composed agentic org chart for the leader's organisation.
- **Parity retrofit** (PR #192): all three existing kits were retrofitted to the fork + pick-cascade + live picks-board model so the whole program behaves consistently.
- **PR #193 (merge 090dda2, 2026-06-17) - two fixes:**
  1. **The cascade bug (MAJOR, latent since launch).** The forked-kit intake silently dropped the back half of EVERY kit's cascade for ALL users since launch. A deferred single-select auto-advance closed over a stale `steps.length`, so every org-chart build recorded in `kit_builds` captured only `[boxes, pathway, profile, timeSink]` - `guardrails`, `grind`, `involves`, and `maturity` were NEVER captured. Fixed by reading live refs in `goNext` instead of the stale closed-over length. (See the post-mortem below.)
  2. **An honesty floor on the composed org chart.** A box that touches a flagged guardrail can now never be left agent-led. This is an honesty constraint on the composition itself, not just on copy.
- Both fixes prod-verified.

### Honest Data Caveat (do not hide this)

Pre-#193 `kit_builds.intake` rows are **TRUNCATED and untrustworthy**: because the cascade silently stopped at `timeSink`, the back-half answers (`guardrails`, `grind`, `involves`, `maturity`) were never captured for any build before the fix. Do not trust historical kit intake data from before PR #193.

### Outcome

The Kit Program now has the org-chart kit, consistent fork + pick-cascade + picks-board behaviour across all kits, a captured full cascade for every new build, and an honesty floor that prevents an agent-led box on a flagged guardrail.

---

## Phase 15: Home / Decision Map / Automator UX Redesign (PRs #197-200, 2026-06-17)

### Context

A founder review of live production (screenshots in `ctrl-corpus/issues 17-6-26`) found that the three surfaces a leader hits most did not hold the bar. The Home tab did not feel like "I'm back"; the "strongest signal" hero read as cryptic; the AI-bets were a wall of sameness. The Decision Map read as unrelated cards with a "something wrong?" drawer that popped on every scroll. The Automator suggested a vague, uncodifiable "Hiring Challenge". A mock-driven rebuild with the founder locked all three surfaces, which were then built to the ctrl-ds design floor and shipped.

### Sub-track 1 - Home redesign (PR #197, merge 7b5f0ef)

The mobile cockpit Home (behind `VITE_COCKPIT_ENABLED`) was rebuilt. Removed: the cryptic "strongest signal" hero and the wall of identical AI-bets. New:

- A plain, time-aware greeting (no jargon; e.g. "We found developments you might want to look at").
- The swipeable "worth a look" **deck** (`CockpitDeck`) - a mix of broad AI news (from the briefing pipeline's curated segments) and the leader's own signals (`decision_alerts`). Swipe heart = more-like-this, swipe skip = dismiss; a peeking card stack with dots underneath.
- The 3 value actions: Play my briefing (-> `/briefing`), Run a decision (-> `/decision`), Build a skill (-> `/context`).

Bets moved off Home; they now live in the Decisions case-picker. New components `src/components/cockpit/CockpitDeck.tsx` + a rewritten `CockpitHome.tsx`; `DeckCard` / `DeckCardKind` types + a `deck` field added to `src/types/cockpit.ts`; `useCockpit` assembles the deck (no new backend). A new `src/components/landing/BrandLockup.tsx` (the Mindmaker icon `mindmaker-icon.png` + the `ctrl-logo.png` wordmark) replaced the generated "ctrl." text in the header.

### Sub-track 2 - Decision Map rework (PR #198, merge 33fb818)

`src/pages/DecisionMap.tsx` was rebuilt. The case is now ONE pinned decision hero (star eyebrow + the decision statement + an honest, descriptive "where it stands" status derived from the consideration tally - e.g. "Holding", "Checking", "Contested", never a recommendation) plus a "Change" affordance to swap the pinned decision. Considerations hang off a connector **rail** (not unrelated cards); evidence is one tap deeper (reuses `StoneRead` / `StoneDeeper`, unchanged). The long-press `ContestLongPress` scroll-popup drawer was killed and replaced with a quiet "Flag it" inside the opened stone plus a footer affordance (uses `useContestActions.openContest`). Empty state (nothing pinned): role/sector-seeded starter decisions from `user_memory` identity/role, one tap navigating to Decide prefilled (prefill threaded through `DecisionPage` -> `PressureTestPanel` via an `initialStatement` prop).

### Sub-track 3 - Automator rebuild (PR #199, merge 24f7d15)

This is the retention hook: turning a recurring deliverable into a reusable skill. New components `src/components/automator/{AutomatorFlow,AutomatorSuggestions,AutomatorCascade,AutomatorSkillReady,automatorModel}` + new hook `src/hooks/useSkillSuggestions.ts`. It is now the default flow on `/context` (`ContextExport` modified). Three screens:

1. **Suggestions** - concrete recurring deliverables mined from the brain (`user_memory` blockers + decisions) with a "why we picked this" line and a "pulled from your brain" badge; a role/sector curated fallback when the brain is thin; a clean inline "Something else" input (not a native `window.prompt`). Never the vague "Hiring Challenge".
2. **Cascade** - a ~5-step all-recognition pick-cascade (how you do it now / inputs / voice [shows real samples to PICK, never "describe your tone"] / structure / guardrails), reusing the kit cascade pattern.
3. **Skill ready** - "Built your way" chips + Run it now + Export as markdown + a "Your skills" library peek.

`automatorModel.composeTranscript` maps the picks into a transcript for the existing `generate-skill-export` edge function (untouched). The old `SkillCaptureSheet` / `SkillPreviewSheet` are now unimported dead code (left in place).

### Sub-track 4 - Follow-ups (PR #200, merge 387af84)

- Desktop brand lockup (`BrandLockup` added to `DesktopShell` + memory-web `DesktopSidebar` + legacy dashboard `Sidebar`).
- Deck like/dislike now persists and trains the feed: a swipe writes a `deck_reaction` JSON row to the existing `feedback` table (`page_context` `'cockpit-deck'`, no new migration); `useCockpit` reads 30 days of dislikes and down-weights those news categories out of future decks.

### Honest Residuals (do not hide these)

- The old `SkillCaptureSheet` / `SkillPreviewSheet` are now dead code (left in place, unimported).
- "Run it now" downloads the skill; there is no in-app skill-runner yet.
- The deck's news half depends on a briefing existing; otherwise it shows a calm caught-up state.

### Method (held throughout)

Built on the real ctrl-ds components, never hand-rolled chrome - a v2 of the decision map was rejected as "amateur" for hand-rolled, cramped chrome, and v3 was rebuilt on the actual ctrl-ds components. `build` + `eslint --max-warnings 0` clean, no em dashes, no sparkle icons, every surface prod-verified by screenshot on `ctrl.themindmaker.ai`.

### Outcome

Home reads as "I'm back" (greeting + a deck worth looking at + 3 clear actions); the Decision Map is one pinned decision with considerations on a rail and evidence one tap deeper; the Automator turns a real recurring deliverable into a reusable skill; the brand lockup is consistent on mobile and desktop; and the deck learns from every swipe. All four PRs merged to main and prod-verified by screenshot on 2026-06-17.

---

## Phase 16: Skill Builder Intake + Harness Upgrade (PR #204, 2026-06-17)

### Context

Phase 15 made the Automator the retention hook, but the Skill Builder behind it was still Edge Pro gated, the `generate-skill-export` prompt was untouched, and the voice handling was inconsistent: there was no single source of truth for a leader's writing voice, the harness could fabricate voice samples, and a latent enum bug was silently 400-ing every voice save. Phase 16 opened the builder up, hardened the prompt around voice, and unified the voice profile across the surfaces that need it.

### What Shipped (one PR, five pieces)

1. **Skill Builder is free for now.** The Edge Pro gate on `generate-skill-export` was REMOVED: any authenticated user, including anonymous kit sessions, can build skills. The freemium-ladder WIP was stripped (deleted `AutomatorTierBanner`, `useSkillBuildAccess`, `constants/skillTier.ts`, `_shared/skill-tier.ts`).

2. **`generate-skill-export` prompt tightened (no longer untouched).** It now evaluates boundedness first, then runs the FOUR Honest Tests (Test 4 = voice-lock / consistent creative output), injects a self-identified VOICE_PROFILE, FORBIDS fabricated voice samples (reproduce the leader's real sample verbatim, else describe the register, never invent a quote), renders a structured 8-dimension `voice-profile.md`, and REQUIRES a `## Learning loop` section. The quality gate now passes 16/16 (the learning-loop check was previously failing).

3. **New `extract-voice-profile` edge function.** Paste real writing -> derive the 8 voice dimensions in one LLM pass. Anonymous-session safe; does not store the raw pasted text.

4. **Unified voice profile.** A single `ctrl_voice_profile` fact in `user_memory` (`fact_category` 'preference', `fact_subtype` 'communication_style'), captured by `VoiceStyleProfileSheet` (5 recognition picks OR the paste-extract power path), surfaced into generated skills by `_shared/memory-context-builder.ts`, and used by the harness. New files: `src/hooks/useVoiceProfile.ts`, `src/types/voiceProfile.ts`, `src/components/edge/VoiceStyleProfileSheet.tsx`, `src/components/kit/KitVoiceProfileCard.tsx`, `src/lib/automatablePain.ts`. Bug fixed: voice save used an invalid enum value `verification_status: 'confirmed'` -> corrected to `'verified'` (saving a voice profile had been silently 400-ing).

5. **Automator is voice-aware + a desktop two-pane.** A cold tone pick now WRITES the persistent voice profile (`toneToVoiceProfile`); a returning leader gets a "still sound like you?" confirmation instead of a cold re-ask; a paste-extract affordance opens the sheet in paste mode. New `src/components/automator/AutomatorScaffold.tsx` renders a live "your skill is taking shape" panel beside the flow on desktop (the desktop builder was a cramped 402px phone column, now max-w-4xl two-pane; mobile unchanged).

### Also Shipped

- **Layered output.** The `mcp-context` MCP server gained `list_skills` + `get_skill` (a leader's own agent pulls their built CTRL skills LIVE; read scope, Edge-Pro gated like the rest of that server), and `src/components/library/LibraryTab.tsx` gained a "Connect these to your agent" MCP banner + a per-item Download(.md). The three output destinations are now real: library (home) + MCP (live agent pull) + download.
- **Warm-start peer suggestions.** `useSkillSuggestions` now leads curated deliverables with the confident "your peers are using this" voice grounded in role + company profile (sector, plus a best-effort `company_context` / Apollo industry read), never a fabricated cohort count; mined candidates keep their own grounded reason. The Automator suggestions screen has an optional "Add your company site" affordance that fires `enrich-company-context` then re-mines.
- **Kits.** `AutomatePainCard` pain chips now show for everyone (free, no `isPaidUser` branching). `KitVoiceProfileCard` shows per-kit voice carry-over copy. The 4 kit intakes were audited and confirmed already at recognition parity (100% recognition picks, forked adaptive cascade, two-pane desktop). `SkillCaptureSheet` / `SkillPreviewSheet` remain dead code.

### Deploys

Edge functions `generate-skill-export`, `extract-voice-profile`, and `mcp-context` deployed to prod (`bkyuxvschuwngtcdhsyg`). No database migrations were needed.

### Outcome

The Skill Builder is open, the harness will not invent a leader's voice, voice lives in one fact across the builder / kits / harness, and a built skill reaches the leader's agent three ways. PR #204, prod-deployed 2026-06-17.

---

## Phase 17: Kit Redesign - Sequential One-Action-Per-Screen Wizard (PRs #206-212, 2026-06-19)

### Context

The Phase 14 parity retrofit gave all four kits consistent mechanics. Phase 17 replaced the visual and interaction model entirely. The old `KitHome` reveal was a long scroll of ~10 competing actions (Send My Pack, Set My Voice, I Shipped It, Copy x N, Tune, Paste Homework, the 7-day plan, artifact groups, the dashboard bridge) - a dumping ground, not a product. Outputs were generic enough to need a Tune button, and the homework prompt flashed past during the loading spinner so it could never actually be done. Phase 17 locked a new law and built to it: **strictly sequential, one action per screen.**

### The Law

- **Strictly sequential.** One action per screen. The student is never offered two things at once.
- **No-scroll on mobile.** Each step fits the viewport.
- **Desktop is the primary surface.** A native two-pane with a live "your kit is taking shape" panel.
- **Humanity-first reflect-backs** on the vulnerable steps (Vibe Coding asks for past pains; Memory & Identity asks who you are).
- **Outputs are two buttons only** (Download / Copy), never walls of text.
- **Platform-agnostic output.** Copy names the user's chosen tool, never hardcodes Claude.

### What Shipped

**Redesigned flow (all four kits):**
1. **Redeem** - code entry, anonymous session.
2. **Adaptive intake cascade** - one question per screen. Each step is a pick or a short text, never a form.
3. **Homework step** - paste what your AI already knows about you. Folds into the initial `kit-compose` via `memoryContext` so the output is grounded in the leader's actual world from the first pass.
4. **Honest build trace** (`KitBuildTrace`) - driven by real `kit_builds.artifact_statuses`, no faked latency. The student sees each artifact land.
5. **Reveal wizard** (`KitRevealWizard`) - six sequential steps: reveal -> what's-inside -> voice -> keep-it -> plan -> ship. Each is one action.
6. **Hero PDF** (`/kit/pdf`, `src/lib/kitPdf.ts` + `src/pages/kit/KitPdf.tsx`) - one branded personalized hero PDF per kit, print-styled route.

**`KitWhatsInside`** - the output gate. Two buttons only: Download and Copy. Never a wall of text to read inline.

**`src/components/kit/kitPrimitives.tsx`** - shared brand primitives used across all four kit components so the design system is enforced at the component level.

**Retired:** `KitHome` reveal-scroll + `HomeworkCard`. These were the old dumping-ground components; they are now dead code.

**PRs shipped:**
- **PR #206** (design lock): locked the spec, shared primitives, routing skeleton.
- **PR #207** (Vibe Coding Field Kit): first kit rebuilt end-to-end against the new law; live-verified e2e on prod.
- **PR #208** (Autonomous Business Pack): second kit rebuilt.
- **PR #209** (Agentic Org Chart): third kit rebuilt.
- **PR #210** (Memory & Identity): fourth kit rebuilt.
- **PR #211** (bundles #208/#209/#210 + the 3 hero PDFs): Autonomous + Org Chart + Memory kits merged together with their PDF outputs.
- **PR #212** (stage-label fix): corrected a stage label regression surfaced during live verification.

`kit-compose` was redeployed so presets and frontend align. All 4 kits were live-verified on prod (seeded throwaway codes, walked the full flow, zero-residue cleanup).

### Honest Open Follow-Ups

- Multi-select (`chips_multi`) `factMappings` do NOT persist to `user_memory`. They are used in compose to ground the output, but they are not saved as Memory Web facts.
- Autonomous Business's on-screen reflect-back comes via preset helper copy, not the shared `KitIntake` clay panel used by the other kits.

### Outcome

The kit flow is now strictly sequential, one action per screen, platform-agnostic, and never asks the student to do two things at once. The homework step means every kit output is grounded in the student's actual AI context from the first compose. The hero PDF gives the student something to put on their desk. All 4 kits live-verified on prod 2026-06-19.

---

## Phase 18: Kit Email Branding (PR #213, 2026-06-19)

### Context

Kit emails (`send-kit-pack` + `send-kit-nudges`) were previously plain-text or lightly formatted. They landed in a student's inbox looking like system notifications, not like something from the product they'd just used. Phase 18 brought the kit emails into the Mindmaker brand.

### What Shipped

- **Mindmaker-branded kit emails**: the Mindmaker icon + Inter typeface + an app-aligned hero section, visually consistent with the `ctrl-ds` palette.
- **`send-kit-pack`** and **`send-kit-nudges`** both updated to render the new branded templates.
- Email templates live on the `feat/kit-email-branding` branch, merged to main as PR #213.

### Outcome

Kit emails now look like they come from the same product the student used in class. Brand consistency across in-app and email surfaces.

---

## Phase 19: Main App Polish - AI-Native Enforcement (PRs #214-221, 2026-06-19/21)

### Context

A post-Phase-16 audit of the live main app found the product drifting from its north star. The decision engine's own seed examples included "move upmarket to enterprise" and "hire a VP of Sales" - pure general business advice. Headlines in the cockpit deck were unstyled. Multiple surfaces still had scroll or multi-ask UX patterns that violated the one-ask law. Phase 19 closed all three gaps.

### North Star (locked)

**CTRL is about building, orchestrating, productizing, and getting to market the AI-native version of your business.** It is NOT a general business advisor. The law: every decision, every headline, every nudge, every suggestion is about making the business more AI-native. When a user brings something general (pricing, hiring, a market move), we do not answer it as-is and we do not refuse it - we **reframe** it into the AI-native version of that decision and pull the user there.

Examples:
- "Should I hire a VP of Sales?" - "Before you hire, should an agent own part of the sales motion first, and what would the human role become?"
- "Should we raise prices?" - "Should the AI-native version of your offer change what you sell and how you price the AI capability itself?"
- "Should we move upmarket?" - "What would the AI-native version of your product need to be to win upmarket?"

Honesty floor (carried from the kit work): the engine never fabricates evidence, always shows where a call holds and where it breaks, and confidence tracks the evidence.

### What Shipped

**AI-native decision reframe (PR #216):**
The decision engine seed suggestions and the Decision Map starter decisions were rewritten to be AI-native. Any general-business input that enters the Decision Engine is reframed into its AI-native form before analysis proceeds. The seed examples now surface AI-native moves (should an AI agent run this workflow? what is the AI-native version of this role? should this be productised as an AI capability?) rather than generic strategic advice.

**News deck motifs (PR #215):**
The cockpit deck's news cards gained branded category motifs - one fixed app-style image per news category, reused consistently. This replaced the unstyled text-only cards and gave each category a visual signal the leader can read at a glance.

**No-scroll / one-ask enforcement (PRs #218-221):**
Multiple surfaces that still had scroll violations or multi-action screens were brought up to the one-ask law. Each PR targeted a specific surface group:
- PR #218: briefing surface no-scroll audit.
- PR #219: decision and goals surface no-scroll audit.
- PR #220: memory and context surface no-scroll audit.
- PR #221: settings and profile surface no-scroll audit.

All surfaces now conform: one action per screen on mobile, no window scroll on desktop, no multi-ask moments.

### Outcome

The main app now enforces the AI-native north star at the data layer (seeds, suggestions, starter decisions) and at the surface layer (every headline, nudge, and deck card is about the AI-native version of the business). News deck cards have branded category motifs. Every major surface conforms to the one-ask / no-scroll law. PRs #214-221 merged to main and prod-verified 2026-06-19/21.

---

## Post-Mortems

### Post-Mortem: The Redesign Trust Breach (Phase 12)

**What happened.** The forced-dark redesign was claimed to be "live" while production was still serving the old UI. When the founder said the app still looked old, the response deflected onto the founder's browser cache rather than verifying the actual production surface.

**Why it was a breach.** It overstated reality in exactly the way that destroys trust: asserting shipped-when-not-built, and then blaming the user's environment instead of taking "it's still old" as ground truth.

**The rule that came out of it.** "Live" means a real production screenshot of the actual surface, full stop. Never assert a ship without one. Never blame the user's cache or device. Treat "it's still old" as ground truth every time. Verify your own work before calling it done. PR #186 was held to this bar and is the real ship.

### Post-Mortem: The Kit-Intake Cascade Bug (Phase 14)

**What happened.** From the forked-kit intake's launch until PR #193 (2026-06-17), the intake silently dropped the back half of every kit's cascade for every user. The mechanism: a deferred single-select auto-advance closed over a stale `steps.length`. When the cascade grew new steps, the auto-advance still used the length captured at closure time, so it advanced past the end and stopped early. Every org-chart build in `kit_builds` therefore captured only `[boxes, pathway, profile, timeSink]`; `guardrails`, `grind`, `involves`, and `maturity` were never captured.

**Why it stayed hidden.** Nothing errored. The intake "completed" and composed a pack. The missing answers looked like the user simply hadn't been asked, so there was no failing signal until the data was audited.

**The fix.** `goNext` now reads live refs (current step list and index) instead of a value closed over at setup time. PR #193 also added the honesty floor on the composed org chart.

**The lesson.** A `setTimeout` / deferred callback that closes over a length or list captured at setup time is a stale-closure trap; read live refs in the deferred path. And: a silent data-truncation bug is worse than a loud crash, because the corrupted data looks plausible. Pre-#193 `kit_builds.intake` rows are truncated and must not be trusted.

