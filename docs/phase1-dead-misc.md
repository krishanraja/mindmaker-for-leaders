# Phase 1 Dead-Code Manifest — analytics / ai-chat / progress / insight / sharpen

Cluster owner: subagent for `src/components/{analytics,ai-chat,progress,insight,sharpen}`
Repo: `C:/Users/krish/mm-ctrl` (Vite + React 18 + TS)
Method: per-file grep of path AND exported-symbol across ALL of `src/`, plus `router.tsx` route/lazy-import audit. Conservative — UNSURE => uncertain, never dead.

## Router facts
`src/router.tsx` imports ONLY `@/pages/*`. None of the 14 candidate files are referenced by the router directly or via lazy import. None of the pages that DO import my candidates (`Progress`, `PromptCoach`) appear in the router.

## File-by-file verdicts (14 files, all .tsx)

### components/ai-chat/  — 5 files — ALL DEAD (zero importers anywhere)
| File | Export | Importers (outside cut set) | Verdict |
|---|---|---|---|
| ai-chat/AssessmentProgress.tsx | `default AssessmentProgress` | none | DEAD |
| ai-chat/ExecutiveAssessmentReport.tsx | `default ExecutiveAssessmentReport` | none | DEAD |
| ai-chat/InsightEngine.tsx | `default InsightEngine` | none | DEAD |
| ai-chat/LLMInsightEngine.tsx | `default LLMInsightEngine` | none | DEAD |
| ai-chat/QuickSelectButtons.tsx | `default QuickSelectButtons` | none | DEAD |

Grep `from '.../ai-chat/...'` => NO matches anywhere in src. `grep -rln components/ai-chat` => only the files themselves. Each only imports `@/components/ui/*` primitives. No barrel. Self-contained dead set.

### components/analytics/  — 1 file — DEAD
| File | Export | Importers | Verdict |
|---|---|---|---|
| analytics/AnalyticsDashboard.tsx | `export const AnalyticsDashboard` | none | DEAD |

`grep -rln components/analytics` => only the file itself. No import of `AnalyticsDashboard` anywhere. Only imports `@/components/ui/card`.

### components/insight/  — 2 files — DEAD (self-contained 2-file cluster)
| File | Export | Importers | Verdict |
|---|---|---|---|
| insight/InsightCard.tsx | `export function InsightCard` | only `insight/InsightGenerator` (same dir) | DEAD |
| insight/InsightGenerator.tsx | `export function InsightGenerator` | none | DEAD |

`grep -rln components/insight` => only these two files. `InsightGenerator` imports `./InsightCard`; nothing live imports either. Distinct from `sharpen/InsightCard` (different file). Closed dead cluster.

### components/progress/  — 2 files — DEAD (only consumer is the orphan page `pages/Progress.tsx`)
| File | Export | Importers (outside cut set) | Verdict |
|---|---|---|---|
| progress/PeerBenchmark.tsx | `export function PeerBenchmark` | `pages/Progress.tsx` (orphan, see below) | DEAD* |
| progress/ProgressChart.tsx | `export function ProgressChart` | `pages/Progress.tsx` (orphan, see below) | DEAD* |

Both pull `useProgressSnapshots` from `@/hooks/useProgress` and `@/components/ui/*`. Their ONLY importer is `src/pages/Progress.tsx`.

### components/sharpen/  — 4 files — DEAD (only consumer is the orphan page `pages/PromptCoach.tsx`)
| File | Export | Importers (outside cut set) | Verdict |
|---|---|---|---|
| sharpen/CopyablePrompt.tsx | `export function CopyablePrompt` | `pages/PromptCoach.tsx` (orphan) | DEAD* |
| sharpen/InsightCard.tsx | `export function InsightCard` | `pages/PromptCoach.tsx` (orphan) | DEAD* |
| sharpen/LoadingState.tsx | `export function LoadingState` | `pages/PromptCoach.tsx` (orphan) | DEAD* |
| sharpen/VoiceInput.tsx | `export function VoiceInput` | `pages/PromptCoach.tsx` (orphan) | DEAD* |

NOTE: the live `VoiceInput` used app-wide is `@/components/ui/voice-input` (a DIFFERENT file) — imported by DeepProfileQuestionnaire, operator/*, DecisionCapture, kit/KitIntake, MissionCheckIn, WeeklyCheckin, etc. The `sharpen/VoiceInput` is a separate, orphan implementation. All "sharpen" string hits in live files (edge/DraftSheet, EdgeFullReadSheet, EdgeVerdict, onboarding/OnboardingInterview, EnrichPage, types/edge) are the WORD "sharpen" (an ActionType / copy), NOT imports of `components/sharpen/*`.

## The * caveat — orphan importing pages (OUT OF MY DIR SCOPE, flagged uncertain)
`progress/*` and `sharpen/*` are imported by files outside the cut-candidate dir set (`src/pages/`), so by the strict letter of rule (a) they are not trivially dead. BUT those pages are themselves provably dead:

- `src/pages/Progress.tsx` — NOT in router; `grep -rn pages/Progress` and `import('.../Progress')` => zero importers. Orphan.
- `src/pages/PromptCoach.tsx` — NOT in router; zero importers. Orphan.

(Also orphan, found incidentally, not my scope: `pages/DecisionCapture.tsx`, `pages/MissionCheckIn.tsx`, `pages/WeeklyCheckin.tsx` — these import the LIVE `ui/voice-input`, so do NOT delete that.)

Therefore the `progress/*` + `sharpen/*` component files are DEAD **provided the orphan pages `Progress.tsx` / `PromptCoach.tsx` are removed in the same pass** (their owner is the pages/router sweep, not this dir sweep). If those pages are kept, deleting the components breaks the build. I list the 6 component files as dead, and surface the 2 pages as `uncertain` so the orchestrator deletes pages+components atomically.

## Summary
- 14/14 candidate files are DEAD.
- 8 unconditionally dead (ai-chat 5 + analytics 1 + insight 2): zero importers, closed clusters.
- 6 dead-conditional (progress 2 + sharpen 4): only reachable from orphan pages Progress.tsx / PromptCoach.tsx (not router-reachable). Delete components together with those pages.
- Backstop: `npm run build`.
