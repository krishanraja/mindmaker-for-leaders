# Features

Complete feature inventory across all three CTRL tools.

**Last Updated:** 2026-05-24

> **For sales/marketing AI agents**: every major feature in this doc has a "Sales Anchor" callout. Pull those into outbound copy. Every feature is shipped, deployed, and observable in production unless explicitly marked `[planned]`.

---

## Repo at a glance (verified 2026-05-24)

- **74 Supabase edge functions** (Deno runtime), grouped: 7 briefing, 5 memory, 5 AI generation, 4 billing, 6 diagnostic, 8 email, 9 enrichment, 11 leadership/missions/observability/voice, 1 skill builder (`generate-skill-export`), plus shared modules
- **53 React hooks** under `src/hooks/` (added in v5.2: `useSkillExport`, `useUserPains`, `useRevealOnMount`; added in v5.3: `useGeneratedArtifacts`, `useProfileBasics`)
- **99 PostgreSQL migrations** applied to remote (added in v5.2: `20260508000000_create_skill_exports.sql`; added in v5.3: `20260513000000_generated_artifacts.sql`)
- **PostgreSQL extensions in use**: pgvector, pgcrypto, pg_cron
- **6 audit-week tracks shipped** (PR #93-#101): revenue path, data path, UX, reliability, observability, cleanup. See `HISTORY.md` Phase 7.
- **Desktop UI redesign shipped** (PR #104, Phase 8): unified desktop-native shell — sticky top bar with page eyebrow + title + actions, optional right rail for context, Cmd/Ctrl+K Command Palette across all authenticated routes. No more stretched mobile markup on desktop.
- **UX polish + persistence shipped** (PR #108, Phase 9): copy refinement, voice/text segmented controls, empty states, generated artifact persistence + Library tab on `/memory`, personalized Edge paywall. See `HISTORY.md` Phase 9.
- **Workflow consolidation shipped** (PR #110, Phase 9): `SkillExportCard` deleted; `/context` Step 1 is now a single "Describe a workflow" entry opening `SkillCaptureSheet`. Triage-rejected transcripts auto-rescued as context exports. `AutomatePainCard` simplified to voice-first CTA only.
- **CI gates blocking on PRs**: typecheck (tsc --noEmit), full Vite build, ESLint on PR diff
- **Tests**: 5 Vitest unit/shared + 6 Playwright e2e (auth-journeys, briefing-journey, briefing-rate-limits, sparse-profile, account-deletion, stripe-webhook-idempotency)

---

## Leaders Tool: Individual AI Literacy Diagnostic

### Entry & Assessment

**Landing Page** (`HeroSection.tsx`)
- Apple-like, executive-grade design
- Subtle video background (12% opacity)
- Centered white card with generous padding
- Plain-language value proposition
- Single "Start diagnostic" CTA
- Trust indicators (checkmarks, muted text)
- No quiz/gamification language
- 10-minute time expectation set
- No-scroll on mobile

**Assessment Flow** (`UnifiedAssessment.tsx`)
- Quiz path: 20 Likert-scale questions across 6 dimensions
- Voice path: Compass module (5 questions) + ROI module
- Deep profile questionnaire: 13 contextual questions
- Contact collection: Name, email, company, role
- Progress tracking throughout

**Dimensions Assessed**
1. Strategic Vision
2. Experimentation Culture
3. Delegation & Automation
4. Data & Decision Quality
5. Team Capability
6. Governance & Ethics

### Results & Insights

**Overview Tab** (`LeadershipBenchmarkV2.tsx`)
- AI Literacy Diagnostic score (0-100)
- Tier classification (Emerging/Establishing/Advancing/Leading)
- Radar chart showing 6 dimension scores
- Peer comparison bubble chart (anonymised cohort data)
- Percentile ranking
- Dimension-specific scores and tiers

**Tensions Tab** (`TensionsView.tsx`)
- **Strategic Tensions**: Gaps between current and desired state
- **Risk Signals**: Shadow AI, skills gaps, ROI leakage, decision friction
- **Org Scenarios**: 3-5 year structural change projections
- Priority ranking for each item
- Plain-language descriptions tied to assessment data

**Tools Tab** (`PromptLibraryV2.tsx`)
- Personalised thinking tools (mental models + prompts)
- 3-8 tool categories based on diagnostic results
- Each category includes:
  - What it's for
  - When to use
  - How to use
  - 2-5 specific prompts
- Copy all tools functionality
- Download as text file

**Privacy Tab** (`ConsentManager.tsx`)
- AI Leadership Index consent management
- Data usage transparency
- Opt-in/opt-out controls
- Consent audit trail

### Data Architecture

**Tables Used**
- `leaders`: Profile data
- `leader_assessments`: Assessment records and metadata
- `leader_dimension_scores`: Dimension-specific scores
- `leader_insights`: Generated insights (edge, risk, next move)
- `leader_first_moves`: Actionable next steps
- `leader_prompt_sets`: Personalised thinking tools
- `leader_tensions`: Strategic gaps
- `leader_risk_signals`: Blind spots and waste indicators
- `leader_org_scenarios`: Future state projections
- `assessment_events`: Granular Q&A log
- `assessment_behavioral_adjustments`: Deep profile influence on scores
- `index_participant_data`: Anonymised benchmark data

**Edge Functions**
- `create-leader-assessment`: Creates assessment record and initial scores
- `ai-generate`: Central AI generation function (Vertex AI primary, OpenAI fallback) - produces insights, prompts, tensions, risks, scenarios, and first moves in a single call
- `populate-index-participant`: Anonymised benchmark contribution

### Free vs Paid

**Free Tier** (Default)
- Full diagnostic assessment
- Overview tab with benchmark scores
- Limited prompts (2 categories)
- Basic tensions view

**Paid Tiers** (Stripe-managed, signature-verified, idempotent)
- **Full Diagnostic** ($49 one-time): full tensions/risks/scenarios, complete prompt library (3-8 categories), priority ranking, downloadable reports.
- **Deep Context Upgrade** ($29 one-time): enhanced company context enrichment.
- **Full Diagnostic + Deep Context Bundle** ($69 one-time, saves $10): both above. Default upsell.

**Sales Anchor — Diagnostic**: "10 minutes. Six dimensions. The provocation report your board will ask you about. $49 — cheaper than the slide deck a consultant would write to ask you the same questions."

---

## Edge: Leadership Amplifier

A major new feature that synthesizes the user's Memory Web and assessment data into an actionable leadership profile.

### Overview

Edge analyzes everything CTRL knows about a leader and surfaces:
- **Strengths** to sharpen (with interactive pills and confidence scores)
- **Weaknesses** to cover (with AI-generated artifacts)
- **Intelligence gaps** to fill (guided resolution prompts)

### Components (11 files in `src/components/edge/`)

**EdgeView** (`EdgeView.tsx`) - Main view orchestrator
- Loads edge profile via `useEdge` hook
- Shows onboarding for first-time users (`EdgeOnboarding`)
- Displays strength/weakness pills with feedback loops
- Pro teaser cards for paid capabilities
- Intelligence gap cards with resolution prompts

**EdgeProfileCard** (`EdgeProfileCard.tsx`)
- Summary card showing profile synthesis state
- Re-synthesize button
- Last synthesized timestamp

**StrengthPill / GapPill** (`StrengthPill.tsx`, `GapPill.tsx`)
- Interactive pill components for strengths and intelligence gaps
- Tap to expand details
- Confidence scores and evidence

**EdgePaywall** (`EdgePaywall.tsx`)
- Pro tier upgrade wall
- Sample artifact previews (Board Memo, Strategy Doc, Email, Meeting Agenda, Framework)
- Personalized one-liner above the blurred sample when company name is available (e.g. "Board memo for Acme, Q2"). Falls back silently to generic sample when company name is absent. Added v5.3 via `useProfileBasics`.
- Stripe subscription integration via `useEdgeSubscription`

**DraftSheet / ArtifactPreview** (`DraftSheet.tsx`, `ArtifactPreview.tsx`)
- Bottom sheet for artifact generation
- Real-time generation progress
- Markdown rendering of generated content

**SmartProbeCard** (`SmartProbeCard.tsx`)
- Guided intelligence gap resolution
- Voice capture or text input
- Resolution types: voice_capture, diagnostic, md_upload, quick_confirm

### Capabilities

**Sharpen (amplify strengths):**
| Capability | Description |
|-----------|-------------|
| `systemize` | Turn instinct into repeatable frameworks |
| `teach` | Create docs to share how you think |
| `lean_into` | Find missions that leverage the strength |

**Cover (compensate for weaknesses):**
| Capability | Description |
|-----------|-------------|
| `board_memo` | Draft polished board memos |
| `strategy_doc` | Build strategy documents with context |
| `email` | Draft emails in your communication style |
| `meeting_agenda` | Prepare meeting agendas with context |
| `template` | Pre-filled templates with your facts |

### Data Architecture

**Tables:**
- `edge_profiles` - Synthesized strength/weakness profiles
- `edge_actions` - Generated artifacts and their metadata
- `edge_feedback` - User feedback on strength/weakness accuracy
- `edge_subscriptions` - Stripe subscription state for Pro tier

**Edge Functions:**
- `synthesize-edge-profile` - AI synthesis of user data into edge profile
- `edge-generate` - Generate artifacts (memos, docs, emails, etc.)
- `create-edge-subscription` - Stripe subscription creation
- `deliver-edge-artifact` - Email delivery of artifacts

**Hooks:**
- `useEdge` - Profile data, synthesis trigger, feedback submission
- `useEdgeSubscription` - Subscription state and access checks

### Free vs Pro

**Free:**
- Full strength/weakness profile
- Intelligence gap detection
- Feedback loops
- Limited artifact previews (samples only)

**Edge Pro** ($9/month, Stripe subscription):
- Unlimited artifact generation
- Email delivery via `deliver-edge-artifact`
- All capability types
- All 7 briefing types (incl. Boardroom Prep, Vendor Landscape, Competitive Intel, AI Model Landscape, Custom Voice)
- **Unlimited Agent Skill Builder generation** (`generate-skill-export`) — voice-to-Skill ZIP, downloadable into `~/.claude/skills/`
- Custom Voice Export (`generate-custom-export`)
- Subscription management UI via `create-billing-portal-session`
- Stripe webhook idempotency table (`stripe_events_processed`) prevents double-charges (Audit Week 1)

**Sales Anchor — Edge Pro**: "$9/month. Less than a coffee a week. Generates board memos, strategy docs, and meeting agendas in your register, on demand. Skip the blank page entirely."

---

## Unified Dashboard (`/dashboard`)

The Dashboard is the main authenticated hub, rendering either the **Memory Web** view (default) or the **Edge** view (`?view=edge`).

### Navigation

**Desktop** (`memory-web/DesktopSidebar.tsx`):
- Fixed left sidebar (264px)
- CTRL logo + Mindmaker icon
- 4 nav items: Home, Edge, Memory Web, Export to AI
- Settings + Sign Out at bottom

**Mobile** (`memory-web/BottomNav.tsx`):
- Fixed bottom nav bar with 4 tabs: Home, Edge, Memory, Export
- AppHeader at top
- Backdrop blur effect

### Memory Web View (Default)

**Desktop** (`DesktopMemoryDashboard.tsx`):
- Sidebar + main content area (max-w-4xl)
- Memory Web visualization, health metrics, category chart
- Intelligence panel, recent facts feed, pattern insights

**Mobile** (`MobileMemoryDashboard.tsx`):
- Full viewport height
- Scrollable content area
- Voice-first interaction via floating action button

**Guided First Experience** (`GuidedFirstExperience.tsx`):
- Shown to new users (no existing memory facts)
- 3-question onboarding flow
- Delivers first context export in 2 minutes
- Voice or text input

### Edge View

Shows the Edge leadership amplifier (see Edge section above for details).

### Legacy Dashboard Components

The following components still exist but are now part of legacy dashboard views or used in specific contexts:

**Mobile Dashboard Experience

### Dashboard Page (`/dashboard`)

**Mobile Layout** (`MobileDashboard.tsx`)
- Full viewport height (no-scroll)
- Fixed header with user name
- Scrollable content area
- Fixed bottom navigation
- Floating voice button

**Hero Status Card** (`HeroStatusCard.tsx`)
- Current tier display
- Percentile ranking
- Quick stats overview
- Visual tier indicator

**Priority Card Stack** (`PriorityCardStack.tsx`)
- Top priorities from tensions
- Swipeable card interface
- Action-oriented content
- Links to detailed views

**Bottom Navigation** (`BottomNav.tsx`)
- 4 navigation items
- Fixed bottom position
- Active state indicators
- Backdrop blur effect

**Voice Button** (`VoiceButton.tsx`)
- Floating action button
- Positioned above bottom nav
- Quick access to voice input
- Animated state changes

**Legacy Pages (Now Redirected to Dashboard):**

The following pages still exist as files but now redirect to `/dashboard`:

- `/today` → `/dashboard` (was daily focus view with Weekly Action + Daily Provocation)
- `/voice` → `/dashboard` (was standalone voice recorder)
- `/pulse` → `/dashboard` (was strategic pulse dashboard)
- `/diagnostic` → `/dashboard` (was assessment entry point)
- `/think` → `/dashboard?view=edge` (redirects to Edge view)

**Legacy Components (still used in dashboard context):**

**WeeklyActionCard / DailyProvocationCard** (`dashboard/WeeklyActionCard.tsx`, `dashboard/DailyProvocationCard.tsx`)
- Used in desktop dashboard grid
- Weekly focus action + daily reflection prompts

**StrategicPulse** (`pulse/StrategicPulse.tsx`)
- Strategic pulse summary (baseline, tensions, risks)
- Integrated into mobile dashboard sheets

### Sheet Component (`Sheet.tsx`)

**Specifications**
- Bottom sheet pattern
- Three height variants: small (40vh), medium (60vh), large (85vh)
- Backdrop with blur
- Spring animation physics
- Drag handle indicator
- Rounded top corners

---

## Memory Center

### Overview

Voice-first context extraction system that builds a persistent knowledge base about each leader, enabling increasingly personalised AI interactions over time.

**Page**: `/memory` (auth required)

### Features

**Voice-First Fact Extraction** (`VoiceMemoryCapture.tsx`)
- Record voice input about context, goals, blockers
- OpenAI Whisper transcription via `voice-transcribe` edge function
- AI extracts structured facts via `extract-user-context` edge function
- Facts categorised: identity, business, objective, blocker, preference
- Confidence scoring (0-1) on each extracted fact

**Fact Verification** (`FactVerificationCard.tsx`)
- Facts displayed with confidence indicators
- User can verify, correct, or reject each fact
- Verification statuses: inferred, verified, corrected, rejected
- Sources tracked: voice, form, linkedin, calendar, enrichment

**Memory Management** (`MemoryList.tsx`, `MemoryItemCard.tsx`, `MemoryPill.tsx`)
- Browse all stored memory facts
- Add facts manually via `AddMemorySheet.tsx`
- View detail via `MemoryDetailSheet.tsx`
- Delete or modify facts

**Privacy Controls** (`PrivacyControlsPanel.tsx`)
- Enable/disable memory collection
- Enable/disable auto-extraction from voice
- Set retention period (days)
- All settings managed via `memory-settings` edge function

**Data Export/Import** (`ExportImportPanel.tsx`)
- Export all memory data
- Import from external sources
- Data portability compliance

**Security**
- Content encrypted at rest using AES-256-GCM
- Encryption key stored in `MEMORY_ENCRYPTION_KEY` env var
- Decryption only in edge functions, never client-side
- RLS prevents cross-user access

### Data Architecture

**Tables Used**
- `user_memory`: Fact storage with encryption
- `user_memory_settings`: Privacy configuration

**Edge Functions**
- `memory-crud`: Create, read, update, delete memory facts
- `memory-settings`: Privacy settings management
- `extract-user-context`: AI fact extraction from voice
- `enrich-company-context`: Company context enrichment

**Library Tab** (added v5.3)

The `/memory` page now has a fourth tab, Library, alongside All Facts / Privacy / Data. It lists every AI-generated artifact (skills, drafts, frameworks, custom briefings) grouped by kind with inline markdown preview, copy, and remove actions. Artifacts are persisted in the `generated_artifacts` table and survive past the preview sheet close.

- `LibraryTab.tsx` (`src/components/library/`): grouped-by-kind list with count badge on the tab.
- `useGeneratedArtifacts.ts`: read/refetch/delete hook. Pattern-matched to `useUserPains`.
- `generate-skill-export` writes a `kind='skill'` row on success.
- `edge-generate` writes a `kind='draft'` or `kind='framework'` row on success.

**Table** (`20260513000000_generated_artifacts.sql`):
```
generated_artifacts
├── id (PK, uuid)
├── user_id (FK auth.users, ON DELETE CASCADE)
├── kind (TEXT: 'skill' | 'draft' | 'export' | 'framework' | 'briefing_custom')
├── name (TEXT)
├── body (TEXT) — full markdown content
├── metadata (JSONB) — kind-specific extras (e.g. zip_filename for skills, briefing_type for briefings)
└── created_at (TIMESTAMPTZ)
```
RLS: owner-read, owner-insert, owner-delete. Indexed on `(user_id, created_at DESC)` and `(user_id, kind)`.

### Components (12 files)
- `MemoryList.tsx`, `AddMemorySheet.tsx`, `MemoryDetailSheet.tsx`
- `MemoryItemCard.tsx`, `MemoryPill.tsx`, `FactVerificationCard.tsx`
- `VoiceMemoryCapture.tsx`, `PrivacyControlsPanel.tsx`, `ExportImportPanel.tsx`
- `MemoryErrorBoundary.tsx`
- `LibraryTab.tsx` (added v5.3)

### Hooks
- `useMemoryQueries.ts`: React Query integration for memory CRUD
- `useUserMemory.ts`: Memory state management
- `useGeneratedArtifacts.ts`: Artifacts CRUD (added v5.3)

---

## Context Export: Portable AI Context

### Overview

The headline differentiator: export your Memory Web as formatted context to any AI tool. One click to make ChatGPT, Claude, Gemini, Cursor, or any LLM instantly personalized.

**Page**: `/context-export` (auth required)

### Export Formats (6)

| Format | Target | Instructions |
|--------|--------|-------------|
| **ChatGPT** | OpenAI ChatGPT | Go to Settings > Personalization > Custom Instructions |
| **Claude** | Anthropic Claude | Paste at beginning of first message in new conversation |
| **Gemini** | Google Gemini | Paste as first message with "Context about me:" prefix |
| **Cursor** | Cursor IDE | Save as .cursorrules in project root |
| **Claude Code** | Claude Code CLI | Save as CLAUDE.md in project root |
| **Raw Markdown** | Any tool | Use anywhere that accepts markdown |

### Export Use Cases (6)

| Use Case | Optimized For |
|----------|--------------|
| **General Advisor** | All-purpose context for any AI conversation |
| **Meeting Prep** | Context optimized for preparing for meetings |
| **Decision Support** | Focus on goals, blockers, and decision history |
| **Code Review** | Technical preferences and project context |
| **Email Drafting** | Communication style and relationship context |
| **Strategic Planning** | Business context, objectives, and patterns |

### Features

- Format + use case selection matrix
- Real-time preview of generated context
- Token count display ("X tokens | Last updated [date]")
- One-click copy to clipboard
- Download as .md file
- Per-format instruction banners
- Quick export shortcut from dashboard header

### Data Architecture

**Edge Functions**
- `memory-export`: Generates formatted context from Memory Web, respecting privacy settings and token budgets

**Hooks**
- `useMemoryExport.ts`: Export generation, format selection, and clipboard integration

---

## Agent Skill Builder: Voice-to-Skill Pipeline (Edge Pro)

### Overview

Turns a repetitive leader workflow into a downloadable, **agentskills.io-compliant** Agent Skill the leader drops into `~/.claude/skills/`. The leader describes (voice or text) one thing they do at least weekly. CTRL extracts the trigger, the steps, the format constraints, and packages it as a ZIP that auto-triggers in Claude Code / Claude.ai / Cursor whenever their language matches.

This is the third surface on the Context Export page (`/context`). Two minutes describing a Monday-morning ritual is enough to generate a permanent piece of agent infrastructure the leader owns.

**Pages / surfaces:**
- `/context` (Step 1) — a single "Describe a workflow" entry (formerly two separate cards) opens `SkillCaptureSheet`. Edge Pro gated.
- Edge view (`/dashboard?view=edge`) — `AutomatePainCard` shows a voice-first CTA ("Automate a recurring pain"); strategic-blocker chip row removed in v5.3.
- Memory Web blocker cards — zap button on each blocker
- Briefing — zap button on every `decision_trigger` segment (v1 + v2)

All entry points hand the user's already-declared pain to the Skill Builder via a `SkillSeed`, navigate to `/context`, and auto-open `SkillCaptureSheet` pre-anchored. The LLM grounds extraction in the leader's actual words instead of inventing an abstract trigger.

### The Pipeline (shipped May 2026)

Seven stages, all running inside `generate-skill-export/index.ts`:

| Stage | What it does | Model / Tool |
|---|---|---|
| 1. Edge Pro gate | Verify `edge_subscriptions.status` is `active` or `past_due` | Postgres |
| 2. Context build | Pull Memory Web facts + edge profile strengths/weaknesses for grounding | `buildMemoryContext` (3000 token budget) |
| 3. Triage (Three Honest Tests) | Decide whether the input is really a skill, a Memory Web fact, a Custom Instruction, or a Saved Style. Triage failures route the input to the right surface and are still logged in `skill_exports` for analytics. | OpenAI JSON mode (gpt-4o), temperature 0.3 |
| 4. Extraction | Generate skill name, description, body, references, test prompts, gotchas, archetype | OpenAI JSON mode |
| 5. Quality gate | Validate 5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections, no bare MUST/NEVER, valid name format | `runQualityGate` (deterministic) |
| 6. ZIP assembly | Build the agentskills.io standard bundle: single root folder, `SKILL.md` + `references/` + `01-test-prompts.txt` + `02-maintenance-card.txt` + `03-install-guide.txt` | `buildSkillZip` (Deno + JSZip) |
| 7. Persist | Insert into `skill_exports` (one row per attempt, including failed triage), return base64 ZIP inline | Supabase service role |

The Three Honest Tests triage is the value-prop differentiator: when a leader describes a one-time fact ("I worked at Microsoft in 2010"), CTRL routes that to Memory Web rather than generating a useless skill. When they describe a tone preference ("I always write in plain English"), it routes to Custom Instructions. Skills only get generated when the input is a repeatable, triggerable workflow.

### Skill Archetypes

Every generated skill is tagged with one of five archetypes (used for analytics and for tuning future routing):

- **decision-framework** — recurring decision templates (e.g. RFP triage, hire/no-hire)
- **voice-lock** — exec writing patterns that must hold across many outputs (e.g. board update voice)
- **reporting-engine** — periodic structured reports (e.g. weekly hiring sync, investor update)
- **tool-integration** — workflows that bridge external systems
- **getting-started** — onboarding / first-touch skills

### Pain-Anchored Entry Points

Skill creation is a reflex on the page where the pain shows up, not a standalone trip to `/context`:

| Entry point | Component | Seed kind |
|---|---|---|
| Edge view voice CTA | `AutomatePainCard` | `blocker` or `decision` (seeded inside sheet) |
| Memory Web blocker card | Zap button on `MemoryItemCard` | `blocker` |
| Briefing decision-trigger segment | Zap button on `BriefingCard` and `SegmentCard` | `briefing_segment` |
| Curated examples (cold-start fallback) | `SkillCaptureSheet` chips | `example` |

The seed flows: entry point → `useNavigate('/context', { state: { skillSeed } })` → `ContextExport` page detects and auto-opens `SkillCaptureSheet` with a pre-filled scaffold. The user only adds the steps they follow today; the leading pain is already there.

### The SkillCaptureSheet (mobile bottom sheet / desktop dialog)

- Voice mode (default when no seed): up to 5 minutes of recording, OpenAI Whisper transcript, optional review/edit before submit
- Text mode (default when arriving with a seed): pre-filled scaffold built from the seed text
- Pain picker chip row when no seed is provided (pulls top 5 from `useUserPains`)
- Curated example chips fallback when the leader has no declared pains yet (Monday board update, Weekly hiring sync, RFP triage, Investor update)
- 20-character minimum on the description

### The SkillPreviewSheet

- Skill description and archetype
- "Saved to Library" pill in the header confirming the artifact is durable (visible in `/memory` Library tab)
- Big Download CTA (decodes the base64 ZIP into a Blob in-browser)
- Quality gate checklist (passed / total, per-check detail)
- Test prompts with copy buttons (the leader pastes these into Claude to verify the skill triggers)
- Install guide accordion: leads with the Claude.ai path (3 inline steps + direct deeplink to claude.ai/settings/capabilities). Claude Code (`~/.claude/skills/`) and Cursor collapsed under "Other install options".

### Triage Routing

When the triage gate decides the input isn't a skill, the response is:

```
{ triage: { passed: false, result: "memory_fact" | "custom_instruction" | "saved_style", reasoning: "..." } }
```

Since v5.3 (PR #110), triage-rejected transcripts are not discarded. The transcript is automatically rescued via `generate-custom-export` and the resulting markdown context blob is shown in Step 3 with the triage reasoning as an explanatory banner. Step 2 (format picker) is skipped on voice-led runs since markdown is the universal fallback. This replaces the previous toast-only outcome. The attempt is still logged in `skill_exports` for analytics.

### Data Architecture

**Table** (`20260508000000_create_skill_exports.sql`):

```
skill_exports
├── id (PK, uuid)
├── user_id (FK auth.users, ON DELETE CASCADE)
├── skill_name (TEXT)
├── description (TEXT)
├── transcript (TEXT) — original input, kept for analytics
├── triage_result (TEXT: 'skill' | 'custom_instruction' | 'memory_fact' | 'saved_style' | 'failed')
├── body_content (TEXT, null on failed triage)
├── references_json (JSONB)
├── test_prompts (TEXT[])
├── quality_gate (JSONB) — full checklist result
├── archetype (TEXT) — one of the 5 archetypes above
├── version (INT) — supports skill iteration
├── zip_path (TEXT) — null today; reserved for future Storage upload + shareable links
└── created_at (TIMESTAMPTZ)
```

RLS: owner-read, owner-insert. Indexed on `user_id` and `created_at DESC`.

**Edge Function:**
- `generate-skill-export` — the whole pipeline. Edge Pro gated (`active` or `past_due` grace). 4 internal files: `index.ts`, `prompt.ts` (system + user prompts encoding the triage rules + extraction rules), `quality-gate.ts` (deterministic validator), `zip.ts` (agentskills.io packager).

**Hooks:**
- `useSkillExport` — wraps the edge function. Manages full lifecycle: call, parse, decode the base64 ZIP into a downloadable Blob.
- `useUserPains` — returns the top N blockers + active decisions from the leader's Memory Web for seeding entry points.
- `useGeneratedArtifacts` — reads, refetches, and deletes rows from `generated_artifacts`. Pattern-matched to `useUserPains`. Added v5.3.
- `useProfileBasics` — reads the leader's `company_name` and `role` from `user_memory` (handles common fact-key aliases). Used to personalize the Edge paywall sample. Added v5.3.

**Components** (`src/components/edge/` + `src/components/memory-web/`):
- `SkillCaptureSheet` — voice/text capture, bottom sheet on mobile, dialog on desktop
- `SkillPreviewSheet` — preview + download CTA + install guide + "Saved to Library" indicator
- `SkillQualityGate` — quality checklist display
- `SkillInstallGuide` — per-tool install instructions (leads with Claude.ai, others collapsed)
- `AutomatePainCard` — voice-first CTA on Edge view (chip row removed in v5.3)
- `LibraryTab` — grouped-by-kind list of persisted artifacts in `/memory` (added v5.3)

**Deleted in v5.3:**
- `SkillExportCard` — removed (PR #110). The `/context` Step 1 entry is now a unified single card.

### Edge Pro Gating

Free users see the locked `/context` Step 1 card with a "Pro" badge that opens the Stripe checkout via `useEdgeSubscription.subscribe`. Subscribers get unlimited skill generation.

**Sales Anchor — Skill Builder**: "Describe one weekly workflow out loud. CTRL hands you a Claude Skill that auto-triggers whenever your team's language matches. Two minutes of speaking. Permanent leverage. Drop it in `~/.claude/skills/` and forget it."

---

## Daily Briefing: Personalised Intelligence with an Evidence-Based Lens

The most sophisticated component of the Leaders tool. Produces a 500-600 word audio briefing every morning, tuned to what this specific leader cares about today. Built on an evidence-based relevance pipeline (v2) that can prove, story by story, why every headline earned its place in front of you.

**Pages / surfaces:**
- `/dashboard` - inline briefing card with expandable segments and quick actions
- `BriefingSheet` - full-screen slide-up with audio player and segment details
- `BriefingPage.tsx` - deep-link view for a specific briefing

### The Pipeline (v2, merged April 2026)

Seven stages, all running inside `generate-briefing/index.ts`:

| Stage | What it does | Model / Tool |
|---|---|---|
| 1. Importance Lens | Ranks the profile items that matter TODAY for THIS briefing type | gpt-4o-mini (structured JSON), 24h cache |
| 2. Query Planner | Turns the lens into 4-6 targeted news queries | gpt-4o-mini |
| 3. Provider Fan-out | Perplexity + Tavily + Brave in parallel, 12s wall-clock cap | `Promise.allSettled` |
| 4. Embedding Dedupe + Scoring | Cosine dedupe, user-exclude filter, relevance scoring | `text-embedding-3-small` (batched), pgvector |
| 5. Budget-Constrained Curation | Picks final segments within word budget with diversity + coverage rules | gpt-4o-mini |
| 6. Script Generation | Writes the audio script using training_material voice + rubric | gpt-4o |
| 7. Audio Synthesis | Generates the MP3 | ElevenLabs (`synthesize-briefing` fire-and-forget) |

Every retained segment carries three evidence fields v1 never captured:
- `lens_item_id` - which lens item this story matched
- `relevance_score` - cosine similarity * lens weight
- `matched_profile_fact` - the quoted text from the user's profile that justifies the story

Routed behind a per-user flag - `user_memory.briefing_v2_enabled`, or the `BRIEFING_V2_ENABLED_DEFAULT` env var. `ai_landscape` briefings stay on v1 (they use synthetic headlines from live AA benchmark data, not live news).

### Briefing Types

| Type | Intent | Pro only? |
|---|---|---|
| `default` ("Daily Brief") | Top stories for your world | No |
| `macro_trends` | Big shifts in AI / markets / regulation | No |
| `vendor_landscape` | Launches, pricing, vendor moves | Yes |
| `competitive_intel` | What your watchlist is doing | Yes |
| `boardroom_prep` | Trends and data for exec presentations | Yes |
| `ai_landscape` | Live benchmarks on models that matter | Yes |
| `custom_voice` | User describes what they need | Yes |

### Briefing Interests (user-declared preferences)

A first-class surface that overrides inferred signals. Three kinds:

- **Beats** - topics you want covered (e.g. "creator monetization", "AI pricing"). Become lens items with weight 1.0. LLM cannot demote them below 0.8.
- **People & Companies** - named entities to track (e.g. "MrBeast", "OpenAI"). Also weight 1.0.
- **Don't show me** - topics to permanently kill. Post-filters the candidate pool - any story within 0.80 cosine of an exclude never surfaces.

**UI:**
- Settings → Interests tab (position 3, after Account + Work)
- Inline `SeedBeatsPrompt` on the dashboard for cold-start users
- Inline Bookmark button on every v2 segment (pins the `matched_profile_fact` as a beat)
- Inline Ban button (records a persistent kill - see below)

**Data:** `briefing_interests` table, RLS-guarded to owner, soft-delete via `is_active`.

### Industry-Aware Seed Beats

Solves the new-user cold-start. Before a user has declared anything, the `SeedBeatsPrompt` proposes a relevant starter set of beats and entities keyed to their declared industry.

**Library (`industry_beat_library` table):**
- 11 industries seeded: `creator_economy`, `saas`, `healthcare`, `finance_fintech`, `consulting_professional_services`, `ecommerce_retail`, `media_publishing`, `education_edtech`, `biotech_life_sciences`, `legal_services`, `generic`
- Each row: 6-8 curated beats + 4-7 recommended entities + fuzzy-match aliases
- Editable via SQL without redeploy (content ops friendly)

**Resolution:** fuzzy match on user's `industry` fact; longest-alias wins; `generic` fallback. Pre-filters anything the user already added or excluded. Taps write `briefing_interests` rows with `source='seed_accepted'`.

### Persistent Semantic Feedback Loop

Promotes thumbs-down from a per-segment reaction into a durable signal that reshapes the lens. Signatures are SHA-256 of `bucket|normalized_text`, so feedback persists across daily lens regenerations.

**Two sources, both stored in `briefing_lens_feedback`:**

1. **Explicit kill** (`source='kill'`, delta = -1.0) - user taps the Ban icon on any v2 segment. Takes effect on the next generation.
2. **Aggregated thumbs-down** (`source='not_useful_aggregate'`, delta = -0.4) - nightly `pg_cron` job (`briefing-aggregate-feedback-nightly`, 03:07 UTC) promotes any lens signature that has accumulated 3+ not_useful reactions in the last 30 days.

`applyFeedbackDeltas` runs in both the cold build path and the cached-lens path, so kills don't need to wait for the 24h lens cache to expire.

**Kill UI:** Ban icon on `SegmentCard` and on `BriefingCard`'s inline segments, hidden on interest-type items (users remove their own interests from the Settings tab instead).

### Feedback That Does Something

Thumbs-up / thumbs-down now capture:
- `lens_item_id` - what the segment was anchored to
- `dwell_ms` - how long the user kept the segment open before reacting
- `replayed` - whether they replayed the audio

This is the substrate the aggregator reads from.

### Segment UI (v2)

Every v2 segment on the dashboard shows:
1. Framework tag badge (SIGNAL / DECISION TRIGGER / KRISH'S TAKE)
2. Headline (rewritten through the leader's lens, 8-16 words)
3. `Anchored to: <lens item>` chip - the evidence
4. Thumbs-up / thumbs-down (feedback)
5. Bookmark (pin the anchor as a persistent beat)
6. Ban (kill the lens signature)
7. Source badge

### Preliminary Insert Pattern

`generate-briefing` writes an EARLY briefing row as soon as raw headlines are scored, so the frontend can show results while curation + script generation run in the background. The frontend polls every 3s; the preliminary row has `script_text = null` and empty `analysis` / `relevance_reason` fields that fill in when curation completes.

### Data Architecture

**Tables**
- `briefings` - one row per briefing (`schema_version = 2` for v2 rows); carries `segments JSONB[]`, `context_snapshot` (lens + queries + excludes), `audio_url`
- `briefing_feedback` - per-segment reactions with v2 fields (`lens_item_id`, `dwell_ms`, `replayed`)
- `briefing_interests` - user-declared beats / entities / excludes
- `industry_beat_library` - reference data for cold-start seeds
- `briefing_lens_feedback` - persistent negative deltas per lens signature
- `ai_response_cache` - lens cache + lens-item embedding cache
- `training_material` - YAML voice guide (structural_rubric, hot_signal_taxonomy, exemplars, watchlist)

**Extensions:** pgvector (for embeddings), pgcrypto (for signature hashing), pg_cron (for the nightly aggregator).

**Edge Functions**
- `generate-briefing` - main pipeline (both v1 + v2 paths)
- `synthesize-briefing` - ElevenLabs audio synthesis
- `briefing-diagnose` - read-only diagnostic: returns profile + lens + last briefing + feedback stats for the authenticated user
- `get-industry-seeds` - returns industry-specific beat / entity suggestions
- `briefing-kill-lens-item` - records an explicit kill
- `briefing-aggregate-feedback` - admin / cron entrypoint (the nightly schedule uses a SQL function `sp_aggregate_briefing_feedback` so no service-role key is needed)

**Shared modules** (`_shared/`)
- `briefing-lens.ts` - Stages 1 + 2 (lens + query planner)
- `briefing-scoring.ts` - Stage 4 (embeddings + dedupe + scoring + exclude filter)
- `briefing-curation.ts` - Stage 5 (budget-constrained picker)
- `user-context.ts` - profile projection (shared with diagnose)
- `lens-signature.ts` - SHA-256 signature of `(type, text)` for stable feedback keying
- `training-loader.ts`, `ai-cache.ts`, `model-router.ts`, `rateLimit.ts` - reused infra

**Frontend hooks**
- `useBriefing` - briefing fetch + polling
- `useBriefingInterests` - CRUD for the Interests tab
- `useIndustrySeeds` - cold-start suggestions
- `useKillLensItem` - kill action wrapper

### Pipeline Flags / Env Vars

- `BRIEFING_V2_ENABLED_DEFAULT` - global default for v2 routing (`false` to stay on v1)
- `BRIEFING_DEDUPE_THRESHOLD` - cosine threshold for headline dedupe (default 0.87)
- `BRIEFING_EXCLUDE_THRESHOLD` - cosine threshold for user-exclude post-filter (default 0.80)

### Reliability hardening (Audit Week 4)

The briefing pipeline ships with concrete reliability primitives:
- **`with-timeout` utility** (`supabase/functions/_shared/with-timeout.ts`, tested) wraps every external API call with explicit timeouts and retries.
- **Provider fan-out** uses `Promise.allSettled` with a 12-second wall-clock cap so a single slow provider can't block the briefing.
- **Audio failure UX**: if synthesis fails, the briefing card still shows segments + script. The MP3 is fire-and-forget and degrades gracefully.
- **Rate limits** on `generate-briefing` (Audit Week 1) prevent abuse and runaway cost.
- **Onboarding stall recovery** for users who started a briefing then closed the app.

### Observability (Audit Week 5)

- **Structured edge-function logger** (`supabase/functions/_shared/logger.ts`) emits JSON logs with `ts`, `level`, `fn`, `msg`, `userId`, `duration_ms`, `error`. Searchable in Supabase logs.
- **CI gate** prevents `console.log` regressions in edge functions.
- **`with-timeout` test coverage** validates retry + timeout behaviour.

**Sales Anchor — Daily Briefing**: "Three minutes a day that replace thirty minutes of scrolling. Every story shows the specific profile fact it was anchored to. Bookmark to keep a beat. Ban to kill a topic semantically. Your briefing gets sharper every day."

---

## Guided First Experience (Onboarding)

### Overview

Builds a leader's "digital double" in approximately 3 minutes through 3 guided voice questions. Designed to deliver immediate value. The user has an exportable AI context before reaching the dashboard.

### Flow

1. **Welcome** - "Let's build your AI double" (icon + CTA)
2. **Intro** - Shows 3 pillars: Memory Web, 10X Skills Map, Master Prompts
3. **Question 1: Identity** - "Tell me about yourself" (voice or text)
4. **Question 2: Work** - "Tell me about your work" (voice or text)
5. **Question 3: Goals** - "What are you working toward?" (voice or text)
6. **Processing** - Transcription, fact extraction, Memory Web building (animated)
7. **Value Moment** - "Your AI double knows X things about you" + live preview of exportable context + copy to clipboard
8. **Complete** - "Your digital clone is live", redirects to Dashboard

### Key Design Decisions

- Voice-first with text alternatives on every question
- Animated waveform during recording
- Progress bars (3 areas) at top
- Each question has area icon, title, prompt, hint
- Fact verification step lets user accept/reject extracted facts
- Value moment shows actual exportable context, proving immediate value

### Components
- `GuidedFirstExperience.tsx` (orchestrator)
- `src/components/onboarding/` (step components)

---

## Pattern Detection & 10X Skills

### Overview

AI analyzes the Memory Web to surface patterns: strengths to amplify, blind spots to address, and behavioral preferences. Displayed on the dashboard.

### Pattern Types

| Type | Description | Dashboard Section |
|------|-------------|-------------------|
| **strength** | Strengths to 10X - capabilities to amplify | "Strengths to 10X" card |
| **blind_spot** | Gaps or risks to address | "Blind Spots" card |
| **preference** | Working style and approach preferences | "Behaviors & Preferences" card |
| **behavior** | Recurring behavioral patterns | "Behaviors & Preferences" card |
| **anti_preference** | Things the user avoids or dislikes | "Behaviors & Preferences" card |

### Features

- Confidence scoring (0-1) on each pattern
- Patterns derived from Memory Web facts
- Auto-updated as Memory Web grows
- Up to 4 patterns displayed per section on dashboard

### Data Architecture

**Tables Used**
- `user_patterns`: Pattern storage with type, label, description, confidence

**Edge Functions**
- `detect-patterns`: AI pattern detection from Memory Web facts

---

## Decision Tracking

### Overview

Tracks decisions captured through the Decision Advisor tool, maintaining a history of choices with active/superseded status.

### Data Architecture

**Tables Used**
- `user_decisions`: Decision records with status (active, superseded), content, and timestamps

**Hooks**
- `useDecisions.ts`: Decision CRUD and history queries

---

## Memory Web Dashboard

### Overview

The central hub showing the leader's AI double health, Memory Web coverage, patterns, and facts.

### Dashboard Components

**AI Double Health Card**
- Animated health score percentage
- Stats: Total facts, Verified count, Patterns count, Decisions count
- Progress bar visualization
- "Getting Smarter" progress indicators

**Memory Web Coverage**
- Breakdown by category: Identity, Business, Goals, Challenges, Preferences
- Horizontal bar charts with counts per category
- Visual indicators for coverage gaps

**Skills & Patterns (3-column layout)**
- Strengths to 10X (with confidence scores)
- Blind Spots (with confidence scores)
- Behaviors & Preferences

**Memory Web Facts Grid**
- 2-column grid, up to 12 facts displayed
- Each fact: label, value, category badge, temperature badge (hot/warm/cold), verification status
- Expandable for context and confidence
- "View all X facts" link

**Voice Input Bar**
- Mic button with live recording indicator
- Text input: "Add to your digital clone - narrate anything about your work, goals, or challenges..."
- Persistent on dashboard for continuous Memory Web building

**Quick Export**
- Dashboard header shortcut to copy Claude export to clipboard

---

## Missions System (First Moves)

### Overview

After completing the diagnostic, leaders receive 3 prioritised "First Moves" - concrete next steps. The Missions system allows leaders to commit to a First Move, track progress through check-ins, and measure completion.

### Features

**First Move Selection** (`FirstMoveSelector.tsx`)
- Displays 3 AI-generated first moves from diagnostic
- Each move has content and priority ranking
- Leader selects one to commit as active mission

**Mission Dashboard** (`MissionsDashboard.tsx`)
- Active mission display with status
- Mission statuses: active, completed, skipped, extended
- Quick access to check-in

**Mission Check-In** (`MissionCheckIn.tsx` page)
- Structured reflection on mission progress
- Text and voice input support
- AI-generated response to reflection
- Check-in history

**Mission History** (`MissionHistory.tsx` page)
- View all past missions
- Status tracking (completed, skipped, extended)
- Timeline of check-ins per mission

### Data Architecture

**Tables Used**
- `leader_first_moves`: AI-generated first moves (3 per assessment)
- `leader_missions`: Active mission commitments
- `leader_check_ins`: Check-in reflections and AI responses

**Edge Functions**
- `send-mission-check-in`: Check-in reminder notifications

### Hooks
- `useMissions.ts`: Missions CRUD and state management

---

## Progress Tracking

### Overview

Tracks leader progress over time through periodic snapshots and drift detection, measuring how AI literacy evolves after the initial diagnostic.

### Features

**Progress Snapshots** (`Progress.tsx` page)
- Periodic captures of current state
- Comparison against baseline assessment
- Visual trajectory display

**Drift Detection**
- Measures change from baseline scores
- Identifies areas of improvement or regression
- Generates drift score

**Adoption Momentum**
- Tracks engagement patterns
- Measures tool usage frequency
- Identifies momentum trends

### Data Architecture

**Tables Used**
- `leader_progress_snapshots`: Point-in-time captures

**Edge Functions**
- `generate-progress-snapshot`: Generate snapshot data
- `compute-drift`: Calculate drift from baseline
- `batch-compute-drift`: Batch drift computation
- `update-adoption-momentum`: Momentum tracking

### Hooks
- `useProgress.ts`: Progress data queries

---

## Weekly Check-ins

### Overview

Structured weekly reflections that help leaders maintain engagement with their AI literacy development.

**Page**: `/check-in` (auth required)

### Features

- Weekly structured reflection prompts
- Text and voice input
- AI-generated responses and recommendations
- Check-in history and streaks

### Data Architecture

**Edge Functions**
- `submit-weekly-checkin`: Process check-in submission
- `send-weekly-checkin-reminder`: Reminder notifications
- `generate-weekly-prescription`: Weekly prescription content

### Hooks
- `useCheckIns.ts`: Check-in queries and state

---

## Operator Tools

### Overview

AI-powered tools for day-to-day leadership decision-making, available after completing the diagnostic.

### Features

**Decision Advisor** (`operator-decision-advisor`)
- AI-powered decision analysis
- Contextualised to user's assessment data and memory
- Applies cognitive frameworks

**Meeting Prep** (`generate-meeting-prep`)
- AI-generated meeting preparation content
- Tailored to user's context and objectives

**Prompt Coach** (`prompt-coach`, `PromptCoach.tsx` page)
- Interactive prompt coaching
- Teaches effective AI prompting techniques

**Sharpen Analysis** (`sharpen-analyze`)
- Skill improvement analysis
- Targeted development recommendations

**Daily Prompt** (`get-daily-prompt`)
- Daily provocative prompt generation
- Tied to user's tensions and context

**Weekly Action** (`get-or-generate-weekly-action`)
- Weekly action item generation
- Contextualised to current mission and progress

---

## Teams Tool: Executive Bootcamp Platform

### Pre-Work & Planning

**Intake Form** (`exec_intakes` table)
- Company context and strategic objectives
- AI maturity baseline
- Participant roster
- Preferred dates and logistics
- Workshop customisation preferences

**Bootcamp Planning** (`bootcamp_plans` table)
- Agenda configuration (7 segments)
- Cognitive baseline data
- Risk tolerance assessment
- Strategic goals 2026
- Required pre-work assignment
- Simulation snapshots

**Executive Pulse** (`exec_pulses` table)
- Pre-workshop individual assessments
- 4 scores: Awareness, Application, Governance, Trust
- Pulse responses JSON
- Profile linking

### Workshop Segments (7-Part Flow)

**Segment 1: Mirror** (Cognitive Baseline)
- Individual AI readiness snapshot
- Current state assessment
- Team comparison view

**Segment 2: Time Machine** (Bottleneck Mapping)
- Sticky note bottleneck submissions
- Spatial clustering on canvas
- Drag-and-drop prioritisation
- Export bottleneck map

**Segment 3: Crystal Ball** (AI Myth Busting)
- Common AI misconceptions
- Evidence-based reframing
- Team discussion facilitation

**Segment 4: Rewrite** (Effortless Map)
- Three lanes: Protect, Automate, Elevate
- Constraint inversion exercise
- Voting and prioritisation
- Sponsor assignment

**Segment 5: Huddle** (Synthesis Generation)
- AI-generated summary of workshop themes
- Priority actions identification
- Key concepts capture
- Tension mapping

**Segment 6: Draft** (Pilot Charter)
- Structured pilot definition
- Success criteria
- Resource allocation
- Timeline and milestones
- Governance model

**Segment 7: Provocation** (Provocation Report)
- What's really at stake
- Uncomfortable questions
- Structural implications
- Board-ready executive summary

### Facilitator Dashboard

**Workshop Session Management** (`workshop_sessions` table)
- Live segment tracking
- Participant count
- Timer controls per segment
- Real-time submission monitoring
- QR code generation for mobile participants

**Activity Session Management** (`activity_sessions` table)
- Per-activity QR codes
- Submission tracking
- Data aggregation
- Export capabilities

### Data Architecture

**Tables Used**
- `exec_intakes`: Pre-workshop intake data
- `bootcamp_plans`: Workshop configuration and planning
- `exec_pulses`: Individual pre-work assessments
- `workshop_sessions`: Live workshop state
- `activity_sessions`: Per-activity state
- `bottleneck_submissions`: Time Machine sticky notes
- `effortless_map_items`: Rewrite exercise data
- `huddle_synthesis`: AI-generated workshop summary
- `decision_frameworks`: Captured team frameworks

**Edge Functions**
- `send-booking-notification`: Intake confirmation email
- `send-advisory-sprint-notification`: Workshop prep email

---

## Partners Tool: Portfolio Assessment

### Partner Setup

**Partner Intake**
- Firm name and type (VC/PE/Consulting)
- Portfolio size and stage focus
- Assessment goals
- Contact details

### Portfolio Scoring

**Individual Company Entry**
- Company name and stage
- Industry and size
- AI maturity signals (binary or 1-5 scale)
- Contact person
- Notes

**Bulk Import**
- CSV upload for portfolio data
- Validation and error handling
- Batch processing

**Scoring Dimensions**
- Leadership alignment
- Experimentation culture
- Data readiness
- Team capability
- Governance maturity

### Portfolio View

**Heatmap Visualisation**
- Company rows × Dimension columns
- Colour-coded readiness levels
- Sortable and filterable
- Click-through to company detail

**Prioritisation**
- Aggregate scores per company
- Risk flagging
- Intervention priority queue
- Co-delivery opportunity identification

**Offer Pack Generation**
- Portfolio-wide AI literacy package
- Tiered pricing options
- Delivery timeline
- Resource requirements

### Data Architecture

**Tables Used**
- `partner_profiles`: Partner firm data
- `portfolio_companies`: Company inventory
- `portfolio_assessments`: Company-level scores
- `partner_offer_packs`: Generated packages

**Edge Functions**
- Portfolio scoring computation
- Offer pack generation
- Heatmap data aggregation

---

## Shared Features (Cross-Tool)

### Authentication & User Management
- Email/password auth via Supabase
- Google OAuth option
- Password reset flow
- Profile management

### AI Integration
- Vertex AI (Gemini 2.0 Flash) as primary generation model
- OpenAI GPT-4o as fallback
- OpenAI Whisper for voice transcription
- Structured output validation via Zod schemas
- Cognitive frameworks embedded in AI prompts
- AI response caching and rate limiting

### Data Privacy & Consent
- GDPR-compliant consent management
- Data anonymisation for benchmarking
- Audit trail for consent changes
- Opt-out mechanisms

### Email Notifications
- Assessment completion confirmation
- Workshop booking confirmation
- Advisory sprint notifications
- Diagnostic report delivery

### Payment Processing
- Stripe integration for Leaders diagnostic upgrade
- One-time payment ($49)
- Payment verification
- Receipt generation

### Analytics & Benchmarking
- Anonymised aggregate scoring (AI Leadership Index)
- Cohort comparison (by role, industry, company size)
- Quarterly index snapshots
- Momentum tracking

### Export & Sharing
- PDF export of diagnostic results
- Text file download of prompts
- Referral code generation
- Social sharing (coming soon)

---

## Mobile-First Architecture

### No-Scroll Mobile Experience

**Requirements**
- Every page fits viewport on mobile
- Fixed headers and navigation
- Scrollable content areas only
- Proper viewport handling with `--mobile-vh`

**Implementation Pattern**
```tsx
<div className="h-[var(--mobile-vh)] overflow-hidden flex flex-col">
  <header className="flex-shrink-0">
    {/* Fixed header */}
  </header>
  <main className="flex-1 overflow-y-auto">
    {/* Scrollable content */}
  </main>
  <nav className="flex-shrink-0">
    {/* Fixed bottom nav */}
  </nav>
</div>
```

### Touch Targets
- Minimum 44x44px for all interactive elements
- Generous padding on buttons
- Adequate spacing between tap targets

### Safe Areas
- Account for notches (top safe area)
- Account for home indicators (bottom safe area)
- Use `env(safe-area-inset-*)` CSS functions

---

## Animation & Motion

### Motion Library
- Framer Motion for all animations
- Consistent spring physics (stiffness: 400, damping: 35)
- Shared animation variants in `src/lib/motion.ts`

### Animation Types
- `fadeIn`: Opacity transitions
- `slideUp`: Vertical entrance animations
- `scaleIn`: Scale transitions
- `pageTransition`: Full page transitions
- `cardEntrance`: Card-specific animations

### Principles
- Fast, not slow (200-350ms)
- Smooth, not bouncy
- Subtle, not dramatic
- Respect reduced motion preferences

---

## Audit Track Record (April 2026)

CTRL shipped six thematic audit weeks closing technical debt and hardening the product for executive use. Sales/marketing AI agents can cite these as **proof of operational maturity** — this is not a prototype, it's a hardened production platform.

| Week | Theme | Headline Outcomes |
|------|-------|-------------------|
| 1 (PR #93) | **Revenue path** | Mandatory Stripe webhook signature verification; webhook idempotency table (`stripe_events_processed`); briefing rate limits; create/verify diagnostic payment hardened; Edge Pro subscription path validated |
| 2 (PR #94) | **Data path** | Closed assessment data leak; codified storage bucket policy (`ctrl-briefings`); end-to-end account deletion; RLS audit |
| 3 (PR #95) | **UX** | Killed onboarding gate; fixed NorthStar stub; voice permission recovery; killed surveillance copy; removed all "coming soon" placeholders for unimplemented affordances |
| 4 (PR #99) | **Reliability** | Timeouts + retries on all external APIs (`with-timeout` utility, tested); audio failure UX; onboarding stall recovery |
| 5 (PR #97) | **Observability** | Structured edge-function JSON logger (`_shared/logger.ts`); CI gate against `console.log` regressions; tests for `with-timeout` |
| 6 (PR #98, #100, #101) | **Cleanup** | P2 backlog closure; stale-incomplete recovery; e2e contract starter (auth, briefing, account-deletion, stripe-idempotency, sparse-profile, briefing-rate-limits); AI response cache; lint cleanup |

### Verifiable proof points for buyers

- Stripe webhook handler validates signatures and dedupes events — buyers concerned about double-charges or webhook spoofing can audit `supabase/functions/stripe-webhook/`
- E2E test `tests/stripe-webhook-idempotency.spec.ts` proves it
- E2E test `tests/account-deletion.spec.ts` proves account deletion is end-to-end
- E2E test `tests/briefing-rate-limits.spec.ts` proves rate limiting is enforced
- E2E test `tests/sparse-profile.spec.ts` proves the briefing pipeline gracefully handles new/empty profiles

---

## Settings — what users actually control

Settings sheet (`src/components/settings/`) tabs in current order:

1. **AccountTab** — name, email, password, sign-out, delete account (end-to-end)
2. **WorkContextTab** — role, company, industry, company size (drives briefing seeds + AI context)
3. **BriefingInterestsTab** — declare beats, entities, excludes (Briefing v2 lens inputs)
4. **BriefingDirectivesTab** — set briefing type defaults, voice, schedule
5. **EdgeProTab** — Edge Pro subscription state, billing portal, capability list
6. **PreferencesTab** — display/theme/audio preferences
7. **PrivacyDataTab** — data retention, export, deletion, consent flags
8. **ManifestoTab** — the founder's positioning (legible to users; explains what we're not)

**Sales Anchor — Settings**: "Every setting is a lever the leader controls — what gets stored, what gets killed, what gets generated. No mystery dial behind the scenes."

---

## Sales-anchor index (for AI agents)

A condensed list of one-liners pullable for outbound. Each tied to a real shipped feature:

- **Memory Web**: "Talk for two minutes. Get a portable AI double that works in every AI tool."
- **Context Export**: "One click. ChatGPT, Claude, Gemini, Cursor, Claude Code — all of them. Yours."
- **Skill Builder (Agent Skill Builder)**: "Describe one weekly workflow out loud. CTRL hands you a Claude Skill that auto-triggers whenever your team's language matches. Permanent leverage from two minutes of speaking."
- **Daily Briefing v2**: "Three minutes of audio. Every story anchored to a specific priority on your desk. No mystery algorithm."
- **Edge — Sharpen/Cover**: "Your strengths systemized. Your weaknesses covered. Board memos and strategy docs in your register, on demand."
- **Decision Advisor**: "Ask a hard question. Get an answer that already knows your context."
- **Meeting Prep**: "Walk in briefed by an AI that knows your team, your priorities, and your last decision."
- **Diagnostic**: "10 minutes. Six dimensions. The questions your board will ask you. $49."
- **Edge Pro**: "$9/month. Less than a coffee. More leverage than your last consulting hour. Unlimited Agent Skills, all 7 briefing types, board memos in your register."
- **Privacy**: "No Slack. No email. No calendar. You talk to it. That's the whole connection."
- **Auditable AI**: "Every Briefing segment shows the profile fact that earned it the slot. No black box."
- **Hardened production**: "6 audit weeks shipped. Stripe sig + idempotency. End-to-end deletion. Structured logging. E2E tests."
- **Desktop polish (v5.2)**: "Cmd+K opens a global launcher. Sticky top bar, right rail for context, sidebar with keyboard hints. Built like a desktop product, not stretched mobile."
- **Triage you can trust**: "Skill Builder won't generate a junk skill. The Three Honest Tests gate routes Memory Facts, Custom Instructions, and Saved Styles to the right surface instead."
