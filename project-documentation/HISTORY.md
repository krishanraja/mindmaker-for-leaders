# History

Evolution of CTRL (originally Mindmaker) and major product pivots.

**Last Updated:** 2026-05-24

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
| 5.1 | Apr 2026 | Phase 7 — six audit-week tracks shipped: revenue path, data path, UX, reliability, observability, cleanup. Hardened production platform. |
| 5.2 | May 2026 | Phase 8 — Agent Skill Builder (voice-to-Claude-Skill pipeline, Edge Pro), world-class desktop UI redesign with Command Palette, pain-anchored Skill entry points on Edge / Memory / Briefing. |
| 5.3 | May 2026 | Phase 9 — UX polish (copy, voice/text controls, install guide leading with Claude.ai), generated artifact persistence + Library tab on `/memory`, workflow consolidation (SkillExportCard deleted, `/context` unified entry). |

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

### Week 1 — Revenue Path (PR #93, merged 2026-04-21)

**Shipped:**
- Mandatory Stripe webhook signature verification on `stripe-webhook` edge function. Unsigned/badly-signed payloads now reject with 400.
- Webhook idempotency via new `stripe_events_processed` table — replays of the same event ID are recognised and skipped.
- Briefing rate limits enforced via `_shared/rateLimit.ts` to prevent abuse and runaway cost.
- E2E test `tests/stripe-webhook-idempotency.spec.ts` proves the contract.

**Why it mattered:** A leaked or replayed Stripe webhook could double-charge a Pro subscriber. This is the kind of issue that surfaces at audit time and damages trust with executive buyers.

### Week 2 — Data Path (PR #94, merged 2026-04-22)

**Shipped:**
- Closed an assessment-data leak (specific issue redacted from public docs).
- Codified the storage bucket policy for `ctrl-briefings` (audio artifacts now have explicit RLS-aligned object policies).
- Completed end-to-end account deletion: removes Memory Web, briefings, audio artifacts, decisions, missions, assessments — verified in `tests/account-deletion.spec.ts`.

**Why it mattered:** Privacy claims must be backed by code. "Self-contained, encrypted at rest, fully deletable" is a sales anchor; this week made it provably true.

### Week 3 — UX (PR #95, merged 2026-04-22)

**Shipped:**
- Killed the onboarding gate that was blocking returning users on the dashboard.
- Fixed the NorthStar stub on the home view.
- Voice permission recovery flow when a user denies microphone access then changes their mind.
- Removed surveillance-y copy across the app.
- Removed every "coming soon" placeholder for unimplemented affordances. The product no longer advertises what it can't do.

**Why it mattered:** The product is sold to executives. Anything that feels half-finished erodes the premium positioning.

### Week 4 — Reliability (PR #99, merged 2026-04-23)

**Shipped:**
- New `_shared/with-timeout.ts` utility (with vitest coverage). Every external API call (Vertex, OpenAI, ElevenLabs, Perplexity, Tavily, Brave, Resend, Stripe) now wraps in a timeout + retry contract.
- Audio failure UX — if synthesis fails, the briefing card still shows segments + script.
- Onboarding stall recovery — users who closed the app mid-onboarding can resume cleanly.

**Why it mattered:** A 3-minute briefing that hangs for 60 seconds because Perplexity is slow is a credibility hit. The 12-second wall-clock cap on provider fan-out + per-call timeouts means worst-case behaviour is bounded.

### Week 5 — Observability (PR #97, merged 2026-04-23)

**Shipped:**
- Structured edge-function logger at `_shared/logger.ts`. JSON output: `{ ts, level, fn, msg, userId, duration_ms, error }`. Searchable in Supabase logs.
- CI gate prevents `console.log` regressions in edge functions.
- Tests for `with-timeout` to lock the retry contract.

**Why it mattered:** When a leader emails saying "my briefing is broken," we can find the request in seconds, see the exact failure path, and fix it the same day.

### Week 6 — Cleanup + e2e starter (PR #98, #100, #101, merged 2026-04-24 → 2026-04-26)

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
- This is the version sales/marketing AI agents can confidently sell — not "we plan to harden it" but "the audit is shipped and the tests prove it."

---

## Phase 8: Agent Skill Builder + Desktop Redesign (May 2026)

### Context

By the end of Phase 7 the product was hardened but still single-loop: Memory Web feeds Context Export, Context Export feeds AI tools, AI tools accelerate decisions. The Briefing closed the daily loop. But the *weekly* loop — the leader's recurring rituals (Monday board update, Friday hiring sync, monthly investor update, RFP triage) — was still re-typed from a blank prompt every time, even by leaders with a rich Memory Web. The next leverage move was obvious: convert one weekly workflow into a permanent, downloadable Claude Skill the leader installs once and forgets.

Separately, the desktop experience had drifted into "stretched mobile markup" and started to feel below the executive-grade bar set by the rest of the product. Executive buyers judge by surface polish, and the desktop shell was the surface most demoed in sales calls.

Phase 8 shipped both: the Agent Skill Builder and a desktop UI redesign.

