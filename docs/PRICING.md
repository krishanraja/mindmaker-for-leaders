# CTRL Pricing

CTRL has two tiers. There is no separate SKU for the Automator; it is bundled into the existing Edge Pro plan with the free tier including a single monthly skill so every leader can try the value before paying.

| Capability | Free | Edge Pro ($29 / month) |
|---|---|---|
| Memory Web (read-write) | Yes | Yes |
| Voice Profile capture | Yes | Yes |
| Kit program (`/kit`) | Yes | Yes |
| Automator skill exports | 1 / calendar month (UTC) | Unlimited |
| Daily personalised briefing | - | Yes |
| Decision engine (verify + cross-examine + watch) | - | Yes |
| Drafting + framework generation | - | Yes |
| Email delivery of generated artifacts | - | Yes |
| Agent access via MCP | - | Yes |

## Why one paid tier

The Automator is the highest-velocity surface in CTRL; gating it entirely behind Edge Pro would block the first-skill moment that earns trust. Capping the free tier at one skill per month achieves three goals:

1. Every leader can experience the full Automator flow (3-step recognition cascade + voice-locked output + agentskills.io export) on day one without payment.
2. Anyone who automates more than one workflow per month has demonstrated value greater than $29 / month and is correctly steered to upgrade.
3. The Kit side door (anonymous Kit students who graduate via `upgradeAnonymousSession()`) lands in free, not paid - removing the auth-and-pay wall between class and first build.

## How the cap is enforced

The `automator_usage` table stores `(user_id, month, exports_used)` rows. `generate-skill-export/index.ts` checks Edge Pro status first; if not Edge Pro, it reads the current month's `exports_used` and returns HTTP 402 with `{ error: "free_quota_exhausted", upgrade_url: "/settings?tab=edge" }` when the limit is hit. Successful free exports increment via `increment_automator_usage()` (SECURITY DEFINER, atomic).

Edge Pro accounts never touch the table; the quota check short-circuits for any subscription whose status is `active` or `past_due`.

## How free users upgrade

Three paths surface the upgrade CTA, all targeting the same Stripe Checkout flow via `useEdgeSubscription().subscribe()`:

1. **In-Automator**: a 2nd skill attempt in a month returns 402; `useSkillExport` flags `quotaExhausted` and `AutomatorFlow` opens `EdgePaywall` with `capability='free_quota_exhausted'`.
2. **AutomatePainCard** (Edge view): when `useAutomatorQuota` shows `remaining === 0`, the card flips to an upgrade affordance.
3. **Settings → Edge Pro tab**: the `PlanMatrix` block shows the table above with a Subscribe button below it.

There is no standalone `/pricing` page; the matrix in `EdgeProTab` plus this document are the source of truth. If pricing copy diverges from this matrix on any surface, fix the surface, not the doc.

## Value justification

A single skill export consumes roughly 6-10k input tokens + 3k output tokens of the model used by `selectModel("complex")`, plus the deterministic ZIP build. At Edge Pro's $29 / month, even a leader who builds one skill per week is paying under $0.65 per generated agent skill - well under the cost of the human time required to draft an equivalent procedural document.

The bundle's other components (daily briefing, decision engine, drafting, MCP) are individually worth the price for the leaders who use them daily; the Automator is the front-door demonstration that those other surfaces have the same depth.
