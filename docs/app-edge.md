# CTRL Surface Map — Edge tab

Surface: **Edge** (`/dashboard?view=edge`, sidebar/bottom-nav label "Edge", shortcut `E`; legacy `/think` redirects here)
Mapped from live code in `C:/Users/krish/mm-ctrl`. Read-only audit. App is DARK-themed (CLAUDE.md "Light mode" note is stale).

---

## what_it_is

The Edge tab is CTRL's "leadership amplifier." It reads everything the app knows about the user (their Memory Web facts/patterns/decisions plus any leadership-assessment dimension scores, tensions and risk signals) and synthesizes an **AI identity read**: 3-5 named strengths and 3-5 named weaknesses ("gaps"), each with a confidence score, a plain-language summary, and evidence tags. The current focal screen ("The Verdict", `EdgeVerdict.tsx`) collapses that read into a few plain sentences ("You lead with X. Y is where the remit bites."), a peer-comparison strip, and **one primary CTA** ("Make my board memo") plus two secondary moves ("Pressure-test a decision", "See the full read").

From that read, the user can generate **board-ready artifacts** (board memo, strategy doc, email, meeting agenda, template) and **strength-leverage docs** (framework, teaching doc, mission alignment) via a voice-first `DraftSheet`, preview them, copy them, and email them to their inbox. Generation is gated: free users get exactly one watermarked board memo, then a Stripe paywall (Edge Pro). The artifacts render via a hand-rolled markdown→HTML pass, which is why they "read like a Word document" (headings, bold, bulleted lists, paragraphs — a long-form document, not a chat reply).

A first-time/empty user instead sees `EdgeOnboarding` — a 3-question voice/text interview (great at / drains you / matters most) that seeds memory and triggers profile synthesis.

---

## user_actions (exhaustive)

### Onboarding (only when no profile + <3 memory rows) — `EdgeOnboarding.tsx`
1. Tap **"Let's Go"** on the welcome card.
2. For each of 3 questions (heading + prompt): tap the big mic to **record voice** (up to 120s), OR tap **"Type instead"** and type the answer.
3. While recording: tap the mic again to **stop**.
4. (Text mode) tap **Submit** / **Cancel** / **"Switch to voice"**; Cmd/Ctrl+Enter submits.
5. On a stalled submit (>30s): choose **Retry** or **Skip**.
6. On done: tap **"Build My Edge"** (calls `synthesize`).
   - Note: a returning user with >=3 memory rows but no profile auto-synthesizes silently and never sees this interview (`useEdge` auto-synth guard).

### The Verdict (main screen) — `EdgeVerdict.tsx`
7. Read the verdict sentences + the two `CompareRow` peer bars (no interaction).
8. Tap **"Make my board memo"** (primary CTA) → opens `DraftSheet` for `board_memo` against the leading gap.
9. Tap **"Pressure-test a decision"** → navigates AWAY to `/decision` (the Decide tab — a different surface).
10. Tap **"See the full read"** → opens `EdgeFullReadSheet`.

