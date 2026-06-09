# Architecture

Complete system architecture and data flow documentation.

**Last Updated:** 2026-06-09

> **Verified counts (2026-06-09)**: 80 edge functions, 59 hooks, 110 migrations, 7 e2e specs, 6 vitest specs, pgvector + pgcrypto + pg_cron extensions enabled, 6 audit-week tracks shipped (revenue path, data path, UX, reliability, observability, cleanup), Phase 8 shipped (Skill Builder + desktop UI redesign + pain-anchored entry points), Phase 9 shipped (Decision Engine + flag-gated Briefing streaming + cross-tenant RLS hardening), Phase 10 shipped (every authenticated surface unified onto `DesktopShell`, viewport-pinned zero-scroll, Goals + Enrich loop).

---

## System Overview

**Stack**:
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI Primary**: Vertex AI (Gemini 2.0 Flash) via Google Cloud service account
- **AI Fallback**: OpenAI GPT-4o
- **Voice**: OpenAI Whisper API for voice-to-text
- **Payments**: Stripe
- **Email**: Resend
- **Hosting**: Vercel (frontend), Supabase Cloud (backend)

**Architecture Type**: Serverless full-stack with edge functions

---

## Frontend Architecture

### Directory Structure

```
src/
├── components/
│   ├── ui/                    # shadcn components (DO NOT EDIT)
│   ├── auth/                  # Authentication flows (AuthProvider, RequireAuth)
│   ├── voice/                 # Voice assessment components
│   ├── landing/               # Landing page components
│   │   ├── HeroSection.tsx    # Landing page hero with video background
│   │   ├── CtrlLogo.tsx       # CTRL product logo SVG
│   │   └── TrustIndicators.tsx
│   ├── dashboard/             # Dashboard hub (renders Memory Web or Edge)
│   │   ├── DashboardProvider.tsx  # Dashboard data context
│   │   ├── HeroStatusCard.tsx
│   │   ├── WeeklyActionCard.tsx
│   │   ├── DailyProvocationCard.tsx
│   │   ├── PatternInsight.tsx
│   │   ├── desktop/
│   │   │   ├── DesktopDashboard.tsx  # Sidebar + content grid
│   │   │   ├── Sidebar.tsx           # Legacy sidebar (pre-Memory Web)
│   │   │   └── Panel.tsx
│   │   └── mobile/
│   │       ├── MobileDashboard.tsx
│   │       ├── BottomNav.tsx
│   │       ├── VoiceButton.tsx
│   │       ├── VoiceFAB.tsx
│   │       ├── Sheet.tsx
│   │       ├── HeroStatusCard.tsx
│   │       ├── PriorityCardStack.tsx
│   │       ├── ActionQueueSheet.tsx
│   │       └── StrategicPulseSheet.tsx
│   ├── memory-web/            # Memory Web dashboard (primary dashboard view)
│   │   ├── MobileMemoryDashboard.tsx
│   │   ├── DesktopMemoryDashboard.tsx
│   │   ├── DesktopSidebar.tsx     # Primary desktop nav (Home, Edge, Memory Web, Export)
│   │   ├── BottomNav.tsx          # Primary mobile nav (Home, Edge, Memory, Export)
│   │   ├── AppHeader.tsx
│   │   ├── GuidedFirstExperience.tsx  # Onboarding for new users
│   │   ├── MemoryWebVisualization.tsx
│   │   ├── MemoryHealthViz.tsx
│   │   ├── MemoryPulseBar.tsx
│   │   ├── CategoryChart.tsx
│   │   ├── IntelligencePanel.tsx
│   │   ├── RecentFactsFeed.tsx
│   │   ├── PatternInsightCard.tsx
│   │   ├── SkillExportCard.tsx    # /context Step 1 entry-point card for the Skill Builder (Edge Pro gated) (v5.2)
│   │   └── GettingSmarterBanner.tsx
│   ├── edge/                  # Edge: Leadership Amplifier + Skill Builder UI
│   │   ├── EdgeView.tsx           # Main Edge view (strengths/weaknesses/gaps)
│   │   ├── EdgeProfileCard.tsx    # Profile summary card
│   │   ├── EdgeOnboarding.tsx     # First-time Edge experience
│   │   ├── EdgePaywall.tsx        # Pro tier paywall with sample artifacts
│   │   ├── StrengthPill.tsx       # Interactive strength pills
│   │   ├── GapPill.tsx            # Intelligence gap pills
│   │   ├── SmartProbeCard.tsx     # Guided gap resolution
│   │   ├── DraftSheet.tsx         # Artifact preview/generation sheet
│   │   ├── ArtifactPreview.tsx    # Generated artifact display
│   │   ├── FeedbackButtons.tsx    # Strength/weakness feedback
│   │   ├── SendToInboxButton.tsx  # Email delivery
│   │   ├── AutomatePainCard.tsx   # Skill Builder pain-anchored entry chip row (v5.2)
│   │   ├── SkillCaptureSheet.tsx  # Voice/text Skill Builder capture (bottom sheet on mobile, dialog on desktop) (v5.2)
│   │   ├── SkillPreviewSheet.tsx  # Generated skill preview + ZIP download + install guide (v5.2)
│   │   ├── SkillQualityGate.tsx   # Quality checklist display (v5.2)
│   │   └── SkillInstallGuide.tsx  # Per-tool install instructions (Claude Code / Claude.ai / Cursor) (v5.2)
│   ├── action/                # Weekly action components
│   ├── ai-chat/               # AI chat components
│   ├── analytics/             # Analytics components
│   ├── diagnostic/            # Diagnostic-specific components
│   ├── insight/               # Insight display components
│   ├── memory/                # Memory Center components (11 files)
│   │   ├── MemoryList.tsx
│   │   ├── AddMemorySheet.tsx
│   │   ├── MemoryDetailSheet.tsx
│   │   ├── MemoryItemCard.tsx
│   │   ├── MemoryPill.tsx
│   │   ├── FactVerificationCard.tsx
│   │   ├── VoiceMemoryCapture.tsx
│   │   ├── PrivacyControlsPanel.tsx
│   │   ├── ExportImportPanel.tsx
│   │   └── MemoryErrorBoundary.tsx
│   ├── missions/              # Missions system components
│   │   ├── FirstMoveSelector.tsx
│   │   └── MissionsDashboard.tsx
│   ├── mobile/
│   │   └── MobileLayout.tsx   # Mobile viewport wrapper
│   ├── onboarding/            # Onboarding flow components
│   ├── operator/              # Operator tools components
│   ├── progress/              # Progress tracking components
│   ├── provocation/
│   │   └── DailyProvocation.tsx
│   ├── pulse/
│   │   └── StrategicPulse.tsx
│   ├── settings/              # Settings components
│   ├── sharpen/               # Sharpen analysis components
│   │   ├── CopyablePrompt.tsx
│   │   ├── InsightCard.tsx
│   │   ├── LoadingState.tsx
│   │   └── VoiceInput.tsx
│   ├── team-instructions/     # Team instruction generation
│   ├── UnifiedAssessment.tsx  # Quiz + voice assessment orchestrator
│   ├── UnifiedResults.tsx     # Results page with tabs
│   ├── LeadershipBenchmarkV2.tsx  # Overview tab
│   ├── PromptLibraryV2.tsx    # Tools tab
│   ├── TensionsView.tsx       # Tensions tab
│   ├── ConsentManager.tsx     # Privacy/consent tab
│   ├── SingleScrollResults.tsx # Single-page results view
│   ├── AssessmentHistory.tsx  # Past assessments
│   ├── BenchmarkComparison.tsx
│   ├── PeerBubbleChart.tsx
│   ├── PeerComparisonMobile.tsx
│   ├── MomentumDashboard.tsx
│   ├── ErrorBoundary.tsx
│   └── [Other components]
├── contexts/
│   ├── AppStateContext.tsx    # Global app state management
│   └── AssessmentContext.tsx  # Assessment flow state
├── hooks/                     # 59 custom hooks
│   ├── useStructuredAssessment.ts
│   ├── useRealtimeAssessment.ts
│   ├── useAILiteracyAssessment.ts
│   ├── useUserState.ts
│   ├── useAuth.ts
│   ├── useDevice.ts
│   ├── useEdge.ts             # Edge profile data + synthesis
│   ├── useEdgeSubscription.ts # Edge Pro subscription state
│   ├── useSkillExport.ts      # Skill Builder pipeline (v5.2): wraps generate-skill-export, decodes base64 ZIP into a Blob
│   ├── useUserPains.ts        # Top blockers + active decisions, drives pain-anchored entry points (v5.2)
│   ├── useRevealOnMount.ts    # Smooth reveal helper for below-the-fold components (v5.2)
│   ├── useMemoryQueries.ts    # Memory Center queries
│   ├── useMemoryWeb.ts        # Memory Web dashboard data
│   ├── useMemoryExport.ts     # Context export logic
│   ├── useUserMemory.ts       # Memory state management
│   ├── useGuidedCapture.ts    # Onboarding guided capture flow
│   ├── useMarkdownImport.ts   # Markdown file import
│   ├── useMissions.ts         # Missions system
│   ├── useCheckIns.ts         # Check-in system
│   ├── useProgress.ts         # Progress tracking
│   ├── useDecisions.ts        # Decision capture
│   ├── useTeamInstructions.ts # Team instruction generation
│   ├── useTodaysTension.ts
│   ├── useGenerationProgress.ts
│   ├── useExecutiveInsights.ts
│   ├── useLeadQualification.ts
│   ├── usePayment.ts
│   ├── useVoice.ts
│   ├── useVoiceInput.ts
│   ├── useMediaQuery.ts
│   ├── use-mobile.tsx
│   ├── useLongPress.ts
│   ├── useOffline.ts
│   ├── useOfflineDetection.ts
│   └── use-toast.ts
├── lib/
│   └── motion.ts              # Animation utilities (Framer Motion)
├── utils/
│   ├── runAssessment.ts             # Main assessment orchestrator
│   ├── orchestrateAssessmentV2.ts   # V2 orchestration logic
│   ├── aggregateLeaderResults.ts    # Data aggregation for UI
│   ├── pipelineGuards.ts           # Input validation
│   ├── edgeFunctionClient.ts       # Edge function wrapper
│   ├── mobileViewport.ts           # Viewport handling
│   └── [Other utilities]
├── types/
│   ├── pipeline.ts            # Core type contracts
│   ├── profile.ts             # Profile types
│   ├── voice.ts               # Voice assessment types
│   ├── diagnostic.ts          # Diagnostic types
│   ├── edge.ts                # Edge types (strengths, weaknesses, capabilities, subscriptions)
│   ├── memory.ts              # Memory system types
│   ├── memory-settings.ts     # Memory privacy settings types
│   ├── missions.ts            # Missions system types
│   └── video-background.ts    # Video background types
├── data/
│   ├── compassQuestions.ts    # Compass assessment questions
│   ├── secondaryQuestions.ts  # Secondary assessment questions
│   └── sharpenSystemPrompt.ts # Sharpen AI system prompt
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client
│       └── types.ts           # Generated DB types (READ-ONLY)
├── pages/                     # 29 page files (many legacy, now redirected to /dashboard)
│   ├── Landing.tsx            # Landing page (/)
│   ├── Auth.tsx               # Authentication (/auth)
│   ├── AuthCallback.tsx       # OAuth callback (/auth/callback)
│   ├── Dashboard.tsx          # **Main hub** (/dashboard) - renders Memory Web or Edge view
│   ├── MemoryCenter.tsx       # Memory Center (/memory)
│   ├── ContextExport.tsx      # Context Export (/context)
│   ├── BriefingPage.tsx       # Daily Briefing v2 (/briefing)
│   ├── DecisionPage.tsx       # Decision Engine pressure-test (/decision)
│   ├── Goals.tsx              # Goals tracking (/goals)
│   ├── EnrichPage.tsx         # Inbound Enrich loop (/enrich)
│   ├── BuildLap.tsx           # Agent Skill Builder full-page flow (/build)
│   ├── Settings.tsx           # User settings (/settings)
│   ├── Compliance.tsx         # Compliance center (/compliance)
│   ├── Profile.tsx            # User profile (/profile)
│   ├── Booking.tsx            # Workshop booking (/booking)
│   ├── Diagnostic.tsx         # Assessment flow (legacy, redirects to /dashboard)
│   ├── Voice.tsx              # Voice recording (legacy, redirects to /dashboard)
│   ├── Pulse.tsx              # Strategic pulse (legacy, redirects to /dashboard)
│   ├── Today.tsx              # Today page (legacy, redirects to /dashboard)
│   ├── Think.tsx              # Think page (legacy, redirects to /dashboard?view=edge)
│   ├── WeeklyCheckin.tsx      # Weekly check-in
│   ├── MissionCheckIn.tsx     # Mission check-in
│   ├── MissionHistory.tsx     # Mission history
│   ├── Progress.tsx           # Progress tracking
│   ├── Baseline.tsx           # Baseline assessment
│   ├── DecisionCapture.tsx    # Decision capture
│   ├── PromptCoach.tsx        # Prompt coaching
│   ├── Timeline.tsx           # Assessment timeline
│   └── NotFound.tsx           # 404 page
├── styles/                    # Design tokens & styles
├── __tests__/                 # Test files
└── index.css                  # Design system
```

