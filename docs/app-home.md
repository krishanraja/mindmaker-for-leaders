# CTRL — Home tab (current-state truth map)

> Surface: **Home** (the default authenticated landing, `/dashboard` with no `?view`).
> Repo: `C:/Users/krish/mm-ctrl` (Vite + React 18 + TS + shadcn/ui + Tailwind + Supabase, React Router v6, Vercel).
> Theme: **DARK** (CLAUDE.md still says "light mode" — that is stale; classes are `bg-background` dark tokens, emerald accent `#00D9B6`).
> Production: `ctrl.themindmaker.ai`.

---

## what_it_is

Home is the app's hub and default landing for an authenticated user. The route `/dashboard` renders one of TWO views controlled by a `?view` query param (`src/pages/Dashboard.tsx`):

- **`memory` (default)** — the **Memory Web** view. This is "Home."
- **`edge`** — the Edge / strategic-thinking view (a different surface, lazy-loaded `EdgeView`, mapped separately).

So "Home" == the Memory Web view of `/dashboard`. It is built as the leader's **living context store**: a force-directed "memory web" visualization of captured facts about the user, surrounded by:
1. a **capture bar** (voice / text / file import) to add facts,
2. the **Daily Briefing card** (generate → expand → listen),
3. a **Decision Inbox alert** (the "an assumption just changed / +N more, review the decision" element),
4. a **memory health score** + patterns,
5. (desktop) a right rail of briefing/quick-actions/coverage and a "Pressure-test a decision" CTA + a facts grid.

It is explicitly positioned as "the context every AI you use draws on." It does triple duty: capture, browse/curate memory, and launch into Briefing/Decision/Export. This is a major source of the founder's "every tab does several things at once" complaint — Home alone spans capture, visualization, verification, briefing config+playback, decision alerts, and export.

Two completely different React component trees render Home depending on device (no shared layout):
- Mobile: `MobileMemoryDashboard` (`src/components/memory-web/MobileMemoryDashboard.tsx`)
- Desktop: `DesktopMemoryDashboard` (`src/components/memory-web/DesktopMemoryDashboard.tsx`)

Note: There is an OLDER, mostly-dead dashboard system under `src/components/dashboard/` (`DashboardProvider`, `HeroStatusCard`, `WeeklyActionCard`, `DailyProvocation`, `PatternInsight`, plus `desktop/` and `mobile/` subfolders). `DashboardProvider` serves **mock/hardcoded** weeklyAction + dailyProvocation and a baseline score. The current Home does NOT use `DashboardProvider`; only `BriefingCard` (in `src/components/dashboard/`) is live. See `duplications`/`notes`.

---

## user_actions (exhaustive)

### Onboarding overlay (first run only — `Dashboard.tsx`)
- **Dismiss / engage the welcome banner**: "Welcome. Set up your context in about 2 minutes - or explore first." → buttons **Set up** (opens full-screen `OnboardingInterview`) and **X dismiss** (marks onboarded, never enforced). Auto-offers the interview full-screen once per browser if no facts + not onboarded.

### Capture (add a fact) — primary recurring action
**Mobile** voice input area (idle state):
- **Tap mic** to narrate (records up to 120s, live caption preview, waveform, tap again to stop).
- **"Type instead"** → textarea ("Tell me about your role, current projects, goals, or challenges..."), **Cancel** / **Submit** (Cmd+Enter submits).
- **"Import file"** → file picker for `.md`/`.txt` markdown import.
- **Review voice transcript** modal (`TranscriptReviewPanel`): edit the refined transcript, **Continue** or **Dismiss**.
- **Cancel processing** (during extraction/transcription).

**Desktop** input bar:
- **Mic button** (start/stop recording, with live caption + transcript review panel: **Insert into field** / **Dismiss**).
- **Upload button** (import markdown/txt) + **drag-and-drop a file** anywhere on the page (full-screen drop overlay).
- **Type into the input**, **Enter** to submit (Shift+Enter newline), **Send** button.
- Empty-state CTAs: **Voice a thought**, **Import markdown**.

