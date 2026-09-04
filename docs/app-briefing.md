# CTRL Surface Map: Briefing tab + briefing generation pipeline

Source of truth: live code in `C:/Users/krish/mm-ctrl` (React 18 + Vite + TS + shadcn/ui + Tailwind + Supabase, DARK theme, React Router v6, Vercel). Read from real files, imports followed outward. Production URL: `ctrl.themindmaker.ai`.

Route: `/briefing` -> `src/pages/BriefingPage.tsx` (wrapped by `AuthedLayoutRoute` / `CommandPaletteProvider`; wears the unified `DesktopShell` on desktop). One file branches hard on `useDevice().isMobile` (breakpoint 768px) into a fully separate mobile tree and a desktop tree.

---

## what_it_is

A personalised, voice-first **daily AI/business news briefing** for a leader. The promise: "a sharp friend who read everything so you don't have to," delivered as 3-5 curated stories + a ~3-4 minute audio script in a synthesized voice. It is the app's daily-retention spine ("come back every morning").

The surface is really FIVE things stitched together:
1. **A generator** - a Generate button that fires a heavy multi-stage edge pipeline (`generate-briefing`).
2. **A reader/player** - the `BriefingCard` (collapsed teaser + expandable stories) and the full-screen `BriefingSheet` audio player with per-segment cards.
3. **A personalization config** - declared interests (beats / entities / excludes), suggested interests (inferred), and free-text "directives."
4. **A steering/learning loop** - a hero "Steer your briefing" voice bar (`nudge-briefing`), per-segment thumbs/pin/kill, and offline feedback aggregation.
5. **A type switcher** - 7 briefing "types" (Daily, Macro Trends, Vendor Landscape, Competitive Intel, Boardroom Prep, AI Model Landscape, Custom) behind a Custom Briefing modal, most Edge-Pro-gated.

It is the single most feature-dense surface in the app and the clearest example of the founder's "every tab asks you to do several complex things at once" complaint.

---

## user_actions (exhaustive)

**Pre-generation / cold start (no profile yet):**
- Read the page header status dot ("Ready when you are" / "Updated N min ago" / generating phases).
- Tap **"Pick 3 interests now"** / **"Choose what you want briefed on"** (empty state) -> opens `InterestsSheet`.
- In `InterestsSheet`: tap industry-seeded **beat chips** and **entity (people/companies) chips** to add them (one tap each), watch "Pick N more to continue" counter, tap **"Save & generate briefing"** (enabled at >=3), or tap **"Need more control? Open the full editor in Settings -> Interests"** (jumps to a *different* surface).
- Accept/dismiss **Suggested interests** chips (inferred from memory): per-chip Check (keep) / X (dismiss), or **"Keep all"**.
- (Inside the player) tap `SeedBeatsPrompt` chips - the SAME industry-seed chip flow rendered a third time, above the segments.

**Generating:**
- Tap **"Generate today's briefing"** (primary CTA) or **"Pick a different type"** (desktop) / Adjust.
- Watch a fake progress bar + phase copy ("Reading your profile" -> "Searching today's news" -> "Curating"); these phases are client-side timers (3s/7s), not real backend progress.
- Optionally watch streaming preliminary headlines (flag-gated `FF.briefingStream` / `?ff_stream=1`).
- Retry on error ("Could not generate your briefing just now" -> Retry).
- Handle the sparse-profile state ("A little more signal..." -> "Add interests" / "Dismiss").

**Reading / listening:**
- Tap the `BriefingCard` header to **expand/collapse** stories.
- Tap **"Listen"** (auto-synthesizes audio then auto-opens the player; single-button by design).
- In the expanded card, per story (`InlineSegmentRow`): tap **Info ("Why this?")** popover, **Zap/Automate** (decision_trigger only -> navigates to `/context` Skill Builder with a seed), **Bookmark/Pin** the anchor as a beat, **Ban/Kill** ("don't show me stories like this").
- Tap **"Refresh stories" / "Regenerate today"** (force re-gen).
- Tap **"Custom Briefing" / "Custom briefing type"** -> opens `CustomBriefingSheet`.