### State Management

**Global State** (AppStateContext + AssessmentContext):
- Current assessment data
- Contact information
- Session ID
- Completion status
- App-wide state flags

**Local State**:
- Component-specific UI state
- Form inputs
- Loading states

**Server State** (via Supabase + TanStack React Query):
- Assessment results
- User profile
- Historical assessments
- Memory data
- Missions and check-ins

### Routing

Using React Router v6 with `createBrowserRouter` and lazy loading (defined in `src/router.tsx`).

**Active Routes:**

| Route | Page | Auth | Notes |
|-------|------|------|-------|
| `/` | Landing | No | Video background hero, CTRL branding |
| `/auth` | Auth | No | Email + Google OAuth |
| `/auth/callback` | AuthCallback | No | OAuth redirect handler |
| `/booking` | Booking | No | External booking |
| `/build` | BuildLap | No | Agent Skill Builder full-page flow |
| `/dashboard` | Dashboard (Memory Web) | Yes | Default view - Memory Web with guided first experience |
| `/dashboard?view=edge` | Dashboard (Edge) | Yes | Edge leadership amplifier |
| `/memory` | MemoryCenter | Yes | Detailed memory management |
| `/context` | ContextExport | Yes | Export to AI tools |
| `/briefing` | BriefingPage | Yes | Daily Briefing v2 |
| `/decision` | DecisionPage | Yes | Decision Engine pressure-test (decompose → verify → cross-examine → advise) |
| `/goals` | Goals | Yes | Horizon-grouped goal tracking |
| `/enrich` | EnrichPage | Yes | Inbound "borrow your own AI" enrichment loop |
| `/settings` | Settings | Yes | User preferences |
| `/compliance` | Compliance | Yes | Compliance / audit center |
| `/profile` | Profile | Yes | User profile |

