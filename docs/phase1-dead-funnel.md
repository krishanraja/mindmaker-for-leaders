# Phase 1 "Clean the Room" — Dead Funnel Manifest

**Cluster:** `src/components/{assessment, benchmark, diagnostic, results}`
**Repo:** `C:/Users/krish/mm-ctrl` (Vite + React 18 + TS)
**Date:** 2026-06-12
**Method:** Read real code. Grepped every exported symbol AND every dir path across all of `src`. Traced each external consumer transitively to a router-reachable root. Sole route source = `src/router.tsx` (rendered by `App.tsx` via `<RouterProvider router={router} />`; no other routes array, no dynamic/string route refs).

---

## Verdict: ALL 25 files are DEAD (safe to delete together)

Every file in these four dirs is reachable ONLY through a funnel cluster that has **no router entry point**. The chain dead-ends at orphan pages/components that nothing imports.

### Reachability trace (why the whole cluster is dead)

```
router.tsx  (sole route source)
  └─ /diagnostic  → <Navigate to="/dashboard">   (REDIRECT, does NOT import pages/Diagnostic.tsx)
  └─ (no route imports pages/Baseline.tsx)

pages/Diagnostic.tsx        → imports diagnostic/DiagnosticFlow   — BUT Diagnostic.tsx imported by NOBODY (router redirects, never imports it)
pages/Baseline.tsx          → imports SingleScrollResults         — BUT Baseline.tsx   imported by NOBODY

diagnostic/DiagnosticFlow   → ProgressBar, QuestionCard, ResultsCard → BenchmarkInsightCard   (all internal to diagnostic/)
                              ↑ only consumer = pages/Diagnostic.tsx (orphan)

benchmark/* (9 files)       → consumed only by components/LeadershipBenchmarkV2.tsx
                              LeadershipBenchmarkV2 → consumed only by components/UnifiedResults.tsx
                              UnifiedResults → imported by NOBODY  (orphan)

results/* (6 files)         → consumed only by components/SingleScrollResults.tsx
                              SingleScrollResults → consumed by pages/Baseline.tsx (orphan) + components/UnifiedAssessment.tsx
                              UnifiedAssessment → imported by NOBODY  (orphan)

assessment/* (5 files)      → consumed only by components/UnifiedAssessment.tsx  (orphan, see above)
```

**No KNOWN-LIVE protected file lives in these dirs** (none are library / onboarding / landing / voice / compliance / memory-web / nav / shell). No `.test`/`.spec` references. No `components/index.ts` barrel re-exports them.

---

## src/components/assessment/  (5 files — ALL DEAD)

| File | Exports | Only consumer | Status |
|---|---|---|---|
| `AssessmentHeader.tsx` | `AssessmentHeader` | UnifiedAssessment.tsx (orphan) | DEAD |
| `AssessmentProgressCard.tsx` | `AssessmentProgressCard` | UnifiedAssessment.tsx (orphan) | DEAD |
| `AssessmentQuestionCard.tsx` | `AssessmentQuestionCard` | UnifiedAssessment.tsx (orphan) | DEAD |
| `DeepProfileOptIn.tsx` | `DeepProfileOptIn` | UnifiedAssessment.tsx (orphan) | DEAD |
| `SaveResultsPrompt.tsx` | `SaveResultsPrompt` | UnifiedAssessment.tsx (orphan) | DEAD |

## src/components/benchmark/  (10 files — ALL DEAD)

| File | Exports | Consumers | Status |
|---|---|---|---|
| `index.ts` (barrel) | re-exports all below | only LeadershipBenchmarkV2.tsx imports from barrel | DEAD |
| `types.ts` | `tierConfig`, `dimensionLabels`, `shortDimensionLabels`, `leverInsights` | siblings in benchmark/ + LeadershipBenchmarkV2.tsx | DEAD |
| `generateQuickWins.ts` | `generateQuickWins` | LeadershipBenchmarkV2.tsx (orphan) | DEAD |
| `BenchmarkScoreCard.tsx` | `BenchmarkScoreCard` | LeadershipBenchmarkV2.tsx (orphan) | DEAD |
| `ExecutiveSummary.tsx` | `ExecutiveSummary` | LeadershipBenchmarkV2.tsx (orphan) | DEAD |
| `BiggestLeverCard.tsx` | `BiggestLeverCard` | LeadershipBenchmarkV2.tsx (orphan) | DEAD |
| `RiskSignalsSection.tsx` | `RiskSignalsSection` | LeadershipBenchmarkV2.tsx (orphan) | DEAD |
| `LeadershipDimensionsSection.tsx` | `LeadershipDimensionsSection` | LeadershipBenchmarkV2.tsx (orphan) | DEAD |
| `OrgScenariosSection.tsx` | `OrgScenariosSection` | LeadershipBenchmarkV2.tsx (orphan) | DEAD |
| `UpgradeBanner.tsx` | `UpgradeBanner` | LeadershipBenchmarkV2.tsx (orphan) | DEAD |