**In the full-screen `BriefingSheet` player:**
- Play/Pause (big button), cycle **speed** (1x/1.25x/1.5x/2x), scrub the progress bar, **Regenerate** (RefreshCw), close (X).
- Use **voice playback commands** via `BriefingVoiceButton` ("pause", "next", "faster", "slower") - discoverable only via a one-time dismissible hint.
- Per `SegmentCard`: **ThumbsUp/ThumbsDown** (with dwell tracking), **Pin** beat, **Kill** lens item, **Watch company** (adds to watchlist), tap a **"Re-run that decision"** button on decision_alert segments (navigates to `/decision`).

**Steering (the "learn from me" loop):**
- Tap the hero **"Steer your briefing"** mic, speak <=15s ("less Stripe, more Anthropic"), let `nudge-briefing` classify it into add_interest / add_exclude / add_directive / request_custom / noop; confirm via toast.

**Custom Briefing modal (`CustomBriefingSheet`):**
- Pick one of 7 types in `BriefingTypePicker` (Pro types show a Lock + open `EdgePaywall`).
- Toggle **Voice / Type** input, type/record context (with a `TranscriptReviewPanel` edit-and-confirm step for voice), tap **"Generate Briefing"**.

**Config (Adjust / Manage / Settings):**
- Tap **"Adjust"** (mobile + desktop) / **"Manage"** (desktop right rail) -> `InterestsSheet`.
- Remove interest chips inline (desktop right rail `InterestChipsRow`, X per chip).
- Replay **earlier-this-week** briefings (collapsible list mobile, right-rail list desktop).
- (Off-surface but same feature) Settings -> Interests tab (full CRUD of beats/entities/excludes) and Settings -> Briefing Directives tab (2000-char free text).
- Trigger generation from the **Command Palette** (Cmd/Ctrl+K -> "Briefing", dispatches `mm:generate-briefing`).

This is roughly **25-30 discrete actions** on one tab.

---

## key_files

Route / shell:
- `src/pages/BriefingPage.tsx` (37k, the whole tab; full mobile tree + full desktop tree in one file)
- `src/components/layout/DesktopShell.tsx` (desktop frame: eyebrow/title/actions/rightRail)
- `src/components/memory-web/AppHeader.tsx`, `src/components/memory-web/BottomNav.tsx` (mobile chrome)

Components (`src/components/briefing/`):
- `BriefingSheet.tsx` (full-screen audio player + segment list)
- `CustomBriefingSheet.tsx` (type picker + voice/text context modal)
- `BriefingTypePicker.tsx`, `VoiceSteerBar.tsx`, `MiniPlayer.tsx`, `SegmentCard.tsx`
- `InterestsSheet.tsx`, `SuggestedInterestsCard.tsx`, `InterestChipsRow.tsx`, `SeedBeatsPrompt.tsx`
- `StreamingBriefingPreview.tsx`, `GeneratingOverlay.tsx` (GeneratingOverlay appears DEAD - exported, never imported by BriefingPage), `BriefingVoiceButton.tsx`
- `src/components/dashboard/BriefingCard.tsx` (the primary card; reused on Dashboard too)

Hooks / context / types:
- `src/hooks/useBriefing.ts` (`useTodaysBriefing`, `useGenerateBriefing`, `useSubmitFeedback`, `usePollAudio`)
- `src/hooks/useBriefingInterests.ts`, `src/hooks/useSuggestedInterests.ts`, `src/hooks/useBriefingStreamPreview.ts`, `src/hooks/useIndustrySeeds.ts`, `src/hooks/useKillLensItem.ts`, `src/hooks/useDevice.ts`
- `src/contexts/BriefingContext.tsx` (global audio element + playback state + 24h signed-URL self-heal)
- `src/types/briefing.ts` (BRIEFING_TYPES, FRAMEWORK_TAG_CONFIG, all interfaces)

Off-surface but same feature:
- `src/components/settings/BriefingInterestsTab.tsx`, `src/components/settings/BriefingDirectivesTab.tsx`
- `src/components/memory-web/DesktopMemoryDashboard.tsx` (RailBriefingSlot - briefing on the Dashboard), `MobileMemoryDashboard.tsx`, `src/components/dashboard/mobile/MobileDashboard.tsx`
- `src/components/layout/CommandPalette.tsx` (fires `mm:generate-briefing`)

