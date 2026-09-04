---
schema: app
surface: project-docs
app: CTRL (mm-ctrl)
title: CTRL Project Documentation + Prior Decisions — Consolidated Corpus
production_url: ctrl.themindmaker.ai
generated: 2026-06-12
sources:
  repo_docs:
    - docs/UX-PRINCIPLES.md
    - docs/AGENTIC_UI_TESTING.md
    - docs/BRIEFING_GENERATION_HISTORY.md
  project_documentation:
    - PURPOSE.md, VALUE_PROP.md, ICP.md, OUTCOMES.md, SPINE.md
    - ARCHITECTURE.md, FEATURES.md, DECISIONS_LOG.md, HISTORY.md, COMMON_ISSUES.md
    - DESIGN_SYSTEM.md, VISUAL_GUIDELINES.md, BRANDING.md
    - AGENT_BRIEFING.md, SALES_BRIEF.md, Master_Messaging_and_FAQ.md, REPLICATION_GUIDE.md
    - compliance/ (10-doc pack)
  root:
    - CLAUDE.md, README.md, CHANGELOG.md
  founder_memory:
    - feedback_ctrl_ux_principles.md
    - project_ctrl_decision_engine.md
    - project_ctrl_rebuild.md
    - project_ctrl_ux_minimalist.md
    - project_ctrl_onboarding.md
    - project_ctrl_compliance_breach.md
    - project_ctrl_pr_qa_20260609.md
    - project_ctrl_desktop_zero_scroll.md
    - project_ctrl_kit_third_lesson.md
---

# CTRL — Consolidated Project Documentation & Prior Decisions

This corpus folds together everything CTRL has already written down about itself —
the product vision, the documented UX principles, the architecture and the
explicit "locked" decisions, the known debt, and the founder's own working memory —
so a redesign can build on what exists rather than rediscovering it. Where the
shipped docs contradict the founder's current critique of overwhelm, that tension
is called out explicitly.

---

## 1. What CTRL Is (documented product vision)

**One-liner (AGENT_BRIEFING):** CTRL builds a portable AI double of a senior leader
in 2 minutes. Every AI tool they use (ChatGPT, Claude, Gemini, Cursor, Claude Code)
instantly knows their context, goals, and decision style. **Tagline: "Your context.
Every AI. One click."**

**Positioning:** "the decision-speed layer between leaders and AI." Self-contained,
no integrations (no Slack/email/calendar) — the privacy posture is itself a feature.

**The three taxes CTRL claims to kill** (PURPOSE / AGENT_BRIEFING):
1. **Zero-context tax** — every AI conversation starts from scratch (the primary problem).
2. **Noise tax** — newsletters serve everyone the same stories; 30+ min/day wasted.
3. **Repetition tax** — leaders re-type the same 3-5 weekly workflows from a blank prompt.

**Magic moment (documented):** Context Export — the first AI response that is
unmistakably about THEM, not generic. A documented "second aha" exists for Edge Pro:
the moment a generated Agent Skill auto-fires in the user's own Claude.

**ICP:** C-suite/VP/founder at 50-5,000-employee companies (sweet spot 100-1,000),
already using AI daily, time-poor, allergic to setup, burned by integration-hungry
tools. 11 priority industries (creator economy → SaaS → fintech → consulting →
healthcare …). Explicit anti-ICPs: sub-20-person startups, ML/data engineers, IC/junior,
AI hobbyists, implementation-services buyers, single-platform loyalists, integration-
requirers, SOC2-review-requirers.

**Pricing (locked 2026-05-30, Decision 42):** Free core; $49 Full Diagnostic (one-time);
$29 Deep Context Upgrade (one-time); $69 bundle; **Edge Pro $29/month** (was $9, $9 cohort
grandfathered); Bootcamp $15K-$50K; Portfolio $5K-$25K. Runtime truth source:
`ctrl.themindmaker.ai/.well-known/product.json`.

---

## 2. Documented UX Principles (the design north-star)

Two canonical sources, both pointing the same direction:

**`docs/UX-PRINCIPLES.md` — "designing for the ADHD CEO" (last reviewed 2026-06-08):**
1. **One baby step at a time.** Every screen resolves to exactly one primary action.
   Secondary actions collapse behind a single calm "Adjust". A screen with 8 stacked
   sections is a screen with no priority. State machines render ONE state, never two.
2. **Collapse the workflow behind the outcome.** The CEO wants the outcome, not the
   machinery. Canonical example: "Generate audio → wait → Listen" (two steps) becomes
   one **"Listen"** that synthesizes-then-plays. Prefer a single verb naming the result.
