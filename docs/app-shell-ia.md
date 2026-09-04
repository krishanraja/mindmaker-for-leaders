# CTRL Surface Map: Global Navigation, IA, Routing & Mobile-vs-Desktop Shell

> Surface: the app skeleton itself — router, route table, navigation tab definitions,
> the desktop "command-center" shell, and the mobile bottom-nav + FAB + sheet shell.
> This is the chassis every other surface mounts onto. Read from real code in
> `C:/Users/krish/mm-ctrl` (Vite + React 18 + TS + React Router v6 + shadcn/ui + Tailwind, DARK theme).

---

## what_it_is

The structural shell that decides **where you can go** and **how the app frames itself per viewport**.

- **Entry / boot**: `main.tsx` → `App.tsx`. `App.tsx` is a small state machine
  (`LOADING → SPLASH → READY`) driven by `AppStateProvider`; only when `READY` does it
  mount `<RouterProvider router={router} />`. Providers nest:
  `ThemeProvider(defaultTheme="dark")` → `QueryClientProvider` → `AuthProvider` →
  `BriefingProvider` → `AppStateProvider`.
- **Router**: `src/router.tsx` — a single `createBrowserRouter` with lazy routes
  (each wrapped in `lazyWithRetry` to recover from stale-chunk 404s after deploys).
- **Two shells, one app**:
  - **Desktop** = `DesktopShell` (`src/components/layout/DesktopShell.tsx`): fixed 220px
    left nav rail + 56px top bar (page title + Command Palette + page actions) + bounded
    no-window-scroll main region + optional right rail (only `xl:` and wider).
  - **Mobile** = a 16px-tall fixed `BottomNav` (`src/components/memory-web/BottomNav.tsx`),
    a floating voice `GlobalFAB`, an `AppHeader`, and `SettingsSheet`/other bottom sheets.
- **Per-viewport branching** is done **inside each page**, not by the router. Every authed
  page imports `useDevice()` and renders either its mobile tree or wraps its content in
  `<DesktopShell>`. The router has no idea which shell will render.
- **Tab set (the canonical IA)**: Home / Edge / Memory / Export(Context) / Briefing / Goals /
  Decide — plus an Account group (Profile, Compliance, Settings). Home and Edge are the SAME
  route (`/dashboard`) differentiated only by `?view=edge`. Kit is a separate, parallel
  portal (`/kit/*`) with its own `KitPortalLayout` chrome, outside the main shell entirely.

---

## user_actions (exhaustive, for the shell/nav surface only)

**Desktop rail (`DesktopShell` → `DesktopRail`):**
1. Click brand logo → go to `/dashboard` (Home).
2. Click **Home** (icon Home, kbd `G H`) → `/dashboard`.
3. Click **Edge** (Zap, `G E`) → `/dashboard?view=edge`.
4. Click **Memory** (Brain, `G M`) → `/memory`.
5. Click **Export** (ArrowUpRight, `G X`) → `/context`.
6. Click **Briefing** (Radio, `G B`) → `/briefing`.
7. Click **Goals** (Target, `G G`) → `/goals`.
8. Click **Profile** (Account group) → `/profile`.
9. Click **Compliance** → `/compliance`.
10. Click **Settings** → `/settings`.
11. Click user-footer **Sign out** (LogOut icon).
12. Re-click the active tab → resets search params (no-op nav, used to clear `?view=edge`).
   (Note: the rail advertises keyboard shortcuts `G H / G E / ...` on hover, but no global
   key handler implements `G`-prefixed jumps — only Cmd/Ctrl+K is wired. The kbd hints are decorative.)

**Desktop top bar (`DesktopTopBar`):**
13. Click the **Command Palette** trigger (or press **Cmd/Ctrl+K**) to open it.
14. Page-specific `actions` slot (varies per page; injected by each page).

**Command Palette (`CommandPalette.tsx`) — once open:**
15. Type to search/filter.
16. Navigate group: Home / Edge / Memory Web / Export / Briefing / Goals.
17. Quick actions: "Capture a thought (voice)" (fires `mm:capture-voice` window event),
    "Generate today's briefing" (fires `mm:generate-briefing`), "Quick export to AI" (→ `/context`).
