# CTRL Surface Map — Settings

**Surface:** Settings (the ~9 "pages"/tabs)
**Route:** `/settings` (authed). Desktop = full tabbed page wrapped in `DesktopShell`. Mobile = NOT a page; `/settings` immediately opens a global bottom-sheet drawer and redirects to `/dashboard`.
**Complexity:** 4/5 (a sprawl of 8–9 tabs, three of which duplicate functionality that also lives on other surfaces; two near-dead tabs; one ghost "Notifications" row).

---

## What it is

Settings is the account/configuration surface. It is split into 8–9 sections. The canonical list (`SettingsList.tsx` row order) is:

1. **Account** — email (read-only), compliance link, "Replay setup tour", sign out
2. **Profile** (a.k.a. "Work context") — the leader profile: role/company + strategic context, plus a "Sync from memories" action and a memory-derived fallback view
3. **Interests** ("Briefing interests") — beats / people+companies / exclusions chips
4. **Briefing rules** ("Briefing tone & rules" / "Briefing Directives") — one free-text box of voice/posture directives
5. **Notifications** — **placeholder; renders nothing** (ghost row on mobile; removed from desktop tab bar)
6. **Privacy & data** — User Memory list (delete facts), Data Export (JSON), Delete Account
7. **Preferences** — theme toggle + a single "Daily briefing email" switch
8. **Edge Pro** — subscription status/billing + email-delivery address + send-test
9. **Manifesto** ("Leadership manifesto") — static marketing copy, no interaction

The desktop tab labels and the mobile row labels disagree (see Notes → label drift).

---

## User actions (exhaustive)

### Account (`AccountTab.tsx`)
- Read email (display only — no edit, no change-password; both intentionally removed per in-file audit comment).
- Click **"Open compliance page"** → navigates to `/compliance` (claims SOC 2 / HIPAA / GDPR / CCPA / ISO 27001 — note: prior memory flags this page over-claimed compliance).
- Click **"Replay setup tour"** → clears `localStorage['mindmaker_onboarded']`, toasts, hard-navigates to `/dashboard`.
- Click **"Sign out"** → `signOut()` then `/auth`.

### Profile / Work context (`WorkContextTab.tsx`)
- **Sync from memories** / **Sync to profile** button → reads `user_memory` (current, verified-leaning) and writes highest-confidence fact per column into `leaders` via the hard-coded `FACT_TO_LEADER` map.
- Inline-edit 5 Role & Company fields via `EditableField` (each is a separate edit/save/cancel micro-form): Title (text), Functional Area (select), Company (text), Industry (select), Company Stage (select).
- Inline-edit 5 Strategic Context fields (textarea each): Top Challenge, Biggest Obstacle, Main Concern, Strategic Goal, Quarterly Focus.
- View Profile Completeness % (read from `leaders.profile_completeness`).
- (Fallback state, no `leaders` row but memories exist) view memory facts grouped by category with Verified/Inferred badges.

### Interests (`BriefingInterestsTab.tsx`)
- Add a **Beat** (topic) — text input + Plus button.
- Add a **Person/Company** entity — text input + Plus.
- Add an **Exclude** ("Never show me") — text input + Plus.
- Remove any chip (X per chip). All three sections are independent add/remove forms. Backed by `useBriefingInterests` → `briefing_interests` table.

### Briefing rules / Directives (`BriefingDirectivesTab.tsx`)
- Edit one free-text **directives** box (≤2000 chars, char counter), click **Save**. Stored verbatim in `user_briefing_directives.body`; injected into the briefing system prompt under `<user-directives>`.

### Notifications
- None. `SettingsSectionView` has no `case 'notifications'` → the mobile sheet falls through to `default` (blank). Desktop dropped it from the tab bar.

### Privacy & data (`PrivacyDataTab.tsx`)
- **Delete a memory fact** (Trash per fact, `confirm()` dialog) → hard `delete` from `user_memory`.
- **Download All Data** → client-side JSON blob of `leaders` + `user_memory`.
- **Delete Account** button — **renders but has NO onClick handler (dead button).**

### Preferences (`PreferencesTab.tsx`)
- Toggle theme **Dark / Light** (two buttons → `useTheme`).
- Toggle **Daily briefing email** switch → `upsert-notification-prefs` edge fn → `leader_notification_prefs.daily_briefing_enabled`.