3. **AI automates time so the human reinvests it upward.** Automate the legwork; hand
   back a reusable mental model (the why/anchor), not just an answer; compound. "If a
   feature saves time but teaches nothing it is half-built."
4. **Minimal, consistent iconography.** One metaphor per concept. No decorative Sparkles.
   Semantic set: Brain/Lightbulb/Zap/Star/ListChecks/Settings2; Play/Radio/Mic for audio.
5. **Works on every screen.** Same screen coheres on small phone and wide desktop;
   viewport-relative floors, never hard pixel minimums.

**`feedback_ctrl_ux_principles.md` (founder, 2026-06-02):**
- **Radical minimal simplicity** — never make the user guess or weigh complex trade-offs;
  every experience is sequenced and guided, one clear step at a time.
- **"What can the user see at any given moment"** — design like Apple's CEO thinking in
  2028 interaction-design terms; deliberate about what is on screen now / hidden / next.
- **Bespoke mobile** — purpose-built (full-screen, sheet-based, thumb-first, one thing
  at a time), NOT stretched desktop markup.
- **Desktop = command-centre** — denser, productivity-focused, multi-panel, keyboard,
  overview at a glance.
- **These are B2C products to SELL, not personal tools** — no feature assumes it is just
  for Krish (the explicit reason Fireflies meeting-ingestion was dropped from the Decision
  Engine — a personal-account API has no place in a shippable product).

These two docs ARE the founder's anti-overwhelm thesis already written down. The
redesign's job is to make the whole app obey them, not to invent a new philosophy.

---

## 3. The Decision-Engine / Verification Concept

CTRL's most distinctive built-in tool. Origin: Conclusiv (a decommissioned
research-to-deck tool) had a buggy claim-verification feature; rather than merge the
product, its strongest idea — **adversarial verification of a decision against the
leader's own context** — was folded into CTRL as a verification-looped Decision Engine,
extending the older Decision Advisor.

Pipeline (`decision-engine` edge fn, mirrors the briefing streaming pattern —
early-insert + frontend-poll by `stage`): **decompose → verify (web-grounded claims) →
cross-examine → advise.** Three phases all shipped + LIVE in prod (PRs #122/#124, merged
2026-06-02; `VITE_DECISION_ENGINE_ENABLED=true`):
- **Phase A** — synchronous pressure test; 7 RLS-owner-scoped tables (decision_cases /
  claims / evidence / tensions / alerts / events + eval_cases); LLM-adjudicated 4-state
  verdict with calibrated abstention; grounds in the Memory Web via `getUserContext`.
- **Phase B** — Edge-Pro-only multi-model cross-examination (Claude/GPT-4o/Gemini/Grok
  panel; divergence → a `model_disagreement` tension); typed retrievers; free capped at
  3 runs/30d.