**Legacy Redirects (all redirect to `/dashboard`):**

| Route | Redirects To |
|-------|-------------|
| `/today` | `/dashboard` |
| `/pulse` | `/dashboard` |
| `/voice` | `/dashboard` |
| `/diagnostic` | `/dashboard` |
| `/think` | `/dashboard?view=edge` |
| `*` | `/` |

All active pages are lazy-loaded with `React.lazy()` and wrapped in `<Suspense>` boundaries.

**Navigation:**
- **Desktop**: Fixed left sidebar (264px) - `memory-web/DesktopSidebar.tsx` with CTRL logo, 4 nav items (Home, Edge, Memory Web, Export to AI), settings, sign out, user footer + keyboard hints (v5.2)
- **Mobile**: Bottom nav bar - `memory-web/BottomNav.tsx` with 4 tabs (Home, Edge, Memory, Export)

### Desktop Shell (v5.2)

Authenticated routes wrap in `AuthedLayoutRoute` which mounts `CommandPaletteProvider` plus a sticky top bar with page eyebrow + title + actions, and supports an optional right rail that pages opt into.

- **Command Palette** (`Cmd/Ctrl + K`): Pages opt into actions via two custom window events:
  - `mm:capture-voice`: fired from the palette to open the active page's voice capture flow
  - `mm:generate-briefing`: fired to kick off a briefing generation from anywhere
