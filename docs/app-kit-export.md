# Surface Map: Kit + Export-to-AI

> Honest current-state truth map for the "CTRL Corpus". Read from REAL code in `C:/Users/krish/mm-ctrl` on 2026-06-12. App is **DARK** in the authenticated shell, but the **Kit portal forces LIGHT** (see notes). Vite + React Router (NOT Next.js), shadcn/ui, Tailwind, Framer Motion, Supabase.

This surface is really **two distinct UIs that do overlapping jobs** and are wired into different shells:

1. **The Kit Engine / Class Portal** (`/kit`, `/kit/me`, `/kit/me/intake`, `/kit/reading/:id`) — a standalone, **anonymous-first**, mobile-portal product. Scan a QR code in a live class, answer a tiny intake, and an LLM pipeline "composes" a personalized pack (skill ZIP, prompts, identity files, 7-day plan, map). Lives OUTSIDE the app shell (its own `KitPortalLayout`, its own light theme, its own bottomless scroll).
2. **Export-to-AI** (`/context`, page `ContextExport.tsx`) — an authenticated, in-app 3-step wizard ("What do you need? → Where will you use it? → Your export is ready") that turns your CTRL Memory Web into a paste-ready context blob (or a Claude skill ZIP) for ChatGPT / Claude / Gemini / Cursor / Claude Code / Markdown. Wears the standard `DesktopShell` (desktop) and `AppHeader`/`BottomNav` (mobile).

The two share **the same skill-generation backend** (the kit's `first-skill` artifact and `/context`'s "Describe a workflow" both run `generate-skill-export` / the skill pipeline) and **the same memory substrate** (`user_memory`). They are presented to users as unrelated features.

---

## what_it_is

**The founder's mental model lives in the Kit.** The `memory-identity` preset ("The Prompt Pack") is the clearest articulation of the intended workflow architecture: pick the ONE job you do most, mine your own AI history to build a job file / identity files / self-correction loop for it, then turn it into an installed, self-sharpening skill. The Kit is where "automate the repetitive thing -> reinvest the saved time" is actually expressed as product copy and artifacts. (Note: it is framed as *job-first* and *automate-the-repetitive-thing*, not literally the "automate weaknesses/dislikes -> amplify strengths" strengths/weaknesses framing the founder describes — that exact framing lives in `/context`'s recommendation engine instead; see duplications.)

- **Kit Engine** = post-class lead/value magnet. Anonymous QR redemption -> minimal intake -> background LLM compose -> a downloadable, personalized "kit" of artifacts + a 7-day journey + email capture + a bridge into CTRL proper. Quota-limited (e.g. 3 skill builds), pass-expiry-gated, with an Edge Pro upsell.
- **Export-to-AI** = the in-app "make any AI tool understand you" surface. Takes everything CTRL already knows (Memory Web + Edge profile) and formats it per-target so the user pastes context once instead of re-explaining themselves. Also doubles as a second front door to the Skill Builder.

---

## user_actions (exhaustive)

### A. Kit redeem — `/kit` (`KitRedeem.tsx`)
- Land via `?code=` (QR) — page auto-redeems silently once an anonymous session boots; OR
- **Type a class code** into a single big uppercase input ("CLASS-CODE") and press **"Open my kit"**.
- On expired code: choose **"Catch the next class"** (external Maven link) OR **"Build a free kit anyway"** (-> `/build`, the BuildLap flow).
- On rate-limit: re-enter the code after a wait.
- If a prior kit hint exists in localStorage: tap **"Already have a kit? Open it"** (-> `/kit/me`).

### B. Kit intake wizard — `/kit/me/intake` (`KitIntake.tsx`)
One question per screen, progress bar, Back affordance. Per question type:
- **chips** (single select): tap an option card (auto-advances after ~350ms); optional one-line text field on some.
- **chips_multi**: tap multiple option cards, then **"Continue"**.
- **voice_text**: toggle **"Say it"** (record up to 90s via `VoiceInput`) or **"Type instead"** (textarea, min 10 chars); optionally tap an example chip to prefill; then **"Continue"**.
- Final "Continue" submits -> kicks off the compose build -> redirects to `/kit/me`.
- (memory-identity preset asks just 2 questions: "Which AI tool do you actually use?" + "Which job do you want your AI to run first?")