- **Phase C** — `decision-watch` hourly pg_cron WATCH loop re-verifies load-bearing
  claims and injects "an assumption just broke" DECISION ALERTs into the Daily Briefing.
  **This is the philosophical heart: a decision becomes a living object, not a one-shot
  answer.** Device-aware UI per the UX principles (mobile = guided one-step capture →
  ThinkingView → verdict; desktop = command-centre RecentRail + active pane). The
  `CriticalCallStep` forces the user to make their OWN call before the recommendation —
  the upskilling principle (#3) made concrete.

Spec in repo: `_upgrade/ctrl/DECISION-ENGINE-SPEC.md`. Kill switch:
`VITE_DECISION_ENGINE_ENABLED=false` + redeploy.

---

## 4. Mobile-vs-Desktop Intent (explicit, load-bearing)

The split is a deliberate, documented architectural stance, not an accident:
- **Mobile = bespoke, guided, one-thing-at-a-time.** Bottom nav (`BottomNav`),
  full-screen sheet-based views, floating voice FAB, fixed `h-screen-safe`/`--mobile-vh`
  no-scroll frame. "Purpose-built for mobile, NOT stretched desktop markup."
- **Desktop = command-centre.** Unified `DesktopShell` (sidebar + sticky top bar with
  eyebrow/title/actions + optional right rail), global Cmd/Ctrl+K Command Palette,
  keyboard hints, denser multi-panel, viewport-pinned zero-scroll frame.
- **Decision 41 (PR #104)** explicitly replaced "stretched-mobile desktop" with the
  desktop-native shell because "executive buyers judge desktop polish" and the product
  is demoed on desktop in every sales call.
- By Phase 10 all 10 authed surfaces (Dashboard, Memory, Context, Briefing, Decision,
  Goals, Enrich, Settings, Compliance, Profile) wear the same DesktopShell; the
  desktop-zero-scroll bug (`min-h-screen` clipping) was fixed in PR #138 with a true
  fit-to-viewport frame + a committed Playwright spec (32/32 green).

---

## 5. What Is "Locked" / Already Shipped

**LIVE in production (from DECISIONS_LOG + CHANGELOG + founder memory):**
- Full six-app rebuild (PR #111, 2026-05-30): pricing, RLS security, attribution emit,
  `/.well-known/product.json`, public-surface prerender — shipped together for consistency.
- Briefing v2 (evidence-based 7-stage lens pipeline; pgvector; first-class
  `briefing_interests` table; signature-based persistent Bans; nightly in-DB aggregator
  at 03:07 UTC). Decisions 25-29, 36.
- Agent Skill Builder (Edge Pro) with the **Three Honest Tests triage gate** and
  agentskills.io ZIP output + pain-anchored entry points. Decisions 38-40.
- Decision Engine A+B+C (section 3). Phase 9.
- Desktop Shell unification + zero-scroll + Goals (`/goals`) + Enrich loop (`/enrich`).
  Phase 10.
- **ADHD-CEO minimalist UX pass (PR #133, merged 32c9261):** Briefing collapsed from 8
  stacked sections to one-action-per-state behind a single "Adjust"; one "Listen" button;
  **all 124 Sparkles purged across 55 files → 0** (verified live). This is the founder's
  anti-overwhelm thesis already partly executed.
- Kit Engine (preset-driven class follow-up portal, anon-first, base64-in-DB; PR #141).
  Third lesson "memory-identity" + Gemini fallback for the OpenAI-only skill pipeline
  (PRs #143/#144).
- Compliance hardening: cross-tenant PII breach fixed in prod; `/compliance` de-clawed
  (dropped false SOC2 Type II/HIPAA claims); end-to-end account deletion; 10-doc
  compliance pack. Decisions 30-32, compliance/.

**Locked decision-rules to honor (DECISIONS_LOG):**
- D9 No chat interface (avoid ChatGPT-clone feel). D10/D22 Minimal/restrained animation.
- D12 **No toast notifications anywhere** — "CEOs shouldn't need to swipe away
  notifications"; use inline UI feedback.
- D13 Mobile viewport-fit (input screens fit without scrolling). D14 Monotonic progress bar.
- D15 Show value before unlock. D17 Single `ai-generate` (one LLM call, not five).
- D24 Rebrand Mindmaker → CTRL (decision speed / executive control framing).

**Tech stack (locked):** Vite + React 18 + TS, Tailwind + shadcn/ui, Framer Motion,
Supabase (80 edge fns / 110 migrations / pgvector+pgcrypto+pg_cron), Vertex Gemini 2.0
Flash primary → OpenAI GPT-4o fallback → static, ElevenLabs audio, Stripe, Resend,
Vercel. **No em dashes anywhere** (build-time guard). Node >=22 <24.

---

## 6. Known Issues / Debt

- **~1600 ESLint warnings accepted as debt** (D35); CI lints PR-diff only, so any touched
  file inherits its pre-existing `no-explicit-any`/exhaustive-deps debt (a recurring
  merge gotcha, e.g. the 55-file Sparkles sweep surfaced ~31).
- **Stale committed Supabase `types.ts`** — drifted from live DB; `tsc --noEmit` is NOT a
  usable gate (root tsconfig `files:[]`); wholesale `gen types` breaks ~20 files. Rely on
  the Vite build. Real gate = Vite/esbuild build (no typecheck).
- **P3 406 / ERR_ABORTED on fresh accounts** (mostly traced + fixed via `.maybeSingle()`
  in PR #137, but still flagged historically).
- **Briefing fragility:** "lens empty" 500 on thin profiles (sparse-profile guard);
  off-topic stories when no interests declared; cold-start can exceed 30s on slow
  Perplexity; killed-lens-item-reappears edge cases (COMMON_ISSUES 31-36).
- **Settings desktop tab strip** historically overflowed (>8 tabs); fixed in PR #135.
- **Attribution warehouse emit DORMANT** until OS sets `WAREHOUSE_INGEST_URL` /
  `ATTRIBUTION_INGEST_SECRET`.
- **Operational:** OpenAI billing exhausted (app rides Gemini fallback until top-up);
  stale Perplexity key; multiple chat-pasted creds (sbp_/Stripe/GitHub/Vercel) need
  rotation; `DesktopSidebar.tsx` now dead code (only the dead `/think` redirect imports it).
- **A temp QA prod user** (`qa_prod_...@example.com`) may still exist (auto-mode blocked
  the in-app delete).

---

## 7. CONFLICTS with the founder's current critique of overwhelm

This is the load-bearing section for the redesign.

**A) The biggest conflict — stale "light mode" docs vs the dark, premium reality.**
`README.md` ("Light mode — Warm off-white backgrounds"), `CLAUDE.md` ("Light mode
design: warm off-white backgrounds, deep ink text"), `DESIGN_SYSTEM.md` (entire color
system documented as "**Light Mode (Primary)**" #faf9f7), and `COMMON_ISSUES.md` V3
checklist ("Using light mode color system") ALL describe a light app. **The app is
actually DARK-themed** (black bg, teal #00D9B6 accent) for both landing and authed app —
confirmed repeatedly in founder memory (`project_ctrl_onboarding`, `project_ctrl_ux_minimalist`).
Any redesign reading the committed design docs would build the wrong skin. The
DESIGN_SYSTEM color tokens, shadows (light-optimized), and video-background patterns are
the single most misleading artifact in the corpus.

**B) Documented feature density vs "radical minimal simplicity."** The product docs
proudly inventory an enormous surface area: Memory Web + Edge (Sharpen/Cover artifacts) +
Briefing v2 (7 types, Bookmark/Ban/Interests/Directives) + Context Export (6 tools × 6
use-cases) + Decision Engine + Goals + Enrich + Skill Builder + Diagnostic (6 dimensions,
tensions/risks/scenarios) + Missions + Progress/Drift + Kit Engine. The founder's critique
is precisely that this is overwhelming. The DECISIONS_LOG even celebrates "Surface
Tensions/Risks/Scenarios" (D3) as making "cognitive work primary UI content" — the
OPPOSITE instinct to "one baby step at a time." The two anti-overwhelm UX docs (section 2)
were written LATER (2026-06) and have only been applied surface-by-surface (Briefing +
Home in PR #133; Edge/Memory/Decide judged "already aligned"). The rest of the documented
feature set has not been audited against the one-action-per-screen principle.

**C) The minimalist pass is real but partial.** PR #133 proves the direction is being
executed (Sparkles purged, Briefing collapsed), but it touched mainly Briefing + Home.
DESIGN_SYSTEM.md still prescribes "generous Apple-like" padding scales, glass cards, video
backgrounds, decorative-underline SVGs — visual richness that predates and partly conflicts
with the "calm, one-thing-at-a-time" turn.

**D) "Anchored to:" was over-engineered then simplified.** The team shipped a redundant
"Why this is here" collapsible duplicating the existing "Anchored to:" row, then removed it
(PR #116) — a concrete instance of the documented anti-overwhelm reflex correcting an
earlier additive instinct. Worth treating as the model for the whole app.

**E) Almost no overwhelm vocabulary in the product/sales corpus.** A search of
project-documentation for overwhelm/clutter/cognitive-load/simplify returns essentially
nothing (only one "automation fatigue" sales line). The anti-overwhelm thesis lives ONLY
in the two UX docs and the founder's working memory — it has not propagated into PURPOSE /
VALUE_PROP / FEATURES / OUTCOMES, which still read as maximalist feature marketing.

---

## 8. Underused / under-leveraged data the redesign could lean on

- **`matched_profile_fact` / "Anchored to:" provenance** — already computed per briefing
  segment; the strongest trust/legibility asset and the cleanest expression of principle
  #3 (hand back the why). Currently shown as a small chip.
- **`useUserPains`** (top blockers + active decisions) — already aggregates the leader's
  real pain language; powers pain-anchored Skill entry points but could drive the whole
  home prioritization ("the one thing").
- **Decision `decision_alerts` ("an assumption just broke")** — a genuinely novel,
  living-object signal already wired into the briefing; under-surfaced in-app.
- **Memory Web depth signal** (the sparse-profile guard's interests+missions+decisions ≥5
  count) — already gates briefing generation; could drive an honest guided "next step"
  rather than failing with a 500.
- **`/enrich` "borrow your own AI" loop** — newest, most on-thesis primitive (copy one
  prompt, paste the answer back); barely documented, likely under-discovered.
- **Seed beats / 11 industry cold-start seeds** — solve day-1 emptiness with one tap;
  a ready-made guided-onboarding lever.
- **`useOnceFlag` + Coachmark pattern** — proven once-only guidance scaffold; reusable for
  any sequenced flow.

---

## 9. Notes for the redesign

- Trust the **two UX docs + founder memory over the committed design/marketing docs** wherever
  they conflict (especially theme color, density, and feature-forwardness).
- The anti-overwhelm direction is already locked and partly shipped (PR #133); the work is
  to finish applying "one baby step at a time" to every surface the minimalist pass did not
  reach, and to propagate the principle into the product/marketing docs so they stop
  selling maximalism.
- Before editing any file, pull the live version — the repo doc set has a documented habit
  of drifting from the deployed app (stale types.ts, stale theme docs, stale route names
  like `/build-lap` vs `/build`).