### Sub-track 1 — Agent Skill Builder (PR #103, merged 2026-05-04)

**What shipped:**

- New edge function `generate-skill-export` (Edge Pro gated) implementing the full pipeline: Edge Pro gate → memory context build (3000 tokens) → triage LLM call (Three Honest Tests) → quality-gate validation → ZIP packaging → `skill_exports` insert.
- The Three Honest Tests triage gate decides whether the input is really a skill, a Memory Web fact, a Custom Instruction, or a Saved Style. Triage failures route the input to the right surface and are still logged in `skill_exports` for analytics.
- Quality gate enforces: 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections, no bare MUST/NEVER, valid name format. Only the name-format check is a hard fail; everything else is advisory and surfaced to the user.
- ZIP packaging follows the **agentskills.io standard**: single root folder, `SKILL.md` + `references/` + `01-test-prompts.txt` + `02-maintenance-card.txt` + `03-install-guide.txt`.
- New `skill_exports` table (migration `20260508000000_create_skill_exports.sql`): per-user log of every generation attempt including failed-triage cases, with RLS, archetype tagging, and quality-gate snapshot.
- Frontend: `SkillExportCard` on Step 1 of `/context` (promoted above the Custom Voice card), `SkillCaptureSheet` (voice up to 5 min or text, 20-char minimum, mobile bottom sheet / desktop dialog), `SkillPreviewSheet` (description, download CTA, quality-gate checklist, test prompts with copy buttons, install guide accordion for Claude Code / Claude.ai / Cursor, collapsible SKILL.md preview).
- New hook `useSkillExport` wraps the edge function and decodes the base64 ZIP into a downloadable Blob.

**Why it mattered:** The product moved from "make every AI conversation faster" to "make every AI conversation faster AND turn your weekly rituals into permanent agent infrastructure." The Three Honest Tests gate was the differentiator vs. generic macro / automation tools: most generate something from any input; CTRL refuses to generate junk and routes the leader to the right surface instead.

### Sub-track 2 — World-Class Desktop Redesign (PR #104, merged 2026-05-06)

**What shipped:**

Desktop now uses a unified, desktop-native shell instead of stretched mobile markup. New primitives:

- **`AuthedLayoutRoute`** wraps authenticated routes in `CommandPaletteProvider`.
- **Command Palette** — global Cmd/Ctrl+K launcher. Pages opt into actions via custom `mm:capture-voice` and `mm:generate-briefing` window events.
- **Refined sidebar** with user footer + keyboard hints.
- **Sticky top bar** with page eyebrow + title + actions.
- **Optional right rail** for context that pages opt into.

Pages reworked:

- **Landing** — bold asymmetric hero with animated Memory Web preview, sticky top nav with section anchors, multi-section scroll (how it works, three pillars, briefing teaser, privacy), final CTA. Mobile keeps the swipeable three-card experience.
- **Dashboard (Memory Web)** — three-pane layout: rail nav, main canvas with big visualization + denser 3/4-column facts grid + pattern columns, right rail with today's briefing slot, quick actions, coverage bars, activity.
- **Briefing** — brand-new desktop layout with hero player area, voice-steer bar, custom briefings strip, and a side rail for interests, suggestions, and weekly history. Mobile path preserved.
- **Export wizard** — side rail shows step progress, current selection, and a contextual pro tip; wider main column for breathing room.

**Why it mattered:** Executive buyers judge desktop polish; this closed the gap.

### Sub-track 3 — Pain-Anchored Skill Entry Points (PR #105, merged 2026-05-09)

**What shipped:**

Skill creation became a reflex on the page where the pain shows up, not a generic trip to `/context`:

- **`AutomatePainCard`** on Edge view — chip row of declared blockers + active decisions.
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

### Sub-track 4 — Contrast + Scroll Polish (PR #106, merged 2026-05-11)

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
- 3 new hooks (`useSkillExport`, `useUserPains`, `useRevealOnMount`) — total now 51
- 1 new migration (`20260508000000_create_skill_exports.sql`) — total now 98
- 5 new components in `src/components/edge/` for the Skill Builder UX + 1 in `src/components/memory-web/`
- Desktop now feels like a desktop product, not stretched mobile markup
- Edge Pro upsell strengthened materially: the same $9/month now includes unlimited Agent Skill Builder generation alongside the existing Edge artifacts + 7 briefing types + Custom Voice Export. No price change.

---

## Phase 9: UX Polish, Persistence, and Workflow Consolidation (May 2026)

### Context