### C. Kit home / the pack — `/kit/me` (`KitHome.tsx`)
**While composing:**
- Read the per-artifact progress list (X of N done).
- **HomeworkCard**: **"Copy the prompt"** (a context-pull prompt for their tool) and **"Open {tool}"** (external deep-link to claude.ai / chatgpt.com / gemini).

**When ready (the long scroll):**
- **"Download your skill (ZIP)"** (the hero first-skill artifact) — or **"Tune and rebuild it"** if it failed.
- Follow the **SkillInstallGuide** steps (Claude.ai / Claude Code / Cursor; "Open Claude settings" external button; "Other install options" accordion).
- View the **PersonalMapCard** (read-only).
- **SendPackCard**: enter email -> **"Send my pack"** (emails the pack + day-3/day-7 check-ins); then optionally expand **"Add a password to open this anywhere"** -> create password -> **"Save"** (upgrades anonymous session in place).
- **SevenDayPlan**: check/uncheck each day (persists to `kit_journey_events`); expand a day; on day 1, **"Copy test prompt"**.
- **ShipSection**: **"I shipped it"** -> sheet with optional note -> **"Log it"** (celebration). After shipping: **"Build your next one"** -> sheet, describe next workflow (min 20 chars) -> **"Build it"** (consumes quota).
- **ArtifactGroups**: per artifact card — **"Copy"** (text) or **"Download ZIP"**, plus **"Tune this"** (opens RegenerateSheet scoped to that artifact) and **"Rebuild this"** if failed.
- **CapsuleCard** ("Paste your AI's homework"): paste the AI's reply (min 20 chars) -> **"Sharpen my kit"** (-> `kit-capsule-ingest`, extracts facts into memory) -> optionally **"Regenerate with what it learned"**.
- **EdgeProCard** (when pass expired / quota exhausted): **"Start Edge Pro"** (Stripe checkout) or **"Not now"**.
- **BridgeCard** (after email captured): **"Open CTRL"** (-> `/dashboard`).
- Class reading links (-> `/kit/reading/:id`).
- **RegenerateSheet** (global, "Tune your kit"): type feedback, toggle which artifacts to rebuild (chips), **"Regenerate"**.
- **BuildSafetyNet** (build failed entirely): **"Retry the build"** and/or leave email -> **"Send my kit when it is ready"**.

### D. Kit reading — `/kit/reading/:pageId` (`KitReading.tsx`)
- Read a static markdown page; **"Back to your kit"**.

### E. Export-to-AI wizard — `/context` (`ContextExport.tsx`)
- **Step 1 "What do you need?"**:
  - **"Describe a workflow" -> "Start with voice"** (Pro-gated; non-Pro sees **"Upgrade to Pro"**) -> opens `SkillCaptureSheet` (voice/type) -> triage either produces a skill (SkillPreviewSheet, downloadable ZIP) or falls back to a markdown context blob in Step 3.
  - Tap a **"Recommended for You"** preset (strength/weakness-derived; "Amplifies:"/"Covers:" badges).
  - Tap one of 6 **Use Case** presets (General Advisor, Meeting Prep, Decision Support, Code Review, Email Drafting, Strategic Planning).
  - (Mobile only) banner: **"Got an answer from an AI? Paste it back to deepen your profile"** -> `/enrich`.
- **Step 2 "Where will you use it?"**: pick a target (ChatGPT, Claude, Gemini, Cursor, Claude Code, Raw Markdown).
- **Step 3 "Your export is ready"**: **"Copy to Clipboard"**, **"Download"** (multi-file aware), read the **ModelRecommendationCard** ("Best model for this task"), use the flag-gated **BroadcastBar** ("Broadcast" -> copies + opens ChatGPT/Claude/Gemini tabs + checklist), follow the platform setup guide, **"View raw content"**, give **thumbs up/down** feedback, **"Start over"**.
- Dismiss the **Coachmark** ("One context, every AI").

### F. Enrich / paste-back-to-profile — `/enrich` (`EnrichPage.tsx`)
- **Copy** one of 4 canned prompts (company/market, competitors, leadership, board questions).
- Paste the AI's answer back (min 20 chars) -> **"Add to my profile"** (-> `extract-user-context`).
- Then **"Review in Memory"** (-> `/memory`) or **"Add another"**.

---

## key_files

