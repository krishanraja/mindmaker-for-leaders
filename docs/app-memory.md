# CTRL Surface Map: Memory Subsystem (all editing/verifying UIs + the web)

> Honest current-state truth map. Read from real code in `C:/Users/krish/mm-ctrl`. React 18 + Vite + TS + shadcn + Tailwind + Framer Motion + Supabase. DARK theme. React Router v6.

## What it is

The Memory subsystem is CTRL's core "the app learns who you are" layer. One underlying object — a **memory fact** (`user_memory` table row: `fact_label`, `fact_value`, `fact_context`, `fact_category` of identity/business/objective/blocker/preference, `verification_status` of inferred/verified/corrected/rejected, `confidence_score`, `temperature` hot/warm/cold, `source_type`) — is presented, edited and confirmed through **multiple overlapping UIs across two routes**:

- **`/dashboard` (default `view=memory`)** — the home tab. Renders `MobileMemoryDashboard` or `DesktopMemoryDashboard`. Hero is the **animated Memory Web** plus a capture bar (voice/text/import) and inline fact CRUD.
- **`/memory` (MemoryCenter)** — the "Memory Browser." A 4-tab list/management surface (All Facts, Library, Privacy, Data). **No web here** — it's the spreadsheet view of the same facts.

The founder's "three UIs doing three things to one memory" is real, and it's actually **more than three**. Confirmed: there are **two distinct verification UIs**, **two distinct manual editors**, **two manual-add paths**, and **two renderings of the Memory Web** (home-tab vs the desktop fact-card grid / `/memory` has none).

## The three+ UIs over ONE memory fact (confirmed and detailed)

### 1. Swipe-to-verify (batch) — `VerificationSwipeStack.tsx`
- Full-screen `fixed inset-0 z-50` Tinder-style card stack. Swipe right = verify, left = reject, tap pencil = edit-in-place (single text input), then it auto-verifies the correction.
- Buttons mirror swipes (reject / edit / verify circles). Progress ring, "N of M", completion screen (`VerificationCompletionScreen`) with "continue" to fetch the next batch.
- Opened from the green "verify" affordances. Driven by `useVerificationFlow` → `useUserMemory.verifyFact/rejectFact` → RPC `verify_memory_fact`.
- **Mounted in BOTH** `MemoryCenter` (`isFlowOpen`) AND `MobileMemoryDashboard` (`isVerifyFlowOpen`). Same component, two hosts.

### 2. Inline "Verify what I heard" (per-extraction) — `FactVerificationCard.tsx`
- A SECOND, separate verification UI. Bottom-sheet (mobile) / centered card (desktop), swipe-down to dismiss. Buttons labelled **"Correct" / pencil / X** (confusingly, "Correct" = accept).
- Fires right after a voice/text capture extracts facts (`showVerification` in `MobileMemoryDashboard`), driven by `useUserMemory.pendingVerifications`.
- Functionally overlaps ~100% with VerificationSwipeStack (verify/reject/edit one fact at a time) but is a completely different component, different copy, different gesture model, different progress UI. **Two verification UIs for the same job.**

### 3. Manual editor (full sheet) — `MemoryDetailSheet.tsx`
- 85vh bottom sheet. View mode shows label/value/context + metadata (category, source, status, confidence, created/updated). Pencil → edit mode: editable **Label / Value / Context** textareas; Save; Delete-with-confirm.
- Editing an `inferred` fact silently promotes status to `corrected`. Opened from `MemoryList` / `MemoryItemCard` "Edit" on `/memory`. Uses `useUpdateMemory` / `useDeleteMemory` (React Query).

### 4. The Memory Web visual — `MemoryWebVisualization.tsx`
- Animated SVG "neural web": nodes = facts (colour by category, pulse speed by temperature), golden-angle spiral layout, same-category + nearest-neighbour edges, zoom/pan (`useZoomPan`), tap a node → tooltip card (label, value, connection count). Particles, centre core, legend, empty state, reset-zoom.
- **Read-mostly**: tapping a node only opens a tooltip; **there is no edit/verify from inside the web itself**. It's a viewer, not an editor.