- **Right rail (opt-in)**: Briefing surfaces (interests, suggestions, weekly history), Export wizard (step progress, current selection, contextual pro tip), Memory Web dashboard (today's briefing slot, quick actions, coverage bars, activity).
- **Landing page (desktop)**: bold asymmetric hero with animated Memory Web preview, sticky top nav with section anchors, multi-section scroll (how it works, three pillars, briefing teaser, privacy), final CTA. Mobile preserves the swipeable three-card experience.

The shell exists to make the product feel like a desktop-native tool, not stretched mobile markup. This was Phase 8's UX answer to "executive buyers judge by surface polish."

---

## Component Architecture

### Core UI Components

#### Button Component (`src/components/ui/button.tsx`)

**Variants:**
- `default`: Primary action (ink background, white text)
- `outline`: Secondary action (transparent, bordered)
- `ghost`: Tertiary action (transparent, hover background)
- `hero`: Large primary CTA (for landing page)
- `cta`: Accent-colored action

**Sizes:**
- `sm`: h-9
- `default`: h-10
- `lg`: h-11
- `xl`: h-14, text-base

**Critical Requirements:**
- All variants must have `border-0` explicitly
- Smooth transitions (200ms)
- Proper hover states
- Accessible focus states

#### Card Component (`src/components/ui/card.tsx`)

**Structure:**
- `Card`: Base container (white, rounded-3xl, shadow-lg)
- `CardHeader`: Title section (p-8 pb-6, space-y-3)
- `CardContent`: Main content (p-8 pt-4)
- `CardTitle`: Heading (text-xl, font-bold)

**Styling:**
- Background: Pure white
- Border: Subtle (border/40)
- Shadow: Soft, Apple-like
- Padding: Generous (p-8 minimum)

### Landing Page Components

#### HeroSection (`src/components/landing/HeroSection.tsx`)

**Layout:**
- Full viewport height: `h-[var(--mobile-vh)]`
- Centered content card
- Video background (subtle)
- No scroll on mobile

**Content Card:**
- Max width: `max-w-2xl`
- Padding: `p-8 sm:p-12 md:p-16 lg:p-20`
- Background: White
- Border radius: `rounded-3xl`
- Shadow: `shadow-lg`

**Elements:**
1. Logo: Top-left, minimal spacing
2. Headline: Large, bold, tight leading
3. Underline animation: SVG path, animated draw
4. Description: Large, readable, muted color
5. CTA Buttons: Primary + Secondary, large, rounded
6. Trust indicators: Small checkmarks, muted text

**Animations:**
- Fade in on mount (staggered delays)
- Slide up for card
- SVG underline draw animation

### Dashboard Components

#### MobileDashboard (`src/components/dashboard/mobile/MobileDashboard.tsx`)

**Layout:**
- Full viewport height
- Fixed header
- Scrollable content area
- Fixed bottom navigation
- Floating voice button

**Structure:**
```
┌─────────────────┐
│ Header (fixed)  │
├─────────────────┤
│                 │
│ Content (scroll)│
│                 │
├─────────────────┤
│ BottomNav       │
└─────────────────┘
     [VoiceBtn]
```

#### BottomNav (`src/components/dashboard/mobile/BottomNav.tsx`)

**Specifications:**
- Fixed bottom
- Height: `h-20`
- Background: `bg-background/98` with backdrop blur
- Border: Top border, subtle
- Shadow: Subtle top shadow
- Items: 4 navigation items
- Active state: `text-primary bg-primary/10`

#### Sheet Component (`src/components/dashboard/mobile/Sheet.tsx`)

**Specifications:**
- Bottom sheet pattern
- Heights: small (40vh), medium (60vh), large (85vh)
- Backdrop: `bg-black/40` with blur
- Animation: Spring physics (stiffness: 400, damping: 35)
- Handle: Top drag indicator
- Rounded top corners: `rounded-t-3xl`

---

## Page Specifications

### Landing Page (`/`)

**Requirements:**
- No scroll on mobile
- Video background (subtle)
- Centered white card
- Large, readable typography
- Clear CTAs
- Trust indicators below

### Dashboard (`/dashboard`) - Main Hub

The Dashboard is the primary authenticated view. It renders one of two views based on the `view` query parameter:

**Default (Memory Web view):**
- Desktop: `DesktopMemoryDashboard` with `DesktopSidebar` (264px fixed left)
- Mobile: `MobileMemoryDashboard` with `BottomNav` (4 tabs) and `AppHeader`
- First-time users see `GuidedFirstExperience` (3-question onboarding delivering first export in 2 minutes)
- Returning users see Memory Web visualization, health metrics, recent facts feed, pattern insights

**Edge view (`?view=edge`):**
- Lazy-loaded `EdgeView` component
- Same sidebar/nav shell as Memory Web
- Shows leadership profile: strengths (interactive pills), weaknesses, intelligence gaps
- Pro tier paywall for premium artifact generation (board memos, strategy docs, emails)
- Feedback loops for strength/weakness confirmation

**Desktop Layout:**
```
┌──────────┬──────────────────────┐
│ Sidebar  │                      │
│ (264px)  │   Main Content       │
│          │   (max-w-4xl)        │
│ Home     │                      │
│ Edge     │                      │
│ Memory   │                      │
│ Export   │                      │
│          │                      │
│ Settings │                      │
│ Sign Out │                      │
└──────────┴──────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────┐
│ AppHeader       │
├─────────────────┤
│                 │
│ Content (scroll)│
│                 │
├─────────────────┤
│ BottomNav (4)   │
└─────────────────┘
```

### Memory Center (`/memory`)

**Features:**
- Voice-first fact extraction
- Fact verification cards with confidence scores
- Privacy controls panel
- Export/import panel
- Error boundary wrapper

### Context Export (`/context`)

**Features:**
- One-click export to 6 AI tools (ChatGPT, Claude, Gemini, Cursor, Claude Code, Raw Markdown)
- Use case-specific formatting (General Advisor, Meeting Prep, Decision Support, etc.)
- Copy to clipboard or download

---

## Backend Architecture

### Database Schema

**Core Tables**:

```
leaders
├── id (PK)
├── email (unique)
├── full_name
├── company_name
├── role_title
├── industry
├── company_size
└── created_at

leader_assessments
├── id (PK)
├── leader_id (FK → leaders)
├── session_id
├── source ('quiz' | 'voice')
├── benchmark_score (0-100)
├── benchmark_tier (emerging | establishing | advancing | leading)
├── learning_style
├── generation_status (JSON)
└── created_at

leader_dimension_scores
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── dimension_key (strategic_vision | experimentation | delegation | data_quality | team_capability | governance)
├── score_numeric (0-100)
├── dimension_tier
└── explanation

leader_insights
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── your_edge (text)
├── your_risk (text)
├── your_next_move (text)
└── dimension_insights (JSON)

leader_prompt_sets
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── category_key
├── title
├── description
├── what_its_for
├── when_to_use
├── how_to_use
├── prompts_json (JSON array)
└── priority_rank

leader_tensions
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── dimension_key
├── summary_line
└── priority_rank

leader_risk_signals
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── risk_key (shadow_ai | skills_gap | roi_leakage | decision_friction)
├── level (low | medium | high)
├── description
└── priority_rank

leader_org_scenarios
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── scenario_key
├── summary
└── priority_rank

leader_first_moves
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── move_number (1, 2, 3)
├── content (text)
└── created_at

leader_missions
├── id (PK)
├── leader_id (FK → leaders)
├── assessment_id (FK → leader_assessments)
├── first_move_id (FK → leader_first_moves)
├── status (active | completed | skipped | extended)
├── started_at
├── completed_at
└── created_at

leader_check_ins
├── id (PK)
├── leader_id (FK → leaders)
├── mission_id (FK → leader_missions)
├── reflection_text
├── ai_response (text)
├── voice_url (text)
└── created_at

leader_progress_snapshots
├── id (PK)
├── leader_id (FK → leaders)
├── snapshot_data (JSON)
├── drift_score
└── created_at

user_memory
├── id (PK)
├── user_id (FK)
├── fact_category (identity | business | objective | blocker | preference)
├── fact_text
├── confidence (0-1)
├── source (voice | form | linkedin | calendar | enrichment)
├── verification_status (inferred | verified | corrected | rejected)
├── encrypted_content (bytea)
└── created_at

user_memory_settings
├── id (PK)
├── user_id (FK)
├── memory_enabled (boolean)
├── auto_extract (boolean)
├── retention_days (integer)
└── updated_at

assessment_events
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── profile_id (FK → leaders)
├── session_id
├── tool_name ('quiz' | 'deep_profile' | 'voice')
├── event_type ('question_answered')
├── question_id
├── question_text
├── raw_input (user's answer)
├── structured_values (JSON)
└── created_at

assessment_behavioral_adjustments
├── id (PK)
├── assessment_id (FK → leader_assessments)
├── experimentation_weight
├── delegation_weight
├── time_optimization
├── stakeholder_complexity
├── raw_inputs (JSON)
└── adjustment_rationale (JSON)

index_participant_data
├── id (PK)
├── user_id
├── session_id
├── company_identifier_hash (anonymised)
├── role_title
├── industry
├── company_size
├── readiness_score
├── tier
├── dimension_scores (JSON)
├── consent_flags (JSON)
└── completed_at

briefings
├── id (PK, UUID)
├── user_id (FK → auth.users)
├── briefing_date (DATE)
├── briefing_type (default | macro_trends | vendor_landscape | competitive_intel | boardroom_prep | team_update | ai_landscape | custom_voice)
├── script_text (nullable - filled after preliminary insert)
├── segments (JSONB array of BriefingSegment)
├── audio_url, audio_duration_seconds
├── context_snapshot (JSONB - v2 stores lens + queries + excludes here)
├── news_sources (JSONB)
├── generation_model
├── custom_context, voice_note_url
├── is_pro_only (BOOL)
├── schema_version (INT, 1 = legacy, 2 = evidence-based lens pipeline)
└── created_at
  - UNIQUE (user_id, briefing_date, briefing_type) except for custom_voice

briefing_feedback
├── id (PK), briefing_id (FK), segment_index
├── reaction (useful | not_useful | save)
├── lens_item_id (v2 - which lens item the segment matched)
├── dwell_ms (v2 - time user kept segment open)
├── replayed (v2 - did they replay the audio)
└── created_at

briefing_interests                      -- user-declared preferences
├── id (PK), user_id (FK)
├── kind (beat | entity | exclude)
├── text, weight
├── source (manual | seed_accepted | feedback_promoted)
├── is_active, created_at, updated_at
  - RLS to owner; soft-delete via is_active

industry_beat_library                   -- reference data for cold-start seeds
├── id (PK), industry_key (UNIQUE), label
├── aliases (TEXT[], lowercase substrings for fuzzy match)
├── beats (JSONB: [{label}])
├── entities (JSONB: [{label}])
├── is_active, updated_at
  - 11 rows seeded; RLS read-only to authenticated

briefing_lens_feedback                  -- persistent negative weight deltas
├── id (PK), user_id (FK)
├── lens_item_signature (SHA-256 of "bucket|normalized_text")
├── lens_item_type, lens_item_text
├── weight_delta (NUMERIC, always negative)
├── source (kill | not_useful_aggregate)
├── evidence_count (INT - how many reactions contributed)
├── is_active, created_at, updated_at
  - UNIQUE (user_id, signature, source); writes via edge functions only

ai_response_cache                       -- generic AI + embedding cache
├── prompt_hash, model
├── response (JSONB)
├── expires_at
  - Used by lens cache (24h) and lens-item embedding cache (7d)

training_material                       -- YAML voice guide, single source of truth
├── scope (global | cohort | user), user_id (optional), version
├── body_raw (TEXT YAML), body_parsed (JSONB)
└── is_active

skill_exports                           -- Skill Builder log (Phase 8)
├── id (PK, uuid), user_id (FK auth.users, ON DELETE CASCADE)
├── skill_name, description, transcript
├── triage_result ('skill' | 'custom_instruction' | 'memory_fact' | 'saved_style' | 'failed')
├── body_content, references_json (JSONB), test_prompts (TEXT[])
├── quality_gate (JSONB), archetype, version (default 1)
├── zip_path (reserved for future Storage upload), created_at
  - One row per generation attempt, including failed-triage cases
  - RLS: owner-read + owner-insert
  - Indexed on user_id and created_at DESC
```

**PostgreSQL Extensions (required):**
- `pgvector` - embedding storage + cosine operators (briefing scoring)
- `pgcrypto` - `digest('sha256', ...)` for lens signatures
- `pg_cron` - nightly feedback aggregator schedule

### Edge Functions

**Location**: `supabase/functions/`

**Total**: 80 edge functions in `supabase/functions/` plus a `_shared/` module directory. The Briefing subsystem (Phase 6) added seven functions (`generate-briefing`, `synthesize-briefing`, `briefing-diagnose`, `get-industry-seeds`, `briefing-kill-lens-item`, `briefing-aggregate-feedback`, `infer-briefing-interests`, `nudge-briefing`) plus shared modules (`briefing-lens`, `briefing-scoring`, `briefing-curation`, `user-context`, `lens-signature`, `with-timeout`, `logger`). Phase 8 added one function (`generate-skill-export`, four internal files) backing the Skill Builder pipeline. Phase 9 added the Decision Engine trio (`decision-engine` orchestrator, `decision-watch` hourly WATCH loop, `decision-eval` admin calibration harness) plus the unauthenticated `track-event` attribution proxy (deployed `--no-verify-jwt`).

**Production hardening (Audit Weeks 1-6, April 2026):**
- All external API calls now wrapped with `_shared/with-timeout.ts` (timeouts + retries, tested)
- All edge functions emit structured JSON logs via `_shared/logger.ts` (CI gate against `console.log` regressions)
- Stripe webhook signature verification + idempotency via `stripe_events_processed` table
- Briefing rate limits enforced via `_shared/rateLimit.ts`
- Account deletion is end-to-end (deletes Memory Web, briefings, audio artifacts, decisions, missions, assessments)
- E2E tests cover the highest-risk paths: auth journeys, briefing journey, briefing rate limits, sparse profile, account deletion, stripe webhook idempotency

#### Core Assessment Functions

1. **create-leader-assessment** - Creates assessment record, calculates scores, applies behavioral adjustments
2. **ai-generate** - Central AI generation function (Vertex AI primary, OpenAI fallback, static tertiary). Produces all AI content: insights, prompts, tensions, risks, scenarios, first moves. Applies cognitive frameworks.
3. **compass-analyze** - Analyzes voice transcripts from Compass module
4. **roi-estimate** - Extracts ROI data from voice transcripts
5. **populate-index-participant** - Anonymises and stores benchmark data

#### Memory & Context Functions

6. **memory-crud** - Create, read, update, delete memory facts
7. **memory-settings** - Memory privacy settings management
8. **extract-user-context** - Extract context from voice input
9. **enrich-company-context** - Enrich company data from external sources

#### Missions & Progress Functions

10. **send-mission-check-in** - Send check-in reminder notifications
11. **generate-progress-snapshot** - Generate progress snapshot data
12. **compute-drift** - Compute drift from baseline assessment
13. **batch-compute-drift** - Batch drift computation
14. **update-adoption-momentum** - Track adoption momentum metrics

#### Operator & Intelligence Functions

15. **operator-decision-advisor** - AI-powered decision advisory
16. **generate-meeting-prep** - AI meeting preparation content
17. **prompt-coach** - Prompt coaching assistance
18. **sharpen-analyze** - Sharpen analysis for skill improvement
19. **detect-patterns** - Pattern detection across assessments
20. **get-daily-prompt** - Daily provocative prompt generation
21. **get-or-generate-weekly-action** - Weekly action item generation
22. **generate-weekly-prescription** - Weekly prescription content
23. **get-peer-snippets** - Anonymised peer comparison data

#### Communication Functions

24. **send-confirmation-email** - Assessment completion confirmation
25. **send-diagnostic-email** - Diagnostic report delivery
26. **send-booking-notification** - Workshop booking confirmation
27. **send-advisory-sprint-notification** - Advisory sprint notification
28. **send-weekly-checkin-reminder** - Weekly check-in reminders
29. **send-feedback** - User feedback submission
30. **resend-webhook** - Resend email webhook handler

#### Payment Functions

31. **create-diagnostic-payment** - Create Stripe payment intent
32. **verify-diagnostic-payment** - Verify payment completion
33. **stripe-webhook** - Stripe webhook handler
34. **create-stripe-prices** - Stripe price configuration

#### Data & Integration Functions

35. **sync-to-google-sheets** - Sync leads to Google Sheets
36. **batch-process-pending-syncs** - Batch sync processing
37. **generate-quarterly-index** - Quarterly AI Leadership Index
38. **claim-history** - Claim assessment history for authenticated users

#### User Preference Functions

39. **upsert-notification-prefs** - Notification preferences
40. **upsert-sharing-consent** - Data sharing consent

#### Voice & Interaction Functions

41. **voice-transcribe** - OpenAI Whisper transcription
42. **ai-assessment-chat** - AI assessment chat
43. **submit-reflection** - Submit reflection responses
44. **submit-decision-capture** - Capture decision data
45. **submit-weekly-checkin** - Submit weekly check-in

#### Edge Functions (Leadership Amplifier)

46. **synthesize-edge-profile** - Synthesize strengths/weaknesses from Memory Web + assessment data
47. **edge-generate** - Generate Edge artifacts (board memos, strategy docs, emails, frameworks)
48. **create-edge-subscription** - Create Edge Pro Stripe subscription
49. **deliver-edge-artifact** - Deliver generated artifact via email

#### Daily Briefing Subsystem (v2 pipeline, evidence-based lens)

54. **generate-briefing** - Main orchestrator. Routes to v1 (legacy) or v2 (evidence-based) based on flag. v2 runs lens → query planner → provider fan-out (Perplexity/Tavily/Brave, 12s cap) → embedding dedupe + scoring + exclude filter → budget-constrained curation → script generation → audio synthesis trigger.
55. **synthesize-briefing** - ElevenLabs MP3 synthesis, fire-and-forget from `generate-briefing`.
56. **briefing-diagnose** - Read-only diagnostic endpoint. Returns `{ profile, interests, lens, excludes, planned_queries, last_briefing, recent_feedback }` for the authenticated user. Used to answer "why did this user get these headlines?"
57. **get-industry-seeds** - Returns industry-specific beats + entities from `industry_beat_library`. Fuzzy-matches on user's `industry` fact (longest alias wins), falls back to `generic`. Pre-filters anything already in the user's interests.
58. **briefing-kill-lens-item** - Records an explicit "don't show me stories like this" signal. Accepts `(briefing_id, lens_item_id)` or `(lens_item_type, lens_item_text)`. Upserts `briefing_lens_feedback` with `weight_delta = -1.0`.
59. **briefing-aggregate-feedback** - Admin/cron HTTP entrypoint (requires service-role JWT). Scans recent `briefing_feedback` rows, groups by lens signature, promotes anything >= 3 thumbs-down to a persistent `-0.4` delta. Nightly schedule is actually implemented as `sp_aggregate_briefing_feedback` (plpgsql) + pg_cron so no service-role key is stored in Postgres.

#### Memory Lifecycle Functions

50. **memory-lifecycle** - Memory fact aging and cleanup
51. **memory-synthesize** - Memory pattern synthesis
52. **memory-settings** - Memory privacy and budget settings

#### Additional Functions

53. **enrich-company-context** - Enrich company data for contextual AI responses

#### Skill Builder Subsystem (Phase 8, May 2026)

60. **generate-skill-export**: Voice-to-Agent-Skill pipeline. Edge Pro gated. Internal modules:
    - `index.ts`: orchestrator: Edge Pro gate, memory context build, triage LLM call, quality-gate validation, ZIP packaging, `skill_exports` insert
    - `prompt.ts`: system + user prompts encoding the Three Honest Tests triage rules + extraction rules. Forwards optional `SkillSeed` (kind + text) so extraction grounds in the leader's actual pain language.
    - `quality-gate.ts`: deterministic validator (5+ trigger phrases, push language, third-person voice, body under 500 lines, imperative voice, required sections, no bare MUST/NEVER, valid name format). Returns `{ checks: [...], summary: { passed, total } }`. Only the name-format check is a hard fail; everything else is advisory and surfaced to the user.
    - `zip.ts`: agentskills.io-compliant packager. Single root folder, `SKILL.md` + `references/` + `01-test-prompts.txt` + `02-maintenance-card.txt` + `03-install-guide.txt`. Returns base64 + byte length.

    Triage routing: when the input is really a Memory Fact / Custom Instruction / Saved Style, the function returns `{ triage: { passed: false, result, reasoning } }` (200 OK, no skill). The attempt is still logged in `skill_exports` with `triage_result` set accordingly so we can learn from misses without re-running the LLM.

**Shared Modules** (`supabase/functions/_shared/`):
- `context-builder.ts` / `memory-context-builder.ts`: LLM context construction
- `user-context.ts`: Profile projection (shared between briefing pipeline + diagnose endpoint)
- `briefing-lens.ts`: Importance lens (Stage 1+2 of v2 pipeline)
- `briefing-scoring.ts`: Embedding dedupe + scoring + exclude filter (Stage 4)
- `briefing-curation.ts`: Budget-constrained segment picker (Stage 5)
- `lens-signature.ts`: SHA-256 signature for stable feedback keying
- `training-loader.ts`: YAML voice guide loader (training_material table)
- `ai-cache.ts`: Generic AI + embedding response cache (24h lens cache, 7d embedding cache, backed by `ai_response_cache` table)
- `model-router.ts`: Vertex AI primary, OpenAI GPT-4o fallback, static tertiary
- `rateLimit.ts` / `rate-limiting.ts`: Per-user rate limiting (briefing rate-limit shipped Audit Week 1)
- `with-timeout.ts`: Timeout + retry wrapper for all external API calls (Audit Week 4)
- `logger.ts`: Structured JSON edge-function logger (Audit Week 5)
- `llm-quality-guardrails.ts`: LLM output validation
- `storage-utils.ts`: Supabase Storage helpers (`ctrl-briefings` bucket policy codified Audit Week 2)
- `email-utils.ts`: Resend email sending
- `validate-database.ts`: DB validation helpers

---

## Data Flow

### Assessment Creation Flow

```
User completes assessment
         ↓
UnifiedAssessment.tsx collects data
         ↓
runAssessment.ts invoked
         ↓
1. Validate inputs (pipelineGuards.ts)
2. Calculate scores + behavioral adjustments
3. Call create-leader-assessment edge function
4. Store dimension scores
         ↓
Call ai-generate edge function:
├─ Plan A: Vertex AI (Gemini 2.0 Flash)
├─ Plan B: OpenAI GPT-4o
└─ Plan C: Static fallback content
         ↓
ai-generate produces all content:
├─ Personalised insights (edge, risk, next move)
├─ Thinking tools (prompt library)
├─ Strategic tensions
├─ Risk signals
├─ Org scenarios
└─ First moves (3 prioritised actions)
         ↓
Store results in respective tables
         ↓
Store assessment events (Q&A log)
         ↓
Store behavioral adjustments
         ↓
Store anonymised index data (if consent)
         ↓
Return assessmentId to UI
         ↓
Navigate to UnifiedResults.tsx
```

### Results Display Flow

```
UnifiedResults.tsx mounts
         ↓
aggregateLeaderResults() fetches data
         ↓
Queries:
├─ leader_assessments (for metadata)
├─ leader_dimension_scores (for scores)
├─ leader_insights (for edge/risk/move)
├─ leader_prompt_sets (for thinking tools)
├─ leader_tensions (for tensions)
├─ leader_risk_signals (for risks)
├─ leader_org_scenarios (for scenarios)
└─ leader_first_moves (for next steps)
         ↓
Aggregates into single result object
         ↓
Passes to tab components:
├─ LeadershipBenchmarkV2 (Overview)
├─ TensionsView (Tensions)
└─ PromptLibraryV2 (Tools)
         ↓
Components render data
```

### Voice Assessment Flow

```
User records voice responses
         ↓
VoiceOrchestrator.tsx manages flow
         ↓
1. CompassModule: 5 questions → transcripts
2. RoiModule: ROI estimation → transcripts
         ↓
Call compass-analyze edge function
   ↓
   OpenAI analyzes transcripts → scores, tier, focus areas
         ↓
Call roi-estimate edge function
   ↓
   OpenAI extracts ROI data → time saved, cost saved
         ↓
mapVoiceToAssessment() converts to V2 format
         ↓
DeepProfileQuestionnaire collects context
         ↓
runAssessment() with source='voice'
         ↓
[Same flow as quiz assessment]
```

### Memory Center Flow

```
User opens Memory Center (/memory)
         ↓
useMemoryQueries() fetches existing facts
         ↓
Voice-first input:
├─ VoiceMemoryCapture records speech
├─ voice-transcribe edge function transcribes
├─ extract-user-context extracts structured facts
└─ memory-crud stores encrypted facts
         ↓
Fact verification:
├─ Facts shown with confidence scores
├─ User verifies/corrects/rejects
├─ Verification status updated
         ↓
Privacy controls:
├─ memory-settings edge function
├─ Enable/disable auto-extraction
├─ Set retention period
└─ Export/import data
```

### Daily Briefing Flow (v2, evidence-based lens)

```
Dashboard mounts / user taps regenerate
         ↓
useBriefing hook invokes generate-briefing edge function
         ↓
generate-briefing:
  1. Auth + parse body (briefing_type, force, custom_context)
  2. Check v2 flag: request body > user_memory opt-in > env default
  3. Load user context (_shared/user-context.ts)
         ↓
  If v2:
  4. Build importance lens (_shared/briefing-lens.ts)
     ├─ loadInterests() → beats/entities/excludes
     ├─ deterministicLens() → weighted items from decisions/missions/objectives/watchlist
     ├─ Combine (interests prepended, weight 1.0, floor 0.8)
     ├─ Apply negative feedback deltas (briefing_lens_feedback)
     └─ LLM reweight (gpt-4o-mini, 24h cache, key = user+briefing_type+date+sig)
  5. Plan queries (gpt-4o-mini) from lens + training_material hot_signal_taxonomy
  6. Fan out to providers in parallel (Promise.allSettled, 12s cap)
     ├─ Perplexity (single call covering all queries)
     ├─ Tavily (per-query)
     └─ Brave (per-query)
  7. Embed + dedupe + score (_shared/briefing-scoring.ts)
     ├─ Single batched OpenAI embeddings call (candidates + excludes)
     ├─ Cosine-based exclude filter (drop near user excludes)
     ├─ Cosine dedupe (authority as tiebreaker)
     └─ Score each survivor against each lens item
  8. EARLY INSERT preliminary briefing row (frontend polls every 3s)
  9. Curate final segments (_shared/briefing-curation.ts)
     ├─ Read word_budget from training_material.structural_rubric
     ├─ gpt-4o-mini picks segments with diversity + coverage constraints
     └─ Returns segments with lens_item_id, relevance_score, matched_profile_fact
 10. Generate script (gpt-4o + training_material voice card + rubric + exemplars)
 11. Update briefing row with final segments + script
 12. Fire-and-forget synthesize-briefing (ElevenLabs MP3)
         ↓
Frontend polling picks up segments + audio_url
         ↓
BriefingCard renders inline with:
  - Framework tag + headline
  - "Anchored to: <lens item text>" chip
  - Bookmark (pin anchor as beat) / Ban (kill lens signature) buttons
  - Thumbs up/down with dwell_ms + lens_item_id capture
         ↓
Segments playable via BriefingSheet (full-screen slide-up)
         ↓
SeedBeatsPrompt shows above briefing if user has < 3 declared interests
```

**Learning loop:** every thumbs-down captures `lens_item_id`; the nightly `sp_aggregate_briefing_feedback` plpgsql function (scheduled via pg_cron at 03:07 UTC) promotes any signature with 3+ negatives to a persistent `-0.4` delta in `briefing_lens_feedback`. Explicit kills via the Ban button write `-1.0` immediately. `applyFeedbackDeltas` is invoked in both the cold and cached lens paths of `buildImportanceLens` so kills take effect without waiting for the 24h lens cache to expire.

### Missions Flow

```
After assessment, First Moves displayed
         ↓
FirstMoveSelector.tsx presents 3 moves
         ↓
User commits to a mission
         ↓
leader_missions record created (status: active)
         ↓
Periodic check-ins:
├─ MissionCheckIn.tsx captures reflection
├─ AI generates response
├─ leader_check_ins record created
         ↓
Progress tracking:
├─ generate-progress-snapshot captures state
├─ compute-drift measures change from baseline
├─ Progress.tsx displays trajectory
         ↓
Mission completion:
├─ Status updated to completed/skipped/extended
├─ MissionHistory.tsx shows all missions
```

---

## AI Integration

### LLM Architecture

**Primary**: Vertex AI (Gemini 2.0 Flash) via Google Cloud service account with OAuth token caching
**Fallback**: OpenAI GPT-4o

**Call Pattern** (in `ai-generate/index.ts`):
```typescript
// Plan A: Vertex AI
try {
  response = await tryVertexAI(context, prompt);
  generationSource = 'vertex-ai';
} catch (error) {
  // Plan B: OpenAI
  try {
    response = await tryOpenAI(context, prompt);
    generationSource = 'openai';
  } catch (error) {
    // Plan C: Static fallback
    response = getStaticFallback(scores, tier);
    generationSource = 'fallback';
  }
}
```

**Model Configuration:**
- Temperature: 0.7
- Max tokens: 4000
- Response format: JSON object with structured output

### Cognitive Framework Integration

The `ai-generate` function embeds five cognitive frameworks directly into prompts:

1. **A/B Framing**: Forces alternative perspectives on each recommendation
2. **Dialectical Reasoning**: Thesis-antithesis-synthesis for balanced insights
3. **Mental Contrasting (WOOP)**: Goals, obstacles, realistic planning
4. **Reflective Equilibrium**: Aligning with organizational principles
5. **First-Principles Thinking**: Breaking down assumptions

### Structured Outputs

Using Zod schemas for validation. Validation ensures required fields, correct types, min/max lengths, and enum value constraints.

### Quality Guardrails

- `_shared/llm-quality-guardrails.ts`: Output validation and filtering
- `_shared/ai-cache.ts`: Response caching for repeated patterns
- `_shared/rate-limit.ts`: Per-user rate limiting

---

## Pipeline Guarantees

### Type Safety

**Input Contracts** (`pipeline.ts`):
```typescript
interface PipelineSafeResponse<T> {
  success: boolean;
  data: T;
  generationSource: 'vertex-ai' | 'openai' | 'gemini' | 'fallback' | 'none';
  durationMs: number;
  error?: string;
}
```

### Fallback Strategies

**LLM Failures**:
1. Try Vertex AI (Gemini 2.0 Flash)
2. If fails, try OpenAI GPT-4o
3. If both fail, use generic fallbacks

**DB Failures**:
- Log error, return empty arrays, UI shows graceful message

---

## Authentication & Security

### Auth Flow

Using Supabase Auth:
1. User signs up with email/password or Google OAuth
2. Supabase creates user record
3. Frontend stores session in local storage
4. All edge function calls include auth token
5. Edge functions validate token via Supabase client

### Row-Level Security (RLS)

All user-facing tables have RLS policies:
- `leaders`, `leader_assessments`, `leader_insights`, `leader_prompt_sets`, etc.
- `leader_missions`, `leader_check_ins`: Own data only
- `user_memory`, `user_memory_settings`: Own data only

### Memory Encryption

- Content encrypted at rest using AES-256-GCM
- Encryption key in `MEMORY_ENCRYPTION_KEY` env var
- Decryption only in edge functions, never client-side

### RLS Security Fixes (2026-05-30)

Three tables were missing proper user-scoped RLS policies prior to the 2026-05-30 rebuild; all three are now fixed:

- `leader_missions`: policies now gate on `leaders.user_id` (via join to the `leaders` table), not just `leader_id`
- `leader_check_ins`: same pattern as `leader_missions`
- `leader_progress_snapshots`: same pattern
- `tts_config`: RLS was disabled; now enabled with read-only access for authenticated users
- `resend-webhook` edge function: now validates the Resend webhook signature before processing any payload

These changes close a class of horizontal-access bugs where one authenticated user could, in theory, read another user's mission, check-in, or snapshot rows if they knew the row ID.

---

## Attribution Emit Path (2026-05-30)

Captures first-touch marketing attribution end-to-end, from landing URL through to the central MindmakerOS warehouse.

```
Landing page load
        |
        v
Client captures UTM params on first touch:
  utm_source, utm_medium, utm_campaign,
  utm_content, utm_term, agent, campaign_id
        |
        v
Params persisted to localStorage (first-touch wins, not overwritten)
        |
        v
Signup / OAuth: params written into auth.users user_metadata
        |
        v
Stripe checkout: params stamped onto session metadata
        |
        v
Stripe webhook handler reads metadata, emits lifecycle event
  to the central MindmakerOS warehouse
  (Supabase project: gojpffsrxybbpbdzzrvs)
        |
        v
Warehouse ingest (dormant until WAREHOUSE_INGEST_URL env var is set)
```

**Key design notes:**

- First-touch attribution is preserved even if the user visits multiple times before signing up
- The emit is fire-and-forget; a missing or down warehouse endpoint does not break the checkout flow
- The warehouse env var (`WAREHOUSE_INGEST_URL`) is deliberately not set in production yet; the wiring is in place and activates when the var is set

---

## Runtime Product-Truth Source (2026-05-30)

`https://ctrl.themindmaker.ai/.well-known/product.json`

A machine-readable JSON document served at this well-known path. It is the single authoritative source of pricing, ICP, and offer data for the entire MindmakerOS agent fleet. Any agent that needs to quote CTRL pricing or describe the offer fetches this endpoint rather than reading from training data.

**Served by**: a Vercel static route (or edge function) returning a pre-rendered JSON payload.

**Contents (canonical):**

```json
{
  "product": "CTRL",
  "url": "https://ctrl.themindmaker.ai",
  "pricing": {
    "free": "$0",
    "full_diagnostic": "$49 one-time",
    "deep_context_upgrade": "$29 one-time",
    "diagnostic_deep_context_bundle": "$69 one-time",
    "edge_pro": "$29/month",
    "bootcamp_teams": "$15K-$50K",
    "portfolio_partners": "$5K-$25K"
  },
  "icp": "C-suite / VP / Founder, 50-5000 employees, English-speaking, already using AI daily",
  "magic_moment": "one-click Context Export: first AI response unmistakably about them, not generic"
}
```

Agents must treat this endpoint as the ground truth and ignore any conflicting figures in static documentation.

---

## Public-Surface Prerender (2026-05-30)

The CTRL landing page (`/`) and any other public routes are pre-rendered at build time (or via Vercel's edge prerendering) to ensure:

1. **SEO**: Crawlers see fully-rendered HTML with correct meta tags, OG images, and structured data without executing client-side JavaScript
2. **Agent-readable surfaces**: AI agents scraping `ctrl.themindmaker.ai` for product context get complete HTML rather than a blank SPA shell
3. **Performance**: First Contentful Paint is not blocked on the React bundle

**Implementation**: Vite SSR prerender pass generates static HTML for public routes at build time. The `/.well-known/product.json` endpoint is served as a standalone static file, not part of the React app.

---

## Deployment

### Frontend

**Build**: `npm run build`
**Hosting**: Vercel (auto-deployed on git push)

### Backend

**Edge Functions**: Deployed via Supabase CLI
**Database Migrations**: `supabase/migrations/`, applied via `supabase db push`

### Environment Variables

**Frontend (Vercel)**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Backend (Supabase Secrets)**:
- `OPENAI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_KEY` (Vertex AI)
- `MEMORY_ENCRYPTION_KEY`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_SHEETS_CREDENTIALS`

---

## Testing

### Current State

**Vitest** (`vitest.config.ts`): 6 unit/shared specs:
- `src/__tests__/api.test.ts`
- `src/__tests__/authMachine.test.ts`
- `src/__tests__/renderMarkdown.test.ts`
- `src/__tests__/training.test.ts`
- `src/__tests__/HeroSection.video.test.tsx`
- `supabase/functions/_shared/with-timeout.test.ts`

**Playwright** (`playwright.config.ts`, `testDir: src/__tests__/e2e`): 7 e2e specs:
- `src/__tests__/e2e/auth-journeys.spec.ts`
- `src/__tests__/e2e/briefing-journey.spec.ts`
- `src/__tests__/e2e/briefing-rate-limits.spec.ts`
- `src/__tests__/e2e/sparse-profile.spec.ts`
- `src/__tests__/e2e/account-deletion.spec.ts`
- `src/__tests__/e2e/stripe-webhook-idempotency.spec.ts`
- `src/__tests__/e2e/desktop-zero-scroll.spec.ts` (Phase 10: asserts the desktop shell never scrolls the window)

**CI gates** (`.github/workflows/ci.yml`): three blocking checks per PR:
1. Typecheck (`tsc --noEmit`)
2. Full Vite build
3. ESLint on PR diff (~1600 pre-existing warnings accepted as technical debt; new lint regressions blocked)


**Manual Testing Checklist**:
- [ ] Quiz assessment completes successfully
- [ ] Voice assessment completes successfully
- [ ] Results display correctly (Overview, Tensions, Tools)
- [ ] First Moves display and mission commitment works
- [ ] Free tier shows limited content
- [ ] Paid upgrade flow works
- [ ] Memory Center: create, read, update, delete, voice capture
- [ ] Missions: commit, check-in, complete flow
- [ ] Progress: snapshots generate correctly
- [ ] Weekly Check-in: submission and AI response
- [ ] Mobile responsive, no-scroll on mobile pages

---

## Dependencies

### Core Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "@supabase/supabase-js": "^2.50.3",
  "@tanstack/react-query": "^5.56.2",
  "framer-motion": "^11.x",
  "tailwindcss": "^3.4.11",
  "lucide-react": "^0.462.0",
  "zod": "^3.23.8",
  "typescript": "^5.5.3",
  "vite": "^5.4.1"
}
```

### Constraints

- **No backend code execution**: Only edge functions (Deno runtime)
- **Node.js requirement**: >=22 <24
- **LLM rate limits**: Vertex AI quotas, OpenAI tier limits
- **AI API costs**: ~$0.01-0.02 per assessment (Vertex AI primary)
