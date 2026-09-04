# CTRL Surface Map — Decide tab (Decision Pressure-Test Engine)

> Honest current-state map of the LIVE `/decision` surface. Read from real code in
> `C:/Users/krish/mm-ctrl`. Stack: Vite + React 18 + TS + shadcn/ui + Tailwind + Supabase,
> **dark theme** (router LoadingPage is `bg-black`/mint `#00D9B6`; the older CLAUDE.md
> "light mode" note is stale per prior audits). React Router v6, lazy routes. Vercel.

---

## what_it_is

The **Decide** tab (route `/decision`, bottom-nav label "Decide", icon `Scale`) is CTRL's
**verification-looped decision pressure-test engine**. The user names a real call they are
weighing ("we should move upmarket to enterprise next quarter…"). CTRL runs a 4-stage
background pipeline (edge function `decision-engine`): **decompose** the statement into the
claims it rests on → **verify** each claim against web evidence (Perplexity/Tavily/Brave
retrievers) → **cross-examine** (multi-model red-team, Edge Pro only) → **advise** (calibrated
recommendation + strongest counter-case + the single breakpoint assumption + a "validate
before you commit" list). The frontend polls `decision_cases`/`decision_claims`/
`decision_tensions` every 2s per `stage` (mirrors the briefing streaming pattern) and renders
each stage as it lands.

Two layers beyond the one-shot run:
- **WATCH loop** (`decision-watch`, hourly pg_cron): re-verifies load-bearing claims behind
  past decisions and raises idempotent `decision_alerts` when evidence shifts. Surfaced as the
  amber `AlertBanner` here and the `DecisionInboxCard` on the home dashboard + Daily Briefing.
- **Critical-evaluation gate** (`CriticalCallStep`): before CTRL's recommendation is revealed,
  the user is forced to make their OWN call on the load-bearing/breakpoint claim
  ("It holds / It does not / Not sure" + optional reasoning), so they practise judgment instead
  of outsourcing it. Logged to `decision_user_calls`.

The page is the single mounted home of `PressureTestPanel`. It is ALSO embedded verbatim
inside the Edge tab's old `DecisionAdvisor` ("Pressure test" mode) and reused (its sub-views)
as the session-one "first artifact" step of onboarding.

---

## user_actions (exhaustive)

**Empty / capture state (`CaptureView`):**
1. Read the heading "Pressure test a decision" + explainer subhead.
2. Tap the mic / **VoiceInput** "Record" button to speak the decision aloud (90s max; transcript appended to textarea).
3. Type/edit the decision in the **Textarea** ("e.g., We should move upmarket…").
4. Optionally tap one of **3 example chips** (`DECISION_EXAMPLES`) to prefill the textarea.
5. Tap **"Pressure test this"** (disabled until statement ≥ 8 chars) → kicks off `engine.start()` + `inbox.refresh()`.

**Running state (`DecisionResult` → `ThinkingView`):**
6. Watch the staged "thinking" animation (Breaking it down → Checking the evidence → Cross-examining → Weighing it up) with claims surfacing live, each with a verdict icon.
7. Optionally tap the **reset/RotateCcw** button to abandon and go back to blank.

**Critical-call gate (`CriticalCallStep`, appears only when complete AND ≥1 load-bearing claim AND not already called):**
8. Read the single breakpoint/load-bearing claim CTRL hid its verdict for.
9. Pick one of **3 buttons**: "It holds" / "It does not" / "Not sure" (`accept`/`reject`/`unsure`).
10. Optionally type reasoning in a **Textarea** ("Why? (optional, but the reps add up)").
11. (Read-only) review "Also riding on this decision" list of other load-bearing claims.
12. Tap **"Lock in my call and see CTRL's read"** (disabled until an option is picked) → records to `decision_user_calls`, then reveals the result.

**Result state (`DecisionResult`, full verdict):**
13. Read **ConfidenceMeter** ("How much to trust this", %).
14. Read the **"Monitored"** line (WATCH loop status + "last checked X ago").
15. Read **"The call"** (recommendation), **"The counter-case"**, **"Validate before you commit"** list.
16. Read **"What it rests on"** — every claim with type, Load-bearing/Breakpoint badges, verdict pill + confidence %.
17. For each claim, **expand "N sources"** to see evidence (stance pill Supports/Refutes/Context, source link, retriever, excerpt).
18. Read **"The review panel split"** card (model disagreement, Edge Pro) and grouped **Tensions** (vs your context / vs evidence / internal).
19. Tap **reset** to start a new blank test.

**Alert banner (`AlertBanner`, top of panel when an open watch alert exists):**
20. Read the amber "an assumption changed" headline + detail.
21. Tap **"Re-run this decision"** (prefills the old statement, acknowledges the alert) OR **"Dismiss"** (acknowledges only). "+N more" indicator if multiple.

**Desktop-only rail (`RecentRail`):**
22. Tap **"New pressure test"** (`Plus`).
23. Tap any past decision card in **"Your decisions"** to reload it (`engine.load`).

**Upgrade state (`UpgradeCard`, free user past 3/month):**
24. Read the Edge Pro pitch.
25. Tap **"Upgrade to Edge Pro"** → Stripe checkout (`useEdgeSubscription.subscribe()`).

That is roughly **10-12 distinct decisions/inputs in a single completed flow** — capture (voice or type or chip) → wait → make-your-own-call (pick + justify) → read 6+ result sections → optionally expand evidence per claim → optionally re-run from alert. Heavy.

---

## key_files

**Route + page shell**
- `src/router.tsx` — lazy route `/decision` → `DecisionPage`, inside `AuthedLayoutRoute`. (`/think` → `/dashboard?view=edge`.)
- `src/pages/DecisionPage.tsx` — page shell; `useDevice().isMobile` branch: DesktopShell(eyebrow "Decide", title "Pressure-test a decision") vs mobile AppHeader + BottomNav. Mounts `PressureTestPanel`.

**The engine surface**
- `src/components/operator/decision/PressureTestPanel.tsx` — orchestrator; mobile (one-thing-at-a-time) vs desktop (rail + active pane) branches; owns the `callDone` gate logic.
- `src/components/operator/decision/decision-views.tsx` — ALL presentational pieces: `CaptureView`, `ThinkingView`, `DecisionResult`, `ClaimRow`, `ConfidenceMeter`, `PanelCard`, `AlertBanner`, `RecentRail`, `UpgradeCard`.
- `src/components/operator/decision/CriticalCallStep.tsx` — the make-your-own-call gate.
- `src/components/operator/decision/DecisionInboxCard.tsx` — the home-dashboard surfacing of watch alerts / "N monitored".

**Hooks**
- `src/hooks/useDecisionEngine.ts` — invokes `decision-engine`, polls case/claims/tensions, loads evidence on terminal stage; handles `upgrade_required`.
- `src/hooks/useDecisionInbox.ts` — recent 20 cases + open `decision_alerts`; `acknowledge`.
- `src/hooks/useDecisionCall.ts` — read/write `decision_user_calls`.
- `src/hooks/useDevice.ts`, `src/hooks/use-mobile.ts` (`useIsMobile`) — breakpoint branching.

**Backend (Deno edge)**
- `supabase/functions/decision-engine/{index,pipeline,decompose,verify,crossexamine,advise,retrievers,llm,types}.ts`
- `decision-engine/index.ts` grounds in Memory Web via `_shared/user-context.ts` + `user_memory` objective facts; enforces FREE_MONTHLY_LIMIT=3.
- `decision-watch` (hourly WATCH), `decision-eval` (admin-only claim calibration, uses `decision_eval_cases`, NOT user calls).
- Tables (all RLS owner-scoped): `decision_cases`, `decision_claims`, `decision_evidence`, `decision_tensions`, `decision_alerts`, `decision_user_calls`, `decision_events`, `decision_eval_cases`.

---

## mobile_treatment

**Real, bespoke mobile design — one-thing-at-a-time, not a squeezed desktop.** `PressureTestPanel`
has an explicit `if (isMobile)` branch (`useIsMobile`, 768px). Mobile renders a single
`space-y-4` stack that shows exactly ONE of: AlertBanner (only when no active case) → UpgradeCard
→ CriticalCallStep → DecisionResult → CaptureView (in a Card). No recent-decisions rail on mobile
(history is desktop-only). Page chrome is the mobile `AppHeader` + fixed `BottomNav` (Decide =
`Scale` icon, 4th of 5 tabs), `h-screen-safe` no-window-scroll frame with an internal
`overflow-y-auto` main (`pb-24` for the nav). Voice capture (90s) is first-class.

Caveat to the "5-minute one-handed" mandate: the capture is one-handed and fast, but the
**result is a long vertical scroll** (confidence meter + monitored line + call + counter-case +
validate list + N claim cards each independently expandable + panel-split + tension groups).
That is a lot of reading on a phone — the magic-moment is good, the verdict screen is dense.

---

## desktop_treatment

`DesktopShell` (fixed 220px `DesktopRail` sidebar + 56px top bar with Command Palette + `h-screen-safe`
fit-to-viewport). Eyebrow "Decide", title "Pressure-test a decision". Content is centered
`max-w-5xl` with internal `overflow-y-auto scrollbar-hide`. `PressureTestPanel` desktop branch is a
**command-centre 2-col grid `[280px_1fr]`**: a sticky-left `RecentRail` (New + the user's past
decisions, active-highlighted) beside the active pane (capture / thinking / call / result / upgrade).
AlertBanner spans full width above the grid.

**Discoverability gap (important):** Decide is **NOT in the DesktopShell sidebar nav** (which lists
Home, Edge, Memory, Export, Briefing, Goals) and **NOT in the Command Palette** "Navigate" group
(same 6 items, no Decide). On desktop the ONLY ways in are: the Edge tab's "Pressure-test a decision"
CTA, the dashboard `DecisionCtaCard`/AlertBanner, the briefing `SegmentCard` CTA, or typing the URL.
A flagship everyday action is effectively hidden from the desktop command centre. (Sibling issue to
the known "/goals not on DesktopShell" note, but Goals at least IS in the rail/palette; Decide is in neither.)

---

## complexity_1to5

**4.** The capture entry is clean and single-focal (good). But the surface bundles four conceptually
distinct jobs — run a pressure test, make-your-own-call, read a multi-section verdict with
per-claim evidence drill-down, and manage a watch-alert inbox + decision history — and the result
screen alone has 6+ stacked sections plus expandable evidence per claim. On desktop add the rail.
Not a 5 (capture is genuinely guided and one-thing-at-a-time), but the verdict + gate + inbox
together ask the user to do/read several complex things in one sitting.

---

## duplications

This surface is at the centre of the founder's "features duplicated across multiple UIs" complaint.
There are **THREE+ overlapping decision UIs** and **THREE entry CTAs**:

1. **`PressureTestPanel` is rendered in 3 places**, not just `/decision`:
   - `src/pages/DecisionPage.tsx` (the canonical surface).
   - `src/components/operator/DecisionAdvisor.tsx` — a "Pressure test" / "Quick advice" toggle that, when `VITE_DECISION_ENGINE_ENABLED`, embeds the WHOLE `PressureTestPanel` inline. (`DecisionAdvisor` lives in `OperatorDashboard`, which `DecisionPage`'s own comment calls "the orphaned OperatorDashboard".)
   - `src/components/onboarding/OnboardingInterview.tsx` — reuses `CaptureView` + `DecisionResult` for the session-one "first artifact". (Clean reuse, but it means the same flow appears 3× in different chrome.)

2. **`DecisionAdvisor` "Quick advice" mode** is a *second, separate* decision tool calling a
   *different* edge function `operator-decision-advisor` (table `operator_advisor_sessions`,
   its own recommendation/reasoning/risk/alternative shape). A whole parallel "quick decision"
   product duplicating the same job with a weaker engine.

3. **`src/pages/DecisionCapture.tsx`** — a THIRD decision tool ("Capture a decision → get 3 sharp
   questions", edge `submit-decision-capture`). Has NO route in `router.tsx` (orphaned/dead — its
   back button even navigates to the dead `/today`), but it is yet another decision-input UI with
   its own voice capture + own backend. `src/utils/decisionResponseComposer.ts` is a 4th touchpoint
   on the same `submit-decision-capture` function.

4. **Entry CTAs are duplicated** across surfaces, all → `/decision`: Edge `EdgeVerdict`
   "Pressure-test a decision" secondary button, dashboard `DesktopMemoryDashboard` `DecisionCtaCard`
   (twice in that file) + AlertBanner, mobile `MobileMemoryDashboard`/`MobileDashboard`
   `DecisionInboxCard`, briefing `SegmentCard`. The watch `AlertBanner` is itself rendered both
   inside `PressureTestPanel` AND as `DecisionInboxCard` on home.

5. **Voice capture** is re-implemented (same `VoiceInput`) independently in `CaptureView`,
   `DecisionAdvisor`, and `DecisionCapture` — overlaps the global voice FAB and Memory voice capture.

6. **Memory/context grounding** overlaps Briefing: both `decision-engine` and the briefing pipeline
   call `getUserContext` + read `user_memory` objective facts. Same personalization input, two engines.

**Consolidation target:** one Decide engine, one capture, retire `operator-decision-advisor`
"quick advice", delete the orphaned `DecisionCapture` page + `OperatorDashboard`/`DecisionAdvisor`
wrapper, and make `/decision` reachable from the desktop rail + palette.

---

## underused_data

- **`decision_user_calls` (the user's own accept/reject/unsure + free-text reasoning)** — the single
  biggest underused signal. It is WRITTEN by `CriticalCallStep` and READ only to decide whether to
  SKIP the gate (`getCallsForCase().length > 0`). No edge function consumes it: `decision-engine`/
  `advise.ts` never see the user's call; there is **no "you said it holds, the evidence says contested"
  reflection**, no calibration/accuracy/Brier score over time, no feedback into future recommendations.
  The whole "practise your judgment" rep is captured and then dropped on the floor. This is the clearest
  "never feels like it learns from the user" instance.
- **`reasoning` free-text on the call** — captured, never surfaced or mined.
- **The user's verdict-vs-evidence delta** — derivable (their call vs claim verdict) but never computed
  or shown; a natural personalization/learning loop that doesn't exist.
- **Acknowledged alerts / re-run behaviour** (`decision_alerts.status`, dismiss vs re-run) — recorded
  but not used to learn which monitored topics the user cares about.
- **`decision_events`** table exists (per CLAUDE.md) but no frontend reads it; decision telemetry isn't
  fed back into the experience.
- **`decision_kind`** (binary/investment/hiring/gtm…) is classified per case and shown as a badge but
  never used to tailor the pipeline, examples, or memory grounding.
- **Source/channel** (`source: advisor|capture|voice|fireflies`) is stored but not used to personalize.

Net: the engine grounds INTO the user (Memory Web context on the way in) but almost nothing flows
BACK OUT into learning — exactly the founder's "never feels like it learns from me" critique.

---

## notes

- **DARK theme confirmed** (router `bg-black`, mint accent), contradicting the stale "Light mode design"
  line in `mm-ctrl/CLAUDE.md`.
- **Dead/orphaned code:** `src/pages/DecisionCapture.tsx` has no route and back-navigates to dead `/today`;
  `OperatorDashboard` is called "orphaned" in `DecisionPage`'s own header comment yet still imports and
  renders `DecisionAdvisor` (which can mount the full panel). `decisionResponseComposer.ts` references the
  same dead `submit-decision-capture`.
- **Feature flag drift:** `DecisionAdvisor` keys off `VITE_DECISION_ENGINE_ENABLED`; `DecisionPage` mounts
  the panel unconditionally. `DecisionPage`'s comment says the engine "shipped behind a never-set flag,"
  so the live behaviour is flag-on regardless — flag is now effectively vestigial.
- **Fail-open gate:** `CriticalCallStep` never traps the user (skips on missing claim / prior call / save
  error). Good UX, but it means the "judgment rep" is easily and silently skipped, further reducing the
  already-unused learning signal.
- **Edge Pro gating:** free = base pipeline, 3 runs/month (`FREE_MONTHLY_LIMIT`); Pro = multi-model
  cross-examination ("review panel split") + unlimited. Cross-examine stage and `PanelCard` only appear
  for Pro.
- **Pricing context (prior audit):** $49 one-off diagnostic / $29-49 Edge Pro; checkout via
  `useEdgeSubscription`.
- **No em dashes** in copy (house rule) — followed throughout these components.
- **Mobile result density** is the main UX risk vs the "5-minute one-handed" mandate: capture is fast,
  but the verdict is a long scroll. A progressive-disclosure / "call first, evidence on demand" result
  layout would help.
- **Naming inconsistency:** tab label "Decide", page title "Pressure-test a decision", CTAs
  "Pressure-test a decision" / "Pressure test this", legacy "Decision Advisor" / "Quick advice" — at least
  4 names for one job, which feeds the perceived sprawl.
</content>
</invoke>