18. Account group: Profile / Compliance / Settings / Sign out.

**Mobile bottom nav (`memory-web/BottomNav.tsx`) — 5 tabs:**
19. **Home** → `/dashboard` (memory view).
20. **Edge** → `/dashboard?view=edge`.
21. **Memory** → `/memory`.
22. **Decide** → `/decision`.
23. **Briefing** → `/briefing`.
   (Mobile bottom nav has only 5 tabs and DOES NOT include Goals or Export; Decide replaces
   Export here. Desktop rail has 6 and DOES NOT include Decide. The two nav surfaces expose
   DIFFERENT tab sets.)

**Mobile floating FAB (`GlobalFAB.tsx`) — voice/actions menu:**
24. Tap (or long-press ~220ms) the mic FAB to open a menu.
25. "Talk to ctrl" → navigates to `/dashboard`.
26. "Brief me now" → calls `generate()` then opens the briefing sheet.
27. "Settings" → opens `SettingsSheet`.
28. "Profile" → opens `SettingsSheet` to the profile section.
   (The FAB hides itself on the Home memory view because that view has its own mic + gear.)

**Mobile header (`AppHeader.tsx`):**
29. Tap settings gear → opens `SettingsSheet`.
30. (Optional, page-supplied) Add (+) and Export (↗) round buttons.

**Settings (two front doors for the same content):**
31. On mobile, Settings opens as a **bottom Drawer** (`SettingsSheet`) with a list of
    9 sections: Account, Profile, Interests, Briefing rules, Notifications, Privacy & data,
    Preferences, Edge Pro (billing), Manifesto. Tapping a section slides into `SettingsSectionView`.
32. On desktop, `/settings` is a **full page** (`pages/Settings.tsx`) wrapped in `DesktopShell`.

**Auth gating actions (implicit):**
33. Any authed route renders `<RequireAuth>`; unauthenticated users get redirected.

---

## key_files

**Boot / providers**
- `src/main.tsx` — React root, installs error tracking, captures attribution, emits "landed".
- `src/App.tsx` — provider tree + `LOADING/SPLASH/READY` gate; mounts the router only when READY.

**Routing (LIVE)**
- `src/router.tsx` — the actual `createBrowserRouter`. Public, authed (under `AuthedLayoutRoute`),
  legacy redirects, `*` → NotFound. Lazy + `lazyWithRetry`.
- `src/components/layout/AuthedLayoutRoute.tsx` — layout route wrapping ALL authed pages with
  `SettingsSheetProvider` + `CommandPaletteProvider`; renders `<Outlet/>` plus mobile-only
  `GlobalFAB` + `SettingsSheet` (`AuthedChrome` gated by `isAuthenticated && isMobile`).
- `src/components/auth/RequireAuth.tsx` — per-route auth gate (referenced; not the dead `guards.tsx`).

**Routing (DEAD / orphaned — not imported by `router.tsx`)**
- `src/router/routes.tsx` — an OLD `RouteObject[]` table (Today/Pulse/Voice/signin + redirects). Unused.
- `src/router/guards.tsx` — `ProtectedRoute` (uses `getCurrentUser`); only self-referenced. Unused.

**Desktop shell**
- `src/components/layout/DesktopShell.tsx` — rail + top bar + bounded main + optional right rail.
  Contains `DesktopRail` (the `navItems` + `accountItems` tab defs) and `DesktopTopBar`.
- `src/components/layout/CommandPalette.tsx` — `CommandPaletteProvider` + palette + top-bar trigger (Cmd/Ctrl+K).
- `src/components/layout/useCommandPalette.ts` — palette context.

**Mobile shell**
- `src/components/memory-web/BottomNav.tsx` — LIVE 5-tab mobile bottom nav (Home/Edge/Memory/Decide/Briefing).
- `src/components/memory-web/AppHeader.tsx` — logo + settings gear; shared across authed mobile pages.
- `src/components/mobile/GlobalFAB.tsx` — floating voice/actions FAB (mobile only).
- `src/components/settings/SettingsSheet.tsx` (+ `SettingsList.tsx`, `SettingsSectionView.tsx`) — mobile settings drawer.

