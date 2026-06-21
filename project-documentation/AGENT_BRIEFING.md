# CTRL Agent Briefing
**For Mindmaker OS fleet agents: sell, market, and represent CTRL with zero extra context. Read this first.**

**Last reconciled:** 2026-06-21 (AI-native reconciliation pass).
**Canonical sources:** `docs/MAIN-APP-POLISH-SPEC.md`, `docs/KIT-REDESIGN-SPEC.md`, the root `README.md`. Trust those over this file where they disagree.

> Reconciliation note: CTRL's positioning moved from "clarity / portable AI double for leaders" to **building the AI-native version of your business.** This briefing has been reframed to the AI-native lens. The product mechanics are real and in the code; the FRAMING is what changed. Where a precise AI-native ICP / message / price was not yet settled, it is flagged `TODO(founder)` instead of invented. The old runtime endpoint `https://ctrl.themindmaker.ai/.well-known/product.json` (dated 2026-05-30) still carries the OLD positioning, so do NOT treat it as authoritative for positioning until it is regenerated. TODO(founder): regenerate `/.well-known/product.json` to the AI-native positioning.

---

## 1. Positioning (LOCKED)

**What CTRL is:** the tool for leaders building, orchestrating, productizing, and getting to market **the AI-native version of their business.**

**What CTRL is not:** a general business advisor; a generic "clarity for leaders" or "decision speed" product; a ChatGPT wrapper.

**The reframe rule (the heart of the positioning):** general-business inputs are never refused and never answered as-is. They are reframed into the AI-native version of the decision and the leader is pulled there.
- "Should I hire a VP of Sales?" -> "Before you hire, should an agent own part of that motion first, and what does the human role become?"
- "Should we raise prices?" -> "Should the AI-native version of your offer change what you sell and how you price the AI capability itself?"
- "Should we move upmarket?" -> "What would the AI-native version of your product need to be to win upmarket?"

**One-liner (working):** CTRL helps a leader build, orchestrate, productize, and take to market the AI-native version of their business. TODO(founder): lock the final public one-liner and tagline (the old "Your context. Every AI. One click." is retired).

---

## 2. ICP: who CTRL is built for

> Reconciliation note: the firmographic ICP below (senior leaders at 50-5,000-person companies already using AI) is carried from the prior positioning and is still a reasonable starting frame, but it was written for "portable context", not "build the AI-native business". TODO(founder): confirm whether the AI-native positioning narrows or shifts the ICP (for example, toward leaders actively trying to make their business AI-native, founders productizing AI, operators standing up an agentic org). Do not invent a new ICP in outbound; use this frame and the AI-native qualifiers.

### Primary buyer (carried frame, pending founder confirmation)

| Dimension | Detail |
|---|---|
| **Titles** | CEO, COO, CFO, CTO, VPs, Senior Directors, Founders |
| **Company size** | 50-5,000 employees. Sweet spot: 100-1,000. |
| **Geography** | English-speaking markets priority |
| **AI usage** | Already using at least one AI tool. Not starting from zero. |

### AI-native fit signals (lead with these)
- "I know my business needs to become AI-native and I do not know where to start."
- "I want an agent to own part of a workflow, but I cannot see which part is safe to hand off."
- "I am trying to figure out the AI-native version of what we sell."
- "My competitors are moving faster because they are building with AI, not just buying it."

### Who is NOT a fit
- Leaders who want general business strategy with no AI-native angle (CTRL reframes, it does not advise generally).
- Technical AI implementation roles wanting build tooling (CTRL is for the leader directing the AI-native shift, not the engineer).
- Leaders who do not use any AI tools at all yet.
- Buyers requiring deep Slack/email/calendar/CRM integrations (CTRL is deliberately self-contained).

---

## 3. The two halves of the product (what you are selling)

### A. The lesson kits (`/kit`) - the front door
A leader finishes a Mindmaker lightning lesson, scans a code, and walks a guided, build-it-with-you kit. Four kits, each about one thing:
- **Vibe Coding** - a *solution*: teach any AI how you work and what has burned you, then ship one real build.
- **Autonomous Business** - a *process*: take one recurring workflow off your plate.
- **Agentic Org Chart** - the *company*: map divisions to tasks to handoffs, each tagged green (AI runs it) / amber (AI assists, you approve the handoff) / red (you only), with a ranked place to start.
- **Memory & Identity** - the *person*: make the AI know you across sessions, in your voice.