### Fact verification (the "Verify" button the founder flagged)
**Mobile**:
- **"Verify (N)"** floating button above bottom nav (only when `unverifiedCount > 0`) → opens `VerificationSwipeStack` (swipe to confirm/reject inferred facts).
- Also a `FactVerificationCard` modal auto-appears right after capture when the extractor returns `pending_verifications` (separate from the swipe stack — two verification UIs).

**Desktop**:
- Per-fact hover actions on each `FactCard` in the facts grid: **Verify** (check), **Edit** (pencil), **Delete** (trash). Click card to **expand** context.

### Daily Briefing card (generate → expand → listen)
**Mobile** (single fixed-height slot showing exactly one state):
- If briefing exists: `BriefingCard` — **tap header to expand** (reveals per-segment story rows), **Listen** button (auto-synthesizes audio if needed, then opens player; **Retry** on TTS exhaustion), and within expanded view: **Refresh stories**, **Custom Briefing** (opens `CustomBriefingSheet`), plus per-segment actions (see below).
- If no interests yet (`< 3`): **"Set interests"** → `InterestsSheet`.
- Else (interests but no briefing): **Generate** button.
- While generating: passive "Preparing your briefing" banner.

Per-segment inline actions inside an expanded briefing (`InlineSegmentRow`):
- **Why this?** popover (Info icon).
- **Automate / Zap** (decision_trigger segments only) → navigates to `/context` with a `SkillSeed`.
- **Pin/keep beat** (bookmark) → adds a `briefing_interests` row.
- **Kill** (Ban) → "don't show me stories like this" (`useKillLensItem`).

**Desktop** right-rail `RailBriefingSlot`:
- **Generate today** / **Play** (mirrors mobile, simpler — no expand, no per-segment actions, no custom/refresh).

### Decision Inbox alert (the "assumption changed / +N more" element)
- `DecisionInboxCard alertsOnly` (mobile) / `AlertBanner` (desktop): when a watched decision's evidence shifts, an amber card shows the alert headline + **"Review the decision"** → `/decision`, with **+N more** count. Desktop also has **dismiss/acknowledge** per alert.
- (Desktop only, when `!alertsOnly` is used elsewhere) a quiet "N decisions monitored" line — but Home mobile passes `alertsOnly`, so the quiet line is suppressed on mobile Home.

### Pressure-test / Decision CTA
- **Desktop** `DecisionCtaCard` ("Pressure-test a decision … break a real call into the claims it rests on") → `/decision`. Shown once the user has facts; also embedded in the desktop empty-state.

### Seed beats prompt (cold-start personalization)
- **Desktop** `SeedBeatsPrompt`: tappable industry beat/entity chips → each tap adds a `briefing_interests` row (`source: seed_accepted`); **dismiss (X)** / **Done**.
- **Mobile** equivalent is the inline "Make your briefing yours → Set interests" CTA → `InterestsSheet`.

### Quick actions / export (desktop right rail `RailQuickActions`)
- **Copy context to clipboard** (generates a Claude-formatted export, copies).
- **Open Export wizard** → `/context`.
- **Import markdown**.
- Top-bar **Quick export** button (duplicate of "copy context to clipboard").

### Navigation / view toggle
- **Mobile** `BottomNav`: Home, Edge, Memory, Decide, Briefing (5 tabs). Tapping "Edge" flips `?view=edge` on the same `/dashboard` route.
- **Desktop** `DesktopRail` sidebar: Home, Edge, Memory, Export, Briefing, Goals + Profile/Compliance/Settings + sign-out + **Command Palette (Cmd/Ctrl+K)**.
- **Memory Web nodes**: click a node to select/explore (`MemoryWebVisualization`), and (desktop facts grid) **"View all →"** → `/memory`.
- **Settings gear** (mobile `AppHeader`) → global Settings sheet.

---

## key_files

Routing / entry:
- `src/router.tsx` — `/dashboard` → `Dashboard` (lazy). Legacy `/today`,`/pulse`,`/voice`,`/diagnostic` → `/dashboard`; `/think` → `/dashboard?view=edge`.
- `src/pages/Dashboard.tsx` — view switch (`memory` vs `edge`), onboarding banner/overlay, device branch.