**Kit pages / routes** (`src/router.tsx` L38-41, L84-97; all PUBLIC, no `RequireAuth`):
- `src/pages/kit/KitRedeem.tsx` — `/kit`
- `src/pages/kit/KitHome.tsx` — `/kit/me` (the 800-line spine)
- `src/pages/kit/KitIntake.tsx` — `/kit/me/intake`
- `src/pages/kit/KitReading.tsx` — `/kit/reading/:pageId`

**Kit components** (`src/components/kit/`):
- `KitPortalLayout.tsx`, `ArtifactProgressList.tsx`, `HomeworkCard.tsx`, `PersonalMapCard.tsx`, `SendPackCard.tsx`, `SevenDayPlan.tsx`, `ShipSection.tsx`, `ArtifactCard.tsx`, `CapsuleCard.tsx`, `EdgeProCard.tsx`, `RegenerateSheet.tsx`

**Kit lib / hooks / content**:
- `src/lib/kit.ts` (row types, `invokeKit`, storage helpers, parsers)
- `src/hooks/useKitRedemption.ts`, `useKitBuild.ts`, `useKitArtifacts.ts`, `useKitRedemption.ts`
- `src/content/kits.ts` -> re-exports `supabase/functions/_shared/kit-presets/index.ts` (preset registry shared client+edge)
- `supabase/functions/_shared/kit-presets/types.ts` (the preset contract: KitTool, IntakeQuestion, ArtifactSpec, factMappings)
- `supabase/functions/_shared/kit-presets/{memory-identity,autonomous-business,vibe-coding}/preset.ts` (3 presets)
- `supabase/functions/kit-compose/index.ts` (orchestrator; writes intake facts into `user_memory`, pulls `buildMemoryContext`)
- Edge fns invoked: `kit-redeem`, `kit-compose`, `send-kit-pack`, `kit-capsule-ingest`

**Export-to-AI**:
- `src/pages/ContextExport.tsx` — `/context` (auth-gated, `RequireAuth`)
- `src/components/export/ModelRecommendationCard.tsx`, `src/components/export/BroadcastBar.tsx`
- `src/hooks/useMemoryExport.ts`, `useExportRecommendations.ts`, `useSkillExport.ts`
- `src/lib/export-recommendations.ts` (strength/weakness -> recommended use case — the "automate weaknesses, amplify strengths" logic)
- `src/lib/platform-guides.ts` (PLATFORM_GUIDES)
- Skill sheets reused: `src/components/edge/SkillCaptureSheet.tsx`, `SkillPreviewSheet.tsx`, `SkillInstallGuide.tsx`

**Paste-back**:
- `src/pages/EnrichPage.tsx` — `/enrich`

**Team Instructions (orphaned — see notes)**:
- `src/components/team-instructions/TeamInstructionsCard.tsx`, `TeamInstructionsSheet.tsx`, `src/hooks/useTeamInstructions.ts`, `src/types/team-instructions.ts` — only host is `src/pages/Think.tsx`, which is a **dead route** (`/think` `<Navigate to="/dashboard?view=edge">`).

---

## mobile_treatment

**Kit = genuinely mobile-native, not a squeezed desktop.** `KitPortalLayout` is a deliberately phone-shaped, single-centered-column (`max-w-2xl`), landing-page-calm portal with no app chrome. It even forces light mode and owns its own scroll (sets a fixed-height flex frame because the app shell elsewhere uses an overflow-hidden no-scroll pattern). The intake is one-question-per-screen with thumb-sized 56px option cards, voice-first `voice_text` questions, auto-advance, sticky progress. Everything is `w-full` buttons stacked, `flex-col gap-2 sm:flex-row` for inputs. This is the closest thing in the whole app to the founder's "5-minute one-handed mobile" ideal — though the **kit HOME page is a very long vertical scroll** (8+ stacked sections), not a 5-minute focused flow.

**Export-to-AI = responsive branch, leans desktop.** `ContextExport.tsx` checks `useDevice().isMobile` and renders two full layouts. Mobile: `AppHeader` + `BottomNav` + full-screen scroll, dot step-indicator, a mobile-only "paste it back to deepen your profile" shortcut, `max-h-[300px]` raw-content, condensed "Download" (icon only). It is a real mobile layout but the surface is dense (6 use-case presets in a 2-col grid, 6 format options, model card, broadcast bar, platform guide, raw-content, feedback) — heavier than a one-handed flow.

**Enrich** also has explicit `isMobile` branches (AppHeader/BottomNav vs DesktopShell).

No dedicated `src/components/mobile/*` components are used by this surface — both rely on inline responsive branches + `useDevice`/`useIsMobile`.