### Home-tab vs memory-tab web (the founder's specific question)
- **Home tab (`/dashboard` mobile)** = `MobileMemoryDashboard`: the web is the literal hero of the screen (`min-h-[clamp(170px,30vh,320px)]`), with capture bar below and pattern pills overlaid.
- **Home tab (`/dashboard` desktop)** = `DesktopMemoryDashboard`: the web is one card in a scroll (`MemoryWebVisualization` in a 420-640px box) **PLUS a separate `FactCard` grid** (first 24 facts) rendered below it — so desktop home shows the SAME facts twice (as orbs and as cards). The desktop FactCard grid is a THIRD fact-display besides the web and the `/memory` list.
- **Memory tab (`/memory`)** = `MemoryCenter`: **no web at all** — only the `MemoryList` (search + filter chips + cards). So "the web" lives only on the dashboard; the dedicated Memory route is a list. This split is itself a source of confusion ("where do I see my web vs my facts").

## user_actions (exhaustive)

**On `/dashboard` (home, Memory view):**
- Tap mic → record voice (max 120s), tap to stop; watch waveform + live caption preview.
- Review/edit the transcript in `TranscriptReviewPanel` (Continue / Dismiss). (mobile + desktop)
- "Type instead" → free-text capture; submit (Cmd+Enter mobile / Enter desktop).
- "Import file" / drag-drop a `.md`/`.txt` → AI extraction.
- After extraction: verify/correct/reject each extracted fact in `FactVerificationCard` ("Correct" / edit / X / "Skip for now").
- Tap a web node → read its tooltip; pan/zoom the web; reset zoom.
- Tap "Verify (N)" floating pill / green stat → open `VerificationSwipeStack`; swipe/verify/reject/edit each, "continue", "done".
- (Desktop FactCard grid) hover a card → Verify / Edit / Delete icons; click card to expand context; "View all →" to `/memory`.
- Generate / refresh / play Daily Briefing; set interests; open custom briefing; pressure-test a decision (Decision CTA → `/decision`); quick-export context to clipboard; open Export wizard; ⌘K command palette.
- Dismiss onboarding banner / "Set up" guided interview.

**On `/memory` (MemoryCenter):**
- Switch among 4 tabs: All Facts / Library / Privacy / Data.
- Search memories; toggle filters; pick category chip (All/About You/Business/Goals/Challenges/Preferences); pick source chip (All/Voice/Manual/Form); clear filters.
- Per card: quick-verify (check, only if inferred), "automate this pain" zap (blockers only → `/context` Skill Builder with seed), Edit (→ `MemoryDetailSheet`), Delete.
- In detail sheet: edit Label/Value/Context, Save, Delete (confirm).
- "Add" (header / empty-state) → `AddMemorySheet`: choose Voice or Text; voice auto-saves as `preference`; text = content textarea + collapsible category/label; Save; restore/discard a 24h draft.
- "Verify your memories" banner / "% verified" stat → `VerificationSwipeStack`.
- Export to AI (→ `/context`); Import markdown.
- Privacy tab: toggle Store memory / Store voice transcripts / Auto-summarize; set retention; clear local caches.
- Data tab: export JSON / export CSV; import JSON or MD; "Export to AI" CTA (again); **Delete ALL memories** (danger zone).