### Edge Pro (`EdgeProTab.tsx`)
- **Subscribe – $29/mo** (`useEdgeSubscription.subscribe()` → Stripe checkout redirect).
- **Manage subscription / Update payment method** → `create-billing-portal-session` (only shown when Stripe-backed).
- **View past invoices** (when a stripe_customer_id exists but inactive).
- **Refresh status**.
- Edit **delivery email** + **Save** → `profiles.edge_delivery_email`.
- **Send test** email → `send-edge-test-email`.

### Manifesto (`ManifestoTab.tsx`)
- None — static read-only marketing copy (5 belief sections + closing).

### Sheet-level chrome (mobile, `SettingsSheet.tsx`)
- Back arrow (section → list), Close (X), swipe-to-dismiss drawer.

---

## Key files

- `src/pages/Settings.tsx` — route entry; desktop `Tabs` shell + `MobileSettingsRedirect`
- `src/contexts/SettingsSheetContext.tsx` — `open/section/openSheet/openTo/closeSheet`; `SettingsSection` union type
- `src/components/settings/SettingsSheet.tsx` — mobile bottom-drawer host (list ↔ section animation)
- `src/components/settings/SettingsList.tsx` — mobile row list + `SETTINGS_SECTION_LABELS`
- `src/components/settings/SettingsSectionView.tsx` — section → component switch (no `notifications` case)
- `src/components/settings/AccountTab.tsx`
- `src/components/settings/WorkContextTab.tsx` (Profile)
- `src/components/settings/BriefingInterestsTab.tsx`
- `src/components/settings/BriefingDirectivesTab.tsx`
- `src/components/settings/PrivacyDataTab.tsx`
- `src/components/settings/PreferencesTab.tsx`
- `src/components/settings/EdgeProTab.tsx`
- `src/components/settings/ManifestoTab.tsx`
- `src/components/settings/EditableField.tsx` (per-field edit micro-form; **hardcoded dark colors** `bg-gray-900`, `#00D9B6` — ignores theme)
- Hooks: `src/hooks/useBriefingInterests.ts`, `src/hooks/useEdgeSubscription.ts`, `src/hooks/useDevice.ts`, `src/hooks/use-mobile.tsx`, `src/hooks/use-toast.ts`
- Entry points: `src/components/memory-web/AppHeader.tsx` (gear → `openSheet`), `src/components/mobile/GlobalFAB.tsx` (long-press menu → `openSheet`/`openTo('profile')`), `src/components/layout/AuthedLayoutRoute.tsx` (mounts `SettingsSheet` **mobile-only**)
- Backend: `supabase/functions/nudge-briefing/index.ts` (writes `user_briefing_directives` + `briefing_interests` — the dedupe smoking gun), `upsert-notification-prefs`, `create-billing-portal-session`, `send-edge-test-email`
- Tables: `leaders`, `user_memory`, `briefing_interests`, `user_briefing_directives`, `leader_notification_prefs`, `profiles`

---

## Mobile treatment

**Genuinely mobile, not a squeezed desktop — but only for the shell, not the tab bodies.**

- `/settings` on mobile (`useDevice` < 768px) does NOT render the page. `MobileSettingsRedirect` opens the global `SettingsSheet` (a `vaul` Drawer at `92svh`, swipe-dismiss, safe-area padding, framer slide transitions) honoring `?section=`, then redirects to `/dashboard`. So context underneath is preserved.
- Navigation is a **drilldown**: a scrollable row list (`SettingsList`, 56px min touch targets, icon + label + chevron) → tap → single section view with a back arrow. One thing on screen at a time. This is a real mobile pattern.
- Reachable from the persistent `AppHeader` gear and the `GlobalFAB` long-press menu.
- BUT the section bodies are the same components as desktop. The `WorkContextTab` stack of ten `EditableField` edit/save/cancel forms is heavy and tap-laden on a phone. `EditableField` is hardcoded dark (`bg-gray-900`, teal `#00D9B6`) and ignores the theme provider, so it can clash with the rest of the (themeable) sheet.
- The `SettingsSheet` is only mounted inside `AuthedChrome` when `isMobile` (`AuthedLayoutRoute`), so it genuinely does not exist on desktop.

## Desktop treatment

- Full page in `DesktopShell` (eyebrow "Account", title "Settings"), constrained to `max-w-3xl`.
- A single horizontal `Tabs` bar (`TabsList`) with 8 triggers (no Notifications, no Profile-as-separate — "Work context" is the profile). The tab strip is horizontally scrollable on narrow widths, wraps on `md+`.
- Each tab body scrolls independently. No left-rail; it's a flat tab strip, not a command-center layout. Default tab is "work" (Profile), not Account.
- Desktop has NO drilldown sheet; the sheet is mobile-only.