---

## desktop_treatment

- **Kit**: uses the **same `KitPortalLayout`** on desktop — it does NOT adopt the command-center `DesktopShell`. It just widens to `max-w-2xl` centered. So on a big screen the Kit is a narrow phone-portal floating in the middle of the page (intentional for the QR-in-class use case, but inconsistent with the rest of CTRL's desktop shell).
- **Export-to-AI**: full command-center treatment — `DesktopShell` with eyebrow "Export", title "Export to AI", a **right rail** showing wizard step progress, a live "Current selection" summary (Mode / Use case / Target / Tokens), and a contextual "Pro tip". Content capped at `max-w-3xl`. This is the proper desktop-command-center pattern.
- **Enrich**: `DesktopShell` (eyebrow "Workspace", title "Deepen your profile").

---

## complexity_1to5

**4.** Neither single screen is a 5, but the surface is overwhelming in aggregate and through duplication:
- Kit HOME (`/kit/me`) alone stacks ~8-10 independent interactive sections (reveal+download, install guide, map, email capture, 7-day plan, ship, artifact groups, capsule paste, bridge, reading, regenerate sheet). That one page is a 4-5.
- Export-to-AI is a clean 3-step wizard in isolation (~2-3), but it bolts on a model-recommendation card, a broadcast bar, a triage-fallback path, and a hidden 4th use-case set (recommendations vs the 6 presets), pushing it to a 3-4.
- The real complexity tax is that **the same jobs (build a skill, brief an AI, paste context back to learn) are reachable from 3+ different surfaces with different UIs**, so the user can never form one mental model.

---

## duplications

- **Skill Builder is duplicated.** The Kit's `first-skill` artifact (and ShipSection "Build your next one", and RegenerateSheet) run the same `generate-skill-export` / skill pipeline that `/context`'s "Describe a workflow -> Start with voice" runs via `SkillCaptureSheet`/`useSkillExport`. Two completely different UIs, same backend, same output (a Claude skill ZIP + `SkillInstallGuide`). (CLAUDE.md also lists Skill Builder as living at `/context` step 1 *and* it's pain-anchored from Edge/Memory/Briefing — so 3-4 entry points already.)
- **"Brief/Export my context to an AI" is duplicated.** `/context` (formats Memory Web per target, paste/download) vs the Kit's `HomeworkCard` (a context-pull prompt to paste into the same tools). Both are "make your AI understand you," different framings.
- **Install guidance is duplicated.** `SkillInstallGuide` renders in both the Kit (`KitHome`) and `/context` (via SkillPreviewSheet). `BroadcastBar` (open ChatGPT/Claude/Gemini, paste manually) overlaps the Kit's "Open {tool}" deep-links.
- **Paste-back-to-learn is duplicated 3 ways.** (a) `/enrich` (copy canned prompt -> paste answer -> `extract-user-context`), (b) Kit `CapsuleCard` "Paste your AI's homework" (-> `kit-capsule-ingest`), (c) `/context`'s voice fallback that also writes context. All three ingest an external AI's text into the user's profile.
- **Memory editing / fact writing overlaps Memory surface.** Kit intake writes verified facts directly into `user_memory` (`source_type:'kit'`, `confidence 1.0`) via `kit-compose` — the same table the Memory Web edits. `kit-capsule-ingest` and `/enrich` also write there. The user has no idea the Kit is seeding their main Memory Web.
- **"Recommended use cases" engine** (`src/lib/export-recommendations.ts`, strengths->amplify / weaknesses->cover) is the founder's "automate weaknesses, amplify strengths" architecture — but it lives ONLY in `/context` Step 1, disconnected from the Kit which embodies the same philosophy in copy.
- **Tool picker is triplicated.** Kit intake `tool` question (claude/chatgpt/claude-code/cursor/gemini), `/context` FORMAT_OPTIONS (same 6 + markdown), and `SkillInstallGuide`'s `preferredTool`/path set — three separate enumerations of "which AI tool do you use," not shared.

---

## underused_data

Lots of high-signal data is captured here and **never fed back into personalization/learning**, or fed back invisibly with no UI:

- **`kit_journey_events`** (which of the 7 days they checked, when they shipped, the ship note, days-to-ship) — stored, shown only locally on the kit page; never informs briefing, Edge, goals, or any "you tend to stall on day 3" learning.
- **The "I shipped it" note** and the **"Build your next one" transcript** — captured then effectively discarded for learning; the transcript only feeds a one-shot build.
- **Export feedback thumbs** in `/context` write to a `feedback` table as a JSON blob (`export_rating`, target, use_case) — not obviously consumed by the Vera/feedback learning loop for this surface.
- **Tool choice** (`primary_ai_tool`) and **first job** (`first_operator_job`) ARE written to `user_memory` — good — but the rest of the app gives no sign it adapts to them (e.g. the Edge view, briefing tone, or `/context` default target don't visibly key off the kit-declared tool).
- **`kit_artifacts` (the actual generated job file / identity files / skill)** live in a kit-only table; they are never surfaced inside CTRL proper (Memory/Edge/Briefing) — the kit's best output is stranded from the main app.
- **Triage reasoning** in `/context` (why a voice clip wasn't a skill) is shown once in a banner, then lost.
- **The HomeworkCard / CapsuleCard round-trip** is the one place the kit explicitly tries to learn ("paste your AI's homework"), but it's optional, easy to skip, and disconnected from `/enrich` which does the same thing better.

---

## notes

- **Kit forces light mode.** `KitPortalLayout` strips the `dark` class on mount and restores it on unmount. The authenticated app is DARK (per the 2026-06-02 audit memory), so jumping from CTRL into a kit link is a jarring theme flip. The kit is the only light surface.
- **Kit lives outside the app shell entirely** — no `DesktopShell`, no `BottomNav`, no command palette. It's effectively a separate micro-app sharing the codebase and the Supabase backend. Reinforces the "app does too much / disjoint surfaces" verdict.
- **Anonymous-first.** Kit redemption boots an anonymous Supabase session; the account only materializes if the user adds a password in `SendPackCard`. Everything is RLS-scoped to that (possibly anonymous) user. The kit explicitly bridges into authenticated CTRL via `BridgeCard` ("CTRL already knows N things about you" -> `/dashboard`).
- **DEAD CODE: Think page + Team Instructions.** `src/pages/Think.tsx` is the ONLY mount point for `TeamInstructionsCard`/`TeamInstructionsSheet` (the "Draft clear instructions for your team" tool), but `/think` is a `<Navigate to="/dashboard?view=edge" replace>` redirect — the component never renders in the live app. Think also links to `/voice` (itself a legacy redirect to `/dashboard`). So Team Instructions (a ~14KB sheet) and the whole "Thinking Tools" grid are unreachable orphans. This is a clean delete-or-resurrect candidate.
- **Three presets, very different depth.** `memory-identity` ("The Prompt Pack", code MEMORY-, 2-question inverted intake, the founder's flagship per the 2026-06-11 memory) is the cleanest expression of the intended architecture. `vibe-coding` and `autonomous-business` are heavier (scoring.ts, more intake, bigger templates). The engine is preset-driven and genuinely extensible (add a folder + registry entry).
- **`BroadcastBar` is feature-flagged** (`FF.contextBroadcast()`) — may render nothing in prod. **The skill builder in `/context` is Pro-gated**; non-Pro users see a locked "Describe a workflow" with an upgrade CTA, so for free users Step 1 collapses to just preset use-cases.
- **Generated Supabase types are stale for kit tables** — all kit hooks cast through an untyped client (`supabase as unknown as SupabaseClient`) with hand-written row interfaces in `lib/kit.ts`. Works, but means no compile-time safety on the kit data layer.
- **Kit ZIPs are inlined as base64** in `kit_artifacts.zip_base64` and decoded client-side — fine for small skills, a scaling cliff for larger artifacts.
- **Contradiction with founder's framing:** the founder says the correct architecture is "automate weaknesses/dislikes -> reinvest saved time amplifying strengths." The Kit actually implements "pick the job you do MOST -> operationalize it" (frequency-first), and the strengths/weaknesses logic lives in a *different* surface (`/context` recommendations). The philosophy is split across two UIs and neither states it whole.
- **Consolidation opportunity (for later):** Kit intake (tool + job, voice-first, one-per-screen) is the best on-ramp in the app; `/context` is the best desktop command-center for the same job; `/enrich` + `CapsuleCard` + `/context` voice-fallback are three takes on the same paste-back loop. A single "teach your AI / build a skill" spine — mobile = the kit's one-question flow, desktop = the `/context` rail — would dedupe most of this surface without losing features.