Home (Memory) view:
- `src/components/memory-web/MobileMemoryDashboard.tsx` — the whole mobile Home (capture, briefing slot, health bar, web, verify FAB, sheets). ~900 lines.
- `src/components/memory-web/DesktopMemoryDashboard.tsx` — desktop Home (input bar, web canvas, patterns, facts grid, right rail). ~1050 lines.
- `src/components/memory-web/MemoryWebVisualization.tsx` — force-directed web canvas (shared by both + empty-state seeds).
- `src/components/memory-web/AppHeader.tsx` — mobile header (logo + settings gear).
- `src/components/memory-web/BottomNav.tsx` — mobile 5-tab nav.
- `src/components/layout/DesktopShell.tsx` — desktop rail + top bar + right rail shell + command palette.

Cards / sub-surfaces:
- `src/components/dashboard/BriefingCard.tsx` — daily-briefing card (generate/expand/listen + per-segment pin/kill/automate). The only live file in `components/dashboard/`.
- `src/components/operator/decision/DecisionInboxCard.tsx` — the "assumption changed / +N more → review the decision" element (mobile).
- `src/components/operator/decision/decision-views.tsx` — `AlertBanner` (desktop alert).
- `src/components/briefing/SeedBeatsPrompt.tsx`, `InterestsSheet.tsx`, `BriefingSheet`, `MiniPlayer`, `CustomBriefingSheet` — briefing config/playback chrome.
- `src/components/memory/FactVerificationCard.tsx`, `VerificationSwipeStack.tsx` — the two verify UIs.
- `src/components/voice/TranscriptReviewPanel.tsx` — voice review.
- `src/components/onboarding/OnboardingInterview.tsx` — first-run guided setup.

Hooks (data):
- `src/hooks/useMemoryWeb.ts` — facts/patterns/decisions/stats/delta/health-score + CRUD (`editFact`,`deleteFact`,`verifyFact`,`submitInput` → `extract-user-context` edge fn).
- `src/hooks/useUserMemory.ts` — pending verifications + RPC verify/reject.
- `src/hooks/useVerificationFlow.ts` — verify swipe-stack state (`unverifiedCount`, `verifiedRate`).
- `src/hooks/useBriefing.ts` — `useTodaysBriefing`, `useGenerateBriefing`, `usePollAudio`.
- `src/hooks/useBriefingInterests.ts`, `useIndustrySeeds.ts`, `useKillLensItem.ts`.
- `src/hooks/useDecisionInbox.ts` — decision cases + alerts.
- `src/hooks/useVoice.ts`, `useMarkdownImport.ts`, `useMemoryExport.ts`, `useDevice.ts`, `useGuidedCapture.ts`.
- `src/contexts/BriefingContext.tsx` — global briefing playback/sheet state.

Stale/dead (NOT used by Home):
- `src/components/dashboard/DashboardProvider.tsx` (mock data), `HeroStatusCard.tsx`, `WeeklyActionCard.tsx`, `DailyProvocation.tsx`, `DailyProvocationCard.tsx`, `PatternInsight.tsx`, and `src/components/dashboard/desktop/*` + `src/components/dashboard/mobile/*`.

---

## mobile_treatment

**Real, bespoke mobile** — not a squeezed desktop. `Dashboard.tsx` branches on `useDevice().isMobile` to render an entirely separate `MobileMemoryDashboard`. It is engineered as a **zero-scroll, one-handed** frame:
- `h-screen-safe overflow-hidden flex flex-col` shell; everything fits the viewport with `flex-shrink-0` slots and a viewport-relative web floor (`min-h-[clamp(170px,30vh,320px)]`).
- The **memory web is the hero** (center), capture bar pinned low, briefing in a fixed-height slot at top that shows exactly ONE state at a time (briefing card / generating / cold-start interests CTA / generate CTA).
- Voice-first: large animated mic with glow rings, recording waveform, live captions, haptics.
- Bottom nav (5 tabs) + floating **Verify (N)** button + `MiniPlayer` for briefing audio.
- Sheets/modals slide up: `InterestsSheet`, `CustomBriefingSheet`, `BriefingSheet`, `FactVerificationCard`, `VerificationSwipeStack`, `TranscriptReviewPanel`.
- `bottom-nav-clearance` / `…-with-player` CSS for safe spacing.

