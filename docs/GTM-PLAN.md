# CTRL — Go-To-Market Plan

> **The promise, in one line:** *"You can't see through your own business. I help you see one step clearer — today."*
> CTRL is a clarity engine for leaders making AI-era decisions — and now it is genuinely **agent-native**: a leader's own AI agents pull their live, brain-ranked context on every call through a read-only Memory Web MCP server. *Agents read who you are without visiting your site like a person.*

*This plan is grounded in `CTRL-CORPUS.md` (positioning), `BUILD-CHRONICLE.md` (what the app actually does, end to end), `BUILD-PARTNER-PLAYBOOK.md` (design DNA / voice), and `mm-ctrl/CLAUDE.md` (architecture). Production URL: `ctrl.themindmaker.ai`. Throughout, I mark **[ESTABLISHED]** (taken from the corpus / shipped code) vs **[RECOMMENDATION]** (my GTM call, founder sign-off welcome). Brand/positioning forks that genuinely need the founder are flagged **[FOUNDER SIGN-OFF]**.*

*(updated 2026-06-17): the app is now **globally forced dark** on the `ctrl-ds` instrument palette, with the emerald **"ctrl." wordmark** replacing the old green Mindmaker logo everywhere. This shipped live via PR #186 (merge `1c01db5`, 2026-06-16, prod-verified), alongside the prerendered marketing homepage + SEO routes (PR #185 prerender, PR #186 homepage). Every brand/visual spec below has been flipped from the old light-mode template to this shipped forced-dark emerald instrument look.*

*Voice rule carried from the build (`CLAUDE.md` + Playbook): **no em dashes in copy - use hyphens, semicolons, or parentheses. Voice in substance, precision in chrome.** Every button/label names its exact function plainly; personality lives only in synthesized content. Forced-dark instrument design: dark canvas, emerald `#00D9B6` accents (`--primary 171 100% 43%`), the emerald "ctrl." wordmark. Honesty enforced in the renderer, never faked in copy.*

---

## 0. The TL;DR (build-first ordering)

If only three things ship, ship these — they are the sharpest, most on-thesis, lowest-effort-to-impact moves:

1. **The pre-login "Pressure-test a decision" magic moment** (§4). The product's single most quotable behaviour (a decision arguing with itself, ending on "only you can answer this") shown *before* signup, on a real input the visitor types. This is the wedge that makes the homepage convert.
2. **The agent-native narrative play + `llms.txt`/agent docs + provisioning endpoint** (§6, §7). CTRL is one of the few products that is *actually* agent-native today (Phase 7 shipped). Lean into it hard: make the docs agent-readable, let an agent sign a user up, and run "agents read who you are without visiting your site like a person" as the category-defining story. Almost nobody else can say this truthfully.
3. **The one-click branded social-post generator** (§5), seeded first on the highest-emotion moment: *"My agents now read my live context."* Dynamic OG image via a serverless route; share targets X / LinkedIn. Turns every Edge-Pro activation into distribution.