---

## THE CORE CONTRADICTION: "Adjust" modal vs Briefing Directives card

The founder specifically asked to surface how the **Briefing Directives card** (Settings → "Briefing rules") contradicts the briefing **"Adjust"** control. Here is the precise picture:

**Three separate UIs all write the SAME briefing config, and none of them shows the others' state:**

1. **Settings → Briefing rules (`BriefingDirectivesTab`)** edits `user_briefing_directives.body` as one verbatim free-text blob the user types and Saves.

2. **Briefing page "Adjust" button (`BriefingPage.tsx` → `setInterestsSheetOpen(true)`)** does NOT open directives at all. The in-code comment claims *"Interests, tuning and steering all live behind this one 'Adjust' control"* — but `Adjust` only opens `InterestsSheet`, the cold-start **interests** drawer (beats + people seeded by industry, writing `briefing_interests`). **Directives/tone/posture are unreachable from "Adjust."** So the page's own promise ("one way to adjust it") is false: tone rules live in a completely different surface (Settings) the Adjust button never points to.

3. **Voice steer bar (`VoiceSteerBar` → `nudge-briefing` edge fn)** can classify a spoken nudge as `add_directive` and **appends** a line to the very same `user_briefing_directives.body` (`nextBody = existing.body + "\n" + text`). It can also `add_interest` / `add_exclude` into `briefing_interests`.

**The contradiction, concretely:**
- The Directives tab presents `body` as a hand-authored block the user fully controls ("focus on content and posture… how to open"). The voice nudge silently *appends machine-generated imperative sentences* to that same field. A user who opens the Directives tab later finds rules they never typed, interleaved with theirs, with no provenance, no per-rule delete, and no indication they came from voice. Editing/Saving the box can clobber nudge-added rules and vice-versa (last-write-wins on one shared text column).
- The Directives tab says "House rules on voice, typography, and style already apply automatically, so skip those" — yet `nudge-briefing`'s own prompt is explicitly told to capture "STYLE/FORMAT rule[s]" (e.g. "keep it under 3 minutes", "no jargon") as directives. So the two systems give opposite guidance about whether style rules belong here.
- Interests are editable from **three** places — Settings → Interests tab, the briefing "Adjust" `InterestsSheet`, and the voice nudge — all on `briefing_interests`, none aware of the others.

Net: "briefing configuration" is fragmented across Settings (2 tabs), the Briefing page (1 sheet + 1 voice bar) and an edge function, with overlapping writes and a mislabeled single-control promise.

---

## Duplications (overlap with other surfaces)

- **Briefing directives editing** — Settings → Briefing rules tab **and** the `nudge-briefing` voice path (`add_directive`) both write `user_briefing_directives.body`. Two authors, one un-namespaced text column. (See core contradiction.)
- **Briefing interests editing** — Settings → Interests tab, the Briefing page `InterestsSheet` ("Adjust"), `InterestChipsRow`/"Manage", and `nudge-briefing` (`add_interest`/`add_exclude`) ALL CRUD `briefing_interests`. Four entry points, one table.
- **Memory / fact editing** — Settings → Privacy tab lists & deletes `user_memory` facts; Settings → Profile tab also reads `user_memory` (derived view + "Sync from memories") and writes `leaders`; the dedicated **Memory Web** surface (`/memory`) is the primary place to manage facts. Memory appears in (at least) three surfaces.
- **Export** — Settings → Privacy "Download All Data" produces a client-side JSON; the `AppHeader` also exposes an `onExport` action, and the Manifesto/Memory Web pitch "export your context to ChatGPT/Claude." Multiple export affordances, different shapes.
- **Profile vs Work context** — `SettingsList` calls section `profile` → renders `WorkContextTab`; `GlobalFAB` "Profile" also `openTo('profile')`; there is additionally a `/profile` route in the router. Same data, several names ("Profile", "Work context", `/profile`).
- **Notification/delivery config split** — daily-briefing email toggle lives in **Preferences**; Edge-Pro artifact delivery email lives in **Edge Pro**; the dead **Notifications** tab was supposed to unify "Delivery and quiet hours." Delivery settings are scattered across 2–3 tabs.
- **Compliance** — Account tab links to `/compliance`; the Manifesto tab restates the same privacy/ownership claims in prose. Two places telling the trust story.

---

## Underused data (captured here, not fed back into learning)