Edge functions (`supabase/functions/`):
- `generate-briefing/index.ts` (2068 lines - v1 race-providers pipeline AND a v2 evidence/lens pipeline in one file, flag-switched)
- `synthesize-briefing` (ElevenLabs TTS, user-triggered), `nudge-briefing` (voice-steer classifier)
- `infer-briefing-interests` (memory -> suggested/auto interests), `briefing-aggregate-feedback` (not_useful -> weight deltas), `briefing-kill-lens-item`, `briefing-diagnose`, `get-industry-seeds`, `send-daily-briefing` (cron email), `nudge-briefing`
- `_shared/`: `briefing-lens.ts`, `briefing-scoring.ts`, `briefing-curation.ts`, `user-context.ts`, `training-loader.ts`, `fact-guardrails.ts`, `decision-alerts.ts`, `model-router.ts`

---

## mobile_treatment

**Real, dedicated mobile design** - not a squeezed desktop. `BriefingPage` has a completely separate `if (isMobile) { return ... }` branch:
- `h-screen-safe overflow-hidden flex flex-col` zero-page-scroll frame; `AppHeader` top, scrollable `main` (`scrollbar-hide`, `pb-24`), `BottomNav` + `MiniPlayer` fixed bottom.
- One calm header: "Briefing" + status dot + a single **"Adjust"** ghost button. Interests, tuning, steering all hidden behind that one control (explicit comment in code: "the page itself stays a single step").
- Exactly one hero block at a time (state machine: loading / no-data / pick-interests / error / ready-to-generate / briefing-exists).
- `InterestsSheet` and `CustomBriefingSheet` render as bottom **Drawer/Sheet** (`max-h-[88-92svh]`). `BriefingSheet` is an 85svh spring-animated bottom sheet with visual-viewport / keyboard-height handling and haptics (`haptics.light()`). `useIsMobile` inside `CustomBriefingSheet` swaps Dialog<->Sheet.
- This is consistent with the "5-minute one-handed mobile" mandate and the prior CTRL minimalist UX pass (one step per state, single Adjust, one Listen).

Note: there is a parallel/older mobile briefing surface in `MobileMemoryDashboard` / `MobileDashboard` (the Dashboard tab also shows a briefing slot), so a mobile user can hit briefing in two places.

---

## desktop_treatment

Command-center layout via `DesktopShell`:
- `eyebrow="Briefing"`, title = status dot + live status, header `actions` = **"Custom briefing"** + **"Adjust"** buttons.
- `rightRail`: **Your interests** (`InterestChipsRow` + "Manage"), **Suggested** interests card, **Earlier this week** replay list (up to 6).
- Center column (`max-w-3xl`, own scroll): same hero state machine as mobile but richer (large gradient "ready to generate" card with interest/memory counts, animated 20s progress bar, sparse-profile amber card, error card). Below the hero: `VoiceSteerBar`, today's custom briefings grid (2-col), and a "More actions" row (Custom briefing type / Regenerate today / "Press Cmd-K to jump anywhere").
- The `BriefingCard` expanded stories are an absolutely-positioned overlay below the card.

So desktop genuinely is "command center, more rails and density"; mobile is "one guided step." Good intent, but the *number of distinct features* is identical on both - the desktop just exposes more of them at once.

---

## complexity_1to5

**5 (overwhelming).** Justification:
- ~25-30 discrete user actions on one tab; 6+ distinct mini-UIs (card, sheet/player, interests sheet, suggested card, custom modal, steer bar, segment-card actions).
- THREE separate copies of the "add industry-seed interests" chip flow (`InterestsSheet`, `SeedBeatsPrompt`, suggested card), plus a fourth full editor in Settings.
- TWO entire generation pipelines (v1 + v2) live in one 2068-line edge function, flag-switched per request body / per-user memory flag / env default.
- 7 briefing types, 5 framework tags, pin/kill/watch/automate/thumbs per segment, voice-steer + voice-playback-commands + voice-context-capture (three different voice affordances).
- Many states are mutually exclusive and gated on subtle conditions (`hasData`, `hasDeclaredOrInferred` = >=3 interests, `sparseProfile`, `generateError`, `isGenerating`), making the page hard to reason about.

