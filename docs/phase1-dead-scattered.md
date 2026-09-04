# CTRL Phase 1 — Dead-or-Live manifest: SCATTERED DEAD BITS

Repo: `C:/Users/krish/mm-ctrl` (Vite + React 18 + TS)
Assigned area: scattered dead components in `src/components/{memory-web,edge,mobile}`, dead routers `src/router/{routes,guards}.tsx`, the `dashboard/mobile` MobileDashboard cluster, breakpoint/device hooks in `src/hooks`, and orphaned `src/pages`.
Method: greps over ALL of `src/**` by both import PATH and exported SYMBOL names; cross-checked the LIVE router (`src/router.tsx`) and `App.tsx`/`main.tsx` entry; verified `__tests__` references. Path alias `@/` -> `./src` (tsconfig + vite). The LIVE router is `src/router.tsx` (a FILE; `App.tsx` imports `@/router`, which resolves to the file, not the `src/router/` dir).

Rule applied: a file is DEAD only if (a) no file OUTSIDE the cut-set imports it by path or symbol, AND (b) `src/router.tsx` does not reference it. A self-contained cluster that only imports itself, with no live entry point, is all dead.

---

## DEAD (safe to delete)

### Dead routers — `src/router/`
The LIVE router is `src/router.tsx`. The `src/router/` DIRECTORY is the superseded old router; `@/router` resolves to the file, never the dir. Nothing imports `routes` or `ProtectedRoute`.
- `src/router/routes.tsx` — exports `routes`; the only thing that imports it = nothing. Its `import`s of `pages/Today`, `pages/Pulse`, `pages/Voice`, `AuthScreen` are the SOLE references to those orphan pages.
- `src/router/guards.tsx` — exports `ProtectedRoute`; zero importers anywhere in `src`.

### `src/components/edge/` — scattered dead bits (NOT the live Edge feature)
Self-contained dead cluster. `EdgeProfileCard` is the only importer of `StrengthPill` + `GapPill`, and `EdgeProfileCard` itself has zero external importers. The LIVE Edge surface (EdgeView, EdgeOnboarding, EdgePaywall, DraftSheet, SkillCaptureSheet, EdgeVerdict, etc.) does NOT import any of these four — verified.
- `src/components/edge/EdgeProfileCard.tsx` — zero external importers.
- `src/components/edge/StrengthPill.tsx` — only imported by EdgeProfileCard (dead).
- `src/components/edge/GapPill.tsx` — only imported by EdgeProfileCard (dead).
- `src/components/edge/SmartProbeCard.tsx` — zero importers anywhere.

### `src/components/memory-web/` — scattered dead bits (dir is mostly LIVE; these are the orphans)
Barrel `memory-web/index.ts` re-exports these, but NOTHING imports the barrel by directory, and no file imports these components directly.
- `src/components/memory-web/GuidedFirstExperience.tsx` — only the barrel re-exports it; no consumer.
- `src/components/memory-web/RecentFactsFeed.tsx` — only the barrel re-exports it; no consumer.
- `src/components/memory-web/CategoryChart.tsx` — only the barrel re-exports it; no consumer.
  (LIVE in this dir, KEPT: BottomNav [5-tab], AppHeader, DesktopSidebar, DesktopMemoryDashboard, MobileMemoryDashboard, MemoryWebVisualization, PatternInsightCard.)

### `src/components/mobile/` — dir is DEAD except two files
Verified by path-grep: ONLY `SwipeableCards` (used by `landing/HeroSection.tsx`) and `GlobalFAB` (used by `layout/AuthedLayoutRoute.tsx`, which the router mounts) are live. Every other member has ZERO importers.
- `src/components/mobile/SideDrawer.tsx` — zero importers.
- `src/components/mobile/MobileLayout.tsx` — zero importers.
- `src/components/mobile/StrategicPulseSheet.tsx` — zero importers.
- `src/components/mobile/PriorityCardStack.tsx` — zero importers.
- `src/components/mobile/HeroStatusCard.tsx` — zero importers (the live HeroStatusCard is `dashboard/HeroStatusCard.tsx`, a different file).
- `src/components/mobile/CompetitiveIntelligenceSheet.tsx` — zero importers.
- `src/components/mobile/BottomSheet.tsx` — zero importers.
- `src/components/mobile/DecisionPrepSheet.tsx` — zero importers.
- `src/components/mobile/ActionQueueSheet.tsx` — zero importers.

### `src/components/memory/VoiceMemoryCapture.tsx` (named in brief)
- `src/components/memory/VoiceMemoryCapture.tsx` — only the `memory/index.ts` barrel re-exports it; no consumer imports it directly or via the barrel dir. DEAD. (Rest of `memory/` dir is LIVE memory UI — left untouched.)