Caveat: it is bespoke but **dense** — the top slot, health bar, web, pattern pills overlay, capture bar, verify FAB, briefing sheets all coexist. It is one-handed-capturable but far from a "5-minute single task."

---

## desktop_treatment

**Command-center layout** via `DesktopShell`:
- Fixed 220px left rail (`DesktopRail`: 6 workspace items + 3 account + user footer + sign-out), 56px top bar with page title/eyebrow ("Good morning, {name}" / "Memory Web"), inline **Command Palette** trigger, and page-level **Quick export** action.
- Main column: optional Decision `AlertBanner` → `DecisionCtaCard` → **input/capture bar** (mic/upload/text) → `SeedBeatsPrompt` → **Memory Web hero canvas** (`clamp(420px, calc(100dvh-360px), 640px)`) → **Skills & Patterns** (3 columns: Strengths/Blind Spots/Behaviors) → **Facts grid** (up to 24 `FactCard`s, 2–4 cols, hover edit/verify/delete, "View all →" `/memory`).
- 360px **right rail** (xl+ only): `RailBriefingSlot` (generate/play) + `RailQuickActions` (copy context / export wizard / import) + `RailCoverage` (category distribution bars) + "Activity" delta.
- Whole app pinned to `h-screen-safe` (100dvh); window never scrolls — internal hidden-scrollbar region holds overflow (recent zero-scroll work).
- Full drag-and-drop file import overlay + importing overlay.

The desktop view exposes meaningfully MORE than mobile (facts grid, patterns 3-up, coverage bars, activity, decision CTA card, quick actions) — consistent with the bespoke-mobile / command-center-desktop intent, but it also concentrates 6+ distinct feature blocks on one screen.

---

## complexity_1to5

**5 (overwhelming).** Home is not a home screen; it is a super-surface. On a single route it asks the user to: capture (3 input modes), review transcripts, verify inferred facts (2 different verify UIs), browse/curate a graph, edit/delete facts, generate + expand + listen to a briefing, configure interests (seed chips / interests sheet), pin/kill/automate news segments, respond to decision alerts, launch a decision pressure-test, and export context (2 paths). Desktop adds patterns, coverage, activity, facts grid. This is the clearest embodiment of the founder's "every tab asks several complex things at once."

---

## duplications (overlap with OTHER surfaces)

- **Memory editing / fact CRUD**: Home (desktop facts grid edit/delete/verify + capture) duplicates the dedicated **Memory Center** (`/memory`, `MemoryCenter.tsx`). "View all →" admits it. Capture/voice/import is also the core of `/memory`.
- **Fact verification**: appears here as (a) mobile Verify FAB → swipe stack, (b) post-capture `FactVerificationCard`, AND (c) per-fact verify on desktop — three verify entry points on ONE surface, plus the same flow lives on `/memory`.
- **Briefing config + playback**: Home embeds the Briefing card, generate, custom-briefing sheet, interests, per-segment pin/kill — duplicating the entire dedicated **Briefing tab** (`/briefing`, `BriefingPage.tsx`) and the bottom-nav "Briefing" item. The `BriefingSheet`/`MiniPlayer` are global so they also overlap.
- **Decision / pressure-test**: the Decision Inbox alert + `DecisionCtaCard` here surface and link to the dedicated **Decision tab** (`/decision`). The marquee action is duplicated as a CTA on Home and as the "Decide" bottom-nav tab.
- **Export**: "Copy context to clipboard", top-bar "Quick export", and "Open Export wizard" on Home duplicate the dedicated **Export/Context** tab (`/context`, `ContextExport.tsx`) and the desktop "Export" rail item.
- **Interests/personalization**: `SeedBeatsPrompt` (desktop), the mobile "Set interests" CTA, `InterestsSheet`, AND Settings → Interests are 3+ paths to the same `briefing_interests` data.
- **View toggle quirk**: "Edge" is not a separate route — it is `?view=edge` on `/dashboard`, so Home and Edge share a URL/route but are different surfaces (and different nav items).
- **Greeting / dashboard data**: legacy `DashboardProvider` (mock weekly action + daily provocation) overlaps the briefing/decision content conceptually but is dead.