The mobile branch *fights* this complexity well (one step per state); the underlying feature surface is still a 5.

---

## duplications (overlap with OTHER surfaces)

- **Interest/beat/entity editing is implemented 4 times:** `InterestsSheet` (cold-start sheet), `SeedBeatsPrompt` (in-player), `SuggestedInterestsCard` (inferred), AND `Settings -> Interests` tab (`BriefingInterestsTab`, full CRUD). `InterestsSheet` even links out to the Settings tab. All hit the same `briefing_interests` table via `useBriefingInterests`.
- **Briefing config split across surfaces:** declared interests live here + in Settings/Interests; free-text "directives" live ONLY in `Settings -> Briefing Directives`, yet voice-steer (`nudge-briefing` add_directive) writes to the same `user_briefing_directives` table from the Briefing tab. So one config (directives) is editable from two surfaces with no cross-link.
- **Briefing appears on the Dashboard too:** `RailBriefingSlot` in `DesktopMemoryDashboard` and the mobile dashboards render a "Today's Briefing" slot with its own Generate/Play wiring (`useGenerateBriefing` + `useTodaysBriefing` again). The `/briefing` route and `/dashboard` both own a briefing entry point.
- **Generation is triggerable from 3 places:** Briefing tab CTA, Dashboard rail, Command Palette (`mm:generate-briefing`). All dedupe via the in-flight promise cache, but the UX is three doors to one action.
- **Decision/pressure-test overlap:** decision_trigger segments deep-link to `/context` (Skill Builder); decision_alert segments deep-link to `/decision`. The briefing both *surfaces* decision-engine output (`prependDecisionAlerts`, `decision-watch`) and *routes into* the Decision surface - the boundary between Briefing and Decision is blurred.
- **Workflow/automation overlap:** the inline "Automate" (Zap) on decision_trigger stories is the same Skill Builder entry point reachable from the Edge view `AutomatePainCard` and the Memory blocker zap (per CLAUDE.md). Three surfaces feed one skill-builder.
- **Audio player duplicated in concept:** `BriefingSheet` (full) + `MiniPlayer` (mini) + the hidden `<audio>` in `BriefingContext` - fine, but the "Listen" button on the card, "Play" in earlier-this-week, and play in custom-briefings cards are three visually different play entry points.
- **Voice is implemented 3 ways on this one surface:** voice-steer (`VoiceSteerBar`/`useVoice` 15s), voice-context-capture (`CustomBriefingSheet`/`useVoice` 60s + transcript review), voice-playback-commands (`BriefingVoiceButton`). Each is a separate mental model.

---

## underused_data (captured here, NOT clearly fed back into learning)

- **Dwell time + replayed flag per segment.** `SegmentCard` meticulously accumulates `dwell_ms` (active-segment time before a reaction) and `usePollAudio`/feedback support `replayed`, written to `briefing_feedback`. Only `not_useful` reactions are aggregated (`briefing-aggregate-feedback`, 3 negatives -> -0.4 weight). Positive `useful`, dwell magnitude, and replay are captured but there is no visible positive-reinforcement loop (no "you engage most with X -> more of X"). This is exactly the "never feels like it learns from me" gap.
- **Watch-company actions.** `SegmentCard` extracts company names (hardcoded 60+ name list) and lets the user "Watch" them; watchlist feeds the news prompt, but the extraction is a brittle static list, and watching is one-way (no surfaced "you watch N companies, here's what changed").
- **Playback completion / hasListened.** `playback.hasListened` and segment index are tracked in `BriefingContext` but only used for a green check; not fed into what to brief next.
- **`context_snapshot` + `news_sources` + lens/queries/excludes** are stored on every `briefings` row (full provenance: which lens items, which queries, which providers, used_fallback). Rich audit data, but nothing in the UI exposes "here's why today looked like this" beyond a per-segment "Anchored to:" line and a "Why this?" popover.
- **Custom-briefing context text + voice transcripts.** Free-text "I have a board meeting tomorrow about AI investment" is sent to generation but not persisted as a durable interest/objective - one-shot, then gone.
- **noop voice nudges.** When `nudge-briefing` returns noop, the utterance is discarded; no capture of "user tried to steer and we failed" for later improvement.
- **Suggested-interest dismissals.** `dismissed_at` is set but there's no signal that repeated dismissals of a kind should suppress that inference class.