**Mobile shell (DEAD / orphaned)**
- `src/components/dashboard/mobile/BottomNav.tsx` — OLD 4-tab nav (Home/Pulse/Today/Progress) pointing at
  legacy redirect routes. Not imported anywhere.
- `src/components/dashboard/mobile/MobileDashboard.tsx` — referenced only in docs; not wired.
- `src/components/mobile/SideDrawer.tsx` — left-slide drawer (Strategic Pulse / Competitive Intel /
  Action Queue / Learning Engine / Baseline / Profile / Settings). Hardcoded `userTier = 'Advancing'`
  TODO; not imported by any live page.
- `src/components/mobile/MobileLayout.tsx` — generic no-scroll wrapper; only referenced in docs.

**Viewport detection**
- `src/hooks/useDevice.ts` — `useDevice()` → `{ isMobile, isDesktop }`, breakpoint **768px**, matchMedia.
- `src/hooks/use-mobile.tsx` and `src/hooks/useMediaQuery.ts` — TWO additional, parallel mobile/media hooks
  used by other components (shadcn sidebar, edge sheets, landing). Three overlapping breakpoint hooks coexist.

**Per-viewport page branchers (representative)**
- `src/pages/Dashboard.tsx` — the hub. Reads `?view`; branches Memory vs Edge AND mobile vs desktop
  (4 combinations). Mobile→`MobileMemoryDashboard`/inline Edge; desktop→`DesktopMemoryDashboard`/`DesktopShell`.

---

## mobile_treatment

**Real, bespoke mobile design — not a squeezed desktop.** Evidence:

- Dedicated mobile components: `MobileMemoryDashboard`, mobile `BottomNav`, `GlobalFAB`, `AppHeader`,
  plus a whole `src/components/mobile/` family of bottom sheets (`BottomSheet`, `ActionQueueSheet`,
  `DecisionPrepSheet`, `StrategicPulseSheet`, `CompetitiveIntelligenceSheet`, `LearningEngineSheet`,
  `PriorityCardStack`, `SwipeableCards`, `HeroStatusCard`).
- No-scroll frame: mobile views use `h-screen-safe` / `h-[var(--mobile-vh)]` + `overflow-hidden flex flex-col`,
  with the scroll confined to an inner region. `initMobileViewport()` (called in `App.tsx` and `MobileLayout`)
  computes a real viewport var accounting for browser chrome + safe-area insets.
- Touch ergonomics: 44px min tap targets in bottom nav; `haptics`/`navigator.vibrate`; long-press on the FAB;
  Framer Motion `layoutId="nav-indicator"` glow that animates between active tabs; spring transitions.
- Settings is a native-feeling bottom Drawer (`92svh`) with list → section slide animation, not a page.
- The shell is assembled per-page (`AppHeader` + content + `BottomNav` + `GlobalFAB`), so each authed mobile
  page re-stacks the same chrome manually rather than inheriting it from a layout route.

Caveat: the layout route only injects `GlobalFAB` + `SettingsSheet` for mobile; `BottomNav`/`AppHeader`
are imported and placed by each page individually (9+ pages import `memory-web/BottomNav`), so the mobile
chrome is duplicated by hand across pages rather than centralized.

---

## desktop_treatment

A genuine **command-center**:

- `DesktopShell` pins the whole app to the viewport (`h-screen-safe overflow-hidden`) so the window never
  scrolls; overflow lives in inner hidden-scrollbar regions (the "desktop zero-scroll" model).
- **Fixed 220px left rail** (`DesktopRail`): brand, "Workspace" group (Home/Edge/Memory/Export/Briefing/Goals),
  "Account" group (Profile/Compliance/Settings), user footer with initials + email + sign-out. Active state =
  accent tint; hover reveals decorative `G _` kbd hints.