The marketing homepage + prerendered SEO routes already shipped (PR #185 prerender, PR #186 homepage). Everything else (deeper SEO, docs depth, referral loops) compounds behind the three moves above.

---

## 1. Positioning recap

### 1.1 The promise [ESTABLISHED]
**Turn a leader's chaos into one clear step they can take with conviction.** Not a dashboard, not an oracle, not a content factory. A clarity engine. The felt promise after a few weeks: *"I have a sharper edge, and I can see what to do next."* Positioning line: **the anti-consultant** — where a transformation programme gives you a plan you can't afford and won't finish, CTRL gives you repeated small clarity, one clearer step at a time.

### 1.2 The ICP [ESTABLISHED]
The **"Accountable Delegator"**: a time-poor senior leader (founder / CEO / functional exec) running a business that has become a spaghetti they can no longer see through. Accountable for outcomes, forced to delegate more than ever, now delegating to a second species of worker — AI — that they don't yet know how to govern. Barely reads the news. No time and no budget for a two-year transformation. Scarcest resources are **attention and clarity, not information**.

**[RECOMMENDATION] GTM segmentation of that ICP into three reachable beachheads:**
- **Beachhead A — AI-native founders / solo-and-small-team CEOs.** Already run their company through ChatGPT/Claude; feel the "amnesia tax" daily; will immediately *get* the MCP angle. Reachable on X, in AI-builder communities, via the agent-native story. **Lowest CAC, sharpest fit — lead here.**
- **Beachhead B — Functional execs at scaling companies** (Head of Product, COO, VP) making build/buy/wait calls on AI. Reachable via LinkedIn, decision-quality and "agentic org chart" content.
- **Beachhead C — Fractional execs / advisors / consultants** who make AI-era calls for multiple clients and would love a portable, owned context brain per engagement. Natural referral spreaders.

### 1.3 The core value & the wedge [ESTABLISHED + RECOMMENDATION]
- **Core value [ESTABLISHED]:** earned conviction, not borrowed certainty. CTRL decomposes a decision into typed, falsifiable claims, verifies them against the live web, red-teams across a model panel, carries calibrated confidence bands and the counter-case, then hands the call back. It clarifies; it never recommends from a thin signal. The leader is always the decider.
- **The compounding moat [ESTABLISHED]:** owned, portable, temperature-tiered context that gets *cheaper and sharper every week* while a chatbot restarts from zero every Monday (the "Amnesia Tax" flipped into "the one AI investment that gets cheaper every week").
- **The wedge [ESTABLISHED is the Kit; RECOMMENDATION is the agent-native wedge]:** the corpus names **the Kit** (practitioner "help me get better at using AI") as the cohort-facing wedge and data engine. This shipped as the **4-kit program** (incl. the Agentic Org Chart kit, PRs #190/#191, parity retrofit #192, plus the #193 cascade-bug fix + honesty floor that stopped the intake silently dropping the back half of every cascade). **My GTM recommendation: run a *second, sharper* wedge in parallel - the agent-native Memory Web MCP server.** It is a genuinely novel, demonstrable, founder-flavoured hook ("your agents read your live context") that no prompt-wrapper competitor can truthfully claim. The Kit is the *habit/data* wedge; the MCP server is the *narrative/virality* wedge. They share one spine (Identity · Memory · Self-Correction).

### 1.4 What CTRL is NOT (load-bearing for messaging) [ESTABLISHED]
Not a content factory · not a catch-all decision tool · not an operator (chief of staff, not chief operating officer) · not a transformation programme · not magic the data can't back. **These belong on the site as explicit "what CTRL isn't" copy** — the honesty is itself the differentiator and the founder's stated stance.

### 1.5 The one-sentence category claim [RECOMMENDATION / FOUNDER SIGN-OFF]
*"CTRL is the owned context brain for AI-era leaders — it sharpens your decisions and feeds your agents the live, ranked picture of who you are and what you're betting on."* Founder to confirm whether we lead with **clarity engine** (the established North Star) or **owned context brain / agent-native** (the sharper 2026 wedge) as the *primary* H1. My recommendation: **clarity engine as the emotional promise, agent-native as the proof and the wedge** (see homepage §3).

---

## 2. SEO strategy

### 2.1 Reality check [RECOMMENDATION]
CTRL is a niche, high-ACV-feel, low-volume-keyword product. SEO is **not** the primary acquisition channel (that's the agent-native narrative + founder-led distribution, §7). SEO's job here is **(a) capture high-intent bottom-funnel searches, (b) own the emerging agent-native / MCP terms before they get competitive, and (c) be a credible, fast, schema-rich surface that LLMs cite** — increasingly the real "SEO" for this audience. Treat **LLM/answer-engine optimisation (AEO) as co-equal with classic SEO.**

### 2.2 Target keywords & search intents
**Tier 1 — buy/solution intent (convert):**
- "AI decision-making tool for leaders / executives"
- "pressure test a decision" / "decision pressure testing tool"
- "build vs buy AI tool" / "build vs buy decision framework AI"
- "second brain for CEOs" / "AI context that remembers me"
- "alternative to AI consultant / AI transformation programme"

**Tier 2 — agent-native / category-owning (own early, low competition) [RECOMMENDATION — highest-leverage SEO bet]:**
- "MCP server for my own context" / "personal context MCP server"
- "give my AI agent my company context" / "stop pasting context into ChatGPT"
- "agent-readable company profile" / "llms.txt for a person/company"
- "live context for AI agents" / "memory web MCP"
- "fix AI amnesia" / "AI that gets cheaper every week"

**Tier 3 — top-funnel thought-leadership (authority + LLM citation):**
- "agentic org chart" · "operator to governor" · "amnesia tax AI" · "reclaim amplify re-architect" · "how leaders should govern AI" · "AI-native leadership". These map directly onto the founder's existing decks (corpus §12) — *the content already exists as thinking; SEO just publishes it.*

### 2.3 Page / URL structure [RECOMMENDATION]
Keep the app at the root; put marketing/SEO under clean, flat, indexable routes. Because the app is a Vite SPA (CLAUDE.md), **the marketing + docs surfaces must be statically pre-rendered or moved to an edge-rendered/SSG path** so crawlers and LLM fetchers get real HTML (see §2.5).

```
/                         Homepage (hero promise + magic moment + agent-native proof)
/pressure-test            Public interactive magic moment (also a landing page) [§4]
/agents                   The agent-native story page ("agents read who you are…") [§7]
/how-it-works             The Clarity Loop: digest → reflect → navigate → bank
/why-it-cant-be-copied    The moat (owned context, methodology, verification, self-correction)
/what-ctrl-isnt           The honesty page (anti-positioning) — strong LLM-citation magnet
/pricing                  Plans incl. Edge Pro (the MCP gate) — human + machine readable
/kit                      The Kit wedge (the shipped 4-kit program; skills that train your own AI tools)
/blog/...                 Thought-leadership (Tier 3 keywords; founder decks → posts)
/docs/...                 Public docs incl. agent-readable docs + MCP quickstart [§6]
/compare/ctrl-vs-...      Comparison pages (vs generic chatbot / vs consultant) [later]
```
- Slugs: lowercase, hyphenated, keyword-bearing, stable. One H1 per page, matching the primary intent.
- Internal linking: every blog post links to `/pressure-test` (the magic moment) and the relevant pillar page; pillar pages link to `/pricing`.

### 2.4 Content plan (prioritised)
**Wave 1 (launch — 6 pieces, all already-written thinking):**
1. *"The Amnesia Tax: why your most expensive employee starts every Monday from zero"* → "fix AI amnesia", links to `/agents`.
2. *"Give your AI agents your live context with one MCP server (here's how)"* → owns the agent-native cluster; technical + demo; links to `/docs` and `/pricing`.
3. *"Build vs buy on AI: the 8 considerations most leaders skip"* → maps to the Decision Map; ends in `/pressure-test`.
4. *"Operator to Governor: the org chart when agents do the work"* → agentic-org deck; authority piece.
5. *"Earned conviction, not borrowed certainty: how to pressure-test a decision"* → the methodology, demoed live.
6. *"What CTRL deliberately won't do"* → the anti-positioning page as a post; unusually citable by LLMs.

**Wave 2 (cadence — 1/week):** a "Decision teardown" series (a real AI-era decision decomposed into Holds / Contested / Thin / Assumption / Only-you stones, screenshots from `/preview` harness), each a Tier-1/2 keyword target and a social asset (§5).

**Each post ships with:** a clear takeaway in the first 100 words (LLM-extractable), a relevant JSON-LD `Article`, an OG image (auto, §5), and one in-line CTA to the magic moment.

### 2.5 Technical-SEO checklist (buildable)
> Because the app is a Vite SPA, the first task is **render real HTML to crawlers/LLMs**. [RECOMMENDATION] Pre-render the marketing + docs routes (Vite SSG plugin like `vite-react-ssg`, or move `/`, `/pressure-test`, `/agents`, `/pricing`, `/blog`, `/docs` to Vercel edge/ISR). Phase 8 already taught the cache discipline (`no-store` shell, `immutable` assets) — extend it so pre-rendered HTML is served to bots.

- [ ] **Titles** — unique, ≤60 chars, primary keyword first. e.g. Home: `CTRL — See your business one step clearer, today`. `/agents`: `CTRL — Your AI agents, reading your live context`.
- [ ] **Meta descriptions** — ≤155 chars, benefit + soft CTA. Home: `A clarity engine for AI-era leaders. Pressure-test a decision in 60 seconds, and let your own agents read your live context. Try it free.`
- [ ] **Canonical tags** on every page; self-referencing. Strip query-string variants (`?view=edge` etc. must `noindex` or canonicalise to the clean app route).
- [ ] **robots.txt** — allow crawl of marketing/docs; `Disallow:` the authed app routes (`/dashboard`, `/memory`, `/decision`, `/settings`, `/profile`, etc., per CLAUDE.md) so private surfaces don't get indexed; reference the sitemap; **explicitly allow LLM crawlers** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) on marketing/docs — we *want* to be cited.
- [ ] **sitemap.xml** — generated at build for all public marketing/blog/docs URLs; `lastmod` accurate; submitted to Google Search Console + Bing.
- [ ] **Open Graph** — `og:title`, `og:description`, `og:image` (1200×630, auto-generated §5), `og:url`, `og:type`, `og:site_name=CTRL`. Per-page, not global defaults.
- [ ] **Twitter/X cards** — `twitter:card=summary_large_image`, `twitter:title/description/image`, `twitter:site`. Validate in the X card validator.
- [ ] **JSON-LD schema:**
  - `Organization` / `Brand` (CTRL, logo, sameAs socials) site-wide.
  - `SoftwareApplication` on `/` and `/pricing` (applicationCategory: BusinessApplication; `offers` with the Edge Pro price).
  - `Product` + `Offer` on `/pricing`.
  - `FAQPage` on `/how-it-works`, `/agents`, `/pricing` (great for both rich results and LLM answers).
  - `Article` + `author` on every blog post.
  - `BreadcrumbList` on docs/blog.
  - `WebSite` + `SearchAction` site-wide.
- [ ] **Core Web Vitals** — pre-rendered HTML, deferred JS hydration, the `no-store` shell + `immutable` hashed assets already in place (Phase 8). Lighthouse ≥90 on marketing routes.
- [ ] **Accessibility / semantics** — real `<h1>`/`<h2>`, `<main>`, `<nav>`, alt text (also feeds OG/LLM understanding).
- [ ] **`llms.txt` at the root** (`/llms.txt`) — see §6; this is the AEO keystone.

---

## 3. Homepage spec (all devices)

**Governing rule [ESTABLISHED]:** clearest-unit-first, honesty in the renderer, voice-in-substance/precision-in-chrome, forced-dark instrument palette (dark canvas, emerald `#00D9B6`), no em dashes. The homepage must *show* the product behaving, not describe it - the corpus's whole thesis is "the method is the product."

### 3.1 Hero — promise + subhead + the live demo
The hero is **not** a static screenshot. It embeds (or links one tap to) the **pre-login magic moment** (§4). Left: promise + CTA. Right (desktop) / below (mobile): the live "pressure-test a decision" surface.

**Draft hero-copy options (pick one — [FOUNDER SIGN-OFF] on which voice leads):**

> **Option A — the clarity promise (closest to the established North Star):**
> **H1:** See your business one step clearer. Today.
> **Sub:** You can't see through your own business. CTRL turns the chaos into one sharp, evidence-checked next step — and hands the call back to you. Not a consultant. Not a chatbot. A clarity engine.
> **CTA:** Pressure-test a real decision (60 seconds, no signup)

> **Option B — the agent-native wedge (sharpest 2026 differentiator):**
> **H1:** Your agents should read who you are. Live.
> **Sub:** Stop pasting context into ChatGPT every Monday. CTRL builds an owned, ranked brain of your business and decisions, then serves it to your own AI agents on every call. The one AI investment that gets cheaper every week.
> **CTA:** Watch your context assemble (no signup)

> **Option C — earned conviction (the methodology):**
> **H1:** Earned conviction, not borrowed certainty.
> **Sub:** CTRL breaks your decision into checkable claims, tests them against the live web, argues against itself, and shows you the confidence and the counter-case. Then you decide. Try it on a real call now.
> **CTA:** Pressure-test a decision

**[RECOMMENDATION]:** lead with **A** as H1 (broadest emotional resonance for the ICP), carry **B** as the hero's secondary band / the `/agents` page H1, and use **C**'s mechanics inside the demo. A/B test A vs B on Beachhead A traffic.

### 3.2 Full section structure (top → bottom)
1. **Hero** (above) — promise, sub, CTA, live magic-moment.
2. **The proof / demo** — the magic moment expanded: type a decision → watch it decompose into stones (Holds / Contested / Thin / Assumption / **Only you can answer this**) with confidence bands and live-web receipts. The "only you can answer this" stone is the single most quotable visual (Build Chronicle); feature it.
3. **The agent-native band** — *"Then your agents read it too."* Animated: a code/agent call to the MCP endpoint returning live, brain-ranked context. Tagline: *agents read who you are without visiting your site like a person.* One-line code snippet + "How it works" link. **This is the differentiator no competitor can honestly show.**
4. **How it works (the Clarity Loop)** — Digest → Reflect → Navigate → Bank, four calm tiles.
5. **Why it can't be copied (the moat)** — four compounding factors as four cards: owned context · encoded methodology · synthesis+verification · self-correction. Frame: "a prompt wrapper can fake one, struggle with two, never wire all four."
6. **What CTRL isn't** — the honesty band (not a content factory / oracle / operator / transformation programme). Disarming, on-brand, citation-bait.
7. **Social proof** — see §3.3.
8. **The Kit (secondary wedge)** - "Get sharper at using AI, this week" - the shipped 4-kit program (incl. the Agentic Org Chart kit); small daily wins; soft entry for Beachhead A.
9. **Pricing teaser** — free clarity loop; Edge Pro unlocks the MCP server + deeper decision engine. Link to `/pricing`.
10. **Final CTA** — repeat the magic moment ("Pressure-test a decision") + a quiet "or let your agent sign you up" link (§6 provisioning).
11. **Footer** — docs, `llms.txt`, agents page, blog, compliance (honest copy per Phase 0), socials, `Organization` schema.

### 3.3 Social proof [RECOMMENDATION — honesty-gated]
Per the corpus's anti-vanity / honesty laws, **do not fabricate logos or testimonials.** At launch, lead with *credible-by-substance* proof instead:
- The founder's own use ("built and used by an AI-native operator") — the Build Chronicle is itself proof of taste.
- A **live, real artifact**: the actual `/pressure-test` output on a topical decision, dated.
- **"Receipts you can audit"** — show the verification trail ("because you're tracking Anthropic · 0.71") as proof of mechanism, not a claim.
- As real users land: founder quotes, then a quiet "trusted by N AI-native leaders" counter (only once N is real). Replace placeholder proof the moment authentic proof exists.

### 3.4 Layout notes
**Desktop (command-centre feel, per Law 9):** two-column hero (copy left, live demo right); generous breathing room; sticky slim top nav (emerald "ctrl." wordmark · How it works · Agents · Pricing · Docs · "Try it"); the moat as a 4-up card row; max-width ~1200px, dark instrument canvas, raised dark cards, light type with emerald `#00D9B6` accents.
**Mobile (consume + capture, fixed-frame discipline):** single column; hero promise first, CTA immediately tappable, the magic-moment demo as a full-width card the user can run one-handed; sections stack; **no horizontal scroll, no cramped truncation** (content-contract law); bottom-anchored persistent "Pressure-test a decision" CTA. Honor the fixed-frame calm: it's a cockpit, not a feed.
**Both:** every soft number kind-marked (`est.`/`modelled`/`your call`); animations respect reduced-motion; the magic moment degrades gracefully to a pre-rendered example if JS/back-end is slow (data-realism: "nothing worth your time" beats invented filler).

---

## 4. Pre-login MAGIC MOMENT

### 4.1 The concept [RECOMMENDATION]
**"Pressure-test a real decision" — live, before signup.** The visitor types (or picks from 3 seeded examples) a real AI-era decision they're facing, e.g. *"Should we build our own internal AI tool or buy one?"* CTRL then, in front of them:
1. **Decomposes** it into 4-8 typed consideration "stones" (the Decision Map, Phase 4).
2. **Checks** the web-verifiable ones live, rendering verdict chips (Holds / Contested / Thin / Assumption) with confidence bands and a real receipt ("matched: vendor pricing · 0.71").
3. **Refuses to decide** the unverifiable ones — renders the **"Only you can answer this"** neutral stone (the cardinal honesty rule, physically un-renderable as a web verdict).
4. **Hands the call back:** "Here's the sharpened map. The decision is yours. Want CTRL to remember this and watch the assumptions that could change it? → Sign up free."

A **second, lighter variant** for Beachhead A: **"Watch your AI context assemble"** — visitor pastes a few facts about their business (or a non-sensitive reply from an AI tool they already use, per Law 5), and CTRL renders the memory web building + ranking in real time, then shows the **cold-vs-loaded gap** (the same answer with vs without their context). Ends on: *"This is what your agents would read on every call."* → links to `/agents` + signup.

### 4.2 Is it worth building? **Yes — highest priority.** [RECOMMENDATION]
- It *is* the product's thesis ("the method is the product"; "show, don't claim"). A described clarity engine is forgettable; a clarity engine that sharpens *your* decision in 60 seconds is a memory.
- It converts: the visitor has already felt value before the signup ask — the ideal SaaS activation pattern, and it doubles as a standalone landing page (`/pressure-test`) and an ad destination.
- It is the natural share artifact (§5) and the SEO/AEO magnet.
- The hard parts already exist (decision engine, decision map, `/preview` harness proves the surfaces render). The new work is a **demo-mode wrapper**, not new intelligence.

### 4.3 Build approach [RECOMMENDATION]
- **Reuse, don't rebuild:** the `decision-engine` pipeline (decompose → verify → cross-examine → advise) and the Decision Map stones already exist (CLAUDE.md, Build Chronicle Phase 4). Build a **public, unauthenticated edge function `decision-demo`** that runs a *capped, sandboxed* version: limited claims, a short web-verify budget (reuse the 12s briefing cap pattern), no persistence, no user context (so no auth/PII surface).
- **Abuse / cost control:** rate-limit by IP + a lightweight challenge; cap tokens hard; cache the 3 seeded example results so most visitors get an instant, free, pre-computed run and only "type your own" spends. (Mirrors Phase 0's cross-item cost-runaway lesson — gate the spend.)
- **Frontend:** reuse the Decision Map presentational components from `/preview`; stream stages with the existing poll-the-stage pattern; render `animated={false}`-safe so it screenshots for OG (§5).
- **Graceful degradation (data-realism):** if the live verify budget returns thin, show the honest "thin / only-you" states — never invent a verdict. A sparse result still demonstrates the honesty mechanism, which is itself the pitch.
- **Conversion hook:** the result page's only persistent CTA is "Save this to your brain (free)" → signup → the decision is waiting in their account (Phase 1 memory write). Zero-loss handoff.

---

## 5. Social share + branded one-click social-post generator

### 5.1 The feature [RECOMMENDATION]
A **"Share this"** affordance on the three highest-emotion in-app moments, producing a **branded image card + pre-written post** in one click:
- **A sharpened decision** — "I just pressure-tested *[decision]*. 6 considerations, 2 contested, 1 only-I-can-answer." (the Decision Map summarised, with verdict chips).
- **A calibration win** (Track Record / "did this play out?") — "My gut vs the ground: I was right on 4 of 5 this month." (honesty-gated: only renders real calibration).
- **The agent-native flex** — *"My AI agents now read my live context on every call."* + the MCP "agents read who you are" tagline. **This is the most viral seed — lead with it** (it's novel, status-y, and on-thesis for Beachhead A).

Each share is **CTRL-branded** (the emerald "ctrl." wordmark, a dark instrument card with emerald `#00D9B6` accents, the promise line in the footer of the image) so the post itself is an ad.

### 5.2 Share targets
X (primary, Beachhead A), LinkedIn (Beachheads B/C), copy-link, download-image. Pre-filled post text (editable, em-dash-free, voice-in-substance), the image, and a UTM-tagged link back to `/pressure-test` or `/agents`. Attribution wired through the existing `track-event` proxy (CLAUDE.md) so we measure which seed drives signups.

### 5.3 The image-card template [RECOMMENDATION]
One governed template family (content-contract discipline — the AI/data fills a fixed mould, never freestyle):
- 1200×630 (OG/X/LinkedIn).
- Dark instrument canvas, raised dark inner card, light type with emerald `#00D9B6` accents, the emerald "ctrl." wordmark top-left, promise line bottom.
- A single hero unit (clearest-unit-first): the decision title + up to 3 verdict chips, OR the calibration number (`est.`/real kind-marked), OR the agent-native line.
- Robust to any content: title wraps/clamps, chips hug, long tokens break (the exact stress-gallery rules from the build).

### 5.4 Build approach — **dynamic OG image via a serverless route.** [RECOMMENDATION]
- **Recommended: server-rendered dynamic OG image** (Vercel OG / Satori-style `@vercel/og`, or an edge function rendering an SVG→PNG). Deterministic, fast, no client canvas quirks, and the same URL doubles as the page's `og:image` so the unfurl on X/LinkedIn *is* the branded card. e.g. `/og/decision?title=...&chips=holds,contested,onlyyou` → PNG.
- Why not client `<canvas>`: font/CSS/retina inconsistency, and it can't be the OG unfurl. Why not a heavy headless-Chrome screenshotter: slower, costlier; Satori covers these layouts.
- **Honesty gate (non-negotiable, per the corpus):** the generator can only render numbers/claims the user actually has. Calibration share is disabled until real Track-Record data exists; the decision share renders only real verdict chips. No invented green ticks on a shareable, ever.
- Reuse the `/preview` content-contract fixtures to prove the card holds across the full inventory before launch.

---

## 6. Project documentation plan (human + agent-native)

> CTRL is genuinely agent-native (Phase 7 shipped: read-only Memory Web MCP server + briefing feed). The docs must serve **two readers: a human leader and an autonomous agent.** This is a real differentiator — most products' docs are human-only.

### 6.1 Public human-facing docs [RECOMMENDATION]
- `/docs/quickstart` — sign up → run the clarity loop → first sharpened decision.
- `/docs/clarity-loop` — Digest/Reflect/Navigate/Bank explained.
- `/docs/decision-map` — how to read stones, verdicts, confidence, "only you can answer", contest-this.
- `/docs/memory-web` — what gets captured, how to verify/edit/correct (one-tap thumbs-down), encryption (honest copy, Phase 0).
- `/docs/edge-pro` — what the paid tier unlocks (MCP server + deeper engine).
- `/docs/mcp-quickstart` — **the agent-native crown jewel:** mint a key in Settings → Edge Pro, the server URL (`.../functions/v1/mcp-context`, Streamable HTTP, MCP spec 2025-06-18), the `get_user_context` + `get_todays_briefing` tools, scopes, token lifecycle (sha256-hashed, shown once, read-only, revocable, capped at 10). Copy-paste client config for Claude Desktop / Cursor / other MCP clients.
- `/docs/security` — read-scoped, per-leader tokens, Edge-Pro-gated boundary, revocation. Honest, matches shipped behaviour.

### 6.2 Agent-readable docs + `llms.txt` + agent card [RECOMMENDATION — high leverage]
- **`/llms.txt`** (root) — the AEO keystone: a concise, plain-text map of what CTRL is, the promise, the ICP, the agent-native capability, links to the key pages and docs, and the pricing summary. Written so an LLM answering "what is CTRL / can my agent use it" gets the truth, in our words.
- **`/llms-full.txt`** — the expanded version (positioning + how-it-works + MCP details) for deeper agent ingestion.
- **Agent card / `/.well-known/`** — a machine-readable JSON describing the MCP server: endpoint, transport (Streamable HTTP), auth model (per-leader bearer token, Edge-Pro-gated), tools (`get_user_context`, `get_todays_briefing`), scopes. So an agent can *discover* CTRL's capabilities programmatically. Mirror the MCP server metadata pattern.
- **Machine-readable pricing** — `/pricing` carries `Product`/`Offer` JSON-LD *and* a structured `/pricing.json` (or in `llms.txt`) so an agent can quote the Edge-Pro price and know what unlocks the MCP server.

### 6.3 Agent provisioning endpoint ("an agent could sign a user up") [RECOMMENDATION — on-thesis, flag for scope]
A documented, rate-limited **provisioning API** so an agent acting for a leader can: create an account (email + magic-link confirm, autoconfirm off in prod), report the plan/upgrade path, and (post-payment) mint an MCP key — closing the loop where *an agent onboards its principal to CTRL*. 
- **[FOUNDER SIGN-OFF]** on scope and guardrails: this touches account creation (an "outward/irreversible" action per the Playbook autonomy contract). Recommend: ship a **read + initiate** version first (agent can *start* signup and surface the magic-link/checkout link to the human), keep the actual confirm + payment human-in-the-loop initially, then expand once abuse controls are proven. Narrative value is high even in the limited form: "CTRL is the rare product an agent can onboard you to."

### 6.4 Internal/dev docs (lower priority)
The corpus + Build Chronicle + Playbook already serve as the canonical build docs. Public-facing, keep a lean `/docs/changelog` (the honesty-in-public habit) and the MCP quickstart current.

---

## 7. "Sell itself" / out-of-the-box ideas (prioritised)

### 7.1 The agent-native narrative play (the category move) [RECOMMENDATION — do this first as story]
CTRL can *truthfully* say something almost no one else can: **"Your agents read who you are without visiting your site like a person."** Run this as the spearhead narrative:
- A founder-led **launch thread / short demo video** (the Build Chronicle Phase 7 footage already exists: mint a key, call the endpoint, get live brain-ranked context back). Real terminal, real 200, real context. This is inherently shareable to the AI-builder audience.
- Position it as a **category claim**, not a feature: "the owned context brain that feeds your agents." Pitch to AI newsletters / podcasts / the MCP ecosystem (Anthropic's MCP directory, MCP server registries) — getting listed as an MCP server is *free, high-intent distribution* to exactly Beachhead A.
- Lean into the **"Amnesia Tax" framing** as the villain ("your most expensive employee has amnesia; every Monday is its first day") — a memorable, deck-ready hook the founder already owns.

### 7.2 The interactive lead magnet [RECOMMENDATION]
`/pressure-test` (§4) *is* the lead magnet — gated value given away free, ungated. Promote it standalone: "Pressure-test your hardest AI-era decision in 60 seconds." Repurpose each public teardown (Wave 2 content) as both a blog post and a paid-social destination pointing at it. Pair with the **"Watch your context assemble + cold-vs-loaded gap"** variant for Beachhead A.

### 7.3 Virality / referral loops [RECOMMENDATION]
- **Branded share generator** (§5) as the always-on loop — every sharpened decision / agent-native flex is an ad with a UTM link home.
- **Portable brain referral** for Beachhead C (fractional execs/advisors): "bring your owned context to your next client" — natural multi-account spread; consider a referral credit on Edge Pro.
- **MCP key invites** — when a leader connects their agent, offer a one-click "share my CTRL setup" post; the novelty does the spreading.
- **"Decision teardown" as a recurring public series** — topical AI-era decisions pressure-tested in public; builds authority, ranks, and feeds the share loop.

### 7.4 Honesty-as-marketing [RECOMMENDATION]
The `/what-ctrl-isnt` page and "we refused to invent a number, so the hero leads with words" story (Phase 6) are *counter-positioning gold* in an AI market drowning in overclaim. Make CTRL's honesty a loud, repeatable brand asset ("the AI tool that tells you when it doesn't know"). LLMs and skeptical leaders both reward it.

### 7.5 Distribution channels, ranked [RECOMMENDATION]
1. **Founder-led on X / LinkedIn** — the agent-native thread + decision teardowns (lowest CAC, sharpest fit).
2. **MCP / AI-builder ecosystem listings** — MCP registries, directories, AI newsletters.
3. **The free interactive `/pressure-test`** as the universal CTA across all channels.
4. **SEO/AEO** (§2) — compounding, slower; owns the agent-native terms early.
5. **Communities** (AI-native founder/exec Slacks, fractional-exec networks) for Beachheads B/C.

---

## 8. Build-first ordering (consolidated, prioritised)

| # | Build | Why now | Effort | Reuses |
|---|-------|---------|--------|--------|
| 1 | **Public `/pressure-test` magic moment + `decision-demo` edge fn** | The conversion engine, the lead magnet, the share seed, the SEO magnet — all one build | M | decision-engine, Decision Map, /preview harness |
| 2 | **Pre-render marketing/docs + full technical-SEO/AEO pass (incl. `llms.txt`, agent card)** | Makes everything crawlable + LLM-citable; owns agent-native terms early. **SHIPPED: prerender + SEO routes live (PR #185).** Remaining: `llms.txt`, agent card, docs depth | M | Phase 8 cache discipline |
| 3 | **`/agents` page + agent-native launch thread/video** | The category differentiator; near-zero new code, Phase 7 footage exists | S | shipped MCP server |
| 4 | **Homepage build-out (hero A + agent band + moat + honesty)** | The front door; embeds #1 and #3. **SHIPPED: forced-dark emerald homepage live (PR #186).** Remaining: iterate hero copy + magic-moment embed | M | magic moment, /preview components |
| 5 | **Branded one-click social-post generator (dynamic OG route)** | Always-on virality loop; seed the agent-native flex first | M | track-event, /preview fixtures |
| 6 | **Public docs incl. `/docs/mcp-quickstart` + machine-readable pricing** | Serves human + agent readers; supports #3 | S/M | shipped MCP tools |
| 7 | **Agent provisioning endpoint (read+initiate first)** | Closes the agent-native story; FOUNDER SIGN-OFF on scope | M | auth, Stripe |
| 8 | **Blog Wave 1 (6 posts from existing decks) + Decision-teardown series** | SEO/AEO + share fuel; thinking already exists | S each | founder decks |

---

## 9. Founder sign-off register (explicit forks)

These are genuine product/brand forks — surfaced with a recommendation, not defaulted:

1. **Primary H1 voice** — clarity engine (Option A) vs agent-native (Option B) as the homepage lead. *Rec: A leads, B on `/agents` + secondary band; A/B test.*
2. **Category claim wording** (§1.5) — "clarity engine" vs "owned context brain for AI-era leaders." *Rec: emotional promise = clarity engine; proof/wedge = agent-native.*
3. **How hard to push the MCP/agent-native wedge as the *primary* GTM motion** vs the Kit. *Rec: agent-native is the narrative/virality wedge, Kit is the data/habit wedge — run both, lead distribution with agent-native.*
4. **Agent provisioning scope** (§6.3) — how far an agent may go in signing a user up (read+initiate vs full auto-onboard incl. payment). *Rec: read+initiate first; expand after abuse controls.*
5. **Pricing display on the public site** — exposing the Edge-Pro price publicly + machine-readably. *Rec: yes — agents and skeptical leaders both reward transparent pricing.*
6. **Social proof posture at launch** — substance/receipts-only until real testimonials exist (honesty law). *Rec: yes; never fabricate.*

*Everything not in this register can ship clean against the established corpus rules.*

---

*This plan inherits the build's prime directive: clarity on the rule is the work; execution is the easy bit. Each build item above should be locked rule-first (what it claims, the honesty gate, the empty state), built against the `/preview` content-contract floor, verified end-to-end, and shipped behind a flag. The agent-native angle is the sharpest, most defensible, most on-thesis wedge CTRL has — lead with it.*
