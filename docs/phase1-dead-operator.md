# Phase 1 Dead-Code Manifest — operator / missions / provocation / action / pulse

Cluster: `src/components/{operator,missions,provocation,action,pulse}`
Repo: `C:/Users/krish/mm-ctrl` (Vite + React + TS)
Live router: `src/router.tsx` (imported by `src/App.tsx` as `@/router`).
Method: read real code + grepped every file path AND every exported symbol across all of `src/`. Conservative — dead only when no LIVE (non-cut, router-reachable) entry point exists.

---

## KEY STRUCTURAL FINDINGS (load-bearing)

1. **Dead parallel router**: `src/router/routes.tsx` + `src/router/guards.tsx` are NOT imported by anything (`App.tsx` uses `src/router.tsx`). This dead router is the ONLY thing routing `pages/Pulse.tsx`, `pages/Today.tsx`, `pages/Voice.tsx`. (Out of my assigned area to delete, but it is why the pulse cluster is dead.)

2. **Dead parallel dashboard**: `src/components/dashboard/desktop/DesktopDashboard.tsx` and `dashboard/mobile/MobileDashboard.tsx` have NO importers. The LIVE `pages/Dashboard.tsx` renders `memory-web/{Mobile,Desktop}MemoryDashboard` + `memory-web/BottomNav` instead. These dead dashboards are the only importers of `missions/MissionsDashboard`.

3. **Dead assessment/results funnel**: `components/UnifiedAssessment.tsx` (no importers) and `pages/Baseline.tsx` (not routed) are the only importers of `components/SingleScrollResults.tsx`, which is the only importer of `missions/FirstMoveSelector`.

4. **Unrouted page**: `pages/Progress.tsx` is NOT in `src/router.tsx` and has no importers; it is the only importer of `missions/AdaptivePrompts`.

5. The live `dashboard/mobile/StrategicPulseSheet.tsx` uses `@/core/types`, NOT the `components/pulse/*` cards. The live `dashboard/DailyProvocation.tsx` and `dashboard/WeeklyActionCard.tsx` are DIFFERENT files from the cut `provocation/DailyProvocation.tsx` / `action/WeeklyAction.tsx`.

---

## LIVE / KEEP (4 files) — the entire `operator/decision/` subdir

These are reachable from live surfaces and MUST NOT be deleted.

| File | Live entry point |
|---|---|
| `src/components/operator/decision/PressureTestPanel.tsx` | `pages/DecisionPage.tsx` → route `/decision` (in `router.tsx`) |
| `src/components/operator/decision/CriticalCallStep.tsx` | imported by `PressureTestPanel` (live) |
| `src/components/operator/decision/decision-views.tsx` | `memory-web/DesktopMemoryDashboard` (AlertBanner) + `onboarding/OnboardingInterview` (DecisionResult, CaptureView) — both live via `/dashboard`; also `PressureTestPanel` |
| `src/components/operator/decision/DecisionInboxCard.tsx` | `memory-web/MobileMemoryDashboard` (live via `/dashboard`). Also imported by dead `dashboard/mobile/MobileDashboard` — irrelevant; the memory-web import keeps it live. |

Note: `decision-views.tsx` exports 6 symbols (ThinkingView, DecisionResult, CaptureView, AlertBanner, RecentRail, UpgradeCard). The file is LIVE as a whole; individual unused exports are not separately deletable here.

---

## DEAD (safe to delete) — 18 files

### operator/ root cluster (8 files) — self-contained, orphaned
Entry is `OperatorDashboard` which has NO importers (confirmed; `pages/DecisionPage.tsx` even comments "not via the orphaned OperatorDashboard"). Internal-only graph: `OperatorDashboard` → `DecisionAdvisor` → (the live `PressureTestPanel`, a dead→live edge that does NOT revive the cluster). The other 5 have no importers at all.

- `src/components/operator/DecisionAdvisor.tsx`  (only importer: dead `OperatorDashboard`)
- `src/components/operator/DualPercentageSlider.tsx`  (no importers)
- `src/components/operator/ModeSelector.tsx`  (no importers)
- `src/components/operator/OperatorDashboard.tsx`  (no importers; orphaned)
- `src/components/operator/OperatorIntake.tsx`  (no importers; exported types BusinessLine / OperatorIntakeData unused outside operator/)
- `src/components/operator/ToolCheckboxGrid.tsx`  (no importers)
- `src/components/operator/VoiceFirstInput.tsx`  (no importers)
- `src/components/operator/WeeklyPrescription.tsx`  (no importers)

### missions/ (3 files)
- `src/components/missions/MissionsDashboard.tsx`  (only importers: dead `dashboard/desktop/DesktopDashboard` + dead `dashboard/mobile/MobileDashboard`)
- `src/components/missions/AdaptivePrompts.tsx`  (only importer: unrouted `pages/Progress.tsx`)
- `src/components/missions/FirstMoveSelector.tsx`  (only importer: `SingleScrollResults` ← dead `UnifiedAssessment` + unrouted `pages/Baseline.tsx`)

### provocation/ (1 file)
- `src/components/provocation/DailyProvocation.tsx`  (no importers; live `dashboard/DailyProvocation.tsx` is a different file)

### action/ (1 file)
- `src/components/action/WeeklyAction.tsx`  (no importers; live `dashboard/WeeklyActionCard.tsx` is a different file)

### pulse/ (4 files) — self-contained cluster
- `src/components/pulse/StrategicPulse.tsx`  (only importer: `pages/Pulse.tsx`, routed ONLY via dead `router/routes.tsx`; live `router.tsx` `/pulse` is a `<Navigate to="/dashboard">` redirect with no import)
- `src/components/pulse/BaselineCard.tsx`  (only importer: dead `StrategicPulse`)
- `src/components/pulse/RiskSignalsCard.tsx`  (only importer: dead `StrategicPulse`)
- `src/components/pulse/TensionsCard.tsx`  (only importer: dead `StrategicPulse`)

---

## NOTES / OUT-OF-SCOPE FOLLOW-UPS (not in my dirs but enable these deletes)
- `src/router/routes.tsx` + `src/router/guards.tsx` (dead parallel router)
- `src/components/dashboard/desktop/DesktopDashboard.tsx` + `dashboard/mobile/MobileDashboard.tsx` (dead parallel dashboard) and likely much of `components/dashboard/`
- `components/UnifiedAssessment.tsx`, `components/SingleScrollResults.tsx`
- `pages/Progress.tsx`, `pages/Pulse.tsx`, `pages/Baseline.tsx`, `pages/Today.tsx`, `pages/Voice.tsx`
These should be handled by the owners of those dirs; deleting my 18 files plus these together leaves no dangling imports. Final backstop: `npm run build`.