Each kit is strictly sequential (one action per screen), no-scroll on mobile, a native two-pane on desktop with a live "your kit is taking shape" panel, an honest build trace, a reveal wizard, and one branded personalized hero PDF. The kit program is public: a student scans the class QR, redeems a code, and runs in an anonymous session (no signup). Saving a profile graduates them into a named free CTRL account without losing data. Canonical: `docs/KIT-REDESIGN-SPEC.md`.

### B. The main app - the daily instrument
Every authenticated surface is no-scroll on all devices, one ask per screen, AI-native:
- **Home / cockpit** - a daily deck of "worth a look" headlines, AI-native only.
- **News deck** - nine AI-native news categories (model & capability, AI economics, tools & vendors, orchestration & agent reliability, AI-native product & GTM, governance, security & agent risk, org & talent, proof & adoption), each with a branded SVG motif. The briefing pipeline filters out anything not about deploying/building/selling AI, and tags every story.
- **Decision engine** (`/decision`) - pressure-tests a decision (decompose, verify against live evidence, cross-examine, advise) with an honest AI-native reframe banner.
- **Brain / Memory Web** (`/memory`) - the leader's context as a four-world rope canvas that fills the frame, with zoom; the substrate that makes any AI know the business.
- **Daily Briefing** (`/briefing`) - a short audio read of the AI world, tuned to the leader's chosen AI-native categories.
- **Context Export + Automator** (`/context`) - context portable into ChatGPT, Claude, Gemini, Cursor, Claude Code, or raw markdown; plus the Automator, which turns something the leader does every week into an agentskills.io-compliant skill.
- **Compliance** (`/compliance`) - an honest, calm view of how data is protected (no overclaiming of certifications).

Canonical: `docs/MAIN-APP-POLISH-SPEC.md`.

---

## 4. Pitches

### Short pitch
CTRL helps you build, orchestrate, productize, and take to market the AI-native version of your business. Start with a guided kit (ship a build, take a workflow off your plate, map your agentic org, or make the AI know you), then run the daily instrument: an AI-native news deck, a decision engine that reframes every call to its AI-native version, and an Automator that turns a weekly workflow into an installable agent skill.

### TODO(founder): lock the long pitch
The AI-native long pitch is not yet written tight enough to ship in outbound. Use the short pitch and the two-halves description above. Do not reuse the old "zero-context tax / portable double" long pitch; it is off-positioning.

---

## 5. Pricing

| Tier | Price | Grounded in code? |
|---|---|---|
| **Free / Core** | $0 | Yes (free tier is the kit side-door + Memory Web + the Automator build, which is free for now) |
| **Edge Pro** | $29/month | Yes - canonical in `supabase/functions/_shared/edge-pricing.ts` (`EDGE_PRO_UNIT_AMOUNT_CENTS = 2900`), surfaced via `src/constants/billing.ts` |
| **Full Diagnostic** | $49 one-time | Wired in `create-diagnostic-payment` (a Stripe price id), but this is an old-positioning SKU |
| **Deep Context Upgrade** | $29 one-time | Wired in `create-diagnostic-payment` |
| **Diagnostic + Deep Context Bundle** | $69 one-time | Wired in `create-diagnostic-payment` / `create-stripe-prices` |

**What is settled:** Edge Pro is $29/month. Building Automator skills is free for now (the Edge Pro gate was removed); Edge Pro gates the daily personalized briefing, the live MCP pull of your built skills (`list_skills` / `get_skill`), Edge artifacts, the decision engine, all briefing types, and email delivery. Pricing constants are canonical in `src/constants/billing.ts` + the shared edge-pricing module; the app reads them, so trust the code over any doc.

**TODO(founder):** confirm whether the one-time Full Diagnostic ($49) / Deep Context ($29) / Bundle ($69) SKUs survive the AI-native repositioning, and confirm the Bootcamp/Portfolio engagement bands, before quoting them. They are real in the Stripe plumbing today but were defined under the old positioning.

