# CTRL Pricing

**Last Updated:** 2026-06-28 (verify-clean; content accurate).

CTRL has two tiers. There is no separate SKU for the Automator. Building skills is FREE for now: any authenticated user (including anonymous Kit sessions) can run the Automator and export skills, with no per-month quota and no paywall on the build itself. Edge Pro still gates other things.

| Capability | Free | Edge Pro ($29 / month) |
|---|---|---|
| Memory Web (read-write) | Yes | Yes |
| Voice Profile capture | Yes | Yes |
| Kit program (`/kit`) | Yes | Yes |
| Automator skill builds + exports | Yes (free for now) | Yes |
| Daily personalised briefing | - | Yes |
| Live MCP pull of your skills (`list_skills` / `get_skill`) | - | Yes |
| Edge artifacts (board memos, strategy docs, emails, agendas) | - | Yes |
| Decision engine (verify + cross-examine + watch) | - | Yes |
| Drafting + framework generation | - | Yes |
| Email delivery of generated artifacts | - | Yes |
| Agent access via MCP | - | Yes |

## Why the build is free for now

The Automator is the highest-velocity surface in CTRL; gating it behind Edge Pro would block the first-skill moment that earns trust. So the build is free for now, with no per-month cap:

1. Every leader can experience the full Automator flow (five-step recognition cascade + voice-locked output + agentskills.io export) on day one without payment.
2. Edge Pro still earns its price by gating what you do *after* the build: the daily personalised briefing, the live MCP pull of your built skills (`list_skills` / `get_skill`), and Edge artifacts.
3. The Kit side door (anonymous Kit students who graduate via `upgradeAnonymousSession()`) lands in free, not paid - removing the auth-and-pay wall between class and first build.

> Note: an `automator_usage` table exists in the codebase but is NOT enforced. There is no quota check on the skill build today.

## How free users upgrade

Edge Pro upgrade CTAs target the same Stripe Checkout flow via `useEdgeSubscription().subscribe()`. They surface when a free user reaches an Edge-gated capability, not when they build a skill:

1. **Daily briefing / Edge artifacts**: a free user reaching one of these Edge-gated surfaces sees the `EdgePaywall`.
2. **Live MCP skills pull**: the `list_skills` / `get_skill` endpoints on the `mcp-context` server are Edge-Pro gated.
3. **Settings → Edge Pro tab**: the `PlanMatrix` block shows the table above with a Subscribe button below it.

There is no standalone `/pricing` page; the matrix in `EdgeProTab` plus this document are the source of truth. If pricing copy diverges from this matrix on any surface, fix the surface, not the doc.

## Value justification

A single skill export consumes roughly 6-10k input tokens + 3k output tokens of the model used by `selectModel("complex")`, plus the deterministic ZIP build. The build is free for now, so it is a pure trust-builder rather than a revenue line.

Edge Pro's $29 / month is justified by the surfaces it gates (daily briefing, the live MCP pull of your built skills, Edge artifacts, decision engine, drafting); the free Automator is the front-door demonstration that those other surfaces have the same depth.
