# CTRL Pricing

CTRL has two tiers. Free is a genuinely useful daily instrument, not a trial. Edge Pro is the operator tier: it deepens the one thing CTRL does that nothing else does, pressure-test the AI-native version of your real decisions, and makes your context portable into every agent you run.

Pricing is canonical in code: `supabase/functions/_shared/edge-pricing.ts` (`EDGE_PRO_UNIT_AMOUNT_CENTS = 4900`), surfaced via `src/constants/billing.ts`. The app reads the constant, so trust the code over any doc.

| Capability | Free | Edge Pro ($49 / month) |
|---|---|---|
| Memory Web (read-write) | Yes | Yes |
| Voice Profile capture | Yes | Yes |
| Kit program (`/kit`) | Yes | Yes |
| Automator skill builds + exports | Yes (unlimited) | Yes |
| Daily personalised briefing | Yes | Yes |
| Decision engine (weigh + verify) | 3 weighs / month | Unlimited |
| Multi-model cross-examination of every decision | - | Yes |
| Decision watch (alerts when a load-bearing assumption weakens) | - | Yes |
| Edge artifacts (board memos, strategy docs, emails, agendas) | - | Yes |
| Drafting + framework generation | - | Yes |
| Live MCP pull of your skills into any AI (`list_skills` / `get_skill`) | - | Yes |
| Email delivery of generated artifacts | - | Yes |

## The positioning: Edge Pro is the decision tier, not the briefing tier

The daily briefing, the Automator, Memory, and Voice are **free on purpose**. They are the daily habit and the on-ramp: a leader should feel CTRL working for them every day without paying, and should reach their first built skill and their first read with no wall. The briefing being free is what earns the return visit.

Edge Pro earns its price on the one surface where depth compounds and general tools cannot follow: **the decision engine**. Free gives every leader a real taste, 3 full base weighs a month (reframe to the AI-native version, decompose into claims, verify against live evidence, advise). Edge Pro removes the cap and adds the things a serious operator wants once they trust the base:

1. **Unlimited weighs**, so the engine becomes the place you think, not a rationed novelty.
2. **A multi-model cross-examination of every decision**, a second, independent pass that argues against the first.
3. **Decision watch**, an hourly re-verification of your load-bearing assumptions that raises an alert when the ground shifts under a call you already made.
4. **Edge artifacts + drafting + email**, the board memo, the strategy doc, the agenda, generated in your voice and delivered.
5. **The live MCP pull of your built skills into any AI** (`list_skills` / `get_skill`), so your CTRL work shows up inside ChatGPT, Claude, Cursor, and Claude Code.

## Why $49

$49 / month is priced against value, not habit. The decision engine produced, in evaluation, a board-ready, compliance-aware answer specific to the leader's business; for a CEO or COO that is worth multiples of the price. The free tier (briefing, Automator, Memory, 3 weighs) is the honest demonstration that the paid depth is real, not a teaser.

## How free users upgrade

Edge Pro CTAs target the same Stripe Checkout flow via `useEdgeSubscription().subscribe()`. They surface where desire peaks, not at random:

1. **Right after a leader's first great decision** (the strongest moment; the post-weigh CTA offers unlimited weighs + the cross-examination).
2. **At the 3-weighs-a-month cap** (`decision-engine` returns `upgrade_required`).
3. **When reaching an Edge-gated surface** (Edge artifacts, live MCP pull): the `EdgePaywall`.
4. **The `/pricing` page and Settings -> Edge Pro tab** (`PlanMatrix`), which show the table above with a Subscribe button.

Activation is now backed by the webhook AND a webhook-independent fallback (`verify-edge-subscription`), so a paying leader is entitled even if the webhook is delayed.

> Note: an `automator_usage` table exists in the codebase but is NOT enforced. The Automator build is free and uncapped.

If pricing copy diverges from this matrix on any surface, fix the surface, not the doc.