> Note: `dimensionLabels` / `ExecutiveSummary` / `getTierColor` etc. are also defined SEPARATELY (different local copies) in live files (`utils/runAssessment.ts`, `PeerComparisonMobile.tsx`, `ui/tension-card.tsx`, `hooks/useExecutiveInsights.ts`, `AssessmentHistory.tsx`, `MomentumDashboard.tsx`, `voice/CompassResults.tsx`, `ui/executive-summary-card.tsx`). Those are independent re-declarations, NOT imports from `benchmark/` — deleting benchmark/ does not touch them.

## src/components/diagnostic/  (5 files — ALL DEAD)

| File | Exports | Consumers | Status |
|---|---|---|---|
| `DiagnosticFlow.tsx` | `DiagnosticFlow` | pages/Diagnostic.tsx (orphan; /diagnostic route is a redirect) | DEAD |
| `ProgressBar.tsx` | `ProgressBar` | DiagnosticFlow.tsx (internal) | DEAD |
| `QuestionCard.tsx` | `QuestionCard` | DiagnosticFlow.tsx (internal) | DEAD |
| `ResultsCard.tsx` | `ResultsCard` | DiagnosticFlow.tsx (internal) | DEAD |
| `BenchmarkInsightCard.tsx` | `BenchmarkInsightCard` | ResultsCard.tsx (internal) | DEAD |

> Note: a DIFFERENT live `ProgressBar` exists at `components/onboarding/ProgressBar.tsx` (onboarding is KNOWN-LIVE) — unrelated, not affected.

## src/components/results/  (7 files — ALL DEAD)

| File | Exports | Consumers | Status |
|---|---|---|---|
| `index.ts` (barrel) | re-exports all below | only SingleScrollResults.tsx imports from barrel | DEAD |
| `ResultsScoreCard.tsx` | `ResultsScoreCard`, `getTierColor`, `getRiskColor` | SingleScrollResults.tsx + sibling ResultsRiskPreview.tsx | DEAD |
| `ResultsKeyInsights.tsx` | `ResultsKeyInsights` | SingleScrollResults.tsx (orphan) | DEAD |
| `ResultsDimensionScores.tsx` | `ResultsDimensionScores` | SingleScrollResults.tsx (orphan) | DEAD |
| `ResultsRiskPreview.tsx` | `ResultsRiskPreview` | SingleScrollResults.tsx (orphan) | DEAD |
| `ResultsLockedGate.tsx` | `ResultsLockedGate` | SingleScrollResults.tsx (orphan) | DEAD |
| `ResultsUnlockedSections.tsx` | `ResultsUnlockedSections` | SingleScrollResults.tsx (orphan) | DEAD |

> Note: `getTierColor` / `getRiskColor` are also independently re-declared (different copies) in live files (`AssessmentHistory.tsx`, `MomentumDashboard.tsx`, `voice/CompassResults.tsx`). Those don't import from `results/`.

---

## Out-of-scope orphans that DELETING this cluster will fully strand (FYI for other agents / cleanup)

These are NOT in my assigned dirs (do not delete here), but they exist solely to drive the dead funnel and are themselves imported by nobody. They should be swept by whoever owns `src/components/*` root + `src/pages/*`:

- `src/components/UnifiedAssessment.tsx`  (imported by nobody)
- `src/components/UnifiedResults.tsx`  (imported by nobody)
- `src/components/LeadershipBenchmarkV2.tsx`  (only UnifiedResults imports it)
- `src/components/SingleScrollResults.tsx`  (only Baseline.tsx + UnifiedAssessment import it)
- `src/pages/Diagnostic.tsx`  (imported by nobody; /diagnostic redirects)
- `src/pages/Baseline.tsx`  (imported by nobody; no route)

## Backstop
`npm run build` after deletion is the final guard (per task). Deleting all 25 assigned files + the 6 stranded out-of-scope orphans above is internally consistent (no live importer remains).