### Full Read sheet — `EdgeFullReadSheet.tsx`
11. Read each strength row ("What you lead with") and gap row ("Where you are exposed"): label, summary, up to 3 evidence chips.
12. Per row, tap **"This is not me"** → submits `strength_reject` / `weakness_reject` feedback (triggers a full re-synthesis).
13. In the embedded **"Automate a recurring pain"** card (`AutomatePainCard`): if Pro, tap **"Voice a recurring pain"** → navigates AWAY to `/context` with `openSkillBuilder` (Export tab's Skill Builder). If free, the same tap opens the paywall.
14. Tap **"Make my next move"** → closes sheet, opens `DraftSheet` (board memo) for the top gap.

### Draft sheet (artifact generation) — `DraftSheet.tsx`
15. Read the one structured prompt for the capability (e.g. "What decision does the board need to make? One line.") with a worked-example placeholder.
16. Tap mic to **record** (up to 120s); tap again to **stop**.
17. Review the transcript in `TranscriptReviewPanel`: **edit the text**, then **"Use this text"** or **dismiss**.
18. OR tap **"Type instead"** and type; **"Switch to voice"** to go back.
19. Tap **Generate** (calls `edge-generate`) or **Cancel**.
20. On error (free allowance used): the paywall auto-appears instead of a raw error.

### Artifact preview — `ArtifactPreview.tsx`
21. Read the generated artifact (rendered markdown).
22. Tap **Copy** (to clipboard).
23. Tap **"Send to Inbox"** (`SendToInboxButton`): if no saved delivery email, **type an email** and tap **Send**; the email is saved to `profiles.edge_delivery_email` and the artifact emailed via `deliver-edge-artifact`.
24. Tap **Close**.

### Paywall — `EdgePaywall.tsx`
25. View blurred personalized sample artifact + 4 benefit bullets + price (`EDGE_PRO_PRICE_LABEL`).
26. Tap **"Start Edge Pro"** → Stripe Checkout (`create-edge-subscription`, with attribution). OR **"Maybe later"**.

---

## key_files

Live (rendered) path:
- `src/pages/Dashboard.tsx` — host; `activeView === 'edge'` branch, mobile vs desktop shell wrapping, lazy-loads EdgeView.
- `src/components/edge/EdgeView.tsx` — orchestrator: loading / synthesizing / onboarding / verdict states; owns all sheet/modal state.
- `src/components/edge/EdgeVerdict.tsx` — the focal screen (verdict sentences, compare bars, 3 CTAs).
- `src/components/edge/EdgeOnboarding.tsx` — 3-question voice/text onboarding interview.
- `src/components/edge/EdgeFullReadSheet.tsx` — demoted strengths/gaps read (mobile Sheet / desktop Dialog).
- `src/components/edge/AutomatePainCard.tsx` — "Automate a recurring pain" entry (navigates to Export/Skill Builder).
- `src/components/edge/DraftSheet.tsx` — voice/text capture → `edge-generate`.
- `src/components/edge/ArtifactPreview.tsx` — preview + Copy + Send to Inbox.
- `src/components/edge/SendToInboxButton.tsx` — email-capture + `deliver-edge-artifact`.
- `src/components/edge/EdgePaywall.tsx` — Edge Pro paywall (Stripe).
- `src/components/edge/sampleArtifacts.ts` — static blurred-sample copy for the paywall.
- `src/lib/renderMarkdown.ts` — the hand-rolled markdown→HTML (the "Word document" look).
- `src/hooks/useEdge.ts` — profile fetch, synthesize, feedback, rateAction, markActionUsed.
- `src/hooks/useEdgeSubscription.ts` — subscription state, `hasAccess`, Stripe checkout.
- `src/types/edge.ts` — all Edge types + `COVER_CAPABILITY_META` / `SHARPEN_CAPABILITY_META`.

Backend:
- `supabase/functions/synthesize-edge-profile/index.ts` — builds memory context + assessment data, GPT JSON synthesis, writes `edge_profiles`, computes `intelligence_gaps`.
- `supabase/functions/edge-generate/index.ts` — per-capability system prompts, free-tier watermark gate, writes `edge_actions`.
- `supabase/functions/deliver-edge-artifact/index.ts` — emails artifact.
- `supabase/functions/create-edge-subscription` + `create-billing-portal-session` — Stripe.
- Tables: `edge_profiles`, `edge_actions`, `edge_feedback`, `edge_subscriptions`, `profiles.edge_delivery_email`.

DEAD / orphaned in this folder (NOT reachable from the Edge tab — pre-Verdict UI; only self-referential):
- `src/components/edge/EdgeProfileCard.tsx` (imports the two pills; itself unimported by any live route)
- `src/components/edge/StrengthPill.tsx`, `src/components/edge/GapPill.tsx`
- `src/components/edge/FeedbackButtons.tsx` (only used by the pills)
- `src/components/edge/SmartProbeCard.tsx` (intelligence-gap "smart probe" card, never mounted)
- `src/components/insight/InsightGenerator.tsx` + `InsightCard.tsx` (insight feature, not on Edge tab)
- `src/components/sharpen/*` (CopyablePrompt/InsightCard/LoadingState/VoiceInput — used by PromptCoach, not Edge)

Edge-folder-resident but owned by the EXPORT tab (`/context`, `ContextExport.tsx`):
- `SkillCaptureSheet.tsx`, `SkillPreviewSheet.tsx`, `SkillInstallGuide.tsx`, `SkillQualityGate.tsx` — the Claude Skill Builder. Edge only deep-links into it via `AutomatePainCard`.

---

## mobile_treatment

Real mobile design, not a squeezed desktop, but it is a long vertical scroll.
- `Dashboard.tsx` mobile branch: `h-screen-safe` flex column, `AppHeader` on top, **scrollable** content region (`data-edge-scroll`, `overflow-y-auto px-4 py-4 pb-44`), `BottomNav` fixed at bottom. So the Edge tab on mobile DOES scroll (unlike the app's stated zero-scroll pattern on other pages).
- Every sheet/modal uses `useIsMobile` to branch: mobile renders a bottom `Sheet` (rounded-top, `max-h-[85-90vh]`, internal scroll); desktop renders a centered `Dialog`. This is consistent across `DraftSheet`, `ArtifactPreview`, `EdgeFullReadSheet`, `EdgePaywall`.
- Onboarding is full-screen, voice-first, big 64-80px mic targets, fluid `clamp()` headline sizing in Verdict — genuinely mobile-first and one-handed.
- The artifact preview on mobile is `h-[90vh]` — a full long-form document the user must scroll through (reinforces the "Word document" feel; not summarized or chunked for a phone).

## desktop_treatment

`Dashboard.tsx` desktop branch wraps EdgeView in the unified `DesktopShell` (eyebrow "Edge", title "Strategic thinking") — persistent `DesktopSidebar`, sticky top bar, Command Palette (Cmd/Ctrl+K has an "Edge" entry). Content sits in a `flex-1 min-h-0 overflow-y-auto scrollbar-hide` column. The Verdict itself is a single narrow centered column (same component as mobile) — desktop does NOT get a multi-column command-center layout for Edge; it's the mobile column inside the desktop shell. Sheets become centered Dialogs (`sm:max-w-md` / `sm:max-w-2xl`).

---

## complexity_1to5

**4.** The current Verdict screen is deliberately simplified to one focal CTA and reads cleanly in ~5 seconds — that part is a 2. But the surface as a whole is heavy: a 3-step onboarding interview, a full-read sheet, a multi-state voice/text draft sheet (idle/recording/transcribing/review/generating + paywall interception), an artifact preview with copy/email/save-email sub-flow, and a paywall — and two of its three CTAs throw the user OFF the tab entirely (to `/decision` and to `/context`). The conceptual load (strengths vs gaps vs capabilities vs artifact types vs sharpen-vs-cover) is high, and there's a large dead-code shadow of the older, busier pill/probe UI still in the folder.

---

## duplications (overlap with OTHER surfaces)

- **Pressure-test / decision**: Edge's "Pressure-test a decision" CTA is just a `navigate('/decision')` — it is the Decide tab's Decision Engine, surfaced as a button here. The pressure-test feature is owned elsewhere; Edge duplicates the entry point.
- **Workflow / automation (Skill Builder)**: "Automate a recurring pain" (`AutomatePainCard`) is an entry point into the Export tab's Claude Skill Builder (`/context`). CLAUDE.md confirms three separate entry points exist for the same Skill Builder (Edge AutomatePainCard, Memory blocker zap, Briefing decision_trigger zap) — Edge is one of three duplicated doorways.
- **Voice capture**: the voice-record → transcribe → review-and-edit (`TranscriptReviewPanel`, `useVoice`) flow in DraftSheet and EdgeOnboarding is the same voice pattern used in Memory capture, Decision capture, weekly check-in, and the Skill Builder — re-implemented per surface rather than one shared capture.
- **Export / deliver**: "Send to Inbox" emails an artifact; the dedicated Export tab (`/context`) is the app's home for export/delivery. Overlapping "get this out of the app" capability in two places.
- **Memory editing (indirect)**: "This is not me" / strength-reject feedback effectively edits the identity read derived from memory; the Memory Web tab is where memory is directly edited. Two different mental models for "correct what the app thinks about me."
- **Onboarding**: EdgeOnboarding is a 3-question interview that writes to `user_memory` via `extract-user-context` — overlapping with the Dashboard-level `OnboardingInterview` and guided-capture onboarding. Multiple onboarding interviews seed the same memory.

---

## underused_data (captured here but not fed back into learning/personalization)

- **`intelligence_gaps`**: computed and stored on every synthesis (`computeIntelligenceGaps`) and typed end-to-end (`IntelligenceGap`, `SmartProbeCard`, `GapPill` resolution flows), but the live Verdict UI never surfaces them. The whole "what data is missing for a 10/10 profile" probe system is dark.
- **`edge_actions.user_rating`**: `useEdge.rateAction` exists and the column exists, but no live component calls it — generated artifacts are never rated, so quality never feeds back.
- **`edge_actions.was_used`**: `markActionUsed` exists but is not called from the live preview/copy/send flow — "did the leader actually use this memo" signal is captured-capable but unwired.
- **Strength/gap CONFIRM feedback**: `strength_confirm` / `weakness_confirm` types exist (`FeedbackButtons`) but the live Full Read only exposes the REJECT path ("This is not me"). Positive confirmation is never collected.
- **Voice transcripts in DraftSheet**: the leader's spoken key points go straight into `edge-generate` as one-shot context and into `edge_actions.input_context`; they are not promoted back into `user_memory`, so the richest first-person context the user gives is used once and dropped.
- **`synthesis_inputs` provenance** (fact/pattern/decision/dimension counts) is stored but never shown to the user as "your read is based on N facts" — no transparency or confidence-building loop.
- **No "it learned from me" signal anywhere**: re-synthesis happens on reject feedback, but the user is never shown that their correction changed the read — reinforcing the founder's "never feels like it learns" complaint.

---

## notes

- **"Reads like a Word document" is real and structural.** Artifacts are generated as long-form Markdown (`edge-generate` system prompts: board memo / strategy doc with "Structure the document with: ...", first-person teaching docs) and rendered by `src/lib/renderMarkdown.ts` into headings/bold/lists/paragraphs inside a tall scroll container (mobile `h-[90vh]`, desktop `max-h-[80vh] max-w-2xl`). There is no chunking, no progressive disclosure, no mobile-native summary-first treatment — it is a document viewer.
- **Two of three CTAs leave the tab.** The Verdict's secondary actions navigate to `/decision` and `/context`. Edge is less a self-contained surface than a launcher into Decide and Export.
- **Large dead-code shadow.** An entire earlier Edge UI (EdgeProfileCard + StrengthPill + GapPill + FeedbackButtons + SmartProbeCard, plus the insight/ and sharpen/ helpers) is still present and unreferenced by the live route. This is the busier "stat-chip / expandable-pill / smart-probe" version the Verdict explicitly replaced (see EdgeVerdict header comment: "No stat-chip dashboard, no cycling teaser, no competing CTAs").
- **Free-tier value-first paywall is well-handled**: free users get one real watermarked board memo (server-enforced in `edge-generate`), and a failed generation for a free user surfaces the paywall AFTER value, not a dead-end (`DraftSheet.handleGenerate` → `onLimitReached`).
- **Synthesis is expensive and feedback re-triggers it.** Every "This is not me" calls `submitFeedback` → full `synthesize-edge-profile` re-run (rate-limited 5/min, GPT complex, 3000 tokens). Rejecting two items = two full re-synth round-trips.
- **`extract-user-context` failures are swallowed** in onboarding (non-blocking) — answers may silently not save; the 30s stall card is the only recovery surface.
- **Desktop is not a command center for Edge** — it reuses the single mobile column inside DesktopShell. This contradicts the "command-center desktop" mandate.
- **`renderMarkdown` uses `dangerouslySetInnerHTML`** but escapes HTML first (XSS-guarded). Worth noting since AI output is injected.
- **`useAuth` import drift**: `SendToInboxButton` imports `useAuth` from `@/hooks/useAuth` while `useEdge`/subscription import from `@/components/auth/AuthProvider` — two auth-hook sources in the same surface.