- **56px top bar** (`DesktopTopBar`): optional eyebrow + page title, a `CommandPaletteTrigger` search box
  (Cmd/Ctrl+K), and a page-supplied `actions` slot.
- **Bounded main** with `fit` prop (default true = page owns its fit-to-viewport layout; false = single
  hidden-scrollbar region) and `bleed` prop (kills default `px-8 py-6` padding).
- **Optional right rail** rendered only at `xl` and above (`hidden xl:flex`), default width 360px — so on
  laptop/tablet-width desktops the right rail silently disappears.
- Every desktop page opts in by importing `DesktopShell` and passing `title`/`eyebrow`/`actions`
  (Dashboard-Edge, Memory, Context, Briefing, Decision, Goals, Enrich, Settings, Compliance).

---

## complexity_1to5

**4/5 for the shell itself** (the wider app is a 5).

The chassis is well-built, but the IA is fragmented and over-forked:
- The same logical navigation is defined **independently in three places** with **three different tab sets**
  (desktop rail = 6+3, mobile bottom nav = 5, command palette = 6). They drift: Goals/Export live only on
  desktop+palette; Decide lives only on mobile bottom nav.
- Home and Edge collapse onto ONE route via `?view=edge`, so two "tabs" are one page with viewport-and-query
  forking → four render branches in `Dashboard.tsx` alone.
- Two parallel routers, two BottomNavs, two mobile-layout systems, three breakpoint hooks, and a left
  SideDrawer all coexist; only some are live. A newcomer cannot tell the canonical path without grepping imports.

---

## duplications

- **Navigation defined 3×**: `DesktopRail.navItems`/`accountItems`, `memory-web/BottomNav.navItems`, and the
  `CommandPalette` Navigate/Account groups. No shared single source of truth → guaranteed drift
  (already drifted: Goals/Export desktop-only, Decide mobile-only).
- **Settings has two front doors**: mobile `SettingsSheet` Drawer (9 sections incl. Profile, Briefing rules,
  Interests, Edge Pro billing) vs desktop `/settings` page. Profile is also its own route `/profile`
  AND a Settings section AND a FAB menu item AND a palette item — four entry points to roughly the same thing.
- **Briefing config duplicated**: "Briefing rules" + "Interests" live inside Settings, but Briefing also has
  its own page `/briefing` and in-page interests/custom-briefing sheets — briefing configuration is reachable
  from both Settings and the Briefing surface.
- **Export/Context**: surfaced as a rail tab (Export → `/context`), a palette "Quick export to AI" action,
  AND `AppHeader`'s optional export button, AND (per code comments) dashboard quick actions. One capability,
  many doorways.
- **Voice capture**: GlobalFAB "Talk to ctrl", palette "Capture a thought (voice)", and the Home memory view's
  own on-screen mic all start voice capture — three triggers for one action (FAB even hides itself on Home to
  avoid the obvious double-mic).
- **Decide vs Edge/pressure-test**: mobile elevates "Decide" (`/decision`) to a primary tab while desktop hides
  it; the decision/pressure-test capability also appears inside Edge and on the desktop memory dashboard
  (`DecisionInboxCard`, `AlertBanner`) — same engine surfaced in multiple shells.
- **Dead duplicates**: `dashboard/mobile/BottomNav` (4 legacy tabs), `mobile/SideDrawer` (7 different
  destinations), `router/routes.tsx` + `router/guards.tsx` — all parallel implementations of nav/routing
  that no longer run but still ship in the bundle and confuse the IA story.

---

## underused_data

The shell itself captures intent signals that are **not** fed back into personalization/learning:

- **Navigation telemetry**: tab clicks, palette usage, which view (`memory` vs `edge`) the user prefers,
  which sheets they open — none of this is observably routed into a learning loop to reorder tabs, pick a
  default landing view, or promote the user's most-used surface. The active-view default is hardcoded to
  `'memory'` regardless of behavior.
- **Command Palette queries**: the free-text the user types to "jump anywhere" is a direct expression of
  intent/jobs-to-be-done; it is used only to filter the static list, never captured to learn what the user
  keeps searching for (a goldmine for "the app never feels like it learns").