Phase 8 shipped the Skill Builder pipeline and desktop shell. Phase 9 addressed three gaps surfaced in the first two weeks of use: (1) generated artifacts (skills, drafts, frameworks) vanished when the preview sheet closed — leaders had no way to find them again; (2) the Context Export flow had two redundant entry points for skill capture that confused new users; (3) several copy and affordance choices were sub-optimal for the CEO-on-mobile persona (voice was buried, outcome language was vague, the paywall sample was generic even when the leader's company name was known).

Phase 9 shipped in two PRs: a five-phase UX overhaul (PR #108) and a workflow consolidation (PR #110).

### Sub-track 1 — UX Polish (PR #108, merged 2026-05-14)

Five sequential phases:

**Phase A — Copy, affordances, pricing single-source**
- `AutomatePainCard`: outcome-oriented title ("Automate a recurring pain"), bumped subline size, persistent chip arrows.
- Edge view quick actions: outcome-oriented labels ("Draft an email or memo", "Build a decision framework").
- `SkillCaptureSheet` + `CustomBriefingSheet`: voice/text segmented control promoted to the top of the form; voice is no longer a muted footer link.
- `BriefingSheet`: first-time voice-commands hint ("Try saying 'pause', 'next', or 'faster'") with `localStorage` dismissal.
- Settings: clearer desktop tab labels (Work context, Briefing interests, Briefing tone and rules, Leadership manifesto).
- Mobile Memory dashboard idle copy: "Add a fact about you, your team, or your work".
- `AccountTab`: "Replay setup tour" button to recover the dismissed onboarding banner.

**Phase B — Skill Builder rebuild**
- `EdgeView`: `AutomatePainCard` promoted above the strengths/gaps profile (what the CEO wants first).
- `AutomatePainCard`: fallback "Voice a recurring pain" dashed card when leader has no declared pains; taps to `/context` with `openSkillBuilder=true`.
- `SkillCaptureSheet`: mobile defaults to voice mode even for seeded entries; desktop with a seed keeps text-default.
- `SkillCaptureSheet`: replaced bracket-scaffold textarea with two labeled fields ("How you handle it today" / "What output you want") for seeded entries.
- `SkillCaptureSheet`: "What you'll get" preview line inside seed banner sets expectation before the leader fills fields.
- `SkillInstallGuide`: leads with Claude.ai path (3 inline steps + deeplink to claude.ai/settings/capabilities). Claude Code and Cursor collapsed under "Other install options".

**Phase C — Persistence + Library tab**
- New `generated_artifacts` table (migration `20260513000000_generated_artifacts.sql`): unified store for skills, drafts, exports, frameworks, custom briefings. RLS scoped to user.
- `generate-skill-export` now writes a `kind='skill'` row on success.
- `edge-generate` now writes a `kind='draft'` or `kind='framework'` row on success.
- New `useGeneratedArtifacts.ts` hook: read/refetch/delete.
- New `LibraryTab.tsx` (`src/components/library/`): grouped-by-kind list with inline markdown preview, copy, and remove.
- `MemoryCenter`: new Library tab (4th tab) with count badge.
- `SkillPreviewSheet`: "Saved to Library" pill in the header.

**Phase D — Action empty states, subtitles, compliance link**
- `BriefingPage`: empty state now has a "Pick 3 interests now" button opening `InterestsSheet` directly.
- `MemoryCenter` (mobile): subtitle "Browse and edit every fact CTRL knows about you".
- `EdgeView` header: subtitle spells out what Edge produces ("Drafts, frameworks, and skills built from your Memory Web.").
- `AccountTab`: "Security and compliance" row links to the existing `/compliance` page (previously only reachable via deep link).

**Phase E — Personalized paywall sample**
- New `useProfileBasics.ts` hook: reads `company_name` and `role` from `user_memory` with common fact-key aliases.
- `EdgePaywall`: personalized one-liner above blurred sample ("Board memo for Acme, Q2") when company name is available. Falls back silently to generic sample.

### Sub-track 2 — Workflow Consolidation (PR #110, merged 2026-05-17)

- **`SkillExportCard` deleted**: no remaining consumers. The `/context` Step 1 is now a single "Describe a workflow" entry that opens `SkillCaptureSheet`. All voice capture moves into the sheet.
- **`AutomatePainCard` simplified**: strategic-blocker chips (Retention Challenge, Growth Blocker, etc.) removed — they were sourced from `user_memory` but weren't realistically automatable. The concrete pain selection lives inside `SkillCaptureSheet` for users who reach it from there.
- **Triage failure rescue**: when the triage gate rejects the voice clip (`custom_instruction` / `memory_fact` / `saved_style`), the transcript is now auto-rescued via `generate-custom-export` into a markdown context blob shown in Step 3, with the triage reasoning as an explanatory banner. Replaces the previous toast-only outcome.
- **Step 2 skipped on voice-led runs**: since markdown is the universal fallback for one-off context, the format picker is marked "skipped" and the user goes directly to Step 3.

### Outcomes from Phase 9

- 2 PRs merged: #108 (UX polish, 5 phases) and #110 (workflow consolidation)
- 2 new hooks (`useGeneratedArtifacts`, `useProfileBasics`) — total now 53
- 1 new migration (`20260513000000_generated_artifacts.sql`) — total now 99
- 1 new component directory (`src/components/library/`)
- 1 component deleted (`SkillExportCard`)
- `generate-skill-export` and `edge-generate` updated to write to `generated_artifacts`
- Leaders can now find every AI artifact they've generated — no more "it vanished when I closed the sheet"
- Triage-rejected voice input is no longer a dead end — it becomes a context export automatically