---

## underused_data (captured here but not fed back into learning)

- **verification_status / verified_at**: only used to compute a health-score % and gate the Verify FAB. Confirmations/corrections do not visibly retrain extraction or weight future inferences from Home.
- **Kill / pin signals on briefing segments** (`useKillLensItem`, pin beat): captured, but the loop back into personalization is opaque on this surface — the user gets no "we learned X" confirmation. (Underused as a *visible* learning signal.)
- **`reference_count` / `last_referenced_at`** on facts (read in `useMemoryWeb`) — fetched but not surfaced or used to prioritize/decay memory on Home.
- **`temperature` (hot/warm/cold)** — shown as a pill, defaulted to 'warm' when missing; no user control or learning from how often a fact is actually used.
- **`delta` ("+N facts since last visit", `mindmaker_last_visit`)** — computed from localStorage, shown briefly; not persisted server-side, lost across devices, never used to drive a "here's what changed / what to review" learning moment.
- **Industry seeds / cold-start facts** — generated for ambient visuals; acceptance is tracked but the decorative seeds themselves aren't tied to learning.
- **Voice transcripts (raw + refined)** — reviewed then discarded after extraction; the raw audio/transcript isn't retained as a learning corpus on this surface.
- **Decision monitoring outcomes** — surfaced as alerts but the user's response (review/dismiss) doesn't visibly tune what gets watched.

This is the heart of the founder's "it never feels like it learns from the user": Home captures a LOT (corrections, kills, pins, references, temperature, deltas) but reflects almost none of it back as visible personalization or memory that compounds.

---

## notes

- **DARK theme, not light**: `CLAUDE.md` "Light mode design: warm off-white…" is stale. Home renders dark (`bg-background` dark tokens, emerald `#00D9B6` accent, `LoadingPage` is `bg-black`).
- **Dead/legacy dashboard system**: `src/components/dashboard/DashboardProvider.tsx` returns **hardcoded mock** weeklyAction ("Schedule a 15-minute AI exploration session…") + dailyProvocation + a default baseline score (72 / "Advancing" / 18th pct). None of it renders on current Home. `HeroStatusCard`, `WeeklyActionCard`, `DailyProvocation(Card)`, `PatternInsight`, and the whole `dashboard/desktop` + `dashboard/mobile` subtrees appear unused by the live Home — candidate dead code. (Only `dashboard/BriefingCard.tsx` is live.) Confirm with a usage sweep before deletion.
- **Two verification UIs** (`FactVerificationCard` modal vs `VerificationSwipeStack`) coexist on mobile Home with overlapping purpose — consolidation target.
- **Onboarding is opt-in, never enforced** — banner + once-per-browser auto-offer; multiple localStorage flags (`mindmaker_onboarded`, `mindmaker_onboard_offered`) gate it. Easy to end up onboarded with zero facts (X dismiss marks complete).
- **Briefing slot is single-state by design on mobile** (good): card / generating / cold-start / generate. But the same briefing functionality also fully exists as its own tab — redundant surface.
- **Desktop briefing card is a thinner clone** of the mobile `BriefingCard`: `RailBriefingSlot` only does generate/play, losing expand, per-segment pin/kill/automate, custom, and refresh. Feature parity gap between platforms on the same logical card.
- **Resilience patterns worth keeping**: `useMemoryWeb` gracefully falls back when `archived_at`/optional tables are missing; `submitInput` retries cold-start FunctionsFetchErrors; `useGenerateBriefing` de-dupes in-flight generations; health score treats unknown verification status as inferred (fixes a "100% verified" bug).
- **"4 more things waiting" / "assumption" element** the founder described = `DecisionInboxCard` / `AlertBanner` ("an assumption just changed", "+N more", "Review the decision" → `/decision`). It is the one element that links Home to another tab as progress/pressure.
- **Edge view shares the `/dashboard` route** — mapping Home and Edge as one "tab" understates that Home itself is two surfaces behind a query param.
- **Greeting + name** is the only obviously personalized chrome; everything deeper (briefing relevance, patterns, decision watch) is real but its learning is invisible to the user.