### `src/components/dashboard/mobile/` — old MobileDashboard + 4-tab BottomNav (named in brief)
`MobileDashboard` has zero external importers; it is the sole consumer of every sibling in this folder, forming an internally-closed dead cluster. (The `../HeroStatusCard` import inside it resolves UP to `dashboard/HeroStatusCard.tsx`, not a sibling.)
- `src/components/dashboard/mobile/MobileDashboard.tsx` — zero external importers (explicitly named in brief).
- `src/components/dashboard/mobile/BottomNav.tsx` — old 4-tab BottomNav variant; only imported by MobileDashboard (dead) (explicitly named as "old/4-tab BottomNav variants").
  (Siblings ActionQueueSheet/HeroStatusCard/PriorityCardStack/StrategicPulseSheet/VoiceButton/Sheet in this same folder are also only consumed by MobileDashboard -> dead-with-the-cluster, but listed under UNCERTAIN below because the `dashboard/` tree is the dashboard agent's primary scope.)

### Hooks — `src/hooks/`
- `src/hooks/useOfflineDetection.ts` — zero importers (the live offline hook is `useOffline`, used by `ui/offline-indicator.tsx`, which App.tsx mounts).
- `src/hooks/useMediaQuery.ts` — exports `useIsMobile`; its ONLY consumer is `src/components/PeerBubbleChart.tsx`, which is reached only through a fully-dead chain (`UnifiedResults`/`results/ResultsUnlockedSections` -> `BenchmarkComparison` -> `PeerBubbleChart`); both `UnifiedResults` and `ResultsUnlockedSections` have ZERO importers, so the whole chain is dead and so is this hook. (The live mobile-breakpoint hook is `use-mobile.tsx`, used everywhere — KEEP that one.) See note: deletion of this hook should land together with the results/benchmark cluster (other agent's scope).

### Orphaned `src/pages/` (zero module importers, not in live `src/router.tsx`)
- `src/pages/Baseline.tsx` — zero importers.
- `src/pages/DecisionCapture.tsx` — zero importers.
- `src/pages/Diagnostic.tsx` — zero importers.
- `src/pages/MissionCheckIn.tsx` — zero importers.
- `src/pages/MissionHistory.tsx` — zero importers.
- `src/pages/Progress.tsx` — zero importers.
- `src/pages/PromptCoach.tsx` — zero importers.
- `src/pages/Think.tsx` — zero importers (the one stray hit is a doc-comment in TeamInstructionsCard, not an import).
- `src/pages/WeeklyCheckin.tsx` — zero importers.
- `src/pages/Today.tsx` — imported ONLY by the dead `src/router/routes.tsx`. Dies with that router.
- `src/pages/Pulse.tsx` — imported ONLY by the dead `src/router/routes.tsx`. Dies with that router.
- `src/pages/Voice.tsx` — imported ONLY by the dead `src/router/routes.tsx`. Dies with that router.
  NOTE: `/pulse`, `/voice`, `/diagnostic`, `/today` paths still EXIST in the LIVE `src/router.tsx` but as `<Navigate ... replace />` redirects — they do NOT mount these page components. Safe to delete the page files.

---

## LIVE / KEPT (in or near my area — do NOT delete)
- `src/router.tsx` — the live router.
- `src/components/memory-web/BottomNav.tsx` — LIVE 5-tab nav (Dashboard, MemoryCenter, BriefingPage, DecisionPage, Goals, EnrichPage, Compliance, ContextExport).
- `src/components/memory-web/AppHeader.tsx` — LIVE (8 pages).
- `src/components/memory-web/DesktopSidebar.tsx`, `DesktopMemoryDashboard.tsx`, `MobileMemoryDashboard.tsx`, `MemoryWebVisualization.tsx` (also used by OnboardingInterview), `PatternInsightCard.tsx` — LIVE.
- `src/components/mobile/SwipeableCards.tsx` — LIVE (landing/HeroSection).
- `src/components/mobile/GlobalFAB.tsx` — LIVE (layout/AuthedLayoutRoute, mounted by router).
- `src/hooks/use-mobile.tsx` — LIVE (edge, landing, ui/sidebar, voice, briefing, operator).
- `src/hooks/useDevice.ts` — LIVE (AuthedLayoutRoute + most live pages).
- `src/hooks/useVisualViewport.ts` — LIVE (ui/drawer, ui/sheet, briefing/BriefingSheet — all live).
- `src/hooks/useOffline.ts` — LIVE (ui/offline-indicator, mounted in App.tsx).
- `src/components/memory/*` except VoiceMemoryCapture — LIVE memory UI.

---

## UNCERTAIN (NOT dead — flag for cross-scope confirmation / build backstop)
- `src/components/dashboard/mobile/{ActionQueueSheet,HeroStatusCard,PriorityCardStack,StrategicPulseSheet,VoiceButton,Sheet}.tsx` — provably dead-with-the-cluster (only consumer is the dead MobileDashboard), BUT the `dashboard/` tree is the dashboard agent's primary scope; delete alongside MobileDashboard. The sibling `dashboard/desktop/DesktopDashboard.tsx` imports `../HeroStatusCard` = `dashboard/HeroStatusCard.tsx` (parent-level, a DIFFERENT file) — do not confuse it with the mobile one.
- `src/hooks/useMediaQuery.ts` — dead, but its liveness is chained to the `results`/`benchmark` cluster (`PeerBubbleChart`, `BenchmarkComparison`, `UnifiedResults`, `ResultsUnlockedSections`) owned by another agent. Confirm that cluster is being cut, then delete this hook in the same change. If that cluster is somehow kept, this hook must be kept too.
- `src/components/memory/index.ts` and `src/components/memory-web/index.ts` barrels — after deleting the dead members, the barrels' re-export lines for `VoiceMemoryCapture` / `GuidedFirstExperience` / `RecentFactsFeed` / `CategoryChart` must be removed too, or the build breaks. (Edit, not whole-file delete — the barrels still export live members.)

## Build backstop
`npm run build` is the final gate; expect the two barrel edits above. No `__tests__` reference any DEAD file (verified), so no test breakage expected.