- **Strategic Context free-text** (Top Challenge, Biggest Obstacle, Main Concern, Strategic Goal, Quarterly Focus) is captured in `leaders` but there is no visible loop turning it into briefing interests/directives or decision-engine priors — the user must re-declare the same things as Interests. The richest signal in Settings is a dead-end form.
- **Industry / Company Stage / Functional Area** selects feed `useIndustrySeeds` for cold-start chip suggestions, but nothing re-runs seeding when the user later edits these in Settings; updates here don't re-personalize.
- **Excludes ("Never show me")** are stored but there's no feedback surfaced confirming what got filtered — the user can't tell if the exclusion is working (no "we dropped N stories" affordance).
- **Theme / preference choices** are local-only; not part of the exported context blob.
- **Memory confidence_score / verification_status / source_type** are displayed (Privacy, Profile fallback) but the only user action is delete — no "confirm/correct," so the verification loop can't learn from the user's review here (the corrective signal is thrown away as a hard delete).
- **`leader_notification_prefs`** only stores one boolean; quiet hours / frequency / channel implied by the dead Notifications tab are never captured.

---

## Notes (dead code, half-built, contradictions)

- **Ghost "Notifications" row:** `SettingsList` still renders a Notifications row (Bell icon) but `SettingsSectionView` has no case for it → tapping it on mobile shows a blank section. Desktop already removed it from the tab bar. Half-removed feature.
- **Dead "Delete Account" button:** Privacy tab renders a destructive "Delete Account" button with **no onClick** — does nothing. A GDPR/CCPA-critical control is a no-op while the Account tab links to a page claiming GDPR/CCPA compliance.
- **`EditableField` ignores the theme:** hardcoded `bg-gray-900`, `border-gray-700`, teal `#00D9B6` save button, `text-white/text-gray-*`. In light mode (per CLAUDE.md the app's design intent) this field renders as a dark island. `PreferencesTab` cards are also hardcoded `bg-gray-900`. Theme support is inconsistent across Settings.
- **Label drift:** mobile labels (`SettingsList`/`SETTINGS_SECTION_LABELS`) = "Profile", "Interests", "Briefing rules", "Privacy & data", "Preferences", "Manifesto"; desktop tab labels = "Work context", "Briefing interests", "Briefing tone & rules", "Privacy", "Leadership manifesto". Same sections, two naming systems → users can't map mobile→desktop. Also `briefing` section = "Briefing rules" (mobile) vs "Briefing tone & rules" (desktop tab) vs file name "Briefing Directives" vs in-app header "Briefing Directives."
- **Default-tab mismatch:** desktop opens to "work" (Profile) by default; mobile list has no default (shows the list). The `?section=` deep link is handled on mobile only; desktop `Tabs` ignores the URL param entirely (the `VALID_SECTIONS`/`isValidSection` machinery is used only by the mobile redirect).
- **Voice nudge has no UI feedback in Settings:** rules added by `add_directive` show up in the Directives box only on next load, with no marker that they were voice-authored; no undo.
- **Account tab over-removal commentary:** in-file comment notes profile-photo and change-password were stripped during a prior audit; password reset only via the unauthenticated "forgot password" link — there is no in-app change-password.
- **`useDevice` vs `use-mobile`:** the app has two mobile detectors (`useDevice` at 768 used by `Settings.tsx`/`AuthedLayoutRoute`; `useIsMobile`/`use-mobile` used by `CustomBriefingSheet`). Settings uses `useDevice`. Minor duplication risk for breakpoint consistency.
- **Manifesto as a "settings" tab** is really marketing/brand copy parked in Settings; it has zero settings function and inflates the tab count.

---

## Consolidation implications (for the dedupe mandate)

- Collapse the **three briefing-config writers** (Directives tab, Interests tab/`InterestsSheet`, voice nudge) into ONE "How your briefing should sound + what it covers" surface, with structured, individually-deletable, provenance-tagged rules (so voice-added and hand-typed rules don't clobber each other on a single text column). Make the Briefing page "Adjust" actually open THAT surface (its comment already promises this).
- Fold **delivery settings** (Preferences daily-briefing toggle + Edge Pro delivery email + the dead Notifications tab) into one Delivery section.
- Wire the **Strategic Context** fields and **Excludes** into the personalization loop, or stop collecting them.
- Implement or remove **Delete Account** and the **Notifications** ghost row; pick ONE label system across mobile/desktop; make `EditableField`/Preferences theme-aware.
- Manifesto belongs on the marketing/`/compliance` side, not in the Settings tab count.