**Pricing guardrails:** Edge Pro is $29/month. Do not quote $9/month (legacy grandfathered price, never quoted publicly). No em dashes. No invented prices.

---

## 6. Objections and answers (AI-native reframe)

**"I already use ChatGPT / Claude."**
Good. CTRL is not another chat tool. It helps you turn your business into its AI-native version: which workflows an agent should own, how your org should be wired for handoffs, what the AI-native version of your product is. The chat tools are where the work lands; CTRL is where you decide what to build.

**"We already have an AI strategy."**
CTRL is not a strategy deck. It is the instrument that turns the strategy into specific AI-native moves: a workflow taken off your plate, an agentic org chart with the autonomy line drawn, the first agent to stand up.

**"What about data privacy?"**
CTRL is self-contained. No Slack, email, or calendar integration. The leader talks to it; that is the connection. Data is encrypted at rest. Context never trains any AI model. Account deletion is end-to-end. (Keep this honest; do not overclaim certifications.)

**"Is this just general business advice with an AI label?"**
No. The opposite. CTRL refuses to stay general. Bring it a general call and it reframes it into the AI-native version and works that. If a question has no AI-native version, it is not what CTRL is for.

TODO(founder): expand the objection set to the AI-native buyer once the ICP is confirmed.

---

## 7. CTAs and links

| Action | URL |
|---|---|
| **Sign up / log in** | https://ctrl.themindmaker.ai/auth |
| **Product home** | https://ctrl.themindmaker.ai |
| **Book a strategy call** | https://ctrl.themindmaker.ai/booking |
| **Kit redemption** | https://ctrl.themindmaker.ai/kit |

Production URL is **https://ctrl.themindmaker.ai** (never `leaders.themindmaker.ai`).

---

## 8. Attribution and UTM scheme

All outbound links must carry UTM parameters so first-touch is attributed in the Mindmaker OS warehouse and Stripe.

| Parameter | Purpose | Required |
|---|---|---|
| `utm_source` | Channel/platform (`linkedin`, `email`, `x`, `n8n`) | Yes |
| `utm_medium` | Medium (`social`, `outbound`, `dm`, `agent`) | Yes |
| `utm_campaign` | Campaign name | Yes |
| `utm_content` | Variant/angle | Recommended |
| `utm_term` | Audience segment | Optional |
| `agent` | Agent id that generated the link | Recommended |
| `campaign_id` | Internal campaign reference | Optional |

Rules: always append UTM params; lowercase hyphen-separated values; `utm_source` names the specific platform. Parameters are captured first-touch on landing, persisted through signup, stamped onto Stripe at checkout.

Example:
```
https://ctrl.themindmaker.ai/auth?utm_source=email&utm_medium=outbound&utm_campaign=ai-native-build&utm_content=agentic-org&utm_term=founder&agent=n8n-outbound-01
```

---

## 9. Agent guardrails

### Forbidden
- **No em dashes.** Use commas, colons, parentheses, or rewrite.
- **No "$9/mo" for Edge Pro.** It is $29/month. Existing $9 subscribers are grandfathered but that figure is never quoted publicly.
- **No light-mode / "warm off-white" / Apple-quality visual claims.** CTRL is globally dark, instrument-grade (ctrl-ds palette, emerald `#00D9B6`, the BrandLockup).
- **No general-business-advisor framing.** CTRL builds the AI-native version of the business; it reframes general calls, it does not answer them as general advice.
- **No plugin/integration language.** CTRL is export-based and self-contained. Say "export to" / "works with", not "connects to" / "integrates with".
- **No "leaders.themindmaker.ai".** The live URL is https://ctrl.themindmaker.ai.
- **No hallucinated features, prices, customers, or percentages.** If it is not grounded in the canonical sources or the code, do not claim it.

### Required
- Lead with **"the AI-native version of your business."**
- Use **the reframe** when describing the decision engine.
- Use **"green / amber / red autonomy line"** for the Agentic Org Chart kit.
- Keep sentences short. Active voice. No hype, no FOMO.
- Pricing claims must match section 5; when in doubt, trust the code (`edge-pricing.ts` / `billing.ts`).
