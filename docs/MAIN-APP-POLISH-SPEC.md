# Main CTRL App Polish Spec

Status: IMPLEMENTED and live on prod (PRs #215-222, 2026-06-20/21). This spec remains the canonical rule for the main CTRL app experience (not the `/kit` section, which is covered by `docs/KIT-REDESIGN-SPEC.md`); code is truth for any detail not covered here.

Founder-locked decisions (2026-06-19):
1. AI-native enforcement = **reframe** general-business inputs into the AI-native lens (never refuse, never stay general).
2. News visuals = **one branded image per category** (a fixed app-style set, reused per category).
3. Sequencing = **strategy first** (this spec), then rebuild surface by surface, mock-driven; the brain after a visual verification of what the user actually sees.

---

## 0. The North Star (the rule above all the others)

CTRL is about building, orchestrating, productizing, and getting to market **the AI-native version of your business.** It is NOT a general business advisor. The audit proved the drift is real: the decision engine's own seed examples today include "move upmarket to enterprise" and "hire a VP of Sales", which are pure general business. That must end.

The law: **every decision, every headline, every nudge, every suggestion is about making the business more AI-native.** When a user brings something general (pricing, hiring, a market move), we do not answer it as-is and we do not refuse it. We **reframe** it into the AI-native version of that decision and pull the user there. Examples:
- "Should I hire a VP of Sales?" -> "Before you hire, should an agent own part of the sales motion first, and what would the human role become?"
- "Should we raise prices?" -> "Should the AI-native version of your offer change what you sell and how you price the AI capability itself?"
- "Should we move upmarket?" -> "What would the AI-native version of your product need to be to win upmarket?"

Honesty floor (from the kit work, carried over): the engine never fabricates evidence, always shows where a call holds and where it breaks, and confidence tracks the evidence.

---

## 1. The AI-native business decision (the decision model)

Every decision is a **move** somewhere in the lifecycle, weighed on the **dimensions**. The decision engine, the news, and the nudges all map to this model so the whole app speaks one language.

### 1.1 The lifecycle (where a decision lives)
- **Build** - what to build *with* AI inside the business (internal workflows, tools, agents). [the Vibe Coding kit lives here]
- **Orchestrate** - how AI and people are wired together: the agentic org, handoffs, the autonomy line (AI runs it / AI assists you approve the handoff / you only). [the Agentic Org Chart kit lives here]
- **Productize** - turning AI capability into the offering: the AI-native version of what you sell.
- **Go-to-market** - how that AI-native product reaches customers: positioning, distribution, pricing of the AI offering itself.
- **Substrate: Memory & Identity** - the operating layer underneath: the AI knowing you and the business (knowledge, voice, guardrails). [the Memory & Identity kit lives here]

### 1.2 The dimensions (how any AI-native decision is weighed)
Capability fit (can the AI actually do this yet) | Economics (cost to build + run vs value) | Autonomy & risk (how much AI can own, where the human checkpoint is, the failure surface) | Build vs buy (your build vs a vendor/model, lock-in vs portability) | Org readiness (the skills/structure to run it) | Sequencing (is this the right next move, or does something come first).

The engine: ground the move in evidence, score it across these dimensions, show where it holds and where it breaks, always AI-native.

---

## 2. News for an AI-native leader

### 2.1 The categories
What changed in the world that affects how you build/run an AI-native business. These are the locked categories (a leader can mute/boost each):
1. **Model & capability shifts** - new models, modalities, context windows, deprecations. What you can now build.
2. **AI economics** - API/token/compute price moves, the cost to run agents and workflows. (The AI-specific "pricing".)
3. **Tools, platforms & vendors** - the build/orchestrate stack: agent frameworks, dev tools, infra, who shipped what, lock-in.
4. **Orchestration & agent reliability** - multi-agent patterns, evals, MCP/interop standards, autonomy and guardrails.
5. **AI-native product & go-to-market** - how businesses package, sell, and price AI offerings; distribution patterns.
6. **Governance, safety & compliance** - what you are allowed to deploy: AI regulation, data/privacy, model governance.
7. **Security & agent risk** - prompt injection, data leakage, agent misuse: the AI threat surface.
8. **Org, talent & ways of working** - the AI-native org: roles, agentic structure, the skills that change.
9. **Proof & adoption** - what is actually shipping and working in your sector vs hype (real deployments, ROI).

Every headline is tagged to exactly one category, and every headline must pass the AI-native test: if it is not about deploying/building/selling AI, it does not belong in the deck (or it is reframed to the AI-native angle of the story).

### 2.2 The visual (one branded image per category)
Each category gets ONE generated, app-style image (dark instrument palette, emerald `#00D9B6`, calm, abstract, no stock photos), used as the headline visual for any story in that category. The motif per category (for the image generation brief):
- Model & capability -> a glowing core / capability dial
- AI economics -> a cost curve / meter
- Tools & vendors -> a connector lattice / stack
- Orchestration -> an agent mesh / node graph
- Product & GTM -> a packaged launch motif
- Governance -> a shield / seal
- Security & risk -> a lock / fracture
- Org & talent -> an org-node / people graph
- Proof & adoption -> a signal / proof chart

The headline card is rebuilt to feel like a real news headline: the category image as the hero visual, the headline, the source, a category chip, and (for own-signal items) the magnitude. Today they are text-only with a placeholder `HeroSparkline` (`src/components/cockpit/CockpitDeck.tsx`); `DeckCard` already carries an unused `category` field (`src/types/cockpit.ts`) and the briefing pipeline does not populate categories or images yet. So this is: populate the category on the pipeline, generate the 9 images, render them as real headline visuals.

---

## 3. Universal rules for every main surface

- **No-scroll on ALL devices.** Every authenticated surface fits the viewport with no page scroll, desktop and mobile. The audit found Briefing, Decision, Compliance, the Edge view, Settings tabs, and the mobile dashboards currently scroll and stack. They get the kit treatment.
- **One ask per screen.** At any point a surface presents exactly one decision/action. Multi-state, multi-ask pages become sequential one-action steps (the kit wizard pattern), or a single focused view with depth one tap away.
- **AI-native, never general** (section 0). Applies to copy, examples, the decision engine, the news, and the nudges.
- **Approachable, first-timer language.** The voice is calm, warm, and assumes nothing. No insider jargon presented cold ("Memory Web", "pressure-test", "your world", "mines yours"), no language that assumes the user is a heavy user, no arrogance. Sharp writing, kind tone. No em dashes. Explain a concept the first time it appears, then trust it.
- **Honesty in the renderer** (carried from the kit): the quiet/empty/cold-start state is the default state and must feel intentional and welcoming, not broken.

### 3.1 Language rewrite targets (from the audit, concrete)
These real strings are presumptive/arrogant and get rewritten warm + AI-native (keep the AI-native edge, do not make them generically soft):
- `CockpitDeck.tsx:89` "Your deck fills as CTRL watches your world and the market."
- `CockpitHome.tsx:95` "A few things worth a look today."
- `CockpitHome.tsx:123` "Tell CTRL what you are weighing. It shows you where it holds and where it breaks."
- `BriefingPage.tsx:256/259/266` "Tell us about yourself first" / "Pick 3 topics ... in your voice" / "Pick 3 interests now"
- `Dashboard.tsx:109` "Set up your context in about 2 minutes - or explore first."
- `MemoryCenter.tsx:249` "Everything your AI knows about you"
- `AutomatorScaffold.tsx:139` "One you already do over and over. CTRL mines yours from your Memory Web."
- `Try.tsx:56` / `ClarityHome.tsx:50` "pressure-test"
- `BusinessContextStep.tsx:83` "Tell us about your work"
- `automatorModel.ts:524` "Things you know that you turn into the output"

---

## 4. Per-surface plan (current state -> target)

Built one at a time, mock-driven, after this spec is locked. Order in section 5.

- **Briefing** (`BriefingPage.tsx`, scrolls on mobile + inner-scrolls desktop): rebuild to a no-scroll, one-ask flow. The news deck uses the category visuals (section 2). Interests selection becomes one calm step. Every topic is an AI-native category, never generic interests. This is the natural first surface (it carries the news work).
- **Decision** (`DecisionPage.tsx`, scrolls desktop + mobile): re-scope to the AI-native decision model (section 1) including the reframe rule; rebuild to no-scroll one-ask. Update the seed examples (kill the general-business ones), the decompose/advise prompts (`supabase/functions/decision-engine/*`), and `DECISION_EXAMPLES` (`decision-views.tsx`).
- **Cockpit / Dashboard** (`Dashboard.tsx`, mobile dashboard scrolls): the home deck + value actions on one no-scroll screen; the onboarding banner reframed warm.
- **Brain / Memory** (`MemoryCenter.tsx` + `MemoryWebVisualization.tsx`): PENDING VISUAL VERIFICATION. The code audit reports `useZoomPan` (pinch/zoom/pan) and a `preserveAspectRatio` SVG that "should not squash", which contradicts the founder seeing it squash left and not pinch. Before any fix: render the real brain on real viewports (desktop + phone) and capture what the founder sees. Then fix the actual layout (suspected: the canvas not filling its flex parent, or the right-rail bond reader stealing width), wire/repair zoom on the surface in use, and raise interactivity.
- **Compliance** (`Compliance.tsx`, scrolls): no-scroll one-ask; keep it honest (no overclaiming, per the prior compliance de-claw).
- **Settings** (`Settings.tsx`, tab scroll): acceptable as a settings surface, but each tab should not stack asks; light pass.
- **Automator / Context** (`AutomatorScaffold.tsx`): language rewrite + confirm it stays AI-native (build a deliverable with AI), one-ask discipline.

---

## 5. Build sequence

1. **This spec** (strategy) - lock it.
2. **Generate the 9 category images** + wire the news pipeline to tag categories, and rebuild the headline card with the visual. (Surface: Briefing/Cockpit deck.) **DONE.** Categories are now tagged server-side: the Home `live-headlines` pipeline gathers across four free sources (GDELT + Hacker News + a curated RSS allowlist + Brave), cross-verifies by clustering near-duplicate headlines across sources (the distinct-source count is the corroboration/trust signal), AI-native-filters + tags each story to one of the nine categories (`_shared/news-ai-native.ts`), ranks by `corroboration x reputation x freshness x engagement`, balances across the nine lanes, and writes a grounded "why it matters" line. The `NewsHeadlineCard` renders the branded `CategoryMotif` + a `corroboration` chip ("+2 sources"). Cached daily in `live_headlines_cache`, pre-warmed by the `live-headlines-prewarm` pg_cron job. No new API keys needed. (See CLAUDE.md "Home live-headlines pipeline" + `_shared/news-{sources,cluster,synthesis}.ts`.)
3. **Decision engine AI-native re-scope** (prompts + examples + reframe) + the Decision surface no-scroll one-ask rebuild.
4. **Cockpit/Dashboard** no-scroll one-ask + language.
5. **Brain**: visual-verify first, then fix layout + zoom + interactivity.
6. **Compliance / Settings / Automator** passes.
7. **App-wide language sweep** of the section 3.1 strings (can run alongside each surface).

Each surface: lock the rule, mock it (a `/preview` fixture or the live surface), founder reacts, build, verify (CI + a real render at mobile and desktop), ship via PR, then the next. The same bar as the kit.

---

## 6. Open decisions for the founder

1. **Surface order**: section 5 leads with the news/Briefing work (it carries the visuals you asked for). Confirm, or name a different first surface.
2. **News category set**: section 2.1 lists 9. Confirm the set, or merge/cut (e.g., fold Security into Governance for a tighter 8).
3. **Image generation**: I will generate the 9 category images in the app style. Confirm I should generate them directly (vs you providing art direction or assets first).