---

## notes (dead code, half-built, contradictions)

- **Two full pipelines in one function.** `generate-briefing` contains both a v1 "race all news providers -> OpenAI curate -> script" path AND a v2 "lens -> query planner -> provider fan-out (12s cap) -> embed dedupe+score -> budget curation -> script" path. Which runs is decided by: request `briefing_version` > per-user `user_memory.briefing_v2_enabled` > env `BRIEFING_V2_ENABLED_DEFAULT` (default false). `ai_landscape` always uses v1 synthetic-headline path. The v2 anchor/pin/kill UI only lights up on `schema_version=2` rows, so two users can see structurally different briefings. Heavy consolidation target.
- **`GeneratingOverlay.tsx` looks dead** - exported from the briefing index, but `BriefingPage` renders its own inline generating UI and never imports it. Same phase enum duplicated.
- **Fake progress.** The phase labels ("Reading your profile" / "Searching today's news" / "Curating") are driven by client `setTimeout`s (3s, 7s) and a 20s CSS width animation, not real backend stages. Honest-current-state: the progress shown is theater.
- **Generation is intentionally manual** (no auto-generate on load - documented in `useBriefing.ts`), which is good for cost but means a returning user often sees "ready to generate" rather than a fresh briefing. The retention email (`send-daily-briefing`) deliberately does NOT pre-generate; it nudges the user into the app to trigger it. So "fresh every morning" is a pull, not a push - relevant to the founder's "pre-populate with something real-world, fresh, high-agency" ask: today the page is EMPTY (a CTA) until the user clicks, and even the empty/cold state asks for setup work first.
- **Sparse-profile hard gate.** If `interests + missions + decisions < 5`, generation refuses with `profile_too_sparse` (unless an open decision-alert exists, which yields a minimal alert-only briefing). So a brand-new user cannot get *any* real-world briefing without first doing config work - directly counter to "pre-populated with something real-world, fresh, high-agency" out of the box.
- **Static fallback exists** (`STATIC_FALLBACK`: 8 canned AI headlines incl a `[NOISE]` example) - the only "something real-ish without setup," but it's generic AI-vendor news, not high-agency or personalized, and only used when all providers fail (not as a cold-start prefill).
- **"Krish's Take" is hardcoded voice.** Framework tag `krishs_take` and prompt rules ("cynical experienced operator," first-name only, never mention Mindmaker/CTRL) bake a single persona in. Fine for a personal tool, notable for a B2C product meant to feel like the user's own.
- **Audio is user-triggered to save TTS spend** (ElevenLabs); the single "Listen" button hides a synth+poll cycle (`usePollAudio`, 40 polls x 3s) with rate-limit/provider-unavailable/unknown error states and a retry. 24h signed URLs self-heal via an `onError` handler in `BriefingContext` that re-signs without re-running TTS.
- **`BriefingTypePicker` ICON_MAP omits `BarChart3`** (the ai_landscape icon) - falls back to Radio. Minor cosmetic bug.
- **Type/label drift:** `CustomBriefingSheet` references a `"deep_dive"` briefing type (initialContext default) that is NOT in the `BriefingType` union or `BRIEFING_TYPES` - a likely stale/dead type string.
- **Consolidation opportunity (for the corpus):** Briefing config (interests + directives + suggested) wants to be ONE place; the 7 types want to collapse into "Daily + one optional lens"; the 3 generation entry points and 3 voice modalities want to merge; the dwell/positive-feedback data should drive a visible "it learned X" affordance to fix the "never feels like it learns" verdict.