## key_files
- `src/pages/MemoryCenter.tsx` — `/memory`, the 4-tab browser host
- `src/pages/Dashboard.tsx` — `/dashboard`, picks mobile/desktop memory dashboard + onboarding
- `src/components/memory-web/MobileMemoryDashboard.tsx` — home tab (mobile): web + capture + BOTH verify UIs
- `src/components/memory-web/DesktopMemoryDashboard.tsx` — home tab (desktop): web card + FactCard grid + right rail
- `src/components/memory-web/MemoryWebVisualization.tsx` — the animated web (shared)
- `src/components/memory/VerificationSwipeStack.tsx` — batch swipe-verify UI (verify UI #1)
- `src/components/memory/FactVerificationCard.tsx` — post-extraction "Verify what I heard" UI (verify UI #2)
- `src/components/memory/MemoryDetailSheet.tsx` — full manual editor sheet
- `src/components/memory/AddMemorySheet.tsx` — manual add (voice/text) sheet
- `src/components/memory/MemoryList.tsx` + `MemoryItemCard.tsx` — list + card (search/filter/quick-actions)
- `src/components/memory/VerificationBanner.tsx` — dismissible "N memories to verify" pill
- `src/components/memory/VerificationCompletionScreen.tsx` — swipe-flow done screen
- `src/components/memory/PrivacyControlsPanel.tsx` — Privacy tab
- `src/components/memory/ExportImportPanel.tsx` — Data tab (JSON/CSV/MD/delete-all)
- `src/hooks/useMemoryWeb.ts` — dashboard data + desktop CRUD (`editFact/deleteFact/verifyFact/submitInput`)
- `src/hooks/useVerificationFlow.ts` — orchestrates the swipe flow
- `src/hooks/useUserMemory.ts` — extraction + `verify_memory_fact` RPC + pending verifications
- `src/hooks/useMemoryQueries.ts` — React Query CRUD for the list/detail/import/export
- `src/types/memory.ts` — `UserMemoryFact`, `MemoryWebFact`, `PendingVerification`, `FactCategory`, `Temperature`, `PatternType`

## mobile_treatment
Genuinely mobile-first, not squeezed. Device split via `useDevice().isMobile` (true breakpoint branch, separate component trees). `MobileMemoryDashboard` is a fixed `h-screen-safe` no-scroll frame: AppHeader, briefing slot, health bar, web hero, voice/text capture, floating verify pill, `BottomNav`. Sheets slide up (`AddMemorySheet`, `MemoryDetailSheet` at 85vh). Verify flows are full-screen with safe-area padding, haptics (`@/lib/haptics`), 44px touch targets, swipe gestures. This is the "5-min one-handed" surface the founder wants — but it's overloaded (web + capture + briefing + decision + two verify UIs all on one screen).

## desktop_treatment
`DesktopShell` (sidebar + sticky top bar + optional right rail + ⌘K palette). `DesktopMemoryDashboard`: eyebrow greeting, "Memory Web" title, top-bar stat strip (facts/patterns/health) + quick-export; main column = decision alert banner → Decision CTA → capture input bar (mic/import/text, Enter to send, drag-drop overlay) → seed-beats prompt → **web card** → **Strengths/Blind-Spots/Behaviors pattern grid** → **FactCard grid (24)**; right rail = briefing slot, quick actions, coverage bars, activity delta. `/memory` desktop reuses `DesktopShell` with the 4 tabs constrained to `max-w-4xl`. This is the "command center" — but it duplicates the mobile capture + verify entirely and adds a second fact grid.

## complexity_1to5
**5 — overwhelming.** One home screen simultaneously hosts: the web, voice+text+file capture, transcript review, post-extraction verification, batch verification, a fact-card grid, patterns, briefing generation/playback, decision alerts + CTA, export, onboarding. Two separate verification components with different copy/gestures for the identical task. The `/memory` route adds a 4-tab manager (list + Library + Privacy + Data) on top. A user cannot hold the mental model of "where do I edit vs verify vs view my memory."

## duplications
- **Verification: 2 full components for 1 job** — `VerificationSwipeStack` (batch swipe) and `FactVerificationCard` (inline post-extraction). Both verify/reject/edit one fact at a time via the same `verify_memory_fact` RPC; different UI, copy ("Verify →" vs "Correct"), gestures.
- **Manual editing: 2 editors** — `MemoryDetailSheet` (full sheet, label+value+context, on `/memory`) vs desktop `FactCard` inline edit (`useMemoryWeb.editFact`, on `/dashboard`). Plus `useMemoryQueries.useUpdateMemory` vs `useMemoryWeb.editFact` are two different write paths to the same table.
- **Manual add: 2 paths** — `AddMemorySheet` (voice/text sheet, `/memory`) and the dashboard capture bar (voice/text/import). Both call extraction/create.
- **Fact display: 3 renderings** — Web orbs, desktop `FactCard` grid, `/memory` `MemoryItemCard` list — all the same `user_memory` rows.
- **Quick-verify: 3 entry points** — `MemoryItemCard` check, desktop `FactCard` check, the two verify flows.
- **Export: duplicated 4+ times** — `ExportImportPanel` Data tab, its own "Export to AI" CTA, MemoryCenter header "Export to AI", desktop quick-export + right-rail "Copy context"/"Open Export wizard" — all route to `/context` (a separate Context/Export surface, mapped elsewhere in corpus).
- **Briefing + Decision** are embedded into the memory dashboards (cross-surface bleed; both have their own routes `/briefing`, `/decision`).
- **Pattern display** (Strengths/Blind-Spots/Behaviors) lives in the desktop dashboard but `user_patterns` are also surfaced as mobile overlay pills.
- **Delete**: per-card (list + FactCard), detail-sheet delete, and bulk "Delete all" (Data tab) — three deletion UIs.

## underused_data
- **`temperature` (hot/warm/cold)** — computed/stored and drives web pulse + a stat pill, but never feeds prioritization of what to verify, surface, or brief on.
- **`reference_count` / `last_referenced_at`** — read into `MemoryWebFact` but not displayed or used to age/decay facts or rank relevance.
- **`confidence_score`** — shown as a badge/low-confidence warning; not used to auto-order the verification queue or auto-archive low-confidence facts.
- **`fact_context`** (the original quote/source) — captured and editable but only shown as italic flavour text; not used to explain *why* the AI inferred a fact during verification (a missed trust-building moment).
- **`source_type`** — a filter chip only; not used in learning.
- **`user_patterns` (strength/blindspot/behavior/anti_preference) and `user_decisions`** — surfaced read-only; confirm/dismiss handlers exist in `useMemoryWeb` (`confirmPattern`/`dismissPattern`/`supersedeDecision`) but are **not wired to any UI control** on these surfaces — captured signal that never closes a loop.
- **Verification outcomes** (verify/reject/correct) update status but there's no visible "the app got smarter because you corrected X" feedback — reinforcing the founder's "it never feels like it learns."
- **`GettingSmarterDelta`** (new facts/patterns since last visit) is computed; only a tiny "+N" appears.

## notes / dead code / half-built
- **DEAD CODE (exported, zero real consumers — confirmed by grep):** `MemoryPill`, `VoiceMemoryCapture`, `GuidedFirstExperience`, `MemoryHealthViz`, `CategoryChart`, `IntelligencePanel`, `GettingSmarterBanner`, `MemoryPulseBar`, `RecentFactsFeed`, `PatternInsightCard`. All ten are re-exported from `memory/index.ts` or `memory-web/index.ts` but imported by nothing outside their own file/barrel. `VoiceMemoryCapture.tsx` (16KB) and `GuidedFirstExperience.tsx` (25KB) are large abandoned builds.
- **Desktop "Edit" is effectively broken/no-op:** `FactCard.onEdit` calls `onEdit?.(fact.id)` → `useMemoryWeb.editFact(id)`, but `editFact(id, updates)` expects an `updates` object as 2nd arg. Called with only an id, it runs `supabase.update(undefined)` — no edit modal opens, no fields change. The desktop fact grid has a pencil that does nothing useful. (Mobile/`/memory` editing via `MemoryDetailSheet` works.)
- **Confusing verb on FactVerificationCard:** the accept button is labelled "Correct" (meaning "this is correct"), sitting next to a pencil "edit/correct" — easy to misread.
- **Two write paths, drift risk:** `useMemoryWeb` writes `user_memory` directly (`is_current=false` for delete, raw status flips), while `useMemoryQueries`/`useUserMemory` go through React Query + RPCs. State can desync between the dashboard web and the `/memory` list until a manual refresh.
- **Resilience shims:** `useMemoryWeb.refresh` defensively falls back when `archived_at`/`user_patterns`/`user_decisions`/`user_memory_budget` tables/columns are missing — signals schema that drifted ahead of/behind deploys.
- **`is_high_stakes` always false** on create (both add paths hardcode `false`), so the "high-stakes facts" premise of `FactVerificationCard` ("Premium verification overlay for high-stakes facts") never actually triggers on that basis.
- **Cold-start seeds:** empty web blooms with `useIndustrySeeds` ambient nodes (decorative, non-interactive) so the canvas is never blank.
- **`MemoryPulseBar`/health** logic (`calculateHealthScore`) lives in `useMemoryWeb`; the standalone viz components for it are the dead ones above.

## Consolidation implication (for the dedupe mandate)
One memory fact should have: ONE capture path, ONE verify flow, ONE editor, ONE viewer. Today it has 2 capture paths, 2 verify UIs, 2-3 editors, 3 fact renderings, and the web (the most distinctive asset) can't edit/verify at all. Collapsing the two verify components into one, making the web tap-to-verify/edit, killing the desktop FactCard duplicate grid, and deleting the 10 dead components would remove most of the overwhelm without losing a single real feature — while finally letting temperature/confidence/reference_count/patterns drive a visible "it's learning you" loop.