- **FAB / quick-action frequency**: how often a user hits "Brief me now" vs "Talk to ctrl" vs export is not
  used to surface the right primary action per user.
- **Onboarding/first-run signals**: `mindmaker_onboarded` / `mindmaker_onboard_offered` localStorage flags and
  the dismiss-vs-complete choice are stored locally and used only as gates, not as personalization inputs.
- **Device/viewport**: `useDevice` is read everywhere but the mobile-vs-desktop usage split per user isn't
  persisted to tailor defaults (e.g., a mobile-mostly user could get a leaner default).

---

## notes

- **Theme contradiction**: repo `CLAUDE.md` says "Light mode design / warm off-white"; the code sets
  `ThemeProvider defaultTheme="dark"` and every shell uses `bg-background`/`bg-black` dark surfaces. Memory note
  `project_ctrl_onboarding.md` already flags CLAUDE.md as stale — **the live app is DARK.** Trust the code.
- **Decorative keyboard shortcuts**: the desktop rail renders `G H / G E / G M ...` kbd hints, but only
  **Cmd/Ctrl+K** is actually wired (in `CommandPaletteProvider`). There is no `G`-chord handler — the hints
  promise a power-user nav that does not exist.
- **Two routers, one live**: `src/router.tsx` is the real one; `src/router/routes.tsx` + `guards.tsx` are
  orphaned legacy. Safe-delete candidates; they currently muddy "what are the routes".
- **Two BottomNavs, one live**: `memory-web/BottomNav` (5 tabs, live) vs `dashboard/mobile/BottomNav`
  (4 tabs Home/Pulse/Today/Progress → all legacy redirect routes, dead). `/progress` isn't even a route in
  `router.tsx`, confirming it's dead.
- **Orphaned `SideDrawer`** exposes a *different* mental model (Strategic Pulse, Competitive Intelligence,
  Action Queue, Learning Engine, Baseline) — features that were once top-level and are now buried or gone.
  Useful as an archaeology record of de-scoped surfaces; hardcoded `userTier='Advancing'` TODO inside.
- **Legacy redirects** in the live router: `/think → /dashboard?view=edge`, `/today /pulse /voice /diagnostic
  → /dashboard`. Plus the dead `routes.tsx` redirected `/timeline → /briefing`, `/profile → /dashboard?section=account`,
  which the LIVE router does NOT honor (live `/profile` is a real authed route) — a stale contradiction.
- **Mobile chrome is hand-assembled per page**: 9+ pages each import and place `memory-web/BottomNav` +
  `AppHeader` themselves; only `GlobalFAB`+`SettingsSheet` are centralized in `AuthedLayoutRoute`. A true
  consolidation opportunity: lift the entire mobile shell into the layout route.
- **Kit is a parallel app**: `/kit`, `/kit/me`, `/kit/me/intake`, `/kit/reading/:pageId` use `KitPortalLayout`
  and live OUTSIDE both the desktop and mobile shells (no rail, no bottom nav). It's effectively a second
  product surface bolted on, reinforcing the "app does too much" verdict.
- **Per-page viewport forking** means the router can't be the single source of layout truth; each page re-derives
  mobile/desktop. Consolidating to ONE shell that the router applies (responsive within), instead of every page
  choosing, is the highest-leverage structural simplification for the founder's mandate.

### Consolidation leverage (for the mandate, no features lost)
1. One canonical nav config (array) consumed by rail, bottom nav, and palette → kills the 3-way drift.
2. Lift the mobile shell (BottomNav + AppHeader) into `AuthedLayoutRoute` like the desktop shell, so pages
   stop hand-stacking chrome.
3. Delete the two dead routers, the dead 4-tab BottomNav, `SideDrawer`, `MobileDashboard`, `MobileLayout`,
   and collapse three breakpoint hooks to one.
4. Decide on Home/Edge: either two real routes or one clearly-toggled view — stop forking on `?view` + viewport.
5. Single Settings front door (page on desktop, sheet on mobile, ONE section registry) and one Profile entry.
